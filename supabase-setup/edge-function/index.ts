import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

interface SignupRequest {
  username: string;
  nickname: string;
  password: string;
  email?: string;
}

interface LoginRequest {
  username: string;
  password: string;
}

interface UpdateProfileRequest {
  nickname?: string;
  email?: string;
}

// Helper: Email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper: Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper: Send verification email
async function sendVerificationEmail(email: string, otp: string): Promise<boolean> {
  try {
    // For development: Log OTP to console
    console.log(`[EMAIL] Sending verification code to ${email}: ${otp}`);
    console.log(`[EMAIL] Code expires in 10 minutes`);

    // TODO: Implement actual email sending for production
    // Example with Resend or SendGrid:
    /*
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@yourdomain.com',
        to: email,
        subject: '센텀밥 이메일 인증',
        html: `
          <h2>센텀밥 이메일 인증</h2>
          <p>인증 코드: <strong style="font-size: 24px; letter-spacing: 2px;">${otp}</strong></p>
          <p>이 코드는 10분간 유효합니다.</p>
        `,
      }),
    });
    return response.ok;
    */

    return true; // For development, always return success
  } catch (error) {
    console.error('[EMAIL] Failed to send email:', error);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Initialize Supabase client with anon key for user operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    const method = req.method;

    // POST /signup
    if (path === 'signup' && method === 'POST') {
      const { username, nickname, password, email }: SignupRequest = await req.json();

      // Validate input
      if (!username || !nickname || !password) {
        return new Response(
          JSON.stringify({ success: false, error: 'Username, nickname, and password are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate username format
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Username must be 3-20 characters (alphanumeric and underscore only)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate nickname length
      if (nickname.length < 2 || nickname.length > 30) {
        return new Response(
          JSON.stringify({ success: false, error: 'Nickname must be 2-30 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate password length
      if (password.length < 6) {
        return new Response(
          JSON.stringify({ success: false, error: 'Password must be at least 6 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if username already exists
      const { data: existingUser } = await supabaseAdmin
        .from('centumbob_users')
        .select('username')
        .eq('username', username)
        .single();

      if (existingUser) {
        return new Response(
          JSON.stringify({ success: false, error: 'Username already exists' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if email already exists (if provided)
      if (email) {
        const { data: existingEmail } = await supabaseAdmin
          .from('centumbob_users')
          .select('email')
          .eq('email', email)
          .single();

        if (existingEmail) {
          return new Response(
            JSON.stringify({ success: false, error: 'Email already exists' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Create temporary email for auth
      const tempEmail = `${username}@centumbob.internal`;

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: tempEmail,
        password: password,
        email_confirm: true, // Auto-confirm temp email
        user_metadata: {
          username: username,
          nickname: nickname
        }
      });

      if (authError || !authData.user) {
        return new Response(
          JSON.stringify({ success: false, error: authError?.message || 'Failed to create user' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create user profile in centumbob_users table
      const { error: profileError } = await supabaseAdmin
        .from('centumbob_users')
        .insert({
          id: authData.user.id,
          username: username,
          nickname: nickname,
          email: email || null,
          email_verified: false
        });

      if (profileError) {
        // Rollback: delete auth user if profile creation fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create user profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Sign in the user to get session
      const { data: sessionData, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: tempEmail,
        password: password
      });

      if (signInError || !sessionData.session) {
        return new Response(
          JSON.stringify({ success: false, error: 'User created but login failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get full user profile
      const { data: userProfile } = await supabaseAdmin
        .from('centumbob_users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      return new Response(
        JSON.stringify({
          success: true,
          user: userProfile,
          session: sessionData.session
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /login
    if (path === 'login' && method === 'POST') {
      const { username, password }: LoginRequest = await req.json();

      if (!username || !password) {
        return new Response(
          JSON.stringify({ success: false, error: 'Username and password are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user profile to find temp email
      const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('centumbob_users')
        .select('*')
        .eq('username', username)
        .single();

      if (profileError || !userProfile) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid username or password' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Sign in with temp email
      const tempEmail = `${username}@centumbob.internal`;
      const { data: sessionData, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: tempEmail,
        password: password
      });

      if (signInError || !sessionData.session) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid username or password' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          user: userProfile,
          session: sessionData.session
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /logout
    if (path === 'logout' && method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ success: false, error: 'Authorization header required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = authHeader.replace('Bearer ', '');
      const supabaseUser = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader }
          }
        }
      );

      await supabaseUser.auth.signOut();

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /profile
    if (path === 'profile' && method === 'GET') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ success: false, error: 'Authorization header required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

      if (userError || !user) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: userProfile } = await supabaseAdmin
        .from('centumbob_users')
        .select('*')
        .eq('id', user.id)
        .single();

      return new Response(
        JSON.stringify({ success: true, user: userProfile }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT /profile
    if (path === 'profile' && method === 'PUT') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ success: false, error: 'Authorization header required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

      if (userError || !user) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { nickname, email }: UpdateProfileRequest = await req.json();
      const updates: any = {};

      if (nickname) {
        if (nickname.length < 2 || nickname.length > 30) {
          return new Response(
            JSON.stringify({ success: false, error: 'Nickname must be 2-30 characters' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        updates.nickname = nickname;
      }

      if (email !== undefined) {
        // Check if email already exists
        if (email) {
          const { data: existingEmail } = await supabaseAdmin
            .from('centumbob_users')
            .select('email, id')
            .eq('email', email)
            .single();

          if (existingEmail && existingEmail.id !== user.id) {
            return new Response(
              JSON.stringify({ success: false, error: 'Email already exists' }),
              { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        updates.email = email || null;
        updates.email_verified = false; // Reset verification when email changes
      }

      if (Object.keys(updates).length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'No updates provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: updateError } = await supabaseAdmin
        .from('centumbob_users')
        .update(updates)
        .eq('id', user.id);

      if (updateError) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: updatedProfile } = await supabaseAdmin
        .from('centumbob_users')
        .select('*')
        .eq('id', user.id)
        .single();

      return new Response(
        JSON.stringify({ success: true, user: updatedProfile }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /check-username
    if (path === 'check-username' && method === 'GET') {
      const username = url.searchParams.get('username');

      if (!username) {
        return new Response(
          JSON.stringify({ available: false, error: 'Username parameter required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data } = await supabaseAdmin
        .from('centumbob_users')
        .select('username')
        .eq('username', username)
        .single();

      return new Response(
        JSON.stringify({ available: !data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /check-email
    if (path === 'check-email' && method === 'GET') {
      const email = url.searchParams.get('email');

      if (!email) {
        return new Response(
          JSON.stringify({ available: false, error: 'Email parameter required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data } = await supabaseAdmin
        .from('centumbob_users')
        .select('email')
        .eq('email', email)
        .single();

      return new Response(
        JSON.stringify({ available: !data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /send-verification-code
    if (path === 'send-verification-code' && method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ success: false, error: 'Authorization header required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

      if (userError || !user) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { email }: { email: string } = await req.json();

      // Validate email
      if (!email || !isValidEmail(email)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Valid email is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if email belongs to user
      const { data: userProfile } = await supabaseAdmin
        .from('centumbob_users')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!userProfile || userProfile.email !== email) {
        return new Response(
          JSON.stringify({ success: false, error: 'Email does not match user profile' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete any existing tokens for this user/email
      await supabaseAdmin
        .from('centumbob_email_verification_tokens')
        .delete()
        .eq('user_id', user.id)
        .eq('email', email);

      // Generate OTP
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store token in database
      const { error: insertError } = await supabaseAdmin
        .from('centumbob_email_verification_tokens')
        .insert({
          user_id: user.id,
          email: email,
          token: otp,
          expires_at: expiresAt.toISOString()
        });

      if (insertError) {
        console.error('Failed to store verification token:', insertError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to generate verification code' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Send email
      const emailSent = await sendVerificationEmail(email, otp);

      if (!emailSent) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to send verification email' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Verification code sent to email',
          expiresIn: 600 // seconds
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /verify-email
    if (path === 'verify-email' && method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ success: false, error: 'Authorization header required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

      if (userError || !user) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { email, code }: { email: string; code: string } = await req.json();

      // Validate input
      if (!email || !code) {
        return new Response(
          JSON.stringify({ success: false, error: 'Email and verification code are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!/^\d{6}$/.test(code)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid verification code format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Find matching token
      const { data: verificationToken, error: tokenError } = await supabaseAdmin
        .from('centumbob_email_verification_tokens')
        .select('*')
        .eq('user_id', user.id)
        .eq('email', email)
        .eq('token', code)
        .single();

      if (tokenError || !verificationToken) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid or expired verification code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check expiration
      const now = new Date();
      const expiresAt = new Date(verificationToken.expires_at);

      if (now > expiresAt) {
        // Delete expired token
        await supabaseAdmin
          .from('centumbob_email_verification_tokens')
          .delete()
          .eq('id', verificationToken.id);

        return new Response(
          JSON.stringify({ success: false, error: 'Verification code has expired. Please request a new one.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Mark email as verified
      const { error: updateError } = await supabaseAdmin
        .from('centumbob_users')
        .update({ email_verified: true })
        .eq('id', user.id)
        .eq('email', email);

      if (updateError) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to verify email' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete used token
      await supabaseAdmin
        .from('centumbob_email_verification_tokens')
        .delete()
        .eq('id', verificationToken.id);

      // Get updated user profile
      const { data: updatedProfile } = await supabaseAdmin
        .from('centumbob_users')
        .select('*')
        .eq('id', user.id)
        .single();

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Email verified successfully',
          user: updatedProfile
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route not found
    return new Response(
      JSON.stringify({ success: false, error: 'Route not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
