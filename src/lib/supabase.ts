import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';
import { deviceService } from '@/services/device/device.service';
import { Platform } from 'react-native';

const supabaseUrl = Config.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = Config.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(
  supabaseUrl as string,
  supabaseAnonKey as string,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

export const checkSessionAndToken = async (): Promise<{
  isAuthenticated: boolean;
  session: any;
  isOffline?: boolean;
}> => {
  try {
    // 1. Kiểm tra session hiện tại từ Supabase
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      // Phân biệt: lỗi network vs session thật sự hết hạn
      const isNetworkError =
        error.message?.includes('Network') ||
        error.message?.includes('fetch') ||
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('network');

      if (isNetworkError) {
        console.log('⚡ Offline');
        return { isAuthenticated: true, session: null, isOffline: true };
      }

      throw error;
    }

    if (session) {
      if (Platform.OS === 'android') {
        if (session.user.id && session.user.id !== '') {
          await deviceService.updateDeviceToken(session.user.id);
        }
      }
      return { isAuthenticated: true, session: session };
    }

    return { isAuthenticated: false, session: null };
  } catch (err: any) {
    const isNetworkError =
      err?.message?.includes('Network') ||
      err?.message?.includes('fetch') ||
      err?.name === 'TypeError';

    if (isNetworkError) {
      console.log('⚡ Offline');
      return { isAuthenticated: true, session: null, isOffline: true };
    }

    console.error('Lỗi khi kiểm tra session:', err);
    return { isAuthenticated: false, session: null };
  }
};
