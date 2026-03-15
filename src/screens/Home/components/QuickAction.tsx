import AppIcon from '@/components/common/AppIcon';
import SpeedDialWrapper from '@/components/common/SpeedDialWrapper';
import { RootStackParamList } from '@/navigation/types';
import { Theme } from '@/theme';
import { Box, Text } from '@/theme/components';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from 'react-i18next';
import { WALLET_TYPE, WALLET_TYPE_ICON } from '@/constants/wallet.const';

type Props = {
  onCreateWallet: (type: WALLET_TYPE) => void;
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
      icon: WALLET_TYPE_ICON[WALLET_TYPE.CASH],
      label: t('finance.payment_wallet'),
      onPress: () => onCreateWallet(WALLET_TYPE.CASH),
    },
    {
      icon: WALLET_TYPE_ICON[WALLET_TYPE.JAR],
      label: t('finance.jar_wallet'),
      onPress: () => onCreateWallet(WALLET_TYPE.JAR),
    },
    {
      icon: WALLET_TYPE_ICON[WALLET_TYPE.CREDIT],
      label: t('finance.credit_wallet'),
      onPress: () => onCreateWallet(WALLET_TYPE.CREDIT),
    },
  ];

  const quickActions = [
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
      id: 'quick',
      label: t('finance.quick_entry') || 'Nhập nhanh',
      icon: <AppIcon name="pen-to-square" size={20} color={colors.primary} />,
      onMainPress: onQuickTransaction,
    },
    // {
    //   id: 'update',
    //   label: t('finance.update_balance'),
    //   icon: <AppIcon name="bolt" size={20} color={colors.primary} />,
    //   options: [],
    //   onMainPress: () => rootNavigation.navigate('BalanceAdjustment'),
    // },
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
