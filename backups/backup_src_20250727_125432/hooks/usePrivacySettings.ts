/**
 * Privacy Settings Hook
 * Manages user privacy preferences and GDPR settings
 */

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/apiClient';
import {
  PrivacySettings,
  PrivacySettingsFormData,
  UsePrivacySettingsReturn,
  GDPRApiResponse
} from '../types/gdpr';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

export const usePrivacySettings = (): UsePrivacySettingsReturn => {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { user } = useAuth();

  /**
   * Fetch user's privacy settings
   */
  const fetchPrivacySettings = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<GDPRApiResponse<{ settings: PrivacySettings }>>(
        '/api/gdpr/privacy-settings'
      );
      
      if (response.data.success && response.data.data) {
        setSettings(response.data.data.settings);
        setHasUnsavedChanges(false);
      } else {
        throw new Error(response.data.error || 'Failed to fetch privacy settings');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch privacy settings';
      setError(errorMessage);
      console.error('Error fetching privacy settings:', err);
      toast.error('Failed to load privacy settings');
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Update privacy settings
   */
  const updatePrivacySettings = useCallback(async (data: PrivacySettingsFormData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.put<GDPRApiResponse<{ settings: PrivacySettings }>>(
        '/api/gdpr/privacy-settings',
        data
      );

      if (response.data.success && response.data.data) {
        setSettings(response.data.data.settings);
        setHasUnsavedChanges(false);
        toast.success('Privacy settings updated successfully');
      } else {
        throw new Error(response.data.error || 'Failed to update privacy settings');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update privacy settings';
      setError(errorMessage);
      console.error('Error updating privacy settings:', err);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update a single privacy setting
   */
  const updateSingleSetting = useCallback(async (
    key: keyof PrivacySettingsFormData, 
    value: boolean
  ) => {
    if (!settings) return;

    try {
      const updatedSettings = {
        dataProcessingConsent: settings.dataProcessingConsent,
        marketingConsent: settings.marketingConsent,
        analyticsConsent: settings.analyticsConsent,
        profileVisibility: settings.profileVisibility,
        dataRetentionOptOut: settings.dataRetentionOptOut,
        thirdPartySharing: settings.thirdPartySharing,
        [key]: value
      };

      await updatePrivacySettings(updatedSettings);
    } catch (err) {
      // Error handling is done in updatePrivacySettings
      throw err;
    }
  }, [settings, updatePrivacySettings]);

  /**
   * Reset privacy settings to defaults
   */
  const resetToDefaults = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post<GDPRApiResponse<{ settings: PrivacySettings }>>(
        '/api/gdpr/privacy-settings/reset'
      );

      if (response.data.success && response.data.data) {
        setSettings(response.data.data.settings);
        setHasUnsavedChanges(false);
        toast.success('Privacy settings reset to defaults');
      } else {
        throw new Error(response.data.error || 'Failed to reset privacy settings');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset privacy settings';
      setError(errorMessage);
      console.error('Error resetting privacy settings:', err);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get privacy compliance score
   */
  const getComplianceScore = useCallback(() => {
    if (!settings) return 0;

    const weights = {
      dataProcessingConsent: 30, // Most important
      marketingConsent: 15,
      analyticsConsent: 15,
      profileVisibility: 10,
      dataRetentionOptOut: 15,
      thirdPartySharing: 15
    };

    let score = 0;
    let totalWeight = 0;

    Object.entries(weights).forEach(([key, weight]) => {
      const value = settings[key as keyof PrivacySettings];
      totalWeight += weight;
      
      // For boolean settings, true = compliant
      if (typeof value === 'boolean') {
        if (key === 'dataRetentionOptOut' || key === 'thirdPartySharing') {
          // These are opt-out settings, so false = more compliant
          score += value ? 0 : weight;
        } else {
          // These are opt-in settings, so true = more compliant
          score += value ? weight : 0;
        }
      }
    });

    return Math.round((score / totalWeight) * 100);
  }, [settings]);

  /**
   * Get compliance recommendations
   */
  const getComplianceRecommendations = useCallback(() => {
    if (!settings) return [];

    const recommendations: string[] = [];

    if (!settings.dataProcessingConsent) {
      recommendations.push('Consider providing explicit consent for data processing to ensure compliance.');
    }

    if (settings.thirdPartySharing) {
      recommendations.push('Review third-party data sharing settings to minimize privacy risks.');
    }

    if (!settings.dataRetentionOptOut && settings.profileVisibility) {
      recommendations.push('Consider opting out of extended data retention for better privacy.');
    }

    if (!settings.analyticsConsent && !settings.marketingConsent) {
      recommendations.push('You have opted out of analytics and marketing. This maximizes privacy but may limit personalized features.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Your privacy settings are well-configured for GDPR compliance.');
    }

    return recommendations;
  }, [settings]);

  /**
   * Check if settings have changed from saved state
   */
  const checkForChanges = useCallback((formData: PrivacySettingsFormData) => {
    if (!settings) return false;

    const hasChanges = Object.keys(formData).some(key => {
      const formKey = key as keyof PrivacySettingsFormData;
      return formData[formKey] !== settings[formKey];
    });

    setHasUnsavedChanges(hasChanges);
    return hasChanges;
  }, [settings]);

  /**
   * Get setting description for UI
   */
  const getSettingDescription = useCallback((key: keyof PrivacySettings) => {
    const descriptions = {
      dataProcessingConsent: 'Allow processing of your personal data for core platform functionality',
      marketingConsent: 'Receive marketing communications and promotional content',
      analyticsConsent: 'Allow collection of usage analytics to improve our services',
      profileVisibility: 'Make your profile visible to other users within your organization',
      dataRetentionOptOut: 'Opt out of extended data retention beyond legal requirements',
      thirdPartySharing: 'Allow sharing of anonymized data with trusted third-party partners'
    };

    return descriptions[key] || '';
  }, []);

  /**
   * Get setting impact level for UI
   */
  const getSettingImpact = useCallback((key: keyof PrivacySettings) => {
    const impacts = {
      dataProcessingConsent: 'high', // Core functionality
      marketingConsent: 'low',
      analyticsConsent: 'medium',
      profileVisibility: 'medium',
      dataRetentionOptOut: 'medium',
      thirdPartySharing: 'low'
    };

    return impacts[key] || 'low';
  }, []);

  /**
   * Export privacy settings
   */
  const exportSettings = useCallback(() => {
    if (!settings) return null;

    const exportData = {
      ...settings,
      exportedAt: new Date().toISOString(),
      complianceScore: getComplianceScore(),
      recommendations: getComplianceRecommendations()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `privacy-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success('Privacy settings exported successfully');
  }, [settings, getComplianceScore, getComplianceRecommendations]);

  /**
   * Refresh settings
   */
  const refreshSettings = useCallback(async () => {
    await fetchPrivacySettings();
  }, [fetchPrivacySettings]);

  // Load privacy settings on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchPrivacySettings();
    } else {
      setSettings(null);
      setError(null);
      setHasUnsavedChanges(false);
    }
  }, [user, fetchPrivacySettings]);

  // Warn user about unsaved changes before leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    if (hasUnsavedChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  return {
    settings,
    loading,
    error,
    hasUnsavedChanges,
    updatePrivacySettings,
    updateSingleSetting,
    resetToDefaults,
    getComplianceScore,
    getComplianceRecommendations,
    checkForChanges,
    getSettingDescription,
    getSettingImpact,
    exportSettings,
    refreshSettings
  };
};

export default usePrivacySettings;