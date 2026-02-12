import { ThemeMode } from '@/store/global/global.slice';
import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV();

const THEME_KEY = 'user_theme_preference';

export const storageUtils = {
  // Lưu theme (Sáng/Tối)
  setTheme: (mode: ThemeMode) => {
    storage.set(THEME_KEY, mode);
  },

  // Lấy theme đã lưu (Đồng bộ, không cần await)
  getTheme: (): ThemeMode => {
    const saved = storage.getString(THEME_KEY);
    return (saved as ThemeMode) || 'system';
  },
};
