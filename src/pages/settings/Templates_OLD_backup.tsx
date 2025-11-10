import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiPut, apiDelete } from '../../services/api';
import { GoogleIntegrationPanel } from './templates/components/google/GoogleIntegrationPanel';
import { 
  FileText, 
  Plus, 
  Edit2, 
  Trash2, 
  Copy, 
  Star, 
  MoreVertical,
  History,
  FileSlides
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  url: string;
  type: string;
  content?: string;
  header?: string;
  footer?: string;
  isDefault?: boolean;
  fileFormat?: string;
  logoImage?: string;
  logoPosition?: string;
  googleDocsUrl?: string;
  googleSlidesId?: string;
  source?: 'server' | 'local';
  createdAt?: string;
  updatedAt?: string;
}

const TEMPLATE_TYPES = [
  { value: 'attestato', label: 'Attestato', icon: FileText },
  { value: 'lettera', label: 'Lettera', icon: FileText },
  { value: 'slides', label: 'Presentazione', icon: FileText }
];

const TemplatesSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Create template modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateType, setNewTemplateType] = useState('attestato');
  
  // Edit template modal
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  
  // Dropdown menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await apiGet<any>('/api/v1/templates');
      setTemplates(response?.data || []);
    } catch (err) {
      setError('Errore nel recupero dei template');
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTemplate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const { id, name, type, fileFormat, url, googleDocsUrl, isEditing } = modalData;
      
      const data = {
        name: name.trim(), 
        url: url.trim() || googleDocsUrl.trim(),
        type,
        fileFormat,
        googleDocsUrl: googleDocsUrl.trim() || null
      };
      
      console.log('Submitting template data:', data);
      
      if (isEditing) {
        await apiPut(`/api/v1/templates/${id}`, data);
        setSuccess('Template aggiornato con successo');
        toast({
          title: 'Successo',
          description: 'Template aggiornato con successo',
          status: 'success'
        });
      } else {
        await apiPost('/api/v1/templates', data);
        setSuccess('Nuovo template creato con successo');
        toast({
          title: 'Successo',
          description: 'Nuovo template creato con successo',
          status: 'success'
        });
      }
      
      // Reset form and close modal
      setModalData({
        name: '',
        type: 'attestato',
        fileFormat: 'text',
        url: '',
        googleDocsUrl: '',
        id: '',
        isEditing: false
      });
      setShowAddModal(false);
      
      // Refresh templates
      await fetchTemplates();
    } catch (err) {
       const errorMessage = modalData.isEditing ? 'Errore nell\'aggiornamento del template' : 'Errore nella creazione del template';
       setError(errorMessage);
       toast({
         title: 'Errore',
         description: errorMessage,
         status: 'error'
       });
       console.error('Error submitting template:', err);
     } finally {
      setLoading(false);
    }
  };

  const handleEditTemplate = (template: Template): void => {
    setModalData({
      name: template.name,
      type: template.type,
      fileFormat: template.fileFormat || 'text',
      url: template.url,
      googleDocsUrl: template.googleDocsUrl || '',
      id: template.id,
      isEditing: true
    });
    setShowAddModal(true);
  };

  const handleSetAsDefault = async (templateId: string): Promise<void> => {
    try {
      await apiPut(`/api/v1/templates/${templateId}/set-default`, {});
      toast({
        title: 'Successo',
        description: 'Template predefinito impostato',
        status: 'success'
      });
      fetchTemplates();
    } catch (err) {
      console.error('Error setting default template:', err);
      toast({
        title: 'Errore',
        description: 'Errore nell\'impostare il template predefinito',
        status: 'error'
      });
    }
  };

  const handleRemoveTemplate = async (templateId: string): Promise<void> => {
    if (!confirm('Sei sicuro di voler eliminare questo template?')) {
      return;
    }

    try {
      await apiDelete(`/api/v1/templates/${templateId}`);
      setSuccess('Template eliminato con successo');
      toast({
        title: 'Successo',
        description: 'Template eliminato con successo',
        status: 'success'
      });
      await fetchTemplates();
    } catch (err) {
      setError('Errore nell\'eliminazione del template');
      toast({
        title: 'Errore',
        description: 'Errore nell\'eliminazione del template',
        status: 'error'
      });
      console.error('Error removing template:', err);
    }
  };

  const handleDuplicateTemplate = async (template: Template): Promise<void> => {
    const newName = prompt('Inserisci il nome per il template duplicato:', `${template.name} (Copia)`);
    if (!newName || !newName.trim()) {
      return;
    }

    try {
      await apiPost(`/api/v1/templates/${template.id}/duplicate`, { name: newName.trim() });
      setSuccess('Template duplicato con successo');
      toast({
        title: 'Successo',
        description: 'Template duplicato con successo',
        status: 'success'
      });
      await fetchTemplates();
    } catch (err) {
      setError('Errore nella duplicazione del template');
      toast({
        title: 'Errore',
        description: 'Errore nella duplicazione del template',
        status: 'error'
      });
      console.error('Error duplicating template:', err);
    }
  };

  const handleViewVersions = (template: Template): void => {
    navigate(`/settings/templates/${template.id}/versions`);
  };

  const handleCreateNewTemplate = (templateType: string): void => {
    setModalData({
      name: '',
      type: templateType,
      fileFormat: 'text',
      url: '',
      googleDocsUrl: '',
      id: '',
      isEditing: false
    });
    setShowAddModal(true);
  };

  const handleDocxImport = (templateType: string): void => {
    // Implementation for DOCX import
    console.log('DOCX import for type:', templateType);
    toast({
      title: 'Funzionalità in sviluppo',
      description: 'L\'importazione DOCX sarà disponibile presto',
      status: 'info'
    });
  };

  const handleAddGoogleDocs = (templateType: string): void => {
    const url = prompt('Inserisci l\'URL del documento Google Docs:');
    if (!url) return;
    
    const newName = prompt('Inserisci il nome del template:');
    if (!newName) return;
    
    setModalData({
      name: newName,
      type: templateType,
      fileFormat: 'text',
      url: '',
      googleDocsUrl: url,
      id: '',
      isEditing: false
    });
    setShowAddModal(true);
  };

  const handleAddGoogleSlides = (templateType: string): void => {
    const url = prompt('Inserisci l\'URL della presentazione Google Slides:');
    if (!url) return;
    
    const newName = prompt('Inserisci il nome del template:');
    if (!newName) return;
    
    setModalData({
      name: newName,
      type: templateType,
      fileFormat: 'pptx',
      url: '',
      googleDocsUrl: url,
      id: '',
      isEditing: false
    });
    setShowAddModal(true);
  };

  const toggleDropdown = (id: string): void => {
    if (openDropdownId === id) {
      setOpenDropdownId(null);
    } else {
      setOpenDropdownId(id);
    }
  };

  const handleNavigateToSettingsTab = (tabId: string): void => {
    switch (tabId) {
      case 'generali':
        navigate('/settings/general');
        break;
      case 'templates':
        // Already on this page, do nothing
        break;
      case 'utenti':
        navigate('/settings/users');
        break;
      case 'ruoli':
        navigate('/settings/roles');
        break;
      case 'log-attivita':
        navigate('/settings/activity-logs');
        break;
      default:
        break;
    }
  };

  const dismissNotifications = (): void => {
    setError(null);
    setSuccess(null);
  };

  const handleGoogleImport = (templateData: any): void => {
    console.log('Template imported from Google:', templateData);
    toast({
      title: 'Successo',
      description: `Template "${templateData.name}" importato da Google`,
      status: 'success'
    });
    fetchTemplates();
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Gestione Template</h1>
      </div>
      
      {/* Notifications */}
      <NotificationBanner 
        error={error}
        success={success}
        onDismiss={dismissNotifications}
      />
      
      {/* Google Integration Panel */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <GoogleIntegrationPanel onTemplateImported={handleGoogleImport} />
      </div>
      
      {/* Template Cards Grid - one for each template type */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {TEMPLATE_TYPES.map((templateType) => {
          const templatesOfType = getTemplatesByType(templates, templateType.value);
          
          return (
            <TemplateTypeCard
              key={templateType.value}
              templateType={templateType}
              templates={templatesOfType}
              openDropdownId={openDropdownId}
              dropdownRefs={dropdownRefs}
              onToggleDropdown={toggleDropdown}
              onCreateNew={handleCreateNewTemplate}
              onDocxImport={handleDocxImport}
              onAddGoogleDocs={handleAddGoogleDocs}
              onAddGoogleSlides={handleAddGoogleSlides}
              onEditTemplate={handleEditTemplate}
              onSetAsDefault={handleSetAsDefault}
              onRemoveTemplate={handleRemoveTemplate}
              onDuplicateTemplate={handleDuplicateTemplate}
              onViewVersions={handleViewVersions}
              fetchTemplates={fetchTemplates}
            />
          );
        })}
      </div>

      {/* Placeholders Legend */}
      <PlaceholdersLegend 
        entityFields={ENTITY_FIELDS}
        entityLabels={ENTITY_LABELS}
        attestatoPlaceholders={ATTESTATO_PLACEHOLDERS}
        letteraPlaceholders={LETTERA_PLACEHOLDERS}
      />
      
      {/* Template Form Modal */}
      <TemplateFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleSubmitTemplate}
        modalData={modalData}
        setModalData={setModalData}
        templateTypes={TEMPLATE_TYPES}
        fileFormats={FILE_FORMATS}
        loading={loading}
      />
      
      <ToastContainer />
    </div>
  );
};

export default TemplatesSettingsPage;