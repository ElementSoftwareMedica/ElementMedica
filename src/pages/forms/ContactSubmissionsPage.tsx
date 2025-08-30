import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Tooltip,
  Stack,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  Visibility,
  Edit,
  Delete,
  Download,
  FilterList,
  Refresh
} from '@mui/icons-material';
import { useAuth } from '../../hooks/auth/useAuth';
import {
  getContactSubmissions,
  getContactSubmission,
  updateContactSubmissionStatus,
  deleteContactSubmission,
  exportContactSubmissions,
  getContactSubmissionStats
} from '../../services/contactSubmissionsManagement';
import type { ContactSubmission, ContactSubmissionFilters } from '../../services/contactSubmissionsManagement';

const ContactSubmissionsPage: React.FC = () => {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [filters, setFilters] = useState<ContactSubmissionFilters>({
    status: '',
    type: '',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const { hasPermission } = useAuth();
  const canEdit = hasPermission('submissions', 'update');
  const canDelete = hasPermission('submissions', 'delete');
  const canExport = hasPermission('submissions', 'export');

  useEffect(() => {
    loadSubmissions();
  }, [filters, pagination.page]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const response = await getContactSubmissions({
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      });
      setSubmissions(response.submissions);
      setPagination(response.pagination);
      setError(null);
    } catch (err) {
      setError('Errore nel caricamento delle submissions');
      console.error('Error loading submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewSubmission = async (id: string) => {
    try {
      const submission = await getContactSubmission(id);
      setSelectedSubmission(submission);
      setViewDialogOpen(true);
    } catch (err) {
      setError('Errore nel caricamento della submission');
      console.error('Error loading submission:', err);
    }
  };

  const handleStatusChange = (submission: ContactSubmission) => {
    setSelectedSubmission(submission);
    setNewStatus(submission.status);
    setStatusDialogOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedSubmission) return;

    try {
      await updateContactSubmissionStatus(
        selectedSubmission.id, 
        newStatus as ContactSubmission['status']
      );
      setStatusDialogOpen(false);
      loadSubmissions();
    } catch (err) {
      setError('Errore nell\'aggiornamento dello status');
      console.error('Error updating status:', err);
    }
  };

  const handleDeleteSubmission = async (id: string) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa submission?')) return;

    try {
      await deleteContactSubmission(id);
      loadSubmissions();
    } catch (err) {
      setError('Errore nell\'eliminazione della submission');
      console.error('Error deleting submission:', err);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportContactSubmissions(filters, 'csv');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contact-submissions-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Errore nell\'esportazione');
      console.error('Error exporting:', err);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      NEW: 'Nuovo',
      READ: 'Letto',
      IN_PROGRESS: 'In Lavorazione',
      RESOLVED: 'Risolto',
      ARCHIVED: 'Archiviato'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      NEW: 'error',
      READ: 'warning',
      IN_PROGRESS: 'info',
      RESOLVED: 'success',
      ARCHIVED: 'default'
    };
    return colors[status as keyof typeof colors] || 'default';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      LOW: 'default',
      MEDIUM: 'warning',
      HIGH: 'error',
      URGENT: 'error'
    };
    return colors[priority as keyof typeof colors] || 'default';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Gestione Contact Submissions
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filtri */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <Box sx={{ minWidth: 200 }}>
            <TextField
              fullWidth
              label="Cerca"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Nome, email, oggetto..."
              size="small"
            />
          </Box>
          <Box sx={{ minWidth: 150 }}>
            <TextField
              fullWidth
              select
              label="Status"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              size="small"
            >
              <MenuItem value="">Tutti</MenuItem>
              <MenuItem value="NEW">Nuovo</MenuItem>
              <MenuItem value="READ">Letto</MenuItem>
              <MenuItem value="IN_PROGRESS">In Lavorazione</MenuItem>
              <MenuItem value="RESOLVED">Risolto</MenuItem>
              <MenuItem value="ARCHIVED">Archiviato</MenuItem>
            </TextField>
          </Box>
          <Box sx={{ minWidth: 150 }}>
            <TextField
              fullWidth
              select
              label="Tipo"
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              size="small"
            >
              <MenuItem value="">Tutti</MenuItem>
              <MenuItem value="CONTACT">Contatto</MenuItem>
              <MenuItem value="QUOTE">Preventivo</MenuItem>
              <MenuItem value="INFO">Informazioni</MenuItem>
            </TextField>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={loadSubmissions}
            >
              Aggiorna
            </Button>
            {canExport && (
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={handleExport}
              >
                Esporta
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Tabella Submissions */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Nome</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Oggetto</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Priorità</TableCell>
              <TableCell>Data</TableCell>
              <TableCell>Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Caricamento...
                </TableCell>
              </TableRow>
            ) : submissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Nessuna submission trovata
                </TableCell>
              </TableRow>
            ) : (
              submissions.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell>{submission.id.slice(-8)}</TableCell>
                  <TableCell>{submission.name}</TableCell>
                  <TableCell>{submission.email}</TableCell>
                  <TableCell>{submission.subject}</TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(submission.status)}
                      color={getStatusColor(submission.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={submission.priority}
                      color={getPriorityColor(submission.priority) as any}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(submission.createdAt).toLocaleDateString('it-IT')}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Visualizza">
                      <IconButton
                        size="small"
                        onClick={() => handleViewSubmission(submission.id)}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    {canEdit && (
                      <Tooltip title="Modifica Status">
                        <IconButton
                          size="small"
                          onClick={() => handleStatusChange(submission)}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                    )}
                    {canDelete && (
                      <Tooltip title="Elimina">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteSubmission(submission.id)}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Paginazione */}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1 }}>
        <Button
          disabled={pagination.page <= 1}
          onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
        >
          Precedente
        </Button>
        <Typography sx={{ alignSelf: 'center', mx: 2 }}>
          Pagina {pagination.page} di {pagination.pages}
        </Typography>
        <Button
          disabled={pagination.page >= pagination.pages}
          onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
        >
          Successiva
        </Button>
      </Box>

      {/* Dialog Visualizzazione */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Dettagli Submission</DialogTitle>
        <DialogContent>
          {selectedSubmission && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1, minWidth: 300 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Informazioni Contatto
                      </Typography>
                      <Typography><strong>Nome:</strong> {selectedSubmission.name}</Typography>
                      <Typography><strong>Email:</strong> {selectedSubmission.email}</Typography>
                      {selectedSubmission.phone && (
                        <Typography><strong>Telefono:</strong> {selectedSubmission.phone}</Typography>
                      )}
                      {selectedSubmission.company && (
                        <Typography><strong>Azienda:</strong> {selectedSubmission.company}</Typography>
                      )}
                    </CardContent>
                  </Card>
                </Box>
                <Box sx={{ flex: 1, minWidth: 300 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Dettagli Richiesta
                      </Typography>
                      <Typography><strong>Oggetto:</strong> {selectedSubmission.subject}</Typography>
                      <Typography><strong>Status:</strong> {getStatusLabel(selectedSubmission.status)}</Typography>
                      <Typography><strong>Priorità:</strong> {selectedSubmission.priority}</Typography>
                      <Typography><strong>Data:</strong> {new Date(selectedSubmission.createdAt).toLocaleString('it-IT')}</Typography>
                    </CardContent>
                  </Card>
                </Box>
              </Box>
              <Box>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Messaggio
                    </Typography>
                    <Typography style={{ whiteSpace: 'pre-wrap' }}>
                      {selectedSubmission.message}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Chiudi</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Modifica Status */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)}>
        <DialogTitle>Modifica Status</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            select
            label="Nuovo Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            sx={{ mt: 1 }}
          >
            <MenuItem value="NEW">Nuovo</MenuItem>
            <MenuItem value="READ">Letto</MenuItem>
            <MenuItem value="IN_PROGRESS">In Lavorazione</MenuItem>
            <MenuItem value="RESOLVED">Risolto</MenuItem>
            <MenuItem value="ARCHIVED">Archiviato</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Annulla</Button>
          <Button onClick={handleUpdateStatus} variant="contained">
            Salva
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContactSubmissionsPage;