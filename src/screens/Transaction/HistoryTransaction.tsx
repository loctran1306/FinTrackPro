import ButtonIcon from '@/components/button/ButtonIcon';
import AppHeader from '@/components/common/AppHeader';
import AppIcon from '@/components/common/AppIcon';
import Screen from '@/components/common/Screen';
import LoadingChildren from '@/components/loading/LoadingChildren';
import Transaction from '@/models/Transaction';
import {
  observeFilteredTransactionCount,
  observeFilteredTransactions,
  type TransactionFilter,
} from '@/services/watermelondb/wmTransaction.service';
import { useAppSelector } from '@/store/hooks';
import { Theme } from '@/theme';
import { Box } from '@/theme/components';
import { SPACING } from '@/theme/constant';
import withObservables from '@nozbe/with-observables';
import { FlashList } from '@shopify/flash-list';
import { useTheme } from '@shopify/restyle';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TransactionFilterBar from './components/TransactionFilterBar';
import TransactionItem from './components/TransactionItem';

const INITIAL_TAKE = 50;
const LOAD_MORE_COUNT = 50;

interface Props {
  transactions: Transaction[];
  transactionCount: number;
  onLoadMore: () => void;
  userId: string;
  filter: TransactionFilter;
  onFilterChange: (filter: TransactionFilter) => void;
  activePreset: 'today' | 'this_week' | 'this_month' | 'last_month' | null;
  onPresetChange: (
    preset: 'today' | 'this_week' | 'this_month' | 'last_month' | null,
  ) => void;
}

const HistoryTransactionScreen = ({
  transactions,
  transactionCount = 0,
  onLoadMore,
  userId,
  filter,
  onFilterChange,
  activePreset,
  onPresetChange,
}: Props) => {
  const { colors } = useTheme<Theme>();
  const { t } = useTranslation();
  const { bottom } = useSafeAreaInsets();

  const [showFilter, setShowFilter] = useState(false);

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => <TransactionItem transaction={item} />,
    [],
  );

  const ItemSeparator = useMemo(() => () => <Box height={SPACING.s} />, []);

  const hasMore = transactionCount > transactions.length;
  const handleEndReached = useCallback(() => {
    if (!hasMore) return;
    onLoadMore();
  }, [hasMore, onLoadMore]);

  return (
    <Screen edges={['top']}>
      <AppHeader
        title={t('finance.history_transaction')}
        rightButton={
          <ButtonIcon
            icon={<AppIcon name="filter" size={18} color={colors.primary} />}
            onPress={() => setShowFilter(!showFilter)}
          />
        }
      />
      {showFilter && (
        <TransactionFilterBar
          userId={userId}
          filter={filter}
          onFilterChange={onFilterChange}
          activePreset={activePreset}
          onPresetChange={onPresetChange}
        />
      )}
      <Box flex={1}>
        <FlashList
          data={transactions}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          extraData={transactions.length}
          ItemSeparatorComponent={ItemSeparator}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={hasMore ? <LoadingChildren /> : null}
          contentContainerStyle={{
            paddingBottom: bottom,
          }}
        />
      </Box>
    </Screen>
  );
};

const enhance = withObservables(
  ['userId', 'takeCount', 'filter'],
  ({
    userId,
    takeCount,
    filter,
  }: {
    userId: string;
    takeCount: number;
    filter: TransactionFilter;
  }) => ({
    transactions: observeFilteredTransactions(userId || '', takeCount, filter),
    transactionCount: observeFilteredTransactionCount(userId || '', filter),
  }),
);

const EnhancedHistoryTransaction = enhance(HistoryTransactionScreen);

export default function HistoryTransaction() {
  const { session } = useAppSelector(state => state.auth);
  const [takeCount, setTakeCount] = useState(INITIAL_TAKE);
  const [filter, setFilter] = useState<TransactionFilter>({});
  const [activePreset, setActivePreset] = useState<
    'today' | 'this_week' | 'this_month' | 'last_month' | null
  >(null);

  const onLoadMore = useCallback(
    () => setTakeCount(c => c + LOAD_MORE_COUNT),
    [],
  );

  const handleFilterChange = useCallback((newFilter: TransactionFilter) => {
    setFilter(newFilter);
    setTakeCount(INITIAL_TAKE); // Reset pagination khi đổi filter
  }, []);

  const userId = session?.user?.id ?? '';

  return (
    <EnhancedHistoryTransaction
      userId={userId}
      takeCount={takeCount}
      onLoadMore={onLoadMore}
      filter={filter}
      onFilterChange={handleFilterChange}
      activePreset={activePreset}
      onPresetChange={setActivePreset}
    />
  );
}
