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
      action: '',
      startDate: '',
      endDate: '',
      ipAddress: '',
      userAgent: ''
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
      console.error(`Error exporting to ${format}:`, error);
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
          GDPR Audit Trail
        </Typography>
        
        <Stack direction="row" spacing={1} alignItems="center">
          {hasFilters() && (
            <Chip
              label="Filtered"
              color="primary"
              size="small"
              onDelete={handleClearFilters}
            />
          )}
          
          <Tooltip title="Apply filters">
            <IconButton onClick={() => setFilterDialog(true)} size="small">
              <FilterIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Refresh audit trail">
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
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
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
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main" gutterBottom>
                {stats.consentActions}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Consent Actions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="info.main" gutterBottom>
                {stats.dataExports}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Data Exports
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main" gutterBottom>
                {stats.deletionRequests}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Deletion Requests
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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
                {hasFilters() 
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
                          <Tooltip title="View details">
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
                Showing {((pagination.currentPage - 1) * pagination.pageSize) + 1} to {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems)} of {pagination.totalItems} entries
              </Typography>
            </>
          )}
        </CardContent>
      </Card>

      {/* Information Accordion */}
      <Accordion sx={{ mt: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">
            About GDPR Audit Trail
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" paragraph>
            The GDPR audit trail provides a comprehensive log of all privacy-related activities 
            in your account. This includes:
          </Typography>
          
          <ul>
            <li><strong>Consent Management:</strong> When you grant or withdraw consent for data processing</li>
            <li><strong>Data Exports:</strong> Requests for personal data under the right of access</li>
            <li><strong>Deletion Requests:</strong> Requests for data deletion under the right to be forgotten</li>
            <li><strong>Privacy Settings:</strong> Changes to your privacy preferences and settings</li>
          </ul>
          
          <Typography variant="body2" paragraph>
            Each entry includes technical details such as IP address and user agent to ensure 
            the integrity and traceability of all privacy-related actions.
          </Typography>
          
          <Typography variant="body2">
            You can export this data at any time for your records or compliance purposes.
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
            Filter Audit Trail
          </Stack>
        </DialogTitle>
        
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Action Type</InputLabel>
                <Select
                  value={tempFilters.action || ''}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                  label="Action Type"
                >
                  <MenuItem value="">All Actions</MenuItem>
                  <MenuItem value="consent_granted">Consent Granted</MenuItem>
                  <MenuItem value="consent_withdrawn">Consent Withdrawn</MenuItem>
                  <MenuItem value="data_export">Data Export</MenuItem>
                  <MenuItem value="deletion_request">Deletion Request</MenuItem>
                  <MenuItem value="privacy_settings_updated">Privacy Settings Updated</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                value={tempFilters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="End Date"
                value={tempFilters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="IP Address"
                value={tempFilters.ipAddress || ''}
                onChange={(e) => handleFilterChange('ipAddress', e.target.value)}
                placeholder="e.g., 192.168.1.1"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="User Agent"
                value={tempFilters.userAgent || ''}
                onChange={(e) => handleFilterChange('userAgent', e.target.value)}
                placeholder="e.g., Chrome, Firefox, Safari"
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClearFilters} startIcon={<ClearIcon />}>
            Clear All
          </Button>
          <Button onClick={() => setFilterDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleApplyFilters} variant="contained">
            Apply Filters
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
          Audit Entry Details
        </DialogTitle>
        
        <DialogContent>
          {selectedEntry && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Action
                  </Typography>
                  <Chip
                    label={formatActionLabel(selectedEntry.action)}
                    color={getActionColor(selectedEntry.action)}
                    variant="outlined"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Timestamp
                  </Typography>
                  <Typography variant="body2">
                    {format(new Date(selectedEntry.timestamp), 'MMMM dd, yyyy HH:mm:ss')}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    IP Address
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {selectedEntry.ipAddress || 'Not recorded'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Entry ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {selectedEntry.id}
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    User Agent
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {selectedEntry.userAgent || 'Not recorded'}
                  </Typography>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="subtitle2" gutterBottom>
                Additional Data
              </Typography>
              {renderMetadata(selectedEntry.metadata)}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AuditTrailTab;