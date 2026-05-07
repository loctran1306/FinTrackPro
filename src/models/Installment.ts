import { Model } from '@nozbe/watermelondb';
import {
  children,
  date,
  field,
  readonly,
  relation,
} from '@nozbe/watermelondb/decorators';
import Wallet from './Wallet';

export default class Installment extends Model {
  static table = 'installments';

  @field('user_id') userId!: string;
  @field('wallet_id') walletId!: string;
  @field('name') name!: string;
  @field('total_amount') totalAmount!: number;
  @field('fee_amount') feeAmount!: number;
  @field('tenure_months') tenureMonths!: number;
  @field('start_date') startDate!: number;
  @field('status') status!: string;
  @field('deleted_at') deletedAt?: number | null;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('wallets', 'wallet_id') wallet!: Wallet;
  @children('installment_items') items!: any;
}
