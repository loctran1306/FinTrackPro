import { Box, Text } from '@/theme/components';
import Screen from '@/components/common/Screen';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@shopify/restyle';
import { Theme } from '@/theme';
import AppIcon from '@/components/common/AppIcon';
import AppButton from '@/components/button/AppButton';
import AppHeader from '@/components/common/AppHeader';
import DateTimePickerBottomSheet from '@/components/modals/DateTimePickerBottomSheet';
import { useState } from 'react';

const AddTransaction = () => {
  const navigation = useNavigation();
  const { colors } = useTheme<Theme>();
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
