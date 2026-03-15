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
import QuickTransactionBottomSheet, {
  QuickTransactionBottomSheetRef,
} from '@/components/modals/QuickTransactionBottomSheet';
import { WALLET_TYPE, WALLET_TYPE_LABEL } from '@/constants/wallet.const';
import { RootStackParamList } from '@/navigation/types';
import { syncData } from '@/services/sync/syncDataSupabase';
import { getCategoriesThunk } from '@/store/category/category.thunk';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { Theme } from '@/theme';
import { SPACING } from '@/theme/constant';
import { toast } from '@/utils/toast';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from 'react-i18next';
import HomeOverview from './components/HomeOverview';
import HomeTransaction from './components/HomeTransaction';
import QuickAction from './components/QuickAction';
import WalletList from './components/WalletList';
import { createWallet } from '@/services/watermelondb/wmWallet.service';

export const HomeScreen = () => {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme<Theme>();
  const [selectedWalletType, setSelectedWalletType] =
    useState<WALLET_TYPE | null>(null);
  const [walletName, setWalletName] = useState('');
  const [walletAmount, setWalletAmount] = useState('');
  const dispatch = useAppDispatch();
  const { session } = useAppSelector(state => state.auth);
  const { time, isNetworkConnected } = useAppSelector(state => state.global);

  useEffect(() => {
    if (!isNetworkConnected) return;
    const startSync = async () => {
      try {
        await syncData();
      } catch (err) {
        console.log('Đồng bộ thất bại:', err);
      }
    };

    startSync();
  }, []);

  const handleGetCategories = async () => {
    dispatch(getCategoriesThunk({ month: time.month, year: time.year }));
  };

  useEffect(() => {
    handleGetCategories();
  }, [time]);

  const handleRefresh = async () => {
    if (!isNetworkConnected) return;
    await syncData();
  };

  const handleCreateWallet = (type: WALLET_TYPE) => {
    setSelectedWalletType(type);
    bottomSheetRef.current?.expand();
  };

  const handleCreateWalletConfirm = async () => {
    if (!session?.user?.id || !selectedWalletType) return;
    const data = {
      userId: session.user.id,
      displayName: walletName,
      walletType: selectedWalletType,
      initialBalance: Number(walletAmount),
      currentBalance: Number(walletAmount),
      creditLimit: 0,
    };
    await createWallet(data);
    toast.success(t('finance.create_wallet_success'));
    setWalletName('');
    setWalletAmount('');
    setSelectedWalletType(null);
    bottomSheetRef.current?.close();
  };

  const bottomSheetRef = useRef<AppBottomSheetRef>(null);
  const quickTransactionRef = useRef<QuickTransactionBottomSheetRef>(null);
  const bottomTabBarHeight = useBottomTabBarHeight();

  return (
    <Screen edges={[]} padding="none">
      <AppScrollView
        insetTop={false}
        onRefresh={handleRefresh}
        refreshBackground={colors.primary}
        contentContainerStyle={{
          paddingBottom: bottomTabBarHeight + SPACING.m,
        }}
        showsVerticalScrollIndicator={false}
      >
        <HomeOverview />
        <QuickAction
          onCreateWallet={handleCreateWallet}
          onQuickTransaction={() => quickTransactionRef.current?.expand()}
        />
        <WalletList />
        <Box backgroundColor="main" flex={1} gap="s" paddingTop="m">
          <Box
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Text paddingHorizontal="m" variant="subheader">
              {t('finance.history_transaction')}
            </Text>
            <AppButton
              onPress={() => navigation.navigate('HistoryTransaction')}
              style={{ paddingVertical: 0 }}
            >
              <Text
                variant="subheader"
                textDecorationLine="underline"
                color="primary"
              >
                {t('common.view_all')}
              </Text>
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
          {t('finance.create_wallet')}{' '}
          {selectedWalletType ? WALLET_TYPE_LABEL[selectedWalletType] : ''}
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
          suffix=".000đ"
        />
        <Box>
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
        </Box>
      </AppBottomSheet>
      <QuickTransactionBottomSheet ref={quickTransactionRef} />
    </Screen>
  );
};
