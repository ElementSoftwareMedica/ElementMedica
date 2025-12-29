import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PublicLayout } from '../../components/public/PublicLayout';
import { PublicButton } from '../../components/public/PublicButton';
import { formTemplatesService, FormTemplate, FormField } from '../../services/formTemplates';
import { CheckCircle, AlertCircle, ArrowLeft, Lock, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { FormSection } from '../../types/forms';
import { isSectionVisible } from '../../utils/conditionalLogic';

const PublicFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [formTemplate, setFormTemplate] = useState<FormTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, string | boolean>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);
  const [visitedSectionIds, setVisitedSectionIds] = useState<string[]>([]);

  const loadForm = useCallback(async (): Promise<void> => {
    try {
      if (!id) return;
      setLoading(true);
      setError(null);
      const form = await formTemplatesService.getPublicForm(id!);

      // Verifica se il form è attivo
      if (!form.isActive) {
        setError('Questo form non è più attivo.');
        return;
      }

      // Determina se richiede autenticazione
      const needsAuth = !form.isPublic;
      setRequiresAuth(needsAuth);

      // Se richiede autenticazione e l'utente non è autenticato, aspetta
      if (needsAuth && !isAuthenticated && !authLoading) {
        // L'utente dovrà fare login - mostriamo un messaggio
        setError('Questo form richiede l\'autenticazione. Effettua il login per continuare.');
        setFormTemplate(form); // Salva comunque il form per mostrare info
        return;
      }

      setFormTemplate(form);

      // Inizializza i dati del form
      const initialData: Record<string, string | boolean> = {};
      form.fields?.forEach(field => {
        if (field.type.toLowerCase() === 'checkbox') {
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
  }, [id, isAuthenticated, authLoading]);

  useEffect(() => {
    if (id) {
      void loadForm();
    }
  }, [id, loadForm]);

  const validateField = (field: FormField, value: unknown): string | null => {
    if (field.required) {
      if (field.type.toLowerCase() === 'checkbox') {
        if (value !== true) return `${field.label} è obbligatorio`;
      } else {
        if (typeof value !== 'string' || value.trim() === '') {
          return `${field.label} è obbligatorio`;
        }
      }
    }

    if (field.validation) {
      const validation = field.validation as any;
      const { min, max, pattern, message } = validation;

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
    if (field.type.toLowerCase() === 'email' && typeof value === 'string' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Inserisci un indirizzo email valido';
    }

    if (field.type.toLowerCase() === 'tel' && typeof value === 'string' && value && !/^[\+]?[- 0-9\s\-\(\)]+$/.test(value)) {
      return 'Inserisci un numero di telefono valido';
    }

    return null;
  };

  const validateForm = (): boolean => {
    if (!formTemplate) return false;

    const errors: Record<string, string> = {};
    let isValid = true;

    // Validate ONLY fields in visited sections
    visitedSections.forEach(section => {
      section.fields.forEach(field => {
        const error = validateField(field, formData[field.name]);
        if (error) {
          errors[field.name] = error;
          isValid = false;
        }
      });
    });

    setValidationErrors(errors);
    return isValid;
  };

  // All available sections (for navigation logic)
  const allSections = useMemo(() => {
    if (!formTemplate) return [];

    const templateSections = (formTemplate.settings?.sections || []) as FormSection[];
    const fields = formTemplate.fields || [];

    // If no sections defined, create default section
    if (templateSections.length === 0) {
      return [{
        id: 'default',
        title: formTemplate.name,
        description: formTemplate.description,
        order: 0,
        fields: fields
      }];
    }

    // Map fields to sections (ALL sections, not filtered)
    return templateSections
      .sort((a, b) => a.order - b.order)
      .map(section => ({
        ...section,
        fields: fields
          .filter(f => f.sectionId === section.id)
          .sort((a, b) => a.order - b.order)
      }));
  }, [formTemplate]);

  // Only visited sections (for UI display)
  const visitedSections = useMemo(() => {
    return allSections.filter(s => visitedSectionIds.includes(s.id));
  }, [allSections, visitedSectionIds]);

  // Initialize first section
  useEffect(() => {
    if (allSections.length > 0 && !currentSectionId) {
      const firstSectionId = allSections[0].id;
      setCurrentSectionId(firstSectionId);
      setVisitedSectionIds([firstSectionId]);
    }
  }, [allSections, currentSectionId]);

  const handleInputChange = (fieldName: string, value: string | boolean, field?: FormField): void => {
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

    // Check if this field has options with nextSectionId
    if (field && ['select', 'radio'].includes(field.type.toLowerCase())) {
      checkOptionNavigation(field, value);
    }
  };

  // Check if selected option has nextSectionId and navigate
  const checkOptionNavigation = (field: FormField, value: string | boolean) => {
    if (!field.options || typeof value !== 'string') return;

    let options: any[] = [];
    if (typeof field.options === 'string') {
      try {
        options = JSON.parse(field.options);
      } catch (e) {
        return;
      }
    } else if (Array.isArray(field.options)) {
      options = field.options;
    }

    const selectedOption = options.find(opt =>
      (typeof opt === 'string' ? opt : opt.value) === value
    );

    if (selectedOption && typeof selectedOption === 'object' && selectedOption.nextSectionId) {
      const targetSectionId = selectedOption.nextSectionId;
      const targetSection = allSections.find(s => s.id === targetSectionId);

      if (targetSection && targetSectionId !== currentSectionId) {
        // Small delay to show selection before navigation
        setTimeout(() => {
          setCurrentSectionId(targetSectionId);
          // Add to visited if not already there
          setVisitedSectionIds(prev =>
            prev.includes(targetSectionId) ? prev : [...prev, targetSectionId]
          );
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 300);
      }
    }
  };

  const goToNextSection = () => {
    // Validate current section required fields
    const currentSection = allSections.find(s => s.id === currentSectionId);
    if (!currentSection) return;

    const requiredFields = currentSection.fields.filter(f => f.required);
    const missingFields = requiredFields.filter(f => {
      const value = formData[f.name];
      return !value || (typeof value === 'string' && value.trim() === '');
    });

    if (missingFields.length > 0) {
      const errors: Record<string, string> = {};
      missingFields.forEach(f => {
        errors[f.name] = `${f.label} è obbligatorio`;
      });
      setValidationErrors(errors);
      return;
    }

    // Find next section in order
    const currentIndex = allSections.findIndex(s => s.id === currentSectionId);
    if (currentIndex === -1 || currentIndex >= allSections.length - 1) return;

    const nextSection = allSections[currentIndex + 1];
    setCurrentSectionId(nextSection.id);
    setVisitedSectionIds(prev =>
      prev.includes(nextSection.id) ? prev : [...prev, nextSection.id]
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToPreviousSection = () => {
    // Navigate to previous visited section
    const currentIndexInVisited = visitedSectionIds.indexOf(currentSectionId!);

    if (currentIndexInVisited > 0) {
      const previousSectionId = visitedSectionIds[currentIndexInVisited - 1];
      setCurrentSectionId(previousSectionId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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

      // Submit form with formData and visitedSectionIds for proper validation
      await formTemplatesService.submitPublicForm(formTemplate.id, formData, visitedSectionIds);

      setSubmitted(true);
    } catch (err: any) {
      console.error('Errore nell\'invio del form:', err);
      setError(err.message || 'Errore nell\'invio del form. Riprova più tardi.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const hasError = validationErrors[field.name];
    const baseClasses = `w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${hasError ? 'border-red-500' : 'border-gray-300 focus:border-primary-500'
      }`;

    switch (field.type.toLowerCase()) {
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
            onChange={(e) => handleInputChange(field.name, e.target.value, field)}
            required={field.required}
            className={baseClasses}
          >
            <option value="">Seleziona...</option>
            {field.options?.map((option: any) => {
              const optionValue = typeof option === 'string' ? option : option.value;
              const optionLabel = typeof option === 'string' ? option : option.label;
              return (
                <option key={optionValue} value={optionValue}>
                  {optionLabel}
                </option>
              );
            })}
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
            {field.options?.map((option: any) => {
              const optionValue = typeof option === 'string' ? option : option.value;
              const optionLabel = typeof option === 'string' ? option : option.label;
              return (
                <label key={optionValue} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name={field.name}
                    value={optionValue}
                    checked={formData[field.name] === optionValue}
                    onChange={(e) => handleInputChange(field.name, e.target.value, field)}
                    required={field.required}
                    className="w-5 h-5 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="text-gray-700">{optionLabel}</span>
                </label>
              );
            })}
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

  // Caso speciale: Form richiede autenticazione ma utente non loggato
  if (requiresAuth && !isAuthenticated && !authLoading && formTemplate) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
            <Lock className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{formTemplate.name}</h2>
            <p className="text-gray-600 mb-6">
              Questo form richiede l'autenticazione.
              {formTemplate.allowAnonymous
                ? ' I tuoi dati personali non verranno raccolti.'
                : ' Le tue informazioni verranno raccolte dalla compilazione.'}
            </p>
            <div className="flex flex-col gap-3">
              <PublicButton onClick={() => navigate('/login')} variant="primary">
                <Lock className="w-4 h-4 mr-2" />
                Accedi per compilare
              </PublicButton>
              <PublicButton onClick={() => navigate('/')} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Torna alla Home
              </PublicButton>
            </div>
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

  const currentSection = allSections.find(s => s.id === currentSectionId);
  const currentIndexInVisited = visitedSectionIds.indexOf(currentSectionId!);
  const isMultiStep = allSections.length > 1;
  const isLastSection = currentIndexInVisited === visitedSectionIds.length - 1 &&
    allSections.findIndex(s => s.id === currentSectionId) === allSections.length - 1;

  return (
    <PublicLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">

            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {formTemplate?.name}
              </h1>
              {formTemplate?.description && (
                <p className="text-lg text-gray-600 leading-relaxed">
                  {formTemplate.description}
                </p>
              )}
            </div>

            {/* Progress Bar (only for multi-step forms) */}
            {isMultiStep && visitedSections.length > 0 && (
              <div className="mb-8 bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">
                    Sezione {currentIndexInVisited + 1} di {visitedSections.length}
                  </span>
                  <span className="text-sm font-semibold text-primary-600">
                    {Math.round(((currentIndexInVisited + 1) / visitedSections.length) * 100)}% completato
                  </span>
                </div>
                <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500 ease-out shadow-sm"
                    style={{ width: `${((currentIndexInVisited + 1) / visitedSections.length) * 100}%` }}
                  />
                </div>
                {/* Section dots */}
                <div className="flex justify-between mt-4">
                  {visitedSections.map((section, idx) => (
                    <div key={section.id} className="flex flex-col items-center flex-1">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${idx < currentIndexInVisited
                            ? 'bg-green-500 text-white'
                            : idx === currentIndexInVisited
                              ? 'bg-primary-600 text-white ring-4 ring-primary-200'
                              : 'bg-gray-300 text-gray-600'
                          }`}
                      >
                        {idx < currentIndexInVisited ? '✓' : idx + 1}
                      </div>
                      <span className={`text-xs mt-2 text-center ${idx === currentIndexInVisited ? 'font-semibold text-gray-900' : 'text-gray-500'
                        }`}>
                        {section.title.length > 20 ? section.title.substring(0, 18) + '...' : section.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Form Card */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {error && (
                <div className="p-6 bg-red-50 border-b border-red-200">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="p-8" noValidate>
                {!currentSection ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-16 h-16 mx-auto text-amber-500 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Nessun campo disponibile
                    </h3>
                    <p className="text-gray-600">
                      Questo form non ha campi configurati.
                    </p>
                  </div>
                ) : currentSection ? (
                  <div className="space-y-8">
                    {/* Section Header */}
                    <div className="border-b border-gray-200 pb-6">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {currentSection.title}
                      </h2>
                      {currentSection.description && (
                        <p className="text-gray-600 leading-relaxed">
                          {currentSection.description}
                        </p>
                      )}
                    </div>

                    {/* Section Fields */}
                    <div className="space-y-6">
                      {currentSection.fields.map(field => (
                        <div key={field.name} className="space-y-2">
                          {field.type.toLowerCase() !== 'checkbox' && (
                            <label htmlFor={field.name} className="block text-sm font-semibold text-gray-700">
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                          )}

                          <div className={validationErrors[field.name] ? 'ring-2 ring-red-500 rounded-lg' : ''}>
                            {renderField(field)}
                          </div>

                          {validationErrors[field.name] && (
                            <p className="flex items-center gap-2 text-sm text-red-600">
                              <AlertCircle className="w-4 h-4" />
                              {validationErrors[field.name]}
                            </p>
                          )}

                          {!validationErrors[field.name] && field.helpText && (
                            <p className="text-xs text-gray-500">{field.helpText}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
                    <p className="text-gray-600">Sezione non trovata</p>
                  </div>
                )}

                {/* Navigation Buttons */}
                {currentSection && (
                  <div className="pt-8 mt-8 border-t border-gray-200 flex gap-4">
                    {currentIndexInVisited > 0 && (
                      <PublicButton
                        type="button"
                        variant="outline"
                        onClick={goToPreviousSection}
                        className="flex-1 flex items-center justify-center gap-2"
                      >
                        <ChevronLeft className="w-5 h-5" />
                        Indietro
                      </PublicButton>
                    )}

                    {!isLastSection ? (
                      <PublicButton
                        type="button"
                        variant="primary"
                        onClick={goToNextSection}
                        className="flex-1 flex items-center justify-center gap-2"
                      >
                        Avanti
                        <ChevronRight className="w-5 h-5" />
                      </PublicButton>
                    ) : (
                      <PublicButton
                        type="submit"
                        variant="primary"
                        disabled={submitting}
                        className="flex-1"
                      >
                        {submitting ? (
                          <>
                            <span className="animate-pulse">Invio in corso...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5 mr-2 inline" />
                            Invia Form
                          </>
                        )}
                      </PublicButton>
                    )}
                  </div>
                )}
              </form>
            </div>

            {/* Cancel Button */}
            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-gray-900 text-sm font-medium inline-flex items-center gap-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Torna alla Home
              </button>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default PublicFormPage;