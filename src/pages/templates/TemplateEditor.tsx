import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useConfirmDialog } from '../../contexts/ConfirmDialogContext';
import { ChevronLeft, Save, X, Eye, History, PanelRightOpen, PanelRightClose, EyeOff, FileText, Code, FileType, Columns2 } from 'lucide-react';
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
import { useToast } from '../../hooks/useToast';

const TemplateEditor: React.FC = () => {
  const { confirm } = useConfirmDialog();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditMode = !!id;

  // Determine the base path for navigation (management or templates)
  const isInManagement = location.pathname.startsWith('/management');
  const basePath = isInManagement ? '/management/templates' : '/templates';

  // State
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  const [showMarkerPicker, setShowMarkerPicker] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [activeField, setActiveField] = useState<'header' | 'content' | 'footer'>('content');
  const [isPreviewValid, setIsPreviewValid] = useState(true);
  const [editorView, setEditorView] = useState<'html' | 'document' | 'split'>('html');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Refs for textarea elements
  const headerRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const footerRef = useRef<HTMLTextAreaElement>(null);

  // Track changes originating from Document mode iframe to prevent rewrite loops
  const editingFromIframe = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    } catch {
      setError('Errore durante il caricamento del template');
      showToast({ message: 'Impossibile caricare il template', type: 'error' });
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
      showToast({ message: 'Il nome del template è obbligatorio', type: 'error' });
      return;
    }

    if (!formData.content.trim()) {
      showToast({ message: 'Il contenuto del template è obbligatorio', type: 'error' });
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
        showToast({ message: 'Template aggiornato con successo', type: 'success' });
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
        showToast({ message: 'Template creato con successo', type: 'success' });

        // Navigate to edit mode using dynamic base path
        navigate(`${basePath}/${newTemplate.id}`, { replace: true });
      }
    } catch {
      showToast({ message: 'Errore durante il salvataggio', type: 'error' });
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
      navigate(basePath);
    }
  };

  const handleMarkerInsert = (marker: string) => {
    // In document mode, append marker to the active section's formData and re-render
    if (editorView === 'document') {
      setFormData(prev => ({ ...prev, [activeField]: (prev[activeField] || '') + marker }));
      showToast({ message: `Marker inserito in ${activeField}`, type: 'success' });
      return;
    }

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

  // Build complete HTML for iframe document preview with section boundaries
  const buildPreviewHtml = useCallback(() => {
    // Helper: highlight markers in a section (preserve triple vs double brace info)
    const highlightMarkers = (html: string) => html
      .replace(/\{\{\{([^}]+)\}\}\}/g, '<span class="marker marker-data" data-triple="1" contenteditable="false">{$1}</span>')
      .replace(/\{\{#if\s+([^}]+)\}\}/g, '<span class="marker marker-cond" contenteditable="false">IF $1</span>')
      .replace(/\{\{\/if\}\}/g, '<span class="marker marker-cond" contenteditable="false">/IF</span>')
      .replace(/\{\{else\}\}/g, '<span class="marker marker-cond" contenteditable="false">ELSE</span>')
      .replace(/\{\{([^#/][^}]*)\}\}/g, '<span class="marker marker-data" contenteditable="false">{$1}</span>');

    // Build sections with data-section attributes for bidirectional editing
    const sections: string[] = [];
    if (formData.header?.trim()) {
      sections.push(`<div class="doc-section doc-header" data-section="header"><div class="section-tag" contenteditable="false">HEADER</div>${highlightMarkers(formData.header)}</div>`);
    }
    if (formData.content?.trim()) {
      sections.push(`<div class="doc-section doc-content" data-section="content"><div class="section-tag section-tag-main" contenteditable="false">CONTENUTO</div>${highlightMarkers(formData.content)}</div>`);
    }
    if (formData.footer?.trim()) {
      sections.push(`<div class="doc-section doc-footer" data-section="footer"><div class="section-tag section-tag-footer" contenteditable="false">FOOTER</div>${highlightMarkers(formData.footer)}</div>`);
    }

    // If the content itself is a full HTML document, render it directly with just marker highlighting
    const rawFull = [formData.header, formData.content, formData.footer].filter(Boolean).join('\n');
    if (rawFull.includes('<html') || rawFull.includes('<!DOCTYPE')) {
      return highlightMarkers(rawFull);
    }

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body { margin: 0; padding: 20mm 15mm; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10pt; line-height: 1.5; color: #333; }
      .marker { padding: 1px 4px; border-radius: 3px; font-size: 0.85em; font-family: monospace; white-space: nowrap; }
      .marker-data { background: #dbeafe; color: #1d4ed8; }
      .marker-cond { background: #fef3c7; color: #92400e; font-size: 0.75em; }
      .doc-section { position: relative; min-height: 20px; }
      .doc-header { padding-bottom: 12px; margin-bottom: 16px; border-bottom: 2px dashed #93c5fd; }
      .doc-content { padding: 8px 0; min-height: 60px; }
      .doc-footer { padding-top: 12px; margin-top: 16px; border-top: 2px dashed #fdba74; }
      .section-tag { position: absolute; top: -8px; left: 0; font-size: 7pt; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; background: #dbeafe; color: #2563eb; padding: 1px 6px; border-radius: 3px; pointer-events: none; user-select: none; }
      .section-tag-main { background: #d1fae5; color: #059669; }
      .section-tag-footer { background: #fed7aa; color: #c2410c; }
      [contenteditable="false"].marker { cursor: default; user-select: none; }
    </style></head><body>${sections.join('\n')}</body></html>`;
  }, [formData.header, formData.content, formData.footer]);

  /** Reverse highlighted marker spans back to Handlebars marker syntax */
  const reverseHighlighting = useCallback((html: string): string => {
    let result = html;
    // Remove section tags entirely
    result = result.replace(/<div class="section-tag[^"]*"[^>]*>[\s\S]*?<\/div>/g, '');
    // Reverse triple-brace markers (data-triple="1")
    result = result.replace(/<span[^>]*data-triple="1"[^>]*>\{([^<]+)\}<\/span>/g, '{{{$1}}}');
    // Reverse double-brace data markers
    result = result.replace(/<span[^>]*class="marker marker-data"[^>]*>\{([^<]+)\}<\/span>/g, '{{$1}}');
    // Reverse conditional markers
    result = result.replace(/<span[^>]*class="marker marker-cond"[^>]*>IF ([^<]+)<\/span>/g, '{{#if $1}}');
    result = result.replace(/<span[^>]*class="marker marker-cond"[^>]*>\/IF<\/span>/g, '{{/if}}');
    result = result.replace(/<span[^>]*class="marker marker-cond"[^>]*>ELSE<\/span>/g, '{{else}}');
    return result.trim();
  }, []);

  /** Sync content from Document mode iframe back to formData (debounced) */
  const syncFromIframe = useCallback(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;

      const updates: Record<string, string> = {};
      const headerEl = doc.querySelector('[data-section="header"]');
      const contentEl = doc.querySelector('[data-section="content"]');
      const footerEl = doc.querySelector('[data-section="footer"]');

      if (headerEl) updates.header = reverseHighlighting(headerEl.innerHTML);
      if (contentEl) updates.content = reverseHighlighting(contentEl.innerHTML);
      if (footerEl) updates.footer = reverseHighlighting(footerEl.innerHTML);

      if (Object.keys(updates).length > 0) {
        editingFromIframe.current = true;
        setFormData(prev => ({ ...prev, ...updates }));
      }
    }, 300);
  }, [reverseHighlighting]);

  // Cleanup sync timer on unmount
  useEffect(() => {
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, []);

  // Update iframe when content changes in split or document preview mode
  useEffect(() => {
    // Skip rewrite when the change originated from the iframe itself
    if (editingFromIframe.current) {
      editingFromIframe.current = false;
      return;
    }

    if ((editorView === 'document' || editorView === 'split') && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(buildPreviewHtml());
        doc.close();

        // In document mode, enable contentEditable for live text editing
        if (editorView === 'document') {
          doc.body.contentEditable = 'true';
          doc.body.style.cursor = 'text';
          doc.body.style.outline = 'none';

          // Listen for input events to sync changes back
          doc.body.addEventListener('input', syncFromIframe);
        }
      }
    }
  }, [editorView, buildPreviewHtml, syncFromIframe]);

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
              onClick={() => navigate(basePath)}
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
            onClick={() => navigate(basePath)}
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
                  <option value="PREVENTIVO">Preventivo</option>
                  <option value="SLIDES">Slides</option>
                  <option value="VISITA_MEDICA">Visita Medica</option>
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Contenuto</h2>

              {/* Mode toggle: HTML Code / Split / Document Preview */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setEditorView('html')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all ${editorView === 'html'
                      ? 'bg-white shadow text-blue-600 font-medium'
                      : 'text-gray-600 hover:text-gray-800'
                    }`}
                >
                  <Code className="h-4 w-4" />
                  Editor HTML
                </button>
                <button
                  onClick={() => setEditorView('split')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all ${editorView === 'split'
                      ? 'bg-white shadow text-blue-600 font-medium'
                      : 'text-gray-600 hover:text-gray-800'
                    }`}
                  title="Editor + Anteprima affiancati"
                >
                  <Columns2 className="h-4 w-4" />
                  Split
                </button>
                <button
                  onClick={() => setEditorView('document')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all ${editorView === 'document'
                      ? 'bg-white shadow text-blue-600 font-medium'
                      : 'text-gray-600 hover:text-gray-800'
                    }`}
                >
                  <FileType className="h-4 w-4" />
                  Documento
                </button>
              </div>
            </div>

            {editorView === 'html' || editorView === 'split' ? (
              <div className={editorView === 'split' ? 'flex gap-4' : ''}>
                {/* HTML Editor */}
                <div className={editorView === 'split' ? 'flex-1 min-w-0' : ''}>
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
                      rows={editorView === 'split' ? 3 : 4}
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
                      rows={editorView === 'split' ? 8 : 12}
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
                      rows={editorView === 'split' ? 3 : 4}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                      placeholder="<div>HTML per il piè di pagina...</div>"
                    />
                  </div>
                </div>

                {/* Live Preview (split mode only) */}
                {editorView === 'split' && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-sm text-gray-500">Anteprima live</span>
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">dati</span>
                        <span className="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-medium">condizioni</span>
                      </span>
                    </div>
                    <div className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden sticky top-0">
                      <iframe
                        ref={iframeRef}
                        title="Anteprima Documento"
                        className="w-full border-0 bg-white"
                        style={{ minHeight: '500px', width: '100%' }}
                        sandbox="allow-same-origin"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Document Visual Preview Mode */
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-500">Anteprima documento renderizzato:</span>
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">dati</span>
                      <span className="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-medium">condizioni</span>
                      <span className="border-b-2 border-dashed border-blue-300 text-blue-500 px-1.5 py-0.5">header</span>
                      <span className="border-b-2 border-dashed border-orange-300 text-orange-500 px-1.5 py-0.5">footer</span>
                    </span>
                  </div>
                  <span className="text-xs text-emerald-600 font-medium">Modifica diretta abilitata — i marker sono protetti</span>
                </div>
                <div className="border-2 border-gray-200 rounded-lg bg-gray-100 p-4 flex justify-center">
                  <div className="bg-white shadow-lg" style={{ width: '210mm', minHeight: '297mm', maxWidth: '100%' }}>
                    <iframe
                      ref={iframeRef}
                      title="Anteprima Documento"
                      className="w-full border-0"
                      style={{ minHeight: '297mm', width: '100%' }}
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Formato A4 — Modifica il testo direttamente nel documento. Le modifiche si sincronizzano con l'Editor HTML.
                </p>
              </div>
            )}
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
            showToast({ message: 'Template ripristinato con successo!', type: 'success' });
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
            showToast({ message: `Documento generato: ${document.filename}`, type: 'success' });
          }}
        />
      )}
    </div>
  );
};

export default TemplateEditor;
