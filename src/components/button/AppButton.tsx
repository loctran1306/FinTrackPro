import { COLORS, Theme } from '@/theme';
import { RADIUS, SHADOW, SPACING } from '@/theme/constant';
import { BoxProps, useTheme } from '@shopify/restyle';
import { Box } from '@theme/components';
import React from 'react';
import {
  Keyboard,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// Tùy chọn rung mặc định
const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

interface AppButtonProps extends PressableProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  containerProps?: BoxProps<Theme>; // Cho phép dùng props của Box (padding, margin, màu sắc)
  haptic?: 'impactLight' | 'impactMedium' | 'impactHeavy' | 'selection';
  activeOpacity?: number;
  shadow?: boolean;
  backgroundColor?: keyof Theme['colors'];
}

const AppButton = ({
  children,
  style,
  containerProps,
  haptic,
  activeOpacity = 0.6,
  shadow = true,
  onPress,
  backgroundColor,
  ...rest
}: AppButtonProps) => {
  const { colors } = useTheme<Theme>();
  const handlePress = (event: any) => {
    Keyboard.dismiss();
    if (haptic) {
      ReactNativeHapticFeedback.trigger(haptic, hapticOptions);
    }
    onPress?.(event);
  };

  return (
    <Pressable
      onPress={handlePress}
      {...rest}
      // Dùng hitSlop mặc định để dễ bấm hơn cho các nút nhỏ
      hitSlop={8}
    >
      {({ pressed }) => (
        <Box
          {...containerProps}
          style={[
            { borderRadius: RADIUS.m, padding: SPACING.m },
            shadow && { ...SHADOW, borderWidth: 1, borderColor: colors.card },
            style,
            { opacity: pressed ? activeOpacity : rest.disabled ? 0.5 : 1 },
          ]}
          backgroundColor={backgroundColor}
        >
          {children}
        </Box>
      )}
    </Pressable>
  );
};

export default AppButton;
