import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  withRepeat,
  withTiming,
  cancelAnimation,
  Extrapolation,
  withSpring,
} from 'react-native-reanimated';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);
import { Box } from '@theme/components';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { runOnJS } from 'react-native-worklets';
import { LogoRefresh } from '@/assets/logo/LogoRefresh';
import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { useTheme } from '@shopify/restyle';
import { Theme } from '@/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Định nghĩa Props mở rộng từ ScrollView mặc định
interface AppScrollViewProps extends ScrollViewProps {
  onRefresh?: () => Promise<void>;
  children: React.ReactNode;
  refreshThreshold?: number;
  refreshBackground?: string;
  insetTop?: boolean;
}

const REFRESH_THRESHOLD = 90;

const AppScrollView = ({
  onRefresh,
  children,
  refreshThreshold = REFRESH_THRESHOLD,
  refreshBackground,
  insetTop = true,
  ...props
}: AppScrollViewProps) => {
  const { colors } = useTheme<Theme>();
  const { top } = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const scrollY = useSharedValue(0);
  const [refreshing, setRefreshing] = useState(false);
  const rotation = useSharedValue(0);

  const spacerHeight = useSharedValue(0);
  const triggerRefresh = async () => {
    if (!onRefresh) return;

    setRefreshing(true);
    spacerHeight.value = withSpring(REFRESH_THRESHOLD, {
      damping: 15,
      stiffness: 100,
    });
    // Bắt đầu xoay icon
    rotation.value = withRepeat(withTiming(360, { duration: 800 }), -1, false);

    // Rung phản hồi
    ReactNativeHapticFeedback.trigger('impactMedium');

    // Tạo một Promise để chờ ít nhất 1 giây
    const delay = new Promise<void>(resolve => setTimeout(resolve, 1000));

    try {
      // Chạy song song cả việc load dữ liệu và việc chờ 1s
      // Dùng Promise.all để đảm bảo CẢ HAI đều xong mới chạy tiếp
      await Promise.all([onRefresh(), delay]);
    } catch (error) {
      console.error('Lỗi khi load dữ liệu:', error);
    } finally {
      // Sau ít nhất 1s, bắt đầu hiệu ứng đóng mượt mà
      setRefreshing(false);
      spacerHeight.value = withSpring(0);
      cancelAnimation(rotation);
      rotation.value = withTiming(0, { duration: 300 });
    }
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      scrollY.value = event.contentOffset.y;
    },
    onEndDrag: event => {
      if (
        event.contentOffset.y < -REFRESH_THRESHOLD &&
        !refreshing &&
        onRefresh
      ) {
        runOnJS(triggerRefresh)();
      }
    },
  });

  const animatedIconStyle = useAnimatedStyle(() => {
    // 1. Tính toán Scale
    let scale = interpolate(
      scrollY.value,
      [-REFRESH_THRESHOLD, 0],
      [1.2, 0],
      Extrapolation.CLAMP,
    );

    // Mẹo: Nếu đang refreshing, giữ scale ở mức 1.2 kể cả khi scrollY đã về 0
    if (refreshing) {
      scale = withSpring(1.2);
    }

    // 2. Tính toán Spin (Xoay)
    const spin = refreshing
      ? `${rotation.value}deg`
      : `${interpolate(
          scrollY.value,
          [-REFRESH_THRESHOLD, 0],
          [360, 0],
          Extrapolation.CLAMP,
        )}deg`;

    // 3. Tính toán Opacity
    let opacity = interpolate(
      scrollY.value,
      [-60, -20],
      [1, 0],
      Extrapolation.CLAMP,
    );

    // Nếu đang refreshing, ép opacity luôn hiện hữu
    if (refreshing) {
      opacity = withTiming(1, { duration: 200 });
    }

    return {
      transform: [{ scale }, { rotate: spin }],
      opacity: opacity,
    };
  });

  const animatedSpacerStyle = useAnimatedStyle(() => ({
    height: spacerHeight.value,
  }));

  const gradientColors = useMemo(
    () =>
      refreshBackground
        ? [refreshBackground, colors.main]
        : [colors.main, colors.main],
    [refreshBackground, colors.main],
  );

  return (
    <Box flex={1}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={windowWidth} height={windowHeight}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, windowHeight * 0.7)}
            colors={gradientColors}
          />
        </Rect>
      </Canvas>
      <Box style={styles.balanceDecorationTop} />
      <Box style={styles.balanceDecorationBottom} />

      {/* Chỉ hiện loader nếu có truyền hàm onRefresh */}
      {onRefresh && (
        <Box
          style={[styles.loaderContainer, { top: !insetTop ? top + 20 : 40 }]}
        >
          <LogoRefresh style={animatedIconStyle} />
        </Box>
      )}

      <AnimatedScrollView
        {...props}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[{ flexGrow: 1 }, props.contentContainerStyle]}
      >
        <Animated.View style={animatedSpacerStyle} />
        {children}
      </AnimatedScrollView>
    </Box>
  );
};

const styles = StyleSheet.create({
  loaderContainer: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  balanceDecorationTop: {
    position: 'absolute',
    top: -24,
    right: -24,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  balanceDecorationBottom: {
    position: 'absolute',
    top: 60,
    left: -24,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
});

export default AppScrollView;
