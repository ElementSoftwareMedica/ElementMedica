/**
 * Design System - Public Theme
 * Tema per il frontend pubblico (tonalità di blu più chiara)
 */

export const publicTheme = {
  name: 'public',
  colors: {
    // Primary colors - Blu cielo per il pubblico
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9', // Blu cielo principale
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
      950: '#082f49',
    },
    
    // Secondary colors - Teal per accenti
    secondary: {
      50: '#f0fdfa',
      100: '#ccfbf1',
      200: '#99f6e4',
      300: '#5eead4',
      400: '#2dd4bf',
      500: '#14b8a6', // Teal principale
      600: '#0d9488',
      700: '#0f766e',
      800: '#115e59',
      900: '#134e4a',
    },
    
    // Accent colors - Verde acqua
    accent: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981', // Verde acqua
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
    },
    
    // Semantic colors (comuni)
    semantic: {
      success: {
        50: '#f0fdf4',
        100: '#dcfce7',
        200: '#bbf7d0',
        300: '#86efac',
        400: '#4ade80',
        500: '#22c55e',
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
        500: '#f59e0b',
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
        500: '#ef4444',
        600: '#dc2626',
        700: '#b91c1c',
        800: '#991b1b',
        900: '#7f1d1d',
      },
    },
    
    // Neutral colors
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
    
    // Background colors
    background: {
      primary: '#ffffff',
      secondary: '#f0f9ff', // Sfondo blu molto chiaro
      tertiary: '#e0f2fe',
      inverse: '#0c4a6e',
    },
    
    // Text colors
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      tertiary: '#64748b',
      inverse: '#ffffff',
      disabled: '#94a3b8',
    },
    
    // Border colors
    border: {
      primary: '#e2e8f0',
      secondary: '#cbd5e1',
      focus: '#0ea5e9', // Blu cielo per focus
      error: '#ef4444',
      success: '#22c55e',
    },
  },
} as const;

// CSS Variables per il tema pubblico
export const publicThemeCSSVars = {
  // Primary colors
  '--color-primary-50': publicTheme.colors.primary[50],
  '--color-primary-100': publicTheme.colors.primary[100],
  '--color-primary-200': publicTheme.colors.primary[200],
  '--color-primary-300': publicTheme.colors.primary[300],
  '--color-primary-400': publicTheme.colors.primary[400],
  '--color-primary-500': publicTheme.colors.primary[500],
  '--color-primary-600': publicTheme.colors.primary[600],
  '--color-primary-700': publicTheme.colors.primary[700],
  '--color-primary-800': publicTheme.colors.primary[800],
  '--color-primary-900': publicTheme.colors.primary[900],
  '--color-primary-950': publicTheme.colors.primary[950],
  
  // Secondary colors
  '--color-secondary-50': publicTheme.colors.secondary[50],
  '--color-secondary-100': publicTheme.colors.secondary[100],
  '--color-secondary-200': publicTheme.colors.secondary[200],
  '--color-secondary-300': publicTheme.colors.secondary[300],
  '--color-secondary-400': publicTheme.colors.secondary[400],
  '--color-secondary-500': publicTheme.colors.secondary[500],
  '--color-secondary-600': publicTheme.colors.secondary[600],
  '--color-secondary-700': publicTheme.colors.secondary[700],
  '--color-secondary-800': publicTheme.colors.secondary[800],
  '--color-secondary-900': publicTheme.colors.secondary[900],
  
  // Accent colors
  '--color-accent-50': publicTheme.colors.accent[50],
  '--color-accent-100': publicTheme.colors.accent[100],
  '--color-accent-200': publicTheme.colors.accent[200],
  '--color-accent-300': publicTheme.colors.accent[300],
  '--color-accent-400': publicTheme.colors.accent[400],
  '--color-accent-500': publicTheme.colors.accent[500],
  '--color-accent-600': publicTheme.colors.accent[600],
  '--color-accent-700': publicTheme.colors.accent[700],
  '--color-accent-800': publicTheme.colors.accent[800],
  '--color-accent-900': publicTheme.colors.accent[900],
  
  // Semantic colors
  '--color-success': publicTheme.colors.semantic.success[500],
  '--color-warning': publicTheme.colors.semantic.warning[500],
  '--color-error': publicTheme.colors.semantic.error[500],
  
  // Background colors
  '--color-bg-primary': publicTheme.colors.background.primary,
  '--color-bg-secondary': publicTheme.colors.background.secondary,
  '--color-bg-tertiary': publicTheme.colors.background.tertiary,
  '--color-bg-inverse': publicTheme.colors.background.inverse,
  
  // Text colors
  '--color-text-primary': publicTheme.colors.text.primary,
  '--color-text-secondary': publicTheme.colors.text.secondary,
  '--color-text-tertiary': publicTheme.colors.text.tertiary,
  '--color-text-inverse': publicTheme.colors.text.inverse,
  '--color-text-disabled': publicTheme.colors.text.disabled,
  
  // Border colors
  '--color-border-primary': publicTheme.colors.border.primary,
  '--color-border-secondary': publicTheme.colors.border.secondary,
  '--color-border-focus': publicTheme.colors.border.focus,
  '--color-border-error': publicTheme.colors.border.error,
  '--color-border-success': publicTheme.colors.border.success,
} as const;

export type PublicTheme = typeof publicTheme;