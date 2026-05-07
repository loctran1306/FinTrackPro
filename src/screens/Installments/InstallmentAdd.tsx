import AppButton from '@/components/button/AppButton';
import AppBottomSheet, {
  AppBottomSheetRef,
} from '@/components/common/AppBottomSheet';
import AppHeader from '@/components/common/AppHeader';
import AppIcon from '@/components/common/AppIcon';
import AppInput from '@/components/common/AppInput';
import AppScrollView from '@/components/common/AppScrollView';
import Screen from '@/components/common/Screen';
import CalculatorKeyboard from '@/components/keyboard/CalculatorKeyboard';
import DateTimePicker from '@/components/picker/DateTimePicker';
import { formatVND } from '@/helpers/currency.helper';
import { formatTime } from '@/helpers/time.helper';
import { database } from '@/models';
import Installment from '@/models/Installment';
import InstallmentItem from '@/models/InstallmentItem';
import Wallet from '@/models/Wallet';
import { RootStackParamList } from '@/navigation/types';
import { syncData } from '@/services/sync/syncDataSupabase';
import { observeIdCategoryInstallment } from '@/services/watermelondb/wmCategory.service';
import { createTransaction } from '@/services/watermelondb/wmTransaction.service';
import {
  observeCreditWallets
} from '@/services/watermelondb/wmWallet.service';
import { useAppSelector } from '@/store/hooks';
import { Theme } from '@/theme';
import { Box, Text } from '@/theme/components';
import { RADIUS, SPACING } from '@/theme/constant';
import withObservables from '@nozbe/with-observables';
import {
  useNavigation
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@shopify/restyle';
import { useFormik } from 'formik';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import * as Yup from 'yup';
type CreditWalletWithAvailable = Wallet & {
  pendingInstallmentAmount: number;
  availableLimit: number;
};

const ALLOWED_TENURE_MONTHS = [1, 3, 6, 9, 12, 18, 24] as const;

type Props = {
  creditWallets: CreditWalletWithAvailable[];
  userId: string;
  categoryInstallmentId: string | null;
};

const InstallmentAdd = ({
  creditWallets,
  userId,
  categoryInstallmentId,
}: Props) => {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme<Theme>();

  const bottomSheetRef = useRef<AppBottomSheetRef>(null);
  const calculatorSheetRef = useRef<AppBottomSheetRef>(null);
  const dateSheetRef = useRef<AppBottomSheetRef>(null);


  const formInstallment = useFormik({
    initialValues: {
      name: '',
      walletId: '',
      amount: 0,
      feeAmount: 0,
      tenureMonths: 0,
      startDate: new Date().getTime(),
    },
    validationSchema: Yup.object().shape({
      name: Yup.string().required(t('warning.enter_installment_name')),
      walletId: Yup.string().required(t('warning.select_wallet')),
      amount: Yup.number()
        .required(t('warning.enter_installment_amount'))
        .moreThan(0, t('warning.enter_installment_amount')),
      feeAmount: Yup.number()
        .required(t('warning.enter_installment_fee_amount'))
        .min(0, t('warning.enter_installment_fee_amount')),
      tenureMonths: Yup.number()
        .required(t('warning.enter_installment_tenure_months'))
        .oneOf(
          [...ALLOWED_TENURE_MONTHS],
          t('warning.enter_installment_tenure_months'),
        ),
    }),
    onSubmit: async values => {
      try {
        setLoading(true);

        const amount = Number(values.amount) || 0;
        const feeAmount = Number(values.feeAmount) || 0;
        const tenureMonths = Math.floor(Number(values.tenureMonths) || 0);
        const normalizedStartDate = normalizeToStartOfDay(values.startDate);
        const now = normalizeToStartOfDay(Date.now());
        const monthlyBaseAmount =
          tenureMonths > 0 ? Math.floor(amount / tenureMonths) : 0;
        const installmentPayload = {
          userId,
          walletId: values.walletId,
          name: values.name.trim(),
          totalAmount: amount,
          feeAmount,
          tenureMonths,
          startDate: normalizedStartDate,
          status: 'ACTIVE',
        };
        const installmentItemsPayload = Array.from(
          { length: tenureMonths },
          (_, index) => {
            const period = index + 1;
            const isLastPeriod = period === tenureMonths;
            const previousTotal = monthlyBaseAmount * (period - 1);
            const amountByPeriod = isLastPeriod
              ? amount - previousTotal
              : monthlyBaseAmount;

            return {
              dueDate: buildInstallmentDate(normalizedStartDate, period - 1),
              amount: amountByPeriod,
              periodNumber: period,
              status: 'PENDING',
            };
          },
        );
        if (feeAmount > 0) {
          const payloadFeeTransaction = {
            amount: feeAmount,
            note: `${values.name} - ${t('installment.fee_amount')}`,
            type: 'expense',
            date: now,
            categoryId: categoryInstallmentId ?? '',
            walletId: values.walletId,
            userId,
          }
          await createTransaction(payloadFeeTransaction);
        }

        await database.write(async () => {
          const installment = await database
            .get<Installment>('installments')
            .create(record => {
              record._raw.id = uuidv4();
              record.userId = installmentPayload.userId;
              record.walletId = installmentPayload.walletId;
              record.name = installmentPayload.name;
              record.totalAmount = installmentPayload.totalAmount;
              record.feeAmount = installmentPayload.feeAmount;
              record.tenureMonths = installmentPayload.tenureMonths;
              record.startDate = installmentPayload.startDate;
              record.status = installmentPayload.status;
            });

          const itemRecords: any[] = [];
          for (const itemPayload of installmentItemsPayload) {
            itemRecords.push(
              database
                .get<InstallmentItem>('installment_items')
                .prepareCreate(item => {
                  item._raw.id = uuidv4();
                  item.installmentId = installment.id;
                  item.dueDate = itemPayload.dueDate;
                  item.amount = itemPayload.amount;
                  item.periodNumber = itemPayload.periodNumber;
                  item.status = itemPayload.status;
                }),
            );
          }

          if (itemRecords.length > 0) {
            await database.batch(...itemRecords);
          }
        });

        syncData().catch(console.error);
        formInstallment.resetForm();
        setWalletSelected(null);
        navigation.goBack();
      } catch (error) {
        console.error('Create installment error:', error);
      } finally {
        setLoading(false);
      }
    },
  });

  const [walletSelected, setWalletSelected] = useState<CreditWalletWithAvailable | null>(null);
  const [loading, setLoading] = useState(false);

  const normalizeToStartOfDay = (timestamp: number) => {
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  };

  const buildInstallmentDate = (startDate: number, monthOffset: number) => {
    const date = new Date(normalizeToStartOfDay(startDate));
    date.setMonth(date.getMonth() + monthOffset);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  };

  const handleCalculatorDone = (result: number) => {
    formInstallment.setFieldValue('amount', result);
    calculatorSheetRef.current?.close();
  };

  const handleDateConfirm = (newDate: Date) => {
    formInstallment.setFieldValue('startDate', normalizeToStartOfDay(newDate.getTime()));
    dateSheetRef.current?.close();
  };

  const handleOpenWalletSheet = () => {
    bottomSheetRef.current?.expand();
  };

  const handleSelectWallet = (wallet: CreditWalletWithAvailable) => {
    setWalletSelected(wallet);
    formInstallment.setFieldValue('walletId', wallet.id);
    bottomSheetRef.current?.close();
  };



  return (
    <Screen padding="none">
      <AppHeader
        title={t('finance.installment_add')}
      />
      <AppScrollView>
        <Box
          paddingHorizontal="m"
          gap="m"
        >
          <Box backgroundColor='card' borderRadius={RADIUS.m} flex={1}>
            <AppButton
              style={{
                width: '100%',
                minHeight: 80,
                padding: SPACING.m,
                justifyContent: 'center',
              }}
              onPress={handleOpenWalletSheet}
            >
              {walletSelected ? (
                <Box
                  alignItems="center"
                  justifyContent="center"
                  flex={1}
                  gap="s"
                >
                  <Text variant="subheader">{walletSelected.displayName}</Text>
                  <Text variant="caption">
                    {formatVND(walletSelected.availableLimit)}
                  </Text>
                </Box>
              ) : (
                <Text
                  textAlign="center"
                  color="primary"
                  textDecorationLine="underline"
                  variant="caption"
                >
                  {t('finance.select_wallet')}
                </Text>
              )}
            </AppButton>
          </Box>
          <AppInput
            label={t('installment.name')}
            value={formInstallment.values.name}
            onChangeText={formInstallment.handleChange('name')}
            placeholder={t('installment.enter_name')}
            error={formInstallment.errors.name}
            required
          />
        </Box>
        <Box flex={1} padding="m" gap="m">
          <Box backgroundColor='card' borderRadius={RADIUS.m} alignItems="center" justifyContent="center" padding="m">
            <Text variant="caption">{t('finance.installment_amount')}</Text>
            <AppButton
              shadow={false}
              onPress={() => {
                Keyboard.dismiss();
                calculatorSheetRef.current?.expand();
              }}
            >
              <Text numberOfLines={2} variant="header" fontSize={40} color="primary" textAlign="center">
                {formatVND(formInstallment.values.amount)}
              </Text>
            </AppButton>
          </Box>
          <AppInput
            label={t('installment.fee_amount')}
            value={formInstallment.values.feeAmount.toString()}
            onChangeText={formInstallment.handleChange('feeAmount')}
            placeholder={t('installment.enter_fee_amount')}
            error={formInstallment.errors.feeAmount as string}
            required
            suffix={'.000đ'}
            type="number-pad"
          />
          <Box gap="s">
            <Text variant="body" fontFamily="semiBold" color='secondaryText'>
              {t('installment.tenure_months')} *
            </Text>
            <Box flexDirection="row" flexWrap="wrap" gap="s">
              {ALLOWED_TENURE_MONTHS.map(month => {
                const isSelected = formInstallment.values.tenureMonths === month;
                return (
                  <AppButton
                    key={month}
                    backgroundColor={isSelected ? 'primary' : 'card'}
                    style={{ paddingVertical: 4 }}
                    onPress={() => formInstallment.setFieldValue('tenureMonths', month)}
                  >
                    <Text textAlign="center" color={isSelected ? 'white' : 'text'} fontFamily="semiBold">
                      {month}
                    </Text>
                  </AppButton>
                );
              })}
            </Box>
            {!!formInstallment.errors.tenureMonths && (
              <Text variant="caption" color="danger">
                {formInstallment.errors.tenureMonths as string}
              </Text>
            )}
          </Box>
          <Box gap="s">
            <Text variant="body" fontFamily="semiBold" color='secondaryText'> {t('time.start_date')} </Text>
            <AppButton
              onPress={() => dateSheetRef.current?.expand()}
              shadow={false}
              style={{
                padding: 4,
              }}
            >
              <Box
                flexDirection="row"
                alignItems="center"
                gap="s"
              >
                <AppIcon
                  name="calendar-check"
                  size={18}
                  color={colors.primary}
                />
                <Text variant="body">
                  {formatTime(new Date(formInstallment.values.startDate))}
                </Text>
              </Box>
            </AppButton>
          </Box>
          <AppButton
            disabled={
              !walletSelected ||
              formInstallment.values.amount <= 0 ||
              loading
            }
            backgroundColor="primary"
            onPress={formInstallment.handleSubmit}
          >
            <Box
              flexDirection="row"
              justifyContent="center"
              alignItems="center"
              gap="s"
            >
              <AppIcon
                name="plus"
                size={20}
                color="white"
              />
              <Text variant="body" fontFamily="semiBold" color="white">
                {t('finance.create_installment')}
              </Text>
            </Box>
          </AppButton>
        </Box>
        <AppBottomSheet
          hideIndicator
          ref={calculatorSheetRef}
          snapPoints={[320]}
          hideBackdrop
          hideContentPadding
        >
          <CalculatorKeyboard
            onValueChange={(result) => formInstallment.setFieldValue('amount', result)}
            onDone={handleCalculatorDone}
            initialValue={Number(formInstallment.values.amount)}
          />
        </AppBottomSheet>

        <AppBottomSheet ref={dateSheetRef} snapPoints={['70%']}>
          <DateTimePicker
            initialDate={new Date(formInstallment.values.startDate)}
            onConfirm={handleDateConfirm}
            disableFuture={false}
            numberMonthFuture={12}
          />


        </AppBottomSheet>

        <AppBottomSheet ref={bottomSheetRef} snapPoints={['50%', '80%']}>
          <Box backgroundColor="main" flex={1} gap="l">
            <Box gap="sm">
              <Text variant="subheader">{t('finance.wallet')}</Text>
              {creditWallets?.map(wallet => {

                const isSelected = wallet.id === walletSelected?.id;
                return (
                  <AppButton
                    key={wallet.id}
                    backgroundColor={isSelected ? 'primary' : 'card'}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    }}
                    onPress={() => handleSelectWallet(wallet)}
                  >
                    <Text variant="body" fontFamily="semiBold">
                      {wallet.displayName}
                    </Text>
                    <Text variant="body" fontFamily="semiBold">
                      {formatVND(wallet.availableLimit)}
                    </Text>
                  </AppButton>
                );
              })}
            </Box>
          </Box>
        </AppBottomSheet>
      </AppScrollView>
    </Screen>
  );
};

const enhance = withObservables(
  ['userId'],
  ({
    userId,
  }: Props) => ({
    creditWallets: observeCreditWallets(userId || ''),
    categoryInstallmentId: observeIdCategoryInstallment(userId || ''),
  }),
);

const EnhancedInstallmentAddScreen = enhance(InstallmentAdd);

export default function InstallmentAddScreen() {
  const { session } = useAppSelector(state => state.auth);
  const userId = session?.user?.id ?? '';
  if (!userId) return null;
  return (
    <EnhancedInstallmentAddScreen
      userId={userId}
    />
  );
}
