import React, { FC, useCallback, useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Box, Text } from '@/theme/components';
import { FONTS, Theme } from '@/theme';
import { useTheme } from '@shopify/restyle';
import LunarCalendar from 'lunar-calendar';
import moment from 'moment';
import { CalendarList } from 'react-native-calendars';
import AppButton from '@/components/button/AppButton';
import TimePicker from './TimePicker';

interface DateTimePickerProps {
  initialDate?: Date;
  onConfirm: (date: Date) => void;
  numberMonthBefore?: number;
  numberMonthFuture?: number;
  disableFuture?: boolean;
}

const DateTimePicker: FC<DateTimePickerProps> = ({
  initialDate = new Date(),
  onConfirm,
  numberMonthBefore = 24,
  numberMonthFuture = 0,
  disableFuture = true,
}) => {
  const { colors } = useTheme<Theme>();
  const { width } = useWindowDimensions();
  const calendarWidth = width;
  const today = moment().format('YYYY-MM-DD');
  const maxDate = disableFuture ? today : undefined;
  const lunarCacheRef = useRef<Record<string, string>>({});

  const [selectedDate, setSelectedDate] = useState(
    moment(initialDate).format('YYYY-MM-DD'),
  );
  const [hour, setHour] = useState(moment(initialDate).hour());
  const [minute, setMinute] = useState(moment(initialDate).minute());

  useEffect(() => {
    setSelectedDate(moment(initialDate).format('YYYY-MM-DD'));
    setHour(moment(initialDate).hour());
    setMinute(moment(initialDate).minute());
  }, [initialDate]);

  const handleConfirm = () => {
    const finalDate = moment(selectedDate)
      .hour(hour)
      .minute(minute)
      .second(0)
      .toDate();
    onConfirm(finalDate);
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

  const markedDates = React.useMemo(
    () => ({
      [selectedDate]: {
        selected: true,
        selectedColor: colors.primary,
      },
    }),
    [selectedDate, colors.primary],
  );

  const calendarTheme = React.useMemo(
    () => ({
      textDayFontFamily: FONTS.regular,
      textMonthFontFamily: FONTS.thin,
      textDayHeaderFontFamily: FONTS.regular,
      textDayHeaderFontSize: 12,
      textDayHeaderFontWeight: 'normal' as const,
      textMonthFontWeight: '600' as const,
      textMonthFontSize: 14,
      monthTextColor: colors.text,
      arrowColor: colors.primary,
      disabledArrowColor: colors.secondaryText,
      textSectionTitleColor: colors.secondaryText,
    }),
    [colors],
  );

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
          key={isSelected ? 'selected' : 'normal'}
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

  return (
    <Box height="100%">
      <Box alignItems="center">
        <TimePicker
          hour={hour}
          minute={minute}
          setHour={setHour}
          setMinute={setMinute}
          hiddenTitle
        />
      </Box>
      <CalendarList
        current={selectedDate}
        maxDate={maxDate}
        horizontal
        pagingEnabled
        scrollEnabled
        nestedScrollEnabled
        calendarWidth={calendarWidth - 32}
        pastScrollRange={numberMonthBefore}
        futureScrollRange={numberMonthFuture}
        showScrollIndicator={false}
        hideArrows={false}
        scrollEventThrottle={16}
        calendarStyle={{
          marginBlockEnd: -20,
        }}
        onDayPress={day => {
          if (disableFuture && moment(day.dateString).isAfter(today, 'day'))
            return;
          setSelectedDate(day.dateString);
        }}
        markedDates={markedDates}
        theme={calendarTheme}
        dayComponent={DayComponent}
      />

      <Box paddingHorizontal="m" paddingBottom="m" marginTop="s">
        <AppButton backgroundColor="primary" onPress={handleConfirm}>
          <Text color="white" textAlign="center">
            XÁC NHẬN
          </Text>
        </AppButton>
      </Box>
    </Box>
  );
};

const styles = StyleSheet.create({
  dayBox: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
});

export default DateTimePicker;
