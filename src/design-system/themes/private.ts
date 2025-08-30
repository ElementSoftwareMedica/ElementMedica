/**
 * Design System - Private Theme
 * Tema per il frontend privato (tonalità di blu più scura)
 */

export const privateTheme = {
  name: 'private',
  colors: {
    // Primary colors - Blu più scuro per il privato
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6', // Blu principale più scuro
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554',
    },
    
    // Secondary colors - Indaco per accenti
    secondary: {
      50: '#eef2ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#6366f1', // Indaco principale
      600: '#4f46e5',
      700: '#4338ca',
      800: '#3730a3',
      900: '#312e81',
    },
    
    // Accent colors - Viola per accenti
    accent: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7', // Viola principale
      600: '#9333ea',
      700: '#7c3aed',
      800: '#6b21a8',
      900: '#581c87',
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
      secondary: '#f8fafc', // Sfondo grigio neutro
      tertiary: '#f1f5f9',
      inverse: '#1e3a8a',
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
      focus: '#3b82f6', // Blu scuro per focus
      error: '#ef4444',
      success: '#22c55e',
    },
  },
} as const;

// CSS Variables per il tema privato
export const privateThemeCSSVars = {
  // Primary colors
  '--color-primary-50': privateTheme.colors.primary[50],
  '--color-primary-100': privateTheme.colors.primary[100],
  '--color-primary-200': privateTheme.colors.primary[200],
  '--color-primary-300': privateTheme.colors.primary[300],
  '--color-primary-400': privateTheme.colors.primary[400],
  '--color-primary-500': privateTheme.colors.primary[500],
  '--color-primary-600': privateTheme.colors.primary[600],
  '--color-primary-700': privateTheme.colors.primary[700],
  '--color-primary-800': privateTheme.colors.primary[800],
  '--color-primary-900': privateTheme.colors.primary[900],
  '--color-primary-950': privateTheme.colors.primary[950],
  
  // Secondary colors
  '--color-secondary-50': privateTheme.colors.secondary[50],
  '--color-secondary-100': privateTheme.colors.secondary[100],
  '--color-secondary-200': privateTheme.colors.secondary[200],
  '--color-secondary-300': privateTheme.colors.secondary[300],
  '--color-secondary-400': privateTheme.colors.secondary[400],
  '--color-secondary-500': privateTheme.colors.secondary[500],
  '--color-secondary-600': privateTheme.colors.secondary[600],
  '--color-secondary-700': privateTheme.colors.secondary[700],
  '--color-secondary-800': privateTheme.colors.secondary[800],
  '--color-secondary-900': privateTheme.colors.secondary[900],
  
  // Accent colors
  '--color-accent-50': privateTheme.colors.accent[50],
  '--color-accent-100': privateTheme.colors.accent[100],
  '--color-accent-200': privateTheme.colors.accent[200],
  '--color-accent-300': privateTheme.colors.accent[300],
  '--color-accent-400': privateTheme.colors.accent[400],
  '--color-accent-500': privateTheme.colors.accent[500],
  '--color-accent-600': privateTheme.colors.accent[600],
  '--color-accent-700': privateTheme.colors.accent[700],
  '--color-accent-800': privateTheme.colors.accent[800],
  '--color-accent-900': privateTheme.colors.accent[900],
  
  // Semantic colors
  '--color-success': privateTheme.colors.semantic.success[500],
  '--color-warning': privateTheme.colors.semantic.warning[500],
  '--color-error': privateTheme.colors.semantic.error[500],
  
  // Background colors
  '--color-bg-primary': privateTheme.colors.background.primary,
  '--color-bg-secondary': privateTheme.colors.background.secondary,
  '--color-bg-tertiary': privateTheme.colors.background.tertiary,
  '--color-bg-inverse': privateTheme.colors.background.inverse,
  
  // Text colors
  '--color-text-primary': privateTheme.colors.text.primary,
  '--color-text-secondary': privateTheme.colors.text.secondary,
  '--color-text-tertiary': privateTheme.colors.text.tertiary,
  '--color-text-inverse': privateTheme.colors.text.inverse,
  '--color-text-disabled': privateTheme.colors.text.disabled,
  
  // Border colors
  '--color-border-primary': privateTheme.colors.border.primary,
  '--color-border-secondary': privateTheme.colors.border.secondary,
  '--color-border-focus': privateTheme.colors.border.focus,
  '--color-border-error': privateTheme.colors.border.error,
  '--color-border-success': privateTheme.colors.border.success,
} as const;

export type PrivateTheme = typeof privateTheme;