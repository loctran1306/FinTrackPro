import AppButton from '@/components/button/AppButton';
import AppHeader from '@/components/common/AppHeader';
import AppIcon from '@/components/common/AppIcon';
import AppScrollView from '@/components/common/AppScrollView';
import Screen from '@/components/common/Screen';
import { INSTALLMENT_ITEM_STATUS, INSTALLMENT_STATUS, INSTALLMENT_STATUS_COLOR } from '@/constants/installment.const';
import { addOpacity } from '@/helpers/color.helper';
import { formatVND } from '@/helpers/currency.helper';
import { formatDateShort } from '@/helpers/time.helper';
import { RootStackParamList } from '@/navigation/types';
import {
  InstallmentWithItems,
  observeInstallments,
} from '@/services/watermelondb/wmInstallment';
import { useAppSelector } from '@/store/hooks';
import { Theme } from '@/theme';
import { RADIUS, SPACING } from '@/theme/constant';
import withObservables from '@nozbe/with-observables';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@shopify/restyle';
import { Box, Text } from '@theme/components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

type Props = {
  installments: InstallmentWithItems[];
};

const Installments = ({ installments }: Props) => {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme<Theme>();

  return (
    <Screen>
      {/* Header */}
      <AppHeader
        title={t('finance.installment')}
        backButton={() => navigation.goBack()}
        rightButton={
          <AppButton
            onPress={() => navigation.navigate('InstallmentAdd')}
            style={{ padding: SPACING.s }}
            shadow={false}
          >
            <AppIcon name="plus" size={24} color={colors.text} />
          </AppButton>
        }
      />
      <AppScrollView contentContainerStyle={{ padding: SPACING.m }} onRefresh={() => { return Promise.resolve(); }}>
        {installments.map(installment => {
          const isCompleted = installment.installment.status === INSTALLMENT_STATUS.COMPLETED;
          const isCancelled = installment.installment.status === INSTALLMENT_STATUS.CANCELLED;
          const icon = isCompleted ? 'circle-check' : isCancelled ? 'x' : 'clock';
          const iconColor = isCompleted ? colors.success : isCancelled ? colors.danger : colors.warning;
          const statusColor = INSTALLMENT_STATUS_COLOR[installment.installment.status as keyof typeof INSTALLMENT_STATUS];

          return (
            <Box
              key={installment.installment.id}
              gap='m'
              backgroundColor="card"
              padding="l"
              borderRadius={RADIUS.l}
              overflow="hidden"
              style={{
                borderWidth: 1,
                borderColor: colors.card,
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 128,
                  height: 128,
                  borderRadius: 64,
                  backgroundColor: addOpacity(statusColor, 0.1),
                  marginRight: -40,
                  marginTop: -40,
                }}
              />
              <Box position='absolute' top={SPACING.s} right={SPACING.s}
                style={{
                  borderRadius: RADIUS.l,
                  backgroundColor: addOpacity(statusColor, 0.3),
                  borderWidth: 1,
                  borderColor: addOpacity(statusColor, 0.5),
                  paddingVertical: SPACING.xs,
                  paddingHorizontal: SPACING.s,
                }}
              >
                <Text variant='caption' color='text'>{t(`installment.status.${installment.installment.status as keyof typeof INSTALLMENT_STATUS}`)}</Text>
              </Box>
              <Box flexDirection="row" alignItems="center" gap="m">
                <Box
                  width={56}
                  height={56}
                  borderRadius={RADIUS.l}
                  alignItems="center"
                  justifyContent="center"
                  style={{
                    backgroundColor: addOpacity(colors.primary, 0.3),
                  }}
                >
                  <AppIcon name='hand-holding-dollar' size={28} color={colors.primary} />
                </Box>
                <Box gap='xs'>
                  <Text variant='subheader'>
                    {installment.installment.name}
                  </Text>
                  <Box flexDirection='row' gap='s' alignItems='center'>
                    <Text variant='label'>{t('installment.total_amount')}:</Text>
                    <Text variant='body'>{formatVND(installment.installment.totalAmount)}</Text>
                    <AppIcon name={icon} size={12} color={iconColor} />
                  </Box>
                  <Box flexDirection='row' gap='s' alignItems='center'>
                    <Text variant='label'>{t('installment.fee_amount')}:</Text>
                    <Text variant='body'>{formatVND(installment.installment.feeAmount)}</Text>
                    <AppIcon name='circle-check' size={12} color={colors.success} />
                  </Box>
                </Box>
              </Box>
              <Box flexDirection='row' flexWrap='wrap' justifyContent='space-between' gap='s'>
                {installment.installmentItems.map(item => {
                  const isBilled = item.status === INSTALLMENT_ITEM_STATUS.BILLED;
                  const icon = isBilled ? 'circle-check' : 'clock';
                  const color = isBilled ? colors.success : colors.warning;
                  return (
                    <Box
                      position='relative'
                      key={item.id}
                      borderRadius={RADIUS.l}
                      marginTop='s'
                      padding='s'
                      gap='xs'
                      alignItems='center'
                      borderWidth={1}
                      borderColor={isBilled ? 'success' : 'warning'}
                      style={{
                        backgroundColor: addOpacity(isBilled ? colors.success : colors.warning, 0.1),
                      }}
                    >
                      <Text variant='label'>{t('time.month')} {item.periodNumber} ({formatDateShort(item.dueDate)})</Text>
                      <Text variant='body'>{formatVND(item.amount)}</Text>
                      <Box position='absolute' top={-4} right={-4} backgroundColor='white' borderRadius={RADIUS.l}
                        style={{
                          padding: 1
                        }}
                      >
                        <AppIcon name={icon} size={14} color={color} />
                      </Box>
                    </Box>
                  )
                })}
              </Box>
            </Box>
          )
        })}

      </AppScrollView>
    </Screen>
  );
};

const enhance = withObservables(['userId'], ({ userId }: { userId: string }) => ({
  installments: observeInstallments(userId || ''),
}));

const EnhancedInstallmentsScreen = enhance(Installments);

export default function InstallmentsScreen() {
  const { session } = useAppSelector(state => state.auth);
  const userId = session?.user?.id ?? '';
  return <EnhancedInstallmentsScreen userId={userId} />;
}
