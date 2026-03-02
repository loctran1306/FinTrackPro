// Chuyển đổi số tiền từ UI sang DB
export const convertToDbAmount = (uiAmount: number): number => {
  return uiAmount / 1000;
};

// Chuyển đổi số tiền từ DB sang UI
export const convertFromDbAmount = (dbAmount: number): number => {
  return dbAmount * 1000;
};

// Parse chuỗi nhập (vd: "8.000.000" hoặc "8000000") → số VND (UI)
export const parseVNDInput = (input: string): number => {
  const cleaned = input.replace(/\D/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
};

// Format số để hiển thị input (vd: 8000000 → "8.000.000")
export const formatVNDInput = (amount: number): string => {
  if (amount <= 0) return '';
  return new Intl.NumberFormat('vi-VN').format(amount);
};

// Format số tiền thành định dạng VND
export const formatVND = (
  dbAmount: number,
  hidden: boolean = false,
): string => {
  if (hidden) {
    return '**********';
  }
  if (dbAmount === 0) {
    return '0';
  }
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(convertFromDbAmount(dbAmount));
};
