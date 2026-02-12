import Toast from 'react-native-toast-message';

export const toast = {
  success: (
    title: string,
    message?: string,
    onPress?: () => void,
    position?: 'top' | 'bottom',
  ) => {
    Toast.show({
      type: 'success',
      text1: title,
      text2: message,
      onPress: onPress,
      position: position,
    });
  },
  error: (
    title: string,
    message?: string,
    onPress?: () => void,
    position?: 'top' | 'bottom',
  ) => {
    Toast.show({
      type: 'error',
      text1: title,
      text2: message,
      onPress: onPress,
      position: position,
    });
  },
  info: (
    title: string,
    message?: string,
    onPress?: () => void,
    position?: 'top' | 'bottom',
  ) => {
    Toast.show({
      type: 'info',
      text1: title,
      text2: message,
      onPress: onPress,
      position: position,
    });
  },
  warning: (
    title: string,
    message?: string,
    onPress?: () => void,
    position?: 'top' | 'bottom',
  ) => {
    Toast.show({
      type: 'warning',
      text1: title,
      text2: message,
      onPress: onPress,
      position: position,
    });
  },
};
