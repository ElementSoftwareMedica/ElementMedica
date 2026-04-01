import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { sanitizeRichHtml } from '../../utils/sanitize';
import { useToast } from '../../hooks/useToast';
import { apiGet, apiPost, apiPut } from '../../services/api';
import { ChevronLeft, Save, Download, Layout, Image, Eye, FileEdit, ChevronDown, ChevronUp, RotateCcw, Monitor, Smartphone, FileText, Presentation, Code } from 'lucide-react';
import { Button } from '../../design-system/atoms/Button';
import { PlaceholderDemo, GoogleTemplateProvider, GoogleDocsPreview } from '../../components/shared/template';
import PageHeader from '../../components/layouts/PageHeader';
import SimpleEditor from '../../components/editor/SimpleEditor';
import UnifiedTemplateToolbar from '../../components/editor/UnifiedTemplateToolbar';
import SlideEditor from '../../components/editor/SlideEditor';
import type { SlideElement } from '../../components/editor/SlideEditor';
import PlaceholderPanel from './templates/components/PlaceholderPanel';
import type { Editor } from '@tiptap/react';

// Template interface
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
}

// Common placeholders for templates
const TEMPLATE_PLACEHOLDERS = [
  { name: 'NOME_FORMATORE', description: 'Nome del formatore' },
  { name: 'COGNOME_FORMATORE', description: 'Cognome del formatore' },
  { name: 'DATA_GENERAZIONE', description: 'Data di generazione documento' },
  { name: 'NUMERO_PROGRESSIVO', description: 'Numero progressivo documento' },
  { name: 'CORSO_TITOLO', description: 'Titolo del corso' },
  { name: 'AZIENDA_RAGIONE_SOCIALE', description: 'Ragione sociale azienda' },
  { name: 'PRIMA_DATA', description: 'Data prima sessione' },
  { name: 'ULTIMA_DATA', description: 'Data ultima sessione' },
  { name: 'ORE_TOTALI', description: 'Ore totali corso' },
  { name: 'TARIFFA_ORARIA', description: 'Tariffa oraria' },
  { name: 'COMPENSO_TOTALE', description: 'Compenso totale' },
];

const TemplateEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Determine the base path for navigation (management or settings)
  const isInManagement = location.pathname.startsWith('/management');
  const basePath = isInManagement ? '/management/templates' : '/settings/templates';

  const [template, setTemplate] = useState<Template | null>(null);
  const [templateName, setTemplateName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [header, setHeader] = useState<string>('');
  const [footer, setFooter] = useState<string>('');
  const [googleDocsUrl, setGoogleDocsUrl] = useState<string>('');
  const [showHeaderFooter, setShowHeaderFooter] = useState(false);
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [logoPosition, setLogoPosition] = useState<string>('top-center');
  const [isDefault, setIsDefault] = useState<boolean>(false);
  const [expandLogoPanel, setExpandLogoPanel] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [editingName, setEditingName] = useState(false);
  const [templateType, setTemplateType] = useState<string>('');
  const [googleCardExpanded, setGoogleCardExpanded] = useState(true);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [showLivePreview, setShowLivePreview] = useState(true);
  const templateFormat = new URLSearchParams(location.search).get('format') || 'HTML';

  // Editor mode: 'document' for text editor, 'slide' for canvas-style editor, 'html' for raw HTML code
  const [editorMode, setEditorMode] = useState<'document' | 'slide' | 'html'>('document');

  // Refs to preserve HTML source across mode switches (prevents TipTap from stripping styles/scripts)
  const htmlSourceRef = useRef<{ content: string; header: string; footer: string } | null>(null);
  const editedInDocModeRef = useRef<boolean>(false);

  // Slide elements state for canvas-style editing
  const [slideElements, setSlideElements] = useState<SlideElement[]>([]);

  // Handler per modifiche agli elementi slide - chiude la card Google quando si interagisce con il canvas
  const handleSlideElementsChange = useCallback((newElements: SlideElement[]) => {
    setSlideElements(newElements);
    // Chiudi la card Google quando l'utente interagisce con il canvas
    if (googleCardExpanded) {
      setGoogleCardExpanded(false);
    }
  }, [googleCardExpanded]);

  // Calculate A4 dimensions based on orientation
  const pageDimensions = useMemo(() => {
    return orientation === 'portrait'
      ? { width: '210mm', height: '297mm', headerHeight: '35mm', contentHeight: '220mm', footerHeight: '25mm' }
      : { width: '297mm', height: '210mm', headerHeight: '25mm', contentHeight: '150mm', footerHeight: '20mm' };
  }, [orientation]);

  // Generate preview HTML by replacing placeholders with sample data
  const previewHtml = useMemo(() => {
    const sampleData: Record<string, string> = {
      'NOME_FORMATORE': 'Mario',
      'COGNOME_FORMATORE': 'Rossi',
      'DATA_GENERAZIONE': new Date().toLocaleDateString('it-IT'),
      'NUMERO_PROGRESSIVO': '123/2025',
      'CORSO_TITOLO': 'Corso di Sicurezza sul Lavoro',
      'AZIENDA_RAGIONE_SOCIALE': 'Acme SRL',
      'PRIMA_DATA': '01/01/2025',
      'ULTIMA_DATA': '15/01/2025',
      'ORE_TOTALI': '40',
      'TARIFFA_ORARIA': '€ 50,00',
      'COMPENSO_TOTALE': '€ 2.000,00',
      'NOME_PARTECIPANTE': 'Giovanni',
      'COGNOME_PARTECIPANTE': 'Bianchi',
      'CODICE_FISCALE': 'BNCGVN80A01H501X',
      'DATA_NASCITA': '01/01/1980',
      'LUOGO_NASCITA': 'Roma',
    };

    // Use flexbox for proper header/content/footer layout
    // Footer stays at bottom of page, content expands to fill space
    let result = `
      <div style="
        display: flex;
        flex-direction: column;
        min-height: ${pageDimensions.height};
        height: 100%;
        padding: 15mm;
        font-family: Arial, sans-serif;
        box-sizing: border-box;
      ">
        ${header ? `
          <div style="
            flex-shrink: 0;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 5mm;
            margin-bottom: 10mm;
          ">${header}</div>
        ` : ''}
        <div style="flex: 1; overflow: hidden;">${content || '<p style="color: #9ca3af; font-style: italic;">Nessun contenuto</p>'}</div>
        ${footer ? `
          <div style="
            flex-shrink: 0;
            border-top: 1px solid #e2e8f0;
            padding-top: 5mm;
            margin-top: 10mm;
            font-size: 0.85em;
            color: #64748b;
          ">${footer}</div>
        ` : ''}
      </div>
    `;

    // Replace all placeholders with sample data
    Object.entries(sampleData).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}|\$\{${key}\}`, 'gi');
      result = result.replace(regex, value);
    });

    return result;
  }, [header, content, footer, pageDimensions.height]);

  // Auto-collapse Google card when HTML content is edited
  // Lower threshold to trigger auto-collapse faster
  const hasHtmlContent = (content && content.trim().length > 10) ||
    (header && header.trim().length > 5) ||
    (footer && footer.trim().length > 5);

  // Refs for TipTap editors
  const headerEditorRef = useRef<Editor | null>(null);
  const contentEditorRef = useRef<Editor | null>(null);
  const footerEditorRef = useRef<Editor | null>(null);

  // Track active section for unified toolbar
  const [activeSection, setActiveSection] = useState<'header' | 'content' | 'footer'>('content');

  // Get the active editor based on active section
  const activeEditor = useMemo(() => {
    switch (activeSection) {
      case 'header': return headerEditorRef.current;
      case 'content': return contentEditorRef.current;
      case 'footer': return footerEditorRef.current;
      default: return contentEditorRef.current;
    }
  }, [activeSection, headerEditorRef.current, contentEditorRef.current, footerEditorRef.current]);

  // Template types available for selection
  const templateTypes = [
    { value: 'LETTER_OF_ENGAGEMENT', label: 'Lettera di Incarico' },
    { value: 'CERTIFICATE', label: 'Attestato' },
    { value: 'ATTENDANCE_REGISTER', label: 'Registro Presenze' },
    { value: 'INVOICE', label: 'Fattura' },
    { value: 'COURSE_PROGRAM', label: 'Programma Corso' },
    { value: 'CUSTOM', label: 'Personalizzato' },
  ];

  // Load template based on ID from URL params
  useEffect(() => {
    const fetchTemplate = async () => {
      const initialType = new URLSearchParams(location.search).get('type') || 'CERTIFICATE';
      setTemplateType(initialType);

      if (id) {
        try {
          const response = await apiGet<any>(`/api/v1/templates/${id}`);
          const templateData = response?.data;

          if (!templateData) {
            throw new Error(`Template with ID ${id} not found`);
          }

          setTemplate(templateData);
          setTemplateName(templateData.name);
          setIsDefault(templateData.isDefault || false);
          setTemplateType(templateData.type);

          // Set header, footer, and logo if available
          if (templateData.header) setHeader(templateData.header);
          if (templateData.footer) setFooter(templateData.footer);
          if (templateData.logoImage) setLogoImage(templateData.logoImage);
          if (templateData.logoPosition) setLogoPosition(templateData.logoPosition);
          if (templateData.googleDocsUrl) setGoogleDocsUrl(templateData.googleDocsUrl);

          // Check if content contains slide elements (JSON format)
          // Priority: 1) slideElements field, 2) content field with __slideEditor wrapper, 3) content as raw JSON array
          let parsedElements: SlideElement[] | null = null;
          let contentAlreadySet = false; // Flag to track if content was already set from JSON parsing

          // Try to parse slideElements if present (backwards compatibility)
          if (templateData.slideElements) {
            try {
              parsedElements = typeof templateData.slideElements === 'string'
                ? JSON.parse(templateData.slideElements)
                : templateData.slideElements;
            } catch (e) {
              // slideElements parse failure — fallback below
            }
          }

          // Try to parse from content field if no slideElements
          if (!parsedElements && templateData.content) {
            try {
              // Check if content is JSON (starts with { or [)
              const trimmedContent = templateData.content.trim();
              if (trimmedContent.startsWith('{') || trimmedContent.startsWith('[')) {
                const parsed = JSON.parse(trimmedContent);

                // Check for HTML editor wrapper: { __htmlEditor: true, rawHtml: '...' }
                // Legacy format — extract rawHtml and set as plain content
                if (parsed.__htmlEditor && parsed.rawHtml) {
                  setContent(parsed.rawHtml);
                  setEditorMode('html');
                  contentAlreadySet = true; // Mark content as set
                }
                // Check for wrapper format: { __slideEditor: true, elements: [...] }
                else if (parsed.__slideEditor && Array.isArray(parsed.elements)) {
                  parsedElements = parsed.elements;
                  // Extract orientation from wrapper
                  if (parsed.orientation && (parsed.orientation === 'portrait' || parsed.orientation === 'landscape')) {
                    setOrientation(parsed.orientation);
                  }
                }
                // Check if it's a direct array of elements
                else if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id && parsed[0].type) {
                  parsedElements = parsed;
                }
              }
            } catch (e) {
              // Content is not JSON - it's HTML content, which is fine
            }
          }

          // If we found slide elements, set them
          if (parsedElements && Array.isArray(parsedElements) && parsedElements.length > 0) {
            setSlideElements(parsedElements);
            setEditorMode('slide');
            // Don't set content since we're in slide mode
          } else if (!contentAlreadySet) {
            // Load content normally - only if not already set from JSON parsing
            if (templateData.content && !templateData.content.trim().startsWith('{') && !templateData.content.trim().startsWith('[')) {
              setContent(templateData.content);
              // Auto-detect complex HTML with Handlebars markers, <style> tags, or @page rules
              // These MUST be edited in raw HTML mode — TipTap would strip/mangle them
              const raw = templateData.content;
              const hasHandlebars = /\{\{[#/]?[a-zA-Z]/.test(raw);
              const hasStyleTag = /<style[\s>]/i.test(raw);
              const hasDoctype = /<!DOCTYPE/i.test(raw);
              if (hasHandlebars || hasStyleTag || hasDoctype) {
                setEditorMode('html');
              }
            } else if (templateData.url && !templateData.url.includes('placeholder')) {
              try {
                const contentData = await apiGet<string>(`${templateData.url}`);
                if (contentData) {
                  setContent(typeof contentData === 'string'
                    ? contentData
                    : JSON.stringify(contentData));
                }
              } catch {
                setContent('<p>Inserisci il tuo contenuto qui...</p>');
                setError('Non è stato possibile caricare il contenuto del template');
              }
            } else {
              setContent('<p>Inserisci il tuo contenuto qui...</p>');
            }
          }

          // Update URL to reflect the template format
          if (templateData.fileFormat) {
            const url = new URL(window.location.href);
            url.searchParams.set('format', templateData.fileFormat);
            window.history.replaceState({}, '', url.toString());
          }
        } catch {
          setError('Impossibile caricare il template');
          setContent('<p>Inserisci il tuo contenuto qui...</p>');
        }
      } else {
        // Set default content for new template
        setTemplateName(`Nuovo Template ${initialType}`);
        setContent('<p>Inserisci il tuo contenuto qui...</p>');
        setIsDefault(false);
      }
      setLoading(false);
    };

    fetchTemplate();
  }, [id, location.search]);

  // Auto-collapse Google card when user starts editing HTML content or switches to slide mode
  useEffect(() => {
    if (hasHtmlContent && !googleDocsUrl && googleCardExpanded) {
      // User is editing HTML, auto-collapse Google section
      setGoogleCardExpanded(false);
    }
  }, [hasHtmlContent, googleDocsUrl, googleCardExpanded]);

  // Auto-collapse Google card when switching to slide (canvas) mode
  useEffect(() => {
    if (editorMode === 'slide' && googleCardExpanded) {
      setGoogleCardExpanded(false);
    }
  }, [editorMode, googleCardExpanded]);

  // Preserve HTML source across mode switches to prevent TipTap from stripping styles
  const prevEditorModeRef = useRef<'document' | 'slide' | 'html'>(editorMode);
  useEffect(() => {
    const prev = prevEditorModeRef.current;
    prevEditorModeRef.current = editorMode;

    if (prev === editorMode) return;

    if (prev === 'html' && editorMode === 'document') {
      // Switching from HTML → Document: save original HTML source
      htmlSourceRef.current = { content, header, footer };
      editedInDocModeRef.current = false;
    } else if (prev === 'document' && editorMode === 'html') {
      // Switching from Document → HTML: restore original if user didn't edit in TipTap
      if (!editedInDocModeRef.current && htmlSourceRef.current) {
        setContent(htmlSourceRef.current.content);
        setHeader(htmlSourceRef.current.header);
        setFooter(htmlSourceRef.current.footer);
      }
      htmlSourceRef.current = null;
    }
  }, [editorMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handler for editor mode switch with warning for Canvas ↔ HTML/Document transitions
  const handleEditorModeSwitch = useCallback((targetMode: 'document' | 'slide' | 'html') => {
    if (targetMode === editorMode) return;

    // Document ↔ HTML: seamless switch (both work with HTML content)
    if ((editorMode === 'document' && targetMode === 'html') ||
      (editorMode === 'html' && targetMode === 'document')) {
      setEditorMode(targetMode);
      return;
    }

    // Canvas → HTML/Document: convert canvas elements to basic HTML
    if (editorMode === 'slide' && (targetMode === 'document' || targetMode === 'html')) {
      if (slideElements.length > 0) {
        const htmlParts = slideElements.map(el => {
          if (el.type === 'text') return `<p>${el.content || ''}</p>`;
          if (el.type === 'image') return `<img src="${el.content || ''}" style="max-width:100%;" />`;
          if (el.type === 'rectangle' || el.type === 'ellipse') return `<div style="width:${el.width}px; height:${el.height}px; background:${el.style?.backgroundColor || '#ddd'};"></div>`;
          return '';
        }).filter(Boolean);
        if (htmlParts.length > 0 && !content.trim()) {
          setContent(htmlParts.join('\n'));
        }
      }
      setEditorMode(targetMode);
      return;
    }

    // HTML/Document → Canvas: warn about content loss
    if ((editorMode === 'document' || editorMode === 'html') && targetMode === 'slide') {
      const hasContent = content.trim().length > 0;
      if (hasContent) {
        const confirmed = window.confirm(
          'Passando alla modalità Canvas, il contenuto HTML attuale non verrà convertito automaticamente. ' +
          'Il Canvas partirà vuoto. Vuoi continuare?'
        );
        if (!confirmed) return;
      }
      setSlideElements([]);
      setEditorMode(targetMode);
      return;
    }

    setEditorMode(targetMode);
  }, [editorMode, slideElements, content]);

  // Handle save action
  const handleSave = async () => {
    if (!templateName || templateName.trim() === '') {
      setError('Impossibile salvare: inserisci un nome per il template.');
      return;
    }

    // If using Google Docs, ensure URL is provided 
    if (googleDocsUrl && !googleDocsUrl.trim().startsWith('https://docs.google.com/')) {
      setError('Il link a Google Docs/Slides non è valido. Deve iniziare con "https://docs.google.com/"');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Generate unique filename for the template
      const timestamp = Date.now();
      const filename = `template_${templateType}_${timestamp}.html`;
      const templateUrl = `/uploads/templates/${filename}`;

      // Prepare template data
      const templateData: any = {
        name: templateName.trim(),
        type: templateType,
        logoPosition: logoPosition,
        logoImage: logoImage,
        isDefault: isDefault,
        fileFormat: templateFormat,
        googleDocsUrl: googleDocsUrl.trim() || null,
        // url is REQUIRED by Prisma schema (not nullable)
        // Use templateUrl for HTML templates, empty string for Google Docs
        url: googleDocsUrl.trim() ? '' : templateUrl
      };

      // Only include content/header/footer if NOT using Google Docs
      // This prevents sending empty strings that trigger backend version creation
      if (!googleDocsUrl.trim()) {
        // For document mode, save HTML content
        if (editorMode === 'document') {
          templateData.content = content || '';
          templateData.header = header || '';
          templateData.footer = footer || '';
        } else if (editorMode === 'html') {
          // For HTML mode, save raw HTML directly — NO JSON wrapping
          // This ensures the content field always contains plain HTML
          // that can be rendered directly by PDF generators
          templateData.content = content || '';
          templateData.header = header || '';
          templateData.footer = footer || '';
        } else {
          // For slide mode, save elements as JSON wrapper in content field
          // This allows proper parsing on load
          const slideContent = JSON.stringify({
            __slideEditor: true,
            editorMode: 'slide',
            version: 1,
            elements: slideElements,
            orientation: orientation // Save page orientation
          });
          templateData.content = slideContent;
          // Also send slideElements for backwards compatibility (even though it's not in schema)
          templateData.slideElements = JSON.stringify(slideElements);
          templateData.editorMode = 'slide';
        }
      }

      // Validate: do not save if content is empty and no Google Docs URL
      if (!googleDocsUrl) {
        if ((editorMode === 'document' || editorMode === 'html') && (!content || content.trim() === '')) {
          showToast({ message: 'Il contenuto del template non può essere vuoto. Compila il template prima di salvare.', type: 'error' });
          setSaving(false);
          return;
        }
        if (editorMode === 'slide' && slideElements.length === 0) {
          showToast({ message: 'Aggiungi almeno un elemento alla slide prima di salvare.', type: 'error' });
          setSaving(false);
          return;
        }
      }

      // Save template (create or update)
      // Backend now handles automatically unsetting other default templates
      if (id) {
        await apiPut(`/api/v1/templates/${id}`, templateData);
      } else {
        await apiPost<any>('/api/v1/templates', templateData);
      }

      // Navigate back to templates list
      navigate(basePath);
    } catch (err: unknown) {
      const errorMessage = 'Errore durante il salvataggio del template';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Caricamento editor...</p>
        </div>
      </div>
    );
  }

  // Render template editor
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header with back button */}
        <div className="mb-8">
          <button
            onClick={() => navigate(basePath)}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="font-medium">Torna ai Template</span>
          </button>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {template?.name || 'Nuovo Template'}
            </h1>
            <p className="text-slate-600">
              Crea e modifica template per documenti con supporto per placeholder dinamici
            </p>
          </div>
        </div>

        {/* Template configuration card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          {/* Card Header con gradiente */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Layout className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Configurazione Template</h2>
                <p className="text-blue-100 text-sm">Imposta le proprietà del documento</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Nome Template */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Nome Template
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400"
                  placeholder="Es. Attestato di Formazione"
                />
              </div>

              {/* Tipo Template */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Tipo di Template
                </label>
                <select
                  value={templateType}
                  onChange={(e) => setTemplateType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                >
                  {templateTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* Orientamento Pagina */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Orientamento
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOrientation('portrait')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all ${orientation === 'portrait'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300 text-slate-600'
                      }`}
                  >
                    <Monitor className="w-4 h-4" />
                    <span className="text-sm font-medium">Verticale</span>
                  </button>
                  <button
                    onClick={() => setOrientation('landscape')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all ${orientation === 'landscape'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300 text-slate-600'
                      }`}
                  >
                    <Monitor className="w-4 h-4 rotate-90" />
                    <span className="text-sm font-medium">Orizzontale</span>
                  </button>
                </div>
              </div>

              {/* Preview Toggle */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Anteprima Live
                </label>
                <button
                  onClick={() => setShowLivePreview(!showLivePreview)}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${showLivePreview
                    ? 'border-green-500 bg-green-50 text-green-700 shadow-sm'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 text-slate-600'
                    }`}
                >
                  <Eye className="w-4 h-4" />
                  <span className="text-sm font-medium">{showLivePreview ? 'Anteprima Attiva' : 'Mostra Anteprima'}</span>
                </button>
              </div>

              {/* Editor Mode Toggle */}
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Modalità Editor
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditorModeSwitch('document')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${editorMode === 'document'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300 text-slate-600'
                      }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-medium">📝 Documento</span>
                  </button>
                  <button
                    onClick={() => handleEditorModeSwitch('slide')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${editorMode === 'slide'
                      ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300 text-slate-600'
                      }`}
                  >
                    <Presentation className="w-4 h-4" />
                    <span className="text-sm font-medium">🎨 Canvas</span>
                  </button>
                  <button
                    onClick={() => handleEditorModeSwitch('html')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${editorMode === 'html'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300 text-slate-600'
                      }`}
                  >
                    <Code className="w-4 h-4" />
                    <span className="text-sm font-medium">{'<>'} HTML</span>
                  </button>
                </div>
                <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2 mt-2">
                  {editorMode === 'document'
                    ? '📝 Editor di testo classico con header, contenuto e footer separati'
                    : editorMode === 'slide'
                      ? '🎨 Canvas stile Google Slides per posizionare liberamente testo, immagini e forme'
                      : '💻 Codice HTML puro per template personalizzati e layout complessi'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Google Docs integration - collapsible, auto-closes when editing HTML */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-6 overflow-hidden">
          <button
            onClick={() => setGoogleCardExpanded(!googleCardExpanded)}
            className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Integrazione Google Docs/Slides</h2>
              {googleDocsUrl && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  Collegato
                </span>
              )}
              {hasHtmlContent && !googleDocsUrl && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                  Usando HTML
                </span>
              )}
            </div>
            {googleCardExpanded ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {googleCardExpanded && (
            <div className="px-6 pb-6 border-t border-slate-100">
              <p className="text-sm text-slate-500 mb-4 mt-4">
                {hasHtmlContent
                  ? "⚠️ Hai già del contenuto HTML. Se colleghi un Google Doc, il contenuto HTML verrà ignorato."
                  : "Collega un documento Google Docs/Slides per usarlo come template. Altrimenti, usa l'editor HTML qui sotto."}
              </p>
              <GoogleTemplateProvider
                documentType={templateType}
                initialTemplateUrl={googleDocsUrl}
                onTemplateSelected={(url, id) => {
                  setGoogleDocsUrl(url);
                }}
              />
            </div>
          )}
        </div>

        {/* Google Docs preview */}
        {googleDocsUrl && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4">Anteprima documento Google</h2>
            <GoogleDocsPreview
              documentUrl={googleDocsUrl}
              documentType={templateType}
              placeholderData={{
                NOME_FORMATORE: "Mario",
                COGNOME_FORMATORE: "Rossi",
                CORSO_TITOLO: "Sicurezza sul Lavoro",
                DATA_GENERAZIONE: new Date().toLocaleDateString('it-IT'),
                NUMERO_PROGRESSIVO: "123/2025",
                AZIENDA_RAGIONE_SOCIALE: "Acme SRL"
              }}
            />
          </div>
        )}

        {/* Layout a 2 colonne: Editor + Placeholder Selector - visible only for HTML templates */}
        {!googleDocsUrl && editorMode === 'document' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* A4 Page Preview - 3/4 dello spazio */}
            {/* Container con altezza fissa e proprio scroll per rendere la toolbar sticky */}
            <div className="lg:col-span-3 flex flex-col relative" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
              {/* Unified Toolbar for all sections - STICKY at top of this container */}
              <div className="bg-white rounded-t-2xl border border-slate-200 border-b-0 shadow-lg sticky top-0 z-50">
                <UnifiedTemplateToolbar
                  activeEditor={activeEditor}
                  className="rounded-t-2xl"
                />
                <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">Sezione attiva:</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setActiveSection('header');
                          headerEditorRef.current?.commands.focus();
                        }}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${activeSection === 'header'
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                          }`}
                      >
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-1.5"></span>
                        Header
                      </button>
                      <button
                        onClick={() => {
                          setActiveSection('content');
                          contentEditorRef.current?.commands.focus();
                        }}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${activeSection === 'content'
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                          }`}
                      >
                        <span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-1.5"></span>
                        Contenuto
                      </button>
                      <button
                        onClick={() => {
                          setActiveSection('footer');
                          footerEditorRef.current?.commands.focus();
                        }}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${activeSection === 'footer'
                          ? 'bg-orange-100 text-orange-700 border border-orange-200'
                          : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                          }`}
                      >
                        <span className="inline-block w-2 h-2 rounded-full bg-orange-400 mr-1.5"></span>
                        Footer
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className={`px-2 py-1 rounded ${orientation === 'portrait' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100'}`}>
                      {orientation === 'portrait' ? '📄 Verticale' : '📄 Orizzontale'}
                    </span>
                  </div>
                </div>
              </div>

              {/* A4 Page Container - simula un foglio A4 reale */}
              <div className="bg-slate-100 p-8 rounded-b-2xl border border-t-0 border-slate-200 flex-grow">
                <div
                  className="bg-white shadow-lg mx-auto relative transition-all duration-300"
                  style={{
                    width: pageDimensions.width,
                    minHeight: pageDimensions.height,
                    maxWidth: '100%',
                    padding: '0',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  }}
                >
                  {/* Header Section - dynamic height based on orientation */}
                  <div
                    className={`border-b-2 border-dashed relative cursor-pointer transition-colors ${activeSection === 'header' ? 'border-blue-400 bg-blue-50/30' : 'border-slate-300'
                      }`}
                    style={{
                      minHeight: pageDimensions.headerHeight,
                      padding: '8mm 12mm',
                      background: activeSection === 'header'
                        ? 'linear-gradient(to bottom, #eff6ff 0%, white 100%)'
                        : 'linear-gradient(to bottom, #fafafa 0%, white 100%)'
                    }}
                    onClick={() => setActiveSection('header')}
                  >
                    <div className="absolute top-1 left-2 text-xs text-slate-400 font-medium uppercase tracking-wide flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${activeSection === 'header' ? 'bg-blue-500 ring-2 ring-blue-200' : 'bg-blue-400'}`}></span>
                      Header / Intestazione
                      {activeSection === 'header' && <span className="text-blue-500 text-[10px] ml-1">(attivo)</span>}
                    </div>
                    <div className="pt-4">
                      <SimpleEditor
                        content={header}
                        onChange={(newHeader: string) => {
                          setHeader(newHeader);
                          editedInDocModeRef.current = true;
                          // Close Google card on any input
                          if (googleCardExpanded) {
                            setGoogleCardExpanded(false);
                          }
                        }}
                        placeholder="Logo, titolo documento, informazioni aziendali..."
                        onEditorReady={(editor) => { headerEditorRef.current = editor; }}
                        minHeight={orientation === 'portrait' ? '60px' : '40px'}
                        onFocus={() => setActiveSection('header')}
                      />
                    </div>
                  </div>

                  {/* Content Section - main body with page indicators */}
                  <div
                    className={`relative cursor-pointer transition-colors ${activeSection === 'content' ? 'bg-green-50/30' : ''
                      }`}
                    style={{
                      minHeight: pageDimensions.contentHeight,
                      padding: '8mm 12mm',
                    }}
                    onClick={() => setActiveSection('content')}
                  >
                    <div className="absolute top-1 left-2 text-xs text-slate-400 font-medium uppercase tracking-wide flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${activeSection === 'content' ? 'bg-green-500 ring-2 ring-green-200' : 'bg-green-400'}`}></span>
                      Contenuto Documento
                      {activeSection === 'content' && <span className="text-green-500 text-[10px] ml-1">(attivo)</span>}
                    </div>

                    {/* Page break indicator - position based on orientation */}
                    {orientation === 'portrait' && (
                      <div
                        className="absolute left-0 right-0 border-t-2 border-dashed border-blue-300 pointer-events-none"
                        style={{ top: '200mm' }}
                      >
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded">
                          Fine Pagina 1 ↓
                        </span>
                      </div>
                    )}

                    <div className="pt-4">
                      <SimpleEditor
                        content={content}
                        onChange={(newContent: string) => {
                          setContent(newContent);
                          editedInDocModeRef.current = true;
                          // Close Google card on any input
                          if (googleCardExpanded) {
                            setGoogleCardExpanded(false);
                          }
                        }}
                        placeholder="Inizia a scrivere il contenuto del template. Usa la toolbar per formattare il testo, inserire tabelle, immagini e liste."
                        onEditorReady={(editor) => { contentEditorRef.current = editor; }}
                        minHeight={orientation === 'portrait' ? '500px' : '300px'}
                        onFocus={() => setActiveSection('content')}
                      />
                    </div>
                  </div>

                  {/* Footer Section - dynamic height */}
                  <div
                    className={`border-t-2 border-dashed relative cursor-pointer transition-colors ${activeSection === 'footer' ? 'border-orange-400 bg-orange-50/30' : 'border-slate-300'
                      }`}
                    style={{
                      minHeight: pageDimensions.footerHeight,
                      padding: '6mm 12mm',
                      background: activeSection === 'footer'
                        ? 'linear-gradient(to top, #fff7ed 0%, white 100%)'
                        : 'linear-gradient(to top, #fafafa 0%, white 100%)'
                    }}
                    onClick={() => setActiveSection('footer')}
                  >
                    <div className="absolute top-1 left-2 text-xs text-slate-400 font-medium uppercase tracking-wide flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${activeSection === 'footer' ? 'bg-orange-500 ring-2 ring-orange-200' : 'bg-orange-400'}`}></span>
                      Footer / Piè di Pagina
                      {activeSection === 'footer' && <span className="text-orange-500 text-[10px] ml-1">(attivo)</span>}
                    </div>
                    <div className="pt-3">
                      <SimpleEditor
                        content={footer}
                        onChange={(newFooter: string) => {
                          setFooter(newFooter);
                          editedInDocModeRef.current = true;
                          if (newFooter.length > 10 && googleCardExpanded) {
                            setGoogleCardExpanded(false);
                          }
                        }}
                        placeholder="Contatti, note legali, numerazione pagine..."
                        onEditorReady={(editor) => { footerEditorRef.current = editor; }}
                        minHeight={orientation === 'portrait' ? '40px' : '30px'}
                        onFocus={() => setActiveSection('footer')}
                      />
                    </div>
                  </div>
                </div>

                {/* Page info */}
                <div className="text-center mt-4 text-sm text-slate-500">
                  📄 Formato {orientation === 'portrait' ? 'A4 Verticale (210mm × 297mm)' : 'A4 Orizzontale (297mm × 210mm)'} • L'anteprima mostra le proporzioni reali del documento
                </div>
              </div>

              {/* Live Preview Section — always visible in Document mode */}
              <div className="mt-6">
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Eye className="w-5 h-5 text-green-600" />
                        <h3 className="font-semibold text-green-800">Anteprima Live</h3>
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">Con dati di esempio</span>
                      </div>
                      <button
                        onClick={() => setShowLivePreview(!showLivePreview)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${showLivePreview
                          ? 'bg-green-600 text-white'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                      >
                        <Eye className="w-3 h-3" />
                        {showLivePreview ? 'Comprimi' : 'Espandi'}
                      </button>
                    </div>
                    {/* Info banner for complex HTML content */}
                    {htmlSourceRef.current && (
                      <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                        ⚠️ Contenuto HTML complesso rilevato. L'anteprima mostra il rendering completo. Per modifiche a stili e struttura, usa la <strong>Modalità HTML</strong>.
                      </div>
                    )}
                  </div>
                  {showLivePreview && (
                    <div className="p-6 bg-slate-50">
                      <div
                        className="bg-white shadow-lg mx-auto"
                        style={{
                          width: pageDimensions.width,
                          minHeight: pageDimensions.height,
                          maxWidth: '100%',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                        }}
                      >
                        <div
                          className="preview-content"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeRichHtml(htmlSourceRef.current ? (() => {
                              // Use original HTML source for preview when available
                              const src = htmlSourceRef.current!;
                              let result = `
                              <div style="display:flex;flex-direction:column;min-height:${pageDimensions.height};height:100%;padding:15mm;font-family:Arial,sans-serif;box-sizing:border-box;">
                                ${src.header ? `<div style="flex-shrink:0;border-bottom:1px solid #e2e8f0;padding-bottom:5mm;margin-bottom:10mm;">${src.header}</div>` : ''}
                                <div style="flex:1;overflow:hidden;">${src.content || '<p style="color:#9ca3af;font-style:italic;">Nessun contenuto</p>'}</div>
                                ${src.footer ? `<div style="flex-shrink:0;border-top:1px solid #e2e8f0;padding-top:5mm;margin-top:10mm;font-size:0.85em;color:#64748b;">${src.footer}</div>` : ''}
                              </div>`;
                              result = result
                                .replace(/\{\{AZIENDA_RAGIONE_SOCIALE\}\}/g, 'Azienda Test S.p.A.')
                                .replace(/\{\{DATA_GENERAZIONE\}\}/g, new Date().toLocaleDateString('it-IT'))
                                .replace(/\{\{NOME_FORMATORE\}\}/g, 'Mario')
                                .replace(/\{\{COGNOME_FORMATORE\}\}/g, 'Rossi');
                              return result;
                            })() : previewHtml)
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Placeholder Selector - 1/4 dello spazio */}
            <div className="lg:col-span-1">
              <div className="sticky top-4">
                <PlaceholderPanel
                  onInsert={(placeholder: string) => {
                    // Insert at cursor position in the active editor
                    const activeEditor = contentEditorRef.current || headerEditorRef.current || footerEditorRef.current;
                    if (activeEditor) {
                      activeEditor.chain().focus().insertContent(placeholder).run();
                    }
                  }}
                />

                {/* Quick help */}
                <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <h4 className="font-medium text-blue-800 text-sm mb-2">💡 Suggerimenti</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Clicca sui segnaposto per copiarli</li>
                    <li>• Incollali nell'editor con Ctrl+V</li>
                    <li>• Il header/footer appare su ogni pagina</li>
                    <li>• Usa la toolbar per inserire tabelle e immagini</li>
                    <li>• L'immagine apre la Media Library</li>
                    <li>• Cambia orientamento per documenti orizzontali</li>
                  </ul>
                </div>

                {/* Orientation info */}
                <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="font-medium text-slate-800 text-sm mb-2">📐 Dimensioni</h4>
                  <div className="text-xs text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Larghezza:</span>
                      <span className="font-mono">{pageDimensions.width}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Altezza:</span>
                      <span className="font-mono">{pageDimensions.height}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Header:</span>
                      <span className="font-mono">{pageDimensions.headerHeight}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Contenuto:</span>
                      <span className="font-mono">{pageDimensions.contentHeight}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Footer:</span>
                      <span className="font-mono">{pageDimensions.footerHeight}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Slide Editor - Canvas style editor */}
        {!googleDocsUrl && editorMode === 'slide' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Slide Canvas - 3/4 dello spazio */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-4 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Presentation className="w-5 h-5 text-purple-600" />
                      <h3 className="font-semibold text-purple-800">Editor Canvas</h3>
                      <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded">
                        {slideElements.length} elementi
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className={`px-2 py-1 rounded ${orientation === 'portrait' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100'}`}>
                        {orientation === 'portrait' ? '📄 Verticale' : '📄 Orizzontale'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-slate-100">
                  <SlideEditor
                    elements={slideElements}
                    onChange={handleSlideElementsChange}
                    width={orientation === 'portrait' ? '595px' : '842px'}
                    height={orientation === 'portrait' ? '842px' : '595px'}
                    orientation={orientation}
                    className="mx-auto"
                  />
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-200">
                  <p className="text-xs text-slate-500 text-center">
                    💡 Trascina gli elementi per posizionarli • Usa gli angoli per ridimensionare • Doppio click per modificare il testo
                  </p>
                </div>
              </div>
            </div>

            {/* Placeholder Selector per Slide - 1/4 dello spazio */}
            <div className="lg:col-span-1">
              <div className="sticky top-4">
                <PlaceholderPanel
                  onInsert={(placeholder: string) => {
                    // In slide mode, add a text element with the placeholder
                    const newElement: SlideElement = {
                      id: `element-${Date.now()}`,
                      type: 'text',
                      content: placeholder,
                      x: 100,
                      y: 100 + slideElements.length * 50,
                      width: 200,
                      height: 30,
                      rotation: 0,
                      zIndex: slideElements.length + 1,
                      style: { fontSize: 14, fontFamily: 'Arial', color: '#1e293b', textAlign: 'left' }
                    };
                    setSlideElements([...slideElements, newElement]);
                    showToast({ message: 'Placeholder aggiunto come elemento', type: 'success' });
                  }}
                />

                {/* Quick help for Slide mode */}
                <div className="mt-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <h4 className="font-medium text-purple-800 text-sm mb-2">🎨 Suggerimenti Canvas</h4>
                  <ul className="text-xs text-purple-700 space-y-1">
                    <li>• Usa i pulsanti + per aggiungere elementi</li>
                    <li>• Trascina gli elementi per spostarli</li>
                    <li>• Usa gli angoli per ridimensionare</li>
                    <li>• Doppio click sul testo per modificarlo</li>
                    <li>• Premi Canc per eliminare l'elemento selezionato</li>
                    <li>• Clicka sui placeholder per aggiungerli come testo</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HTML Raw Code Editor */}
        {!googleDocsUrl && editorMode === 'html' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* HTML Code Editor - 3/4 dello spazio */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Code className="w-5 h-5 text-emerald-600" />
                      <h3 className="font-semibold text-emerald-800">Editor HTML</h3>
                      <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">
                        Codice Puro
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowLivePreview(!showLivePreview)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${showLivePreview
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          }`}
                      >
                        <Eye className="w-3 h-3" />
                        {showLivePreview ? 'Nascondi Anteprima' : 'Mostra Anteprima'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className={`grid ${showLivePreview ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {/* Code Editor — sections for header, content, footer */}
                  <div className="border-r border-slate-200">
                    {/* Header textarea */}
                    <div className="bg-slate-800 text-slate-100 p-2 text-xs font-mono border-b border-slate-700 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                      <span className="text-blue-400">header.html</span>
                    </div>
                    <textarea
                      value={header}
                      onChange={(e) => {
                        setHeader(e.target.value);
                        if (htmlSourceRef.current) htmlSourceRef.current.header = e.target.value;
                      }}
                      className="w-full h-[100px] p-3 font-mono text-xs bg-slate-900 text-slate-100 focus:outline-none resize-none border-b border-slate-700"
                      placeholder="<!-- Header HTML: logo, intestazione -->"
                      spellCheck={false}
                    />

                    {/* Content textarea */}
                    <div className="bg-slate-800 text-slate-100 p-2 text-xs font-mono border-b border-slate-700 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span className="text-emerald-400">content.html</span>
                    </div>
                    <textarea
                      value={content}
                      onChange={(e) => {
                        setContent(e.target.value);
                        if (htmlSourceRef.current) htmlSourceRef.current.content = e.target.value;
                      }}
                      className="w-full h-[400px] p-4 font-mono text-sm bg-slate-900 text-slate-100 focus:outline-none resize-none"
                      placeholder={`<!DOCTYPE html>
<html>
<head>
  <style>
    /* I tuoi stili CSS qui */
    @page { margin: 5mm; }
    body { font-family: Arial, sans-serif; }
  </style>
</head>
<body>
  <!-- Il tuo contenuto HTML qui -->
  <h1>{{AZIENDA_RAGIONE_SOCIALE}}</h1>
  <p>Data: {{DATA_GENERAZIONE}}</p>
</body>
</html>`}
                      spellCheck={false}
                    />

                    {/* Footer textarea */}
                    <div className="bg-slate-800 text-slate-100 p-2 text-xs font-mono border-b border-slate-700 border-t border-slate-700 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                      <span className="text-orange-400">footer.html</span>
                    </div>
                    <textarea
                      value={footer}
                      onChange={(e) => {
                        setFooter(e.target.value);
                        if (htmlSourceRef.current) htmlSourceRef.current.footer = e.target.value;
                      }}
                      className="w-full h-[80px] p-3 font-mono text-xs bg-slate-900 text-slate-100 focus:outline-none resize-none"
                      placeholder="<!-- Footer HTML: contatti, note legali -->"
                      spellCheck={false}
                    />
                  </div>

                  {/* Live Preview */}
                  {showLivePreview && (
                    <div className="bg-slate-100">
                      <div className="bg-slate-200 p-2 text-xs text-slate-600 border-b border-slate-300">
                        <span>📄 Anteprima (Live)</span>
                      </div>
                      <div className="p-4 h-[600px] overflow-auto">
                        <div
                          className="bg-white shadow-lg mx-auto p-4"
                          style={{
                            width: '210mm',
                            minHeight: '297mm',
                            maxWidth: '100%',
                            transform: 'scale(0.6)',
                            transformOrigin: 'top center'
                          }}
                          dangerouslySetInnerHTML={{
                            __html: sanitizeRichHtml(previewHtml)
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200">
                  <p className="text-xs text-slate-500 text-center">
                    💡 Scrivi codice HTML/CSS completo • Usa i placeholder come {'{{NOME_CAMPO}}'} • Il CSS @page controlla i margini del PDF
                  </p>
                </div>
              </div>
            </div>

            {/* Placeholder Selector per HTML - 1/4 dello spazio */}
            <div className="lg:col-span-1">
              <div className="sticky top-4">
                <PlaceholderPanel
                  onInsert={(placeholder: string) => {
                    // Insert placeholder at cursor position or at end
                    const textarea = document.querySelector('textarea[value]') as HTMLTextAreaElement;
                    if (textarea) {
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const newContent = content.slice(0, start) + placeholder + content.slice(end);
                      setContent(newContent);
                      // Reset cursor position
                      setTimeout(() => {
                        textarea.focus();
                        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
                      }, 0);
                    } else {
                      setContent(content + placeholder);
                    }
                    showToast({ message: 'Placeholder inserito', type: 'success' });
                  }}
                />

                {/* Quick help for HTML mode */}
                <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <h4 className="font-medium text-emerald-800 text-sm mb-2">💻 Suggerimenti HTML</h4>
                  <ul className="text-xs text-emerald-700 space-y-1">
                    <li>• Usa <code className="bg-emerald-100 px-1 rounded">@page {'{ margin: 5mm; }'}</code> per i margini PDF</li>
                    <li>• I placeholder usano formato <code className="bg-emerald-100 px-1 rounded">{'{{NOME}}'}</code></li>
                    <li>• Includi stili CSS inline o in un tag {'<style>'}</li>
                    <li>• Usa tabelle per layout complessi</li>
                    <li>• Testa sempre l'anteprima prima di salvare</li>
                  </ul>
                </div>

                {/* Example templates for HTML mode */}
                <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="font-medium text-slate-800 text-sm mb-2">📋 Template Rapidi</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => setContent(`<!DOCTYPE html>
<html>
<head>
<style>
@page { margin: 10mm; }
body { font-family: Arial, sans-serif; font-size: 11pt; }
.header { text-align: center; border-bottom: 2px solid #0066cc; padding-bottom: 10px; margin-bottom: 20px; }
.section { margin: 15px 0; }
.label { font-weight: bold; color: #333; }
table { width: 100%; border-collapse: collapse; margin: 10px 0; }
th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
th { background: #0066cc; color: white; }
.footer { margin-top: 30px; text-align: center; font-size: 9pt; color: #666; }
</style>
</head>
<body>
<div class="header">
  <h1>{{AZIENDA_RAGIONE_SOCIALE}}</h1>
  <p>Documento generato il {{DATA_GENERAZIONE}}</p>
</div>
<div class="section">
  <p class="label">Corso:</p>
  <p>{{CORSO_TITOLO}}</p>
</div>
<div class="section">
  <p class="label">Formatore:</p>
  <p>{{NOME_FORMATORE}} {{COGNOME_FORMATORE}}</p>
</div>
<div class="footer">
  <p>Documento N. {{NUMERO_PROGRESSIVO}}</p>
</div>
</body>
</html>`)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-left"
                    >
                      📄 Documento Base
                    </button>
                    <button
                      onClick={() => setContent(`<!DOCTYPE html>
<html>
<head>
<style>
@page { margin: 3mm 5mm; }
body { font-family: Arial, sans-serif; font-size: 9pt; margin: 0; padding: 0; }
.container { width: 100%; }
.header-row { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0066cc; padding-bottom: 8px; margin-bottom: 10px; }
.logo { font-size: 14pt; font-weight: bold; color: #0066cc; }
.company-info { text-align: right; font-size: 8pt; color: #666; }
.title-bar { background: linear-gradient(135deg, #0066cc 0%, #004999 100%); color: white; padding: 8px 12px; margin: 10px 0; }
.title-bar h2 { margin: 0; font-size: 12pt; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0; }
.info-box { border: 1px solid #e0e0e0; padding: 8px; border-radius: 4px; }
.info-box h4 { margin: 0 0 5px 0; color: #0066cc; font-size: 8pt; text-transform: uppercase; }
table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 8pt; }
th { background: #0066cc; color: white; padding: 6px; text-align: left; }
td { padding: 6px; border-bottom: 1px solid #e0e0e0; }
.totals { text-align: right; margin-top: 10px; }
.totals-row { display: flex; justify-content: flex-end; padding: 4px 0; }
.totals-label { width: 150px; }
.totals-value { width: 100px; text-align: right; font-weight: bold; }
.total-final { background: #0066cc; color: white; padding: 8px; font-size: 12pt; }
.footer { margin-top: 15px; padding-top: 10px; border-top: 1px solid #e0e0e0; font-size: 7pt; color: #666; }
</style>
</head>
<body>
<div class="container">
  <div class="header-row">
    <div class="logo">{{AZIENDA_RAGIONE_SOCIALE}}</div>
    <div class="company-info">
      Via Esempio 123, 35030 Selvazzano Dentro (PD)<br>
      P.IVA: 12345678901
    </div>
  </div>
  
  <div class="title-bar">
    <h2>PREVENTIVO</h2>
  </div>
  
  <div class="info-grid">
    <div class="info-box">
      <h4>Destinatario</h4>
      <strong>{{CLIENTE_RAGIONE_SOCIALE}}</strong><br>
      P.IVA: {{CLIENTE_PIVA}}
    </div>
    <div class="info-box">
      <h4>Dettagli</h4>
      Valido fino: {{DATA_SCADENZA}}<br>
      Tipo: {{TIPO_SERVIZIO}}
    </div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Descrizione</th>
        <th>Qtà</th>
        <th>Prezzo Unit.</th>
        <th>Totale</th>
      </tr>
    </thead>
    <tbody>
      {{VOCI_PREVENTIVO}}
    </tbody>
  </table>
  
  <div class="totals">
    <div class="totals-row">
      <span class="totals-label">Imponibile:</span>
      <span class="totals-value">€ {{IMPONIBILE}}</span>
    </div>
    <div class="totals-row">
      <span class="totals-label">IVA 22%:</span>
      <span class="totals-value">€ {{IVA}}</span>
    </div>
    <div class="totals-row total-final">
      <span class="totals-label">TOTALE:</span>
      <span class="totals-value">€ {{TOTALE}}</span>
    </div>
  </div>
  
  <div class="footer">
    <p>Termini e Condizioni: Validità 30gg • Pagamento: 30gg data fattura</p>
  </div>
</div>
</body>
</html>`)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-left"
                    >
                      💰 Preventivo Compatto
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Default template toggle */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mt-6">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            />
            <div className="flex-1">
              <label htmlFor="isDefault" className="block text-sm font-medium text-slate-900 cursor-pointer">
                Imposta come template predefinito
              </label>
              <p className="mt-1 text-sm text-slate-600">
                Questo template verrà utilizzato automaticamente per i documenti di tipo "{templateTypes.find(t => t.value === templateType)?.label}"
              </p>
            </div>
          </div>
        </div>

        {/* Save/Cancel buttons */}
        <div className="mt-8 flex gap-3 justify-end pb-8">
          <Button
            variant="outline"
            onClick={() => navigate(basePath)}
            className="px-6"
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Annulla
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="px-6 bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <span className="flex items-center">
                <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full mr-2" />
                Salvataggio in corso...
              </span>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> Salva Template
              </>
            )}
          </Button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Implementation note */}
        <div className="mt-12 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h3 className="text-sm font-semibold text-yellow-800 mb-2">Nota sull'integrazione Google</h3>
          <p className="text-sm text-yellow-700">
            Questo editor supporta l'integrazione con Google Docs e Google Slides.
            Per utilizzare questa funzionalità, condividi un documento Google e inserisci l'URL nel campo apposito.
            Il sistema sostituirà automaticamente i placeholder nel formato {'{{NOME_PLACEHOLDER}}'} con i valori effettivi.
            Per funzionare correttamente, assicurati che le credenziali Google API siano configurate nel backend.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor;