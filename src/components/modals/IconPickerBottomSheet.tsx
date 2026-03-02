import React, {
  useRef,
  useMemo,
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from 'react';
import {
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  View,
  TextInput,
} from 'react-native';
import { Box, Text } from '@theme/components';
import AppBottomSheet, { AppBottomSheetRef } from '@/components/common/AppBottomSheet';
import AppIcon from '@/components/common/AppIcon';
import { ICON_CATEGORIES } from '@/constants/icons';
import { COLORS } from '@/theme';
import { RADIUS, SPACING } from '@/theme/constant';
import { useTheme } from '@shopify/restyle';
import { Theme } from '@/theme';

const { width } = Dimensions.get('window');
const COLS = 4;
// Tính toán kích thước ô dựa trên số cột để hiển thị đều nhau
const ICON_SIZE = (width - SPACING.m * 2 - (COLS - 1) * SPACING.l) / COLS;

interface Props {
  onSelect: (iconName: string) => void;
  selectedIcon?: string;
}

export interface IconPickerBottomSheetRef {
  expand: () => void;
  close: () => void;
  snapToIndex: (index: number) => void;
}

const IconPickerBottomSheet = forwardRef<IconPickerBottomSheetRef, Props>(
  ({ onSelect, selectedIcon }, ref) => {
    const { colors } = useTheme<Theme>();
    const bottomSheetRef = useRef<AppBottomSheetRef>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useImperativeHandle(ref, () => ({
      expand: () => bottomSheetRef.current?.expand(),
      close: () => bottomSheetRef.current?.close(),
      snapToIndex: () => { },
    }));

    const filteredSections = useMemo(() => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return ICON_CATEGORIES;

      return ICON_CATEGORIES.map(cat => ({
        ...cat,
        icons: cat.icons.filter(item =>
          item.name.toLowerCase().includes(query) ||
          item.nameEn.toLowerCase().includes(query) ||
          item.icon.toLowerCase().includes(query)
        ),
      })).filter(cat => cat.icons.length > 0);
    }, [searchQuery]);

    const handleClose = useCallback(() => {
      setSearchQuery('');
    }, []);

    const handleSelect = useCallback(
      (iconName: string) => {
        onSelect(iconName);
        bottomSheetRef.current?.close();
      },
      [onSelect]
    );

    return (
      <AppBottomSheet
        ref={bottomSheetRef}
        snapPoints={['55%', '90%']}
        onClose={handleClose}
        isScrollable={true}
      >
        <Box paddingHorizontal="m">
          <Text variant="subheader" marginBottom="m">
            Chọn biểu tượng
          </Text>

          <TextInput
            style={[
              styles.searchBar,
              { backgroundColor: colors.card, color: colors.text }
            ]}
            placeholder="Tìm theo tên ví dụ: 'Ăn uống', 'Car'..."
            placeholderTextColor={colors.secondaryText}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {filteredSections.map(section => (
            <Box key={section.title} marginBottom="l">
              <Box
                backgroundColor="card"
                paddingVertical="s"
                paddingHorizontal="m"
                marginBottom="s"
                borderRadius={RADIUS.s}
              >
                <Text variant="label" fontFamily="semiBold" color="secondaryText">
                  {section.title}
                </Text>
              </Box>

              <View style={styles.iconGrid}>
                {section.icons.map((item) => {
                  const isSelected = selectedIcon === item.icon;
                  return (
                    <TouchableOpacity
                      key={item.icon}
                      onPress={() => handleSelect(item.icon)}
                      style={[
                        styles.iconBtn,
                        isSelected && {
                          backgroundColor: COLORS.primary + '20',
                          borderRadius: RADIUS.m,
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <AppIcon
                        name={item.icon}
                        size={24}
                        color={isSelected ? COLORS.primary : colors.text}
                      />
                      <Text
                        numberOfLines={1}
                        style={[styles.iconLabel, { color: isSelected ? COLORS.primary : colors.secondaryText }]}
                      >
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Box>
          ))}
          <Box height={SPACING.xl} />
        </Box>
      </AppBottomSheet>
    );
  }
);

IconPickerBottomSheet.displayName = 'IconPickerBottomSheet';

const styles = StyleSheet.create({
  searchBar: {
    borderRadius: RADIUS.m,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.m,
    marginBottom: SPACING.m,
    fontSize: 14,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconBtn: {
    width: ICON_SIZE,
    paddingVertical: SPACING.s,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLabel: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  }
});

export default IconPickerBottomSheet;