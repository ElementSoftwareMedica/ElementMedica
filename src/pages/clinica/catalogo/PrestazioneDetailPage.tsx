/**
 * PrestazioneDetailPage - Pagina Dettaglio Prestazione
 * 
 * Visualizza tutti i dettagli di una prestazione con tabs per:
 * - Informazioni Base
 * - Listini Medici (con compensi min/max)
 * - Convenzioni Associate
 * 
 * @module pages/clinica/catalogo/PrestazioneDetailPage
 */

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft,
    Edit,
    Trash2,
    FileText,
    Clock,
    Stethoscope,
    DollarSign,
    Users,
    Building2,
    Plus,
    X,
    Save,
    Loader2,
    AlertCircle,
    Check,
    Percent,
    Euro,
    Activity,
    RefreshCw,
    Eye,
    Wrench,
    Package,
    Receipt,
    ChevronDown
} from 'lucide-react';
import {
    prestazioniApi,
    listiniApi,
    convenzioniApi,
    mediciApi,
    Prestazione,
    ListinoPrezzo,
    Convenzione,
    Medico,
    MedicoAbilitato,
    TipoCompensoMedico,
    TipologiaStrumento
} from '../../../services/clinicaApi';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { useToast } from '../../../hooks/useToast';
import { useConfirmDialog } from '../../../contexts/ConfirmDialogContext';
import { tariffariAziendaliApi, VoceTariffarioWithContext, CATEGORIA_VISITA_LABELS } from '../../../services/tariffarioAziendaleApi';
import '../../../styles/clinica-theme.css';

// =====================================================
// TYPES
// =====================================================

interface PrezzoMedicoFormData {
    medicoId: string;
    prezzo: string;
    durataMedico: string;  // Durata specifica per medico
    compensoTipo: TipoCompensoMedico;
    compensoValore: string;
    compensoMinimo: string;
    compensoMassimo: string;
}

type TabType = 'info' | 'prezzi' | 'convenzioni' | 'tariffarioAziendale';

// =====================================================
// CONSTANTS
// =====================================================

const TIPO_COMPENSO_OPTIONS = [
    { value: 'PERCENTUALE' as TipoCompensoMedico, label: 'Percentuale', icon: Percent },
    { value: 'FISSO' as TipoCompensoMedico, label: 'Importo Fisso', icon: Euro },
    { value: 'MINIMO_MASSIMO' as TipoCompensoMedico, label: 'Min/Max', icon: Activity }
];

// =====================================================
// HELPER COMPONENTS
// =====================================================

const TabButton: React.FC<{
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    count?: number;
    color?: string;
}> = ({ active, onClick, icon, label, count, color = 'teal' }) => {
    const colorClasses = {
        teal: 'border-teal-500 text-teal-600 bg-teal-50',
        blue: 'border-blue-500 text-blue-600 bg-blue-50',
        purple: 'border-purple-500 text-purple-600 bg-purple-50',
        amber: 'border-amber-500 text-amber-600 bg-amber-50'
    };

    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2.5 px-5 py-3.5 rounded-t-xl font-medium text-sm transition-all duration-200 ${active
                ? `border-b-2 ${colorClasses[color as keyof typeof colorClasses] || colorClasses.teal} shadow-sm`
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 border-b-2 border-transparent'
                }`}
        >
            <span className={active ? '' : 'opacity-70'}>{icon}</span>
            {label}
            {count !== undefined && count > 0 && (
                <span className={`ml-1 px-2.5 py-0.5 text-xs font-semibold rounded-full transition-colors ${active
                    ? 'bg-white/80 text-current shadow-sm'
                    : 'bg-gray-100 text-gray-600'
                    }`}>
                    {count}
                </span>
            )}
        </button>
    );
};

const formatCurrency = (value: number | string | null | undefined): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (num === null || num === undefined || isNaN(num)) return '€ 0,00';
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(num);
};

const formatPercentage = (value: number | string | null | undefined): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (num === null || num === undefined || isNaN(num)) return '0%';
    return `${num}%`;
};

// =====================================================
// INFO TAB COMPONENT
// =====================================================

const InfoTab: React.FC<{ prestazione: Prestazione }> = ({ prestazione }) => {
    const tipoLabels: Record<string, string> = {
        'VISITA_SPECIALISTICA': 'Visita Specialistica',
        'VISITA_MEDICINA_LAVORO': 'Visita Medicina del Lavoro',
        'ESAME_STRUMENTALE': 'Esame Strumentale',
        'ESAME_LABORATORIO': 'Esame di Laboratorio',
        'INTERVENTO_AMBULATORIALE': 'Intervento Ambulatoriale',
        'VACCINAZIONE': 'Vaccinazione',
        'CERTIFICAZIONE': 'Certificazione',
        'CONSULENZA': 'Consulenza'
    };

    return (
        <div className="space-y-6">
            {/* Basic Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-teal-600" />
                    Informazioni Generali
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500">Codice</label>
                        <p className="mt-1 text-gray-900 font-mono">{prestazione.codice}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500">Stato</label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${prestazione.attivo
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                                }`}>
                                {prestazione.attivo ? 'Attiva' : 'Non attiva'}
                            </span>
                        </p>
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-500">Nome</label>
                        <p className="mt-1 text-gray-900">{prestazione.nome}</p>
                    </div>
                    {prestazione.descrizione && (
                        <div className="md:col-span-2">
                            <label className="text-sm font-medium text-gray-500">Descrizione</label>
                            <p className="mt-1 text-gray-700">{prestazione.descrizione}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Type and Specialty Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-blue-600" />
                    Tipologia e Specialità
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500">Tipo</label>
                        <p className="mt-1 text-gray-900">{tipoLabels[prestazione.tipo] || prestazione.tipo}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500">Branche Specialistiche</label>
                        <div className="mt-1">
                            {(() => {
                                const branche = prestazione.brancheSpecialistiche && prestazione.brancheSpecialistiche.length > 0
                                    ? prestazione.brancheSpecialistiche
                                    : (prestazione.brancaSpecialistica ? [prestazione.brancaSpecialistica] : []);

                                return branche.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                        {branche.map((branca, idx) => (
                                            <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                                                {branca}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-gray-400 italic">Non specificate</span>
                                );
                            })()}
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500">Durata prevista</label>
                        <p className="mt-1 text-gray-900 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            {prestazione.durataPrevista} minuti
                        </p>
                    </div>
                </div>
            </div>

            {/* Pricing Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    Prezzi
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500">Prezzo base</label>
                        <p className="mt-1 text-2xl font-semibold text-gray-900">
                            {formatCurrency(prestazione.prezzoBase)}
                        </p>
                    </div>
                    {/* P65: Prezzo Prima Visita */}
                    <div>
                        <label className="text-sm font-medium text-gray-500">Prima Visita</label>
                        {prestazione.prezzoPrimaVisita ? (
                            <p className="mt-1 text-2xl font-semibold text-teal-700">
                                {formatCurrency(prestazione.prezzoPrimaVisita)}
                            </p>
                        ) : (
                            <p className="mt-1 text-sm text-gray-400 italic">= Prezzo base</p>
                        )}
                    </div>
                    {/* P65: Prezzo Controllo */}
                    <div>
                        <label className="text-sm font-medium text-gray-500">Controllo</label>
                        {prestazione.prezzoControllo ? (
                            <p className="mt-1 text-2xl font-semibold text-blue-700">
                                {formatCurrency(prestazione.prezzoControllo)}
                            </p>
                        ) : (
                            <p className="mt-1 text-sm text-gray-400 italic">= Prezzo base</p>
                        )}
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500">Aliquota IVA</label>
                        <p className="mt-1 text-gray-900">{prestazione.ivaAliquota}%</p>
                    </div>
                </div>
                {/* P65: Scadenza default per controllo */}
                {prestazione.scadenzaDefaultMesi && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <label className="text-sm font-medium text-gray-500">Scadenza Controllo</label>
                        <p className="mt-1 text-gray-900">
                            Ogni <span className="font-semibold">{prestazione.scadenzaDefaultMesi}</span> mesi
                        </p>
                    </div>
                )}
            </div>

            {/* Strumenti e Tipologie Richieste Card */}
            {(prestazione.tipologieRichieste && prestazione.tipologieRichieste.length > 0) ||
                (prestazione.strumentiRichiesti && prestazione.strumentiRichiesti.length > 0) ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                        <Wrench className="w-5 h-5 text-indigo-600" />
                        Strumenti Richiesti
                    </h3>
                    <div className="space-y-4">
                        {/* Tipologie strumenti richieste */}
                        {prestazione.tipologieRichieste && prestazione.tipologieRichieste.length > 0 && (
                            <div>
                                <label className="text-sm font-medium text-gray-500 block mb-2">Tipologie Strumenti</label>
                                <div className="flex flex-wrap gap-2">
                                    {prestazione.tipologieRichieste.map((tip) => (
                                        <span
                                            key={tip.id}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${tip.isObbligatorio
                                                ? 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200'
                                                : 'bg-gray-100 text-gray-700'
                                                }`}
                                        >
                                            <Package className="w-3.5 h-3.5" />
                                            {tip.tipologia.replace(/_/g, ' ')}
                                            {tip.quantitaMinima > 1 && (
                                                <span className="text-xs opacity-75">×{tip.quantitaMinima}</span>
                                            )}
                                            {tip.isObbligatorio && (
                                                <span className="text-xs bg-indigo-200 px-1.5 py-0.5 rounded">Obbligatorio</span>
                                            )}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {/* Strumenti specifici richiesti (array di stringhe) */}
                        {prestazione.strumentiRichiesti && prestazione.strumentiRichiesti.length > 0 && (
                            <div>
                                <label className="text-sm font-medium text-gray-500 block mb-2">Strumenti Specifici</label>
                                <div className="flex flex-wrap gap-2">
                                    {prestazione.strumentiRichiesti.map((strumento, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-700"
                                        >
                                            <Wrench className="w-3.5 h-3.5" />
                                            {strumento}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : null}

            {/* Instructions Card */}
            {prestazione.istruzioniPreparazione && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                        Istruzioni Preparazione
                    </h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{prestazione.istruzioniPreparazione}</p>
                </div>
            )}
        </div>
    );
};

// =====================================================
// PREZZI TAB COMPONENT
// =====================================================

// Calcola il compenso default basato sul tipo di prestazione
const getDefaultCompenso = (tipo: string): number => {
    // 70% per visite specialistiche, medicina del lavoro e certificazioni
    // 50% per altre tipologie
    const tipi70Percent = ['VISITA_SPECIALISTICA', 'VISITA_MEDICINA_LAVORO', 'CERTIFICAZIONE'];
    if (tipi70Percent.includes(tipo)) {
        return 70;
    }
    return 50;
};

interface MedicoWithListino {
    medicoId: string;
    medicoName: string;
    specializzazione?: string;
    listino?: ListinoPrezzo;
    abilitazione?: MedicoAbilitato;
    hasListino: boolean;
    // Valori effettivi (da listino se esiste, altrimenti da abilitazione o default)
    prezzoEffettivo: number;
    durataEffettiva: number;
    compensoTipoEffettivo: TipoCompensoMedico;
    compensoValoreEffettivo: number;
    compensoMinimoEffettivo?: number;
    compensoMassimoEffettivo?: number;
}

const PrezziTab: React.FC<{ prestazione: Prestazione }> = ({ prestazione }) => {
    const { getTenantFilterParams, tenantFilterKey } = useTenantFilter();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { confirmDelete } = useConfirmDialog();

    const [isAddingNew, setIsAddingNew] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const defaultCompenso = useMemo(() => getDefaultCompenso(prestazione.tipo), [prestazione.tipo]);

    const [formData, setFormData] = useState<PrezzoMedicoFormData>({
        medicoId: '',
        prezzo: String(prestazione.prezzoBase || 0),
        durataMedico: String(prestazione.durataPrevista || 30),
        compensoTipo: 'PERCENTUALE',
        compensoValore: String(defaultCompenso),
        compensoMinimo: '',
        compensoMassimo: ''
    });

    // Query medici per il select
    const { data: mediciResponse } = useQuery({
        queryKey: ['medici-select', tenantFilterKey],
        queryFn: () => {
            const params = getTenantFilterParams();
            return mediciApi.getAll({
                limit: 500,
                ...(params.tenantIds && { tenantIds: params.tenantIds.join(',') })
            });
        }
    });

    // Query medici abilitati per questa prestazione (con dati di compenso)
    const { data: mediciAbilitatiResponse } = useQuery({
        queryKey: ['medici-abilitati-prestazione', prestazione.id, tenantFilterKey],
        queryFn: () => prestazioniApi.getMediciAbilitati(prestazione.id)
    });

    // Query listini per questa prestazione
    const { data: listiniResponse, isLoading: loadingListini } = useQuery({
        queryKey: ['listini-prestazione', prestazione.id, tenantFilterKey],
        queryFn: () => listiniApi.getByPrestazione(prestazione.id)
    });

    const medici = mediciResponse?.data || [];
    const mediciAbilitati = mediciAbilitatiResponse || [];
    const listini = listiniResponse || [];

    // Filtra listini che hanno un medico associato
    const listiniMedici = useMemo(() =>
        listini.filter((l: ListinoPrezzo) => l.medicoId),
        [listini]
    );

    // Unisce medici abilitati con listini esistenti per mostrare tutti
    const mediciConListino: MedicoWithListino[] = useMemo(() => {
        const result: MedicoWithListino[] = [];
        const medicoIdsProcessed = new Set<string>();

        // Prima aggiungo tutti i medici che hanno un listino
        listiniMedici.forEach((listino: ListinoPrezzo) => {
            if (!listino.medicoId) return;

            const medico = medici.find(m => m.id === listino.medicoId);
            const abilitazione = mediciAbilitati.find((a: MedicoAbilitato) => a.medicoId === listino.medicoId);

            result.push({
                medicoId: listino.medicoId,
                medicoName: medico
                    ? `${medico.nome || medico.firstName || ''} ${medico.cognome || medico.lastName || ''}`.trim()
                    : 'Medico non trovato',
                specializzazione: medico?.specializzazione || medico?.specialties?.[0],
                listino,
                abilitazione,
                hasListino: true,
                prezzoEffettivo: listino.prezzo,
                durataEffettiva: listino.durataMedico || prestazione.durataPrevista || 30,
                compensoTipoEffettivo: listino.compensoMedicoTipo || 'PERCENTUALE',
                compensoValoreEffettivo: listino.compensoMedicoValore || defaultCompenso,
                compensoMinimoEffettivo: listino.compensoMedicoMinimo,
                compensoMassimoEffettivo: listino.compensoMedicoMassimo
            });
            medicoIdsProcessed.add(listino.medicoId);
        });

        // Poi aggiungo i medici abilitati che NON hanno ancora un listino
        mediciAbilitati.forEach((abilitazione: MedicoAbilitato) => {
            if (medicoIdsProcessed.has(abilitazione.medicoId)) return;

            const medico = abilitazione.medico || medici.find(m => m.id === abilitazione.medicoId);

            result.push({
                medicoId: abilitazione.medicoId,
                medicoName: medico
                    ? `${medico.nome || medico.firstName || ''} ${medico.cognome || medico.lastName || ''}`.trim()
                    : 'Medico non trovato',
                specializzazione: medico?.specializzazione || medico?.specialties?.[0],
                listino: undefined,
                abilitazione,
                hasListino: false,
                prezzoEffettivo: prestazione.prezzoBase,
                durataEffettiva: abilitazione.durataMedico || prestazione.durataPrevista || 30,
                compensoTipoEffettivo: abilitazione.compensoTipo || 'PERCENTUALE',
                compensoValoreEffettivo: abilitazione.compensoValore || defaultCompenso,
                compensoMinimoEffettivo: abilitazione.compensoMinimo,
                compensoMassimoEffettivo: abilitazione.compensoMassimo
            });
            medicoIdsProcessed.add(abilitazione.medicoId);
        });

        return result;
    }, [listiniMedici, mediciAbilitati, medici, prestazione, defaultCompenso]);

    // Create listino mutation
    const createListinoMutation = useMutation({
        mutationFn: (data: Partial<ListinoPrezzo>) => listiniApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['listini-prestazione', prestazione.id, tenantFilterKey] });
            showToast({ type: 'success', message: 'Prezzo medico aggiunto' });
            setIsAddingNew(false);
            resetForm();
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore del server' });
        }
    });

    // Update listino mutation
    const updateListinoMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<ListinoPrezzo> }) =>
            listiniApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['listini-prestazione', prestazione.id, tenantFilterKey] });
            showToast({ type: 'success', message: 'Prezzo aggiornato' });
            setEditingId(null);
            resetForm();
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore del server' });
        }
    });

    // Delete listino mutation
    const deleteListinoMutation = useMutation({
        mutationFn: (id: string) => listiniApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['listini-prestazione', prestazione.id, tenantFilterKey] });
            showToast({ type: 'success', message: 'Prezzo rimosso' });
        }
    });

    const resetForm = () => {
        setFormData({
            medicoId: '',
            prezzo: String(prestazione.prezzoBase || 0),
            durataMedico: String(prestazione.durataPrevista || 30),
            compensoTipo: 'PERCENTUALE',
            compensoValore: String(defaultCompenso),
            compensoMinimo: '',
            compensoMassimo: ''
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.medicoId) {
            showToast({ type: 'error', message: 'Seleziona un medico' });
            return;
        }

        const listino: Partial<ListinoPrezzo> = {
            prestazioneId: prestazione.id,
            medicoId: formData.medicoId,
            prezzo: parseFloat(formData.prezzo) || prestazione.prezzoBase,
            durataMedico: formData.durataMedico ? parseInt(formData.durataMedico, 10) : undefined,
            compensoMedicoTipo: formData.compensoTipo,
            compensoMedicoValore: parseFloat(formData.compensoValore) || undefined,
            compensoMedicoMinimo: formData.compensoMinimo ? parseFloat(formData.compensoMinimo) : undefined,
            compensoMedicoMassimo: formData.compensoMassimo ? parseFloat(formData.compensoMassimo) : undefined,
            attivo: true
        };

        if (editingId) {
            updateListinoMutation.mutate({ id: editingId, data: listino });
        } else {
            createListinoMutation.mutate(listino);
        }
    };

    const handleEdit = (listino: ListinoPrezzo) => {
        setFormData({
            medicoId: listino.medicoId || '',
            prezzo: String(listino.prezzo),
            durataMedico: listino.durataMedico ? String(listino.durataMedico) : String(prestazione.durataPrevista || 30),
            compensoTipo: listino.compensoMedicoTipo || 'PERCENTUALE',
            compensoValore: String(listino.compensoMedicoValore || 30),
            compensoMinimo: listino.compensoMedicoMinimo ? String(listino.compensoMedicoMinimo) : '',
            compensoMassimo: listino.compensoMedicoMassimo ? String(listino.compensoMedicoMassimo) : ''
        });
        setEditingId(listino.id);
        setIsAddingNew(false);
    };

    const handleDelete = async (id: string) => {
        if (await confirmDelete('questo prezzo')) {
            deleteListinoMutation.mutate(id);
        }
    };

    const getMedicoName = (medicoId: string) => {
        const medico = medici.find(m => m.id === medicoId);
        if (!medico) return 'Medico non trovato';
        return `${medico.nome || medico.firstName || ''} ${medico.cognome || medico.lastName || ''}`.trim();
    };

    const renderCompenso = (listino: ListinoPrezzo) => {
        switch (listino.compensoMedicoTipo) {
            case 'PERCENTUALE':
                return formatPercentage(listino.compensoMedicoValore);
            case 'FISSO':
                return formatCurrency(listino.compensoMedicoValore);
            case 'MINIMO_MASSIMO':
                return `${formatCurrency(listino.compensoMedicoMinimo)} - ${formatCurrency(listino.compensoMedicoMassimo)}`;
            default:
                return '-';
        }
    };

    if (loadingListini) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header con bottone Aggiungi */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-gray-900">Listini Medici</h3>
                    <p className="text-sm text-gray-500">
                        Configura prezzi, durata e compensi specifici per ogni medico
                    </p>
                </div>
                {!isAddingNew && !editingId && (
                    <button
                        onClick={() => { setIsAddingNew(true); resetForm(); }}
                        className="clinica-button-primary flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Aggiungi Medico
                    </button>
                )}
            </div>

            {/* Form Aggiungi/Modifica */}
            {(isAddingNew || editingId) && (
                <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Medico */}
                        <div>
                            <label className="label-clinica">Medico *</label>
                            <select
                                value={formData.medicoId}
                                onChange={(e) => setFormData(prev => ({ ...prev, medicoId: e.target.value }))}
                                className="select-clinica"
                                disabled={!!editingId}
                            >
                                <option value="">Seleziona medico...</option>
                                {medici.map(m => (
                                    <option key={m.id} value={m.id}>
                                        {m.nome || m.firstName} {m.cognome || m.lastName}
                                        {m.specializzazione && ` - ${m.specializzazione}`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Prezzo al paziente */}
                        <div>
                            <label className="label-clinica">Prezzo al paziente (€)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.prezzo}
                                onChange={(e) => setFormData(prev => ({ ...prev, prezzo: e.target.value }))}
                                className="input-clinica"
                            />
                        </div>

                        {/* Durata per questo medico */}
                        <div>
                            <label className="label-clinica">
                                Durata (minuti)
                                <span className="text-xs text-gray-400 ml-1">
                                    (default: {prestazione.durataPrevista || 30} min)
                                </span>
                            </label>
                            <input
                                type="number"
                                step="5"
                                min="5"
                                value={formData.durataMedico}
                                onChange={(e) => setFormData(prev => ({ ...prev, durataMedico: e.target.value }))}
                                className="input-clinica"
                                placeholder={String(prestazione.durataPrevista || 30)}
                            />
                        </div>

                        {/* Tipo compenso */}
                        <div>
                            <label className="label-clinica">Tipo Compenso</label>
                            <select
                                value={formData.compensoTipo}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    compensoTipo: e.target.value as TipoCompensoMedico,
                                    compensoMinimo: '',
                                    compensoMassimo: ''
                                }))}
                                className="select-clinica"
                            >
                                {TIPO_COMPENSO_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Compenso Valore (per PERCENTUALE e FISSO) */}
                        {formData.compensoTipo !== 'MINIMO_MASSIMO' && (
                            <div>
                                <label className="label-clinica">
                                    {formData.compensoTipo === 'PERCENTUALE' ? 'Percentuale (%)' : 'Importo (€)'}
                                </label>
                                <input
                                    type="number"
                                    step={formData.compensoTipo === 'PERCENTUALE' ? '1' : '0.01'}
                                    value={formData.compensoValore}
                                    onChange={(e) => setFormData(prev => ({ ...prev, compensoValore: e.target.value }))}
                                    className="input-clinica"
                                />
                            </div>
                        )}

                        {/* Minimo e Massimo (per MINIMO_MASSIMO o come limiti) */}
                        <div>
                            <label className="label-clinica">
                                {formData.compensoTipo === 'MINIMO_MASSIMO' ? 'Minimo (€) *' : 'Compenso Minimo (€)'}
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.compensoMinimo}
                                onChange={(e) => setFormData(prev => ({ ...prev, compensoMinimo: e.target.value }))}
                                className="input-clinica"
                                placeholder="0.00"
                            />
                        </div>

                        <div>
                            <label className="label-clinica">
                                {formData.compensoTipo === 'MINIMO_MASSIMO' ? 'Massimo (€) *' : 'Compenso Massimo (€)'}
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.compensoMassimo}
                                onChange={(e) => setFormData(prev => ({ ...prev, compensoMassimo: e.target.value }))}
                                className="input-clinica"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={() => { setIsAddingNew(false); setEditingId(null); resetForm(); }}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            disabled={createListinoMutation.isPending || updateListinoMutation.isPending}
                            className="clinica-button-primary flex items-center gap-2"
                        >
                            {(createListinoMutation.isPending || updateListinoMutation.isPending) ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {editingId ? 'Aggiorna' : 'Salva'}
                        </button>
                    </div>
                </form>
            )}

            {/* Lista prezzi medici */}
            {mediciConListino.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Nessun medico abilitato
                    </h3>
                    <p className="text-gray-500 mb-6">
                        Abilita medici a questa prestazione dalla sezione Medici &gt; Prestazioni Abilitate
                    </p>
                    {!isAddingNew && (
                        <button
                            onClick={() => setIsAddingNew(true)}
                            className="clinica-button-primary inline-flex items-center justify-center"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Aggiungi prezzo manualmente
                        </button>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Info sul compenso default */}
                    <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
                        <p className="text-sm text-blue-700">
                            <strong>Compenso default:</strong> {defaultCompenso}% per {prestazione.tipo === 'VISITA_SPECIALISTICA' || prestazione.tipo === 'VISITA_MEDICINA_LAVORO'
                                ? 'visite specialistiche/medicina del lavoro'
                                : 'altre prestazioni'}
                        </p>
                    </div>
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Medico
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Stato
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Prezzo Paziente
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Durata
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Compenso Medico
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                    Azioni
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {mediciConListino.map((item: MedicoWithListino) => (
                                <tr key={item.medicoId} className={`hover:bg-gray-50 ${!item.hasListino ? 'bg-amber-50/30' : ''}`}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${item.hasListino ? 'bg-teal-100' : 'bg-amber-100'}`}>
                                                <Stethoscope className={`w-4 h-4 ${item.hasListino ? 'text-teal-600' : 'text-amber-600'}`} />
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-900">
                                                    {item.medicoName}
                                                </span>
                                                {item.specializzazione && (
                                                    <p className="text-xs text-gray-500">{item.specializzazione}</p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {item.hasListino ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700">
                                                <Check className="w-3 h-3" />
                                                Configurato
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-700">
                                                <AlertCircle className="w-3 h-3" />
                                                Default
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-gray-900">
                                        {formatCurrency(item.prezzoEffettivo)}
                                        {!item.hasListino && <span className="text-xs text-gray-400 ml-1">(base)</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-4 h-4 text-gray-400" />
                                                <span className="text-gray-900">
                                                    {item.durataEffettiva} min
                                                </span>
                                            </div>
                                            {item.durataEffettiva !== (prestazione.durataPrevista || 30) && (
                                                <span className="text-xs text-amber-600 mt-0.5">(custom)</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${item.compensoTipoEffettivo === 'PERCENTUALE' ? 'bg-blue-100 text-blue-700' :
                                                item.compensoTipoEffettivo === 'FISSO' ? 'bg-purple-100 text-purple-700' :
                                                    'bg-orange-100 text-orange-700'
                                                }`}>
                                                {item.compensoTipoEffettivo === 'PERCENTUALE' && (
                                                    <>{item.compensoValoreEffettivo}%</>
                                                )}
                                                {item.compensoTipoEffettivo === 'FISSO' && (
                                                    <>{formatCurrency(item.compensoValoreEffettivo)}</>
                                                )}
                                                {item.compensoTipoEffettivo === 'MINIMO_MASSIMO' && (
                                                    <>{formatCurrency(item.compensoMinimoEffettivo)} - {formatCurrency(item.compensoMassimoEffettivo)}</>
                                                )}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            {item.hasListino ? (
                                                <>
                                                    <button
                                                        onClick={() => handleEdit(item.listino!)}
                                                        className="p-2 text-gray-500 hover:text-teal-600 rounded-lg hover:bg-gray-100"
                                                        title="Modifica"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.listino!.id)}
                                                        className="p-2 text-gray-500 hover:text-red-600 rounded-lg hover:bg-gray-100"
                                                        title="Elimina"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setFormData({
                                                            medicoId: item.medicoId,
                                                            prezzo: String(prestazione.prezzoBase || 0),
                                                            durataMedico: String(item.durataEffettiva),
                                                            compensoTipo: item.compensoTipoEffettivo,
                                                            compensoValore: String(item.compensoValoreEffettivo),
                                                            compensoMinimo: item.compensoMinimoEffettivo ? String(item.compensoMinimoEffettivo) : '',
                                                            compensoMassimo: item.compensoMassimoEffettivo ? String(item.compensoMassimoEffettivo) : ''
                                                        });
                                                        setIsAddingNew(true);
                                                    }}
                                                    className="p-2 text-amber-600 hover:text-amber-700 rounded-lg hover:bg-amber-50"
                                                    title="Crea listino personalizzato"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// =====================================================
// CONVENZIONI TAB COMPONENT
// =====================================================

const ConvenzioniTab: React.FC<{ prestazione: Prestazione }> = ({ prestazione }) => {
    const { getTenantFilterParams, tenantFilterKey } = useTenantFilter();

    // Query listini per questa prestazione (con convenzione)
    const { data: listiniResponse, isLoading } = useQuery({
        queryKey: ['listini-prestazione', prestazione.id, tenantFilterKey],
        queryFn: () => listiniApi.getByPrestazione(prestazione.id)
    });

    // Query tutte le convenzioni
    const { data: convenzioniResponse } = useQuery({
        queryKey: ['convenzioni', tenantFilterKey],
        queryFn: () => {
            const params = getTenantFilterParams();
            return convenzioniApi.getAll({
                limit: 500,
                ...(params.tenantIds && { tenantIds: params.tenantIds.join(',') })
            });
        }
    });

    const listini = listiniResponse || [];
    const convenzioni = convenzioniResponse?.data || [];

    // Filtra listini che hanno una convenzione associata
    const listiniConvenzioni = useMemo(() =>
        listini.filter((l: ListinoPrezzo) => l.convenzioneId),
        [listini]
    );

    const getConvenzioneName = (convenzioneId: string) => {
        const conv = convenzioni.find((c: Convenzione) => c.id === convenzioneId);
        return conv?.nome || 'Convenzione non trovata';
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-gray-900">Convenzioni Associate</h3>
                <p className="text-sm text-gray-500">
                    Convenzioni in cui questa prestazione è inclusa con prezzi specifici
                </p>
            </div>

            {listiniConvenzioni.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Nessuna convenzione associata
                    </h3>
                    <p className="text-gray-500">
                        Questa prestazione non ha prezzi specifici per convenzioni.
                        <br />
                        Gestisci le convenzioni dalla sezione Catalogo &gt; Convenzioni
                    </p>
                    <Link
                        to="/poliambulatorio/catalogo/convenzioni"
                        className="inline-flex items-center gap-2 mt-4 text-teal-600 hover:text-teal-700"
                    >
                        <Eye className="w-4 h-4" />
                        Vai alle Convenzioni
                    </Link>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Convenzione
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Prezzo Convenzionato
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Sconto
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Stato
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {listiniConvenzioni.map((listino: ListinoPrezzo) => (
                                <tr key={listino.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                                                <Building2 className="w-4 h-4 text-amber-600" />
                                            </div>
                                            <span className="font-medium text-gray-900">
                                                {getConvenzioneName(listino.convenzioneId!)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-gray-900">
                                        {formatCurrency(listino.prezzo)}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {listino.scontoPercentuale ? (
                                            <span className="text-green-600">-{listino.scontoPercentuale}%</span>
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${listino.attivo
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {listino.attivo ? 'Attivo' : 'Non attivo'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// =====================================================
// P65: TARIFFARIO AZIENDALE TAB
// =====================================================

const TariffarioAziendaleTab: React.FC<{ prestazione: Prestazione }> = ({ prestazione }) => {
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const { data: vociResponse, isLoading } = useQuery({
        queryKey: ['voci-tariffario-prestazione', prestazione.id],
        queryFn: async () => {
            const response = await tariffariAziendaliApi.getVociByPrestazione(prestazione.id);
            return response.data;
        }
    });

    const voci = vociResponse || [];

    const gruppiTariffari = useMemo(() => {
        const groups = new Map<string, {
            azienda: string;
            companyId: string;
            tariffarioNome: string;
            tariffarioCodice: string;
            convenzione?: string;
            voci: VoceTariffarioWithContext[];
        }>();

        const addVoce = (
            voce: VoceTariffarioWithContext,
            azienda: string,
            companyId: string,
            tariffarioNome: string,
            tariffarioCodice: string,
            convenzione?: string
        ) => {
            const key = `${companyId || 'template'}:${voce.tariffarioAziendale?.id || tariffarioCodice}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    azienda,
                    companyId,
                    tariffarioNome,
                    tariffarioCodice,
                    convenzione,
                    voci: []
                });
            }
            groups.get(key)!.voci.push(voce);
        };

        voci.forEach((voce: VoceTariffarioWithContext) => {
            const tar = voce.tariffarioAziendale;
            if (tar.companyAssociations.length === 0) {
                addVoce(voce, 'Template senza azienda', '', tar.nome, tar.codice, tar.convenzione?.nome);
            } else {
                tar.companyAssociations.forEach(assoc => {
                    addVoce(
                        voce,
                        assoc.companyTenantProfile?.company?.ragioneSociale || 'N/D',
                        assoc.companyTenantProfile?.company?.id || '',
                        tar.nome,
                        tar.codice,
                        tar.convenzione?.nome
                    );
                });
            }
        });

        return Array.from(groups.values()).sort((a, b) => a.azienda.localeCompare(b.azienda, 'it'));
    }, [voci]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-gray-900">Tariffari Aziendali</h3>
                <p className="text-sm text-gray-500">
                    Aziende che includono questa prestazione nei loro tariffari di Medicina del Lavoro
                </p>
            </div>

            {gruppiTariffari.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Nessun tariffario aziendale
                    </h3>
                    <p className="text-gray-500">
                        Questa prestazione non è inclusa in nessun tariffario aziendale.
                        <br />
                        Gestisci i tariffari dalla sezione Medicina del Lavoro &gt; Tariffari
                    </p>
                    <Link
                        to="/poliambulatorio/mdl/tariffari-aziende"
                        className="inline-flex items-center gap-2 mt-4 text-teal-600 hover:text-teal-700"
                    >
                        <Eye className="w-4 h-4" />
                        Vai ai Tariffari Aziendali
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {gruppiTariffari.map((gruppo) => {
                        const groupKey = `${gruppo.companyId || 'template'}-${gruppo.tariffarioCodice}`;
                        const isExpanded = expandedGroups.has(groupKey);
                        return (
                        <div key={groupKey} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setExpandedGroups(prev => {
                                    const next = new Set(prev);
                                    if (next.has(groupKey)) next.delete(groupKey);
                                    else next.add(groupKey);
                                    return next;
                                })}
                                className="w-full px-5 py-4 border-b border-gray-100 bg-slate-50/70 flex flex-col gap-3 text-left transition-colors hover:bg-slate-100/70 lg:flex-row lg:items-center lg:justify-between"
                            >
                                <div>
                                    <h4 className="text-base font-semibold text-gray-900">{gruppo.azienda}</h4>
                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                        <span className="font-mono">{gruppo.tariffarioCodice}</span>
                                        <span>{gruppo.tariffarioNome}</span>
                                        {gruppo.convenzione && <span>Convenzione: {gruppo.convenzione}</span>}
                                    </div>
                                </div>
                                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                                    {gruppo.voci.length} tipologie
                                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                </span>
                            </button>
                            {isExpanded && <div className="divide-y divide-gray-100">
                                {gruppo.voci
                                    .slice()
                                    .sort((a, b) => String(a.categoriaVisita || '').localeCompare(String(b.categoriaVisita || ''), 'it'))
                                    .map((voce) => (
                                        <div key={voce.id} className="px-5 py-4 grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_auto] md:items-center">
                                            <div>
                                                {voce.categoriaVisita ? (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                                                        {CATEGORIA_VISITA_LABELS[voce.categoriaVisita] ?? voce.categoriaVisita}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                                        Tutte le tipologie
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-xs uppercase text-gray-400 font-semibold">Prezzo</p>
                                                <p className="text-sm font-semibold text-gray-900">{formatCurrency(voce.prezzoBase)}</p>
                                                {voce.usaFasceDipendenti && voce.fasceDipendenti?.length > 0 && (
                                                    <p className="text-xs text-amber-600">
                                                        Da {formatCurrency(Math.min(...voce.fasceDipendenti.map(f => Number(f.prezzo || 0))))}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                                                    IVA {voce.ivaAliquota}%
                                                </span>
                                                {voce.usaFasceDipendenti ? (
                                                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                                                        {voce.fasceDipendenti?.length || 0} fasce
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                                                        Prezzo fisso
                                                    </span>
                                                )}
                                            </div>
                                            <div className="md:text-right">
                                                {voce.attivo && voce.tariffarioAziendale.attivo ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        Attivo
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                        Non attivo
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                            </div>}
                        </div>
                    )})}
                </div>
            )}
        </div>
    );
};

// =====================================================
// MAIN COMPONENT
// =====================================================

const PrestazioneDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { tenantFilterKey } = useTenantFilter();
    const { confirmDelete: confirmDeletePrestazione } = useConfirmDialog();

    const [activeTab, setActiveTab] = useState<TabType>('info');

    // Query prestazione
    const { data: prestazione, isLoading, isError } = useQuery({
        queryKey: ['prestazione', id],
        queryFn: () => prestazioniApi.getById(id!),
        enabled: !!id
    });

    // Query listini per conteggio tab
    const { data: listiniResponse } = useQuery({
        queryKey: ['listini-prestazione', id, tenantFilterKey],
        queryFn: () => listiniApi.getByPrestazione(id!),
        enabled: !!id
    });

    const listini = listiniResponse || [];
    const mediciCount = listini.filter((l: ListinoPrezzo) => l.medicoId).length;
    const convenzioniCount = listini.filter((l: ListinoPrezzo) => l.convenzioneId).length;

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: () => prestazioniApi.delete(id!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prestazioni'] });
            showToast({ type: 'success', message: 'Prestazione eliminata' });
            navigate('/poliambulatorio/catalogo/prestazioni');
        }
    });

    const handleDelete = async () => {
        if (await confirmDeletePrestazione('questa prestazione')) {
            deleteMutation.mutate();
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            </div>
        );
    }

    if (isError || !prestazione) {
        return (
            <div className="p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Prestazione non trovata</h2>
                <p className="text-gray-500 mb-4">La prestazione richiesta non esiste o è stata eliminata.</p>
                <Link to="/poliambulatorio/catalogo/prestazioni" className="clinica-button-secondary">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Torna al catalogo
                </Link>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto clinica-theme" data-brand="element-medica">
            {/* Breadcrumb */}
            <Link
                to="/poliambulatorio/catalogo/prestazioni"
                className="inline-flex items-center gap-2 text-gray-500 hover:text-teal-600 mb-6 text-sm transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Torna al Catalogo Prestazioni
            </Link>

            {/* Hero Header Card */}
            <div className="bg-gradient-to-br from-teal-500 via-teal-600 to-teal-700 rounded-2xl shadow-lg p-6 mb-6 text-white">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-5">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                            <Stethoscope className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-2xl font-bold">{prestazione.nome}</h1>
                                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${prestazione.attivo
                                    ? 'bg-green-400/30 text-green-100 border border-green-400/30'
                                    : 'bg-gray-400/30 text-gray-100 border border-gray-400/30'
                                    }`}>
                                    {prestazione.attivo ? '● Attiva' : '○ Non attiva'}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-teal-100 text-sm">
                                <span className="font-mono bg-white/10 px-2 py-0.5 rounded">{prestazione.codice}</span>
                                {(() => {
                                    const branche = prestazione.brancheSpecialistiche && prestazione.brancheSpecialistiche.length > 0
                                        ? prestazione.brancheSpecialistiche
                                        : (prestazione.brancaSpecialistica ? [prestazione.brancaSpecialistica] : []);
                                    return branche.length > 0 && (
                                        <>
                                            <span className="opacity-50">•</span>
                                            <span>{branche.join(', ')}</span>
                                        </>
                                    );
                                })()}
                                <span className="opacity-50">•</span>
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    {prestazione.durataPrevista} min
                                </span>
                            </div>
                            <div className="mt-3 flex items-center gap-6">
                                <div>
                                    <span className="text-teal-200 text-xs">Prezzo Base</span>
                                    <p className="text-2xl font-bold">{formatCurrency(prestazione.prezzoBase)}</p>
                                </div>
                                {prestazione.prezzoPrimaVisita && (
                                    <div>
                                        <span className="text-teal-200 text-xs">Prima Visita</span>
                                        <p className="text-lg font-semibold">{formatCurrency(prestazione.prezzoPrimaVisita)}</p>
                                    </div>
                                )}
                                {prestazione.prezzoControllo && (
                                    <div>
                                        <span className="text-teal-200 text-xs">Controllo</span>
                                        <p className="text-lg font-semibold">{formatCurrency(prestazione.prezzoControllo)}</p>
                                    </div>
                                )}
                                <div>
                                    <span className="text-teal-200 text-xs">IVA</span>
                                    <p className="text-lg font-semibold">{prestazione.ivaAliquota}%</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            to={`/poliambulatorio/catalogo/prestazioni/${id}/modifica`}
                            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors backdrop-blur-sm"
                        >
                            <Edit className="w-4 h-4" />
                            Modifica
                        </Link>
                        <button
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                            className="p-2 bg-white/10 hover:bg-red-500/50 rounded-lg transition-colors"
                            title="Elimina prestazione"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Medici con prezzo specifico</p>
                        <p className="text-2xl font-bold text-gray-900">{mediciCount}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Convenzioni associate</p>
                        <p className="text-2xl font-bold text-gray-900">{convenzioniCount}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Listini totali</p>
                        <p className="text-2xl font-bold text-gray-900">{listini.length}</p>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="border-b border-gray-200 bg-gray-50 px-2 pt-2">
                    <nav className="flex gap-1">
                        <TabButton
                            active={activeTab === 'info'}
                            onClick={() => setActiveTab('info')}
                            icon={<FileText className="w-4 h-4" />}
                            label="Informazioni"
                            color="teal"
                        />
                        <TabButton
                            active={activeTab === 'prezzi'}
                            onClick={() => setActiveTab('prezzi')}
                            icon={<Users className="w-4 h-4" />}
                            label="Listini Medici"
                            count={mediciCount}
                            color="blue"
                        />
                        <TabButton
                            active={activeTab === 'convenzioni'}
                            onClick={() => setActiveTab('convenzioni')}
                            icon={<Building2 className="w-4 h-4" />}
                            label="Convenzioni"
                            count={convenzioniCount}
                            color="amber"
                        />
                        <TabButton
                            active={activeTab === 'tariffarioAziendale'}
                            onClick={() => setActiveTab('tariffarioAziendale')}
                            icon={<Receipt className="w-4 h-4" />}
                            label="Tariffario Aziendale"
                            color="violet"
                        />
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    {activeTab === 'info' && <InfoTab prestazione={prestazione} />}
                    {activeTab === 'prezzi' && <PrezziTab prestazione={prestazione} />}
                    {activeTab === 'convenzioni' && <ConvenzioniTab prestazione={prestazione} />}
                    {activeTab === 'tariffarioAziendale' && <TariffarioAziendaleTab prestazione={prestazione} />}
                </div>
            </div>
        </div>
    );
};

export default PrestazioneDetailPage;
