import { FONTS, Theme } from '@/theme';
import { RADIUS } from '@/theme/constant';
import { useTheme } from '@shopify/restyle';
import { Box, Text } from '@theme/components';
import LunarCalendar from 'lunar-calendar';
import moment from 'moment';
import React, { useCallback, useRef, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { CalendarList } from 'react-native-calendars';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import AppButton from '../button/AppButton';

interface Props {
  initialDate?: Date;
  onConfirm: (date: Date) => void;
  visible: boolean;
  onClose: () => void;
  numberMonthBefore?: number; // Số tháng có thể scroll về trước (mặc định 24)
  numberMonthFuture?: number; // Số tháng có thể scroll về sau (mặc định 0)
  disableFuture?: boolean; // Có disable các ngày trong tương lai không (mặc định true)
}

const DateTimePickerBottomSheet: React.FC<Props> = ({
  initialDate = new Date(),
  onConfirm,
  visible,
  onClose,
  numberMonthBefore = 24,
  numberMonthFuture = 0,
  disableFuture = true,
}) => {
  const { colors } = useTheme<Theme>();
  const { width } = useWindowDimensions();
  const calendarWidth = width - 32;
  const today = moment().format('YYYY-MM-DD');
  const maxDate = disableFuture ? today : undefined;
  const lunarCacheRef = useRef<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState(
    moment(initialDate).format('YYYY-MM-DD'),
  );

  const handleConfirm = () => {
    const finalDate = moment(selectedDate).toDate();
    onConfirm(finalDate);
    onClose();
  };

  const getLunarLabel = useCallback(
    (dateString: string, year: number, month: number, day: number) => {
      const cached = lunarCacheRef.current[dateString];
      if (cached) return cached;

      const lunar = LunarCalendar.solarToLunar(year, month, day);
      const label =
        lunar.lunarDay === 1
          ? `${lunar.lunarDay}/${lunar.lunarMonth}`
          : `${lunar.lunarDay}`;

      lunarCacheRef.current[dateString] = label;
      return label;
    },
    [],
  );

  // Memoized day component với dependencies cụ thể
  const DayComponent = useCallback(
    ({ date, state, marking }: any) => {
      const isSelected = marking?.selected;
      const isToday = date.dateString === today;
      const isFuture = disableFuture && date.dateString > today;
      const lunarLabel = getLunarLabel(
        date.dateString,
        date.year,
        date.month,
        date.day,
      );
      return (
        <TouchableOpacity
          disabled={isFuture}
          onPress={() => setSelectedDate(date.dateString)}
          style={[
            styles.dayBox,
            isSelected && { backgroundColor: colors.primary },
            isFuture && { opacity: 0.45 },
          ]}
        >
          <Text
            style={{
              color: isSelected
                ? colors.white
                : state === 'disabled' || isFuture
                ? '#ccc'
                : isToday
                ? colors.primary
                : colors.text,
            }}
          >
            {date.day}
          </Text>
          <Text
            style={{
              fontSize: 8,
              color: isSelected
                ? colors.white
                : isToday
                ? colors.highlight
                : colors.secondaryText,
            }}
          >
            {lunarLabel}
          </Text>
        </TouchableOpacity>
      );
    },
    [colors, today, disableFuture, getLunarLabel],
  );

  // Render danh sách chọn giờ/phút kiểu cuộn
  //   const renderTimePicker = (
  //     total: number,
  //     current: number,
  //     setFn: (val: number) => void,
  //   ) => (
  //     <ScrollView showsVerticalScrollIndicator={false} style={styles.timeScroll}>
  //       {Array.from({ length: total }).map((_, i) => (
  //         <TouchableOpacity
  //           key={i}
  //           onPress={() => setFn(i)}
  //           style={[styles.timeItem, current === i && styles.timeItemActive]}
  //         >
  //           <Text
  //             style={{
  //               color: current === i ? '#ff7675' : '#ccc',
  //               fontWeight: current === i ? 'bold' : 'normal',
  //             }}
  //           >
  //             {i < 10 ? `0${i}` : i}
  //           </Text>
  //         </TouchableOpacity>
  //       ))}
  //     </ScrollView>
  //   );

  if (!visible) return null;

  return (
    <Animated.View
      entering={SlideInDown.duration(300)}
      exiting={SlideOutDown.duration(300)}
      style={[styles.container, { backgroundColor: colors.main }]}
    >
      <Box paddingHorizontal="m" paddingTop="m" flex={1}>
        <CalendarList
          current={selectedDate}
          maxDate={maxDate}
          horizontal
          pagingEnabled
          scrollEnabled
          nestedScrollEnabled
          calendarWidth={calendarWidth}
          pastScrollRange={numberMonthBefore}
          futureScrollRange={numberMonthFuture}
          showScrollIndicator={false}
          hideArrows={false}
          scrollEventThrottle={16}
          onDayPress={day => {
            if (disableFuture && moment(day.dateString).isAfter(today, 'day'))
              return;
            setSelectedDate(day.dateString);
          }}
          markedDates={{
            [selectedDate]: {
              selected: true,
              selectedColor: colors.primary,
            },
          }}
          theme={{
            textDayFontFamily: FONTS.regular,
            textMonthFontFamily: FONTS.thin,
            textDayHeaderFontFamily: FONTS.regular,
            textDayHeaderFontSize: 12,
            textDayHeaderFontWeight: 'normal',
            monthTextColor: colors.text,
            arrowColor: colors.primary,
            disabledArrowColor: colors.secondaryText,
            textSectionTitleColor: colors.secondaryText,
          }}
          dayComponent={DayComponent}
        />
        {/* 2. Chọn Giờ & Phút */}
        {/* <Box flexDirection="row" justifyContent="center" alignItems="center" marginTop="l" height={120} borderTopWidth={1} borderTopColor='highlight'>
                        <Box alignItems="center" flex={1}>
                            <Text variant="caption" marginBottom="s">GIỜ</Text>
                            {renderTimePicker(24, hour, setHour)}
                        </Box>
                        <Text fontSize={20} fontWeight="bold">:</Text>
                        <Box alignItems="center" flex={1}>
                            <Text variant="caption" marginBottom="s">PHÚT</Text>
                            {renderTimePicker(60, minute, setMinute)}
                        </Box>
                    </Box> */}
        <AppButton backgroundColor="primary" onPress={handleConfirm}>
          <Text color="white" textAlign="center">
            XÁC NHẬN
          </Text>
        </AppButton>
      </Box>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '65%',
    borderTopLeftRadius: RADIUS.l,
    borderTopRightRadius: RADIUS.l,
    paddingTop: 16,
    paddingBottom: 32,
    zIndex: 1000,
  },
  dayBox: {
    width: 36,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  timeScroll: { height: 80, width: '100%' },
  timeItem: { height: 40, alignItems: 'center', justifyContent: 'center' },
  timeItemActive: { borderBottomWidth: 2, borderBottomColor: '#ff7675' },
  confirmBtn: {
    backgroundColor: '#ff7675',
    padding: 16,
    borderRadius: RADIUS.m,
    alignItems: 'center',
    marginTop: 20,
  },
});

export default DateTimePickerBottomSheet;
