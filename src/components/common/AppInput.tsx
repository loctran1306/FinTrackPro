import React, { useState } from 'react';
import { TextInput, TextInputProps, StyleSheet } from 'react-native';
import { Box, Text } from '@/theme/components';
import { TEXT_VARIANTS, Theme } from '@/theme';
import { useTheme } from '@shopify/restyle';
import AppIcon from '@/components/common/AppIcon';
import { RADIUS } from '@/theme/constant';

interface AppInputProps extends TextInputProps {
  label?: string;
  icon?: string;
  error?: string;
  required?: boolean;
  noBorder?: boolean;
  noMargin?: boolean;
  suffix?: string;
}

const AppInput = ({
  label,
  icon,
  error,
  required,
  noBorder,
  noMargin,
  suffix,
  ...props
}: AppInputProps) => {
  const { colors } = useTheme<Theme>();
  const [isFocused, setIsFocused] = useState(false);

  // Xác định màu Border dựa trên trạng thái
  const getBorderColor = () => {
    if (error) return colors.danger;
    if (isFocused) return colors.primary;
    return colors.card; // Màu nền card nhẹ nhàng
  };

  return (
    <Box marginBottom={noMargin ? undefined : 'm'} width="100%">
      {/* Label */}
      {label && (
        <Box flexDirection="row" marginBottom="s">
          <Text variant="body" color="secondaryText">
            {label}
          </Text>
          {required && <Text color="danger"> *</Text>}
        </Box>
      )}

      {/* Input Container */}
      <Box
        flexDirection="row"
        alignItems="center"
        padding="s"
        minHeight={50}
        borderRadius={RADIUS.m}
        backgroundColor="card" // Màu nền chính của app
        borderWidth={noBorder ? 0 : 1.5}
        style={{ borderColor: noBorder ? 'transparent' : getBorderColor() }}
      >
        {/* Icon bên trái nếu có */}
        {icon && (
          <Box marginRight="s">
            <AppIcon
              name={icon}
              size={20}
              color={isFocused ? colors.primary : colors.secondaryText}
            />
          </Box>
        )}
        <TextInput
          style={[styles.input, { color: colors.text, fontSize: 16 }]}
          placeholderTextColor={colors.secondaryText}
          {...props}
          onBlur={event => {
            setIsFocused(false);
            props.onBlur?.(event);
          }}
          onFocus={event => {
            setIsFocused(true);
            props.onFocus?.(event);
          }}
        />
        {suffix ? (
          <Text variant="body" color="secondaryText" marginLeft="xs">
            {suffix}
          </Text>
        ) : null}
      </Box>

      {/* Error Message */}
      {error && (
        <Text variant='caption' color="danger" marginTop="s">
          {error}
        </Text>
      )}
    </Box>
  );
};

const styles = StyleSheet.create({
  input: {
    ...TEXT_VARIANTS.defaults,
    flex: 1,
    height: 'auto',
  },
});

export default AppInput;
