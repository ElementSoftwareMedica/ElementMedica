/**
 * AppuntamentoForm - Wizard per creazione/modifica appuntamenti
 * 
 * Workflow a 4 step: Paziente → Prestazione → Data/Ora → Conferma
 * 
 * @module pages/poliambulatorio/agenda/AppuntamentoForm
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    User,
    Stethoscope,
    Calendar,
    CheckCircle,
    ArrowLeft,
    ArrowRight,
    Search,
    Clock,
    Building2,
    Users,
    AlertCircle,
    Save,
    X,
    RefreshCw,
    Check,
    Euro,
    CreditCard
} from 'lucide-react';
import {
    appuntamentiApi,
    pazientiApi,
    prestazioniApi,
    ambulatoriApi,
    slotsApi,
    Appuntamento,
    Paziente,
    Prestazione,
    Ambulatorio,
    SlotDisponibilita
} from '../../../services/clinicaApi';
import { formatDate, formatTime } from '../../../utils/dateUtils';

// ============================================
// TYPES
// ============================================

type WizardStep = 1 | 2 | 3 | 4;

interface FormData {
    pazienteId: string;
    prestazioneId: string;
    ambulatorioId: string;
    medicoId: string;
    data: string;
    oraInizio: string;
    durataPrevista: number;
    note: string;
    promemoria: boolean;
    // Payment fields
    pagamentoAnticipato: boolean;
    metodoPagamento: 'contanti' | 'carta' | 'bonifico' | '';
    importoPagato: number;
}

const INITIAL_FORM: FormData = {
    pazienteId: '',
    prestazioneId: '',
    ambulatorioId: '',
    medicoId: '',
    data: '',
    oraInizio: '',
    durataPrevista: 30,
    note: '',
    promemoria: true,
    pagamentoAnticipato: false,
    metodoPagamento: '',
    importoPagato: 0
};

// ============================================
// STEP COMPONENTS
// ============================================

/**
 * Step 1: Paziente Selection
 */
const Step1Paziente: React.FC<{
    selectedId: string;
    onSelect: (id: string) => void;
}> = ({ selectedId, onSelect }) => {
    const [search, setSearch] = useState('');

    const { data: pazientiData, isLoading } = useQuery({
        queryKey: ['pazienti-search', search],
        queryFn: () => pazientiApi.getAll({ search, limit: 20 }),
        enabled: search.length >= 2
    });

    const { data: selectedPaziente } = useQuery({
        queryKey: ['paziente', selectedId],
        queryFn: () => pazientiApi.getById(selectedId),
        enabled: !!selectedId
    });

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Seleziona Paziente</h3>
                <p className="text-sm text-gray-500">Cerca e seleziona il paziente per l'appuntamento</p>
            </div>

            {/* Selected patient */}
            {selectedPaziente && (
                <div className="flex items-center gap-4 p-4 bg-teal-50 border border-teal-200 rounded-lg">
                    <div className="w-12 h-12 rounded-full bg-teal-200 flex items-center justify-center">
                        <User className="h-6 w-6 text-teal-700" />
                    </div>
                    <div className="flex-1">
                        <p className="font-medium text-gray-900">
                            {selectedPaziente.cognome} {selectedPaziente.nome}
                        </p>
                        <p className="text-sm text-gray-500">
                            {selectedPaziente.codiceFiscale || selectedPaziente.email || 'No info'}
                        </p>
                    </div>
                    <button
                        onClick={() => onSelect('')}
                        className="p-2 text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            )}

            {/* Search */}
            {!selectedId && (
                <>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cerca per nome, cognome, CF..."
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>

                    {isLoading && (
                        <div className="flex justify-center py-4">
                            <RefreshCw className="h-6 w-6 text-teal-600 animate-spin" />
                        </div>
                    )}

                    {pazientiData?.data && pazientiData.data.length > 0 && (
                        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                            {pazientiData.data.map(paziente => (
                                <button
                                    key={paziente.id}
                                    onClick={() => onSelect(paziente.id)}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left"
                                >
                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                        <User className="h-5 w-5 text-gray-500" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {paziente.cognome} {paziente.nome}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {paziente.codiceFiscale || paziente.telefono || ''}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {search.length >= 2 && pazientiData?.data?.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <User className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                            <p>Nessun paziente trovato</p>
                            <p className="text-sm">Prova con un altro termine di ricerca</p>
                        </div>
                    )}

                    {search.length < 2 && (
                        <p className="text-center text-sm text-gray-400 py-4">
                            Inserisci almeno 2 caratteri per cercare
                        </p>
                    )}
                </>
            )}
        </div>
    );
};

/**
 * Step 2: Prestazione & Ambulatorio Selection
 */
const Step2Prestazione: React.FC<{
    prestazioneId: string;
    ambulatorioId: string;
    onSelectPrestazione: (id: string) => void;
    onSelectAmbulatorio: (id: string) => void;
    onDurataChange: (durata: number) => void;
}> = ({ prestazioneId, ambulatorioId, onSelectPrestazione, onSelectAmbulatorio, onDurataChange }) => {
    const [searchPrestazione, setSearchPrestazione] = useState('');

    const { data: prestazioniData } = useQuery({
        queryKey: ['prestazioni-list'],
        queryFn: () => prestazioniApi.getAll({ limit: 100, filters: { isActive: true } })
    });

    const { data: ambulatoriData } = useQuery({
        queryKey: ['ambulatori-list'],
        queryFn: () => ambulatoriApi.getAll({ limit: 100, filters: { isActive: true } })
    });

    const filteredPrestazioni = useMemo(() => {
        const data = prestazioniData?.data || [];
        if (!searchPrestazione) return data;
        const term = searchPrestazione.toLowerCase();
        return data.filter(p =>
            p.nome.toLowerCase().includes(term) ||
            p.codice.toLowerCase().includes(term)
        );
    }, [prestazioniData, searchPrestazione]);

    const selectedPrestazione = prestazioniData?.data?.find(p => p.id === prestazioneId);
    const selectedAmbulatorio = ambulatoriData?.data?.find(a => a.id === ambulatorioId);

    // Auto-set duration when prestazione is selected
    useEffect(() => {
        if (selectedPrestazione) {
            onDurataChange(selectedPrestazione.durataPrevista);
        }
    }, [selectedPrestazione, onDurataChange]);

    return (
        <div className="space-y-6">
            {/* Prestazione */}
            <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Seleziona Prestazione</h3>

                {selectedPrestazione ? (
                    <div className="flex items-center gap-4 p-4 bg-teal-50 border border-teal-200 rounded-lg mb-4">
                        <div className="w-10 h-10 rounded-lg bg-teal-200 flex items-center justify-center">
                            <Stethoscope className="h-5 w-5 text-teal-700" />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-gray-900">{selectedPrestazione.nome}</p>
                            <p className="text-sm text-gray-500">
                                {selectedPrestazione.codice} • {selectedPrestazione.durataPrevista} min
                            </p>
                        </div>
                        <button onClick={() => onSelectPrestazione('')} className="p-2 text-gray-400 hover:text-gray-600">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchPrestazione}
                                onChange={(e) => setSearchPrestazione(e.target.value)}
                                placeholder="Cerca prestazione..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                            {filteredPrestazioni.map(prestazione => (
                                <button
                                    key={prestazione.id}
                                    onClick={() => onSelectPrestazione(prestazione.id)}
                                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-teal-300 hover:bg-teal-50 text-left"
                                >
                                    <Stethoscope className="h-5 w-5 text-gray-400" />
                                    <div>
                                        <p className="font-medium text-gray-900 text-sm">{prestazione.nome}</p>
                                        <p className="text-xs text-gray-500">{prestazione.durataPrevista} min</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Ambulatorio */}
            <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Seleziona Ambulatorio</h3>

                {selectedAmbulatorio ? (
                    <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-blue-700" />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-gray-900">{selectedAmbulatorio.nome}</p>
                            <p className="text-sm text-gray-500">{selectedAmbulatorio.specializzazione || 'Generico'}</p>
                        </div>
                        <button onClick={() => onSelectAmbulatorio('')} className="p-2 text-gray-400 hover:text-gray-600">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {ambulatoriData?.data?.map(ambulatorio => (
                            <button
                                key={ambulatorio.id}
                                onClick={() => onSelectAmbulatorio(ambulatorio.id)}
                                className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 text-left"
                            >
                                <Building2 className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="font-medium text-gray-900 text-sm">{ambulatorio.nome}</p>
                                    <p className="text-xs text-gray-500">{ambulatorio.specializzazione || 'Generico'}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * Step 3: Data/Ora Selection
 */
const Step3DataOra: React.FC<{
    data: string;
    oraInizio: string;
    durataPrevista: number;
    ambulatorioId: string;
    onDataChange: (data: string) => void;
    onOraChange: (ora: string) => void;
    onDurataChange: (durata: number) => void;
}> = ({ data, oraInizio, durataPrevista, ambulatorioId, onDataChange, onOraChange, onDurataChange }) => {
    // Query slots disponibili
    const { data: slotsData } = useQuery({
        queryKey: ['slots-available', data, ambulatorioId],
        queryFn: () => slotsApi.getAvailability({
            dataInizio: data,
            dataFine: data,
            ambulatorioId
        }),
        enabled: !!data && !!ambulatorioId
    });

    const timeSlots = useMemo(() => {
        const slots: string[] = [];
        for (let h = 7; h < 20; h++) {
            for (let m = 0; m < 60; m += 30) {
                slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
            }
        }
        return slots;
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Seleziona Data e Ora</h3>
                <p className="text-sm text-gray-500">Scegli quando schedulare l'appuntamento</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Data */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Data appuntamento
                    </label>
                    <input
                        type="date"
                        value={data}
                        onChange={(e) => onDataChange(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                </div>

                {/* Durata */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Durata (minuti)
                    </label>
                    <select
                        value={durataPrevista}
                        onChange={(e) => onDurataChange(parseInt(e.target.value))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    >
                        <option value={15}>15 minuti</option>
                        <option value={30}>30 minuti</option>
                        <option value={45}>45 minuti</option>
                        <option value={60}>1 ora</option>
                        <option value={90}>1 ora 30 min</option>
                        <option value={120}>2 ore</option>
                    </select>
                </div>
            </div>

            {/* Time slots */}
            {data && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Orario disponibile
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[250px] overflow-y-auto p-1">
                        {timeSlots.map(slot => {
                            const isSelected = oraInizio === slot;
                            // Simple availability check (would need backend support)
                            const isAvailable = true;

                            return (
                                <button
                                    key={slot}
                                    onClick={() => onOraChange(slot)}
                                    disabled={!isAvailable}
                                    className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-all
                    ${isSelected
                                            ? 'bg-teal-600 text-white'
                                            : isAvailable
                                                ? 'border border-gray-200 hover:border-teal-300 hover:bg-teal-50'
                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        }
                  `}
                                >
                                    {slot}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Selected summary */}
            {data && oraInizio && (
                <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <Calendar className="h-6 w-6 text-green-600" />
                    <div>
                        <p className="font-medium text-gray-900">
                            {formatDate(new Date(data), 'full')}
                        </p>
                        <p className="text-sm text-gray-500">
                            Dalle {oraInizio} • Durata {durataPrevista} min
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * Step 4: Conferma
 */
const Step4Conferma: React.FC<{
    formData: FormData;
    paziente?: Paziente;
    prestazione?: Prestazione;
    ambulatorio?: Ambulatorio;
    onNoteChange: (note: string) => void;
    onPromemoriaChange: (promemoria: boolean) => void;
    onPagamentoAnticipatoChange: (pagamento: boolean) => void;
    onMetodoPagamentoChange: (metodo: 'contanti' | 'carta' | 'bonifico' | '') => void;
    onImportoPagatoChange: (importo: number) => void;
}> = ({ formData, paziente, prestazione, ambulatorio, onNoteChange, onPromemoriaChange, onPagamentoAnticipatoChange, onMetodoPagamentoChange, onImportoPagatoChange }) => {
    const dataOra = formData.data && formData.oraInizio
        ? new Date(`${formData.data}T${formData.oraInizio}`)
        : null;

    const prezzoBase = prestazione?.prezzo || 0;

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Conferma Appuntamento</h3>
                <p className="text-sm text-gray-500">Verifica i dettagli e conferma la prenotazione</p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Paziente */}
                <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <User className="h-5 w-5 text-gray-500" />
                        <span className="text-sm font-medium text-gray-500">Paziente</span>
                    </div>
                    {paziente ? (
                        <p className="font-medium text-gray-900">
                            {paziente.cognome} {paziente.nome}
                        </p>
                    ) : (
                        <p className="text-gray-400">Non selezionato</p>
                    )}
                </div>

                {/* Prestazione */}
                <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <Stethoscope className="h-5 w-5 text-gray-500" />
                        <span className="text-sm font-medium text-gray-500">Prestazione</span>
                    </div>
                    {prestazione ? (
                        <p className="font-medium text-gray-900">{prestazione.nome}</p>
                    ) : (
                        <p className="text-gray-400">Non selezionata</p>
                    )}
                </div>

                {/* Ambulatorio */}
                <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <Building2 className="h-5 w-5 text-gray-500" />
                        <span className="text-sm font-medium text-gray-500">Ambulatorio</span>
                    </div>
                    {ambulatorio ? (
                        <p className="font-medium text-gray-900">{ambulatorio.nome}</p>
                    ) : (
                        <p className="text-gray-400">Non selezionato</p>
                    )}
                </div>

                {/* Data/Ora */}
                <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-5 w-5 text-gray-500" />
                        <span className="text-sm font-medium text-gray-500">Data e Ora</span>
                    </div>
                    {dataOra ? (
                        <div>
                            <p className="font-medium text-gray-900">{formatDate(dataOra, 'full')}</p>
                            <p className="text-sm text-gray-500">
                                {formData.oraInizio} • {formData.durataPrevista} min
                            </p>
                        </div>
                    ) : (
                        <p className="text-gray-400">Non selezionata</p>
                    )}
                </div>
            </div>

            {/* Riepilogo Prezzo */}
            <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Euro className="h-5 w-5 text-teal-600" />
                        <span className="font-medium text-teal-900">Totale Prestazione</span>
                    </div>
                    <span className="text-2xl font-bold text-teal-700">
                        € {prezzoBase.toFixed(2)}
                    </span>
                </div>
                {prestazione?.durata && (
                    <p className="text-sm text-teal-600 mt-1">
                        Durata stimata: {prestazione.durata} minuti
                    </p>
                )}
            </div>

            {/* Pagamento Anticipato */}
            <div className="border border-gray-200 rounded-lg p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={formData.pagamentoAnticipato}
                        onChange={(e) => {
                            onPagamentoAnticipatoChange(e.target.checked);
                            if (e.target.checked && formData.importoPagato === 0) {
                                onImportoPagatoChange(prezzoBase);
                            }
                        }}
                        className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                    />
                    <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-gray-500" />
                        <span className="font-medium text-gray-700">
                            Registra pagamento anticipato
                        </span>
                    </div>
                </label>

                {formData.pagamentoAnticipato && (
                    <div className="mt-4 pl-8 space-y-4 border-l-2 border-teal-200">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Metodo di Pagamento
                            </label>
                            <div className="flex gap-3">
                                {[
                                    { value: 'contanti', label: 'Contanti' },
                                    { value: 'carta', label: 'Carta' },
                                    { value: 'bonifico', label: 'Bonifico' }
                                ].map(({ value, label }) => (
                                    <label
                                        key={value}
                                        className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${formData.metodoPagamento === value
                                                ? 'border-teal-500 bg-teal-50 text-teal-700'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="metodoPagamento"
                                            value={value}
                                            checked={formData.metodoPagamento === value}
                                            onChange={(e) => onMetodoPagamentoChange(e.target.value as 'contanti' | 'carta' | 'bonifico')}
                                            className="sr-only"
                                        />
                                        {label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Importo Pagato (€)
                            </label>
                            <input
                                type="number"
                                value={formData.importoPagato}
                                onChange={(e) => onImportoPagatoChange(parseFloat(e.target.value) || 0)}
                                step="0.01"
                                min="0"
                                max={prezzoBase}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                            />
                            {formData.importoPagato < prezzoBase && formData.importoPagato > 0 && (
                                <p className="text-sm text-amber-600 mt-1">
                                    ⚠️ Acconto di € {formData.importoPagato.toFixed(2)} - Residuo: € {(prezzoBase - formData.importoPagato).toFixed(2)}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Note */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Note (opzionale)
                </label>
                <textarea
                    value={formData.note}
                    onChange={(e) => onNoteChange(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder="Aggiungi note per l'appuntamento..."
                />
            </div>

            {/* Promemoria */}
            <label className="flex items-center gap-3 cursor-pointer">
                <input
                    type="checkbox"
                    checked={formData.promemoria}
                    onChange={(e) => onPromemoriaChange(e.target.checked)}
                    className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <span className="text-gray-700">
                    Invia promemoria al paziente
                </span>
            </label>
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const AppuntamentoForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();

    const isEditing = !!id;

    // State
    const [currentStep, setCurrentStep] = useState<WizardStep>(1);
    const [formData, setFormData] = useState<FormData>(() => ({
        ...INITIAL_FORM,
        data: searchParams.get('data') || '',
        oraInizio: searchParams.get('ora') || ''
    }));

    // Query: Existing appointment for editing
    const { data: existingAppuntamento } = useQuery({
        queryKey: ['appuntamento', id],
        queryFn: () => appuntamentiApi.getById(id!),
        enabled: isEditing
    });

    // Load existing data
    useEffect(() => {
        if (existingAppuntamento) {
            const dataOra = new Date(existingAppuntamento.dataOra);
            setFormData({
                pazienteId: existingAppuntamento.pazienteId,
                prestazioneId: existingAppuntamento.prestazioneId || '',
                ambulatorioId: existingAppuntamento.ambulatorioId,
                medicoId: existingAppuntamento.medicoId,
                data: dataOra.toISOString().split('T')[0],
                oraInizio: `${dataOra.getHours().toString().padStart(2, '0')}:${dataOra.getMinutes().toString().padStart(2, '0')}`,
                durataPrevista: existingAppuntamento.durataPrevista,
                note: existingAppuntamento.note || '',
                promemoria: existingAppuntamento.promemoria
            });
        }
    }, [existingAppuntamento]);

    // Queries for selected entities
    const { data: selectedPaziente } = useQuery({
        queryKey: ['paziente', formData.pazienteId],
        queryFn: () => pazientiApi.getById(formData.pazienteId),
        enabled: !!formData.pazienteId
    });

    const { data: prestazioniData } = useQuery({
        queryKey: ['prestazioni-list'],
        queryFn: () => prestazioniApi.getAll({ limit: 100 })
    });

    const { data: ambulatoriData } = useQuery({
        queryKey: ['ambulatori-list'],
        queryFn: () => ambulatoriApi.getAll({ limit: 100 })
    });

    const selectedPrestazione = prestazioniData?.data?.find(p => p.id === formData.prestazioneId);
    const selectedAmbulatorio = ambulatoriData?.data?.find(a => a.id === formData.ambulatorioId);

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: Partial<Appuntamento>) => appuntamentiApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appuntamenti'] });
            navigate('/poliambulatorio/agenda/appuntamenti');
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Appuntamento> }) =>
            appuntamentiApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appuntamenti'] });
            queryClient.invalidateQueries({ queryKey: ['appuntamento', id] });
            navigate('/poliambulatorio/agenda/appuntamenti');
        }
    });

    // Handlers
    const updateForm = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const canProceed = useCallback((step: WizardStep): boolean => {
        switch (step) {
            case 1: return !!formData.pazienteId;
            case 2: return !!formData.prestazioneId && !!formData.ambulatorioId;
            case 3: return !!formData.data && !!formData.oraInizio;
            case 4: return true;
            default: return false;
        }
    }, [formData]);

    const handleNext = () => {
        if (currentStep < 4 && canProceed(currentStep)) {
            setCurrentStep(prev => (prev + 1) as WizardStep);
        }
    };

    const handlePrev = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => (prev - 1) as WizardStep);
        }
    };

    const handleSubmit = async () => {
        const dataOra = `${formData.data}T${formData.oraInizio}:00`;

        const payload: Partial<Appuntamento> = {
            pazienteId: formData.pazienteId,
            prestazioneId: formData.prestazioneId || undefined,
            ambulatorioId: formData.ambulatorioId,
            medicoId: formData.medicoId || undefined,
            dataOra,
            durataPrevista: formData.durataPrevista,
            note: formData.note || undefined,
            promemoria: formData.promemoria
        };

        if (isEditing) {
            await updateMutation.mutateAsync({ id: id!, data: payload });
        } else {
            await createMutation.mutateAsync(payload);
        }
    };

    const isLoading = createMutation.isPending || updateMutation.isPending;

    // Step indicator data
    const steps = [
        { num: 1, label: 'Paziente', icon: User },
        { num: 2, label: 'Prestazione', icon: Stethoscope },
        { num: 3, label: 'Data/Ora', icon: Calendar },
        { num: 4, label: 'Conferma', icon: CheckCircle }
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-semibold text-gray-900">
                                {isEditing ? 'Modifica Appuntamento' : 'Nuovo Appuntamento'}
                            </h1>
                            <p className="text-sm text-gray-500">
                                Step {currentStep} di 4
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Step Indicator */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        {steps.map((step, index) => {
                            const Icon = step.icon;
                            const isActive = currentStep === step.num;
                            const isCompleted = currentStep > step.num;

                            return (
                                <React.Fragment key={step.num}>
                                    <button
                                        onClick={() => canProceed(step.num as WizardStep) && setCurrentStep(step.num as WizardStep)}
                                        className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
                      ${isActive
                                                ? 'bg-teal-100 text-teal-700'
                                                : isCompleted
                                                    ? 'text-teal-600'
                                                    : 'text-gray-400'
                                            }
                    `}
                                        disabled={!isCompleted && !isActive}
                                    >
                                        <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center
                      ${isActive
                                                ? 'bg-teal-600 text-white'
                                                : isCompleted
                                                    ? 'bg-teal-100 text-teal-600'
                                                    : 'bg-gray-200 text-gray-400'
                                            }
                    `}>
                                            {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                                        </div>
                                        <span className="hidden sm:block text-sm font-medium">{step.label}</span>
                                    </button>
                                    {index < steps.length - 1 && (
                                        <div className={`flex-1 h-0.5 mx-2 ${currentStep > step.num ? 'bg-teal-300' : 'bg-gray-200'}`} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-3xl mx-auto px-4 py-8">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    {currentStep === 1 && (
                        <Step1Paziente
                            selectedId={formData.pazienteId}
                            onSelect={(id) => updateForm('pazienteId', id)}
                        />
                    )}

                    {currentStep === 2 && (
                        <Step2Prestazione
                            prestazioneId={formData.prestazioneId}
                            ambulatorioId={formData.ambulatorioId}
                            onSelectPrestazione={(id) => updateForm('prestazioneId', id)}
                            onSelectAmbulatorio={(id) => updateForm('ambulatorioId', id)}
                            onDurataChange={(d) => updateForm('durataPrevista', d)}
                        />
                    )}

                    {currentStep === 3 && (
                        <Step3DataOra
                            data={formData.data}
                            oraInizio={formData.oraInizio}
                            durataPrevista={formData.durataPrevista}
                            ambulatorioId={formData.ambulatorioId}
                            onDataChange={(d) => updateForm('data', d)}
                            onOraChange={(o) => updateForm('oraInizio', o)}
                            onDurataChange={(d) => updateForm('durataPrevista', d)}
                        />
                    )}

                    {currentStep === 4 && (
                        <Step4Conferma
                            formData={formData}
                            paziente={selectedPaziente}
                            prestazione={selectedPrestazione}
                            ambulatorio={selectedAmbulatorio}
                            onNoteChange={(n) => updateForm('note', n)}
                            onPromemoriaChange={(p) => updateForm('promemoria', p)}
                            onPagamentoAnticipatoChange={(p) => updateForm('pagamentoAnticipato', p)}
                            onMetodoPagamentoChange={(m) => updateForm('metodoPagamento', m)}
                            onImportoPagatoChange={(i) => updateForm('importoPagato', i)}
                        />
                    )}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-6">
                    <button
                        onClick={handlePrev}
                        disabled={currentStep === 1}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        Indietro
                    </button>

                    {currentStep < 4 ? (
                        <button
                            onClick={handleNext}
                            disabled={!canProceed(currentStep)}
                            className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                        >
                            Avanti
                            <ArrowRight className="h-5 w-5" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <>
                                    <RefreshCw className="h-5 w-5 animate-spin" />
                                    Salvataggio...
                                </>
                            ) : (
                                <>
                                    <Save className="h-5 w-5" />
                                    {isEditing ? 'Salva Modifiche' : 'Conferma Prenotazione'}
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AppuntamentoForm;
