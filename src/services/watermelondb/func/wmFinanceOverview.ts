import { Q } from '@nozbe/watermelondb';
import { database } from '@/models';
import dayjs from 'dayjs';
import { combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import Transaction from '@/models/Transaction';
import Wallet from '@/models/Wallet';
import { FinanceOverview } from '@/services/wallet/wallet.type';
import { getEndOfMonth, getStartOfMonth } from '../helper/wmTime.helper';

const isHeldWallet = (displayName: string) => {
  const name = (displayName || '').toLowerCase();
  return name.includes('giữ hộ') || name.includes('hold');
};

export const observeFinanceOverview = (time?: {
  month: number;
  year: number;
}): Observable<FinanceOverview> => {
  const { month, year } = time || {
    month: dayjs().month() + 1,
    year: dayjs().year(),
  };
  const startOfMonth = getStartOfMonth(month, year);
  const endOfMonth = getEndOfMonth(month, year);

  // 2. Quan sát Wallets (Sử dụng current_balance và wallet_type)
  const wallets$ = database.collections
    .get<Wallet>('wallets')
    .query(Q.where('is_active', true))
    .observeWithColumns(['current_balance']);

  // 3. Quan sát Transactions (Lọc theo mốc thời gian và trạng thái chưa xóa)
  const transactions$ = database.collections
    .get<Transaction>('transactions')
    .query(
      Q.where('date', Q.between(startOfMonth, endOfMonth)),
      Q.where('deleted_at', null),
    )
    .observe();

  return combineLatest([wallets$, transactions$]).pipe(
    map(([wallets, transactions]): FinanceOverview => {
      // tổng tiền trong ví tiền mặt
      const total_cash_amount = wallets
        .filter(w => w.walletType === 'cash')
        .reduce((sum, w) => sum + (Number(w.currentBalance) || 0), 0);

      // tổng tiền trong hũ chi tiêu
      const jar_amount = wallets
        .filter(w => w.walletType === 'jar')
        .reduce((sum, w) => sum + (Number(w.currentBalance) || 0), 0);

      // tổng tiền trong ví giữ hộ (chỉ hũ có tên chứa "giữ hộ" hoặc "hold")
      const holding_amount = wallets
        .filter(w => w.walletType === 'jar' && isHeldWallet(w.displayName))
        .reduce((sum, w) => sum + (Number(w.currentBalance) || 0), 0);

      // Logic: Tổng nợ (loại ví credit)
      const total_liabilities = wallets
        .filter(w => w.walletType === 'credit')
        .reduce((sum, w) => sum + Math.abs(Number(w.currentBalance) || 0), 0);

      // Logic: Thu nhập trong tháng
      const monthly_income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      // Logic: Chi tiêu trong tháng
      const monthly_expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      return {
        total_assets: total_cash_amount + jar_amount, // Tổng tiền mặt đang quản lý (Gross Cash)
        physical_cash: total_cash_amount, // Tiền mặt sẵn sàng chi tiêu (Wallet)
        net_balance: total_cash_amount + holding_amount - total_liabilities, // Số dư an toàn để tiêu xài
        net_worth: total_cash_amount + jar_amount - total_liabilities, // Giá trị tài sản thực (Net Worth)
        holding_amount, // Tiền giữ hộ để đối ứng nợ thẻ
        total_liabilities, // Tổng nợ hiển thị trên sao kê ngân hàng
        true_debt: total_liabilities - holding_amount, // Nợ thực tế của cá nhân
        monthly_income, // Tổng thu nhập trong kỳ
        monthly_expense, // Tổng chi phí trong kỳ
        monthly_surplus: monthly_income - monthly_expense, // Khả năng tích lũy của tháng
      };
    }),
  );
};
