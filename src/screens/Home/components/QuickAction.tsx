import AppButton from '@/components/button/AppButton';
import AppIcon from '@/components/common/AppIcon';
import SpeedDialWrapper from '@/components/common/SpeedDialWrapper';
import { WALLET_TYPES } from '@/constants/wallet';
import { RootStackParamList } from '@/navigation/types';
import { Theme } from '@/theme';
import { Box, Text } from '@/theme/components';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from 'react-i18next';

type Props = {
  onCreateWallet: (type: keyof typeof WALLET_TYPES) => void;
  onQuickTransaction?: () => void;
};

const QuickAction = ({ onCreateWallet, onQuickTransaction }: Props) => {
  const { t } = useTranslation();
  const { colors } = useTheme<Theme>();
  const rootNavigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Options cho nút "Tạo ví mới"
  const walletOptions = [
    {
      icon: 'money-bill',
      label: t('finance.payment_wallet'),
      onPress: () => onCreateWallet('cash'),
    },
    {
      icon: 'id-card',
      label: t('finance.bank_wallet'),
      onPress: () => onCreateWallet('bank'),
    },
    {
      icon: 'credit-card',
      label: t('finance.credit_wallet'),
      onPress: () => onCreateWallet('credit'),
    },
  ];

  const quickActions = [
    {
      id: 'quick',
      label: t('finance.quick_entry') || 'Nhập nhanh',
      icon: <AppIcon name="pen-to-square" size={20} color={colors.primary} />,
      onMainPress: onQuickTransaction,
    },
    {
      id: 'add',
      label: t('finance.create_new_wallet'),
      icon: <AppIcon name="plus" size={20} color={colors.primary} />,
      options: walletOptions,
    },
    {
      id: 'transfer',
      label: t('finance.transfer'),
      icon: (
        <AppIcon
          name="arrow-right-arrow-left"
          size={20}
          color={colors.primary}
        />
      ),
      options: [],
      onMainPress: () => rootNavigation.navigate('WalletTransfer'),
    },
    {
      id: 'update',
      label: t('finance.update_balance'),
      icon: <AppIcon name="bolt" size={20} color={colors.primary} />,
      options: [],
      onMainPress: () => rootNavigation.navigate('BalanceAdjustment'),
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
        <Box key={action.id} alignItems="center" width="23%" gap="s">
          <SpeedDialWrapper
            options={(action as any).options || []}
            mainIcon={action.icon}
            mainColor={colors.highlight}
            onMainPress={(action as any).onMainPress}
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
