import { transactionService } from '@/services/transaction/transaction.service';
import { CreateTransactionType } from '@/services/transaction/transaction.type';
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

export const createTransactionThunk = createAsyncThunk(
  'transaction/createTransaction',
  async (
    { data }: { data: CreateTransactionType },
    { rejectWithValue }: { rejectWithValue: (value: unknown) => void },
  ) => {
    try {
      const response = await transactionService.createTransaction(data);
      return response;
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

export const deleteTransactionThunk = createAsyncThunk(
  'transaction/deleteTransaction',
  async (id: string) => {
    try {
      const response = await transactionService.deleteTransaction(id);
      return response;
    } catch (error) {
      console.log(error);
      return false;
    }
  },
);

export const updateTransactionThunk = createAsyncThunk(
  'transaction/updateTransaction',
  async (
    { id, data }: { id: string; data: Partial<CreateTransactionType> },
    { rejectWithValue }: { rejectWithValue: (value: unknown) => void },
  ) => {
    try {
      const response = await transactionService.updateTransaction(id, data);
      return response;
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);
