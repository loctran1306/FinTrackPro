import { Model } from '@nozbe/watermelondb';
import {
  field,
  date,
  readonly,
  children,
} from '@nozbe/watermelondb/decorators';

export default class Wallet extends Model {
  static table = 'wallets';

  @field('user_id') userId!: string;
  @field('display_name') displayName!: string;
  @field('wallet_type') walletType!: string; // e.g., 'cash', 'credit', 'bank'
  @field('initial_balance') initialBalance!: number;
  @field('current_balance') currentBalance!: number;

  // Các trường cho thẻ tín dụng
  @field('credit_limit') creditLimit?: number | null;
  @field('statement_day') statementDay?: number | null;
  @field('payment_due_day') payment_due_day?: number | null;

  @field('is_active') isActive!: boolean;
  @field('deleted_at') deletedAt?: number | null;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @children('transactions') transactions!: any;
}
