/**
 * Design System - Tokens Index
 * Week 8 Implementation - Component Library
 */

export * from './colors';
export * from './typography';
export * from './spacing';
export * from './animations';

// Re-export all tokens as a single object
export { colors } from './colors';
export { typography } from './typography';
export { spacing, semanticSpacing, sizing, borderRadius, shadows, zIndex } from './spacing';
export { animations } from './animations';

// Combined CSS Variables
import { colorCSSVars } from './colors';
import { typographyCSSVars } from './typography';
import { spacingCSSVars } from './spacing';
import { animationCSSVars } from './animations';

export const designTokens = {
  ...colorCSSVars,
  ...typographyCSSVars,
  ...spacingCSSVars,
  ...animationCSSVars,
} as const;

// Utility function to apply all design tokens as CSS variables
export const applyDesignTokens = (): Record<string, string> => {
  return designTokens;
};

// Theme configuration
export const theme = {
  colors: {
    primary: 'var(--color-primary-500)',
    secondary: 'var(--color-secondary-500)',
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    error: 'var(--color-error)',
    info: 'var(--color-info)',
    background: {
      primary: 'var(--color-bg-primary)',
      secondary: 'var(--color-bg-secondary)',
      tertiary: 'var(--color-bg-tertiary)',
    },
    text: {
      primary: 'var(--color-text-primary)',
      secondary: 'var(--color-text-secondary)',
      tertiary: 'var(--color-text-tertiary)',
    },
    border: {
      primary: 'var(--color-border-primary)',
      secondary: 'var(--color-border-secondary)',
      focus: 'var(--color-border-focus)',
    },
  },
  typography: {
    fontFamily: {
      sans: 'var(--font-sans)',
      mono: 'var(--font-mono)',
      serif: 'var(--font-serif)',
    },
    fontSize: {
      xs: 'var(--text-xs)',
      sm: 'var(--text-sm)',
      base: 'var(--text-base)',
      lg: 'var(--text-lg)',
      xl: 'var(--text-xl)',
      '2xl': 'var(--text-2xl)',
      '3xl': 'var(--text-3xl)',
      '4xl': 'var(--text-4xl)',
    },
    fontWeight: {
      light: 'var(--font-light)',
      normal: 'var(--font-normal)',
      medium: 'var(--font-medium)',
      semibold: 'var(--font-semibold)',
      bold: 'var(--font-bold)',
    },
  },
  spacing: {
    xs: 'var(--spacing-xs)',
    sm: 'var(--spacing-sm)',
    md: 'var(--spacing-md)',
    lg: 'var(--spacing-lg)',
    xl: 'var(--spacing-xl)',
  },
  layout: {
    xs: 'var(--layout-xs)',
    sm: 'var(--layout-sm)',
    md: 'var(--layout-md)',
    lg: 'var(--layout-lg)',
    xl: 'var(--layout-xl)',
  },
  borderRadius: {
    sm: 'var(--radius-sm)',
    base: 'var(--radius-base)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    xl: 'var(--radius-xl)',
  },
  shadows: {
    sm: 'var(--shadow-sm)',
    base: 'var(--shadow-base)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
    xl: 'var(--shadow-xl)',
  },
} as const;

// Type definitions for theme
export type Theme = typeof theme;
export type ThemeColors = keyof typeof theme.colors;
export type ThemeFontSizes = keyof typeof theme.typography.fontSize;
export type ThemeSpacing = keyof typeof theme.spacing;