import AppButton from '@/components/button/AppButton';
import AppIcon from '@/components/common/AppIcon';
import Screen from '@/components/common/Screen';
import TransactionItem from '@/screens/Transaction/components/TransactionItem';
import { formatVND } from '@/helpers/currency.helper';
import { formatDateGroupLabel } from '@/helpers/time.helper';
import { useAppSelector } from '@/store/hooks';
import { RADIUS, SPACING } from '@/theme/constant';
import { Theme } from '@/theme';
import { Box, Text } from '@theme/components';
import { useTheme } from '@shopify/restyle';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { addOpacity } from '@/helpers/color.helper';
import LoadingChildren from '@/components/loading/LoadingChildren';
import { CATEGORY_COLORS } from '@/constants/category';
import { useTranslation } from 'react-i18next';
import withObservables from '@nozbe/with-observables';
import { CategoryItem } from '@/services/category/category.type';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { observeTransactionsByCategory } from '@/services/watermelondb/wmTransaction.service';
import { observeCategoryStatById } from '@/services/watermelondb/func/wmCategoryStats';
import { TimeState } from '@/store/global/global.slice';
import Transaction from '@/models/Transaction';

type Props = {
  categoryId: string;
  category: CategoryItem | null;
  transactions: Transaction[];
};

const CategoryDetail = ({ categoryId, category, transactions = [] }: Props) => {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme<Theme>();
  const { top: topSafeArea } = useSafeAreaInsets();

  const groupedByDate = transactions.reduce<Record<string, Transaction[]>>(
    (acc, tx) => {
      const dateStr = tx.date
        ? new Date(tx.date).toISOString().split('T')[0]
        : '';
      if (!dateStr) return acc;
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(tx);
      return acc;
    },
    {},
  );
  const sortedDates = Object.keys(groupedByDate).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
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
          <AppIcon name='chevron-left' size={18} color={colors.text} />
        </AppButton>
        <Box flex={1} alignItems="center" justifyContent="center">
          <Text variant="subheader" textAlign="center">
            {category?.name ?? ''}
          </Text>
        </Box>
        <AppButton
          onPress={() =>
            navigation.navigate('CategoryForm', {
              categoryId,
            })
          }
          style={{ padding: SPACING.s }}
          shadow={false}
        >
          <AppIcon name="edit" size={18} color={colors.text} />
        </AppButton>
      </Box>

      {/* Content */}
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.main }}
        contentContainerStyle={{
          paddingHorizontal: SPACING.m,
          paddingBottom: SPACING.xl,
        }}
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
              backgroundColor: addOpacity(
                category?.color ?? CATEGORY_COLORS[0],
                0.1,
              ),
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
              style={{
                backgroundColor: addOpacity(
                  category?.color ?? CATEGORY_COLORS[0],
                  0.3,
                ),
              }}
            >
              <AppIcon
                name={category?.icon as any}
                size={28}
                color={category?.color ?? CATEGORY_COLORS[0]}
              />
            </Box>
            <Box>
              <Text variant="label" color="secondaryText">
                {t('finance.total_expense')}
              </Text>
              <Text variant="header">{formatVND(category?.amount ?? 0)}</Text>
            </Box>
          </Box>

          <Box marginBottom="m">
            <Box
              flexDirection="row"
              justifyContent="space-between"
              marginBottom="xs"
            >
              <Text variant="caption" color="secondaryText">
                {t('finance.budget_limit')}
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
                {category?.percent_limit?.toFixed(1)}% {t('common.used')}
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
                backgroundColor: addOpacity(
                  category?.color ?? CATEGORY_COLORS[0],
                  0.1,
                ),
                borderWidth: 1,
                borderColor: addOpacity(
                  category?.color ?? CATEGORY_COLORS[0],
                  0.2,
                ),
              }}
            >
              <AppIcon name="circle-info" size={16} color={colors.primary} />
              <Text variant="label" flex={1}>
                {`Còn lại: ${formatVND(Number(category?.remaining))}`}
              </Text>
            </Box>
          ) : null}
        </Box>

        {!category ? (
          <LoadingChildren />
        ) : sortedDates.length === 0 ? (
          <Box padding="l" alignItems="center">
            <Text variant="body" color="secondaryText">
              {t('finance.no_transaction')}
            </Text>
          </Box>
        ) : (
          <Box gap="m" paddingBottom="xl">
            {sortedDates.map(dateStr => {
              const items = groupedByDate[dateStr];
              const label = formatDateGroupLabel(dateStr, t);
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
                    {items.map(tx => (
                      <TransactionItem key={tx.id} transaction={tx} />
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

const enhance = withObservables(
  ['categoryId', 'time', 'userId'],
  ({
    categoryId,
    time,
    userId,
  }: {
    categoryId: string;
    time: TimeState;
    userId: string;
  }) => ({
    category: observeCategoryStatById(
      userId,
      categoryId,
      time.month,
      time.year,
    ),
    transactions: observeTransactionsByCategory(
      userId,
      categoryId,
      time.month,
      time.year,
    ),
  }),
);

const EnhancedCategoryDetailScreen = enhance(CategoryDetail);

export default function CategoryDetailScreen() {
  const categoryId =
    useRoute<RouteProp<RootStackParamList, 'CategoryDetail'>>().params
      ?.categoryId;
  const session = useAppSelector(state => state.auth.session);
  const { time } = useAppSelector(state => state.global);
  if (!categoryId || !session) return null;
  return (
    <EnhancedCategoryDetailScreen
      categoryId={categoryId}
      time={time}
      userId={session.user.id}
    />
  );
}
