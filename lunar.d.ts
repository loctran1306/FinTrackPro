declare module 'lunar-calendar' {
  export interface LunarDate {
    zodiac: string; // Tuổi (vd: Tỵ)
    lunarYear: number; // Năm âm lịch
    lunarMonth: number; // Tháng âm lịch
    lunarDay: number; // Ngày âm lịch
    lunarMonthName: string; // Tên tháng
    isLeap: boolean; // Có phải tháng nhuận không
    solarTerm: string | null; // Tiết khí
  }

  export function solarToLunar(
    year: number,
    month: number,
    day: number,
  ): LunarDate;
  export function lunarToSolar(
    year: number,
    month: number,
    day: number,
    isLeap?: boolean,
  ): any;
}
