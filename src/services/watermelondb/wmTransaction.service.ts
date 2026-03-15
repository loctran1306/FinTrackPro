import { database } from '@/models';
import Transaction from '@/models/Transaction';
import Wallet from '@/models/Wallet';
import { syncData } from '@/services/sync/syncDataSupabase';
import { Q } from '@nozbe/watermelondb';
import { combineLatest, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { getEndOfMonth, getStartOfMonth } from './helper/wmTime.helper';

export const observeTransactions = (userId: string, takeCount: number) => {
  if (!userId) return of([]);
  return database.collections
    .get<Transaction>('transactions')
    .query(
      Q.where('user_id', userId),
      Q.where('deleted_at', null),
      Q.sortBy('date', Q.desc),
      Q.take(takeCount),
    )
    .observe();
};

export const observeTransactionCount = (userId: string) => {
  if (!userId) return of(0);

  return database.collections
    .get<Transaction>('transactions')
    .query(Q.where('user_id', userId), Q.where('deleted_at', null))
    .observeCount();
};

/** Chi tiết giao dịch chuyển khoản (transaction + fromWallet + toWallet) */
export const observeTransferDetail = (transactionId: string) => {
  if (!transactionId) return of(null);
  return database.collections
    .get<Transaction>('transactions')
    .findAndObserve(transactionId)
    .pipe(
      switchMap(tx => {
        if (!tx || tx.type !== 'transfer' || !tx.toWalletId) return of(null);
        return combineLatest([
          tx.wallet.observe(),
          tx.toWallet.observe(),
        ]).pipe(
          map(([fromWallet, toWallet]) => ({
            transaction: tx,
            fromWallet,
            toWallet,
          })),
        );
      }),
    );
};

export const observeTransactionsByCategory = (
  userId: string,
  categoryId: string,
  month: number,
  year: number,
) => {
  const startOfMonth = getStartOfMonth(month, year);
  const endOfMonth = getEndOfMonth(month, year);
  return database.collections
    .get<Transaction>('transactions')
    .query(
      Q.where('user_id', userId),
      Q.where('category_id', categoryId),
      Q.where('type', 'expense'),
      Q.where('date', Q.between(startOfMonth, endOfMonth)),
      Q.where('deleted_at', null),
    )
    .observe();
};

/** Giao dịch liên quan đến ví (từ ví hoặc chuyển vào ví) trong tháng */
export const observeTransactionsByWallet = (
  userId: string,
  walletId: string,
  month: number,
  year: number,
) => {
  if (!userId || !walletId) return of([]);
  const startOfMonth = getStartOfMonth(month, year);
  const endOfMonth = getEndOfMonth(month, year);
  return database.collections
    .get<Transaction>('transactions')
    .query(
      Q.where('user_id', userId),
      Q.or(
        Q.where('wallet_id', walletId),
        Q.where('to_wallet_id', walletId),
      ),
      Q.where('date', Q.between(startOfMonth, endOfMonth)),
      Q.where('deleted_at', null),
      Q.sortBy('date', Q.desc),
    )
    .observe();
};

// ============================================================
// HELPER: Logic balance khớp với trigger fn_maintain_wallet_balance
// ============================================================

/**
 * Áp dụng balance khi INSERT transaction (giống trigger phần "ÁP DỤNG")
 * - expense: ví thường trừ tiền, ví credit cộng nợ
 * - income:  ví thường cộng tiền, ví credit trừ nợ
 * - transfer: ví gửi = expense, ví nhận = income
 */
const applyBalance = (
  wallet: Wallet,
  amount: number,
  type: 'expense' | 'income' | 'transfer',
  role: 'from' | 'to' = 'from',
) => {
  const current = Number(wallet.currentBalance) || 0;
  const isCredit = wallet.walletType === 'credit';

  // transfer from = expense logic, transfer to = income logic
  const effectiveType =
    type === 'transfer' ? (role === 'from' ? 'expense' : 'income') : type;

  if (effectiveType === 'expense') {
    wallet.currentBalance = isCredit ? current + amount : current - amount;
  } else {
    wallet.currentBalance = isCredit ? current - amount : current + amount;
  }
};

/**
 * Hoàn tác balance khi DELETE/UPDATE transaction (giống trigger phần "HOÀN LẠI")
 * Logic ngược lại với applyBalance
 */
const revertBalance = (
  wallet: Wallet,
  amount: number,
  type: 'expense' | 'income' | 'transfer',
  role: 'from' | 'to' = 'from',
) => {
  const current = Number(wallet.currentBalance) || 0;
  const isCredit = wallet.walletType === 'credit';

  const effectiveType =
    type === 'transfer' ? (role === 'from' ? 'expense' : 'income') : type;

  if (effectiveType === 'expense') {
    // Hoàn lại: ngược với apply
    wallet.currentBalance = isCredit ? current - amount : current + amount;
  } else {
    wallet.currentBalance = isCredit ? current + amount : current - amount;
  }
};

// ============================================================
// CREATE
// ============================================================

export const createTransaction = async (data: {
  amount: number;
  note: string;
  type: string;
  date: number;
  categoryId: string;
  walletId: string;
  toWalletId?: string;
  userId: string;
}) => {
  try {
    const newTransaction = await database.write(async () => {
      const recordsToBatch: any[] = [];

      // 1. Tìm ví gửi
      const wallet = await database.get<Wallet>('wallets').find(data.walletId);
      if (!wallet) throw new Error('Không tìm thấy ví');

      // 2. Tạo transaction
      const txn = database.get<Transaction>('transactions').prepareCreate(t => {
        t._raw.id = uuidv4();
        t.userId = data.userId;
        t.categoryId = data.categoryId;
        t.walletId = data.walletId;
        if (data.toWalletId) t.toWalletId = data.toWalletId;
        t.amount = data.amount;
        t.type = data.type;
        t.note = data.note;
        t.date = data.date;
      });
      recordsToBatch.push(txn);

      // 3. Cập nhật số dư ví gửi (from)
      const updatedWallet = wallet.prepareUpdate(w => {
        applyBalance(w, data.amount, data.type as any, 'from');
      });
      recordsToBatch.push(updatedWallet);

      // 4. Nếu transfer → cập nhật ví nhận (to)
      if (data.type === 'transfer' && data.toWalletId) {
        const toWallet = await database
          .get<Wallet>('wallets')
          .find(data.toWalletId);
        if (toWallet) {
          const updatedToWallet = toWallet.prepareUpdate(w => {
            applyBalance(w, data.amount, 'transfer', 'to');
          });
          recordsToBatch.push(updatedToWallet);
        }
      }

      // 5. Thực thi batch
      await database.batch(...recordsToBatch);
      return txn;
    });

    // 6. Sync sau khi write xong (tránh deadlock)
    syncData().catch(console.error);
    return newTransaction;
  } catch (error) {
    console.error('❌ Lỗi khi tạo transaction:', error);
    throw error;
  }
};

// ============================================================
// UPDATE
// ============================================================

export const updateTransaction = async (
  transaction: Transaction,
  updates: Partial<{
    amount: number;
    note: string;
    type: string;
    date: number;
    categoryId: string | null;
    walletId: string;
    toWalletId: string | null;
  }>,
) => {
  try {
    const updatedTransaction = await database.write(async () => {
      const oldAmount = Number(transaction.amount) || 0;
      const newAmount =
        updates.amount !== undefined ? Number(updates.amount) : oldAmount;
      const oldType = transaction.type as 'expense' | 'income' | 'transfer';
      const newType = (updates.type !== undefined ? updates.type : oldType) as
        | 'expense'
        | 'income'
        | 'transfer';

      const recordsToBatch: any[] = [];
      const newWalletId = updates.walletId ?? transaction.walletId;

      // Dùng Map để gộp delta theo walletId
      // → mỗi wallet chỉ gọi prepareUpdate 1 lần, kể cả walletId === toWalletId
      const walletDeltas = new Map<string, { wallet: Wallet; delta: number }>();

      // Helper: load wallet vào Map (nếu chưa có)
      const ensureWallet = async (walletId: string): Promise<Wallet> => {
        if (!walletDeltas.has(walletId)) {
          const w = await database.get<Wallet>('wallets').find(walletId);
          if (!w) throw new Error(`Wallet not found: ${walletId}`);
          walletDeltas.set(walletId, { wallet: w, delta: 0 });
        }
        return walletDeltas.get(walletId)!.wallet;
      };

      // Helper: tính delta theo loại ví và role
      const calcDelta = (
        wallet: Wallet,
        amount: number,
        type: 'expense' | 'income' | 'transfer',
        role: 'from' | 'to',
        sign: 1 | -1, // 1 = apply, -1 = revert
      ): number => {
        const isCredit = wallet.walletType === 'credit';
        const effectiveType =
          type === 'transfer' ? (role === 'from' ? 'expense' : 'income') : type;
        if (effectiveType === 'expense') {
          return sign * (isCredit ? amount : -amount);
        } else {
          return sign * (isCredit ? -amount : amount);
        }
      };

      // ── Revert: ví gửi cũ ──
      const fromWalletOld = await ensureWallet(transaction.walletId);
      walletDeltas.get(transaction.walletId)!.delta += calcDelta(
        fromWalletOld,
        oldAmount,
        oldType,
        'from',
        -1,
      );

      // ── Revert: ví nhận cũ ──
      const oldToWalletId = transaction.toWalletId ?? null;
      if (oldType === 'transfer' && oldToWalletId) {
        const toWalletOld = await ensureWallet(oldToWalletId);
        walletDeltas.get(oldToWalletId)!.delta += calcDelta(
          toWalletOld,
          oldAmount,
          'transfer',
          'to',
          -1,
        );
      }

      // ── Apply: ví gửi mới ──
      const fromWalletNew = await ensureWallet(newWalletId);
      walletDeltas.get(newWalletId)!.delta += calcDelta(
        fromWalletNew,
        newAmount,
        newType,
        'from',
        1,
      );

      // ── Apply: ví nhận mới ──
      const newToWalletId =
        updates.toWalletId !== undefined ? updates.toWalletId : oldToWalletId;
      if (newType === 'transfer' && newToWalletId) {
        const toWalletNew = await ensureWallet(newToWalletId);
        walletDeltas.get(newToWalletId)!.delta += calcDelta(
          toWalletNew,
          newAmount,
          'transfer',
          'to',
          1,
        );
      }

      // ── Áp dụng tất cả delta → 1 prepareUpdate / wallet ──
      for (const { wallet, delta } of walletDeltas.values()) {
        if (delta !== 0) {
          recordsToBatch.push(
            wallet.prepareUpdate(w => {
              w.currentBalance = (Number(w.currentBalance) || 0) + delta;
            }),
          );
        }
      }

      // ── Cập nhật transaction ──
      const txnUpdate = transaction.prepareUpdate(t => {
        if (updates.amount !== undefined) t.amount = updates.amount;
        if (updates.note !== undefined) t.note = updates.note;
        if (updates.type !== undefined) t.type = updates.type;
        if (updates.date !== undefined) t.date = updates.date;
        if (updates.categoryId !== undefined)
          t.categoryId = updates.categoryId ?? '';
        if (updates.walletId !== undefined) t.walletId = updates.walletId;
        if (updates.toWalletId !== undefined) t.toWalletId = updates.toWalletId;
      });
      recordsToBatch.push(txnUpdate);

      await database.batch(...recordsToBatch);
      return txnUpdate;
    });

    console.log('✅ Cập nhật transaction thành công!');
    syncData().catch(console.error);
    return updatedTransaction;
  } catch (error) {
    console.error('❌ Lỗi khi update transaction:', error);
    // Safety: reset _hasPendingUpdate trên tất cả wallets đã prepareUpdate
    // Tránh stuck state sau khi write block fail
    throw error;
  }
};

// ============================================================
// DELETE (Soft Delete — markAsDeleted)
// ============================================================

export const deleteTransaction = async (transaction: Transaction) => {
  try {
    const amount = Number(transaction.amount) || 0;
    const type = transaction.type as 'expense' | 'income' | 'transfer';

    await database.write(async writer => {
      const recordsToBatch: any[] = [];

      // 1. Hoàn tác ví gửi (from)
      const wallet = await database
        .get<Wallet>('wallets')
        .find(transaction.walletId);
      if (wallet) {
        const revertWallet = wallet.prepareUpdate(w => {
          revertBalance(w, amount, type, 'from');
        });
        recordsToBatch.push(revertWallet);
      }

      // 2. Nếu transfer → hoàn tác ví nhận (to)
      if (type === 'transfer' && transaction.toWalletId) {
        const toWallet = await database
          .get<Wallet>('wallets')
          .find(transaction.toWalletId);
        if (toWallet) {
          const revertToWallet = toWallet.prepareUpdate(w => {
            revertBalance(w, amount, 'transfer', 'to');
          });
          recordsToBatch.push(revertToWallet);
        }
      }

      // 3. Soft delete transaction
      const markedTransaction = transaction.prepareMarkAsDeleted();
      recordsToBatch.push(markedTransaction);

      // 4. Thực thi batch
      await writer.batch(...recordsToBatch);
    });

    console.log('✅ Đã đánh dấu xóa và hoàn tiền ví thành công');
    // 5. Sync sau khi write xong
    syncData().catch(console.error);
  } catch (error) {
    console.error('❌ Lỗi khi xóa giao dịch:', error);
  }
};

// ============================================================
// DELETE PERMANENTLY
// ============================================================

export const deleteTransactionPermanently = async (transactionId: string) => {
  try {
    const transaction = await database
      .get<Transaction>('transactions')
      .find(transactionId);
    if (!transaction) throw new Error('Không tìm thấy giao dịch');

    const amount = Number(transaction.amount) || 0;
    const type = transaction.type as 'expense' | 'income' | 'transfer';

    await database.write(async writer => {
      const recordsToBatch: any[] = [];

      // 1. Hoàn tác ví gửi (from)
      const wallet = await database
        .get<Wallet>('wallets')
        .find(transaction.walletId);
      if (wallet) {
        const revertWallet = wallet.prepareUpdate(w => {
          revertBalance(w, amount, type, 'from');
        });
        recordsToBatch.push(revertWallet);
      }

      // 2. Nếu transfer → hoàn tác ví nhận (to)
      if (type === 'transfer' && transaction.toWalletId) {
        const toWallet = await database
          .get<Wallet>('wallets')
          .find(transaction.toWalletId);
        if (toWallet) {
          const revertToWallet = toWallet.prepareUpdate(w => {
            revertBalance(w, amount, 'transfer', 'to');
          });
          recordsToBatch.push(revertToWallet);
        }
      }

      // 3. Xóa vĩnh viễn
      const transactionDelete = transaction.prepareDestroyPermanently();
      recordsToBatch.push(transactionDelete);

      // 4. Thực thi batch
      await writer.batch(...recordsToBatch);
    });

    console.log('✅ Đã xóa vĩnh viễn và hoàn tác số dư ví thành công');
    // 5. Sync sau khi write xong
    syncData().catch(console.error);
  } catch (error) {
    console.error('❌ Lỗi khi xóa vĩnh viễn:', error);
  }
};
