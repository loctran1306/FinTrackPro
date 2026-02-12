import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome6';
import { Box } from '@theme/components';
import { COLORS } from '@/theme';

// Định nghĩa Union type để gợi ý code (Intellisense) tốt hơn
export type IconFamily = 'solid' | 'regular' | 'brands';

interface AppIconProps {
    name: string;           // Tên icon (vd: 'car-side', 'utensils')
    size?: number;          // Kích thước icon
    color?: string;         // Màu icon
    family?: IconFamily;    // Bộ font: solid (mặc định), regular, hoặc brands
    style?: StyleProp<ViewStyle>;

    // Các props để tạo vòng tròn bao quanh icon (thường dùng ở màn hình Home/History)
    boxSize?: number;       // Nếu có, sẽ bọc icon trong một Box vuông/tròn
    rounded?: boolean;      // Bo tròn hoàn toàn Box
    bgColor?: string;       // Màu nền của Box
}

const AppIcon: React.FC<AppIconProps> = ({
    name,
    size = 20,
    color = COLORS.highlight,
    family = 'solid',
    style,
    boxSize,
    rounded = true,
    bgColor = 'transparent',
}) => {

    // Component core render font icon
    const IconBase = (
        <Icon
            name={name}
            size={size}
            color={color}
            solid={family === 'solid'}
            brand={family === 'brands'}
            style={style}
        />
    );

    // Nếu Lộc muốn render có background (dạng icon danh mục chi tiêu)
    if (boxSize) {
        return (
            <Box
                width={boxSize}
                height={boxSize}
                alignItems="center"
                justifyContent="center"
                style={{
                    backgroundColor: bgColor,
                    borderRadius: rounded ? boxSize / 2 : 8,
                }}
            >
                {IconBase}
            </Box>
        );
    }

    return IconBase;
};

// Dùng memo để tối ưu performance khi scroll danh sách dài
export default React.memo(AppIcon);