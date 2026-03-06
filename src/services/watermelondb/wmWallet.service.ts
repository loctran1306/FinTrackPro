import { database } from '@/models';
import Wallet from '@/models/Wallet';
import { syncData } from '@/services/sync/syncDataSupabase';
import { Observable } from 'rxjs';
import { Q } from '@nozbe/watermelondb';

export const observeWallets = (userId: string): Observable<Wallet[]> => {
  return database.collections
    .get<Wallet>('wallets')
    .query(Q.where('user_id', userId), Q.sortBy('display_name', Q.asc))
    .observeWithColumns(['display_name', 'wallet_type', 'current_balance']);
};

export const observeCreditWallets = (userId: string): Observable<Wallet[]> => {
  return database.collections
    .get<Wallet>('wallets')
    .query(
      Q.where('user_id', userId),
      Q.where('wallet_type', Q.eq('credit')),
      Q.sortBy('display_name', Q.asc),
    )
    .observeWithColumns(['display_name', 'wallet_type', 'current_balance']);
};

export const observePaymentWallets = (userId: string): Observable<Wallet[]> => {
  return database.collections
    .get<Wallet>('wallets')
    .query(
      Q.where('user_id', userId),
      Q.where('wallet_type', Q.notIn(['credit'])),
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
  await database.write(async () => {
    await database.get<Wallet>('wallets').create(w => {
      w.displayName = data.displayName;
      w.walletType = data.walletType;
      w.initialBalance = data.initialBalance;
      w.currentBalance = data.initialBalance; // Mới tạo thì balance = initial
      w.userId = data.userId;
      w.isActive = true;
      if (data.creditLimit) w.creditLimit = data.creditLimit;
    });
  });
  syncData().catch(console.error);
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
export const deleteWallet = async (wallet: Wallet) => {
  await database.write(async () => {
    await wallet.markAsDeleted();
  });
  syncData().catch(console.error);
};
