import { database } from '@/models';
import Category from '@/models/Category';
import { syncData } from '@/services/sync/syncDataSupabase';
import { toast } from '@/utils/toast';
import { Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

export const observeCategories = (userId: string): Observable<Category[]> => {
  return database.collections
    .get<Category>('categories')
    .query(Q.where('user_id', userId), Q.sortBy('name', Q.asc))
    .observeWithColumns(['name', 'icon', 'color']);
};

// THÊM DANH MỤC
export const createCategory = async (data: {
  name: string;
  icon: string;
  color: string;
  userId: string;
  limit?: number;
}) => {
  await database.write(async () => {
    await database.get<Category>('categories').create(c => {
      c._raw.id = uuidv4();
      c.name = data.name;
      c.icon = data.icon;
      c.color = data.color;
      c.userId = data.userId;
      if (data.limit !== undefined) c.limit = data.limit;
    });
  });
  syncData().catch(console.error);
};

// CẬP NHẬT DANH MỤC
export const updateCategory = async (
  category: Category,
  updates: Partial<{
    name: string;
    icon: string;
    color: string;
    limit: number;
  }>,
) => {
  await database.write(async () => {
    await category.update(c => {
      if (updates.name !== undefined) c.name = updates.name;
      if (updates.icon !== undefined) c.icon = updates.icon;
      if (updates.color !== undefined) c.color = updates.color;
      if (updates.limit !== undefined) c.limit = updates.limit;
    });
  });
  syncData().catch(console.error);
};

// XÓA DANH MỤC (Soft Delete)
export const deleteCategory = async (
  category: Category,
): Promise<Category | null> => {
  // Kiểm tra xem có giao dịch nào liên quan không
  const relatedTransactions = await database.collections
    .get('transactions')
    .query(
      Q.where('category_id', category.id),
      Q.where('user_id', category.userId),
      Q.where('deleted_at', null),
    )
    .fetchCount();

  if (relatedTransactions > 0) {
    return null;
  }

  const result = await database.write(async () => {
    await category.markAsDeleted();
    return category;
  });
  syncData().catch(console.error);
  return result;
};
