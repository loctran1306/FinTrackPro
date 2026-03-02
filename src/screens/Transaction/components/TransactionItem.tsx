import AppIcon from "@/components/common/AppIcon";
import AppSwipeable from "@/components/swipeable/Swipeable";
import { addOpacity } from "@/helpers/color.helper";
import { formatVND } from "@/helpers/currency.helper";
import { formatTime } from "@/helpers/time.helper";
import { TransactionType } from "@/services/transaction/transaction.type";
import { useAppDispatch } from "@/store/hooks";
import { deleteTransactionThunk } from "@/store/transaction/transaction.thunk";
import { Theme } from "@/theme";
import { Box, Text } from "@/theme/components";
import { SPACING } from "@/theme/constant";
import { toast } from "@/utils/toast";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@shopify/restyle";
import { StyleSheet } from "react-native";

type TransactionItemProps = {
    transaction: TransactionType;
    flashListRef?: any;
}
const TransactionItem = ({ transaction, flashListRef }: TransactionItemProps) => {
    const { colors } = useTheme<Theme>();
    const navigation = useNavigation();

    const dispatch = useAppDispatch();

    const handleDelete = async (id: string, reset: () => void) => {
        const result = await dispatch(deleteTransactionThunk(id)).unwrap();
        if (result) {
            toast.success('Xóa giao dịch thành công');
        } else {
            toast.error('Xóa giao dịch thất bại');
            reset();
            setTimeout(() => {
                flashListRef?.current?.scrollToOffset({ offset: 0, animated: true });
            }, 100);
        }
    }

    const isIncome = transaction.type === 'income';
    return (
        <AppSwipeable
            swipeableKey={transaction.id}
            onPress={() =>
                navigation.navigate('TransactionForm', { transaction: transaction })
            }
            onDelete={reset => handleDelete(transaction.id, reset)}
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
                                isIncome ? 'money-bill-trend-up' : transaction.categories.icon
                            }
                            size={20}
                            color={isIncome ? colors.success : transaction.categories.color}
                        />
                    </Box>
                    <Box flex={1} gap='xs'>
                        <Box
                            flexDirection="row"
                            justifyContent="space-between"
                            alignItems="flex-end"
                        >
                            <Text
                                variant="body"
                                fontFamily="semiBold"

                            >
                                {isIncome ? 'Thu nhập' : transaction.categories.name}
                            </Text>
                            <Text
                                variant='subheader'
                            >
                                {formatVND(transaction.amount)}
                            </Text>
                        </Box>

                        <Text
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            variant="label"
                            color="secondaryText"
                        >
                            {transaction.note}
                        </Text>
                        <Box flexDirection="row" justifyContent='space-between'>
                            <Text variant="label" color="secondaryText">
                                {formatTime(transaction.date)}
                            </Text>
                            <Text variant="label" color='primary'>
                                {transaction.wallet?.display_name}
                            </Text>
                        </Box>
                    </Box>
                </Box>
            </Box>
        </AppSwipeable>
    )
}

export default TransactionItem;

const styles = StyleSheet.create({
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
});