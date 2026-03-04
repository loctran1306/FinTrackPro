import AppButton from '@/components/button/AppButton';
import DoughnutChart, {
  DoughnutSegment,
} from '@/components/chart/DoughnutChart';
import AppIcon from '@/components/common/AppIcon';
import AppScrollView from '@/components/common/AppScrollView';
import Screen from '@/components/common/Screen';
import LoadingChildren from '@/components/loading/LoadingChildren';
import MonthPickerBottomSheet from '@/components/modals/MonthPickerBottomSheet';
import { formatVND } from '@/helpers/currency.helper';
import { RootStackParamList } from '@/navigation/types';
import { CategoryItem } from '@/services/category/category.type';
import { getCategoriesThunk } from '@/store/category/category.thunk';
import { setTime } from '@/store/global/global.slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { RADIUS, SPACING } from '@/theme/constant';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Box, Text } from '@theme/components';
import { Theme } from '@/theme';
import { useTheme } from '@shopify/restyle';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LOCALE_EN, LOCALE_VI } from '@/constants/locale.const';
import { useTranslation } from 'react-i18next';
import ButtonIcon from '@/components/button/ButtonIcon';





const CHART_SIZE = 200;

export const StatisticsScreen = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme<Theme>();
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const bottomTabBarHeight = useBottomTabBarHeight();
  const { top: topSafeArea } = useSafeAreaInsets();

  // Redux
  const dispatch = useAppDispatch()
  const { time } = useAppSelector(state => state.global);
  const { categories, loading } = useAppSelector(state => state.category);


  const sortedCategories = useMemo(() => {
    return [...(categories || [])].sort((a, b) => b.budget_limit - a.budget_limit);
  }, [categories]) || [];

  const chartData: DoughnutSegment[] | undefined = categories?.map((item: CategoryItem) => ({
    value: item.percent_total,
    color: item.color,
    id: item.id,
    name: item.name,
    amount: item.amount,
  }));
  const totalSpend = categories?.reduce((sum, item) => sum + item.amount, 0) || 0;

  const handleMonthConfirm = (month: number, year: number) => {
    dispatch(setTime({ month: month + 1, year: year }));
    setMonthPickerVisible(false);
  };

  const handleRefresh = async () => {
    dispatch(getCategoriesThunk({ month: time.month, year: time.year }));
  };


  const [activeIdx, setActiveIdx] = React.useState<number | null>(null);


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
        <Box paddingHorizontal="m" paddingTop="m" style={{ paddingTop: topSafeArea }}>
          <Text variant="header" textAlign="center" >
            {t('finance.report_expense')}
          </Text>

          <Box flexDirection="row" alignItems="center" justifyContent="center" marginBottom="s">
            <AppButton style={{ flex: 1 }} onPress={() => setMonthPickerVisible(true)}>
              <Box backgroundColor="card" paddingVertical='s' paddingHorizontal='m' borderRadius={RADIUS.xl}>
                <Text textAlign="center" variant="subheader" color="primary">
                  {i18n.language === 'vi' ? LOCALE_VI.monthNames[time.month - 1] : LOCALE_EN.monthNames[time.month - 1]} {time.year}
                </Text>
              </Box>
            </AppButton>

          </Box>

          {/* Doughnut chart */}
          <Box
            backgroundColor="card"
            padding="l"
            borderRadius={RADIUS.xxl}
            alignItems="center"
            marginBottom="l"
            style={{ borderWidth: 1, borderColor: colors.card }}

          >
            <View style={{ height: CHART_SIZE, justifyContent: 'center', position: 'relative' }}>
              {loading ? (
                <LoadingChildren />
              ) : (
                <>
                  <DoughnutChart data={chartData || []} size={CHART_SIZE} strokeWidth={20} selectedIndex={activeIdx} onSelect={setActiveIdx} />
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
                      <Text variant="label" color="secondaryText">{t('finance.total_expense')}</Text>
                      <Text variant="subheader">{formatVND(totalSpend)}</Text>
                    </Box>
                  )}
                </>
              )}

            </View>
          </Box>

          {/* Category details */}
        </Box>
        <Box backgroundColor='main' padding="m" flex={1} >
          {
            loading ? (
              <LoadingChildren />
            ) : (
              <Box>

                <AppButton
                  onPress={() => navigation.navigate('CategoryForm')}
                  style={{ padding: 0, paddingBottom: SPACING.m, alignSelf: 'flex-end' }}
                >
                  <Box flexDirection="row" alignItems="center" justifyContent="center" gap="s">
                    <AppIcon name="plus" size={16} color={colors.primary} />
                    <Text variant="subheader" color="primary">{t('finance.add_category')}</Text>
                  </Box>
                </AppButton>
                {sortedCategories.map(item => (
                  <Pressable
                    key={item.id}
                    onPress={() =>
                      navigation.navigate('CategoryDetail', {
                        categoryId: item.id,
                      })
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
                          <Box flexDirection="row" justifyContent="space-between" alignItems="flex-start">
                            <Box>
                              <Text variant="subheader">{item.name}</Text>
                              <Text variant="caption" color="secondaryText">{item.subtext}</Text>
                              <Box
                                alignSelf="flex-start"
                                paddingHorizontal="xs"
                                paddingVertical="xs"
                                marginTop="xs"
                                borderRadius={RADIUS.xs}
                                style={{ backgroundColor: item.color + '30' }}
                              >
                                <Text variant="label" style={{ color: item.color }}>
                                  {`${t('finance.remaining')}: ${formatVND(Number(item.remaining))}/${t('time.day')}`}
                                </Text>
                              </Box>
                            </Box>
                            <Box alignItems="flex-end">
                              <Text variant="subheader">{formatVND(item.amount)}</Text>
                              <Text variant="caption" color="secondaryText">{item.percent_limit}%</Text>
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
                            width: `${item.percent_limit}%`,
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
            )
          }


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
    </Screen >
  );
};

