import { approveInbox, InboxItem } from '@/services/inbox/inbox.service';
import AppButton from '@/components/button/AppButton';
import AppBottomSheet, {
  AppBottomSheetRef,
} from '@/components/common/AppBottomSheet';
import AppIcon from '@/components/common/AppIcon';
import AppInput from '@/components/common/AppInput';
import CalculatorKeyboard from '@/components/keyboard/CalculatorKeyboard';
import LoadingWithLogo from '@/components/loading/LoadingWithLogo';
import DateTimePicker from '@/components/picker/DateTimePicker';
import { formatVND } from '@/helpers/currency.helper';
import { database } from '@/models';
import Category from '@/models/Category';
import Transaction from '@/models/Transaction';
import Wallet from '@/models/Wallet';
import { observeCategories } from '@/services/watermelondb/wmCategory.service';
import { observeWallets } from '@/services/watermelondb/wmWallet.service';
import { useAppSelector } from '@/store/hooks';
import { Theme } from '@/theme';
import { Box, Text } from '@/theme/components';
import { RADIUS, SPACING } from '@/theme/constant';
import { toast } from '@/utils/toast';
import withObservables from '@nozbe/with-observables';
import { of } from 'rxjs';
import { useTheme } from '@shopify/restyle';
import dayjs from 'dayjs'; // Chuyển sang dayjs đồng bộ với helper
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, TouchableOpacity } from 'react-native';
import {
  createTransaction,
  updateTransaction,
} from '@/services/watermelondb/wmTransaction.service';
import { WALLET_TYPE } from '@/constants/wallet.const';
import { formatTime } from '@/helpers/time.helper';

import type { TransactionDraft } from '@/services/ai/ai.types';
import WalletTransferContent from './WalletTransferContent';

type TransactionMode = 'expense' | 'income';

type EnhancedProps = {
  allowTransfer?: boolean;
  inboxItem?: InboxItem;
  initialDraft?: TransactionDraft;
  onSaved: () => void;
  inBottomSheet?: boolean;
  transaction: Transaction | null;
  categories: Category[];
  wallets: Wallet[];
};

const TransactionFormEnhanced = ({
  allowTransfer = false,
  transaction,
  initialDraft,
  inboxItem,
  onSaved,
  inBottomSheet = false,
  categories = [],
  wallets = [],
}: EnhancedProps) => {
  const { t } = useTranslation();
  const { colors } = useTheme<Theme>();
  const isEdit = !!transaction;
  const [showTransfer, setShowTransfer] = useState(
    allowTransfer && inboxItem?.parsed_type === 'transfer',
  );

  const [type, setType] = useState<TransactionMode>(
    (initialDraft?.type ?? inboxItem?.parsed_type) === 'income'
      ? 'income'
      : 'expense',
  );
  const [amount, setAmount] = useState<number>(
    initialDraft?.amount ?? inboxItem?.parsed_amount ?? 0,
  );
  const [note, setNote] = useState(initialDraft?.note ?? inboxItem?.note ?? '');
  const [date, setDate] = useState(
    () =>
      new Date(
        initialDraft?.date
          ? `${initialDraft.date}T12:00:00`
          : inboxItem?.transaction_date || inboxItem?.created_at || Date.now(),
      ),
  );

  const [typeConfirmed, setTypeConfirmed] = useState(
    !initialDraft || !!initialDraft.type,
  );
  const [dateConfirmed, setDateConfirmed] = useState(
    !initialDraft || !!initialDraft.date,
  );

  const [loading, setLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const calculatorSheetRef = useRef<AppBottomSheetRef>(null);
  const datePickerSheetRef = useRef<AppBottomSheetRef>(null);
  const heldCalculatorSheetRef = useRef<AppBottomSheetRef>(null);

  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );

  // Held amount state (tiền giữ hộ - chỉ dùng khi ví credit + expense)
  const [heldAmount, setHeldAmount] = useState<number>(0);
  const [selectedHeldWallet, setSelectedHeldWallet] = useState<Wallet | null>(
    null,
  );

  // Kiểm tra xem có hiển thị phần giữ hộ không
  const isCreditExpense =
    type === 'expense' && selectedWallet?.walletType === 'credit';

  // Danh sách ví
  const availableWallets = wallets.filter(
    w => w.walletType !== WALLET_TYPE.JAR,
  );

  // Danh sách ví nhận (loại bỏ ví credit đang chọn)
  const availableHeldWallets = wallets.filter(
    w => w.id !== selectedWallet?.id && w.walletType === WALLET_TYPE.JAR,
  );

  const { session } = useAppSelector(state => state.auth);

  const draftInitialized = useRef(false);

  // Khởi tạo dữ liệu
  useEffect(() => {
    if (isEdit && transaction) {
      setType(transaction.type as TransactionMode);
      setAmount(transaction.amount);
      setNote(transaction.note || '');
      // WatermelonDB lưu date là timestamp, dùng dayjs xử lý chuẩn xác
      setDate(dayjs(transaction.date).toDate());

      const wallet = wallets.find(w => w.id === transaction.walletId);
      if (wallet) setSelectedWallet(wallet);

      const category = categories?.find(c => c.id === transaction.categoryId);
      if (category) setSelectedCategory(category);
    } else if (initialDraft) {
      if (draftInitialized.current) return;
      draftInitialized.current = true;
      // Missing AI fields remain unselected; never silently choose a wallet/category.
      setSelectedWallet(
        wallets.find(
          w =>
            w.id === initialDraft.walletId && w.walletType !== WALLET_TYPE.JAR,
        ) ?? null,
      );
      setSelectedCategory(
        categories.find(c => c.id === initialDraft.categoryId) ?? null,
      );
    } else {
      if (wallets.length > 0) {
        const defaultWallet =
          wallets.find(w => w.id === inboxItem?.suggested_wallet_id) ||
          wallets.find(w => w.walletType === 'cash') ||
          wallets[0];
        setSelectedWallet(current => current ?? defaultWallet);
      }
      if (categories.length > 0) {
        const defaultCategory =
          categories.find(c => c.id === inboxItem?.suggested_category_id) ||
          categories.find(c => c.name === 'Ăn uống' || c.name === 'Eating');
        if (defaultCategory)
          setSelectedCategory(current => current ?? defaultCategory);
      }
    }
  }, [
    wallets,
    categories,
    isEdit,
    transaction,
    initialDraft,
    inboxItem?.suggested_wallet_id,
    inboxItem?.suggested_category_id,
  ]);

  const handleCalculatorDone = (result: number) => {
    setAmount(result);
    calculatorSheetRef.current?.close();
  };

  const handleHeldCalculatorDone = (result: number) => {
    setHeldAmount(result);
    heldCalculatorSheetRef.current?.close();
  };

  const handleDateConfirm = (newDate: Date) => {
    setDate(newDate);
    setDateConfirmed(true);
    datePickerSheetRef.current?.close();
  };

  const handleSaveTransaction = async () => {
    if (
      !session?.user ||
      !selectedWallet ||
      loading ||
      !typeConfirmed ||
      !dateConfirmed ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      (type === 'expense' && !selectedCategory)
    )
      return;
    if (inboxItem && inboxItem.user_id !== session.user.id) return;

    // Validate held amount
    if (isCreditExpense && heldAmount > 0) {
      if (!selectedHeldWallet) {
        toast.error(t('finance.select_held_wallet'));
        return;
      }
    }

    try {
      setLoading(true);
      const data = {
        amount: amount,
        note: note,
        date: date.getTime(),
        type: type,
        walletId: selectedWallet.id,
        categoryId: type === 'expense' ? selectedCategory?.id : null,
        userId: session.user.id,
      };
      if (isEdit && transaction) {
        const updatedTransaction = await updateTransaction(transaction, data);
        if (updatedTransaction) {
          toast.success(t('finance.edit_transaction_success'));
        } else {
          toast.error(t('finance.edit_transaction_error'));
        }
      } else {
        if (inboxItem) {
          await approveInbox(inboxItem, {
            amount,
            type,
            note,
            date: date.toISOString(),
            walletId: selectedWallet.id,
            categoryId: type === 'expense' ? selectedCategory?.id : undefined,
          });
        } else {
          const newTransaction = await createTransaction({
            ...data,
            categoryId: data.categoryId ?? '',
          });
          if (newTransaction) {
            toast.success(t('finance.add_transaction_success'));
          } else {
            toast.error(t('finance.add_transaction_error'));
          }
        }

        // Tự tạo giao dịch transfer tiền giữ hộ
        if (
          !isEdit &&
          isCreditExpense &&
          heldAmount > 0 &&
          selectedHeldWallet
        ) {
          try {
            await createTransaction({
              amount: heldAmount,
              note: `${t('finance.held_amount')}: ${
                note || selectedCategory?.name || ''
              }`.trim(),
              date: date.getTime(),
              type: 'transfer',
              walletId: selectedWallet.id,
              toWalletId: selectedHeldWallet.id,
              categoryId: selectedCategory?.id ?? '',
              userId: session.user.id,
            });
          } catch (transferError) {
            console.log('Held transfer error:', transferError);
          }
        }
      }

      setIsComplete(true);
    } catch (error) {
      console.log('error', error);
      toast.error(
        isEdit
          ? t('finance.edit_transaction_error')
          : t('finance.add_transaction_error'),
      );
      setLoading(false);
    }
  };

  const handleSaveComplete = () => {
    setLoading(false);
    setIsComplete(false);
    toast.success(
      isEdit
        ? t('finance.edit_transaction_success')
        : t('finance.add_transaction_success'),
    );
    onSaved();
  };

  const renderTab = (tabType: TransactionMode | 'transfer', label: string) => {
    const isSelected =
      tabType === 'transfer' ? showTransfer : !showTransfer && type === tabType;
    return (
      <Box flex={1} opacity={isEdit && !isSelected ? 0.5 : 1}>
        <AppButton
          disabled={isEdit || loading}
          style={{
            alignItems: 'center',
            paddingVertical: SPACING.s,
            paddingHorizontal: SPACING.xs,
            width: '100%',
          }}
          backgroundColor={
            isSelected
              ? tabType === 'transfer'
                ? 'primary'
                : tabType === 'expense'
                ? 'danger'
                : 'success'
              : 'card'
          }
          onPress={() => {
            Keyboard.dismiss();
            calculatorSheetRef.current?.close();
            datePickerSheetRef.current?.close();
            heldCalculatorSheetRef.current?.close();
            setShowTransfer(tabType === 'transfer');
            if (tabType === 'transfer') return;
            setType(tabType);
            setTypeConfirmed(true);
          }}
        >
          <Text
            variant="subheader"
            textAlign="center"
            numberOfLines={1}
            adjustsFontSizeToFit
            color={isSelected ? 'white' : 'text'}
          >
            {label}
          </Text>
        </AppButton>
      </Box>
    );
  };

  const tabs = (
    <Box flexDirection="row" paddingVertical="s" gap="xs">
      {renderTab('expense', t('finance.expense'))}
      {renderTab('income', t('finance.income'))}
      {allowTransfer && !isEdit && renderTab('transfer', t('finance.transfer'))}
    </Box>
  );

  if (allowTransfer && !isEdit && showTransfer) {
    return (
      <>
        <Box paddingHorizontal="m">{tabs}</Box>
        <WalletTransferContent
          userId={session?.user?.id ?? ''}
          transactionId=""
          inboxItem={inboxItem}
          inBottomSheet={inBottomSheet}
          onSaved={onSaved}
        />
      </>
    );
  }

  return (
    <>
      <Box paddingHorizontal="m" gap="m">
        {initialDraft && (
          <Box gap="s">
            <Text variant="caption">{t('quickTransaction.review')}</Text>
            {(!typeConfirmed || !dateConfirmed) && (
              <Text color="danger">{t('quickTransaction.confirmMissing')}</Text>
            )}
          </Box>
        )}
        {tabs}

        <Box
          backgroundColor="card"
          borderRadius={RADIUS.m}
          alignItems="center"
          justifyContent="center"
          paddingVertical="m"
        >
          <AppButton
            onPress={() => {
              Keyboard.dismiss();
              calculatorSheetRef.current?.expand();
            }}
          >
            <Text textAlign="center" variant="caption" color="secondaryText">
              {t('finance.amount')}
            </Text>
            <Text
              numberOfLines={1}
              textAlign="center"
              variant="header"
              fontSize={40}
              color={type === 'expense' ? 'danger' : 'success'}
            >
              {formatVND(Number(amount))}
            </Text>
          </AppButton>
          <AppInput
            inBottomSheet={inBottomSheet}
            multiline
            numberOfLines={4}
            onFocus={() => calculatorSheetRef.current?.close()}
            noBorder
            value={note}
            onChangeText={setNote}
            placeholder={t('common.enter_note')}
            textAlign="center"
          />
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
              <AppIcon name="calendar-check" size={14} color={colors.primary} />
            </Box>
            <Text variant="caption" fontFamily="semiBold">
              {formatTime(date)}
            </Text>
          </AppButton>
        </Box>

        <Box gap="m">
          <Box
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
          />

          {type === 'expense' && (
            <Box gap="s">
              <Text variant="body" color="secondaryText">
                {t('finance.category')}
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

          <Box gap="s">
            <Text variant="body" color="secondaryText">
              {t('finance.wallet')}
            </Text>
            <Box flexDirection="row" flexWrap="wrap" gap="s">
              {availableWallets.map(wallet => {
                const isSelected = selectedWallet?.id === wallet.id;
                let iconName = 'wallet';
                if (wallet.walletType === 'cash') iconName = 'money-bill';
                if (wallet.walletType === 'bank') iconName = 'building-columns';
                if (wallet.walletType === 'credit') iconName = 'credit-card';

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
                        {wallet.displayName}
                      </Text>
                    </Box>
                  </TouchableOpacity>
                );
              })}
            </Box>
          </Box>

          {/* Held amount section - chỉ hiện khi ví credit + expense + không phải edit */}
          {isCreditExpense && !isEdit && (
            <Box
              gap="s"
              padding="m"
              borderRadius={RADIUS.l}
              backgroundColor="card"
              borderWidth={1}
              borderColor="card"
            >
              <Box flexDirection="row" alignItems="center" gap="s">
                <AppIcon
                  name="hand-holding-dollar"
                  size={16}
                  color={colors.primary}
                />
                <Text variant="body" fontFamily="semiBold">
                  {t('finance.held_amount')}
                </Text>
              </Box>
              <Text variant="caption" color="secondaryText">
                {t('finance.held_amount_description')}
              </Text>

              {/* Nhập số tiền giữ hộ */}
              <AppButton
                backgroundColor="card"
                onPress={() => {
                  Keyboard.dismiss();
                  heldCalculatorSheetRef.current?.expand();
                }}
              >
                <Box
                  padding="m"
                  borderRadius={RADIUS.m}
                  backgroundColor="main"
                  alignItems="center"
                  gap="s"
                >
                  <Text variant="caption" color="secondaryText">
                    {t('finance.held_amount')}
                  </Text>
                  <Text
                    variant="subheader"
                    fontSize={24}
                    color={heldAmount > 0 ? 'primary' : 'secondaryText'}
                  >
                    {formatVND(heldAmount)}
                  </Text>
                </Box>
              </AppButton>

              {/* Chọn ví nhận giữ hộ */}
              <Box gap="xs">
                <Text variant="caption" color="secondaryText">
                  {t('finance.select_held_wallet')}
                </Text>
                <Box flexDirection="row" flexWrap="wrap" gap="s">
                  {availableHeldWallets.map(wallet => {
                    const isSelected = selectedHeldWallet?.id === wallet.id;
                    let iconName = 'wallet';
                    if (wallet.walletType === 'cash') iconName = 'money-bill';
                    if (wallet.walletType === 'bank')
                      iconName = 'building-columns';
                    if (wallet.walletType === 'credit')
                      iconName = 'credit-card';

                    return (
                      <TouchableOpacity
                        key={wallet.id}
                        onPress={() => setSelectedHeldWallet(wallet)}
                      >
                        <Box
                          paddingVertical="xs"
                          paddingHorizontal="s"
                          borderRadius={RADIUS.l}
                          backgroundColor={isSelected ? 'primary' : 'main'}
                          flexDirection="row"
                          alignItems="center"
                          gap="xs"
                          borderWidth={1}
                          borderColor={isSelected ? 'primary' : 'main'}
                        >
                          <Box
                            width={20}
                            height={20}
                            borderRadius={10}
                            backgroundColor={isSelected ? 'white' : 'card'}
                            alignItems="center"
                            justifyContent="center"
                          >
                            <AppIcon
                              name={iconName}
                              size={10}
                              color={
                                isSelected
                                  ? colors.primary
                                  : colors.secondaryText
                              }
                            />
                          </Box>
                          <Text
                            variant="caption"
                            fontFamily="semiBold"
                            color={isSelected ? 'white' : 'text'}
                          >
                            {wallet.displayName}
                          </Text>
                        </Box>
                      </TouchableOpacity>
                    );
                  })}
                </Box>
              </Box>

              {/* Summary */}
              {heldAmount > 0 && selectedHeldWallet && (
                <Box
                  flexDirection="row"
                  alignItems="center"
                  gap="s"
                  padding="s"
                  borderRadius={RADIUS.m}
                  style={{
                    backgroundColor: colors.primary + '15',
                  }}
                >
                  <AppIcon
                    name="circle-info"
                    size={14}
                    color={colors.primary}
                  />
                  <Text variant="caption" color="primary" flex={1}>
                    {`${t('finance.held_amount_auto_transfer')} → ${
                      selectedHeldWallet.displayName
                    }: ${formatVND(heldAmount)}`}
                  </Text>
                </Box>
              )}
            </Box>
          )}

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
                !typeConfirmed ||
                !dateConfirmed ||
                !Number.isFinite(amount) ||
                amount <= 0 ||
                !selectedWallet ||
                (type === 'expense' && !selectedCategory)
              }
              onPress={handleSaveTransaction}
              backgroundColor={type === 'expense' ? 'danger' : 'success'}
            >
              <Text
                textAlign="center"
                variant="subheader"
                color="white"
                textTransform="uppercase"
              >
                {t('finance.save_transaction')}
              </Text>
            </AppButton>
          )}
        </Box>
      </Box>

      <AppBottomSheet
        hideIndicator
        ref={calculatorSheetRef}
        snapPoints={[320]}
        hideBackdrop
        hideContentPadding
      >
        <CalculatorKeyboard
          onValueChange={setAmount}
          onDone={handleCalculatorDone}
          initialValue={amount}
        />
      </AppBottomSheet>

      <AppBottomSheet
        hideIndicator
        ref={datePickerSheetRef}
        snapPoints={[500]}
        hideBackdrop
      >
        <DateTimePicker onConfirm={handleDateConfirm} initialDate={date} />
      </AppBottomSheet>

      <AppBottomSheet
        hideIndicator
        ref={heldCalculatorSheetRef}
        snapPoints={[320]}
        hideBackdrop
        hideContentPadding
      >
        <CalculatorKeyboard
          onValueChange={setHeldAmount}
          onDone={handleHeldCalculatorDone}
          initialValue={heldAmount}
        />
      </AppBottomSheet>
    </>
  );
};

const enhance = withObservables(
  ['transactionId', 'userId'],
  ({ transactionId, userId }: { transactionId?: string; userId: string }) => ({
    transaction: transactionId
      ? database.collections
          .get<Transaction>('transactions')
          .findAndObserve(transactionId)
      : of(null),
    categories: observeCategories(userId),
    wallets: observeWallets(userId),
  }),
);

export default enhance(TransactionFormEnhanced);
