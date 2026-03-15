import AppButton from '@/components/button/AppButton';
import AppBottomSheet, {
  AppBottomSheetRef,
} from '@/components/common/AppBottomSheet';
import AppHeader from '@/components/common/AppHeader';
import AppIcon from '@/components/common/AppIcon';
import AppScrollView from '@/components/common/AppScrollView';
import Screen from '@/components/common/Screen';
import CalculatorKeyboard from '@/components/keyboard/CalculatorKeyboard';
import { WALLET_TYPE } from '@/constants/wallet.const';
import { addOpacity } from '@/helpers/color.helper';
import { formatVND } from '@/helpers/currency.helper';
import Wallet from '@/models/Wallet';
import { database } from '@/models';
import { RootStackParamList } from '@/navigation/types';
import { createTransfer } from '@/services/watermelondb/wmWallet.service';
import { useAppSelector } from '@/store/hooks';
import { Theme } from '@/theme';
import { Box, Text } from '@/theme/components';
import { RADIUS, SPACING } from '@/theme/constant';
import { toast } from '@/utils/toast';
import withObservables from '@nozbe/with-observables';
import {
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@shopify/restyle';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard } from 'react-native';
import { of } from 'rxjs';
import { observeWallets } from '@/services/watermelondb/wmWallet.service';

type Props = {
  creditWallet: Wallet | null;
  wallets: Wallet[];
};

const CreditPayment = ({ creditWallet, wallets }: Props) => {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme<Theme>();
  const { hiddenCurrency } = useAppSelector(state => state.global);
  const userId = useAppSelector(
    state => state.auth.session?.user?.id ?? '',
  );

  const totalCalcRef = useRef<AppBottomSheetRef>(null);
  const paymentCalcRef = useRef<AppBottomSheetRef>(null);
  const heldCalcRef = useRef<AppBottomSheetRef>(null);
  const paymentWalletSheetRef = useRef<AppBottomSheetRef>(null);
  const heldWalletSheetRef = useRef<AppBottomSheetRef>(null);

  const [totalPaymentAmount, setTotalPaymentAmount] = useState(0);
  const [selectedPaymentWallet, setSelectedPaymentWallet] =
    useState<Wallet | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [selectedHeldWallet, setSelectedHeldWallet] = useState<Wallet | null>(
    null,
  );
  const [heldAmount, setHeldAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Ví thanh toán: cash, bank (không credit, không jar)
  const paymentWallets = wallets.filter(
    w => w.walletType !== 'credit' && w.walletType !== 'jar',
  );
  // Ví giữ hộ: jar
  const heldWallets = wallets.filter(w => w.walletType === WALLET_TYPE.JAR);

  const allocatedAmount = paymentAmount + heldAmount;
  const totalAmount =
    totalPaymentAmount > 0 ? totalPaymentAmount : allocatedAmount;
  const isValidAllocation =
    totalPaymentAmount === 0 || allocatedAmount === totalPaymentAmount;
  const canSubmit =
    totalAmount > 0 &&
    isValidAllocation &&
    ((paymentAmount > 0 && selectedPaymentWallet) ||
      (heldAmount > 0 && selectedHeldWallet));

  const handleTotalCalcDone = (result: number) => {
    setTotalPaymentAmount(result);
    setPaymentAmount(result);
    setHeldAmount(0);
    setSelectedHeldWallet(null);
    totalCalcRef.current?.close();
  };

  const handlePaymentCalcDone = (result: number) => {
    setPaymentAmount(result);
    if (totalPaymentAmount > 0 && heldAmount === 0) {
      setTotalPaymentAmount(result);
    } else if (totalPaymentAmount === 0) {
      setTotalPaymentAmount(result + heldAmount);
    }
    paymentCalcRef.current?.close();
  };

  const handleHeldCalcDone = (result: number) => {
    setHeldAmount(result);
    if (totalPaymentAmount > 0) {
      setPaymentAmount(Math.max(0, totalPaymentAmount - result));
    } else {
      setTotalPaymentAmount(paymentAmount + result);
    }
    heldCalcRef.current?.close();
  };

  const handlePay = async () => {
    if (!creditWallet || !userId) return;
    if (paymentAmount > 0 && selectedPaymentWallet) {
      if (paymentAmount > Number(selectedPaymentWallet.currentBalance)) {
        toast.error(t('finance.transfer_error'));
        return;
      }
    }
    if (heldAmount > 0 && selectedHeldWallet) {
      if (heldAmount > Number(selectedHeldWallet.currentBalance)) {
        toast.error(t('finance.transfer_error'));
        return;
      }
    }
    try {
      setLoading(true);
      Keyboard.dismiss();
      const transfers: Array<{ from: string; to: string; amount: number }> = [];
      if (paymentAmount > 0 && selectedPaymentWallet) {
        transfers.push({
          from: selectedPaymentWallet.id,
          to: creditWallet.id,
          amount: paymentAmount,
        });
      }
      if (heldAmount > 0 && selectedHeldWallet) {
        transfers.push({
          from: selectedHeldWallet.id,
          to: creditWallet.id,
          amount: heldAmount,
        });
      }
      for (const tr of transfers) {
        await createTransfer({
          fromWalletId: tr.from,
          toWalletId: tr.to,
          amount: tr.amount,
          note: `${t('finance.pay_credit')}: ${creditWallet.displayName}`,
          categoryId: '',
          userId,
        });
      }
      toast.success(t('finance.transfer_success'));
      navigation.goBack();
    } catch {
      toast.error(t('finance.transfer_error'));
    } finally {
      setLoading(false);
    }
  };

  if (!creditWallet) return null;

  return (
    <Screen padding="none">
      <AppHeader title={t('finance.pay_credit')} />
      <AppScrollView>
        <Box padding="m" gap="l">
          {/* Credit wallet đang thanh toán */}
          <Box
            padding="m"
            borderRadius={RADIUS.l}
            style={{
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.card,
            }}
          >
            <Text variant="caption" color="secondaryText" marginBottom="xs">
              {t('finance.credit_wallet')}
            </Text>
            <Text variant="subheader">{creditWallet.displayName}</Text>
            <Text variant="body" color="danger">
              {formatVND(
                Math.abs(Number(creditWallet.currentBalance)),
                hiddenCurrency,
              )}{' '}
              {t('finance.balance')}
            </Text>
          </Box>

          {/* Số tiền thanh toán thẻ */}
          <Box gap="s">
            <Text variant="subheader">
              {t('finance.credit_payment_amount')}
            </Text>
            <AppButton
              shadow={false}
              onPress={() => {
                Keyboard.dismiss();
                totalCalcRef.current?.expand();
              }}
              backgroundColor="card"
              style={{
                padding: SPACING.l,
                borderRadius: RADIUS.l,
                borderWidth: 1,
                borderColor: addOpacity(colors.primary, 0.3),
              }}
            >
              <Box alignItems="center" gap="xs">
                <AppIcon name="calculator" size={24} color={colors.primary} />
                <Text variant="header" color="primary">
                  {formatVND(totalAmount, hiddenCurrency)}
                </Text>
                <Text variant="caption" color="secondaryText">
                  {t('finance.tap_to_enter_amount')}
                </Text>
              </Box>
            </AppButton>
          </Box>

          {/* Số tiền từ ví thanh toán */}
          <Box gap="s">
            <Text variant="subheader">{t('finance.payment_from_wallet')}</Text>
            <AppButton
              onPress={() => paymentWalletSheetRef.current?.expand()}
              backgroundColor="card"
              style={{
                padding: SPACING.m,
                borderRadius: RADIUS.m,
                borderWidth: 1,
                borderColor: colors.card,
              }}
            >
              <Box
                flexDirection="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Text variant="body">
                  {selectedPaymentWallet?.displayName ?? t('finance.select_wallet')}
                </Text>
                <Text variant="body" fontFamily="semiBold">
                  {formatVND(paymentAmount, hiddenCurrency)}
                </Text>
              </Box>
            </AppButton>
            <AppButton
              shadow={false}
              onPress={() => {
                Keyboard.dismiss();
                paymentCalcRef.current?.expand();
              }}
              style={{ padding: 0 }}
            >
              <Box
                flexDirection="row"
                alignItems="center"
                gap="s"
                padding="s"
                style={{
                  borderRadius: RADIUS.m,
                  borderWidth: 1,
                  borderColor: addOpacity(colors.primary, 0.3),
                }}
              >
                <AppIcon name="calculator" size={20} color={colors.primary} />
                <Text variant="body" color="primary">
                  {t('finance.amount')}: {formatVND(paymentAmount, hiddenCurrency)}
                </Text>
              </Box>
            </AppButton>
          </Box>

          {/* Số tiền từ ví giữ hộ */}
          <Box gap="s">
            <Text variant="subheader">{t('finance.amount_from_held')}</Text>
            <AppButton
              onPress={() => heldWalletSheetRef.current?.expand()}
              backgroundColor="card"
              style={{
                padding: SPACING.m,
                borderRadius: RADIUS.m,
                borderWidth: 1,
                borderColor: colors.card,
              }}
            >
              <Box
                flexDirection="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Text variant="body">
                  {selectedHeldWallet?.displayName ??
                    t('finance.select_held_wallet')}
                </Text>
                <Text variant="body" fontFamily="semiBold">
                  {formatVND(heldAmount, hiddenCurrency)}
                </Text>
              </Box>
            </AppButton>
            <AppButton
              shadow={false}
              onPress={() => {
                Keyboard.dismiss();
                heldCalcRef.current?.expand();
              }}
              style={{ padding: 0 }}
            >
              <Box
                flexDirection="row"
                alignItems="center"
                gap="s"
                padding="s"
                style={{
                  borderRadius: RADIUS.m,
                  borderWidth: 1,
                  borderColor: addOpacity(colors.primary, 0.3),
                }}
              >
                <AppIcon name="calculator" size={20} color={colors.primary} />
                <Text variant="body" color="primary">
                  {t('finance.held_amount')}:{' '}
                  {formatVND(heldAmount, hiddenCurrency)}
                </Text>
              </Box>
            </AppButton>
          </Box>

          {/* Tổng */}
          <Box
            padding="m"
            borderRadius={RADIUS.m}
            style={{
              backgroundColor: addOpacity(colors.primary, 0.1),
              borderWidth: 1,
              borderColor: addOpacity(colors.primary, 0.2),
            }}
          >
            <Text variant="caption" color="secondaryText">
              {t('finance.amount')}
            </Text>
            <Text variant="header" color="primary">
              {formatVND(totalAmount, hiddenCurrency)}
            </Text>
          </Box>

          {/* Nút Thanh toán */}
          <AppButton
            disabled={!canSubmit || loading}
            backgroundColor="primary"
            onPress={handlePay}
          >
            <Box
              flexDirection="row"
              alignItems="center"
              justifyContent="center"
              gap="s"
            >
              <AppIcon name="credit-card" size={20} color="white" />
              <Text variant="body" fontFamily="semiBold" color="white">
                {t('finance.pay_credit')}
              </Text>
            </Box>
          </AppButton>
        </Box>

        <AppBottomSheet
          ref={totalCalcRef}
          snapPoints={[320]}
          hideIndicator
          hideBackdrop
          hideContentPadding
        >
          <CalculatorKeyboard
            initialValue={totalAmount}
            onValueChange={val => {
              setTotalPaymentAmount(val);
              if (heldAmount === 0) setPaymentAmount(val);
            }}
            onDone={handleTotalCalcDone}
          />
        </AppBottomSheet>

        <AppBottomSheet
          ref={paymentCalcRef}
          snapPoints={[320]}
          hideIndicator
          hideBackdrop
          hideContentPadding
        >
          <CalculatorKeyboard
            initialValue={paymentAmount}
            onValueChange={setPaymentAmount}
            onDone={handlePaymentCalcDone}
          />
        </AppBottomSheet>

        <AppBottomSheet
          ref={heldCalcRef}
          snapPoints={[320]}
          hideIndicator
          hideBackdrop
          hideContentPadding
        >
          <CalculatorKeyboard
            initialValue={heldAmount}
            onValueChange={setHeldAmount}
            onDone={handleHeldCalcDone}
          />
        </AppBottomSheet>

        <AppBottomSheet ref={paymentWalletSheetRef} snapPoints={['50%', '80%']}>
          <Box padding="m" gap="m">
            <Text variant="subheader">{t('finance.payment_from_wallet')}</Text>
            {paymentWallets.map(w => (
              <AppButton
                key={w.id}
                backgroundColor={w.id === selectedPaymentWallet?.id ? 'primary' : 'card'}
                onPress={() => {
                  setSelectedPaymentWallet(w);
                  paymentWalletSheetRef.current?.close();
                }}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  padding: SPACING.m,
                }}
              >
                <Text variant="body" fontFamily="semiBold">
                  {w.displayName}
                </Text>
                <Text variant="body">
                  {formatVND(w.currentBalance, hiddenCurrency)}
                </Text>
              </AppButton>
            ))}
          </Box>
        </AppBottomSheet>

        <AppBottomSheet ref={heldWalletSheetRef} snapPoints={['50%', '80%']}>
          <Box padding="m" gap="m">
            <Text variant="subheader">{t('finance.select_held_wallet')}</Text>
            {heldWallets.map(w => (
              <AppButton
                key={w.id}
                backgroundColor={w.id === selectedHeldWallet?.id ? 'primary' : 'card'}
                onPress={() => {
                  setSelectedHeldWallet(w);
                  heldWalletSheetRef.current?.close();
                }}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  padding: SPACING.m,
                }}
              >
                <Text variant="body" fontFamily="semiBold">
                  {w.displayName}
                </Text>
                <Text variant="body">
                  {formatVND(w.currentBalance, hiddenCurrency)}
                </Text>
              </AppButton>
            ))}
          </Box>
        </AppBottomSheet>
      </AppScrollView>
    </Screen>
  );
};

const enhance = withObservables(
  ['walletId', 'userId'],
  ({
    walletId,
    userId,
  }: {
    walletId: string;
    userId: string;
  }) => ({
    creditWallet: walletId
      ? database.collections.get<Wallet>('wallets').findAndObserve(walletId)
      : of(null),
    wallets: userId ? observeWallets(userId) : of([]),
  }),
);

const EnhancedCreditPayment = enhance(CreditPayment);

export default function CreditPaymentScreen() {
  const route = useRoute<
    RouteProp<RootStackParamList, 'CreditPayment'>
  >();
  const walletId = route.params?.walletId ?? '';
  const session = useAppSelector(state => state.auth.session);
  const userId = session?.user?.id ?? '';
  if (!walletId || !userId) return null;
  return (
    <EnhancedCreditPayment walletId={walletId} userId={userId} />
  );
}
