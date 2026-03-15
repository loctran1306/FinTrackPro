import AppIcon from '@/components/common/AppIcon';
import {
  WALLET_TYPE_COLOR,
  WALLET_TYPE_ICON,
} from '@/constants/wallet.const';
import { addOpacity } from '@/helpers/color.helper';
import { formatVND } from '@/helpers/currency.helper';
import Wallet from '@/models/Wallet';
import { RootStackParamList } from '@/navigation/types';
import {
  observeCreditWallets,
  observePaymentWallets,
} from '@/services/watermelondb/wmWallet.service';
import { useAppSelector } from '@/store/hooks';
import { Theme } from '@/theme';
import { Box, Text } from '@/theme/components';
import { RADIUS, SPACING } from '@/theme/constant';
import withObservables from '@nozbe/with-observables';
import { useTheme } from '@shopify/restyle';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import AppButton from '@/components/button/AppButton';

type Props = {
  creditWallets: Wallet[];
  paymentWallets: Wallet[];
};

const getWalletIcon = (type: string) =>
  (WALLET_TYPE_ICON[type as keyof typeof WALLET_TYPE_ICON] ?? 'wallet') as any;
const getWalletColor = (type: string) =>
  WALLET_TYPE_COLOR[type as keyof typeof WALLET_TYPE_COLOR] ?? '#8E8E93';

const WalletListEnhanced = ({ creditWallets, paymentWallets }: Props) => {
  const { t } = useTranslation();
  const { colors } = useTheme<Theme>();
  const { width: windowWidth } = useWindowDimensions();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { hiddenCurrency } = useAppSelector(state => state.global);
  const widthItem = windowWidth / 2 - SPACING.m * 1.5;

  const renderWalletCard = (wallet: Wallet) => {
    const walletColor = getWalletColor(wallet.walletType);
    const balance = Number(wallet.currentBalance) || 0;
    return (
      <AppButton
        key={wallet.id}
        onPress={() =>
          navigation.navigate('WalletDetail', { walletId: wallet.id })
        }
        style={{ padding: 0 }}
      >
        <Box
          backgroundColor="card"
          padding="m"
          borderRadius={RADIUS.l}
          overflow="hidden"
          style={{
            width: widthItem,
            borderWidth: 1,
            borderColor: colors.card,
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: addOpacity(walletColor, 0.1),
              marginRight: -20,
              marginTop: -20,
            }}
          />
          <Box gap="s">
            <Box flexDirection="row" alignItems="center" gap="s">
              <Box
                width={40}
                height={40}
                borderRadius={RADIUS.m}
                alignItems="center"
                justifyContent="center"
                style={{
                  backgroundColor: addOpacity(walletColor, 0.3),
                }}
              >
                <AppIcon
                  name={getWalletIcon(wallet.walletType)}
                  size={20}
                  color={walletColor}
                />
              </Box>
              <Box flex={1} minWidth={0}>
                <Text numberOfLines={1} variant='label' fontSize={13}>
                  {wallet.displayName}
                </Text>
                <Text
                  variant='subheader'
                >
                  {formatVND(balance, hiddenCurrency)}
                </Text>
              </Box>
            </Box>
          </Box>
        </Box>
      </AppButton>
    );
  };

  return (
    <Box backgroundColor="main" flex={1} paddingHorizontal="m" gap="m">
      <Box gap="s">
        <Text variant="subheader">{t('finance.payment_wallet')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled
          contentContainerStyle={{ gap: SPACING.m }}
        >
          {(paymentWallets ?? []).map(renderWalletCard)}
        </ScrollView>
      </Box>
      <Box gap="s">
        <Text variant="subheader">{t('finance.credit_wallet')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled
          contentContainerStyle={{ gap: SPACING.m }}
        >
          {(creditWallets ?? []).map(renderWalletCard)}
        </ScrollView>
      </Box>
    </Box>
  );
};

const enhance = withObservables(['userId'], ({ userId }: { userId: string }) => ({
  creditWallets: observeCreditWallets(userId || ''),
  paymentWallets: observePaymentWallets(userId || ''),
}));

const EnhancedWalletList = enhance(WalletListEnhanced);

export default function WalletList() {
  const { session } = useAppSelector(state => state.auth);
  const userId = session?.user?.id ?? '';
  return <EnhancedWalletList userId={userId} />;
}
