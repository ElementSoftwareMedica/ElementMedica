/**
 * Deletion Request Tab Component
 * Handles "Right to be Forgotten" requests
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
  Alert,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Tooltip,
  IconButton,
  TextField,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { UseDeletionRequestReturn, DeletionRequestFormData, DeletionRequest } from '../../types/gdpr';
import { format, formatDistanceToNow } from 'date-fns';

interface DeletionRequestTabProps {
  hook: UseDeletionRequestReturn;
}

export const DeletionRequestTab: React.FC<DeletionRequestTabProps> = ({ hook }) => {
  const {
    deletionRequests,
    loading,
    error,
    submitDeletionRequest,
    cancelDeletionRequest,
    refreshRequests,
    getDeletionStats,
    getLatestRequest,
    canSubmitNewRequest,
    getStatusColor,
    getStatusDescription,
    formatRequestForDisplay,
    validateFormData
  } = hook;

  const [newRequestDialog, setNewRequestDialog] = useState(false);
  const [requestForm, setRequestForm] = useState<DeletionRequestFormData>({
    reason: '',
    confirmEmail: '',
    additionalInfo: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  const stats = getDeletionStats();
  const latestRequest = getLatestRequest();

  const handleFormChange = (field: keyof DeletionRequestFormData, value: string) => {
    setRequestForm(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmitRequest = async () => {
    const validation = validateFormData(requestForm);
    
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    try {
      setProcessingRequest('new');
      await submitDeletionRequest(requestForm);
      setNewRequestDialog(false);
      setActiveStep(0);
      // Reset form
      setRequestForm({
        reason: '',
        confirmEmail: '',
        additionalInfo: ''
      });
      setFormErrors({});
    } catch (error) {
      console.error('Error submitting deletion request:', error);
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      setProcessingRequest(requestId);
      await cancelDeletionRequest(requestId);
    } catch (error) {
      console.error('Error cancelling deletion request:', error);
    } finally {
      setProcessingRequest(null);
    }
  };

  const getStatusIcon = (status: DeletionRequest['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'approved':
        return <CheckCircleIcon color="info" />;
      case 'rejected':
        return <ErrorIcon color="error" />;
      case 'cancelled':
        return <CancelIcon color="disabled" />;
      case 'pending':
        return <ScheduleIcon color="warning" />;
      default:
        return <InfoIcon />;
    }
  };

  const canCancel = (request: DeletionRequest) => {
    return request.status === 'pending';
  };

  const steps = [
    {
      label: 'Provide Reason',
      description: 'Explain why you want to delete your data'
    },
    {
      label: 'Confirm Identity',
      description: 'Verify your email address'
    },
    {
      label: 'Review & Submit',
      description: 'Review your request before submission'
    }
  ];

  const handleNext = () => {
    if (activeStep === 0) {
      if (!requestForm.reason || requestForm.reason.trim().length < 10) {
        setFormErrors({ reason: 'Please provide a detailed reason (minimum 10 characters)' });
        return;
      }
    } else if (activeStep === 1) {
      if (!requestForm.confirmEmail) {
        setFormErrors({ confirmEmail: 'Email confirmation is required' });
        return;
      }
    }
    
    setFormErrors({});
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h6" component="h2">
          Data Deletion Requests
        </Typography>
        
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label={`${stats.active} Active`}
            color={stats.active > 0 ? 'warning' : 'default'}
            size="small"
          />
          
          <Tooltip title="Refresh deletion requests">
            <IconButton onClick={refreshRequests} disabled={loading} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Button
            variant="contained"
            startIcon={<DeleteIcon />}
            onClick={() => setNewRequestDialog(true)}
            disabled={!canSubmitNewRequest() || loading}
            color="error"
          >
            Request Deletion
          </Button>
        </Stack>
      </Stack>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Cannot Submit Alert */}
      {!canSubmitNewRequest() && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          You already have an active deletion request. Only one deletion request can be active at a time.
        </Alert>
      )}

      {/* Warning Alert */}
      <Alert severity="warning" sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Important: Data Deletion is Permanent
        </Typography>
        <Typography variant="body2">
          Once your data deletion request is approved and processed, all your personal information 
          will be permanently removed from our systems. This action cannot be undone.
        </Typography>
      </Alert>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                {stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Requests
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main" gutterBottom>
                {stats.pending}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending Review
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main" gutterBottom>
                {stats.completed}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="error.main" gutterBottom>
                {stats.rejected}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Rejected
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Latest Request Status */}
      {latestRequest && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Latest Request Status
            </Typography>
            
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              {getStatusIcon(latestRequest.status)}
              <Chip
                label={latestRequest.status}
                color={getStatusColor(latestRequest.status)}
                variant="outlined"
              />
              <Typography variant="body2" color="text.secondary">
                Submitted {formatDistanceToNow(new Date(latestRequest.requestDate))} ago
              </Typography>
            </Stack>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {getStatusDescription(latestRequest.status)}
            </Typography>
            
            {latestRequest.adminNotes && (
              <Alert severity="info">
                <Typography variant="subtitle2" gutterBottom>
                  Admin Notes:
                </Typography>
                <Typography variant="body2">
                  {latestRequest.adminNotes}
                </Typography>
              </Alert>
            )}
            
            {canCancel(latestRequest) && (
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<CancelIcon />}
                  onClick={() => handleCancelRequest(latestRequest.id)}
                  disabled={processingRequest === latestRequest.id}
                >
                  Cancel Request
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Deletion Requests History */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Request History
          </Typography>
          
          {loading && deletionRequests.length === 0 ? (
            <Box sx={{ py: 3 }}>
              <LinearProgress />
              <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
                Loading deletion requests...
              </Typography>
            </Box>
          ) : deletionRequests.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                No deletion requests found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                You have not submitted any data deletion requests yet.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Status</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Submitted</TableCell>
                    <TableCell>Processed</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deletionRequests.map((request) => {
                    const formattedRequest = formatRequestForDisplay(request);
                    
                    return (
                      <TableRow key={request.id}>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            {getStatusIcon(request.status)}
                            <Chip
                              label={request.status}
                              color={getStatusColor(request.status)}
                              size="small"
                              variant="outlined"
                            />
                          </Stack>
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2" sx={{ maxWidth: 200 }}>
                            {request.reason.length > 50 
                              ? `${request.reason.substring(0, 50)}...`
                              : request.reason
                            }
                          </Typography>
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2">
                            {formattedRequest.formattedRequestDate}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formattedRequest.daysSinceRequest} days ago
                          </Typography>
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2">
                            {formattedRequest.formattedProcessedDate || 'Not processed'}
                          </Typography>
                        </TableCell>
                        
                        <TableCell align="right">
                          {canCancel(request) && (
                            <Tooltip title="Cancel request">
                              <IconButton
                                size="small"
                                onClick={() => handleCancelRequest(request.id)}
                                disabled={processingRequest === request.id}
                                color="error"
                              >
                                <CancelIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Information Accordion */}
      <Accordion sx={{ mt: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">
            Right to be Forgotten - Information
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" paragraph>
            Under GDPR Article 17, you have the right to request the deletion of your personal data 
            in certain circumstances:
          </Typography>
          
          <ul>
            <li>The personal data is no longer necessary for the original purpose</li>
            <li>You withdraw consent and there's no other legal basis for processing</li>
            <li>Your personal data has been unlawfully processed</li>
            <li>Deletion is required for compliance with a legal obligation</li>
          </ul>
          
          <Typography variant="body2" paragraph>
            Please note that we may not be able to delete your data if:
          </Typography>
          
          <ul>
            <li>We need to keep it for legal compliance</li>
            <li>It's necessary for the establishment, exercise, or defense of legal claims</li>
            <li>There are legitimate interests that override your right to deletion</li>
          </ul>
        </AccordionDetails>
      </Accordion>

      {/* New Deletion Request Dialog */}
      <Dialog
        open={newRequestDialog}
        onClose={() => setNewRequestDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <WarningIcon color="error" />
            Request Data Deletion
          </Stack>
        </DialogTitle>
        
        <DialogContent>
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Warning: This action is irreversible
            </Typography>
            <Typography variant="body2">
              Once approved, all your personal data will be permanently deleted from our systems.
            </Typography>
          </Alert>
          
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel>
                  {step.label}
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {step.description}
                  </Typography>
                  
                  {index === 0 && (
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label="Reason for deletion *"
                      value={requestForm.reason}
                      onChange={(e) => handleFormChange('reason', e.target.value)}
                      error={!!formErrors.reason}
                      helperText={formErrors.reason || 'Please provide a detailed explanation (minimum 10 characters)'}
                      placeholder="Please explain why you want to delete your data..."
                    />
                  )}
                  
                  {index === 1 && (
                    <Box>
                      <TextField
                        fullWidth
                        label="Confirm your email address *"
                        type="email"
                        value={requestForm.confirmEmail}
                        onChange={(e) => handleFormChange('confirmEmail', e.target.value)}
                        error={!!formErrors.confirmEmail}
                        helperText={formErrors.confirmEmail || 'Enter your account email to confirm your identity'}
                        sx={{ mb: 2 }}
                      />
                      
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Additional information (optional)"
                        value={requestForm.additionalInfo}
                        onChange={(e) => handleFormChange('additionalInfo', e.target.value)}
                        helperText="Any additional context or specific requests"
                        placeholder="Optional: Any additional information..."
                      />
                    </Box>
                  )}
                  
                  {index === 2 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Review Your Request:
                      </Typography>
                      
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="body2" gutterBottom>
                          <strong>Reason:</strong> {requestForm.reason}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Email:</strong> {requestForm.confirmEmail}
                        </Typography>
                        {requestForm.additionalInfo && (
                          <Typography variant="body2">
                            <strong>Additional Info:</strong> {requestForm.additionalInfo}
                          </Typography>
                        )}
                      </Paper>
                    </Box>
                  )}
                  
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={index === steps.length - 1 ? handleSubmitRequest : handleNext}
                      disabled={processingRequest === 'new'}
                    >
                      {index === steps.length - 1 ? 'Submit Request' : 'Next'}
                    </Button>
                    
                    {index > 0 && (
                      <Button
                        onClick={handleBack}
                        sx={{ ml: 1 }}
                        disabled={processingRequest === 'new'}
                      >
                        Back
                      </Button>
                    )}
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={() => {
              setNewRequestDialog(false);
              setActiveStep(0);
              setFormErrors({});
            }}
            disabled={processingRequest === 'new'}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeletionRequestTab;