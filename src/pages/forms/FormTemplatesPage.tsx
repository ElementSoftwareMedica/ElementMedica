import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Archive,
  CheckCircle,
  Checkbox as CheckboxIcon,
  Copy,
  Edit,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Globe,
  Lock,
  MoreVertical,
  Plus,
  Search,
  Trash2
} from 'lucide-react';
import { Button } from '../../design-system/atoms/Button';
import { Card } from '../../design-system/molecules/Card';
import { Badge } from '../../design-system/atoms/Badge';
import { Modal } from '../../design-system/molecules/Modal';
import { Input } from '../../design-system/atoms/Input';
import { Select } from '../../design-system/atoms/Select/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../design-system/molecules/Table/Table';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '../../design-system/molecules/DropdownMenu/DropdownMenu';
import { cn } from '../../design-system/utils';
import { formTemplatesService, FormTemplate } from '../../services/formTemplates';
import { useAuth } from '../../context/AuthContext';
import { ShareFormModal } from '../../components/forms/ShareFormModal';
import { ActionButton } from '../../components/ui';

interface FormTemplatesPageProps {
  hideHeader?: boolean;
}

export default function FormTemplatesPage({ hideHeader = false }: FormTemplatesPageProps) {
  const navigate = useNavigate();
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [duplicateName, setDuplicateName] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Bulk selection & Edit Mode
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const { hasPermission, isLoading: authLoading } = useAuth();
  const canView = hasPermission('form_templates', 'read');
  const canEdit = hasPermission('form_templates', 'update');
  const canDeleteTemplates = hasPermission('form_templates', 'delete');
  const canCreateTemplates = hasPermission('form_templates', 'create');

  useEffect(() => {
    loadFormTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [searchQuery, filterType, filterStatus, formTemplates]);

  const loadFormTemplates = async () => {
    try {
      console.log('📥 Loading form templates...');
      setLoading(true);
      const templates = await formTemplatesService.getFormTemplates();
      console.log('✅ Loaded templates:', templates.length);
      setFormTemplates(templates);
      setFilteredTemplates(templates);
    } catch (err) {
      setError('Errore nel caricamento dei form templates');
      console.error('❌ Error loading form templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = [...formTemplates];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        t => t.name.toLowerCase().includes(query) ||
          (t.description && t.description.toLowerCase().includes(query))
      );
    }

    // Type filter
    if (filterType) {
      filtered = filtered.filter(t => t.isPublic === (filterType === 'public'));
    }

    // Status filter
    if (filterStatus) {
      filtered = filtered.filter(t => t.isActive === (filterStatus === 'active'));
    }

    setFilteredTemplates(filtered);
  };

  const handleDelete = async () => {
    if (!selectedTemplate) return;

    try {
      await formTemplatesService.deleteFormTemplate(selectedTemplate.id);
      setFormTemplates(prev => prev.filter(t => t.id !== selectedTemplate.id));
      setDeleteDialogOpen(false);
      setSelectedTemplate(null);
    } catch (err) {
      setError('Errore nell\'eliminazione del form template');
      console.error('Error deleting form template:', err);
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(
        selectedTemplates.map(id => formTemplatesService.deleteFormTemplate(id))
      );
      setFormTemplates(prev => prev.filter(t => !selectedTemplates.includes(t.id)));
      setSelectedTemplates([]);
      setShowBulkActions(false);
      setBulkDeleteDialogOpen(false);
    } catch (err) {
      setError('Errore nell\'eliminazione multipla dei form templates');
      console.error('Error bulk deleting form templates:', err);
    }
  };

  const handleDuplicate = async () => {
    if (!selectedTemplate || !duplicateName.trim()) return;

    try {
      const newTemplate = await formTemplatesService.duplicateFormTemplate(
        selectedTemplate.id,
        duplicateName.trim()
      );
      setFormTemplates(prev => [...prev, newTemplate]);
      setDuplicateDialogOpen(false);
      setSelectedTemplate(null);
      setDuplicateName('');
    } catch (err) {
      setError('Errore nella duplicazione del form template');
      console.error('Error duplicating form template:', err);
    }
  };

  const handleToggleActive = async (template: FormTemplate) => {
    try {
      const updated = await formTemplatesService.updateFormTemplate(template.id, {
        isActive: !template.isActive
      });
      setFormTemplates(prev => prev.map(t => t.id === template.id ? updated : t));
    } catch (err) {
      setError('Errore nell\'aggiornamento dello stato del template');
      console.error('Error toggling template status:', err);
    }
  };

  const toggleSelectAll = () => {
    if (selectedTemplates.length === filteredTemplates.length) {
      setSelectedTemplates([]);
      setShowBulkActions(false);
    } else {
      setSelectedTemplates(filteredTemplates.map(t => t.id));
      setShowBulkActions(true);
    }
  };

  const toggleSelectTemplate = (templateId: string) => {
    setSelectedTemplates(prev => {
      const newSelection = prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId];
      setShowBulkActions(newSelection.length > 0);
      return newSelection;
    });
  };

  const openDeleteDialog = (template: FormTemplate) => {
    setSelectedTemplate(template);
    setDeleteDialogOpen(true);
  };

  const openDuplicateDialog = (template: FormTemplate) => {
    setSelectedTemplate(template);
    setDuplicateName(`${template.name} - Copia`);
    setDuplicateDialogOpen(true);
  };

  const openShareDialog = (template: FormTemplate) => {
    console.log('🔓 Opening share dialog for template:', template.id, template.name);
    setSelectedTemplate(template);
    setShareDialogOpen(true);
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

  // Mostra loading se l'AuthContext sta ancora caricando
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-gray-600">Caricamento permessi...</p>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <span>Non hai i permessi per visualizzare questa pagina.</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-gray-600">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      {!hideHeader && (
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Form Templates</h1>
            <p className="mt-2 text-sm text-gray-600">
              Gestisci i moduli e i form dell'applicazione
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button
                variant={isEditMode ? "primary" : "secondary"}
                leftIcon={<Edit className="h-4 w-4" />}
                onClick={() => {
                  setIsEditMode(!isEditMode);
                  if (isEditMode) {
                    setSelectedTemplates([]);
                    setShowBulkActions(false);
                  }
                }}
              >
                {isEditMode ? 'Esci da Modifica' : 'Modifica'}
              </Button>
            )}
            {canCreateTemplates && (
              <Button
                variant="primary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => navigate('/forms/templates/create')}
              >
                Nuovo Form
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Create Button when header is hidden */}
      {hideHeader && (
        <div className="flex justify-end gap-2">
          {canEdit && (
            <Button
              variant={isEditMode ? "primary" : "secondary"}
              leftIcon={<Edit className="h-4 w-4" />}
              onClick={() => {
                setIsEditMode(!isEditMode);
                if (isEditMode) {
                  setSelectedTemplates([]);
                  setShowBulkActions(false);
                }
              }}
            >
              {isEditMode ? 'Esci da Modifica' : 'Modifica'}
            </Button>
          )}
          {canCreateTemplates && (
            <Button
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => navigate('/forms/templates/create')}
            >
              Nuovo Form
            </Button>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Totale Form</p>
                <p className="text-2xl font-bold text-gray-900">{formTemplates.length}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Attivi</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formTemplates.filter(t => t.isActive).length}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Globe className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pubblici</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formTemplates.filter(t => t.isPublic).length}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-100 rounded-lg">
                <Lock className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Privati</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formTemplates.filter(t => !t.isPublic).length}
                </p>
              </div>
            </div>
          </div>
        </Card>
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
            ×
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <Card>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Input
                placeholder="Cerca per nome o descrizione..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              options={[
                { value: '', label: 'Tutti i tipi' },
                { value: 'public', label: 'Pubblici' },
                { value: 'private', label: 'Privati' }
              ]}
            />
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              options={[
                { value: '', label: 'Tutti gli stati' },
                { value: 'active', label: 'Attivi' },
                { value: 'inactive', label: 'Inattivi' }
              ]}
            />
          </div>

          {showBulkActions && (
            <div className="mt-4 flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm font-medium text-blue-900">
                {selectedTemplates.length} form selezionati
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowBulkActions(false);
                    setSelectedTemplates([]);
                  }}
                >
                  Annulla Selezione
                </Button>
                {canDeleteTemplates && (
                  <Button
                    variant="destructive"
                    size="sm"
                    leftIcon={<Trash2 className="w-4 h-4" />}
                    onClick={() => setBulkDeleteDialogOpen(true)}
                  >
                    Elimina Selezionati
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Main Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                {isEditMode && (
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedTemplates.length === filteredTemplates.length && filteredTemplates.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </TableHead>
                )}
                <TableHead className="w-32">Azioni</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-center">Campi</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Risposte</TableHead>
                <TableHead>Ultimo Aggiornamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.map((template) => (
                <TableRow key={template.id}>
                  {isEditMode && (
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedTemplates.includes(template.id)}
                        onChange={() => toggleSelectTemplate(template.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </TableCell>
                  )}

                  {/* AZIONI COLUMN - con ActionButton pillola */}
                  <TableCell>
                    <ActionButton
                      actions={[
                        {
                          label: 'Visualizza Risposte',
                          icon: <Eye className="w-4 h-4" />,
                          onClick: () => navigate(`/forms/templates/${template.id}/submissions`)
                        },
                        ...(canEdit ? [{
                          label: 'Modifica',
                          icon: <Edit className="w-4 h-4" />,
                          onClick: () => navigate(`/forms/templates/${template.id}/edit`)
                        }] : []),
                        {
                          label: 'Condividi & QR Code',
                          icon: <Globe className="w-4 h-4" />,
                          onClick: () => openShareDialog(template)
                        },
                        {
                          label: 'Duplica',
                          icon: <Copy className="w-4 h-4" />,
                          onClick: () => openDuplicateDialog(template)
                        },
                        {
                          label: template.isActive ? 'Disattiva' : 'Attiva',
                          icon: template.isActive ? <EyeOff className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />,
                          onClick: () => handleToggleActive(template)
                        },
                        ...(canDeleteTemplates ? [{
                          label: 'Elimina',
                          icon: <Trash2 className="w-4 h-4" />,
                          onClick: () => openDeleteDialog(template),
                          variant: 'danger' as const
                        }] : [])
                      ]}
                    />
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{template.name}</p>
                        {template.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                            {template.description}
                          </p>
                        )}
                      </div>
                      {template.isPublic && (
                        <Globe className="h-4 w-4 text-blue-500 flex-shrink-0" title="Pubblico" />
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant={template.isPublic ? 'default' : 'secondary'} size="sm">
                      {template.isPublic ? 'Pubblico' : 'Privato'}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-center">
                    <span className="text-sm font-medium text-gray-900">
                      {template.fields.length}
                    </span>
                  </TableCell>

                  <TableCell>
                    <Badge variant={template.isActive ? 'success' : 'secondary'} size="sm">
                      {template.isActive ? 'Attivo' : 'Inattivo'}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <span className="text-sm text-gray-900">
                      {template.submissionsCount || 0}
                    </span>
                  </TableCell>

                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {formatDate(template.updatedAt || template.createdAt)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}

              {filteredTemplates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isEditMode ? 8 : 7} className="p-8 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <FileText className="h-12 w-12 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {searchQuery || filterType || filterStatus
                            ? 'Nessun risultato trovato'
                            : 'Nessun form template'}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {searchQuery || filterType || filterStatus
                            ? 'Prova a modificare i filtri di ricerca'
                            : 'Inizia creando il tuo primo form template'}
                        </p>
                      </div>
                      {canCreateTemplates && !searchQuery && !filterType && !filterStatus && (
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<Plus className="h-4 w-4" />}
                          onClick={() => navigate('/forms/templates/create')}
                          className="mt-2"
                        >
                          Nuovo Form
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Delete Modal */}
      <Modal
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title="Conferma eliminazione"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Sei sicuro di voler eliminare il form template "{selectedTemplate?.name}"?
            Questa azione non può essere annullata.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              Elimina
            </Button>
          </div>
        </div>
      </Modal>

      {/* Duplicate Modal */}
      <Modal
        isOpen={duplicateDialogOpen}
        onClose={() => setDuplicateDialogOpen(false)}
        title="Duplica Form Template"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome del nuovo form template
            </label>
            <Input
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              placeholder="Inserisci il nome del nuovo template"
              className="w-full"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setDuplicateDialogOpen(false)}
            >
              Annulla
            </Button>
            <Button
              variant="primary"
              onClick={handleDuplicate}
              disabled={!duplicateName.trim()}
            >
              Duplica
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Modal */}
      <Modal
        isOpen={bulkDeleteDialogOpen}
        onClose={() => setBulkDeleteDialogOpen(false)}
        title="Conferma eliminazione multipla"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Sei sicuro di voler eliminare {selectedTemplates.length} form templates?
            Questa azione non può essere annullata.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              ⚠️ Verranno eliminate anche tutte le risposte associate a questi form.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setBulkDeleteDialogOpen(false)}
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
            >
              Elimina {selectedTemplates.length} Form
            </Button>
          </div>
        </div>
      </Modal>

      {/* Share Modal */}
      {selectedTemplate && (
        <ShareFormModal
          isOpen={shareDialogOpen}
          onClose={() => {
            setShareDialogOpen(false);
            setSelectedTemplate(null);
          }}
          template={selectedTemplate}
        />
      )}
    </div>
  );
}