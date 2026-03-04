import { supabase } from '@/lib/supabase';

export type CreateCategoryPayload = {
  name: string;
  icon: string;
  color: string;
  limit: number;
};

export type UpdateCategoryPayload = {
  name?: string;
  icon?: string;
  color?: string;
  limit?: number;
};

const categoryService = {
  createCategory: async (payload: CreateCategoryPayload) => {
    const { data: category, error } = await supabase
      .from('categories')
      .insert({
        name: payload.name,
        icon: payload.icon,
        color: payload.color,
        limit: payload.limit,
      })
      .select('id, name, icon, color, limit')
      .single();
    if (error) throw error;
    return category;
  },
  getCategoryStatistics: async (month: number, year: number) => {
    const { data, error } = await supabase.rpc('get_category_stats', {
      p_month: month,
      p_year: year,
    });
    if (error) throw error;
    return data;
  },

  updateCategory: async (id: string, payload: UpdateCategoryPayload) => {
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .update(payload)
      .select('id, name, icon, color, limit')
      .eq('id', id)
      .single();
    if (categoryError) throw categoryError;
    return category;
  },

  deleteCategory: async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
  },
};

export default categoryService;
