// src/locales/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resources } from './translate';
import { KEY_LOCALE_STORAGE } from '@/constants/locale.const';

// 1. Tạo hàm khởi tạo riêng để xử lý bất đồng bộ mượt mà hơn
const initI18n = async () => {
  let savedLanguage = 'vi'; // Mặc định là 'vi'

  try {
    const lang = await AsyncStorage.getItem(KEY_LOCALE_STORAGE);
    if (lang) {
      savedLanguage = lang;
    }
  } catch (error) {
    console.error('Failed to load language from storage:', error);
  }

  await i18n.use(initReactI18next).init({
    resources,
    lng: savedLanguage, // Sử dụng ngôn ngữ đã lưu ngay từ khi khởi tạo
    fallbackLng: 'vi',
    compatibilityJSON: 'v4',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false, // React Native không hỗ trợ Suspense tốt như Web
    },
  });
};

// Gọi hàm khởi tạo
initI18n();

export default i18n;
