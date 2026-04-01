/**
 * Design System - Public Theme
 * Tema per il frontend pubblico
 * 
 * New palette (2026):
 * ElementMedica: #A0C8C1 (verde salvia primary) + #283646 (dark navy) + #EDF1EE (light sage accent)
 * ElementSicurezza: #E9BA49 (amber/gold primary) + #283646 (dark navy) + #A0C8C1 (verde salvia accent)
 * 
 * Brand detection via VITE_BRAND_ID — primary and accent colors swap per brand.
 */

import { getCurrentBrand } from '../../config/brands.config';

// Verde Salvia scale — #A0C8C1 at 500
const verdeSalviaScale = {
  50: '#F5F9F9',
  100: '#ECF4F3',
  200: '#D9E9E6',
  300: '#C6DEDA',
  400: '#B3D3CD',
  500: '#A0C8C1',
  600: '#7FB3AB',
  700: '#5F9B92',
  800: '#437D74',
  900: '#2D5E56',
  950: '#1E433D',
} as const;

// Amber/Gold scale — #E9BA49 at 500
const amberScale = {
  50: '#FFFBF0',
  100: '#FEF3D7',
  200: '#FDE6AF',
  300: '#F9D584',
  400: '#F2C968',
  500: '#E9BA49',
  600: '#D4A530',
  700: '#B08A22',
  800: '#876919',
  900: '#634D13',
  950: '#47360D',
} as const;

// Detect current brand
const currentBrandId = getCurrentBrand().id;
const isSicurezza = currentBrandId === 'element-sicurezza';

export const publicTheme = {
  name: 'public',
  colors: {
    // Primary colors — brand-specific
    // Sicurezza: Amber #E9BA49 | Medica: Verde Salvia #A0C8C1
    primary: isSicurezza ? amberScale : verdeSalviaScale,

    // Secondary colors - Dark Navy #283646 at 800 (shared by both brands)
    secondary: {
      50: '#F0F2F4',
      100: '#D9DEE3',
      200: '#B3BCC5',
      300: '#8C9AA8',
      400: '#66778A',
      500: '#4D5E6F',
      600: '#3B4A59',
      700: '#313F4E',
      800: '#283646',
      900: '#1E2832',
      950: '#19232D',
    },

    // Accent colors — brand-specific (swapped from primary)
    // Sicurezza: Verde Salvia (#A0C8C1) | Medica: Light Sage (#EDF1EE)
    accent: isSicurezza ? verdeSalviaScale : {
      50: '#FAFBFA',
      100: '#EDF1EE',
      200: '#DDE3DE',
      300: '#C5CFC7',
      400: '#A8B5AB',
      500: '#8A9A8E',
      600: '#6E7F72',
      700: '#556259',
      800: '#3D4840',
      900: '#282F2A',
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
      secondary: '#FAFBFA',
      tertiary: '#EDF1EE',
      inverse: '#283646',
    },

    // Text colors
    text: {
      primary: '#1E2832',
      secondary: '#4D5E6F',
      tertiary: '#66778A',
      inverse: '#ffffff',
      disabled: '#8C9AA8',
    },

    // Border colors
    border: {
      primary: '#DDE3DE',
      secondary: '#C5CFC7',
      focus: isSicurezza ? amberScale[500] : verdeSalviaScale[500],
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
  '--color-secondary-950': publicTheme.colors.secondary[950],

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