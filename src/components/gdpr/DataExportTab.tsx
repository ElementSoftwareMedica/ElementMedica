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
      console.error('Error requesting export:', error);
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleDownload = async (requestId: string) => {
    try {
      setProcessingRequest(requestId);
      await downloadExport(requestId);
    } catch (error) {
      console.error('Error downloading export:', error);
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleCancel = async (requestId: string) => {
    try {
      setProcessingRequest(requestId);
      await cancelExport(requestId);
    } catch (error) {
      console.error('Error cancelling export:', error);
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
          Data Export
        </Typography>
        
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label={`${stats.available} Available`}
            color={stats.available > 0 ? 'success' : 'default'}
            size="small"
          />
          
          <Tooltip title="Refresh export requests">
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
            New Export
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
          You have reached the maximum number of concurrent export requests. 
          Please wait for existing requests to complete or cancel them.
        </Alert>
      )}

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
              <Typography variant="h6" color="info.main" gutterBottom>
                {stats.processing + stats.pending}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                In Progress
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main" gutterBottom>
                {stats.expired}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Expired
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Latest Export Quick Access */}
      {latestExport && canDownload(latestExport) && (
        <Card sx={{ mb: 3, bgcolor: 'success.light' }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Latest Export Ready
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Requested {formatDistanceToNow(new Date(latestExport.requestDate))} ago • 
                  Format: {latestExport.format.toUpperCase()} • 
                  Expires {formatDistanceToNow(new Date(latestExport.expiryDate!))}
                </Typography>
              </Box>
              
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={() => handleDownload(latestExport.id)}
                disabled={processingRequest === latestExport.id}
              >
                Download
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Export Requests Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Export History
          </Typography>
          
          {loading && exportRequests.length === 0 ? (
            <Box sx={{ py: 3 }}>
              <LinearProgress />
              <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
                Loading export requests...
              </Typography>
            </Box>
          ) : exportRequests.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                No export requests found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create your first data export to download your personal information.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Status</TableCell>
                    <TableCell>Format</TableCell>
                    <TableCell>Requested</TableCell>
                    <TableCell>Expires</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {exportRequests.map((request) => (
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
                          {isExpired(request) && (
                            <Chip
                              label="Expired"
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
                            <Tooltip title="Download export">
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
                            <Tooltip title="Cancel export">
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
          Data Export Information
        </Typography>
        <Typography variant="body2">
          • Export files are available for download for 7 days after completion<br/>
          • You can have up to 3 concurrent export requests<br/>
          • Exports include your personal data, consent history, and audit trail (if selected)<br/>
          • Large exports may take several minutes to process
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
          Request Data Export
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" gutterBottom>
              Request an export of your personal data. You will receive a downloadable file 
              containing all your information stored in our system.
            </Typography>
            
            <Grid container spacing={3} sx={{ mt: 2 }}>
              <Grid item xs={12} md={6}>
                <FormControl component="fieldset">
                  <FormLabel component="legend">Export Format</FormLabel>
                  <RadioGroup
                    value={exportForm.format}
                    onChange={(e) => setExportForm(prev => ({ ...prev, format: e.target.value as 'json' | 'csv' | 'pdf' }))}
                  >
                    <FormControlLabel value="json" control={<Radio />} label="JSON (Structured data)" />
                    <FormControlLabel value="csv" control={<Radio />} label="CSV (Spreadsheet format)" />
                    <FormControlLabel value="pdf" control={<Radio />} label="PDF (Human readable)" />
                  </RadioGroup>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl component="fieldset">
                  <FormLabel component="legend">Include Additional Data</FormLabel>
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
                      label="Audit Trail (Activity logs)"
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
                      label="Consent History"
                    />
                  </Box>
                </FormControl>
              </Grid>
            </Grid>
            
            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2">
                Processing time depends on the amount of data and selected format. 
                You will be notified when your export is ready for download.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={() => setNewExportDialog(false)}
            disabled={processingRequest === 'new'}
          >
            Cancel
          </Button>
          
          <Button 
            onClick={handleRequestExport}
            variant="contained"
            disabled={processingRequest === 'new'}
            startIcon={processingRequest === 'new' ? <LinearProgress /> : <DownloadIcon />}
          >
            {processingRequest === 'new' ? 'Requesting...' : 'Request Export'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataExportTab;