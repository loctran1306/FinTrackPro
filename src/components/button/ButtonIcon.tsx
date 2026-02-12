import { StyleSheet } from 'react-native';
import AppButton from './AppButton';
import { BUTTON_ICON_SIZE, RADIUS } from '@/theme/constant';
import { useTheme } from '@shopify/restyle';
import { Theme } from '@/theme';

type ButtonIconProps = {
  icon: React.ReactNode;
  onPress: () => void;
  size?: keyof typeof BUTTON_ICON_SIZE;
  color?: keyof Theme['colors'];
  circle?: boolean;
};

const ButtonIcon = ({
  icon,
  onPress,
  size = 'md',
  color = 'main',
  circle = false,
}: ButtonIconProps) => {
  const { colors } = useTheme<Theme>();
  const buttonSize = BUTTON_ICON_SIZE[size];
  return (
    <AppButton
      onPress={onPress}
      style={[
        styles.actionButton,
        {
          minWidth: buttonSize,
          minHeight: buttonSize,
          paddingHorizontal: 8,
          paddingVertical: 6,
          backgroundColor: colors[color],
          borderRadius: circle ? buttonSize / 2 : RADIUS.m,
        },
      ]}
    >
      {icon}
    </AppButton>
  );
};

export default ButtonIcon;

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    shadowOpacity: 0.08,
    elevation: 4,
  },
});
