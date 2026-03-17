import React, { useCallback, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shopify/restyle';
import { Theme } from '@/theme';
import { Box, Text } from '@/theme/components';
import { RADIUS, SPACING } from '@/theme/constant';
import AppIcon from '@/components/common/AppIcon';
import AppBottomSheet, {
  AppBottomSheetRef,
} from '@/components/common/AppBottomSheet';
import { addOpacity } from '@/helpers/color.helper';
import { TransactionFilter } from '@/services/watermelondb/wmTransaction.service';
import Category from '@/models/Category';
import Wallet from '@/models/Wallet';
import withObservables from '@nozbe/with-observables';
import { observeCategories } from '@/services/watermelondb/wmCategory.service';
import { observeWallets } from '@/services/watermelondb/wmWallet.service';
import dayjs from 'dayjs';

// ============================================================
// FILTER TYPES & CONSTANTS
// ============================================================

const TRANSACTION_TYPES = [
  { key: 'expense', icon: 'arrow-trend-down', colorKey: 'danger' as const },
  { key: 'income', icon: 'arrow-trend-up', colorKey: 'success' as const },
  {
    key: 'transfer',
    icon: 'arrow-right-arrow-left',
    colorKey: 'primary' as const,
  },
];

type DatePreset = 'today' | 'this_week' | 'this_month' | 'last_month' | null;

const getDatePresetRange = (
  preset: DatePreset,
): { dateFrom: number | null; dateTo: number | null } => {
  if (!preset) return { dateFrom: null, dateTo: null };

  const now = dayjs();
  switch (preset) {
    case 'today':
      return {
        dateFrom: now.startOf('day').valueOf(),
        dateTo: now.endOf('day').valueOf(),
      };
    case 'this_week':
      return {
        dateFrom: now.startOf('week').valueOf(),
        dateTo: now.endOf('week').valueOf(),
      };
    case 'this_month':
      return {
        dateFrom: now.startOf('month').valueOf(),
        dateTo: now.endOf('month').valueOf(),
      };
    case 'last_month':
      return {
        dateFrom: now.subtract(1, 'month').startOf('month').valueOf(),
        dateTo: now.subtract(1, 'month').endOf('month').valueOf(),
      };
    default:
      return { dateFrom: null, dateTo: null };
  }
};

const DATE_PRESETS: { key: DatePreset; labelKey: string; icon: string }[] = [
  { key: 'today', labelKey: 'time.today', icon: 'calendar-day' },
  { key: 'this_week', labelKey: 'filter.this_week', icon: 'calendar-week' },
  { key: 'this_month', labelKey: 'filter.this_month', icon: 'calendar' },
  { key: 'last_month', labelKey: 'filter.last_month', icon: 'calendar-minus' },
];

interface FilterBarProps {
  filter: TransactionFilter;
  onFilterChange: (filter: TransactionFilter) => void;
  activePreset: DatePreset;
  onPresetChange: (preset: DatePreset) => void;
  categories: Category[];
  wallets: Wallet[];
}

// ============================================================
// FILTER CHIP
// ============================================================

const FilterChip = ({
  label,
  icon,
  isActive,
  onPress,
  activeColor,
}: {
  label: string;
  icon?: string;
  isActive: boolean;
  onPress: () => void;
  activeColor?: string;
}) => {
  const { colors } = useTheme<Theme>();
  const bgColor = isActive
    ? addOpacity(activeColor ?? colors.primary, 0.2)
    : addOpacity(colors.secondaryText, 0.08);
  const textColor = isActive
    ? activeColor ?? colors.primary
    : colors.secondaryText;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: bgColor }]}
    >
      {icon && <AppIcon name={icon} size={12} color={textColor} />}
      <Text
        style={[
          styles.chipText,
          { color: textColor, fontWeight: isActive ? '600' : '400' },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {isActive && <AppIcon name="xmark" size={10} color={textColor} />}
    </TouchableOpacity>
  );
};

// ============================================================
// MAIN FILTER BAR (inner — receives categories/wallets from HOC)
// ============================================================

const TransactionFilterBarInner = ({
  filter,
  onFilterChange,
  activePreset,
  onPresetChange,
  categories,
  wallets,
}: FilterBarProps) => {
  const { t } = useTranslation();
  const { colors } = useTheme<Theme>();

  const categorySheetRef = useRef<AppBottomSheetRef>(null);
  const walletSheetRef = useRef<AppBottomSheetRef>(null);

  // ── Helpers ──
  const updateFilter = useCallback(
    (patch: Partial<TransactionFilter>) => {
      onFilterChange({ ...filter, ...patch });
    },
    [filter, onFilterChange],
  );

  // ── Selected names for display ──
  const selectedCategory = useMemo(
    () => categories.find(c => c.id === filter.categoryId),
    [categories, filter.categoryId],
  );

  const selectedWallet = useMemo(
    () => wallets.find(w => w.id === filter.walletId),
    [wallets, filter.walletId],
  );

  // ── Build lists of active vs available items ──
  const activeTypeChips = useMemo(
    () => TRANSACTION_TYPES.filter(tt => filter.types?.includes(tt.key)),
    [filter.types],
  );
  const availableTypes = useMemo(
    () => TRANSACTION_TYPES.filter(tt => !filter.types?.includes(tt.key)),
    [filter.types],
  );

  const activeDatePreset = useMemo(
    () => DATE_PRESETS.find(dp => dp.key === activePreset),
    [activePreset],
  );
  const availableDatePresets = useMemo(
    () => DATE_PRESETS.filter(dp => dp.key !== activePreset),
    [activePreset],
  );

  const hasActiveFilter = useMemo(
    () =>
      !!(
        (filter.types && filter.types.length > 0) ||
        filter.walletId ||
        filter.categoryId ||
        activePreset
      ),
    [filter, activePreset],
  );

  const toggleType = useCallback(
    (typeKey: string) => {
      const types = filter.types || [];
      const isExist = types.includes(typeKey);
      const newTypes = isExist
        ? types.filter(t => t !== typeKey)
        : [...types, typeKey];
      updateFilter({ types: newTypes.length > 0 ? newTypes : null });
    },
    [filter.types, updateFilter],
  );

  return (
    <>
      {/* ── ROW 2: Available Filters (chỉ hiện cái chưa chọn) ── */}
      <Box paddingHorizontal="m" paddingVertical="s">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Available types */}
          {availableTypes.map(tt => (
            <FilterChip
              key={tt.key}
              label={t(`finance.${tt.key}` as any)}
              icon={tt.icon}
              isActive={false}
              onPress={() => toggleType(tt.key)}
            />
          ))}

          {/* Category (chỉ hiện nếu chưa chọn) */}
          {!filter.categoryId && (
            <FilterChip
              label={t('finance.category')}
              icon="layer-group"
              isActive={false}
              onPress={() => categorySheetRef.current?.expand()}
            />
          )}

          {/* Wallet (chỉ hiện nếu chưa chọn) */}
          {!filter.walletId && (
            <FilterChip
              label={t('finance.wallet')}
              icon="wallet"
              isActive={false}
              onPress={() => walletSheetRef.current?.expand()}
            />
          )}

          {/* Available date presets */}
          {availableDatePresets.map(dp => (
            <FilterChip
              key={dp.key}
              label={t(dp.labelKey as any)}
              icon={dp.icon}
              isActive={false}
              onPress={() => {
                onPresetChange(dp.key);
                const range = getDatePresetRange(dp.key);
                updateFilter(range);
              }}
            />
          ))}
        </ScrollView>
      </Box>
      {/* ── ROW 1: Active Filters (chỉ hiện khi có filter active) ── */}
      {hasActiveFilter && (
        <Box paddingHorizontal="m" paddingVertical="s">
          <Box
            borderRadius={RADIUS.s}
            padding="s"
            flexDirection="row"
            flexWrap="wrap"
            gap="s"
          >
            {/* Active types */}
            {activeTypeChips.map(tt => (
              <FilterChip
                key={tt.key}
                label={t(`finance.${tt.key}` as any)}
                icon={tt.icon}
                isActive
                activeColor={colors[tt.colorKey]}
                onPress={() => toggleType(tt.key)}
              />
            ))}

            {/* Active category */}
            {selectedCategory && (
              <FilterChip
                label={selectedCategory.name}
                icon={selectedCategory.icon}
                isActive
                onPress={() => updateFilter({ categoryId: null })}
              />
            )}

            {/* Active wallet */}
            {selectedWallet && (
              <FilterChip
                label={selectedWallet.displayName}
                icon="wallet"
                isActive
                onPress={() => updateFilter({ walletId: null })}
              />
            )}

            {/* Active date preset */}
            {activeDatePreset && (
              <FilterChip
                label={t(activeDatePreset.labelKey as any)}
                icon={activeDatePreset.icon}
                isActive
                onPress={() => {
                  onPresetChange(null);
                  updateFilter({ dateFrom: null, dateTo: null });
                }}
              />
            )}
          </Box>
        </Box>
      )}

      {/* ── Category BottomSheet ── */}
      <AppBottomSheet ref={categorySheetRef}>
        <Text variant="subheader" style={styles.sheetTitle}>
          {t('finance.category')}
        </Text>
        {categories.map(cat => {
          const isSelected = filter.categoryId === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              activeOpacity={0.7}
              onPress={() => {
                updateFilter({
                  categoryId: isSelected ? null : cat.id,
                });
                categorySheetRef.current?.close();
              }}
              style={[
                styles.sheetItem,
                {
                  backgroundColor: isSelected
                    ? addOpacity(colors.primary, 0.15)
                    : 'transparent',
                },
              ]}
            >
              <Box
                style={[
                  styles.sheetIcon,
                  { backgroundColor: addOpacity(cat.color, 0.15) },
                ]}
              >
                <AppIcon name={cat.icon} size={16} color={cat.color} />
              </Box>
              <Text style={{ flex: 1 }}>{cat.name}</Text>
              {isSelected && (
                <AppIcon name="check" size={14} color={colors.primary} />
              )}
            </TouchableOpacity>
          );
        })}
      </AppBottomSheet>

      {/* ── Wallet BottomSheet ── */}
      <AppBottomSheet ref={walletSheetRef}>
        <Text variant="subheader" style={styles.sheetTitle}>
          {t('finance.wallet')}
        </Text>
        {wallets.map(wallet => {
          const isSelected = filter.walletId === wallet.id;
          return (
            <TouchableOpacity
              key={wallet.id}
              activeOpacity={0.7}
              onPress={() => {
                updateFilter({
                  walletId: isSelected ? null : wallet.id,
                });
                walletSheetRef.current?.close();
              }}
              style={[
                styles.sheetItem,
                {
                  backgroundColor: isSelected
                    ? addOpacity(colors.primary, 0.15)
                    : 'transparent',
                },
              ]}
            >
              <Box
                style={[
                  styles.sheetIcon,
                  { backgroundColor: addOpacity(colors.primary, 0.1) },
                ]}
              >
                <AppIcon name="wallet" size={16} color={colors.primary} />
              </Box>
              <Text style={{ flex: 1 }}>{wallet.displayName}</Text>
              {isSelected && (
                <AppIcon name="check" size={14} color={colors.primary} />
              )}
            </TouchableOpacity>
          );
        })}
      </AppBottomSheet>
    </>
  );
};

// ============================================================
// HOC: Inject categories & wallets reactively
// ============================================================

const enhance = withObservables(
  ['userId'],
  ({ userId }: { userId: string }) => ({
    categories: observeCategories(userId),
    wallets: observeWallets(userId),
  }),
);

const EnhancedFilterBar = enhance(TransactionFilterBarInner);

interface TransactionFilterBarProps {
  userId: string;
  filter: TransactionFilter;
  onFilterChange: (filter: TransactionFilter) => void;
  activePreset: DatePreset;
  onPresetChange: (preset: DatePreset) => void;
}

const TransactionFilterBar = ({
  userId,
  filter,
  onFilterChange,
  activePreset,
  onPresetChange,
}: TransactionFilterBarProps) => (
  <EnhancedFilterBar
    userId={userId}
    filter={filter}
    onFilterChange={onFilterChange}
    activePreset={activePreset}
    onPresetChange={onPresetChange}
  />
);

export default TransactionFilterBar;

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  scrollContent: {
    gap: SPACING.s,
    paddingRight: SPACING.m,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.xl,
  },
  chipText: {
    fontSize: 13,
  },
  sheetTitle: {
    marginBottom: SPACING.m,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.m,
    padding: SPACING.m,
    borderRadius: RADIUS.m,
    marginBottom: SPACING.xs,
  },
  sheetIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.s,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
