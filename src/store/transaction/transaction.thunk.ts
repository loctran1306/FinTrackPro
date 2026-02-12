import { transactionService } from '@/services/transaction/transaction.service';
import { createAsyncThunk } from '@reduxjs/toolkit';

export const getTransactionsThunk = createAsyncThunk(
  'transaction/getTransactions',
  async (
    { userId, page, limit }: { userId: string; page: number; limit: number },
    { rejectWithValue }: { rejectWithValue: (value: unknown) => void },
  ) => {
    try {
      const response = await transactionService.getTransactions(
        userId,
        page,
        limit,
      );
      return response;
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);
