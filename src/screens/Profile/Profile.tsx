import {
  setSyncEnabled,
  setTheme,
  ThemeMode,
} from '@/store/global/global.slice';
import { useTheme } from '@shopify/restyle';
import { Theme } from '@/theme';
import AppIcon from '@/components/common/AppIcon';
import { signOut } from '@/services/auth/auth.service';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '@/navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { clearSession } from '@/store/auth/auth.slice';
import { toast } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEY_LOCALE_STORAGE } from '@/constants/locale.const';
import AppButton from '@/components/button/AppButton';
import React, { useState } from 'react';
import { Pressable, Switch } from 'react-native';
import { Box, Text } from '@/theme/components';
import Screen from '@/components/common/Screen';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { RADIUS } from '@/theme/constant';
import { syncData } from '@/services/sync/syncDataSupabase';

export const ProfileScreen = () => {
  const { i18n } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme<Theme>();
  const dispatch = useAppDispatch();
  const { theme: themeMode, isSyncEnabled } = useAppSelector(
    state => state.global,
  );

  const handleThemeChange = (mode: ThemeMode) => {
    dispatch(setTheme(mode));
  };

  const handleToggleSync = async (value: boolean) => {
    dispatch(setSyncEnabled(value));
    toast.info(`Sync đã ${value ? 'Bật' : 'Tắt'}`);
    if (value) {
      toast.info('Đang đồng bộ dữ liệu...');
      await syncData();
    }
  };

  const [budgetAlert, setBudgetAlert] = useState(true);

  const handleLogout = async () => {
    const { success, message } = await signOut();
    if (success) {
      toast.success(message);
      navigation.replace('AuthStack');
      dispatch(clearSession());
    } else {
      toast.error(message);
    }
  };

  const switchLanguage = (code: 'vi' | 'en') => {
    i18n.changeLanguage(code); // Thay đổi giao diện lập tức
    AsyncStorage.setItem(KEY_LOCALE_STORAGE, code); // Lưu lại cho lần sau
  };

  return (
    <Screen padding="m">
      <Box
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
      >
        <Text variant="header">Cá nhân</Text>
        <Pressable onPress={handleLogout}>
          <AppIcon
            name="arrow-right-from-bracket"
            size={24}
            color={colors.primary}
          />
        </Pressable>
      </Box>

      <Box backgroundColor="card" padding="m" borderRadius={16} marginTop="m">
        <Text variant="body">Trần Thanh Lộc</Text>
        <Text variant="body" color="secondaryText" marginTop="s">
          tranthanhloc@email.com
        </Text>
      </Box>

      <Box marginTop="m">
        <Text variant="body">Giao diện</Text>
        <Box flexDirection="row" marginTop="s">
          {(['system', 'light', 'dark'] as ThemeMode[]).map((mode, index) => {
            const isActive = themeMode === mode;
            return (
              <Pressable key={mode} onPress={() => handleThemeChange(mode)}>
                <Box
                  backgroundColor={isActive ? 'primary' : 'card'}
                  padding="s"
                  borderRadius={12}
                  marginRight={index < 2 ? 's' : undefined}
                >
                  <Text variant="body" color={isActive ? 'main' : 'text'}>
                    {mode === 'system'
                      ? 'Hệ thống'
                      : mode === 'light'
                      ? 'Sáng'
                      : 'Tối'}
                  </Text>
                </Box>
              </Pressable>
            );
          })}
        </Box>
      </Box>
      <Box marginTop="m">
        <Text variant="body">Ngôn ngữ</Text>
        <Box flexDirection="row" marginTop="s" gap="s">
          <AppButton
            backgroundColor={i18n.language === 'vi' ? 'primary' : 'card'}
            onPress={() => switchLanguage('vi')}
          >
            <Text
              variant="body"
              color={i18n.language === 'vi' ? 'main' : 'text'}
            >
              Tiếng Việt
            </Text>
          </AppButton>
          <AppButton
            backgroundColor={i18n.language === 'en' ? 'primary' : 'card'}
            onPress={() => switchLanguage('en')}
          >
            <Text
              variant="body"
              color={i18n.language === 'en' ? 'main' : 'text'}
            >
              English
            </Text>
          </AppButton>
        </Box>
      </Box>

      <Box marginTop="m">
        <Text variant="body">Hệ thống (Testing)</Text>
        <Box
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          padding="m"
          borderRadius={RADIUS.xl}
          backgroundColor="card"
          marginTop="s"
        >
          <Box flexDirection="row" alignItems="center" gap="m">
            <AppIcon name="cloud" size={20} color={colors.primary} />
            <Box>
              <Text variant="body">Đồng bộ Supabase</Text>
              <Text variant="caption" color="secondaryText">
                Tắt để test Offline mode
              </Text>
            </Box>
          </Box>
          <Switch
            value={isSyncEnabled}
            onValueChange={handleToggleSync}
            trackColor={{ false: colors.card, true: colors.primary }}
            thumbColor={colors.white}
          />
        </Box>
      </Box>

      <Box marginTop="m">
        <Text variant="body">Cài đặt</Text>
        <Box backgroundColor="card" padding="m" borderRadius={14} marginTop="s">
          <Text variant="body">Thông tin tài khoản</Text>
          <Text variant="body" color="secondaryText">
            Cập nhật hồ sơ
          </Text>
        </Box>
        <Box
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          padding="m"
          borderRadius={14}
          backgroundColor="card"
          marginTop="s"
        >
          <Box>
            <Text variant="body">Thông báo</Text>
            <Text variant="body" color="secondaryText">
              Cảnh báo ngân sách
            </Text>
          </Box>
          <Switch
            value={budgetAlert}
            onValueChange={setBudgetAlert}
            trackColor={{ false: colors.card, true: colors.primary }}
            thumbColor={colors.white}
          />
        </Box>
        <Box backgroundColor="card" padding="m" borderRadius={14} marginTop="s">
          <Text variant="body">Bảo mật</Text>
          <Text variant="body" color="secondaryText">
            Đổi mật khẩu, xác thực
          </Text>
        </Box>
      </Box>
    </Screen>
  );
};
