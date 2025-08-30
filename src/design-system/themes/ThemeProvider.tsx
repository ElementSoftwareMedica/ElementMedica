/**
 * Design System - Theme Provider
 * Week 8 Implementation - Component Library
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { designTokens } from '../tokens';

// Theme types
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
  toggleTheme: () => void;
}

// Theme context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Hook to use theme
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Theme provider props
export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultMode?: ThemeMode;
  storageKey?: string;
}

// Get system theme preference
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// Apply CSS variables to document
const applyCSSVariables = (variables: Record<string, string>) => {
  if (typeof document === 'undefined') return;
  
  const root = document.documentElement;
  Object.entries(variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
};

// Theme provider component
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultMode = 'system',
  storageKey = 'theme-mode',
}) => {
  const [mode, setModeState] = useState<ThemeMode>(defaultMode);
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');

  // Determine if current theme is dark
  const isDark = mode === 'dark' || (mode === 'system' && systemTheme === 'dark');

  // Load theme from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const stored = localStorage.getItem(storageKey) as ThemeMode;
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      setModeState(stored);
    }
    
    // Set initial system theme
    setSystemTheme(getSystemTheme());
  }, [storageKey]);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply theme changes
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    // Add current theme class
    root.classList.add(isDark ? 'dark' : 'light');
    
    // Apply design tokens as CSS variables
    applyCSSVariables(designTokens);
    
    // Set theme-color meta tag for mobile browsers
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', isDark ? '#0f172a' : '#ffffff');
    }
  }, [isDark]);

  // Set theme mode
  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, newMode);
    }
  };

  // Toggle between light and dark
  const toggleTheme = () => {
    if (mode === 'system') {
      setMode(systemTheme === 'dark' ? 'light' : 'dark');
    } else {
      setMode(mode === 'dark' ? 'light' : 'dark');
    }
  };

  const value: ThemeContextType = {
    mode,
    setMode,
    isDark,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;