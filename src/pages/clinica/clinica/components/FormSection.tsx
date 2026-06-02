/**
 * FormSection - Render a section of form fields with grid-based layout
 * 
 * Respects the layout configuration from the template:
 * - position: { row, col } for grid placement
 * - size: { width, height } for span (12 column grid)
 * 
 * Supports different layout modes:
 * - 'sections': Card with expandable header (default)
 * - 'continuous': No card wrapper, continuous flow
 * 
 * @module pages/clinica/clinica/components/FormSection
 * @project P52 - Clinical Visit Template System
 */

import React, { useMemo, useCallback } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import DynamicField from './DynamicField';
import type { FormSectionProps } from '../types';
import type { VisitField } from '../../../../services/clinicaApi';
import { IconRenderer } from '../utils/iconMapper';

// Grid configuration - 12 column system
const GRID_COLS = 12;

const normalizeFieldsForRender = (fields: VisitField[]): VisitField[] => {
    const occupied = new Set<string>();
    let hasOverlap = false;

    fields.forEach((field, index) => {
        const row = Number.isFinite(field.position?.row) ? Math.max(0, field.position!.row) : index;
        const col = Number.isFinite(field.position?.col) ? Math.max(0, Math.min(GRID_COLS - 1, field.position!.col)) : 0;
        const width = Math.max(1, Math.min(field.size?.width || GRID_COLS, GRID_COLS - col));
        const height = Math.max(1, field.size?.height || 1);
        for (let r = row; r < row + height; r += 1) {
            for (let c = col; c < col + width; c += 1) {
                const key = `${r}:${c}`;
                if (occupied.has(key)) hasOverlap = true;
                occupied.add(key);
            }
        }
    });

    if (!hasOverlap) return fields;

    let row = 0;
    let col = 0;
    return fields.map(field => {
        const fullWidthTypes = new Set(['TEXTAREA', 'RICHTEXT', 'RICH_TEXT', 'DOCUMENT_UPLOAD', 'STRUMENTARIO_IMPORT', 'CHART']);
        const desiredWidth = fullWidthTypes.has(String(field.type))
            ? GRID_COLS
            : Math.max(3, Math.min(field.size?.width || 6, GRID_COLS));
        if (col + desiredWidth > GRID_COLS) {
            row += 1;
            col = 0;
        }
        const normalized = {
            ...field,
            position: { ...(field.position || {}), row, col },
            size: { ...(field.size || {}), width: desiredWidth, height: Math.max(1, field.size?.height || 1) },
        };
        col += desiredWidth;
        if (col >= GRID_COLS) {
            row += 1;
            col = 0;
        }
        return normalized;
    });
};

/**
 * Calculate grid placement styles for a field
 * Supports both width (columns) and height (rows) from template configuration
 * Uses explicit row positioning for proper alignment of fields in the same row
 */
const getFieldGridStyle = (field: VisitField, index: number, totalFields: number, compact = false): React.CSSProperties => {
    const position = field.position || { row: index, col: 0 };
    const size = field.size || { width: GRID_COLS, height: 1 };

    // Clamp values to valid ranges
    const colStart = Math.max(1, Math.min(position.col + 1, GRID_COLS)); // CSS grid is 1-indexed
    const colSpan = Math.max(1, Math.min(size.width, GRID_COLS - position.col));
    const rowStart = position.row + 1; // CSS grid is 1-indexed
    const rowSpan = Math.max(1, size.height);

    if (compact) {
        return {
            gridColumn: `${colStart} / span ${colSpan}`,
        };
    }

    return {
        gridColumn: `${colStart} / span ${colSpan}`,
        gridRow: `${rowStart} / span ${rowSpan}`,
    };
};

/**
 * Organize fields into rows based on their position configuration
 */
const organizeFieldsIntoRows = (fields: VisitField[]): VisitField[][] => {
    if (!fields.length) return [];

    // Group fields by row
    const rowMap = new Map<number, VisitField[]>();

    fields.forEach((field, index) => {
        const row = field.position?.row ?? index;
        if (!rowMap.has(row)) {
            rowMap.set(row, []);
        }
        rowMap.get(row)!.push(field);
    });

    // Sort fields within each row by column
    rowMap.forEach((rowFields) => {
        rowFields.sort((a, b) => (a.position?.col ?? 0) - (b.position?.col ?? 0));
    });

    // Return rows sorted by row number
    return Array.from(rowMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([, rowFields]) => rowFields);
};

export const FormSection: React.FC<FormSectionProps & {
    isExpanded: boolean;
    onToggleExpand: () => void;
    layout?: 'sections' | 'continuous';
    compact?: boolean;
    showNormalPresetButton?: boolean;
}> = ({
    section,
    values,
    errors,
    onChange,
    disabled = false,
    isExpanded,
    onToggleExpand,
    layout = 'sections',
    compact = false,
    showNormalPresetButton = true,
    pazienteId,        // P52 Session #13b: For inline chart feature
    onOpenFullChart,   // P52 Session #13b: Callback to open full chart view
    visitaId           // R17: For STRUMENTARIO_IMPORT auto-fill from bridge
}) => {
        const renderFieldsList = useMemo(() => normalizeFieldsForRender(section.fields), [section.fields]);

        // Organize fields into rows for grid layout
        const fieldRows = useMemo(() => organizeFieldsIntoRows(renderFieldsList), [renderFieldsList]);

        // Flatten fields in order for auto-advance
        const orderedFields = useMemo(() => {
            return fieldRows.flat();
        }, [fieldRows]);

        const normalPresetEntries = useMemo(() => {
            return section.fields
                .map(field => {
                    const metadata = field.metadata as { normalPreset?: unknown } | undefined;
                    return metadata?.normalPreset !== undefined
                        ? [field.name, metadata.normalPreset] as const
                        : null;
                })
                .filter(Boolean) as Array<readonly [string, unknown]>;
        }, [section.fields]);

        const applyNormalPreset = useCallback(() => {
            normalPresetEntries.forEach(([fieldName, normalValue]) => onChange(fieldName, normalValue));
        }, [normalPresetEntries, onChange]);

        // Handle auto-advance to next field
        const handleAdvanceToNext = useCallback((currentFieldName: string) => {
            const currentIndex = orderedFields.findIndex(f => f.name === currentFieldName);
            if (currentIndex >= 0 && currentIndex < orderedFields.length - 1) {
                const nextField = orderedFields[currentIndex + 1];
                // Find the next input element by data-field-name
                const nextInput = document.querySelector(`[data-field-name="${nextField.name}"]`) as HTMLInputElement;
                if (nextInput) {
                    nextInput.focus();
                    // Select all existing content so user can overwrite immediately
                    if (nextInput.select) {
                        nextInput.select();
                    }
                }
            }
        }, [orderedFields]);

        // Render fields with grid layout
        const renderFields = () => {
            if (renderFieldsList.length === 0) {
                return (
                    <p className="text-gray-400 text-center py-8">
                        Nessun campo in questa sezione
                    </p>
                );
            }

            return (
                <div
                    className={`grid ${compact ? 'gap-x-2 gap-y-2' : 'gap-x-4 gap-y-3'}`}
                    style={{
                        gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
                        gridAutoRows: compact ? 'minmax(38px, auto)' : 'minmax(50px, auto)',
                        alignItems: 'stretch',
                    }}
                >
                    {renderFieldsList.map((field, index) => {
                        // P52 Session #8: Fields with height > 1 should stretch to fill their grid span
                        const fieldHeight = field.size?.height ?? 1;
                        const shouldStretch = fieldHeight > 1;

                        return (
                            <div
                                key={field.id}
                                style={getFieldGridStyle(field, index, renderFieldsList.length, compact)}
                                className={`min-w-0 ${shouldStretch ? 'h-full' : 'self-start'}`}
                            >
                                <DynamicField
                                    field={field}
                                    value={values[field.name]}
                                    onChange={(value) => onChange(field.name, value)}
                                    error={errors[field.name]}
                                    disabled={disabled}
                                    onAdvanceToNext={() => handleAdvanceToNext(field.name)}
                                    shouldStretch={shouldStretch}
                                    allValues={values}
                                    pazienteId={pazienteId}
                                    onOpenFullChart={onOpenFullChart}
                                    visitaId={visitaId}
                                    compact={compact}
                                />
                            </div>
                        );
                    })}
                </div>
            );
        };

        // Continuous layout: no card wrapper, just section title and fields
        if (layout === 'continuous') {
            return (
                <div id={`section-${section.section}`} className="scroll-mt-32">
                    {/* Section Title — compact for continuous flow */}
                    <div className={`flex items-center gap-2 border-b border-gray-100 ${compact ? 'mb-2 pb-1.5' : 'mb-3 pb-2'}`}>
                        <IconRenderer icon={section.icon} className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-teal-600`} />
                        <h3 className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-gray-800`}>
                            {section.label}
                        </h3>
                        <span className="text-xs text-gray-400">({section.fields.length})</span>
                        {showNormalPresetButton && normalPresetEntries.length > 0 && !disabled && (
                            <button
                                type="button"
                                onClick={applyNormalPreset}
                                className={`ml-auto rounded-full border border-emerald-200 bg-emerald-50 font-semibold text-emerald-700 hover:bg-emerald-100 ${compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'}`}
                            >
                                Compila normalità
                            </button>
                        )}
                    </div>

                    {/* Fields with grid layout */}
                    <div className={compact ? 'mb-2' : 'mb-4'}>
                        {renderFields()}
                    </div>
                </div>
            );
        }

        // Default sections layout: card with expandable header
        return (
            <div id={`section-${section.section}`} className="bg-white rounded-xl border border-gray-200 shadow-sm scroll-mt-32">
                {/* Section Header */}
                <button
                    onClick={onToggleExpand}
                    className="rounded-t-xl w-full flex items-center justify-between px-6 py-4 bg-gray-50 
                         hover:bg-gray-100 transition-colors border-b border-gray-100"
                >
                    <div className="flex items-center gap-3">
                        <IconRenderer icon={section.icon} className="w-6 h-6 text-teal-600" />
                        <div className="text-left">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {section.label}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {section.fields.length} campi
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {showNormalPresetButton && normalPresetEntries.length > 0 && !disabled && (
                            <span
                                role="button"
                                tabIndex={0}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    applyNormalPreset();
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        applyNormalPreset();
                                    }
                                }}
                                className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                            >
                                Compila normalità
                            </span>
                        )}
                        {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                    </div>
                </button>

                {/* Section Content with grid layout */}
                {isExpanded && (
                    <div className="p-6">
                        {renderFields()}
                    </div>
                )}
            </div>
        );
    };

export default FormSection;
