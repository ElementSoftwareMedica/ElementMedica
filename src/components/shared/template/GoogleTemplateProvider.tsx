import React, { useState, useEffect } from 'react';
import { FileEdit, AlertTriangle, Check, ChevronDown, User, Building, GraduationCap, Calendar, UserCheck, FileText, Settings, Copy } from 'lucide-react';
import { Button } from '../../../design-system/atoms/Button';
import googleApiClient from '../../../services/googleApiClient';

// Placeholder groups organized by category
const PLACEHOLDER_CATEGORIES = [
  {
    id: 'person',
    label: 'Persona',
    icon: User,
    color: 'blue',
    placeholders: [
      { name: 'person.firstName', alt: 'NOME', desc: 'Nome' },
      { name: 'person.lastName', alt: 'COGNOME', desc: 'Cognome' },
      { name: 'person.fullName', alt: 'NOME_COMPLETO', desc: 'Nome completo' },
      { name: 'person.cf', alt: 'CODICE_FISCALE', desc: 'Codice fiscale' },
      { name: 'person.birthDate', alt: 'DATA_NASCITA', desc: 'Data nascita' },
      { name: 'person.birthPlace', alt: 'LUOGO_NASCITA', desc: 'Luogo nascita' },
      { name: 'person.title', alt: 'PROFILO_PROFESSIONALE', desc: 'Profilo professionale' },
      { name: 'person.email', alt: 'EMAIL', desc: 'Email' },
      { name: 'person.phone', alt: 'TELEFONO', desc: 'Telefono' },
    ]
  },
  {
    id: 'company',
    label: 'Azienda',
    icon: Building,
    color: 'green',
    placeholders: [
      { name: 'company.name', alt: 'AZIENDA_RAGIONE_SOCIALE', desc: 'Ragione sociale' },
      { name: 'company.vatNumber', alt: 'AZIENDA_PIVA', desc: 'P.IVA' },
      { name: 'company.fiscalCode', alt: 'AZIENDA_CF', desc: 'Codice fiscale' },
      { name: 'company.codiceAteco', alt: 'AZIENDA_CODICE_ATECO', desc: 'Codice ATECO' },
      { name: 'company.address.full', alt: 'AZIENDA_INDIRIZZO', desc: 'Indirizzo completo' },
      { name: 'company.email', alt: 'AZIENDA_EMAIL', desc: 'Email' },
      { name: 'company.phone', alt: 'AZIENDA_TELEFONO', desc: 'Telefono' },
      { name: 'company.legalRepresentative', alt: 'AZIENDA_RAPPRESENTANTE', desc: 'Rappresentante legale' },
    ]
  },
  {
    id: 'course',
    label: 'Corso',
    icon: GraduationCap,
    color: 'purple',
    placeholders: [
      { name: 'course.title', alt: 'CORSO_TITOLO', desc: 'Titolo corso' },
      { name: 'course.code', alt: 'CORSO_CODICE', desc: 'Codice corso' },
      { name: 'course.duration', alt: 'CORSO_DURATA', desc: 'Durata (ore)' },
      { name: 'course.regulation', alt: 'CORSO_NORMATIVA', desc: 'Normativa' },
      { name: 'course.category', alt: 'CORSO_CATEGORIA', desc: 'Categoria' },
      { name: 'course.topics', alt: 'CORSO_ARGOMENTI', desc: 'Argomenti' },
      { name: 'course.objectives', alt: 'CORSO_OBIETTIVI', desc: 'Obiettivi' },
      { name: 'course.validityYears', alt: 'CORSO_VALIDITA_ANNI', desc: 'Anni validità' },
    ]
  },
  {
    id: 'schedule',
    label: 'Programmazione',
    icon: Calendar,
    color: 'amber',
    placeholders: [
      { name: 'schedule.startDate', alt: 'DATA_INIZIO', desc: 'Data inizio' },
      { name: 'schedule.endDate', alt: 'DATA_FINE', desc: 'Data fine' },
      { name: 'schedule.location', alt: 'SEDE_CORSO', desc: 'Sede' },
      { name: 'schedule.totalHours', alt: 'ORE_TOTALI', desc: 'Ore totali' },
      { name: 'schedule.deliveryMode', alt: 'MODALITA_EROGAZIONE', desc: 'Modalità erogazione' },
      { name: 'schedule.code', alt: 'CODICE_EDIZIONE', desc: 'Codice edizione' },
    ]
  },
  {
    id: 'trainer',
    label: 'Docente',
    icon: UserCheck,
    color: 'indigo',
    placeholders: [
      { name: 'trainer.fullName', alt: 'FORMATORE_COMPLETO', desc: 'Nome formatore' },
      { name: 'trainer.firstName', alt: 'NOME_FORMATORE', desc: 'Nome' },
      { name: 'trainer.lastName', alt: 'COGNOME_FORMATORE', desc: 'Cognome' },
      { name: 'trainer.email', alt: 'EMAIL_FORMATORE', desc: 'Email' },
      { name: 'trainer.hourlyRate', alt: 'TARIFFA_ORARIA', desc: 'Tariffa oraria' },
      { name: 'trainer.totalCompensation', alt: 'COMPENSO_TOTALE', desc: 'Compenso totale' },
    ]
  },
  {
    id: 'document',
    label: 'Documento',
    icon: FileText,
    color: 'red',
    placeholders: [
      { name: 'document.number', alt: 'NUMERO_PROGRESSIVO', desc: 'Numero progressivo' },
      { name: 'document.date', alt: 'DATA_GENERAZIONE', desc: 'Data generazione' },
      { name: 'certificate.registrationNumber', alt: 'NUMERO_ATTESTATO', desc: 'Numero attestato' },
      { name: 'certificate.validUntil', alt: 'DATA_SCADENZA', desc: 'Data scadenza' },
      { name: 'document.qrCode', alt: 'QR_CODE_VERIFICA', desc: 'QR code verifica' },
    ]
  },
  {
    id: 'system',
    label: 'Sistema',
    icon: Settings,
    color: 'gray',
    placeholders: [
      { name: 'current.date', alt: 'DATA_CORRENTE', desc: 'Data corrente' },
      { name: 'current.year', alt: 'ANNO', desc: 'Anno' },
      { name: 'current.time', alt: 'ORA_CORRENTE', desc: 'Ora corrente' },
      { name: 'tenant.name', alt: 'ENTE_NOME', desc: 'Nome ente' },
      { name: 'tenant.address', alt: 'ENTE_INDIRIZZO', desc: 'Indirizzo ente' },
      { name: 'tenant.email', alt: 'ENTE_EMAIL', desc: 'Email ente' },
    ]
  },
];

const COLOR_CLASSES: Record<string, { bg: string; border: string; text: string; hover: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', hover: 'hover:bg-blue-100' },
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', hover: 'hover:bg-green-100' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', hover: 'hover:bg-purple-100' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', hover: 'hover:bg-amber-100' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', hover: 'hover:bg-indigo-100' },
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', hover: 'hover:bg-red-100' },
  gray: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', hover: 'hover:bg-gray-100' },
};

interface GoogleTemplateProviderProps {
  documentType: string;
  initialTemplateUrl?: string;
  onTemplateSelected?: (templateUrl: string, templateId: string) => void;
  className?: string;
}

/**
 * GoogleTemplateProvider Component
 * 
 * A reusable component that provides Google Docs/Slides template functionality.
 * It allows users to:
 * 1. Connect to Google Docs/Slides templates
 * 2. Generate documents based on templates
 * 3. Get default templates for specific document types
 */
const GoogleTemplateProvider: React.FC<GoogleTemplateProviderProps> = ({
  documentType,
  initialTemplateUrl = '',
  onTemplateSelected,
  className = '',
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateUrl, setTemplateUrl] = useState<string>(initialTemplateUrl);
  const [success, setSuccess] = useState(false);

  // Update templateUrl when initialTemplateUrl changes
  useEffect(() => {
    if (initialTemplateUrl) {
      setTemplateUrl(initialTemplateUrl);
      setSuccess(true);
    }
  }, [initialTemplateUrl]);

  // Get the default template for this document type
  const getDefaultTemplate = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await googleApiClient.getDefaultTemplate(documentType);

      if (response.success && response.template) {
        setTemplateUrl(response.template.googleDocsUrl);
        setSuccess(true);

        if (onTemplateSelected) {
          onTemplateSelected(response.template.googleDocsUrl, response.template.id);
        }
      } else {
        setError(response.error || 'Nessun template predefinito trovato');
        setSuccess(false);
      }
    } catch (err: any) {
      console.error('Error getting default template:', err);
      setError(err.message || 'Impossibile ottenere il template');
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  // Generate a document using the current template and data
  const generateDocument = async (data: Record<string, string>) => {
    if (!templateUrl) {
      setError('Seleziona prima un template');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await googleApiClient.generateDocument(documentType, data);

      if (response.success) {
        setSuccess(true);
        return response;
      } else {
        setError('Errore nella generazione del documento');
        setSuccess(false);
        return null;
      }
    } catch (err: any) {
      console.error('Error generating document:', err);
      setError(err.message || 'Impossibile generare il documento');
      setSuccess(false);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Handle manual URL input
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTemplateUrl(e.target.value);
    setError(null);

    // Validate URL format
    if (e.target.value && !e.target.value.includes('docs.google.com')) {
      setError('Il link deve puntare a un documento Google Docs o Google Slides');
      setSuccess(false);
    } else if (e.target.value && onTemplateSelected) {
      setSuccess(true);
      onTemplateSelected(e.target.value, '');
    }
  };

  return (
    <div className={`google-template-provider ${className}`}>
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
        <h3 className="text-md font-semibold text-blue-800 flex items-center">
          <FileEdit className="h-5 w-5 mr-2" />
          Template Google Docs/Slides
        </h3>

        <p className="mt-2 text-sm text-blue-700">
          Utilizza un documento Google Docs o Google Slides come template.
          Il sistema sostituirà i placeholder nel formato {'{{NOME_PLACEHOLDER}}'} con i valori effettivi.
        </p>

        <div className="mt-4">
          <label className="block text-sm font-medium text-blue-700 mb-1">URL Google Docs/Slides</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={templateUrl}
              onChange={handleUrlChange}
              placeholder="https://docs.google.com/document/d/..."
              className="flex-1 rounded-md border-blue-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            />
            <Button
              onClick={getDefaultTemplate}
              size="sm"
              disabled={loading}
              variant="outline"
              className="whitespace-nowrap"
            >
              {loading ? 'Caricamento...' : 'Template Predefinito'}
            </Button>
          </div>
          <p className="mt-1 text-xs text-blue-600">
            Formato: https://docs.google.com/document/d/ID_DOCUMENTO o https://docs.google.com/presentation/d/ID_PRESENTAZIONE
          </p>
        </div>

        {error && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm flex items-start">
            <AlertTriangle className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && !error && templateUrl && (
          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm flex items-center">
            <Check className="h-4 w-4 mr-1" />
            <span>Template selezionato correttamente</span>
          </div>
        )}

        <PlaceholderPanels />
      </div>
    </div>
  );
};

// Collapsible Placeholder Panels Component
const PlaceholderPanels: React.FC = () => {
  const [expandedPanels, setExpandedPanels] = useState<Set<string>>(new Set(['person', 'course']));
  const [copiedPlaceholder, setCopiedPlaceholder] = useState<string | null>(null);

  const togglePanel = (id: string) => {
    const newExpanded = new Set(expandedPanels);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedPanels(newExpanded);
  };

  const copyPlaceholder = async (placeholder: string) => {
    const formatted = `{{${placeholder}}}`;
    try {
      await navigator.clipboard.writeText(formatted);
      setCopiedPlaceholder(placeholder);
      setTimeout(() => setCopiedPlaceholder(null), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-sm text-blue-700">Placeholder disponibili:</h4>
        <span className="text-xs text-gray-500">
          {PLACEHOLDER_CATEGORIES.reduce((sum, cat) => sum + cat.placeholders.length, 0)} totali
        </span>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Puoi usare entrambi i formati: <code className="bg-gray-100 px-1 rounded">{'{{person.firstName}}'}</code> oppure <code className="bg-gray-100 px-1 rounded">{'{{NOME}}'}</code>
      </p>

      <div className="space-y-1 max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
        {PLACEHOLDER_CATEGORIES.map((category) => {
          const Icon = category.icon;
          const colors = COLOR_CLASSES[category.color];
          const isExpanded = expandedPanels.has(category.id);

          return (
            <div key={category.id} className="border-b border-gray-100 last:border-b-0">
              {/* Category Header */}
              <button
                onClick={() => togglePanel(category.id)}
                className={`w-full px-3 py-2 flex items-center justify-between text-left transition-colors ${colors.hover} ${isExpanded ? colors.bg : 'bg-white'}`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${colors.text}`} />
                  <span className={`font-medium text-sm ${colors.text}`}>{category.label}</span>
                  <span className="text-xs text-gray-400">({category.placeholders.length})</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {/* Placeholders Grid */}
              {isExpanded && (
                <div className={`px-3 py-2 ${colors.bg} grid grid-cols-2 gap-1.5`}>
                  {category.placeholders.map((ph) => (
                    <button
                      key={ph.name}
                      onClick={() => copyPlaceholder(ph.name)}
                      className={`p-1.5 rounded border ${colors.border} bg-white hover:shadow-sm transition-all text-left group relative`}
                      title={`Clicca per copiare {{${ph.name}}}`}
                    >
                      <div className="font-mono text-xs text-gray-700 truncate">
                        {`{{${ph.name}}}`}
                      </div>
                      <div className="text-xs text-gray-500 truncate">{ph.desc}</div>

                      {/* Copy indicator */}
                      <div className={`absolute right-1 top-1 transition-opacity ${copiedPlaceholder === ph.name ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                        {copiedPlaceholder === ph.name ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3 text-gray-400" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-blue-600">
        💡 Clicca su un placeholder per copiarlo. Incollalo nel template Google.
      </p>
    </div>
  );
};

export default GoogleTemplateProvider;