import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withSpring,
    useSharedValue
} from 'react-native-reanimated';
import { Box, Text } from '@theme/components';
import AppIcon from './AppIcon';
import { SPACING } from '@/theme/constant';
import { useTheme } from '@shopify/restyle';
import { COLORS, Theme } from '@/theme';
import AppButton from '../button/AppButton';

interface Props {
    options?: { icon: string; label: string; onPress: () => void }[];
    mainIcon: React.ReactNode;
    onMainPress?: () => void;
    mainColor?: string;
    labelPosition?: 'left' | 'right';
    direction?: 'up' | 'down';
}

const SpeedDialWrapper = ({
    options = [],
    mainIcon,
    onMainPress,
    mainColor = 'transparent',
    labelPosition = 'right', // Mặc định chữ bên phải
    direction = 'up', // Mặc định menu bung xuống
}: Props) => {
    const { colors } = useTheme<Theme>();
    const [isOpen, setIsOpen] = useState(false);
    const animation = useSharedValue(0);

    const toggleMenu = () => {
        if (options.length === 0) {
            onMainPress?.();
            return;
        }
        setIsOpen(!isOpen);
        animation.value = isOpen ? withSpring(0) : withSpring(1);
    };

    const isLabelRight = labelPosition === 'right';
    const isDirectionUp = direction === 'up';

    return (
        <Box alignItems="center" justifyContent="center">
            <Box style={[styles.optionsWrapper,
            isDirectionUp ? { top: 25 } : { bottom: 25 }
            ]} pointerEvents={isOpen ? 'auto' : 'none'}>
                {options.map((item, index) => {
                    const animatedStyle = useAnimatedStyle(() => {
                        const offset = 60;
                        const spacing = 50;
                        const multiplier = isDirectionUp ? 1 : -1;
                        const translateY = animation.value * multiplier * -(offset + (spacing * index));
                        return {
                            transform: [{ translateY }],
                            opacity: animation.value,
                            scale: animation.value,
                        };
                    });

                    return (

                        <Animated.View
                            key={index}
                            style={[
                                styles.itemContainer,
                                animatedStyle,
                                // Đảo chiều layout dựa trên vị trí nhãn
                                { flexDirection: isLabelRight ? 'row' : 'row-reverse' },
                                // Căn chỉnh để icon con luôn khớp tâm nút chính
                                isLabelRight ? { left: -22.5 } : { right: -22.5 }
                            ]}
                        >

                            <AppButton shadow={false} style={{
                                flexDirection: isLabelRight ? 'row' : 'row-reverse',
                                alignItems: 'center',
                                padding: 0
                            }} onPress={() => { item.onPress(); toggleMenu(); }}>

                                <Box
                                    style={[styles.subBtn, { backgroundColor: colors.primary }]}
                                >
                                    <AppIcon name={item.icon} size={18} color="white" />
                                </Box>

                                {/* Nhãn chữ */}
                                <Box
                                    style={[
                                        styles.labelContainer,
                                        { backgroundColor: colors.card },
                                        isLabelRight ? { marginLeft: 6 } : { marginRight: 6 }
                                    ]}
                                >
                                    <Text variant="caption">{item.label}</Text>
                                </Box>
                            </AppButton>
                        </Animated.View>

                    );
                })}
            </Box>

            <TouchableOpacity activeOpacity={0.8} onPress={toggleMenu}>
                <Box
                    width={50} height={50} borderRadius={SPACING.m}
                    justifyContent="center" alignItems="center"
                    style={{ backgroundColor: isOpen ? COLORS.highlight : mainColor }}
                >
                    <Animated.View style={useAnimatedStyle(() => ({
                        transform: [{ rotate: options.length > 0 ? `${animation.value * 45}deg` : '0deg' }]
                    }))}>
                        {mainIcon}
                    </Animated.View>
                </Box>
            </TouchableOpacity>
        </Box>
    );
};

const styles = StyleSheet.create({
    optionsWrapper: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        width: 0,
        zIndex: 100,
    },
    itemContainer: {
        position: 'absolute',
        alignItems: 'center',
        width: 250, // Đủ rộng để chứa cả nút và chữ
    },
    subBtn: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    labelContainer: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    labelText: { color: 'white', fontSize: 12, fontWeight: 'bold' }
});

export default SpeedDialWrapper;