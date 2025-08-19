import { useContext, useMemo, useCallback } from 'react';
import { AppStateContext } from '../../context/AppStateContext';

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
export const useAppStateSelector = <T>(selector: (state: any) => T) => {
  const state = useAppState();
  
  return useMemo(() => selector(state), [selector, state]);
};

/**
 * Hook specifici per parti dello stato
 */
export const useLanguage = () => {
  return useAppStateSelector(state => ({
    language: state.language,
    setLanguage: state.setLanguage
  }));
};

export const useTheme = () => {
  return useAppStateSelector(state => ({
    theme: state.theme,
    setTheme: state.setTheme,
    isDarkMode: state.theme === 'dark'
  }));
};

export const useSidebar = () => {
  return useAppStateSelector(state => ({
    isExpanded: state.sidebarExpanded,
    setSidebarExpanded: state.setSidebarExpanded,
    toggleSidebar: useCallback(() => {
      state.setSidebarExpanded(!state.sidebarExpanded);
    }, [state.sidebarExpanded, state.setSidebarExpanded])
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
  const { setLanguage, setTheme, setSidebarExpanded, setAttestatiGenerationProgress } = useAppState();
  
  return useMemo(() => ({
    // Azioni per il tema
    toggleTheme: () => {
      setTheme(prev => prev === 'light' ? 'dark' : 'light');
    },
    
    // Azioni per la lingua
    switchToItalian: () => setLanguage('it'),
    switchToEnglish: () => setLanguage('en'),
    
    // Azioni per la sidebar
    expandSidebar: () => setSidebarExpanded(true),
    collapseSidebar: () => setSidebarExpanded(false),
    toggleSidebar: () => setSidebarExpanded(prev => !prev),
    
    // Azioni per il progresso
    startAttestatiGeneration: () => setAttestatiGenerationProgress(0),
    updateAttestatiProgress: (progress: number) => setAttestatiGenerationProgress(progress),
    completeAttestatiGeneration: () => setAttestatiGenerationProgress(100),
    resetAttestatiProgress: () => setAttestatiGenerationProgress(0),
    
  }), [setLanguage, setTheme, setSidebarExpanded, setAttestatiGenerationProgress]);
};

export default useAppState;