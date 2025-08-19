/**
 * Design System - Themes Index
 * Week 8 Implementation - Component Library
 * Aggiornato per supportare temi pubblico/privato
 */

// Import themes first
import { lightTheme, lightThemeCSSVars } from './light';
import { darkTheme, darkThemeCSSVars } from './dark';
import { publicTheme, publicThemeCSSVars } from './public';
import { privateTheme, privateThemeCSSVars } from './private';

// Export theme provider
export { ThemeProvider, useTheme } from './ThemeProvider';
export type { ThemeMode, ThemeContextType, ThemeProviderProps } from './ThemeProvider';

// Export individual themes
export { lightTheme, lightThemeCSSVars } from './light';
export { darkTheme, darkThemeCSSVars } from './dark';
export { publicTheme, publicThemeCSSVars } from './public';
export { privateTheme, privateThemeCSSVars } from './private';

// Combined theme exports
export const themes = {
  light: lightTheme,
  dark: darkTheme,
  public: publicTheme,
  private: privateTheme,
} as const;

export const themeCSSVars = {
  light: lightThemeCSSVars,
  dark: darkThemeCSSVars,
  public: publicThemeCSSVars,
  private: privateThemeCSSVars,
} as const;

export type ThemeName = keyof typeof themes;