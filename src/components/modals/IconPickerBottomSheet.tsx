import React, { useRef, useMemo, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { StyleSheet, Dimensions, TouchableOpacity, View } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { Box, Text } from '@theme/components';
import AppIcon from '@/components/common/AppIcon';
import { ICON_CATEGORIES } from '@/constants/icons';
import { palette } from '@/theme';

const { width } = Dimensions.get('window');
const ICON_SIZE = (width - 32) / 4;

interface Props {
    onSelect: (name: string) => void;
    selectedIcon?: string;
}

// Định nghĩa các hàm mà Ref có thể gọi
export interface IconPickerBottomSheetRef {
    expand: () => void;
    close: () => void;
    snapToIndex: (index: number) => void;
}

const IconPickerBottomSheet = forwardRef<IconPickerBottomSheetRef, Props>(
    ({ onSelect, selectedIcon }, ref) => {
        const bottomSheetRef = useRef<BottomSheet>(null);
        const flashListRef = useRef<FlashListRef<any>>(null);
        const [searchQuery, setSearchQuery] = useState('');
        const snapPoints = useMemo(() => ['50%', '85%'], []);

        // Public các hàm ra bên ngoài thông qua Ref
        useImperativeHandle(ref, () => ({
            expand: () => bottomSheetRef.current?.expand(),
            close: () => bottomSheetRef.current?.close(),
            snapToIndex: (index: number) => bottomSheetRef.current?.snapToIndex(index),
        }));

        const listData = useMemo(() => {
            const result: any[] = [];
            ICON_CATEGORIES.forEach((section, sIdx) => {
                const filteredIcons = section.icons.filter(icon =>
                    icon.toLowerCase().includes(searchQuery.toLowerCase())
                );
                if (filteredIcons.length > 0) {
                    result.push({ type: 'HEADER', title: section.title, sIdx });
                    filteredIcons.forEach(icon => result.push({ type: 'ICON', name: icon, sIdx }));
                }
            });
            return result;
        }, [searchQuery]);

        const handleTabPress = (sectionIndex: number) => {
            const targetIndex = listData.findIndex(
                item => item.type === 'HEADER' && item.sIdx === sectionIndex
            );
            if (targetIndex !== -1) {
                flashListRef.current?.scrollToIndex({ index: targetIndex, animated: true });
            }
        };

        const renderItem = ({ item }: { item: any }) => {
            if (item.type === 'HEADER') {
                return (
                    <View style={styles.headerRow}>
                        <Text variant="caption" fontWeight="bold" color="secondaryText">{item.title}</Text>
                    </View>
                );
            }
            const isSelected = selectedIcon === item.name;
            return (
                <TouchableOpacity
                    onPress={() => {
                        onSelect(item.name);
                        bottomSheetRef.current?.close(); // Chọn xong tự đóng cho xịn
                    }}
                    style={[styles.iconBtn, isSelected && styles.selectedIconBtn]}
                >
                    <AppIcon name={item.name} size={26} color={isSelected ? "#ff7d66" : "#444"} />
                </TouchableOpacity>
            );
        };

        const handleSheetChange = useCallback((index: number) => {
            // index === -1 nghĩa là sheet đã đóng hoàn toàn
            if (index === -1) {
                setSearchQuery(''); // Xóa nội dung search cũ
            }
        }, []);

        return (
            <BottomSheet
                ref={bottomSheetRef}
                index={-1}
                snapPoints={snapPoints}
                enablePanDownToClose
                backgroundStyle={{ backgroundColor: '#fff' }}
                handleIndicatorStyle={{ backgroundColor: '#ccc' }}
                onChange={handleSheetChange}
            >
                <BottomSheetView style={{ flex: 1, paddingHorizontal: 16 }}>
                    <Text variant="subheader" marginBottom="m">Chọn biểu tượng</Text>

                    <BottomSheetTextInput
                        style={styles.searchBar}
                        placeholder="Tìm tên icon..."
                        onChangeText={setSearchQuery}
                        placeholderTextColor="#999"
                    />

                    {!searchQuery && (
                        <Box height={60} marginBottom="s">
                            <BottomSheetScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {ICON_CATEGORIES.map((cat, idx) => (
                                    <TouchableOpacity key={idx} onPress={() => handleTabPress(idx)} style={styles.tabItem}>
                                        <AppIcon name={cat.tabIcon} size={20} color="#ff7d66" />
                                        <Text variant="caption" fontSize={10}>{cat.title.split(' ')[0]}</Text>
                                    </TouchableOpacity>
                                ))}
                            </BottomSheetScrollView>
                        </Box>
                    )}

                    <Box flex={1}>
                        <FlashList
                            ref={flashListRef}
                            data={listData}
                            renderItem={renderItem}
                            keyExtractor={(item, index) =>
                                item.type === 'HEADER'
                                    ? `header-${item.title}-${index}`
                                    : `icon-${item.name}-${index}`
                            }
                            numColumns={4}
                            getItemType={item => item.type}
                            overrideItemLayout={(layout, item) => {
                                layout.span = item.type === 'HEADER' ? 4 : 1;
                            }}
                        />
                    </Box>
                </BottomSheetView>
            </BottomSheet>
        );
    }
);

IconPickerBottomSheet.displayName = 'IconPickerBottomSheet';

const styles = StyleSheet.create({
    headerRow: {
        backgroundColor: palette.blueLight,
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginTop: 4,
        height: ICON_SIZE,
        justifyContent: 'center',
    },
    searchBar: {
        backgroundColor: '#f2f2f2',
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        fontFamily: 'LexendDeca-Regular',
        color: '#000',
    },
    tabItem: { alignItems: 'center', marginRight: 20, minWidth: 50 },
    iconBtn: { width: ICON_SIZE, height: ICON_SIZE, alignItems: 'center', justifyContent: 'center' },
    selectedIconBtn: { backgroundColor: '#ff7d6615', borderRadius: 12 },
});

export default IconPickerBottomSheet;