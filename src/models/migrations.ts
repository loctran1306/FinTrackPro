import {
  createTable,
  schemaMigrations,
} from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        createTable({
          name: 'installments',
          columns: [
            { name: 'user_id', type: 'string' },
            { name: 'wallet_id', type: 'string', isIndexed: true },
            { name: 'name', type: 'string' },
            { name: 'total_amount', type: 'number' },
            { name: 'fee_amount', type: 'number' },
            { name: 'tenure_months', type: 'number' },
            { name: 'start_date', type: 'number' },
            { name: 'status', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
            { name: 'deleted_at', type: 'number', isOptional: true },
          ],
        }),
        createTable({
          name: 'installment_items',
          columns: [
            { name: 'installment_id', type: 'string', isIndexed: true },
            {
              name: 'transaction_id',
              type: 'string',
              isOptional: true,
              isIndexed: true,
            },
            { name: 'due_date', type: 'number' },
            { name: 'amount', type: 'number' },
            { name: 'period_number', type: 'number' },
            { name: 'status', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
  ],
});
