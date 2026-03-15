import { TFunction } from 'i18next';
import LunarCalendar from 'lunar-calendar';
import { LOCALE_EN } from '@/constants/locale.const';

const getLunarDateString = (d: Date): string => {
  const lunar = LunarCalendar.solarToLunar(
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate(),
  );
  return `${lunar.lunarDay}/${lunar.lunarMonth}`;
};

export const formatDateGroupLabel = (
  date: Date | string,
  t: TFunction,
): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return t('time.today');
  if (d.toDateString() === yesterday.toDateString()) return t('time.yesterday');
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const DAYS_VI = [
  'Chủ Nhật',
  'Thứ 2',
  'Thứ 3',
  'Thứ 4',
  'Thứ 5',
  'Thứ 6',
  'Thứ 7',
];

export const formatDayOfWeek = (date?: Date | string | number): string => {
  const d =
    date == null
      ? new Date()
      : typeof date === 'string' || typeof date === 'number'
      ? new Date(date)
      : date;
  return DAYS_VI[(d as Date).getDay()];
};

export const formatDayAndDate = (
  date?: Date | string | number,
  lang: 'vi' | 'en' = 'vi',
  includeLunar = true,
): string => {
  const d =
    date == null
      ? new Date()
      : typeof date === 'string' || typeof date === 'number'
      ? new Date(date)
      : date;
  const dateObj = d as Date;
  const day = dateObj.getDate();
  const monthIndex = dateObj.getMonth();
  const dayIndex = dateObj.getDay();
  let main = '';
  if (lang === 'en') {
    const dayOfWeek = LOCALE_EN.dayNames[dayIndex];
    const monthName = LOCALE_EN.monthNames[monthIndex];
    main = `${dayOfWeek}, ${monthName} ${day}`;
  } else {
    const dayOfWeek = DAYS_VI[dayIndex];
    main = `${dayOfWeek}, ngày ${day} tháng ${monthIndex + 1}`;
  }
  const lunar = includeLunar ? ` (${getLunarDateString(dateObj)})` : '';
  return `${main}${lunar}`;
};

export const formatTimeShort = (date: Date | string | number): string => {
  if (typeof date === 'string' || typeof date === 'number') {
    date = new Date(date);
  }
  return (date as Date).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatTime = (date: Date | string | number) => {
  if (typeof date === 'string' || typeof date === 'number') {
    date = new Date(date);
  }
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
