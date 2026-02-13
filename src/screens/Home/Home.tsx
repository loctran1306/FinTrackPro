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
import { useTheme } from '@shopify/restyle';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HistoryTransaction from '../Transaction/components/HistoryTransaction';
import QuickAction from './components/QuickAction';
import WalletList from './components/WalletList';

export const HomeScreen = () => {
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
    dispatch(getCategoriesThunk());
  };

  useEffect(() => {
    handleGetCategories();
  }, []);

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
      toast.success('Thêm ví thành công');
      setWalletName('');
      setWalletAmount('');
      setSelectedWalletType(null);
      bottomSheetRef.current?.close();
    } else {
      toast.error('Thêm ví thất bại');
    }
  };

  const bottomSheetRef = useRef<AppBottomSheetRef>(null);
  const bottomTabBarHeight = useBottomTabBarHeight();
  return (
    <Screen edges={[]} padding="none">
      <AppScrollView
        onRefresh={handleRefresh}
        refreshBackground={colors.highlight}
        insetTop={false}
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
          <Box alignItems="center" marginTop="m">
            <AppButton
              shadow={false}
              onPress={handleToggleHiddenCurrency}
              style={{ padding: SPACING.xs }}
            >
              <Box flexDirection="row" alignItems="center" gap="s">
                <Text
                  variant="caption"
                  color="text"
                  textTransform="uppercase"
                  letterSpacing={1}
                >
                  Tổng tài sản
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
                Tổng thu nhập
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
                Theo dõi
              </Text>
              <Text variant="subheader">{formatVND(0)}</Text>
            </Box>
          </Box>
        </Box>
        <QuickAction onCreateWallet={handleCreateWallet} />
        <WalletList />
        <Box backgroundColor="main" flex={1} gap="s" paddingTop="m">
          <Text paddingHorizontal="m" variant="subheader">
            Lịch sử giao dịch
          </Text>
          <HistoryTransaction />
        </Box>
      </AppScrollView>
      <AppBottomSheet
        ref={bottomSheetRef}
        snapPoints={['50%', '80%']}
        onClose={() => bottomSheetRef.current?.close()}
      >
        <Text variant="header" marginBottom="m">
          Tạo ví {selectedWalletType ? WALLET_TYPES[selectedWalletType] : ''}
        </Text>
        <AppBottomSheetInput
          label="Tên ví"
          placeholder="Nhập tên ví"
          value={walletName}
          onChangeText={setWalletName}
        />
        <AppBottomSheetInput
          type="numeric"
          label="Số tiền"
          placeholder="Nhập số tiền"
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
                  Tạo ví
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
    </Screen>
  );
};
