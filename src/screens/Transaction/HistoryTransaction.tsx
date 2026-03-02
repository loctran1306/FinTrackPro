import AppHeader from "@/components/common/AppHeader";
import Screen from "@/components/common/Screen";
import { FlashList } from "@shopify/flash-list";
import { useMemo, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { Box } from "@/theme/components";
import { SPACING } from "@/theme/constant";
import TransactionItem from "./components/TransactionItem";
import { getTransactionsThunk } from "@/store/transaction/transaction.thunk";
import LoadingChildren from "@/components/loading/LoadingChildren";

const HistoryTransactionScreen = () => {
  const flashListRef = useRef<any>(null);
  const dispatch = useAppDispatch();
  const { session } = useAppSelector(state => state.auth);
  const { transactions: transactionList, page, limit, total, loading } =
    useAppSelector(state => state.transaction);

  const data = useMemo(
    () => [...(transactionList ?? [])],
    [transactionList]
  );

  const handleLoadMore = () => {
    if (!session?.user?.id) return;
    if (page * limit >= total) return;
    dispatch(
      getTransactionsThunk({ userId: session.user.id, page: page + 1, limit })
    );
  };

  return (
    <Screen>
      <AppHeader title="Lịch sử giao dịch" />
      <FlashList
        ref={flashListRef}
        style={{ flex: 1 }}
        data={data}
        renderItem={({ item }) => (
          <TransactionItem transaction={item} flashListRef={flashListRef} />
        )}
        keyExtractor={item => item.id}
        ItemSeparatorComponent={() => <Box height={SPACING.s} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading ? () => <LoadingChildren /> : undefined
        }
      />
    </Screen>
  );
};

export default HistoryTransactionScreen;

