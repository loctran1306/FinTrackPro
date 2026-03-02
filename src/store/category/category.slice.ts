import { createSlice } from '@reduxjs/toolkit';
import { CategoryState } from '@/services/category/category.type';
import { getCategoriesThunk } from './category.thunk';

const initialState: CategoryState = {
  categories: null,
  loading: false,
};

const categorySlice = createSlice({
  name: 'category',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(getCategoriesThunk.pending, state => {
      state.loading = true;
    });
    builder.addCase(getCategoriesThunk.fulfilled, (state, action) => {
      state.categories = action.payload;
      state.loading = false;
    });
    builder.addCase(getCategoriesThunk.rejected, state => {
      state.loading = false;
    });
  },
});

export default categorySlice.reducer;
