/**
 * Google Import Dialog Component
 * Allows importing from Google Docs or Google Slides
 */

import React, { useState } from 'react';
import { FileText, Presentation, Loader2, X, AlertCircle } from 'lucide-react';

interface GoogleImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (result: any) => void;
  onImportDocs: (documentId: string, convertToHtml?: boolean) => Promise<any>;
  onImportSlides: (presentationId: string, convertToHtml?: boolean) => Promise<any>;
  isLoading: boolean;
  error?: string | null;
}

export const GoogleImportDialog: React.FC<GoogleImportDialogProps> = ({
  isOpen,
  onClose,
  onImport,
  onImportDocs,
  onImportSlides,
  isLoading,
  error
}) => {
  const [activeTab, setActiveTab] = useState<'docs' | 'slides'>('docs');
  const [documentUrl, setDocumentUrl] = useState('');
  const [keepNativeFormat, setKeepNativeFormat] = useState(false);

  if (!isOpen) return null;

  const handleImport = async () => {
    if (!documentUrl.trim()) return;

    try {
      let result;
      const convertToHtml = !keepNativeFormat; // Invert: if keepNative is true, convertToHtml is false
      
      if (activeTab === 'docs') {
        result = await onImportDocs(documentUrl, convertToHtml);
      } else {
        result = await onImportSlides(documentUrl, convertToHtml);
      }

      if (result) {
        onImport(result);
        setDocumentUrl('');
        setKeepNativeFormat(false); // Reset checkbox
        onClose();
      }
    } catch (err) {
      // Error already handled by hook
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Importa da Google
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-4">
            <button
              onClick={() => setActiveTab('docs')}
              className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'docs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="w-4 h-4 mr-2" />
              Google Docs
            </button>
            <button
              onClick={() => setActiveTab('slides')}
              className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'slides'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Presentation className="w-4 h-4 mr-2" />
              Google Slides
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            {/* Instructions */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                {activeTab === 'docs' 
                  ? 'Incolla l\'URL o l\'ID del documento Google Docs'
                  : 'Incolla l\'URL o l\'ID della presentazione Google Slides'}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Esempio: https://docs.google.com/{activeTab === 'docs' ? 'document' : 'presentation'}/d/1abc...xyz/edit
              </p>
            </div>

            {/* Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL o ID del documento
              </label>
              <input
                type="text"
                value={documentUrl}
                onChange={(e) => setDocumentUrl(e.target.value)}
                placeholder={`https://docs.google.com/${activeTab === 'docs' ? 'document' : 'presentation'}/d/...`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>

            {/* Native Format Checkbox */}
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="keepNativeFormat"
                  type="checkbox"
                  checked={keepNativeFormat}
                  onChange={(e) => setKeepNativeFormat(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>
              <div className="ml-3">
                <label htmlFor="keepNativeFormat" className="text-sm font-medium text-gray-700">
                  Mantieni formato nativo Google
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Se selezionato, il template verrà collegato al documento Google senza conversione HTML. 
                  I placeholder verranno sostituiti direttamente nel documento Google.
                </p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start p-3 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">
                  {error}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-4">
              <button
                onClick={onClose}
                className="px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-full transition-colors"
                disabled={isLoading}
              >
                Annulla
              </button>
              <button
                onClick={handleImport}
                disabled={isLoading || !documentUrl.trim()}
                className="inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importazione...
                  </>
                ) : (
                  <>
                    {activeTab === 'docs' ? (
                      <FileText className="w-4 h-4 mr-2" />
                    ) : (
                      <Presentation className="w-4 h-4 mr-2" />
                    )}
                    Importa {keepNativeFormat && '(Nativo)'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleImportDialog;
