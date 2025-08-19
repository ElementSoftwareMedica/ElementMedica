import { useContext, useMemo, useCallback } from 'react';
import { AppStateContext } from '../../context/AppStateContext';
import type { AppStateContextType } from '../../context/AppStateContext';

/**
 * Hook ottimizzato per lo stato globale dell'applicazione
 * Utilizza selettori per evitare re-render inutili
 */
export const useAppState = () => {
  const context = useContext(AppStateContext);
  
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }

  return context;
};

/**
 * Hook con selettore per ottimizzare le performance
 * Permette di sottoscriversi solo a parti specifiche dello stato
 */
export const useAppStateSelector = <T>(selector: (state: AppStateContextType) => T) => {
  const state = useAppState();
  
  return useMemo(() => selector(state), [selector, state]);
};

/**
 * Hook specifici per parti dello stato
 */
export const useLanguage = () => {
  return useAppStateSelector(state => ({
    language: state.state.language,
    setLanguage: state.setLanguage
  }));
};

export const useTheme = () => {
  return useAppStateSelector(state => ({
    theme: state.state.theme,
    toggleTheme: state.toggleTheme,
    isDarkMode: state.state.theme === 'dark'
  }));
};

export const useSidebar = () => {
  return useAppStateSelector(state => ({
    isExpanded: state.state.sidebarExpanded,
    toggleSidebar: state.toggleSidebar
  }));
};

export const useAttestatiProgress = () => {
  return useAppStateSelector(state => ({
    progress: state.attestatiGenerationProgress,
    setProgress: state.setAttestatiGenerationProgress,
    isGenerating: state.attestatiGenerationProgress > 0 && state.attestatiGenerationProgress < 100
  }));
};

/**
 * Hook per azioni globali dell'applicazione
 */
export const useAppActions = () => {
  const { setLanguage, toggleTheme, toggleSidebar, setAttestatiGenerationProgress } = useAppState();
  
  return useMemo(() => ({
    // Azioni per il tema
    toggleTheme,
    
    // Azioni per la lingua
    switchToItalian: () => setLanguage('it'),
    switchToEnglish: () => setLanguage('en'),
    
    // Azioni per la sidebar
    toggleSidebar,
    
    // Azioni per il progresso
    startAttestatiGeneration: () => setAttestatiGenerationProgress(0),
    updateAttestatiProgress: (progress: number) => setAttestatiGenerationProgress(progress),
    completeAttestatiGeneration: () => setAttestatiGenerationProgress(100),
    resetAttestatiProgress: () => setAttestatiGenerationProgress(0),
    
  }), [setLanguage, toggleTheme, toggleSidebar, setAttestatiGenerationProgress]);
};

export default useAppState;