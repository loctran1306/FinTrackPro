import { TransactionState } from '@/services/transaction/transaction.type';
import { createSlice } from '@reduxjs/toolkit';
import {
  createTransactionThunk,
  deleteTransactionThunk,
  getTransactionsThunk,
  updateTransactionThunk,
} from './transaction.thunk';

const initialState: TransactionState = {
  loading: false,
  transactions: [],
  page: 1,
  limit: 10,
  total: 0,
};

const transactionSlice = createSlice({
  name: 'transaction',
  initialState,
  reducers: {
    setTransactions: (state, action) => {
      state.transactions = action.payload;
    },
  },
  extraReducers: builder => {
    builder.addCase(getTransactionsThunk.fulfilled, (state, action) => {
      state.transactions = action.payload?.transactions || [];
      state.page = action.payload?.page || 1;
      state.limit = action.payload?.limit || 10;
      state.total = action.payload?.total || 0;
    });
    builder.addCase(createTransactionThunk.fulfilled, (state, action) => {
      if (action.payload) {
        state.transactions.unshift(action.payload);
        state.total += 1;
      }
    });
    builder.addCase(deleteTransactionThunk.fulfilled, (state, action) => {
      if (action.payload) {
        state.transactions = state.transactions.filter(
          i => i.id !== action.payload,
        );
      }
    });
    builder.addCase(updateTransactionThunk.fulfilled, (state, action) => {
      if (action.payload) {
        const index = state.transactions.findIndex(
          t => t.id === action.payload?.id,
        );
        if (index !== -1) {
          state.transactions[index] = action.payload;
        }
      }
    });
  },
});

export const { setTransactions } = transactionSlice.actions;

export default transactionSlice.reducer;
