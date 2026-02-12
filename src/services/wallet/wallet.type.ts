import { WALLET_TYPES } from '@/constants/wallet';

export type FinanceOverview = {
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  monthly_income: number;
  monthly_expense: number;
  period: string;
};

export type WalletType = {
  id: string;
  display_name: string;
  wallet_type: string;
  current_balance: number;
  credit_limit: number;
};
export type WalletState = {
  wallets: WalletType[] | null;
  financeOverview: FinanceOverview | null;
};
export type WalletCreateType = {
  user_id: string;
  display_name: string;
  wallet_type: keyof typeof WALLET_TYPES;
  initial_balance: number;
  current_balance: number;
  credit_limit?: number;
  statement_day?: string;
  payment_due_date?: string;
};

export type WalletTransferType = {
  p_from_wallet_id: string;
  p_to_wallet_id: string;
  p_amount: number;
  p_note: string;
};
