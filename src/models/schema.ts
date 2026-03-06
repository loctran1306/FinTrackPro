import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'transactions',
      columns: [
        { name: 'amount', type: 'number' },
        { name: 'category_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'type', type: 'string' }, // income/expense/transfer
        { name: 'note', type: 'string' },
        { name: 'date', type: 'number' },
        { name: 'wallet_id', type: 'string', isIndexed: true },
        {
          name: 'to_wallet_id',
          type: 'string',
          isOptional: true,
          isIndexed: true,
        },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'wallets',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'display_name', type: 'string' },
        { name: 'wallet_type', type: 'string' },
        { name: 'initial_balance', type: 'number' },
        { name: 'current_balance', type: 'number' },
        { name: 'credit_limit', type: 'number', isOptional: true },
        { name: 'statement_day', type: 'number', isOptional: true },
        { name: 'payment_due_day', type: 'number', isOptional: true },
        { name: 'is_active', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'categories',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'limit', type: 'number', isOptional: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'icon', type: 'string' },
        { name: 'color', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' }, // Thêm để đồng bộ
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),
  ],
});
