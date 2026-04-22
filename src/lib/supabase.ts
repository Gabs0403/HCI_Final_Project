import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isMockMode = process.env.EXPO_PUBLIC_MOCK_MODE === 'true';
export const isSupabaseConfigured = Boolean(url && key) && !isMockMode;

if (!isSupabaseConfigured) {
  console.error(
    '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Create a .env from .env.example and restart Expo.',
  );
}

export const supabase: SupabaseClient = createClient(
  url ?? 'http://invalid.local',
  key ?? 'invalid-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'implicit',
    },
  },
);
