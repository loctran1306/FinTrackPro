import AppIcon from '@/components/common/AppIcon';
import AppSwipeable from '@/components/swipeable/Swipeable';
import { addOpacity } from '@/helpers/color.helper';
import { formatVND } from '@/helpers/currency.helper';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { deleteTransactionThunk } from '@/store/transaction/transaction.thunk';
import { Theme } from '@/theme';
import { Box, Text } from '@/theme/components';
import { SPACING } from '@/theme/constant';
import { toast } from '@/utils/toast';
import { useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useTheme } from '@shopify/restyle';
import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';

const HistoryTransaction = () => {
  const navigation = useNavigation();
  const { colors } = useTheme<Theme>();
  const flashListRef = useRef<any>(null);
  const dispatch = useAppDispatch();
  const { transactions: transactionList } = useAppSelector(
    state => state.transaction,
  );

  const handleDelete = useCallback(async (id: string, reset: () => void) => {
    const result = await dispatch(deleteTransactionThunk(id)).unwrap();
    if (result) {
      toast.success('Xóa giao dịch thành công');
    } else {
      toast.error('Xóa giao dịch thất bại');
      reset();
      setTimeout(() => {
        flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    }
  }, []);

  useEffect(() => {
    if (transactionList.length > 0) {
      flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  }, [transactionList]);

  return (
    <FlashList
      ref={flashListRef}
      style={{ height: 300 }}
      ItemSeparatorComponent={() => <Box height={SPACING.s} />}
      data={transactionList}
      renderItem={({ item }) => {
        const isIncome = item.type === 'income';
        return (
          <AppSwipeable
            swipeableKey={item.id}
            onPress={() =>
              navigation.navigate('TransactionForm', { transaction: item })
            }
            onDelete={reset => handleDelete(item.id, reset)}
          >
            <Box
              flexDirection="row"
              justifyContent="space-between"
              padding="m"
              borderRadius={SPACING.m}
              style={{
                backgroundColor: isIncome
                  ? addOpacity(colors.success, 0.1)
                  : 'transparent',
              }}
            >
              <Box flexDirection="row" alignItems="center" gap="m" flex={1}>
                <Box
                  style={[styles.iconWrap, { backgroundColor: colors.main }]}
                >
                  <AppIcon
                    name={
                      isIncome ? 'money-bill-trend-up' : item.categories.icon
                    }
                    size={20}
                    color={isIncome ? colors.success : item.categories.color}
                  />
                </Box>
                <Box flex={1}>
                  <Box
                    flexDirection="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Text
                      variant="body"
                      fontFamily="semiBold"
                      style={styles.title}
                    >
                      {isIncome ? 'Thu nhập' : item.categories.name}
                    </Text>
                    <Text
                      variant="body"
                      fontFamily="semiBold"
                      style={styles.amount}
                    >
                      {formatVND(item.amount)}
                    </Text>
                  </Box>
                  <Text variant="label" color="secondaryText">
                    {new Date(item.date).toLocaleString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    variant="label"
                    color="secondaryText"
                  >
                    {item.note}
                  </Text>
                </Box>
              </Box>
            </Box>
          </AppSwipeable>
        );
      }}
      keyExtractor={item => item.id}
      extraData={transactionList}
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
