import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { supabase } from '@/lib/supabase';
import Config from 'react-native-config';

const webClientId = Config.GOOGLE_CLIENT_ID;
GoogleSignin.configure({
  webClientId,
  offlineAccess: Boolean(webClientId),
});

export const signInWithGoogle = async () => {
  try {
    if (!webClientId) {
      throw new Error('Thiếu GOOGLE_CLIENT_ID (Web client) trong .env');
    }
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    const idToken = userInfo.data?.idToken;

    if (!idToken) throw new Error('Không lấy được ID Token');

    // Đăng nhập vào Supabase
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) throw error;
    return { session: data.session, error: null };
  } catch (error: any) {
    return { session: null, error: error.message };
  }
};

export const signOut = async () => {
  try {
    await supabase.auth.signOut();
    await GoogleSignin.signOut();
    return { success: true, message: 'Đăng xuất thành công' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};
