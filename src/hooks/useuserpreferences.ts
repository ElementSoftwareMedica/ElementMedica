/**
 * User Preferences Hook
 * Week 14 Implementation - User Preferences Management
 * 
 * This hook is a wrapper around the PreferencesContext to provide
 * a more specific interface for user preferences management.
 */

import { useCallback } from 'react';
import { usePreferences } from '../context/PreferencesContext';
import { UserPreferences } from '../types/preferences';
import { toast } from 'react-hot-toast';

export interface UseUserPreferencesReturn {
  preferences: UserPreferences | null;
  loading: boolean;
  error: string | null;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  resetPreferences: () => Promise<void>;
  exportPreferences: () => void;
  importPreferences: (file: File) => Promise<void>;
  // Additional utility methods
  getPreference: <K extends keyof UserPreferences>(key: K) => UserPreferences[K] | undefined;
  updateSinglePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => Promise<void>;
  isLoaded: () => boolean;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing user preferences
 * This is a wrapper around the PreferencesContext with additional utility methods
 */
export const useUserPreferences = (): UseUserPreferencesReturn => {
  const {
    preferences,
    loading,
    error,
    updatePreferences: contextUpdatePreferences,
    resetPreferences: contextResetPreferences,
    getPreference,
    updateSinglePreference,
    isLoaded,
    refresh
  } = usePreferences();

  /**
   * Update user preferences with toast notifications
   */
  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    try {
      await contextUpdatePreferences(updates);
      toast.success('Preferenze aggiornate con successo');
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Errore nell\'aggiornamento delle preferenze');
      throw error;
    }
  }, [contextUpdatePreferences]);

  /**
   * Reset preferences to default values with confirmation
   */
  const resetPreferences = useCallback(async () => {
    try {
      await contextResetPreferences();
      toast.success('Preferenze ripristinate ai valori predefiniti');
    } catch (error) {
      console.error('Error resetting preferences:', error);
      toast.error('Errore nel ripristino delle preferenze');
      throw error;
    }
  }, [contextResetPreferences]);

  /**
   * Export preferences as JSON file
   */
  const exportPreferences = useCallback(() => {
    if (!preferences) {
      toast.error('Nessuna preferenza da esportare');
      return;
    }

    try {
      const dataStr = JSON.stringify(preferences, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `preferences_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      toast.success('Preferenze esportate con successo');
    } catch (error) {
      console.error('Error exporting preferences:', error);
      toast.error('Errore nell\'esportazione delle preferenze');
    }
  }, [preferences]);

  /**
   * Import preferences from JSON file
   */
  const importPreferences = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const importedPreferences = JSON.parse(text);
      
      // Validate the imported data structure
      if (!importedPreferences || typeof importedPreferences !== 'object') {
        throw new Error('Formato file non valido');
      }

      // Extract only the preference fields we want to update
      const {
        theme,
        themeColor,
        language,
        timezone,
        dateFormat,
        timeFormat,
        notifications,
        accessibility,
        privacy,
        dashboard
      } = importedPreferences;

      const updates: Partial<UserPreferences> = {};
      
      if (theme) updates.theme = theme;
      if (themeColor) updates.themeColor = themeColor;
      if (language) updates.language = language;
      if (timezone) updates.timezone = timezone;
      if (dateFormat) updates.dateFormat = dateFormat;
      if (timeFormat) updates.timeFormat = timeFormat;
      if (notifications) updates.notifications = notifications;
      if (accessibility) updates.accessibility = accessibility;
      if (privacy) updates.privacy = privacy;
      if (dashboard) updates.dashboard = dashboard;

      await contextUpdatePreferences(updates);
      toast.success('Preferenze importate con successo');
    } catch (error) {
      console.error('Error importing preferences:', error);
      toast.error('Errore nell\'importazione delle preferenze: ' + (error as Error).message);
      throw error;
    }
  }, [contextUpdatePreferences]);

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    resetPreferences,
    exportPreferences,
    importPreferences,
    getPreference,
    updateSinglePreference,
    isLoaded,
    refresh
  };
};

export default useUserPreferences;