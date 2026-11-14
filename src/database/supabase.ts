import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { AppState, Platform } from 'react-native';

const serverStorage = {
  getItem: async (_key: string) => null,
  setItem: async (_key: string, _value: string) => {},
  removeItem: async (_key: string) => {},
};

const authStorage =
  Platform.OS === 'web' && typeof window === 'undefined'
    ? serverStorage
    : AsyncStorage;

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://proyecto.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY || 'anon-key-placeholder';

export const tieneEnvConfigurado = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_KEY,
);

export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      storage: authStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  })

AppState.addEventListener('change', (estado) => {
  if (estado === 'active' && tieneEnvConfigurado) supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
