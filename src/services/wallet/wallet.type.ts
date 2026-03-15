import { WALLET_TYPES } from '@/constants/wallet.const';

export type FinanceOverview = {
  total_assets: number; // Tổng tiền mặt đang quản lý (Gross Cash)
  physical_cash: number; // Tiền mặt sẵn sàng chi tiêu (Wallet)
  net_balance: number; // Số dư an toàn để tiêu xài
  net_worth: number; // Giá trị tài sản thực (Net Worth)
  holding_amount: number; // Tiền giữ hộ để đối ứng nợ thẻ
  total_liabilities: number; // Tổng nợ hiển thị trên sao kê ngân hàng
  true_debt: number; // Nợ thực tế của cá nhân
  monthly_income: number; // Tổng thu nhập trong kỳ
  monthly_expense: number; // Tổng chi phí trong kỳ
  monthly_surplus: number; // Khả năng tích lũy của tháng
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
