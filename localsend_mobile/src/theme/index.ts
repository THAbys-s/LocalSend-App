// src/theme/index.ts

export const Colors = {
  primary: '#00C896',
  primaryDark: '#00A07A',
  primaryLight: '#33D4AB',

  light: {
    background: '#F8FAFB',
    surface: '#FFFFFF',
    border: '#E8EDF2',
    text: '#0D1117',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
  },
  dark: {
    background: '#0D1117',
    surface: '#161B22',
    border: '#30363D',
    text: '#F0F6FC',
    textSecondary: '#8B949E',
    textMuted: '#484F58',
  },

  success: '#00C896',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

export const Typography = {
  sizes: { xs: 11, sm: 13, base: 15, md: 17, lg: 20, xl: 24 },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const Spacing = { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32 };
export const Radius  = { sm: 6, md: 12, lg: 16, xl: 24, full: 999 };
