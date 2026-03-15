import 'react-native-get-random-values';
import { ThemeProvider } from '@shopify/restyle';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  AppState,
  AppStateStatus,
  LogBox,
  Platform,
  StatusBar,
  useColorScheme,
} from 'react-native';
import RNBootSplash from 'react-native-bootsplash';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Provider } from 'react-redux';

import * as Updates from 'expo-updates';
import { navigationRef } from '@/navigation/navigationRef';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { RootNavigator } from '@navigation/RootNavigator';
import notifee from '@notifee/react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { darkTheme, theme } from '@theme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { toastConfig } from './components/Toast/ToastConfig';
import { useWalletsRealtime } from './hooks/useWalletsRealtime';
import { registerNotificationFirebase } from './lib/firebase';
import { checkSessionAndToken } from './lib/supabase';
import './locales';
import { scheduleDailyReminder } from './services/notifee/scheduleDailyReminder';
import { clearSession, setSession } from './store/auth/auth.slice';
import { setNetworkStatus } from './store/global/global.slice';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { store } from './store/store';

const AppContent = () => {
  const { top: topSafeArea } = useSafeAreaInsets();
  const systemDarkMode = useColorScheme() === 'dark';
  const isNetworkConnectedRef = useRef(true);

  const themeMode = useAppSelector(state => state.global.theme);
  const { session } = useAppSelector(state => state.auth);
  const dispatch = useAppDispatch();

  // OTA
  useEffect(() => {
    async function onFetchUpdateAsync() {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync(); // Tự động khởi động lại app để áp dụng code mới
        }
      } catch (error) {
        console.log(`Error fetching latest Expo update: ${error}`);
      }
    }

    if (!__DEV__) { // Chỉ chạy khi app là bản Release (ipa)
      onFetchUpdateAsync();
    }
  }, []);


  // Realtime wallets - chạy ở App level để không bị unmount khi navigate (tránh lỗi đăng ký lại)
  useWalletsRealtime(session?.user?.id);
  // Logic xác định theme nào sẽ được dùng
  const resolvedDarkMode = useMemo(() => {
    if (themeMode === 'system') return systemDarkMode;
    return themeMode === 'dark';
  }, [systemDarkMode, themeMode]);

  const activeTheme = resolvedDarkMode ? darkTheme : theme;

  const requestUserPermission = async () => {
    const settings = await notifee.requestPermission();

    if (settings.authorizationStatus >= 1) {
      console.log('Đã có quyền thông báo!');
    } else {
      console.log('Người dùng từ chối quyền thông báo');
    }
  };

  useEffect(() => {
    LogBox.ignoreLogs([
      'Sending `onAnimatedValueUpdate` with no listeners registered.',
    ]);

    const init = async () => {
      console.log('Khởi tạo App FinTrack Pro...');
      await scheduleDailyReminder();
      await requestUserPermission();
      const { isAuthenticated, session, isOffline } =
        await checkSessionAndToken();

      if (isOffline) {
        // Offline khi khởi động → giữ session cũ (nếu có trong AsyncStorage)
        console.log('📴 Khởi động offline — giữ session cũ');
        // Không dispatch clearSession → user vẫn thấy app
      } else if (isAuthenticated) {
        dispatch(setSession(session));
      } else {
        dispatch(clearSession());
        navigationRef.navigate('AuthStack');
      }

      if (Platform.OS === 'android') {
        registerNotificationFirebase();
      }
    };

    init().finally(async () => {
      await RNBootSplash.hide({ fade: true });
    });
  }, [dispatch]);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('nextAppState', nextAppState);
        const { isAuthenticated, session, isOffline } =
          await checkSessionAndToken();

        if (isOffline) {
          // Offline: giữ nguyên session hiện tại, không logout
          console.log('📴 App foreground nhưng offline — giữ session');
          return;
        }

        if (!isAuthenticated) {
          console.log('Session hết hạn, yêu cầu đăng nhập lại');
          dispatch(clearSession());
          navigationRef.navigate('AuthStack');
        } else {
          dispatch(setSession(session));
        }
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      subscription.remove();
    };
  }, [dispatch]);

  /**
   * Theo dõi trạng thái mạng
   * Khi offline → giữ session, cho phép dùng WatermelonDB
   * Khi online trở lại → refresh session + sync data
   */
  useEffect(() => {
    NetInfo.fetch().then((state: NetInfoState) => {
      isNetworkConnectedRef.current = state.isConnected ?? false;
      dispatch(setNetworkStatus({ isConnected: state.isConnected ?? false }));
    });

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const isConnected = state.isConnected ?? false;
      const wasConnected = isNetworkConnectedRef.current;

      isNetworkConnectedRef.current = isConnected;

      if (wasConnected && !isConnected) {
        // Mất mạng
        console.log('📴 Mất kết nối mạng — chuyển sang offline mode');
        dispatch(setNetworkStatus({ isConnected: false }));
      }

      if (!wasConnected && isConnected) {
        // Có mạng trở lại → refresh session + sync
        console.log('🌐 Có mạng trở lại — refresh session + sync');
        dispatch(setNetworkStatus({ isConnected: true })); // ← Fix: was false

        // Auto refresh session + sync WatermelonDB
        (async () => {
          try {
            const {
              isAuthenticated,
              session: newSession,
              isOffline,
            } = await checkSessionAndToken();

            if (isOffline) return; // Vẫn chưa có mạng thật sự

            if (isAuthenticated && newSession) {
              dispatch(setSession(newSession));
              console.log('✅ Session refreshed, bắt đầu sync...');
              // Sync dữ liệu offline lên server
              const { syncData } = require('@/services/sync/syncDataSupabase');
              syncData().catch(console.error);
            } else {
              // Session thật sự hết hạn (refresh token cũng expired)
              console.log('❌ Session expired, yêu cầu đăng nhập lại');
              dispatch(clearSession());
              navigationRef.navigate('AuthStack');
            }
          } catch (err) {
            console.error('Lỗi khi refresh session sau reconnect:', err);
          }
        })();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [dispatch]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider theme={activeTheme}>
        <BottomSheetModalProvider>
          <StatusBar
            barStyle={resolvedDarkMode ? 'light-content' : 'dark-content'}
            backgroundColor={activeTheme.colors.main}
            translucent
          />
          <RootNavigator isDarkMode={resolvedDarkMode} />
          <Toast config={toastConfig} topOffset={topSafeArea + 10} />
        </BottomSheetModalProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
};

const App = () => {
  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <AppContent />
      </Provider>
    </SafeAreaProvider>
  );
};

export default App;
