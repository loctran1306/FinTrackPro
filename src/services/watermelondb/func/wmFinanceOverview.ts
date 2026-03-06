import { Q } from '@nozbe/watermelondb';
import { database } from '@/models';
import dayjs from 'dayjs';
import { combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import Transaction from '@/models/Transaction';
import Wallet from '@/models/Wallet';
import { FinanceOverview } from '@/services/wallet/wallet.type';

export const observeFinanceOverview = (
  targetDate: Date = new Date(),
): Observable<FinanceOverview> => {
  // 1. Xác định khoảng thời gian (Đầu tháng VN)
  const startMonth = dayjs(targetDate).startOf('month');
  const endMonth = startMonth.add(1, 'month');

  const v_start_month_ts = startMonth.valueOf();
  const v_end_month_ts = endMonth.valueOf();

  // 2. Quan sát Wallets (Sử dụng current_balance và wallet_type)
  const wallets$ = database.collections
    .get<Wallet>('wallets')
    .query(Q.where('is_active', true))
    .observeWithColumns(['current_balance']);

  // 3. Quan sát Transactions (Lọc theo mốc thời gian và trạng thái chưa xóa)
  const transactions$ = database.collections
    .get<Transaction>('transactions')
    .query(
      Q.where('date', Q.between(v_start_month_ts, v_end_month_ts)),
      Q.where('deleted_at', null),
    )
    .observe();

  return combineLatest([wallets$, transactions$]).pipe(
    map(([wallets, transactions]): FinanceOverview => {
      // Logic: Tổng tài sản (không phải credit)
      const total_assets = wallets
        .filter(w => w.walletType !== 'credit')
        .reduce((sum, w) => sum + (Number(w.currentBalance) || 0), 0);

      // Logic: Tổng nợ (loại ví credit)
      const total_liabilities = wallets
        .filter(w => w.walletType === 'credit')
        .reduce((sum, w) => sum + Math.abs(Number(w.currentBalance) || 0), 0);

      // Logic: Giá trị thuần (Tổng tất cả số dư)
      const net_worth = wallets.reduce(
        (sum, w) => sum + (Number(w.currentBalance) || 0),
        0,
      );

      // Logic: Thu nhập trong tháng
      const monthly_income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      // Logic: Chi tiêu trong tháng
      const monthly_expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      return {
        total_assets,
        total_liabilities,
        net_worth,
        monthly_income,
        monthly_expense,
        period: v_start_month_ts,
      };
    }),
  );
};
