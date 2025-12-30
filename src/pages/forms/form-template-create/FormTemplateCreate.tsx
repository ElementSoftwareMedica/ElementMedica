/**
 * FormTemplateCreate - Main Component
 * 
 * Form Template Creator - Based on Optimized Edit Version
 * Features:
 * - Drag & drop fields between sections
 * - Link multiple choice options to sections  
 * - Compact, user-friendly UI
 * - Full validation and conditional logic support
 * - Quiz mode with scoring
 * - Advanced validation rules (20+)
 * 
 * Refactored from 1615-line monolithic component into modular structure.
 * 
 * @module pages/forms/form-template-create/FormTemplateCreate
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../design-system/atoms/Button';
import {
    Plus,
    Trash2,
    ChevronDown,
    ChevronUp,
    Save,
    ArrowLeft
} from 'lucide-react';
import { formTemplatesService } from '../../../services/formTemplates';
import { useToast } from '../../../hooks/useToast';
import { getCourses } from '../../../services/courses';
import type { Course } from '../../../types/courses';

// Modular components
import FieldCard from './FieldCard';
import TestAssignmentSection from './TestAssignmentSection';

// Types
import {
    getInitialFormData,
    type FormField,
    type FormSection,
    type FieldOption,
    type FormTemplateData
} from './types';

const FormTemplateCreate: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [draggedField, setDraggedField] = useState<string | null>(null);
    const [dragOverField, setDragOverField] = useState<string | null>(null);
    const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
    const [editingField, setEditingField] = useState<string | null>(null);
    const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(false);

    const [formData, setFormData] = useState<FormTemplateData>(getInitialFormData());

    // Load courses when test section is enabled
    useEffect(() => {
        if (formData.testAssignment?.enabled && availableCourses.length === 0) {
            setLoadingCourses(true);
            getCourses()
                .then(courses => setAvailableCourses(courses))
                .catch(err => console.error('Errore caricamento corsi:', err))
                .finally(() => setLoadingCourses(false));
        }
    }, [formData.testAssignment?.enabled, availableCourses.length]);

    // === SECTIONS ===
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

    // === FIELDS ===
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
                    if (updates.label) {
                        updated.name = updates.label
                            .toLowerCase()
                            .replace(/\s+/g, '_')
                            .replace(/[^a-z0-9_]/g, '');
                    }
                    // Enable quiz mode: add points to existing options
                    if (updates.enableQuizMode === true && f.options && f.options.length > 0) {
                        updated.options = f.options.map(opt => ({
                            ...opt,
                            points: opt.points !== undefined ? opt.points : 1
                        }));
                    }
                    // Disable quiz mode: remove points from options
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

    // === DRAG & DROP ===
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

        setFormData(prev => {
            const fields = prev.fields.filter(f => f.id !== draggedField);
            const targetIndex = fields.findIndex(f => f.id === targetFieldId);

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

    // === OPTIONS ===
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
                        points: f.enableQuizMode ? 1 : undefined
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

    // === SUBMIT ===
    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            showToast({ message: 'Il nome del template è obbligatorio', type: 'error' });
            return;
        }

        if (formData.fields.length === 0) {
            showToast({ message: 'Aggiungi almeno un campo', type: 'error' });
            return;
        }

        setLoading(true);
        try {
            const createData = {
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
                        ...f,
                        order: index,
                        isActive: true
                    };

                    const hasOptionsType = ['select', 'radio', 'checkbox', 'multiple_choice', 'single_choice'].includes(f.type);
                    if (hasOptionsType) {
                        if (field.options && field.options.length > 0) {
                            field.options = field.options.map((opt: any) => {
                                const { points, ...rest } = opt;
                                return points !== null && points !== undefined ? { ...rest, points } : rest;
                            });
                        } else {
                            field.options = [];
                        }
                    }

                    return field;
                }),
                ...(formData.successMessage ? { successMessage: formData.successMessage } : {}),
                redirectUrl: formData.redirectUrl || ''
            };

            const createdTemplate = await formTemplatesService.createFormTemplate(createData as any);

            // Create test assignments if enabled
            if (formData.testAssignment?.enabled && createdTemplate?.id) {
                try {
                    const { createCourseTestAssignment } = await import('../../../services/courseTestsService');

                    const assignments = [];
                    const baseAssignment = {
                        formTemplateId: createdTemplate.id,
                        testType: formData.testAssignment.testType === 'TRAINER_EVALUATION' ? 'ASSESSMENT' : formData.testAssignment.testType,
                        isRequired: formData.testAssignment.isRequired,
                        passingScore: formData.testAssignment.passingScore,
                        timeLimit: formData.testAssignment.timeLimit,
                        isActive: true
                    };

                    const binding = formData.testAssignment.courseBinding;

                    if (binding.allCourses) {
                        assignments.push({ ...baseAssignment, courseId: null, riskLevel: null, courseType: null });
                    } else if (binding.specificCourseId) {
                        assignments.push({ ...baseAssignment, courseId: binding.specificCourseId });
                    } else {
                        const riskLevels = binding.riskLevels.length > 0 ? binding.riskLevels : [null];
                        const courseTypes = binding.courseTypes.length > 0 ? binding.courseTypes : [null];

                        for (const risk of riskLevels) {
                            for (const type of courseTypes) {
                                assignments.push({
                                    ...baseAssignment,
                                    courseId: null,
                                    riskLevel: risk,
                                    courseType: type
                                });
                            }
                        }
                    }

                    for (const assignment of assignments) {
                        await createCourseTestAssignment(assignment as any);
                    }
                } catch (testError) {
                    console.error('Error creating test assignment:', testError);
                    showToast({
                        message: 'Template creato, ma errore nell\'associazione test. Puoi configurarla manualmente.',
                        type: 'warning'
                    });
                }
            }

            showToast({ message: 'Template creato con successo!', type: 'success' });
            navigate('/forms');
        } catch (error: any) {
            console.error('Errore creazione:', error);
            const errorMsg = error.response?.data?.message || 'Errore nella creazione';
            showToast({ message: errorMsg, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

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
                                onClick={() => navigate('/forms')}
                                className="flex items-center"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Indietro
                            </Button>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">Crea Nuovo Form</h1>
                                <p className="text-sm text-gray-500">{formData.fields.length} campi • {formData.sections.length} sezioni</p>
                            </div>
                        </div>
                        <Button onClick={handleSubmit} disabled={loading}>
                            <Save className="w-4 h-4 mr-2" />
                            {loading ? 'Creazione...' : 'Crea Form'}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Template Configuration */}
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
                                        <div className="text-xs text-gray-500">Richiede login e raccoglie informazioni sull'utente</div>
                                    </div>
                                </label>

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
                                        <div className="text-xs text-gray-500">Richiede login ma non raccoglie informazioni</div>
                                    </div>
                                </label>

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
                                        <div className="text-xs text-gray-500">Chiunque con il link può compilare</div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Test Assignment Section */}
                {formData.testAssignment && (
                    <TestAssignmentSection
                        testAssignment={formData.testAssignment}
                        onUpdate={(updates) => setFormData(prev => ({
                            ...prev,
                            testAssignment: { ...prev.testAssignment!, ...updates }
                        }))}
                        onToggle={() => setFormData(prev => ({
                            ...prev,
                            testAssignment: {
                                ...prev.testAssignment!,
                                enabled: !prev.testAssignment?.enabled
                            },
                            type: !prev.testAssignment?.enabled ? 'COURSE_TEST' : 'CUSTOM_FORM'
                        }))}
                        availableCourses={availableCourses}
                        loadingCourses={loadingCourses}
                    />
                )}

                {/* Sections and Fields */}
                <div className="space-y-4">
                    {formData.sections
                        .sort((a, b) => a.order - b.order)
                        .map((section) => {
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

export default FormTemplateCreate;
