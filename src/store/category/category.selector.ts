import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';

export const selectCategoryById = (id: string) =>
  createSelector(
    (state: RootState) => state.category.categories,
    categories => categories?.find(category => category.id === id),
  );
