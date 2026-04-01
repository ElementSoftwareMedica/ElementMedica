/**
 * GenerateDocumentDialog Component
 * 
 * Dialog for generating documents from templates.
 * Allows selecting entity type, entity ID, and email options.
 */

import React, { useState } from 'react';
import { X, FileText, Mail, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { templateService } from '../../services/templateService';
import type { Template, DocumentGenerateParams } from '../../types/templates';

interface GenerateDocumentDialogProps {
  template: Template;
  onClose: () => void;
  onSuccess?: (document: any) => void;
}

const GenerateDocumentDialog: React.FC<GenerateDocumentDialogProps> = ({
  template,
  onClose,
  onSuccess
}) => {
  const [entityType, setEntityType] = useState<string>('person');
  const [entityId, setEntityId] = useState<string>('');
  const [sendEmail, setSendEmail] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [generatedDocument, setGeneratedDocument] = useState<any>(null);

  /**
   * Entity types based on template type
   */
  const getEntityTypeOptions = () => {
    switch (template.type) {
      case 'CERTIFICATE':
        return [
          { value: 'person', label: 'Persona' },
          { value: 'enrollment', label: 'Iscrizione' }
        ];
      case 'LETTER_OF_ENGAGEMENT':
        return [
          { value: 'company', label: 'Azienda' },
          { value: 'trainer', label: 'Docente' }
        ];
      case 'ATTENDANCE_REGISTER':
        return [
          { value: 'schedule', label: 'Programmazione' },
          { value: 'course', label: 'Corso' }
        ];
      case 'COURSE_PROGRAM':
        return [
          { value: 'course', label: 'Corso' },
          { value: 'schedule', label: 'Programmazione' }
        ];
      case 'INVOICE':
        return [
          { value: 'company', label: 'Azienda' },
          { value: 'schedule', label: 'Programmazione' }
        ];
      default:
        return [
          { value: 'person', label: 'Persona' },
          { value: 'company', label: 'Azienda' },
          { value: 'course', label: 'Corso' },
          { value: 'schedule', label: 'Programmazione' },
          { value: 'trainer', label: 'Docente' }
        ];
    }
  };

  const entityTypeOptions = getEntityTypeOptions();

  /**
   * Handle document generation
   */
  const handleGenerate = async () => {
    // Validation
    if (!entityId.trim()) {
      setError('Inserire l\'ID dell\'entità');
      return;
    }

    if (sendEmail && !email.trim()) {
      setError('Inserire un indirizzo email');
      return;
    }

    if (sendEmail && !isValidEmail(email)) {
      setError('Inserire un indirizzo email valido');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const params: DocumentGenerateParams = {
        entityType,
        entityId: entityId.trim(),
        options: sendEmail ? {
          sendEmail: true,
          email: email.trim()
        } : undefined
      };

      const result = await templateService.generateDocument(template.id, params);

      setGeneratedDocument(result);
      setSuccess(true);

      if (onSuccess) {
        onSuccess(result);
      }

    } catch (err: unknown) {
      setError('Errore durante la generazione del documento');
    } finally {
      setGenerating(false);
    }
  };

  /**
   * Email validation
   */
  const isValidEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  /**
   * Reset form
   */
  const handleReset = () => {
    setEntityId('');
    setEmail('');
    setSendEmail(false);
    setError(null);
    setSuccess(false);
    setGeneratedDocument(null);
  };

  /**
   * Close and reset
   */
  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Genera Documento</h2>
              <p className="text-sm text-gray-500">Template: {template.name}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {!success ? (
            <div className="space-y-4">
              {/* Entity Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo di Entità
                </label>
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  disabled={generating}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-50"
                >
                  {entityTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Seleziona il tipo di entità per cui generare il documento
                </p>
              </div>

              {/* Entity ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID Entità *
                </label>
                <input
                  type="text"
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                  disabled={generating}
                  placeholder="es. PERS001, CRS123, SCH456..."
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-50"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Inserisci l'ID univoco dell'entità (persona, corso, programmazione, ecc.)
                </p>
              </div>

              {/* Send Email Toggle */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="sendEmail"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  disabled={generating}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                <label htmlFor="sendEmail" className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                  <Mail className="w-4 h-4" />
                  Invia documento via email
                </label>
              </div>

              {/* Email Input (conditional) */}
              {sendEmail && (
                <div className="ml-7">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Indirizzo Email *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={generating}
                    placeholder="esempio@dominio.it"
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-50"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Il documento sarà inviato a questo indirizzo dopo la generazione
                  </p>
                </div>
              )}

              {/* Error Alert */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-sm text-blue-800">
                  <p className="font-medium mb-1">Generazione documento</p>
                  <p>
                    Il sistema utilizzerà il template <strong>{template.name}</strong> (v{template.version})
                    per generare il documento. I marker saranno sostituiti con i dati reali dell'entità selezionata.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Success State */
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Documento Generato!</h3>
              <p className="text-gray-600 mb-4">
                Il documento è stato generato con successo
              </p>

              {generatedDocument && (
                <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2 mb-6">
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">File:</span>{' '}
                    <span className="text-gray-900">{generatedDocument.filename}</span>
                  </div>
                  {generatedDocument.fileSize && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Dimensione:</span>{' '}
                      <span className="text-gray-900">
                        {(generatedDocument.fileSize / 1024).toFixed(2)} KB
                      </span>
                    </div>
                  )}
                  {sendEmail && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Email inviata a:</span>{' '}
                      <span className="text-gray-900">{email}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 justify-center">
                {generatedDocument?.fileUrl && (
                  <a
                    href={generatedDocument.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Scarica Documento
                  </a>
                )}
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                >
                  Genera Altro
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                >
                  Chiudi
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
            <button
              onClick={handleClose}
              disabled={generating}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating || !entityId.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {generating ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Generazione...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Genera Documento
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GenerateDocumentDialog;
