import React, { useState } from 'react';
import { FileEdit, AlertTriangle, Check } from 'lucide-react';
import { Button } from '../../../design-system/atoms/Button';
import googleApiClient from '../../../services/googleApiClient';

interface GoogleTemplateProviderProps {
  documentType: string;
  onTemplateSelected?: (templateUrl: string, templateId: string) => void;
  className?: string;
}

interface GoogleTemplate {
  id: string;
  name: string;
  googleDocsUrl: string;
  type: string;
  isDefault: boolean;
}

interface GoogleTemplateResponse {
  success: boolean;
  template: GoogleTemplate;
  error?: string;
}

interface GenerateDocumentResponse {
  success: boolean;
  message?: string;
  fileName?: string;
  fileUrl?: string;
  error?: string;
  details?: string;
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
  onTemplateSelected,
  className = '',
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateUrl, setTemplateUrl] = useState<string>('');
  const [success, setSuccess] = useState(false);
  
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
        
        <div className="mt-4 text-sm text-blue-700">
          <h4 className="font-medium mb-2">Placeholder disponibili:</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { name: 'NOME', desc: 'Nome' },
              { name: 'COGNOME', desc: 'Cognome' },
              { name: 'NOME_COMPLETO', desc: 'Nome completo' },
              { name: 'CORSO_TITOLO', desc: 'Titolo corso' },
              { name: 'DATA_INIZIO', desc: 'Data inizio' },
              { name: 'DATA_FINE', desc: 'Data fine' },
              { name: 'ORE_TOTALI', desc: 'Ore totali' },
              { name: 'AZIENDA_NOME', desc: 'Nome azienda' },
              { name: 'DATA_GENERAZIONE', desc: 'Data generazione' }
            ].map((ph) => (
              <div key={ph.name} className="bg-white rounded p-1 border border-blue-100 text-xs">
                <span className="font-mono text-blue-800">{'{{' + ph.name + '}}'}</span>
                <span className="text-gray-500 ml-1">{ph.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleTemplateProvider;