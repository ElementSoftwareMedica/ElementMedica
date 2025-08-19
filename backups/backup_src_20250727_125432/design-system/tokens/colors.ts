/**
 * Design System - Color Tokens
 * Week 8 Implementation - Component Library
 */

export const colors = {
  // Primary Brand Colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6', // Main brand color
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },

  // Secondary Colors
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },

  // Semantic Colors
  semantic: {
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e', // Main success
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b', // Main warning
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444', // Main error
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
    info: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6', // Main info (same as primary)
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
  },

  // Neutral Grays
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },

  // Background Colors
  background: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    tertiary: '#f1f5f9',
    inverse: '#0f172a',
  },

  // Text Colors
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    tertiary: '#64748b',
    inverse: '#ffffff',
    disabled: '#94a3b8',
  },

  // Border Colors
  border: {
    primary: '#e2e8f0',
    secondary: '#cbd5e1',
    focus: '#3b82f6',
    error: '#ef4444',
    success: '#22c55e',
  },

  // Interactive States
  interactive: {
    hover: '#f1f5f9',
    active: '#e2e8f0',
    disabled: '#f8fafc',
    focus: '#dbeafe',
  },
} as const;

// Type for color keys
export type ColorToken = keyof typeof colors;
export type ColorShade = keyof typeof colors.primary;

// Helper function to get color value
export const getColor = (token: string): string => {
  const keys = token.split('.');
  let value: any = colors;
  
  for (const key of keys) {
    value = value[key];
    if (value === undefined) {
      console.warn(`Color token '${token}' not found`);
      return '#000000';
    }
  }
  
  return value;
};

// CSS Custom Properties for colors
export const colorCSSVars = {
  // Primary
  '--color-primary-50': colors.primary[50],
  '--color-primary-100': colors.primary[100],
  '--color-primary-200': colors.primary[200],
  '--color-primary-300': colors.primary[300],
  '--color-primary-400': colors.primary[400],
  '--color-primary-500': colors.primary[500],
  '--color-primary-600': colors.primary[600],
  '--color-primary-700': colors.primary[700],
  '--color-primary-800': colors.primary[800],
  '--color-primary-900': colors.primary[900],
  
  // Semantic
  '--color-success': colors.semantic.success[500],
  '--color-warning': colors.semantic.warning[500],
  '--color-error': colors.semantic.error[500],
  '--color-info': colors.semantic.info[500],
  
  // Background
  '--color-bg-primary': colors.background.primary,
  '--color-bg-secondary': colors.background.secondary,
  '--color-bg-tertiary': colors.background.tertiary,
  
  // Text
  '--color-text-primary': colors.text.primary,
  '--color-text-secondary': colors.text.secondary,
  '--color-text-tertiary': colors.text.tertiary,
  
  // Border
  '--color-border-primary': colors.border.primary,
  '--color-border-secondary': colors.border.secondary,
  '--color-border-focus': colors.border.focus,
} as const;