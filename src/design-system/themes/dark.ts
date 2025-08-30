/**
 * Design System - Dark Theme
 * Week 8 Implementation - Component Library
 */

import { colors } from '../tokens/colors';

export const darkTheme = {
  // Background colors
  background: {
    primary: colors.neutral[900],
    secondary: colors.neutral[800],
    tertiary: colors.neutral[700],
    elevated: colors.neutral[850],
    overlay: 'rgba(0, 0, 0, 0.8)',
  },

  // Text colors
  text: {
    primary: colors.neutral[50],
    secondary: colors.neutral[300],
    tertiary: colors.neutral[400],
    inverse: colors.neutral[900],
    disabled: colors.neutral[600],
  },

  // Border colors
  border: {
    primary: colors.neutral[700],
    secondary: colors.neutral[600],
    focus: colors.primary[400],
    error: colors.semantic.error[400],
    success: colors.semantic.success[400],
  },

  // Interactive colors
  interactive: {
    primary: {
      default: colors.primary[500],
      hover: colors.primary[400],
      active: colors.primary[300],
      disabled: colors.primary[800],
    },
    secondary: {
      default: colors.neutral[700],
      hover: colors.neutral[600],
      active: colors.neutral[500],
      disabled: colors.neutral[800],
    },
    destructive: {
      default: colors.semantic.error[500],
      hover: colors.semantic.error[400],
      active: colors.semantic.error[300],
      disabled: colors.semantic.error[800],
    },
  },

  // Status colors
  status: {
    success: {
      background: colors.semantic.success[900],
      border: colors.semantic.success[700],
      text: colors.semantic.success[200],
      icon: colors.semantic.success[400],
    },
    warning: {
      background: colors.semantic.warning[900],
      border: colors.semantic.warning[700],
      text: colors.semantic.warning[200],
      icon: colors.semantic.warning[400],
    },
    error: {
      background: colors.semantic.error[900],
      border: colors.semantic.error[700],
      text: colors.semantic.error[200],
      icon: colors.semantic.error[400],
    },
    info: {
      background: colors.primary[900],
      border: colors.primary[700],
      text: colors.primary[200],
      icon: colors.primary[400],
    },
  },

  // Shadow colors
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
  },
} as const;

// CSS Variables for dark theme
export const darkThemeCSSVars = {
  // Background
  '--color-bg-primary': colors.neutral[900],
  '--color-bg-secondary': colors.neutral[800],
  '--color-bg-tertiary': colors.neutral[700],
  '--color-bg-elevated': colors.neutral[850],
  '--color-bg-overlay': 'rgba(0, 0, 0, 0.8)',

  // Text
  '--color-text-primary': colors.neutral[50],
  '--color-text-secondary': colors.neutral[300],
  '--color-text-tertiary': colors.neutral[400],
  '--color-text-inverse': colors.neutral[900],
  '--color-text-disabled': colors.neutral[600],

  // Border
  '--color-border-primary': colors.neutral[700],
  '--color-border-secondary': colors.neutral[600],
  '--color-border-focus': colors.primary[400],
  '--color-border-error': colors.semantic.error[400],
  '--color-border-success': colors.semantic.success[400],

  // Interactive
  '--color-interactive-primary': colors.primary[500],
  '--color-interactive-primary-hover': colors.primary[400],
  '--color-interactive-primary-active': colors.primary[300],
  '--color-interactive-primary-disabled': colors.primary[800],

  // Shadows
  '--shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
  '--shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
  '--shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
  '--shadow-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
} as const;

export default darkTheme;