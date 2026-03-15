import { database } from '@/models';
import Wallet from '@/models/Wallet';
import { syncData } from '@/services/sync/syncDataSupabase';
import { Observable } from 'rxjs';
import { Q } from '@nozbe/watermelondb';
import { v4 as uuidv4 } from 'uuid';
import { createTransaction } from './wmTransaction.service';
import { transferPayload } from './type/wmWallet.type';

export const observeWallets = (userId: string): Observable<Wallet[]> => {
  return database.collections
    .get<Wallet>('wallets')
    .query(
      Q.where('user_id', userId),
      Q.where('is_active', true),
      Q.where('deleted_at', null),
      Q.sortBy('current_balance', Q.desc),
      Q.sortBy('display_name', Q.asc),
    )
    .observeWithColumns(['display_name', 'wallet_type', 'current_balance']);
};

export const observeCreditWallets = (userId: string): Observable<Wallet[]> => {
  return database.collections
    .get<Wallet>('wallets')
    .query(
      Q.where('user_id', userId),
      Q.where('wallet_type', Q.eq('credit')),
      Q.sortBy('current_balance', Q.desc),
    )
    .observeWithColumns(['display_name', 'wallet_type', 'current_balance']);
};

export const observePaymentWallets = (userId: string): Observable<Wallet[]> => {
  return database.collections
    .get<Wallet>('wallets')
    .query(
      Q.where('user_id', userId),
      Q.where('wallet_type', Q.notIn(['credit'])),
      Q.sortBy('current_balance', Q.desc),
      Q.sortBy('display_name', Q.asc),
    )
    .observeWithColumns(['display_name', 'wallet_type', 'current_balance']);
};
// THÊM VÍ MỚI
export const createWallet = async (data: {
  displayName: string;
  walletType: string;
  initialBalance: number;
  userId: string;
  creditLimit?: number;
}) => {
  const newWallet = await database.write(async () => {
    const wallet = await database.get<Wallet>('wallets').create(w => {
      w._raw.id = uuidv4();
      w.displayName = data.displayName;
      w.walletType = data.walletType;
      w.initialBalance = data.initialBalance;
      w.currentBalance = data.initialBalance; // Mới tạo thì balance = initial
      w.userId = data.userId;
      w.isActive = true;
      if (data.creditLimit) w.creditLimit = data.creditLimit;
    });
    return wallet;
  });
  syncData().catch(console.error);
  return newWallet;
};

// CẬP NHẬT VÍ
export const updateWallet = async (
  wallet: Wallet,
  updates: Partial<Wallet>,
) => {
  await database.write(async () => {
    await wallet.update(w => {
      if (updates.displayName !== undefined)
        w.displayName = updates.displayName;
      if (updates.isActive !== undefined) w.isActive = updates.isActive;
      if (updates.currentBalance !== undefined)
        w.currentBalance = updates.currentBalance;
    });
  });
  syncData().catch(console.error);
};

// XÓA VÍ (Soft Delete)
export const deleteWallet = async (wallet: Wallet): Promise<Wallet | null> => {
  // Kiểm tra xem có giao dịch nào liên quan không
  const relatedTransactions = await database.collections
    .get('transactions')
    .query(
      Q.or(Q.where('wallet_id', wallet.id), Q.where('to_wallet_id', wallet.id)),
      Q.where('user_id', wallet.userId),
      Q.where('deleted_at', null),
    )
    .fetchCount();

  if (relatedTransactions > 0) {
    return null;
  }
  const result = await database.write(async () => {
    await wallet.markAsDeleted();
    return wallet;
  });
  syncData().catch(console.error);
  return result;
};

// ============================================================
// CREATE TRANSFER (local — mirror của transfer_money RPC)
// ============================================================

export const createTransfer = async (data: transferPayload) => {
  // 1. Kiểm tra logic cơ bản
  if (data.fromWalletId === data.toWalletId) {
    throw new Error('Ví gửi và ví nhận không được trùng nhau.');
  }
  if (data.amount <= 0) {
    throw new Error('Số tiền chuyển phải lớn hơn 0.');
  }

  // 2. Lấy thông tin ví
  const fromWallet = await database
    .get<Wallet>('wallets')
    .find(data.fromWalletId);
  const toWallet = await database.get<Wallet>('wallets').find(data.toWalletId);

  // 3. Kiểm tra tồn tại
  if (!fromWallet) throw new Error('Không tìm thấy ví gửi.');
  if (!toWallet) throw new Error('Không tìm thấy ví nhận.');

  // 4. Kiểm tra is_active
  if (!fromWallet.isActive) {
    throw new Error(
      `Ví gửi "${fromWallet.displayName}" đã bị ẩn hoặc không còn hoạt động.`,
    );
  }
  if (!toWallet.isActive) {
    throw new Error(
      `Ví nhận "${toWallet.displayName}" đã bị ẩn hoặc không còn hoạt động.`,
    );
  }

  // 6. Kiểm tra số dư (Chỉ ví thường mới chặn âm, ví credit được phép âm)
  if (fromWallet.walletType !== 'credit') {
    const currentBalance = Number(fromWallet.currentBalance) || 0;
    if (currentBalance < data.amount) {
      throw new Error(`Số dư ví "${fromWallet.displayName}" không đủ.`);
    }
  }

  // 7. Tạo transaction transfer
  return createTransaction({
    amount: data.amount,
    note: `${data.note ? data.note : 'Chuyển khoản'}: ${
      fromWallet.displayName
    } → ${toWallet.displayName}`,
    type: 'transfer',
    date: data.date ?? Date.now(),
    categoryId: data.categoryId,
    walletId: data.fromWalletId,
    toWalletId: data.toWalletId,
    userId: data.userId,
  });
};
