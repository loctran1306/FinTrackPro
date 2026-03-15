import AppButton from '@/components/button/AppButton';
import AppBottomSheet, {
  AppBottomSheetRef,
} from '@/components/common/AppBottomSheet';
import AppHeader from '@/components/common/AppHeader';
import AppIcon from '@/components/common/AppIcon';
import AppInput from '@/components/common/AppInput';
import AppScrollView from '@/components/common/AppScrollView';
import Screen from '@/components/common/Screen';
import CalculatorKeyboard from '@/components/keyboard/CalculatorKeyboard';
import DateTimePicker from '@/components/picker/DateTimePicker';
import { WALLET_TYPE } from '@/constants/wallet.const';
import { formatVND } from '@/helpers/currency.helper';
import { formatTime } from '@/helpers/time.helper';
import Wallet from '@/models/Wallet';
import { RootStackParamList } from '@/navigation/types';
import { transferPayload } from '@/services/watermelondb/type/wmWallet.type';
import {
  observeTransferDetail,
  updateTransaction,
} from '@/services/watermelondb/wmTransaction.service';
import {
  createTransfer,
  observeWallets,
} from '@/services/watermelondb/wmWallet.service';
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
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard } from 'react-native';
import { of } from 'rxjs';

type TransferDetailData = {
  transaction: any;
  fromWallet: Wallet;
  toWallet: Wallet;
};

type Props = {
  wallets: Wallet[];
  userId: string;
  transactionId?: string;
  transferData: TransferDetailData | null | undefined;
};

const WalletTransfer = ({
  wallets,
  userId,
  transactionId,
  transferData,
}: Props) => {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme<Theme>();

  const bottomSheetRef = useRef<AppBottomSheetRef>(null);
  const calculatorSheetRef = useRef<AppBottomSheetRef>(null);
  const dateSheetRef = useRef<AppBottomSheetRef>(null);

  const [selectedWalletType, setSelectedWalletType] = useState<
    'from' | 'to' | null
  >(null);
  const [walletFrom, setWalletFrom] = useState<Wallet | null>(null);
  const [walletTo, setWalletTo] = useState<Wallet | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState('');
  const [date, setDate] = useState<Date>(() => new Date());
  const [loading, setLoading] = useState(false);

  const isEdit = !!transactionId && !!transferData;

  useEffect(() => {
    if (transferData) {
      setWalletFrom(transferData.fromWallet);
      setWalletTo(transferData.toWallet);
      setAmount(Number(transferData.transaction.amount) || 0);
      setNote(transferData.transaction.note || '');
      setDate(dayjs(transferData.transaction.date).toDate());
    }
  }, [transferData?.transaction?.id]);

  const handleCalculatorDone = (result: number) => {
    setAmount(result);
    calculatorSheetRef.current?.close();
  };

  const handleDateConfirm = (newDate: Date) => {
    setDate(newDate);
    dateSheetRef.current?.close();
  };

  const handleSelectWallet = (type: 'from' | 'to') => {
    setSelectedWalletType(type);
    bottomSheetRef.current?.expand();
  };

  const handleConfirmWallet = (wallet: Wallet) => {
    if (!wallet) return;
    if (selectedWalletType === 'from') {
      setWalletFrom(wallet);
    } else {
      setWalletTo(wallet);
    }
    bottomSheetRef.current?.close();
  };

  const handleTransfer = async () => {
    if (!walletFrom || !walletTo) return;
    if (walletFrom.id === walletTo.id) {
      toast.error(t('finance.transfer_same_wallet'));
      return;
    }
    if (amount <= 0) {
      toast.error(t('finance.enter_amount'));
      return;
    }
    Keyboard.dismiss();
    try {
      setLoading(true);
      if (isEdit && transferData) {
        await updateTransaction(transferData.transaction, {
          walletId: walletFrom.id,
          toWalletId: walletTo.id,
          amount,
          note,
          date: date.getTime(),
          type: 'transfer',
        });
        toast.success(t('finance.edit_transaction_success'));
      } else {
        const data: transferPayload = {
          fromWalletId: walletFrom.id,
          toWalletId: walletTo.id,
          amount,
          note,
          categoryId: '',
          userId,
          date: date.getTime(),
        };
        await createTransfer(data);
        toast.success(t('finance.transfer_success'));
      }
      setTimeout(() => navigation.goBack(), 100);
    } catch {
      toast.error(
        isEdit ? t('finance.edit_transaction_error') : t('finance.transfer_error'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen padding="none">
      <AppHeader
        title={isEdit ? t('finance.edit_transaction') : t('finance.transfer')}
      />
      <AppScrollView>
        <Box
          flexDirection="row"
          justifyContent="space-between"
          paddingHorizontal="m"
          gap="s"
          position="relative"
        >
          <Box backgroundColor='card' borderRadius={RADIUS.m} flex={1}>
            <AppButton
              disabled={isEdit}
              style={{
                width: '100%',
                minHeight: 80,
                padding: SPACING.m,
                justifyContent: 'center',
              }}
              onPress={() => handleSelectWallet('from')}
            >
              {walletFrom ? (
                <Box
                  alignItems="center"
                  justifyContent="center"
                  flex={1}
                  gap="s"
                >
                  <Text variant="subheader">{walletFrom.displayName}</Text>
                  <Text variant="caption">
                    {formatVND(walletFrom.currentBalance)}
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
          <Box backgroundColor='card' borderRadius={RADIUS.m} flex={1}>
            <AppButton
              style={{
                width: '100%',
                minHeight: 80,
                padding: SPACING.m,
                justifyContent: 'center',
              }}
              onPress={() => handleSelectWallet('to')}
              disabled={isEdit}
            >
              {walletTo ? (
                <Box
                  alignItems="center"
                  justifyContent="center"
                  flex={1}
                  gap="s"
                >
                  <Text variant="subheader">{walletTo.displayName}</Text>
                  <Text variant="caption">
                    {formatVND(walletTo.currentBalance)}
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
        <Box flex={1} padding="m" gap="m">
          <Box backgroundColor='card' borderRadius={RADIUS.m} alignItems="center" justifyContent="center" padding="m">
            <Text variant="caption">{t('finance.you_want_to_transfer')}</Text>
            <AppButton
              shadow={false}
              onPress={() => {
                Keyboard.dismiss();
                calculatorSheetRef.current?.expand();
              }}
            >
              <Text numberOfLines={2} variant="header" fontSize={40} color="primary" textAlign="center">
                {formatVND(amount)}
              </Text>
            </AppButton>
            <AppInput
              onFocus={() => calculatorSheetRef.current?.close()}
              noBorder
              value={note}
              onChangeText={setNote}
              placeholder={t('common.enter_note')}
              textAlign="center"
              multiline
              numberOfLines={4}

            />
            <AppButton
              onPress={() => dateSheetRef.current?.expand()}
              shadow={false}
            >
              <Box
                flexDirection="row"
                alignItems="center"
                justifyContent="center"
                gap="s"
              >
                <AppIcon
                  name="calendar-check"
                  size={18}
                  color={colors.primary}
                />
                <Text variant="body">
                  {formatTime(date)}
                </Text>
              </Box>
            </AppButton>
          </Box>
          <AppButton
            disabled={
              !walletFrom ||
              !walletTo ||
              amount <= 0 ||
              loading
            }
            backgroundColor="primary"
            onPress={handleTransfer}
          >
            <Box
              flexDirection="row"
              justifyContent="center"
              alignItems="center"
              gap="s"
            >
              <AppIcon
                name={isEdit ? 'check' : 'arrow-right'}
                size={20}
                color="white"
              />
              <Text variant="body" fontFamily="semiBold" color="white">
                {isEdit ? t('common.update') : t('finance.transfer')}
              </Text>
            </Box>
          </AppButton>
        </Box>
        <AppBottomSheet
          hideIndicator
          ref={calculatorSheetRef}
          snapPoints={[320]}
          hideBackdrop
          hideContentPadding
        >
          <CalculatorKeyboard
            onValueChange={setAmount}
            onDone={handleCalculatorDone}
            initialValue={amount}
          />
        </AppBottomSheet>

        <AppBottomSheet ref={dateSheetRef} snapPoints={['70%']}>
          <DateTimePicker
            initialDate={date}
            onConfirm={handleDateConfirm}
            disableFuture
          />


        </AppBottomSheet>

        <AppBottomSheet ref={bottomSheetRef} snapPoints={['50%', '80%']}>
          <Box backgroundColor="main" flex={1} gap="l">
            <Box gap="sm">
              <Text variant="subheader">{t('finance.wallet')}</Text>
              {wallets?.map(wallet => {
                const disabledFrom = wallet.currentBalance <= 0 && wallet.walletType !== WALLET_TYPE.CREDIT || wallet.id === walletTo?.id;
                const disabledTo = walletFrom?.id === wallet.id;
                const disabled = selectedWalletType === 'from' ? disabledFrom : disabledTo;
                const isSelected =
                  selectedWalletType === 'from'
                    ? wallet.id === walletFrom?.id
                    : wallet.id === walletTo?.id;
                return (
                  <AppButton
                    key={wallet.id}
                    disabled={disabled}
                    backgroundColor={isSelected ? 'primary' : 'card'}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    }}
                    onPress={() => handleConfirmWallet(wallet)}
                  >
                    <Text variant="body" fontFamily="semiBold">
                      {wallet.displayName}
                    </Text>
                    <Text variant="body" fontFamily="semiBold">
                      {formatVND(wallet.currentBalance)}
                    </Text>
                  </AppButton>
                );
              })}
            </Box>
          </Box>
        </AppBottomSheet>
      </AppScrollView>
    </Screen>
  );
};

const enhance = withObservables(
  ['userId', 'transactionId'],
  ({
    userId,
    transactionId,
  }: {
    userId: string;
    transactionId: string;
  }) => ({
    wallets: observeWallets(userId || ''),
    transferData: transactionId
      ? observeTransferDetail(transactionId)
      : of(null),
  }),
);

const EnhancedWalletTransfer = enhance(WalletTransfer);

export default function WalletTransferScreen() {
  const { session } = useAppSelector(state => state.auth);
  const route = useRoute<
    RouteProp<RootStackParamList, 'WalletTransfer'>
  >();
  const transactionId = route.params?.transactionId ?? '';
  const userId = session?.user?.id ?? '';
  if (!userId) return null;
  return (
    <EnhancedWalletTransfer
      userId={userId}
      transactionId={transactionId}
    />
  );
}
