import { supabase } from '@/lib/supabase';

const categoryService = {
  getAllCategories: async () => {
    const response = await supabase
      .from('categories')
      .select('id, name, icon, color, limit');
    if (response.error) {
      throw response.error;
    }
    return response.data;
  },
};

export default categoryService;
