/**
 * Data Export Tab Component
 * Handles GDPR data export requests and downloads
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
  LinearProgress,
  Tooltip,
  IconButton,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox
} from '@mui/material';
import {
  Download as DownloadIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { UseDataExportReturn, DataExportFormData, DataExportRequest } from '../../types/gdpr';
import { format, formatDistanceToNow } from 'date-fns';

interface DataExportTabProps {
  hook: UseDataExportReturn;
}

export const DataExportTab: React.FC<DataExportTabProps> = ({ hook }) => {
  const {
    exportRequests,
    loading,
    error,
    requestExport,
    downloadExport,
    cancelExport,
    refreshRequests,
    getExportStats,
    getLatestExport,
    canRequestNewExport
  } = hook;

  const [newExportDialog, setNewExportDialog] = useState(false);
  const [exportForm, setExportForm] = useState<DataExportFormData>({
    format: 'json',
    includeAuditTrail: true,
    includeConsents: true
  });
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  const stats = getExportStats();
  const latestExport = getLatestExport();

  const handleRequestExport = async () => {
    try {
      setProcessingRequest('new');
      await requestExport(exportForm);
      setNewExportDialog(false);
      // Reset form
      setExportForm({
        format: 'json',
        includeAuditTrail: true,
        includeConsents: true
      });
    } catch (error) {
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleDownload = async (requestId: string) => {
    try {
      setProcessingRequest(requestId);
      await downloadExport(requestId);
    } catch (error) {
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleCancel = async (requestId: string) => {
    try {
      setProcessingRequest(requestId);
      await cancelExport(requestId);
    } catch (error) {
    } finally {
      setProcessingRequest(null);
    }
  };

  const getStatusIcon = (status: DataExportRequest['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'processing':
        return <ScheduleIcon color="info" />;
      case 'pending':
        return <ScheduleIcon color="warning" />;
      default:
        return <InfoIcon />;
    }
  };

  const getStatusColor = (status: DataExportRequest['status']) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'processing':
        return 'info';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: DataExportRequest['status']) => {
    switch (status) {
      case 'completed': return 'Completata';
      case 'failed': return 'Non riuscita';
      case 'processing': return 'In elaborazione';
      case 'pending': return 'In attesa';
      default: return status;
    }
  };

  const isExpired = (request: DataExportRequest) => {
    return request.expiryDate && new Date() > new Date(request.expiryDate);
  };

  const canDownload = (request: DataExportRequest) => {
    return request.status === 'completed' && request.downloadUrl && !isExpired(request);
  };

  const canCancel = (request: DataExportRequest) => {
    return request.status === 'pending' || request.status === 'processing';
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h6" component="h2">
          Esportazione dati
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label={`${stats.available} Disponibili`}
            color={stats.available > 0 ? 'success' : 'default'}
            size="small"
          />

          <Tooltip title="Aggiorna richieste di esportazione">
            <IconButton onClick={refreshRequests} disabled={loading} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setNewExportDialog(true)}
            disabled={!canRequestNewExport() || loading}
          >
            Nuova esportazione
          </Button>
        </Stack>
      </Stack>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Cannot Request Alert */}
      {!canRequestNewExport() && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Hai raggiunto il numero massimo di richieste di esportazione simultanee.
          Attendi il completamento delle richieste esistenti o annullale.
        </Alert>
      )}

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
            <Typography variant="h6" color="info.main" gutterBottom>
              {stats.processing + stats.pending}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              In elaborazione
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" color="warning.main" gutterBottom>
              {stats.expired}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Scadute
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Latest Export Quick Access */}
      {latestExport && canDownload(latestExport) && (
        <Card sx={{ mb: 3, bgcolor: 'success.light' }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Ultima esportazione pronta
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Richiesta {formatDistanceToNow(new Date(latestExport.requestDate))} fa •
                  Formato: {latestExport.format.toUpperCase()} •
                  Scade tra {formatDistanceToNow(new Date(latestExport.expiryDate!))}
                </Typography>
              </Box>

              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={() => handleDownload(latestExport.id)}
                disabled={processingRequest === latestExport.id}
              >
                Scarica
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Export Requests Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Storico esportazioni
          </Typography>

          {loading && exportRequests.length === 0 ? (
            <Box sx={{ py: 3 }}>
              <LinearProgress />
              <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
                Caricamento richieste di esportazione...
              </Typography>
            </Box>
          ) : exportRequests.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                Nessuna richiesta di esportazione trovata
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Crea la tua prima esportazione dati per scaricare le tue informazioni personali.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Stato</TableCell>
                    <TableCell>Formato</TableCell>
                    <TableCell>Richiesta</TableCell>
                    <TableCell>Scadenza</TableCell>
                    <TableCell>Dimensione</TableCell>
                    <TableCell align="right">Azioni</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {exportRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {getStatusIcon(request.status)}
                          <Chip
                            label={getStatusLabel(request.status)}
                            color={getStatusColor(request.status)}
                            size="small"
                            variant="outlined"
                          />
                          {isExpired(request) && (
                            <Chip
                              label="Scaduta"
                              color="error"
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Stack>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" sx={{ textTransform: 'uppercase' }}>
                          {request.format}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">
                          {format(new Date(request.requestDate), 'PPp')}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">
                          {request.expiryDate
                            ? format(new Date(request.expiryDate), 'PPp')
                            : 'N/A'
                          }
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">
                          {request.fileSize ? `${(request.fileSize / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          {canDownload(request) && (
                            <Tooltip title="Scarica esportazione">
                              <IconButton
                                size="small"
                                onClick={() => handleDownload(request.id)}
                                disabled={processingRequest === request.id}
                                color="primary"
                              >
                                <DownloadIcon />
                              </IconButton>
                            </Tooltip>
                          )}

                          {canCancel(request) && (
                            <Tooltip title="Annulla esportazione">
                              <IconButton
                                size="small"
                                onClick={() => handleCancel(request.id)}
                                disabled={processingRequest === request.id}
                                color="error"
                              >
                                <CancelIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Information */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Informazioni sull'esportazione dati
        </Typography>
        <Typography variant="body2">
          • I file esportati sono disponibili per il download per 7 giorni dopo il completamento<br />
          • Puoi avere fino a 3 richieste di esportazione simultanee<br />
          • Le esportazioni includono i tuoi dati personali, lo storico consensi e il registro attività (se selezionati)<br />
          • Le esportazioni di grandi dimensioni potrebbero richiedere alcuni minuti
        </Typography>
      </Alert>

      {/* New Export Dialog */}
      <Dialog
        open={newExportDialog}
        onClose={() => setNewExportDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Richiedi esportazione dati
        </DialogTitle>

        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" gutterBottom>
              Richiedi un'esportazione dei tuoi dati personali. Riceverai un file scaricabile
              contenente tutte le informazioni memorizzate nel nostro sistema.
            </Typography>

            <Box
              sx={{
                mt: 2,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                gap: 3
              }}
            >
              <FormControl component="fieldset">
                <FormLabel component="legend">Formato esportazione</FormLabel>
                <RadioGroup
                  value={exportForm.format}
                  onChange={(e) => setExportForm(prev => ({ ...prev, format: e.target.value as 'json' | 'csv' | 'pdf' }))}
                >
                  <FormControlLabel value="json" control={<Radio />} label="JSON (Dati strutturati)" />
                  <FormControlLabel value="csv" control={<Radio />} label="CSV (Formato foglio di calcolo)" />
                  <FormControlLabel value="pdf" control={<Radio />} label="PDF (Leggibile)" />
                </RadioGroup>
              </FormControl>

              <FormControl component="fieldset">
                <FormLabel component="legend">Includi dati aggiuntivi</FormLabel>
                <Box sx={{ mt: 1 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={exportForm.includeAuditTrail}
                        onChange={(e) => setExportForm(prev => ({
                          ...prev,
                          includeAuditTrail: e.target.checked
                        }))}
                      />
                    }
                    label="Registro attività (Audit Trail)"
                  />

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={exportForm.includeConsents}
                        onChange={(e) => setExportForm(prev => ({
                          ...prev,
                          includeConsents: e.target.checked
                        }))}
                      />
                    }
                    label="Storico consensi"
                  />
                </Box>
              </FormControl>
            </Box>

            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2">
                Il tempo di elaborazione dipende dalla quantità di dati e dal formato scelto.
                Riceverai una notifica quando l'esportazione sarà pronta per il download.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => setNewExportDialog(false)}
            disabled={processingRequest === 'new'}
          >
            Annulla
          </Button>

          <Button
            onClick={handleRequestExport}
            variant="contained"
            disabled={processingRequest === 'new'}
            startIcon={processingRequest === 'new' ? <LinearProgress /> : <DownloadIcon />}
          >
            {processingRequest === 'new' ? 'Richiesta in corso...' : 'Richiedi esportazione'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataExportTab;