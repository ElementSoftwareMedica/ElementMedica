/**
 * Consent Management Tab Component
 * Handles GDPR consent management interface
 */

import React, { useState } from 'react';
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
  IconButton
} from '@mui/material';
import {
  Security as SecurityIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { UseGDPRConsentReturn, ConsentType, CONSENT_TYPES } from '../../types/gdpr';
import { format } from 'date-fns';

interface ConsentManagementTabProps {
  hook: UseGDPRConsentReturn;
}

export const ConsentManagementTab: React.FC<ConsentManagementTabProps> = ({ hook }) => {
  const {
    consents,
    loading,
    error,
    grantConsent,
    withdrawConsent,
    refreshConsents,
    getConsentStats,
    hasConsent,
    getConsentByType
  } = hook;

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: ConsentType | null;
    action: 'grant' | 'withdraw';
  }>({ open: false, type: null, action: 'grant' });

  const [processingConsent, setProcessingConsent] = useState<string | null>(null);

  const stats = getConsentStats();

  const handleConsentToggle = (type: ConsentType, currentStatus: boolean) => {
    setConfirmDialog({
      open: true,
      type,
      action: currentStatus ? 'withdraw' : 'grant'
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmDialog.type) return;

    try {
      setProcessingConsent(confirmDialog.type);
      
      if (confirmDialog.action === 'grant') {
        await grantConsent(confirmDialog.type);
      } else {
        await withdrawConsent(confirmDialog.type);
      }
    } catch (error) {
      console.error('Error processing consent:', error);
    } finally {
      setProcessingConsent(null);
      setConfirmDialog({ open: false, type: null, action: 'grant' });
    }
  };

  const getConsentStatusColor = (type: ConsentType) => {
    return hasConsent(type) ? 'success' : 'default';
  };

  const getConsentStatusIcon = (type: ConsentType) => {
    return hasConsent(type) ? <CheckCircleIcon /> : <CancelIcon />;
  };

  const formatConsentDate = (consent: any) => {
    if (!consent) return 'Never';
    return format(new Date(consent.grantedAt || consent.withdrawnAt), 'PPp');
  };

  if (loading && consents.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
          Loading consent information...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h6" component="h2">
          Consent Management
        </Typography>
        
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label={`${stats.granted}/${stats.total} Granted`}
            color={stats.granted === stats.total ? 'success' : 'warning'}
            size="small"
          />
          
          <Tooltip title="Refresh consent data">
            <IconButton onClick={refreshConsents} disabled={loading} size="small">
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

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                {stats.granted}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Consents
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main" gutterBottom>
                {stats.withdrawn}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Withdrawn Consents
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="info.main" gutterBottom>
                {Math.round((stats.granted / stats.total) * 100)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Compliance Rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Consent Types List */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Consent Preferences
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Manage your consent for different types of data processing. You can withdraw consent at any time.
          </Typography>

          <List>
            {Object.entries(CONSENT_TYPES).map(([type, config], index) => {
              const consentType = type as ConsentType;
              const consent = getConsentByType(consentType);
              const isGranted = hasConsent(consentType);
              const isProcessing = processingConsent === consentType;

              return (
                <React.Fragment key={consentType}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="subtitle1">
                            {config.label}
                          </Typography>
                          <Chip
                            icon={getConsentStatusIcon(consentType)}
                            label={isGranted ? 'Granted' : 'Withdrawn'}
                            color={getConsentStatusColor(consentType)}
                            size="small"
                          />
                        </Stack>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            {config.description}
                          </Typography>
                          {consent && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                              Last updated: {formatConsentDate(consent)}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    
                    <ListItemSecondaryAction>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={isGranted}
                            onChange={() => handleConsentToggle(consentType, isGranted)}
                            disabled={isProcessing || loading}
                            color="primary"
                          />
                        }
                        label=""
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  {index < Object.keys(CONSENT_TYPES).length - 1 && <Divider />}
                </React.Fragment>
              );
            })}
          </List>
        </CardContent>
      </Card>

      {/* Information Alert */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <InfoIcon fontSize="small" />
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Your Rights Under GDPR
            </Typography>
            <Typography variant="body2">
              You have the right to withdraw consent at any time. Withdrawing consent will not affect 
              the lawfulness of processing based on consent before its withdrawal. Some features may 
              become unavailable if you withdraw certain consents.
            </Typography>
          </Box>
        </Stack>
      </Alert>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, type: null, action: 'grant' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {confirmDialog.action === 'grant' ? 'Grant Consent' : 'Withdraw Consent'}
        </DialogTitle>
        
        <DialogContent>
          {confirmDialog.type && (
            <Box>
              <Typography variant="body1" gutterBottom>
                Are you sure you want to {confirmDialog.action} consent for:
              </Typography>
              
              <Typography variant="subtitle1" color="primary" gutterBottom>
                {CONSENT_TYPES[confirmDialog.type]?.label}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {CONSENT_TYPES[confirmDialog.type]?.description}
              </Typography>
              
              {confirmDialog.action === 'withdraw' && (
                <Alert severity="warning">
                  Withdrawing this consent may limit certain features or functionality.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={() => setConfirmDialog({ open: false, type: null, action: 'grant' })}
            disabled={processingConsent !== null}
          >
            Cancel
          </Button>
          
          <Button 
            onClick={handleConfirmAction}
            variant="contained"
            disabled={processingConsent !== null}
            color={confirmDialog.action === 'withdraw' ? 'warning' : 'primary'}
          >
            {processingConsent ? 'Processing...' : `${confirmDialog.action === 'grant' ? 'Grant' : 'Withdraw'} Consent`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConsentManagementTab;