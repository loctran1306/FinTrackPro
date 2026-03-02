import { createAsyncThunk } from '@reduxjs/toolkit';
import categoryService from '@/services/category/category.service';
import { CategoryItem } from '@/services/category/category.type';

export const getCategoriesThunk = createAsyncThunk(
  'category/getCategories',
  async ({ month, year }: { month: number; year: number }) => {
    const data = await categoryService.getCategoryStatistics(month, year);
    return data as CategoryItem[];
  },
);
