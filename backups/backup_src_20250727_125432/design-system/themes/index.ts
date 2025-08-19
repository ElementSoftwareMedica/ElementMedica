/**
 * Design System - Themes Index
 * Week 8 Implementation - Component Library
 */

// Import themes first
import { lightTheme, lightThemeCSSVars } from './light';
import { darkTheme, darkThemeCSSVars } from './dark';

// Export theme provider
export { ThemeProvider, useTheme } from './ThemeProvider';
export type { ThemeMode, ThemeContextType, ThemeProviderProps } from './ThemeProvider';

// Export individual themes
export { lightTheme, lightThemeCSSVars } from './light';
export { darkTheme, darkThemeCSSVars } from './dark';

// Combined theme exports
export const themes = {
  light: lightTheme,
  dark: darkTheme,
} as const;

export const themeCSSVars = {
  light: lightThemeCSSVars,
  dark: darkThemeCSSVars,
} as const;

export type ThemeName = keyof typeof themes;