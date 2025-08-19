import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Plus,
  Save,
  Trash2
} from 'lucide-react';
import { Button } from '../../design-system/atoms/Button';
import { formTemplatesService } from '../../services/formTemplates';
import { useToast } from '../../hooks/useToast';interface FormField {
  id: string;
  name: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file' | 'date' | 'number';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}interface FormTemplateData {
  name: string;
  description: string;
  type: 'CONTACT' | 'COURSE_EVALUATION' | 'REGISTRATION' | 'FEEDBACK' | 'CUSTOM';
  isPublic: boolean;
  allowAnonymous: boolean;
  fields: FormField[];
  successMessage?: string;
  redirectUrl?: string;
}

const initialFormData: FormTemplateData = {
  name: '',
  description: '',
  type: 'CONTACT',
  isPublic: false,
  allowAnonymous: false,
  fields: [],
  successMessage: 'Grazie per aver inviato il modulo!',
  redirectUrl: ''
};

const fieldTypes = [
  { value: 'text', label: 'Testo' },
  { value: 'email', label: 'Email' },
  { value: 'tel', label: 'Telefono' },
  { value: 'textarea', label: 'Area di testo' },
  { value: 'select', label: 'Selezione' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio button' }
];

const templateTypes = [
  { value: 'CONTACT', label: 'Contatto' },
  { value: 'COURSE_EVALUATION', label: 'Valutazione Corso' },
  { value: 'REGISTRATION', label: 'Registrazione' },
  { value: 'FEEDBACK', label: 'Feedback' },
  { value: 'CUSTOM', label: 'Personalizzato' }
];

const FormTemplateCreate: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [formData, setFormData] = useState<FormTemplateData>(initialFormData);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: keyof FormTemplateData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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

    setLoading(true);
    try {
      await formTemplatesService.createFormTemplate({
        ...formData
      });
      
      showToast({ message: 'Template creato con successo', type: 'success' });
      navigate('/forms');
    } catch (error) {
      console.error('Errore nella creazione del template:', error);
      showToast({ message: 'Errore nella creazione del template', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/forms')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna ai Forms
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">
          Nuovo Form Template
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informazioni Base */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Informazioni Base
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Template *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Es. Form di Contatto"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo Template
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {templateTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrizione
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Descrizione del template..."
            />
          </div>

          <div className="mt-4 flex gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isPublic}
                onChange={(e) => handleInputChange('isPublic', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Form pubblico</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.allowAnonymous}
                onChange={(e) => handleInputChange('allowAnonymous', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Consenti invii anonimi</span>
            </label>
          </div>
        </div>

        {/* Campi del Form */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Campi del Form
            </h2>
            <Button
              type="button"
              onClick={addField}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Aggiungi Campo
            </Button>
          </div>

          {formData.fields.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nessun campo aggiunto. Clicca "Aggiungi Campo" per iniziare.
            </div>
          ) : (
            <div className="space-y-4">
              {formData.fields.map((field, index) => (
                <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">Campo {index + 1}</h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeField(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo Campo
                      </label>
                      <select
                        value={field.type}
                        onChange={(e) => updateField(index, { type: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {fieldTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Etichetta *
                      </label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateField(index, { label: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Es. Nome"
                        required
                      />
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
                        placeholder="Testo di aiuto..."
                      />
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateField(index, { required: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Campo obbligatorio</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Configurazioni Avanzate */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Configurazioni Avanzate
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Messaggio di Successo
              </label>
              <input
                type="text"
                value={formData.successMessage || ''}
                onChange={(e) => handleInputChange('successMessage', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Messaggio mostrato dopo l'invio"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL di Redirect
              </label>
              <input
                type="url"
                value={formData.redirectUrl || ''}
                onChange={(e) => handleInputChange('redirectUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        {/* Azioni */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/forms')}
          >
            Annulla
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Creazione...' : 'Crea Template'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default FormTemplateCreate;