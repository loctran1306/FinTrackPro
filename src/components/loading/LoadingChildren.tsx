import { LogoRefresh } from '@/assets/logo/LogoRefresh';
import { Box } from '@/theme/components';
import { useEffect } from 'react';
import {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

const LoadingChildren = () => {
    const rotation = useSharedValue(0);

    useEffect(() => {
        rotation.value = withRepeat(
            withTiming(360, { duration: 1000 }),
            -1,
            false
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
    }));

    return (
        <Box alignItems="center" justifyContent="center" height={60}>
            <LogoRefresh style={animatedStyle} />
        </Box>
    );
};

export default LoadingChildren;
