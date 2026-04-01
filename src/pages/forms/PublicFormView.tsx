/**
 * Public Form View Page
 * Pagina per visualizzare e compilare form pubblici tramite link condiviso
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { formTemplatesService } from '../../services/formTemplates';
import { Button } from '../../design-system/atoms/Button';
import { Input } from '../../design-system/atoms/Input';
import { Card, CardContent } from '../../design-system/molecules/Card';
import { Badge } from '../../design-system/atoms/Badge';
import { AlertCircle, CheckCircle2, Send, ChevronDown, ChevronUp, Lock, User } from 'lucide-react';
import type { FormTemplate, FormField, FormSection } from '../../types/forms';
import { evaluateCondition, isSectionVisible, getVisibleSections } from '../../utils/conditionalLogic';
import { validateForm, getFieldError, hasFieldError, type ValidationError } from '../../utils/formValidation';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';

export function PublicFormView() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [requiresAuth, setRequiresAuth] = useState(false);

  useEffect(() => {
    loadFormTemplate();
  }, [slug]);

  const loadFormTemplate = async () => {
    if (!slug) {
      setError('ID form non valido');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Carica il template pubblico (no auth required)
      const template = await formTemplatesService.getPublicTemplate(slug);
      // Verifica accesso al form
      const canAccessAnonymously = template.isPublic && template.allowAnonymous;
      const canAccessAuthenticated = template.isPublic && isAuthenticated;

      if (!canAccessAnonymously && !canAccessAuthenticated) {
        if (!template.isPublic) {
          setError('Questo form non è pubblicamente accessibile');
        } else {
          setRequiresAuth(true);
          setError('Per compilare questo form devi effettuare il login');
        }
        setLoading(false);
        return;
      }

      // Verifica parametri di scadenza e max submissions (se implementati)
      const expires = searchParams.get('expires');
      const maxSub = searchParams.get('maxSub');

      if (expires && new Date(expires) < new Date()) {
        setError('Questo form è scaduto');
        setLoading(false);
        return;
      }

      setTemplate(template);

      // Pre-compila campi se l'utente è autenticato
      if (isAuthenticated && user) {
        setFormData(prev => ({
          ...prev,
          name: prev.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          email: prev.email || user.email || ''
        }));
      }
    } catch (err: unknown) {
      setError('Errore nel caricamento del form');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!template) return;

    // Valida tutti i campi visibili
    const visibleFields = sections.flatMap(section => section.fields);
    const validation = validateForm(formData, visibleFields.map(f => ({
      name: f.name,
      label: f.label,
      type: f.type,
      required: f.required,
      validation: f.validation
    })));

    setValidationErrors(validation.errors);

    // Se ci sono errori, non inviare
    if (!validation.isValid) {
      setError('Correggi gli errori nel form prima di inviare');
      // Scroll al primo errore
      const firstError = validation.errors[0];
      if (firstError) {
        const element = document.querySelector(`[name="${firstError.field}"]`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Submit solo i dati del form (senza templateId, userId, source)
      // Il service wrappa automaticamente in formData e aggiunge source
      await formTemplatesService.submitForm(template.id, formData);

      setSubmitted(true);

      // Reset form dopo successo
      setFormData({});
      setValidationErrors([]);
    } catch (err: unknown) {

      // Gestisci errori di validazione dal server
      const axiosErr = err as { response?: { data?: { validationErrors?: Array<{ field: string; message: string }> } } };
      if (axiosErr.response?.data?.validationErrors) {
        setValidationErrors(axiosErr.response.data.validationErrors as import('../../utils/formValidation').ValidationError[]);
        setError('Alcuni campi contengono errori. Correggili e riprova.');
      } else {
        setError('Errore nell\'invio del form');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.name] || '';
    const fieldType = (field.type || 'text').toLowerCase();

    // Parse and validate options
    let options: any[] = [];

    if (field.options !== null && field.options !== undefined) {
      if (typeof field.options === 'string') {
        try {
          const parsed = JSON.parse(field.options);
          options = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          options = [];
        }
      } else if (Array.isArray(field.options)) {
        options = field.options;
      } else {
        options = [];
      }
    }

    // Log info for fields with options (solo se ci sono problemi)
    if (['select', 'radio', 'checkbox', 'single_choice', 'multiple_choice'].includes(fieldType) && options.length === 0) {
    }

    switch (fieldType) {
      case 'text':
      case 'email':
      case 'tel':
      case 'number':
        return (
          <Input
            type={field.type}
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className="w-full"
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );

      case 'select':
        if (options.length === 0) {
          return (
            <div className="w-full px-3 py-2 border border-red-300 bg-red-50 rounded-md text-red-600 text-sm">
              ⚠️ Nessuna opzione configurata per questo campo
            </div>
          );
        }
        return (
          <select
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            required={field.required}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleziona...</option>
            {options.map((option: any, idx: number) => (
              <option key={option.value || idx} value={option.value}>
                {option.label || option.value}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
      case 'multiple_choice':
        if (options.length === 0) {
          return (
            <div className="w-full px-3 py-2 border border-red-300 bg-red-50 rounded-md text-red-600 text-sm">
              ⚠️ Nessuna opzione configurata per questo campo
            </div>
          );
        }
        return (
          <div className="space-y-2">
            {options.map((option: any, idx: number) => (
              <label key={option.value || idx} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={(value || []).includes(option.value)}
                  onChange={(e) => {
                    const currentValues = value || [];
                    const newValues = e.target.checked
                      ? [...currentValues, option.value]
                      : currentValues.filter((v: string) => v !== option.value);
                    handleInputChange(field.name, newValues);
                  }}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">{option.label || option.value}</span>
              </label>
            ))}
          </div>
        );

      case 'radio':
      case 'single_choice':
        if (options.length === 0) {
          return (
            <div className="w-full px-3 py-2 border border-red-300 bg-red-50 rounded-md text-red-600 text-sm">
              ⚠️ Nessuna opzione configurata per questo campo
            </div>
          );
        }
        return (
          <div className="space-y-2">
            {options.map((option: any, idx: number) => (
              <label key={option.value || idx} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={field.name}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  className="border-gray-300"
                />
                <span className="text-sm">{option.label || option.value}</span>
              </label>
            ))}
          </div>
        );

      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className="w-full"
          />
        );
    }
  };

  // Organizza i campi per sezioni con conditional logic completa (30 operatori)
  const sections = useMemo(() => {
    if (!template) {
      return [];
    }

    const templateSections = (template.settings?.sections || []) as FormSection[];
    const fields = template.fields || [];

    // Se non ci sono sezioni definite, crea una sezione di default con campi visibili
    if (templateSections.length === 0) {
      const defaultSection = {
        id: 'default',
        title: template.name,
        description: template.description,
        order: 0,
        conditional: undefined,
        collapsible: false,
        fields: fields
          .filter(f => evaluateCondition(f.conditional, formData))
          .sort((a, b) => a.order - b.order)
      };

      return [defaultSection];
    }

    // Step 1: Ottieni sezioni visibili da conditional logic (supporta 30 operatori)
    let visibleSections = getVisibleSections(
      templateSections,
      fields,
      formData
    );

    // Step 2: Aggiungi sezioni collegate da linkedSectionId nelle opzioni selezionate
    const linkedSectionIds = new Set<string>();
    fields.forEach(field => {
      const fieldValue = formData[field.name];
      if (field.options && fieldValue) {
        // Trova le opzioni selezionate
        const selectedOptions = field.options.filter((opt: any) => {
          if (Array.isArray(fieldValue)) {
            return fieldValue.includes(opt.value);
          }
          return opt.value === fieldValue;
        });

        // Aggiungi i linkedSectionId
        selectedOptions.forEach((opt: any) => {
          if (opt.linkedSectionId) {
            linkedSectionIds.add(opt.linkedSectionId);
          }
        });
      }
    });

    // Aggiungi le sezioni linkate se non sono già visibili
    linkedSectionIds.forEach(sectionId => {
      const isAlreadyVisible = visibleSections.some(s => s.id === sectionId);
      if (!isAlreadyVisible) {
        const linkedSection = templateSections.find(s => s.id === sectionId);
        if (linkedSection) {
          const sectionFields = fields
            .filter(f => f.sectionId === sectionId)
            .filter(f => evaluateCondition(f.conditional, formData));

          if (sectionFields.length > 0) {
            visibleSections.push({
              ...linkedSection,
              fields: sectionFields
            });
          }
        }
      }
    });

    // Riordina le sezioni per order
    visibleSections.sort((a, b) => (a.order || 0) - (b.order || 0));

    // Step 3: Aggiungi i campi senza sectionId alla prima sezione visibile
    const fieldsWithoutSection = fields.filter(f => !f.sectionId && evaluateCondition(f.conditional, formData));
    if (fieldsWithoutSection.length > 0 && visibleSections.length > 0) {
      visibleSections[0].fields = [
        ...fieldsWithoutSection.sort((a, b) => a.order - b.order),
        ...visibleSections[0].fields
      ];
    }

    return visibleSections;
  }, [template, formData]);

  // Initialize collapsed state for sections
  useEffect(() => {
    if (template?.settings?.sections) {
      const initialCollapsed: Record<string, boolean> = {};
      (template.settings.sections as FormSection[]).forEach(section => {
        if (section.collapsible && section.defaultCollapsed) {
          initialCollapsed[section.id] = true;
        }
      });
      setCollapsedSections(initialCollapsed);
    }
  }, [template]);

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Multi-step navigation
  const goToNextSection = () => {
    // Check if current section fields are filled (basic validation)
    const currentSection = sections[currentSectionIndex];
    const requiredFields = currentSection.fields.filter(f => f.required);
    const missingFields = requiredFields.filter(f => {
      const value = formData[f.name];
      return !value || (typeof value === 'string' && value.trim() === '') || (Array.isArray(value) && value.length === 0);
    });

    if (missingFields.length > 0) {
      showToast({ message: `Per favore completa tutti i campi richiesti: ${missingFields.map(f => f.label).join(', ')}`, type: 'warning' });
      return;
    }

    // Determine next section based on conditional logic
    let nextIndex = currentSectionIndex + 1;

    // Check if we should skip sections based on form data
    while (nextIndex < sections.length) {
      const nextSection = sections[nextIndex];
      const isVisible = isSectionVisible(nextSection, formData);
      if (isVisible) break;
      nextIndex++;
    }

    if (nextIndex < sections.length) {
      setCurrentSectionIndex(nextIndex);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPreviousSection = () => {
    let prevIndex = currentSectionIndex - 1;

    // Skip hidden sections when going back
    while (prevIndex >= 0) {
      const prevSection = sections[prevIndex];
      const isVisible = isSectionVisible(prevSection, formData);
      if (isVisible) break;
      prevIndex--;
    }

    if (prevIndex >= 0) {
      setCurrentSectionIndex(prevIndex);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">Caricamento form...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Debug: check sections
  if (template && sections.length === 0) {
  }

  if (error || !template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8">
            {requiresAuth ? (
              <div className="text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-8 h-8 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Autenticazione richiesta
                  </h2>
                  <p className="text-gray-600 mb-6">
                    {error}
                  </p>
                  <Button
                    onClick={() => window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname)}
                    variant="primary"
                  >
                    Vai al Login
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="w-6 h-6" />
                <div>
                  <h2 className="text-lg font-semibold">Errore</h2>
                  <p className="text-sm">{error || 'Form non trovato'}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Grazie per la tua risposta!
              </h2>
              <p className="text-gray-600">
                {(template.settings as any)?.successMessage || 'Il tuo form è stato inviato con successo.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
                  {template.description && (
                    <p className="text-gray-600 mt-2">{template.description}</p>
                  )}
                </div>
                {template.isPublic && (
                  <Badge variant="default" size="sm">
                    Pubblico
                  </Badge>
                )}
              </div>

              {/* Authentication Status Banner */}
              {isAuthenticated && user ? (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-900">
                    Stai compilando come <strong>{user.firstName} {user.lastName}</strong> ({user.email})
                  </span>
                </div>
              ) : template.allowAnonymous ? (
                <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-700">
                    Stai compilando in modalità anonima
                  </span>
                </div>
              ) : null}
            </div>

            {/* Form - Wizard Mode */}
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              {/* Progress Indicator */}
              {sections.length > 1 && (
                <div className="mb-8">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>Sezione {currentSectionIndex + 1} di {sections.length}</span>
                    <span>{Math.round(((currentSectionIndex + 1) / sections.length) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${((currentSectionIndex + 1) / sections.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Current Section */}
              {sections.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Nessun campo disponibile
                  </h3>
                  <p className="text-sm text-gray-600">
                    Questo form non ha campi configurati o tutti i campi sono nascosti.
                  </p>
                </div>
              ) : sections[currentSectionIndex] ? (
                <div className="space-y-6">
                  {/* Section Header */}
                  <div className="border-b border-gray-200 pb-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {sections[currentSectionIndex].title}
                    </h2>
                    {sections[currentSectionIndex].description && (
                      <p className="text-sm text-gray-600 mt-2">
                        {sections[currentSectionIndex].description}
                      </p>
                    )}
                  </div>

                  {/* Section Fields */}
                  <div className="space-y-6">
                    {sections[currentSectionIndex].fields.map((field: FormField) => {
                      const fieldError = getFieldError(field.name, validationErrors);
                      const hasError = hasFieldError(field.name, validationErrors);

                      return (
                        <div key={field.id || field.name} className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <div className={hasError ? 'ring-2 ring-red-500 rounded-md' : ''}>
                            {renderField(field)}
                          </div>
                          {fieldError && (
                            <p className="text-sm text-red-600 flex items-center gap-1">
                              <AlertCircle className="w-4 h-4" />
                              {fieldError}
                            </p>
                          )}
                          {!fieldError && field.helpText && (
                            <p className="text-xs text-gray-500">{field.helpText}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
                  <p className="text-gray-600">Sezione non trovata (index: {currentSectionIndex})</p>
                </div>
              )}

              {/* Navigation Buttons */}
              {sections.length > 0 && (
                <div className="pt-6 border-t border-gray-200 flex gap-3">
                  {currentSectionIndex > 0 && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      onClick={goToPreviousSection}
                      className="flex-1"
                    >
                      Indietro
                    </Button>
                  )}

                  {currentSectionIndex < sections.length - 1 ? (
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      onClick={goToNextSection}
                      className="flex-1"
                    >
                      Avanti
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="flex-1"
                      loading={submitting}
                      leftIcon={<Send className="w-4 h-4" />}
                    >
                      Invia
                    </Button>
                  )}
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default PublicFormView;
