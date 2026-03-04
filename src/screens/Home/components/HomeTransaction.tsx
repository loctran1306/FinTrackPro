import TransactionItem from '@/screens/Transaction/components/TransactionItem';
import { useAppSelector } from '@/store/hooks';
import { Box } from '@/theme/components';
import { useMemo } from 'react';

const MAX_ITEMS = 10;

const HomeTransaction = () => {
    const { transactions: transactionList } = useAppSelector(
        state => state.transaction,
    );

    const homeTransactions = useMemo(
        () => transactionList.slice(0, MAX_ITEMS),
        [transactionList],
    );

    return (
        <Box gap="s">
            {homeTransactions.map(item => (
                <TransactionItem key={item.id} transaction={item} />
            ))}
        </Box>
    );
};

export default HomeTransaction;