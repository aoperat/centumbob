import { supabase, EDGE_FUNCTION_URL } from './supabaseClient';

/**
 * Sign up a new user
 * @param {string} username - Username (3-20 chars, alphanumeric + underscore)
 * @param {string} nickname - Nickname (2-30 chars)
 * @param {string} password - Password (min 6 chars)
 * @param {string} [email] - Optional email
 * @returns {Promise<{success: boolean, user?: object, session?: object, error?: string}>}
 */
export async function signup(username, nickname, password, email = null) {
  try {
    console.log('[authApi.signup] Sending request to:', `${EDGE_FUNCTION_URL}/signup`);
    const response = await fetch(`${EDGE_FUNCTION_URL}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, nickname, password, email }),
    });

    console.log('[authApi.signup] Response status:', response.status, 'ok:', response.ok);
    const data = await response.json();
    console.log('[authApi.signup] Response data:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      return { success: false, error: data.error || 'Signup failed' };
    }

    // Store session in Supabase client
    if (data.session) {
      console.log('[authApi.signup] Setting session...');
      try {
        const { error: sessionError } = await supabase.auth.setSession(data.session);
        if (sessionError) {
          console.error('[authApi.signup] Session error:', sessionError);
          // Don't fail - the session might have been set despite the error
        }
        console.log('[authApi.signup] Session set successfully');
      } catch (sessionErr) {
        // Handle AbortError from React StrictMode double-mounting
        if (sessionErr.name === 'AbortError') {
          console.log('[authApi.signup] AbortError during setSession (likely React StrictMode), checking if session was set...');
          // Check if session was actually set
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession) {
            console.log('[authApi.signup] Session is set despite AbortError');
          }
        } else {
          console.error('[authApi.signup] Unexpected error during setSession:', sessionErr);
        }
      }
    }

    console.log('[authApi.signup] Complete, returning:', { success: data.success });
    return data;
  } catch (error) {
    // Handle AbortError specially - don't treat as network error
    if (error.name === 'AbortError') {
      console.log('[authApi.signup] AbortError caught, checking session state...');
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession) {
        console.log('[authApi.signup] Session exists, returning success');
        // Session is set, fetch user profile
        const profileResult = await getProfile();
        if (profileResult.success) {
          return { success: true, user: profileResult.user, session: currentSession };
        }
      }
    }
    console.error('Signup error:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

/**
 * Login with username and password
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<{success: boolean, user?: object, session?: object, error?: string}>}
 */
export async function login(username, password) {
  try {
    const response = await fetch(`${EDGE_FUNCTION_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Login failed' };
    }

    // Store session in Supabase client
    if (data.session) {
      try {
        await supabase.auth.setSession(data.session);
      } catch (sessionErr) {
        // Handle AbortError from React StrictMode
        if (sessionErr.name === 'AbortError') {
          console.log('[authApi.login] AbortError during setSession, checking session...');
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession) {
            console.log('[authApi.login] Session is set despite AbortError');
          }
        } else {
          console.error('[authApi.login] Error during setSession:', sessionErr);
        }
      }
    }

    return data;
  } catch (error) {
    // Handle AbortError specially
    if (error.name === 'AbortError') {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession) {
        const profileResult = await getProfile();
        if (profileResult.success) {
          return { success: true, user: profileResult.user, session: currentSession };
        }
      }
    }
    console.error('Login error:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

/**
 * Logout current user
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function logout() {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return { success: true };
    }

    const response = await fetch(`${EDGE_FUNCTION_URL}/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    // Clear session from Supabase client
    await supabase.auth.signOut();

    if (!response.ok) {
      const data = await response.json();
      return { success: false, error: data.error || 'Logout failed' };
    }

    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    // Still clear local session even if API fails
    await supabase.auth.signOut();
    return { success: true };
  }
}

/**
 * Get current user profile
 * @returns {Promise<{success: boolean, user?: object, error?: string}>}
 */
export async function getProfile() {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${EDGE_FUNCTION_URL}/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to get profile' };
    }

    return data;
  } catch (error) {
    console.error('Get profile error:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

/**
 * Update user profile
 * @param {object} updates - Profile updates { nickname?, email? }
 * @returns {Promise<{success: boolean, user?: object, error?: string}>}
 */
export async function updateProfile(updates) {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${EDGE_FUNCTION_URL}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to update profile' };
    }

    return data;
  } catch (error) {
    console.error('Update profile error:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

/**
 * Check if username is available
 * @param {string} username - Username to check
 * @returns {Promise<{available: boolean, error?: string}>}
 */
export async function checkUsernameAvailable(username) {
  try {
    const response = await fetch(
      `${EDGE_FUNCTION_URL}/check-username?username=${encodeURIComponent(username)}`,
      { method: 'GET' }
    );

    const data = await response.json();

    if (!response.ok) {
      return { available: false, error: data.error || 'Check failed' };
    }

    return data;
  } catch (error) {
    console.error('Check username error:', error);
    return { available: false, error: 'Network error' };
  }
}

/**
 * Check if email is available
 * @param {string} email - Email to check
 * @returns {Promise<{available: boolean, error?: string}>}
 */
export async function checkEmailAvailable(email) {
  try {
    const response = await fetch(
      `${EDGE_FUNCTION_URL}/check-email?email=${encodeURIComponent(email)}`,
      { method: 'GET' }
    );

    const data = await response.json();

    if (!response.ok) {
      return { available: false, error: data.error || 'Check failed' };
    }

    return data;
  } catch (error) {
    console.error('Check email error:', error);
    return { available: false, error: 'Network error' };
  }
}

/**
 * Send verification code to email
 * @param {string} email - Email to verify
 * @returns {Promise<{success: boolean, expiresIn?: number, error?: string}>}
 */
export async function sendVerificationCode(email) {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${EDGE_FUNCTION_URL}/send-verification-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to send verification code' };
    }

    return data;
  } catch (error) {
    console.error('Send verification code error:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

/**
 * Verify email with OTP code
 * @param {string} email - Email to verify
 * @param {string} code - 6-digit verification code
 * @returns {Promise<{success: boolean, user?: object, error?: string}>}
 */
export async function verifyEmail(email, code) {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${EDGE_FUNCTION_URL}/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ email, code }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Verification failed' };
    }

    return data;
  } catch (error) {
    console.error('Verify email error:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
}
