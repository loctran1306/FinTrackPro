import AppIcon from '@/components/common/AppIcon';
import SpeedDialWrapper from '@/components/common/SpeedDialWrapper';
import { WALLET_TYPES } from '@/constants/wallet';
import { RootStackParamList } from '@/navigation/types';
import { Theme } from '@/theme';
import { Box, Text } from '@/theme/components';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@shopify/restyle';

type Props = {
  onCreateWallet: (type: keyof typeof WALLET_TYPES) => void;
};

const QuickAction = ({ onCreateWallet }: Props) => {
  const { colors } = useTheme<Theme>();
  const rootNavigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Options cho nút "Tạo ví mới"
  const walletOptions = [
    {
      icon: 'money-bill',
      label: 'Tiền mặt',
      onPress: () => onCreateWallet('cash'),
    },
    {
      icon: 'id-card',
      label: 'Ngân hàng',
      onPress: () => onCreateWallet('bank'),
    },
    {
      icon: 'credit-card',
      label: 'Thẻ tín dụng',
      onPress: () => onCreateWallet('credit'),
    },
  ];

  const quickActions = [
    {
      id: 'add',
      label: 'Tạo ví mới',
      icon: <AppIcon name="plus" size={20} color={colors.primary} />,
      options: walletOptions, // Nút này sẽ bung menu
      navigate: 'AddWallet',
    },
    {
      id: 'transfer',
      label: 'Chuyển tiền',
      icon: (
        <AppIcon
          name="arrow-right-arrow-left"
          size={20}
          color={colors.primary}
        />
      ),
      navigate: 'WalletTransfer', // Nút này bấm là đi luôn
    },
    {
      id: 'update',
      label: 'Cập nhật',
      icon: <AppIcon name="bolt" size={20} color={colors.primary} />,
      navigate: 'BalanceAdjustment',
    },
  ];

  return (
    <Box
      backgroundColor="main"
      flexDirection="row"
      justifyContent="space-between"
      paddingVertical="l"
      paddingHorizontal="m"
    >
      {quickActions.map(action => (
        <Box key={action.id} alignItems="center" width="30%" gap="s">
          <SpeedDialWrapper
            options={action.options}
            mainIcon={action.icon}
            mainColor={colors.highlight}
            onMainPress={() => rootNavigation.navigate(action.navigate as any)}
          />
          <Text textAlign="center" variant="caption" color="secondaryText">
            {action.label}
          </Text>
        </Box>
      ))}
    </Box>
  );
};
export default QuickAction;
