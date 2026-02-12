import AppIcon from '@/components/common/AppIcon';
import AppSwipeable from '@/components/swipeable/Swipeable';
import { formatVND } from '@/helpers/currency.helper';
import { Theme } from '@/theme';
import { Box, Text } from '@/theme/components';
import { SPACING } from '@/theme/constant';
import { FlashList } from '@shopify/flash-list';
import { useTheme } from '@shopify/restyle';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';
import { LayoutAnimation, StyleSheet } from 'react-native';

type HistoryTransactionProps = {
  transactions: any[];
  setTransactions: Dispatch<SetStateAction<any[]>>;
};

const HistoryTransaction = ({
  transactions,
  setTransactions,
}: HistoryTransactionProps) => {
  const { colors } = useTheme<Theme>();
  const handleDelete = useCallback(
    (id: string) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setTransactions(prev => prev.filter(item => item.id !== id));
    },
    [setTransactions],
  );

  return (
    <FlashList
      ItemSeparatorComponent={() => <Box height={SPACING.s} />}
      data={transactions}
      renderItem={({ item }) => (
        <AppSwipeable
          swipeableKey={item.id}
          onPress={() => console.log('item', item)}
          onDelete={() => handleDelete(item.id)}
        >
          <Box
            flexDirection="row"
            justifyContent="space-between"
            padding="m"
            borderRadius={SPACING.m}
          >
            <Box flexDirection="row" alignItems="center" gap="m">
              <Box style={[styles.iconWrap, { backgroundColor: colors.main }]}>
                <AppIcon
                  name={item.categories.icon}
                  size={20}
                  color={item.categories.color}
                />
              </Box>
              <Box>
                <Text variant="body" fontFamily="semiBold" style={styles.title}>
                  {item.categories.name}
                </Text>
                <Text variant="label" color="secondaryText">
                  {item.date}
                </Text>
              </Box>
            </Box>
            <Text variant="body" fontFamily="semiBold" style={styles.amount}>
              {formatVND(item.amount)}
            </Text>
          </Box>
        </AppSwipeable>
      )}
      keyExtractor={item => item.id}
    />
  );
};

export default HistoryTransaction;

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
  },
  amount: {
    fontSize: 14,
  },
});
