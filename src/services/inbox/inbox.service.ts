import { supabase } from '@/lib/supabase';
import i18n from '@/locales';
import { syncData } from '@/services/sync/syncDataSupabase';

export type InboxStatus = 'pending' | 'approved' | 'rejected';
export type InboxType = 'expense' | 'income' | 'transfer';
export interface InboxItem {
  id: string;
  user_id: string;
  raw_message: string;
  parsed_amount: number | null;
  parsed_type: InboxType | null;
  note: string | null;
  transaction_date: string | null;
  suggested_wallet_id: string | null;
  suggested_to_wallet_id: string | null;
  suggested_category_id: string | null;
  sender_app: string | null;
  status: InboxStatus;
  transaction_id: string | null;
  created_at: string;
}

export interface InboxApproval {
  amount: number;
  type: InboxType;
  note: string;
  date: string;
  walletId: string;
  toWalletId?: string;
  categoryId?: string;
}

export async function loadInbox(userId: string): Promise<InboxItem[]> {
  const { data, error } = await supabase.from('transaction_inbox')
    .select('id,user_id,raw_message,parsed_amount,parsed_type,note,transaction_date,suggested_wallet_id,suggested_to_wallet_id,suggested_category_id,sender_app,status,transaction_id,created_at')
    .eq('user_id', userId).order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return (data ?? []) as InboxItem[];
}

export async function rejectInbox(item: InboxItem) {
  const { data, error } = await supabase.from('transaction_inbox')
    .update({ status: 'rejected' }).eq('id', item.id)
    .eq('user_id', item.user_id).eq('status', 'pending').select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(i18n.t('inbox.already_processed'));
}

export async function restoreInbox(item: InboxItem) {
  const { data, error } = await supabase.from('transaction_inbox')
    .update({ status: 'pending' }).eq('id', item.id)
    .eq('user_id', item.user_id).eq('status', 'rejected')
    .is('transaction_id', null).select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(i18n.t('inbox.changed'));
}

// Dùng inbox.id làm transaction.id để có thể thử lại an toàn khi mạng gián đoạn.
export async function approveInbox(item: InboxItem, value: InboxApproval) {
  if (!(value.amount > 0) || !Number.isFinite(value.amount) || !value.walletId ||
      (value.type === 'transfer' && (!value.toWalletId || value.toWalletId === value.walletId))) {
    throw new Error(i18n.t('inbox.invalid_details'));
  }
  const { data: current, error: currentError } = await supabase.from('transaction_inbox')
    .select('status,transaction_id').eq('id', item.id).eq('user_id', item.user_id).single();
  if (currentError) throw currentError;
  if (current.status !== 'pending') throw new Error(i18n.t('inbox.processed_error'));

  const { error: insertError } = await supabase.from('transactions').insert({
    id: item.id,
    user_id: item.user_id,
    amount: value.amount,
    type: value.type,
    note: value.note,
    date: value.date,
    wallet_id: value.walletId,
    to_wallet_id: value.type === 'transfer' ? value.toWalletId : null,
    category_id: value.categoryId || null,
  });
  // Nếu lần trước đã tạo giao dịch thành công nhưng cập nhật inbox thất bại,
  // xác minh giao dịch gắn với inbox trước khi cập nhật lại trạng thái.
  if (insertError) {
    if (insertError.code !== '23505') throw insertError;
    const { data: existing, error } = await supabase.from('transactions')
      .select('id,user_id').eq('id', item.id).eq('user_id', item.user_id).maybeSingle();
    if (error) throw error;
    if (!existing) throw insertError;
  }
  const { data, error } = await supabase.from('transaction_inbox')
    .update({ status: 'approved', transaction_id: item.id })
    .eq('id', item.id).eq('user_id', item.user_id).eq('status', 'pending')
    .select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(i18n.t('inbox.changed'));
  syncData().catch(console.error);
}
