import { createAsyncThunk } from '@reduxjs/toolkit';
import categoryService from '@/services/category/category.service';

export const getCategoriesThunk = createAsyncThunk(
  'category/getCategories',
  async () => {
    const response = await categoryService.getAllCategories();
    return response;
  },
);
