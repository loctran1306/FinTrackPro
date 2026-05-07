import { database } from '@/models';
import Category from '@/models/Category';
import Installment from '@/models/Installment';
import InstallmentItem from '@/models/InstallmentItem';
import Transaction from '@/models/Transaction';
import Wallet from '@/models/Wallet';
import { syncData } from '@/services/sync/syncDataSupabase';
import { Q } from '@nozbe/watermelondb';
import { Observable, combineLatest, map } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

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
  console.log('autoBillDueInstallmentItems');
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

    const recordsToBatch: any[] = [];

    for (const item of dueItems) {
      const installment = await database
        .get<Installment>('installments')
        .find(item.installmentId);
      if (!installment || installment.userId !== userId) continue;
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

      const transaction = database
        .get<Transaction>('transactions')
        .prepareCreate(t => {
          t._raw.id = uuidv4();
          t.userId = installment.userId;
          t.categoryId = installmentCategoryId;
          t.walletId = installment.walletId;
          t.amount = amount;
          t.type = 'expense';
          t.note = `${installment.name} - kỳ ${item.periodNumber}`;
          t.date = now;
        });
      recordsToBatch.push(transaction);

      recordsToBatch.push(
        wallet.prepareUpdate(w => {
          const current = Number(w.currentBalance) || 0;
          w.currentBalance =
            w.walletType === 'credit' ? current + amount : current - amount;
        }),
      );

      recordsToBatch.push(
        item.prepareUpdate(i => {
          i.transactionId = transaction.id;
          i.status = 'BILLED';
        }),
      );

      const remainingPending = await database.collections
        .get<InstallmentItem>('installment_items')
        .query(
          Q.where('installment_id', installment.id),
          Q.where('status', Q.eq('PENDING')),
          Q.where('id', Q.notEq(item.id)),
        )
        .fetchCount();

      if (remainingPending === 0) {
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

  syncData().catch(console.error);
};
