export interface ColorScheme {
  primary: string;
  secondary: string;
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  bgPrimary: string;
  bgSecondary: string;
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
  border: '#e5e7eb',
  borderSecondary: '#d1d5db',
};

export const darkColors: ColorScheme = {
  primary: '#C1FF83',
  secondary: '#111827',
  textPrimary: '#f3f4f6',
  textSecondary: '#9CA3AF',
  textDisabled: '#6B7280',
  bgPrimary: '#111827',
  bgSecondary: '#1f2937',
  border: '#374151',
  borderSecondary: '#4B5563',
};
