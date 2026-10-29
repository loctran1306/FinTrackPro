import AppHeader from '@/components/common/AppHeader';
import AppScrollView from '@/components/common/AppScrollView';
import Screen from '@/components/common/Screen';
import TransactionFormContent from '@/components/forms/TransactionFormContent';
import { RootStackParamList } from '@/navigation/types';
import { useAppSelector } from '@/store/hooks';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';

export default function TransactionForm() {
  const { t } = useTranslation();
  const { session } = useAppSelector(state => state.auth);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { transactionId, initialDraft: draft } =
    useRoute<RouteProp<RootStackParamList, 'TransactionForm'>>().params ?? {};
  const handleGoBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('MainTab', { screen: 'Home' });
  };

  return (
    <Screen padding="none" backgroundColor="main">
      <AppHeader
        title={t(
          transactionId
            ? 'finance.edit_transaction'
            : 'finance.add_transaction',
        )}
        backButton={handleGoBack}
      />
      <AppScrollView>
        <TransactionFormContent
          allowTransfer={!transactionId}
          key={`${session?.user?.id}-${transactionId ?? 'new'}`}
          initialDraft={
            !transactionId && draft && draft.userId === session?.user?.id
              ? draft.value
              : undefined
          }
          transactionId={transactionId}
          userId={session?.user?.id ?? ''}
          onSaved={handleGoBack}
        />
      </AppScrollView>
    </Screen>
  );
}
