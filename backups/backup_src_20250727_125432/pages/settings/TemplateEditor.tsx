import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { apiGet, apiPost, apiPut } from '../../services/api';
import { ChevronLeft, Save, FileText, Download, Layout, Image, Eye, FileEdit } from 'lucide-react';
import { Button } from '../../design-system/atoms/Button';
import { PlaceholderDemo, GoogleTemplateProvider, GoogleDocsPreview } from '../../components/shared/template';
import PageHeader from '../../components/shared/layouts/PageHeader';

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
  const templateFormat = new URLSearchParams(location.search).get('format') || 'text';
  
  // Template types available for selection
  const templateTypes = [
    { value: 'lettera_incarico', label: 'Lettera di Incarico' },
    { value: 'attestati', label: 'Attestati' },
    { value: 'fattura', label: 'Fattura' },
    { value: 'programma_corso', label: 'Programma Corso' },
    { value: 'registro_presenze', label: 'Registro Presenze' },
  ];

  // Load template based on ID from URL params
  useEffect(() => {
    const fetchTemplate = async () => {
      const initialType = new URLSearchParams(location.search).get('type') || 'lettera_incarico';
      setTemplateType(initialType);
      
      if (id) {
        try {
          console.log('Fetching template with ID:', id);
          const templateData = await apiGet<Template>(`/template-links/${id}`);
          
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
      if (id) {
        await apiPut(`/template-links/${id}`, templateData);
        console.log(`Template with ID ${id} updated`);
      } else {
        const newTemplate = await apiPost<Template>('/template-links', templateData);
        console.log('New template created:', newTemplate);
        
        // If this template is set as default, update other templates of the same type
        if (isDefault) {
          const allTemplates = await apiGet<Template[]>('/template-links');
          const templatesOfSameType = allTemplates.filter(
            (t: Template) => t.type === templateType && t.id !== (newTemplate.id || id)
          );
          
          // Update other templates to not be default
          for (const template of templatesOfSameType) {
            if (template.isDefault) {
              await apiPut(`/template-links/${template.id}`, {
                ...template,
                isDefault: false
              });
            }
          }
        }
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
    <div className="container mx-auto py-8">
      <PageHeader 
        title="Editor Template" 
        subtitle="Crea e modifica template"
        viewMode="table" 
        onViewModeChange={() => {}}
        selectionMode={false}
        onToggleSelectionMode={() => {}}
        searchValue=""
        onSearchChange={() => {}}
        description="Crea e modifica template per documenti con supporto per placeholder"
      />
      
      {/* Template type selector */}
      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo di Template</label>
        <select
          value={templateType}
          onChange={(e) => setTemplateType(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          {templateTypes.map((type) => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>
      
      {/* Template name */}
      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Nome Template</label>
        <input
          type="text"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>
      
      {/* Google Docs integration */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Integrazione Google Docs/Slides</h2>
        <GoogleTemplateProvider 
          documentType={templateType} 
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
      
      {/* Placeholder demo */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Anteprima Placeholder</h2>
        <PlaceholderDemo 
          documentType={templateType}
          initialContent={template?.content || ''}
          previewData={{
            NOME: "Mario",
            COGNOME: "Rossi",
            NOME_COMPLETO: "Mario Rossi",
          }}
        />
      </div>
      
      {/* Default template toggle */}
      <div className="mt-6">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isDefault"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-700">
            Imposta come template predefinito per {templateType.replace('_', ' ')}
          </label>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Se selezionato, questo template verrà utilizzato come predefinito per questo tipo di documento
        </p>
      </div>
      
      {/* Save/Cancel buttons */}
      <div className="mt-8 flex gap-4 justify-end">
        <Button 
          variant="outline" 
          onClick={() => navigate('/settings/templates')}
        >
          <ChevronLeft className="mr-1 h-4 w-4" /> Annulla
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={saving}
        >
          {saving ? (
            <span className="flex items-center">
              <span className="animate-spin h-4 w-4 border-2 border-b-0 border-r-0 rounded-full mr-2" />
              Salvataggio...
            </span>
          ) : (
            <>
              <Save className="mr-1 h-4 w-4" /> Salva Template
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
  );
};

export default TemplateEditor;