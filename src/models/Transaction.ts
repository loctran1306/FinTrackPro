import { Model } from '@nozbe/watermelondb';
import {
  field,
  date,
  readonly,
  relation,
} from '@nozbe/watermelondb/decorators';
import Category from './Category';
import Wallet from './Wallet';

export default class Transaction extends Model {
  static table = 'transactions';

  @field('user_id') userId!: string;
  @field('category_id') categoryId!: string;
  @field('wallet_id') walletId!: string;
  @field('to_wallet_id') toWalletId?: string | null; // Dùng cho transfer

  @field('amount') amount!: number;
  @field('type') type!: string; // 'income', 'expense', 'transfer'
  @field('note') note!: string;
  @field('date') date!: number;

  @field('deleted_at') deletedAt?: number | null;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('categories', 'category_id') category!: Category;
  @relation('wallets', 'wallet_id') wallet!: Wallet;
  @relation('wallets', 'to_wallet_id') toWallet!: Wallet;
}
