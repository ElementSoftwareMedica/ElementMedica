/**
 * Audit Trail Tab Component
 * Displays GDPR audit logs and compliance tracking
 */

import React, { useState, useEffect } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Tooltip,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Visibility as VisibilityIcon,
  Timeline as TimelineIcon,
  Security as SecurityIcon,
  Assessment as AssessmentIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { UseAuditTrailReturn, AuditLogEntry, AuditTrailFilters } from '../../types/gdpr';
import { format, formatDistanceToNow } from 'date-fns';
import { DatePickerElegante } from '../ui/DatePickerElegante';

interface AuditTrailTabProps {
  hook: UseAuditTrailReturn;
}

export const AuditTrailTab: React.FC<AuditTrailTabProps> = ({ hook }) => {
  const {
    auditLogs,
    loading,
    error,
    pagination,
    filters,
    refreshAuditTrail,
    goToPage,
    applyFilters,
    clearFilters,
    getAuditStats,
    exportToCSV,
    exportToJSON,
    hasFilters
  } = hook;

  const [filterDialog, setFilterDialog] = useState(false);
  const [tempFilters, setTempFilters] = useState<AuditTrailFilters>(filters);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [exporting, setExporting] = useState<'csv' | 'json' | null>(null);

  const stats = getAuditStats();

  // Derive specific stats from actionCounts for backwards compatibility
  const consentActions = (stats.actionCounts['CONSENT_GRANTED'] || 0) + (stats.actionCounts['CONSENT_WITHDRAWN'] || 0);
  const dataExports = stats.actionCounts['DATA_EXPORT'] || 0;
  const deletionRequests = (stats.actionCounts['DELETION_REQUESTED'] || 0) + (stats.actionCounts['DELETION_PROCESSED'] || 0);

  // Update temp filters when filters change
  useEffect(() => {
    setTempFilters(filters);
  }, [filters]);

  const handleFilterChange = (field: keyof AuditTrailFilters, value: unknown) => {
    setTempFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleApplyFilters = () => {
    applyFilters(tempFilters);
    setFilterDialog(false);
  };

  const handleClearFilters = () => {
    const emptyFilters: AuditTrailFilters = {
      action: undefined,
      startDate: undefined,
      endDate: undefined,
      dataType: undefined
    };
    setTempFilters(emptyFilters);
    clearFilters();
    setFilterDialog(false);
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      setExporting(format);
      if (format === 'csv') {
        await exportToCSV();
      } else {
        await exportToJSON();
      }
    } catch (error) {
    } finally {
      setExporting(null);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'consent_granted':
      case 'consent_withdrawn':
        return <SecurityIcon />;
      case 'data_export':
        return <DownloadIcon />;
      case 'deletion_request':
        return <TimelineIcon />;
      case 'privacy_settings_updated':
        return <AssessmentIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const getActionColor = (action: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (action.toLowerCase()) {
      case 'consent_granted':
        return 'success';
      case 'consent_withdrawn':
        return 'warning';
      case 'data_export':
        return 'info';
      case 'deletion_request':
        return 'error';
      case 'privacy_settings_updated':
        return 'primary';
      default:
        return 'default';
    }
  };

  const formatActionLabel = (action: string) => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleViewDetails = (entry: AuditLogEntry) => {
    setSelectedEntry(entry);
    setDetailDialog(true);
  };

  const renderMetadata = (metadata: Record<string, unknown>) => {
    if (!metadata || Object.keys(metadata).length === 0) {
      return <Typography variant="body2" color="text.secondary">No additional data</Typography>;
    }

    return (
      <Box>
        {Object.entries(metadata).map(([key, value]) => (
          <Box key={key} sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {key.charAt(0).toUpperCase() + key.slice(1)}:
            </Typography>
            <Typography variant="body2" sx={{ ml: 1 }}>
              {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
            </Typography>
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h6" component="h2">
          GDPR Registro attività
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center">
          {hasFilters && (
            <Chip
              label="Filtrato"
              color="primary"
              size="small"
              onDelete={handleClearFilters}
            />
          )}

          <Tooltip title="Applica filtri">
            <IconButton onClick={() => setFilterDialog(true)} size="small">
              <FilterIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Aggiorna registro attività">
            <IconButton onClick={refreshAuditTrail} disabled={loading} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => handleExport('csv')}
            disabled={loading || exporting === 'csv'}
            size="small"
          >
            Export CSV
          </Button>

          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => handleExport('json')}
            disabled={loading || exporting === 'json'}
            size="small"
          >
            Export JSON
          </Button>
        </Stack>
      </Stack>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" color="primary" gutterBottom>
              {stats.totalEntries}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Entries
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" color="success.main" gutterBottom>
              {consentActions}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Consent Actions
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" color="info.main" gutterBottom>
              {dataExports}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Data Exports
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" color="warning.main" gutterBottom>
              {deletionRequests}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Deletion Requests
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Audit Trail Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Audit Log Entries
          </Typography>

          {loading && auditLogs.length === 0 ? (
            <Box sx={{ py: 3 }}>
              <LinearProgress />
              <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
                Loading audit trail...
              </Typography>
            </Box>
          ) : auditLogs.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                No audit entries found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {hasFilters
                  ? 'Try adjusting your filters to see more results.'
                  : 'No GDPR-related activities have been logged yet.'
                }
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Action</TableCell>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>IP Address</TableCell>
                      <TableCell>User Agent</TableCell>
                      <TableCell align="right">Details</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {auditLogs.map((entry) => (
                      <TableRow key={entry.id} hover>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            {getActionIcon(entry.action)}
                            <Chip
                              label={formatActionLabel(entry.action)}
                              color={getActionColor(entry.action)}
                              size="small"
                              variant="outlined"
                            />
                          </Stack>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2">
                            {format(new Date(entry.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDistanceToNow(new Date(entry.timestamp))} ago
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {entry.ipAddress || 'N/A'}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {entry.userAgent || 'N/A'}
                          </Typography>
                        </TableCell>

                        <TableCell align="right">
                          <Tooltip title="Visualizza dettagli">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetails(entry)}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={pagination.totalPages}
                  page={pagination.currentPage}
                  onChange={(_, page) => goToPage(page)}
                  color="primary"
                  showFirstButton
                  showLastButton
                />
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
                Mostra {((pagination.currentPage - 1) * pagination.pageSize) + 1} - {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems)} di {pagination.totalItems} voci
              </Typography>
            </>
          )}
        </CardContent>
      </Card>

      {/* Information Accordion */}
      <Accordion sx={{ mt: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">
            Informazioni sul registro attività GDPR
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" paragraph>
            Il registro attività GDPR fornisce un log completo di tutte le attività
            relative alla privacy nel tuo account. Include:
          </Typography>

          <ul>
            <li><strong>Gestione consensi:</strong> Quando concedi o revochi il consenso al trattamento dei dati</li>
            <li><strong>Esportazioni dati:</strong> Richieste di dati personali ai sensi del diritto di accesso</li>
            <li><strong>Richieste di eliminazione:</strong> Richieste di cancellazione dei dati ai sensi del diritto all'oblio</li>
            <li><strong>Impostazioni privacy:</strong> Modifiche alle tue preferenze e impostazioni sulla privacy</li>
          </ul>

          <Typography variant="body2" paragraph>
            Ogni voce include dettagli tecnici come indirizzo IP e user agent per garantire
            l'integrità e la tracciabilità di tutte le azioni relative alla privacy.
          </Typography>

          <Typography variant="body2">
            Puoi esportare questi dati in qualsiasi momento per i tuoi archivi o per finalità di conformità.
          </Typography>
        </AccordionDetails>
      </Accordion>

      {/* Filter Dialog */}
      <Dialog
        open={filterDialog}
        onClose={() => setFilterDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <FilterIcon />
            Filtra registro attività
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Tipo azione</InputLabel>
              <Select
                value={tempFilters.action || ''}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                label="Tipo azione"
              >
                <MenuItem value="">Tutte le azioni</MenuItem>
                <MenuItem value="consent_granted">Consenso concesso</MenuItem>
                <MenuItem value="consent_withdrawn">Consenso revocato</MenuItem>
                <MenuItem value="data_export">Esportazione dati</MenuItem>
                <MenuItem value="deletion_request">Richiesta eliminazione</MenuItem>
                <MenuItem value="privacy_settings_updated">Impostazioni privacy aggiornate</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
              <Box>
                <Typography variant="body2" fontWeight={500} mb={0.5}>Data inizio</Typography>
                <DatePickerElegante
                  value={tempFilters.startDate || ''}
                  onChange={(date) => handleFilterChange('startDate', date ? date.toISOString().split('T')[0] : '')}
                  theme="teal"
                  size="sm"
                />
              </Box>

              <Box>
                <Typography variant="body2" fontWeight={500} mb={0.5}>Data fine</Typography>
                <DatePickerElegante
                  value={tempFilters.endDate || ''}
                  onChange={(date) => handleFilterChange('endDate', date ? date.toISOString().split('T')[0] : '')}
                  theme="teal"
                  size="sm"
                />
              </Box>
            </Box>

            <TextField
              fullWidth
              label="Indirizzo IP"
              value={tempFilters.ipAddress || ''}
              onChange={(e) => handleFilterChange('ipAddress', e.target.value)}
              placeholder="e.g., 192.168.1.1"
            />

            <TextField
              fullWidth
              label="User Agent"
              value={tempFilters.userAgent || ''}
              onChange={(e) => handleFilterChange('userAgent', e.target.value)}
              placeholder="e.g., Chrome, Firefox, Safari"
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClearFilters} startIcon={<ClearIcon />}>
            Clear All
          </Button>
          <Button onClick={() => setFilterDialog(false)}>
            Annulla
          </Button>
          <Button onClick={handleApplyFilters} variant="contained">
            Applica filtri
          </Button>
        </DialogActions>
      </Dialog>

      {/* Entry Detail Dialog */}
      <Dialog
        open={detailDialog}
        onClose={() => setDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Dettagli voce audit
        </DialogTitle>

        <DialogContent>
          {selectedEntry && (
            <Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 3 }}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Azione
                  </Typography>
                  <Chip
                    label={formatActionLabel(selectedEntry.action)}
                    color={getActionColor(selectedEntry.action)}
                    variant="outlined"
                  />
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Data e ora
                  </Typography>
                  <Typography variant="body2">
                    {format(new Date(selectedEntry.timestamp), 'dd MMMM yyyy, HH:mm:ss')}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Indirizzo IP
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {selectedEntry.ipAddress || 'Non registrato'}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    ID voce
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {selectedEntry.id}
                  </Typography>
                </Box>

                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    User Agent
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {selectedEntry.userAgent || 'Non registrato'}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle2" gutterBottom>
                Dati aggiuntivi
              </Typography>
              {renderMetadata(selectedEntry.details || {})}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>
            Chiudi
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AuditTrailTab;