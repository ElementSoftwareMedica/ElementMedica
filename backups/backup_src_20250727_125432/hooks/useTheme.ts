/**
 * Theme Hook
 * Week 14 Implementation - Enhanced Theme Management
 */

import { useState, useCallback, useEffect } from 'react';
import { usePreferences } from '../context/PreferencesContext';
import {
  ThemeMode,
  ThemeColor,
  UseThemeReturn
} from '../types/preferences';

/**
 * Enhanced hook for theme management
 */
export const useTheme = (): UseThemeReturn => {
  const { preferences, updatePreferences } = usePreferences();
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');

  // Get current theme and color from preferences
  const theme = preferences?.theme || 'auto';
  const themeColor = preferences?.themeColor || 'blue';

  // Determine if current theme is dark
  const isDark = theme === 'dark' || (theme === 'auto' && systemTheme === 'dark');

  /**
   * Set theme mode
   */
  const setTheme = useCallback(async (newTheme: ThemeMode) => {
    await updatePreferences({ theme: newTheme });
  }, [updatePreferences]);

  /**
   * Set theme color
   */
  const setThemeColor = useCallback(async (newColor: ThemeColor) => {
    await updatePreferences({ themeColor: newColor });
  }, [updatePreferences]);

  /**
   * Toggle between light and dark theme
   */
  const toggleTheme = useCallback(async () => {
    if (theme === 'auto') {
      // If auto, switch to opposite of system preference
      await setTheme(systemTheme === 'dark' ? 'light' : 'dark');
    } else {
      // Toggle between light and dark
      await setTheme(theme === 'light' ? 'dark' : 'light');
    }
  }, [theme, systemTheme, setTheme]);

  /**
   * Apply theme to document
   */
  const applyTheme = useCallback((themeToApply: ThemeMode) => {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    // Apply theme
    if (themeToApply === 'auto') {
      root.classList.add(systemTheme);
    } else {
      root.classList.add(themeToApply);
    }

    // Set theme-color meta tag for mobile browsers
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      const isDarkTheme = themeToApply === 'dark' || (themeToApply === 'auto' && systemTheme === 'dark');
      themeColorMeta.setAttribute('content', isDarkTheme ? '#0f172a' : '#ffffff');
    }
  }, [systemTheme]);

  /**
   * Get system theme preference
   */
  const getSystemTheme = useCallback((): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  /**
   * Get theme CSS variables
   */
  const getThemeVariables = useCallback(() => {
    const baseVariables = {
      '--theme-color': themeColor,
      '--theme-mode': isDark ? 'dark' : 'light'
    };

    // Add color-specific variables
    const colorVariables = {
      blue: {
        '--color-primary': isDark ? '#3b82f6' : '#2563eb',
        '--color-primary-hover': isDark ? '#60a5fa' : '#1d4ed8',
        '--color-primary-light': isDark ? '#1e40af' : '#dbeafe'
      },
      green: {
        '--color-primary': isDark ? '#10b981' : '#059669',
        '--color-primary-hover': isDark ? '#34d399' : '#047857',
        '--color-primary-light': isDark ? '#065f46' : '#d1fae5'
      },
      purple: {
        '--color-primary': isDark ? '#8b5cf6' : '#7c3aed',
        '--color-primary-hover': isDark ? '#a78bfa' : '#6d28d9',
        '--color-primary-light': isDark ? '#5b21b6' : '#ede9fe'
      },
      orange: {
        '--color-primary': isDark ? '#f97316' : '#ea580c',
        '--color-primary-hover': isDark ? '#fb923c' : '#c2410c',
        '--color-primary-light': isDark ? '#9a3412' : '#fed7aa'
      },
      red: {
        '--color-primary': isDark ? '#ef4444' : '#dc2626',
        '--color-primary-hover': isDark ? '#f87171' : '#b91c1c',
        '--color-primary-light': isDark ? '#991b1b' : '#fecaca'
      }
    };

    return {
      ...baseVariables,
      ...colorVariables[themeColor]
    };
  }, [themeColor, isDark]);

  /**
   * Apply CSS variables to document
   */
  const applyCSSVariables = useCallback(() => {
    const variables = getThemeVariables();
    const root = document.documentElement;
    
    Object.entries(variables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [getThemeVariables]);

  // Initialize system theme
  useEffect(() => {
    setSystemTheme(getSystemTheme());
  }, [getSystemTheme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply theme when it changes
  useEffect(() => {
    if (preferences) {
      applyTheme(theme);
      applyCSSVariables();
    }
  }, [theme, themeColor, systemTheme, preferences, applyTheme, applyCSSVariables]);

  return {
    theme,
    themeColor,
    isDark,
    setTheme,
    setThemeColor,
    toggleTheme,
    applyTheme,
    // Additional utility methods
    systemTheme,
    getThemeVariables,
    applyCSSVariables
  };
};

export default useTheme;