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
  onOpenInbox: () => void;
  inboxCount: number;
};

const QuickAction = ({ onCreateWallet, onQuickTransaction, onOpenInbox, inboxCount }: Props) => {
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
      id: 'quick',
      label: t('finance.quick_entry') || 'Nhập nhanh',
      icon: <AppIcon name="pen-to-square" size={20} color={colors.primary} />,
      onMainPress: onQuickTransaction,
    },
    {
      id: 'installment',
      label: t('finance.installment'),
      icon: <AppIcon name="hand-holding-dollar" size={20} color={colors.primary} />,
      onMainPress: () => rootNavigation.navigate('Installments'),
    },
    {
      id: 'inbox',
      label: t('inbox.shortcut_label'),
      icon: (
        <AppIcon
          name="inbox"
          size={20}
          color={colors.primary}
        />
      ),
      options: [],
      onMainPress: onOpenInbox,
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
          <Box position="relative">
            <SpeedDialWrapper
              options={(action as any).options || []}
              mainIcon={action.icon}
              mainColor={colors.highlight}
              onMainPress={(action as any).onMainPress}
            />
            {action.id === 'inbox' && inboxCount > 0 && (
              <Box
                position="absolute"
                zIndex={1000}
                style={{ elevation: 5 }}
                top={-4}
                right={-6}
                minWidth={20}
                height={20}
                paddingHorizontal="xs"
                borderRadius={9999}
                backgroundColor="danger"
                alignItems="center"
                justifyContent="center"
                pointerEvents="none"
              >
                <Text color="white" fontSize={11} fontFamily="semiBold">
                  {inboxCount > 99 ? '99+' : inboxCount}
                </Text>
              </Box>
            )}
          </Box>
          <Text textAlign="center" variant="caption" color="secondaryText">
            {action.label}
          </Text>
        </Box>
      ))}
    </Box>
  );
};
export default QuickAction;
