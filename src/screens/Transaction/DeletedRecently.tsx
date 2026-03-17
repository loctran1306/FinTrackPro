import AppHeader from '@/components/common/AppHeader';
import Screen from '@/components/common/Screen';
import Transaction from '@/models/Transaction';
import { observeDeletedTransactions } from '@/services/watermelondb/wmTransaction.service';
import { useAppSelector } from '@/store/hooks';
import { Box } from '@/theme/components';
import { SPACING } from '@/theme/constant';
import withObservables from '@nozbe/with-observables';
import { FlashList } from '@shopify/flash-list';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TransactionItem from './components/TransactionItem';

interface Props {
  transactions: Transaction[];
}

const DeletedRecentlyScreen = ({ transactions }: Props) => {
  const { t } = useTranslation();
  const { bottom } = useSafeAreaInsets();

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => (
      <TransactionItem transaction={item} rightIconType="restore" />
    ),
    [],
  );

  const ItemSeparator = useMemo(() => () => <Box height={SPACING.s} />, []);

  return (
    <Screen edges={['top']}>
      <AppHeader title={t('profile.deleted_recently')} />
      <Box flex={1}>
        <FlashList
          data={transactions}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          extraData={transactions.length}
          ItemSeparatorComponent={ItemSeparator}
          contentContainerStyle={{
            paddingBottom: bottom,
          }}
        />
      </Box>
    </Screen>
  );
};

const enhance = withObservables(
  ['userId'],
  ({ userId }: { userId: string }) => ({
    transactions: observeDeletedTransactions(userId),
  }),
);

const EnhancedDeletedRecently = enhance(DeletedRecentlyScreen);

export default function DeletedRecently() {
  const { session } = useAppSelector(state => state.auth);
  const userId = session?.user?.id ?? '';

  return <EnhancedDeletedRecently userId={userId} />;
}
