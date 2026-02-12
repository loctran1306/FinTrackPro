import { TransactionState } from '@/services/transaction/transaction.type';
import { createSlice } from '@reduxjs/toolkit';
import { getTransactionsThunk } from './transaction.thunk';

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
  reducers: {},
  extraReducers: builder => {
    builder.addCase(getTransactionsThunk.fulfilled, (state, action) => {
      state.transactions = action.payload?.transactions || [];
      state.page = action.payload?.page || 1;
      state.limit = action.payload?.limit || 10;
      state.total = action.payload?.total || 0;
    });
  },
});

export default transactionSlice.reducer;
