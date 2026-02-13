import AppButton from '@/components/button/AppButton';
import { formatVND } from '@/helpers/currency.helper';
import { supabase } from '@/lib/supabase';
import { WalletType } from '@/services/wallet/wallet.type';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectWallets } from '@/store/wallet/wallet.selector';
import { updateWallet } from '@/store/wallet/wallet.slice';
import { getFinanceOverviewThunk } from '@/store/wallet/wallet.thunk';
import { Box, Text } from '@/theme/components';
import { SPACING } from '@/theme/constant';
import { useEffect } from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';

const WalletList = () => {
  const { width: windowWidth } = useWindowDimensions();
  const { hiddenCurrency } = useAppSelector(state => state.global);
  const { creditWallets, paymentWallets } = useAppSelector(selectWallets);
  const widthItem = windowWidth / 2 - SPACING.m * 1.5;

  const dispatch = useAppDispatch();
  const userId = useAppSelector(state => state.auth.session?.user?.id);

  // Realtime subscription for Wallets
  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel('wallets_realtime');

    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallets' },
        (event: any) => {
          handleSbNewEventWallet(event);
        },
      )
      .subscribe(status => {
        console.log('Wallets realtime status:', status);
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          channel.subscribe();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dispatch, userId]);

  const handleSbNewEventWallet = (event: any) => {
    const { new: newWallet } = event;
    const dataUpdate: WalletType = {
      id: newWallet.id,
      display_name: newWallet.display_name,
      wallet_type: newWallet.wallet_type,
      current_balance: newWallet.current_balance,
      credit_limit: newWallet.credit_limit,
    };
    dispatch(updateWallet(dataUpdate));
    dispatch(getFinanceOverviewThunk());
  };

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
