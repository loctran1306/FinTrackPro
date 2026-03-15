import AppButton from '@/components/button/AppButton';
import AppIcon from '@/components/common/AppIcon';
import Screen from '@/components/common/Screen';
import { WALLET_TYPE, WALLET_TYPE_COLOR, WALLET_TYPE_ICON, WALLET_TYPE_LABEL } from '@/constants/wallet.const';
import { addOpacity } from '@/helpers/color.helper';
import { formatVND } from '@/helpers/currency.helper';
import Wallet from '@/models/Wallet';
import { RootStackParamList } from '@/navigation/types';
import { FinanceOverview } from '@/services/wallet/wallet.type';
import { observeFinanceOverview } from '@/services/watermelondb/func/wmFinanceOverview';
import {
  observeWallets
} from '@/services/watermelondb/wmWallet.service';
import { useAppSelector } from '@/store/hooks';
import { Theme } from '@/theme';
import { RADIUS, SPACING } from '@/theme/constant';
import withObservables from '@nozbe/with-observables';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@shopify/restyle';
import { Box, Text } from '@theme/components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  wallets: Wallet[];
  financeOverview: FinanceOverview;
};

const getWalletIcon = (type: string) =>
  (WALLET_TYPE_ICON[type as keyof typeof WALLET_TYPE_ICON] ?? 'wallet') as any;
const getWalletColor = (type: string) =>
  WALLET_TYPE_COLOR[type as keyof typeof WALLET_TYPE_COLOR] ?? '#8E8E93';

const WalletScreenInner = ({ wallets, financeOverview }: Props) => {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme<Theme>();
  const { top: topSafeArea } = useSafeAreaInsets();
  const bottomTabBarHeight = useBottomTabBarHeight();
  const { hiddenCurrency } = useAppSelector(state => state.global);

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
        <Box width={40} />
        <Text variant="subheader" textAlign="center">
          {t('common.my_wallet')}
        </Text>
        <AppButton
          onPress={() => navigation.navigate('WalletForm', { type: 'cash' })}
          style={{ padding: SPACING.s }}
          shadow={false}
        >
          <AppIcon name="plus" size={24} color={colors.text} />
        </AppButton>
      </Box>

      {/* Content */}
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.main }}
        contentContainerStyle={{
          paddingHorizontal: SPACING.m,
          paddingBottom: bottomTabBarHeight + SPACING.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary card - Tổng số dư */}
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
              backgroundColor: addOpacity(colors.primary, 0.1),
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
                backgroundColor: addOpacity(colors.primary, 0.3),
              }}
            >
              <AppIcon name="wallet" size={28} color={colors.primary} />
            </Box>
            <Box>
              <Text variant="label" color="secondaryText">
                Tổng tài sản
              </Text>
              <Text variant="header">{formatVND(financeOverview?.total_assets || 0, hiddenCurrency)}</Text>
            </Box>
          </Box>



          <Box
            flexDirection="row"
            alignItems="center"
            gap="s"
            padding="m"
            marginTop='m'
            borderRadius={RADIUS.m}
            style={{
              backgroundColor: addOpacity(colors.primary, 0.1),
              borderWidth: 1,
              borderColor: addOpacity(colors.primary, 0.2),
            }}
          >
            <AppIcon name={getWalletIcon(WALLET_TYPE.CASH)} size={16} color={colors.primary} />
            <Text variant="label" flex={1}>
              {t('finance.net_worth')}
            </Text>
            <Text variant="label" fontFamily="semiBold" color="primary">
              {formatVND(financeOverview?.net_worth || 0, hiddenCurrency)}
            </Text>
          </Box>
          <Box
            flexDirection="row"
            alignItems="center"
            gap="s"
            padding="m"
            marginTop='m'
            borderRadius={RADIUS.m}
            style={{
              backgroundColor: addOpacity(colors.danger, 0.1),
              borderWidth: 1,
              borderColor: addOpacity(colors.danger, 0.2),
            }}
          >
            <AppIcon name="credit-card" size={16} color={colors.danger} />
            <Text variant="label" flex={1}>
              Dư nợ thẻ tín dụng
            </Text>
            <Text variant="label" fontFamily="semiBold" color="danger">
              {formatVND(financeOverview?.total_liabilities || 0, hiddenCurrency)}
            </Text>
          </Box>

        </Box>

        {/* Danh sách ví */}
        <Box marginBottom="s">
          <Box
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            marginBottom="m"
          >
            <Text variant="subheader">{t('finance.wallet')}</Text>
            <AppButton
              onPress={() => navigation.navigate('WalletTransfer')}
              style={{ padding: 0 }}
            >
              <Box flexDirection="row" alignItems="center" gap="xs">
                <AppIcon name="arrow-right-arrow-left" size={16} color={colors.primary} />
                <Text variant="label" color="primary">
                  {t('finance.transfer')}
                </Text>
              </Box>
            </AppButton>
          </Box>

          <Box gap="s">
            {wallets.map(wallet => {
              const walletColor = getWalletColor(wallet.walletType);
              const isCredit = wallet.walletType === 'credit';
              const balance = Number(wallet.currentBalance) || 0;
              return (
                <Pressable
                  key={wallet.id}
                  onPress={() =>
                    navigation.navigate('WalletDetail', { walletId: wallet.id })
                  }
                >
                  <Box
                    backgroundColor="card"
                    padding="m"
                    borderRadius={RADIUS.l}
                    marginBottom="s"
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
                        width: 80,
                        height: 80,
                        borderRadius: 40,
                        backgroundColor: addOpacity(walletColor, 0.1),
                        marginRight: -24,
                        marginTop: -24,
                      }}
                    />
                    <Box flexDirection="row" alignItems="center" gap="m">
                      <Box
                        width={48}
                        height={48}
                        borderRadius={RADIUS.m}
                        alignItems="center"
                        justifyContent="center"
                        style={{
                          backgroundColor: addOpacity(walletColor, 0.3),
                        }}
                      >
                        <AppIcon
                          name={getWalletIcon(wallet.walletType)}
                          size={24}
                          color={walletColor}
                        />
                      </Box>
                      <Box flex={1}>
                        <Text variant="subheader">{wallet.displayName}</Text>
                        <Text variant="caption" color="secondaryText">
                          {WALLET_TYPE_LABEL[wallet.walletType as keyof typeof WALLET_TYPE_LABEL] ??
                            wallet.walletType}
                        </Text>
                      </Box>
                      <Text
                        variant="subheader"
                        color={isCredit && balance < 0 ? 'danger' : 'text'}
                      >
                        {formatVND(balance, hiddenCurrency)}
                      </Text>
                    </Box>
                  </Box>
                </Pressable>
              );
            })}
          </Box>
        </Box>
      </ScrollView>
    </Screen>
  );
};

const enhance = withObservables(['userId'], ({ userId }: { userId: string }) => ({
  wallets: observeWallets(userId || ''),
  financeOverview: observeFinanceOverview(),
}));

const EnhancedWalletScreen = enhance(WalletScreenInner);

export function WalletScreen() {
  const { session } = useAppSelector(state => state.auth);
  const userId = session?.user?.id ?? '';
  return <EnhancedWalletScreen userId={userId} />;
}
