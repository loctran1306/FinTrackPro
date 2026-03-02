import AppButton from '@/components/button/AppButton';
import AppBottomSheet, { AppBottomSheetRef } from '@/components/common/AppBottomSheet';
import AppIcon from '@/components/common/AppIcon';
import { Theme } from '@/theme';
import { SPACING } from '@/theme/constant';
import { useTheme } from '@shopify/restyle';
import { Box, Text } from '@theme/components';
import React, { useEffect, useRef, useState } from 'react';

const MONTH_LABELS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

interface Props {
  visible: boolean;
  onClose: () => void;
  initialMonth?: number;
  initialYear?: number;
  onConfirm: (month: number, year: number) => void;
  disableFuture?: boolean;
}

const MonthPickerBottomSheet: React.FC<Props> = ({
  visible,
  onClose,
  initialMonth = new Date().getMonth(),
  initialYear = new Date().getFullYear(),
  onConfirm,
  disableFuture = true,
}) => {
  const { colors } = useTheme<Theme>();
  const bottomSheetRef = useRef<AppBottomSheetRef>(null);
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);

  useEffect(() => {
    if (visible) {
      setMonth(initialMonth);
      setYear(initialYear);
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible, initialMonth, initialYear]);

  const now = new Date();
  const isFutureMonth = (m: number, y: number) => {
    if (y > now.getFullYear()) return true;
    if (y === now.getFullYear() && m > now.getMonth()) return true;
    return false;
  };

  const handleConfirm = () => {
    onConfirm(month, year);
    bottomSheetRef.current?.close();
  };

  return (
    <AppBottomSheet
      ref={bottomSheetRef}
      snapPoints={['50%']}
      onClose={onClose}
    >
      <Text variant="subheader" marginBottom="m" textAlign="center">
        Chọn tháng
      </Text>

      {/* Year selector - 2 nút 2 bên, năm giữa */}
      <Box flexDirection="row" alignItems="center" justifyContent="space-between" marginBottom="l">
        <AppButton
          onPress={() => setYear(y => y - 1)}
          style={{ padding: SPACING.s }}
          shadow={false}
        >
          <AppIcon name="chevron-left" size={24} color={colors.text} />
        </AppButton>
        <Text variant="header">{year}</Text>
        <AppButton
          onPress={() => setYear(y => y + 1)}
          style={{ padding: SPACING.s }}
          shadow={false}
          disabled={disableFuture && year >= now.getFullYear()}
        >
          <AppIcon name="chevron-right" size={24} color={colors.text} />
        </AppButton>
      </Box>

      {/* Month grid - căn giữa */}
      <Box flexDirection="row" flexWrap="wrap" justifyContent="center" gap="s" marginBottom="l">
        {MONTH_LABELS.map((label, index) => {
          const disabled = disableFuture && isFutureMonth(index, year);
          const selected = month === index;
          return (
            <AppButton
              key={index}
              onPress={() => !disabled && setMonth(index)}
              disabled={disabled}
              style={{
                backgroundColor: selected ? colors.primary : colors.card,
                opacity: disabled ? 0.5 : 1,
                width: 85
              }}
            >
              <Text variant='caption' style={{ color: selected ? '#fff' : disabled ? colors.secondaryText : colors.text }}>{label}</Text>
            </AppButton>

          );
        })}
      </Box>

      <AppButton backgroundColor="primary" onPress={handleConfirm}>
        <Text textAlign="center" color="white">Xác nhận</Text>
      </AppButton>
    </AppBottomSheet>
  );
};

export default MonthPickerBottomSheet;
