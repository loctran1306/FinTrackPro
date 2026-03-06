import dayjs from 'dayjs';

export const getStartOfMonth = (month: number, year: number) => {
  const startOfMonth = dayjs()
    .year(year)
    .month(month - 1)
    .startOf('month')
    .valueOf();
  return startOfMonth;
};

export const getEndOfMonth = (month: number, year: number) => {
  const endOfMonth = dayjs()
    .year(year)
    .month(month - 1)
    .endOf('month')
    .valueOf();
  return endOfMonth;
};

// Các trường thời gian cần convert
const timeFields = ['date', 'created_at', 'updated_at', 'deleted_at'];

// Các trường UUID — PostgreSQL không chấp nhận "" làm UUID, cần convert thành null
const uuidFields = ['category_id', 'wallet_id', 'to_wallet_id', 'user_id'];

// Hàm đệ quy hoặc lặp để format payload trước khi gửi
export const formatPayloadForSupabase = (changes: any) => {
  const formattedChanges = JSON.parse(JSON.stringify(changes)); // Clone object để an toàn

  for (const table in formattedChanges) {
    const tableChanges = formattedChanges[table];

    // Xử lý mảng created và updated
    ['created', 'updated'].forEach(action => {
      if (tableChanges[action]) {
        tableChanges[action] = tableChanges[action].map((record: any) => {
          // Lặp qua các trường thời gian, nếu có và là số thì convert sang ISO String
          timeFields.forEach(field => {
            if (record[field] && typeof record[field] === 'number') {
              record[field] = new Date(record[field]).toISOString();
            }
          });
          // Sanitize UUID fields: "" → null (PostgreSQL rejects empty string as UUID)
          uuidFields.forEach(field => {
            if (field in record && record[field] === '') {
              record[field] = null;
            }
          });
          return record;
        });
      }
    });
  }

  return formattedChanges;
};
// Hàm convert ngược: ISO String → timestamp (số) cho pullChanges
// Supabase trả về date dạng ISO string, WatermelonDB cần milliseconds
export const formatPullDataFromSupabase = (changes: any) => {
  const formattedChanges = JSON.parse(JSON.stringify(changes)); // Clone object

  for (const table in formattedChanges) {
    const tableChanges = formattedChanges[table];

    // Convert ISO string → timestamp cho cả created và updated
    ['created', 'updated'].forEach(action => {
      if (tableChanges[action]) {
        tableChanges[action] = tableChanges[action].map((record: any) => {
          timeFields.forEach(field => {
            if (record[field] && typeof record[field] === 'string') {
              const ts = new Date(record[field]).getTime();
              record[field] = isNaN(ts) ? null : ts;
            }
          });
          return record;
        });
      }
    });

    // sendCreatedAsUpdated: true → gộp tất cả `created` vào `updated`
    // WatermelonDB yêu cầu server không gửi records trong mảng `created`
    if (tableChanges.created?.length) {
      tableChanges.updated = [
        ...(tableChanges.updated || []),
        ...tableChanges.created,
      ];
      tableChanges.created = [];
    }
  }

  return formattedChanges;
};
