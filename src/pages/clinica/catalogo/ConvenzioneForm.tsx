/**
 * ConvenzioneForm Component
 * 
 * Form per creazione/modifica convenzioni.
 * Allineato completamente allo schema Prisma e alla validazione backend.
 * 
 * Campi Prisma supportati:
 * - codice (required, unique per tenant)
 * - nome (required, 3-200 chars)
 * - tipo (required, enum: AZIENDALE, ASSICURATIVA, PUBBLICA, PRIVATA)
 * - descrizione (optional, max 1000)
 * - enteTerzo (optional, max 200)
 * - partitaIva (optional, max 20)
 * - codiceFiscale (optional, max 20)
 * - telefono (optional, pattern)
 * - email (optional, email format)
 * - referente (optional, max 200)
 * - dataInizio (required)
 * - dataFine (optional, must be > dataInizio)
 * - condizioni (JSON, optional)
 * - attiva (boolean, default true)
 * 
 * @module pages/poliambulatorio/catalogo/ConvenzioneForm
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft,
    Save,
    Loader2,
    Handshake,
    Calendar,
    Building2,
    Phone,
    Mail,
    User,
    FileText,
    Info,
    Plus,
    Trash2,
    Euro,
    Search,
    Package,
    ExternalLink
} from 'lucide-react';
import { convenzioniApi, listiniApi, bundleApi } from '../../../services/clinicaApi';
import { getCompanies } from '../../../services/companies';
import { apiGet } from '../../../services/api';
import type { Convenzione, TipoConvenzione, ListinoPrezzo, OffertaBundle } from '../../../services/clinicaApi';
import { useToast } from '../../../hooks/useToast';
import AziendeRiconoscimentiSection from '../../../components/clinica/AziendeRiconoscimentiSection';
import '../../../styles/clinica-theme.css';

// =====================================================
// TYPES
// =====================================================

// Company type for select dropdown
interface CompanyOption {
    id: string;
    ragioneSociale: string;
    piva?: string;
}

// CodiceSconto type from DB
interface CodiceSconto {
    id: string;
    codice: string;
    nome?: string;
    descrizione?: string;
    tipoSconto: string;
    valore: number;
}

interface FormData {
    codice: string;
    nome: string;
    tipo: TipoConvenzione;
    descrizione: string;
    enteTerzo: string;
    partitaIva: string;
    codiceFiscale: string;
    telefono: string;
    email: string;
    referente: string;
    dataInizio: string;
    dataFine: string;
    attiva: boolean;
    // Condizioni aggiuntive
    codiceSconto: string;
    companyIds: string[];
    bundleIds: string[]; // Bundle associati alla convenzione
}

interface FormErrors {
    [key: string]: string;
}

// =====================================================
// CONSTANTS
// =====================================================

const TIPO_OPTIONS: { value: TipoConvenzione; label: string; description: string }[] = [
    { value: 'AZIENDALE', label: 'Aziendale', description: 'Convenzione con aziende per dipendenti' },
    { value: 'ASSICURATIVA', label: 'Assicurativa', description: 'Convenzione con compagnie assicurative' },
    { value: 'PUBBLICA', label: 'Pubblica', description: 'Convenzione con enti pubblici (ASL, Regioni)' },
    { value: 'PRIVATA', label: 'Privata', description: 'Convenzione con enti privati o associazioni' },
];

const INITIAL_FORM_DATA: FormData = {
    codice: '',
    nome: '',
    tipo: 'AZIENDALE',
    descrizione: '',
    enteTerzo: '',
    partitaIva: '',
    codiceFiscale: '',
    telefono: '',
    email: '',
    referente: '',
    dataInizio: new Date().toISOString().split('T')[0],
    dataFine: '',
    attiva: true,
    // Condizioni aggiuntive
    codiceSconto: '',
    companyIds: [],
    bundleIds: [],
};

// =====================================================
// BUNDLE SELECTION SECTION COMPONENT
// =====================================================

interface BundleSelectionSectionProps {
    bundleIds: string[];
    onBundleIdsChange: (ids: string[]) => void;
}

const BundleSelectionSection: React.FC<BundleSelectionSectionProps> = ({
    bundleIds,
    onBundleIdsChange
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Query tutti i bundle attivi
    const { data: bundlesData, isLoading } = useQuery({
        queryKey: ['bundles-for-selection'],
        queryFn: async () => {
            const result = await bundleApi.getAll({ limit: 500, attivo: true });
            return result.data || [];
        },
    });

    const allBundles: OffertaBundle[] = bundlesData || [];

    // Filter bundles based on search term
    const filteredBundles = allBundles.filter(bundle =>
        searchTerm === '' ||
        bundle.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bundle.codice.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Toggle bundle selection
    const handleBundleToggle = (bundleId: string) => {
        if (bundleIds.includes(bundleId)) {
            onBundleIdsChange(bundleIds.filter(id => id !== bundleId));
        } else {
            onBundleIdsChange([...bundleIds, bundleId]);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-purple-600" />
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Bundle Associati</h3>
                        <p className="text-sm text-gray-500">Seleziona i bundle da includere in questa convenzione</p>
                    </div>
                </div>
                {bundleIds.length > 0 && (
                    <span className="text-sm font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                        {bundleIds.length} selezionati
                    </span>
                )}
            </div>

            {/* Search bar */}
            <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cerca bundle per nome o codice..."
                    className="input-clinica pl-10 w-full"
                />
            </div>

            {/* Selected bundles badges */}
            {bundleIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                    {bundleIds.map(bundleId => {
                        const bundle = allBundles.find(b => b.id === bundleId);
                        return bundle ? (
                            <span
                                key={bundleId}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                            >
                                <Package className="w-3 h-3" />
                                {bundle.nome}
                                <button
                                    type="button"
                                    onClick={() => handleBundleToggle(bundleId)}
                                    className="ml-1 hover:text-purple-600"
                                >
                                    ×
                                </button>
                            </span>
                        ) : null;
                    })}
                </div>
            )}

            {/* Bundle list */}
            {isLoading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                </div>
            ) : filteredBundles.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">
                        {searchTerm ? 'Nessun bundle trovato' : 'Nessun bundle disponibile'}
                    </p>
                    <a
                        href="/poliambulatorio/catalogo/bundles/nuovo"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-sm text-teal-600 hover:text-teal-700"
                    >
                        <Plus className="w-4 h-4" />
                        Crea nuovo bundle
                    </a>
                </div>
            ) : (
                <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                    {filteredBundles.map((bundle: OffertaBundle) => (
                        <label
                            key={bundle.id}
                            className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 transition-colors ${bundleIds.includes(bundle.id) ? 'bg-purple-50' : ''
                                }`}
                        >
                            <input
                                type="checkbox"
                                checked={bundleIds.includes(bundle.id)}
                                onChange={() => handleBundleToggle(bundle.id)}
                                className="w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-purple-500"
                            />
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Package className="w-5 h-5 text-purple-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{bundle.nome}</p>
                                <p className="text-sm text-gray-500">
                                    {bundle.codice}
                                    {bundle.prezzoBundle && ` • €${Number(bundle.prezzoBundle).toFixed(2)}`}
                                    {bundle.scontoPercentuale && ` • -${bundle.scontoPercentuale}%`}
                                </p>
                            </div>
                        </label>
                    ))}
                </div>
            )}

            <p className="mt-3 text-xs text-gray-500">
                I bundle selezionati saranno disponibili per i beneficiari di questa convenzione
            </p>
        </div>
    );
};

// =====================================================
// LISTINI ASSOCIATI SECTION COMPONENT (DEPRECATED - not used)
// =====================================================

interface ListiniAssociatiSectionProps {
    convenzioneId: string;
    showToast: (params: { type: 'success' | 'error'; message: string }) => void;
    queryClient: ReturnType<typeof useQueryClient>;
}

const ListiniAssociatiSection: React.FC<ListiniAssociatiSectionProps> = ({
    convenzioneId,
    showToast,
    queryClient
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);

    // Query listini associati
    const { data: listiniAssociati = [], isLoading: isLoadingAssociati } = useQuery({
        queryKey: ['convenzioni', convenzioneId, 'listini'],
        queryFn: () => convenzioniApi.getListini(convenzioneId),
    });

    // Query tutti i listini disponibili
    const { data: tuttiListini } = useQuery({
        queryKey: ['listini'],
        queryFn: () => listiniApi.getAll(),
        enabled: showAddModal,
    });

    // Mutation per associare
    const associateMutation = useMutation({
        mutationFn: (listinoId: string) => convenzioniApi.associateListino(convenzioneId, listinoId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['convenzioni', convenzioneId, 'listini'] });
            showToast({ type: 'success', message: 'Listino associato con successo' });
            setShowAddModal(false);
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: error.message || 'Errore durante l\'associazione' });
        }
    });

    // Mutation per rimuovere
    const removeMutation = useMutation({
        mutationFn: (listinoId: string) => convenzioniApi.removeListino(convenzioneId, listinoId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['convenzioni', convenzioneId, 'listini'] });
            showToast({ type: 'success', message: 'Listino rimosso dalla convenzione' });
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: error.message || 'Errore durante la rimozione' });
        }
    });

    // Filtra listini disponibili (non già associati)
    const listiniDisponibili = (tuttiListini?.data || []).filter(
        (l: ListinoPrezzo) => !listiniAssociati.some((a: ListinoPrezzo) => a.id === l.id)
    ).filter((l: ListinoPrezzo) =>
        searchTerm === '' ||
        (l.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.prestazione?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Euro className="w-5 h-5 text-teal-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Listini Associati</h3>
                </div>
                <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="btn-clinica-secondary text-sm flex items-center gap-1"
                >
                    <Plus className="w-4 h-4" />
                    Associa Listino
                </button>
            </div>

            {isLoadingAssociati ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
                </div>
            ) : listiniAssociati.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <Euro className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>Nessun listino associato</p>
                    <p className="text-sm">Associa un listino per applicare prezzi scontati</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {listiniAssociati.map((listino: ListinoPrezzo) => (
                        <div
                            key={listino.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                                    <Euro className="w-5 h-5 text-teal-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">
                                        {listino.nome || listino.prestazione?.nome || `Listino #${listino.id.slice(-4)}`}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        €{listino.prezzo?.toFixed(2)} • IVA {listino.ivaAliquota}%
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => removeMutation.mutate(listino.id)}
                                disabled={removeMutation.isPending}
                                className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                                title="Rimuovi associazione"
                            >
                                {removeMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Trash2 className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Aggiungi Listino */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold">Associa Listino</h3>
                        </div>
                        <div className="p-4 border-b border-gray-200">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Cerca listino..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="input-clinica pl-10"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            {listiniDisponibili.length === 0 ? (
                                <p className="text-center text-gray-500 py-4">
                                    Nessun listino disponibile
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {listiniDisponibili.map((listino: ListinoPrezzo) => (
                                        <button
                                            key={listino.id}
                                            type="button"
                                            onClick={() => associateMutation.mutate(listino.id)}
                                            disabled={associateMutation.isPending}
                                            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-teal-50 rounded-lg transition-colors text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                                    <Euro className="w-5 h-5 text-gray-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">
                                                        {listino.nome || listino.prestazione?.nome || `Listino #${listino.id.slice(-4)}`}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        €{listino.prezzo?.toFixed(2)} • IVA {listino.ivaAliquota}%
                                                    </p>
                                                </div>
                                            </div>
                                            <Plus className="w-5 h-5 text-teal-600" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={() => setShowAddModal(false)}
                                className="btn-clinica-secondary w-full"
                            >
                                Chiudi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// =====================================================
// BUNDLE ASSOCIATI SECTION
// =====================================================

interface BundleAssociatiSectionProps {
    convenzioneId: string;
}

const BundleAssociatiSection: React.FC<BundleAssociatiSectionProps> = ({
    convenzioneId
}) => {
    // Query tutti i bundle per trovare quelli che includono questa convenzione
    const { data: bundlesData, isLoading } = useQuery({
        queryKey: ['bundle-for-convenzione', convenzioneId],
        queryFn: async () => {
            const result = await bundleApi.getAll({ limit: 500, attivo: true });
            // Filtra solo i bundle che hanno questa convenzione nei loro convenzioniIds
            return (result.data || []).filter((bundle: OffertaBundle) =>
                bundle.convenzioniIds?.includes(convenzioneId)
            );
        },
    });

    const bundlesAssociati = bundlesData || [];

    if (isLoading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Bundle Associati</h3>
                </div>
                <a
                    href="/poliambulatorio/catalogo/bundles/nuovo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700"
                >
                    <Plus className="w-4 h-4" />
                    Crea nuovo bundle
                </a>
            </div>

            {bundlesAssociati.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">
                        Nessun bundle utilizza questa convenzione
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                        Per associare un bundle, modifica il bundle e aggiungi questa convenzione
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {bundlesAssociati.map((bundle: OffertaBundle) => (
                        <div
                            key={bundle.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <Package className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">{bundle.nome}</p>
                                    <p className="text-sm text-gray-500">
                                        {bundle.codice}
                                        {bundle.prezzoBundle && ` • €${Number(bundle.prezzoBundle).toFixed(2)}`}
                                        {bundle.scontoPercentuale && ` • -${bundle.scontoPercentuale}%`}
                                    </p>
                                </div>
                            </div>
                            <a
                                href={`/poliambulatorio/catalogo/bundles/${bundle.id}/modifica`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-gray-400 hover:text-teal-600 rounded-lg hover:bg-white"
                                title="Apri bundle in nuova tab"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>
                    ))}
                </div>
            )}

            <p className="mt-4 text-xs text-gray-400">
                I bundle vengono associati dalla pagina di modifica del bundle stesso
            </p>
        </div>
    );
};

// =====================================================
// MAIN COMPONENT
// =====================================================

const ConvenzioneForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const isEditing = Boolean(id);

    // State
    const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
    const [errors, setErrors] = useState<FormErrors>({});
    const [isDirty, setIsDirty] = useState(false);
    const [companySearch, setCompanySearch] = useState('');

    // Query for editing
    const { data: convenzione, isLoading: isLoadingConvenzione } = useQuery({
        queryKey: ['convenzioni', id],
        queryFn: () => convenzioniApi.getById(id!),
        enabled: isEditing,
    });

    // Query for companies list
    const { data: companiesData } = useQuery({
        queryKey: ['companies'],
        queryFn: () => getCompanies(),
    });
    const companiesList: CompanyOption[] = companiesData || [];

    // Query for codici sconto list
    const { data: codiciScontoData } = useQuery<{ success: boolean; data?: CodiceSconto[] }>({
        queryKey: ['codici-sconto'],
        queryFn: async () => {
            return apiGet<{ success: boolean; data?: CodiceSconto[] }>('/api/v1/codici-sconto');
        },
    });
    const codiciScontoList: CodiceSconto[] = codiciScontoData?.data || [];

    // Populate form when editing
    useEffect(() => {
        if (convenzione) {
            // Parse condizioni JSON if exists
            const condizioni = (convenzione.condizioni || {}) as {
                codiceSconto?: string;
                companyIds?: string[];
                companyId?: string; // Legacy support
                bundleIds?: string[];
            };

            // Convert legacy companyId to companyIds array
            const parsedCompanyIds = condizioni.companyIds ||
                (condizioni.companyId ? [condizioni.companyId] : []);

            // Parse bundleIds from condizioni
            const parsedBundleIds = condizioni.bundleIds || [];

            setFormData({
                codice: convenzione.codice || '',
                nome: convenzione.nome || '',
                tipo: convenzione.tipo || 'AZIENDALE',
                descrizione: convenzione.descrizione || '',
                enteTerzo: convenzione.enteTerzo || '',
                partitaIva: convenzione.partitaIva || '',
                codiceFiscale: convenzione.codiceFiscale || '',
                telefono: convenzione.telefono || '',
                email: convenzione.email || '',
                referente: convenzione.referente || '',
                dataInizio: convenzione.dataInizio ? convenzione.dataInizio.split('T')[0] : '',
                dataFine: convenzione.dataFine ? convenzione.dataFine.split('T')[0] : '',
                attiva: convenzione.attiva ?? true,
                // Condizioni aggiuntive
                codiceSconto: condizioni.codiceSconto || '',
                companyIds: parsedCompanyIds,
                bundleIds: parsedBundleIds,
            });
        }
    }, [convenzione]);

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: Partial<Convenzione>) => convenzioniApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['convenzioni'] });
            showToast({ type: 'success', message: 'Convenzione creata con successo' });
            navigate('/poliambulatorio/catalogo/convenzioni');
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: error.message || 'Errore durante la creazione' });
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data: Partial<Convenzione>) => convenzioniApi.update(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['convenzioni'] });
            queryClient.invalidateQueries({ queryKey: ['convenzioni', id] });
            showToast({ type: 'success', message: 'Convenzione aggiornata con successo' });
            navigate('/poliambulatorio/catalogo/convenzioni');
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: error.message || 'Errore durante l\'aggiornamento' });
        }
    });

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    // Validation - aligned with backend Joi schema
    const validate = (): boolean => {
        const newErrors: FormErrors = {};

        // codice: required, 2-50 chars, alphanumeric + _ -
        if (!formData.codice.trim()) {
            newErrors.codice = 'Il codice è obbligatorio';
        } else if (!/^[A-Z0-9_-]+$/i.test(formData.codice)) {
            newErrors.codice = 'Il codice può contenere solo lettere, numeri, trattini e underscore';
        } else if (formData.codice.length < 2 || formData.codice.length > 50) {
            newErrors.codice = 'Il codice deve essere tra 2 e 50 caratteri';
        }

        // nome: required, 3-200 chars
        if (!formData.nome.trim()) {
            newErrors.nome = 'Il nome è obbligatorio';
        } else if (formData.nome.length < 3 || formData.nome.length > 200) {
            newErrors.nome = 'Il nome deve essere tra 3 e 200 caratteri';
        }

        // tipo: required
        if (!formData.tipo) {
            newErrors.tipo = 'Il tipo è obbligatorio';
        }

        // dataInizio: required
        if (!formData.dataInizio) {
            newErrors.dataInizio = 'La data inizio è obbligatoria';
        }

        // dataFine: must be > dataInizio
        if (formData.dataFine && formData.dataInizio && new Date(formData.dataFine) <= new Date(formData.dataInizio)) {
            newErrors.dataFine = 'La data fine deve essere successiva alla data inizio';
        }

        // email: valid format
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Email non valida';
        }

        // telefono: valid pattern
        if (formData.telefono && !/^\+?[0-9\s-]{6,20}$/.test(formData.telefono)) {
            newErrors.telefono = 'Formato telefono non valido';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handlers
    const handleChange = (field: keyof FormData, value: string | boolean | string[]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);

        // Clear error on change
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    // Handle company toggle for multi-select
    const handleCompanyToggle = (companyId: string) => {
        setFormData(prev => ({
            ...prev,
            companyIds: prev.companyIds.includes(companyId)
                ? prev.companyIds.filter(id => id !== companyId)
                : [...prev.companyIds, companyId]
        }));
        setIsDirty(true);
    };

    // Filter companies based on search
    const filteredCompanies = companiesList.filter(company =>
        companySearch === '' ||
        company.ragioneSociale.toLowerCase().includes(companySearch.toLowerCase()) ||
        (company.piva && company.piva.includes(companySearch))
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) {
            showToast({ type: 'error', message: 'Correggi gli errori nel form' });
            return;
        }

        const submitData: Partial<Convenzione> = {
            codice: formData.codice.toUpperCase().trim(),
            nome: formData.nome.trim(),
            tipo: formData.tipo,
            descrizione: formData.descrizione.trim() || null,
            enteTerzo: formData.enteTerzo.trim() || null,
            partitaIva: formData.partitaIva.trim() || null,
            codiceFiscale: formData.codiceFiscale.trim() || null,
            telefono: formData.telefono.trim() || null,
            email: formData.email.trim() || null,
            referente: formData.referente.trim() || null,
            dataInizio: formData.dataInizio,
            dataFine: formData.dataFine || null,
            attiva: formData.attiva,
            // Condizioni aggiuntive salvate come JSON
            condizioni: {
                codiceSconto: formData.codiceSconto.trim() || undefined,
                companyIds: formData.companyIds.length > 0 ? formData.companyIds : undefined,
                bundleIds: formData.bundleIds.length > 0 ? formData.bundleIds : undefined,
            },
        };

        if (isEditing) {
            updateMutation.mutate(submitData);
        } else {
            createMutation.mutate(submitData);
        }
    };

    const handleCancel = () => {
        if (isDirty && !confirm('Hai modifiche non salvate. Sei sicuro di voler uscire?')) {
            return;
        }
        navigate('/poliambulatorio/catalogo/convenzioni');
    };

    // Loading state
    if (isEditing && isLoadingConvenzione) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto clinica-theme" data-brand="element-medica">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={handleCancel}
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-teal-600 mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Torna alle convenzioni
                </button>
                <h1 className="text-2xl font-semibold text-gray-900">
                    {isEditing ? 'Modifica Convenzione' : 'Nuova Convenzione'}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    {isEditing
                        ? 'Modifica i dati della convenzione'
                        : 'Inserisci i dati per creare una nuova convenzione'}
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-purple-100">
                            <Handshake className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-medium text-gray-900">Informazioni Convenzione</h2>
                            <p className="text-sm text-gray-500">Dati identificativi dell'accordo</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Codice */}
                        <div>
                            <label className="label-clinica">
                                Codice <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.codice}
                                onChange={(e) => handleChange('codice', e.target.value.toUpperCase())}
                                placeholder="es. CONV-UNIPOL-2025"
                                className={`input-clinica ${errors.codice ? 'border-red-500' : ''}`}
                            />
                            {errors.codice && (
                                <p className="mt-1 text-sm text-red-600">{errors.codice}</p>
                            )}
                        </div>

                        {/* Nome */}
                        <div>
                            <label className="label-clinica">
                                Nome convenzione <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.nome}
                                onChange={(e) => handleChange('nome', e.target.value)}
                                placeholder="es. Convenzione UnipolSai"
                                className={`input-clinica ${errors.nome ? 'border-red-500' : ''}`}
                            />
                            {errors.nome && (
                                <p className="mt-1 text-sm text-red-600">{errors.nome}</p>
                            )}
                        </div>

                        {/* Tipo */}
                        <div className="md:col-span-2">
                            <label className="label-clinica">
                                Tipo <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-1">
                                {TIPO_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => handleChange('tipo', option.value)}
                                        className={`p-3 rounded-lg border-2 text-left transition-all ${formData.tipo === option.value
                                            ? 'border-teal-500 bg-teal-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <span className={`font-medium ${formData.tipo === option.value
                                            ? 'text-teal-700'
                                            : 'text-gray-900'
                                            }`}>
                                            {option.label}
                                        </span>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {option.description}
                                        </p>
                                    </button>
                                ))}
                            </div>
                            {errors.tipo && (
                                <p className="mt-1 text-sm text-red-600">{errors.tipo}</p>
                            )}
                        </div>

                        {/* Descrizione */}
                        <div className="md:col-span-2">
                            <label className="label-clinica">Descrizione</label>
                            <textarea
                                value={formData.descrizione}
                                onChange={(e) => handleChange('descrizione', e.target.value)}
                                rows={3}
                                placeholder="Descrizione della convenzione, condizioni particolari..."
                                className="input-clinica resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Ente Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-blue-100">
                            <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-medium text-gray-900">Ente Convenzionato</h2>
                            <p className="text-sm text-gray-500">Dati dell'azienda o ente terzo</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Ente Terzo - Combobox con opzione Aggiungi */}
                        <div className="md:col-span-2">
                            <label className="label-clinica">Ragione Sociale / Ente</label>
                            <div className="relative">
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={formData.enteTerzo}
                                            onChange={(e) => handleChange('enteTerzo', e.target.value)}
                                            placeholder="Cerca o inserisci ragione sociale..."
                                            className="input-clinica pl-9"
                                            list="enti-convenzionati-list"
                                        />
                                        <datalist id="enti-convenzionati-list">
                                            {companiesList.map(company => (
                                                <option key={company.id} value={company.ragioneSociale}>
                                                    {company.piva && `P.IVA: ${company.piva}`}
                                                </option>
                                            ))}
                                        </datalist>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => window.open('/management/companies/new', '_blank')}
                                        className="px-3 py-2 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 flex items-center gap-1 whitespace-nowrap"
                                        title="Aggiungi nuova azienda"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Aggiungi
                                    </button>
                                </div>
                                {/* Quick fill from selected company */}
                                {formData.enteTerzo && companiesList.some(c =>
                                    c.ragioneSociale.toLowerCase() === formData.enteTerzo.toLowerCase()
                                ) && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const company = companiesList.find(c =>
                                                    c.ragioneSociale.toLowerCase() === formData.enteTerzo.toLowerCase()
                                                );
                                                if (company) {
                                                    handleChange('partitaIva', company.piva || '');
                                                }
                                            }}
                                            className="mt-1 text-xs text-teal-600 hover:text-teal-700"
                                        >
                                            → Compila automaticamente P.IVA
                                        </button>
                                    )}
                            </div>
                        </div>

                        {/* Partita IVA */}
                        <div>
                            <label className="label-clinica">Partita IVA</label>
                            <input
                                type="text"
                                value={formData.partitaIva}
                                onChange={(e) => handleChange('partitaIva', e.target.value)}
                                placeholder="es. IT12345678901"
                                className="input-clinica"
                            />
                        </div>

                        {/* Codice Fiscale */}
                        <div>
                            <label className="label-clinica">Codice Fiscale</label>
                            <input
                                type="text"
                                value={formData.codiceFiscale}
                                onChange={(e) => handleChange('codiceFiscale', e.target.value.toUpperCase())}
                                placeholder="es. 12345678901"
                                className="input-clinica"
                            />
                        </div>

                        {/* Referente */}
                        <div>
                            <label className="label-clinica">Referente</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={formData.referente}
                                    onChange={(e) => handleChange('referente', e.target.value)}
                                    placeholder="Nome e cognome del referente"
                                    className="input-clinica pl-10"
                                />
                            </div>
                        </div>

                        {/* Telefono */}
                        <div>
                            <label className="label-clinica">Telefono</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="tel"
                                    value={formData.telefono}
                                    onChange={(e) => handleChange('telefono', e.target.value)}
                                    placeholder="+39 02 1234567"
                                    className={`input-clinica pl-10 ${errors.telefono ? 'border-red-500' : ''}`}
                                />
                            </div>
                            {errors.telefono && (
                                <p className="mt-1 text-sm text-red-600">{errors.telefono}</p>
                            )}
                        </div>

                        {/* Email */}
                        <div>
                            <label className="label-clinica">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    placeholder="convenzioni@esempio.it"
                                    className={`input-clinica pl-10 ${errors.email ? 'border-red-500' : ''}`}
                                />
                            </div>
                            {errors.email && (
                                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                            )}
                        </div>

                        {/* Aziende Collegate - Multi-select con searchbar */}
                        <div className="md:col-span-2">
                            <label className="label-clinica flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-purple-500" />
                                Aziende Collegate (opzionale)
                            </label>

                            {/* Searchbar */}
                            <div className="relative mb-2">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={companySearch}
                                    onChange={(e) => setCompanySearch(e.target.value)}
                                    placeholder="Cerca azienda per nome o P.IVA..."
                                    className="input-clinica pl-10 w-full"
                                />
                            </div>

                            {/* Selected companies badges */}
                            {formData.companyIds.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {formData.companyIds.map(companyId => {
                                        const company = companiesList.find(c => c.id === companyId);
                                        return company ? (
                                            <span
                                                key={companyId}
                                                className="inline-flex items-center gap-1 px-2 py-1 bg-teal-100 text-teal-800 rounded-full text-sm"
                                            >
                                                {company.ragioneSociale}
                                                <button
                                                    type="button"
                                                    onClick={() => handleCompanyToggle(companyId)}
                                                    className="ml-1 hover:text-teal-600"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                            )}

                            {/* Company list with checkboxes */}
                            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                                {filteredCompanies.length === 0 ? (
                                    <p className="p-3 text-gray-500 text-sm text-center">
                                        {companySearch ? 'Nessuna azienda trovata' : 'Nessuna azienda disponibile'}
                                    </p>
                                ) : (
                                    filteredCompanies.map((company: CompanyOption) => (
                                        <label
                                            key={company.id}
                                            className={`flex items-center gap-3 p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 ${formData.companyIds.includes(company.id) ? 'bg-teal-50' : ''
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={formData.companyIds.includes(company.id)}
                                                onChange={() => handleCompanyToggle(company.id)}
                                                className="w-4 h-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                                            />
                                            <div className="flex-1">
                                                <span className="text-gray-900">{company.ragioneSociale}</span>
                                                {company.piva && (
                                                    <span className="text-xs text-gray-500 ml-2">
                                                        P.IVA: {company.piva}
                                                    </span>
                                                )}
                                            </div>
                                        </label>
                                    ))
                                )}
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                                Seleziona una o più aziende da associare a questa convenzione
                            </p>
                        </div>
                    </div>
                </div>

                {/* Condizioni Sconto Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-green-100">
                            <Euro className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-medium text-gray-900">Condizioni Economiche</h2>
                            <p className="text-sm text-gray-500">Codice sconto applicabile</p>
                        </div>
                    </div>

                    <div>
                        {/* Codice Sconto - Select dal DB */}
                        <div className="max-w-md">
                            <label className="label-clinica">Codice Sconto</label>
                            <select
                                value={formData.codiceSconto}
                                onChange={(e) => handleChange('codiceSconto', e.target.value)}
                                className="select-clinica w-full"
                            >
                                <option value="">-- Seleziona un codice sconto --</option>
                                {codiciScontoList.map((codice: CodiceSconto) => (
                                    <option key={codice.id} value={codice.codice}>
                                        {codice.codice}
                                        {codice.nome ? ` - ${codice.nome}` : ''}
                                        {codice.valore ? ` (${codice.tipoSconto === 'PERCENTUALE' ? `${codice.valore}%` : `€${codice.valore}`})` : ''}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-gray-500">
                                Seleziona un codice sconto esistente da applicare a questa convenzione
                            </p>
                        </div>
                    </div>
                </div>

                {/* Validity Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-amber-100">
                            <Calendar className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-medium text-gray-900">Periodo di Validità</h2>
                            <p className="text-sm text-gray-500">Durata della convenzione</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Data Inizio */}
                        <div>
                            <label className="label-clinica">
                                Data inizio <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={formData.dataInizio}
                                onChange={(e) => handleChange('dataInizio', e.target.value)}
                                className={`input-clinica ${errors.dataInizio ? 'border-red-500' : ''}`}
                            />
                            {errors.dataInizio && (
                                <p className="mt-1 text-sm text-red-600">{errors.dataInizio}</p>
                            )}
                        </div>

                        {/* Data Fine */}
                        <div>
                            <label className="label-clinica">Data fine</label>
                            <input
                                type="date"
                                value={formData.dataFine}
                                onChange={(e) => handleChange('dataFine', e.target.value)}
                                className={`input-clinica ${errors.dataFine ? 'border-red-500' : ''}`}
                            />
                            {errors.dataFine && (
                                <p className="mt-1 text-sm text-red-600">{errors.dataFine}</p>
                            )}
                            <p className="mt-1 text-xs text-gray-500">
                                Lascia vuoto per convenzione senza scadenza
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>Le convenzioni scadute rimarranno visibili nello storico ma non saranno applicabili a nuove prenotazioni.</span>
                    </div>
                </div>

                {/* Bundle Associati Card */}
                <BundleSelectionSection
                    bundleIds={formData.bundleIds}
                    onBundleIdsChange={(ids) => handleChange('bundleIds', ids)}
                />

                {/* Aziende e Riconoscimenti Section */}
                {isEditing && id && (
                    <AziendeRiconoscimentiSection
                        convenzioneId={id}
                        isEditing={isEditing}
                    />
                )}

                {/* Status Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.attiva}
                            onChange={(e) => handleChange('attiva', e.target.checked)}
                            className="w-5 h-5 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                        />
                        <div className="flex-1">
                            <span className="font-medium text-gray-900">Convenzione attiva</span>
                            <p className="text-sm text-gray-500">
                                Se disattivata, non sarà disponibile per nuove prenotazioni
                            </p>
                        </div>
                    </label>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="btn-clinica-secondary"
                    >
                        Annulla
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-clinica-primary flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Salvataggio...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                {isEditing ? 'Salva Modifiche' : 'Crea Convenzione'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ConvenzioneForm;
