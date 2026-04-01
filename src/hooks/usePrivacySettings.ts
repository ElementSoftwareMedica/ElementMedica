/**
 * Privacy Settings Hook
 * Manages user privacy preferences and GDPR settings
 */

import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPut, apiPost } from '../services/api';
import {
  PrivacySettings,
  PrivacySettingsFormData,
  UsePrivacySettingsReturn,
  GDPRApiResponse
} from '../types/gdpr';
import { useAuth } from '../context/AuthContext';

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

      const data = await apiGet<GDPRApiResponse<{ settings: PrivacySettings }>>(
        '/api/v1/persons/me/privacy-settings'
      );

      // Handle both wrapped and direct response formats
      if (data.success && data.data) {
        setSettings(data.data.settings);
        setHasUnsavedChanges(false);
      } else if ('settings' in data) {
        setSettings((data as unknown as { settings: PrivacySettings }).settings);
        setHasUnsavedChanges(false);
      } else {
        // Endpoint may not exist - use default settings
        setSettings({
          id: '',
          userId: user?.id || '',
          dataProcessingConsent: false,
          marketingConsent: false,
          analyticsConsent: false,
          profileVisibility: 'private',
          dataRetentionOptOut: false,
          thirdPartySharing: false,
          emailNotifications: true,
          marketingEmails: false,
          analyticsTracking: false,
          dataRetentionPeriod: 365,
          autoDeleteInactive: false,
          twoFactorAuth: false,
          sessionTimeout: 30,
          updatedAt: new Date()
        });
        setHasUnsavedChanges(false);
      }
    } catch (err) {
      // Non mostrare errori se l'endpoint non esiste
      const errorMessage = 'Errore nel recupero delle impostazioni privacy';
      if (!errorMessage.includes('404') && !errorMessage.includes('500')) {
        setError(errorMessage);
      } else {
        // Endpoint non disponibile - usa impostazioni di default
      }
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

      const respData = await apiPut<GDPRApiResponse<{ settings: PrivacySettings }>>(
        '/api/v1/persons/me/privacy-settings',
        data
      );

      if (respData.success && respData.data) {
        setSettings(respData.data.settings);
        setHasUnsavedChanges(false);
        // Toast handled by calling component
      } else {
        throw new Error(respData.error || 'Errore nell\'aggiornamento delle impostazioni privacy');
      }
    } catch (err) {
      const errorMessage = 'Errore nell\'aggiornamento delle impostazioni privacy';
      setError(errorMessage);
      // Toast handled by calling component
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update a single privacy setting
   */
  const updateSingleSetting = useCallback((
    key: keyof PrivacySettings,
    value: unknown
  ) => {
    if (!settings) return;

    // Filter out read-only properties
    if (key === 'id' || key === 'userId' || key === 'updatedAt') {
      return;
    }

    void (async () => {
      try {
        const updatedSettings = {
          dataProcessingConsent: settings.dataProcessingConsent,
          marketingConsent: settings.marketingConsent,
          analyticsConsent: settings.analyticsConsent,
          profileVisibility: settings.profileVisibility,
          dataRetentionOptOut: settings.dataRetentionOptOut,
          thirdPartySharing: settings.thirdPartySharing,
          emailNotifications: settings.emailNotifications,
          marketingEmails: settings.marketingEmails,
          analyticsTracking: settings.analyticsTracking,
          dataRetentionPeriod: settings.dataRetentionPeriod,
          autoDeleteInactive: settings.autoDeleteInactive,
          twoFactorAuth: settings.twoFactorAuth,
          sessionTimeout: settings.sessionTimeout,
          [key]: value
        } as PrivacySettingsFormData;

        await updatePrivacySettings(updatedSettings);
      } catch (err) {
        // Error handling is done in updatePrivacySettings
        throw err;
      }
    })();
  }, [settings, updatePrivacySettings]);

  /**
   * Reset privacy settings to defaults
   */
  const resetToDefaults = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const respData = await apiPost<GDPRApiResponse<{ settings: PrivacySettings }>>(
        '/api/v1/persons/me/privacy-settings/reset'
      );

      if (respData.success && respData.data) {
        setSettings(respData.data.settings);
        setHasUnsavedChanges(false);
        // Toast handled by calling component
      } else {
        throw new Error(respData.error || 'Errore nel ripristino delle impostazioni privacy');
      }
    } catch (err) {
      const errorMessage = 'Errore nel ripristino delle impostazioni privacy';
      setError(errorMessage);
      // Toast handled by calling component
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

    interface ComplianceRecommendation {
      id: string;
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      category: string;
    }

    const recommendations: ComplianceRecommendation[] = [];

    if (!settings.dataProcessingConsent) {
      recommendations.push({
        id: 'data-processing-consent',
        title: 'Data Processing Consent',
        description: 'Consider providing explicit consent for data processing to ensure compliance.',
        priority: 'high',
        category: 'Consent'
      });
    }

    if (settings.thirdPartySharing) {
      recommendations.push({
        id: 'third-party-sharing',
        title: 'Third-Party Data Sharing',
        description: 'Review third-party data sharing settings to minimize privacy risks.',
        priority: 'medium',
        category: 'Data Sharing'
      });
    }

    if (!settings.dataRetentionOptOut && settings.profileVisibility) {
      recommendations.push({
        id: 'data-retention',
        title: 'Data Retention Settings',
        description: 'Consider opting out of extended data retention for better privacy.',
        priority: 'medium',
        category: 'Data Retention'
      });
    }

    if (!settings.analyticsConsent && !settings.marketingConsent) {
      recommendations.push({
        id: 'analytics-marketing',
        title: 'Analytics & Marketing',
        description: 'You have opted out of analytics and marketing. This maximizes privacy but may limit personalized features.',
        priority: 'low',
        category: 'User Experience'
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        id: 'compliance-ok',
        title: 'Settings Compliant',
        description: 'Your privacy settings are well-configured for GDPR compliance.',
        priority: 'low',
        category: 'Compliance'
      });
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
    const descriptions: Partial<Record<keyof PrivacySettings, string>> = {
      dataProcessingConsent: 'Allow processing of your personal data for core platform functionality',
      marketingConsent: 'Receive marketing communications and promotional content',
      analyticsConsent: 'Allow collection of usage analytics to improve our services',
      profileVisibility: 'Make your profile visible to other users within your organization',
      dataRetentionOptOut: 'Opt out of extended data retention beyond legal requirements',
      thirdPartySharing: 'Allow sharing of anonymized data with trusted third-party partners',
      emailNotifications: 'Receive email notifications for important updates',
      marketingEmails: 'Receive promotional emails and newsletters',
      analyticsTracking: 'Allow tracking for analytics purposes',
      dataRetentionPeriod: 'Period for which your data will be retained',
      autoDeleteInactive: 'Automatically delete data after inactivity period',
      twoFactorAuth: 'Enable two-factor authentication for enhanced security',
      sessionTimeout: 'Automatic session timeout duration'
    };

    return descriptions[key] || '';
  }, []);

  /**
   * Get setting impact level for UI
   */
  const getSettingImpact = useCallback((key: keyof PrivacySettings) => {
    const impacts: Partial<Record<keyof PrivacySettings, string>> = {
      dataProcessingConsent: 'high', // Core functionality
      marketingConsent: 'low',
      analyticsConsent: 'medium',
      profileVisibility: 'medium',
      dataRetentionOptOut: 'medium',
      thirdPartySharing: 'low',
      emailNotifications: 'medium',
      marketingEmails: 'low',
      analyticsTracking: 'medium',
      dataRetentionPeriod: 'medium',
      autoDeleteInactive: 'medium',
      twoFactorAuth: 'high',
      sessionTimeout: 'medium'
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

    // Toast handled by calling component
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