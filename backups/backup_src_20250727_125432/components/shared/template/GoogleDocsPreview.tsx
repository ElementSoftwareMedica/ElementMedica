import React, { useState } from 'react';
import { Button } from '../../../design-system/atoms/Button';
import { FileDown, FileText, Eye, Printer, RefreshCw, FileType } from 'lucide-react';
import googleApiClient from '../../../services/googleApiClient';

interface GoogleDocsPreviewProps {
  documentUrl?: string;
  templateId?: string;
  placeholderData?: Record<string, string>;
  documentType: string;
  onGenerationSuccess?: (fileUrl: string, fileName: string) => void;
  className?: string;
}

/**
 * GoogleDocsPreview Component
 * 
 * Displays a preview and control options for Google Docs/Slides templates.
 * Features:
 * - Generate documents with real data
 * - Preview generated PDFs
 * - Download generated documents
 */
const GoogleDocsPreview: React.FC<GoogleDocsPreviewProps> = ({
  documentUrl,
  templateId,
  placeholderData = {},
  documentType,
  onGenerationSuccess,
  className = ''
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedFile, setGeneratedFile] = useState<{ url: string; name: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Generate document from template
  const handleGenerate = async () => {
    if (!documentUrl && !templateId) {
      setError('Nessun template selezionato');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await googleApiClient.generateDocument(documentType, placeholderData);
      
      if (response.success && response.fileUrl) {
        setGeneratedFile({
          url: response.fileUrl,
          name: response.fileName || 'documento.pdf'
        });
        
        if (onGenerationSuccess) {
          onGenerationSuccess(response.fileUrl, response.fileName || 'documento.pdf');
        }
        
        setShowPreview(true);
      } else {
        setError(response.message || 'Errore durante la generazione del documento');
      }
    } catch (err: any) {
      console.error('Error generating document:', err);
      setError(err.message || 'Impossibile generare il documento');
    } finally {
      setLoading(false);
    }
  };
  
  // Print the generated document
  const handlePrint = () => {
    if (generatedFile?.url) {
      const printWindow = window.open(generatedFile.url, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
        });
      }
    }
  };
  
  // Download the generated document
  const handleDownload = () => {
    if (generatedFile?.url) {
      const link = document.createElement('a');
      link.href = generatedFile.url;
      link.download = generatedFile.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  
  return (
    <div className={`google-docs-preview ${className}`}>
      <div className="border rounded-xl overflow-hidden">
        <div className="bg-gray-50 p-3 border-b flex justify-between items-center">
          <h3 className="text-gray-700 font-medium">
            Preview Documento {generatedFile ? `- ${generatedFile.name}` : ''}
          </h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={loading || (!documentUrl && !templateId)}
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <FileType className="h-4 w-4 mr-1" />
                  Genera PDF
                </>
              )}
            </Button>
            
            {generatedFile && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                >
                  <Printer className="h-4 w-4 mr-1" />
                  Stampa
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                >
                  <FileDown className="h-4 w-4 mr-1" />
                  Scarica
                </Button>
              </>
            )}
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-3 border-b text-sm">
            {error}
          </div>
        )}
        
        <div className="p-4 bg-white">
          {!generatedFile && !showPreview ? (
            <div className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center text-gray-500">
              <FileText className="h-12 w-12 mb-3 text-gray-400" />
              <p className="mb-2">Nessun documento generato</p>
              <p className="text-sm">Clicca su "Genera PDF" per creare un documento usando i dati inseriti</p>
            </div>
          ) : (
            <div className="aspect-[210/297] w-full bg-gray-100 rounded">
              {showPreview && generatedFile && (
                <iframe
                  src={`${generatedFile.url}#toolbar=0&navpanes=0`}
                  className="w-full h-full rounded"
                  title="Document preview"
                />
              )}
            </div>
          )}
        </div>
        
        <div className="bg-gray-50 p-3 border-t flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {documentType === 'attestato' && 'Anteprima Attestato'}
            {documentType === 'lettera_incarico' && 'Anteprima Lettera di Incarico'}
            {documentType !== 'attestato' && documentType !== 'lettera_incarico' && `Anteprima ${documentType}`}
          </div>
          
          {generatedFile && (
            <Button
              variant="link"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="text-blue-600"
            >
              <Eye className="h-4 w-4 mr-1" />
              {showPreview ? 'Nascondi anteprima' : 'Mostra anteprima'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleDocsPreview;