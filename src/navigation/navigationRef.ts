import { MainTabParamList, RootStackParamList } from './types';
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export const navigateToMain = (tab: keyof MainTabParamList = 'Home') => {
  if (navigationRef.isReady()) {
    navigationRef.navigate('MainTab', { screen: tab });
  }
};
