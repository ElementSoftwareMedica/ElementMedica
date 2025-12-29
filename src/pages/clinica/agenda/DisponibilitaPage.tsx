/**
 * DisponibilitaPage - Gestione disponibilità medici e ferie
 * 
 * Permette di configurare orari settimanali e assenze.
 * 
 * @module pages/poliambulatorio/agenda/DisponibilitaPage
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Calendar,
    Clock,
    Plus,
    User,
    Building2,
    Save,
    X,
    Trash2,
    RefreshCw,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    CalendarOff,
    Copy
} from 'lucide-react';
import {
    disponibilitaApi,
    ferieApi,
    mediciApi,
    DisponibilitaMedico,
    FerieAssenza,
    Medico
} from '../../../services/clinicaApi';
import { formatDate } from '../../../utils/dateUtils';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { getDoctorTitle } from '../../../utils/codiceFiscale';
import { useToast } from '../../../hooks/useToast';

// ============================================
// TYPES
// ============================================

type TabType = 'orari' | 'ferie';

interface SlotForm {
    medicoId: string;
    ambulatorioId: string;
    giornoSettimana: number;
    oraInizio: string;
    oraFine: string;
    validoDa: string;
    validoA: string;
}

interface FerieForm {
    medicoId: string;
    dataInizio: string;
    dataFine: string;
    motivo: string;
    note: string;
}

// ============================================
// CONSTANTS
// ============================================

const GIORNI_SETTIMANA = [
    { value: 1, label: 'Lunedì', short: 'Lun' },
    { value: 2, label: 'Martedì', short: 'Mar' },
    { value: 3, label: 'Mercoledì', short: 'Mer' },
    { value: 4, label: 'Giovedì', short: 'Gio' },
    { value: 5, label: 'Venerdì', short: 'Ven' },
    { value: 6, label: 'Sabato', short: 'Sab' },
    { value: 0, label: 'Domenica', short: 'Dom' }
];

const MOTIVI_ASSENZA = [
    { value: 'ferie', label: 'Ferie' },
    { value: 'malattia', label: 'Malattia' },
    { value: 'formazione', label: 'Formazione' },
    { value: 'congedo', label: 'Congedo' },
    { value: 'altro', label: 'Altro' }
];

const INITIAL_SLOT: SlotForm = {
    medicoId: '',
    ambulatorioId: '',
    giornoSettimana: 1,
    oraInizio: '09:00',
    oraFine: '13:00',
    validoDa: new Date().toISOString().split('T')[0],
    validoA: ''
};

const INITIAL_FERIE: FerieForm = {
    medicoId: '',
    dataInizio: '',
    dataFine: '',
    motivo: 'ferie',
    note: ''
};

// ============================================
// COMPONENTS
// ============================================

/**
 * Week Schedule View
 */
const WeekScheduleView: React.FC<{
    disponibilita: DisponibilitaMedico[];
    onDelete: (id: string) => void;
}> = ({ disponibilita, onDelete }) => {
    const scheduleByDay = useMemo(() => {
        const grouped: Record<number, DisponibilitaMedico[]> = {};
        GIORNI_SETTIMANA.forEach(g => { grouped[g.value] = []; });
        disponibilita.forEach(d => {
            if (grouped[d.giornoSettimana]) {
                grouped[d.giornoSettimana].push(d);
            }
        });
        return grouped;
    }, [disponibilita]);

    return (
        <div className="grid grid-cols-7 gap-2">
            {GIORNI_SETTIMANA.map(giorno => (
                <div key={giorno.value} className="bg-gray-50 rounded-lg overflow-hidden">
                    <div className="bg-gray-200 px-2 py-1 text-center text-sm font-medium text-gray-700">
                        {giorno.short}
                    </div>
                    <div className="p-2 min-h-[120px] space-y-1">
                        {scheduleByDay[giorno.value].map(slot => (
                            <div
                                key={slot.id}
                                className="bg-teal-100 text-teal-800 px-2 py-1 rounded text-xs group relative"
                            >
                                <p className="font-medium">{slot.oraInizio} - {slot.oraFine}</p>
                                <button
                                    onClick={() => onDelete(slot.id)}
                                    className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                        {scheduleByDay[giorno.value].length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-4">-</p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

/**
 * Slot Form Modal
 */
const SlotFormModal: React.FC<{
    form: SlotForm;
    onChange: (form: SlotForm) => void;
    onSave: () => void;
    onClose: () => void;
    isLoading: boolean;
    medici: Medico[];
}> = ({ form, onChange, onSave, onClose, isLoading, medici }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Nuovo Orario</h3>
                <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
                    <X className="h-5 w-5" />
                </button>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medico</label>
                    <select
                        value={form.medicoId}
                        onChange={(e) => onChange({ ...form, medicoId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                        <option value="">Seleziona medico</option>
                        {medici.map(m => (
                            <option key={m.id} value={m.id}>{getDoctorTitle(m.taxCode, m.gender)} {m.cognome} {m.nome}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giorno</label>
                    <select
                        value={form.giornoSettimana}
                        onChange={(e) => onChange({ ...form, giornoSettimana: parseInt(e.target.value) })}
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
                            value={form.oraInizio}
                            onChange={(e) => onChange({ ...form, oraInizio: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ora Fine</label>
                        <input
                            type="time"
                            value={form.oraFine}
                            onChange={(e) => onChange({ ...form, oraFine: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Valido Da</label>
                        <input
                            type="date"
                            value={form.validoDa}
                            onChange={(e) => onChange({ ...form, validoDa: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Valido A (opzionale)</label>
                        <input
                            type="date"
                            value={form.validoA}
                            onChange={(e) => onChange({ ...form, validoA: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                    Annulla
                </button>
                <button
                    onClick={onSave}
                    disabled={!form.medicoId || isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                >
                    {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salva
                </button>
            </div>
        </div>
    </div>
);

/**
 * Ferie Card Component
 */
const FerieCard: React.FC<{
    ferie: FerieAssenza;
    medico?: Medico;
    onDelete: () => void;
}> = ({ ferie, medico, onDelete }) => {
    const dataInizio = new Date(ferie.dataInizio);
    const dataFine = new Date(ferie.dataFine);
    const isActive = new Date() >= dataInizio && new Date() <= dataFine;
    const isFuture = new Date() < dataInizio;

    return (
        <div className={`
      p-4 rounded-lg border-2 transition-colors
      ${isActive ? 'border-amber-300 bg-amber-50' : isFuture ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}
    `}>
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <CalendarOff className={`h-5 w-5 ${isActive ? 'text-amber-600' : 'text-gray-500'}`} />
                        {medico && (
                            <span className="font-medium text-gray-900">
                                {getDoctorTitle(medico.taxCode, medico.gender)} {medico.cognome} {medico.nome}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-600">
                        {formatDate(dataInizio, 'short')} - {formatDate(dataFine, 'short')}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 capitalize">{ferie.motivo || 'Ferie'}</p>
                    {ferie.note && (
                        <p className="text-xs text-gray-400 mt-1">{ferie.note}</p>
                    )}
                </div>
                <button
                    onClick={onDelete}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>
            {isActive && (
                <div className="mt-2 px-2 py-1 bg-amber-200 text-amber-800 rounded text-xs font-medium inline-block">
                    In corso
                </div>
            )}
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const DisponibilitaPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    // Tenant filter from global context
    const { getTenantFilterParams, isReady, tenantFilterKey } = useTenantFilter();

    // State
    const [activeTab, setActiveTab] = useState<TabType>('orari');
    const [selectedMedico, setSelectedMedico] = useState<string>('');
    const [showSlotForm, setShowSlotForm] = useState(false);
    const [showFerieForm, setShowFerieForm] = useState(false);
    const [showCopyPattern, setShowCopyPattern] = useState(false);
    const [copySource, setCopySource] = useState<string>('');
    const [copyTarget, setCopyTarget] = useState<string>('');
    const [isCopying, setIsCopying] = useState(false);
    const [slotForm, setSlotForm] = useState<SlotForm>(INITIAL_SLOT);
    const [ferieForm, setFerieForm] = useState<FerieForm>(INITIAL_FERIE);

    // Build tenant query params
    const getTenantParams = () => {
        const tenantParams = getTenantFilterParams();
        return {
            ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
            ...(tenantParams.allTenants && { allTenants: 'true' })
        };
    };

    // Queries
    const { data: mediciData } = useQuery({
        queryKey: ['medici-list', tenantFilterKey],
        queryFn: () => mediciApi.getAll({ limit: 100, ...getTenantParams() }),
        enabled: isReady
    });

    const { data: disponibilitaData, isLoading: loadingDisp } = useQuery({
        queryKey: ['disponibilita', selectedMedico, tenantFilterKey],
        queryFn: () => selectedMedico
            ? disponibilitaApi.getByMedico(selectedMedico)
            : disponibilitaApi.getAll({ limit: 500, ...getTenantParams() }).then(r => r.data),
        enabled: activeTab === 'orari' && isReady
    });

    const { data: ferieData, isLoading: loadingFerie } = useQuery({
        queryKey: ['ferie', selectedMedico, tenantFilterKey],
        queryFn: () => selectedMedico
            ? ferieApi.getByMedico(selectedMedico)
            : ferieApi.getAll({ limit: 500, ...getTenantParams() }).then(r => r.data),
        enabled: activeTab === 'ferie' && isReady
    });

    // Mutations
    const createSlotMutation = useMutation({
        mutationFn: (data: Partial<DisponibilitaMedico>) => disponibilitaApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['disponibilita'] });
            setShowSlotForm(false);
            setSlotForm(INITIAL_SLOT);
        }
    });

    const deleteSlotMutation = useMutation({
        mutationFn: (id: string) => disponibilitaApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['disponibilita'] });
        }
    });

    const createFerieMutation = useMutation({
        mutationFn: (data: Partial<FerieAssenza>) => ferieApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ferie'] });
            setShowFerieForm(false);
            setFerieForm(INITIAL_FERIE);
        }
    });

    const deleteFerieMutation = useMutation({
        mutationFn: (id: string) => ferieApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ferie'] });
        }
    });

    // Handlers
    const handleSaveSlot = () => {
        createSlotMutation.mutate({
            medicoId: slotForm.medicoId,
            ambulatorioId: slotForm.ambulatorioId || undefined,
            giornoSettimana: slotForm.giornoSettimana,
            oraInizio: slotForm.oraInizio,
            oraFine: slotForm.oraFine,
            validoDa: slotForm.validoDa,
            validoA: slotForm.validoA || undefined
        });
    };

    const handleSaveFerie = () => {
        createFerieMutation.mutate({
            medicoId: ferieForm.medicoId,
            dataInizio: ferieForm.dataInizio,
            dataFine: ferieForm.dataFine,
            motivo: ferieForm.motivo,
            note: ferieForm.note || undefined
        });
    };

    const handleDeleteSlot = (id: string) => {
        if (confirm('Eliminare questo orario?')) {
            deleteSlotMutation.mutate(id);
        }
    };

    const handleDeleteFerie = (id: string) => {
        if (confirm('Eliminare questa assenza?')) {
            deleteFerieMutation.mutate(id);
        }
    };

    // Copy weekly pattern from one medico to another
    const handleCopyPattern = async () => {
        if (!copySource || !copyTarget || copySource === copyTarget) {
            showToast({ type: 'warning', message: 'Seleziona due medici diversi' });
            return;
        }

        setIsCopying(true);
        try {
            // Get source medico's disponibilita
            const sourceDisponibilita = await disponibilitaApi.getByMedico(copySource);

            if (!sourceDisponibilita || sourceDisponibilita.length === 0) {
                showToast({ type: 'warning', message: 'Il medico sorgente non ha orari configurati' });
                return;
            }

            // Create copies for target medico
            let copied = 0;
            let errors = 0;

            for (const slot of sourceDisponibilita) {
                try {
                    await disponibilitaApi.create({
                        medicoId: copyTarget,
                        ambulatorioId: slot.ambulatorioId || undefined,
                        giornoSettimana: slot.giornoSettimana,
                        oraInizio: slot.oraInizio,
                        oraFine: slot.oraFine,
                        validoDa: new Date().toISOString().split('T')[0], // Start from today
                        validoA: slot.validoA || undefined
                    });
                    copied++;
                } catch {
                    errors++;
                }
            }

            queryClient.invalidateQueries({ queryKey: ['disponibilita'] });
            setShowCopyPattern(false);
            setCopySource('');
            setCopyTarget('');

            showToast({ type: 'success', message: `Pattern copiato! ${copied} orari creati.${errors > 0 ? ` (${errors} errori)` : ''}` });
        } catch (error) {
            console.error('Copy pattern error:', error);
            showToast({ type: 'error', message: 'Errore durante la copia del pattern' });
        } finally {
            setIsCopying(false);
        }
    };

    const medici = mediciData?.data || [];
    const selectedMedicoData = medici.find(m => m.id === selectedMedico);

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Disponibilità Medici</h1>
                        <p className="text-gray-500 text-sm">Gestisci orari e assenze del personale medico</p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Medico selector */}
                        <select
                            value={selectedMedico}
                            onChange={(e) => setSelectedMedico(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg"
                        >
                            <option value="">Tutti i medici</option>
                            {medici.map(m => (
                                <option key={m.id} value={m.id}>{getDoctorTitle(m.taxCode, m.gender)} {m.cognome} {m.nome}</option>
                            ))}
                        </select>

                        {/* Copy Pattern button */}
                        {activeTab === 'orari' && (
                            <button
                                onClick={() => setShowCopyPattern(true)}
                                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                title="Copia pattern settimanale"
                            >
                                <Copy className="h-5 w-5" />
                                <span className="hidden sm:inline">Copia Pattern</span>
                            </button>
                        )}

                        {/* Add button */}
                        <button
                            onClick={() => activeTab === 'orari' ? setShowSlotForm(true) : setShowFerieForm(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                        >
                            <Plus className="h-5 w-5" />
                            {activeTab === 'orari' ? 'Nuovo Orario' : 'Nuova Assenza'}
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
                        onClick={() => setActiveTab('ferie')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'ferie'
                            ? 'bg-teal-100 text-teal-700'
                            : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        <CalendarOff className="h-4 w-4" />
                        Ferie e Assenze
                    </button>
                </div>

                {/* Content */}
                {activeTab === 'orari' && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        {selectedMedicoData && (
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                                    <User className="h-5 w-5 text-teal-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">
                                        {getDoctorTitle(selectedMedicoData.taxCode, selectedMedicoData.gender)} {selectedMedicoData.cognome} {selectedMedicoData.nome}
                                    </p>
                                    <p className="text-sm text-gray-500">{selectedMedicoData.specializzazione || 'Medico'}</p>
                                </div>
                            </div>
                        )}

                        {loadingDisp ? (
                            <div className="flex justify-center py-12">
                                <RefreshCw className="h-8 w-8 text-teal-600 animate-spin" />
                            </div>
                        ) : (
                            <WeekScheduleView
                                disponibilita={disponibilitaData || []}
                                onDelete={handleDeleteSlot}
                            />
                        )}

                        {(!disponibilitaData || disponibilitaData.length === 0) && !loadingDisp && (
                            <div className="text-center py-12">
                                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">Nessun orario configurato</p>
                                <button
                                    onClick={() => setShowSlotForm(true)}
                                    className="mt-4 text-teal-600 hover:text-teal-700"
                                >
                                    Aggiungi il primo orario
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'ferie' && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        {loadingFerie ? (
                            <div className="flex justify-center py-12">
                                <RefreshCw className="h-8 w-8 text-teal-600 animate-spin" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {(ferieData || []).map(ferie => (
                                    <FerieCard
                                        key={ferie.id}
                                        ferie={ferie}
                                        medico={medici.find(m => m.id === ferie.medicoId)}
                                        onDelete={() => handleDeleteFerie(ferie.id)}
                                    />
                                ))}
                            </div>
                        )}

                        {(!ferieData || ferieData.length === 0) && !loadingFerie && (
                            <div className="text-center py-12">
                                <CalendarOff className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">Nessuna assenza registrata</p>
                                <button
                                    onClick={() => setShowFerieForm(true)}
                                    className="mt-4 text-teal-600 hover:text-teal-700"
                                >
                                    Registra prima assenza
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Slot Form Modal */}
                {showSlotForm && (
                    <SlotFormModal
                        form={slotForm}
                        onChange={setSlotForm}
                        onSave={handleSaveSlot}
                        onClose={() => setShowSlotForm(false)}
                        isLoading={createSlotMutation.isPending}
                        medici={medici}
                    />
                )}

                {/* Ferie Form Modal */}
                {showFerieForm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl max-w-lg w-full p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold">Nuova Assenza</h3>
                                <button onClick={() => setShowFerieForm(false)} className="p-1 hover:bg-gray-100 rounded">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Medico</label>
                                    <select
                                        value={ferieForm.medicoId}
                                        onChange={(e) => setFerieForm({ ...ferieForm, medicoId: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    >
                                        <option value="">Seleziona medico</option>
                                        {medici.map(m => (
                                            <option key={m.id} value={m.id}>{getDoctorTitle(m.taxCode, m.gender)} {m.cognome} {m.nome}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Data Inizio</label>
                                        <input
                                            type="date"
                                            value={ferieForm.dataInizio}
                                            onChange={(e) => setFerieForm({ ...ferieForm, dataInizio: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Data Fine</label>
                                        <input
                                            type="date"
                                            value={ferieForm.dataFine}
                                            onChange={(e) => setFerieForm({ ...ferieForm, dataFine: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Note (opzionale)</label>
                                    <textarea
                                        value={ferieForm.note}
                                        onChange={(e) => setFerieForm({ ...ferieForm, note: e.target.value })}
                                        rows={2}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                                <button
                                    onClick={() => setShowFerieForm(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={handleSaveFerie}
                                    disabled={!ferieForm.medicoId || !ferieForm.dataInizio || !ferieForm.dataFine || createFerieMutation.isPending}
                                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                                >
                                    {createFerieMutation.isPending ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4" />
                                    )}
                                    Salva
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Copy Pattern Modal */}
                {showCopyPattern && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl max-w-md w-full p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-teal-100 rounded-lg">
                                        <Copy className="h-5 w-5 text-teal-600" />
                                    </div>
                                    <h3 className="text-lg font-semibold">Copia Pattern Settimanale</h3>
                                </div>
                                <button onClick={() => setShowCopyPattern(false)} className="p-1 hover:bg-gray-100 rounded">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <p className="text-sm text-gray-500 mb-6">
                                Copia tutti gli orari settimanali da un medico ad un altro. Gli orari copiati avranno come data di inizio validità oggi.
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Da medico (sorgente)
                                    </label>
                                    <select
                                        value={copySource}
                                        onChange={(e) => setCopySource(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    >
                                        <option value="">Seleziona medico sorgente</option>
                                        {medici.map(m => (
                                            <option key={m.id} value={m.id} disabled={m.id === copyTarget}>
                                                {getDoctorTitle(m.taxCode, m.gender)} {m.cognome} {m.nome}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex justify-center">
                                    <div className="p-2 bg-gray-100 rounded-full">
                                        <ChevronRight className="h-5 w-5 text-gray-500 rotate-90" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        A medico (destinazione)
                                    </label>
                                    <select
                                        value={copyTarget}
                                        onChange={(e) => setCopyTarget(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    >
                                        <option value="">Seleziona medico destinazione</option>
                                        {medici.map(m => (
                                            <option key={m.id} value={m.id} disabled={m.id === copySource}>
                                                {getDoctorTitle(m.taxCode, m.gender)} {m.cognome} {m.nome}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                                <button
                                    onClick={() => setShowCopyPattern(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={handleCopyPattern}
                                    disabled={!copySource || !copyTarget || copySource === copyTarget || isCopying}
                                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                                >
                                    {isCopying ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                    Copia Pattern
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DisponibilitaPage;
