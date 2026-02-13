import { supabase } from '@/lib/supabase';
import { CreateTransactionType, TransactionType } from './transaction.type';

type RelationOrArray<T> = T | T[] | null;

const normalizeRelation = <T>(value: RelationOrArray<T>, fallback: T): T => {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }
  return value ?? fallback;
};

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

    const transactions: TransactionType[] = (data ?? []).map(item => ({
      id: item.id,
      category_id: item.category_id,
      categories: normalizeRelation(item.categories, {
        name: '',
        icon: '',
        color: '',
      }),
      wallet_id: item.wallet_id,
      wallet: normalizeRelation(item.wallet, {
        wallet_type: '',
        display_name: '',
      }),
      to_wallet_id: item.to_wallet_id,
      to_wallet: normalizeRelation(item.to_wallet, {
        wallet_type: '',
        display_name: '',
      }),
      amount: item.amount,
      type: item.type,
      note: item.note,
      date: item.date,
    }));

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
    const normalizedResponse: TransactionType = {
      id: response.id,
      category_id: response.category_id,
      categories: normalizeRelation(response.categories, {
        name: '',
        icon: '',
        color: '',
      }),
      wallet_id: response.wallet_id,
      wallet: normalizeRelation(response.wallet, {
        wallet_type: '',
        display_name: '',
      }),
      to_wallet_id: response.to_wallet_id,
      to_wallet: normalizeRelation(response.to_wallet, {
        wallet_type: '',
        display_name: '',
      }),
      amount: response.amount,
      type: response.type,
      note: response.note,
      date: response.date,
    };
    return normalizedResponse;
  },

  deleteTransaction: async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
    return id;
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

    const normalizedResponse: TransactionType = {
      id: response.id,
      category_id: response.category_id,
      categories: normalizeRelation(response.categories, {
        name: '',
        icon: '',
        color: '',
      }),
      wallet_id: response.wallet_id,
      wallet: normalizeRelation(response.wallet, {
        wallet_type: '',
        display_name: '',
      }),
      to_wallet_id: response.to_wallet_id,
      to_wallet: normalizeRelation(response.to_wallet, {
        wallet_type: '',
        display_name: '',
      }),
      amount: response.amount,
      type: response.type,
      note: response.note,
      date: response.date,
    };
    return normalizedResponse;
  },
};
