import { supabase } from '@/lib/supabase';
import { WalletCreateType, WalletTransferType } from './wallet.type';

export const walletService = {
  getFinancialAccounts: async () => {
    const { data, error } = await supabase.rpc('get_finance_overview');
    if (error) throw error;
    return data;
  },
  getWallets: async (userId: string) => {
    const { data, error } = await supabase
      .from('wallets')
      .select('id,display_name,wallet_type,current_balance,credit_limit')
      .eq('user_id', userId)
      .eq('is_active', true);
    if (error) throw error;
    return data;
  },
  createWallet: async (walletData: WalletCreateType) => {
    const { data, error } = await supabase
      .from('wallets')
      .insert([
        {
          ...walletData,
          is_active: true,
        },
      ])
      .select('id,display_name,wallet_type,current_balance,credit_limit')
      .single();

    if (error) throw error;
    return data;
  },

  transfer: async (walletTransferData: WalletTransferType) => {
    const { data, error } = await supabase.rpc('transfer_money', {
      p_from_wallet_id: walletTransferData.p_from_wallet_id,
      p_to_wallet_id: walletTransferData.p_to_wallet_id,
      p_amount: walletTransferData.p_amount,
      p_note: walletTransferData.p_note,
    });
    console.log('data', data);
    if (error) throw error;
    return data;
  },
};
