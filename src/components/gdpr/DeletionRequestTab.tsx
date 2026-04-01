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
import { formatDistanceToNow } from 'date-fns';

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
    anonymize: false,
    confirmDeletion: false,
    additionalInfo: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  const stats = getDeletionStats();
  const latestRequest = getLatestRequest();

  const handleFormChange = (field: keyof DeletionRequestFormData, value: string | boolean) => {
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
        anonymize: false,
        confirmDeletion: false,
        additionalInfo: ''
      });
      setFormErrors({});
    } catch (error) {
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      setProcessingRequest(requestId);
      await cancelDeletionRequest(requestId);
    } catch (error) {
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
      label: 'Fornisci motivazione',
      description: 'Spiega perché desideri eliminare i tuoi dati'
    },
    {
      label: 'Conferma identità',
      description: 'Verifica il tuo indirizzo email'
    },
    {
      label: 'Revisione e invio',
      description: 'Rivedi la tua richiesta prima dell\'invio'
    }
  ];

  const handleNext = () => {
    if (activeStep === 0) {
      if (!requestForm.reason || requestForm.reason.trim().length < 10) {
        setFormErrors({ reason: 'Fornisci una motivazione dettagliata (minimo 10 caratteri)' });
        return;
      }
    } else if (activeStep === 1) {
      if (!requestForm.confirmEmail) {
        setFormErrors({ confirmEmail: 'La conferma dell\'email è obbligatoria' });
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
          Richieste di eliminazione dati
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label={`${stats.active} Attive`}
            color={stats.active > 0 ? 'warning' : 'default'}
            size="small"
          />

          <Tooltip title="Aggiorna richieste di eliminazione">
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
            Richiedi eliminazione
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
          Hai già una richiesta di eliminazione attiva. È possibile avere una sola richiesta attiva alla volta.
        </Alert>
      )}

      {/* Warning Alert */}
      <Alert severity="warning" sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Importante: l'eliminazione dei dati è permanente
        </Typography>
        <Typography variant="body2">
          Una volta approvata e processata la richiesta di eliminazione, tutte le informazioni personali
          verranno rimosse permanentemente dai nostri sistemi. Questa azione non può essere annullata.
        </Typography>
      </Alert>

      {/* Stats Cards */}
      <Box
        sx={{
          mb: 4,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 3
        }}
      >
        <Card>
          <CardContent>
            <Typography variant="h6" color="primary" gutterBottom>
              {stats.total}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Richieste totali
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" color="warning.main" gutterBottom>
              {stats.pending}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              In attesa di revisione
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" color="success.main" gutterBottom>
              {stats.completed}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Completate
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" color="error.main" gutterBottom>
              {stats.rejected}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Rifiutate
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Latest Request Status */}
      {latestRequest && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Stato ultima richiesta
            </Typography>

            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              {getStatusIcon(latestRequest.status)}
              <Chip
                label={latestRequest.status}
                color={getStatusColor(latestRequest.status) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                variant="outlined"
              />
              <Typography variant="body2" color="text.secondary">
                Inviata {formatDistanceToNow(new Date(latestRequest.requestDate))} fa
              </Typography>
            </Stack>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {getStatusDescription(latestRequest.status)}
            </Typography>

            {latestRequest.adminNotes && (
              <Alert severity="info">
                <Typography variant="subtitle2" gutterBottom>
                  Note amministratore:
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
                  Annulla richiesta
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
            Storico richieste
          </Typography>

          {loading && deletionRequests.length === 0 ? (
            <Box sx={{ py: 3 }}>
              <LinearProgress />
              <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
                Caricamento richieste di eliminazione...
              </Typography>
            </Box>
          ) : deletionRequests.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                Nessuna richiesta di eliminazione trovata
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Non hai ancora inviato richieste di eliminazione dati.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Stato</TableCell>
                    <TableCell>Motivazione</TableCell>
                    <TableCell>Inviata</TableCell>
                    <TableCell>Processata</TableCell>
                    <TableCell align="right">Azioni</TableCell>
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
                              color={getStatusColor(request.status) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
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
                            {formattedRequest.daysSinceRequest} giorni fa
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2">
                            {formattedRequest.formattedProcessedDate || 'Non ancora processata'}
                          </Typography>
                        </TableCell>

                        <TableCell align="right">
                          {canCancel(request) && (
                            <Tooltip title="Annulla richiesta">
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
            Diritto all'oblio - Informazioni
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" paragraph>
            Ai sensi dell'articolo 17 del GDPR, hai il diritto di richiedere la cancellazione dei tuoi dati personali
            in determinate circostanze:
          </Typography>

          <ul>
            <li>I dati personali non sono più necessari per lo scopo originale</li>
            <li>Revochi il consenso e non esiste altra base giuridica per il trattamento</li>
            <li>I tuoi dati personali sono stati trattati illecitamente</li>
            <li>La cancellazione è necessaria per conformità a un obbligo legale</li>
          </ul>

          <Typography variant="body2" paragraph>
            Tieni presente che potremmo non essere in grado di eliminare i tuoi dati se:
          </Typography>

          <ul>
            <li>Dobbiamo conservarli per conformità legale</li>
            <li>È necessario per l'accertamento, l'esercizio o la difesa di un diritto in sede giudiziaria</li>
            <li>Esistono interessi legittimi che prevalgono sul diritto alla cancellazione</li>
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
            Richiedi eliminazione dati
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Attenzione: questa azione è irreversibile
            </Typography>
            <Typography variant="body2">
              Una volta approvata, tutti i tuoi dati personali verranno eliminati permanentemente dai nostri sistemi.
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
                      label="Motivazione dell'eliminazione *"
                      value={requestForm.reason}
                      onChange={(e) => handleFormChange('reason', e.target.value)}
                      error={!!formErrors.reason}
                      helperText={formErrors.reason || 'Fornisci una spiegazione dettagliata (minimo 10 caratteri)'}
                      placeholder="Spiega perché desideri eliminare i tuoi dati..."
                    />
                  )}

                  {index === 1 && (
                    <Box>
                      <TextField
                        fullWidth
                        label="Conferma il tuo indirizzo email *"
                        type="email"
                        value={requestForm.confirmEmail}
                        onChange={(e) => handleFormChange('confirmEmail', e.target.value)}
                        error={!!formErrors.confirmEmail}
                        helperText={formErrors.confirmEmail || 'Inserisci l\'email del tuo account per confermare la tua identità'}
                        sx={{ mb: 2 }}
                      />

                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Informazioni aggiuntive (opzionale)"
                        value={requestForm.additionalInfo}
                        onChange={(e) => handleFormChange('additionalInfo', e.target.value)}
                        helperText="Contesto aggiuntivo o richieste specifiche"
                        placeholder="Opzionale: informazioni aggiuntive..."
                      />
                    </Box>
                  )}

                  {index === 2 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Rivedi la tua richiesta:
                      </Typography>

                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="body2" gutterBottom>
                          <strong>Motivazione:</strong> {requestForm.reason}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Email:</strong> {requestForm.confirmEmail}
                        </Typography>
                        {requestForm.additionalInfo && (
                          <Typography variant="body2">
                            <strong>Info aggiuntive:</strong> {requestForm.additionalInfo}
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
                      {index === steps.length - 1 ? 'Invia richiesta' : 'Avanti'}
                    </Button>

                    {index > 0 && (
                      <Button
                        onClick={handleBack}
                        sx={{ ml: 1 }}
                        disabled={processingRequest === 'new'}
                      >
                        Indietro
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
            Annulla
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeletionRequestTab;