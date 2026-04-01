/**
 * Preferences Context
 * Week 14 Implementation - User Preferences Management
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
      return;
    }

    setLoading(true);
    setError(null);

    try {
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

      setPreferences(mergedPreferences);
    } catch (err) {
      const errorMessage = 'Errore nel recupero delle preferenze';
      setError(errorMessage);

      // Create default preferences if none exist
      const defaultPrefs: UserPreferences = {
        ...DEFAULT_USER_PREFERENCES,
        id: `pref_${user.id}`,
        userId: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
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
      setError('Errore di autenticazione. Effettua nuovamente il login.');
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
      // Toast gestito dal componente che chiama updatePreferences
    } catch (err) {
      const errorMessage = 'Errore nell\'aggiornamento delle preferenze';
      setError(errorMessage);
      // Toast gestito dal componente che chiama updatePreferences
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
      setError('Errore di autenticazione. Effettua nuovamente il login.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resetPrefs = await apiPost<UserPreferences>(
        `/api/v1/persons/preferences/reset`
      );

      setPreferences(resetPrefs);
      // Toast gestito dal componente che chiama resetPreferences
    } catch (err) {
      const errorMessage = 'Errore nel ripristino delle preferenze';
      setError(errorMessage);
      // Toast gestito dal componente che chiama resetPreferences
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Load preferences when user changes and auth is complete
  useEffect(() => {
    if (authLoading) return;

    if (user?.id) {
      fetchPreferences();
    } else {
      setPreferences(null);
      setError(null);
    }
  }, [user?.id, authLoading, fetchPreferences]);

  // Apply accessibility settings to document
  // NOTE: Theme is managed by ThemeContext (localStorage-based) as source of truth.
  // PreferencesContext stores theme preferences for backend sync but does NOT apply them directly.
  // This avoids race conditions between localStorage (immediate) and API (delayed) theme settings.
  useEffect(() => {
    if (!preferences) return;

    const root = document.documentElement;

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

  /**
   * Export preferences to JSON file
   */
  const exportPreferences = useCallback(() => {
    if (!preferences) {
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
      // Toast gestito dal componente che chiama exportPreferences
    } catch (err) {
      // Toast gestito dal componente che chiama exportPreferences
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
      // Toast gestito dal componente che chiama importPreferences
    } catch (err) {
      // Toast gestito dal componente che chiama importPreferences
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