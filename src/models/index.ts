import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import schema from './schema';
import Transaction from './Transaction';
import Category from './Category';
import Wallet from './Wallet';
import migrations from './migrations';

// Khởi tạo Adapter
const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: true,
  onSetUpError: error => {
    console.error('Lỗi khởi tạo WatermelonDB:', error);
  },
});

// Khởi tạo Database instance
export const database = new Database({
  adapter,
  modelClasses: [Transaction, Wallet, Category],
});

// Định nghĩa kiểu dữ liệu cho toàn bộ App sử dụng
export type AppDatabase = typeof database;
