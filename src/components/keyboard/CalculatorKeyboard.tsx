import { Theme } from '@/theme';
import { Box, Text } from '@/theme/components';
import { RADIUS } from '@/theme/constant';
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
  onValueChange?: (value: string) => void;
  onDone: (result: number) => void;
  initialValue?: string;
}

const CalculatorKeyboard: React.FC<CalculatorKeyboardProps> = ({
  onValueChange,
  onDone,
  initialValue = '',
}) => {
  const { colors } = useTheme<Theme>();
  const [expr, setExpr] = useState<string>(initialValue);

  const buttons: string[] = [
    '7',
    '8',
    '9',
    'DEL',
    '4',
    '5',
    '6',
    '/', // Thêm Chia
    '1',
    '2',
    '3',
    '*', // Thêm Nhân
    '.',
    '0',
    '-',
    '+', // Dời Trừ và Cộng xuống đây
    'C',
    '',
    '=',
    'OK', // Thêm nút C (Clear) để xóa sạch nếu gõ sai quá nhiều
  ];

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
        // Sau đó Lộc dùng toDbAmount(Number(result)) để lưu 100 thay vì 100,000
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
    if (onValueChange) {
      onValueChange(newExpr);
    }
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
          <Text textAlign="center" color="primary">
            {formatDisplay(expr) || '0'}
          </Text>
        </Box>

        <Box
          width="100%"
          flexDirection="row"
          flexWrap="wrap"
          justifyContent="center"
          alignItems="center"
          gap="s"
        >
          {buttons.map(btn => {
            const isOperator = ['+', '-', '*', '/', '=', 'DEL', 'C'].includes(
              btn,
            );
            const isOK = btn === 'OK';

            return (
              <AppButton
                key={btn}
                onPress={() => handlePress(btn)}
                style={{
                  width: width / 5,
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
                <Text
                  variant="body"
                  color={isOK ? 'white' : 'text'}
                  fontFamily="semiBold"
                >
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
