import React, { useState } from 'react';
import { KeyboardTypeOptions, StyleSheet } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet'; // Cực kỳ quan trọng
import { Box, Text } from '@/theme/components';
import { Theme } from '@/theme';
import { useTheme } from '@shopify/restyle';
import AppIcon from '@/components/common/AppIcon';
import { RADIUS } from '@/theme/constant';

// Lộc có thể kế thừa các props từ BottomSheetTextInput
interface Props extends React.ComponentProps<typeof BottomSheetTextInput> {
  label?: string;
  icon?: string;
  error?: string;
  type?: KeyboardTypeOptions;
}

const AppBottomSheetInput = ({
  label,
  icon,
  error,
  type = 'default',
  ...props
}: Props) => {
  const { colors } = useTheme<Theme>();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <Box marginBottom="m" width="100%">
      {label && (
        <Text variant="label" color="secondaryText" marginBottom="s">
          {label}
        </Text>
      )}

      <Box
        flexDirection="row"
        alignItems="center"
        paddingHorizontal="m"
        height={50}
        borderRadius={RADIUS.m}
        backgroundColor="main"
        borderWidth={1.5}
        style={{ borderColor: isFocused ? colors.primary : colors.card }}
      >
        {icon && (
          <Box marginRight="s">
            <AppIcon
              name={icon}
              size={20}
              color={isFocused ? colors.primary : colors.secondaryText}
            />
          </Box>
        )}

        <BottomSheetTextInput
          style={[styles.input, { color: colors.text }]}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor={colors.secondaryText}
          keyboardType={type}
          {...props}
        />
      </Box>

      {error && (
        <Text variant="caption" color="danger" marginTop="s">
          {error}
        </Text>
      )}
    </Box>
  );
};

const styles = StyleSheet.create({
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
});

export default AppBottomSheetInput;
