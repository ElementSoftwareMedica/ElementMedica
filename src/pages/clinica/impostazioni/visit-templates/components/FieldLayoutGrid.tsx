/**
 * Field Layout Grid
 * 
 * Componente griglia drag-and-drop per organizzare visualmente i campi
 * di un template visita in una griglia 10 colonne.
 * 
 * Features:
 * - Drag-and-drop per riposizionare i campi
 * - Controlli di ridimensionamento (larghezza/altezza)
 * - Preview visuale in tempo reale
 * - Raggruppamento per sezione con tab navigation
 * - Aggiunta campi personalizzati
 * - Input valori predefiniti
 * - Posizionamento sequenziale automatico
 * 
 * @module pages/clinica/impostazioni/visit-templates/components
 * @project P52 - Clinical Visit Template System
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
    GripVertical,
    Maximize2,
    Minimize2,
    Move,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    ChevronDown,
    LayoutGrid,
    Eye,
    EyeOff,
    Plus,
    Trash2,
    Settings,
    X
} from 'lucide-react';
import type { VisitField, VisitFieldType } from '../../../../../services/clinicaApi';

// ============================================
// UTILITIES
// ============================================

/**
 * P52 Session #11 FIX: Genera ID univoco per campi custom
 * Combina timestamp + random string per garantire unicità assoluta
 * anche quando si aggiungono più campi rapidamente
 */
const generateUniqueId = (): string => {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 11);
    return `${timestamp}_${randomPart}`;
};

// ============================================
// TYPES
// ============================================

interface FieldLayoutGridProps {
    fields: VisitField[];
    onFieldsChange: (fields: VisitField[]) => void;
}

interface GridCell {
    row: number;
    col: number;
}

interface DragState {
    fieldId: string | null;
    startCell: GridCell | null;
    currentCell: GridCell | null;
}

// ============================================
// CONSTANTS
// ============================================

const GRID_COLS = 12;
const GRID_ROWS = 20; // Max rows visibili
const MIN_WIDTH = 1;
const MAX_WIDTH = 12;
const MIN_HEIGHT = 1;
const MAX_HEIGHT = 6;

const SECTION_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    anamnesi: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' },
    vitali: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700' },
    esame: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700' },
    spalla: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700' },
    gomito: { bg: 'bg-cyan-50', border: 'border-cyan-300', text: 'text-cyan-700' },
    polso_mano: { bg: 'bg-sky-50', border: 'border-sky-300', text: 'text-sky-700' },
    diagnosi: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700' },
    terapia: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700' },
    followup: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700' }
};

const SECTION_LABELS: Record<string, string> = {
    anamnesi: 'Anamnesi',
    vitali: 'Parametri Vitali',
    esame: 'Esame Obiettivo',
    spalla: 'Spalla',
    gomito: 'Gomito',
    polso_mano: 'Polso / mano',
    diagnosi: 'Diagnosi',
    terapia: 'Terapia',
    followup: 'Conclusione e Follow-Up'
};

const FIELD_TYPE_ICONS: Record<VisitFieldType, string> = {
    TEXT: '📝',
    TEXTAREA: '📄',
    RICHTEXT: '📋',
    NUMBER: '#️⃣',
    DROPDOWN: '📋',
    MULTI_CHOICE: '☑️',
    DATE: '📅',
    DATETIME: '🕐',
    BOOLEAN: '✓',
    FILE: '📎',
    VITALS: '💓',
    STRUMENTARIO_IMPORT: '🔬'
};

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

// Ordine delle sezioni/tab della visita
const SECTION_ORDER = ['anamnesi', 'vitali', 'esame', 'spalla', 'gomito', 'polso_mano', 'diagnosi', 'terapia', 'followup'] as const;
const SPECIALIST_SECTION_ORDER = ['spalla', 'gomito', 'polso_mano'] as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Dispone i campi in modo compatto nella griglia del tab Layout.
 * Anche i template legacy con posizioni sovrapposte vengono ricomposti
 * in righe ordinate, senza perdere la sezione o la dimensione desiderata.
 */
const assignDefaultPositions = (fields: VisitField[]): VisitField[] => {
    const fieldsWithPositions: VisitField[] = [];

    // Raggruppa per sezione per posizionarli in ordine
    const sectionOrder = [
        ...SECTION_ORDER,
        ...Array.from(new Set(fields.map(f => f.section || 'anamnesi'))).filter(section => !SECTION_ORDER.includes(section as typeof SECTION_ORDER[number]))
    ];
    const fieldsBySection = new Map<string, VisitField[]>();

    fields.forEach(f => {
        const section = f.section || 'anamnesi';
        if (!fieldsBySection.has(section)) {
            fieldsBySection.set(section, []);
        }
        fieldsBySection.get(section)!.push(f);
    });

    sectionOrder.forEach(section => {
        const sectionFields = fieldsBySection.get(section) || [];
        sectionFields.sort((a, b) =>
            (a.position?.row ?? 0) - (b.position?.row ?? 0)
            || (a.position?.col ?? 0) - (b.position?.col ?? 0)
            || (a.order ?? 0) - (b.order ?? 0)
            || String(a.label || a.name).localeCompare(String(b.label || b.name))
        );

        const occupied = new Set<string>();
        const canPlace = (row: number, col: number, width: number, height: number) => {
            if (col + width > GRID_COLS) return false;
            for (let r = row; r < row + height; r += 1) {
                for (let c = col; c < col + width; c += 1) {
                    if (occupied.has(`${r}:${c}`)) return false;
                }
            }
            return true;
        };
        const markOccupied = (row: number, col: number, width: number, height: number) => {
            for (let r = row; r < row + height; r += 1) {
                for (let c = col; c < col + width; c += 1) {
                    occupied.add(`${r}:${c}`);
                }
            }
        };
        const findFirstFree = (width: number, height: number) => {
            for (let row = 0; row < 80; row += 1) {
                for (let col = 0; col <= GRID_COLS - width; col += 1) {
                    if (canPlace(row, col, width, height)) return { row, col };
                }
            }
            return { row: 0, col: 0 };
        };

        sectionFields.forEach(field => {
            const fieldType = field.type as VisitFieldType;
            const fullWidthTypes = ['TEXTAREA', 'RICHTEXT', 'VITALS', 'FILE', 'STRUMENTARIO_IMPORT'];
            const width = fullWidthTypes.includes(fieldType)
                ? GRID_COLS
                : Math.max(MIN_WIDTH, Math.min(field.size?.width || getDefaultWidth(fieldType), MAX_WIDTH));
            const height = Math.max(MIN_HEIGHT, Math.min(field.size?.height || 1, MAX_HEIGHT));

            const position = findFirstFree(width, height);
            markOccupied(position.row, position.col, width, height);

            fieldsWithPositions.push({
                ...field,
                position,
                size: { width, height }
            });
        });
    });

    return fieldsWithPositions;
};

/**
 * Determina la larghezza di default basata sul tipo
 * Adattato per griglia a 12 colonne
 */
const getDefaultWidth = (type: VisitFieldType): number => {
    switch (type) {
        case 'TEXT':
        case 'NUMBER':
        case 'DATE':
        case 'DATETIME':
        case 'BOOLEAN':
        case 'DROPDOWN':
            return 4; // 1/3 della riga
        case 'TEXTAREA':
        case 'MULTI_CHOICE':
            return 6; // 1/2 della riga
        case 'RICHTEXT':
        case 'VITALS':
        case 'FILE':
            return 12; // Tutta la riga
        default:
            return 4;
    }
};

// ============================================
// FIELD CARD COMPONENT
// ============================================

interface FieldCardProps {
    field: VisitField;
    maxWidth: number; // Max allowed width based on field's grid position
    isDragging: boolean;
    isSelected: boolean;
    isResizing: boolean;
    onSelect: (fieldId: string) => void;
    onDragStart: (fieldId: string, e: React.DragEvent) => void;
    onDragEnd: () => void;
    onResize: (fieldId: string, width: number, height: number) => void;
    onResizeStart: (fieldId: string, e: React.MouseEvent) => void;
    onToggleVisible: (fieldId: string) => void;
    onOpenSettings: (field: VisitField) => void;
}

const FieldCard: React.FC<FieldCardProps> = ({
    field,
    maxWidth,
    isDragging,
    isSelected,
    isResizing,
    onSelect,
    onDragStart,
    onDragEnd,
    onResize,
    onResizeStart,
    onToggleVisible,
    onOpenSettings
}) => {
    const colors = SECTION_COLORS[field.section] || SECTION_COLORS.esame;
    const width = field.size?.width || 4;
    const height = field.size?.height || 1;

    const handleDecreaseWidth = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (width > MIN_WIDTH) {
            onResize(field.id!, width - 1, height);
        }
    };

    const handleIncreaseWidth = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (width < maxWidth) {
            onResize(field.id!, width + 1, height);
        }
    };

    const handleDecreaseHeight = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (height > MIN_HEIGHT) {
            onResize(field.id!, width, height - 1);
        }
    };

    const handleIncreaseHeight = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (height < MAX_HEIGHT) {
            onResize(field.id!, width, height + 1);
        }
    };

    return (
        <div
            draggable
            onClick={(e) => {
                e.stopPropagation();
                onSelect(field.id!);
            }}
            onDragStart={(e) => onDragStart(field.id!, e)}
            onDragEnd={onDragEnd}
            className={`
                group relative h-full rounded-lg border-2 p-2 cursor-pointer
                transition-all duration-200
                ${colors.bg} ${colors.border}
                ${isDragging ? 'opacity-50 scale-95' : 'hover:shadow-md'}
                ${field.visible === false ? 'opacity-60' : ''}
                ${isSelected ? 'ring-2 ring-teal-500 ring-offset-2 shadow-xl border-teal-500' : ''}
            `}
            style={{
                gridColumn: `span ${width}`,
                gridRow: `span ${height}`
            }}
        >
            {/* Drag handle */}
            <div className={`absolute top-1 left-1 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <GripVertical className={`w-4 h-4 ${colors.text} cursor-grab active:cursor-grabbing`} />
            </div>

            {/* Settings button - top right */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onOpenSettings(field);
                }}
                className="absolute top-1 right-6 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/50 rounded z-10"
                title="Impostazioni campo"
            >
                <Settings className={`w-4 h-4 ${colors.text}`} />
            </button>

            {/* Content */}
            <div className="flex flex-col h-full pt-4">
                <div className="flex items-center gap-1 mb-1">
                    <span className="text-sm">{FIELD_TYPE_ICONS[field.type]}</span>
                    <span className={`text-xs font-medium truncate ${colors.text}`}>
                        {field.label}
                    </span>
                </div>
                <div className="text-xs text-gray-500 truncate">
                    {field.name}
                </div>
            </div>

            {/* Controls - visible on hover or when selected */}
            <div className={`absolute bottom-1 right-1 transition-opacity flex items-center gap-0.5 bg-white/80 rounded-md px-1 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                {/* Visibility toggle */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleVisible(field.id!);
                    }}
                    className="p-1 rounded hover:bg-gray-200"
                    title={field.visible ? 'Nascondi campo' : 'Mostra campo'}
                >
                    {field.visible ? (
                        <Eye className="w-3 h-3 text-gray-500" />
                    ) : (
                        <EyeOff className="w-3 h-3 text-gray-400" />
                    )}
                </button>

                {/* Width controls */}
                <button
                    onClick={handleDecreaseWidth}
                    disabled={width <= MIN_WIDTH}
                    className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30"
                    title="Riduci larghezza"
                >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                <span className="text-xs font-medium text-gray-700 min-w-[24px] text-center">{width}</span>
                <button
                    onClick={handleIncreaseWidth}
                    disabled={width >= maxWidth}
                    className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30"
                    title={`Aumenta larghezza (max ${maxWidth})`}
                >
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>

                {/* Height controls */}
                <div className="w-px h-5 bg-gray-300 mx-1" />
                <button
                    onClick={handleDecreaseHeight}
                    disabled={height <= MIN_HEIGHT}
                    className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30"
                    title="Riduci altezza"
                >
                    <ChevronUp className="w-4 h-4 text-gray-600" />
                </button>
                <span className="text-xs font-medium text-gray-700 min-w-[20px] text-center">{height}</span>
                <button
                    onClick={handleIncreaseHeight}
                    disabled={height >= MAX_HEIGHT}
                    className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30"
                    title="Aumenta altezza"
                >
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                </button>
            </div>

            {/* Required indicator */}
            {field.required && (
                <div className="absolute top-1 right-1">
                    <span className="text-red-500 text-xs">*</span>
                </div>
            )}

            {/* Resize handle - bottom right corner */}
            <div
                className={`absolute bottom-0 right-0 w-4 h-4 cursor-se-resize transition-opacity
                    ${isSelected || isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                `}
                onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onResizeStart(field.id!, e);
                }}
                title={`Ridimensiona (${width}×${height})`}
            >
                {/* Resize grip visual */}
                <div className="absolute bottom-0.5 right-0.5 flex flex-col items-end gap-0.5">
                    <div className="flex gap-0.5">
                        <div className={`w-1 h-1 rounded-full ${colors.border.replace('border-', 'bg-')}`} />
                    </div>
                    <div className="flex gap-0.5">
                        <div className={`w-1 h-1 rounded-full ${colors.border.replace('border-', 'bg-')}`} />
                        <div className={`w-1 h-1 rounded-full ${colors.border.replace('border-', 'bg-')}`} />
                    </div>
                </div>
            </div>

            {/* Size indicator during resize */}
            {isResizing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg pointer-events-none">
                    <span className="bg-white px-2 py-1 rounded-md shadow-lg font-medium text-sm">
                        {width} × {height}
                    </span>
                </div>
            )}
        </div>
    );
};

// ============================================
// FIELD SETTINGS MODAL
// ============================================

interface FieldSettingsModalProps {
    field: VisitField;
    onUpdate: (updates: Partial<VisitField>) => void;
    onDelete?: () => void;
    onClose: () => void;
}

const FieldSettingsModal: React.FC<FieldSettingsModalProps> = ({
    field,
    onUpdate,
    onDelete,
    onClose
}) => {
    const [label, setLabel] = useState(field.label);
    const [type, setType] = useState<VisitFieldType>(field.type);
    const [defaultValue, setDefaultValue] = useState(field.defaultValue || '');
    const [placeholder, setPlaceholder] = useState(field.placeholder || '');
    const [required, setRequired] = useState(field.required);
    const [options, setOptions] = useState(
        field.options?.map(o => typeof o === 'string' ? o : (o as { value: string; label: string }).label).join('\n') || ''
    );
    const [carryOverFromPrevious, setCarryOverFromPrevious] = useState(field.carryOverFromPrevious ?? false);
    const [showChart, setShowChart] = useState(field.showChart ?? false);

    const isCustomField = field.id?.startsWith('custom_') ?? false;

    /**
     * P52 Session #11: Genera name univoco dal label per campi custom
     * Converte "Esame Obiettivo Cardiologico" → "esame_obiettivo_cardiologico_abc123"
     * Usa SEMPRE l'ID del campo come suffix per garantire unicità assoluta
     */
    const generateNameFromLabel = useCallback((labelText: string): string => {
        const baseName = labelText
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Rimuovi accenti
            .replace(/[^a-z0-9\s]/g, '') // Solo lettere e numeri
            .trim()
            .replace(/\s+/g, '_'); // Spazi → underscore
        // Usa l'INTERO field.id per garantire unicità (non solo gli ultimi 6 caratteri)
        // Questo previene collisioni quando due campi hanno lo stesso label
        return `${baseName}_${field.id}`;
    }, [field.id]);

    const handleSave = useCallback(() => {
        // P52 Session #11c: Per campi custom, genera SEMPRE il name dall'id per unicità
        // NON cambiare il name dopo la creazione per evitare perdita dati nelle visite esistenti
        const updates: Partial<VisitField> = {
            label,
            type,
            defaultValue: defaultValue || undefined,
            placeholder: placeholder || undefined,
            required,
            carryOverFromPrevious,
            showChart,
            options: type === 'DROPDOWN' || type === 'MULTI_CHOICE'
                ? options.split('\n').filter(o => o.trim())
                : undefined
        };

        // P52 Session #11c FIX: Genera name univoco per:
        // 1. Campi custom nuovi (name inizia con custom_field_)
        // 2. Campi custom con name vuoto (bug legacy)
        const needsNameGeneration =
            (isCustomField && field.name.startsWith('custom_field_')) ||
            (isCustomField && (!field.name || field.name.trim() === ''));

        if (needsNameGeneration) {
            updates.name = generateNameFromLabel(label);
        }

        onUpdate(updates);
        onClose();
    }, [label, type, defaultValue, placeholder, required, carryOverFromPrevious, showChart, options, onUpdate, onClose, isCustomField, field.name, generateNameFromLabel]);

    const colors = SECTION_COLORS[field.section] || SECTION_COLORS.anamnesi;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className={`flex items-center justify-between px-4 py-3 ${colors.bg} border-b ${colors.border}`}>
                    <div className="flex items-center gap-2">
                        <Settings className={`w-5 h-5 ${colors.text}`} />
                        <h3 className={`font-semibold ${colors.text}`}>
                            Impostazioni Campo
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/50 rounded">
                        <X className={`w-5 h-5 ${colors.text}`} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    {/* Label */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Etichetta
                        </label>
                        <input
                            type="text"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                    </div>

                    {/* Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tipo campo
                        </label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as VisitFieldType)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                            disabled={!isCustomField}
                        >
                            {Object.entries(FIELD_TYPE_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>
                                    {FIELD_TYPE_ICONS[key as VisitFieldType]} {label}
                                </option>
                            ))}
                        </select>
                        {!isCustomField && (
                            <p className="mt-1 text-xs text-gray-500">
                                Il tipo non può essere modificato per i campi di sistema
                            </p>
                        )}
                    </div>

                    {/* Default value */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Valore predefinito
                            <span className="ml-1 text-xs font-normal text-gray-400">(valore pre-compilato)</span>
                        </label>
                        {type === 'TEXTAREA' || type === 'RICHTEXT' ? (
                            <textarea
                                value={defaultValue}
                                onChange={(e) => setDefaultValue(e.target.value)}
                                placeholder="Es: Paziente in buone condizioni generali..."
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                        ) : type === 'BOOLEAN' ? (
                            <select
                                value={defaultValue}
                                onChange={(e) => setDefaultValue(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                            >
                                <option value="">Nessun valore predefinito</option>
                                <option value="true">Sì</option>
                                <option value="false">No</option>
                            </select>
                        ) : type === 'DROPDOWN' || type === 'MULTI_CHOICE' ? (
                            <select
                                value={defaultValue}
                                onChange={(e) => setDefaultValue(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                            >
                                <option value="">Nessun valore predefinito</option>
                                {options.split('\n').filter(o => o.trim()).map(opt => (
                                    <option key={opt} value={opt.trim()}>{opt.trim()}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type={type === 'NUMBER' ? 'number' : type === 'DATE' ? 'date' : 'text'}
                                value={defaultValue}
                                onChange={(e) => setDefaultValue(e.target.value)}
                                placeholder="Valore che verrà inserito automaticamente"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                            Questo valore sarà pre-compilato quando si crea una nuova visita
                        </p>
                    </div>

                    {/* Options for dropdown/multi-choice */}
                    {(type === 'DROPDOWN' || type === 'MULTI_CHOICE') && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Opzioni (una per riga)
                            </label>
                            <textarea
                                value={options}
                                onChange={(e) => setOptions(e.target.value)}
                                placeholder="Opzione 1&#10;Opzione 2&#10;Opzione 3"
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent font-mono text-sm"
                            />
                        </div>
                    )}

                    {/* Placeholder */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Placeholder
                            <span className="ml-1 text-xs font-normal text-gray-400">(solo suggerimento visivo)</span>
                        </label>
                        <input
                            type="text"
                            value={placeholder}
                            onChange={(e) => setPlaceholder(e.target.value)}
                            placeholder="Es: Inserisci peso in kg..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Testo grigio mostrato nel campo vuoto. <strong>Non viene salvato</strong>, scompare quando si digita.
                        </p>
                    </div>

                    {/* Required */}
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={required}
                            onChange={(e) => setRequired(e.target.checked)}
                            className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">Campo obbligatorio</span>
                    </label>

                    {/* Carry over from previous visit */}
                    <div className="pt-2 border-t border-gray-200">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={carryOverFromPrevious}
                                onChange={(e) => setCarryOverFromPrevious(e.target.checked)}
                                className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700">🔄 Recupera da visita precedente</span>
                        </label>
                        <p className="mt-1 text-xs text-gray-500 ml-6">
                            Il valore verrà copiato dall'ultima visita del paziente
                        </p>
                    </div>

                    {/* Show chart for numeric fields */}
                    {(type === 'NUMBER' || type === 'VITALS') && (
                        <div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showChart}
                                    onChange={(e) => setShowChart(e.target.checked)}
                                    className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                                />
                                <span className="text-sm text-gray-700">📊 Mostra grafico storico</span>
                            </label>
                            <p className="mt-1 text-xs text-gray-500 ml-6">
                                Visualizza un grafico con l'andamento storico dei valori
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                    {onDelete ? (
                        <button
                            onClick={onDelete}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Elimina
                        </button>
                    ) : (
                        <div />
                    )}

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
                        >
                            Annulla
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-1.5 text-sm bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors"
                        >
                            Salva
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

interface ResizeState {
    fieldId: string | null;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
}

const FieldLayoutGrid: React.FC<FieldLayoutGridProps> = ({ fields, onFieldsChange }) => {
    const [dragState, setDragState] = useState<DragState>({
        fieldId: null,
        startCell: null,
        currentCell: null
    });
    const [resizeState, setResizeState] = useState<ResizeState>({
        fieldId: null,
        startX: 0,
        startY: 0,
        startWidth: 0,
        startHeight: 0
    });
    const [activeTab, setActiveTab] = useState<string>('anamnesi');
    const [editingField, setEditingField] = useState<VisitField | null>(null);
    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    // Campi con posizioni assegnate
    const positionedFields = useMemo(() => {
        return assignDefaultPositions(fields);
    }, [fields]);

    // Sezioni presenti con ordine definito
    const sections = useMemo(() => {
        const presentSections = new Set(fields.map(f => f.section || 'anamnesi'));
        const onlySpecialistSections = presentSections.size > 0
            && Array.from(presentSections).every(section => SPECIALIST_SECTION_ORDER.includes(section as typeof SPECIALIST_SECTION_ORDER[number]));
        const baseOrder = onlySpecialistSections ? SPECIALIST_SECTION_ORDER : SECTION_ORDER;
        const known = baseOrder.filter(s => presentSections.has(s));
        const custom = Array.from(presentSections).filter(s => !SECTION_ORDER.includes(s as typeof SECTION_ORDER[number]));
        return [...known, ...custom];
    }, [fields]);

    React.useEffect(() => {
        if (sections.length === 0) return;
        const activeHasFields = fields.some(field => (field.section || 'anamnesi') === activeTab && field.visible !== false);
        if (!sections.includes(activeTab) || !activeHasFields) {
            setActiveTab(sections[0]);
        }
    }, [activeTab, fields, sections]);

    // Campi filtrati per tab attivo e visibili. I template legacy senza flag visible
    // vengono considerati visibili, altrimenti il layout risulta vuoto.
    const filteredFields = useMemo(() => {
        return positionedFields.filter(f => f.section === activeTab && f.visible !== false);
    }, [positionedFields, activeTab]);

    // Conta campi per sezione (solo visibili nel layout, visible === true)
    const fieldCountBySection = useMemo(() => {
        const counts: Record<string, number> = {};
        fields.forEach(f => {
            if (f.visible !== false) {
                const section = f.section || 'anamnesi';
                counts[section] = (counts[section] || 0) + 1;
            }
        });
        return counts;
    }, [fields]);

    // Calcola il numero di righe necessarie
    const maxRow = useMemo(() => {
        let max = 0;
        filteredFields.forEach(f => {
            const row = f.position?.row || 0;
            const height = f.size?.height || 1;
            max = Math.max(max, row + height);
        });
        return Math.max(max, 3); // Minimo 3 righe
    }, [filteredFields]);

    // Handler drag start
    const handleDragStart = useCallback((fieldId: string, e: React.DragEvent) => {
        const field = positionedFields.find(f => f.id === fieldId);
        if (field && field.position) {
            // Imposta i dati del drag
            e.dataTransfer.setData('text/plain', fieldId);
            e.dataTransfer.effectAllowed = 'move';

            setDragState({
                fieldId,
                startCell: field.position,
                currentCell: field.position
            });
        }
    }, [positionedFields]);

    // Handler drag end
    const handleDragEnd = useCallback(() => {
        const { fieldId, currentCell } = dragState;
        if (fieldId && currentCell) {
            // Clamp col to ensure field stays within grid bounds
            const field = positionedFields.find(f => f.id === fieldId);
            const fieldWidth = field?.size?.width || 4;
            const clampedCol = Math.max(0, Math.min(currentCell.col, GRID_COLS - fieldWidth));
            const newPosition = { row: currentCell.row, col: clampedCol };
            const updatedFields = fields.map(f => {
                if (f.id === fieldId) {
                    return {
                        ...f,
                        position: newPosition
                    };
                }
                return f;
            });
            onFieldsChange(updatedFields);
        }
        setDragState({ fieldId: null, startCell: null, currentCell: null });
    }, [dragState, fields, positionedFields, onFieldsChange]);

    // Handler drag over - calcola la cella in base alla posizione del mouse
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        if (!gridRef.current || !dragState.fieldId) return;

        const rect = gridRef.current.getBoundingClientRect();
        const paddingLeft = 16; // p-4
        const paddingTop = 16;
        const gap = 8; // gap-2

        const cellWidth = (rect.width - paddingLeft * 2 - gap * (GRID_COLS - 1)) / GRID_COLS;
        const cellHeight = 50 + gap; // gridAutoRows: 50px + gap

        const x = e.clientX - rect.left - paddingLeft;
        const y = e.clientY - rect.top - paddingTop;

        // Clamp col so the field doesn't exceed grid width
        const draggedField = positionedFields.find(f => f.id === dragState.fieldId);
        const fieldWidth = draggedField?.size?.width || 4;
        const col = Math.max(0, Math.min(GRID_COLS - fieldWidth, Math.floor(x / (cellWidth + gap))));
        const row = Math.max(0, Math.floor(y / cellHeight));

        if (dragState.currentCell?.row !== row || dragState.currentCell?.col !== col) {
            setDragState(prev => ({
                ...prev,
                currentCell: { row, col }
            }));
        }
    }, [dragState.fieldId, dragState.currentCell, positionedFields]);

    // Handler drop
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        handleDragEnd();
    }, [handleDragEnd]);

    // Handler resize
    // P52 Session #8: When resizing, also save position from positionedFields to ensure
    // both position and size are persisted correctly in the database
    const handleResize = useCallback((fieldId: string, width: number, height: number) => {
        // Find current position from positionedFields (which includes calculated positions)
        const positionedField = positionedFields.find(f => f.id === fieldId);
        const currentPosition = positionedField?.position || { row: 0, col: 0 };

        // Clamp width to not exceed grid bounds at current position
        const maxAllowedWidth = GRID_COLS - currentPosition.col;
        const clampedWidth = Math.min(width, maxAllowedWidth);

        const updatedFields = fields.map(f => {
            if (f.id === fieldId) {
                return {
                    ...f,
                    position: currentPosition, // P52: Always save position with size
                    size: { width: clampedWidth, height }
                };
            }
            return f;
        });
        onFieldsChange(updatedFields);
    }, [fields, positionedFields, onFieldsChange]);

    // Handler toggle visibility
    const handleToggleVisible = useCallback((fieldId: string) => {
        const updatedFields = fields.map(f => {
            if (f.id === fieldId) {
                return {
                    ...f,
                    visible: !f.visible
                };
            }
            return f;
        });
        onFieldsChange(updatedFields);
    }, [fields, onFieldsChange]);

    // ============================================
    // RESIZE DRAG HANDLERS
    // ============================================

    // Handler resize start - inizia il drag per ridimensionare
    const handleResizeStart = useCallback((fieldId: string, e: React.MouseEvent) => {
        const field = positionedFields.find(f => f.id === fieldId);
        if (!field) return;

        setResizeState({
            fieldId,
            startX: e.clientX,
            startY: e.clientY,
            startWidth: field.size?.width || getDefaultWidth(field.type),
            startHeight: field.size?.height || 1
        });

        setSelectedFieldId(fieldId);
    }, [positionedFields]);

    // Handler resize move - aggiorna le dimensioni durante il drag
    // P52 Session #8: Also save position when resizing to ensure layout is persisted
    const handleResizeMove = useCallback((e: MouseEvent) => {
        if (!resizeState.fieldId || !gridRef.current) return;

        const rect = gridRef.current.getBoundingClientRect();
        const paddingLeft = 16;
        const gap = 8;
        const cellWidth = (rect.width - paddingLeft * 2 - gap * (GRID_COLS - 1)) / GRID_COLS;
        const cellHeight = 50 + gap;

        // Calcola la variazione in celle
        const deltaX = e.clientX - resizeState.startX;
        const deltaY = e.clientY - resizeState.startY;

        const deltaWidth = Math.round(deltaX / (cellWidth + gap));
        const deltaHeight = Math.round(deltaY / cellHeight);

        // Find current position from positionedFields
        const positionedField = positionedFields.find(f => f.id === resizeState.fieldId);
        const currentPosition = positionedField?.position || { row: 0, col: 0 };

        // Clamp width to not exceed grid bounds at current position
        const maxAllowedWidth = GRID_COLS - currentPosition.col;
        const newWidth = Math.max(MIN_WIDTH, Math.min(maxAllowedWidth, resizeState.startWidth + deltaWidth));
        const newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, resizeState.startHeight + deltaHeight));

        // Aggiorna il campo con le nuove dimensioni e la posizione corrente
        const updatedFields = fields.map(f => {
            if (f.id === resizeState.fieldId) {
                return {
                    ...f,
                    position: currentPosition, // P52: Persist position with size
                    size: { width: newWidth, height: newHeight }
                };
            }
            return f;
        });
        onFieldsChange(updatedFields);
    }, [resizeState, fields, positionedFields, onFieldsChange]);

    // Handler resize end - termina il drag
    const handleResizeEnd = useCallback(() => {
        setResizeState({
            fieldId: null,
            startX: 0,
            startY: 0,
            startWidth: 0,
            startHeight: 0
        });
    }, []);

    // Effect per gestire gli eventi mouse globali durante il resize
    React.useEffect(() => {
        if (resizeState.fieldId) {
            const handleMouseMove = (e: MouseEvent) => handleResizeMove(e);
            const handleMouseUp = () => handleResizeEnd();

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [resizeState.fieldId, handleResizeMove, handleResizeEnd]);

    // Auto-arrange fields in current section - dispone i campi evitando sovrapposizioni
    // Preserva le dimensioni esistenti e trova la prima posizione libera
    const handleAutoArrange = useCallback(() => {
        // Matrice di occupazione della griglia
        const occupied: boolean[][] = [];
        const maxRows = 50; // Limite massimo righe

        // Inizializza matrice
        for (let r = 0; r < maxRows; r++) {
            occupied[r] = new Array(GRID_COLS).fill(false);
        }

        // Funzione per verificare se una posizione è libera
        const canPlace = (row: number, col: number, width: number, height: number): boolean => {
            if (col + width > GRID_COLS) return false;
            if (row + height > maxRows) return false;

            for (let r = row; r < row + height; r++) {
                for (let c = col; c < col + width; c++) {
                    if (occupied[r]?.[c]) return false;
                }
            }
            return true;
        };

        // Funzione per marcare una posizione come occupata
        const markOccupied = (row: number, col: number, width: number, height: number) => {
            for (let r = row; r < row + height; r++) {
                for (let c = col; c < col + width; c++) {
                    if (occupied[r]) {
                        occupied[r][c] = true;
                    }
                }
            }
        };

        // Trova la prima posizione libera per un campo
        const findFirstFreePosition = (width: number, height: number): { row: number; col: number } => {
            for (let r = 0; r < maxRows; r++) {
                for (let c = 0; c <= GRID_COLS - width; c++) {
                    if (canPlace(r, c, width, height)) {
                        return { row: r, col: c };
                    }
                }
            }
            return { row: 0, col: 0 }; // Fallback
        };

        // Ordina i campi per sezione, poi per ordine originale
        const fieldsToArrange = fields
            .filter(f => f.section === activeTab && f.visible !== false)
            .sort((a, b) =>
                (a.position?.row ?? 0) - (b.position?.row ?? 0)
                || (a.position?.col ?? 0) - (b.position?.col ?? 0)
                || (a.order ?? 0) - (b.order ?? 0)
            );

        const updatedPositions: Map<string, { row: number; col: number }> = new Map();

        // Per ogni campo, trova la posizione migliore
        fieldsToArrange.forEach(f => {
            // Preserva le dimensioni esistenti
            const width = f.size?.width || getDefaultWidth(f.type);
            const height = f.size?.height || 1;

            // Trova la prima posizione libera
            const position = findFirstFreePosition(width, height);

            // Segna come occupata
            markOccupied(position.row, position.col, width, height);

            // Salva la nuova posizione
            updatedPositions.set(f.id!, position);
        });

        // Aggiorna tutti i campi con le nuove posizioni
        const updatedFields = fields.map(f => {
            const newPos = updatedPositions.get(f.id!);
            if (newPos) {
                return {
                    ...f,
                    position: newPos
                };
            }
            return f;
        });

        onFieldsChange(updatedFields);
    }, [fields, activeTab, onFieldsChange]);

    // Add new custom field
    // P52 Session #11 FIX: Usa generateUniqueId per ID univoci garantiti
    const handleAddField = useCallback(() => {
        // Calculate next available row in current section
        const sectionFields = positionedFields.filter(f => f.section === activeTab && f.visible !== false);
        let maxRow = 0;
        sectionFields.forEach(f => {
            const row = f.position?.row || 0;
            const height = f.size?.height || 1;
            maxRow = Math.max(maxRow, row + height);
        });

        const defaultWidth = 6; // Default width for new TEXT fields

        // P52 Session #11: Genera ID univoco per evitare collisioni
        const uniqueId = generateUniqueId();

        const newField: VisitField = {
            id: `custom_${uniqueId}`,
            name: `custom_field_${uniqueId}`,
            label: 'Nuovo campo',
            type: 'TEXT' as VisitFieldType,
            section: activeTab,
            position: { row: maxRow, col: 0 }, // P52: Position at end of section
            size: { width: defaultWidth, height: 1 }, // P52: Default size
            required: false,
            visible: true,
            order: filteredFields.length,
            defaultValue: '',
            placeholder: ''
        };
        onFieldsChange([...fields, newField]);
        setEditingField(newField);
    }, [fields, positionedFields, activeTab, filteredFields.length, onFieldsChange]);

    // Update field
    const handleUpdateField = useCallback((fieldId: string, updates: Partial<VisitField>) => {
        const updatedFields = fields.map(f => {
            if (f.id === fieldId) {
                return { ...f, ...updates };
            }
            return f;
        });
        onFieldsChange(updatedFields);
    }, [fields, onFieldsChange]);

    // Delete field (only custom fields)
    const handleDeleteField = useCallback((fieldId: string) => {
        const updatedFields = fields.filter(f => f.id !== fieldId);
        onFieldsChange(updatedFields);
        setEditingField(null);
    }, [fields, onFieldsChange]);

    return (
        <div className="space-y-4">
            {/* Tab navigation per sezioni */}
            <div className="border-b border-gray-200">
                <nav className="flex -mb-px gap-1 overflow-x-auto">
                    {sections.map(section => {
                        const colors = SECTION_COLORS[section] || SECTION_COLORS.esame;
                        const count = fieldCountBySection[section] || 0;
                        const isActive = activeTab === section;

                        return (
                            <button
                                key={section}
                                onClick={() => setActiveTab(section)}
                                className={`
                                    flex items-center gap-2 px-4 py-2.5 text-sm font-medium
                                    border-b-2 transition-colors whitespace-nowrap
                                    ${isActive
                                        ? `${colors.text} border-current`
                                        : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                                    }
                                `}
                            >
                                {SECTION_LABELS[section] || section}
                                <span className={`
                                    px-1.5 py-0.5 text-xs rounded-full
                                    ${isActive ? `${colors.bg} ${colors.text}` : 'bg-gray-100 text-gray-500'}
                                `}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5 text-gray-500" />
                    <span className="font-medium text-gray-900">
                        Layout {SECTION_LABELS[activeTab] || activeTab}
                    </span>
                    <span className="text-sm text-gray-500">
                        ({filteredFields.length} campi)
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Add field button */}
                    <button
                        onClick={handleAddField}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Aggiungi campo
                    </button>

                    {/* Auto-arrange button */}
                    <button
                        onClick={handleAutoArrange}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                        <Move className="w-4 h-4" />
                        Auto-disponi
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div
                ref={gridRef}
                className="bg-gray-100 rounded-lg p-4 overflow-x-auto"
                style={{ minHeight: `${maxRow * 60 + 32}px` }}
                onClick={() => setSelectedFieldId(null)}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                {filteredFields.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                        <LayoutGrid className="w-12 h-12 mb-2 opacity-50" />
                        <p className="font-medium">Nessun campo visibile in questa sezione</p>
                        <p className="text-sm">Vai nel tab "Campi" e seleziona i campi da rendere visibili</p>
                    </div>
                ) : (
                    <div
                        className="grid gap-2"
                        style={{
                            gridTemplateColumns: `repeat(${GRID_COLS}, minmax(40px, 1fr))`,
                            gridAutoRows: '50px'
                        }}
                    >
                        {/* Grid background guides */}
                        {Array.from({ length: GRID_COLS }).map((_, col) => (
                            <div
                                key={`guide-${col}`}
                                className="bg-gray-200/50 rounded h-full"
                                style={{
                                    gridColumn: col + 1,
                                    gridRow: `1 / ${maxRow + 1}`
                                }}
                            />
                        ))}

                        {/* Drop target indicator */}
                        {dragState.fieldId && dragState.currentCell && (() => {
                            const dragField = positionedFields.find(f => f.id === dragState.fieldId);
                            const fieldWidth = dragField?.size?.width || 3;
                            const fieldHeight = dragField?.size?.height || 1;
                            const dropCol = dragState.currentCell.col;
                            // Clamp span to not exceed grid
                            const clampedWidth = Math.min(fieldWidth, GRID_COLS - dropCol);
                            return (
                                <div
                                    className="bg-teal-200/50 border-2 border-dashed border-teal-500 rounded-lg pointer-events-none z-10"
                                    style={{
                                        gridColumn: `${dropCol + 1} / span ${clampedWidth}`,
                                        gridRow: `${dragState.currentCell.row + 1} / span ${fieldHeight}`
                                    }}
                                />
                            );
                        })()}

                        {/* Fields */}
                        {filteredFields.map(field => {
                            const row = (field.position?.row || 0) + 1;
                            const col = (field.position?.col || 0) + 1;
                            const fieldCol = field.position?.col || 0;
                            const maxFieldWidth = GRID_COLS - fieldCol;
                            const isFieldSelected = selectedFieldId === field.id;
                            const isFieldDragging = dragState.fieldId === field.id;
                            const isFieldResizing = resizeState.fieldId === field.id;

                            return (
                                <div
                                    key={field.id}
                                    style={{
                                        gridColumn: `${col} / span ${Math.min(field.size?.width || 4, maxFieldWidth)}`,
                                        gridRow: `${row} / span ${field.size?.height || 1}`,
                                        // Z-index management: selected/dragging/resizing fields come to front
                                        zIndex: isFieldSelected || isFieldDragging || isFieldResizing ? 30 : 1,
                                        position: 'relative'
                                    }}
                                >
                                    <FieldCard
                                        field={field}
                                        maxWidth={maxFieldWidth}
                                        isDragging={dragState.fieldId === field.id}
                                        isSelected={selectedFieldId === field.id}
                                        isResizing={resizeState.fieldId === field.id}
                                        onSelect={setSelectedFieldId}
                                        onDragStart={handleDragStart}
                                        onDragEnd={handleDragEnd}
                                        onResize={handleResize}
                                        onResizeStart={handleResizeStart}
                                        onToggleVisible={handleToggleVisible}
                                        onOpenSettings={setEditingField}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Help text */}
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                <p className="font-medium mb-1">💡 Suggerimenti:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Clicca su un campo per selezionarlo e modificarne le dimensioni</li>
                    <li>Trascina i campi per riposizionarli nella griglia</li>
                    <li>Trascina l'angolo inferiore destro per ridimensionare</li>
                    <li>Clicca l'icona ⚙️ per modificare le impostazioni e il valore predefinito</li>
                    <li>Usa le frecce ◀▶ per la larghezza (1-12 colonne) e ▲▼ per l'altezza (1-6 righe)</li>
                </ul>
            </div>

            {/* Field settings modal */}
            {editingField && (
                <FieldSettingsModal
                    field={editingField}
                    onUpdate={(updates) => handleUpdateField(editingField.id!, updates)}
                    onDelete={editingField.id?.startsWith('custom_') ? () => handleDeleteField(editingField.id!) : undefined}
                    onClose={() => setEditingField(null)}
                />
            )}
        </div>
    );
};

export default FieldLayoutGrid;
