import { storageUtils } from '@/lib/storage';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ThemeMode = 'system' | 'light' | 'dark';

type GlobalState = {
  theme: ThemeMode;
  hiddenCurrency: boolean;
};

const initialState: GlobalState = {
  theme: (storageUtils.getTheme() as ThemeMode) || 'system',
  hiddenCurrency: false,
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
  },
});

export const { setTheme, setHiddenCurrency } = globalSlice.actions;
export default globalSlice.reducer;
