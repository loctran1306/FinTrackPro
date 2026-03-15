import AppButton from '@/components/button/AppButton';
import AppIcon from '@/components/common/AppIcon';
import AppInput from '@/components/common/AppInput';
import AppScrollView from '@/components/common/AppScrollView';
import Screen from '@/components/common/Screen';
import LoadingChildren from '@/components/loading/LoadingChildren';
import {
  WALLET_TYPE,
  WALLET_TYPE_COLOR,
  WALLET_TYPE_ICON,
  WALLET_TYPE_LABEL,
} from '@/constants/wallet.const';
import {
  formatVNDInput,
  parseVNDInput
} from '@/helpers/currency.helper';
import { database } from '@/models';
import Wallet from '@/models/Wallet';
import { navigateToMain } from '@/navigation/navigationRef';
import { RootStackParamList } from '@/navigation/types';
import * as wmWallet from '@/services/watermelondb/wmWallet.service';
import { useAppSelector } from '@/store/hooks';
import { Theme } from '@/theme';
import { RADIUS, SPACING } from '@/theme/constant';
import { toast } from '@/utils/toast';
import withObservables from '@nozbe/with-observables';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { useTheme } from '@shopify/restyle';
import { Box, Text } from '@theme/components';
import { useFormik } from 'formik';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { of } from 'rxjs';
import * as Yup from 'yup';

type FormProps = {
  walletId?: string;
  type?: string;
  wallet: Wallet | null;
  navigation: NativeStackScreenProps<
    RootStackParamList,
    'WalletForm'
  >['navigation'];
};


const WalletFormInner = ({ walletId, type, wallet, navigation }: FormProps) => {
  const { t } = useTranslation();
  const isEdit = !!walletId;
  const isLoading = isEdit && !wallet;

  const { colors } = useTheme<Theme>();
  const { top: topSafeArea, bottom: bottomSafeArea } = useSafeAreaInsets();
  const { session } = useAppSelector(state => state.auth);

  const defaultType = type ?? wallet?.walletType ?? WALLET_TYPE.CASH;

  const formWallet = useFormik<{
    displayName: string;
    walletType: string;
    initialBalance: number;
    currentBalance: number;
    isActive: boolean;
  }>({
    initialValues: {
      displayName: wallet?.displayName ?? '',
      walletType: defaultType,
      initialBalance: wallet
        ? wallet.initialBalance
        : 0,
      currentBalance: wallet
        ? wallet.currentBalance
        : 0,
      isActive: wallet?.isActive ?? true,
    },
    enableReinitialize: true,
    validationSchema: Yup.object().shape({
      displayName: Yup.string().required(t('warning.enter_wallet_name')),
      initialBalance: Yup.number().min(0),
      currentBalance: Yup.number().min(0),
    }),
    onSubmit: async values => {
      if (!session?.user?.id) {
        toast.error(t('common.error').toLocaleUpperCase());
        return;
      }
      try {
        if (isEdit && wallet) {
          await wmWallet.updateWallet(wallet, {
            displayName: values.displayName,
            currentBalance: values.currentBalance,
            isActive: values.isActive,
          });
          toast.success(t('finance.update_wallet_success'));
        } else {
          await wmWallet.createWallet({
            displayName: values.displayName,
            walletType: values.walletType,
            initialBalance: values.initialBalance,
            userId: session!.user!.id,
          });
          toast.success(t('finance.create_wallet_success'));
        }
        navigation.goBack();
      } catch {
        toast.error(
          isEdit
            ? t('finance.update_wallet_error')
            : t('finance.create_wallet_error'),
        );
      }
    },
  });

  const handleDelete = () => {
    if (!isEdit || !wallet) return;
    Alert.alert(
      t('finance.delete_wallet'),
      t('warning.delete_wallet_confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const deleted = await wmWallet.deleteWallet(wallet);
            if (deleted) {
              toast.success(t('finance.delete_wallet_success'));
              navigateToMain('Wallet');
            } else {
              toast.error(
                t('common.error').toLocaleUpperCase(),
                t('warning.delete_wallet_error_dependency'),
              );
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <Screen padding="none" edges={[]}>
        <LoadingChildren />
      </Screen>
    );
  }

  return (
    <Screen padding="none" edges={[]}>
      {/* Header */}
      <Box
        paddingHorizontal="m"
        paddingTop="m"
        paddingBottom="s"
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        style={{ paddingTop: topSafeArea }}
        backgroundColor="main"
      >
        <AppButton
          onPress={() => navigation.goBack()}
          style={{ padding: SPACING.s }}
          shadow={false}
        >
          <AppIcon name="arrow-left" size={24} color={colors.text} />
        </AppButton>
        <Text variant="subheader">
          {isEdit ? t('finance.edit_wallet') : t('finance.create_wallet')}
        </Text>
        <Box width={40} />
      </Box>

      <AppScrollView
        contentContainerStyle={{
          paddingHorizontal: SPACING.m,
          paddingBottom: bottomSafeArea + SPACING.m,
        }}
      >
        {/* Wallet Name */}
        <Box marginBottom="l">
          <Text variant="label" marginBottom="s" color="secondaryText">
            {t('finance.wallet_name')}
          </Text>
          <Box
            flexDirection="row"
            alignItems="center"
            padding="m"
            borderRadius={RADIUS.xl}
            backgroundColor="card"
            style={{ borderWidth: 1, borderColor: colors.card }}
          >
            <Box
              width={50}
              height={50}
              borderRadius={RADIUS.m}
              alignItems="center"
              justifyContent="center"
              marginRight="m"
              style={{
                backgroundColor:
                  (WALLET_TYPE_COLOR[formWallet.values.walletType] ?? colors.primary) + '30',
              }}
            >
              <AppIcon
                name={(WALLET_TYPE_ICON[formWallet.values.walletType] ?? 'wallet') as any}
                size={24}
                color={WALLET_TYPE_COLOR[formWallet.values.walletType] ?? colors.primary}
              />
            </Box>
            <Box flex={1} style={{ minWidth: 0 }}>
              <AppInput
                value={formWallet.values.displayName}
                onChangeText={t => formWallet.setFieldValue('displayName', t)}
                placeholder={t('finance.wallet_name_placeholder')}
                noMargin
                error={formWallet.errors.displayName}
                required
              />
            </Box>
          </Box>
        </Box>

        {/* Wallet Type (chỉ khi tạo mới) */}
        {!isEdit && (
          <Box marginBottom="l">
            <Text variant="label" marginBottom="s" color="secondaryText">
              {t('finance.wallet')}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: SPACING.s }}
            >
              {Object.values(WALLET_TYPE).map((wt: string) => (
                <TouchableOpacity
                  key={wt}
                  onPress={() => formWallet.setFieldValue('walletType', wt)}
                  style={{
                    paddingHorizontal: SPACING.m,
                    paddingVertical: SPACING.s,
                    borderRadius: RADIUS.l,
                    backgroundColor:
                      formWallet.values.walletType === wt
                        ? (WALLET_TYPE_COLOR[wt] ?? colors.primary) + '30'
                        : colors.card,
                    borderWidth: 1,
                    borderColor:
                      formWallet.values.walletType === wt
                        ? WALLET_TYPE_COLOR[wt] ?? colors.primary
                        : colors.card,
                  }}
                >
                  <Text
                    variant="label"
                    fontFamily={
                      formWallet.values.walletType === wt ? 'semiBold' : 'regular'
                    }
                  >
                    {WALLET_TYPE_LABEL[wt as keyof typeof WALLET_TYPE_LABEL] ?? wt}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Box>
        )}

        {/* Số dư ban đầu (tạo mới) hoặc Số dư hiện tại (sửa) */}
        <Box marginBottom="l">
          <Text variant="label" marginBottom="s" color="secondaryText">
            {isEdit
              ? t('finance.balance')
              : t('finance.amount')}
          </Text>
          <Box
            padding="l"
            borderRadius={RADIUS.xl}
            backgroundColor="card"
            style={{ borderWidth: 1, borderColor: colors.card }}
          >
            <Box>
              <AppInput
                value={formatVNDInput(
                  isEdit
                    ? formWallet.values.currentBalance
                    : formWallet.values.initialBalance,
                )}
                onChangeText={t =>
                  formWallet.setFieldValue(
                    isEdit ? 'currentBalance' : 'initialBalance',
                    parseVNDInput(t),
                  )
                }
                placeholder="0"
                keyboardType="number-pad"
                noMargin
                suffix=".000đ"
                error={
                  isEdit
                    ? formWallet.errors.currentBalance
                    : formWallet.errors.initialBalance
                }
                required
              />
            </Box>

          </Box>
        </Box>

        {/* Trạng thái hoạt động (chỉ khi sửa) */}
        {isEdit && (
          <Box
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            padding="m"
            borderRadius={RADIUS.xl}
            backgroundColor="card"
            marginBottom="l"
            style={{ borderWidth: 1, borderColor: colors.card }}
          >
            <Box flex={1}>
              <Text variant="label" fontFamily="semiBold">
                {t('common.on')} / {t('common.off')}
              </Text>
              <Text variant="caption" color="secondaryText">
                {t('finance.wallet_active_description')}
              </Text>
            </Box>
            <Switch
              value={formWallet.values.isActive}
              onValueChange={v => {
                formWallet.setFieldValue('isActive', v);
              }}
              trackColor={{ false: colors.card, true: colors.primary }}
              thumbColor={colors.white}
            />
          </Box>
        )}

        <Box gap="m">
          <AppButton
            onPress={() => formWallet.handleSubmit()}
            backgroundColor="primary"
          >
            <Text textAlign="center" color="white" textTransform="uppercase">
              {isEdit ? t('common.update') : t('common.create')}
            </Text>
          </AppButton>
          {isEdit && (
            <AppButton onPress={handleDelete} backgroundColor="danger">
              <Text textAlign="center" color="white" textTransform="uppercase">
                {t('finance.delete_wallet')}
              </Text>
            </AppButton>
          )}
        </Box>
      </AppScrollView>
    </Screen>
  );
};

const enhance = withObservables(
  ['walletId'],
  ({ walletId }: { walletId?: string }) => ({
    wallet: walletId
      ? database.collections
        .get<Wallet>('wallets')
        .findAndObserve(walletId)
      : of(null),
  }),
);

const EnhancedWalletForm = enhance(WalletFormInner);

export default function WalletFormScreen() {
  const { walletId, type } =
    useRoute<RouteProp<RootStackParamList, 'WalletForm'>>().params ?? {};
  const navigation =
    useNavigation<
      NativeStackNavigationProp<RootStackParamList, 'WalletForm'>
    >();
  return (
    <EnhancedWalletForm
      walletId={walletId}
      type={type}
      navigation={navigation}
    />
  );
}
