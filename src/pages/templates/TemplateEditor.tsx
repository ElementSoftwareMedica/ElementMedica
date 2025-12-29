import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useConfirmDialog } from '../../contexts/ConfirmDialogContext';
import { ChevronLeft, Save, X, Eye, History, PanelRightOpen, PanelRightClose, EyeOff, FileText } from 'lucide-react';
import { templateService } from '../../services/templateService';
import {
  Template,
  TemplateCreateData,
  TemplateUpdateData,
  TemplateType,
  TemplateFormat
} from '../../types/templates';
import MarkerPicker from '../../components/templates/MarkerPicker';
import PreviewPane from '../../components/templates/PreviewPane';
import VersionHistoryDialog from '../../components/templates/VersionHistoryDialog';
import GenerateDocumentDialog from '../../components/templates/GenerateDocumentDialog';

const TemplateEditor: React.FC = () => {
  const { confirm } = useConfirmDialog();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  // State
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showMarkerPicker, setShowMarkerPicker] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [activeField, setActiveField] = useState<'header' | 'content' | 'footer'>('content');
  const [isPreviewValid, setIsPreviewValid] = useState(true);

  // Refs for textarea elements
  const headerRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const footerRef = useRef<HTMLTextAreaElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'CUSTOM' as TemplateType,
    fileFormat: 'HTML' as TemplateFormat,
    category: '',
    description: '',
    tags: [] as string[],
    header: '',
    content: '',
    footer: '',
    isActive: true,
    isDefault: false
  });

  // Load template if editing
  useEffect(() => {
    if (isEditMode && id) {
      fetchTemplate();
    }
  }, [id, isEditMode]);

  const fetchTemplate = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const data = await templateService.get(id);
      setTemplate(data);

      // Populate form
      setFormData({
        name: data.name,
        type: data.type,
        fileFormat: data.fileFormat || 'HTML',
        category: data.category || '',
        description: data.description || '',
        tags: data.tags || [],
        header: data.header || '',
        content: data.content || '',
        footer: data.footer || '',
        isActive: data.isActive,
        isDefault: data.isDefault
      });

      setError(null);
    } catch (err) {
      console.error('[TemplateEditor] Error fetching template:', err);
      setError('Errore durante il caricamento del template');
      setAlert({ type: 'error', message: 'Impossibile caricare il template' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tagsString = e.target.value;
    const tagsArray = tagsString.split(',').map(t => t.trim()).filter(t => t);
    setFormData(prev => ({ ...prev, tags: tagsArray }));
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      setAlert({ type: 'error', message: 'Il nome del template è obbligatorio' });
      return;
    }

    if (!formData.content.trim()) {
      setAlert({ type: 'error', message: 'Il contenuto del template è obbligatorio' });
      return;
    }

    setSaving(true);
    try {
      if (isEditMode && id) {
        // Update existing
        const updateData: TemplateUpdateData = {
          name: formData.name,
          type: formData.type,
          category: formData.category || undefined,
          description: formData.description || undefined,
          tags: formData.tags.length > 0 ? formData.tags : undefined,
          header: formData.header || undefined,
          content: formData.content,
          footer: formData.footer || undefined,
          isActive: formData.isActive,
          isDefault: formData.isDefault
        };

        await templateService.update(id, updateData);
        setAlert({ type: 'success', message: 'Template aggiornato con successo' });
      } else {
        // Create new
        const createData: TemplateCreateData = {
          name: formData.name,
          type: formData.type,
          content: formData.content,
          header: formData.header || undefined,
          footer: formData.footer || undefined,
          category: formData.category || undefined,
          description: formData.description || undefined,
          tags: formData.tags.length > 0 ? formData.tags : undefined,
          isDefault: formData.isDefault
        };

        const newTemplate = await templateService.create(createData);
        setAlert({ type: 'success', message: 'Template creato con successo' });

        // Navigate to edit mode
        navigate(`/templates/${newTemplate.id}`, { replace: true });
      }
    } catch (err) {
      console.error('[TemplateEditor] Error saving template:', err);
      setAlert({ type: 'error', message: 'Errore durante il salvataggio' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    const shouldCancel = await confirm({
      title: 'Annullare le modifiche?',
      message: 'Sei sicuro di voler annullare? Le modifiche non salvate andranno perse.',
      confirmLabel: 'Annulla modifiche',
      variant: 'warning'
    });
    if (shouldCancel) {
      navigate('/templates');
    }
  };

  const handleMarkerInsert = (marker: string) => {
    // Get the active textarea ref
    const ref = activeField === 'header' ? headerRef : activeField === 'content' ? contentRef : footerRef;
    const textarea = ref.current;

    if (!textarea) return;

    // Get current cursor position
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = formData[activeField];

    // Insert marker at cursor position
    const newValue = currentValue.substring(0, start) + marker + currentValue.substring(end);

    // Update form data
    setFormData(prev => ({ ...prev, [activeField]: newValue }));

    // Restore focus and set cursor after inserted marker
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + marker.length, start + marker.length);
    }, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Caricamento template...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="text-center bg-red-50 border border-red-200 rounded-md p-6 max-w-md">
          <h2 className="text-xl font-semibold text-red-700 mb-3">Errore</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <div className="flex justify-center space-x-3">
            <button
              onClick={() => navigate('/templates')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Torna alla lista
            </button>
            <button
              onClick={fetchTemplate}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Riprova
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/templates')}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {isEditMode ? 'Modifica Template' : 'Nuovo Template'}
            </h1>
            {isEditMode && template && (
              <p className="text-sm text-gray-500">
                Versione {template.version} • Ultimo aggiornamento: {new Date(template.updatedAt).toLocaleDateString('it-IT')}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMarkerPicker(!showMarkerPicker)}
            className="flex items-center gap-2 px-4 py-2 border rounded hover:bg-gray-50"
            title={showMarkerPicker ? 'Nascondi marker' : 'Mostra marker'}
          >
            {showMarkerPicker ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
            Marker
          </button>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-2 px-4 py-2 border rounded hover:bg-gray-50 ${!isPreviewValid ? 'border-yellow-500 text-yellow-600' : ''
              }`}
            title={showPreview ? 'Nascondi anteprima' : 'Mostra anteprima'}
          >
            {showPreview ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            Anteprima
          </button>
          {isEditMode && template && (
            <>
              <button
                onClick={() => setShowVersionHistory(true)}
                className="flex items-center gap-2 px-4 py-2 border rounded hover:bg-gray-50"
                title="Visualizza cronologia versioni"
              >
                <History className="h-4 w-4" />
                Cronologia
              </button>
              <button
                onClick={() => setShowGenerateDialog(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                title="Genera documento da questo template"
              >
                <FileText className="h-4 w-4" />
                Genera
              </button>
            </>
          )}
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 px-4 py-2 border rounded hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </div>

      {/* Alert */}
      {alert && (
        <div className={`mb-4 p-4 rounded-md ${alert.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
          <div className="flex items-center justify-between">
            <span>{alert.message}</span>
            <button onClick={() => setAlert(null)} className="text-gray-500 hover:text-gray-700">
              ×
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
          {/* Basic Info Section */}
          <div className="bg-white rounded-lg shadow p-6 border-b pb-4">
            <h2 className="text-lg font-semibold mb-4">Informazioni Base</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Template *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="es. Attestato di Partecipazione"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="LETTER_OF_ENGAGEMENT">Lettera di Incarico</option>
                  <option value="ATTENDANCE_REGISTER">Registro Presenze</option>
                  <option value="CERTIFICATE">Attestato</option>
                  <option value="INVOICE">Fattura</option>
                  <option value="COURSE_PROGRAM">Programma Corso</option>
                  <option value="CUSTOM">Personalizzato</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Formato
                </label>
                <select
                  name="fileFormat"
                  value={formData.fileFormat}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="HTML">HTML</option>
                  <option value="DOCX">Word (DOCX)</option>
                  <option value="GOOGLE_DOCS">Google Docs</option>
                  <option value="GOOGLE_SLIDES">Google Slides</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria
                </label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="es. Formazione, HR, Legale"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrizione
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Breve descrizione del template..."
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags (separati da virgola)
              </label>
              <input
                type="text"
                value={formData.tags.join(', ')}
                onChange={handleTagsChange}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="es. attestato, formazione, sicurezza"
              />
            </div>

            <div className="mt-4 flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Attivo</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isDefault"
                  checked={formData.isDefault}
                  onChange={handleInputChange}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Imposta come predefinito</span>
              </label>
            </div>
          </div>

          {/* Content Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Contenuto HTML</h2>
            <p className="text-sm text-gray-600 mb-4">
              Usa i marker per inserire dati dinamici, es: <code className="bg-gray-100 px-1 rounded">{'{{person.firstName}}'}</code>
            </p>

            {/* Header */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Intestazione (Header)
              </label>
              <textarea
                ref={headerRef}
                name="header"
                value={formData.header}
                onChange={handleInputChange}
                onFocus={() => setActiveField('header')}
                rows={4}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                placeholder="<div>HTML per l'intestazione...</div>"
              />
            </div>

            {/* Content */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contenuto Principale *
              </label>
              <textarea
                ref={contentRef}
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                onFocus={() => setActiveField('content')}
                rows={12}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                placeholder="<div>HTML per il contenuto principale...</div>"
                required
              />
            </div>

            {/* Footer */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Piè di pagina (Footer)
              </label>
              <textarea
                ref={footerRef}
                name="footer"
                value={formData.footer}
                onChange={handleInputChange}
                onFocus={() => setActiveField('footer')}
                rows={4}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                placeholder="<div>HTML per il piè di pagina...</div>"
              />
            </div>
          </div>
        </div>

        {/* Marker Picker Sidebar */}
        {showMarkerPicker && (
          <MarkerPicker
            onInsert={handleMarkerInsert}
            className="w-96 flex-shrink-0"
          />
        )}

        {/* Preview Pane Sidebar */}
        {showPreview && (
          <PreviewPane
            templateId={id}
            header={formData.header}
            content={formData.content}
            footer={formData.footer}
            onValidationChange={setIsPreviewValid}
            className="w-[600px] flex-shrink-0"
          />
        )}
      </div>

      {/* Version History Dialog */}
      {showVersionHistory && isEditMode && template && (
        <VersionHistoryDialog
          templateId={id!}
          currentVersion={template.version}
          onClose={() => setShowVersionHistory(false)}
          onRollbackSuccess={() => {
            // Reload template after rollback
            fetchTemplate();
            setShowVersionHistory(false);
            setAlert({
              type: 'success',
              message: 'Template ripristinato con successo!'
            });
          }}
        />
      )}

      {/* Generate Document Dialog */}
      {showGenerateDialog && isEditMode && template && (
        <GenerateDocumentDialog
          template={template}
          onClose={() => setShowGenerateDialog(false)}
          onSuccess={(document) => {
            setShowGenerateDialog(false);
            setAlert({
              type: 'success',
              message: `Documento generato: ${document.filename}`
            });
          }}
        />
      )}
    </div>
  );
};

export default TemplateEditor;
