import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { Box, Text } from '@theme/components';
import Screen from '@/components/common/Screen';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setTheme, ThemeMode } from '@/store/global/global.slice';
import { useTheme } from '@shopify/restyle';
import { Theme } from '@/theme';
import AppIcon from '@/components/common/AppIcon';
import { signOut } from '@/services/auth/auth.service';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList, RootStackScreenProps } from '@/navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { clearSession } from '@/store/auth/auth.slice';
export const ProfileScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme<Theme>();
  const [showSettings, setShowSettings] = useState(false);
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector(state => state.global.theme);
  const handleThemeChange = (mode: ThemeMode) => {
    dispatch(setTheme(mode));
  };

  const handleLogout = async () => {
    const { success, message } = await signOut();
    if (success) {
      navigation.replace('AuthStack');
      dispatch(clearSession());
    }
  };

  return (
    <Screen>
      <Box flexDirection="row" alignItems="center" justifyContent="space-between">
        <Text variant="header">Cá nhân</Text>
        <Pressable onPress={handleLogout}>
          <AppIcon name="sign-out" size={24} color={colors.primary} />
        </Pressable>
        <Pressable onPress={() => setShowSettings(value => !value)}>
          <AppIcon name="gear" size={24} color={colors.primary} />
        </Pressable>
      </Box>

      <Box
        backgroundColor="card"
        padding="m"
        borderRadius={16}
        marginTop="m"
      >
        <Text variant="body">Trần Thanh Lộc</Text>
        <Text variant="body" color="secondaryText" marginTop="s">
          tranthanhloc@email.com
        </Text>
      </Box>

      {showSettings && (
        <Box marginTop="m">
          <Text variant="body">Giao diện</Text>
          <Box flexDirection="row" marginTop="s">
            {(['system', 'light', 'dark'] as ThemeMode[]).map((mode, index) => {
              const isActive = themeMode === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => handleThemeChange(mode)}
                >
                  <Box
                    backgroundColor={isActive ? 'primary' : 'card'}
                    padding="s"
                    borderRadius={12}
                    marginRight={index < 2 ? 's' : undefined}
                  >
                    <Text
                      variant="body"
                      color={isActive ? 'main' : 'text'}
                    >
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
      )}

      <Box marginTop="m">
        <Text variant="body">Cài đặt</Text>
        <Box
          backgroundColor="card"
          padding="m"
          borderRadius={14}
          marginTop="s"
        >
          <Text variant="body">Thông tin tài khoản</Text>
          <Text variant="body" color="secondaryText">
            Cập nhật hồ sơ
          </Text>
        </Box>
        <Box
          backgroundColor="card"
          padding="m"
          borderRadius={14}
          marginTop="s"
        >
          <Text variant="body">Thông báo</Text>
          <Text variant="body" color="secondaryText">
            Quản lý nhắc nhở
          </Text>
        </Box>
        <Box
          backgroundColor="card"
          padding="m"
          borderRadius={14}
          marginTop="s"
        >
          <Text variant="body">Bảo mật</Text>
          <Text variant="body" color="secondaryText">
            Đổi mật khẩu, xác thực
          </Text>
        </Box>
      </Box>
    </Screen>
  );
};
