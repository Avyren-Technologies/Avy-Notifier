/**
 * Modern Theme Configuration for Eagle Notifier
 * 
 * This file contains all color schemes, spacing, typography, and UI constants
 * for a modern, eye-catching design system.
 */

// Color Palette - Modern & Vibrant
export const Colors = {
  // Primary Brand Colors - Gradient Purple/Blue
  primary: {
    50: '#F0F4FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1', // Main primary
    600: '#4F46E5',
    700: '#4338CA',
    800: '#3730A3',
    900: '#312E81',
  },
  
  // Secondary Colors - Vibrant Cyan/Teal
  secondary: {
    50: '#ECFEFF',
    100: '#CFFAFE',
    200: '#A5F3FC',
    300: '#67E8F9',
    400: '#22D3EE',
    500: '#06B6D4', // Main secondary
    600: '#0891B2',
    700: '#0E7490',
    800: '#155E75',
    900: '#164E63',
  },
  
  // Accent Colors - Vibrant Pink/Purple
  accent: {
    50: '#FDF4FF',
    100: '#FAE8FF',
    200: '#F5D0FE',
    300: '#F0ABFC',
    400: '#E879F9',
    500: '#D946EF', // Main accent
    600: '#C026D3',
    700: '#A21CAF',
    800: '#86198F',
    900: '#701A75',
  },
  
  // Success Colors - Modern Green
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
  },
  
  // Warning Colors - Vibrant Orange
  warning: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316',
    600: '#EA580C',
    700: '#C2410C',
    800: '#9A3412',
    900: '#7C2D12',
  },
  
  // Error Colors - Vibrant Red
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },
  
  // Info Colors - Bright Blue
  info: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  
  // Neutral Colors
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  
  // Pure Colors
  white: '#FFFFFF',
  black: '#000000',
  
  // Transparent
  transparent: 'transparent',
};

// Theme Modes
export const LightTheme = {
  // Backgrounds
  background: {
    primary: '#FFFFFF',
    secondary: '#F8FAFC',
    tertiary: '#F1F5F9',
    elevated: '#FFFFFF',
  },
  
  // Surfaces
  surface: {
    primary: '#FFFFFF',
    secondary: '#F8FAFC',
    tertiary: '#EFF6FF',
    elevated: '#FFFFFF',
  },
  
  // Text Colors
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    tertiary: '#64748B',
    disabled: '#94A3B8',
    inverse: '#FFFFFF',
    link: '#6366F1',
  },
  
  // Border Colors
  border: {
    primary: '#E2E8F0',
    secondary: '#CBD5E1',
    focus: '#6366F1',
    error: '#EF4444',
  },
  
  // Interactive Colors
  interactive: {
    primary: '#6366F1',
    primaryHover: '#4F46E5',
    primaryActive: '#4338CA',
    secondary: '#06B6D4',
    secondaryHover: '#0891B2',
    secondaryActive: '#0E7490',
  },
  
  // Status Colors
  status: {
    success: '#22C55E',
    successLight: '#DCFCE7',
    warning: '#F97316',
    warningLight: '#FFEDD5',
    error: '#EF4444',
    errorLight: '#FEE2E2',
    info: '#3B82F6',
    infoLight: '#DBEAFE',
  },
  
  // Overlay
  overlay: 'rgba(15, 23, 42, 0.5)',
  
  // Shadow Colors
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowStrong: 'rgba(0, 0, 0, 0.2)',
};

export const DarkTheme = {
  // Backgrounds
  background: {
    primary: '#0F172A',
    secondary: '#1E293B',
    tertiary: '#334155',
    elevated: '#1E293B',
  },
  
  // Surfaces
  surface: {
    primary: '#1E293B',
    secondary: '#334155',
    tertiary: '#475569',
    elevated: '#334155',
  },
  
  // Text Colors
  text: {
    primary: '#F8FAFC',
    secondary: '#CBD5E1',
    tertiary: '#94A3B8',
    disabled: '#64748B',
    inverse: '#0F172A',
    link: '#818CF8',
  },
  
  // Border Colors
  border: {
    primary: '#334155',
    secondary: '#475569',
    focus: '#818CF8',
    error: '#F87171',
  },
  
  // Interactive Colors
  interactive: {
    primary: '#818CF8',
    primaryHover: '#6366F1',
    primaryActive: '#4F46E5',
    secondary: '#22D3EE',
    secondaryHover: '#06B6D4',
    secondaryActive: '#0891B2',
  },
  
  // Status Colors
  status: {
    success: '#4ADE80',
    successLight: 'rgba(74, 222, 128, 0.15)',
    warning: '#FB923C',
    warningLight: 'rgba(251, 146, 60, 0.15)',
    error: '#F87171',
    errorLight: 'rgba(248, 113, 113, 0.15)',
    info: '#60A5FA',
    infoLight: 'rgba(96, 165, 250, 0.15)',
  },
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
  
  // Shadow Colors
  shadow: 'rgba(0, 0, 0, 0.3)',
  shadowStrong: 'rgba(0, 0, 0, 0.5)',
};

// Typography
export const Typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
  
  fontSize: {
    xs: 10,
    sm: 12,
    base: 14,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 24,
    '4xl': 28,
    '5xl': 32,
    '6xl': 36,
    '7xl': 42,
    '8xl': 48,
  },
  
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },
};

// Spacing System (8px base)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
  '4xl': 64,
  '5xl': 80,
  '6xl': 96,
};

// Border Radius
export const BorderRadius = {
  none: 0,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
};

// Shadows
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  base: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
};

// Animation Durations
export const Animation = {
  fast: 150,
  normal: 250,
  slow: 350,
  slower: 500,
};

// Gradients
export const Gradients = {
  primary: ['#6366F1', '#8B5CF6', '#D946EF'],
  secondary: ['#06B6D4', '#3B82F6', '#6366F1'],
  accent: ['#D946EF', '#F0ABFC', '#FDE68A'],
  success: ['#10B981', '#34D399', '#6EE7B7'],
  warning: ['#F59E0B', '#FBBF24', '#FCD34D'],
  error: ['#EF4444', '#F87171', '#FCA5A5'],
  dark: ['#0F172A', '#1E293B', '#334155'],
  light: ['#F8FAFC', '#F1F5F9', '#E2E8F0'],
};

// Helper function to get theme
export const getTheme = (isDarkMode: boolean) => {
  return isDarkMode ? DarkTheme : LightTheme;
};

// Helper function to get color with opacity
export const withOpacity = (color: string, opacity: number): string => {
  // Convert hex to rgba
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export default {
  Colors,
  LightTheme,
  DarkTheme,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Animation,
  Gradients,
  getTheme,
  withOpacity,
};

