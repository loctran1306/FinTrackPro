import { supabase } from '@/lib/supabase';
import { CreateTransactionType, TransactionType } from './transaction.type';
import { normalizedResponseTransaction } from './transaction.utils';

export const transactionService = {
  getTransactions: async (userId: string, page: number, limit: number) => {
    const { data, error, count } = await supabase
      .from('transactions')
      .select(
        'id,category_id,categories(name,icon,color),wallet_id,wallet:wallets!transactions_wallet_id_fkey(display_name, wallet_type),to_wallet_id,to_wallet:wallets!transactions_to_wallet_id_fkey(display_name, wallet_type),amount,type,note,date',
        {
          count: 'exact',
        },
      )
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    if (error) throw error;

    const transactions: TransactionType[] = (data ?? []).map(item =>
      normalizedResponseTransaction(item),
    );

    return {
      transactions,
      total: count,
      page,
      limit,
    };
  },

  createTransaction: async (data: CreateTransactionType) => {
    const { data: response, error } = await supabase
      .from('transactions')
      .insert([data])
      .select(
        'id,category_id,categories(name,icon,color),wallet_id,wallet:wallets!transactions_wallet_id_fkey(display_name, wallet_type),to_wallet_id,to_wallet:wallets!transactions_to_wallet_id_fkey(display_name, wallet_type),amount,type,note,date',
      )
      .single();
    if (error) throw error;
    return normalizedResponseTransaction(response);
  },

  deleteTransaction: async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
    return id;
  },

  getTransactionsByCategory: async (
    userId: string,
    categoryId: string,
    month: number,
    year: number,
  ) => {
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0).toISOString();
    const { data, error } = await supabase
      .from('transactions')
      .select(
        'id,category_id,categories(name,icon,color),wallet_id,wallet:wallets!transactions_wallet_id_fkey(display_name, wallet_type),to_wallet_id,to_wallet:wallets!transactions_to_wallet_id_fkey(display_name, wallet_type),amount,type,note,date',
      )
      .eq('user_id', userId)
      .eq('category_id', categoryId)
      .eq('type', 'expense')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });
    if (error) throw error;

    const transactions: TransactionType[] = (data ?? []).map(item =>
      normalizedResponseTransaction(item),
    );
    return transactions;
  },

  updateTransaction: async (
    id: string,
    data: Partial<CreateTransactionType>,
  ) => {
    const { data: response, error } = await supabase
      .from('transactions')
      .update(data)
      .eq('id', id)
      .select(
        'id,category_id,categories(name,icon,color),wallet_id,wallet:wallets!transactions_wallet_id_fkey(display_name, wallet_type),to_wallet_id,to_wallet:wallets!transactions_to_wallet_id_fkey(display_name, wallet_type),amount,type,note,date',
      )
      .single();

    if (error) throw error;

    return normalizedResponseTransaction(response);
  },
};
