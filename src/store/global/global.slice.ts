import { storageUtils } from '@/lib/storage';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ThemeMode = 'system' | 'light' | 'dark';

export type TimeState = {
  month: number;
  year: number;
};

type GlobalState = {
  theme: ThemeMode;
  hiddenCurrency: boolean;
  isNetworkConnected: boolean;
  isSyncEnabled: boolean;
  time: TimeState;
};

const initialState: GlobalState = {
  theme: (storageUtils.getTheme() as ThemeMode) || 'system',
  hiddenCurrency: false,
  isNetworkConnected: false,
  isSyncEnabled: true,
  time: {
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  },
};

const globalSlice = createSlice({
  name: 'global',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.theme = action.payload;
      storageUtils.setTheme(action.payload);
    },
    setHiddenCurrency(state, action: PayloadAction<boolean>) {
      state.hiddenCurrency = action.payload;
    },
    setNetworkStatus(state, action: PayloadAction<{ isConnected: boolean }>) {
      state.isNetworkConnected = action.payload.isConnected;
    },
    setSyncEnabled(state, action: PayloadAction<boolean>) {
      state.isSyncEnabled = action.payload;
    },
    setTime(state, action: PayloadAction<{ month: number; year: number }>) {
      state.time = action.payload;
    },
  },
});

export const {
  setTheme,
  setHiddenCurrency,
  setNetworkStatus,
  setSyncEnabled,
  setTime,
} = globalSlice.actions;
export default globalSlice.reducer;
