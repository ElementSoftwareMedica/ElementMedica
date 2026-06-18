/**
 * ChiusureSpecialiEditor
 * 
 * Componente avanzato per la gestione delle chiusure speciali (festivi, ponti, ferie).
 * Supporta chiusure singole e multi-giorno, ricorrenti, parziali.
 * Include presets per le festività italiane.
 * 
 * @module components/clinica/ChiusureSpecialiEditor
 */

import React, { useState, useMemo } from 'react';
import { useToast } from '../../hooks/useToast';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import { DatePickerElegante } from '../ui/DatePickerElegante';
import { ElegantSelect } from '@/components/ui/ElegantSelect';
import {
    Calendar,
    Plus,
    Trash2,
    Edit2,
    Check,
    X,
    CalendarOff,
    Gift,
    Umbrella,
    Sun,
    Snowflake,
    Star,
    AlertTriangle,
    RefreshCw,
    Filter,
    ChevronDown,
    ChevronUp,
    Clock
} from 'lucide-react';

// Tipi di chiusura
export const TIPI_CHIUSURA = [
    { value: 'FESTIVITA', label: 'Festività', icon: Gift, color: 'text-red-500 bg-red-50' },
    { value: 'PONTE', label: 'Ponte', icon: Umbrella, color: 'text-orange-500 bg-orange-50' },
    { value: 'FERIE_ESTIVE', label: 'Ferie Estive', icon: Sun, color: 'text-yellow-500 bg-yellow-50' },
    { value: 'FERIE_NATALIZIE', label: 'Ferie Natalizie', icon: Snowflake, color: 'text-blue-500 bg-blue-50' },
    { value: 'FERIE_PASQUALI', label: 'Ferie Pasquali', icon: Star, color: 'text-purple-500 bg-purple-50' },
    { value: 'STRAORDINARIA', label: 'Straordinaria', icon: AlertTriangle, color: 'text-amber-500 bg-amber-50' },
    { value: 'FORMAZIONE', label: 'Formazione', icon: Calendar, color: 'text-teal-500 bg-teal-50' },
    { value: 'EVENTO', label: 'Evento', icon: Star, color: 'text-indigo-500 bg-indigo-50' },
    { value: 'ALTRO', label: 'Altro', icon: CalendarOff, color: 'text-gray-500 bg-gray-50' }
] as const;

export type TipoChiusuraSpeciale = typeof TIPI_CHIUSURA[number]['value'];

// Festività italiane
const FESTIVITA_ITALIANE = [
    { nome: 'Capodanno', giorno: 1, mese: 1, tipo: 'FESTIVITA' as const },
    { nome: 'Epifania', giorno: 6, mese: 1, tipo: 'FESTIVITA' as const },
    { nome: 'Festa della Liberazione', giorno: 25, mese: 4, tipo: 'FESTIVITA' as const },
    { nome: 'Festa del Lavoro', giorno: 1, mese: 5, tipo: 'FESTIVITA' as const },
    { nome: 'Festa della Repubblica', giorno: 2, mese: 6, tipo: 'FESTIVITA' as const },
    { nome: 'Ferragosto', giorno: 15, mese: 8, tipo: 'FESTIVITA' as const },
    { nome: 'Ognissanti', giorno: 1, mese: 11, tipo: 'FESTIVITA' as const },
    { nome: 'Immacolata Concezione', giorno: 8, mese: 12, tipo: 'FESTIVITA' as const },
    { nome: 'Natale', giorno: 25, mese: 12, tipo: 'FESTIVITA' as const },
    { nome: 'Santo Stefano', giorno: 26, mese: 12, tipo: 'FESTIVITA' as const }
];

// Periodi comuni di chiusura
const PERIODI_COMUNI = [
    {
        nome: 'Chiusura Natalizia',
        tipo: 'FERIE_NATALIZIE' as const,
        dataInizio: { giorno: 24, mese: 12 },
        dataFine: { giorno: 6, mese: 1, annoSuccessivo: true }
    },
    {
        nome: 'Chiusura Estiva (agosto)',
        tipo: 'FERIE_ESTIVE' as const,
        dataInizio: { giorno: 10, mese: 8 },
        dataFine: { giorno: 25, mese: 8 }
    },
    {
        nome: 'Settimana di Pasqua',
        tipo: 'FERIE_PASQUALI' as const,
        variabile: true,
        descrizione: 'La data varia ogni anno'
    }
];

export interface ChiusuraSpeciale {
    id?: string;
    tipo: TipoChiusuraSpeciale;
    nome: string;
    descrizione?: string;
    dataInizio: string; // ISO date string
    dataFine: string; // ISO date string
    oraInizio?: string; // Per chiusure parziali
    oraFine?: string;
    isParziale: boolean;
    ricorrente: boolean;
    annoRiferimento?: number;
    attivo: boolean;
}

interface ChiusureSpecialiEditorProps {
    value: ChiusuraSpeciale[];
    onChange: (chiusure: ChiusuraSpeciale[]) => void;
    readonly?: boolean;
}

const ChiusureSpecialiEditor: React.FC<ChiusureSpecialiEditorProps> = ({
    value,
    onChange,
    readonly = false
}) => {
    const { showToast } = useToast();
    const { confirmDelete } = useConfirmDialog();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showPresets, setShowPresets] = useState(false);
    const [filterType, setFilterType] = useState<TipoChiusuraSpeciale | 'ALL'>('ALL');
    const [sortOrder, setSortOrder] = useState<'date' | 'type'>('date');
    const [newChiusura, setNewChiusura] = useState<Partial<ChiusuraSpeciale>>({
        tipo: 'FESTIVITA',
        nome: '',
        dataInizio: '',
        dataFine: '',
        isParziale: false,
        ricorrente: false,
        attivo: true
    });

    const currentYear = new Date().getFullYear();

    // Genera ID temporaneo
    const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Filtra e ordina chiusure
    const chiusureFiltrate = useMemo(() => {
        let result = [...value];

        // Filtra per tipo
        if (filterType !== 'ALL') {
            result = result.filter(c => c.tipo === filterType);
        }

        // Ordina
        if (sortOrder === 'date') {
            result.sort((a, b) => new Date(a.dataInizio).getTime() - new Date(b.dataInizio).getTime());
        } else {
            result.sort((a, b) => a.tipo.localeCompare(b.tipo));
        }

        return result;
    }, [value, filterType, sortOrder]);

    // Statistiche
    const stats = useMemo(() => {
        const oggi = new Date();
        oggi.setHours(0, 0, 0, 0);

        return {
            totale: value.length,
            attive: value.filter(c => c.attivo).length,
            ricorrenti: value.filter(c => c.ricorrente).length,
            prossime: value.filter(c => {
                const data = new Date(c.dataInizio);
                return data > oggi && c.attivo;
            }).length
        };
    }, [value]);

    // Aggiungi nuova chiusura
    const handleAdd = () => {
        if (!newChiusura.nome || !newChiusura.dataInizio) return;

        const chiusura: ChiusuraSpeciale = {
            id: generateTempId(),
            tipo: newChiusura.tipo || 'FESTIVITA',
            nome: newChiusura.nome,
            descrizione: newChiusura.descrizione,
            dataInizio: newChiusura.dataInizio,
            dataFine: newChiusura.dataFine || newChiusura.dataInizio, // Se non specificata, stessa data
            oraInizio: newChiusura.isParziale ? newChiusura.oraInizio : undefined,
            oraFine: newChiusura.isParziale ? newChiusura.oraFine : undefined,
            isParziale: newChiusura.isParziale || false,
            ricorrente: newChiusura.ricorrente || false,
            annoRiferimento: newChiusura.ricorrente ? currentYear : undefined,
            attivo: true
        };

        onChange([...value, chiusura]);
        setShowAddForm(false);
        setNewChiusura({
            tipo: 'FESTIVITA',
            nome: '',
            dataInizio: '',
            dataFine: '',
            isParziale: false,
            ricorrente: false,
            attivo: true
        });
    };

    // Rimuovi chiusura
    const handleRemove = async (id: string) => {
        const confirmed = await confirmDelete('chiusura');
        if (confirmed) {
            onChange(value.filter(c => c.id !== id));
        }
    };

    // Toggle attivo
    const handleToggleAttivo = (id: string) => {
        onChange(value.map(c => c.id === id ? { ...c, attivo: !c.attivo } : c));
    };

    // Aggiorna chiusura
    const handleUpdate = (id: string, updates: Partial<ChiusuraSpeciale>) => {
        onChange(value.map(c => c.id === id ? { ...c, ...updates } : c));
    };

    // Aggiungi preset festività
    const addFestivitaItaliane = () => {
        const nuoveFestivita = FESTIVITA_ITALIANE.map(f => {
            const dataInizio = `${currentYear}-${String(f.mese).padStart(2, '0')}-${String(f.giorno).padStart(2, '0')}`;
            return {
                id: generateTempId(),
                tipo: f.tipo,
                nome: f.nome,
                dataInizio,
                dataFine: dataInizio,
                isParziale: false,
                ricorrente: true,
                annoRiferimento: currentYear,
                attivo: true
            };
        });

        // Evita duplicati
        const nomiEsistenti = new Set(value.map(c => c.nome));
        const festivitaDaAggiungere = nuoveFestivita.filter(f => !nomiEsistenti.has(f.nome));

        if (festivitaDaAggiungere.length === 0) {
            showToast({ message: 'Tutte le festività italiane sono già presenti!', type: 'info' });
            return;
        }

        onChange([...value, ...festivitaDaAggiungere]);
        setShowPresets(false);
    };

    // Aggiungi periodo comune
    const addPeriodoComune = (periodo: typeof PERIODI_COMUNI[0]) => {
        if (periodo.variabile || !periodo.dataInizio || !periodo.dataFine) {
            showToast({ message: 'Questo periodo ha data variabile. Inseriscilo manualmente.', type: 'warning' });
            return;
        }

        const annoFine = periodo.dataFine.annoSuccessivo ? currentYear + 1 : currentYear;
        const dataInizio = `${currentYear}-${String(periodo.dataInizio.mese).padStart(2, '0')}-${String(periodo.dataInizio.giorno).padStart(2, '0')}`;
        const dataFine = `${annoFine}-${String(periodo.dataFine.mese).padStart(2, '0')}-${String(periodo.dataFine.giorno).padStart(2, '0')}`;

        const chiusura: ChiusuraSpeciale = {
            id: generateTempId(),
            tipo: periodo.tipo,
            nome: periodo.nome,
            dataInizio,
            dataFine,
            isParziale: false,
            ricorrente: true,
            annoRiferimento: currentYear,
            attivo: true
        };

        onChange([...value, chiusura]);
        setShowPresets(false);
    };

    // Formatta data per display
    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('it-IT', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    // Calcola durata in giorni
    const calcolaDurata = (inizio: string, fine: string): number => {
        const start = new Date(inizio);
        const end = new Date(fine);
        const diff = end.getTime() - start.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
    };

    // Get tipo info
    const getTipoInfo = (tipo: TipoChiusuraSpeciale) => {
        return TIPI_CHIUSURA.find(t => t.value === tipo) || TIPI_CHIUSURA[TIPI_CHIUSURA.length - 1];
    };

    return (
        <div className="space-y-4">
            {/* Header con statistiche */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <CalendarOff className="h-5 w-5 text-teal-600" />
                    <div>
                        <h3 className="font-semibold text-gray-900">Chiusure Speciali</h3>
                        <p className="text-xs text-gray-500">
                            {stats.totale} chiusure ({stats.attive} attive, {stats.prossime} prossime)
                        </p>
                    </div>
                </div>

                {!readonly && (
                    <div className="flex items-center gap-2">
                        {/* Presets */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowPresets(!showPresets)}
                                className="px-3 py-1.5 text-sm bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 flex items-center gap-1"
                            >
                                <Gift className="h-4 w-4" />
                                Presets
                                <ChevronDown className="h-4 w-4" />
                            </button>

                            {showPresets && (
                                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-20">
                                    <div className="p-3 border-b border-gray-100">
                                        <h4 className="font-semibold text-gray-900">Festività Italiane</h4>
                                        <p className="text-xs text-gray-500">Aggiungi tutte le festività nazionali</p>
                                        <button
                                            type="button"
                                            onClick={addFestivitaItaliane}
                                            className="mt-2 w-full px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm flex items-center justify-center gap-2"
                                        >
                                            <Gift className="h-4 w-4" />
                                            Aggiungi tutte ({FESTIVITA_ITALIANE.length})
                                        </button>
                                    </div>

                                    <div className="p-3">
                                        <h4 className="font-semibold text-gray-900 mb-2">Periodi Comuni</h4>
                                        <div className="space-y-1">
                                            {PERIODI_COMUNI.map((periodo, idx) => {
                                                const TipoIcon = getTipoInfo(periodo.tipo).icon;
                                                return (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => addPeriodoComune(periodo)}
                                                        disabled={periodo.variabile}
                                                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                                                    >
                                                        <TipoIcon className="h-4 w-4 text-gray-500" />
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">{periodo.nome}</p>
                                                            {periodo.descrizione && (
                                                                <p className="text-xs text-gray-500">{periodo.descrizione}</p>
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Add button */}
                        <button
                            type="button"
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="px-3 py-1.5 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-1"
                        >
                            <Plus className="h-4 w-4" />
                            Aggiungi
                        </button>
                    </div>
                )}
            </div>

            {/* Form aggiunta */}
            {showAddForm && !readonly && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 space-y-4">
                    <h4 className="font-semibold text-teal-800 flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Nuova Chiusura
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Tipo */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                            <ElegantSelect
                                value={newChiusura.tipo}
                                onChange={(v) => setNewChiusura({ ...newChiusura, tipo: v as TipoChiusuraSpeciale })}
                                options={TIPI_CHIUSURA.map(t => ({ value: t.value, label: t.label }))}
                            />
                        </div>

                        {/* Nome */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                            <input
                                type="text"
                                value={newChiusura.nome || ''}
                                onChange={(e) => setNewChiusura({ ...newChiusura, nome: e.target.value })}
                                placeholder="Es: Natale, Ponte 2 Giugno..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                            />
                        </div>

                        {/* Data inizio */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data Inizio *</label>
                            <DatePickerElegante
                                value={newChiusura.dataInizio || ''}
                                onChange={(date) => setNewChiusura({ ...newChiusura, dataInizio: date ? date.toISOString().split('T')[0] : '' })}
                                theme="teal"
                            />
                        </div>

                        {/* Data fine */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data Fine</label>
                            <DatePickerElegante
                                value={newChiusura.dataFine || ''}
                                onChange={(date) => setNewChiusura({ ...newChiusura, dataFine: date ? date.toISOString().split('T')[0] : '' })}
                                theme="teal"
                            />
                            <p className="text-xs text-gray-500 mt-1">Lascia vuoto per chiusura singola giornata</p>
                        </div>

                        {/* Descrizione */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                            <input
                                type="text"
                                value={newChiusura.descrizione || ''}
                                onChange={(e) => setNewChiusura({ ...newChiusura, descrizione: e.target.value })}
                                placeholder="Note aggiuntive (opzionale)"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                            />
                        </div>
                    </div>

                    {/* Opzioni avanzate */}
                    <div className="flex flex-wrap gap-4 pt-2 border-t border-teal-200">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={newChiusura.isParziale || false}
                                onChange={(e) => setNewChiusura({ ...newChiusura, isParziale: e.target.checked })}
                                className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700">Chiusura parziale</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={newChiusura.ricorrente || false}
                                onChange={(e) => setNewChiusura({ ...newChiusura, ricorrente: e.target.checked })}
                                className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700 flex items-center gap-1">
                                <RefreshCw className="h-3 w-3" />
                                Ricorrente ogni anno
                            </span>
                        </label>
                    </div>

                    {/* Orari chiusura parziale */}
                    {newChiusura.isParziale && (
                        <div className="flex items-center gap-4 pt-2">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Ora Inizio</label>
                                <input
                                    type="time"
                                    value={newChiusura.oraInizio || ''}
                                    onChange={(e) => setNewChiusura({ ...newChiusura, oraInizio: e.target.value })}
                                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Ora Fine</label>
                                <input
                                    type="time"
                                    value={newChiusura.oraFine || ''}
                                    onChange={(e) => setNewChiusura({ ...newChiusura, oraFine: e.target.value })}
                                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                                />
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setShowAddForm(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
                        >
                            Annulla
                        </button>
                        <button
                            type="button"
                            onClick={handleAdd}
                            disabled={!newChiusura.nome || !newChiusura.dataInizio}
                            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Check className="h-4 w-4" />
                            Aggiungi
                        </button>
                    </div>
                </div>
            )}

            {/* Filtri */}
            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <ElegantSelect
                        value={filterType}
                        onChange={(v) => setFilterType(v as TipoChiusuraSpeciale | 'ALL')}
                        options={[{ value: 'ALL', label: 'Tutti i tipi' }, ...TIPI_CHIUSURA.map(t => ({ value: t.value, label: t.label }))]}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Ordina per:</span>
                    <button
                        type="button"
                        onClick={() => setSortOrder(sortOrder === 'date' ? 'type' : 'date')}
                        className="text-sm text-teal-600 hover:text-teal-800 flex items-center gap-1"
                    >
                        {sortOrder === 'date' ? (
                            <>
                                <Calendar className="h-4 w-4" /> Data
                            </>
                        ) : (
                            <>
                                <Filter className="h-4 w-4" /> Tipo
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Lista chiusure */}
            {chiusureFiltrate.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <CalendarOff className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">
                        {filterType !== 'ALL'
                            ? 'Nessuna chiusura di questo tipo'
                            : 'Nessuna chiusura speciale definita'
                        }
                    </p>
                    {!readonly && filterType === 'ALL' && (
                        <p className="text-sm text-gray-400 mt-1">
                            Usa i preset o aggiungi manualmente le chiusure
                        </p>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {chiusureFiltrate.map(chiusura => {
                        const tipoInfo = getTipoInfo(chiusura.tipo);
                        const TipoIcon = tipoInfo.icon;
                        const durata = calcolaDurata(chiusura.dataInizio, chiusura.dataFine);
                        const isMultiDay = durata > 1;
                        const isPast = new Date(chiusura.dataFine) < new Date();

                        return (
                            <div
                                key={chiusura.id}
                                className={`border rounded-xl p-4 transition-all ${!chiusura.attivo
                                    ? 'bg-gray-50 border-gray-200 opacity-60'
                                    : isPast
                                        ? 'bg-gray-50 border-gray-200'
                                        : 'bg-white border-gray-200 hover:border-teal-300'
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-lg ${tipoInfo.color}`}>
                                            <TipoIcon className="h-5 w-5" />
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className={`font-semibold ${chiusura.attivo ? 'text-gray-900' : 'text-gray-500'}`}>
                                                    {chiusura.nome}
                                                </h4>

                                                {chiusura.ricorrente && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                                                        <RefreshCw className="h-3 w-3" />
                                                        Ricorrente
                                                    </span>
                                                )}

                                                {chiusura.isParziale && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                                                        <Clock className="h-3 w-3" />
                                                        Parziale
                                                    </span>
                                                )}

                                                {isPast && chiusura.attivo && (
                                                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                                                        Passata
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-sm text-gray-600 mt-1">
                                                {isMultiDay ? (
                                                    <>
                                                        {formatDate(chiusura.dataInizio)} → {formatDate(chiusura.dataFine)}
                                                        <span className="text-gray-400 ml-2">({durata} giorni)</span>
                                                    </>
                                                ) : (
                                                    formatDate(chiusura.dataInizio)
                                                )}

                                                {chiusura.isParziale && chiusura.oraInizio && chiusura.oraFine && (
                                                    <span className="text-gray-500 ml-2">
                                                        ({chiusura.oraInizio} - {chiusura.oraFine})
                                                    </span>
                                                )}
                                            </p>

                                            {chiusura.descrizione && (
                                                <p className="text-xs text-gray-500 mt-1">{chiusura.descrizione}</p>
                                            )}
                                        </div>
                                    </div>

                                    {!readonly && (
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleAttivo(chiusura.id!)}
                                                className={`p-1.5 rounded transition-colors ${chiusura.attivo
                                                    ? 'text-green-600 hover:bg-green-50'
                                                    : 'text-gray-400 hover:bg-gray-100'
                                                    }`}
                                                title={chiusura.attivo ? 'Disattiva' : 'Attiva'}
                                            >
                                                {chiusura.attivo ? (
                                                    <Check className="h-4 w-4" />
                                                ) : (
                                                    <X className="h-4 w-4" />
                                                )}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleRemove(chiusura.id!)}
                                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Rimuovi"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Legenda */}
            <div className="flex flex-wrap gap-3 text-xs text-gray-500 pt-2 border-t border-gray-100">
                {TIPI_CHIUSURA.slice(0, 5).map(tipo => {
                    const Icon = tipo.icon;
                    return (
                        <span key={tipo.value} className="flex items-center gap-1">
                            <span className={`p-0.5 rounded ${tipo.color}`}>
                                <Icon className="h-3 w-3" />
                            </span>
                            {tipo.label}
                        </span>
                    );
                })}
            </div>
        </div>
    );
};

export default ChiusureSpecialiEditor;
