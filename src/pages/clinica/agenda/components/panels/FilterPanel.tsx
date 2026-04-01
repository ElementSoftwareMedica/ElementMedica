/**
 * Filter Panel Component
 * 
 * Pannello laterale con filtri per ambulatori, medici, date e orari.
 * Stile compatto per sidebar.
 * 
 * @module pages/clinica/agenda/components/panels
 */

import React, { useMemo } from 'react';
import { Calendar, Clock, Building2, Stethoscope } from 'lucide-react';

import { ZoomMode, ColorScheme } from '../../types';
import { TIME_PRESETS, MEDICO_COLORS } from '../../constants';
import { MiniCalendar } from './MiniCalendar';
import { DatePickerElegante } from '../../../../../components/ui/DatePickerElegante';
import { Ambulatorio, Medico } from '../../../../../services/clinicaApi';

// ============================================
// COMPONENT PROPS
// ============================================

export interface FilterPanelProps {
    /** Lista ambulatori */
    ambulatori: Ambulatorio[];
    /** Lista medici */
    medici: Medico[];
    /** ID ambulatori selezionati */
    selectedAmbulatori: string[];
    /** ID medico selezionato (per creazione slot) */
    selectedMedico: string | null;
    /** ID medici filtrati (per visualizzazione) */
    filterMedici: string[];
    /** Date selezionate */
    selectedDates: Date[];
    /** Mese corrente del mini calendario */
    calendarMonth: Date;
    /** Mappa colori medici */
    medicoColors: Map<string, ColorScheme>;
    // Zoom controls
    /** Ora inizio visualizzazione */
    viewStartHour: number;
    /** Ora fine visualizzazione */
    viewEndHour: number;
    /** Modalità zoom */
    zoomMode: ZoomMode;
    /** Handler cambio orario */
    onZoomChange: (startHour: number, endHour: number) => void;
    /** Handler cambio modalità zoom */
    onZoomModeChange: (mode: ZoomMode) => void;
    // Callbacks
    /** Handler toggle ambulatorio */
    onAmbulatorioToggle: (id: string) => void;
    /** Handler seleziona tutti ambulatori */
    onSelectAllAmbulatori: () => void;
    /** Handler deseleziona tutti ambulatori */
    onClearAmbulatori: () => void;
    /** Handler selezione medico (per creazione) */
    onMedicoSelect: (id: string | null) => void;
    /** Handler toggle medico filtro */
    onFilterMedicoToggle: (id: string) => void;
    /** Handler seleziona tutti medici */
    onSelectAllMedici: (allIds: string[]) => void;
    /** Handler deseleziona tutti medici */
    onClearMediciFilter: () => void;
    /** Handler toggle medici per specialità */
    onToggleSpecialtyMedici: (medicoIds: string[], select: boolean) => void;
    /** Handler toggle data */
    onDateToggle: (date: Date) => void;
    /** Handler selezione multipla date */
    onDatesSelect: (dates: Date[]) => void;
    /** Handler cambio mese */
    onMonthChange: (delta: number) => void;
    /** Handler chiusura pannello */
    onClose: () => void;
}

// ============================================
// COMPONENT
// ============================================

/**
 * FilterPanel - Pannello filtri laterale
 * 
 * Features:
 * - Mini calendario con selezione date
 * - Selettore range date
 * - Controlli orario con preset
 * - Filtro ambulatori con checkbox
 * - Filtro medici raggruppati per specialità
 */
export const FilterPanel: React.FC<FilterPanelProps> = ({
    ambulatori,
    medici,
    selectedAmbulatori,
    selectedMedico,
    filterMedici,
    selectedDates,
    calendarMonth,
    medicoColors,
    viewStartHour,
    viewEndHour,
    zoomMode,
    onZoomChange,
    onZoomModeChange,
    onAmbulatorioToggle,
    onSelectAllAmbulatori,
    onClearAmbulatori,
    onMedicoSelect,
    onFilterMedicoToggle,
    onSelectAllMedici,
    onClearMediciFilter,
    onToggleSpecialtyMedici,
    onDateToggle,
    onDatesSelect,
    onMonthChange,
    onClose
}) => {
    // Group doctors by specialty
    const mediciBySpecialty = useMemo(() => {
        const grouped: Record<string, Medico[]> = {};
        const noSpecialty: Medico[] = [];

        medici.forEach(medico => {
            const specialties = medico.specialties || [];
            if (specialties.length === 0) {
                noSpecialty.push(medico);
            } else {
                specialties.forEach(spec => {
                    if (!grouped[spec]) grouped[spec] = [];
                    grouped[spec].push(medico);
                });
            }
        });

        // Sort specialties alphabetically
        const sortedGroups = Object.keys(grouped).sort().reduce((acc, key) => {
            acc[key] = grouped[key];
            return acc;
        }, {} as Record<string, Medico[]>);

        // Add "Altro" group for doctors without specialty
        if (noSpecialty.length > 0) {
            sortedGroups['Altro'] = noSpecialty;
        }

        return sortedGroups;
    }, [medici]);

    // Check if all doctors in a specialty are selected
    const isSpecialtySelected = (specialty: string) => {
        const docs = mediciBySpecialty[specialty] || [];
        if (docs.length === 0) return false;
        return docs.every(m => filterMedici.includes(m.id));
    };

    // Check if some (but not all) doctors in a specialty are selected
    const isSpecialtyPartial = (specialty: string) => {
        const docs = mediciBySpecialty[specialty] || [];
        if (docs.length === 0) return false;
        const selectedCount = docs.filter(m => filterMedici.includes(m.id)).length;
        return selectedCount > 0 && selectedCount < docs.length;
    };

    // Toggle all doctors in a specialty
    const handleToggleSpecialty = (specialty: string) => {
        const docs = mediciBySpecialty[specialty] || [];
        const docIds = docs.map(m => m.id);
        const allSelected = isSpecialtySelected(specialty);
        onToggleSpecialtyMedici(docIds, !allSelected);
    };

    return (
        <div className="w-64 h-full bg-white border-r border-gray-200 shadow-lg overflow-y-auto">
            {/* Mini Calendar */}
            <MiniCalendar
                currentMonth={calendarMonth}
                selectedDates={selectedDates}
                onDateToggle={onDateToggle}
                onDatesSelect={onDatesSelect}
                onMonthChange={onMonthChange}
            />

            {/* Date range selector */}
            <div className="px-3 py-2 border-b border-gray-200 bg-gray-50/50">
                <div className="flex items-center gap-1 mb-2">
                    <Calendar className="h-3 w-3 text-gray-500" />
                    <span className="text-[10px] font-medium text-gray-600">Seleziona periodo</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                        <label className="text-[9px] text-gray-400 uppercase">Da</label>
                        <DatePickerElegante
                            value={selectedDates.length > 0 ? selectedDates[0].toISOString().split('T')[0] : ''}
                            onChange={(date) => {
                                if (!date) return;
                                const startDate = date;
                                const endDate = selectedDates.length > 1
                                    ? selectedDates[selectedDates.length - 1]
                                    : startDate;
                                // Generate all dates in range
                                const dates: Date[] = [];
                                const current = new Date(startDate);
                                while (current <= endDate) {
                                    dates.push(new Date(current));
                                    current.setDate(current.getDate() + 1);
                                }
                                onDatesSelect(dates);
                            }}
                            theme="teal"
                            size="sm"
                        />
                    </div>
                    <span className="text-gray-400 text-xs mt-3">-</span>
                    <div className="flex-1 min-w-0">
                        <label className="text-[9px] text-gray-400 uppercase">A</label>
                        <DatePickerElegante
                            value={selectedDates.length > 0 ? selectedDates[selectedDates.length - 1].toISOString().split('T')[0] : ''}
                            onChange={(date) => {
                                if (!date) return;
                                const endDate = date;
                                const startDate = selectedDates.length > 0
                                    ? selectedDates[0]
                                    : endDate;
                                // Generate all dates in range
                                const dates: Date[] = [];
                                const current = new Date(startDate);
                                while (current <= endDate) {
                                    dates.push(new Date(current));
                                    current.setDate(current.getDate() + 1);
                                }
                                onDatesSelect(dates);
                            }}
                            theme="teal"
                            size="sm"
                        />
                    </div>
                </div>
                {selectedDates.length > 0 && (
                    <div className="mt-1 text-[9px] text-gray-500">
                        {selectedDates.length} giorn{selectedDates.length === 1 ? 'o' : 'i'} selezionat{selectedDates.length === 1 ? 'o' : 'i'}
                    </div>
                )}
            </div>

            {/* Zoom/Orario controls - FIRST after date selection */}
            <div className="border-b border-gray-200 p-3">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-600 uppercase flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Orario
                    </span>
                </div>

                {/* Quick presets */}
                <div className="flex gap-1 mb-2">
                    <button
                        onClick={() => onZoomChange(TIME_PRESETS.mattina.start, TIME_PRESETS.mattina.end)}
                        className={`flex-1 text-[10px] px-2 py-1 rounded transition-colors ${viewStartHour === TIME_PRESETS.mattina.start && viewEndHour === TIME_PRESETS.mattina.end
                            ? 'bg-teal-600 text-white'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            }`}
                    >
                        Mattina
                    </button>
                    <button
                        onClick={() => onZoomChange(TIME_PRESETS.pomeriggio.start, TIME_PRESETS.pomeriggio.end)}
                        className={`flex-1 text-[10px] px-2 py-1 rounded transition-colors ${viewStartHour === TIME_PRESETS.pomeriggio.start && viewEndHour === TIME_PRESETS.pomeriggio.end
                            ? 'bg-teal-600 text-white'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            }`}
                    >
                        Pomeriggio
                    </button>
                    <button
                        onClick={() => onZoomChange(TIME_PRESETS.giornata.start, TIME_PRESETS.giornata.end)}
                        className={`flex-1 text-[10px] px-2 py-1 rounded transition-colors ${viewStartHour === TIME_PRESETS.giornata.start && viewEndHour === TIME_PRESETS.giornata.end
                            ? 'bg-teal-600 text-white'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            }`}
                    >
                        Giornata
                    </button>
                </div>

                {/* Custom time range */}
                <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1">
                        <label className="text-[10px] text-gray-500">Da</label>
                        <select
                            value={viewStartHour}
                            onChange={(e) => onZoomChange(Number(e.target.value), Math.max(Number(e.target.value) + 1, viewEndHour))}
                            className="w-full text-xs border border-gray-200 rounded px-1.5 py-1"
                        >
                            {Array.from({ length: 15 }, (_, i) => i + 6).map(h => (
                                <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>
                            ))}
                        </select>
                    </div>
                    <span className="text-gray-400 mt-3">-</span>
                    <div className="flex-1">
                        <label className="text-[10px] text-gray-500">A</label>
                        <select
                            value={viewEndHour}
                            onChange={(e) => onZoomChange(Math.min(Number(e.target.value) - 1, viewStartHour), Number(e.target.value))}
                            className="w-full text-xs border border-gray-200 rounded px-1.5 py-1"
                        >
                            {Array.from({ length: 15 }, (_, i) => i + 7).map(h => (
                                <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Zoom mode toggle */}
                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">Modalità</span>
                    <div className="flex gap-1">
                        <button
                            onClick={() => onZoomModeChange('scroll')}
                            className={`text-[10px] px-2 py-0.5 rounded transition-colors ${zoomMode === 'scroll'
                                ? 'bg-teal-100 text-teal-700'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                                }`}
                            title="Altezza fissa con scroll se necessario"
                        >
                            Scroll
                        </button>
                        <button
                            onClick={() => onZoomModeChange('fixed')}
                            className={`text-[10px] px-2 py-0.5 rounded transition-colors ${zoomMode === 'fixed'
                                ? 'bg-teal-100 text-teal-700'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                                }`}
                            title="Adatta all'altezza disponibile"
                        >
                            Adatta
                        </button>
                    </div>
                </div>
            </div>

            {/* Ambulatori section - AFTER Orario */}
            <div className="border-b border-gray-200">
                <div className="px-3 py-2 flex items-center justify-between bg-gray-50">
                    <span className="text-xs font-semibold text-gray-600 uppercase flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        Ambulatori
                    </span>
                    <div className="flex gap-1">
                        <button
                            onClick={onSelectAllAmbulatori}
                            className="text-[10px] px-1.5 py-0.5 bg-teal-50 hover:bg-teal-100 rounded text-teal-700"
                        >
                            Tutti
                        </button>
                        <button
                            onClick={onClearAmbulatori}
                            className="text-[10px] px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
                        >
                            Nessuno
                        </button>
                    </div>
                </div>
                <div className="max-h-32 overflow-y-auto">
                    {ambulatori.map((amb, idx) => {
                        const isSelected = selectedAmbulatori.includes(amb.id);
                        const borderColors = ['border-teal-400', 'border-blue-400', 'border-purple-400', 'border-amber-400'];
                        return (
                            <label
                                key={amb.id}
                                className="flex items-center gap-2 px-3 py-1 cursor-pointer hover:bg-gray-50"
                            >
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => onAmbulatorioToggle(amb.id)}
                                    className="w-3 h-3 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                />
                                <div className={`w-2 h-2 rounded-full ${borderColors[idx % borderColors.length].replace('border-', 'bg-')}`} />
                                <span className={`text-xs truncate ${isSelected ? 'text-gray-900' : 'text-gray-400'}`}>
                                    {amb.nome}
                                </span>
                            </label>
                        );
                    })}
                </div>
            </div>

            {/* Medici section - LAST in the filter panel */}
            <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <span className="text-xs font-semibold text-gray-600 uppercase flex items-center gap-1">
                    <Stethoscope className="h-3 w-3" />
                    Medici
                </span>
                <div className="flex gap-1">
                    <button
                        onClick={() => onSelectAllMedici(medici.map(m => m.id))}
                        className="text-[10px] px-1.5 py-0.5 bg-teal-50 hover:bg-teal-100 rounded text-teal-700"
                    >
                        Tutti
                    </button>
                    <button
                        onClick={onClearMediciFilter}
                        className="text-[10px] px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
                    >
                        Nessuno
                    </button>
                </div>
            </div>

            {/* Medici grouped by specialty - with individual checkboxes */}
            <div className="flex-1 overflow-y-auto">
                {Object.entries(mediciBySpecialty).map(([specialty, docs]) => (
                    <div key={specialty} className="border-b border-gray-100">
                        {/* Specialty header - only show if multiple specialties */}
                        {Object.keys(mediciBySpecialty).length > 1 && (
                            <button
                                onClick={() => handleToggleSpecialty(specialty)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs bg-gray-50 hover:bg-gray-100"
                            >
                                <input
                                    type="checkbox"
                                    checked={isSpecialtySelected(specialty)}
                                    ref={el => {
                                        if (el) el.indeterminate = isSpecialtyPartial(specialty);
                                    }}
                                    onChange={() => handleToggleSpecialty(specialty)}
                                    className="w-3 h-3 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                />
                                <span className="font-medium text-gray-600">{specialty}</span>
                                <span className="text-gray-400 ml-auto">({docs.length})</span>
                            </button>
                        )}

                        {/* Doctors list - with individual checkboxes for each doctor */}
                        {docs.map(medico => {
                            const color = medicoColors.get(medico.id);
                            const isSelected = filterMedici.includes(medico.id);
                            return (
                                <label
                                    key={`${specialty}-${medico.id}`}
                                    className="flex items-center gap-2 px-3 py-1 cursor-pointer hover:bg-gray-50"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onFilterMedicoToggle(medico.id);
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => onFilterMedicoToggle(medico.id)}
                                        className="w-3 h-3 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                    />
                                    <div
                                        className={`w-2.5 h-2.5 rounded-full ${isSelected ? color?.dot || 'bg-gray-400' : 'bg-gray-200'}`}
                                    />
                                    <span className={`text-xs flex-1 truncate ${isSelected ? 'text-gray-900' : 'text-gray-400'}`}>
                                        {medico.lastName || medico.cognome} {medico.firstName || medico.nome}
                                    </span>
                                    {medico.specialties?.[0] && (
                                        <span className="text-[10px] px-1 bg-gray-100 text-gray-500 rounded">
                                            {medico.specialties[0].substring(0, 3).toUpperCase()}
                                        </span>
                                    )}
                                </label>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FilterPanel;
