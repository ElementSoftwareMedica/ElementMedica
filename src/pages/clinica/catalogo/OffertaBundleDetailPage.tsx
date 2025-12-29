/**
 * OffertaBundleDetailPage - Pagina Dettaglio Bundle/Offerta
 * 
 * Visualizza tutti i dettagli di un bundle con tabs per:
 * - Informazioni Base
 * - Listini Medici (con compensi min/max per prestazione)
 * - Convenzioni Associate
 * 
 * @module pages/clinica/catalogo/OffertaBundleDetailPage
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
    Package,
    Calendar,
    Tag,
    Gift,
    UserCheck,
    Ticket
} from 'lucide-react';
import {
    bundleApi,
    listiniApi,
    convenzioniApi,
    mediciApi,
    prestazioniApi,
    OffertaBundle,
    OffertaBundlePrestazione,
    ListinoPrezzo,
    Convenzione,
    Medico,
    MedicoAbilitato,
    TipoCompensoMedico,
    Prestazione
} from '../../../services/clinicaApi';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { useToast } from '../../../hooks/useToast';
import '../../../styles/clinica-theme.css';

// =====================================================
// TYPES
// =====================================================

interface PrezzoMedicoFormData {
    medicoId: string;
    prezzo: string;
    durataMedico: string;
    compensoTipo: TipoCompensoMedico;
    compensoValore: string;
    compensoMinimo: string;
    compensoMassimo: string;
}

interface MedicoWithListino {
    medicoId: string;
    medicoName: string;
    specializzazione?: string;
    listino?: ListinoPrezzo;
    abilitazione?: MedicoAbilitato;
    hasListino: boolean;
    prezzoEffettivo: number;
    durataEffettiva: number;
    compensoTipoEffettivo: TipoCompensoMedico;
    compensoValoreEffettivo: number;
    compensoMinimoEffettivo?: number;
    compensoMassimoEffettivo?: number;
}

type TabType = 'info' | 'medici' | 'convenzioni';

// =====================================================
// CONSTANTS
// =====================================================

const TIPO_COMPENSO_OPTIONS = [
    { value: 'PERCENTUALE' as TipoCompensoMedico, label: 'Percentuale', icon: Percent },
    { value: 'FISSO' as TipoCompensoMedico, label: 'Importo Fisso', icon: Euro },
    { value: 'MINIMO_MASSIMO' as TipoCompensoMedico, label: 'Min/Max', icon: Activity }
];

// =====================================================
// HELPER FUNCTIONS
// =====================================================

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

const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '-';
    try {
        return new Date(dateStr).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch {
        return '-';
    }
};

// =====================================================
// TAB BUTTON COMPONENT
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
        teal: 'border-teal-500 text-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-400',
        blue: 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400',
        purple: 'border-purple-500 text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400',
        amber: 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400'
    };

    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2.5 px-5 py-3.5 rounded-t-xl font-medium text-sm transition-all duration-200 ${active
                ? `border-b-2 ${colorClasses[color as keyof typeof colorClasses] || colorClasses.teal} shadow-sm`
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border-b-2 border-transparent'
                }`}
        >
            <span className={active ? '' : 'opacity-70'}>{icon}</span>
            {label}
            {count !== undefined && count > 0 && (
                <span className={`ml-1 px-2.5 py-0.5 text-xs font-semibold rounded-full transition-colors ${active
                    ? 'bg-white/80 dark:bg-gray-800 text-current shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}>
                    {count}
                </span>
            )}
        </button>
    );
};

// =====================================================
// INFO TAB COMPONENT
// =====================================================

const InfoTab: React.FC<{ bundle: OffertaBundle }> = ({ bundle }) => {
    const prestazioni = bundle.prestazioni || [];
    const prezzoSingoli = bundle.prezzoSingoli || prestazioni.reduce((sum, p) => {
        const prezzoBase = p.prestazione?.prezzoBase || 0;
        return sum + (prezzoBase * (p.quantita || 1));
    }, 0);
    const prezzoBundle = bundle.prezzoBundle || 0;
    const risparmio = prezzoSingoli - prezzoBundle;
    const percentualeRisparmio = prezzoSingoli > 0 ? ((risparmio / prezzoSingoli) * 100) : 0;

    return (
        <div className="space-y-6">
            {/* Info Generali */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    Informazioni Generali
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Codice</label>
                        <p className="mt-1 text-gray-900 dark:text-white font-mono">{bundle.codice}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Stato</label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${bundle.attivo
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                }`}>
                                {bundle.attivo ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                {bundle.attivo ? 'Attivo' : 'Non attivo'}
                            </span>
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Solo nuovi pazienti</label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${bundle.soloNuoviPazienti
                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                }`}>
                                {bundle.soloNuoviPazienti ? 'Sì' : 'No'}
                            </span>
                        </p>
                    </div>
                    <div className="md:col-span-2 lg:col-span-3">
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Nome</label>
                        <p className="mt-1 text-gray-900 dark:text-white text-lg font-semibold">{bundle.nome}</p>
                    </div>
                    {bundle.descrizione && (
                        <div className="md:col-span-2 lg:col-span-3">
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Descrizione</label>
                            <p className="mt-1 text-gray-700 dark:text-gray-300">{bundle.descrizione}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Validità e Utilizzi */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Validità e Utilizzi
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Valido da</label>
                        <p className="mt-1 text-gray-900 dark:text-white">{formatDate(bundle.validoDa)}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Valido fino a</label>
                        <p className="mt-1 text-gray-900 dark:text-white">{bundle.validoA ? formatDate(bundle.validoA) : 'Illimitato'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Utilizzi</label>
                        <p className="mt-1 text-gray-900 dark:text-white">
                            {bundle.utilizziCorrente || 0}
                            {bundle.maxUtilizzi ? ` / ${bundle.maxUtilizzi}` : ' (illimitati)'}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Durata totale</label>
                        <p className="mt-1 text-gray-900 dark:text-white flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            {bundle.durataBundle || bundle.durataEstimata || '-'} min
                        </p>
                    </div>
                </div>
            </div>

            {/* Criteri Applicabilità */}
            {(bundle.etaMinima || bundle.etaMassima || bundle.genereApplicabile) && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <UserCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        Criteri di Applicabilità
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {(bundle.etaMinima || bundle.etaMassima) && (
                            <div>
                                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Fascia d'età</label>
                                <p className="mt-1 text-gray-900 dark:text-white">
                                    {bundle.etaMinima || 0} - {bundle.etaMassima || '∞'} anni
                                </p>
                            </div>
                        )}
                        {bundle.genereApplicabile && bundle.genereApplicabile !== 'NOT_SPECIFIED' && (
                            <div>
                                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Genere</label>
                                <p className="mt-1 text-gray-900 dark:text-white">
                                    {bundle.genereApplicabile === 'MALE' ? 'Maschile' :
                                        bundle.genereApplicabile === 'FEMALE' ? 'Femminile' : 'Altro'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Prezzi */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                    Prezzi e Risparmio
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Prezzo singole prestazioni</label>
                        <p className="mt-1 text-gray-400 dark:text-gray-500 line-through text-lg">
                            {formatCurrency(prezzoSingoli)}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Prezzo Bundle</label>
                        <p className="mt-1 text-2xl font-bold text-teal-600 dark:text-teal-400">
                            {formatCurrency(prezzoBundle)}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Risparmio</label>
                        <p className="mt-1 text-lg font-semibold text-green-600 dark:text-green-400">
                            {formatCurrency(risparmio)} ({percentualeRisparmio.toFixed(0)}%)
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">IVA</label>
                        <p className="mt-1 text-gray-900 dark:text-white">{bundle.ivaAliquota}%</p>
                    </div>
                </div>
            </div>

            {/* Compenso Medico Default */}
            {bundle.compensoMedicoTipo && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Stethoscope className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        Compenso Medico Default
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Tipo</label>
                            <p className="mt-1">
                                <span className={`inline-flex items-center px-2 py-1 rounded-md text-sm font-medium ${bundle.compensoMedicoTipo === 'PERCENTUALE'
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                    : bundle.compensoMedicoTipo === 'FISSO'
                                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                        : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                                    }`}>
                                    {bundle.compensoMedicoTipo === 'PERCENTUALE' ? 'Percentuale' :
                                        bundle.compensoMedicoTipo === 'FISSO' ? 'Fisso' : 'Min/Max'}
                                </span>
                            </p>
                        </div>
                        {bundle.compensoMedicoTipo !== 'MINIMO_MASSIMO' && bundle.compensoMedicoValore && (
                            <div>
                                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Valore</label>
                                <p className="mt-1 text-gray-900 dark:text-white text-lg font-semibold">
                                    {bundle.compensoMedicoTipo === 'PERCENTUALE'
                                        ? formatPercentage(bundle.compensoMedicoValore)
                                        : formatCurrency(bundle.compensoMedicoValore)}
                                </p>
                            </div>
                        )}
                        {bundle.compensoMedicoTipo === 'MINIMO_MASSIMO' && (
                            <div>
                                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Range</label>
                                <p className="mt-1 text-gray-900 dark:text-white text-lg font-semibold">
                                    {formatCurrency(bundle.compensoMedicoMinimo)} - {formatCurrency(bundle.compensoMedicoMassimo)}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Prestazioni Incluse */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    Prestazioni Incluse
                    <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400">
                        {prestazioni.length}
                    </span>
                </h3>
                {prestazioni.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 italic">Nessuna prestazione inclusa</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Prestazione</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Quantità</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Obbligatoria</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Prezzo Base</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Durata</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {prestazioni.sort((a, b) => (a.ordine || 0) - (b.ordine || 0)).map((bp) => (
                                    <tr key={bp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                                                    <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                        {bp.prestazione?.nome || 'Prestazione'}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                        {bp.prestazione?.codice}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center text-gray-900 dark:text-white">
                                            {bp.quantita}x
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {bp.obbligatoria ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                                                    <Check className="w-3 h-3" /> Sì
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                                    Opzionale
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-white">
                                            {formatCurrency(bp.prestazione?.prezzoBase)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                                            {bp.prestazione?.durataPrevista || '-'} min
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Codici Sconto Associati */}
            {bundle.codiciScontoIds && bundle.codiciScontoIds.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Ticket className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        Codici Sconto Associati
                        <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                            {bundle.codiciScontoIds.length}
                        </span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {bundle.codiciScontoIds.map((id) => (
                            <span
                                key={id}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm font-medium"
                            >
                                <Tag className="w-3.5 h-3.5" />
                                {id.substring(0, 8)}...
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// =====================================================
// MEDICI TAB COMPONENT - Listini Bundle e Prestazioni
// =====================================================

interface BundleListinoFormData {
    medicoId: string;
    prezzo: string;
    durataMedico: string;
    compensoTipo: TipoCompensoMedico;
    compensoValore: string;
    compensoMinimo: string;
    compensoMassimo: string;
}

const MediciTab: React.FC<{ bundle: OffertaBundle }> = ({ bundle }) => {
    const { getTenantFilterParams, tenantFilterKey } = useTenantFilter();
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    // State per form aggiunta listino bundle
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<BundleListinoFormData>({
        medicoId: '',
        prezzo: String(bundle.prezzoBundle || 0),
        durataMedico: String(bundle.durataBundle || 30),
        compensoTipo: (bundle.compensoMedicoTipo as TipoCompensoMedico) || 'PERCENTUALE',
        compensoValore: String(bundle.compensoMedicoValore || 50),
        compensoMinimo: bundle.compensoMedicoMinimo ? String(bundle.compensoMedicoMinimo) : '',
        compensoMassimo: bundle.compensoMedicoMassimo ? String(bundle.compensoMedicoMassimo) : ''
    });

    // Get all prestazioni in bundle
    const prestazioniBundle = useMemo(() => bundle.prestazioni || [], [bundle.prestazioni]);
    const prestazioniIds = useMemo(() => prestazioniBundle.map(p => p.prestazioneId), [prestazioniBundle]);

    // Query medici
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

    const medici = mediciResponse?.data || [];

    // Query listini per questo bundle
    const { data: listiniBundleResponse, isLoading: loadingListiniBundle } = useQuery({
        queryKey: ['listini-bundle', bundle.id, tenantFilterKey],
        queryFn: () => listiniApi.getByBundle(bundle.id),
        enabled: !!bundle.id
    });

    const listiniBundle = useMemo(() => {
        const data = listiniBundleResponse;
        return Array.isArray(data) ? data : [];
    }, [listiniBundleResponse]);

    // Query listini delle prestazioni del bundle per trovare i medici che le eseguono
    const { data: listiniPrestazioniResponse } = useQuery({
        queryKey: ['listini-prestazioni-bundle', prestazioniIds, tenantFilterKey],
        queryFn: async () => {
            if (!prestazioniIds.length) return [];
            // Carica i listini per ogni prestazione
            const results = await Promise.all(
                prestazioniIds.map(prestazioneId =>
                    listiniApi.getByPrestazione(prestazioneId).catch(() => [])
                )
            );
            return results.flat();
        },
        enabled: prestazioniIds.length > 0
    });

    // Estrai medici unici dai listini delle prestazioni (che non hanno già un listino bundle)
    const mediciSuggeriti = useMemo(() => {
        const listiniPrestazioni = listiniPrestazioniResponse || [];
        const mediciConListino = new Set(listiniBundle.map(l => l.medicoId).filter(Boolean));

        // Medici che hanno listini per le prestazioni del bundle ma non ancora per il bundle
        const mediciUnici = new Map<string, {
            medicoId: string;
            medicoNome: string;
            prestazioni: number;
            compensoTipo?: TipoCompensoMedico;
            compensoValore?: number;
        }>();

        listiniPrestazioni.forEach(listino => {
            if (listino.medicoId && !mediciConListino.has(listino.medicoId)) {
                if (!mediciUnici.has(listino.medicoId)) {
                    const medico = medici.find(m => m.id === listino.medicoId);
                    mediciUnici.set(listino.medicoId, {
                        medicoId: listino.medicoId,
                        medicoNome: medico
                            ? `${medico.nome || medico.firstName || ''} ${medico.cognome || medico.lastName || ''}`.trim()
                            : 'Medico non trovato',
                        prestazioni: 1,
                        compensoTipo: listino.compensoMedicoTipo || undefined,
                        compensoValore: listino.compensoMedicoValore ? Number(listino.compensoMedicoValore) : undefined
                    });
                } else {
                    const existing = mediciUnici.get(listino.medicoId)!;
                    mediciUnici.set(listino.medicoId, {
                        ...existing,
                        prestazioni: existing.prestazioni + 1
                    });
                }
            }
        });

        return Array.from(mediciUnici.values());
    }, [listiniPrestazioniResponse, listiniBundle, medici]);

    // State per auto-popolamento in corso
    const [isAutoPopulating, setIsAutoPopulating] = useState(false);

    // Funzione per auto-aggiungere tutti i medici suggeriti
    const handleAutoPopulateMedici = async () => {
        if (mediciSuggeriti.length === 0) return;

        setIsAutoPopulating(true);
        try {
            // Crea listini per tutti i medici suggeriti con valori di default del bundle
            await Promise.all(
                mediciSuggeriti.map(medico =>
                    listiniApi.createForBundle({
                        bundleId: bundle.id,
                        medicoId: medico.medicoId,
                        prezzo: Number(bundle.prezzoBundle) || 0,
                        durataMedico: bundle.durataBundle || 30,
                        compensoMedicoTipo: medico.compensoTipo || bundle.compensoMedicoTipo as TipoCompensoMedico || 'PERCENTUALE',
                        compensoMedicoValore: medico.compensoValore || Number(bundle.compensoMedicoValore) || 50,
                        compensoMedicoMinimo: bundle.compensoMedicoMinimo ? Number(bundle.compensoMedicoMinimo) : undefined,
                        compensoMedicoMassimo: bundle.compensoMedicoMassimo ? Number(bundle.compensoMedicoMassimo) : undefined,
                        attivo: true
                    }).catch(err => {
                        console.warn(`Errore aggiungendo medico ${medico.medicoId}:`, err);
                        return null;
                    })
                )
            );

            queryClient.invalidateQueries({ queryKey: ['listini-bundle', bundle.id, tenantFilterKey] });
            showToast({
                type: 'success',
                message: `${mediciSuggeriti.length} medici aggiunti con valori di default`
            });
        } catch (error) {
            showToast({ type: 'error', message: 'Errore durante l\'auto-popolamento' });
        } finally {
            setIsAutoPopulating(false);
        }
    };

    // Create listino bundle mutation
    const createListinoMutation = useMutation({
        mutationFn: (data: Partial<ListinoPrezzo> & { bundleId: string }) =>
            listiniApi.createForBundle(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['listini-bundle', bundle.id, tenantFilterKey] });
            showToast({ type: 'success', message: 'Listino medico per bundle aggiunto' });
            setIsAddingNew(false);
            resetForm();
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: error.message });
        }
    });

    // Update listino mutation
    const updateListinoMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<ListinoPrezzo> }) =>
            listiniApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['listini-bundle', bundle.id, tenantFilterKey] });
            showToast({ type: 'success', message: 'Listino aggiornato' });
            setEditingId(null);
            resetForm();
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: error.message });
        }
    });

    // Delete listino mutation
    const deleteListinoMutation = useMutation({
        mutationFn: (id: string) => listiniApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['listini-bundle', bundle.id, tenantFilterKey] });
            showToast({ type: 'success', message: 'Listino rimosso' });
        }
    });

    const resetForm = () => {
        setFormData({
            medicoId: '',
            prezzo: String(bundle.prezzoBundle || 0),
            durataMedico: String(bundle.durataBundle || 30),
            compensoTipo: (bundle.compensoMedicoTipo as TipoCompensoMedico) || 'PERCENTUALE',
            compensoValore: String(bundle.compensoMedicoValore || 50),
            compensoMinimo: bundle.compensoMedicoMinimo ? String(bundle.compensoMedicoMinimo) : '',
            compensoMassimo: bundle.compensoMedicoMassimo ? String(bundle.compensoMedicoMassimo) : ''
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.medicoId) {
            showToast({ type: 'error', message: 'Seleziona un medico' });
            return;
        }

        const listino = {
            bundleId: bundle.id,
            medicoId: formData.medicoId,
            prezzo: parseFloat(formData.prezzo) || Number(bundle.prezzoBundle) || 0,
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
            durataMedico: listino.durataMedico ? String(listino.durataMedico) : String(bundle.durataBundle || 30),
            compensoTipo: listino.compensoMedicoTipo || 'PERCENTUALE',
            compensoValore: String(listino.compensoMedicoValore || 50),
            compensoMinimo: listino.compensoMedicoMinimo ? String(listino.compensoMedicoMinimo) : '',
            compensoMassimo: listino.compensoMedicoMassimo ? String(listino.compensoMedicoMassimo) : ''
        });
        setEditingId(listino.id);
        setIsAddingNew(false);
    };

    const handleDelete = (id: string) => {
        if (confirm('Sei sicuro di voler eliminare questo listino?')) {
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

    // Medici già configurati con listino bundle
    const mediciConListino = listiniBundle.map(l => l.medicoId).filter(Boolean);

    // Medici disponibili per aggiunta (non ancora configurati)
    const mediciDisponibili = medici.filter(m => !mediciConListino.includes(m.id));

    if (loadingListiniBundle) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600 dark:text-teal-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* === SEZIONE 1: LISTINI BUNDLE (NUOVO) === */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                {/* Header con bottone Aggiungi */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-teal-50 to-blue-50 dark:from-teal-900/20 dark:to-blue-900/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                <Package className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                                Listini Medici per Bundle
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Configura prezzi, durata e compensi specifici per medico sul bundle intero
                            </p>
                        </div>
                        {!isAddingNew && !editingId && (
                            <div className="flex items-center gap-2">
                                {/* Bottone Auto-Popolamento */}
                                {mediciSuggeriti.length > 0 && (
                                    <button
                                        onClick={handleAutoPopulateMedici}
                                        disabled={isAutoPopulating}
                                        className="clinica-button-secondary flex items-center gap-2 bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                                        title={`Aggiungi ${mediciSuggeriti.length} medici che eseguono le prestazioni del bundle`}
                                    >
                                        {isAutoPopulating ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Users className="w-4 h-4" />
                                        )}
                                        Auto-aggiungi ({mediciSuggeriti.length})
                                    </button>
                                )}
                                <button
                                    onClick={() => { setIsAddingNew(true); resetForm(); }}
                                    className="clinica-button-primary flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Aggiungi Medico
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Banner Medici Suggeriti */}
                {mediciSuggeriti.length > 0 && !isAddingNew && !editingId && listiniBundle.length === 0 && (
                    <div className="px-6 py-3 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-100 dark:border-purple-900/30">
                        <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                                    {mediciSuggeriti.length} medici eseguono le prestazioni di questo bundle
                                </p>
                                <p className="text-xs text-purple-600 dark:text-purple-400">
                                    Clicca "Auto-aggiungi" per inserirli con i valori di default del bundle
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Form Aggiungi/Modifica */}
                {(isAddingNew || editingId) && (
                    <form onSubmit={handleSubmit} className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Medico */}
                            <div>
                                <label className="label-clinica dark:text-gray-300">Medico *</label>
                                <select
                                    value={formData.medicoId}
                                    onChange={(e) => setFormData(prev => ({ ...prev, medicoId: e.target.value }))}
                                    className="select-clinica dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                    disabled={!!editingId}
                                >
                                    <option value="">Seleziona medico...</option>
                                    {(editingId ? medici : mediciDisponibili).map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.nome || m.firstName} {m.cognome || m.lastName}
                                            {m.specializzazione && ` - ${m.specializzazione}`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Prezzo Bundle per questo medico */}
                            <div>
                                <label className="label-clinica dark:text-gray-300">
                                    Prezzo Bundle (€)
                                    <span className="text-xs text-gray-400 ml-1">
                                        (default: {formatCurrency(bundle.prezzoBundle)})
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.prezzo}
                                    onChange={(e) => setFormData(prev => ({ ...prev, prezzo: e.target.value }))}
                                    className="input-clinica dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                />
                            </div>

                            {/* Durata per questo medico */}
                            <div>
                                <label className="label-clinica dark:text-gray-300">
                                    Durata (minuti)
                                    <span className="text-xs text-gray-400 ml-1">
                                        (default: {bundle.durataBundle || 30} min)
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    step="5"
                                    min="5"
                                    value={formData.durataMedico}
                                    onChange={(e) => setFormData(prev => ({ ...prev, durataMedico: e.target.value }))}
                                    className="input-clinica dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                />
                            </div>

                            {/* Tipo Compenso */}
                            <div>
                                <label className="label-clinica dark:text-gray-300">Tipo Compenso</label>
                                <div className="flex gap-2 mt-1">
                                    {TIPO_COMPENSO_OPTIONS.map(option => {
                                        const Icon = option.icon;
                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, compensoTipo: option.value }))}
                                                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg border-2 transition-all ${formData.compensoTipo === option.value
                                                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400'
                                                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                                                    }`}
                                            >
                                                <Icon className="w-4 h-4" />
                                                {option.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Valore Compenso - condizionale */}
                            {formData.compensoTipo === 'PERCENTUALE' && (
                                <div>
                                    <label className="label-clinica dark:text-gray-300">Compenso (%)</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        max="100"
                                        value={formData.compensoValore}
                                        onChange={(e) => setFormData(prev => ({ ...prev, compensoValore: e.target.value }))}
                                        className="input-clinica dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                        placeholder="es. 50"
                                    />
                                </div>
                            )}

                            {formData.compensoTipo === 'FISSO' && (
                                <div>
                                    <label className="label-clinica dark:text-gray-300">Compenso Fisso (€)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.compensoValore}
                                        onChange={(e) => setFormData(prev => ({ ...prev, compensoValore: e.target.value }))}
                                        className="input-clinica dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                        placeholder="es. 80"
                                    />
                                </div>
                            )}

                            {formData.compensoTipo === 'MINIMO_MASSIMO' && (
                                <>
                                    <div>
                                        <label className="label-clinica dark:text-gray-300">Compenso Minimo (€)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.compensoMinimo}
                                            onChange={(e) => setFormData(prev => ({ ...prev, compensoMinimo: e.target.value }))}
                                            className="input-clinica dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                            placeholder="es. 50"
                                        />
                                    </div>
                                    <div>
                                        <label className="label-clinica dark:text-gray-300">Compenso Massimo (€)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.compensoMassimo}
                                            onChange={(e) => setFormData(prev => ({ ...prev, compensoMassimo: e.target.value }))}
                                            className="input-clinica dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                            placeholder="es. 100"
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Azioni form */}
                        <div className="flex justify-end gap-3 mt-4">
                            <button
                                type="button"
                                onClick={() => { setIsAddingNew(false); setEditingId(null); resetForm(); }}
                                className="clinica-button-secondary"
                            >
                                <X className="w-4 h-4" />
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
                                {editingId ? 'Salva Modifiche' : 'Aggiungi'}
                            </button>
                        </div>
                    </form>
                )}

                {/* Tabella Listini Bundle */}
                {listiniBundle.length === 0 ? (
                    <div className="p-8 text-center">
                        <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            Nessun listino medico configurato
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Aggiungi listini specifici per medico per questo bundle.<br />
                            I medici senza listino useranno i valori default del bundle.
                        </p>
                        {!isAddingNew && (
                            <button
                                onClick={() => { setIsAddingNew(true); resetForm(); }}
                                className="clinica-button-secondary"
                            >
                                <Plus className="w-4 h-4" />
                                Aggiungi primo medico
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        Medico
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        Prezzo
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        Durata
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        Compenso
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        Azioni
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {listiniBundle.map((listino) => (
                                    <tr key={listino.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                                                    <Stethoscope className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                        {listino.medico
                                                            ? `${listino.medico.firstName} ${listino.medico.lastName}`
                                                            : getMedicoName(listino.medicoId || '')}
                                                    </span>
                                                    {listino.medico?.specialties?.[0] && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {listino.medico.specialties[0]}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center font-mono text-gray-900 dark:text-white">
                                            {formatCurrency(listino.prezzo)}
                                        </td>
                                        <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-400">
                                            {listino.durataMedico || bundle.durataBundle || 30} min
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                                {renderCompenso(listino)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(listino)}
                                                    className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded"
                                                    title="Modifica"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(listino.id)}
                                                    disabled={deleteListinoMutation.isPending}
                                                    className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                                    title="Elimina"
                                                >
                                                    {deleteListinoMutation.isPending ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* === SEZIONE 2: INFO LISTINI PER PRESTAZIONI (Mantenuto) === */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    Listini per Prestazione (opzionale)
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Se necessario, puoi configurare listini specifici per le singole prestazioni del bundle.
                    I listini bundle hanno priorità su quelli per prestazione.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {prestazioniBundle.map((bp) => (
                        <Link
                            key={bp.id}
                            to={`/poliambulatorio/catalogo/prestazioni/${bp.prestazioneId}`}
                            className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
                        >
                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {bp.prestazione?.nome || 'Prestazione'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatCurrency(bp.prestazione?.prezzoBase)} • {bp.prestazione?.durataPrevista || '-'} min
                                </p>
                            </div>
                            <ArrowLeft className="w-4 h-4 text-gray-400 dark:text-gray-500 rotate-180" />
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

// =====================================================
// CONVENZIONI TAB COMPONENT
// =====================================================

const ConvenzioniTab: React.FC<{ bundle: OffertaBundle }> = ({ bundle }) => {
    const { getTenantFilterParams, tenantFilterKey } = useTenantFilter();

    // Query convenzioni associate
    const { data: convenzioniResponse, isLoading } = useQuery({
        queryKey: ['convenzioni', tenantFilterKey],
        queryFn: () => {
            const params = getTenantFilterParams();
            return convenzioniApi.getAll({
                limit: 500,
                ...(params.tenantIds && { tenantIds: params.tenantIds.join(',') })
            });
        }
    });

    const convenzioni = convenzioniResponse?.data || [];
    const convenzioniAssociate = convenzioni.filter((c: Convenzione) =>
        bundle.convenzioniIds?.includes(c.id)
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600 dark:text-teal-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Convenzioni Associate</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Questo bundle è applicabile alle seguenti convenzioni
                    </p>
                </div>
            </div>

            {/* Lista Convenzioni */}
            {convenzioniAssociate.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Nessuna convenzione associata
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                        Questo bundle è disponibile per tutti i pazienti senza restrizioni di convenzione.
                    </p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    Convenzione
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    Stato
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    Validità
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    Azioni
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {convenzioniAssociate.map((conv: Convenzione) => (
                                <tr key={conv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                                <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {conv.nome}
                                                </span>
                                                {conv.codice && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                        {conv.codice}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${conv.attiva
                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                            }`}>
                                            {conv.attiva ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                            {conv.attiva ? 'Attiva' : 'Non attiva'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                        {formatDate(conv.dataInizio)} - {conv.dataFine ? formatDate(conv.dataFine) : 'Illimitata'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end">
                                            <Link
                                                to={`/poliambulatorio/catalogo/convenzioni/${conv.id}`}
                                                className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300"
                                            >
                                                Vedi dettagli →
                                            </Link>
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
// MAIN COMPONENT
// =====================================================

const OffertaBundleDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { tenantFilterKey } = useTenantFilter();

    const [activeTab, setActiveTab] = useState<TabType>('info');

    // Query bundle
    const { data: bundle, isLoading, error } = useQuery({
        queryKey: ['bundle-detail', id, tenantFilterKey],
        queryFn: () => bundleApi.getById(id!),
        enabled: !!id
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: () => bundleApi.delete(id!),
        onSuccess: () => {
            showToast({ type: 'success', message: 'Bundle eliminato con successo' });
            queryClient.invalidateQueries({ queryKey: ['bundles'] });
            navigate('/poliambulatorio/catalogo/bundles');
        },
        onError: (err: Error) => {
            showToast({ type: 'error', message: err.message });
        }
    });

    const handleDelete = () => {
        if (confirm('Sei sicuro di voler eliminare questo bundle?')) {
            deleteMutation.mutate();
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600 dark:text-teal-400" />
            </div>
        );
    }

    if (error || !bundle) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <AlertCircle className="w-12 h-12 text-red-500 dark:text-red-400 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Bundle non trovato
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Il bundle richiesto non esiste o non è accessibile.
                </p>
                <Link
                    to="/poliambulatorio/catalogo/bundles"
                    className="clinica-button-primary"
                >
                    Torna alla lista
                </Link>
            </div>
        );
    }

    const prestazioniCount = bundle.prestazioni?.length || 0;
    const convenzioniCount = bundle.convenzioniIds?.length || 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/poliambulatorio/catalogo/bundles')}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {bundle.nome}
                            </h1>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${bundle.attivo
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                }`}>
                                {bundle.attivo ? 'Attivo' : 'Non attivo'}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-mono mt-1">
                            {bundle.codice}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        to={`/poliambulatorio/catalogo/bundles/${id}/modifica`}
                        className="clinica-button-secondary flex items-center gap-2"
                    >
                        <Edit className="w-4 h-4" />
                        Modifica
                    </Link>
                    <button
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                        {deleteMutation.isPending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Trash2 className="w-5 h-5" />
                        )}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <div className="flex gap-1 -mb-px">
                    <TabButton
                        active={activeTab === 'info'}
                        onClick={() => setActiveTab('info')}
                        icon={<FileText className="w-4 h-4" />}
                        label="Informazioni"
                        color="teal"
                    />
                    <TabButton
                        active={activeTab === 'medici'}
                        onClick={() => setActiveTab('medici')}
                        icon={<Stethoscope className="w-4 h-4" />}
                        label="Listini Medici"
                        count={prestazioniCount}
                        color="blue"
                    />
                    <TabButton
                        active={activeTab === 'convenzioni'}
                        onClick={() => setActiveTab('convenzioni')}
                        icon={<Building2 className="w-4 h-4" />}
                        label="Convenzioni"
                        count={convenzioniCount}
                        color="purple"
                    />
                </div>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {activeTab === 'info' && <InfoTab bundle={bundle} />}
                {activeTab === 'medici' && <MediciTab bundle={bundle} />}
                {activeTab === 'convenzioni' && <ConvenzioniTab bundle={bundle} />}
            </div>
        </div>
    );
};

export default OffertaBundleDetailPage;
