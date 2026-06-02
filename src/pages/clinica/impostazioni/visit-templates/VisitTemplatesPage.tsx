/**
 * Visit Template Builder Page
 * 
 * Pagina per la configurazione dei template visita personalizzabili.
 * Permette ai medici di:
 * - Creare template per prestazione/bundle o default
 * - Configurare campi, layout e sezioni sidebar
 * - Nascondere/mostrare sezioni
 * - Clonare template esistenti
 * 
 * Admin può vedere tutti i template di tutti i medici.
 * 
 * @module pages/clinica/impostazioni/visit-templates
 * @project P52 - Clinical Visit Template System
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Settings,
    Plus,
    Edit,
    Trash2,
    Copy,
    Eye,
    Star,
    Check,
    X,
    Search,
    Filter,
    ChevronDown,
    FileText,
    User,
    Building2,
    Stethoscope,
    Package
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { useTenantFilter } from '../../../../context/TenantFilterContext';
import { useTenantMode } from '../../../../contexts/TenantModeContext';
import { useToast } from '../../../../hooks/useToast';
import {
    visitTemplatesApi,
    prestazioniApi,
    mediciApi,
    type VisitTemplate,
    type VisitTemplateInput,
    type Medico,
    type Prestazione
} from '../../../../services/clinicaApi';
import { CRUDButton, CRUDPrimaryButton } from '../../../../components/shared/CRUDButton';
import { ActionButton } from '../../../../components/ui';
import { formatMedicoName } from '../../../../utils/textFormatters';
import TemplateEditorModal from './components/TemplateEditorModal';

// ============================================
// TYPES
// ============================================

interface TemplateListFilters {
    search: string;
    medicoId: string;
    prestazioneId: string;
    isDefault: boolean | null;
    isActive: boolean | null;
}

// ============================================
// MAIN COMPONENT
// ============================================

const VisitTemplatesPage: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();
    const { canPerformCRUD } = useTenantMode();
    const { confirmDelete } = useConfirmDialog();

    // State
    const [filters, setFilters] = useState<TemplateListFilters>({
        search: '',
        medicoId: '',
        prestazioneId: '',
        isDefault: null,
        isActive: null
    });
    const [page, setPage] = useState(1);
    const [editingTemplate, setEditingTemplate] = useState<VisitTemplate | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // isAdmin: SOLO ADMIN/SUPER_ADMIN — accesso completo cross-tenant
    const isAdmin = useMemo(() => {
        return user?.roles?.some((r: string) => ['ADMIN', 'SUPER_ADMIN'].includes(r)) ?? false;
    }, [user?.roles]);

    // isTenantManager: TENANT_ADMIN/COMPANY_ADMIN — vede tutti i template del proprio tenant
    const isTenantManager = useMemo(() => {
        return user?.roles?.some((r: string) => ['TENANT_ADMIN', 'COMPANY_ADMIN'].includes(r)) ?? false;
    }, [user?.roles]);

    // canViewAll: admin o tenant manager — visualizza tutti i template (con filtri)
    const canViewAll = isAdmin || isTenantManager;
    const isBaseMedico = useMemo(() => {
        const roles = user?.roles || [];
        return roles.includes('MEDICO') &&
            !roles.includes('MEDICO_COMPETENTE') &&
            !canViewAll;
    }, [user?.roles, canViewAll]);

    // Query params with tenant filter
    const queryParams = useMemo(() => {
        const tenantParams = getTenantFilterParams();
        return {
            page,
            limit: 20,
            search: filters.search || undefined,
            medicoId: filters.medicoId || undefined,
            prestazioneId: filters.prestazioneId || undefined,
            isDefault: filters.isDefault ?? undefined,
            isActive: filters.isActive ?? undefined,
            // Solo ADMIN/SUPER_ADMIN possono navigare cross-tenant
            ...(isAdmin && tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
            ...(isAdmin && tenantParams.allTenants && { allTenants: true })
        };
    }, [page, filters, getTenantFilterParams, tenantFilterKey, isAdmin]);

    // ============================================
    // QUERIES
    // ============================================

    // Lista template (admin/tenantManager: tutti del tenant, medici: i propri)
    const {
        data: templatesData,
        isLoading: isLoadingTemplates,
        error: templatesError
    } = useQuery({
        queryKey: ['visit-templates', 'list', queryParams, tenantFilterKey, canViewAll],
        queryFn: async () => {
            if (canViewAll) {
                return visitTemplatesApi.getAll(queryParams);
            } else {
                const templates = await visitTemplatesApi.getMyTemplates({ includeInactive: true });
                return {
                    data: templates,
                    pagination: { total: templates.length, page: 1, limit: templates.length, totalPages: 1 }
                };
            }
        },
        enabled: isReady
    });

    // Lista medici (per filtro — visibile a chi può vedere tutti i template)
    const { data: medici } = useQuery({
        queryKey: ['medici', 'for-filter', tenantFilterKey],
        queryFn: () => mediciApi.getAll({ limit: 100 }),
        enabled: isReady && canViewAll
    });

    const { data: ownMedico } = useQuery({
        queryKey: ['medici', 'current-template-owner', user?.id, tenantFilterKey],
        queryFn: () => mediciApi.getById(user!.id),
        enabled: isReady && isBaseMedico && !!user?.id
    });

    // Lista prestazioni (per filtro)
    const { data: prestazioni } = useQuery({
        queryKey: ['prestazioni', 'for-filter', tenantFilterKey],
        queryFn: () => prestazioniApi.getAll({ limit: 100 }),
        enabled: isReady
    });

    const availablePrestazioni = useMemo<Prestazione[]>(() => {
        if (!isBaseMedico) return prestazioni?.data || [];
        return (ownMedico?.abilitazioni || [])
            .filter(a => a.attivo && a.prestazione)
            .map(a => a.prestazione as Prestazione);
    }, [isBaseMedico, prestazioni?.data, ownMedico?.abilitazioni]);

    const modalMedici = useMemo<Medico[]>(() => {
        if (canViewAll) return medici?.data || [];
        return ownMedico ? [ownMedico] : [];
    }, [canViewAll, medici?.data, ownMedico]);

    const allowedPrestazioneIds = useMemo(
        () => new Set(availablePrestazioni.map(p => p.id)),
        [availablePrestazioni]
    );

    const sanitizeMedicoTemplateInput = useCallback((data: VisitTemplateInput | Partial<VisitTemplateInput>) => {
        if (!isBaseMedico) return data;

        const requestedIds = [
            ...((data as VisitTemplateInput).prestazioneIds || []),
            data.prestazioneId
        ].filter(Boolean) as string[];
        const prestazioneIds = requestedIds.filter(id => allowedPrestazioneIds.has(id));

        if (requestedIds.length > 0 && prestazioneIds.length === 0) {
            showToast({ message: 'Puoi associare il template solo alle tue prestazioni abilitate', type: 'warning' });
        }

        return {
            ...data,
            scope: 'PERSONAL' as const,
            medicoId: user?.id,
            medicoIds: undefined,
            prestazioneId: prestazioneIds[0] || undefined,
            prestazioneIds: prestazioneIds.length > 0 ? prestazioneIds : undefined
        };
    }, [isBaseMedico, allowedPrestazioneIds, user?.id, showToast]);

    // Default del sistema
    const { data: defaults } = useQuery({
        queryKey: ['visit-templates', 'defaults'],
        queryFn: () => visitTemplatesApi.getDefaults()
    });

    // ============================================
    // MUTATIONS
    // ============================================

    const createMutation = useMutation({
        mutationFn: (data: VisitTemplateInput) => visitTemplatesApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['visit-templates'] });
            showToast({ message: 'Template creato con successo', type: 'success' });
            setIsCreateModalOpen(false);
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore nella creazione', type: 'error' });
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<VisitTemplateInput> }) =>
            visitTemplatesApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['visit-templates'] });
            showToast({ message: 'Template aggiornato con successo', type: 'success' });
            setEditingTemplate(null);
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore nell\'aggiornamento', type: 'error' });
        }
    });

    const cloneMutation = useMutation({
        mutationFn: ({ id, newName }: { id: string; newName: string }) =>
            visitTemplatesApi.clone(id, { newName }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['visit-templates'] });
            showToast({ message: 'Template clonato con successo', type: 'success' });
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore nella clonazione', type: 'error' });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => visitTemplatesApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['visit-templates'] });
            showToast({ message: 'Template eliminato con successo', type: 'success' });
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore nell\'eliminazione', type: 'error' });
        }
    });

    // ============================================
    // HANDLERS
    // ============================================

    const handleCreate = useCallback(async (data: VisitTemplateInput) => {
        const normalizedData = sanitizeMedicoTemplateInput(data) as VisitTemplateInput;
        const { prestazioneIds, medicoIds, ...baseData } = normalizedData;

        // Determine lists for multi-create
        const pIds = prestazioneIds && prestazioneIds.length > 0 ? prestazioneIds : [baseData.prestazioneId];
        const mIds = medicoIds && medicoIds.length > 1 ? medicoIds : [baseData.medicoId];

        // If both multi-prestazione and multi-medico, create cartesian product
        const combinations = pIds.flatMap(pid => mIds.map(mid => ({ pid, mid })));

        if (combinations.length > 1) {
            try {
                let created = 0;
                let skipped = 0;
                for (const { pid, mid } of combinations) {
                    try {
                        await visitTemplatesApi.create({
                            ...baseData,
                            prestazioneId: pid || undefined,
                            medicoId: mid || undefined
                        });
                        created++;
                    } catch {
                        skipped++; // Template già esistente o altro errore
                    }
                }
                queryClient.invalidateQueries({ queryKey: ['visit-templates'] });
                showToast({
                    message: `${created} template creati${skipped > 0 ? `, ${skipped} saltati (già esistenti)` : ''}`,
                    type: 'success'
                });
                setIsCreateModalOpen(false);
            } catch (error: unknown) {
                const msg = 'Errore nella creazione';
                showToast({ message: msg, type: 'error' });
            }
        } else {
            // Single create (existing behavior)
            createMutation.mutate(baseData);
        }
    }, [createMutation, queryClient, showToast, sanitizeMedicoTemplateInput]);

    const handleUpdate = useCallback((id: string, data: Partial<VisitTemplateInput>) => {
        updateMutation.mutate({ id, data: sanitizeMedicoTemplateInput(data) });
    }, [updateMutation, sanitizeMedicoTemplateInput]);

    const handleClone = useCallback((template: VisitTemplate) => {
        const newName = `${template.name} (copia)`;
        cloneMutation.mutate({ id: template.id, newName });
    }, [cloneMutation]);

    const handleDelete = useCallback(async (id: string) => {
        if (await confirmDelete('questo template')) {
            deleteMutation.mutate(id);
        }
    }, [deleteMutation, confirmDelete]);

    const handleToggleDefault = useCallback((template: VisitTemplate) => {
        updateMutation.mutate({
            id: template.id,
            data: { isDefault: !template.isDefault }
        });
    }, [updateMutation]);

    const handleToggleActive = useCallback((template: VisitTemplate) => {
        updateMutation.mutate({
            id: template.id,
            data: { isActive: !template.isActive }
        });
    }, [updateMutation]);

    // ============================================
    // DERIVED DATA
    // ============================================

    const templates = useMemo(() => {
        if (!templatesData) return [];
        return templatesData.data || [];
    }, [templatesData]);

    const pagination = useMemo(() => {
        if (!templatesData) {
            return { total: 0, page: 1, limit: 20, totalPages: 1 };
        }
        return templatesData.pagination || { total: templates.length, page: 1, limit: 20, totalPages: 1 };
    }, [templatesData, templates.length]);

    // ============================================
    // RENDER
    // ============================================

    if (templatesError) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                    Errore nel caricamento dei template: {(templatesError as Error).message}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="h-7 w-7 text-teal-600" />
                        Template Visita
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {canViewAll
                            ? 'Gestisci i template visita di tutti i medici'
                            : 'Configura i tuoi template di visita personalizzati'
                        }
                    </p>
                </div>
                <CRUDPrimaryButton
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Nuovo Template
                </CRUDPrimaryButton>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cerca template..."
                            value={filters.search}
                            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                    </div>

                    {/* Toggle filtri avanzati */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${showFilters
                            ? 'bg-teal-50 border-teal-200 text-teal-700'
                            : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <Filter className="w-4 h-4" />
                        Filtri
                        <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                {/* Filtri avanzati */}
                {showFilters && (
                    <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Medico (visibile per admin e tenant manager) */}
                        {canViewAll && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Medico
                                </label>
                                <select
                                    value={filters.medicoId}
                                    onChange={(e) => setFilters(f => ({ ...f, medicoId: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="">Tutti i medici</option>
                                    {medici?.data?.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.lastName} {m.firstName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Prestazione */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Prestazione
                            </label>
                            <select
                                value={filters.prestazioneId}
                                onChange={(e) => setFilters(f => ({ ...f, prestazioneId: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                            >
                                <option value="">Tutte le prestazioni</option>
                                {availablePrestazioni.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.nome}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Default */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Default
                            </label>
                            <select
                                value={filters.isDefault === null ? '' : filters.isDefault.toString()}
                                onChange={(e) => setFilters(f => ({
                                    ...f,
                                    isDefault: e.target.value === '' ? null : e.target.value === 'true'
                                }))}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                            >
                                <option value="">Tutti</option>
                                <option value="true">Solo default</option>
                                <option value="false">Non default</option>
                            </select>
                        </div>

                        {/* Attivo */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Stato
                            </label>
                            <select
                                value={filters.isActive === null ? '' : filters.isActive.toString()}
                                onChange={(e) => setFilters(f => ({
                                    ...f,
                                    isActive: e.target.value === '' ? null : e.target.value === 'true'
                                }))}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                            >
                                <option value="">Tutti</option>
                                <option value="true">Attivi</option>
                                <option value="false">Non attivi</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Templates List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {isLoadingTemplates ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto"></div>
                        <p className="mt-4 text-gray-500">Caricamento template...</p>
                    </div>
                ) : templates.length === 0 ? (
                    <div className="p-12 text-center">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">Nessun template trovato</h3>
                        <p className="text-gray-500 mt-1">
                            {filters.search || filters.medicoId || filters.prestazioneId
                                ? 'Prova a modificare i filtri di ricerca'
                                : 'Crea il tuo primo template per personalizzare le visite'
                            }
                        </p>
                        <CRUDPrimaryButton
                            onClick={() => setIsCreateModalOpen(true)}
                            className="mt-4"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Crea Template
                        </CRUDPrimaryButton>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {templates.map((template) => (
                            <div
                                key={template.id}
                                onClick={() => navigate(`/poliambulatorio/impostazioni/visit-templates/${template.id}`)}
                                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        {/* Icon */}
                                        <div className={`p-3 rounded-lg ${template.isDefault
                                            ? 'bg-amber-100 text-amber-600'
                                            : 'bg-teal-100 text-teal-600'
                                            }`}>
                                            {template.prestazione ? (
                                                <Stethoscope className="w-5 h-5" />
                                            ) : template.bundle ? (
                                                <Package className="w-5 h-5" />
                                            ) : (
                                                <FileText className="w-5 h-5" />
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-gray-900">
                                                    {template.name}
                                                </h3>
                                                {template.isDefault && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                                        <Star className="w-3 h-3 mr-1" />
                                                        Default
                                                    </span>
                                                )}
                                                {!template.isActive && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                        Non attivo
                                                    </span>
                                                )}
                                                {template.isSystem && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        Sistema
                                                    </span>
                                                )}
                                                {template.scope && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                        {template.scope}
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-sm text-gray-500 mt-1">
                                                {template.description || 'Nessuna descrizione'}
                                            </p>

                                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                                {canViewAll && template.medico && (
                                                    <span className="flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        {formatMedicoName(template.medico)}
                                                    </span>
                                                )}
                                                {template.prestazione && (
                                                    <span className="flex items-center gap-1">
                                                        <Stethoscope className="w-3 h-3" />
                                                        {template.prestazione.nome}
                                                    </span>
                                                )}
                                                {template.bundle && (
                                                    <span className="flex items-center gap-1">
                                                        <Package className="w-3 h-3" />
                                                        {template.bundle.nome}
                                                    </span>
                                                )}
                                                <span>
                                                    {template.fields?.length || 0} campi
                                                </span>
                                                <span>
                                                    v{template.version}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <ActionButton
                                        theme="teal"
                                        actions={[
                                            {
                                                label: 'Visualizza',
                                                icon: <Eye className="w-4 h-4" />,
                                                onClick: () => navigate(`/poliambulatorio/impostazioni/visit-templates/${template.id}`)
                                            },
                                            {
                                                label: 'Modifica',
                                                icon: <Edit className="w-4 h-4" />,
                                                onClick: () => setEditingTemplate(template)
                                            },
                                            {
                                                label: 'Clona',
                                                icon: <Copy className="w-4 h-4" />,
                                                onClick: () => handleClone(template)
                                            },
                                            {
                                                label: template.isDefault ? 'Rimuovi default' : 'Imposta default',
                                                icon: <Star className={`w-4 h-4 ${template.isDefault ? 'fill-current' : ''}`} />,
                                                onClick: () => handleToggleDefault(template)
                                            },
                                            {
                                                label: template.isActive ? 'Disattiva' : 'Attiva',
                                                icon: template.isActive ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />,
                                                onClick: () => handleToggleActive(template)
                                            },
                                            {
                                                label: 'Elimina',
                                                icon: <Trash2 className="w-4 h-4" />,
                                                onClick: () => handleDelete(template.id),
                                                variant: 'danger' as const
                                            }
                                        ]}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                            Mostrando {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} di {pagination.total} template
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={pagination.page <= 1}
                                className="px-3 py-1 rounded border border-gray-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                            >
                                Precedente
                            </button>
                            <span className="text-sm text-gray-600">
                                Pagina {pagination.page} di {pagination.totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                disabled={pagination.page >= pagination.totalPages}
                                className="px-3 py-1 rounded border border-gray-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                            >
                                Successiva
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {(isCreateModalOpen || editingTemplate) && defaults && (
                <TemplateEditorModal
                    isOpen={true}
                    template={editingTemplate || undefined}
                    defaults={defaults}
                    prestazioni={availablePrestazioni}
                    medici={modalMedici}
                    currentUserId={user?.id}
                    isAdmin={!!isAdmin}
                    onSave={(data) => {
                        if (editingTemplate) {
                            handleUpdate(editingTemplate.id, data);
                        } else {
                            handleCreate(data as VisitTemplateInput);
                        }
                    }}
                    onClose={() => {
                        setEditingTemplate(null);
                        setIsCreateModalOpen(false);
                    }}
                    isSaving={createMutation.isPending || updateMutation.isPending}
                />
            )}
        </div>
    );
};

export default VisitTemplatesPage;
