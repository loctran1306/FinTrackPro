import AppSwipeable from '@/components/swipeable/Swipeable';
import AppButton from '@/components/button/AppButton';
import AppBottomSheet, {
  AppBottomSheetRef,
} from '@/components/common/AppBottomSheet';
import AppIcon from '@/components/common/AppIcon';
import AppModal from '@/components/common/AppModal';
import { formatVND } from '@/helpers/currency.helper';
import TransactionFormContent from '@/components/forms/TransactionFormContent';
import {
  InboxItem,
  InboxStatus,
  loadInbox,
  rejectInbox,
  restoreInbox,
} from '@/services/inbox/inbox.service';
import { Theme } from '@/theme';
import { Box, Text } from '@/theme/components';
import { RADIUS, SPACING } from '@/theme/constant';
import { toast } from '@/utils/toast';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@shopify/restyle';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  ScrollView,
  StyleSheet,
} from 'react-native';

interface Props {
  userId?: string;
  online: boolean;
  onPendingCountChange?: (count: number) => void;
}

type InboxTab = InboxStatus;

interface InboxButtonProps {
  label: string;
  onPress: () => void;
  selected?: boolean;
  tone?: 'danger' | 'gray';
  disabled?: boolean;
  icon?: string;
}

const formatInboxAmount = (amount: number | null) => formatVND(amount ?? 0);

const InboxButton = ({
  label,
  onPress,
  selected = false,
  tone,
  disabled = false,
  icon,
}: InboxButtonProps) => {
  const { colors } = useTheme<Theme>();

  return (
    <AppButton
      onPress={onPress}
      disabled={disabled}
      backgroundColor={tone ?? (selected ? 'primary' : 'card')}
      style={styles.optionButton}
    >
      <Box
        flexDirection="row"
        alignItems="center"
        justifyContent="center"
        gap="s"
      >
        {icon && (
          <AppIcon
            name={icon}
            size={14}
            color={tone || selected ? colors.white : colors.primary}
          />
        )}
        <Text
          variant="caption"
          color={tone || selected ? 'white' : 'text'}
          textAlign="center"
        >
          {label}
        </Text>
      </Box>
    </AppButton>
  );
};

const TransactionInboxBottomSheet = forwardRef<AppBottomSheetRef, Props>(function TransactionInboxBottomSheet(
  { userId, online, onPendingCountChange },
  ref,
) {
  const { colors } = useTheme<Theme>();
  const { t, i18n } = useTranslation();
  const [selected, setSelected] = useState<InboxItem | null>(null);
  const inboxSheetRef = useRef<AppBottomSheetRef>(null);
  const processingRef = useRef(false);
  const [rows, setRows] = useState<InboxItem[]>([]);
  const [tab, setTab] = useState<InboxTab>('pending');
  const [rejectTarget, setRejectTarget] = useState<InboxItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId || !online) return;

    setLoading(true);
    try {
      const inbox = await loadInbox(userId);
      setRows(inbox);
    } catch (error) {
      toast.error(
        t('inbox.load_error'),
        String((error as Error).message || error),
      );
    } finally {
      setLoading(false);
    }
  }, [userId, online, t]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const pendingCount = rows.filter(row => row.status === 'pending').length;
  useEffect(() => {
    onPendingCountChange?.(pendingCount);
  }, [pendingCount, onPendingCountChange]);
  const approvedCount = rows.filter(row => row.status === 'approved').length;
  const rejectedCount = rows.filter(row => row.status === 'rejected').length;
  const visibleRows = rows.filter(row => row.status === tab);
  const tabs = [
    { id: 'pending', label: t('inbox.pending', { count: pendingCount }) },
    { id: 'approved', label: t('inbox.approved', { count: approvedCount }) },
    { id: 'rejected', label: t('inbox.rejected', { count: rejectedCount }) },
  ] as const;
  const emptyTitle = {
    pending: 'inbox.empty_pending',
    approved: 'inbox.empty_approved',
    rejected: 'inbox.empty_rejected',
  } as const;
  const emptyHint = {
    pending: 'inbox.empty_pending_hint',
    approved: 'inbox.empty_approved_hint',
    rejected: 'inbox.empty_rejected_hint',
  } as const;
  const handleOpenInbox = () => {
    refresh();
    inboxSheetRef.current?.expand();
  };

  const handleCloseInbox = () => inboxSheetRef.current?.close();

  useImperativeHandle(ref, () => ({
    expand: handleOpenInbox,
    close: handleCloseInbox,
  }));

  const handleReview = (row: InboxItem) => setSelected(row);

  const handleBackToInbox = () => {
    Keyboard.dismiss();
    setSelected(null);
  };

  const handleReviewSaved = () => {
    handleBackToInbox();
    refresh();
  };

  const handleDismissInbox = () => {
    handleBackToInbox();
    setRejectTarget(null);
  };

  const handleReject = async () => {
    if (!rejectTarget || processingRef.current || !online) return;

    processingRef.current = true;
    setBusy(true);
    try {
      await rejectInbox(rejectTarget);
      setRejectTarget(null);
      await refresh();
    } catch (error) {
      toast.error(
        t('inbox.process_error'),
        String((error as Error).message || error),
      );
    } finally {
      processingRef.current = false;
      setBusy(false);
    }
  };

  const handleRestore = async (item: InboxItem, reset: () => void) => {
    if (!online || processingRef.current) {
      reset();
      return;
    }
    processingRef.current = true;
    setBusy(true);
    try {
      await restoreInbox(item);
      setRows(current =>
        current.map(row =>
          row.id === item.id ? { ...row, status: 'pending' } : row,
        ),
      );
      toast.success(t('inbox.undo_reject_success'));
    } catch (error) {
      reset();
      toast.error(
        t('inbox.process_error'),
        String((error as Error).message || error),
      );
    } finally {
      processingRef.current = false;
      setBusy(false);
    }
  };

  const renderInboxItem = (row: InboxItem) => {
    const isPending = row.status === 'pending';
    const statusLabel = isPending
      ? 'inbox.pending_status'
      : row.status === 'approved'
      ? 'inbox.approved_status'
      : 'inbox.rejected_status';

    const details = (
      <Box gap="s">
        <Box
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          gap="s"
        >
          <Text variant="subheader" flex={1}>
            {row.sender_app || t('inbox.bank')}
          </Text>
          <Text
            variant="subheader"
            color={row.parsed_type === 'income' ? 'success' : 'text'}
          >
            {formatInboxAmount(row.parsed_amount)}
          </Text>
        </Box>
        <Text variant="caption" numberOfLines={2}>
          {row.note || row.raw_message}
        </Text>
        <Box
          flexDirection="row"
          flexWrap="wrap"
          justifyContent="space-between"
          gap="xs"
        >
          <Text variant="label">
            {new Date(row.created_at).toLocaleString(
              i18n.language.startsWith('en') ? 'en-US' : 'vi-VN',
            )}
          </Text>
          <Text
            variant="label"
            color={row.status === 'approved' ? 'success' : 'secondaryText'}
          >
            {t(statusLabel)}
          </Text>
        </Box>
      </Box>
    );

    const content = (
      <Box
        key={row.id}
        backgroundColor="card"
        borderRadius={RADIUS.l}
        padding="sm"
        gap="s"
      >
        <AppButton
          onPress={() => Alert.alert(t('inbox.raw_message'), row.raw_message)}
          style={styles.itemButton}
        >
          {details}
        </AppButton>
        {isPending && (
          <Box flexDirection="row" justifyContent="flex-end" gap="s">
            <InboxButton
              label={t('inbox.reject')}
              tone="gray"
              onPress={() => setRejectTarget(row)}
            />
            <InboxButton
              label={t('inbox.approve')}
              icon="check"
              selected
              onPress={() => handleReview(row)}
            />
          </Box>
        )}
      </Box>
    );

    return row.status === 'rejected' ? (
      <AppSwipeable
        key={row.id}
        swipeableKey={row.id}
        typeRightIcon="restore"
        rightIconName="rotate-left"
        disabled={busy || !online}
        onPress={() => Alert.alert(t('inbox.raw_message'), row.raw_message)}
        onRestore={reset => handleRestore(row, reset)}
      >
        <Box padding="sm" gap="s">
          {details}
        </Box>
      </AppSwipeable>
    ) : (
      content
    );
  };

  return (
    <>
      <AppBottomSheet
        ref={inboxSheetRef}
        snapPoints={['85%']}
        onClose={handleDismissInbox}
        hideContentPadding
      >
        {selected ? (
          <Box paddingBottom="l">
            <Box flexDirection="row" alignItems="center" gap="s" padding="m">
              <AppButton onPress={handleBackToInbox} style={styles.closeButton}>
                <AppIcon name="chevron-left" size={18} color={colors.primary} />
              </AppButton>
              <Text variant="subheader" flex={1}>
                {t('inbox.review_title')}
              </Text>
            </Box>
            <TransactionFormContent
              key={selected.id}
              allowTransfer
              userId={userId ?? ''}
              inboxItem={selected}
              onSaved={handleReviewSaved}
              inBottomSheet
            />
          </Box>
        ) : (
          <Box gap="s" padding="m" paddingBottom="l">
            <Box
              flexDirection="row"
              alignItems="center"
              gap="s"
              marginBottom="m"
            >
              <Box flex={1} gap="xs">
                <Text variant="subheader">{t('inbox.heading')}</Text>
                <Text variant="caption">{t('inbox.review_hint')}</Text>
              </Box>
              <AppButton onPress={handleCloseInbox} style={styles.closeButton}>
                <AppIcon name="xmark" color={colors.text} />
              </AppButton>
            </Box>
            <Box
              flexDirection="row"
              alignItems="center"
              gap="s"
              marginBottom="s"
            >
              <Box flex={1}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.tabs}
                >
                  {tabs.map(item => (
                    <InboxButton
                      key={item.id}
                      label={item.label}
                      selected={tab === item.id}
                      onPress={() => setTab(item.id)}
                    />
                  ))}
                </ScrollView>
              </Box>
              <AppButton
                accessibilityRole="button"
                accessibilityLabel={t('inbox.refresh')}
                disabled={loading || !online}
                onPress={refresh}
                style={styles.closeButton}
              >
                <AppIcon
                  name="arrows-rotate"
                  size={18}
                  color={colors.primary}
                />
              </AppButton>
            </Box>
            <Box gap="sm" paddingVertical="sm">
              {loading && <ActivityIndicator color={colors.primary} />}
              {!loading && visibleRows.length === 0 && (
                <Box alignItems="center" padding="l" gap="sm">
                  <AppIcon
                    name="envelope-circle-check"
                    size={40}
                    color={colors.primary}
                  />
                  <Text variant="subheader" textAlign="center">
                    {t(emptyTitle[tab])}
                  </Text>
                  <Text variant="caption" textAlign="center">
                    {t(emptyHint[tab])}
                  </Text>
                </Box>
              )}
              {tab === 'rejected' && visibleRows.length > 0 && (
                <Text variant="caption">{t('inbox.undo_reject_hint')}</Text>
              )}
              {visibleRows.map(renderInboxItem)}
            </Box>
          </Box>
        )}
      </AppBottomSheet>
      <AppModal
        visible={!!rejectTarget}
        onClose={() => {
          if (!processingRef.current) setRejectTarget(null);
        }}
      >
        <Box gap="m">
          <Text variant="subheader">
            {t('inbox.confirm_reject')}
            {rejectTarget && (
              <>
                {` · ${rejectTarget.sender_app || t('inbox.bank')} · `}
                <Text variant="subheader" color="danger">
                  {formatInboxAmount(rejectTarget.parsed_amount)}
                </Text>
              </>
            )}
          </Text>
          <Text variant="body">{t('inbox.reject_warning')}</Text>
          <Box
            flexDirection="row"
            flexWrap="wrap"
            justifyContent="flex-end"
            gap="s"
          >
            <InboxButton
              label={t('common.cancel')}
              disabled={busy}
              onPress={() => setRejectTarget(null)}
            />
            <InboxButton
              label={t(busy ? 'inbox.processing' : 'inbox.confirm_reject')}
              tone="danger"
              disabled={busy || !online}
              onPress={handleReject}
            />
          </Box>
        </Box>
      </AppModal>
    </>
  );
});

const styles = StyleSheet.create({
  tabs: { gap: SPACING.s },
  optionButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.s,
  },
  closeButton: {
    padding: SPACING.s,
  },
  itemButton: {
    padding: 0,
  },
});

export default TransactionInboxBottomSheet;
