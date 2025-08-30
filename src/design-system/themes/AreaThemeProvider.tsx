/**
 * Area Theme Provider
 * Gestisce automaticamente il cambio di tema tra frontend pubblico e privato
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { publicTheme, publicThemeCSSVars, privateTheme, privateThemeCSSVars } from './index';

type AreaType = 'public' | 'private';

interface AreaThemeContextType {
  area: AreaType;
  theme: typeof publicTheme | typeof privateTheme;
  cssVars: typeof publicThemeCSSVars | typeof privateThemeCSSVars;
}

const AreaThemeContext = createContext<AreaThemeContextType | undefined>(undefined);

interface AreaThemeProviderProps {
  children: React.ReactNode;
}

// Route che appartengono all'area privata
const PRIVATE_ROUTES = [
  '/dashboard',
  '/companies',
  '/courses',
  '/persons',
  '/employees',
  '/trainers',
  '/schedules',
  '/settings',
  '/tenants',
  '/quotes-and-invoices',
  '/documents-corsi',
  '/gdpr',
  '/admin',
  '/forms',
  '/demo'
];

// Funzione per determinare se una route è privata
const isPrivateRoute = (pathname: string): boolean => {
  return PRIVATE_ROUTES.some(route => pathname.startsWith(route));
};

export const AreaThemeProvider: React.FC<AreaThemeProviderProps> = ({ children }) => {
  const location = useLocation();
  const [area, setArea] = useState<AreaType>('public');

  // Determina l'area basata sulla route corrente
  useEffect(() => {
    const newArea = isPrivateRoute(location.pathname) ? 'private' : 'public';
    setArea(newArea);
  }, [location.pathname]);

  // Seleziona tema e CSS vars basati sull'area
  const theme = area === 'private' ? privateTheme : publicTheme;
  const cssVars = area === 'private' ? privateThemeCSSVars : publicThemeCSSVars;

  // Applica le CSS variables al documento
  useEffect(() => {
    const root = document.documentElement;
    
    // Rimuovi le variabili precedenti
    Object.keys(publicThemeCSSVars).forEach(key => {
      root.style.removeProperty(key);
    });
    Object.keys(privateThemeCSSVars).forEach(key => {
      root.style.removeProperty(key);
    });
    
    // Applica le nuove variabili
    Object.entries(cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, String(value));
    });
    
    // Aggiungi una classe CSS per identificare l'area corrente
    root.classList.remove('area-public', 'area-private');
    root.classList.add(`area-${area}`);
    
    // Aggiungi attributo data per debugging
    root.setAttribute('data-theme-area', area);
    
  }, [area, cssVars]);

  const contextValue: AreaThemeContextType = {
    area,
    theme,
    cssVars,
  };

  return (
    <AreaThemeContext.Provider value={contextValue}>
      {children}
    </AreaThemeContext.Provider>
  );
};

// Hook per utilizzare il tema dell'area
export const useAreaTheme = (): AreaThemeContextType => {
  const context = useContext(AreaThemeContext);
  if (context === undefined) {
    throw new Error('useAreaTheme must be used within an AreaThemeProvider');
  }
  return context;
};

// Hook per verificare se siamo nell'area privata
export const useIsPrivateArea = (): boolean => {
  const { area } = useAreaTheme();
  return area === 'private';
};

// Hook per verificare se siamo nell'area pubblica
export const useIsPublicArea = (): boolean => {
  const { area } = useAreaTheme();
  return area === 'public';
};