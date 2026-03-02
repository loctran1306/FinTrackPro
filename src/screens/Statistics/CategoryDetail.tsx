import AppButton from '@/components/button/AppButton';
import AppIcon from '@/components/common/AppIcon';
import Screen from '@/components/common/Screen';
import TransactionItem from '@/screens/Transaction/components/TransactionItem';
import { formatVND } from '@/helpers/currency.helper';
import { formatDateGroupLabel } from '@/helpers/time.helper';
import { transactionService } from '@/services/transaction/transaction.service';
import { TransactionType } from '@/services/transaction/transaction.type';
import { useAppSelector } from '@/store/hooks';
import { RADIUS, SPACING } from '@/theme/constant';
import { Theme } from '@/theme';
import { Box, Text } from '@theme/components';
import { useTheme } from '@shopify/restyle';
import React, { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { addOpacity } from '@/helpers/color.helper';
import LoadingChildren from '@/components/loading/LoadingChildren';
import { selectCategoryById } from '@/store/category/category.selector';
import { CATEGORY_COLORS } from '@/constants/category';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryDetail'>;

const CategoryDetailScreen = ({ route, navigation }: Props) => {
  const {
    categoryId,
  } = route.params;

  const { colors } = useTheme<Theme>();
  const { top: topSafeArea } = useSafeAreaInsets();
  const { session } = useAppSelector(state => state.auth);
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [loading, setLoading] = useState(true);

  const category = useAppSelector(selectCategoryById(categoryId));
  const { time } = useAppSelector(state => state.global);
  useEffect(() => {
    const fetch = async () => {
      if (!session?.user?.id) return;
      setLoading(true);
      try {
        const data = await transactionService.getTransactionsByCategory(
          session.user.id,
          categoryId,
          time.month,
          time.year,
        );
        setTransactions(data);
      } catch {
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [session?.user?.id, categoryId, time]);

  const groupedByDate = transactions.reduce<Record<string, TransactionType[]>>(
    (acc, t) => {
      const dateStr = t.date ? String(t.date).split('T')[0] : '';
      if (!dateStr) return acc;
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(t);
      return acc;
    },
    {},
  );
  const sortedDates = Object.keys(groupedByDate).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <Screen padding="none" edges={[]}>
      {/* Header */}
      <Box
        paddingHorizontal="m"
        paddingTop="m"
        paddingBottom="s"
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        style={{ paddingTop: topSafeArea }}
        backgroundColor="main"
      >
        <AppButton
          onPress={() => navigation.goBack()}
          style={{ padding: SPACING.s }}
          shadow={false}
        >
          <AppIcon name="xmark" size={24} color={colors.text} />
        </AppButton>
        <Box flex={1} alignItems="center" justifyContent="center">
          <Text variant="subheader" textAlign="center">
            {category?.name ?? ''}
          </Text>
        </Box>
        <AppButton
          onPress={() =>
            navigation.navigate('EditCategory', {
              categoryId: category?.id ?? '',
            })
          }
          style={{ padding: SPACING.s }}
          shadow={false}
        >
          <AppIcon name='edit' size={18} color={colors.text} />
        </AppButton>
      </Box>

      {/* Content */}
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.main }}
        contentContainerStyle={{ paddingHorizontal: SPACING.m, paddingBottom: SPACING.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary card */}
        <Box
          backgroundColor="card"
          padding="l"
          borderRadius={RADIUS.xxl}
          marginBottom="l"
          overflow="hidden"
          style={{
            borderWidth: 1,
            borderColor: colors.card,
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 128,
              height: 128,
              borderRadius: 64,
              backgroundColor: addOpacity(category?.color ?? CATEGORY_COLORS[0], 0.1),
              marginRight: -40,
              marginTop: -40,
            }}
          />
          <Box flexDirection="row" alignItems="center" gap="m" marginBottom="l">
            <Box
              width={56}
              height={56}
              borderRadius={RADIUS.l}
              alignItems="center"
              justifyContent="center"
              style={{ backgroundColor: addOpacity(category?.color ?? CATEGORY_COLORS[0], 0.3) }}
            >
              <AppIcon
                name={category?.icon as any}
                size={28}
                color={category?.color ?? CATEGORY_COLORS[0]}
              />
            </Box>
            <Box>
              <Text variant="label" color="secondaryText">
                Tổng chi
              </Text>
              <Text variant="header">{formatVND(category?.amount ?? 0)}</Text>
            </Box>
          </Box>

          <Box marginBottom="m">
            <Box flexDirection="row" justifyContent="space-between" marginBottom="xs">
              <Text variant="caption" color="secondaryText">
                Hạn mức ngân sách
              </Text>
              <Text variant="body" fontFamily="semiBold">
                {formatVND(category?.budget_limit ?? 0)}
              </Text>
            </Box>
            <View
              style={{
                height: 12,
                backgroundColor: colors.card,
                borderRadius: 6,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${Math.min(category?.percent_limit ?? 0, 100)}%`,
                  height: '100%',
                  backgroundColor: category?.color ?? CATEGORY_COLORS[0],
                  borderRadius: 6,
                }}
              />
            </View>
            <Box alignSelf="flex-end" marginTop="xs">
              <Text variant="label" color="primary" fontFamily="semiBold">
                {category?.percent_limit?.toFixed(1)}% đã dùng
              </Text>
            </Box>
          </Box>

          {category?.remaining ? (
            <Box
              flexDirection="row"
              alignItems="center"
              gap="s"
              padding="m"
              borderRadius={RADIUS.m}
              style={{
                backgroundColor: addOpacity(category?.color ?? CATEGORY_COLORS[0], 0.1),
                borderWidth: 1,
                borderColor: addOpacity(category?.color ?? CATEGORY_COLORS[0], 0.2),
              }}
            >
              <AppIcon name="circle-info" size={16} color={colors.primary} />
              <Text variant="label" flex={1}>
                {`Còn lại: ${formatVND(Number(category?.remaining))}`}
              </Text>
            </Box>
          ) : null}
        </Box>

        {loading ? (
          <LoadingChildren />
        ) : sortedDates.length === 0 ? (
          <Box padding="l" alignItems="center">
            <Text variant="body" color="secondaryText">Chưa có giao dịch</Text>
          </Box>
        ) : (
          <Box gap="m" paddingBottom="xl">
            {sortedDates.map(dateStr => {
              const items = groupedByDate[dateStr];
              const label = formatDateGroupLabel(dateStr);
              return (
                <Box key={dateStr}>
                  <Text
                    variant="label"
                    color="secondaryText"
                    marginBottom="s"
                    textTransform="uppercase"
                    letterSpacing={1}
                  >
                    {label}
                  </Text>
                  <Box gap="s">
                    {items.map(t => (
                      <TransactionItem key={t.id} transaction={t} />
                    ))}
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </ScrollView>
    </Screen>
  );
};

export default CategoryDetailScreen;
