import { ThemeProvider } from '@shopify/restyle';
import React, { useEffect, useMemo } from 'react';
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

import { RootNavigator } from '@navigation/RootNavigator';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { darkTheme, theme } from '@theme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { toastConfig } from './components/Toast/ToastConfig';
import { registerNotificationFirebase } from './lib/firebase';
import { checkSessionAndToken } from './lib/supabase';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { store } from './store/store';
import notifee from '@notifee/react-native';
import { clearSession, setSession } from './store/auth/auth.slice';
import { navigateToAuth } from './navigation/navigationRef';

const AppContent = () => {
  const { top: topSafeArea } = useSafeAreaInsets();
  const systemDarkMode = useColorScheme() === 'dark';
  const themeMode = useAppSelector(state => state.global.theme);
  const dispatch = useAppDispatch();
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
      // Ví dụ: Kiểm tra login từ Supabase hoặc load dữ liệu từ MMKV tại đây
      console.log('Khởi tạo App FinTrack Pro...');
      await requestUserPermission();
      const { isAuthenticated, session } = await checkSessionAndToken();
      if (isAuthenticated) {
        dispatch(setSession(session));
      } else {
        dispatch(clearSession());
        navigateToAuth();
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
        const { isAuthenticated, session } = await checkSessionAndToken();
        if (!isAuthenticated) {
          // Nếu session hết hạn, có thể điều hướng Lộc ra màn hình Login
          console.log('Session hết hạn, yêu cầu đăng nhập lại');
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
