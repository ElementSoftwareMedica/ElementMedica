/**
 * NomineRuoloPage - Gestione Nomine Figure Sicurezza
 * 
 * Pagina per la gestione delle nomine MC, RSPP, ASPP, RLS
 * secondo D.Lgs 81/08.
 * 
 * @module pages/clinica/mdl/NomineRuoloPage
 * @project P56 - Medicina del Lavoro Sistema Completo - FASE 3
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    UserCheck,
    Plus,
    Search,
    Building2,
    Users,
    Filter,
    Edit2,
    Trash2,
    Loader2,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Clock,
    AlertTriangle,
    Calendar,
    GraduationCap,
    Pause,
    Play,
    Square,
    RefreshCw
} from 'lucide-react';
import { clinicaApi, type NominaRuolo, type TipoNominaRuolo, type StatoNomina } from '../../../services/clinicaApi';
import { apiGet } from '../../../services/api';
import { useToast } from '../../../hooks/useToast';
import Modal from '../../../design-system/molecules/Modal/Modal';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { useViewMode } from '../../../hooks/useViewMode';
import { ViewModeToggle } from '../../../components/clinica/ViewModeToggle';
import { ActionMenu, createCrudActions } from '@/components/ui/ActionMenu';
import { CRUDButton, CRUDPrimaryButton } from '../../../components/shared/CRUDButton';
import NominaFormModal from './components/NominaFormModal';

// Import Element Medica theme
import '../../../styles/clinica-theme.css';

// Role type labels and colors
const RUOLO_CONFIG: Record<TipoNominaRuolo, { label: string; bg: string; text: string }> = {
    MEDICO_COMPETENTE: { label: 'Medico Competente', bg: 'bg-teal-100', text: 'text-teal-700' },
    MEDICO_COMPETENTE_COORDINATO: { label: 'Medico Competente Coordinato', bg: 'bg-cyan-100', text: 'text-cyan-700' },
    RSPP: { label: 'RSPP', bg: 'bg-blue-100', text: 'text-blue-700' },
    ASPP: { label: 'ASPP', bg: 'bg-indigo-100', text: 'text-indigo-700' },
    RLS: { label: 'RLS', bg: 'bg-purple-100', text: 'text-purple-700' },
    PREPOSTO: { label: 'Preposto', bg: 'bg-amber-100', text: 'text-amber-700' },
    ADDETTO_PS: { label: 'Add. Primo Soccorso', bg: 'bg-red-100', text: 'text-red-700' },
    ADDETTO_AI: { label: 'Add. Antincendio', bg: 'bg-orange-100', text: 'text-orange-700' },
    DIRIGENTE_SICUREZZA: { label: 'Dirigente Sicurezza', bg: 'bg-gray-100', text: 'text-gray-700' }
};

// Status config
const STATO_CONFIG: Record<StatoNomina, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
    ATTIVA: { label: 'Attiva', bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle2 className="h-3 w-3" /> },
    SOSPESA: { label: 'Sospesa', bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <Pause className="h-3 w-3" /> },
    REVOCATA: { label: 'Revocata', bg: 'bg-gray-100', text: 'text-gray-700', icon: <Square className="h-3 w-3" /> },
    SCADUTA: { label: 'Scaduta', bg: 'bg-red-100', text: 'text-red-700', icon: <AlertTriangle className="h-3 w-3" /> }
};

const NomineRuoloPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();

    // Read companyTenantProfileId from URL params
    const companyIdFromUrl = searchParams.get('companyId');

    // Tenant filter from global context
    const { getTenantFilterParams, isReady, tenantFilterKey } = useTenantFilter();

    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSiteId, setFilterSiteId] = useState<string>('');
    const [filterCompanyId, setFilterCompanyId] = useState<string>(companyIdFromUrl || '');
    const [filterRuolo, setFilterRuolo] = useState<TipoNominaRuolo | ''>('');
    const [filterStato, setFilterStato] = useState<StatoNomina | ''>('');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [nominaToDelete, setNominaToDelete] = useState<NominaRuolo | null>(null);
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [editingNomina, setEditingNomina] = useState<NominaRuolo | null>(null);
    const [ceaseModalOpen, setCeaseModalOpen] = useState(false);
    const [nominaToCease, setNominaToCease] = useState<NominaRuolo | null>(null);
    const [suspendModalOpen, setSuspendModalOpen] = useState(false);
    const [nominaToSuspend, setNominaToSuspend] = useState<NominaRuolo | null>(null);
    const [suspendMotivo, setSuspendMotivo] = useState('');

    // View mode with localStorage persistence
    const { viewMode, setViewMode } = useViewMode({ storageKey: 'nomine-ruolo-mdl' });

    // Query params with tenant filter
    const queryParams = useMemo(() => {
        const tenantParams = getTenantFilterParams();
        return {
            search: searchTerm || undefined,
            siteId: filterSiteId || undefined,
            companyTenantProfileId: filterCompanyId || undefined,
            tipoRuolo: filterRuolo || undefined,
            stato: filterStato || undefined,
            ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
            ...(tenantParams.allTenants && { allTenants: 'true' })
        };
    }, [searchTerm, filterSiteId, filterCompanyId, filterRuolo, filterStato, getTenantFilterParams, tenantFilterKey]);

    // Fetch nomine
    const { data: nomineResponse, isLoading, error } = useQuery({
        queryKey: ['nomine-ruolo', queryParams, tenantFilterKey],
        queryFn: () => clinicaApi.nomineRuolo.getAll(queryParams),
        enabled: isReady
    });

    // Fetch stats
    const { data: stats } = useQuery({
        queryKey: ['nomine-ruolo-stats', tenantFilterKey],
        queryFn: () => clinicaApi.nomineRuolo.getStats(),
        enabled: isReady
    });

    // Fetch expiring
    const { data: expiring } = useQuery({
        queryKey: ['nomine-ruolo-expiring', tenantFilterKey],
        queryFn: () => clinicaApi.nomineRuolo.getExpiring(30),
        enabled: isReady
    });

    // Fetch companies (includes CompanySite for filter dropdown)
    const { data: companiesForFilter } = useQuery({
        queryKey: ['companies-filter'],
        queryFn: async () => {
            const response = await apiGet<{ data: Array<{ id: string; company: { ragioneSociale: string }; sites: Array<{ id: string; siteName: string; citta?: string }> }> }>('/api/v1/companies');
            return response.data || [];
        },
        enabled: isReady
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => clinicaApi.nomineRuolo.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['nomine-ruolo'] });
            showToast({ type: 'success', message: 'Nomina eliminata con successo' });
            setDeleteModalOpen(false);
            setNominaToDelete(null);
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante l\'eliminazione' });
        }
    });

    // Cease mutation
    const ceaseMutation = useMutation({
        mutationFn: (id: string) => clinicaApi.nomineRuolo.cease(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['nomine-ruolo'] });
            showToast({ type: 'success', message: 'Nomina cessata con successo' });
            setCeaseModalOpen(false);
            setNominaToCease(null);
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante la cessazione' });
        }
    });

    // Suspend mutation
    const suspendMutation = useMutation({
        mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
            clinicaApi.nomineRuolo.suspend(id, motivo),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['nomine-ruolo'] });
            showToast({ type: 'success', message: 'Nomina sospesa con successo' });
            setSuspendModalOpen(false);
            setNominaToSuspend(null);
            setSuspendMotivo('');
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante la sospensione' });
        }
    });

    // Reactivate mutation
    const reactivateMutation = useMutation({
        mutationFn: (id: string) => clinicaApi.nomineRuolo.reactivate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['nomine-ruolo'] });
            showToast({ type: 'success', message: 'Nomina riattivata con successo' });
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante la riattivazione' });
        }
    });

    // Extract data
    const nomine = nomineResponse?.data || [];
    const pagination = nomineResponse?.pagination;
    const sedi = (companiesForFilter || []).flatMap(c => (c.sites || []).map(s => ({ id: s.id, siteName: s.siteName, citta: s.citta })));
    const expiringNomine = expiring || [];

    // Format date helper
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('it-IT');
    };

    // Handlers
    const handleDelete = useCallback(() => {
        if (nominaToDelete) {
            deleteMutation.mutate(nominaToDelete.id);
        }
    }, [nominaToDelete, deleteMutation]);

    const handleEdit = useCallback((nomina: NominaRuolo) => {
        setEditingNomina(nomina);
        setFormModalOpen(true);
    }, []);

    const handleCreate = useCallback(() => {
        setEditingNomina(null);
        setFormModalOpen(true);
    }, []);

    const handleCease = useCallback(() => {
        if (nominaToCease) {
            ceaseMutation.mutate(nominaToCease.id);
        }
    }, [nominaToCease, ceaseMutation]);

    const handleSuspend = useCallback(() => {
        if (nominaToSuspend && suspendMotivo.trim()) {
            suspendMutation.mutate({ id: nominaToSuspend.id, motivo: suspendMotivo });
        }
    }, [nominaToSuspend, suspendMotivo, suspendMutation]);

    const handleReactivate = useCallback((nomina: NominaRuolo) => {
        reactivateMutation.mutate(nomina.id);
    }, [reactivateMutation]);

    const handleFormSuccess = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['nomine-ruolo'] });
        setFormModalOpen(false);
        setEditingNomina(null);
    }, [queryClient]);

    // Loading state
    if (isLoading && !nomineResponse) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-teal-600 mx-auto mb-4" />
                    <p className="text-gray-600">Caricamento nomine...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-gray-800 font-medium">Errore nel caricamento</p>
                    <p className="text-gray-600 text-sm mt-2">Si è verificato un errore nel caricamento delle nomine. Riprova in seguito.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-100 rounded-lg">
                            <UserCheck className="h-6 w-6 text-teal-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900">Nomine Figure Sicurezza</h1>
                            <p className="text-sm text-gray-500">
                                Gestione MC, RSPP, ASPP, RLS (D.Lgs 81/08)
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
                        <CRUDPrimaryButton onClick={handleCreate} className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Nuova Nomina
                        </CRUDPrimaryButton>
                    </div>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-teal-50 rounded-lg p-3">
                            <div className="text-2xl font-bold text-teal-600">{stats.totaleAttive}</div>
                            <div className="text-sm text-teal-700">Nomine Attive</div>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-3">
                            <div className="text-2xl font-bold text-amber-600">{stats.inScadenza30gg}</div>
                            <div className="text-sm text-amber-700">In Scadenza (30gg)</div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-3">
                            <div className="text-2xl font-bold text-red-600">{stats.formazioneScadenza30gg}</div>
                            <div className="text-sm text-red-700">Formazione da Rinnovare</div>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3">
                            <div className="text-2xl font-bold text-blue-600">{stats.alertTotali}</div>
                            <div className="text-sm text-blue-700">Alert Totali</div>
                        </div>
                    </div>
                )}

                {/* Expiring Alert */}
                {expiringNomine.length > 0 && (
                    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-medium text-amber-800">Nomine in scadenza</h3>
                                <p className="text-sm text-amber-700 mt-1">
                                    {expiringNomine.length} nomine in scadenza nei prossimi 30 giorni
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="mt-4 flex flex-wrap items-center gap-4">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[250px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cerca per nome persona..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>

                    {/* Site filter */}
                    <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <select
                            value={filterSiteId}
                            onChange={(e) => setFilterSiteId(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        >
                            <option value="">Tutte le sedi</option>
                            {sedi.map((sede) => (
                                <option key={sede.id} value={sede.id}>{sede.siteName}{sede.citta ? ` (${sede.citta})` : ''}</option>
                            ))}
                        </select>
                    </div>

                    {/* Role filter */}
                    <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-gray-400" />
                        <select
                            value={filterRuolo}
                            onChange={(e) => setFilterRuolo(e.target.value as TipoNominaRuolo | '')}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        >
                            <option value="">Tutti i ruoli</option>
                            {Object.entries(RUOLO_CONFIG).map(([key, config]) => (
                                <option key={key} value={key}>{config.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status filter */}
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-gray-400" />
                        <select
                            value={filterStato}
                            onChange={(e) => setFilterStato(e.target.value as StatoNomina | '')}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        >
                            <option value="">Tutti gli stati</option>
                            {Object.entries(STATO_CONFIG).map(([key, config]) => (
                                <option key={key} value={key}>{config.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                {nomine.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                        <UserCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Nessuna nomina trovata
                        </h3>
                        <p className="text-gray-500 mb-6">
                            Non ci sono nomine che corrispondono ai criteri di ricerca.
                        </p>
                        <CRUDPrimaryButton onClick={handleCreate} className="inline-flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Crea la prima nomina
                        </CRUDPrimaryButton>
                    </div>
                ) : viewMode === 'grid' ? (
                    /* Card View */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {nomine.map((nomina) => {
                            const ruoloConfig = RUOLO_CONFIG[nomina.tipoRuolo] ?? { label: nomina.tipoRuolo, bg: 'bg-gray-100', text: 'text-gray-700' };
                            const statoConfig = STATO_CONFIG[nomina.stato] ?? { label: nomina.stato, bg: 'bg-gray-100', text: 'text-gray-700', icon: null };
                            return (
                                <div
                                    key={nomina.id}
                                    className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-shadow cursor-pointer"
                                    onClick={() => handleEdit(nomina)}
                                >
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${ruoloConfig.bg}`}>
                                                <UserCheck className={`h-5 w-5 ${ruoloConfig.text}`} />
                                            </div>
                                            <div>
                                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ruoloConfig.bg} ${ruoloConfig.text}`}>
                                                    {ruoloConfig.label}
                                                </span>
                                                <h3 className="font-semibold text-gray-900 mt-1">
                                                    {nomina.person?.lastName} {nomina.person?.firstName}
                                                </h3>
                                            </div>
                                        </div>
                                        <ActionMenu
                                            actions={[
                                                ...createCrudActions({
                                                    onEdit: () => handleEdit(nomina),
                                                    onDelete: () => {
                                                        setNominaToDelete(nomina);
                                                        setDeleteModalOpen(true);
                                                    }
                                                }),
                                                ...(nomina.stato === 'ATTIVA' ? [
                                                    {
                                                        label: 'Sospendi',
                                                        icon: Pause,
                                                        onClick: () => {
                                                            setNominaToSuspend(nomina);
                                                            setSuspendModalOpen(true);
                                                        }
                                                    },
                                                    {
                                                        label: 'Cessa',
                                                        icon: Square,
                                                        onClick: () => {
                                                            setNominaToCease(nomina);
                                                            setCeaseModalOpen(true);
                                                        }
                                                    }
                                                ] : []),
                                                ...(nomina.stato === 'SOSPESA' ? [
                                                    {
                                                        label: 'Riattiva',
                                                        icon: Play,
                                                        onClick: () => handleReactivate(nomina)
                                                    }
                                                ] : [])
                                            ]}
                                        />
                                    </div>

                                    {/* Info */}
                                    <div className="space-y-2 text-sm">
                                        {nomina.site && (
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Building2 className="h-4 w-4 text-gray-400" />
                                                <span>{nomina.site.siteName}</span>
                                            </div>
                                        )}
                                        {nomina.companyTenantProfile?.company && (
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Building2 className="h-4 w-4 text-gray-400" />
                                                <span>{nomina.companyTenantProfile.company.ragioneSociale}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Calendar className="h-4 w-4 text-gray-400" />
                                            <span>Dal {formatDate(nomina.dataInizio)}</span>
                                        </div>
                                        {nomina.dataScadenza && (
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Clock className="h-4 w-4 text-gray-400" />
                                                <span>Scadenza: {formatDate(nomina.dataScadenza)}</span>
                                            </div>
                                        )}
                                        {nomina.dataProssimaFormazione && (
                                            <div className="flex items-center gap-2 text-amber-600">
                                                <GraduationCap className="h-4 w-4" />
                                                <span>Formazione: {formatDate(nomina.dataProssimaFormazione)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${statoConfig.bg} ${statoConfig.text}`}>
                                            {statoConfig.icon} {statoConfig.label}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* Table View */
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ruolo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Persona
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Sede / Azienda
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Data Inizio
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Scadenza
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Stato
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Azioni
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {nomine.map((nomina) => {
                                    const ruoloConfig = RUOLO_CONFIG[nomina.tipoRuolo] ?? { label: nomina.tipoRuolo, bg: 'bg-gray-100', text: 'text-gray-700' };
                                    const statoConfig = STATO_CONFIG[nomina.stato] ?? { label: nomina.stato, bg: 'bg-gray-100', text: 'text-gray-700', icon: null };
                                    return (
                                        <tr
                                            key={nomina.id}
                                            className="hover:bg-gray-50 cursor-pointer"
                                            onClick={() => handleEdit(nomina)}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${ruoloConfig.bg} ${ruoloConfig.text}`}>
                                                    {ruoloConfig.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {nomina.person?.lastName} {nomina.person?.firstName}
                                                </span>
                                                {nomina.person?.taxCode && (
                                                    <div className="text-xs text-gray-500">{nomina.person.taxCode}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm">
                                                    {nomina.site && (
                                                        <div className="text-gray-700">{nomina.site.siteName}</div>
                                                    )}
                                                    {nomina.companyTenantProfile?.company && (
                                                        <div className="text-gray-500 text-xs">
                                                            {nomina.companyTenantProfile.company.ragioneSociale}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-gray-600">
                                                    {formatDate(nomina.dataInizio)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-gray-600">
                                                    {formatDate(nomina.dataScadenza)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${statoConfig.bg} ${statoConfig.text}`}>
                                                    {statoConfig.icon} {statoConfig.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                                                <ActionMenu
                                                    actions={[
                                                        ...createCrudActions({
                                                            onEdit: () => handleEdit(nomina),
                                                            onDelete: () => {
                                                                setNominaToDelete(nomina);
                                                                setDeleteModalOpen(true);
                                                            }
                                                        }),
                                                        ...(nomina.stato === 'ATTIVA' ? [
                                                            {
                                                                label: 'Sospendi',
                                                                icon: Pause,
                                                                onClick: () => {
                                                                    setNominaToSuspend(nomina);
                                                                    setSuspendModalOpen(true);
                                                                }
                                                            },
                                                            {
                                                                label: 'Cessa',
                                                                icon: Square,
                                                                onClick: () => {
                                                                    setNominaToCease(nomina);
                                                                    setCeaseModalOpen(true);
                                                                }
                                                            }
                                                        ] : []),
                                                        ...(nomina.stato === 'SOSPESA' ? [
                                                            {
                                                                label: 'Riattiva',
                                                                icon: Play,
                                                                onClick: () => handleReactivate(nomina)
                                                            }
                                                        ] : [])
                                                    ]}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between bg-white rounded-xl border border-gray-200 px-6 py-4">
                        <span className="text-sm text-gray-600">
                            {pagination.total} nomine totali
                        </span>
                        <span className="text-sm text-gray-600">
                            Pagina {pagination.page} di {pagination.totalPages}
                        </span>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setNominaToDelete(null);
                }}
                title="Conferma eliminazione"
            >
                <div className="p-6">
                    <p className="text-gray-600 mb-6">
                        Sei sicuro di voler eliminare questa nomina?
                        Questa azione non può essere annullata.
                    </p>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => {
                                setDeleteModalOpen(false);
                                setNominaToDelete(null);
                            }}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Annulla
                        </button>
                        <CRUDButton
                            onClick={handleDelete}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Eliminazione...
                                </>
                            ) : (
                                'Elimina'
                            )}
                        </CRUDButton>
                    </div>
                </div>
            </Modal>

            {/* Cease Confirmation Modal */}
            <Modal
                isOpen={ceaseModalOpen}
                onClose={() => {
                    setCeaseModalOpen(false);
                    setNominaToCease(null);
                }}
                title="Cessazione nomina"
            >
                <div className="p-6">
                    <p className="text-gray-600 mb-6">
                        Sei sicuro di voler cessare questa nomina?
                        La nomina verrà marcata come terminata alla data odierna.
                    </p>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => {
                                setCeaseModalOpen(false);
                                setNominaToCease(null);
                            }}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Annulla
                        </button>
                        <CRUDButton
                            onClick={handleCease}
                            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                            disabled={ceaseMutation.isPending}
                        >
                            {ceaseMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Cessazione...
                                </>
                            ) : (
                                'Cessa Nomina'
                            )}
                        </CRUDButton>
                    </div>
                </div>
            </Modal>

            {/* Suspend Modal */}
            <Modal
                isOpen={suspendModalOpen}
                onClose={() => {
                    setSuspendModalOpen(false);
                    setNominaToSuspend(null);
                    setSuspendMotivo('');
                }}
                title="Sospensione nomina"
            >
                <div className="p-6">
                    <p className="text-gray-600 mb-4">
                        Inserisci il motivo della sospensione:
                    </p>
                    <textarea
                        value={suspendMotivo}
                        onChange={(e) => setSuspendMotivo(e.target.value)}
                        placeholder="Motivo sospensione..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-6 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        rows={3}
                    />
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => {
                                setSuspendModalOpen(false);
                                setNominaToSuspend(null);
                                setSuspendMotivo('');
                            }}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Annulla
                        </button>
                        <CRUDButton
                            onClick={handleSuspend}
                            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                            disabled={suspendMutation.isPending || !suspendMotivo.trim()}
                        >
                            {suspendMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Sospensione...
                                </>
                            ) : (
                                'Sospendi'
                            )}
                        </CRUDButton>
                    </div>
                </div>
            </Modal>

            {/* Form Modal */}
            <NominaFormModal
                isOpen={formModalOpen}
                onClose={() => {
                    setFormModalOpen(false);
                    setEditingNomina(null);
                }}
                nomina={editingNomina}
                onSuccess={handleFormSuccess}
            />
        </div>
    );
};

export default NomineRuoloPage;
