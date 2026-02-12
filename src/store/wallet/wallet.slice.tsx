import { WalletState } from '@/services/wallet/wallet.type';
import { createSlice } from '@reduxjs/toolkit';
import {
  createWalletThunk,
  getFinanceOverviewThunk,
  getWalletsThunk,
  transferWalletThunk,
} from './wallet.thunk';

const initialState: WalletState = {
  financeOverview: null,
  wallets: null,
};

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(getFinanceOverviewThunk.fulfilled, (state, action) => {
      state.financeOverview = action.payload;
    });
    builder.addCase(getWalletsThunk.fulfilled, (state, action) => {
      state.wallets = action.payload;
    });
    builder.addCase(createWalletThunk.fulfilled, (state, action) => {
      state.wallets = [...(state.wallets || []), action.payload];
    });
    builder.addCase(transferWalletThunk.fulfilled, (state, action) => {
      if (action.payload && state.wallets) {
        const { p_from_wallet_id, p_to_wallet_id, p_amount } = action.payload;
        state.wallets = state.wallets.map(wallet => {
          if (wallet.id === p_from_wallet_id) {
            return {
              ...wallet,
              current_balance: wallet.current_balance - p_amount,
            };
          } else if (wallet.id === p_to_wallet_id) {
            return {
              ...wallet,
              current_balance:
                wallet.wallet_type === 'credit'
                  ? wallet.current_balance - p_amount
                  : wallet.current_balance + p_amount,
            };
          }
          return wallet;
        });
      }
    });
  },
});

export const {} = walletSlice.actions;
export default walletSlice.reducer;
