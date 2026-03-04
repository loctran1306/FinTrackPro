import AppHeader from "@/components/common/AppHeader";
import Screen from "@/components/common/Screen";
import { useMemo, useRef, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { Box } from "@/theme/components";
import { SPACING } from "@/theme/constant";
import TransactionItem from "./components/TransactionItem";
import { getTransactionsThunk } from "@/store/transaction/transaction.thunk";
import LoadingChildren from "@/components/loading/LoadingChildren";
import { useTranslation } from "react-i18next";
import { FlatList } from "react-native-gesture-handler";

const HistoryTransactionScreen = () => {
  const { t } = useTranslation();
  const flatListRef = useRef<FlatList<any>>(null);
  const dispatch = useAppDispatch();
  const { session } = useAppSelector(state => state.auth);
  const { transactions: transactionList, page, limit, total, loading } =
    useAppSelector(state => state.transaction);

  const data = useMemo(
    () => [...(transactionList ?? [])],
    [transactionList]
  );

  const handleLoadMore = () => {
    if (!session?.user?.id || loading) return;
    if (page * limit >= total) return;
    dispatch(
      getTransactionsThunk({ userId: session.user.id, page: page + 1, limit })
    );
  };

  const renderItem = useCallback(({ item }: { item: any }) => (
    <TransactionItem
      transaction={item}
    />
  ), []);

  return (
    <Screen>
      <AppHeader title={t('finance.history_transaction')} />
      <FlatList
        ref={flatListRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: SPACING.l }}
        data={data}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        ItemSeparatorComponent={() => <Box height={SPACING.s} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        removeClippedSubviews={true}
        windowSize={5}
        maxToRenderPerBatch={10}
        initialNumToRender={10}
        ListFooterComponent={
          loading ? <LoadingChildren /> : null
        }
      />
    </Screen>
  );
};

export default HistoryTransactionScreen;