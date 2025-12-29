import React, { useState, useEffect, useCallback } from 'react';
import {
  Eye,
  Edit,
  Trash2,
  Download,
  Filter,
  RefreshCw,
  AlertCircle,
  Search,
  X
} from 'lucide-react';
import { useConfirmDialog } from '../../contexts/ConfirmDialogContext';
import { Button } from '../../design-system/atoms/Button';
import { Card } from '../../design-system/molecules/Card';
import { Badge } from '../../design-system/atoms/Badge';
import { Modal } from '../../design-system/molecules/Modal';
import { Input } from '../../design-system/atoms/Input';
import { Select } from '../../design-system/atoms/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../design-system/molecules/Table';
import { useAuth } from '../../context/AuthContext';
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
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
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
  const { confirmDelete } = useConfirmDialog();
  const canEdit = hasPermission('submissions', 'update');
  const canDelete = hasPermission('submissions', 'delete');
  const canExport = hasPermission('submissions', 'export');

  useEffect(() => {
    loadSubmissions();
  }, [filters, pagination.page]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getContactSubmissions({
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      });
      setSubmissions(response.submissions);
      setPagination(prev => ({
        ...prev,
        ...response.pagination
      }));
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
    if (!selectedSubmission || !newStatus) return;

    try {
      await updateContactSubmissionStatus(selectedSubmission.id, newStatus as ContactSubmission['status']);
      await loadSubmissions();
      setStatusDialogOpen(false);
      setSelectedSubmission(null);
    } catch (err) {
      setError('Errore nell\'aggiornamento dello stato');
      console.error('Error updating status:', err);
    }
  };

  const handleDeleteSubmission = async (id: string) => {
    const shouldDelete = await confirmDelete('questa submission');
    if (!shouldDelete) return;

    try {
      await deleteContactSubmission(id);
      await loadSubmissions();
    } catch (err) {
      setError(`Errore nell'eliminazione della submission`);
      console.error('Error deleting submission:', err);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportContactSubmissions(filters, 'csv');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `submissions-${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(`Errore nell'esportazione delle submissions`);
      console.error('Error exporting submissions:', err);
    }
  };

  const getStatusColor = (status: string): 'default' | 'warning' | 'success' | 'error' | 'info' => {
    switch (status) {
      case 'new': return 'info';
      case 'in_progress': return 'warning';
      case 'resolved': return 'success';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && submissions.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-gray-600">Caricamento submissions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Contact Submissions</h2>
          <p className="text-sm text-gray-600 mt-1">
            {pagination.total} submission{pagination.total !== 1 ? 's' : ''} totali
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Filter className="h-4 w-4" />}
            onClick={() => setFilterDialogOpen(true)}
          >
            Filtri
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={loadSubmissions}
          >
            Aggiorna
          </Button>
          {canExport && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={handleExport}
            >
              Esporta
            </Button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Active Filters */}
      {(filters.search || filters.status || filters.type) && (
        <Card variant="default" size="sm">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Filtri attivi:</span>
            {filters.search && (
              <Badge variant="default" size="sm">
                Ricerca: {filters.search}
              </Badge>
            )}
            {filters.status && (
              <Badge variant="default" size="sm">
                Stato: {filters.status}
              </Badge>
            )}
            {filters.type && (
              <Badge variant="default" size="sm">
                Tipo: {filters.type}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters({
                status: '',
                type: '',
                search: '',
                sortBy: 'createdAt',
                sortOrder: 'desc'
              })}
            >
              Rimuovi filtri
            </Button>
          </div>
        </Card>
      )}

      {/* Main Content */}
      <Card variant="default" size="lg">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Nome/Email</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Template</TableHead>
                <TableHead className="text-center">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell>
                    <span className="text-sm text-gray-900">
                      {formatDate(submission.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">
                        {submission.name || '-'}
                      </span>
                      <span className="text-xs text-gray-600">
                        {submission.email || '-'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-700">
                      {submission.type || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={getStatusColor(submission.status)}
                      size="sm"
                    >
                      {submission.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-700">
                      {submission.templateName || '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Eye className="h-4 w-4" />}
                        onClick={() => handleViewSubmission(submission.id)}
                        title="Visualizza"
                      />
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Edit className="h-4 w-4" />}
                          onClick={() => handleStatusChange(submission)}
                          title="Modifica Stato"
                        />
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Trash2 className="h-4 w-4" />}
                          onClick={() => handleDeleteSubmission(submission.id)}
                          title="Elimina"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {submissions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="h-12 w-12 text-gray-400" />
                      <span className="text-sm text-gray-500 font-medium">
                        Nessuna submission trovata
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination.total > pagination.limit && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
              >
                Precedente
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.pages}
              >
                Successivo
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* View Submission Modal */}
      <Modal
        isOpen={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        title="Dettagli Submission"
        size="lg"
      >
        {selectedSubmission && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <p className="text-sm text-gray-900">{selectedSubmission.name || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <p className="text-sm text-gray-900">{selectedSubmission.email || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefono
                </label>
                <p className="text-sm text-gray-900">{selectedSubmission.phone || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stato
                </label>
                <Badge variant={getStatusColor(selectedSubmission.status)} size="sm">
                  {selectedSubmission.status}
                </Badge>
              </div>
            </div>

            {selectedSubmission.message && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Messaggio
                </label>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {selectedSubmission.message}
                </p>
              </div>
            )}

            {selectedSubmission.formData && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dati Form
                </label>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {Object.entries(selectedSubmission.formData).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700">{key}:</span>
                      <span className="text-sm text-gray-900">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setViewDialogOpen(false)}
              >
                Chiudi
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Status Update Modal */}
      <Modal
        isOpen={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
        title="Aggiorna Stato"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nuovo Stato
            </label>
            <Select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full"
            >
              <option value="">Seleziona stato</option>
              <option value="new">Nuovo</option>
              <option value="in_progress">In lavorazione</option>
              <option value="resolved">Risolto</option>
              <option value="closed">Chiuso</option>
            </Select>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setStatusDialogOpen(false)}
            >
              Annulla
            </Button>
            <Button
              variant="primary"
              onClick={handleUpdateStatus}
              disabled={!newStatus}
            >
              Aggiorna
            </Button>
          </div>
        </div>
      </Modal>

      {/* Filter Modal */}
      <Modal
        isOpen={filterDialogOpen}
        onClose={() => setFilterDialogOpen(false)}
        title="Filtri Submissions"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ricerca
            </label>
            <Input
              type="text"
              placeholder="Nome, email, telefono..."
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stato
            </label>
            <Select
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">Tutti</option>
              <option value="new">Nuovo</option>
              <option value="in_progress">In lavorazione</option>
              <option value="resolved">Risolto</option>
              <option value="closed">Chiuso</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo
            </label>
            <Input
              type="text"
              placeholder="Tipo submission"
              value={filters.type || ''}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setFilters({
                  status: '',
                  type: '',
                  search: '',
                  sortBy: 'createdAt',
                  sortOrder: 'desc'
                });
                setFilterDialogOpen(false);
              }}
            >
              Reset
            </Button>
            <Button
              variant="primary"
              onClick={() => setFilterDialogOpen(false)}
            >
              Applica
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ContactSubmissionsPage;
