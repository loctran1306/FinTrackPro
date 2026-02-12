import React from 'react';
import { Image } from 'react-native';
import Animated from 'react-native-reanimated';

export const LogoRefresh = ({ style }: { style?: any }) => {
  return (
    <Animated.View style={style}>
      <Animated.Image
        source={require('@assets/logo/logo_money.png')}
        style={{ width: 24, height: 24 }}
        resizeMode="contain"
      />
    </Animated.View>
  );
};
