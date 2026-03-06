import AppButton from '@/components/button/AppButton';
import BarChart, { BarChartItem } from '@/components/chart/BarChart';
import DoughnutChart, {
  DoughnutSegment,
} from '@/components/chart/DoughnutChart';
import AppIcon from '@/components/common/AppIcon';
import AppScrollView from '@/components/common/AppScrollView';
import Screen from '@/components/common/Screen';
import MonthPickerBottomSheet from '@/components/modals/MonthPickerBottomSheet';
import { LOCALE_EN, LOCALE_VI } from '@/constants/locale.const';
import { formatVND } from '@/helpers/currency.helper';
import { RootStackParamList } from '@/navigation/types';
import { CategoryItem } from '@/services/category/category.type';
import { observeCategoryStats } from '@/services/watermelondb/func/wmCategoryStats';
import { setTime, TimeState } from '@/store/global/global.slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { Theme } from '@/theme';
import { RADIUS, SPACING } from '@/theme/constant';
import withObservables from '@nozbe/with-observables';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@shopify/restyle';
import { Box, Text } from '@theme/components';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;

const CHART_SIZE = 200;

type Props = {
  categories: CategoryItem[];
  time: TimeState;
};

const Statistics = ({ categories, time }: Props) => {
  console.log('categories', categories);

  const { t, i18n } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme<Theme>();
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const bottomTabBarHeight = useBottomTabBarHeight();
  const { top: topSafeArea } = useSafeAreaInsets();

  const dispatch = useAppDispatch();

  const sortedCategories =
    useMemo(() => {
      return [...(categories || [])].sort(
        (a, b) => b.budget_limit - a.budget_limit,
      );
    }, [categories]) || [];

  const chartData: DoughnutSegment[] | undefined = categories?.map(
    (item: CategoryItem) => ({
      value: item.percent_total,
      color: item.color,
      id: item.id,
      name: item.name,
      amount: item.amount,
    }),
  );

  const barChartData: BarChartItem[] = useMemo(
    () =>
      (categories || []).map((item: CategoryItem) => ({
        id: item.id,
        name: item.name,
        color: item.color,
        amount: item.amount,
        budget_limit: item.budget_limit,
      })),
    [categories],
  );
  const totalSpend =
    categories?.reduce((sum, item) => sum + item.amount, 0) || 0;

  const handleMonthConfirm = (month: number, year: number) => {
    dispatch(setTime({ month: month + 1, year: year }));
    setMonthPickerVisible(false);
  };

  const handleRefresh = async () => {
    console.log('handleRefresh');
  };

  const [activeIdx, setActiveIdx] = React.useState<number | null>(null);
  const [activeBarIdx, setActiveBarIdx] = React.useState<number | null>(null);
  const [chartPage, setChartPage] = useState(0);
  const chartScrollRef = useRef<ScrollView>(null);

  const chartContainerWidth = SCREEN_WIDTH - SPACING.m * 2;

  const onChartScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const page = Math.round(
        e.nativeEvent.contentOffset.x / chartContainerWidth,
      );
      setChartPage(page);
    },
    [chartContainerWidth],
  );

  return (
    <Screen padding="none" edges={[]}>
      <AppScrollView
        insetTop={false}
        onRefresh={handleRefresh}
        refreshBackground={colors.highlight}
        contentContainerStyle={{
          paddingBottom: bottomTabBarHeight + SPACING.l,
        }}
      >
        <Box
          paddingHorizontal="m"
          paddingTop="m"
          style={{ paddingTop: topSafeArea }}
        >
          <Text variant="header" textAlign="center">
            {t('finance.report_expense')}
          </Text>

          <Box
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
            marginBottom="s"
          >
            <AppButton
              style={{ flex: 1 }}
              onPress={() => setMonthPickerVisible(true)}
            >
              <Box
                backgroundColor="card"
                paddingVertical="s"
                paddingHorizontal="m"
                borderRadius={RADIUS.xl}
              >
                <Text textAlign="center" variant="subheader" color="primary">
                  {i18n.language === 'vi'
                    ? LOCALE_VI.monthNames[time.month - 1]
                    : LOCALE_EN.monthNames[time.month - 1]}{' '}
                  {time.year}
                </Text>
              </Box>
            </AppButton>
          </Box>

          {/* Charts with horizontal paging */}
          <Box
            backgroundColor="card"
            borderRadius={RADIUS.xxl}
            marginBottom="l"
            style={{
              borderWidth: 1,
              borderColor: colors.card,
              overflow: 'hidden',
            }}
          >
            <ScrollView
              ref={chartScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onChartScroll}
              style={{ width: chartContainerWidth }}
            >
              {/* Page 1: Doughnut Chart */}
              <View
                style={{
                  width: chartContainerWidth,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: SPACING.l,
                }}
              >
                <View
                  style={{
                    height: CHART_SIZE,
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  <>
                    <DoughnutChart
                      data={chartData || []}
                      size={CHART_SIZE}
                      strokeWidth={20}
                      selectedIndex={activeIdx}
                      onSelect={setActiveIdx}
                    />
                    {activeIdx === null && (
                      <Box
                        position="absolute"
                        alignSelf="center"
                        alignItems="center"
                        justifyContent="center"
                        width={CHART_SIZE}
                        height={CHART_SIZE}
                        pointerEvents="none"
                      >
                        <Text variant="label" color="secondaryText">
                          {t('finance.total_expense')}
                        </Text>
                        <Text variant="subheader">{formatVND(totalSpend)}</Text>
                      </Box>
                    )}
                  </>
                </View>
              </View>

              {/* Page 2: Bar Chart */}
              <View
                style={{
                  width: chartContainerWidth,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: SPACING.l,
                }}
              >
                <BarChart
                  data={barChartData}
                  width={chartContainerWidth - SPACING.m * 2}
                  height={CHART_SIZE + 40}
                  selectedIndex={activeBarIdx}
                  onSelect={setActiveBarIdx}
                />
              </View>
            </ScrollView>

            {/* Dot indicators */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                paddingBottom: SPACING.sm,
                gap: 6,
              }}
            >
              {[0, 1].map(i => (
                <View
                  key={i}
                  style={{
                    width: chartPage === i ? 16 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor:
                      chartPage === i ? colors.primary : colors.gray + '40',
                  }}
                />
              ))}
            </View>
          </Box>

          {/* Category details */}
        </Box>
        <Box backgroundColor="main" padding="m" flex={1}>
          <Box>
            <AppButton
              onPress={() => navigation.navigate('CategoryForm')}
              style={{
                padding: 0,
                paddingBottom: SPACING.m,
                alignSelf: 'flex-end',
              }}
            >
              <Box
                flexDirection="row"
                alignItems="center"
                justifyContent="center"
                gap="s"
              >
                <AppIcon name="plus" size={16} color={colors.primary} />
                <Text variant="subheader" color="primary">
                  {t('finance.add_category')}
                </Text>
              </Box>
            </AppButton>
            {sortedCategories.map(item => (
              <Pressable
                key={item.id}
                onPress={() =>
                  navigation.navigate('CategoryDetail', { categoryId: item.id })
                }
              >
                <Box
                  backgroundColor="card"
                  padding="m"
                  borderRadius={RADIUS.l}
                  marginBottom="s"
                  style={{ borderWidth: 1, borderColor: colors.card }}
                >
                  <Box flexDirection="row" gap="m" marginBottom="s">
                    <Box
                      width={48}
                      height={48}
                      borderRadius={RADIUS.m}
                      alignItems="center"
                      justifyContent="center"
                      style={{ backgroundColor: item.color + '40' }}
                    >
                      <AppIcon
                        name={item.icon as any}
                        size={24}
                        color={item.color}
                      />
                    </Box>
                    <Box flex={1}>
                      <Box
                        flexDirection="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                      >
                        <Box>
                          <Text variant="subheader">{item.name}</Text>
                          <Text variant="caption" color="secondaryText">
                            {item.subtext}
                          </Text>
                          <Box
                            alignSelf="flex-start"
                            paddingHorizontal="xs"
                            paddingVertical="xs"
                            marginTop="xs"
                            borderRadius={RADIUS.xs}
                            style={{ backgroundColor: item.color + '30' }}
                          >
                            <Text variant="label" style={{ color: item.color }}>
                              {`${t('finance.remaining')}: ${formatVND(
                                Number(item.remaining),
                              )}/${t('time.day')}`}
                            </Text>
                          </Box>
                        </Box>
                        <Box alignItems="flex-end">
                          <Text variant="subheader">
                            {formatVND(item.amount)}
                          </Text>
                          <Text variant="caption" color="secondaryText">
                            {item.percent_limit}%
                          </Text>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                  <View
                    style={{
                      height: 8,
                      backgroundColor: colors.gray,
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        width: `${Math.min(100, item.percent_limit)}%`,
                        height: '100%',
                        backgroundColor: item.color,
                        borderRadius: 4,
                      }}
                    />
                  </View>
                </Box>
              </Pressable>
            ))}
          </Box>
        </Box>
      </AppScrollView>

      <MonthPickerBottomSheet
        visible={monthPickerVisible}
        onClose={() => setMonthPickerVisible(false)}
        initialMonth={time.month - 1}
        initialYear={time.year}
        onConfirm={handleMonthConfirm}
        disableFuture
      />
    </Screen>
  );
};

const enhance = withObservables(['time'], ({ time }: { time: TimeState }) => ({
  categories: observeCategoryStats(time.month, time.year),
}));

const EnhancedStatistics = enhance(Statistics);

export default function StatisticsScreen() {
  const { time } = useAppSelector(state => state.global);
  return <EnhancedStatistics time={time} />;
}
