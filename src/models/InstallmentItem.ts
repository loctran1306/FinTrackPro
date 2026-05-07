import { Model } from '@nozbe/watermelondb';
import {
  date,
  field,
  readonly,
  relation,
} from '@nozbe/watermelondb/decorators';
import Installment from './Installment';
import Transaction from './Transaction';

export default class InstallmentItem extends Model {
  static table = 'installment_items';

  @field('installment_id') installmentId!: string;
  @field('transaction_id') transactionId?: string | null;
  @field('due_date') dueDate!: number;
  @field('amount') amount!: number;
  @field('period_number') periodNumber!: number;
  @field('status') status!: string;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('installments', 'installment_id') installment!: Installment;
  @relation('transactions', 'transaction_id') transaction!: Transaction;
}
