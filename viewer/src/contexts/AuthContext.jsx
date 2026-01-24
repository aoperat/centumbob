import { createContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import * as authApi from '../utils/authApi';

export const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  isAuthenticated: false,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
  refreshSession: async () => {},
  updateUserProfile: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        // Get session from Supabase client (reads from localStorage)
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (currentSession) {
          setSession(currentSession);

          // Fetch full user profile
          const profileResult = await authApi.getProfile();
          if (!isMounted) return;

          if (profileResult.success) {
            setUser(profileResult.user);
          } else {
            // Session exists but profile fetch failed - clear session
            await supabase.auth.signOut();
            if (!isMounted) return;
            setSession(null);
            setUser(null);
          }
        }
      } catch (error) {
        // Ignore AbortError - this happens due to React StrictMode
        if (error.name === 'AbortError') {
          console.log('Init auth aborted (likely React StrictMode)');
          return;
        }
        console.error('Init auth error:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('[onAuthStateChange] Event:', event);

        try {
          if (event === 'SIGNED_IN' && newSession) {
            if (!isMounted) return;
            console.log('[onAuthStateChange] SIGNED_IN - setting session');
            setSession(newSession);
            // Fetch user profile
            console.log('[onAuthStateChange] Fetching profile...');
            const profileResult = await authApi.getProfile();
            console.log('[onAuthStateChange] Profile result:', profileResult);
            if (!isMounted) return;
            if (profileResult.success) {
              setUser(profileResult.user);
            }
          } else if (event === 'SIGNED_OUT') {
            if (!isMounted) return;
            setSession(null);
            setUser(null);
          } else if (event === 'TOKEN_REFRESHED' && newSession) {
            if (!isMounted) return;
            setSession(newSession);
          }
        } catch (error) {
          // Ignore AbortError from React StrictMode
          if (error.name === 'AbortError') {
            console.log('[onAuthStateChange] Aborted (likely React StrictMode)');
            return;
          }
          console.error('[onAuthStateChange] Error:', error);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!session) return;

    const expiresAt = session.expires_at;
    if (!expiresAt) return;

    // Refresh 5 minutes before expiry
    const refreshTime = (expiresAt * 1000) - Date.now() - (5 * 60 * 1000);

    if (refreshTime <= 0) {
      // Token already expired or about to expire
      refreshSession();
      return;
    }

    const timeoutId = setTimeout(() => {
      refreshSession();
    }, refreshTime);

    return () => clearTimeout(timeoutId);
  }, [session]);

  const signup = async (username, nickname, password, email = null) => {
    console.log('[AuthContext.signup] Starting...');
    setLoading(true);
    try {
      console.log('[AuthContext.signup] Calling authApi.signup...');
      const result = await authApi.signup(username, nickname, password, email);
      console.log('[AuthContext.signup] Got result:', { success: result.success, error: result.error });

      if (result.success) {
        console.log('[AuthContext.signup] Setting session and user...');
        setSession(result.session);
        setUser(result.user);
        console.log('[AuthContext.signup] Session and user set');
      }

      console.log('[AuthContext.signup] Returning result');
      return result;
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'Signup failed' };
    } finally {
      console.log('[AuthContext.signup] Finally block, setting loading=false');
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    setLoading(true);
    try {
      const result = await authApi.login(username, password);

      if (result.success) {
        setSession(result.session);
        setUser(result.user);
      }

      return result;
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      const result = await authApi.logout();
      setSession(null);
      setUser(null);
      return result;
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: 'Logout failed' };
    } finally {
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    try {
      const { data: { session: newSession }, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error('Refresh session error:', error);
        // If refresh fails, sign out
        await logout();
        return { success: false, error: 'Session expired. Please login again.' };
      }

      if (newSession) {
        setSession(newSession);
        return { success: true };
      }

      return { success: false, error: 'Failed to refresh session' };
    } catch (error) {
      console.error('Refresh session error:', error);
      await logout();
      return { success: false, error: 'Session expired' };
    }
  };

  const updateUserProfile = async (updates) => {
    try {
      const result = await authApi.updateProfile(updates);

      if (result.success) {
        setUser(result.user);
      }

      return result;
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: 'Failed to update profile' };
    }
  };

  const value = {
    user,
    session,
    loading,
    isAuthenticated: !!user && !!session,
    login,
    signup,
    logout,
    refreshSession,
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
