import { Q } from '@nozbe/watermelondb';
import { database } from '@/models';
import dayjs from 'dayjs';
import { combineLatest, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import Category from '@/models/Category';
import Transaction from '@/models/Transaction';
import { CategoryItem } from '@/services/category/category.type';

/** Lấy stats của 1 category theo ID (dùng cho CategoryDetail) */
export const observeCategoryStatById = (
  categoryId: string,
  p_month: number,
  p_year: number,
): Observable<CategoryItem | null> => {
  if (!categoryId) return of(null);
  return observeCategoryStats(p_month, p_year).pipe(
    map(items => items.find(c => c.id === categoryId) ?? null),
  );
};

export const observeCategoryStats = (p_month: number, p_year: number) => {
  // 1. Tính toán ngày (Tương đương logic Step 2 trong SQL)
  const targetDate = dayjs()
    .year(p_year)
    .month(p_month - 1);
  const daysInMonth = targetDate.daysInMonth();
  const isCurrentMonth = dayjs().isSame(targetDate, 'month');

  const daysRemaining = isCurrentMonth
    ? Math.max(1, daysInMonth - dayjs().date() + 1)
    : 1;

  const startOfMonth = targetDate.startOf('month').valueOf();
  const endOfMonth = targetDate.endOf('month').valueOf();

  // 2. Quan sát Categories và Transactions
  // observeWithColumns: react khi name, icon, color, limit thay đổi
  const categories$ = database.collections
    .get<Category>('categories')
    .query()
    .observeWithColumns(['name', 'icon', 'color', 'limit']);
  const transactions$ = database.collections
    .get<Transaction>('transactions')
    .query(
      Q.where('type', 'expense'),
      Q.where('date', Q.between(startOfMonth, endOfMonth)),
      Q.where('deleted_at', null),
    )
    .observeWithColumns(['amount', 'category_id', 'deleted_at', 'wallet_id']);

  return combineLatest([categories$, transactions$]).pipe(
    map(([categories, transactions]) => {
      // Tính tổng chi tiêu cả tháng để làm mẫu số cho percent_total
      const totalMonthExpense = transactions.reduce(
        (sum, t) => sum + (t.amount || 0),
        0,
      );

      return categories
        .map((c): CategoryItem => {
          // Lọc giao dịch thuộc category này
          const catTransactions = transactions.filter(
            t => t.categoryId === c.id,
          );
          const amount = catTransactions.reduce(
            (sum, t) => sum + (t.amount || 0),
            0,
          );
          const budgetLimit = Number(c.limit) || 0;

          // Tính toán các chỉ số
          const percent_total =
            totalMonthExpense > 0
              ? Number(((amount / totalMonthExpense) * 100).toFixed(2))
              : 0;

          const percent_limit =
            budgetLimit > 0
              ? Number(((amount / budgetLimit) * 100).toFixed(2))
              : 0;

          // Số tiền còn lại có thể chi tiêu mỗi ngày (remaining_per_day)
          const remaining_per_day =
            budgetLimit > 0
              ? Math.max(0, Math.round((budgetLimit - amount) / daysRemaining))
              : 0;

          return {
            id: c.id,
            name: c.name,
            icon: c.icon,
            color: c.color,
            subtext: `${catTransactions.length} transactions`,
            amount,
            budget_limit: budgetLimit,
            percent_total,
            percent_limit,
            remaining: remaining_per_day.toString(),
          };
        })
        .sort((a, b) => b.amount - a.amount); // Sắp xếp chi tiêu nhiều nhất lên đầu
    }),
  );
};
