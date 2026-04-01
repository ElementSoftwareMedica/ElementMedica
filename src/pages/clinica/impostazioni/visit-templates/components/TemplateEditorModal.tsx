/**
 * Template Editor Modal
 * 
 * Modal per creare/modificare un template di visita.
 * Permette di:
 * - Configurare informazioni base (nome, descrizione)
 * - Associare a prestazione/bundle
 * - Configurare campi e loro proprietà
 * - Configurare sezioni sidebar
 * - Configurare opzioni di stampa
 * - Selezionare template di stampa da /management/templates
 * - P65: Configurare mapping HL7/LOINC per export FSE
 * 
 * @module pages/clinica/impostazioni/visit-templates/components
 * @project P52 - Clinical Visit Template System
 * @project P65 - FSE Integration Predisposition
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import { useQuery } from '@tanstack/react-query';
import {
    X,
    Save,
    AlertCircle,
    FileText,
    Settings,
    Layout,
    Printer,
    GripVertical,
    Plus,
    Trash2,
    Eye,
    EyeOff,
    ChevronDown,
    ChevronRight,
    Info,
    LayoutGrid,
    FileCode2
} from 'lucide-react';
import {
    type VisitTemplate,
    type VisitTemplateInput,
    type VisitTemplateDefaults,
    type VisitField,
    type VisitSidebarSection,
    type VisitFieldType,
    type Prestazione,
    type Medico,
    type TemplateScope
} from '../../../../../services/clinicaApi';
import { apiGet } from '../../../../../services/api';
import FieldLayoutGrid from './FieldLayoutGrid';
import PrestazioneTableSelector from './PrestazioneTableSelector';
import HL7FieldConfig from './HL7FieldConfig';
import { formatMedicoName } from '../../../../../utils/textFormatters';

// ============================================
// UTILITIES
// ============================================

/**
 * P52 Session #11c FIX: Genera ID univoco per campi custom
 * Combina timestamp + random string per garantire unicità assoluta
 */
const generateUniqueId = (): string => {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 11);
    return `${timestamp}_${randomPart}`;
};

// ============================================
// TYPES
// ============================================

interface TemplateEditorModalProps {
    isOpen: boolean;
    template?: VisitTemplate;
    defaults: VisitTemplateDefaults;
    prestazioni: Prestazione[];
    medici?: Medico[];
    currentUserId?: string; // ID utente corrente per auto-popolare medicoId su scope PERSONAL
    isAdmin?: boolean; // Se true, mostra selettore multi-medico
    onSave: (data: VisitTemplateInput | Partial<VisitTemplateInput>) => void;
    onClose: () => void;
    isSaving: boolean;
}

type EditorTab = 'info' | 'fields' | 'layout' | 'sidebar' | 'print';

// ============================================
// FIELD TYPE LABELS
// ============================================

const FIELD_TYPE_LABELS: Record<VisitFieldType, string> = {
    TEXT: 'Testo breve',
    TEXTAREA: 'Testo lungo',
    RICHTEXT: 'Testo formattato',
    NUMBER: 'Numero',
    DROPDOWN: 'Selezione',
    MULTI_CHOICE: 'Scelta multipla',
    DATE: 'Data',
    DATETIME: 'Data e ora',
    BOOLEAN: 'Sì/No',
    FILE: 'File allegato',
    VITALS: 'Parametri vitali',
    STRUMENTARIO_IMPORT: 'Import Strumentario'
};

const SECTION_LABELS: Record<string, string> = {
    anamnesi: 'Anamnesi',
    vitali: 'Parametri Vitali',
    esame: 'Esame Obiettivo',
    diagnosi: 'Diagnosi',
    terapia: 'Terapia',
    followup: 'Conclusione e Follow-Up'
};

/**
 * P72: Nomi campo riservati al sistema — non aggiungibili come campi custom.
 * Questi dati sono gestiti dalla card AllergieMedications nel Profilo di Salute del paziente
 * e vengono letti automaticamente nella visita senza bisogno di un campo template.
 */
const RESERVED_FIELD_NAMES = [
    'allergie',
    'allergy',
    'allergieFarmaci',
    'farmaciInUso',
    'farmaci',
] as const;

/**
 * Opzioni per la stampa del campo nel referto
 */
const PRINT_INCLUDE_OPTIONS = {
    ALWAYS: { label: 'Sempre', description: 'Includi sempre nel referto', color: 'text-green-600 bg-green-50' },
    IF_VALUED: { label: 'Se valorizzato', description: 'Includi solo se compilato', color: 'text-blue-600 bg-blue-50' },
    NEVER: { label: 'Mai', description: 'Non includere nel referto', color: 'text-gray-500 bg-gray-100' }
} as const;

/**
 * Opzioni scadenza in mesi per prossimo controllo
 */
const SCADENZA_OPTIONS = [
    { value: 1, label: '1 mese' },
    { value: 3, label: '3 mesi' },
    { value: 6, label: '6 mesi' },
    { value: 12, label: '1 anno' },
    { value: 18, label: '18 mesi' },
    { value: 24, label: '2 anni' },
    { value: 36, label: '3 anni' },
    { value: 60, label: '5 anni' }
];

// ============================================
// MAIN COMPONENT
// ============================================

const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({
    isOpen,
    template,
    defaults,
    prestazioni,
    medici = [],
    currentUserId,
    isAdmin = false,
    onSave,
    onClose,
    isSaving
}) => {
    const isEditing = !!template;
    const { confirm: confirmDialog } = useConfirmDialog();

    // State
    const [activeTab, setActiveTab] = useState<EditorTab>('info');
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Form state
    const [name, setName] = useState(template?.name || '');
    const [description, setDescription] = useState(template?.description || '');
    // Per admin: supporto multi-medico (solo scope PERSONAL)
    // Per medico: pre-selezionato con il proprio ID
    const [medicoId, setMedicoId] = useState<string>(template?.medicoId || (!isAdmin ? currentUserId || '' : ''));
    const [selectedMedicoIds, setSelectedMedicoIds] = useState<string[]>(
        template?.medicoId ? [template.medicoId] : (!isAdmin && currentUserId ? [currentUserId] : [])
    );
    const [selectedPrestazioneIds, setSelectedPrestazioneIds] = useState<string[]>(
        template?.prestazioneId ? [template.prestazioneId] : []
    );
    const [bundleId, setBundleId] = useState<string>(template?.bundleId || '');
    const [isDefault, setIsDefault] = useState(template?.isDefault || false);
    const [isActive, setIsActive] = useState(template?.isActive ?? true);
    const [scope, setScope] = useState<TemplateScope>(template?.scope || 'PERSONAL');

    // Scadenza default per prossimo controllo
    const [defaultScadenzaMesi, setDefaultScadenzaMesi] = useState<number | null>(
        template?.defaultScadenzaMesi || null
    );

    // Fields
    const [fields, setFields] = useState<VisitField[]>(
        template?.fields || [...defaults.fields]
    );

    // Sidebar config — filter out dead sections (allegati/storia) from legacy DB data
    const VALID_SIDEBAR_SECTIONS = ['anamnesi', 'vitali', 'esame', 'diagnosi', 'terapia', 'followup'];
    const [sidebarSections, setSidebarSections] = useState<VisitSidebarSection[]>(
        (template?.sidebarConfig?.sections || [...defaults.sidebarConfig.sections])
            .filter(s => VALID_SIDEBAR_SECTIONS.includes(s.id))
    );
    const [sidebarDefaultTab, setSidebarDefaultTab] = useState<string>(
        template?.sidebarConfig?.defaultTab || defaults.sidebarConfig.defaultTab
    );
    const [sidebarCollapsible, setSidebarCollapsible] = useState<boolean>(
        template?.sidebarConfig?.collapsible ?? defaults.sidebarConfig.collapsible
    );
    const [sidebarSinglePage, setSidebarSinglePage] = useState<boolean>(
        template?.sidebarConfig?.singlePage ?? false
    );
    const [sectionLayout, setSectionLayout] = useState<'tabs' | 'sections' | 'continuous'>(
        template?.sidebarConfig?.sectionLayout ?? 'sections'
    );
    const [showTimer, setShowTimer] = useState<boolean>(
        template?.sidebarConfig?.showTimer ?? true
    );

    // Print config — only printTemplateId needed (template handles all formatting)
    const [printTemplateId, setPrintTemplateId] = useState<string>(
        template?.printConfig?.printTemplateId || ''
    );

    // Query per caricare i template di tipo VISITA_MEDICA da /management/templates
    interface PrintTemplate {
        id: string;
        name: string;
        type: string;
    }
    const { data: printTemplates = [] } = useQuery<PrintTemplate[]>({
        queryKey: ['templates', 'VISITA_MEDICA'],
        queryFn: async () => {
            const response = await apiGet<{ success: boolean; data: PrintTemplate[] }>('/api/v1/templates?type=VISITA_MEDICA');
            return response.data || [];
        },
        staleTime: 5 * 60 * 1000 // 5 minuti
    });

    // Expanded sections in field editor
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['anamnesi']));

    // Expanded fields to show default value editor
    const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

    // Options editor for dropdown/multi-choice fields
    const [editingOptionsField, setEditingOptionsField] = useState<VisitField | null>(null);
    const [modalAllowCustom, setModalAllowCustom] = useState(false);

    // ============================================
    // VALIDATION
    // ============================================

    const validate = useCallback(() => {
        const newErrors: Record<string, string> = {};

        if (!name.trim()) {
            newErrors.name = 'Il nome è obbligatorio';
        }

        // At least one visible field
        const visibleFields = fields.filter(f => f.visible);
        if (visibleFields.length === 0) {
            newErrors.fields = 'Almeno un campo deve essere visibile';
        }

        // At least one visible sidebar section
        const visibleSections = sidebarSections.filter(s => s.visible);
        if (visibleSections.length === 0) {
            newErrors.sidebar = 'Almeno una sezione deve essere visibile';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [name, fields, sidebarSections]);

    // ============================================
    // HANDLERS
    // ============================================

    const handleSave = useCallback(() => {
        if (!validate()) return;

        const data: VisitTemplateInput = {
            name: name.trim(),
            description: description.trim() || undefined,
            scope, // GLOBAL, PRESTAZIONE, PERSONAL
            // medicoId logic:
            // - GLOBAL: sempre undefined (condiviso per tutti)
            // - PRESTAZIONE: opzionale (undefined = condiviso, con id = per medico specifico)
            // - PERSONAL: obbligatorio (il medico specifico)
            medicoId: scope === 'GLOBAL' ? undefined :
                scope === 'PRESTAZIONE' ? (medicoId || undefined) :
                    (medicoId || undefined),
            // Per admin multi-medico su PERSONAL: invia medicoIds per creare un template per medico
            medicoIds: scope === 'PERSONAL' && isAdmin && selectedMedicoIds.length > 0
                ? selectedMedicoIds : undefined,
            prestazioneId: selectedPrestazioneIds[0] || undefined,
            prestazioneIds: selectedPrestazioneIds.length > 0 ? selectedPrestazioneIds : undefined,
            bundleId: bundleId || undefined,
            isDefault,
            isActive,
            defaultScadenzaMesi: defaultScadenzaMesi || undefined,
            fields,
            sidebarConfig: {
                sections: sidebarSections,
                defaultTab: sidebarDefaultTab,
                collapsible: sidebarCollapsible,
                singlePage: sectionLayout !== 'tabs',
                sectionLayout,
                showTimer
            },
            printConfig: {
                includeHeader: true,
                includeLogo: true,
                includeSignature: true,
                includeFooter: true,
                pageFormat: 'A4' as const,
                orientation: 'portrait' as const,
                printTemplateId: printTemplateId || undefined
            }
        };

        onSave(isEditing ? data : data);
    }, [
        validate, isEditing, name, description, scope, medicoId, selectedPrestazioneIds, bundleId,
        isDefault, isActive, defaultScadenzaMesi, fields, sidebarSections, sidebarDefaultTab,
        sidebarCollapsible, sectionLayout, showTimer, printTemplateId, onSave
    ]);

    const handleFieldChange = useCallback((index: number, updates: Partial<VisitField>) => {
        setFields(current => {
            const updated = [...current];
            updated[index] = { ...updated[index], ...updates };
            return updated;
        });
    }, []);

    const handleAddField = useCallback((section: string) => {
        // P52 Session #11c FIX: Usa generateUniqueId per garantire name univoci
        const uniqueId = generateUniqueId();
        const newField: VisitField = {
            id: `custom_${uniqueId}`,
            name: `custom_field_${uniqueId}`,
            label: 'Nuovo campo',
            type: 'TEXT' as VisitFieldType,
            section,
            required: false,
            visible: true,
            order: fields.filter(f => f.section === section).length
        };
        setFields(current => [...current, newField]);
    }, [fields]);

    const handleRemoveField = useCallback((fieldId: string) => {
        setFields(current => current.filter(f => f.id !== fieldId));
    }, []);

    // ============================================
    // DRAG AND DROP FOR FIELD REORDERING
    // ============================================
    const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
    const [dragOverFieldId, setDragOverFieldId] = useState<string | null>(null);
    const [activeDragHandle, setActiveDragHandle] = useState<string | null>(null);

    // Reset drag handle on mouseup anywhere (safety net)
    useEffect(() => {
        const resetDragHandle = () => setActiveDragHandle(null);
        window.addEventListener('mouseup', resetDragHandle);
        return () => window.removeEventListener('mouseup', resetDragHandle);
    }, []);

    const handleFieldDragStart = useCallback((e: React.DragEvent, fieldId: string) => {
        setDraggedFieldId(fieldId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', fieldId);
    }, []);

    const handleFieldDragOver = useCallback((e: React.DragEvent, fieldId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (draggedFieldId && fieldId !== draggedFieldId) {
            setDragOverFieldId(fieldId);
        }
    }, [draggedFieldId]);

    const handleFieldDragLeave = useCallback(() => {
        setDragOverFieldId(null);
    }, []);

    const handleFieldDrop = useCallback((e: React.DragEvent, targetFieldId: string, section: string) => {
        e.preventDefault();
        setDragOverFieldId(null);

        if (!draggedFieldId || draggedFieldId === targetFieldId) {
            setDraggedFieldId(null);
            return;
        }

        // Get fields in this section, sorted by order
        const sectionFields = fields.filter(f => f.section === section).sort((a, b) => a.order - b.order);
        const draggedField = fields.find(f => f.id === draggedFieldId);

        if (!draggedField || draggedField.section !== section) {
            setDraggedFieldId(null);
            return;
        }

        // Calculate new order
        const draggedIndex = sectionFields.findIndex(f => f.id === draggedFieldId);
        const targetIndex = sectionFields.findIndex(f => f.id === targetFieldId);

        // Remove dragged field and insert at new position
        const newSectionFields = [...sectionFields];
        newSectionFields.splice(draggedIndex, 1);
        newSectionFields.splice(targetIndex, 0, draggedField);

        // Update order values
        const updatedFields = fields.map(f => {
            if (f.section !== section) return f;
            const newIndex = newSectionFields.findIndex(sf => sf.id === f.id);
            return { ...f, order: newIndex };
        });

        setFields(updatedFields);
        setDraggedFieldId(null);
    }, [draggedFieldId, fields]);

    const handleFieldDragEnd = useCallback(() => {
        setDraggedFieldId(null);
        setDragOverFieldId(null);
        setActiveDragHandle(null);
    }, []);

    const handleSectionChange = useCallback((sectionId: string, updates: Partial<VisitSidebarSection>) => {
        setSidebarSections(current => {
            return current.map(s =>
                s.id === sectionId ? { ...s, ...updates } : s
            );
        });
    }, []);

    const handleResetToDefaults = useCallback(async () => {
        if (await confirmDialog({
            title: 'Ripristino valori predefiniti',
            message: 'Vuoi ripristinare i valori predefiniti? Perderai le modifiche non salvate.',
            variant: 'warning',
            confirmLabel: 'Ripristina'
        })) {
            setFields([...defaults.fields]);
            setSidebarSections([...defaults.sidebarConfig.sections].filter(s => VALID_SIDEBAR_SECTIONS.includes(s.id)));
            setSidebarDefaultTab(defaults.sidebarConfig.defaultTab);
            setSidebarCollapsible(defaults.sidebarConfig.collapsible);
        }
    }, [defaults, confirmDialog]);

    const toggleSection = useCallback((section: string) => {
        setExpandedSections(current => {
            const next = new Set(current);
            if (next.has(section)) {
                next.delete(section);
            } else {
                next.add(section);
            }
            return next;
        });
    }, []);

    const toggleFieldExpanded = useCallback((fieldId: string) => {
        setExpandedFields(current => {
            const next = new Set(current);
            if (next.has(fieldId)) {
                next.delete(fieldId);
            } else {
                next.add(fieldId);
            }
            return next;
        });
    }, []);

    // ============================================
    // DERIVED DATA
    // ============================================

    const fieldsBySection = useMemo(() => {
        const grouped: Record<string, VisitField[]> = {};
        fields.forEach(field => {
            if (!grouped[field.section]) {
                grouped[field.section] = [];
            }
            grouped[field.section].push(field);
        });
        return grouped;
    }, [fields]);

    const sections = useMemo(() => {
        return Object.keys(SECTION_LABELS);
    }, []);

    // ============================================
    // RENDER
    // ============================================

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {isEditing ? 'Modifica Template' : 'Nuovo Template'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    {[
                        { id: 'info' as EditorTab, label: 'Informazioni', icon: FileText },
                        { id: 'fields' as EditorTab, label: 'Campi', icon: Settings },
                        { id: 'layout' as EditorTab, label: 'Layout', icon: LayoutGrid },
                        { id: 'sidebar' as EditorTab, label: 'Sidebar', icon: Layout },
                        { id: 'print' as EditorTab, label: 'Stampa', icon: Printer }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === tab.id
                                ? 'text-teal-600 border-teal-600'
                                : 'text-gray-500 border-transparent hover:text-gray-700'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Errors */}
                    {Object.keys(errors).length > 0 && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                                <div>
                                    <p className="font-medium text-red-800">Correggi i seguenti errori:</p>
                                    <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                                        {Object.values(errors).map((error, i) => (
                                            <li key={i}>{error}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Info Tab */}
                    {activeTab === 'info' && (
                        <div className="space-y-6">
                            {/* Nome */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nome template *
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="es. Template visita cardiologica"
                                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${errors.name ? 'border-red-300' : 'border-gray-200'
                                        }`}
                                />
                            </div>

                            {/* Descrizione */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Descrizione
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Descrizione opzionale del template"
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                />
                            </div>

                            {/* Associazioni */}
                            <div className="space-y-4">
                                {/* Scope selector */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tipo Template
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setScope('GLOBAL')}
                                            className={`p-3 rounded-lg border-2 text-left transition-all ${scope === 'GLOBAL'
                                                ? 'border-teal-500 bg-teal-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <div className="font-medium text-sm">
                                                🌐 Globale
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                Default per tutte le visite
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setScope('PRESTAZIONE')}
                                            className={`p-3 rounded-lg border-2 text-left transition-all ${scope === 'PRESTAZIONE'
                                                ? 'border-teal-500 bg-teal-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <div className="font-medium text-sm">
                                                📋 Per Prestazione
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                Default per questa prestazione
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setScope('PERSONAL')}
                                            className={`p-3 rounded-lg border-2 text-left transition-all ${scope === 'PERSONAL'
                                                ? 'border-teal-500 bg-teal-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <div className="font-medium text-sm">
                                                👤 Personale Medico
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                Template personale
                                            </div>
                                        </button>
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                                        <Info className="w-3 h-3" />
                                        Priorità: Personale {'>'} Per Prestazione {'>'} Globale
                                    </p>
                                </div>

                                {/* Medico selector - hidden for GLOBAL scope */}
                                {scope !== 'GLOBAL' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {scope === 'PERSONAL' ? 'Medico *' : 'Medico (opzionale)'}
                                        </label>
                                        {/* Admin + PERSONAL scope: multi-select checkboxes */}
                                        {isAdmin && scope === 'PERSONAL' && !isEditing ? (
                                            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                                                {medici.length === 0 ? (
                                                    <p className="p-3 text-sm text-gray-500">Nessun medico disponibile</p>
                                                ) : (
                                                    medici.map(m => (
                                                        <label
                                                            key={m.id}
                                                            className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedMedicoIds.includes(m.id)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setSelectedMedicoIds(prev => [...prev, m.id]);
                                                                        if (!medicoId) setMedicoId(m.id);
                                                                    } else {
                                                                        setSelectedMedicoIds(prev => prev.filter(id => id !== m.id));
                                                                        if (medicoId === m.id) {
                                                                            const remaining = selectedMedicoIds.filter(id => id !== m.id);
                                                                            setMedicoId(remaining[0] || '');
                                                                        }
                                                                    }
                                                                }}
                                                                className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                                                            />
                                                            <span className="text-sm text-gray-700">
                                                                {formatMedicoName(m)}
                                                                {m.specialties?.[0] && <span className="text-gray-400 ml-1">- {m.specialties[0]}</span>}
                                                            </span>
                                                        </label>
                                                    ))
                                                )}
                                            </div>
                                        ) : (
                                            /* Single select dropdown */
                                            <select
                                                value={medicoId}
                                                onChange={(e) => {
                                                    setMedicoId(e.target.value);
                                                    setSelectedMedicoIds(e.target.value ? [e.target.value] : []);
                                                }}
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                                                disabled={!isAdmin && scope === 'PERSONAL'}
                                            >
                                                <option value="">{scope === 'PRESTAZIONE' ? 'Tutti i medici (condiviso)' : 'Seleziona medico...'}</option>
                                                {medici.map(m => (
                                                    <option key={m.id} value={m.id}>
                                                        {formatMedicoName(m)}
                                                        {m.specialties?.[0] && ` - ${m.specialties[0]}`}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                        <p className="mt-1 text-xs text-gray-500">
                                            {scope === 'PRESTAZIONE'
                                                ? 'Lascia vuoto per un template condiviso tra tutti i medici'
                                                : isAdmin && !isEditing
                                                    ? 'Seleziona uno o più medici. Per ognuno verrà creato un template personale.'
                                                    : 'Il template è associato a questo medico'
                                            }
                                        </p>
                                        {isAdmin && scope === 'PERSONAL' && !isEditing && selectedMedicoIds.length > 1 && (
                                            <p className="mt-1 text-xs text-teal-600 font-medium">
                                                ✓ {selectedMedicoIds.length} medici selezionati — verrà creato un template per ciascuno
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Selettore Prestazioni a 3 colonne */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Prestazioni Associate
                                    </label>
                                    <PrestazioneTableSelector
                                        prestazioni={prestazioni}
                                        selectedIds={selectedPrestazioneIds}
                                        onSelectionChange={setSelectedPrestazioneIds}
                                        multiSelect={!isEditing}
                                    />
                                    <p className="mt-1.5 text-xs text-gray-500">
                                        {isEditing
                                            ? 'Seleziona la prestazione associata a questo template'
                                            : 'Seleziona una o più prestazioni. Per ogni prestazione verrà creato un template con la stessa configurazione.'
                                        }
                                    </p>
                                </div>
                            </div>

                            {/* Scadenza Default */}
                            <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                    <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Scadenza Default per Prossimo Controllo
                                </label>
                                <select
                                    value={defaultScadenzaMesi || ''}
                                    onChange={(e) => setDefaultScadenzaMesi(e.target.value ? parseInt(e.target.value) : null)}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="">Nessuna scadenza predefinita</option>
                                    {SCADENZA_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-1 text-xs text-gray-500">
                                    Questa scadenza verrà suggerita automaticamente quando si completa una visita con questo template
                                </p>
                            </div>

                            {/* Flags */}
                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isDefault}
                                        onChange={(e) => setIsDefault(e.target.checked)}
                                        className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                                    />
                                    <span className="text-sm text-gray-700">
                                        Template predefinito
                                    </span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isActive}
                                        onChange={(e) => setIsActive(e.target.checked)}
                                        className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                                    />
                                    <span className="text-sm text-gray-700">
                                        Attivo
                                    </span>
                                </label>
                            </div>

                            <div className="p-4 bg-blue-50 rounded-lg">
                                <div className="flex items-start gap-2">
                                    <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                                    <div className="text-sm text-blue-700">
                                        <p className="font-medium">Priorità dei template</p>
                                        <p className="mt-1">
                                            Quando viene creata una visita, il sistema cerca il template
                                            in questo ordine: prestazione specifica → bundle → template
                                            default del medico → template di sistema.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Fields Tab */}
                    {activeTab === 'fields' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">
                                        Configura i campi visibili nella pagina visita.
                                    </p>
                                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                        <span title="Campo obbligatorio">✓ Obbligatorio</span>
                                        <span title="Recupera valore dalla visita precedente">🔄 Da visita precedente</span>
                                        <span title="Mostra grafico storico (solo numerici)">📊 Grafico</span>
                                        <span title="Includi in stampa referto">📄 Stampa</span>
                                    </div>
                                </div>
                                <button
                                    onClick={handleResetToDefaults}
                                    className="text-sm text-teal-600 hover:text-teal-700"
                                >
                                    Ripristina predefiniti
                                </button>
                            </div>

                            {/* P72: Banner info campi gestiti dal profilo paziente */}
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="flex items-start gap-2">
                                    <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                    <div className="text-xs text-amber-700">
                                        <span className="font-semibold">Allergie e Farmaci in uso</span> non sono configurabili
                                        come campi template — sono gestiti automaticamente dalla card{' '}
                                        <em>Profilo di Salute</em> del paziente e visibili nella barra laterale della visita.
                                        Il campo <span className="font-semibold">Prescrizioni Farmacologiche</span> è riservato
                                        a ricette/prescrizioni cliniche; per limitazioni D.Lgs 81/08 usare i campi MDL nella
                                        sezione Follow-up.
                                    </div>
                                </div>
                            </div>

                            {sections.map(section => (
                                <div
                                    key={section}
                                    className="border border-gray-200 rounded-lg overflow-hidden"
                                >
                                    {/* Section header */}
                                    <div
                                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                                    >
                                        <button
                                            onClick={() => toggleSection(section)}
                                            className="flex items-center gap-2 flex-1 text-left"
                                        >
                                            {expandedSections.has(section) ? (
                                                <ChevronDown className="w-4 h-4 text-gray-500" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4 text-gray-500" />
                                            )}
                                            <span className="font-medium text-gray-900">
                                                {SECTION_LABELS[section]}
                                            </span>
                                            <span className="text-sm text-gray-500">
                                                ({fieldsBySection[section]?.length || 0} campi)
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => handleAddField(section)}
                                            className="p-1 hover:bg-gray-200 rounded"
                                            title="Aggiungi campo"
                                        >
                                            <Plus className="w-4 h-4 text-gray-500" />
                                        </button>
                                    </div>

                                    {/* Section fields */}
                                    {expandedSections.has(section) && (
                                        <div className="divide-y divide-gray-100">
                                            {(fieldsBySection[section] || [])
                                                .sort((a, b) => a.order - b.order)
                                                .map((field, index) => (
                                                    <div
                                                        key={field.id}
                                                        className={`transition-colors ${draggedFieldId === field.id
                                                            ? 'bg-teal-50 opacity-50'
                                                            : dragOverFieldId === field.id
                                                                ? 'bg-blue-50 border-t-2 border-blue-400'
                                                                : ''
                                                            }`}
                                                        draggable={activeDragHandle === field.id}
                                                        onDragStart={(e) => handleFieldDragStart(e, field.id!)}
                                                        onDragOver={(e) => handleFieldDragOver(e, field.id!)}
                                                        onDragLeave={handleFieldDragLeave}
                                                        onDrop={(e) => handleFieldDrop(e, field.id!, section)}
                                                        onDragEnd={handleFieldDragEnd}
                                                    >
                                                        <div className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50">
                                                            <span
                                                                onMouseDown={() => setActiveDragHandle(field.id ?? null)}
                                                                className="flex-shrink-0"
                                                            >
                                                                <GripVertical className="w-4 h-4 text-gray-400 cursor-grab active:cursor-grabbing hover:text-gray-600" />
                                                            </span>

                                                            {/* Visibility toggle */}
                                                            <button
                                                                onClick={() => handleFieldChange(
                                                                    fields.findIndex(f => f.id === field.id),
                                                                    { visible: !field.visible }
                                                                )}
                                                                className={`p-1 rounded ${field.visible
                                                                    ? 'text-teal-600 bg-teal-50'
                                                                    : 'text-gray-400 bg-gray-100'
                                                                    }`}
                                                            >
                                                                {field.visible ? (
                                                                    <Eye className="w-4 h-4" />
                                                                ) : (
                                                                    <EyeOff className="w-4 h-4" />
                                                                )}
                                                            </button>

                                                            {/* Field label */}
                                                            <input
                                                                type="text"
                                                                value={field.label}
                                                                onChange={(e) => handleFieldChange(
                                                                    fields.findIndex(f => f.id === field.id),
                                                                    { label: e.target.value }
                                                                )}
                                                                className="flex-1 px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-teal-500"
                                                            />

                                                            {/* Field type */}
                                                            <select
                                                                value={field.type}
                                                                onChange={(e) => handleFieldChange(
                                                                    fields.findIndex(f => f.id === field.id),
                                                                    { type: e.target.value as VisitFieldType }
                                                                )}
                                                                className="px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-teal-500"
                                                            >
                                                                {Object.entries(FIELD_TYPE_LABELS).map(([type, label]) => (
                                                                    <option key={type} value={type}>{label}</option>
                                                                ))}
                                                            </select>

                                                            {/* Options config for dropdown/multi-choice */}
                                                            {(field.type === 'DROPDOWN' || field.type === 'MULTI_CHOICE') && (
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingOptionsField(field);
                                                                        setModalAllowCustom(field.allowCustom ?? false);
                                                                    }}
                                                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded hover:bg-orange-100"
                                                                    title="Configura opzioni"
                                                                >
                                                                    <Settings className="w-3 h-3" />
                                                                    {field.options?.length || 0} opzioni
                                                                </button>
                                                            )}

                                                            {/* Required toggle */}
                                                            <label className="flex items-center gap-1 text-sm text-gray-600" title="Campo obbligatorio">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={field.required}
                                                                    onChange={(e) => handleFieldChange(
                                                                        fields.findIndex(f => f.id === field.id),
                                                                        { required: e.target.checked }
                                                                    )}
                                                                    className="w-3 h-3 text-teal-600 border-gray-300 rounded"
                                                                />
                                                                <span className="text-xs">Obblig.</span>
                                                            </label>

                                                            {/* Carry over from previous */}
                                                            <label className="flex items-center gap-1 text-sm text-gray-600" title="Recupera valore dalla visita precedente">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={field.carryOverFromPrevious ?? false}
                                                                    onChange={(e) => handleFieldChange(
                                                                        fields.findIndex(f => f.id === field.id),
                                                                        { carryOverFromPrevious: e.target.checked }
                                                                    )}
                                                                    className="w-3 h-3 text-blue-600 border-gray-300 rounded"
                                                                />
                                                                <span className="text-xs">🔄</span>
                                                            </label>

                                                            {/* Show chart (only for numeric fields) */}
                                                            {(field.type === 'NUMBER' || field.type === 'VITALS') && (
                                                                <label className="flex items-center gap-1 text-sm text-gray-600" title="Mostra grafico storico">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={field.showChart ?? false}
                                                                        onChange={(e) => handleFieldChange(
                                                                            fields.findIndex(f => f.id === field.id),
                                                                            { showChart: e.target.checked }
                                                                        )}
                                                                        className="w-3 h-3 text-purple-600 border-gray-300 rounded"
                                                                    />
                                                                    <span className="text-xs">📊</span>
                                                                </label>
                                                            )}

                                                            {/* Print options dropdown */}
                                                            <div className="relative group">
                                                                <select
                                                                    value={field.printOptions?.include || 'IF_VALUED'}
                                                                    onChange={(e) => handleFieldChange(
                                                                        fields.findIndex(f => f.id === field.id),
                                                                        {
                                                                            printOptions: {
                                                                                ...field.printOptions,
                                                                                include: e.target.value as 'ALWAYS' | 'IF_VALUED' | 'NEVER',
                                                                                showLabel: field.printOptions?.showLabel ?? true,
                                                                                showTitle: field.printOptions?.showTitle ?? false
                                                                            }
                                                                        }
                                                                    )}
                                                                    className={`px-2 py-1 border rounded text-xs cursor-pointer focus:ring-1 focus:ring-teal-500 ${PRINT_INCLUDE_OPTIONS[field.printOptions?.include || 'IF_VALUED'].color
                                                                        }`}
                                                                    title="Opzioni stampa referto {{REFERTO}}"
                                                                >
                                                                    <option value="ALWAYS">📄 Sempre</option>
                                                                    <option value="IF_VALUED">📝 Se compilato</option>
                                                                    <option value="NEVER">🚫 Mai</option>
                                                                </select>
                                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                                                    Includi in stampa referto
                                                                </div>
                                                            </div>

                                                            {/* P65: HL7 indicator badge */}
                                                            {field.hl7?.code && (
                                                                <div
                                                                    className={`flex items-center gap-1 px-1.5 py-0.5 text-xs rounded border ${field.hl7.includeInCDA !== false
                                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                        : 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                                                                        }`}
                                                                    title={`HL7: ${field.hl7.displayName || field.hl7.code} - ${field.hl7.includeInCDA !== false ? 'Incluso in FSE' : 'Escluso da FSE'}`}
                                                                >
                                                                    <FileCode2 className="w-3 h-3" />
                                                                    <span className="font-mono">{field.hl7.code}</span>
                                                                </div>
                                                            )}

                                                            {/* Delete (only for custom fields) */}
                                                            {field.id?.startsWith('custom_') && (
                                                                <button
                                                                    onClick={() => handleRemoveField(field.id!)}
                                                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}

                                                            {/* Expand toggle for default value */}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleFieldExpanded(field.id!);
                                                                }}
                                                                className={`p-1 rounded transition-colors ${expandedFields.has(field.id!)
                                                                    ? 'bg-teal-100 text-teal-600'
                                                                    : 'text-gray-400 hover:bg-gray-100'
                                                                    }`}
                                                                title={expandedFields.has(field.id!) ? 'Nascondi dettagli' : 'Mostra valore predefinito'}
                                                            >
                                                                {expandedFields.has(field.id!) ? (
                                                                    <ChevronDown className="w-4 h-4" />
                                                                ) : (
                                                                    <ChevronRight className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                        </div>

                                                        {/* Expanded section for default value */}
                                                        {expandedFields.has(field.id!) && (
                                                            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                                                                <div className="flex items-center gap-4 ml-8">
                                                                    <label className="text-sm font-medium text-gray-700 w-32">
                                                                        Valore predefinito:
                                                                    </label>
                                                                    {field.type === 'BOOLEAN' ? (
                                                                        <select
                                                                            value={field.defaultValue?.toString() || ''}
                                                                            onChange={(e) => handleFieldChange(
                                                                                fields.findIndex(f => f.id === field.id),
                                                                                { defaultValue: e.target.value || undefined }
                                                                            )}
                                                                            className="px-3 py-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-teal-500 text-sm"
                                                                        >
                                                                            <option value="">-- Nessuno --</option>
                                                                            <option value="true">Sì</option>
                                                                            <option value="false">No</option>
                                                                        </select>
                                                                    ) : field.type === 'DROPDOWN' || field.type === 'MULTI_CHOICE' ? (
                                                                        <select
                                                                            value={field.defaultValue?.toString() || ''}
                                                                            onChange={(e) => handleFieldChange(
                                                                                fields.findIndex(f => f.id === field.id),
                                                                                { defaultValue: e.target.value || undefined }
                                                                            )}
                                                                            className="px-3 py-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-teal-500 text-sm flex-1 max-w-xs"
                                                                        >
                                                                            <option value="">-- Nessuno --</option>
                                                                            {(field.options || []).map((opt, i) => (
                                                                                <option key={i} value={typeof opt === 'string' ? opt : opt.value}>{typeof opt === 'string' ? opt : (opt as { value: string; label: string }).label}</option>
                                                                            ))}
                                                                        </select>
                                                                    ) : field.type === 'DATE' || field.type === 'DATETIME' ? (
                                                                        <input
                                                                            type={field.type === 'DATE' ? 'date' : 'datetime-local'}
                                                                            value={field.defaultValue?.toString() || ''}
                                                                            onChange={(e) => handleFieldChange(
                                                                                fields.findIndex(f => f.id === field.id),
                                                                                { defaultValue: e.target.value || undefined }
                                                                            )}
                                                                            className="px-3 py-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-teal-500 text-sm"
                                                                        />
                                                                    ) : field.type === 'NUMBER' ? (
                                                                        <input
                                                                            type="number"
                                                                            value={field.defaultValue?.toString() || ''}
                                                                            onChange={(e) => handleFieldChange(
                                                                                fields.findIndex(f => f.id === field.id),
                                                                                { defaultValue: e.target.value || undefined }
                                                                            )}
                                                                            className="px-3 py-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-teal-500 text-sm w-32"
                                                                            placeholder="0"
                                                                        />
                                                                    ) : field.type === 'TEXTAREA' || field.type === 'RICHTEXT' ? (
                                                                        <textarea
                                                                            value={field.defaultValue?.toString() || ''}
                                                                            onChange={(e) => handleFieldChange(
                                                                                fields.findIndex(f => f.id === field.id),
                                                                                { defaultValue: e.target.value || undefined }
                                                                            )}
                                                                            className="px-3 py-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-teal-500 text-sm flex-1 max-w-md"
                                                                            placeholder="Inserisci valore predefinito..."
                                                                            rows={2}
                                                                        />
                                                                    ) : (
                                                                        <input
                                                                            type="text"
                                                                            value={field.defaultValue?.toString() || ''}
                                                                            onChange={(e) => handleFieldChange(
                                                                                fields.findIndex(f => f.id === field.id),
                                                                                { defaultValue: e.target.value || undefined }
                                                                            )}
                                                                            className="px-3 py-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-teal-500 text-sm flex-1 max-w-md"
                                                                            placeholder="Inserisci valore predefinito..."
                                                                        />
                                                                    )}
                                                                    {field.defaultValue !== undefined && (
                                                                        <button
                                                                            onClick={() => handleFieldChange(
                                                                                fields.findIndex(f => f.id === field.id),
                                                                                { defaultValue: undefined }
                                                                            )}
                                                                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                                                            title="Rimuovi valore predefinito"
                                                                        >
                                                                            <X className="w-4 h-4" />
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                {/* P65: HL7/LOINC Configuration */}
                                                                <div className="mt-4 pt-4 border-t border-gray-200 ml-8">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <FileCode2 className="w-4 h-4 text-emerald-600" />
                                                                        <label className="text-sm font-medium text-gray-700">
                                                                            Mapping HL7/FSE
                                                                        </label>
                                                                        <span className="text-xs text-gray-400">
                                                                            (per export Fascicolo Sanitario Elettronico)
                                                                        </span>
                                                                    </div>
                                                                    <HL7FieldConfig
                                                                        hl7Config={field.hl7}
                                                                        fieldLabel={field.label}
                                                                        fieldType={field.type}
                                                                        onChange={(hl7Config) => handleFieldChange(
                                                                            fields.findIndex(f => f.id === field.id),
                                                                            { hl7: hl7Config }
                                                                        )}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}

                                            {(!fieldsBySection[section] || fieldsBySection[section].length === 0) && (
                                                <div className="px-4 py-6 text-center text-sm text-gray-500">
                                                    Nessun campo in questa sezione.
                                                    <button
                                                        onClick={() => handleAddField(section)}
                                                        className="ml-1 text-teal-600 hover:underline"
                                                    >
                                                        Aggiungi campo
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Layout Tab */}
                    {activeTab === 'layout' && (
                        <FieldLayoutGrid
                            fields={fields}
                            onFieldsChange={setFields}
                        />
                    )}

                    {/* Sidebar Tab */}
                    {activeTab === 'sidebar' && (
                        <div className="space-y-6">
                            <p className="text-sm text-gray-600">
                                Configura il layout e quali sezioni mostrare nella pagina visita.
                            </p>

                            {/* Layout mode selection - 3 options */}
                            <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">Modalità Layout</h4>
                                <div className="grid grid-cols-3 gap-3">
                                    <label className={`flex flex-col items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${sectionLayout === 'sections'
                                        ? 'border-teal-500 bg-teal-100'
                                        : 'border-gray-200 bg-white hover:border-teal-300'
                                        }`}>
                                        <input
                                            type="radio"
                                            name="sectionLayout"
                                            value="sections"
                                            checked={sectionLayout === 'sections'}
                                            onChange={() => setSectionLayout('sections')}
                                            className="sr-only"
                                        />
                                        <span className="text-2xl mb-1">📄</span>
                                        <span className="text-sm font-medium text-gray-700">Sezioni</span>
                                        <span className="text-xs text-gray-500 text-center mt-1">Pagina singola con card sezioni</span>
                                    </label>
                                    <label className={`flex flex-col items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${sectionLayout === 'tabs'
                                        ? 'border-teal-500 bg-teal-100'
                                        : 'border-gray-200 bg-white hover:border-teal-300'
                                        }`}>
                                        <input
                                            type="radio"
                                            name="sectionLayout"
                                            value="tabs"
                                            checked={sectionLayout === 'tabs'}
                                            onChange={() => setSectionLayout('tabs')}
                                            className="sr-only"
                                        />
                                        <span className="text-2xl mb-1">📑</span>
                                        <span className="text-sm font-medium text-gray-700">Tab</span>
                                        <span className="text-xs text-gray-500 text-center mt-1">Sidebar con tab navigabili</span>
                                    </label>
                                    <label className={`flex flex-col items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${sectionLayout === 'continuous'
                                        ? 'border-teal-500 bg-teal-100'
                                        : 'border-gray-200 bg-white hover:border-teal-300'
                                        }`}>
                                        <input
                                            type="radio"
                                            name="sectionLayout"
                                            value="continuous"
                                            checked={sectionLayout === 'continuous'}
                                            onChange={() => setSectionLayout('continuous')}
                                            className="sr-only"
                                        />
                                        <span className="text-2xl mb-1">📜</span>
                                        <span className="text-sm font-medium text-gray-700">Continua</span>
                                        <span className="text-xs text-gray-500 text-center mt-1">Flusso senza separazioni</span>
                                    </label>
                                </div>
                            </div>

                            {/* Timer visibility toggle */}
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <label className="flex items-center justify-between cursor-pointer">
                                    <div>
                                        <span className="text-sm font-medium text-gray-700">⏱️ Mostra timer durata visita</span>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {showTimer
                                                ? 'Il timer viene mostrato nell\'header della visita'
                                                : 'Il timer è nascosto (la durata viene comunque registrata)'
                                            }
                                        </p>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={showTimer}
                                            onChange={(e) => setShowTimer(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-teal-500 transition-colors"></div>
                                        <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform"></div>
                                    </div>
                                </label>
                            </div>

                            {/* General settings - only visible in tab mode */}
                            {sectionLayout === 'tabs' && (
                                <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={sidebarCollapsible}
                                            onChange={(e) => setSidebarCollapsible(e.target.checked)}
                                            className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                                        />
                                        <span className="text-sm text-gray-700">
                                            Sezioni collassabili
                                        </span>
                                    </label>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Tab predefinito
                                        </label>
                                        <select
                                            value={sidebarDefaultTab}
                                            onChange={(e) => setSidebarDefaultTab(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                                        >
                                            {sidebarSections.filter(s => s.visible).map(s => (
                                                <option key={s.id} value={s.id}>{s.title}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Sections list */}
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <Layout className="w-4 h-4" />
                                    Sezioni della sidebar ({sidebarSections.length})
                                </h4>
                                {sidebarSections.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
                                        <Layout className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                        <p className="font-medium">Nessuna sezione configurata</p>
                                        <p className="text-sm">Ricarica i defaults dal server</p>
                                    </div>
                                ) : (
                                    sidebarSections.map(section => (
                                        <div
                                            key={section.id}
                                            className={`flex items-center gap-4 p-4 border rounded-lg transition-colors ${section.visible
                                                ? 'border-gray-200 bg-white'
                                                : 'border-gray-100 bg-gray-50'
                                                }`}
                                        >
                                            <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />

                                            <button
                                                onClick={() => handleSectionChange(section.id, { visible: !section.visible })}
                                                className={`p-2 rounded-lg transition-colors ${section.visible
                                                    ? 'bg-teal-100 text-teal-600'
                                                    : 'bg-gray-100 text-gray-400'
                                                    }`}
                                            >
                                                {section.visible ? (
                                                    <Eye className="w-4 h-4" />
                                                ) : (
                                                    <EyeOff className="w-4 h-4" />
                                                )}
                                            </button>

                                            <div className="flex-1">
                                                <input
                                                    type="text"
                                                    value={section.title}
                                                    onChange={(e) => handleSectionChange(section.id, { title: e.target.value })}
                                                    className="font-medium text-gray-900 bg-transparent border-0 focus:ring-0 p-0"
                                                />
                                            </div>

                                            {section.expandedByDefault !== undefined && (
                                                <label className="flex items-center gap-2 text-sm text-gray-600">
                                                    <input
                                                        type="checkbox"
                                                        checked={section.expandedByDefault}
                                                        onChange={(e) => handleSectionChange(section.id, {
                                                            expandedByDefault: e.target.checked
                                                        })}
                                                        className="w-3 h-3 text-teal-600 border-gray-300 rounded"
                                                    />
                                                    Espanso
                                                </label>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* Print Tab */}
                    {activeTab === 'print' && (
                        <div className="space-y-6">
                            <p className="text-sm text-gray-600">
                                Seleziona il template di stampa per la generazione del referto.
                                Intestazione, logo, firma, piè di pagina, formato e orientamento sono
                                definiti nel template stesso.
                            </p>

                            {/* Template di stampa selector */}
                            <div>
                                <h4 className="font-medium text-gray-900 mb-3">
                                    Template di Stampa
                                </h4>
                                <p className="text-sm text-gray-500 mb-3">
                                    I template possono essere creati e personalizzati in{' '}
                                    <a
                                        href="/management/templates"
                                        target="_blank"
                                        className="text-teal-600 hover:text-teal-700 underline"
                                    >
                                        Gestione Template
                                    </a>.
                                </p>
                                <select
                                    value={printTemplateId}
                                    onChange={(e) => setPrintTemplateId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="">Template predefinito</option>
                                    {printTemplates.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.name}
                                        </option>
                                    ))}
                                </select>
                                {printTemplates.length === 0 && (
                                    <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                                        <Info className="w-3 h-3" />
                                        Nessun template di tipo "Visita Medica" disponibile.
                                        Creane uno in Gestione Template.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Annulla
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Salvataggio...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                {isEditing ? 'Aggiorna' : 'Crea Template'}
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Options Editor Modal */}
            {editingOptionsField && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setEditingOptionsField(null)} />
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between px-4 py-3 bg-orange-50 border-b border-orange-200">
                            <h3 className="font-semibold text-orange-800">
                                Configura Opzioni: {editingOptionsField.label}
                            </h3>
                            <button
                                onClick={() => setEditingOptionsField(null)}
                                className="p-1 hover:bg-white/50 rounded"
                            >
                                <X className="w-5 h-5 text-orange-600" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Opzioni (una per riga)
                                </label>
                                <textarea
                                    defaultValue={editingOptionsField.options?.map(o => typeof o === 'string' ? o : (o as { value: string; label: string }).label).join('\n') || ''}
                                    placeholder="Opzione 1&#10;Opzione 2&#10;Opzione 3"
                                    rows={6}
                                    id="options-textarea"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Valore predefinito
                                </label>
                                <select
                                    defaultValue={editingOptionsField.defaultValue || ''}
                                    id="default-value-select"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                >
                                    <option value="">Nessun valore predefinito</option>
                                    {(editingOptionsField.options || []).map(rawOpt => {
                                        const opt = typeof rawOpt === 'string' ? { value: rawOpt, label: rawOpt } : rawOpt as { value: string; label: string };
                                        return <option key={opt.value} value={opt.value}>{opt.label}</option>;
                                    })}
                                </select>
                            </div>
                            {/* allowCustom — only for MULTI_CHOICE */}
                            {editingOptionsField.type === 'MULTI_CHOICE' && (
                                <label className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100 cursor-pointer hover:bg-orange-100 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={modalAllowCustom}
                                        onChange={(e) => setModalAllowCustom(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-orange-800">Permetti voce "Altro"</p>
                                        <p className="text-xs text-orange-600">L'utente potrà aggiungere una voce personalizzata durante la compilazione</p>
                                    </div>
                                </label>
                            )}
                        </div>
                        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={() => setEditingOptionsField(null)}
                                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-md"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={() => {
                                    const textarea = document.getElementById('options-textarea') as HTMLTextAreaElement;
                                    const select = document.getElementById('default-value-select') as HTMLSelectElement;
                                    const newOptions = textarea.value.split('\n').map(o => o.trim()).filter(o => o);
                                    const newDefault = select.value;

                                    handleFieldChange(
                                        fields.findIndex(f => f.id === editingOptionsField.id),
                                        {
                                            options: newOptions,
                                            defaultValue: newDefault || undefined,
                                            allowCustom: editingOptionsField.type === 'MULTI_CHOICE' ? modalAllowCustom : undefined
                                        }
                                    );
                                    setEditingOptionsField(null);
                                }}
                                className="px-4 py-1.5 text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700"
                            >
                                Salva
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TemplateEditorModal;
