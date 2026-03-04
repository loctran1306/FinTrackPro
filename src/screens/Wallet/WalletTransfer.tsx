import AppButton from '@/components/button/AppButton';
import AppBottomSheet, {
  AppBottomSheetRef,
} from '@/components/common/AppBottomSheet';
import AppHeader from '@/components/common/AppHeader';
import AppIcon from '@/components/common/AppIcon';
import AppInput from '@/components/common/AppInput';
import Screen from '@/components/common/Screen';
import CalculatorKeyboard from '@/components/keyboard/CalculatorKeyboard';
import LoadingWithLogo from '@/components/loading/LoadingWithLogo';
import { formatVND } from '@/helpers/currency.helper';
import { RootStackParamList } from '@/navigation/types';
import { WalletTransferType, WalletType } from '@/services/wallet/wallet.type';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectWallets } from '@/store/wallet/wallet.selector';
import { transferWalletThunk } from '@/store/wallet/wallet.thunk';
import { Theme } from '@/theme';
import { Box, Text } from '@/theme/components';
import { SPACING } from '@/theme/constant';
import { toast } from '@/utils/toast';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@shopify/restyle';
import { useRef, useState } from 'react';
import { Keyboard } from 'react-native';
import { useTranslation } from 'react-i18next';

const WalletTransferScreen = () => {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme<Theme>();

  const bottomSheetRef = useRef<AppBottomSheetRef>(null);

  const [loading, setLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const [hiddenCalculator, setHiddenCalculator] = useState(true);
  const [selectedWalletType, setSelectedWalletType] = useState<
    'from' | 'to' | null
  >(null);
  const [walletFrom, setWalletFrom] = useState<WalletType | null>(null);
  const [walletTo, setWalletTo] = useState<WalletType | null>(null);
  const [amount, setAmount] = useState('');
  const [amountView, setAmountView] = useState('');
  const [note, setNote] = useState('');

  // Redux
  const dispatch = useAppDispatch();
  const { creditWallets, paymentWallets } = useAppSelector(selectWallets);

  const handleDone = (result: number) => {
    setAmount(result.toString());
    setAmountView(formatVND(Number(result)));
    setHiddenCalculator(true);
  };

  const handleSelectWallet = (type: 'from' | 'to') => {
    setSelectedWalletType(type);
    bottomSheetRef.current?.expand();
  };

  const handleConfirmWallet = (wallet: WalletType) => {
    if (!wallet) return;
    if (selectedWalletType === 'from') {
      setWalletFrom(wallet);
    } else {
      setWalletTo(wallet);
    }
    bottomSheetRef.current?.close();
  };

  const resultRef = useRef<any | null>(null);
  const handleTransfer = async () => {
    if (!walletFrom || !walletTo || !amountView) return;
    const transactionData: WalletTransferType = {
      p_from_wallet_id: walletFrom.id,
      p_to_wallet_id: walletTo.id,
      p_amount: Number(amount),
      p_note: note,
    };
    Keyboard.dismiss();
    setLoading(true);
    try {
      const result = await dispatch(
        transferWalletThunk(transactionData),
      ).unwrap();
      resultRef.current = result;
    } catch (error) {
      toast.error(error as string);
    } finally {
      setIsComplete(true);
    }
  };
  const handleTransferComplete = () => {
    setLoading(false);
    setIsComplete(false);
    if (resultRef.current) {
      toast.success(t('finance.transfer_success'));
      navigation.goBack();
    } else {
      toast.error(t('finance.transfer_error'));
    }
  };

  return (
    <Screen padding="none">
      <AppHeader title={t('finance.transfer')} />
      <Box
        flexDirection="row"
        justifyContent="space-between"
        paddingHorizontal="m"
        gap="s"
        position="relative"
      >
        <Box flex={1}>
          <AppButton
            style={{
              width: '100%',
              minHeight: 80,
              padding: SPACING.m,
              justifyContent: 'center',
            }}
            onPress={() => handleSelectWallet('from')}
          >
            {walletFrom ? (
              <Box justifyContent="center" flex={1} gap="s">
                <Text variant="subheader">{walletFrom.display_name}</Text>
                <Text variant="caption">
                  {formatVND(walletFrom.current_balance)}
                </Text>
              </Box>
            ) : (
              <Text
                textAlign="center"
                color="primary"
                textDecorationLine="underline"
                variant="caption"
              >
                {t('finance.select_wallet_from')}
              </Text>
            )}
          </AppButton>
        </Box>
        <Box flex={1}>
          <AppButton
            style={{
              width: '100%',
              minHeight: 80,
              padding: SPACING.m,
              justifyContent: 'center',
            }}
            onPress={() => handleSelectWallet('to')}
          >
            {walletTo ? (
              <Box justifyContent="center" flex={1} gap="s">
                <Text variant="subheader">{walletTo.display_name}</Text>
                <Text variant="caption">
                  {formatVND(walletTo.current_balance)}
                </Text>
              </Box>
            ) : (
              <Text
                textAlign="center"
                color="primary"
                textDecorationLine="underline"
                variant="caption"
              >
                {t('finance.select_wallet_to')}
              </Text>
            )}
          </AppButton>
        </Box>
        <Box
          position="absolute"
          style={{
            left: '50%',
            top: '50%',
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor:
              walletFrom && walletTo ? colors.primary : colors.highlight,
            justifyContent: 'center',
            alignItems: 'center',
            transform: [{ translateX: 2 }, { translateY: -12 }],
          }}
        >
          <AppIcon name="arrow-right" color={colors.white} size={12} />
        </Box>
      </Box>
      <Box flex={1} padding="m">
        <Box alignItems="center" justifyContent="center" padding="m">
          <Text variant="caption">{t('finance.you_want_to_transfer')}</Text>
          <AppButton
            shadow={false}
            onPress={() => setHiddenCalculator(!hiddenCalculator)}
          >
            {amountView ? (
              <Text variant="header" fontSize={40} color="primary">
                {amountView}
              </Text>
            ) : (
              <Text variant="header" fontSize={40} color="primary">
                0
              </Text>
            )}
          </AppButton>
          <AppInput
            onFocus={() => setHiddenCalculator(true)}
            noBorder
            value={note}
            onChangeText={setNote}
            placeholder={t('common.enter_note')}
            textAlign="center"
          />
        </Box>
        <Box paddingHorizontal="m">
          {loading ? (
            <Box alignItems="center" justifyContent="center">
              <LoadingWithLogo
                isComplete={isComplete}
                onComplete={handleTransferComplete}
              />
            </Box>
          ) : (
            <AppButton
              disabled={!walletFrom || !walletTo || !amountView}
              backgroundColor="primary"
              onPress={handleTransfer}
            >
              <Box
                flexDirection="row"
                justifyContent="center"
                alignItems="center"
                gap="s"
              >
                <AppIcon name="arrow-right" size={20} color="white" />
                <Text variant="body" fontFamily="semiBold" color="white">
                  {t('finance.transfer')}
                </Text>
              </Box>
            </AppButton>
          )}
        </Box>
      </Box>
      {!hiddenCalculator && (
        <CalculatorKeyboard
          onValueChange={setAmount}
          onDone={handleDone}
          initialValue={amount}
        />
      )}

      <AppBottomSheet ref={bottomSheetRef} snapPoints={['50%', '80%']}>
        <Box backgroundColor="main" flex={1} gap="l">
          <Box gap="sm">
            <Text variant="subheader">{t('finance.payment_wallet')}</Text>
            {paymentWallets?.map(wallet => {
              const isDisabled =
                selectedWalletType === 'from'
                  ? wallet.current_balance <= 0
                  : wallet.id === walletFrom?.id;
              const isSelected =
                selectedWalletType === 'from'
                  ? wallet.id === walletFrom?.id
                  : wallet.id === walletTo?.id;
              return (
                <AppButton
                  key={wallet.id}
                  disabled={isDisabled}
                  backgroundColor={isSelected ? 'primary' : 'card'}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                  onPress={() => handleConfirmWallet(wallet)}
                >
                  <Text variant="body" fontFamily="semiBold">
                    {wallet.display_name}
                  </Text>
                  <Text variant="body" fontFamily="semiBold">
                    {formatVND(wallet.current_balance)}
                  </Text>
                </AppButton>
              );
            })}
          </Box>
          {selectedWalletType === 'to' && (
            <Box gap="sm">
              <Text variant="subheader">{t('finance.credit_wallet')}</Text>
              {creditWallets?.map(wallet => {
                const isSelected =
                  selectedWalletType === 'to' && wallet.id === walletTo?.id;
                return (
                  <AppButton
                    key={wallet.id}
                    backgroundColor={isSelected ? 'primary' : 'card'}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    }}
                    onPress={() => handleConfirmWallet(wallet)}
                  >
                    <Text variant="body" fontFamily="semiBold">
                      {wallet.display_name}
                    </Text>
                    <Text variant="body" fontFamily="semiBold">
                      {formatVND(wallet.current_balance)}
                    </Text>
                  </AppButton>
                );
              })}
            </Box>
          )}
        </Box>
      </AppBottomSheet>
    </Screen>
  );
};

export default WalletTransferScreen;
