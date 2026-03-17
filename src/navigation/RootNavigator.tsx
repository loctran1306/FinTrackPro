import { Theme } from '@/theme';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

// Import Type và Navigator con
import { navigationRef } from '@/navigation/navigationRef';
import LoginScreen from '@/screens/Auth/Login';
import BalanceAdjustmentScreen from '@/screens/Balance/BalanceAdjustment';
import CategoryDetailScreen from '@/screens/Category/CategoryDetail';
import CategoryFormScreen from '@/screens/Category/CategoryForm';
import HistoryTransactionScreen from '@/screens/Transaction/HistoryTransaction';
import CreditPaymentScreen from '@/screens/Wallet/CreditPayment';
import WalletDetailScreen from '@/screens/Wallet/WalletDetail';
import WalletFormScreen from '@/screens/Wallet/WalletForm';
import WalletTransferScreen from '@/screens/Wallet/WalletTransfer';
import { useTheme } from '@shopify/restyle';
import SplashScreen from '../screens/Splash/Splash';
import TransactionForm from '../screens/Transaction/TransactionForm';
import DeletedRecentlyScreen from '@/screens/Transaction/DeletedRecently';
import AddWalletScreen from '../screens/Wallet/AddWallet';
import { MainTabNavigator } from './MainTabNavigator';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

type RootNavigatorProps = {
  isDarkMode?: boolean;
};

export const RootNavigator = ({ isDarkMode = false }: RootNavigatorProps) => {
  const navTheme = isDarkMode ? DarkTheme : DefaultTheme;
  const { colors } = useTheme<Theme>();

  return (
    <NavigationContainer
      theme={{
        ...navTheme,
        colors: { ...navTheme.colors, background: colors.main },
      }}
      ref={navigationRef}
    >
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 0,
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        {/* Luồng đăng nhập */}
        <Stack.Screen name="AuthStack" component={LoginScreen} />
        {/* Khi đã đăng nhập, hiện thanh Tab */}
        <Stack.Screen name="MainTab" component={MainTabNavigator} />

        {/* Các màn hình phụ không nằm trong Tab (ví dụ: Chi tiết giao dịch) */}
        <Stack.Screen name="TransactionForm" component={TransactionForm} />
        <Stack.Screen name="AddWallet" component={AddWalletScreen} />
        <Stack.Screen name="WalletTransfer" component={WalletTransferScreen} />
        <Stack.Screen
          name="BalanceAdjustment"
          component={BalanceAdjustmentScreen}
        />
        <Stack.Screen
          name="HistoryTransaction"
          component={HistoryTransactionScreen}
        />
        <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} />
        <Stack.Screen name="CategoryForm" component={CategoryFormScreen} />
        <Stack.Screen name="WalletDetail" component={WalletDetailScreen} />
        <Stack.Screen name="WalletForm" component={WalletFormScreen} />
        <Stack.Screen name="CreditPayment" component={CreditPaymentScreen} />
        <Stack.Screen name="DeletedRecently" component={DeletedRecentlyScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
