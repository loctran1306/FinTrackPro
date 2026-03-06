import { Theme } from '@/theme';
import { Box, Text } from '@/theme/components';
import { RADIUS, SPACING } from '@/theme/constant';
import { toast } from '@/utils/toast';
import { useTheme } from '@shopify/restyle';
import { evaluate } from 'mathjs';
import React, { useState } from 'react';
import { Dimensions } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import AppButton from '../button/AppButton';

const { width } = Dimensions.get('window');

// Định nghĩa kiểu dữ liệu cho Props
interface CalculatorKeyboardProps {
  onValueChange?: (result: number) => void;
  onDone: (result: number) => void;
  initialValue?: number;
}

const CalculatorKeyboard: React.FC<CalculatorKeyboardProps> = ({
  onValueChange,
  onDone,
  initialValue = 0,
}) => {
  const { colors } = useTheme<Theme>();
  const [expr, setExpr] = useState<string>(
    initialValue ? initialValue.toString() : '',
  );

  const buttons: string[] = [
    '7',
    '8',
    '9',
    'DEL',
    '4',
    '5',
    '6',
    '+',
    '1',
    '2',
    '3',
    '-', // Thêm Nhân
    '.',
    '0',
    '*',
    '/', // Dời Trừ và Cộng xuống đây
    'C',
    '',
    '=',
    'OK', // Thêm nút C (Clear) để xóa sạch nếu gõ sai quá nhiều
  ];

  // Tính kết quả real-time và gọi onValueChange
  const emitResult = (expression: string) => {
    if (!onValueChange) return;
    if (!expression) {
      onValueChange(0);
      return;
    }
    try {
      const result = evaluate(expression);
      onValueChange(Number(result));
    } catch {
      // Biểu thức chưa hợp lệ (đang gõ dở) → giữ nguyên giá trị cũ
    }
  };

  const handlePress = (btn: string): void => {
    let newExpr = expr;

    if (btn === 'DEL') {
      newExpr = expr.slice(0, -1);
    } else if (btn === 'C') {
      newExpr = ''; // Xóa sạch biểu thức
    } else if (btn === 'OK') {
      try {
        // mathjs sẽ tự hiểu dấu * và /
        const result = evaluate(expr || '0');
        onDone(Number(result));
        return;
      } catch (error) {
        console.log(error);
        toast.error('Biểu thức chưa đúng.');
        return;
      }
    } else if (btn === '=') {
      try {
        newExpr = evaluate(expr || '0').toString();
      } catch (error) {
        console.log(error);
        toast.error('Biểu thức chưa đúng.');
        newExpr = 'Error';
      }
    } else {
      // Ngăn không cho nhập 2 toán tử liên tiếp (ví dụ: 100++5)
      const lastChar = expr.slice(-1);
      const operators = ['+', '-', '*', '/'];
      if (operators.includes(btn) && operators.includes(lastChar)) {
        newExpr = expr.slice(0, -1) + btn; // Thay thế toán tử cũ bằng cái mới
      } else {
        newExpr = expr + btn;
      }
    }

    setExpr(newExpr);
    emitResult(newExpr);
  };

  // Hàm format số chuẩn Việt Nam (1.000.000)
  const formatDisplay = (val: string): string => {
    if (!val || val === 'Error') return val;
    // Tách phần số và toán tử để format riêng biệt
    return val.replace(/\d+/g, n =>
      new Intl.NumberFormat('vi-VN').format(Number(n)),
    );
  };

  return (
    <Animated.View
      entering={SlideInDown.duration(300)}
      exiting={SlideOutDown.duration(300)}
    >
      <Box backgroundColor="main" gap="s">
        <Box paddingHorizontal="m">
          <Text fontSize={24} textAlign="center" color="primary">
            {formatDisplay(expr) || '0'}
          </Text>
        </Box>

        <Box
          width="100%"
          flexDirection="row"
          flexWrap="wrap"
          justifyContent="center"
          alignItems="center"
          gap="xs"
        >
          {buttons.map(btn => {
            const isOperator = ['+', '-', '*', '/', '=', 'DEL', 'C'].includes(
              btn,
            );
            const isOK = btn === 'OK';

            return (
              <AppButton
                haptic="selection"
                shadow={true}
                key={btn}
                onPress={() => handlePress(btn)}
                style={{
                  width: width / 4 - SPACING.xs * 2,
                  height: 40,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: isOperator
                    ? colors.highlight
                    : isOK
                    ? colors.primary
                    : colors.main,
                  borderRadius: RADIUS.m,
                  padding: 0,
                }}
              >
                <Text color={isOK ? 'white' : 'text'} fontSize={20}>
                  {btn === '*' ? 'x' : btn}
                </Text>
              </AppButton>
            );
          })}
        </Box>
      </Box>
    </Animated.View>
  );
};

export default CalculatorKeyboard;
