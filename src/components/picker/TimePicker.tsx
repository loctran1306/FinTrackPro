import { Theme } from '@/theme';
import { RADIUS, SPACING } from '@/theme/constant';
import { useTheme } from '@shopify/restyle';
import { Box, Text } from '@theme/components';
import React, { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

interface TimePickerProps {
  hour: number;
  minute: number;
  setHour: (hour: number) => void;
  setMinute: (minute: number) => void;
  hiddenTitle?: boolean;
  itemHeight?: number;
  visibleItems?: number;
  offset?: number;
}

const TimePicker: React.FC<TimePickerProps> = ({
  hour,
  minute,
  setHour,
  setMinute,
  hiddenTitle = false,
  itemHeight = 24,
  visibleItems = 2,
  offset = 5,
}) => {
  const { colors } = useTheme<Theme>();
  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);
  const OFFSET = offset;

  // Tính toán chiều cao và vị trí dựa trên visibleItems
  // Với visibleItems = 3 -> hiển thị 2 item height (0.5 trên + 1 giữa + 0.5 dưới)
  const pickerHeight = (visibleItems - 1) * itemHeight;
  const paddingVertical = (pickerHeight - itemHeight) / 2;

  useEffect(() => {
    setTimeout(() => {
      hourScrollRef.current?.scrollTo({
        y: (OFFSET * 24 + hour) * itemHeight,
        animated: false,
      });
      minuteScrollRef.current?.scrollTo({
        y: (OFFSET * 60 + minute) * itemHeight,
        animated: false,
      });
    }, 100);
  }, []);

  const renderColumn = (
    value: number,
    setValue: (val: number) => void,
    max: number,
    ref: React.RefObject<ScrollView | null>,
    alignItems: 'flex-start' | 'flex-end',
  ) => {
    return (
      <Box alignItems={alignItems} position="relative">
        <Box
          position="relative"
          height={pickerHeight}
          width={itemHeight + SPACING.xs * 2}
          style={{ overflow: 'hidden' }}
        >
          <ScrollView
            ref={ref}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: paddingVertical }}
            snapToInterval={itemHeight}
            decelerationRate={0.98}
            onMomentumScrollEnd={e => {
              const offsetY = e.nativeEvent.contentOffset.y;
              const index = Math.round(offsetY / itemHeight);
              const actualValue = index % max;
              setValue(actualValue);
            }}
          >
            {Array.from({ length: 10 * max }).map((_, i) => {
              const displayValue = i % max;
              const isCenter = value === displayValue;
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    setValue(displayValue);
                    ref.current?.scrollTo({
                      y: i * itemHeight,
                      animated: true,
                    });
                  }}
                  style={[styles.timeItem, { height: itemHeight }]}
                >
                  <Text
                    style={{
                      color: isCenter ? colors.primary : colors.secondaryText,
                      fontWeight: isCenter ? 'semibold' : 'normal',
                      fontSize: isCenter ? 16 : 12,
                      opacity: isCenter ? 1 : 0.4,
                    }}
                  >
                    {displayValue < 10 ? `0${displayValue}` : displayValue}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Box
            position="absolute"
            top={paddingVertical}
            left={0}
            right={0}
            height={itemHeight}
            borderRadius={RADIUS.s}
            borderWidth={1}
            borderColor="highlight"
            pointerEvents="none"
            style={{ opacity: 0.8 }}
          />
        </Box>
      </Box>
    );
  };

  return (
    <Box alignSelf="center" borderRadius={RADIUS.s}>
      {!hiddenTitle && (
        <Text
          variant="label"
          marginBottom="s"
          textAlign="center"
          color="secondaryText"
        >
          Chọn giờ
        </Text>
      )}
      <Box
        flexDirection="row"
        justifyContent="center"
        alignItems="center"
        gap="s"
      >
        {renderColumn(hour, setHour, 24, hourScrollRef, 'flex-end')}
        <Text variant="subheader">:</Text>
        {renderColumn(minute, setMinute, 60, minuteScrollRef, 'flex-start')}
      </Box>
    </Box>
  );
};

const styles = StyleSheet.create({
  timeItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xs,
  },
});

export default TimePicker;
