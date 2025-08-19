/**
 * Design System - Light Theme
 * Week 8 Implementation - Component Library
 */

import { colors } from '../tokens/colors';

export const lightTheme = {
  // Background colors
  background: {
    primary: colors.neutral[50],
    secondary: colors.neutral[100],
    tertiary: colors.neutral[200],
    elevated: '#ffffff',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  // Text colors
  text: {
    primary: colors.neutral[900],
    secondary: colors.neutral[700],
    tertiary: colors.neutral[500],
    inverse: '#ffffff',
    disabled: colors.neutral[400],
  },

  // Border colors
  border: {
    primary: colors.neutral[200],
    secondary: colors.neutral[300],
    focus: colors.primary[500],
    error: colors.semantic.error[500],
    success: colors.semantic.success[500],
  },

  // Interactive colors
  interactive: {
    primary: {
      default: colors.primary[600],
      hover: colors.primary[700],
      active: colors.primary[800],
      disabled: colors.primary[300],
    },
    secondary: {
      default: colors.neutral[100],
      hover: colors.neutral[200],
      active: colors.neutral[300],
      disabled: colors.neutral[50],
    },
    destructive: {
      default: colors.semantic.error[600],
      hover: colors.semantic.error[700],
      active: colors.semantic.error[800],
      disabled: colors.semantic.error[300],
    },
  },

  // Status colors
  status: {
    success: {
      background: colors.semantic.success[50],
      border: colors.semantic.success[200],
      text: colors.semantic.success[800],
      icon: colors.semantic.success[600],
    },
    warning: {
      background: colors.semantic.warning[50],
      border: colors.semantic.warning[200],
      text: colors.semantic.warning[800],
      icon: colors.semantic.warning[600],
    },
    error: {
      background: colors.semantic.error[50],
      border: colors.semantic.error[200],
      text: colors.semantic.error[800],
      icon: colors.semantic.error[600],
    },
    info: {
      background: colors.primary[50],
      border: colors.primary[200],
      text: colors.primary[800],
      icon: colors.primary[600],
    },
  },

  // Shadow colors
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
} as const;

// CSS Variables for light theme
export const lightThemeCSSVars = {
  // Background
  '--color-bg-primary': colors.neutral[50],
  '--color-bg-secondary': colors.neutral[100],
  '--color-bg-tertiary': colors.neutral[200],
  '--color-bg-elevated': '#ffffff',
  '--color-bg-overlay': 'rgba(0, 0, 0, 0.5)',

  // Text
  '--color-text-primary': colors.neutral[900],
  '--color-text-secondary': colors.neutral[700],
  '--color-text-tertiary': colors.neutral[500],
  '--color-text-inverse': '#ffffff',
  '--color-text-disabled': colors.neutral[400],

  // Border
  '--color-border-primary': colors.neutral[200],
  '--color-border-secondary': colors.neutral[300],
  '--color-border-focus': colors.primary[500],
  '--color-border-error': colors.semantic.error[500],
  '--color-border-success': colors.semantic.success[500],

  // Interactive
  '--color-interactive-primary': colors.primary[600],
  '--color-interactive-primary-hover': colors.primary[700],
  '--color-interactive-primary-active': colors.primary[800],
  '--color-interactive-primary-disabled': colors.primary[300],

  // Shadows
  '--shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  '--shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  '--shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  '--shadow-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
} as const;

export default lightTheme;