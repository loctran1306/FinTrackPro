import AppScrollView from '@/components/common/AppScrollView';
import Screen from '@/components/common/Screen';
import { Box, Text } from '@theme/components';
import React, { useEffect, useRef, useState } from 'react';

import AppButton from '@/components/button/AppButton';
import AppBottomSheet, {
  AppBottomSheetRef,
} from '@/components/common/AppBottomSheet';
import AppBottomSheetInput from '@/components/common/AppBottomSheetInput';
import AppIcon from '@/components/common/AppIcon';
import LoadingWithLogo from '@/components/loading/LoadingWithLogo';
import { WALLET_TYPES } from '@/constants/wallet';
import { formatVND } from '@/helpers/currency.helper';
import { RootStackParamList } from '@/navigation/types';
import { getCategoriesThunk } from '@/store/category/category.thunk';
import { setHiddenCurrency } from '@/store/global/global.slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { getTransactionsThunk } from '@/store/transaction/transaction.thunk';
import {
  createWalletThunk,
  getFinanceOverviewThunk,
  getWalletsThunk,
} from '@/store/wallet/wallet.thunk';
import { Theme } from '@/theme';
import { SPACING } from '@/theme/constant';
import { toast } from '@/utils/toast';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QuickTransactionBottomSheet, {
  QuickTransactionBottomSheetRef,
} from '@/components/modals/QuickTransactionBottomSheet';
import HomeTransaction from './components/HomeTransaction';
import QuickAction from './components/QuickAction';
import WalletList from './components/WalletList';

export const HomeScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme<Theme>();
  const { top: topSafeArea } = useSafeAreaInsets();
  const [selectedWalletType, setSelectedWalletType] = useState<
    keyof typeof WALLET_TYPES | null
  >(null);
  const [walletName, setWalletName] = useState('');
  const [walletAmount, setWalletAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const dispatch = useAppDispatch();
  const { hiddenCurrency } = useAppSelector(state => state.global);
  const { financeOverview } = useAppSelector(state => state.wallet);
  const { session } = useAppSelector(state => state.auth);
  const { time } = useAppSelector(state => state.global);



  const getData = async () => {
    dispatch(getFinanceOverviewThunk());
    if (session?.user?.id) {
      dispatch(getWalletsThunk(session.user.id));
      dispatch(
        getTransactionsThunk({ userId: session.user.id, page: 1, limit: 10 }),
      );
    }
  };

  const handleGetCategories = async () => {
    dispatch(getCategoriesThunk({ month: time.month, year: time.year }));
  };

  useEffect(() => {
    handleGetCategories();
  }, [time]);

  const handleRefresh = async () => {
    getData();
  };

  const handleToggleHiddenCurrency = () => {
    dispatch(setHiddenCurrency(!hiddenCurrency));
  };

  const handleCreateWallet = (type: keyof typeof WALLET_TYPES) => {
    setSelectedWalletType(type);
    bottomSheetRef.current?.expand();
  };

  const resultRef = useRef<any>(null);
  const handleCreateWalletConfirm = async () => {
    if (!session?.user?.id || !selectedWalletType) return;
    const walletData = {
      user_id: session.user.id,
      display_name: walletName,
      wallet_type: selectedWalletType,
      initial_balance: Number(walletAmount),
      current_balance: Number(walletAmount),
      credit_limit: 0,
    };
    setLoading(true);
    try {
      const res = await dispatch(createWalletThunk(walletData)).unwrap();
      resultRef.current = res;
    } catch (error) {
      toast.error(error as string);
    } finally {
      setLoadingComplete(true);
    }
  };
  const handleCreateWalletComplete = () => {
    setLoadingComplete(false);
    setLoading(false);
    if (resultRef.current) {
      toast.success(t('finance.create_wallet_success'));
      setWalletName('');
      setWalletAmount('');
      setSelectedWalletType(null);
      bottomSheetRef.current?.close();
    } else {
      toast.error(t('finance.create_wallet_error'));
    }
  };

  const bottomSheetRef = useRef<AppBottomSheetRef>(null);
  const quickTransactionRef = useRef<QuickTransactionBottomSheetRef>(null);
  const bottomTabBarHeight = useBottomTabBarHeight();

  return (
    <Screen edges={[]} padding="none">
      <AppScrollView
        insetTop={false}
        onRefresh={handleRefresh}
        refreshBackground={colors.highlight}
        contentContainerStyle={{
          paddingBottom: bottomTabBarHeight + SPACING.m,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Box
          paddingHorizontal="m"
          paddingBottom="l"
          gap="l"
          style={{ paddingTop: topSafeArea }}
        >
          <Box alignItems="center">
            <AppButton
              shadow={false}
              onPress={handleToggleHiddenCurrency}
              style={{ padding: SPACING.m }}
            >
              <Box flexDirection="row" alignItems="center" gap="s">
                <Text
                  variant="caption"
                  color="text"
                  textTransform="uppercase"
                  letterSpacing={1}
                >
                  {t('finance.total_assets')}
                </Text>
                {!hiddenCurrency ? (
                  <AppIcon name="eye" size={16} color={colors.primary} />
                ) : (
                  <AppIcon name="eye-slash" size={16} color={colors.primary} />
                )}
              </Box>
            </AppButton>
            <Text variant="header">
              {formatVND(financeOverview?.total_assets || 0, hiddenCurrency)}
            </Text>
          </Box>
          <Box
            flexDirection="row"
            alignItems="center"
            justifyContent="space-around"
          >
            <Box flex={1} alignItems="center">
              <Text variant="caption" color="secondaryText">
                {t('finance.total_income')}
              </Text>
              <Text variant="subheader">
                {formatVND(
                  financeOverview?.monthly_income || 0,
                  hiddenCurrency,
                )}
              </Text>
            </Box>
            <AppIcon
              name="ellipsis-vertical"
              size={24}
              color={colors.secondaryText}
            />
            <Box flex={1} alignItems="center">
              <Text variant="caption" color="secondaryText">
                {t('finance.tracking')}
              </Text>
              <Text variant="subheader">{formatVND(0)}</Text>
            </Box>
          </Box>
        </Box>
        <QuickAction
          onCreateWallet={handleCreateWallet}
          onQuickTransaction={() => quickTransactionRef.current?.expand()}
        />
        <WalletList />
        <Box backgroundColor="main" flex={1} gap="s" paddingTop="m">
          <Box flexDirection="row" justifyContent="space-between" alignItems="center" >
            <Text paddingHorizontal="m" variant="subheader">
              {t('finance.history_transaction')}
            </Text>
            <AppButton
              onPress={() => navigation.navigate('HistoryTransaction')}
              style={{ paddingVertical: 0 }}
            >
              <Text variant="subheader" textDecorationLine="underline" color="primary">{t('common.view_all')}</Text>
            </AppButton>
          </Box>
          <HomeTransaction />
        </Box>
      </AppScrollView>
      <AppBottomSheet
        ref={bottomSheetRef}
        snapPoints={['50%', '80%']}
        onClose={() => bottomSheetRef.current?.close()}
      >
        <Text variant="header" marginBottom="m">
          {t('finance.create_wallet')} {selectedWalletType ? WALLET_TYPES[selectedWalletType] : ''}
        </Text>
        <AppBottomSheetInput
          label={t('finance.wallet_name')}
          placeholder={t('finance.wallet_name_placeholder')}
          value={walletName}
          onChangeText={setWalletName}
        />
        <AppBottomSheetInput
          type="numeric"
          label={t('finance.amount')}
          placeholder={t('finance.amount_placeholder')}
          value={walletAmount}
          onChangeText={setWalletAmount}
        />
        <Box>
          {!loading ? (
            <AppButton
              disabled={!walletName || !walletAmount}
              backgroundColor="primary"
              shadow={false}
              onPress={handleCreateWalletConfirm}
              style={{
                marginTop: SPACING.m,
              }}
            >
              <Box
                flexDirection="row"
                alignItems="center"
                justifyContent="center"
                gap="s"
              >
                <AppIcon name="plus" size={20} color="white" />
                <Text variant="body" fontFamily="semiBold" color="white">
                  {t('finance.create_wallet')}
                </Text>
              </Box>
            </AppButton>
          ) : (
            <Box alignItems="center" justifyContent="center">
              <LoadingWithLogo
                isComplete={loadingComplete}
                onComplete={handleCreateWalletComplete}
              />
            </Box>
          )}
        </Box>
      </AppBottomSheet>
      <QuickTransactionBottomSheet ref={quickTransactionRef} />
    </Screen>
  );
};
