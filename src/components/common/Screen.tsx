import { Theme } from '@/theme';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@shopify/restyle';
import { Box } from '@theme/components';
import React, { PropsWithChildren, useEffect } from 'react';
import { BackHandler } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

type ScreenProps = PropsWithChildren<{
  padding?: 'none' | 'xs' | 's' | 'm' | 'l' | 'xl';
  edges?: Edge[];
  backgroundColor?: keyof Theme['colors'];
}>;

const Screen = ({
  children,
  padding = 'none',
  edges = ['top', 'bottom', 'left', 'right'],
  backgroundColor = 'main',
}: ScreenProps) => {
  const navigation = useNavigation();
  const { colors } = useTheme<Theme>();
  useEffect(() => {
    // 1. Chặn vuốt Back trên iOS
    navigation.setOptions({
      gestureEnabled: false,
    });

    // 2. Chặn nút Back/Cử chỉ hệ thống trên Android
    const backAction = () => {
      return true; // Trả về true để chặn hành động back mặc định
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    // Clean up khi rời khỏi màn hình
    return () => backHandler.remove();
  }, [navigation]);
  return (
    <SafeAreaView
      edges={edges}
      style={{ flex: 1, backgroundColor: colors[backgroundColor] }}
    >
      <Box flex={1} paddingHorizontal={padding}>
        {children}
      </Box>
    </SafeAreaView>
  );
};

export default Screen;
