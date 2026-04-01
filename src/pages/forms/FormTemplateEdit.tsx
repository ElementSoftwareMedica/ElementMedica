/**
 * Form Template Editor - Optimized Version
 * Features:
 * - Drag & drop fields between sections
 * - Link multiple choice options to sections
 * - Compact, user-friendly UI
 * - Full validation and conditional logic support
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Button
} from '../../design-system/atoms/Button';
import {
  Plus, Trash2, GripVertical, ChevronDown, ChevronUp,
  Settings, Link2, Save, ArrowLeft, Eye, EyeOff,
  BookOpen, Users, GraduationCap, ClipboardCheck, Timer
} from 'lucide-react';
import { formTemplatesService } from '../../services/formTemplates';
import { useToast } from '../../hooks/useToast';
import { getFieldTypeInfo } from '../../components/forms/FieldTypeSelector';
import { getCourses } from '../../services/courses';
import { getCourseTestAssignments, type CourseTestAssignment } from '../../services/courseTestsService';

// Type alias for Course from the courses service
type Course = { id: string; title: string; code?: string | null };

interface FieldOption {
  value: string;
  label: string;
  linkedSectionId?: string; // Collegamento a sezione
  maxCapacity?: number;
  isCorrect?: boolean;
  points?: number;
}

interface FormField {
  id: string;
  name: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  sectionId?: string;
  options?: FieldOption[];
  validation?: any;
  conditional?: any;
  enableCapacityLimit?: boolean;
  enableQuizMode?: boolean;
  helpText?: string;
  entityMapping?: any;
}

interface FormSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  conditional?: any;
}

// Configurazione per associare il form come test a corsi/formatori
interface TestAssignmentConfig {
  enabled: boolean;
  targetType: 'course' | 'trainer' | 'both';
  courseBinding: {
    specificCourseId?: string | null;
    riskLevels: ('ALTO' | 'MEDIO' | 'BASSO')[];
    courseTypes: ('PRIMO_CORSO' | 'AGGIORNAMENTO')[];
    allCourses: boolean;
  };
  testType: 'INITIAL' | 'FINAL' | 'INTERMEDIATE' | 'ASSESSMENT' | 'CERTIFICATION' | 'TRAINER_EVALUATION';
  isRequired: boolean;
  passingScore?: number | null;
  timeLimit?: number | null;
  existingAssignments?: CourseTestAssignment[];
}

interface FormTemplateData {
  name: string;
  description: string;
  type: string;
  isPublic: boolean;
  allowAnonymous: boolean;
  fields: FormField[];
  sections: FormSection[];
  successMessage?: string;
  redirectUrl?: string;
  testAssignment?: TestAssignmentConfig;
}

const FormTemplateEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  // Detect context: CMS management or Test section
  const contextBasePath = location.pathname.includes('/management/cms')
    ? '/management/cms/forms'
    : '/test';
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [draggedField, setDraggedField] = useState<string | null>(null);
  const [dragOverField, setDragOverField] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [editingField, setEditingField] = useState<string | null>(null);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  const [formData, setFormData] = useState<FormTemplateData>({
    name: '',
    description: '',
    type: 'CUSTOM_FORM',
    isPublic: false,
    allowAnonymous: false,
    fields: [],
    sections: [{
      id: 'section-1',
      title: 'Sezione Principale',
      description: 'Domande del form',
      order: 0,
      collapsible: false,
      defaultCollapsed: false
    }],
    testAssignment: {
      enabled: false,
      targetType: 'course',
      courseBinding: {
        specificCourseId: null,
        riskLevels: [],
        courseTypes: [],
        allCourses: false
      },
      testType: 'INITIAL',
      isRequired: true,
      passingScore: null,
      timeLimit: null,
      existingAssignments: []
    }
  });

  // Carica corsi disponibili quando si abilita la sezione test
  useEffect(() => {
    if (formData.testAssignment?.enabled && availableCourses.length === 0) {
      setLoadingCourses(true);
      getCourses()
        .then(courses => setAvailableCourses(courses))
        .catch(() => showToast({ message: 'Impossibile caricare i corsi disponibili', type: 'error' }))
        .finally(() => setLoadingCourses(false));
    }
  }, [formData.testAssignment?.enabled, availableCourses.length]);

  useEffect(() => {
    if (id) loadFormTemplate();
  }, [id]);

  const loadFormTemplate = async () => {
    if (!id) return;

    try {
      setInitialLoading(true);
      const template = await formTemplatesService.getFormTemplate(id);

      const sections = template.settings?.sections || [{
        id: 'section-1',
        title: 'Sezione Principale',
        description: 'Domande del form',
        order: 0,
        collapsible: false
      }];

      // Carica le associazioni test esistenti per questo template
      let existingAssignments: CourseTestAssignment[] = [];
      let testAssignmentConfig: TestAssignmentConfig = {
        enabled: false,
        targetType: 'course',
        courseBinding: {
          specificCourseId: null,
          riskLevels: [],
          courseTypes: [],
          allCourses: false
        },
        testType: 'INITIAL',
        isRequired: true,
        passingScore: null,
        timeLimit: null,
        existingAssignments: []
      };

      try {
        const assignments = await getCourseTestAssignments({ formTemplateId: id } as any);
        if (assignments && assignments.length > 0) {
          existingAssignments = assignments;
          const first = assignments[0];
          testAssignmentConfig = {
            enabled: true,
            targetType: first.testType === 'ASSESSMENT' ? 'trainer' : 'course',
            courseBinding: {
              specificCourseId: first.courseId || null,
              riskLevels: first.riskLevel ? [first.riskLevel as any] : [],
              courseTypes: first.courseType ? [first.courseType as any] : [],
              allCourses: !first.courseId && !first.riskLevel && !first.courseType
            },
            testType: first.testType as any,
            isRequired: first.isRequired,
            passingScore: first.passingScore || null,
            timeLimit: first.timeLimit || null,
            existingAssignments
          };
        }
      } catch (err) {
        // No test assignments found for this template
      }

      // Assegna i campi senza sectionId alla prima sezione (campi caricati dal DB potrebbero non averlo)
      const defaultSectionId = sections[0]?.id || 'section-1';
      const fieldsWithSection = (template.fields || []).map((f: any) => ({
        ...f,
        sectionId: f.sectionId || defaultSectionId
      }));

      setFormData({
        name: template.name,
        description: template.description || '',
        type: template.type || 'CUSTOM_FORM',
        isPublic: template.isPublic || false,
        allowAnonymous: template.allowAnonymous || false,
        fields: fieldsWithSection,
        sections,
        successMessage: (template as any).successMessage || '',
        redirectUrl: (template as any).redirectUrl || '',
        testAssignment: testAssignmentConfig
      });
    } catch (error) {
      showToast({ message: 'Errore nel caricamento', type: 'error' });
      navigate(contextBasePath);
    } finally {
      setInitialLoading(false);
    }
  };

  // SEZIONI
  const addSection = () => {
    const newSection: FormSection = {
      id: `section-${Date.now()}`,
      title: `Sezione ${formData.sections.length + 1}`,
      description: '',
      order: formData.sections.length,
      collapsible: true,
      defaultCollapsed: false
    };
    setFormData(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
  };

  const updateSection = (sectionId: string, updates: Partial<FormSection>) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId ? { ...s, ...updates } : s
      )
    }));
  };

  const deleteSection = (sectionId: string) => {
    if (formData.sections.length === 1) {
      showToast({ message: 'Deve esserci almeno una sezione', type: 'error' });
      return;
    }

    // Sposta i campi della sezione eliminata alla prima sezione
    const firstSectionId = formData.sections.find(s => s.id !== sectionId)?.id;

    setFormData(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== sectionId),
      fields: prev.fields.map(f =>
        f.sectionId === sectionId ? { ...f, sectionId: firstSectionId } : f
      )
    }));
  };

  const toggleSectionCollapse = (sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // CAMPI
  const addField = (sectionId: string) => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      name: `campo_${formData.fields.length + 1}`,
      type: 'text',
      label: 'Nuovo Campo',
      placeholder: '',
      required: false,
      sectionId
    };

    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
    setEditingField(newField.id);
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(f => {
        if (f.id === fieldId) {
          const updated = { ...f, ...updates };
          // Auto-genera name da label
          if (updates.label) {
            updated.name = updates.label
              .toLowerCase()
              .replace(/\s+/g, '_')
              .replace(/[^a-z0-9_]/g, '');
          }
          // Se si attiva quiz mode, aggiungi points=1 a tutte le opzioni esistenti
          if (updates.enableQuizMode === true && f.options && f.options.length > 0) {
            updated.options = f.options.map(opt => ({
              ...opt,
              points: opt.points !== undefined ? opt.points : 1
            }));
          }
          // Se si disattiva quiz mode, rimuovi points dalle opzioni
          if (updates.enableQuizMode === false && f.options) {
            updated.options = f.options.map(opt => {
              const { points, ...rest } = opt;
              return rest as FieldOption;
            });
          }
          return updated;
        }
        return f;
      })
    }));
  };

  const deleteField = (fieldId: string) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== fieldId)
    }));
  };

  const moveFieldToSection = (fieldId: string, targetSectionId: string) => {
    updateField(fieldId, { sectionId: targetSectionId });
  };

  // DRAG & DROP
  const handleDragStart = (fieldId: string) => {
    setDraggedField(fieldId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragOverField = (e: React.DragEvent, targetFieldId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedField || draggedField === targetFieldId) return;

    // Calcola se drop prima o dopo basato sulla posizione del mouse
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const position = e.clientY < midpoint ? 'before' : 'after';

    setDragOverField(targetFieldId);
    setDropPosition(position);
  };

  const handleDragLeaveField = () => {
    setDragOverField(null);
    setDropPosition(null);
  };

  const handleDropOnField = (e: React.DragEvent, targetFieldId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedField || draggedField === targetFieldId) {
      setDraggedField(null);
      setDragOverField(null);
      setDropPosition(null);
      return;
    }

    const draggedFieldObj = formData.fields.find(f => f.id === draggedField);
    const targetFieldObj = formData.fields.find(f => f.id === targetFieldId);

    if (!draggedFieldObj || !targetFieldObj) return;

    // Riordina i campi
    setFormData(prev => {
      const fields = prev.fields.filter(f => f.id !== draggedField);
      const targetIndex = fields.findIndex(f => f.id === targetFieldId);

      // Inserisci prima o dopo in base a dropPosition
      const insertIndex = dropPosition === 'before' ? targetIndex : targetIndex + 1;
      fields.splice(insertIndex, 0, { ...draggedFieldObj, sectionId: targetFieldObj.sectionId });

      return { ...prev, fields };
    });

    setDraggedField(null);
    setDragOverField(null);
    setDropPosition(null);
  };

  const handleDrop = (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault();
    if (draggedField) {
      moveFieldToSection(draggedField, targetSectionId);
      setDraggedField(null);
      setDragOverField(null);
      setDropPosition(null);
    }
  };

  // OPZIONI CON LINK A SEZIONI
  const updateFieldOption = (fieldId: string, optionIndex: number, updates: Partial<FieldOption>) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(f => {
        if (f.id === fieldId && f.options) {
          const newOptions = [...f.options];
          newOptions[optionIndex] = { ...newOptions[optionIndex], ...updates };
          return { ...f, options: newOptions };
        }
        return f;
      })
    }));
  };

  const addFieldOption = (fieldId: string) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(f => {
        if (f.id === fieldId) {
          const options = f.options || [];
          const newOption: FieldOption = {
            value: `opzione_${options.length + 1}`,
            label: `Opzione ${options.length + 1}`,
            points: f.enableQuizMode ? 1 : undefined // Default 1 punto per quiz
          };
          return {
            ...f,
            options: [...options, newOption]
          };
        }
        return f;
      })
    }));
  };

  const deleteFieldOption = (fieldId: string, optionIndex: number) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(f => {
        if (f.id === fieldId && f.options) {
          return {
            ...f,
            options: f.options.filter((_, idx) => idx !== optionIndex)
          };
        }
        return f;
      })
    }));
  };

  // SALVATAGGIO
  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      showToast({ message: 'Il nome del template è obbligatorio', type: 'error' });
      return;
    }

    if (formData.fields.length === 0) {
      showToast({ message: 'Aggiungi almeno un campo', type: 'error' });
      return;
    }

    if (!id) return;

    setLoading(true);
    try {
      const updateData: any = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        isPublic: formData.isPublic,
        allowAnonymous: formData.allowAnonymous,
        settings: {
          sections: formData.sections
        },
        fields: formData.fields.map((f, index) => {
          const field: any = {
            name: f.name,
            label: f.label,
            type: f.type,
            required: f.required,
            order: index,
            isActive: true
          };

          // Aggiungi solo campi valorizzati (tranne options che deve sempre essere presente per alcuni tipi)
          if (f.placeholder) field.placeholder = f.placeholder;
          if (f.helpText) field.helpText = f.helpText;
          if (f.sectionId) field.sectionId = f.sectionId;
          if (f.validation) field.validation = f.validation;
          if (f.conditional) field.conditional = f.conditional;
          if (f.entityMapping) field.entityMapping = f.entityMapping;
          if (f.enableCapacityLimit !== undefined) field.enableCapacityLimit = f.enableCapacityLimit;
          if (f.enableQuizMode !== undefined) field.enableQuizMode = f.enableQuizMode;

          // Gestione options: SEMPRE includi per campi che supportano opzioni
          const hasOptionsType = ['select', 'radio', 'checkbox', 'multiple_choice', 'single_choice'].includes(f.type);
          if (hasOptionsType) {
            if (f.options && f.options.length > 0) {
              field.options = f.options.map((opt: any) => {
                const { points, ...rest } = opt;
                return points !== null && points !== undefined ? { ...rest, points } : rest;
              });
            } else {
              field.options = []; // Array vuoto invece di undefined/null
            }
          }

          return field;
        }),
        redirectUrl: formData.redirectUrl || ''
      };

      // Aggiungi successMessage solo se valorizzato
      if (formData.successMessage) {
        updateData.successMessage = formData.successMessage;
      }

      await formTemplatesService.updateFormTemplate(id, updateData);
      showToast({ message: 'Template salvato con successo!', type: 'success' });
      navigate(contextBasePath);
    } catch (error: unknown) {
      showToast({ message: 'Errore nel salvataggio del template', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  const getFieldsBySection = (sectionId: string) => {
    return formData.fields.filter(f => f.sectionId === sectionId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate(contextBasePath)}
                className="flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Indietro
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{formData.name || 'Modifica Template'}</h1>
                <p className="text-sm text-gray-500">{formData.fields.length} campi • {formData.sections.length} sezioni</p>
              </div>
            </div>
            <Button onClick={handleSubmit} disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Salvataggio...' : 'Salva'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Configurazione Template */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Configurazione Template</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Template *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Es. Iscrizione Corso"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Breve descrizione"
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Accesso e Privacy</label>
              <div className="space-y-2">
                {/* Opzione 1: Form privato con dati utente */}
                <label className="flex items-start p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="accessType"
                    checked={!formData.isPublic && !formData.allowAnonymous}
                    onChange={() => setFormData(prev => ({ ...prev, isPublic: false, allowAnonymous: false }))}
                    className="mt-0.5 mr-3"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">🔒 Autenticato con raccolta dati</div>
                    <div className="text-xs text-gray-500">Richiede login e raccoglie informazioni sull'utente (nome, email)</div>
                  </div>
                </label>

                {/* Opzione 2: Form privato anonimo */}
                <label className="flex items-start p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="accessType"
                    checked={!formData.isPublic && formData.allowAnonymous}
                    onChange={() => setFormData(prev => ({ ...prev, isPublic: false, allowAnonymous: true }))}
                    className="mt-0.5 mr-3"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">🔒 Autenticato anonimo</div>
                    <div className="text-xs text-gray-500">Richiede login ma non raccoglie informazioni sull'utente</div>
                  </div>
                </label>

                {/* Opzione 3: Form pubblico */}
                <label className="flex items-start p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="accessType"
                    checked={formData.isPublic}
                    onChange={() => setFormData(prev => ({ ...prev, isPublic: true, allowAnonymous: true }))}
                    className="mt-0.5 mr-3"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">🌐 Pubblico (senza login)</div>
                    <div className="text-xs text-gray-500">Chiunque con il link può compilare senza autenticazione</div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Sezioni e Campi */}
        <div className="space-y-4">
          {formData.sections
            .sort((a, b) => a.order - b.order)
            .map((section, sectionIndex) => {
              const sectionFields = getFieldsBySection(section.id);
              const isCollapsed = collapsedSections.has(section.id);

              return (
                <div
                  key={section.id}
                  className="bg-white rounded-lg shadow-sm overflow-hidden"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, section.id)}
                >
                  {/* Section Header */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <button
                          onClick={() => toggleSectionCollapse(section.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                        </button>
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => updateSection(section.id, { title: e.target.value })}
                          className="font-semibold text-blue-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                          placeholder="Titolo sezione"
                        />
                        <span className="text-sm text-blue-600">
                          {sectionFields.length} campo/i
                        </span>
                        {section.conditional && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                            🔀 Condizionale
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addField(section.id)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Campo
                        </Button>
                        {formData.sections.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSection(section.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <input
                      type="text"
                      value={section.description || ''}
                      onChange={(e) => updateSection(section.id, { description: e.target.value })}
                      className="mt-2 w-full text-sm text-blue-700 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                      placeholder="Descrizione opzionale..."
                    />
                  </div>

                  {/* Section Fields */}
                  {!isCollapsed && (
                    <div className="p-4 space-y-3">
                      {sectionFields.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                          <p>Nessun campo in questa sezione</p>
                          <p className="text-sm mt-1">Trascina campi qui o clicca "+ Campo"</p>
                        </div>
                      ) : (
                        sectionFields.map((field) => (
                          <FieldCard
                            key={field.id}
                            field={field}
                            isEditing={editingField === field.id}
                            isDragging={draggedField === field.id}
                            isDragOver={dragOverField === field.id}
                            dropPosition={dragOverField === field.id ? dropPosition : null}
                            sections={formData.sections}
                            allFields={formData.fields}
                            onEdit={() => setEditingField(field.id)}
                            onCollapse={() => setEditingField(null)}
                            onUpdate={(updates) => updateField(field.id, updates)}
                            onDelete={() => deleteField(field.id)}
                            onDragStart={() => handleDragStart(field.id)}
                            onDragOver={(e) => handleDragOverField(e, field.id)}
                            onDragLeave={handleDragLeaveField}
                            onDrop={(e) => handleDropOnField(e, field.id)}
                            onAddOption={() => addFieldOption(field.id)}
                            onUpdateOption={(idx, updates) => updateFieldOption(field.id, idx, updates)}
                            onDeleteOption={(idx) => deleteFieldOption(field.id, idx)}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}

          {/* Add Section Button */}
          <button
            onClick={addSection}
            className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-gray-600 hover:text-blue-600 font-medium"
          >
            <Plus className="w-5 h-5 inline mr-2" />
            Aggiungi Sezione
          </button>
        </div>
      </div>
    </div>
  );
};

// Field Card Component
interface FieldCardProps {
  field: FormField;
  isEditing: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  dropPosition: 'before' | 'after' | null;
  sections: FormSection[];
  allFields: FormField[];
  onEdit: () => void;
  onCollapse: () => void;
  onUpdate: (updates: Partial<FormField>) => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onAddOption: () => void;
  onUpdateOption: (index: number, updates: Partial<FieldOption>) => void;
  onDeleteOption: (index: number) => void;
}

const FieldCard: React.FC<FieldCardProps> = ({
  field,
  isEditing,
  isDragging,
  isDragOver,
  dropPosition,
  sections,
  allFields,
  onEdit,
  onCollapse,
  onUpdate,
  onDelete,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onAddOption,
  onUpdateOption,
  onDeleteOption
}) => {
  const [showConditional, setShowConditional] = React.useState(false);
  const [showValidation, setShowValidation] = React.useState(false);

  const typeInfo = getFieldTypeInfo(field.type);
  const hasOptions = ['select', 'radio', 'checkbox', 'multiple_choice'].includes(field.type);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`
        relative border rounded-lg bg-white transition-all
        ${isDragging ? 'opacity-40 border-blue-500' : 'border-gray-200'}
        ${isDragOver ? 'shadow-lg' : 'hover:shadow-md'}
      `}
    >
      {/* Indicatore drop position */}
      {isDragOver && dropPosition && (
        <div
          className={`absolute left-0 right-0 h-1 bg-blue-500 z-10 ${dropPosition === 'before' ? '-top-0.5' : '-bottom-0.5'
            }`}
        />
      )}

      <div
        className="flex items-center p-3 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={(e) => {
          // Non espandere se si clicca su un bottone specifico
          if ((e.target as HTMLElement).closest('button')) return;
          isEditing ? onCollapse() : onEdit();
        }}
      >
        <GripVertical
          className="w-4 h-4 text-gray-400 cursor-move mr-2"
          onMouseDown={(e) => e.stopPropagation()}
        />
        <div className="flex-1 flex items-center space-x-2">
          <span className="font-medium text-gray-900">{field.label}</span>
          <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">{field.type}</span>
          {field.required && <span className="text-xs text-red-600 font-bold">*</span>}
          {field.conditional && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">🔀</span>
          )}
          {field.validation && (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">✓</span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-red-600 hover:text-red-800"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Etichetta *</label>
              <input
                type="text"
                value={field.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={field.type}
                onChange={(e) => onUpdate({ type: e.target.value })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              >
                <option value="text">Testo</option>
                <option value="email">Email</option>
                <option value="tel">Telefono</option>
                <option value="number">Numero</option>
                <option value="textarea">Area di Testo</option>
                <option value="select">Select</option>
                <option value="radio">Radio</option>
                <option value="checkbox">Checkbox</option>
                <option value="date">Data</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Placeholder</label>
            <input
              type="text"
              value={field.placeholder || ''}
              onChange={(e) => onUpdate({ placeholder: e.target.value })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              placeholder="Testo di aiuto..."
            />
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => onUpdate({ required: e.target.checked })}
                className="mr-2"
              />
              Campo obbligatorio
            </label>

            {hasOptions && (
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={field.enableQuizMode || false}
                  onChange={(e) => onUpdate({ enableQuizMode: e.target.checked })}
                  className="mr-2"
                />
                Modalità Quiz
              </label>
            )}
          </div>

          {/* Opzioni con link a sezioni */}
          {hasOptions && (
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-gray-700">Opzioni</label>
                <button
                  onClick={onAddOption}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Aggiungi
                </button>
              </div>
              <div className="space-y-3">
                {(field.options || []).map((option, idx) => (
                  <div key={idx} className="border border-gray-200 rounded p-2 space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={option.label}
                        onChange={(e) => onUpdateOption(idx, { label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                        placeholder="Etichetta opzione"
                      />
                      <button
                        onClick={() => onDeleteOption(idx)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Collega a sezione:</label>
                        <select
                          value={option.linkedSectionId || ''}
                          onChange={(e) => onUpdateOption(idx, { linkedSectionId: e.target.value || undefined })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                        >
                          <option value="">Nessun link</option>
                          {sections.map(s => (
                            <option key={s.id} value={s.id}>→ {s.title}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Capacità massima:</label>
                        <input
                          type="number"
                          value={option.maxCapacity || ''}
                          onChange={(e) => onUpdateOption(idx, { maxCapacity: e.target.value ? parseInt(e.target.value) : undefined })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          placeholder="Illimitato"
                          min="1"
                          title="Numero massimo di utenti che possono selezionare questa opzione"
                        />
                      </div>
                    </div>

                    {field.enableQuizMode && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
                        <div>
                          <label className="flex items-center text-xs text-gray-600">
                            <input
                              type="checkbox"
                              checked={option.isCorrect || false}
                              onChange={(e) => onUpdateOption(idx, { isCorrect: e.target.checked })}
                              className="mr-2"
                            />
                            Risposta corretta
                          </label>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Punteggio:</label>
                          <input
                            type="number"
                            value={option.points !== undefined ? option.points : 1}
                            onChange={(e) => onUpdateOption(idx, { points: e.target.value ? parseInt(e.target.value) : 1 })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                            placeholder="1"
                            min="0"
                            title="Punti assegnati per questa risposta"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-xs text-blue-600 mt-2 space-y-1">
                <p>💡 <strong>Link sezione:</strong> mostra la sezione collegata quando l'utente seleziona l'opzione</p>
                <p>💡 <strong>Capacità massima:</strong> limita il numero di utenti che possono scegliere questa opzione</p>
                {field.enableQuizMode && (
                  <>
                    <p className="text-green-600">🎯 <strong>Modalità Quiz attiva:</strong></p>
                    <p className="ml-4">• <strong>Risposta corretta:</strong> segna le risposte giuste</p>
                    <p className="ml-4">• <strong>Punteggio:</strong> punti assegnati per ogni risposta</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Conditional Logic Editor - Espandibile */}
          <div className="border-t pt-3">
            <button
              onClick={() => setShowConditional(!showConditional)}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="text-xs font-medium text-gray-700">
                🔀 Logica Condizionale
                {field.conditional && <span className="ml-2 text-yellow-600">(attiva)</span>}
              </span>
              {showConditional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showConditional && (
              <div className="mt-2">
                <ConditionalEditor
                  conditional={field.conditional}
                  onChange={(conditional) => onUpdate({ conditional })}
                  availableFields={allFields.filter(f => f.id !== field.id)}
                />
              </div>
            )}
          </div>

          {/* Validation Rules Editor - Espandibile */}
          <div className="border-t pt-3">
            <button
              onClick={() => setShowValidation(!showValidation)}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="text-xs font-medium text-gray-700">
                ✓ Regole di Validazione
                {field.validation && Object.keys(field.validation).length > 0 && (
                  <span className="ml-2 text-green-600">({Object.keys(field.validation).length} attive)</span>
                )}
              </span>
              {showValidation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showValidation && (
              <div className="mt-2">
                <ValidationEditor
                  validation={field.validation}
                  fieldType={field.type}
                  onChange={(validation) => onUpdate({ validation })}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Conditional Editor Component
interface ConditionalEditorProps {
  conditional?: any;
  onChange: (conditional: any) => void;
  availableFields: FormField[];
}

const ConditionalEditor: React.FC<ConditionalEditorProps> = ({ conditional, onChange, availableFields }) => {
  const [enabled, setEnabled] = useState(!!conditional);
  const [operator, setOperator] = useState(conditional?.operator || 'equals');
  const [targetField, setTargetField] = useState(conditional?.field || '');
  const [targetValue, setTargetValue] = useState(conditional?.value || '');

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    if (!checked) {
      onChange(undefined);
    } else {
      onChange({
        type: 'simple',
        operator,
        field: targetField,
        value: targetValue
      });
    }
  };

  const handleUpdate = () => {
    if (!enabled) return;
    onChange({
      type: 'simple',
      operator,
      field: targetField,
      value: targetValue
    });
  };

  React.useEffect(() => {
    handleUpdate();
  }, [operator, targetField, targetValue]);

  return (
    <div className="space-y-2">
      <label className="flex items-center text-xs">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => handleToggle(e.target.checked)}
          className="mr-2"
        />
        Mostra campo solo se...
      </label>

      {enabled && (
        <div className="grid grid-cols-3 gap-2">
          <select
            value={targetField}
            onChange={(e) => setTargetField(e.target.value)}
            className="px-2 py-1 text-xs border border-gray-300 rounded"
          >
            <option value="">Campo...</option>
            {availableFields.map(f => (
              <option key={f.id} value={f.name}>{f.label}</option>
            ))}
          </select>

          <select
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            className="px-2 py-1 text-xs border border-gray-300 rounded"
          >
            <option value="equals">uguale a</option>
            <option value="notEquals">diverso da</option>
            <option value="contains">contiene</option>
            <option value="greaterThan">&gt;</option>
            <option value="lessThan">&lt;</option>
            <option value="greaterOrEqual">&gt;=</option>
            <option value="lessOrEqual">&lt;=</option>
            <option value="isEmpty">vuoto</option>
            <option value="isNotEmpty">non vuoto</option>
          </select>

          {!['isEmpty', 'isNotEmpty'].includes(operator) && (
            <input
              type="text"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-300 rounded"
              placeholder="Valore..."
            />
          )}
        </div>
      )}
    </div>
  );
};

// Validation Editor Component
interface ValidationEditorProps {
  validation?: any;
  fieldType: string;
  onChange: (validation: any) => void;
}

const ValidationEditor: React.FC<ValidationEditorProps> = ({ validation, fieldType, onChange }) => {
  const [rules, setRules] = useState<any>(validation || {});

  const handleRuleChange = (ruleName: string, value: any) => {
    const newRules = { ...rules, [ruleName]: value };
    // Rimuovi regole vuote
    if (value === '' || value === undefined || value === null) {
      delete newRules[ruleName];
    }
    setRules(newRules);
    onChange(Object.keys(newRules).length > 0 ? newRules : undefined);
  };

  const getAvailableRules = () => {
    if (['text', 'textarea'].includes(fieldType)) {
      return [
        { name: 'minLength', label: 'Lunghezza minima', type: 'number' },
        { name: 'maxLength', label: 'Lunghezza massima', type: 'number' },
        { name: 'pattern', label: 'Pattern (regex)', type: 'text' },
        { name: 'alphanumeric', label: 'Solo alfanumerico', type: 'boolean' },
        { name: 'noSpecialChars', label: 'Nessun carattere speciale', type: 'boolean' },
      ];
    }

    if (fieldType === 'number') {
      return [
        { name: 'minValue', label: 'Valore minimo', type: 'number' },
        { name: 'maxValue', label: 'Valore massimo', type: 'number' },
        { name: 'integer', label: 'Solo numeri interi', type: 'boolean' },
        { name: 'positive', label: 'Solo numeri positivi', type: 'boolean' },
      ];
    }

    if (fieldType === 'email') {
      return [
        { name: 'email', label: 'Formato email valido', type: 'boolean' },
        { name: 'minLength', label: 'Lunghezza minima', type: 'number' },
        { name: 'maxLength', label: 'Lunghezza massima', type: 'number' },
        { name: 'allowedDomains', label: 'Domini consentiti (es: gmail.com,yahoo.it)', type: 'text' },
      ];
    }

    if (fieldType === 'tel') {
      return [
        { name: 'phone', label: 'Formato telefono valido', type: 'boolean' },
        { name: 'pattern', label: 'Pattern (regex)', type: 'text' },
        { name: 'minLength', label: 'Lunghezza minima', type: 'number' },
        { name: 'maxLength', label: 'Lunghezza massima', type: 'number' },
      ];
    }

    if (fieldType === 'date') {
      return [
        { name: 'minDate', label: 'Data minima', type: 'date' },
        { name: 'maxDate', label: 'Data massima', type: 'date' },
        { name: 'futureOnly', label: 'Solo date future', type: 'boolean' },
        { name: 'pastOnly', label: 'Solo date passate', type: 'boolean' },
      ];
    }

    if (['radio', 'select', 'checkbox'].includes(fieldType)) {
      return [
        { name: 'minSelections', label: 'Selezioni minime', type: 'number' },
        { name: 'maxSelections', label: 'Selezioni massime', type: 'number' },
      ];
    }

    if (fieldType === 'file') {
      return [
        { name: 'maxSize', label: 'Dimensione massima (MB)', type: 'number' },
        { name: 'allowedExtensions', label: 'Estensioni consentite (es: pdf,doc,jpg)', type: 'text' },
        { name: 'maxFiles', label: 'Numero massimo file', type: 'number' },
      ];
    }

    if (fieldType === 'url') {
      return [
        { name: 'url', label: 'Formato URL valido', type: 'boolean' },
        { name: 'requireProtocol', label: 'Richiedi protocollo (https://)', type: 'boolean' },
      ];
    }

    return [];
  };

  const availableRules = getAvailableRules();

  return (
    <div className="space-y-2">
      {availableRules.length === 0 ? (
        <p className="text-xs text-gray-500">Nessuna regola disponibile per questo tipo di campo</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {availableRules.map(rule => (
            <div key={rule.name} className="flex items-center space-x-2">
              {rule.type === 'boolean' ? (
                <label className="flex items-center text-xs">
                  <input
                    type="checkbox"
                    checked={!!rules[rule.name]}
                    onChange={(e) => handleRuleChange(rule.name, e.target.checked)}
                    className="mr-2"
                  />
                  {rule.label}
                </label>
              ) : (
                <>
                  <label className="text-xs text-gray-700 whitespace-nowrap">{rule.label}:</label>
                  <input
                    type={rule.type}
                    value={rules[rule.name] || ''}
                    onChange={(e) => handleRuleChange(rule.name, e.target.value)}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                    placeholder={rule.type === 'number' ? '0' : 'Valore...'}
                  />
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {Object.keys(rules).length > 0 && (
        <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-800">
          ✓ {Object.keys(rules).length} regola/e attiva/e
        </div>
      )}
    </div>
  );
};

export default FormTemplateEdit;
