import AppBottomSheet, {
  AppBottomSheetRef,
} from '@/components/common/AppBottomSheet';
import AppHeader from '@/components/common/AppHeader';
import AppIcon from '@/components/common/AppIcon';
import AppScrollView from '@/components/common/AppScrollView';
import Screen from '@/components/common/Screen';
import CalculatorKeyboard from '@/components/keyboard/CalculatorKeyboard';
import {
  convertFromDbAmount,
  convertToDbAmount,
  formatVND,
} from '@/helpers/currency.helper';
import { RootStackParamList } from '@/navigation/types';
import { walletService } from '@/services/wallet/wallet.service';
import { WalletType } from '@/services/wallet/wallet.type';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateWallet } from '@/store/wallet/wallet.slice';
import { getFinanceOverviewThunk } from '@/store/wallet/wallet.thunk';
import { selectWallets } from '@/store/wallet/wallet.selector';
import { Theme } from '@/theme';
import { Box, Text } from '@/theme/components';
import { RADIUS, SPACING } from '@/theme/constant';
import { toast } from '@/utils/toast';
import { CommonActions } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@shopify/restyle';
import React, { useMemo, useRef, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { WALLET_TYPES } from '@/constants/wallet';

const BalanceAdjustmentScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<
    NativeStackNavigationProp<RootStackParamList>
  >();
  const { colors } = useTheme<Theme>();
  const dispatch = useAppDispatch();
  const { creditWallets, paymentWallets } = useAppSelector(selectWallets);
  const { hiddenCurrency } = useAppSelector(state => state.global);

  const [selectedWallet, setSelectedWallet] = useState<WalletType | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [loading, setLoading] = useState(false);

  const calculatorSheetRef = useRef<AppBottomSheetRef>(null);

  const allWallets = useMemo(
    () => [...(paymentWallets || []), ...(creditWallets || [])],
    [paymentWallets, creditWallets],
  );

  const handleGoBack = () => {
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'MainTab' }] }),
    );
  };

  const handleWalletPress = (wallet: WalletType) => {
    const displayBalance = convertFromDbAmount(wallet.current_balance);
    setSelectedWallet(wallet);
    setAmountInput(
      displayBalance > 0 ? displayBalance.toString() : '',
    );
    calculatorSheetRef.current?.expand();
  };

  const handleCalculatorDone = async (result: number) => {
    if (!selectedWallet) return;
    try {
      setLoading(true);
      const dbAmount = convertToDbAmount(result);
      const updated = await walletService.updateBalance(
        selectedWallet.id,
        dbAmount,
      );
      if (updated) {
        dispatch(
          updateWallet({
            ...selectedWallet,
            current_balance: dbAmount,
          }),
        );
        dispatch(getFinanceOverviewThunk());
        toast.success(t('finance.update_balance_success'));
        calculatorSheetRef.current?.close();
        setSelectedWallet(null);
      } else {
        toast.error(t('finance.update_balance_error'));
      }
    } catch {
      toast.error(t('finance.update_balance_error'));
    } finally {
      setLoading(false);
    }
  };

  const getWalletIcon = (walletType: string) => {
    if (walletType === 'credit') return 'credit-card';
    if (walletType === 'bank') return 'id-card';
    return 'money-bill';
  };

  const renderWalletList = (
    title: string,
    wallets: WalletType[] | undefined,
  ) => {
    if (!wallets?.length) return null;
    return (
      <Box marginBottom="l">
        <Text
          variant="label"
          color="secondaryText"
          marginBottom="s"
          textTransform="uppercase"
        >
          {title}
        </Text>
        <Box gap="s">
          {wallets.map(wallet => (
            <TouchableOpacity
              key={wallet.id}
              activeOpacity={0.7}
              onPress={() => handleWalletPress(wallet)}
            >
              <Box
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
                padding="m"
                borderRadius={RADIUS.xl}
                backgroundColor="card"
                style={{
                  borderWidth: 1,
                  borderColor: colors.card,
                }}
              >
                <Box flexDirection="row" alignItems="center" gap="m">
                  <Box
                    width={48}
                    height={48}
                    borderRadius={RADIUS.m}
                    alignItems="center"
                    justifyContent="center"
                    style={{ backgroundColor: colors.highlight }}
                  >
                    <AppIcon
                      name={getWalletIcon(wallet.wallet_type)}
                      size={24}
                      color={colors.primary}
                    />
                  </Box>
                  <Box>
                    <Text variant="subheader">{wallet.display_name}</Text>
                    <Text variant="caption" color="secondaryText">
                      {WALLET_TYPES[wallet.wallet_type as keyof typeof WALLET_TYPES] || wallet.wallet_type}
                    </Text>
                  </Box>
                </Box>
                <Box alignItems="flex-end">
                  <Text variant="subheader">
                    {formatVND(wallet.current_balance, hiddenCurrency)}
                  </Text>
                  <Text variant="caption" color="primary">
                    {t('common.tap_to_edit')}
                  </Text>
                </Box>
              </Box>
            </TouchableOpacity>
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <Screen padding="none" edges={[]}>
      <AppHeader
        title={t('finance.update_balance')}
        backButton={handleGoBack}
      />
      <AppScrollView contentContainerStyle={{ padding: SPACING.m }}>
        <Box marginBottom="m">
          <Text variant="body" color="secondaryText">
            {t('finance.update_balance_description')}
          </Text>
        </Box>

        {renderWalletList(
          t('finance.payment_wallet'),
          paymentWallets,
        )}
        {renderWalletList(
          t('finance.credit_wallet'),
          creditWallets,
        )}

        {allWallets.length === 0 && (
          <Box
            padding="xl"
            alignItems="center"
            justifyContent="center"
          >
            <AppIcon
              name="wallet"
              size={48}
              color={colors.secondaryText}
            />
            <Text
              variant="body"
              color="secondaryText"
              textAlign="center"
              marginTop="m"
            >
              {t('finance.no_wallet_to_update')}
            </Text>
          </Box>
        )}
      </AppScrollView>

      {/* Calculator Modal */}
      <AppBottomSheet
        hideIndicator
        ref={calculatorSheetRef}
        snapPoints={[380]}
        hideBackdrop
        onClose={() => setSelectedWallet(null)}
      >
        <Box paddingBottom="m">
          {selectedWallet && (
            <Box
              paddingHorizontal="m"
              paddingBottom="s"
              alignItems="center"
            >
              <Text variant="caption" color="secondaryText">
                {t('finance.new_balance_for')}
              </Text>
              <Text variant="subheader">{selectedWallet.display_name}</Text>
            </Box>
          )}
          <CalculatorKeyboard
            key={selectedWallet?.id}
            onValueChange={setAmountInput}
            onDone={handleCalculatorDone}
            initialValue={amountInput}
          />
        </Box>
      </AppBottomSheet>
    </Screen>
  );
};

export default BalanceAdjustmentScreen;
