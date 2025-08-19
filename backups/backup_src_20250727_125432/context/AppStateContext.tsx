import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

// Type for our application state
interface AppState {
  language: string;
  theme: 'light' | 'dark';
  sidebarExpanded: boolean;
  attestatiGenerationProgress: number;
}

// Type for the context value
interface AppStateContextType {
  state: AppState;
  setLanguage: (lang: string) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setAttestatiGenerationProgress: (progress: number) => void;
  attestatiGenerationProgress: number;
}

// Default state
const defaultState: AppState = {
  language: 'it', // Default to Italian
  theme: 'light',
  sidebarExpanded: true,
  attestatiGenerationProgress: 0
};

// Create context with a default value
const AppStateContext = createContext<AppStateContextType | undefined>(undefined);
export { AppStateContext };

// Provider component
export const AppStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(defaultState);

  const setLanguage = useCallback((lang: string) => {
    setState(prevState => ({ ...prevState, language: lang }));
  }, []);

  const toggleTheme = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      theme: prevState.theme === 'light' ? 'dark' : 'light'
    }));
  }, []);

  const toggleSidebar = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      sidebarExpanded: !prevState.sidebarExpanded
    }));
  }, []);

  const setAttestatiGenerationProgress = useCallback((progress: number) => {
    setState(prevState => ({
      ...prevState,
      attestatiGenerationProgress: progress
    }));
  }, []);

  const value = {
    state,
    setLanguage,
    toggleTheme,
    toggleSidebar,
    setAttestatiGenerationProgress,
    attestatiGenerationProgress: state.attestatiGenerationProgress
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
};

// Custom hook to use the app state
export const useAppState = (): AppStateContextType => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};

export default AppStateContext;