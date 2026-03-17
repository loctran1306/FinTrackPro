import { Theme } from '@/theme';
import { BUTTON_ICON_SIZE, RADIUS } from '@/theme/constant';
import { useTheme } from '@shopify/restyle';
import AppButton from './AppButton';

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
