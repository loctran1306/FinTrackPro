import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Session } from '@supabase/supabase-js';

type AuthState = {
  session: Session | null;
  isAuthenticated: boolean;
  initializing: boolean;
};

const initialState: AuthState = {
  session: null,
  isAuthenticated: false,
  initializing: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<Session | null>) {
      state.session = action.payload;
      state.isAuthenticated = action.payload !== null;
      state.initializing = false;
    },
    clearSession(state) {
      state = initialState;
    },
  },
});

export const { setSession, clearSession } = authSlice.actions;
export default authSlice.reducer;
