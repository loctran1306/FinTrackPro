import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import {
  CompositeScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

/** Main Tab Param List */
export type MainTabParamList = {
  Home: undefined; // undefined nghĩa là màn hình này không nhận tham số truyền vào
  Statistics: undefined;
  Add: undefined;
  Wallet: undefined;
  Profile: undefined;
};

/** Root Stack Param List */
export type RootStackParamList = {
  Splash: undefined; // Màn hình loading ban đầu
  AuthStack: undefined;
  // MainTab chứa các màn hình Tab, sử dụng NavigatorScreenParams để lồng vào nhau
  MainTab: NavigatorScreenParams<MainTabParamList>;
  TransactionForm: { transactionId?: string } | undefined;
  AddWallet: { type: 'cash' | 'bank' | 'credit' };
  WalletTransfer: { transactionId?: string } | undefined;
  BalanceAdjustment: undefined;
  HistoryTransaction: undefined;
  CategoryDetail: { categoryId: string };
  CategoryForm: { categoryId?: string } | undefined;
  WalletDetail: { walletId: string };
  WalletForm: { walletId?: string; type?: 'cash' | 'bank' | 'credit' | 'jar' } | undefined;
  TransferDetail: { transactionId: string };
  CreditPayment: { walletId: string };
};

/** Helper Types */
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

/** Global declaration */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
