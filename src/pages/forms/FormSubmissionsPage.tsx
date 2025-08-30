import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  Edit, 
  Trash2, 
  Download, 
  Filter, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Button } from '../../design-system/atoms/Button';
import { Card } from '../../design-system/molecules/Card';
import { Badge } from '../../design-system/atoms/Badge';
import { Modal } from '../../design-system/molecules/Modal';
import { Input } from '../../design-system/atoms/Input';
import { Select } from '../../design-system/atoms/Select';
import { useAuth } from '../../context/AuthContext';
import { 
  getFormSubmissions, 
  getFormSubmission, 
  updateSubmissionStatus, 
  deleteSubmission, 
  exportSubmissions,
  FormSubmission,
  FormSubmissionFilters 
} from '../../services/formTemplates';

const FormSubmissionsPage: React.FC = () => {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<'pending' | 'processed' | 'archived'>('pending');
  const [filters, setFilters] = useState<{
    status: 'pending' | 'processed' | 'archived' | '';
    formTemplateId: string;
    dateFrom: string;
    dateTo: string;
  }>({
    status: '',
    formTemplateId: '',
    dateFrom: '',
    dateTo: ''
  });

  const { hasPermission, isLoading: authLoading } = useAuth();
  const canView = hasPermission('form_submissions', 'read');
  const canEdit = hasPermission('form_submissions', 'update');
  const canDelete = hasPermission('form_submissions', 'delete');
  const canExport = hasPermission('form_submissions', 'export');

  useEffect(() => {
    loadSubmissions();
  }, [filters]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      // Prepara i filtri per l'API, rimuovendo i valori vuoti
      const apiFilters: any = {
        // Filtri fissi per mostrare solo le submissions pubbliche di tipo CONTACT
        type: 'CONTACT',
        source: 'public_website'
      };
      
      if (filters.status) {
        apiFilters.status = filters.status;
      }
      if (filters.formTemplateId) apiFilters.formTemplateId = filters.formTemplateId;
      if (filters.dateFrom) apiFilters.dateFrom = filters.dateFrom;
      if (filters.dateTo) apiFilters.dateTo = filters.dateTo;
      
      const data = await getFormSubmissions(apiFilters);
      setSubmissions(data.submissions || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento delle submission');
      console.error('Error loading submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewSubmission = async (id: string) => {
    try {
      const submission = await getFormSubmission(id);
      setSelectedSubmission(submission);
      setViewDialogOpen(true);
    } catch (err) {
      setError('Errore nel caricamento della submission');
      console.error('Error loading submission:', err);
    }
  };

  const handleStatusChange = (submission: FormSubmission) => {
    setSelectedSubmission(submission);
    setNewStatus(submission.status);
    setStatusDialogOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedSubmission) return;

    try {
      await updateSubmissionStatus(selectedSubmission.id, newStatus);
      setStatusDialogOpen(false);
      setSelectedSubmission(null);
      loadSubmissions();
    } catch (err) {
      setError('Errore nell\'aggiornamento dello status');
      console.error('Error updating status:', err);
    }
  };

  const handleDeleteSubmission = async (id: string) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa submission?')) return;

    try {
      await deleteSubmission(id);
      loadSubmissions();
    } catch (err) {
      setError('Errore nell\'eliminazione della submission');
      console.error('Error deleting submission:', err);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportSubmissions(filters.formTemplateId, 'excel');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `submissions_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Errore nell\'esportazione');
      console.error('Error exporting:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'processed': return 'success';
      case 'archived': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'In Attesa';
      case 'processed': return 'Elaborata';
      case 'archived': return 'Archiviata';
      default: return status;
    }
  };

  const groupSubmissionsByTemplate = (submissions: FormSubmission[]): Record<string, FormSubmission[]> => {
    return submissions.reduce((groups, submission) => {
      const templateId = submission.formTemplateId || 'unknown';
      if (!groups[templateId]) {
        groups[templateId] = [];
      }
      groups[templateId].push(submission);
      return groups;
    }, {} as Record<string, FormSubmission[]>);
  };

  // Mostra loading se l'AuthContext sta ancora caricando
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Caricamento permessi...</span>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-700">Non hai i permessi per visualizzare questa pagina.</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-center">
        {canExport && (
          <Button
            variant="outline"
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Esporta
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
          <button 
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Filtri */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Filtri</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <Select
               value={filters.status}
               onChange={(e) => setFilters({ ...filters, status: e.target.value as 'pending' | 'processed' | 'archived' | '' })}
               placeholder="Tutti"
             >
               <option value="">Tutti</option>
               <option value="pending">In Attesa</option>
               <option value="processed">Elaborata</option>
               <option value="archived">Archiviata</option>
             </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Da
            </label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data A
            </label>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            />
          </div>
        </div>
      </Card>

      {/* Cards Submissions raggruppate per Form Template */}
      <div className="space-y-6">
        {Object.entries(groupSubmissionsByTemplate(submissions)).map(([templateId, templateSubmissions]) => {
          const template = templateSubmissions[0]?.formTemplate;
          const pendingCount = templateSubmissions.filter(s => s.status === 'pending').length;
          const processedCount = templateSubmissions.filter(s => s.status === 'processed').length;
          const archivedCount = templateSubmissions.filter(s => s.status === 'archived').length;

          return (
            <Card key={templateId} className="overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {template?.name || 'Form Template Sconosciuto'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {template?.description || 'Nessuna descrizione disponibile'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {templateSubmissions.length} submission{templateSubmissions.length !== 1 ? 's' : ''}
                    </Badge>
                    {pendingCount > 0 && (
                      <Badge variant="secondary">
                        {pendingCount} in attesa
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-sm text-blue-600 font-medium">In Attesa</div>
                    <div className="text-2xl font-bold text-blue-900">{pendingCount}</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-sm text-green-600 font-medium">Elaborate</div>
                    <div className="text-2xl font-bold text-green-900">{processedCount}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-600 font-medium">Archiviate</div>
                    <div className="text-2xl font-bold text-gray-900">{archivedCount}</div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-md font-medium text-gray-900">
                      Submissions Recenti
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTemplateId(templateId)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Vedi Tutte ({templateSubmissions.length})
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {templateSubmissions.slice(0, 3).map((submission) => (
                      <div
                        key={submission.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={() => handleViewSubmission(submission.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {submission.data?.email || submission.data?.name || 'Anonimo'}
                            </span>
                            <Badge
                              variant={
                                submission.status === 'pending' ? 'secondary' :
                                submission.status === 'processed' ? 'default' :
                                submission.status === 'archived' ? 'destructive' : 'outline'
                              }
                              className="text-xs"
                            >
                              {getStatusLabel(submission.status)}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {new Date(submission.submittedAt).toLocaleString('it-IT')}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {canEdit && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(submission);
                              }}
                              className="p-1 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Modifica Status"
                            >
                              <Edit className="h-3 w-3" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSubmission(submission.id);
                              }}
                              className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Elimina"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal Visualizzazione Submission */}
      <Modal
        isOpen={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        title="Dettagli Submission"
        size="lg"
      >
        {selectedSubmission && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Form: {selectedSubmission.formTemplate?.name}
              </h3>
              <p className="text-sm text-gray-600">
                Inviato il: {new Date(selectedSubmission.submittedAt).toLocaleString('it-IT')}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-gray-600">Status:</span>
                <Badge
                   variant={
                     selectedSubmission.status === 'pending' ? 'secondary' :
                     selectedSubmission.status === 'processed' ? 'default' :
                     selectedSubmission.status === 'archived' ? 'destructive' : 'outline'
                   }
                 >
                  {getStatusLabel(selectedSubmission.status)}
                </Badge>
              </div>
            </div>
            
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-2">
                Dati Inviati:
              </h4>
              <Card className="p-4">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 overflow-auto max-h-96">
                  {JSON.stringify(selectedSubmission.data, null, 2)}
                </pre>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                Chiudi
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Visualizza Tutte le Submissions di un Template */}
      <Modal
        isOpen={!!selectedTemplateId}
        onClose={() => setSelectedTemplateId(null)}
        title="Tutte le Submissions"
        size="xl"
      >
        {selectedTemplateId && (
          <div className="space-y-4">
            {(() => {
              const templateSubmissions = groupSubmissionsByTemplate(submissions)[selectedTemplateId] || [];
              const template = templateSubmissions[0]?.formTemplate;
              
              return (
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {template?.name || 'Form Template Sconosciuto'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {templateSubmissions.length} submission{templateSubmissions.length !== 1 ? 's' : ''} totali
                    </p>
                  </div>
                  
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {templateSubmissions.map((submission) => (
                      <div
                        key={submission.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedTemplateId(null);
                          handleViewSubmission(submission.id);
                        }}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {submission.data?.email || submission.data?.name || 'Anonimo'}
                            </span>
                            <Badge
                              variant={
                                submission.status === 'pending' ? 'secondary' :
                                submission.status === 'processed' ? 'default' :
                                submission.status === 'archived' ? 'destructive' : 'outline'
                              }
                              className="text-xs"
                            >
                              {getStatusLabel(submission.status)}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {new Date(submission.submittedAt).toLocaleString('it-IT')}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {canEdit && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTemplateId(null);
                                handleStatusChange(submission);
                              }}
                              className="p-1 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Modifica Status"
                            >
                              <Edit className="h-3 w-3" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSubmission(submission.id);
                              }}
                              className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Elimina"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <Button variant="outline" onClick={() => setSelectedTemplateId(null)}>
                      Chiudi
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </Modal>

      {/* Modal Modifica Status */}
      <Modal
        isOpen={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
        title="Modifica Status"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nuovo Status
            </label>
            <Select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as 'pending' | 'processed' | 'archived')}
            >
              <option value="pending">In Attesa</option>
              <option value="processed">Elaborata</option>
              <option value="archived">Archiviata</option>
            </Select>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Annulla
            </Button>
            <Button variant="primary" onClick={handleUpdateStatus}>
              Salva
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FormSubmissionsPage;