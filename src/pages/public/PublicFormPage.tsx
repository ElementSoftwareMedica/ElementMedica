import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PublicLayout } from '../../components/public/PublicLayout';
import { PublicButton } from '../../components/public/PublicButton';
import { formTemplatesService, FormTemplate, FormField } from '../../services/formTemplates';
import { CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

const PublicFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formTemplate, setFormTemplate] = useState<FormTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, string | boolean>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const loadForm = useCallback(async (): Promise<void> => {
    try {
      if (!id) return;
      setLoading(true);
      setError(null);
      const form = await formTemplatesService.getPublicForm(id!);
      
      if (!form.isActive || !form.isPublic) {
        setError('Questo form non è disponibile pubblicamente.');
        return;
      }

      setFormTemplate(form);
      
      // Inizializza i dati del form
      const initialData: Record<string, string | boolean> = {};
      form.fields.forEach(field => {
        if (field.type === 'checkbox') {
          initialData[field.name] = false;
        } else {
          initialData[field.name] = '';
        }
      });
      setFormData(initialData);
    } catch (err) {
      console.error('Errore nel caricamento del form:', err);
      setError('Errore nel caricamento del form. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      void loadForm();
    }
  }, [id, loadForm]);

  const validateField = (field: FormField, value: unknown): string | null => {
    if (field.required) {
      if (field.type === 'checkbox') {
        if (value !== true) return `${field.label} è obbligatorio`;
      } else {
        if (typeof value !== 'string' || value.trim() === '') {
          return `${field.label} è obbligatorio`;
        }
      }
    }

    if (field.validation) {
      const { min, max, pattern, message } = field.validation;
      
      if (min && typeof value === 'string' && value.length < min) {
        return message || `${field.label} deve essere di almeno ${min} caratteri`;
      }
      
      if (max && typeof value === 'string' && value.length > max) {
        return message || `${field.label} non può superare ${max} caratteri`;
      }
      
      if (pattern && typeof value === 'string' && !new RegExp(pattern).test(value)) {
        return message || `${field.label} non è nel formato corretto`;
      }
    }

    // Validazioni specifiche per tipo
    if (field.type === 'email' && typeof value === 'string' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Inserisci un indirizzo email valido';
    }

    if (field.type === 'tel' && typeof value === 'string' && value && !/^[\+]?[- 0-9\s\-\(\)]+$/.test(value)) {
      return 'Inserisci un numero di telefono valido';
    }

    return null;
  };

  const validateForm = (): boolean => {
    if (!formTemplate) return false;

    const errors: Record<string, string> = {};
    let isValid = true;

    formTemplate.fields.forEach(field => {
      const error = validateField(field, formData[field.name]);
      if (error) {
        errors[field.name] = error;
        isValid = false;
      }
    });

    setValidationErrors(errors);
    return isValid;
  };

  const handleInputChange = (fieldName: string, value: string | boolean): void => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Rimuovi l'errore di validazione se presente
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formTemplate || !validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const result = await formTemplatesService.submitPublicForm(formTemplate.id, { formData });
      
      if (result.success) {
        setSubmitted(true);
        
        // Redirect se specificato
        if (formTemplate.redirectUrl) {
          setTimeout(() => {
            window.location.href = formTemplate.redirectUrl!;
          }, 3000);
        }
      } else {
        setError('Errore nell\'invio del form. Riprova più tardi.');
      }
    } catch (err) {
      console.error('Errore nell\'invio del form:', err);
      setError('Errore nell\'invio del form. Riprova più tardi.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const hasError = validationErrors[field.name];
    const baseClasses = `w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${
      hasError ? 'border-red-500' : 'border-gray-300 focus:border-primary-500'
    }`;

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            id={field.name}
            name={field.name}
            value={typeof formData[field.name] === 'string' ? (formData[field.name] as string) : ''}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className={`${baseClasses} min-h-[120px] resize-vertical`}
            rows={4}
          />
        );

      case 'select':
        return (
          <select
            id={field.name}
            name={field.name}
            value={typeof formData[field.name] === 'string' ? (formData[field.name] as string) : ''}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            required={field.required}
            className={baseClasses}
          >
            <option value="">Seleziona...</option>
            {field.options?.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              id={field.name}
              name={field.name}
              checked={Boolean(formData[field.name])}
              onChange={(e) => handleInputChange(field.name, e.target.checked)}
              required={field.required}
              className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-gray-700">{field.label}</span>
          </label>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map(option => (
              <label key={option} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name={field.name}
                  value={option}
                  checked={formData[field.name] === option}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  required={field.required}
                  className="w-5 h-5 text-primary-600 border-gray-300 focus:ring-primary-500"
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      default:
        return (
          <input
            type={field.type}
            id={field.name}
            name={field.name}
            value={typeof formData[field.name] === 'string' ? (formData[field.name] as string) : ''}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className={baseClasses}
          />
        );
    }
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Caricamento del form in corso...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (error && !formTemplate) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Form non disponibile</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <PublicButton onClick={() => navigate('/')} variant="primary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Torna alla Home
            </PublicButton>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (submitted) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Grazie!</h2>
            <p className="text-gray-600 mb-6">Il tuo form è stato inviato con successo.</p>
            <PublicButton onClick={() => navigate('/')} variant="primary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Torna alla Home
            </PublicButton>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">

            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {formTemplate?.name}
              </h1>
              {formTemplate?.description && (
                <p className="text-lg text-gray-600">
                  {formTemplate.description}
                </p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-lg p-8">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {formTemplate?.fields.map(field => (
                  <div key={field.name}>
                    {field.type !== 'checkbox' && (
                      <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-2">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                    )}
                    
                    {renderField(field)}
                    
                    {validationErrors[field.name] && (
                      <p className="mt-1 text-sm text-red-600">
                        {validationErrors[field.name]}
                      </p>
                    )}
                  </div>
                ))}

                <div className="flex gap-4 pt-6">
                  <PublicButton
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/')}
                    className="flex-1"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Annulla
                  </PublicButton>
                  
                  <PublicButton
                    type="submit"
                    variant="primary"
                    disabled={submitting}
                    className="flex-1"
                  >
                    {submitting ? 'Invio in corso...' : 'Invia Form'}
                  </PublicButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default PublicFormPage;