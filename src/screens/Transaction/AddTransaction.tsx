import AppButton from '@/components/button/AppButton';
import AppHeader from '@/components/common/AppHeader';
import Screen from '@/components/common/Screen';
import DateTimePickerBottomSheet from '@/components/modals/DateTimePickerBottomSheet';
import { Box, Text } from '@/theme/components';
import { useState } from 'react';

const AddTransaction = () => {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleDateTimeConfirm = (date: Date) => {
    console.log(date);
  };

  return (
    <Screen>
      <AppHeader title="Thêm giao dịch" />
      <Box flex={1} paddingHorizontal="m">
        <AppButton onPress={() => setShowDatePicker(!showDatePicker)}>
          <Text>Thêm giao dịch</Text>
        </AppButton>
      </Box>

      <DateTimePickerBottomSheet
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onConfirm={handleDateTimeConfirm}
      />
    </Screen>
  );
};
export default AddTransaction;
