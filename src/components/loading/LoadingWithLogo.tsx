import { COLORS } from "@/theme";
import { Box } from "@/theme/components";
import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
    cancelAnimation,
    Easing,
    Extrapolation,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withTiming
} from "react-native-reanimated";
import { runOnJS } from "react-native-worklets";

type LoadingWithLogoProps = {
    color?: string;
    isComplete: boolean;
    onComplete: () => void;
    widthBar?: number;
};

// Constants
const TRACK_WIDTH = 160;
const TRACK_HEIGHT = 20;
const LOGO_SIZE = 26;
const MAX_WAITING_TIME = 10000;

const LoadingWithLogo = ({ color = COLORS.primary, isComplete, onComplete, widthBar = TRACK_WIDTH }: LoadingWithLogoProps) => {
    const progress = useSharedValue(10 / widthBar);

    // Giai đoạn 1: Chạy giả lập chờ API
    useEffect(() => {
        progress.value = withTiming(0.9, {
            duration: MAX_WAITING_TIME,
            easing: Easing.out(Easing.quad),
        });
    }, [progress]);

    // Giai đoạn 2: API xong -> Vọt lên 100%
    useEffect(() => {
        if (isComplete) {
            cancelAnimation(progress);
            progress.value = withTiming(1, {
                duration: 400,
                easing: Easing.bezier(0.25, 1, 0.5, 1),
            }, (finished) => {
                if (finished) runOnJS(onComplete)();
            });
        }
    }, [isComplete, onComplete, progress]);

    const barStyle = useAnimatedStyle(() => ({
        width: progress.value * widthBar,
    }));

    const logoStyle = useAnimatedStyle(() => {
        // Đặt tâm logo bám theo đầu thanh progress.
        const translateX = interpolate(
            progress.value,
            [0, 1],
            [-LOGO_SIZE / 2, widthBar - LOGO_SIZE / 2],
            Extrapolation.CLAMP
        );
        return {
            transform: [{ translateX }],
        };
    });

    return (
        <Box alignItems="center" width={widthBar} height={LOGO_SIZE} justifyContent="center">
            <View style={[styles.progressTrack, { width: widthBar }]}>
                <Animated.View style={[styles.progressBar, barStyle, { backgroundColor: color }]} />
                <Animated.View style={[styles.logoOnBar, logoStyle]}>
                    <Image
                        source={require('@assets/logo/logo_money.png')}
                        style={{ width: LOGO_SIZE, height: LOGO_SIZE }}
                        resizeMode="contain"
                    />
                </Animated.View>
            </View>
        </Box>
    );
};


export default LoadingWithLogo;

const styles = StyleSheet.create({
    progressTrack: {
        height: TRACK_HEIGHT,
        borderRadius: TRACK_HEIGHT / 2,
        backgroundColor: 'rgba(0,0,0,0.05)',
        position: 'relative',
        overflow: 'visible',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
    },
    progressBar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        borderRadius: TRACK_HEIGHT / 2,
    },
    logoOnBar: {
        position: 'absolute',
        width: LOGO_SIZE,
        height: LOGO_SIZE,
        zIndex: 2,
    },
});   