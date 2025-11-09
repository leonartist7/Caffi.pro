export const colors = {
  // Primary coffee colors
  primary: '#6F4E37', // Coffee brown
  primaryLight: '#8B6F47',
  primaryDark: '#5A3E2B',

  // Accent colors
  accent: '#D4A574', // Latte/cream
  accentLight: '#E8C9A0',
  accentDark: '#C08B4F',

  // Secondary colors
  secondary: '#2D2424', // Dark roast
  secondaryLight: '#4A3F3F',

  // Semantic colors
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',

  // Grays
  gray50: '#FAFAFA',
  gray100: '#F5F5F5',
  gray200: '#EEEEEE',
  gray300: '#E0E0E0',
  gray400: '#BDBDBD',
  gray500: '#9E9E9E',
  gray600: '#757575',
  gray700: '#616161',
  gray800: '#424242',
  gray900: '#212121',

  // Background colors
  background: '#FFFFFF',
  backgroundSecondary: '#F8F6F4',

  // Text colors
  textPrimary: '#2D2424',
  textSecondary: '#757575',
  textTertiary: '#9E9E9E',
  textOnPrimary: '#FFFFFF',

  // Border colors
  border: '#E0E0E0',
  borderLight: '#F5F5F5',

  // Card colors
  card: '#FFFFFF',
  cardShadow: 'rgba(0, 0, 0, 0.1)',
} as const;

export type ColorKey = keyof typeof colors;
