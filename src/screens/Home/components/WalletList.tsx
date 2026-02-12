import AppButton from '@/components/button/AppButton';
import { formatVND } from '@/helpers/currency.helper';
import { WalletType } from '@/services/wallet/wallet.type';
import { Box, Text } from '@/theme/components';
import { SPACING } from '@/theme/constant';
import { ScrollView } from 'react-native';
import { useAppSelector } from '@/store/hooks';
import { selectWallets } from '@/store/wallet/wallet.selector';
import { useWindowDimensions } from 'react-native';

const WalletList = () => {
  const { width: windowWidth } = useWindowDimensions();
  const { hiddenCurrency } = useAppSelector(state => state.global);
  const { creditWallets, paymentWallets } = useAppSelector(selectWallets);
  const widthItem = windowWidth / 2 - SPACING.m * 1.5;
  return (
    <Box backgroundColor="main" flex={1} paddingHorizontal="m" gap="m">
      <Box gap="s">
        <Text variant="subheader">Ví Thanh toán</Text>
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
                  {wallet.display_name}
                </Text>
                <Text variant="body">
                  {formatVND(wallet.current_balance, hiddenCurrency)}
                </Text>
              </Box>
            </AppButton>
          ))}
        </ScrollView>
      </Box>
      <Box gap="s">
        <Text variant="subheader">Thẻ tín dụng</Text>
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
                  {wallet.display_name}
                </Text>
                <Text variant="body">
                  {formatVND(wallet.current_balance, hiddenCurrency)}
                </Text>
              </Box>
            </AppButton>
          ))}
        </ScrollView>
      </Box>
    </Box>
  );
};

export default WalletList;
