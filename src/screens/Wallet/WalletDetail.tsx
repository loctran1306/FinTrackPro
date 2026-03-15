import AppButton from '@/components/button/AppButton';
import AppIcon from '@/components/common/AppIcon';
import Screen from '@/components/common/Screen';
import TransactionItem from '@/screens/Transaction/components/TransactionItem';
import { formatVND } from '@/helpers/currency.helper';
import { formatDateGroupLabel } from '@/helpers/time.helper';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { RADIUS, SPACING } from '@/theme/constant';
import { Theme } from '@/theme';
import { Box, Text } from '@theme/components';
import { useTheme } from '@shopify/restyle';
import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { addOpacity } from '@/helpers/color.helper';
import LoadingChildren from '@/components/loading/LoadingChildren';
import { useTranslation } from 'react-i18next';
import withObservables from '@nozbe/with-observables';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { observeTransactionsByWallet } from '@/services/watermelondb/wmTransaction.service';
import { TimeState } from '@/store/global/global.slice';
import Transaction from '@/models/Transaction';
import Wallet from '@/models/Wallet';
import { database } from '@/models';
import { of } from 'rxjs';
import { WALLET_TYPE_COLOR, WALLET_TYPE_ICON } from '@/constants/wallet.const';
import MonthPickerBottomSheet from '@/components/modals/MonthPickerBottomSheet';
import { LOCALE_EN, LOCALE_VI } from '@/constants/locale.const';
import { setTime } from '@/store/global/global.slice';

type Props = {
  walletId: string;
  wallet: Wallet | null;
  transactions: Transaction[];
  time: TimeState;
};

const getWalletIcon = (type: string) =>
  (WALLET_TYPE_ICON[type as keyof typeof WALLET_TYPE_ICON] ?? 'wallet') as any;
const getWalletColor = (type: string) =>
  WALLET_TYPE_COLOR[type as keyof typeof WALLET_TYPE_COLOR] ?? '#8E8E93';

const WalletDetail = ({ walletId, wallet, transactions = [], time }: Props) => {
  const { t, i18n } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme<Theme>();
  const { top: topSafeArea } = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { hiddenCurrency } = useAppSelector(state => state.global);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);

  const walletColor = wallet ? getWalletColor(wallet.walletType) : '#8E8E93';

  const groupedByDate = transactions.reduce<Record<string, Transaction[]>>(
    (acc, tx) => {
      const dateStr = tx.date
        ? new Date(tx.date).toISOString().split('T')[0]
        : '';
      if (!dateStr) return acc;
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(tx);
      return acc;
    },
    {},
  );
  const sortedDates = Object.keys(groupedByDate).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );

  const handleMonthConfirm = (month: number, year: number) => {
    dispatch(setTime({ month: month + 1, year }));
    setMonthPickerVisible(false);
  };

  const monthlyIncome = transactions
    .filter(tx => {
      if (tx.type === 'income') return tx.walletId === walletId;
      if (tx.type === 'transfer') return tx.toWalletId === walletId;
      return false;
    })
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

  const monthlyExpense = transactions
    .filter(tx => {
      if (tx.type === 'expense') return tx.walletId === walletId;
      if (tx.type === 'transfer') return tx.walletId === walletId;
      return false;
    })
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

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
          <AppIcon name='chevron-left' size={18} color={colors.text} />
        </AppButton>
        <Box flex={1} alignItems="center" justifyContent="center">
          <Text variant="subheader" textAlign="center">
            {wallet?.displayName ?? ''}
          </Text>
        </Box>
        <AppButton
          onPress={() =>
            navigation.navigate('WalletForm', { walletId })
          }
          style={{ padding: SPACING.s }}
          shadow={false}
        >
          <AppIcon name="edit" size={18} color={colors.text} />
        </AppButton>
      </Box>

      {/* Content */}
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.main }}
        contentContainerStyle={{
          paddingHorizontal: SPACING.m,
          paddingBottom: SPACING.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary card */}
        <Box
          backgroundColor="card"
          padding="l"
          borderRadius={RADIUS.xxl}
          marginBottom="l"
          overflow="hidden"
          style={{
            borderWidth: 1,
            borderColor: colors.card,
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 128,
              height: 128,
              borderRadius: 64,
              backgroundColor: addOpacity(walletColor, 0.1),
              marginRight: -40,
              marginTop: -40,
            }}
          />
          <Box flexDirection="row" alignItems="center" gap="m" marginBottom="l">
            <Box
              width={56}
              height={56}
              borderRadius={RADIUS.l}
              alignItems="center"
              justifyContent="center"
              style={{
                backgroundColor: addOpacity(walletColor, 0.3),
              }}
            >
              <AppIcon
                name={getWalletIcon(wallet?.walletType ?? '')}
                size={28}
                color={walletColor}
              />
            </Box>
            <Box>
              <Text variant="label" color="secondaryText">
                {t('finance.balance')}
              </Text>
              <Text variant="header">
                {formatVND(Number(wallet?.currentBalance) ?? 0, hiddenCurrency)}
              </Text>
            </Box>
          </Box>

          {/* Month picker */}
          <Box marginBottom="m">
            <AppButton
              onPress={() => setMonthPickerVisible(true)}
              style={{ padding: 0 }}
            >
              <Box
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
                padding="m"
                borderRadius={RADIUS.m}
                style={{
                  backgroundColor: addOpacity(walletColor, 0.08),
                  borderWidth: 1,
                  borderColor: addOpacity(walletColor, 0.15),
                }}
              >
                <Text variant="label" color="secondaryText">
                  {t('common.statistics')}
                </Text>
                <Text variant="subheader" color="primary" fontFamily="semiBold">
                  {i18n.language === 'vi'
                    ? LOCALE_VI.monthNames[time.month - 1]
                    : LOCALE_EN.monthNames[time.month - 1]}{' '}
                  {time.year}
                </Text>
                <AppIcon name="chevron-down" size={16} color={colors.primary} />
              </Box>
            </AppButton>
          </Box>


          {/* Monthly summary */}
          <Box
            flexDirection="row"
            justifyContent="space-between"
            padding="m"
            borderRadius={RADIUS.m}
            style={{
              backgroundColor: addOpacity(walletColor, 0.08),
              borderWidth: 1,
              borderColor: addOpacity(walletColor, 0.15),
            }}
          >
            <Box alignItems="center" flex={1}>
              <Text variant="caption" color="secondaryText">
                {t('finance.income')}
              </Text>
              <Text variant="body" fontFamily="semiBold" color="success">
                +{formatVND(monthlyIncome, hiddenCurrency)}
              </Text>
            </Box>
            <Box alignItems="center" flex={1}>
              <Text variant="caption" color="secondaryText">
                {t('finance.expense')}
              </Text>
              <Text variant="body" fontFamily="semiBold" color="danger">
                -{formatVND(monthlyExpense, hiddenCurrency)}
              </Text>
            </Box>
          </Box>
        </Box>
        {/* Nút Thanh toán - chỉ hiện với ví credit */}
        {wallet?.walletType === 'credit' && (
          <Box marginBottom="m">
            <AppButton
              backgroundColor="primary"
              onPress={() =>
                navigation.navigate('CreditPayment', { walletId })
              }
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
        )}


        {!wallet ? (
          <LoadingChildren />
        ) : sortedDates.length === 0 ? (
          <Box padding="l" alignItems="center">
            <Text variant="body" color="secondaryText">
              {t('finance.no_transaction')}
            </Text>
          </Box>
        ) : (
          <Box gap="m" paddingBottom="xl">
            {sortedDates.map(dateStr => {
              const items = groupedByDate[dateStr];
              const label = formatDateGroupLabel(dateStr, t);
              return (
                <Box key={dateStr}>
                  <Text
                    variant="label"
                    color="secondaryText"
                    marginBottom="s"
                    textTransform="uppercase"
                    letterSpacing={1}
                  >
                    {label}
                  </Text>
                  <Box gap="s">
                    {items.map(tx => (
                      <TransactionItem key={tx.id} transaction={tx} />
                    ))}
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </ScrollView>

      <MonthPickerBottomSheet
        visible={monthPickerVisible}
        onClose={() => setMonthPickerVisible(false)}
        initialMonth={time.month - 1}
        initialYear={time.year}
        onConfirm={handleMonthConfirm}
        disableFuture
      />
    </Screen>
  );
};

const enhance = withObservables(
  ['walletId', 'time', 'userId'],
  ({
    walletId,
    time,
    userId,
  }: {
    walletId: string;
    time: TimeState;
    userId: string;
  }) => ({
    wallet: walletId
      ? database.collections.get<Wallet>('wallets').findAndObserve(walletId)
      : of(null),
    transactions: observeTransactionsByWallet(
      userId,
      walletId,
      time.month,
      time.year,
    ),
  }),
);

const EnhancedWalletDetailScreen = enhance(WalletDetail);

export default function WalletDetailScreen() {
  const walletId =
    useRoute<RouteProp<RootStackParamList, 'WalletDetail'>>().params?.walletId;
  const session = useAppSelector(state => state.auth.session);
  const { time } = useAppSelector(state => state.global);
  if (!walletId || !session) return null;
  return (
    <EnhancedWalletDetailScreen
      walletId={walletId}
      time={time}
      userId={session.user.id}
    />
  );
}
