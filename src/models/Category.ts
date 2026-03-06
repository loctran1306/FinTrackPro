import { Model } from '@nozbe/watermelondb';
import {
  field,
  date,
  readonly,
  children,
} from '@nozbe/watermelondb/decorators';

export default class Category extends Model {
  static table = 'categories';

  @field('name') name!: string;
  @field('limit') limit?: number | null;
  @field('user_id') userId!: string;
  @field('icon') icon!: string;
  @field('color') color!: string;
  @field('deleted_at') deletedAt?: number | null;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @children('transactions') transactions!: any;
}
