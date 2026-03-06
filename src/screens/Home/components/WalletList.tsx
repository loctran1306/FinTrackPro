import AppButton from '@/components/button/AppButton';
import { formatVND } from '@/helpers/currency.helper';
import Wallet from '@/models/Wallet';
import { observeCreditWallets, observePaymentWallets } from '@/services/watermelondb/wmWallet.service';
import { useAppSelector } from '@/store/hooks';
import { Box, Text } from '@/theme/components';
import { SPACING } from '@/theme/constant';
import withObservables from '@nozbe/with-observables';
import { useTranslation } from 'react-i18next';
import { ScrollView, useWindowDimensions } from 'react-native';

type Props = {
  creditWallets: Wallet[];
  paymentWallets: Wallet[];
};

const WalletListEnhanced = ({ creditWallets, paymentWallets }: Props) => {
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const { hiddenCurrency } = useAppSelector(state => state.global);
  const widthItem = windowWidth / 2 - SPACING.m * 1.5;


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
          {paymentWallets?.map(wallet => (
            <AppButton
              backgroundColor="card"
              shadow={false}
              key={wallet.id}
              onPress={() => console.log('Ví tiền mặt')}
              style={{ width: widthItem }}
            >
              <Box gap="xs">
                <Text numberOfLines={1} variant="subheader">
                  {wallet.displayName}
                </Text>
                <Text variant="body">
                  {formatVND(wallet.currentBalance, hiddenCurrency)}
                </Text>
              </Box>
            </AppButton>
          ))}
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
          {creditWallets?.map(wallet => (
            <AppButton
              backgroundColor="card"
              shadow={false}
              key={wallet.id}
              onPress={() => console.log('Ví tiền mặt')}
              style={{ width: widthItem }}
            >
              <Box gap="xs">
                <Text numberOfLines={1} variant="subheader">
                  {wallet.displayName}
                </Text>
                <Text variant="body">
                  {formatVND(wallet.currentBalance, hiddenCurrency)}
                </Text>
              </Box>
            </AppButton>
          ))}
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
