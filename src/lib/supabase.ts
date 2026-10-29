import { createClient, Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';
import NetInfo from '@react-native-community/netinfo';

const supabaseUrl = Config.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = Config.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Keep the SDK's default key so existing logins remain available offline.
const projectRef = (supabaseUrl as string).split('://')[1].split(/[.:/]/)[0];
const sessionStorageKey = `sb-${projectRef}-auth-token`;

export const supabase = createClient(
  supabaseUrl as string,
  supabaseAnonKey as string,
  {
    auth: {
      storage: AsyncStorage,
      storageKey: sessionStorageKey,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

type SessionCheck = {
  isAuthenticated: boolean;
  session: Session | null;
  isOffline?: boolean;
};

const withStartupTimeout = async <T>(operation: Promise<T>): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Session check timed out')), 5000);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
};

const readStoredSession = async (): Promise<Session | null> => {
  try {
    const raw = await AsyncStorage.getItem(sessionStorageKey);
    const session = raw ? JSON.parse(raw) : null;
    return session?.user?.id && session?.access_token && session?.refresh_token
      ? session
      : null;
  } catch {
    return null;
  }
};

export const checkSessionAndToken = async (): Promise<SessionCheck> => {
  // getSession() can wait for token refresh during SDK initialization.
  // Read local storage directly so an expired token cannot block offline startup.
  const storedSession = await readStoredSession();
  const offlineResult = (): SessionCheck => ({
    isAuthenticated: !!storedSession,
    session: storedSession,
    isOffline: true,
  });

  try {
    const network = await withStartupTimeout(NetInfo.fetch());
    if (!network.isConnected || network.isInternetReachable === false) {
      return offlineResult();
    }

    const { data: { session }, error } = await withStartupTimeout(
      supabase.auth.getSession(),
    );
    if (error) throw error;
    return { isAuthenticated: !!session, session };
  } catch (error) {
    const sessionError = error as { message?: string; name?: string } | null;
    const isNetworkError =
      /network|fetch|timed out/i.test(sessionError?.message ?? '') ||
      sessionError?.name === 'TypeError' ||
      sessionError?.name === 'AuthRetryableFetchError';
    if (isNetworkError) return offlineResult();

    console.error('Lỗi khi kiểm tra session:', error);
    return { isAuthenticated: false, session: null };
  }
};
