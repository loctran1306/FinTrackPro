import { LOCALE_VI } from '@/constants/locale.const';
import React, { useEffect, useRef } from 'react';
import { LocaleConfig } from 'react-native-calendars';
import AppBottomSheet, { AppBottomSheetRef } from '../common/AppBottomSheet';
import DateTimePicker from '../picker/DateTimePicker';

LocaleConfig.locales.vi = LOCALE_VI as any;
LocaleConfig.defaultLocale = 'vi';

interface Props {
  initialDate?: Date;
  onConfirm: (date: Date) => void;
  visible: boolean;
  onClose: () => void;
  numberMonthBefore?: number;
  numberMonthFuture?: number;
  disableFuture?: boolean;
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
  const bottomSheetRef = useRef<AppBottomSheetRef>(null);

  // Sync visibility with BottomSheet
  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible]);

  const handleConfirm = (date: Date) => {
    onConfirm(date);
    bottomSheetRef.current?.close();
  };

  return (
    <AppBottomSheet
      ref={bottomSheetRef}
      snapPoints={['90%']}
      enableDynamicSizing={false}
      onClose={onClose}
      isScrollable={false}
    >
      <DateTimePicker
        initialDate={initialDate}
        onConfirm={handleConfirm}
        numberMonthBefore={numberMonthBefore}
        numberMonthFuture={numberMonthFuture}
        disableFuture={disableFuture}
      />
    </AppBottomSheet>
  );
};

export default DateTimePickerBottomSheet;
