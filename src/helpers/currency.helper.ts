// Chuyển đổi số tiền từ UI sang DB
export const convertToDbAmount = (uiAmount: number): number => {
  return uiAmount / 1000;
};

// Chuyển đổi số tiền từ DB sang UI
export const convertFromDbAmount = (dbAmount: number): number => {
  return dbAmount * 1000;
};

// Format số tiền thành định dạng VND
export const formatVND = (
  dbAmount: number,
  hidden: boolean = false,
): string => {
  if (hidden) {
    return '**********';
  }
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(convertFromDbAmount(dbAmount));
};
