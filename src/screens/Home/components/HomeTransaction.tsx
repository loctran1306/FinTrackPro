import { useAppSelector } from '@/store/hooks';
import { Box } from '@/theme/components';
import { SPACING } from '@/theme/constant';
import { FlashList } from '@shopify/flash-list';
import { useMemo, useRef } from 'react';
import TransactionItem from '@/screens/Transaction/components/TransactionItem';

const MAX_ITEMS = 10;

const HomeTransaction = () => {
    const flashListRef = useRef<any>(null);
    const { transactions: transactionList } = useAppSelector(
        state => state.transaction,
    );

    const homeTransactions = useMemo(
        () => {
            const transactions = transactionList.slice(0, MAX_ITEMS);
            setTimeout(() => {
                flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }, 100);
            return transactions;
        },
        [transactionList, flashListRef]
    );

    return (
        <FlashList
            ref={flashListRef}
            style={{ flex: 1 }}
            data={homeTransactions}
            renderItem={({ item }) => (
                <TransactionItem transaction={item} flashListRef={flashListRef} />
            )}
            keyExtractor={item => item.id}
            ItemSeparatorComponent={() => <Box height={SPACING.s} />}
        />
    );
};

export default HomeTransaction;