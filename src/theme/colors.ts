export interface ColorScheme {
  primary: string;
  secondary: string;
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  border: string;
  borderSecondary: string;
}

export const lightColors: ColorScheme = {
  primary: '#111827',
  secondary: '#C1FF83',
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textDisabled: '#9CA3AF',
  bgPrimary: '#FFFFFF',
  bgSecondary: '#f3f4f6',
  bgTertiary: '#e5e7eb',
  border: '#e5e7eb',
  borderSecondary: '#d1d5db',
};

export const darkColors: ColorScheme = {
  primary: '#ffffff',
  secondary: '#303030',
  textPrimary: '#fff',
  textSecondary: '#f3f3f3',
  textDisabled: '#8A8A8A',
  bgPrimary: '#292929',
  bgSecondary: '#2F2F2F',
  bgTertiary: '#393939',
  border: '#ffffff26',
  borderSecondary: '#ffffff0d',
};
