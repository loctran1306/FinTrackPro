import AppButton from '@/components/button/AppButton';
import AppBottomSheet, {
  AppBottomSheetRef,
} from '@/components/common/AppBottomSheet';
import AppIcon from '@/components/common/AppIcon';
import { transactionService } from '@/services/transaction/transaction.service';
import { Theme } from '@/theme';
import { Box, Text } from '@/theme/components';
import { SPACING } from '@/theme/constant';
import { toast } from '@/utils/toast';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useTheme } from '@shopify/restyle';
import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import LoadingWithLogo from '../loading/LoadingWithLogo';

const QUICK_ACTIONS = [
  { label: 'Cà phê 30k', icon: 'mug-saucer' },
  { label: 'Xăng xe 50k', icon: 'car' },
  { label: 'Đi chợ 200k', icon: 'cart-shopping' },
  { label: 'Ăn tối 150k', icon: 'utensils' },
];

export interface QuickTransactionBottomSheetRef {
  expand: () => void;
  close: () => void;
}

const QuickTransactionBottomSheet = forwardRef<
  QuickTransactionBottomSheetRef,
  object
>((_, ref) => {
  const { colors } = useTheme<Theme>();
  const sheetRef = useRef<AppBottomSheetRef>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingComplete, setLoadingComplete] = useState(false);

  useImperativeHandle(ref, () => ({
    expand: () => sheetRef.current?.expand(),
    close: () => sheetRef.current?.close(),
  }));

  const handleQuickAction = (label: string) => {
    setInput(label);
  };

  const resultRef = useRef<any>(null);
  const handleSave = async () => {
    try {
      setLoading(true);
      const result = await transactionService.handleAITransaction(input);
      resultRef.current = result;
    } catch (error) {
      toast.error(error as string);
    } finally {
      setLoadingComplete(true);
    }
  };

  const handleCreateWalletComplete = () => {
    setLoadingComplete(false);
    setLoading(false);
    if (resultRef.current) {
      toast.success('Giao dịch đã được tạo thành công');
      setInput('');
      sheetRef.current?.close();
    } else {
      toast.error('Giao dịch thất bại');
    }
  };

  return (
    <AppBottomSheet
      ref={sheetRef}
      snapPoints={['55%', '85%']}
      hideIndicator={false}
    >
      {/* Header */}
      <Box marginBottom="m">
        <Text variant="header" textAlign="center">
          Nhập nhanh giao dịch
        </Text>
        <Text
          variant="caption"
          color="secondaryText"
          textAlign="center"
          marginTop="xs"
        >
          Ghi chép chi tiêu – nhập số tiền và nội dung để lưu nhanh
        </Text>
      </Box>

      {/* Icon */}
      <Box alignItems="center" marginBottom="l">
        <Box
          width={72}
          height={72}
          borderRadius={9999}
          backgroundColor="primary"
          opacity={0.15}
          alignItems="center"
          justifyContent="center"
        >
          <AppIcon name="pen-to-square" size={32} color="primary" />
        </Box>
      </Box>

      {/* Quick actions - scroll ngang */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: SPACING.s,
          paddingBottom: SPACING.m,
          paddingHorizontal: SPACING.m,
        }}
        style={{ marginHorizontal: -SPACING.m }}
      >
        {QUICK_ACTIONS.map(({ label, icon }) => (
          <TouchableOpacity
            key={label}
            onPress={() => handleQuickAction(label)}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: SPACING.m,
              paddingVertical: SPACING.s,
              borderRadius: 9999,
              backgroundColor: colors.primary + '20',
              borderWidth: 1,
              borderColor: colors.primary + '40',
            }}
          >
            <AppIcon name={icon} size={18} color="primary" />
            <Text variant="caption" fontFamily="semiBold" color="primary">
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Input */}
      <Box
        flexDirection="row"
        alignItems="center"
        paddingHorizontal="m"
        paddingVertical="s"
        borderRadius={9999}
        backgroundColor="card"
        borderWidth={1.5}
        style={{ borderColor: colors.card }}
        marginBottom="m"
      >
        <BottomSheetTextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ví dụ: Ăn sáng 50k"
          placeholderTextColor={colors.secondaryText}
          style={{
            flex: 1,
            paddingVertical: 10,
            paddingHorizontal: SPACING.s,
            fontSize: 15,
            color: colors.text,
          }}
          returnKeyType="done"
          onSubmitEditing={handleSave}
        />
        <AppButton
          onPress={handleSave}
          disabled={loading || !input}
          backgroundColor="primary"
          shadow={false}
          style={{
            borderRadius: 9999,
            paddingVertical: SPACING.s,
          }}
        >
          <Box
            flexDirection="row"
            justifyContent="center"
            alignItems="center"
            gap="xs"
          >
            <AppIcon name="plus" size={14} color="white" />
          </Box>
        </AppButton>
      </Box>

      <Box alignItems="center" justifyContent="center">
        {loading && (
          <LoadingWithLogo
            isComplete={loadingComplete}
            onComplete={handleCreateWalletComplete}
          />
        )}
      </Box>
    </AppBottomSheet>
  );
});

QuickTransactionBottomSheet.displayName = 'QuickTransactionBottomSheet';

export default QuickTransactionBottomSheet;
