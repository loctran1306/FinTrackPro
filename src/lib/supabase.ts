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

export const checkSessionAndToken = async () => {
  try {
    // 1. Kiểm tra session hiện tại từ Supabase
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) throw error;

    if (session) {
      console.log('Session vẫn còn hiệu lực cho:', session.user.email);
      // Cập nhật FCM Token
      if (Platform.OS === 'android') {
        if (session.user.id && session.user.id !== '') {
          await deviceService.updateDeviceToken(session.user.id);
        }
      }

      return { isAuthenticated: true, session: session };
    }

    return { isAuthenticated: false, session: null };
  } catch (err) {
    console.error('Lỗi khi kiểm tra session:', err);
    return { isAuthenticated: false, session: null };
  }
};
