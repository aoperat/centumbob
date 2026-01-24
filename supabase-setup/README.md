# Supabase Setup for Authentication

This folder contains all files needed to set up authentication in Supabase.

## Step 1: Create Database Table

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `01_create_centumbob_users.sql`
4. Paste and run it in the SQL Editor
5. You should see "centumbob_users table created successfully!"

## Step 2: Deploy Edge Function

### Option A: Using Supabase CLI (Recommended)

1. Install Supabase CLI if you haven't:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project (get your project ref from dashboard URL):
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

4. Deploy the Edge Function:
   ```bash
   cd C:\WorkSpaces\centumbob_v2\supabase-setup
   supabase functions deploy centumbob-auth --project-ref YOUR_PROJECT_REF
   ```

### Option B: Using Supabase Dashboard

1. Go to **Edge Functions** in your Supabase dashboard
2. Click **Create a new function**
3. Name it: `centumbob-auth`
4. Copy the contents of `edge-function/index.ts` into the editor
5. Click **Deploy**

## Step 3: Configure Auth Settings

1. Go to **Authentication** > **Providers** in your Supabase dashboard
2. Under **Email**, make sure it's enabled
3. Go to **Authentication** > **URL Configuration**
4. Add your viewer URL to **Redirect URLs**:
   - For local: `http://localhost:9103/**`
   - For production: `https://YOUR_GITHUB_USERNAME.github.io/centumbob_v2/**`

## Step 4: Verify Setup

After deployment, your Edge Function will be available at:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/centumbob-auth
```

You can test it with curl:
```bash
# Check if username is available
curl "https://YOUR_PROJECT_REF.supabase.co/functions/v1/centumbob-auth/check-username?username=testuser"

# Should return: {"available":true}
```

## Environment Variables

The Edge Function automatically has access to these environment variables:
- `SUPABASE_URL` - Your project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (admin access)
- `SUPABASE_ANON_KEY` - Anonymous key (public access)

No additional configuration needed!

## API Endpoints

Once deployed, the following endpoints will be available:

- `POST /centumbob-auth/signup` - Register new user
- `POST /centumbob-auth/login` - Login with username/password
- `POST /centumbob-auth/logout` - Logout current user
- `GET /centumbob-auth/profile` - Get user profile
- `PUT /centumbob-auth/profile` - Update user profile
- `GET /centumbob-auth/check-username` - Check username availability
- `GET /centumbob-auth/check-email` - Check email availability

## Next Steps

After completing these steps, proceed with the frontend implementation in the viewer app.
