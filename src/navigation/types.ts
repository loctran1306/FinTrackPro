import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import {
  CompositeScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

/**
 * 1. Định nghĩa các màn hình trong Bottom Tab
 */
export type MainTabParamList = {
  Home: undefined; // undefined nghĩa là màn hình này không nhận tham số truyền vào
  Statistics: undefined;
  Add: undefined;
  Wallet: undefined;
  Profile: undefined;
};

/**
 * 2. Định nghĩa các màn hình trong Stack tổng (Root)
 */
export type RootStackParamList = {
  Splash: undefined; // Màn hình loading ban đầu
  AuthStack: undefined;
  // MainTab chứa các màn hình Tab, sử dụng NavigatorScreenParams để lồng vào nhau
  MainTab: NavigatorScreenParams<MainTabParamList>;
  AddTransaction: undefined;
  TransactionDetail: { transactionId: string }; // Ví dụ: màn hình cần ID để hiển thị chi tiết
  AddWallet: { type: 'cash' | 'bank' | 'credit' };
  WalletTransfer: undefined;
  BalanceAdjustment: undefined;
};

/**
 * 3. Helper Types (Dành cho việc sử dụng hook useNavigation trong các component)
 */
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

// Khai báo global để có thể dùng navigation mà không cần import type liên tục
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
