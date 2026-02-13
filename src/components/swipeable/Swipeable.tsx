import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import React, { useRef } from 'react';
import Animated, { withTiming } from 'react-native-reanimated';
import { Box } from '@/theme/components';
import {
  Extrapolation,
  interpolate,
  interpolateColor,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { SPACING } from '@/theme/constant';
import { COLORS, Theme } from '@/theme';
import AppButton from '../button/AppButton';
import AppIcon from '../common/AppIcon';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { RectButton } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-worklets';
import { useTheme } from '@shopify/restyle';
import { StyleProp, ViewStyle } from 'react-native';
type AppSwipeableProps = {
  swipeableKey: string;
  children: React.ReactNode;
  onPress: () => void;
  onDelete: (reset: () => void) => void;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: keyof Theme['colors'];
};
const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

const AppSwipeable = ({
  swipeableKey,
  children,
  onPress,
  onDelete,
  style,
}: AppSwipeableProps) => {
  const { colors } = useTheme<Theme>();
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const height = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
    height: height.value === 0 ? undefined : height.value,
    overflow: 'hidden',
  }));

  const RightAction = ({
    progress,
    handlePress,
  }: {
    progress: SharedValue<number>;
    handlePress: () => void;
  }) => {
    const animatedTrashStyle = useAnimatedStyle(() => ({
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        [colors.main, COLORS.red],
      ),
      borderRadius: SPACING.m,
      padding: SPACING.s,
      width: interpolate(progress.value, [0, 1], [0, 80], Extrapolation.CLAMP),
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: interpolate(
        progress.value,
        [0.5, 1],
        [0, SPACING.m],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          scale: interpolate(
            progress.value,
            [0.01, 0.5],
            [0, 1],
            Extrapolation.CLAMP,
          ),
        },
      ],
      opacity: interpolate(
        progress.value,
        [0.01, 0.5],
        [0, 1],
        Extrapolation.CLAMP,
      ),
    }));

    return (
      <AppButton shadow={false} onPress={handlePress}>
        <Box
          width={100}
          justifyContent="center"
          alignItems="flex-end"
          height="100%"
        >
          <Animated.View style={animatedTrashStyle}>
            <AppIcon name="trash" size={20} color={COLORS.white} />
          </Animated.View>
        </Box>
      </AppButton>
    );
  };

  const handleSwipeOpen = () => {
    ReactNativeHapticFeedback.trigger('selection', hapticOptions);
  };

  const originalHeight = useSharedValue(0);

  const swipeableRef = useRef<any>(null);

  const reset = () => {
    scale.value = withTiming(1);
    height.value = withTiming(originalHeight.value, { duration: 180 });
    opacity.value = withTiming(1, { duration: 180 });
    swipeableRef.current?.close();
  };

  const confirmDelete = () => {
    onDelete(reset);
  };

  const handleDeletePress = () => {
    ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
    originalHeight.value = height.value;
    scale.value = withTiming(0.95);
    height.value = withTiming(0, { duration: 180 });
    opacity.value = withTiming(0, { duration: 180 }, finished => {
      if (finished) {
        runOnJS(confirmDelete)();
      }
    });
  };

  return (
    <Animated.View
      style={animatedStyle}
      onLayout={event => {
        if (height.value === 0) {
          height.value = event.nativeEvent.layout.height;
        }
      }}
    >
      <ReanimatedSwipeable
        ref={swipeableRef}
        key={swipeableKey}
        renderRightActions={progress => (
          <RightAction progress={progress} handlePress={handleDeletePress} />
        )}
        friction={2}
        rightThreshold={40}
        overshootRight={false}
        onSwipeableOpen={handleSwipeOpen}
        containerStyle={{
          minHeight: 50,
          paddingHorizontal: SPACING.m,
        }}
      >
        <RectButton
          activeOpacity={0.05}
          onPress={onPress}
          style={{
            borderRadius: SPACING.m,
            backgroundColor: colors.card,
            ...style,
          }}
        >
          {children}
        </RectButton>
      </ReanimatedSwipeable>
    </Animated.View>
  );
};

export default AppSwipeable;
