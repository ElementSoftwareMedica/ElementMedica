import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { apiGet, apiPost, apiPut } from '../../services/api';
import { ChevronLeft, Save, Download, Layout, Image, Eye, FileEdit } from 'lucide-react';
import { Button } from '../../design-system/atoms/Button';
import { PlaceholderDemo, GoogleTemplateProvider, GoogleDocsPreview } from '../../components/shared/template';
import PageHeader from '../../components/layouts/PageHeader';
import TipTapEditor from '../../components/editor/TipTapEditor';
import PlaceholderPanel from './templates/components/PlaceholderPanel';

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
  const templateFormat = new URLSearchParams(location.search).get('format') || 'HTML';
  
  // Refs for TipTap editors
  const headerEditorRef = useRef<any>(null);
  const contentEditorRef = useRef<any>(null);
  const footerEditorRef = useRef<any>(null);
  
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
          console.log('Fetching template with ID:', id);
          const response = await apiGet<any>(`/api/v1/templates/${id}`);
          const templateData = response?.data;
          
          if (!templateData) {
            throw new Error(`Template with ID ${id} not found`);
          }
          
          console.log('Template loaded:', templateData);
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
          
          // Load content
          if (templateData.content) {
            setContent(templateData.content);
          } else if (templateData.url && !templateData.url.includes('placeholder')) {
            try {
              const contentData = await apiGet<string>(`${templateData.url}`);
              if (contentData) {
                setContent(typeof contentData === 'string' 
                  ? contentData 
                  : JSON.stringify(contentData));
              }
            } catch (err) {
              console.error('Could not load template content:', err);
              setContent('<p>Inserisci il tuo contenuto qui...</p>');
              setError('Non è stato possibile caricare il contenuto del template');
            }
          } else {
            setContent('<p>Inserisci il tuo contenuto qui...</p>');
          }
          
          // Update URL to reflect the template format
          if (templateData.fileFormat) {
            const url = new URL(window.location.href);
            url.searchParams.set('format', templateData.fileFormat);
            window.history.replaceState({}, '', url.toString());
          }
        } catch (err) {
          console.error('Failed to load template:', err);
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
      const templateData = {
        name: templateName.trim(),
        url: googleDocsUrl ? '' : templateUrl,
        type: templateType,
        content: googleDocsUrl ? '' : content,
        header: header,
        footer: footer,
        logoPosition: logoPosition,
        logoImage: logoImage,
        isDefault: isDefault,
        fileFormat: templateFormat,
        googleDocsUrl: googleDocsUrl.trim() || null
      };

      console.log('Saving template data:', templateData);
      
      // Save template (create or update)
      // Backend now handles automatically unsetting other default templates
      if (id) {
        await apiPut(`/api/v1/templates/${id}`, templateData);
        console.log(`Template with ID ${id} updated`);
      } else {
        const response = await apiPost<any>('/api/v1/templates', templateData);
        const newTemplate = response?.data;
        console.log('New template created:', newTemplate);
      }
      
      // Navigate back to templates list
      navigate('/settings/templates');
    } catch (err: any) {
      console.error('Error saving template:', err);
      let errorMessage = 'Errore durante il salvataggio del template';
      if (err.response?.data?.error) {
        errorMessage += `: ${err.response.data.error}`;
      }
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
            onClick={() => navigate('/settings/templates')}
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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Configurazione Template</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nome Template */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nome Template
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Es. Attestato di Formazione"
              />
            </div>
            
            {/* Tipo Template */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tipo di Template
              </label>
              <select
                value={templateType}
                onChange={(e) => setTemplateType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                {templateTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      
      {/* Google Docs integration */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Integrazione Google Docs/Slides</h2>
        <GoogleTemplateProvider 
          documentType={templateType}
          initialTemplateUrl={googleDocsUrl}
          onTemplateSelected={(url, id) => {
            setGoogleDocsUrl(url);
            console.log(`Template selezionato: ${id}`);
          }}
        />
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
      {!googleDocsUrl && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* WYSIWYG Editor - 2/3 dello spazio */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Intestazione (Header)</h2>
            <TipTapEditor
              content={header}
              onChange={setHeader}
              placeholder="Intestazione del documento (apparirà in tutte le pagine)..."
              editorRef={headerEditorRef}
              minHeight="150px"
            />
            <p className="mt-2 text-sm text-slate-600">
              L'intestazione apparirà nella parte superiore di ogni pagina. Puoi inserire logo, titoli, informazioni aziendali.
            </p>
          </div>

          {/* Content Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Contenuto Template</h2>
            <TipTapEditor
              content={content}
              onChange={setContent}
              placeholder="Inizia a scrivere il contenuto del template..."
              editorRef={contentEditorRef}
              minHeight="500px"
            />
            <p className="mt-2 text-sm text-slate-600">
              Contenuto principale del documento. Seleziona i segnaposto dalla lista a destra per inserirli.
            </p>
          </div>

          {/* Footer Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Piè di pagina (Footer)</h2>
            <TipTapEditor
              content={footer}
              onChange={setFooter}
              placeholder="Piè di pagina del documento (apparirà in tutte le pagine)..."
              editorRef={footerEditorRef}
              minHeight="150px"
            />
            <p className="mt-2 text-sm text-slate-600">
              Il piè di pagina apparirà nella parte inferiore di ogni pagina. Puoi inserire contatti, note legali, numeri di pagina.
            </p>
          </div>
        </div>

        {/* Placeholder Selector - 1/3 dello spazio */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <PlaceholderPanel
              onInsert={(placeholder: string) => {
                // Insert at cursor position in the active editor
                // Default to content editor if none is focused
                const activeEditor = contentEditorRef.current || headerEditorRef.current || footerEditorRef.current;
                if (activeEditor) {
                  activeEditor.chain().focus().insertContent(placeholder).run();
                }
              }}
            />
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
          onClick={() => navigate('/settings/templates')}
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