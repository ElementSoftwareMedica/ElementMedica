/**
 * Document List Page
 * 
 * Page for listing all generated documents with filters, search, and actions.
 * Allows users to view, download, resend via email, and delete documents.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Download,
  Mail,
  Trash2,
  RefreshCw,
  AlertCircle,
  Search,
  Filter,
  CheckCircle,
  X,
  Clock
} from 'lucide-react';
import ResizableTable, { ResizableTableColumn } from '../../components/shared/ResizableTable';
import { documentService } from '../../services/documentService';
import type { GeneratedDocument, DocumentStatus, TemplateType } from '../../types/templates';
import { useConfirmDialog } from '../../contexts/ConfirmDialogContext';
import { useToast } from '../../hooks/useToast';

// Data row type for ResizableTable
interface DataRow extends Record<string, unknown> {
  id: string;
  filename: string;
  templateName: string;
  tipo: string;
  entityInfo: string;
  status: string;
  generatedAt: string;
  fileSize: string;
  _original: GeneratedDocument;
}

const DocumentListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { confirmDelete, confirm } = useConfirmDialog();
  const { showToast } = useToast();

  // State
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>(
    (searchParams.get('status') as DocumentStatus) || 'all'
  );
  const [typeFilter, setTypeFilter] = useState<TemplateType | 'all'>(
    (searchParams.get('type') as TemplateType) || 'all'
  );

  // Resend email dialog
  const [resendDialogOpen, setResendDialogOpen] = useState(false);
  const [resendDocumentId, setResendDocumentId] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);

  /**
   * Load documents
   */
  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page,
        limit,
      };

      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.type = typeFilter;

      const response = await documentService.list(params);

      // Filter by search query (client-side for now)
      let filteredData = response.data;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredData = response.data.filter(doc =>
          doc.filename.toLowerCase().includes(query) ||
          doc.template?.name?.toLowerCase().includes(query) ||
          doc.entityType?.toLowerCase().includes(query) ||
          doc.entityId?.toLowerCase().includes(query)
        );
      }

      setDocuments(filteredData);
      setTotal(response.pagination.total);
      setTotalPages(response.pagination.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Errore durante il caricamento dei documenti');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, typeFilter, searchQuery]);

  /**
   * Load documents on mount and when filters change
   */
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  /**
   * Update URL params when filters change
   */
  useEffect(() => {
    const params: any = {};
    if (searchQuery) params.search = searchQuery;
    if (statusFilter !== 'all') params.status = statusFilter;
    if (typeFilter !== 'all') params.type = typeFilter;
    setSearchParams(params);
  }, [searchQuery, statusFilter, typeFilter, setSearchParams]);

  /**
   * Download document
   */
  const handleDownload = async (id: string) => {
    try {
      await documentService.download(id);
    } catch (err: any) {
      showToast({ type: 'error', title: 'Errore', message: `Errore durante il download: ${err.message}` });
    }
  };

  /**
   * Open resend email dialog
   */
  const handleResendEmail = (id: string, doc: GeneratedDocument) => {
    setResendDocumentId(id);
    setResendEmail('');
    setResendDialogOpen(true);
  };

  /**
   * Confirm resend email
   */
  const confirmResendEmail = async () => {
    if (!resendDocumentId || !resendEmail) return;

    try {
      setResending(true);
      await documentService.resend(resendDocumentId, { email: resendEmail });
      showToast({ message: 'Email inviata con successo', type: 'success' });
      setResendDialogOpen(false);
      setResendDocumentId(null);
      setResendEmail('');
    } catch (err: any) {
      showToast({ message: `Errore durante l'invio: ${err.response?.data?.error || err.message}`, type: 'error' });
    } finally {
      setResending(false);
    }
  };

  /**
   * Delete document
   */
  const handleDelete = async (id: string, filename: string) => {
    const shouldDelete = await confirmDelete(filename);
    if (!shouldDelete) return;

    try {
      await documentService.delete(id);
      showToast({ message: 'Documento eliminato con successo', type: 'success' });
      loadDocuments();
    } catch (err: any) {
      showToast({ message: `Errore durante l'eliminazione: ${err.response?.data?.error || err.message}`, type: 'error' });
    }
  };

  /**
   * Bulk delete
   */
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const shouldDelete = await confirm({
      title: 'Conferma eliminazione multipla',
      message: `Sei sicuro di voler eliminare ${selectedIds.size} documenti? L'operazione non può essere annullata.`,
      confirmLabel: `Elimina ${selectedIds.size} documenti`,
      variant: 'danger'
    });
    if (!shouldDelete) return;

    try {
      await Promise.all(
        Array.from(selectedIds).map(id => documentService.delete(id))
      );
      showToast({ message: `${selectedIds.size} documenti eliminati con successo`, type: 'success' });
      setSelectedIds(new Set());
      loadDocuments();
    } catch (err: any) {
      showToast({ message: `Errore durante l'eliminazione: ${err.message}`, type: 'error' });
    }
  };

  /**
   * Toggle row selection
   */
  const toggleRowSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  /**
   * Toggle all rows selection
   */
  const toggleAllSelection = () => {
    if (selectedIds.size === documents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(documents.map(d => d.id)));
    }
  };

  /**
   * Format file size
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /**
   * Get status badge
   */
  const getStatusBadge = (status: DocumentStatus) => {
    const statusConfig: Record<DocumentStatus, { icon: any; color: string; label: string }> = {
      DRAFT: { icon: Clock, color: 'text-gray-600 bg-gray-50', label: 'Bozza' },
      GENERATED: { icon: CheckCircle, color: 'text-green-600 bg-green-50', label: 'Generato' },
      SENT: { icon: Mail, color: 'text-blue-600 bg-blue-50', label: 'Inviato' },
      ARCHIVED: { icon: X, color: 'text-red-600 bg-red-50', label: 'Archiviato' },
    };

    const config = statusConfig[status] || statusConfig.DRAFT;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  // Prepare data for ResizableTable
  const tableData: DataRow[] = documents.map(doc => ({
    id: doc.id,
    filename: doc.filename,
    templateName: doc.template?.name || 'N/A',
    tipo: doc.template?.type || 'N/A',
    entityInfo: `${doc.entityType || 'N/A'} • ${doc.entityId || 'N/A'}`,
    status: doc.status,
    generatedAt: new Date(doc.generatedAt).toLocaleString('it-IT'),
    fileSize: doc.fileSize ? formatFileSize(doc.fileSize) : 'N/A',
    _original: doc,
  }));

  // Table configuration
  const columns: ResizableTableColumn<DataRow>[] = [
    {
      key: 'select',
      label: '',
      minWidth: 40,
      width: 40,
      renderCell: (row: DataRow) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={() => toggleRowSelection(row.id)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      ),
    },
    {
      key: 'filename',
      label: 'Nome File',
      minWidth: 200,
      width: 250,
      sortable: true,
      renderCell: (row: DataRow) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-400" />
          <span className="font-medium">{row.filename}</span>
        </div>
      ),
    },
    {
      key: 'templateName',
      label: 'Template',
      minWidth: 150,
      width: 180,
      sortable: true,
    },
    {
      key: 'tipo',
      label: 'Tipo',
      minWidth: 100,
      width: 120,
      sortable: true,
      renderCell: (row: DataRow) => {
        const typeLabels: Record<string, string> = {
          LETTER_OF_ENGAGEMENT: 'Lettera',
          ATTENDANCE_REGISTER: 'Registro',
          CERTIFICATE: 'Attestato',
          INVOICE: 'Fattura',
          COURSE_PROGRAM: 'Programma',
          CUSTOM: 'Altro',
        };
        return <span>{typeLabels[row.tipo] || row.tipo}</span>;
      },
    },
    {
      key: 'entityInfo',
      label: 'Entità',
      minWidth: 150,
      width: 180,
      sortable: false,
    },
    {
      key: 'status',
      label: 'Stato',
      minWidth: 120,
      width: 140,
      sortable: true,
      renderCell: (row: DataRow) => getStatusBadge(row.status as DocumentStatus),
    },
    {
      key: 'generatedAt',
      label: 'Data Generazione',
      minWidth: 150,
      width: 170,
      sortable: true,
    },
    {
      key: 'fileSize',
      label: 'Dimensione',
      minWidth: 90,
      width: 100,
      sortable: true,
    },
    {
      key: 'actions',
      label: 'Azioni',
      minWidth: 140,
      width: 140,
      renderCell: (row: DataRow) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleDownload(row.id)}
            className="p-1.5 hover:bg-blue-50 rounded text-blue-600 transition-colors"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleResendEmail(row.id, row._original)}
            className="p-1.5 hover:bg-green-50 rounded text-green-600 transition-colors"
            title="Invia via Email"
          >
            <Mail className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(row.id, row.filename)}
            className="p-1.5 hover:bg-red-50 rounded text-red-600 transition-colors"
            title="Elimina"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Documenti Generati</h1>
        <p className="text-gray-600">Gestisci tutti i documenti generati dal sistema</p>
      </div>

      {/* Filters and search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cerca per nome file, template, entità..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tutti gli stati</option>
              <option value="DRAFT">Bozza</option>
              <option value="GENERATED">Generato</option>
              <option value="SENT">Inviato</option>
              <option value="ARCHIVED">Archiviato</option>
            </select>
          </div>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Tutti i tipi</option>
            <option value="LETTER_OF_ENGAGEMENT">Lettera Incarico</option>
            <option value="ATTENDANCE_REGISTER">Registro Presenze</option>
            <option value="CERTIFICATE">Attestato</option>
            <option value="INVOICE">Fattura</option>
            <option value="COURSE_PROGRAM">Programma Corso</option>
            <option value="CUSTOM">Personalizzato</option>
          </select>

          {/* Refresh button */}
          <button
            onClick={loadDocuments}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </button>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-blue-900 font-medium">
              {selectedIds.size} {selectedIds.size === 1 ? 'documento selezionato' : 'documenti selezionati'}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Elimina Selezionati
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-medium text-red-800 mb-1">Errore</h3>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
            <button
              onClick={loadDocuments}
              className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm font-medium transition-colors"
            >
              Riprova
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <ResizableTable
            data={tableData}
            columns={columns}
            onRowClick={(row) => handleDownload(row.id)}
          />
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Pagina {page} di {totalPages} • {total} documenti totali
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Precedente
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Successiva
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Resend Email Dialog */}
      {resendDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Invia Documento via Email
              </h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Indirizzo Email
                </label>
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="email@esempio.it"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setResendDialogOpen(false);
                    setResendDocumentId(null);
                    setResendEmail('');
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={confirmResendEmail}
                  disabled={!resendEmail || resending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors"
                >
                  {resending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Invio...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Invia
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentListPage;
