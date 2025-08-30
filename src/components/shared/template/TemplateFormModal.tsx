import React from 'react';
import { X } from 'lucide-react';

interface TemplateType {
  value: string;
  label: string;
}

interface FileFormat {
  value: string;
  label: string;
}

interface TemplateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  modalData: {
    name: string;
    type: string;
    fileFormat: string;
    url: string;
    googleDocsUrl: string;
    id: string;
    isEditing: boolean;
  };
  setModalData: React.Dispatch<React.SetStateAction<{
    name: string;
    type: string;
    fileFormat: string;
    url: string;
    googleDocsUrl: string;
    id: string;
    isEditing: boolean;
  }>>;
  templateTypes: TemplateType[];
  fileFormats: FileFormat[];
  loading: boolean;
}

export const TemplateFormModal: React.FC<TemplateFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  modalData,
  setModalData,
  templateTypes,
  fileFormats,
  loading
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {modalData.isEditing ? 'Modifica Template' : 'Aggiungi Nuovo Template'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Template</label>
            <input
              type="text"
              value={modalData.name}
              onChange={(e) => setModalData({...modalData, name: e.target.value})}
              placeholder="Nome descrittivo del template"
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Documento</label>
              <select
                value={modalData.type}
                onChange={(e) => setModalData({...modalData, type: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              >
                {templateTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Formato</label>
              <select
                value={modalData.fileFormat}
                onChange={(e) => setModalData({...modalData, fileFormat: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              >
                {fileFormats.map(format => (
                  <option key={format.value} value={format.value}>{format.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="space-y-4 mt-4">
            <div className="border-t border-b border-gray-200 py-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Origine Template</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL Template</label>
                  <input
                    type="text"
                    value={modalData.url}
                    onChange={(e) => setModalData({...modalData, url: e.target.value})}
                    placeholder="https://example.com/template"
                    className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">URL al template esistente</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Google Docs URL</label>
                  <input
                    type="text"
                    value={modalData.googleDocsUrl}
                    onChange={(e) => setModalData({...modalData, googleDocsUrl: e.target.value})}
                    placeholder="https://docs.google.com/..."
                    className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Link a documento Google Docs/Slides</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Salvando...
                </>
              ) : modalData.isEditing ? 'Aggiorna Template' : 'Crea Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};