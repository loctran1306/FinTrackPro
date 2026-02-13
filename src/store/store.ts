import { configureStore } from '@reduxjs/toolkit';
import globalReducer from './global/global.slice';
import authReducer from './auth/auth.slice';
import walletReducer from './wallet/wallet.slice';
import transactionReducer from './transaction/transaction.slice';
import categoryReducer from './category/category.slice';

export const store = configureStore({
  reducer: {
    global: globalReducer,
    auth: authReducer,
    wallet: walletReducer,
    transaction: transactionReducer,
    category: categoryReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
