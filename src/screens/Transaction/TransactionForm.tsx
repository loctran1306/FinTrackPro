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
import LoadingWithLogo from '@/components/loading/LoadingWithLogo';
import DateTimePicker from '@/components/picker/DateTimePicker';
import { formatVND } from '@/helpers/currency.helper';
import { Category } from '@/services/category/category.type';
import {
  CreateTransactionType,
  TransactionType as TransactionModel,
} from '@/services/transaction/transaction.type';
import { WalletType } from '@/services/wallet/wallet.type';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  createTransactionThunk,
  updateTransactionThunk,
} from '@/store/transaction/transaction.thunk';
import { selectWallets } from '@/store/wallet/wallet.selector';
import { Theme } from '@/theme';
import { Box, Text } from '@/theme/components';
import { RADIUS, SPACING } from '@/theme/constant';
import { toast } from '@/utils/toast';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '@shopify/restyle';
import moment from 'moment';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, TouchableOpacity } from 'react-native';

type TransactionMode = 'expense' | 'income';

type TransactionFormRouteProp = RouteProp<
  { params: { transaction?: TransactionModel } },
  'params'
>;

const TransactionForm = () => {
  const { colors } = useTheme<Theme>();
  const route = useRoute<TransactionFormRouteProp>();
  const transaction = route.params?.transaction;
  const isEdit = !!transaction;

  const [type, setType] = useState<TransactionMode>('expense');
  const [amount, setAmount] = useState('');
  const [amountView, setAmountView] = useState('0');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());

  // Loading States
  const [loading, setLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Refs
  const calculatorSheetRef = useRef<AppBottomSheetRef>(null);
  const datePickerSheetRef = useRef<AppBottomSheetRef>(null);

  // Data States
  const [selectedWallet, setSelectedWallet] = useState<WalletType | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );

  // Redux
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const { session } = useAppSelector(state => state.auth);
  const { categories } = useAppSelector(state => state.category);
  const { creditWallets, paymentWallets } = useAppSelector(selectWallets);
  const allWallets = useMemo(
    () => [...(paymentWallets || []), ...(creditWallets || [])],
    [paymentWallets, creditWallets],
  );

  // Initialize data for Edit mode or Defaults
  useEffect(() => {
    if (
      isEdit &&
      transaction &&
      allWallets.length > 0 &&
      categories &&
      !loading
    ) {
      setType(transaction.type as TransactionMode);
      setAmount(transaction.amount.toString());
      setAmountView(formatVND(transaction.amount));
      setNote(transaction.note || '');
      setDate(new Date(transaction.date));

      const wallet = allWallets.find(w => w.id === transaction.wallet_id);
      if (wallet) setSelectedWallet(wallet);

      const category = categories.find(c => c.id === transaction.category_id);
      if (category) setSelectedCategory(category);
    } else {
      // Default initialization logic (only if NOT editing)
      if (!isEdit && allWallets.length > 0 && !selectedWallet) {
        const defaultWallet = allWallets.find(
          w => w.wallet_type === 'cash' || w.display_name === 'Tiền mặt',
        );
        setSelectedWallet(defaultWallet || allWallets[0]);
      }
      if (!isEdit && categories && categories.length > 0 && !selectedCategory) {
        const defaultCategory = categories.find(
          c => c.name === 'Ăn uống' || c.name === 'Eating',
        );
        if (defaultCategory) setSelectedCategory(defaultCategory);
      }
    }
  }, [allWallets, categories, isEdit, transaction]); // Depend on data availability

  const handleCalculatorDone = (result: number) => {
    setAmount(result.toString());
    setAmountView(formatVND(Number(result)));
    calculatorSheetRef.current?.close();
  };

  const handleDateConfirm = (newDate: Date) => {
    setDate(newDate);
    datePickerSheetRef.current?.close();
  };

  const renderTab = (tabType: TransactionMode, label: string) => {
    const isSelected = type === tabType;
    return (
      <Box flex={1} opacity={isEdit && !isSelected ? 0.5 : 1}>
        <AppButton
          disabled={isEdit}
          style={{
            alignItems: 'center',
            paddingVertical: SPACING.s,
            width: '100%',
          }}
          backgroundColor={
            isSelected ? (tabType === 'expense' ? 'danger' : 'success') : 'card'
          }
          onPress={() => setType(tabType)}
        >
          <Text variant="subheader" color={isSelected ? 'white' : 'text'}>
            {label}
          </Text>
        </AppButton>
      </Box>
    );
  };

  const resultRef = useRef<any>(null);
  const handleSaveTransaction = async () => {
    if (!session || !session.user) return;
    const newDate = new Date(date).toISOString();
    const data: CreateTransactionType = {
      type,
      amount: Number(amount),
      note,
      category_id: type === 'expense' ? selectedCategory?.id || null : null,
      date: newDate,
      wallet_id: selectedWallet?.id || '',
      user_id: session.user.id,
    };

    try {
      setLoading(true);
      let result;
      if (isEdit && transaction) {
        // dispatch update action
        result = await dispatch(
          updateTransactionThunk({ id: transaction.id, data }),
        ).unwrap();
      } else {
        result = await dispatch(createTransactionThunk({ data })).unwrap();
      }
      resultRef.current = result;
      setIsComplete(true);
    } catch (error) {
      console.log('error', error);
      toast.error(
        isEdit ? 'Cập nhật giao dịch thất bại' : 'Thêm giao dịch thất bại',
      );
    } finally {
      setIsComplete(true);
    }
  };

  const handleSaveComplete = () => {
    setIsComplete(false);
    setLoading(false);
    if (resultRef.current) {
      toast.success(
        isEdit ? 'Cập nhật giao dịch thành công' : 'Thêm giao dịch thành công',
      );
      navigation.goBack();
    } else {
      toast.error(
        isEdit ? 'Cập nhật giao dịch thất bại' : 'Thêm giao dịch thất bại',
      );
    }
  };

  return (
    <Screen padding="none" backgroundColor="main">
      <AppHeader title={isEdit ? 'Sửa giao dịch' : 'Thêm giao dịch'} />
      <AppScrollView onRefresh={async () => {}}>
        {/* Tabs */}
        <Box flexDirection="row" padding="m" gap="m">
          {renderTab('expense', 'Khoản chi')}
          {renderTab('income', 'Khoản thu')}
        </Box>

        {/* Amount Input */}
        <Box alignItems="center" justifyContent="center" paddingVertical="m">
          <TouchableOpacity
            onPress={() => {
              Keyboard.dismiss();
              calculatorSheetRef.current?.expand();
            }}
          >
            <Text textAlign="center" variant="caption" color="secondaryText">
              Nhập số tiền
            </Text>
            <Text
              textAlign="center"
              variant="header"
              fontSize={40}
              color={type === 'expense' ? 'danger' : 'success'}
            >
              {amountView}
            </Text>
          </TouchableOpacity>
          <AppInput
            onFocus={() => calculatorSheetRef.current?.close}
            noBorder
            value={note}
            onChangeText={setNote}
            placeholder="Nhập nội dung"
            textAlign="center"
          />
        </Box>

        {/* Form Fields */}
        <Box paddingHorizontal="m" gap="m">
          {/* Date Picker Row - Horizontal */}
          <Box flexDirection="row" alignItems="center" justifyContent="center">
            <AppButton
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: SPACING.xs,
                paddingHorizontal: SPACING.s,
                borderRadius: RADIUS.l,
                borderWidth: 1,
                borderColor: colors.card,
              }}
              backgroundColor="card"
              onPress={() => {
                Keyboard.dismiss();
                datePickerSheetRef.current?.expand();
              }}
            >
              <Box marginRight="s">
                <AppIcon
                  name="calendar-check"
                  size={14}
                  color={colors.primary}
                />
              </Box>
              <Text variant="caption" fontFamily="semiBold">
                {moment(date).format('DD/MM/YYYY - HH:mm')}
              </Text>
            </AppButton>
          </Box>

          {/* Category Selection */}
          {type === 'expense' && (
            <Box gap="s">
              <Text variant="body" color="secondaryText">
                Danh mục
              </Text>
              <Box flexDirection="row" flexWrap="wrap" gap="s">
                {categories?.map(category => {
                  const isSelected = selectedCategory?.id === category.id;
                  return (
                    <TouchableOpacity
                      key={category.id}
                      onPress={() => setSelectedCategory(category)}
                    >
                      <Box
                        paddingVertical="xs"
                        paddingHorizontal="s"
                        borderRadius={RADIUS.l}
                        backgroundColor={isSelected ? 'primary' : 'card'}
                        flexDirection="row"
                        alignItems="center"
                        gap="xs"
                        borderWidth={1}
                        borderColor={isSelected ? 'primary' : 'card'}
                      >
                        <Box
                          width={20}
                          height={20}
                          borderRadius={10}
                          backgroundColor={isSelected ? 'white' : 'main'}
                          alignItems="center"
                          justifyContent="center"
                        >
                          <AppIcon
                            name={category.icon}
                            size={10}
                            color={isSelected ? colors.primary : category.color}
                          />
                        </Box>
                        <Text
                          variant="caption"
                          fontFamily="semiBold"
                          color={isSelected ? 'white' : 'text'}
                        >
                          {category.name}
                        </Text>
                      </Box>
                    </TouchableOpacity>
                  );
                })}
              </Box>
            </Box>
          )}

          {/* Wallet Selection */}
          <Box gap="s">
            <Text variant="body" color="secondaryText">
              Ví
            </Text>
            <Box flexDirection="row" flexWrap="wrap" gap="s">
              {allWallets.map(wallet => {
                const isSelected = selectedWallet?.id === wallet.id;
                let iconName = 'wallet';
                if (wallet.wallet_type === 'cash') iconName = 'money-bill';
                if (wallet.wallet_type === 'bank')
                  iconName = 'building-columns';
                if (wallet.wallet_type === 'credit') iconName = 'credit-card';

                return (
                  <TouchableOpacity
                    key={wallet.id}
                    onPress={() => setSelectedWallet(wallet)}
                  >
                    <Box
                      paddingVertical="xs"
                      paddingHorizontal="s"
                      borderRadius={RADIUS.l}
                      backgroundColor={isSelected ? 'primary' : 'card'}
                      flexDirection="row"
                      alignItems="center"
                      gap="xs"
                      borderWidth={1}
                      borderColor={isSelected ? 'primary' : 'card'}
                    >
                      <Box
                        width={20}
                        height={20}
                        borderRadius={10}
                        backgroundColor={isSelected ? 'white' : 'main'}
                        alignItems="center"
                        justifyContent="center"
                      >
                        <AppIcon
                          name={iconName}
                          size={10}
                          color={
                            isSelected ? colors.primary : colors.secondaryText
                          }
                        />
                      </Box>
                      <Text
                        variant="caption"
                        fontFamily="semiBold"
                        color={isSelected ? 'white' : 'text'}
                      >
                        {wallet.display_name}
                      </Text>
                    </Box>
                  </TouchableOpacity>
                );
              })}
            </Box>
          </Box>

          {loading ? (
            <Box alignItems="center" justifyContent="center">
              <LoadingWithLogo
                isComplete={isComplete}
                onComplete={handleSaveComplete}
              />
            </Box>
          ) : (
            <AppButton
              disabled={
                !amount ||
                !selectedWallet ||
                (type === 'expense' && !selectedCategory)
              }
              onPress={handleSaveTransaction}
              backgroundColor={type === 'expense' ? 'danger' : 'success'}
            >
              <Text textAlign="center" variant="subheader" color="white">
                Lưu giao dịch
              </Text>
            </AppButton>
          )}
        </Box>
      </AppScrollView>

      {/* Calculator Modal */}
      <AppBottomSheet
        hideIndicator
        ref={calculatorSheetRef}
        snapPoints={[320]}
        hideBackdrop
      >
        <CalculatorKeyboard
          onValueChange={setAmount}
          onDone={handleCalculatorDone}
          initialValue={amount}
        />
      </AppBottomSheet>

      {/* Date Picker Modal */}
      <AppBottomSheet
        hideIndicator
        ref={datePickerSheetRef}
        snapPoints={[500]}
        hideBackdrop
      >
        <DateTimePicker onConfirm={handleDateConfirm} initialDate={date} />
      </AppBottomSheet>
    </Screen>
  );
};

export default TransactionForm;
