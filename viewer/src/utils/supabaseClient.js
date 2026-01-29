import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Safari 캐시 문제 방지를 위한 fetch 옵션 포함
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
  global: {
    fetch: (url, options = {}) => {
      const existingHeaders = options.headers instanceof Headers
        ? Object.fromEntries(options.headers.entries())
        : (options.headers || {});

      return fetch(url, {
        ...options,
        cache: 'no-store',
        headers: {
          ...existingHeaders,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
    },
  },
});

// Supabase URL export (이미지 경로 등에서 사용)
export { supabaseUrl };

// Edge Function base URL
export const EDGE_FUNCTION_URL = `${supabaseUrl}/functions/v1/centumbob-auth`;
