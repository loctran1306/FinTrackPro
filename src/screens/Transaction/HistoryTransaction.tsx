import withObservables from "@nozbe/with-observables";
import Transaction from "@/models/Transaction";
import AppHeader from "@/components/common/AppHeader";
import Screen from "@/components/common/Screen";
import { useCallback, useMemo, useState } from "react";
import { Box } from "@/theme/components";
import { SPACING } from "@/theme/constant";
import TransactionItem from "./components/TransactionItem";
import { useTranslation } from "react-i18next";
import { FlashList } from "@shopify/flash-list";
import { observeTransactionCount, observeTransactions } from "@/services/watermelondb/wmTransaction.service";
import LoadingChildren from "@/components/loading/LoadingChildren";
import { useAppSelector } from "@/store/hooks";

const INITIAL_TAKE = 50;
const LOAD_MORE_COUNT = 50;

interface Props {
  transactions: Transaction[];
  transactionCount: number;
  onLoadMore: () => void;
}

const HistoryTransactionScreen = ({
  transactions,
  transactionCount = 0,
  onLoadMore,
}: Props) => {
  const { t } = useTranslation();

  const renderItem = useCallback(({ item }: { item: Transaction }) => (
    <TransactionItem transaction={item} />
  ), []);

  const ItemSeparator = useMemo(() => () => <Box height={SPACING.s} />, []);

  const hasMore = transactionCount > transactions.length;
  const handleEndReached = useCallback(() => {
    if (!hasMore) return;
    onLoadMore();
  }, [hasMore, onLoadMore]);

  return (
    <Screen>
      <AppHeader title={t('finance.history_transaction')} />
      <Box flex={1}>
        <FlashList
          data={transactions}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          extraData={transactions.length}
          ItemSeparatorComponent={ItemSeparator}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={hasMore ? <LoadingChildren /> : null}
        />
      </Box>
    </Screen>
  );
};

const enhance = withObservables(['userId', 'takeCount'], ({ userId, takeCount }: { userId: string; takeCount: number }) => ({
  transactions: observeTransactions(userId || '', takeCount),
  transactionCount: observeTransactionCount(userId || ''),
}));

const EnhancedHistoryTransaction = enhance(HistoryTransactionScreen);

export default function HistoryTransaction() {
  const { session } = useAppSelector(state => state.auth);
  const [takeCount, setTakeCount] = useState(INITIAL_TAKE);
  const onLoadMore = useCallback(
    () => setTakeCount((c) => c + LOAD_MORE_COUNT),
    [],
  );

  return (
    <EnhancedHistoryTransaction
      userId={session?.user?.id ?? ''}
      takeCount={takeCount}
      onLoadMore={onLoadMore}
    />
  );
}