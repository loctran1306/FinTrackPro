import { database } from '@/models';
import Transaction from '@/models/Transaction';
import TransactionItem from '@/screens/Transaction/components/TransactionItem';
import { Box } from '@/theme/components';
import { Q } from '@nozbe/watermelondb';
import withObservables from '@nozbe/with-observables';

type Props = {
  transactions: Transaction[];
};

const HomeTransaction = ({ transactions }: Props) => {
  return (
    <Box gap="s">
      {transactions.map(item => (
        <TransactionItem key={item.id} transaction={item} />
      ))}
    </Box>
  );
};

const enhance = withObservables([], () => ({
  transactions: database.collections
    .get<Transaction>('transactions')
    .query(Q.where('deleted_at', null), Q.sortBy('date', Q.desc), Q.take(10))
    .observe(),
}));

export default enhance(HomeTransaction);
