import { Theme } from '@/theme';
import { RADIUS, SHADOW, SPACING } from '@/theme/constant';
import { BoxProps, useTheme } from '@shopify/restyle';
import { Box } from '@theme/components';
import React from 'react';
import {
  StyleProp,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

interface AppButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  containerProps?: BoxProps<Theme>;
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
  shadow = false,
  onPress,
  backgroundColor,
  disabled,
  ...rest
}: AppButtonProps) => {
  const { colors } = useTheme<Theme>();

  const handlePress = (event: any) => {
    if (haptic) {
      ReactNativeHapticFeedback.trigger(haptic, hapticOptions);
    }
    onPress?.(event);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={activeOpacity}
      disabled={disabled}
      {...rest}
    >
      <Box
        {...containerProps}
        style={[
          { borderRadius: RADIUS.m, padding: SPACING.m },
          shadow && { ...SHADOW, borderWidth: 1, borderColor: colors.card },
          style,
          disabled && { opacity: 0.5 },
        ]}
        backgroundColor={backgroundColor}
      >
        {children}
      </Box>
    </TouchableOpacity>
  );
};

export default AppButton;
