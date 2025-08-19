import React, { useState } from 'react';
import PlaceholderManager from './PlaceholderManager';
import PlaceholderPreview from './PlaceholderPreview';

interface PlaceholderDemoProps {
  documentType: 'attestato' | 'lettera_incarico' | 'fattura' | 'preventivo' | 'registro_presenze' | string;
  initialContent?: string;
  previewData?: Record<string, string>;
  title?: string;
}

/**
 * PlaceholderDemo - A demonstration component that shows how to use the PlaceholderManager
 * and PlaceholderPreview components together.
 * 
 * This component can be used as a starting point for implementing template editing with
 * placeholder support in the application.
 * 
 * @param documentType - Type of document being edited ('attestato', 'lettera_incarico', etc.)
 * @param initialContent - Initial template content with placeholders
 * @param previewData - Example data for previewing placeholder substitution
 * @param title - Title for the preview modal
 * 
 * @example
 * ```tsx
 * <PlaceholderDemo 
 *   documentType="attestato"
 *   initialContent="Attestato di partecipazione\n\nSi attesta che {{NOME}} {{COGNOME}} ha partecipato al corso {{CORSO}}."
 *   previewData={{ NOME: 'Mario', COGNOME: 'Rossi', CORSO: 'Sicurezza sul lavoro' }}
 *   title="Anteprima Attestato"
 * />
 * ```
 */
const PlaceholderDemo: React.FC<PlaceholderDemoProps> = ({
  documentType,
  initialContent = '',
  previewData = {},
  title = 'Anteprima Documento'
}) => {
  const [content, setContent] = useState(initialContent);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [previewValues, setPreviewValues] = useState<Record<string, string>>(previewData);
  
  // Handle content change from the placeholder manager
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
  };
  
  // Handle preview request
  const handlePreview = (contentToPreview: string, values: Record<string, string>) => {
    setPreviewContent(contentToPreview);
    setPreviewValues(values);
    setShowPreview(true);
  };
  
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Editor Template {documentType}</h2>
      
      {/* Placeholder Manager Component */}
      <PlaceholderManager
        documentType={documentType}
        initialContent={content}
        onChange={handleContentChange}
        onPreview={handlePreview}
        previewData={previewData}
      />
      
      {/* Preview Modal */}
      <PlaceholderPreview
        content={previewContent}
        values={previewValues}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title={title}
      />
      
      {/* Usage instructions */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">Come utilizzare i placeholder</h3>
        <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
          <li>Inserisci il testo del template nell'editor sopra</li>
          <li>Clicca su "Mostra placeholder" per visualizzare i placeholders disponibili</li>
          <li>Seleziona una categoria di placeholder o cerca un placeholder specifico</li>
          <li>Clicca sul pulsante + per inserire un placeholder nel punto in cui si trova il cursore</li>
          <li>Clicca su "Anteprima" per vedere come apparirà il documento con i dati reali</li>
        </ol>
      </div>
    </div>
  );
};

export default PlaceholderDemo; 