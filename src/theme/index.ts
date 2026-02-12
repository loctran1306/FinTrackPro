import { createTheme } from '@shopify/restyle';
import { SPACING } from './constant';

export const palette = {
  // Light Palette (Bộ màu bạn chọn)
  skyBlue: '#AEE4FF',
  blueLight: '#f4fbfd',
  periwinkle: '#ff7d66',
  softPink: '#FFB8D0',
  offWhite: '#FEE5E1',
  peach: '#FFBFB3',

  white: '#FFFFFF',
  black: '#1C1C1E',
  gray: '#8E8E93',
  grayLight: '#f2f2f2',
  red: '#A80000',
  green: '#33cc33',
  orange: '#ff8000',
  blue: '#0456fb',

  // Dark Palette (Phối lại cho Dark Mode)
  deepNavy: '#0F172A',
  surfaceDark: '#1E293B',
  periwinkleDark: '#818CF8', // Sáng hơn một chút để nổi trên nền tối
};

export const COLORS = {
  main: palette.white,
  text: palette.black,
  primary: palette.periwinkle,
  card: palette.grayLight,
  secondaryText: palette.gray,
  accent: palette.softPink,
  highlight: palette.peach,
  white: palette.white,
  red: palette.red,
  black: palette.black,
  gray: palette.gray,
  green: palette.green,
  orange: palette.orange,
  blue: palette.blue,
};

export const COLORS_DARK = {
  main: palette.deepNavy,
  text: palette.white,
  primary: palette.periwinkleDark,
  card: palette.surfaceDark,
  secondaryText: palette.gray,
};

export const FONTS = {
  thin: 'LexendDeca-Thin',
  extraLight: 'LexendDeca-ExtraLight',
  light: 'LexendDeca-Light',
  regular: 'LexendDeca-Regular',
  medium: 'LexendDeca-Medium',
  semiBold: 'LexendDeca-SemiBold',
  extraBold: 'LexendDeca-ExtraBold',
  black: 'LexendDeca-Black',
  bold: 'LexendDeca-Bold',
};

export const TEXT_VARIANTS = {
  defaults: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: 'text',
  },
  header: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: 'text',
  },
  subheader: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    lineHeight: 24,
    color: 'text',
  },
  body: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: 'text',
  },
  // Chữ nội dung nhỏ hoặc mô tả (Ví dụ: Ghi chú, Thời gian)
  caption: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: 'secondaryText', // Thường là màu xám nhẹ hơn
  },
  label: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: 'secondaryText',
  },
};

// Theme Sáng
export const theme = createTheme({
  fonts: {
    thin: FONTS.thin,
    extraLight: FONTS.extraLight,
    light: FONTS.light,
    regular: FONTS.regular,
    medium: FONTS.medium,
    semiBold: FONTS.semiBold,
    extraBold: FONTS.extraBold,
    black: FONTS.black,
    bold: FONTS.bold,
  },
  colors: {
    main: COLORS.main,
    text: COLORS.text,
    secondaryText: COLORS.secondaryText,
    primary: COLORS.primary,
    card: COLORS.card,
    accent: COLORS.accent,
    highlight: COLORS.highlight,
    danger: COLORS.red,
    success: COLORS.green,
    warning: COLORS.orange,
    info: COLORS.highlight,
    white: COLORS.white,
    blue: COLORS.blue,
    gray: COLORS.gray,
  },
  spacing: SPACING,
  textVariants: TEXT_VARIANTS,
  breakpoints: { phone: 0, tablet: 768 },
});

// Theme Tối (Dark Mode)
export const darkTheme: Theme = {
  ...theme,
  colors: {
    ...theme.colors,
    main: COLORS_DARK.main,
    text: COLORS_DARK.text,
    primary: COLORS_DARK.primary,
    card: COLORS_DARK.card,
    secondaryText: COLORS_DARK.secondaryText,
  },
};

export type Theme = typeof theme;
export default theme;
