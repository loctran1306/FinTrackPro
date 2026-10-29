import AppHeader from '@/components/common/AppHeader';
import AppScrollView from '@/components/common/AppScrollView';
import Screen from '@/components/common/Screen';
import WalletTransferContent from '@/components/forms/WalletTransferContent';
import { RootStackParamList } from '@/navigation/types';
import { useAppSelector } from '@/store/hooks';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';

export default function WalletTransferScreen() {
  const { t } = useTranslation();
  const { session } = useAppSelector(state => state.auth);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { transactionId = '' } =
    useRoute<RouteProp<RootStackParamList, 'WalletTransfer'>>().params ?? {};
  const userId = session?.user?.id;
  if (!userId) return null;

  return (
    <Screen padding="none">
      <AppHeader
        title={t(
          transactionId ? 'finance.edit_transaction' : 'finance.transfer',
        )}
      />
      <AppScrollView>
        <WalletTransferContent
          transactionId={transactionId}
          userId={userId}
          onSaved={() => navigation.goBack()}
        />
      </AppScrollView>
    </Screen>
  );
}
