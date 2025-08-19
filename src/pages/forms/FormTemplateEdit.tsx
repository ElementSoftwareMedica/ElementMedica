import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../design-system/atoms/Button';
import { formTemplatesService } from '../../services/formTemplates';
import { useToast } from '../../hooks/useToast';

interface FormField {
  id: string;
  name: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file' | 'date' | 'number';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

interface FormTemplateData {
  name: string;
  description: string;
  type: 'CONTACT' | 'COURSE_EVALUATION' | 'REGISTRATION' | 'FEEDBACK' | 'CUSTOM';
  isPublic: boolean;
  allowAnonymous: boolean;
  fields: FormField[];
  successMessage?: string;
  redirectUrl?: string;
}

const FormTemplateEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [formData, setFormData] = useState<FormTemplateData>({
    name: '',
    description: '',
    type: 'CUSTOM',
    isPublic: false,
    allowAnonymous: false,
    fields: [],
    successMessage: '',
    redirectUrl: ''
  });

  useEffect(() => {
    if (id) {
      loadFormTemplate();
    }
  }, [id]);

  const loadFormTemplate = async () => {
    if (!id) return;
    
    try {
      setInitialLoading(true);
      const template = await formTemplatesService.getFormTemplate(id);
      setFormData({
        name: template.name,
        description: template.description || '',
        type: 'CUSTOM', // Assumiamo CUSTOM per ora
        isPublic: template.isPublic,
        allowAnonymous: template.allowAnonymous,
        fields: template.fields,
        successMessage: template.successMessage || '',
        redirectUrl: template.redirectUrl || ''
      });
    } catch (error) {
      console.error('Errore nel caricamento del template:', error);
      showToast({ message: 'Errore nel caricamento del template', type: 'error' });
      navigate('/forms');
    } finally {
      setInitialLoading(false);
    }
  };

  const addField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      name: `field_${Date.now()}`,
      type: 'text',
      label: '',
      placeholder: '',
      required: false
    };
    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
  };

  const updateField = (index: number, field: Partial<FormField>) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map((f, i) => {
        if (i === index) {
          const updatedField = { ...f, ...field };
          // Se il label cambia, aggiorna anche il name
          if (field.label && field.label !== f.label) {
            updatedField.name = field.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
          }
          return updatedField;
        }
        return f;
      })
    }));
  };

  const removeField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      showToast({ message: 'Il nome del template è obbligatorio', type: 'error' });
      return;
    }

    if (formData.fields.length === 0) {
      showToast({ message: 'Aggiungi almeno un campo al form', type: 'error' });
      return;
    }

    if (!id) return;

    setLoading(true);
    try {
      await formTemplatesService.updateFormTemplate(id, {
        ...formData
      });
      
      showToast({ message: 'Template aggiornato con successo', type: 'success' });
      navigate('/forms');
    } catch (error) {
      console.error('Errore nell\'aggiornamento del template:', error);
      showToast({ message: 'Errore nell\'aggiornamento del template', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento template...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Modifica Template Form</h1>
              <Button
                variant="secondary"
                onClick={() => navigate('/forms')}
              >
                Annulla
              </Button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Informazioni base */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Template *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CUSTOM">Personalizzato</option>
                  <option value="CONTACT">Contatto</option>
                  <option value="COURSE_EVALUATION">Valutazione Corso</option>
                  <option value="REGISTRATION">Registrazione</option>
                  <option value="FEEDBACK">Feedback</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrizione
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Opzioni */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
                  Form pubblico
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allowAnonymous"
                  checked={formData.allowAnonymous}
                  onChange={(e) => setFormData(prev => ({ ...prev, allowAnonymous: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="allowAnonymous" className="ml-2 block text-sm text-gray-900">
                  Consenti invii anonimi
                </label>
              </div>
            </div>

            {/* Campi del form */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Campi del Form</h3>
                <Button type="button" onClick={addField} variant="secondary">
                  Aggiungi Campo
                </Button>
              </div>

              <div className="space-y-4">
                {formData.fields.map((field, index) => (
                  <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Etichetta
                        </label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => updateField(index, { label: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tipo
                        </label>
                        <select
                          value={field.type}
                          onChange={(e) => updateField(index, { type: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="text">Testo</option>
                          <option value="email">Email</option>
                          <option value="tel">Telefono</option>
                          <option value="textarea">Area di testo</option>
                          <option value="select">Selezione</option>
                          <option value="checkbox">Checkbox</option>
                          <option value="radio">Radio</option>
                          <option value="file">File</option>
                          <option value="date">Data</option>
                          <option value="number">Numero</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Placeholder
                        </label>
                        <input
                          type="text"
                          value={field.placeholder || ''}
                          onChange={(e) => updateField(index, { placeholder: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`required-${field.id}`}
                          checked={field.required}
                          onChange={(e) => updateField(index, { required: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`required-${field.id}`} className="ml-2 block text-sm text-gray-900">
                          Campo obbligatorio
                        </label>
                      </div>

                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => removeField(index)}
                      >
                        Rimuovi
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Messaggi e redirect */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Messaggio di successo
                </label>
                <textarea
                  value={formData.successMessage || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, successMessage: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Grazie per aver inviato il form!"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL di redirect
                </label>
                <input
                  type="url"
                  value={formData.redirectUrl || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, redirectUrl: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/grazie"
                />
              </div>
            </div>

            {/* Pulsanti */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/forms')}
              >
                Annulla
              </Button>
              <Button
                type="submit"
                disabled={loading}
              >
                {loading ? 'Aggiornamento...' : 'Aggiorna Template'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FormTemplateEdit;