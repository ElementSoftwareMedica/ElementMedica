/**
 * Privacy Settings Tab Component
 * Handles privacy preferences and GDPR settings
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  LinearProgress,
  Tooltip,
  IconButton,
  CircularProgress,
  Paper
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Info as InfoIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  RestoreFromTrash as RestoreIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { UsePrivacySettingsReturn, PrivacySettingsFormData } from '../../types/gdpr';

interface PrivacySettingsTabProps {
  hook: UsePrivacySettingsReturn;
}

export const PrivacySettingsTab: React.FC<PrivacySettingsTabProps> = ({ hook }) => {
  const {
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
  } = hook;

  const [localSettings, setLocalSettings] = useState<PrivacySettingsFormData | null>(null);
  const [resetDialog, setResetDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize local settings when settings are loaded
  useEffect(() => {
    if (settings && !localSettings) {
      setLocalSettings({
        dataProcessingConsent: settings.dataProcessingConsent,
        marketingConsent: settings.marketingConsent,
        analyticsConsent: settings.analyticsConsent,
        profileVisibility: settings.profileVisibility,
        dataRetentionOptOut: settings.dataRetentionOptOut,
        thirdPartySharing: settings.thirdPartySharing
      });
    }
  }, [settings, localSettings]);

  // Check for changes when local settings change
  useEffect(() => {
    if (localSettings) {
      checkForChanges(localSettings);
    }
  }, [localSettings, checkForChanges]);

  const handleSettingChange = (key: keyof PrivacySettingsFormData, value: boolean) => {
    setLocalSettings(prev => prev ? { ...prev, [key]: value } : null);
  };

  const handleSave = async () => {
    if (!localSettings) return;

    try {
      setSaving(true);
      await updatePrivacySettings(localSettings);
    } catch (error) {
      console.error('Error saving privacy settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      await resetToDefaults();
      setResetDialog(false);
      // Settings will be updated via the hook
    } catch (error) {
      console.error('Error resetting privacy settings:', error);
    }
  };

  const handleQuickToggle = async (key: keyof PrivacySettingsFormData, value: boolean) => {
    try {
      await updateSingleSetting(key, value);
    } catch (error) {
      console.error('Error updating setting:', error);
    }
  };

  const complianceScore = getComplianceScore();
  const recommendations = getComplianceRecommendations();

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  if (loading && !settings) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
          Loading privacy settings...
        </Typography>
      </Box>
    );
  }

  if (!settings || !localSettings) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          Unable to load privacy settings. Please try refreshing the page.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h6" component="h2">
          Privacy Settings
        </Typography>
        
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            icon={<SecurityIcon />}
            label={`Compliance: ${complianceScore}%`}
            color={getScoreColor(complianceScore)}
            size="small"
          />
          
          <Tooltip title="Export settings">
            <IconButton onClick={exportSettings} size="small">
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Refresh settings">
            <IconButton onClick={refreshSettings} disabled={loading} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Unsaved Changes Alert */}
      {hasUnsavedChanges && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2">
              You have unsaved changes to your privacy settings.
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Stack>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Settings Panel */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Privacy Preferences
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Configure your privacy settings to control how your data is processed and shared.
              </Typography>

              <List>
                {Object.entries(localSettings).map(([key, value], index) => {
                  const settingKey = key as keyof PrivacySettingsFormData;
                  const description = getSettingDescription(settingKey);
                  const impact = getSettingImpact(settingKey);
                  const isBoolean = typeof value === 'boolean';

                  if (!isBoolean) return null;

                  return (
                    <React.Fragment key={settingKey}>
                      <ListItem>
                        <ListItemText
                          primary={
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="subtitle1">
                                {settingKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                              </Typography>
                              <Chip
                                label={impact}
                                color={getImpactColor(impact)}
                                size="small"
                                variant="outlined"
                              />
                            </Stack>
                          }
                          secondary={
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {description}
                            </Typography>
                          }
                        />
                        
                        <ListItemSecondaryAction>
                          <Stack direction="row" spacing={1} alignItems="center">
                            {/* Quick toggle for immediate save */}
                            <Tooltip title="Apply immediately">
                              <IconButton
                                size="small"
                                onClick={() => handleQuickToggle(settingKey, !value)}
                                disabled={loading}
                              >
                                <SaveIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={value}
                                  onChange={(e) => handleSettingChange(settingKey, e.target.checked)}
                                  disabled={loading}
                                  color="primary"
                                />
                              }
                              label=""
                            />
                          </Stack>
                        </ListItemSecondaryAction>
                      </ListItem>
                      
                      {index < Object.keys(localSettings).length - 1 && <Divider />}
                    </React.Fragment>
                  );
                })}
              </List>
            </CardContent>
            
            <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
              <Button
                startIcon={<RestoreIcon />}
                onClick={() => setResetDialog(true)}
                disabled={loading}
                color="warning"
              >
                Reset to Defaults
              </Button>
              
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  onClick={refreshSettings}
                  disabled={loading}
                >
                  Refresh
                </Button>
                
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges || saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </Stack>
            </CardActions>
          </Card>
        </Grid>

        {/* Compliance Panel */}
        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            {/* Compliance Score */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Compliance Score
                </Typography>
                
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                  <Typography variant="h3" color={getScoreColor(complianceScore)}>
                    {complianceScore}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    GDPR Compliance
                  </Typography>
                </Box>
                
                <LinearProgress
                  variant="determinate"
                  value={complianceScore}
                  color={getScoreColor(complianceScore)}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recommendations
                </Typography>
                
                {recommendations.length > 0 ? (
                  <List dense>
                    {recommendations.map((recommendation, index) => (
                      <ListItem key={index} sx={{ px: 0 }}>
                        <ListItemText
                          primary={
                            <Typography variant="body2">
                              {recommendation}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No recommendations at this time. Your settings look good!
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* Privacy Info */}
            <Paper sx={{ p: 2, bgcolor: 'info.light', color: 'info.contrastText' }}>
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <InfoIcon fontSize="small" />
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Privacy Notice
                  </Typography>
                  <Typography variant="body2">
                    These settings control how we process your personal data. 
                    Changes take effect immediately and are logged for compliance.
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>

      {/* Reset Confirmation Dialog */}
      <Dialog
        open={resetDialog}
        onClose={() => setResetDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <WarningIcon color="warning" />
            Reset Privacy Settings
          </Stack>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to reset all privacy settings to their default values?
          </Typography>
          
          <Alert severity="warning" sx={{ mt: 2 }}>
            This action cannot be undone. All your current privacy preferences will be lost.
          </Alert>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setResetDialog(false)}>
            Cancel
          </Button>
          
          <Button 
            onClick={handleReset}
            variant="contained"
            color="warning"
            disabled={loading}
          >
            Reset Settings
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PrivacySettingsTab;