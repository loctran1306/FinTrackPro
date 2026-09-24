import { database } from '@/models';
import Category from '@/models/Category';
import Installment from '@/models/Installment';
import InstallmentItem from '@/models/InstallmentItem';
import Transaction from '@/models/Transaction';
import Wallet from '@/models/Wallet';
import { syncData } from '@/services/sync/syncDataSupabase';
import { Model, Q } from '@nozbe/watermelondb';
import { Observable, combineLatest, map } from 'rxjs';
import { v5 as uuidv5 } from 'uuid';

export type InstallmentWithItems = {
  installment: Installment;
  installmentItems: InstallmentItem[];
};

export const observeInstallments = (
  userId: string,
): Observable<InstallmentWithItems[]> => {
  const installments$ = database.collections
    .get<Installment>('installments')
    .query(
      Q.where('user_id', userId),
      Q.where('deleted_at', null),
      Q.sortBy('start_date', Q.desc),
    )
    .observeWithColumns([
      'id',
      'name',
      'total_amount',
      'tenure_months',
      'status',
      'wallet_id',
    ]);

  const installmentItems$ = database.collections
    .get<InstallmentItem>('installment_items')
    .query(Q.sortBy('period_number', Q.asc))
    .observeWithColumns([
      'id',
      'installment_id',
      'due_date',
      'amount',
      'period_number',
      'status',
    ]);

  return combineLatest([installments$, installmentItems$]).pipe(
    map(([installments, items]) => {
      const itemMap = new Map<string, InstallmentItem[]>();
      items.forEach(item => {
        const group = itemMap.get(item.installmentId) ?? [];
        group.push(item);
        itemMap.set(item.installmentId, group);
      });

      return installments.map(installment => ({
        installment,
        installmentItems: itemMap.get(installment.id) ?? [],
      }));
    }),
  );
};

export const observePendingInstallmentAmountByWallet = (
  userId: string,
  walletId: string,
): Observable<number> => {
  const installments$ = database.collections
    .get<Installment>('installments')
    .query(
      Q.where('user_id', userId),
      Q.where('wallet_id', walletId),
      Q.where('deleted_at', null),
    )
    .observeWithColumns(['wallet_id']);

  const pendingItems$ = database.collections
    .get<InstallmentItem>('installment_items')
    .query(Q.where('status', Q.eq('PENDING')))
    .observeWithColumns(['installment_id', 'amount', 'status']);

  return combineLatest([installments$, pendingItems$]).pipe(
    map(([installments, pendingItems]) => {
      const installmentIds = new Set(installments.map(item => item.id));
      return pendingItems.reduce((sum, item) => {
        if (!installmentIds.has(item.installmentId)) return sum;
        return sum + (Number(item.amount) || 0);
      }, 0);
    }),
  );
};

export const autoBillDueInstallmentItems = async (userId: string) => {
  if (!userId) return;
  // Pull billed periods (including legacy random transaction IDs) before billing.
  // Do not bill from stale data when sync is unavailable or fails.
  if (!(await syncData())) return;
  const now = Date.now();
  const installmentCategory = await database.collections
    .get<Category>('categories')
    .query(Q.where('name', Q.like('%Trả góp%')), Q.where('user_id', userId))
    .fetch();
  const installmentCategoryId = installmentCategory[0]?.id ?? '';

  await database.write(async () => {
    const dueItems = await database.collections
      .get<InstallmentItem>('installment_items')
      .query(Q.where('status', Q.eq('PENDING')), Q.where('due_date', Q.lt(now)))
      .fetch();

    if (dueItems.length === 0) return;

    const recordsToBatch: Model[] = [];
    const walletChanges = new Map<Wallet, number>();
    const billedInstallments = new Map<string, Installment>();
    const billedItemIds = new Set<string>();

    for (const item of dueItems) {
      const installment = await database
        .get<Installment>('installments')
        .find(item.installmentId);
      if (
        !installment ||
        installment.userId !== userId ||
        installment.deletedAt
      )
        continue;
      if (
        installment.status === 'COMPLETED' ||
        installment.status === 'CANCELLED'
      ) {
        continue;
      }

      const wallet = await database
        .get<Wallet>('wallets')
        .find(installment.walletId);
      if (!wallet) continue;

      const amount = Number(item.amount) || 0;
      if (amount <= 0) continue;

      // The same period must have the same transaction ID on every device.
      const transactionId =
        item.transactionId ||
        uuidv5(`fintrackpro:installment-item:${item.id}`, uuidv5.URL);
      const existingTransactions = await database
        .get<Transaction>('transactions')
        .query(Q.where('id', transactionId))
        .fetch();

      if (existingTransactions.length === 0 && !item.transactionId) {
        recordsToBatch.push(
          database.get<Transaction>('transactions').prepareCreate(t => {
            t._raw.id = transactionId;
            t.userId = installment.userId;
            t.categoryId = installmentCategoryId;
            t.walletId = installment.walletId;
            t.amount = amount;
            t.type = 'expense';
            t.note = `${installment.name} - kỳ ${item.periodNumber}`;
            t.date = item.dueDate;
          }),
        );
        walletChanges.set(wallet, (walletChanges.get(wallet) ?? 0) + amount);
      }

      recordsToBatch.push(
        item.prepareUpdate(i => {
          i.transactionId = transactionId;
          i.status = 'BILLED';
        }),
      );

      billedInstallments.set(installment.id, installment);
      billedItemIds.add(item.id);
    }

    // Prepare each wallet once, even when several periods are overdue.
    for (const [wallet, amount] of walletChanges) {
      recordsToBatch.push(
        wallet.prepareUpdate(w => {
          const current = Number(w.currentBalance) || 0;
          w.currentBalance =
            w.walletType === 'credit' ? current + amount : current - amount;
        }),
      );
    }

    for (const installment of billedInstallments.values()) {
      const pendingItems = await database
        .get<InstallmentItem>('installment_items')
        .query(
          Q.where('installment_id', installment.id),
          Q.where('status', 'PENDING'),
        )
        .fetch();
      if (pendingItems.every(item => billedItemIds.has(item.id))) {
        recordsToBatch.push(
          installment.prepareUpdate(record => {
            record.status = 'COMPLETED';
          }),
        );
      }
    }

    if (recordsToBatch.length > 0) {
      await database.batch(...recordsToBatch);
    }
  });

  await syncData();
};
