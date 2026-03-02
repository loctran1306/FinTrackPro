import React from 'react';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { navigationRef } from './navigationRef';
import { Theme } from '@/theme';

// Import Type và Navigator con
import { RootStackParamList } from './types';
import { MainTabNavigator } from './MainTabNavigator';
import SplashScreen from '../screens/Splash/Splash';
import { useTheme } from '@shopify/restyle';
import TransactionForm from '../screens/Transaction/TransactionForm';
import AddWalletScreen from '../screens/Wallet/AddWallet';
import WalletTransferScreen from '@/screens/Wallet/WalletTransfer';
import BalanceAdjustmentScreen from '@/screens/Balance/BalanceAdjustment';
import LoginScreen from '@/screens/Auth/Login';
import HistoryTransactionScreen from '@/screens/Transaction/HistoryTransaction';
import CategoryDetailScreen from '@/screens/Statistics/CategoryDetail';
import EditCategoryScreen from '@/screens/Statistics/EditCategory';

const Stack = createNativeStackNavigator<RootStackParamList>();

type RootNavigatorProps = {
  isDarkMode?: boolean;
};

export const RootNavigator = ({ isDarkMode = false }: RootNavigatorProps) => {
  const navTheme = isDarkMode ? DarkTheme : DefaultTheme;
  const { colors } = useTheme<Theme>();

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={{
        ...navTheme,
        colors: { ...navTheme.colors, background: colors.main },
      }}
    >
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_bottom',
          animationDuration: 0,
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        {/* Luồng đăng nhập */}
        <Stack.Screen name="AuthStack" component={LoginScreen} />
        {/* Khi đã đăng nhập, hiện thanh Tab */}
        <Stack.Screen
          name="MainTab"
          component={MainTabNavigator}
        />

        {/* Các màn hình phụ không nằm trong Tab (ví dụ: Chi tiết giao dịch) */}
        <Stack.Screen name="TransactionForm" component={TransactionForm} />
        <Stack.Screen name="AddWallet" component={AddWalletScreen} />
        <Stack.Screen name="WalletTransfer" component={WalletTransferScreen} />
        <Stack.Screen
          name="BalanceAdjustment"
          component={BalanceAdjustmentScreen}
        />
        <Stack.Screen name="HistoryTransaction" component={HistoryTransactionScreen} />
        <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} />
        <Stack.Screen name="EditCategory" component={EditCategoryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
