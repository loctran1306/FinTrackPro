import AppButton from '@/components/button/AppButton';
import AppIcon from '@/components/common/AppIcon';
import Screen from '@/components/common/Screen';
import LoadingWithLogo from '@/components/loading/LoadingWithLogo';
import { signInWithGoogle } from '@/services/auth/auth.service';
import { deviceService } from '@/services/device/device.service';
import { setSession } from '@/store/auth/auth.slice';
import { useAppDispatch } from '@/store/hooks';
import { Theme } from '@/theme';
import { RADIUS } from '@/theme/constant';
import { useTheme } from '@shopify/restyle';
import { Box, Text } from '@theme/components';
import React, { useCallback, useRef, useState } from 'react';
import { Alert, Image, Platform, StyleSheet } from 'react-native';
import 'react-native-url-polyfill/auto';


export default function LoginScreen({ navigation }: any) {
  const { colors } = useTheme<Theme>();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [loginComplete, setLoginComplete] = useState(false);
  const loginResultRef = useRef<{ session: any; error: string | null } | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setLoginComplete(false);
    loginResultRef.current = null;

    try {
      const { session, error } = await signInWithGoogle();
      loginResultRef.current = { session, error };
    } catch (err) {
      loginResultRef.current = { session: null, error: 'Đã có lỗi hệ thống xảy ra' };
    } finally {
      // API đã trả về kết quả (dù thành công hay thất bại)
      setLoginComplete(true);
    }
  };

  const handleProgressComplete = useCallback(async () => {
    const result = loginResultRef.current;
    setLoading(false);
    setLoginComplete(false);

    if (!result) return;

    if (result.error) {
      Alert.alert('Thông báo', result.error);
    } else if (result.session) {
      dispatch(setSession(result.session));
      if (Platform.OS === 'android') {
        if (result.session.user.id && result.session.user.id !== '') {
          await deviceService.updateDeviceToken(result.session.user.id);
        }
      }
      navigation.replace('MainTab', { screen: 'Home' });
    }
  }, [dispatch, navigation]);

  return (
    <Screen edges={['top', 'bottom']} backgroundColor="main">
      <Box flex={1} justifyContent="space-between" padding="xl">
        <Box alignItems="center" marginTop="xl">
          <Image
            source={require('@assets/logo/logo_money.png')}
            style={styles.mainLogo}
          />
          <Text variant="header" color="primary" marginBottom="s">
            FinTrackPro
          </Text>
          <Text variant="caption" color="secondaryText" textAlign="center">
            Quản lý tài chính dễ dàng và hiệu quả
          </Text>
        </Box>

        <Box>
          {loading ? (
            <Box alignItems="center" justifyContent="center" height={60}>
              <LoadingWithLogo
                color={colors.primary}
                isComplete={loginComplete}
                onComplete={handleProgressComplete}
              />
            </Box>
          ) : (
            <AppButton
              onPress={handleLogin}
              haptic="impactLight"
              style={styles.googleBtn}
              containerProps={{
                backgroundColor: 'main',
                borderRadius: RADIUS.l,
                paddingVertical: 'm',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 0.5,
                borderColor: 'secondaryText'
              }}
            >
              <Box flexDirection="row" alignItems="center">
                <AppIcon name="google" size={20} color="#4285F4" family="brands" />
                <Text variant="subheader" color="text" marginLeft="s">
                  Tiếp tục với Google
                </Text>
              </Box>
            </AppButton>
          )}
        </Box>

        <Text variant="label" textAlign="center" color="secondaryText">
          Bằng cách đăng nhập, bạn đồng ý với {"\n"}
          <Text color="primary">Điều khoản & Chính sách</Text> của chúng tôi
        </Text>
      </Box>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mainLogo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  googleBtn: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },

});