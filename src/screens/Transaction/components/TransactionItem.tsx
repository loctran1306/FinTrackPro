import withObservables from '@nozbe/with-observables';
import Transaction from '@/models/Transaction';
import Category from '@/models/Category';
import Wallet from '@/models/Wallet';
import { deleteTransaction } from '@/services/watermelondb/wmTransaction.service'; // Hàm delete đã viết

// Giữ lại các UI components cũ của Lộc
import AppIcon from '@/components/common/AppIcon';
import AppSwipeable from '@/components/swipeable/Swipeable';
import { addOpacity } from '@/helpers/color.helper';
import { formatVND } from '@/helpers/currency.helper';
import { formatTime } from '@/helpers/time.helper';
import { Theme } from '@/theme';
import { Box, Text } from '@/theme/components';
import { SPACING } from '@/theme/constant';
import { toast } from '@/utils/toast';
import { useTheme } from '@shopify/restyle';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';

type TransactionItemProps = {
  transaction: Transaction;
  category: Category; // Được inject từ withObservables
  wallet: Wallet; // Được inject từ withObservables
};

const TransactionItem = ({
  transaction,
  category,
  wallet,
}: TransactionItemProps) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  const { colors } = useTheme<Theme>();

  const handleDelete = async (reset: () => void) => {
    try {
      await deleteTransaction(transaction);
      toast.success(t('finance.delete_transaction_success'));
    } catch {
      toast.error(t('finance.delete_transaction_error'));
      reset();
    }
  };

  const isIncome = transaction.type === 'income';
  const isSynced = transaction.syncStatus === 'synced';

  return (
    <AppSwipeable
      swipeableKey={transaction.id}
      onPress={() =>
        navigation.navigate('TransactionForm', {
          transactionId: transaction.id,
        })
      }
      onDelete={handleDelete}
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
          <Box style={[styles.iconWrap, { backgroundColor: colors.main }]}>
            <AppIcon
              name={isIncome ? 'money-bill-trend-up' : category.icon}
              size={20}
              color={isIncome ? colors.success : category.color}
            />
          </Box>
          <Box flex={1} gap="xs">
            <Box
              flexDirection="row"
              justifyContent="space-between"
              alignItems="flex-end"
            >
              <Box flexDirection="row" alignItems="center" gap="xs">
                <Text variant="body" fontFamily="semiBold">
                  {isIncome ? t('finance.income') : category.name}
                </Text>
                {!isSynced && (
                  <AppIcon
                    name="cloud-arrow-up"
                    size={12}
                    color={colors.warning ?? '#f59e0b'}
                  />
                )}
              </Box>
              <Text variant="subheader">{formatVND(transaction.amount)}</Text>
            </Box>

            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              variant="label"
              color="secondaryText"
            >
              {transaction.note}
            </Text>

            <Box flexDirection="row" justifyContent="space-between">
              <Text variant="label" color="secondaryText">
                {formatTime(transaction.date)}
              </Text>
              <Text variant="label" color="primary">
                {wallet.displayName}
              </Text>
            </Box>
          </Box>
        </Box>
      </Box>
    </AppSwipeable>
  );
};

// Phần quan trọng nhất: Kết nối transaction với category và wallet tương ứng
const enhance = withObservables(
  ['transaction'],
  ({ transaction }: { transaction: Transaction }) => ({
    transaction: transaction.observe(), // Theo dõi chính nó để cập nhật UI khi sửa
    category: transaction.category.observe(), // Lấy category liên quan
    wallet: transaction.wallet.observe(), // Lấy wallet liên quan
  }),
);

export default enhance(TransactionItem);

const styles = StyleSheet.create({
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
