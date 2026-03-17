import {
  setSyncEnabled,
  setTheme,
  ThemeMode,
} from '@/store/global/global.slice';
import { useTheme } from '@shopify/restyle';
import { Theme } from '@/theme';
import AppBottomSheet, {
  AppBottomSheetRef,
} from '@/components/common/AppBottomSheet';
import AppButton from '@/components/button/AppButton';
import AppIcon from '@/components/common/AppIcon';
import Screen from '@/components/common/Screen';
import { signOut } from '@/services/auth/auth.service';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '@/navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { clearSession } from '@/store/auth/auth.slice';
import { toast } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEY_LOCALE_STORAGE } from '@/constants/locale.const';
import React, { useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { Box, Text } from '@/theme/components';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addOpacity } from '@/helpers/color.helper';
import { RADIUS, SPACING } from '@/theme/constant';
import { syncData } from '@/services/sync/syncDataSupabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AVATAR_SIZE = 80;

export const ProfileScreen = () => {
  const { t, i18n } = useTranslation();
  const { top: topInset } = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme<Theme>();
  const dispatch = useAppDispatch();
  const { theme: themeMode, isSyncEnabled } = useAppSelector(
    state => state.global,
  );
  const { session } = useAppSelector(state => state.auth);

  const themeSheetRef = useRef<AppBottomSheetRef>(null);
  const languageSheetRef = useRef<AppBottomSheetRef>(null);

  const [budgetAlert, setBudgetAlert] = useState(true);

  const displayName =
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    session?.user?.email?.split('@')[0] ||
    'User';
  const email = session?.user?.email || '';
  const avatarUrl = session?.user?.user_metadata?.avatar_url;

  const handleThemeChange = (mode: ThemeMode) => {
    dispatch(setTheme(mode));
    themeSheetRef.current?.close();
  };

  const handleToggleSync = async (value: boolean) => {
    dispatch(setSyncEnabled(value));
    toast.info(`Sync đã ${value ? 'Bật' : 'Tắt'}`);
    if (value) {
      toast.info('Đang đồng bộ dữ liệu...');
      await syncData();
    }
  };

  const switchLanguage = (code: 'vi' | 'en') => {
    i18n.changeLanguage(code);
    AsyncStorage.setItem(KEY_LOCALE_STORAGE, code);
    languageSheetRef.current?.close();
  };

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

  const SettingCard = ({
    icon,
    iconColor = colors.primary,
    title,
    onPress,
    right,
  }: {
    icon: string;
    iconColor?: string;
    title: string;
    onPress?: () => void;
    right?: React.ReactNode;
  }) => (
    <Pressable
      onPress={onPress}
      disabled={!onPress && !right}
      style={({ pressed }) => [
        styles.settingCard,
        { backgroundColor: colors.card },
        pressed && onPress && { opacity: 0.7 },
      ]}
    >
      <Box flexDirection="row" alignItems="center" flex={1}>
        <Box
          width={40}
          height={40}
          borderRadius={RADIUS.m}
          alignItems="center"
          justifyContent="center"
          style={{ backgroundColor: addOpacity(iconColor, 0.15) }}
        >
          <AppIcon name={icon as any} size={20} color={iconColor} />
        </Box>
        <Text variant="body" marginLeft="m" fontFamily="medium">
          {title}
        </Text>
      </Box>
      {right ??
        (onPress && (
          <AppIcon
            name="chevron-right"
            size={20}
            color={colors.secondaryText}
          />
        ))}
    </Pressable>
  );

  return (
    <Screen padding="none" edges={[]}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.main }}
        contentContainerStyle={{ paddingBottom: SPACING.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: nền hồng + avatar + tên + email */}
        <Box
          style={{ paddingTop: topInset + SPACING.m }}
          paddingBottom="xl"
          paddingHorizontal="m"
          backgroundColor="main"
          alignItems="center"
          position="relative"
        >
          <Box position="absolute" top={topInset} right={SPACING.m} zIndex={1}>
            <Pressable onPress={handleLogout} hitSlop={12}>
              <AppIcon
                name="arrow-right-from-bracket"
                size={24}
                color={colors.danger}
              />
            </Pressable>
          </Box>

          <View style={[styles.avatarWrap, { backgroundColor: colors.card }]}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <AppIcon
                name="user"
                size={AVATAR_SIZE / 2}
                color={colors.primary}
              />
            )}
          </View>
          <Text variant="header" marginTop="m">
            {displayName}
          </Text>
          <Text variant="body" color="secondaryText" marginTop="xs">
            {email || '—'}
          </Text>
        </Box>

        {/* Danh sách cài đặt */}
        <Box
          flex={1}
          backgroundColor="card"
          borderTopLeftRadius={RADIUS.xl}
          borderTopRightRadius={RADIUS.xl}
          paddingHorizontal="m"
          paddingTop="l"
          paddingBottom="xl"
        >
          <SettingCard
            icon="trash"
            title={t('profile.deleted_recently')}
            onPress={() => navigation.navigate('DeletedRecently')}
          />
          <SettingCard
            icon="arrows-rotate"
            title={t('profile.recurring_transactions')}
            onPress={() => {}}
          />
          <SettingCard
            icon="file-export"
            title={t('profile.export_data')}
            onPress={() => {}}
          />
          <SettingCard
            icon="globe"
            title={t('profile.currency_settings')}
            onPress={() => {}}
          />

          <SettingCard
            icon="palette"
            title={t('profile.theme')}
            onPress={() => themeSheetRef.current?.expand()}
            right={
              <Box flexDirection="row" alignItems="center" gap="s">
                <Text variant="caption" color="secondaryText">
                  {themeMode === 'system'
                    ? t('profile.theme_system')
                    : themeMode === 'light'
                    ? t('profile.theme_light')
                    : t('profile.theme_dark')}
                </Text>
                <AppIcon
                  name="chevron-right"
                  size={16}
                  color={colors.secondaryText}
                />
              </Box>
            }
          />
          <SettingCard
            icon="language"
            title={t('profile.language')}
            onPress={() => languageSheetRef.current?.expand()}
            right={
              <Box flexDirection="row" alignItems="center" gap="s">
                <Text variant="caption" color="secondaryText">
                  {i18n.language === 'vi'
                    ? t('profile.language_vi')
                    : t('profile.language_en')}
                </Text>
                <AppIcon
                  name="chevron-right"
                  size={16}
                  color={colors.secondaryText}
                />
              </Box>
            }
          />

          <SettingCard
            icon="user"
            title={t('profile.account_info')}
            onPress={() => {}}
          />
          <SettingCard
            icon="bell"
            title={t('profile.notifications')}
            right={
              <Switch
                value={budgetAlert}
                onValueChange={setBudgetAlert}
                trackColor={{ false: colors.gray, true: colors.primary }}
                thumbColor={colors.white}
              />
            }
          />
          <SettingCard
            icon="lock"
            title={t('profile.security')}
            onPress={() => {}}
          />
          <SettingCard
            icon="cloud"
            title={t('profile.sync_supabase')}
            right={
              <Switch
                value={isSyncEnabled}
                onValueChange={handleToggleSync}
                trackColor={{ false: colors.gray, true: colors.primary }}
                thumbColor={colors.white}
              />
            }
          />
        </Box>
      </ScrollView>

      {/* Bottom sheet chọn Theme */}
      <AppBottomSheet
        ref={themeSheetRef}
        snapPoints={['35%']}
        onClose={() => {}}
        isScrollable={false}
      >
        <Text variant="subheader" marginBottom="m">
          {t('profile.theme')}
        </Text>
        {(['system', 'light', 'dark'] as ThemeMode[]).map(mode => {
          const isActive = themeMode === mode;
          return (
            <AppButton
              key={mode}
              onPress={() => handleThemeChange(mode)}
              shadow={false}
              style={[
                styles.optionBtn,
                isActive && {
                  backgroundColor: addOpacity(colors.primary, 0.15),
                },
              ]}
            >
              <Text
                variant="body"
                color={isActive ? 'primary' : 'text'}
                fontFamily={isActive ? 'semiBold' : 'regular'}
              >
                {mode === 'system'
                  ? t('profile.theme_system')
                  : mode === 'light'
                  ? t('profile.theme_light')
                  : t('profile.theme_dark')}
              </Text>
              {isActive && (
                <AppIcon name="check" size={20} color={colors.primary} />
              )}
            </AppButton>
          );
        })}
      </AppBottomSheet>

      {/* Bottom sheet chọn Language */}
      <AppBottomSheet
        ref={languageSheetRef}
        snapPoints={['30%']}
        onClose={() => {}}
        isScrollable={false}
      >
        <Text variant="subheader" marginBottom="m">
          {t('profile.language')}
        </Text>
        <AppButton
          onPress={() => switchLanguage('vi')}
          shadow={false}
          style={[
            styles.optionBtn,
            i18n.language === 'vi' && {
              backgroundColor: addOpacity(colors.primary, 0.15),
            },
          ]}
        >
          <Text
            variant="body"
            color={i18n.language === 'vi' ? 'primary' : 'text'}
            fontFamily={i18n.language === 'vi' ? 'semiBold' : 'regular'}
          >
            {t('profile.language_vi')}
          </Text>
          {i18n.language === 'vi' && (
            <AppIcon name="check" size={20} color={colors.primary} />
          )}
        </AppButton>
        <AppButton
          onPress={() => switchLanguage('en')}
          shadow={false}
          style={[
            styles.optionBtn,
            i18n.language === 'en' && {
              backgroundColor: addOpacity(colors.primary, 0.15),
            },
          ]}
        >
          <Text
            variant="body"
            color={i18n.language === 'en' ? 'primary' : 'text'}
            fontFamily={i18n.language === 'en' ? 'semiBold' : 'regular'}
          >
            {t('profile.language_en')}
          </Text>
          {i18n.language === 'en' && (
            <AppIcon name="check" size={20} color={colors.primary} />
          )}
        </AppButton>
      </AppBottomSheet>
    </Screen>
  );
};

const styles = StyleSheet.create({
  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.m,
    borderRadius: RADIUS.m,
    marginBottom: SPACING.s,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.m,
    borderRadius: RADIUS.m,
    marginBottom: SPACING.s,
  },
});
