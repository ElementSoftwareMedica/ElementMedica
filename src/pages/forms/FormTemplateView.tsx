import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../design-system/atoms/Button';
import { formTemplatesService } from '../../services/formTemplates';
import { useToast } from '../../hooks/useToast';
import { Eye, Edit, Copy, Trash2 } from 'lucide-react';

interface FormTemplate {
  id: string;
  name: string;
  description?: string;
  fields: FormField[];
  isActive: boolean;
  isPublic: boolean;
  allowAnonymous: boolean;
  successMessage?: string;
  redirectUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface FormField {
  id: string;
  name: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file' | 'date' | 'number';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

const FormTemplateView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<FormTemplate | null>(null);

  useEffect(() => {
    if (id) {
      loadFormTemplate();
    }
  }, [id]);

  const loadFormTemplate = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const templateData = await formTemplatesService.getFormTemplate(id);
      setTemplate(templateData);
    } catch (error) {
      console.error('Errore nel caricamento del template:', error);
      showToast({ message: 'Errore nel caricamento del template', type: 'error' });
      navigate('/forms');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async () => {
    if (!template) return;
    
    const newName = prompt('Inserisci il nome per il nuovo template:', `${template.name} - Copia`);
    if (!newName) return;

    try {
      await formTemplatesService.duplicateFormTemplate(template.id, newName);
      showToast({ message: 'Template duplicato con successo', type: 'success' });
      navigate('/forms');
    } catch (error) {
      console.error('Errore nella duplicazione del template:', error);
      showToast({ message: 'Errore nella duplicazione del template', type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!template) return;
    
    if (!confirm(`Sei sicuro di voler eliminare il template "${template.name}"?`)) {
      return;
    }

    try {
      await formTemplatesService.deleteFormTemplate(template.id);
      showToast({ message: 'Template eliminato con successo', type: 'success' });
      navigate('/forms');
    } catch (error) {
      console.error('Errore nell\'eliminazione del template:', error);
      showToast({ message: 'Errore nell\'eliminazione del template', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento template...</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Template non trovato</p>
          <Button onClick={() => navigate('/forms')} className="mt-4">
            Torna ai Form
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
                <div className="flex items-center space-x-4 mt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    template.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {template.isActive ? 'Attivo' : 'Inattivo'}
                  </span>
                  {template.isPublic && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Pubblico
                    </span>
                  )}
                  {template.allowAnonymous && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Anonimo
                    </span>
                  )}
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => navigate('/forms')}
                >
                  Torna ai Form
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/forms/templates/${template.id}/edit`)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Modifica
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDuplicate}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Duplica
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Elimina
                </Button>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Informazioni generali */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Informazioni Generali</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nome</label>
                  <p className="mt-1 text-sm text-gray-900">{template.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Stato</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {template.isActive ? 'Attivo' : 'Inattivo'}
                  </p>
                </div>
                {template.description && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Descrizione</label>
                    <p className="mt-1 text-sm text-gray-900">{template.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Configurazioni */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Configurazioni</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Visibilità</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {template.isPublic ? 'Pubblico' : 'Privato'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Invii Anonimi</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {template.allowAnonymous ? 'Consentiti' : 'Non consentiti'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Numero Campi</label>
                  <p className="mt-1 text-sm text-gray-900">{template.fields.length}</p>
                </div>
              </div>
            </div>

            {/* Campi del form */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Campi del Form</h3>
              <div className="space-y-4">
                {template.fields.map((field, index) => (
                  <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <h4 className="text-sm font-medium text-gray-900">{field.label}</h4>
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {field.type}
                          </span>
                          {field.required && (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                              Obbligatorio
                            </span>
                          )}
                        </div>
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Nome campo:</span> {field.name}
                          </div>
                          {field.placeholder && (
                            <div>
                              <span className="font-medium">Placeholder:</span> {field.placeholder}
                            </div>
                          )}
                        </div>
                        {field.options && field.options.length > 0 && (
                          <div className="mt-2">
                            <span className="text-sm font-medium text-gray-700">Opzioni:</span>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {field.options.map((option, optionIndex) => (
                                <span
                                  key={optionIndex}
                                  className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800"
                                >
                                  {option}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        #{index + 1}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Messaggi e redirect */}
            {(template.successMessage || template.redirectUrl) && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Configurazioni Post-Invio</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {template.successMessage && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Messaggio di Successo</label>
                      <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                        {template.successMessage}
                      </p>
                    </div>
                  )}
                  {template.redirectUrl && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">URL di Redirect</label>
                      <p className="mt-1 text-sm text-gray-900">
                        <a 
                          href={template.redirectUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          {template.redirectUrl}
                        </a>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Metadati */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Metadati</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Creato il</label>
                  <p className="mt-1">{new Date(template.createdAt).toLocaleString('it-IT')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ultimo aggiornamento</label>
                  <p className="mt-1">{new Date(template.updatedAt).toLocaleString('it-IT')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormTemplateView;