/**
 * Preferences Context
 * Week 14 Implementation - User Preferences Management
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from './AuthContext';
import {
  UserPreferences,
  DEFAULT_USER_PREFERENCES,
  PreferencesContextType
} from '../types/preferences';
import { apiGet, apiPut, apiPost } from '../services/api';
import { getToken } from '../services/auth';

// Create context
const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

// Hook to use preferences context
export const usePreferences = (): PreferencesContextType => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};

// Provider props
export interface PreferencesProviderProps {
  children: React.ReactNode;
}

// Preferences provider component
export const PreferencesProvider: React.FC<PreferencesProviderProps> = ({ children }) => {
  const { user, isLoading: authLoading } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch user preferences from API
   */
  const fetchPreferences = useCallback(async () => {
    if (!user?.id) return;

    // Verifica che il token sia presente prima di fare la chiamata API
    const token = getToken();
    if (!token) {
      console.log('🚫 PreferencesContext: No token available, skipping preferences fetch');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 PreferencesContext: Fetching preferences for user:', user.id);
      const preferences = await apiGet<UserPreferences>(
        `/api/v1/persons/preferences`
      );

      // Merge with defaults to ensure all properties exist
      const mergedPreferences: UserPreferences = {
        ...DEFAULT_USER_PREFERENCES,
        ...preferences,
        id: preferences.id || `pref_${user.id}`,
        userId: user.id,
        // Ensure nested objects are properly merged
        accessibility: {
          ...DEFAULT_USER_PREFERENCES.accessibility,
          ...(preferences.accessibility || {})
        },
        notifications: {
          ...DEFAULT_USER_PREFERENCES.notifications,
          ...(preferences.notifications || {}),
          email: {
            ...DEFAULT_USER_PREFERENCES.notifications.email,
            ...(preferences.notifications?.email || {})
          },
          push: {
            ...DEFAULT_USER_PREFERENCES.notifications.push,
            ...(preferences.notifications?.push || {})
          },
          inApp: {
            ...DEFAULT_USER_PREFERENCES.notifications.inApp,
            ...(preferences.notifications?.inApp || {})
          }
        },
        dashboard: {
          ...DEFAULT_USER_PREFERENCES.dashboard,
          ...(preferences.dashboard || {})
        },
        privacy: {
          ...DEFAULT_USER_PREFERENCES.privacy,
          ...(preferences.privacy || {})
        }
      };

      console.log('✅ PreferencesContext: Preferences loaded and merged with defaults');
      setPreferences(mergedPreferences);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch preferences';
      setError(errorMessage);
      console.error('❌ PreferencesContext: Error fetching preferences:', err);
      
      // Create default preferences if none exist
      const defaultPrefs: UserPreferences = {
        ...DEFAULT_USER_PREFERENCES,
        id: `pref_${user.id}`,
        userId: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      console.log('🔧 PreferencesContext: Using default preferences due to error');
      setPreferences(defaultPrefs);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  /**
   * Update user preferences
   */
  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    if (!user?.id || !preferences) return;

    // Verifica che il token sia presente prima di fare la chiamata API
    const token = getToken();
    if (!token) {
      console.log('🚫 PreferencesContext: No token available, skipping preferences update');
      toast.error('Errore di autenticazione. Effettua nuovamente il login.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updatedPreferences = {
        ...preferences,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const updatedPrefs = await apiPut<UserPreferences>(
        `/api/v1/persons/preferences`,
        updatedPreferences
      );

      setPreferences(updatedPrefs);
      toast.success('Preferenze aggiornate con successo');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferences';
      setError(errorMessage);
      console.error('Error updating preferences:', err);
      toast.error('Errore nell\'aggiornamento delle preferenze');
    } finally {
      setLoading(false);
    }
  }, [user?.id, preferences]);

  /**
   * Reset preferences to defaults
   */
  const resetPreferences = useCallback(async () => {
    if (!user?.id) return;

    // Verifica che il token sia presente prima di fare la chiamata API
    const token = getToken();
    if (!token) {
      console.log('🚫 PreferencesContext: No token available, skipping preferences reset');
      toast.error('Errore di autenticazione. Effettua nuovamente il login.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resetPrefs = await apiPost<UserPreferences>(
        `/api/v1/persons/preferences/reset`
      );

      setPreferences(resetPrefs);
      toast.success('Preferenze ripristinate ai valori predefiniti');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset preferences';
      setError(errorMessage);
      console.error('Error resetting preferences:', err);
      toast.error('Errore nel ripristino delle preferenze');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Load preferences when user changes and auth is complete
  useEffect(() => {
    // Aspetta che l'autenticazione sia completata
    if (authLoading) {
      console.log('🔄 PreferencesContext: Waiting for auth to complete...');
      return;
    }

    if (user?.id) {
      console.log('👤 PreferencesContext: User authenticated, loading preferences...');
      fetchPreferences();
    } else {
      console.log('🚫 PreferencesContext: No user, clearing preferences...');
      setPreferences(null);
      setError(null);
    }
  }, [user?.id, authLoading, fetchPreferences]);

  // Apply theme changes to document
  useEffect(() => {
    if (!preferences) return;

    const { theme, themeColor } = preferences;
    const root = document.documentElement;

    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    // Apply theme
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(prefersDark ? 'dark' : 'light');
    } else {
      root.classList.add(theme);
    }

    // Apply theme color
    root.setAttribute('data-theme-color', themeColor);

    // Apply accessibility settings with safety checks
    if (preferences.accessibility?.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    if (preferences.accessibility?.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }

    root.setAttribute('data-font-size', preferences.accessibility?.fontSize || 'medium');
  }, [preferences]);

  // Listen for system theme changes
  useEffect(() => {
    if (!preferences || preferences.theme !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(mediaQuery.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [preferences]);

  /**
   * Export preferences to JSON file
   */
  const exportPreferences = useCallback(() => {
    if (!preferences) {
      toast.error('Nessuna preferenza da esportare');
      return;
    }

    try {
      const dataStr = JSON.stringify(preferences, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `user-preferences-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      toast.success('Preferenze esportate con successo');
    } catch (err) {
      console.error('Error exporting preferences:', err);
      toast.error('Errore nell\'esportazione delle preferenze');
    }
  }, [preferences]);

  /**
   * Import preferences from JSON file
   */
  const importPreferences = useCallback(async (file: File) => {
    if (!user?.id) return;

    try {
      const text = await file.text();
      const importedPrefs = JSON.parse(text) as UserPreferences;
      
      // Validate imported preferences
      if (!importedPrefs.userId || !importedPrefs.theme) {
        throw new Error('File di preferenze non valido');
      }

      // Update with imported preferences (keeping current user ID)
      const updatedPrefs = {
        ...importedPrefs,
        id: preferences?.id || `pref_${user.id}`,
        userId: user.id,
        updatedAt: new Date().toISOString()
      };

      await updatePreferences(updatedPrefs);
      toast.success('Preferenze importate con successo');
    } catch (err) {
      console.error('Error importing preferences:', err);
      toast.error('Errore nell\'importazione delle preferenze');
    }
  }, [user?.id, preferences?.id, updatePreferences]);

  /**
   * Get preference value by key
   */
  const getPreference = useCallback(<K extends keyof UserPreferences>(
    key: K
  ): UserPreferences[K] | undefined => {
    return preferences?.[key];
  }, [preferences]);

  /**
   * Update single preference
   */
  const updateSinglePreference = useCallback(async <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    await updatePreferences({ [key]: value } as Partial<UserPreferences>);
  }, [updatePreferences]);

  /**
   * Check if preferences are loaded
   */
  const isLoaded = useCallback(() => {
    return preferences !== null;
  }, [preferences]);

  /**
   * Get theme-related preferences
   */
  const getThemePreferences = useCallback(() => {
    if (!preferences) return null;
    
    return {
      theme: preferences.theme,
      themeColor: preferences.themeColor,
      accessibility: preferences.accessibility
    };
  }, [preferences]);

  /**
   * Get notification preferences
   */
  const getNotificationPreferences = useCallback(() => {
    return preferences?.notifications || null;
  }, [preferences]);

  /**
   * Get dashboard preferences
   */
  const getDashboardPreferences = useCallback(() => {
    return preferences?.dashboard || null;
  }, [preferences]);

  const value: PreferencesContextType = {
    preferences,
    loading,
    error,
    updatePreferences,
    resetPreferences,
    exportPreferences,
    importPreferences,
    // Additional utility methods
    getPreference,
    updateSinglePreference,
    isLoaded,
    getThemePreferences,
    getNotificationPreferences,
    getDashboardPreferences,
    refresh: fetchPreferences
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};

export default PreferencesProvider;