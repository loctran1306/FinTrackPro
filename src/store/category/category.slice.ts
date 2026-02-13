import { createSlice } from '@reduxjs/toolkit';
import { CategoryState } from '@/services/category/category.type';
import { getCategoriesThunk } from './category.thunk';

const initialState: CategoryState = {
  categories: null,
};

const categorySlice = createSlice({
  name: 'category',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(getCategoriesThunk.fulfilled, (state, action) => {
      state.categories = action.payload;
    });
  },
});

export default categorySlice.reducer;
