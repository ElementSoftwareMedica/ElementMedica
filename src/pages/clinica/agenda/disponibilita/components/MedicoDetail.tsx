/**
 * MedicoDetail - Vista dettaglio medico con disponibilità complete
 * @module pages/clinica/agenda/disponibilita/components/MedicoDetail
 */

import React, { useState, useCallback } from 'react';
import {
    ArrowLeft,
    User,
    Clock,
    Calendar,
    CalendarOff,
    Plus,
    Trash2,
    CalendarDays,
    AlertTriangle,
    RefreshCw,
    Zap,
    Edit
} from 'lucide-react';
import { getDoctorTitle } from '../../../../../utils/codiceFiscale';
import { WeekCalendar } from './WeekCalendar';
import type {
    MedicoWithStats,
    DisponibilitaMedico,
    SlotDisponibilita,
    FerieAssenza,
    Ambulatorio,
    TabType
} from '../types';
import { GIORNI_SETTIMANA, MOTIVI_ASSENZA } from '../types';
import { DatePickerElegante } from '../../../../../components/ui/DatePickerElegante';

/** Data for creating a weekly slot pattern */
interface CreateSlotData {
    medicoId: string;
    giorno: number;
    oraInizio: string;
    oraFine: string;
    ambulatorioId: string | null;
    durataSlot: number;
    maxAppuntamenti: number | null;
    validoDal: string | null;
    validoAl: string | null;
}

/** Data for creating a single-day slot */
interface CreateSingleSlotData {
    medicoId: string;
    data: string;
    oraInizio: string;
    oraFine: string;
    ambulatorioId: string | null;
}

/** Data for creating a leave/absence period */
interface CreateFerieData {
    medicoId: string;
    dataInizio: string;
    dataFine: string;
    motivo: string;
    note: string;
}

interface MedicoDetailProps {
    medico: MedicoWithStats;
    disponibilita: DisponibilitaMedico[];
    slots: SlotDisponibilita[];
    ferie: FerieAssenza[];
    ambulatori: Ambulatorio[];
    onBack: () => void;
    onCreateSlot: (data: CreateSlotData) => Promise<unknown>;
    onUpdateSlot?: (id: string, data: Partial<CreateSlotData>) => Promise<unknown>;
    onDeleteSlot: (id: string) => Promise<unknown>;
    onCreateSingleSlot: (data: CreateSingleSlotData) => Promise<unknown>;
    onDeleteSingleSlot: (id: string) => Promise<unknown>;
    onCreateFerie: (data: CreateFerieData) => Promise<unknown>;
    onDeleteFerie: (id: string) => Promise<unknown>;
    onGenerateSlots?: (medicoId: string, dataInizio: string, dataFine: string) => Promise<{ created: number; skipped: number; errors: number; details: string[] }>;
    isLoading: boolean;
}

export const MedicoDetail: React.FC<MedicoDetailProps> = ({
    medico,
    disponibilita,
    slots,
    ferie,
    ambulatori,
    onBack,
    onCreateSlot,
    onUpdateSlot,
    onDeleteSlot,
    onCreateSingleSlot,
    onDeleteSingleSlot,
    onCreateFerie,
    onDeleteFerie,
    onGenerateSlots,
    isLoading
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('orari');
    const [showSlotForm, setShowSlotForm] = useState(false);
    const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
    const [showSingleSlotForm, setShowSingleSlotForm] = useState(false);
    const [showFerieForm, setShowFerieForm] = useState(false);

    const firstName = medico.firstName || medico.nome || '';
    const lastName = medico.lastName || medico.cognome || '';
    const title = getDoctorTitle(medico.taxCode, medico.gender);

    // Form states
    const [slotForm, setSlotForm] = useState({
        giorno: 1,
        oraInizio: '09:00',
        oraFine: '13:00',
        ambulatorioId: '',
        durataSlot: 30,
        maxAppuntamenti: '' as string | number,
        validoDal: new Date().toISOString().split('T')[0],
        validoAl: ''
    });

    const [singleSlotForm, setSingleSlotForm] = useState({
        data: new Date().toISOString().split('T')[0],
        oraInizio: '09:00',
        oraFine: '13:00',
        ambulatorioId: ''
    });

    const [ferieForm, setFerieForm] = useState({
        dataInizio: '',
        dataFine: '',
        motivo: 'ferie',
        note: ''
    });

    // Generate slots state — default date range: today → 3 months from now
    const defaultDataFine = (() => {
        const d = new Date();
        d.setMonth(d.getMonth() + 3);
        return d.toISOString().split('T')[0];
    })();
    const [showGenerateForm, setShowGenerateForm] = useState(false);
    const [generateForm, setGenerateForm] = useState({
        dataInizio: new Date().toISOString().split('T')[0],
        dataFine: defaultDataFine
    });
    const [generateResult, setGenerateResult] = useState<{ created: number; skipped: number; errors: number; details: string[] } | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Handlers
    const handleCreateSlot = useCallback(async () => {
        // Validation: oraFine must be after oraInizio
        if (slotForm.oraFine <= slotForm.oraInizio) {
            return;
        }
        // Ambulatorio is required for slot generation and calendario display
        if (!slotForm.ambulatorioId) {
            return;
        }
        await onCreateSlot({
            medicoId: medico.id,
            giorno: slotForm.giorno,
            oraInizio: slotForm.oraInizio,
            oraFine: slotForm.oraFine,
            ambulatorioId: slotForm.ambulatorioId || null,
            durataSlot: slotForm.durataSlot,
            maxAppuntamenti: slotForm.maxAppuntamenti ? Number(slotForm.maxAppuntamenti) : null,
            validoDal: slotForm.validoDal || new Date().toISOString().split('T')[0],
            validoAl: slotForm.validoAl || null
        });
        setShowSlotForm(false);
        setEditingSlotId(null);
        setSlotForm({ giorno: 1, oraInizio: '09:00', oraFine: '13:00', ambulatorioId: '', durataSlot: 30, maxAppuntamenti: '', validoDal: new Date().toISOString().split('T')[0], validoAl: '' });
    }, [slotForm, medico.id, onCreateSlot]);

    // Edit existing slot handler
    const handleEditSlot = useCallback((disp: DisponibilitaMedico) => {
        setSlotForm({
            giorno: disp.giorno,
            oraInizio: disp.oraInizio,
            oraFine: disp.oraFine,
            ambulatorioId: disp.ambulatorioId || '',
            durataSlot: disp.durataSlot || 30,
            maxAppuntamenti: disp.maxAppuntamenti ?? '',
            validoDal: disp.validoDal ? new Date(disp.validoDal).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            validoAl: disp.validoAl ? new Date(disp.validoAl).toISOString().split('T')[0] : ''
        });
        setEditingSlotId(disp.id);
        setShowSlotForm(true);
    }, []);

    // Update slot handler
    const handleUpdateSlot = useCallback(async () => {
        if (!editingSlotId || !onUpdateSlot) return;
        if (slotForm.oraFine <= slotForm.oraInizio) return;
        if (!slotForm.ambulatorioId) return;
        await onUpdateSlot(editingSlotId, {
            medicoId: medico.id,
            giorno: slotForm.giorno,
            oraInizio: slotForm.oraInizio,
            oraFine: slotForm.oraFine,
            ambulatorioId: slotForm.ambulatorioId || null,
            durataSlot: slotForm.durataSlot,
            maxAppuntamenti: slotForm.maxAppuntamenti ? Number(slotForm.maxAppuntamenti) : null,
            validoDal: slotForm.validoDal || new Date().toISOString().split('T')[0],
            validoAl: slotForm.validoAl || null
        });
        setShowSlotForm(false);
        setEditingSlotId(null);
        setSlotForm({ giorno: 1, oraInizio: '09:00', oraFine: '13:00', ambulatorioId: '', durataSlot: 30, maxAppuntamenti: '', validoDal: new Date().toISOString().split('T')[0], validoAl: '' });
    }, [editingSlotId, slotForm, medico.id, onUpdateSlot]);

    // Drag-to-create handler: pre-fill form and open modal
    const handleDragCreateSlot = useCallback((giorno: number, oraInizio: string, oraFine: string) => {
        setSlotForm(prev => ({
            ...prev,
            giorno,
            oraInizio,
            oraFine
        }));
        setShowSlotForm(true);
    }, []);

    const handleCreateSingleSlot = useCallback(async () => {
        if (!singleSlotForm.data || singleSlotForm.oraFine <= singleSlotForm.oraInizio) {
            return;
        }
        await onCreateSingleSlot({
            medicoId: medico.id,
            data: singleSlotForm.data,
            oraInizio: singleSlotForm.oraInizio,
            oraFine: singleSlotForm.oraFine,
            ambulatorioId: singleSlotForm.ambulatorioId || null
        });
        setShowSingleSlotForm(false);
        setSingleSlotForm({
            data: new Date().toISOString().split('T')[0],
            oraInizio: '09:00',
            oraFine: '13:00',
            ambulatorioId: ''
        });
    }, [singleSlotForm, medico.id, onCreateSingleSlot]);

    const handleCreateFerie = useCallback(async () => {
        if (!ferieForm.dataInizio || !ferieForm.dataFine) return;
        await onCreateFerie({
            medicoId: medico.id,
            dataInizio: ferieForm.dataInizio,
            dataFine: ferieForm.dataFine,
            motivo: ferieForm.motivo,
            note: ferieForm.note
        });
        setShowFerieForm(false);
        setFerieForm({ dataInizio: '', dataFine: '', motivo: 'ferie', note: '' });
    }, [ferieForm, medico.id, onCreateFerie]);

    // Generate slots handler
    const handleGenerateSlots = useCallback(async () => {
        if (!onGenerateSlots || !generateForm.dataInizio || !generateForm.dataFine) return;
        setIsGenerating(true);
        setGenerateResult(null);
        try {
            const result = await onGenerateSlots(medico.id, generateForm.dataInizio, generateForm.dataFine);
            setGenerateResult(result);
        } catch {
            setGenerateResult({ created: 0, skipped: 0, errors: 1, details: ['Errore durante la generazione'] });
        } finally {
            setIsGenerating(false);
        }
    }, [onGenerateSlots, generateForm, medico.id]);

    // Active vacation check
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeVacation = ferie.find(f => {
        const start = new Date(f.dataInizio);
        const end = new Date(f.dataFine);
        return start <= today && end >= today;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-gray-600" />
                </button>

                <div className="flex-1">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-md">
                            <User className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {title} {lastName} {firstName}
                            </h1>
                            <p className="text-gray-500">
                                {medico.specialties?.join(', ') || medico.specializzazione || 'Medico generico'}
                            </p>
                            {activeVacation && (
                                <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-sm">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    In ferie fino al {new Date(activeVacation.dataFine).toLocaleDateString('it-IT')}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-6 mt-4">
                        <div className="flex items-center gap-2 text-gray-600">
                            <Clock className="h-5 w-5" />
                            <span className="font-medium">{medico.weeklyHours}h/settimana</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="h-5 w-5" />
                            <span className="font-medium">{disponibilita.length} fasce orarie</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                            <CalendarDays className="h-5 w-5" />
                            <span className="font-medium">{slots.length} slot singoli</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            if (activeTab === 'orari') setShowSlotForm(true);
                            else if (activeTab === 'singole') setShowSingleSlotForm(true);
                            else setShowFerieForm(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                    >
                        <Plus className="h-5 w-5" />
                        {activeTab === 'orari' ? 'Nuovo Orario' : activeTab === 'singole' ? 'Nuova Disponibilità' : 'Nuova Assenza'}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-white rounded-lg p-1 border border-gray-200 w-fit">
                <button
                    onClick={() => setActiveTab('orari')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'orari'
                        ? 'bg-teal-100 text-teal-700'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    <Clock className="h-4 w-4" />
                    Orari Settimanali
                </button>
                <button
                    onClick={() => setActiveTab('singole')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'singole'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    <CalendarDays className="h-4 w-4" />
                    Disponibilità Singole
                    {slots.length > 0 && (
                        <span className="px-1.5 py-0.5 bg-blue-200 text-blue-700 rounded text-xs">
                            {slots.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('ferie')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'ferie'
                        ? 'bg-amber-100 text-amber-700'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    <CalendarOff className="h-4 w-4" />
                    Ferie e Assenze
                    {ferie.length > 0 && (
                        <span className="px-1.5 py-0.5 bg-amber-200 text-amber-700 rounded text-xs">
                            {ferie.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <RefreshCw className="h-8 w-8 text-teal-600 animate-spin" />
                </div>
            ) : (
                <>
                    {/* Orari Settimanali */}
                    {activeTab === 'orari' && (
                        <>
                            <WeekCalendar
                                disponibilita={disponibilita}
                                ambulatori={ambulatori}
                                onDeleteDisponibilita={onDeleteSlot}
                                onDragCreateSlot={handleDragCreateSlot}
                                onEditDisponibilita={onUpdateSlot ? handleEditSlot : undefined}
                            />

                            {/* Generate Slots Section */}
                            {onGenerateSlots && disponibilita.length > 0 && (
                                <div className="bg-white rounded-xl border border-teal-200 p-6 mt-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-teal-100 rounded-lg">
                                                <Zap className="h-5 w-5 text-teal-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">Genera Slot Calendario</h3>
                                                <p className="text-sm text-gray-500">Trasforma gli orari settimanali in slot prenotabili nel calendario</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowGenerateForm(!showGenerateForm)}
                                            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium flex items-center gap-2"
                                        >
                                            <CalendarDays className="h-4 w-4" />
                                            {showGenerateForm ? 'Chiudi' : 'Genera Slot'}
                                        </button>
                                    </div>

                                    {/* Info callout: explain the flow */}
                                    {!showGenerateForm && !generateResult && (
                                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-start gap-2">
                                            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <p className="font-medium">Gli orari settimanali non compaiono automaticamente nel calendario.</p>
                                                <p className="mt-0.5 text-blue-600">Clicca &quot;Genera Slot&quot; per creare gli slot prenotabili nel periodo desiderato.</p>
                                            </div>
                                        </div>
                                    )}

                                    {showGenerateForm && (
                                        <div className="border-t border-gray-200 pt-4 mt-2">
                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Da</label>
                                                    <DatePickerElegante
                                                        value={generateForm.dataInizio}
                                                        onChange={(date) => setGenerateForm({ ...generateForm, dataInizio: date ? date.toISOString().split('T')[0] : '' })}
                                                        theme="teal"
                                                        size="sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">A</label>
                                                    <DatePickerElegante
                                                        value={generateForm.dataFine}
                                                        onChange={(date) => setGenerateForm({ ...generateForm, dataFine: date ? date.toISOString().split('T')[0] : '' })}
                                                        theme="teal"
                                                        size="sm"
                                                        minDate={generateForm.dataInizio ? new Date(generateForm.dataInizio) : undefined}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <p className="text-xs text-gray-500">
                                                    Verranno creati slot solo per i giorni con orari configurati. I periodi di ferie saranno esclusi.
                                                    Slot già esistenti non verranno duplicati.
                                                </p>
                                                <button
                                                    onClick={handleGenerateSlots}
                                                    disabled={isGenerating || !generateForm.dataInizio || !generateForm.dataFine}
                                                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2 whitespace-nowrap ml-4"
                                                >
                                                    {isGenerating ? (
                                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Zap className="h-4 w-4" />
                                                    )}
                                                    {isGenerating ? 'Generazione...' : 'Genera'}
                                                </button>
                                            </div>

                                            {generateResult && (
                                                <div className={`mt-4 p-3 rounded-lg text-sm ${generateResult.errors > 0 ? 'bg-red-50 text-red-700' : generateResult.created > 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                                                    <p className="font-medium">
                                                        {generateResult.created} slot creati, {generateResult.skipped} saltati
                                                        {generateResult.errors > 0 && `, ${generateResult.errors} errori`}
                                                    </p>
                                                    {generateResult.details.length > 0 && (
                                                        <ul className="mt-1 text-xs space-y-0.5">
                                                            {generateResult.details.slice(0, 5).map((d, i) => (
                                                                <li key={i}>• {d}</li>
                                                            ))}
                                                            {generateResult.details.length > 5 && (
                                                                <li>...e altri {generateResult.details.length - 5} messaggi</li>
                                                            )}
                                                        </ul>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* Disponibilità Singole */}
                    {activeTab === 'singole' && (
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            {slots.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {slots.map(slot => {
                                        const ambulatorioNome = ambulatori.find(a => a.id === slot.ambulatorioId)?.nome;
                                        return (
                                            <div
                                                key={slot.id}
                                                className="p-4 bg-blue-50 rounded-lg border border-blue-200 group relative"
                                            >
                                                <p className="font-medium text-blue-900">
                                                    {new Date(slot.data).toLocaleDateString('it-IT', {
                                                        weekday: 'long',
                                                        day: 'numeric',
                                                        month: 'long'
                                                    })}
                                                </p>
                                                <p className="text-sm text-blue-700 mt-1">
                                                    {slot.oraInizio} - {slot.oraFine}
                                                </p>
                                                {ambulatorioNome && (
                                                    <p className="text-xs text-blue-600 mt-2">
                                                        📍 {ambulatorioNome}
                                                    </p>
                                                )}
                                                <button
                                                    onClick={() => onDeleteSingleSlot(slot.id)}
                                                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <CalendarDays className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500">Nessuna disponibilità singola</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Ferie e Assenze */}
                    {activeTab === 'ferie' && (
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            {ferie.length > 0 ? (
                                <div className="space-y-4">
                                    {ferie.map(f => {
                                        const start = new Date(f.dataInizio);
                                        const end = new Date(f.dataFine);
                                        const isActive = start <= today && end >= today;
                                        const isPast = end < today;

                                        return (
                                            <div
                                                key={f.id}
                                                className={`p-4 rounded-lg border group relative ${isActive
                                                    ? 'bg-amber-50 border-amber-300'
                                                    : isPast
                                                        ? 'bg-gray-50 border-gray-200 opacity-60'
                                                        : 'bg-blue-50 border-blue-200'
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="font-medium text-gray-900">
                                                            {start.toLocaleDateString('it-IT')} - {end.toLocaleDateString('it-IT')}
                                                        </p>
                                                        <p className="text-sm text-gray-600 mt-1 capitalize">
                                                            {f.motivo}
                                                        </p>
                                                        {f.note && (
                                                            <p className="text-xs text-gray-500 mt-2">
                                                                {f.note}
                                                            </p>
                                                        )}
                                                        {isActive && (
                                                            <div className="mt-2 px-2 py-0.5 bg-amber-200 text-amber-800 rounded text-xs font-medium inline-block">
                                                                In corso
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => onDeleteFerie(f.id)}
                                                        className="p-1.5 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <CalendarOff className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500">Nessuna assenza registrata</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Slot Form Modal */}
            {showSlotForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full p-6">
                        <h3 className="text-lg font-semibold mb-6">{editingSlotId ? 'Modifica Orario Settimanale' : 'Nuovo Orario Settimanale'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Giorno</label>
                                <select
                                    value={slotForm.giorno}
                                    onChange={(e) => setSlotForm({ ...slotForm, giorno: parseInt(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                >
                                    {GIORNI_SETTIMANA.map(g => (
                                        <option key={g.value} value={g.value}>{g.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ora Inizio</label>
                                    <input
                                        type="time"
                                        value={slotForm.oraInizio}
                                        onChange={(e) => setSlotForm({ ...slotForm, oraInizio: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ora Fine</label>
                                    <input
                                        type="time"
                                        value={slotForm.oraFine}
                                        onChange={(e) => setSlotForm({ ...slotForm, oraFine: e.target.value })}
                                        className={`w-full px-3 py-2 border rounded-lg ${slotForm.oraFine <= slotForm.oraInizio ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                                    />
                                    {slotForm.oraFine <= slotForm.oraInizio && (
                                        <p className="text-xs text-red-500 mt-1">L'ora fine deve essere successiva all'ora inizio</p>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Durata Slot (min)</label>
                                    <select
                                        value={slotForm.durataSlot}
                                        onChange={(e) => setSlotForm({ ...slotForm, durataSlot: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    >
                                        <option value={10}>10 minuti</option>
                                        <option value={15}>15 minuti</option>
                                        <option value={20}>20 minuti</option>
                                        <option value={30}>30 minuti</option>
                                        <option value={45}>45 minuti</option>
                                        <option value={60}>1 ora</option>
                                        <option value={90}>1 ora 30 min</option>
                                        <option value={120}>2 ore</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Appuntamenti</label>
                                    <input
                                        type="number"
                                        value={slotForm.maxAppuntamenti}
                                        onChange={(e) => setSlotForm({ ...slotForm, maxAppuntamenti: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        placeholder="Nessun limite"
                                        min={1}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Ambulatorio <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={slotForm.ambulatorioId}
                                    onChange={(e) => setSlotForm({ ...slotForm, ambulatorioId: e.target.value })}
                                    className={`w-full px-3 py-2 border rounded-lg ${!slotForm.ambulatorioId ? 'border-amber-400 bg-amber-50' : 'border-gray-300'
                                        }`}
                                >
                                    <option value="">Seleziona ambulatorio</option>
                                    {ambulatori.map(a => (
                                        <option key={a.id} value={a.id}>{a.nome}</option>
                                    ))}
                                </select>
                                {!slotForm.ambulatorioId && (
                                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        Obbligatorio per la generazione slot nel calendario
                                    </p>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Valido Dal</label>
                                    <DatePickerElegante
                                        value={slotForm.validoDal}
                                        onChange={(date) => setSlotForm({ ...slotForm, validoDal: date ? date.toISOString().split('T')[0] : '' })}
                                        placeholder="Data inizio (opzionale)"
                                        theme="teal"
                                        size="sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Valido Fino Al</label>
                                    <DatePickerElegante
                                        value={slotForm.validoAl}
                                        onChange={(date) => setSlotForm({ ...slotForm, validoAl: date ? date.toISOString().split('T')[0] : '' })}
                                        placeholder="Data fine (opzionale)"
                                        theme="teal"
                                        size="sm"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 -mt-2">Se non specificati, il pattern è valido a tempo indeterminato.</p>
                        </div>
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                            <button
                                onClick={() => { setShowSlotForm(false); setEditingSlotId(null); }}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={editingSlotId ? handleUpdateSlot : handleCreateSlot}
                                disabled={slotForm.oraFine <= slotForm.oraInizio || !slotForm.ambulatorioId}
                                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {editingSlotId ? 'Salva Modifiche' : 'Salva'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Single Slot Form Modal */}
            {showSingleSlotForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full p-6">
                        <h3 className="text-lg font-semibold mb-6">Nuova Disponibilità</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                                <DatePickerElegante
                                    value={singleSlotForm.data}
                                    onChange={(date) => setSingleSlotForm({ ...singleSlotForm, data: date ? date.toISOString().split('T')[0] : '' })}
                                    theme="teal"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ora Inizio</label>
                                    <input
                                        type="time"
                                        value={singleSlotForm.oraInizio}
                                        onChange={(e) => setSingleSlotForm({ ...singleSlotForm, oraInizio: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ora Fine</label>
                                    <input
                                        type="time"
                                        value={singleSlotForm.oraFine}
                                        onChange={(e) => setSingleSlotForm({ ...singleSlotForm, oraFine: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ambulatorio</label>
                                <select
                                    value={singleSlotForm.ambulatorioId}
                                    onChange={(e) => setSingleSlotForm({ ...singleSlotForm, ambulatorioId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                >
                                    <option value="">Seleziona ambulatorio</option>
                                    {ambulatori.map(a => (
                                        <option key={a.id} value={a.id}>{a.nome}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                            <button
                                onClick={() => setShowSingleSlotForm(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleCreateSingleSlot}
                                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                            >
                                Salva
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ferie Form Modal */}
            {showFerieForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full p-6">
                        <h3 className="text-lg font-semibold mb-6">Nuova Assenza</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Inizio</label>
                                    <DatePickerElegante
                                        value={ferieForm.dataInizio}
                                        onChange={(date) => setFerieForm({ ...ferieForm, dataInizio: date ? date.toISOString().split('T')[0] : '' })}
                                        theme="teal"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Fine</label>
                                    <DatePickerElegante
                                        value={ferieForm.dataFine}
                                        onChange={(date) => setFerieForm({ ...ferieForm, dataFine: date ? date.toISOString().split('T')[0] : '' })}
                                        theme="teal"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                                <select
                                    value={ferieForm.motivo}
                                    onChange={(e) => setFerieForm({ ...ferieForm, motivo: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                >
                                    {MOTIVI_ASSENZA.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                                <textarea
                                    value={ferieForm.note}
                                    onChange={(e) => setFerieForm({ ...ferieForm, note: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    rows={3}
                                    placeholder="Note aggiuntive..."
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                            <button
                                onClick={() => setShowFerieForm(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleCreateFerie}
                                disabled={!ferieForm.dataInizio || !ferieForm.dataFine}
                                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
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
