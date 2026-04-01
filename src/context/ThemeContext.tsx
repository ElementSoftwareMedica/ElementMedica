/**
 * ThemeContext - Context per gestione tema (light/dark mode)
 * P60: Design System Unificato e Dark Mode
 * 
 * Source of Truth UNICA per il tema dell'applicazione.
 * 
 * Supporta:
 * - 'auto': segue preferenze sistema (prefers-color-scheme)
 * - 'light': tema chiaro forzato
 * - 'dark': tema scuro forzato
 * 
 * Persiste le preferenze in localStorage.
 * Per sincronizzazione con backend, usare PreferencesContext separatamente.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

export type ThemeMode = 'auto' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';
export type ThemeColor = 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'teal';

interface ThemeContextValue {
    /** Modalità tema selezionata dall'utente */
    mode: ThemeMode;
    /** Tema effettivamente applicato (risolto da auto) */
    resolvedTheme: ResolvedTheme;
    /** Colore accent del tema */
    themeColor: ThemeColor;
    /** Imposta la modalità tema */
    setMode: (mode: ThemeMode) => void;
    /** Imposta il colore accent */
    setThemeColor: (color: ThemeColor) => void;
    /** Toggle rapido tra light/dark (ignora auto) */
    toggleTheme: () => void;
    /** Verifica se il tema scuro è attivo */
    isDark: boolean;
    /** Verifica se siamo in modalità auto */
    isAuto: boolean;
    /** Preferenza sistema corrente */
    systemPreference: ResolvedTheme;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'element-theme-mode';
const COLOR_STORAGE_KEY = 'element-theme-color';

/**
 * Rileva le preferenze del sistema operativo
 */
function getSystemPreference(): ResolvedTheme {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Risolve la modalità in un tema effettivo
 */
function resolveTheme(mode: ThemeMode, systemPref: ResolvedTheme): ResolvedTheme {
    if (mode === 'auto') {
        return systemPref;
    }
    return mode;
}

/**
 * Applica il tema al documento
 */
function applyTheme(theme: ResolvedTheme): void {
    const root = document.documentElement;

    // Rimuovi entrambe le classi prima di applicare
    root.classList.remove('dark', 'light');

    if (theme === 'dark') {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
    } else {
        root.classList.add('light');
        root.style.colorScheme = 'light';
    }

    // Aggiorna meta theme-color per mobile
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
        themeColorMeta.setAttribute('content', theme === 'dark' ? '#111827' : '#ffffff');
    }
}

interface ThemeProviderProps {
    children: React.ReactNode;
    /** Modalità iniziale (default: auto) */
    defaultMode?: ThemeMode;
    /** Colore iniziale (default: teal) */
    defaultColor?: ThemeColor;
    /** Disabilita persistenza in localStorage */
    disablePersistence?: boolean;
}

export function ThemeProvider({
    children,
    defaultMode = 'auto',
    defaultColor = 'teal',
    disablePersistence = false
}: ThemeProviderProps): JSX.Element {
    // Preferenza sistema
    const [systemPreference, setSystemPreference] = useState<ResolvedTheme>(() => getSystemPreference());

    // Inizializza mode da localStorage o default
    const [mode, setModeState] = useState<ThemeMode>(() => {
        if (disablePersistence || typeof window === 'undefined') {
            return defaultMode;
        }
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'auto' || stored === 'light' || stored === 'dark') {
            return stored;
        }
        return defaultMode;
    });

    // Inizializza themeColor da localStorage o default
    const [themeColor, setThemeColorState] = useState<ThemeColor>(() => {
        if (disablePersistence || typeof window === 'undefined') {
            return defaultColor;
        }
        const stored = localStorage.getItem(COLOR_STORAGE_KEY);
        if (stored && ['blue', 'green', 'purple', 'orange', 'red', 'teal'].includes(stored)) {
            return stored as ThemeColor;
        }
        return defaultColor;
    });

    // Tema risolto (effettivo) - calcolato
    const resolvedTheme = useMemo(() => resolveTheme(mode, systemPreference), [mode, systemPreference]);
    const isDark = resolvedTheme === 'dark';
    const isAuto = mode === 'auto';

    // Listener per cambiamenti sistema
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (e: MediaQueryListEvent) => {
            setSystemPreference(e.matches ? 'dark' : 'light');
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    // Applica tema quando cambia resolvedTheme
    useEffect(() => {
        applyTheme(resolvedTheme);
    }, [resolvedTheme]);

    // Persisti mode
    useEffect(() => {
        if (!disablePersistence) {
            localStorage.setItem(STORAGE_KEY, mode);
        }
    }, [mode, disablePersistence]);

    // Persisti themeColor
    useEffect(() => {
        if (!disablePersistence) {
            localStorage.setItem(COLOR_STORAGE_KEY, themeColor);
        }
    }, [themeColor, disablePersistence]);

    // Applica immediatamente al mount per evitare flash
    useEffect(() => {
        applyTheme(resolvedTheme);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setMode = useCallback((newMode: ThemeMode) => {
        setModeState(newMode);
    }, []);

    const setThemeColor = useCallback((newColor: ThemeColor) => {
        setThemeColorState(newColor);
    }, []);

    const toggleTheme = useCallback(() => {
        setModeState(prev => {
            // Se in auto, vai al tema opposto del sistema
            if (prev === 'auto') {
                return systemPreference === 'dark' ? 'light' : 'dark';
            }
            // Altrimenti toggle
            return prev === 'dark' ? 'light' : 'dark';
        });
    }, [systemPreference]);

    const value: ThemeContextValue = useMemo(() => ({
        mode,
        resolvedTheme,
        themeColor,
        setMode,
        setThemeColor,
        toggleTheme,
        isDark,
        isAuto,
        systemPreference
    }), [mode, resolvedTheme, themeColor, setMode, setThemeColor, toggleTheme, isDark, isAuto, systemPreference]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

/**
 * Hook per accedere al tema
 */
export function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme deve essere usato dentro ThemeProvider');
    }
    return context;
}

/**
 * Hook semplificato per verificare se dark mode è attivo
 */
export function useDarkMode(): boolean {
    const { isDark } = useTheme();
    return isDark;
}

export default ThemeProvider;
