import React from 'react';
import Toast, {
  BaseToast,
  BaseToastProps,
  ErrorToast,
  ToastConfig,
} from 'react-native-toast-message';
import { COLORS, TEXT_VARIANTS } from '@/theme';
import { TouchableOpacity, View } from 'react-native';
import AppIcon from '../common/AppIcon';

const percentBackground = 10;

const toastStyle = {
  success: {
    borderLeftColor: COLORS.green,
    backgroundColor: COLORS.card,
  },
  error: {
    borderLeftColor: COLORS.red,
    backgroundColor: COLORS.card,
  },
  info: {
    borderLeftColor: COLORS.highlight,
    backgroundColor: COLORS.card,
  },
  warning: {
    borderLeftColor: COLORS.orange,
    backgroundColor: COLORS.card,
  },
};

const toastContentContainerStyle = {
  paddingHorizontal: 20,
  gap: 2,
};
const toastText1NumberOfLines = 1;
const toastText1Style = {
  ...TEXT_VARIANTS.subheader,
};
const toastText2NumberOfLines = 2;
const toastText2Style = {
  ...TEXT_VARIANTS.caption,
};

const trailingCloseIcon = (color?: string) => (
  <View
    style={{
      backgroundColor: `${color || COLORS.primary}${percentBackground}`,
      borderBottomRightRadius: 6,
      borderTopRightRadius: 6,
    }}
  >
    <TouchableOpacity
      style={{ padding: 4, height: '50%' }}
      onPress={() => Toast.hide()}
    >
      <AppIcon name="xmark" size={20} color={color || COLORS.primary} />
    </TouchableOpacity>
  </View>
);

const handleOnPress = (onPress?: () => void) => {
  if (onPress && onPress?.name !== 'noop') {
    onPress();
    Toast.hide();
  }
};

const baseConfig = {
  text1NumberOfLines: toastText1NumberOfLines,
  text1Style: toastText1Style,
  text2NumberOfLines: toastText2NumberOfLines,
  text2Style: toastText2Style,
};

export const toastConfig: ToastConfig = {
  success: (props: BaseToastProps) => (
    <BaseToast
      renderTrailingIcon={() => trailingCloseIcon(COLORS.green)}
      {...props}
      style={toastStyle.success}
      {...baseConfig}
      contentContainerStyle={{
        ...toastContentContainerStyle,
        backgroundColor: `${COLORS.green}${percentBackground}`,
      }}
      onPress={() => handleOnPress(props.onPress)}
    />
  ),

  error: (props: BaseToastProps) => (
    <ErrorToast
      renderTrailingIcon={() => trailingCloseIcon(COLORS.red)}
      {...props}
      style={toastStyle.error}
      {...baseConfig}
      contentContainerStyle={{
        ...toastContentContainerStyle,
        backgroundColor: `${COLORS.red}${percentBackground}`,
      }}
      onPress={() => handleOnPress(props.onPress)}
    />
  ),

  info: (props: BaseToastProps) => (
    <BaseToast
      renderTrailingIcon={() => trailingCloseIcon(COLORS.highlight)}
      {...props}
      style={toastStyle.info}
      {...baseConfig}
      contentContainerStyle={{
        ...toastContentContainerStyle,
        backgroundColor: `${COLORS.highlight}${percentBackground}`,
      }}
      onPress={() => handleOnPress(props.onPress)}
    />
  ),

  warning: (props: BaseToastProps) => (
    <BaseToast
      renderTrailingIcon={() => trailingCloseIcon(COLORS.orange)}
      {...props}
      style={toastStyle.warning}
      {...baseConfig}
      contentContainerStyle={{
        ...toastContentContainerStyle,
        backgroundColor: `${COLORS.orange}${percentBackground}`,
      }}
      onPress={() => handleOnPress(props.onPress)}
    />
  ),
};
