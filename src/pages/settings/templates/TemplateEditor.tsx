/**
 * TemplateEditor Page
 * Main editor page for creating/editing templates
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import TiptapEditor from './components/editor/TiptapEditor';
import { useTemplateEditor } from './hooks/useTemplateEditor';
import { GoogleIntegrationPanel } from './components/google';
import { Save, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '../../../hooks/useToast';

const TemplateEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const {
    template,
    state,
    isLoading,
    isSaving,
    error,
    updateContent,
    save,
  } = useTemplateEditor({ templateId: id, autoSave: true });

  const [showMarkerPanel, setShowMarkerPanel] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento template...</p>
        </div>
      </div>
    );
  }

  if (error && !template) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <AlertCircle className="h-12 w-12 mx-auto mb-4" />
          <p className="text-lg font-semibold">Errore</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {template?.name || 'Nuovo Template'}
              </h1>
              <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                <span>Versione {template?.version || 1}</span>
                {state.lastSaved && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <CheckCircle size={14} className="text-green-600" />
                      Salvato {new Date(state.lastSaved).toLocaleTimeString()}
                    </span>
                  </>
                )}
                {state.isDirty && !isSaving && (
                  <>
                    <span>•</span>
                    <span className="text-amber-600">Modifiche non salvate</span>
                  </>
                )}
                {isSaving && (
                  <>
                    <span>•</span>
                    <span className="text-blue-600">Salvataggio...</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => save()}
                disabled={!state.isDirty || isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save size={18} />
                {isSaving ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Editor Column */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Contenuto Template</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Usa la toolbar per formattare il testo. Clicca su "Marker" per inserire campi dinamici.
                </p>
              </div>
              <div className="p-4">
                <TiptapEditor
                  content={state.content}
                  onChange={updateContent}
                  placeholder="Inizia a scrivere il tuo template..."
                  onInsertMarker={() => setShowMarkerPanel(true)}
                />
              </div>
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Google Integration Panel */}
            <GoogleIntegrationPanel
              onTemplateImported={(templateData) => {
                // Update editor content with imported data
                updateContent(templateData.content);
                showToast({ message: `Template "${templateData.name}" importato con successo!`, type: 'success' });
              }}
            />

            {/* Template Information Panel */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informazioni Template</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <div className="text-sm text-gray-900">{template?.type || 'N/A'}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Formato
                  </label>
                  <div className="text-sm text-gray-900">{template?.fileFormat || 'HTML'}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria
                  </label>
                  <div className="text-sm text-gray-900">{template?.category || 'N/A'}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stato
                  </label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${
                    template?.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {template?.isActive ? 'Attivo' : 'Inattivo'}
                  </span>
                </div>

                {template?.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrizione
                    </label>
                    <div className="text-sm text-gray-600">{template.description}</div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowMarkerPanel(!showMarkerPanel)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Gestisci Marker
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-save indicator */}
      {state.isDirty && (
        <div className="fixed bottom-4 right-4 bg-amber-100 text-amber-800 px-4 py-2 rounded-lg shadow-lg text-sm">
          Auto-save tra 30 secondi...
        </div>
      )}
    </div>
  );
};

export default TemplateEditor;
