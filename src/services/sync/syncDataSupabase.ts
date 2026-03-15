import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from '@/models';
import { supabase } from '@/lib/supabase';
import { Q } from '@nozbe/watermelondb';
import NetInfo from '@react-native-community/netinfo';
import {
  formatPayloadForSupabase,
  formatPullDataFromSupabase,
} from '../watermelondb/helper/wmTime.helper';

import { store } from '@/store/store';

// ── Sync lock: WatermelonDB không cho phép 2 synchronize() chạy cùng lúc ──
let isSyncing = false;
let pendingSync = false;

export async function syncData() {
  // Check flag cho phép sync (dùng cho testing/debug)
  const { isSyncEnabled } = store.getState().global;
  if (!isSyncEnabled) {
    console.log('🛑 Sync is disabled by user/test flag');
    pendingSync = true;
    return;
  }

  // Check network trước khi sync
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    pendingSync = true; // Đánh dấu để sync khi có mạng lại
    return;
  }
  if (isSyncing) {
    // Đánh dấu có sync đang chờ
    pendingSync = true;
    return;
  }

  isSyncing = true;
  pendingSync = false;

  try {
    await synchronize({
      database,
      pullChanges: async ({ lastPulledAt }) => {
        const { data, error } = await supabase.rpc('pull_data', {
          last_pulled_at: lastPulledAt || 0,
        });

        if (error) throw error;
        const formattedChanges = formatPullDataFromSupabase(data.changes);
        console.log('Đồng bộ thành công', formattedChanges);
        return { changes: formattedChanges, timestamp: data.timestamp };
      },
      pushChanges: async ({ changes }) => {
        const rawChanges = changes as any;

        const safeSecond = formatPayloadForSupabase(rawChanges);
        const { error: err } = await supabase.rpc('push_data', {
          changes: safeSecond,
        });
        if (err) throw err;
        console.log('Đẩy dữ liệu thành công', safeSecond);
      },
      migrationsEnabledAtVersion: 1,
      sendCreatedAsUpdated: true,
    });
  } catch (error: any) {
    // Phân biệt lỗi network thật sự trong quá trình sync
    const isNetworkError =
      error?.message?.includes('Network') ||
      error?.message?.includes('fetch') ||
      error?.message?.includes('network');

    if (isNetworkError) {
      console.log(
        '📡 Sync tạm dừng: Lỗi kết nối mạng (Network request failed)',
      );
      pendingSync = true;
    } else {
      console.error('❌ Lỗi đồng bộ hệ thống:', error);
    }
  } finally {
    isSyncing = false;
    // Nếu có sync đang chờ → chạy lại 1 lần nữa
    if (pendingSync) {
      syncData().catch(console.error);
    }
  }
}

/**
 * Xoá toàn bộ dữ liệu local (transactions, wallets, categories),
 * reset sync metadata, rồi pull dữ liệu mới từ Supabase.
 */
export async function clearAndPullData() {
  try {
    console.log('Bắt đầu xoá toàn bộ dữ liệu local...');

    // Xoá tất cả records trong từng bảng
    await database.write(async () => {
      const tableNames = ['transactions', 'wallets', 'categories'] as const;

      for (const tableName of tableNames) {
        const allRecords = await database
          .get(tableName)
          .query(Q.where('id', Q.notEq('')))
          .fetch();
        console.log(`Xoá ${allRecords.length} records từ bảng ${tableName}`);
        for (const record of allRecords) {
          await record.destroyPermanently();
        }
      }
    });

    console.log('Đã xoá xong dữ liệu local!');

    // Reset sync metadata (lastPulledAt) để pull lại toàn bộ
    await database.adapter.unsafeResetDatabase();
    console.log('Đã reset sync metadata!');

    // Pull dữ liệu mới từ Supabase
    console.log('Bắt đầu pull dữ liệu mới...');
    await syncData();
    console.log('Đã pull xong dữ liệu mới!');
  } catch (error) {
    console.error('Lỗi clearAndPullData:', error);
    throw error;
  }
}
