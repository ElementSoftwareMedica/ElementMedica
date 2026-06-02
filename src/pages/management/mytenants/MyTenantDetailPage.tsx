/**
 * MyTenantDetailPage
 *
 * Pagina dettaglio tenant per /management/my-tenants/:tenantId
 * Mostra informazioni sul tenant, funzionalità abilitate e catalogo prezzi.
 * SUPER_ADMIN può abilitare/disabilitare funzionalità direttamente da questa pagina.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Building2,
    Check,
    X,
    Shield,
    Star,
    Loader2,
    AlertCircle,
    RefreshCw,
    Tag,
    ToggleLeft,
    ToggleRight,
    Euro,
    Info,
    CheckCircle2,
    XCircle,
    Crown,
    Settings,
    Clock,
    ShoppingCart,
    Zap,
    Edit2,
} from 'lucide-react';
import { managementApi } from '../api';
import type { Tenant, TenantFeatureRecord, FeatureCatalogEntry, FeatureCategoryDef, TenantSettings } from '../types';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../hooks/useToast';
import useTenantAccess from '../../../hooks/useTenantAccess';
import TenantEditModal from '../components/TenantEditModal';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ACCESS_LEVEL_CONFIG: Record<string, { label: string; color: string }> = {
    READ: { label: 'Lettura', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
    WRITE: { label: 'Scrittura', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
    ADMIN: { label: 'Amministratore', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
    FULL: { label: 'Completo', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
};

const CATEGORY_COLOR_MAP: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    teal: 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    gray: 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600',
    amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
};

function formatPrice(pricing: FeatureCatalogEntry['pricing']): string {
    if (!pricing) return '—';
    if (pricing.price === 0) return 'Incluso';
    return `€ ${pricing.price.toFixed(2)}/mese`;
}

// ─── Component ───────────────────────────────────────────────────────────────

const MyTenantDetailPage: React.FC = () => {
    const { tenantId } = useParams<{ tenantId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();

    // Verifica ruolo con roleType (stringa), roles (array) e globalRole per massima compatibilità
    const userRoleType = user?.roleType ?? '';
    const userRolesArr = user?.roles ?? [];
    const userGlobalRole = (user as { globalRole?: string } | null)?.globalRole ?? '';
    const isSuperAdmin = userRoleType === 'SUPER_ADMIN' || userRolesArr.includes('SUPER_ADMIN') || userGlobalRole === 'SUPER_ADMIN';
    const isAdmin = isSuperAdmin || userRoleType === 'ADMIN' || userRolesArr.includes('ADMIN') || userGlobalRole === 'ADMIN';
    // TENANT_ADMIN può richiedere attivazione feature (con flusso billing) ma non togglare direttamente
    const isTenantAdmin = userRoleType === 'TENANT_ADMIN' || userRolesArr.includes('TENANT_ADMIN');
    // Solo gli admin globali possono togglare direttamente
    const canToggleDirectly = isAdmin;

    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [tenantFeatures, setTenantFeatures] = useState<TenantFeatureRecord[]>([]);
    const [catalogFeatures, setCatalogFeatures] = useState<FeatureCatalogEntry[]>([]);
    const [catalogCategories, setCatalogCategories] = useState<FeatureCategoryDef[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [togglingKey, setTogglingKey] = useState<string | null>(null);

    // Billing modal state
    const [billingModal, setBillingModal] = useState<{ featureKey: string; featureLabel: string; pricing: FeatureCatalogEntry['pricing'] } | null>(null);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [requesting, setRequesting] = useState(false);
    const [bulkToggling, setBulkToggling] = useState(false);
    const [limitEdits, setLimitEdits] = useState<Record<string, string>>({});
    const [tenantToEdit, setTenantToEdit] = useState<Tenant | null>(null);
    const [isSavingTenant, setIsSavingTenant] = useState(false);
    const { refresh: refreshTenantAccess } = useTenantAccess();

    const loadData = useCallback(async () => {
        if (!tenantId) return;
        setLoading(true);
        setError(null);
        try {
            const [tenantsRes, catalogRes, featuresRes] = await Promise.all([
                managementApi.getMyTenants(),
                managementApi.getFeatureCatalog(),
                managementApi.getTenantFeatures(tenantId),
            ]);

            const found = tenantsRes.data?.find((t) => t.id === tenantId) ?? null;
            setTenant(found);
            setCatalogFeatures(catalogRes.data?.features ?? []);
            setCatalogCategories(catalogRes.data?.categories ?? []);
            setTenantFeatures(featuresRes.data ?? []);
        } catch {
            setError('Errore nel caricamento dei dati del tenant');
        } finally {
            setLoading(false);
        }
    }, [tenantId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleToggleFeature = async (featureKey: string, currentEnabled: boolean) => {
        if (!tenantId || !canToggleDirectly) return;
        // Aggiornamento ottimistico: nessun spinner globale, nessuno scroll al top
        setTenantFeatures(prev => prev.map(f =>
            f.featureKey === featureKey ? { ...f, isEnabled: !currentEnabled } : f
        ));
        setTogglingKey(featureKey);
        try {
            await managementApi.setTenantFeature(tenantId, featureKey, { isEnabled: !currentEnabled });
            // Refresh silenzioso solo delle features (senza setLoading)
            const featuresRes = await managementApi.getTenantFeatures(tenantId);
            setTenantFeatures(featuresRes.data ?? []);
            showToast({
                message: `Funzionalità ${!currentEnabled ? 'abilitata' : 'disabilitata'} con successo`,
                type: 'success',
            });
        } catch {
            // Ripristino in caso di errore
            setTenantFeatures(prev => prev.map(f =>
                f.featureKey === featureKey ? { ...f, isEnabled: currentEnabled } : f
            ));
            showToast({ message: 'Errore nell\'aggiornamento della funzionalità', type: 'error' });
        } finally {
            setTogglingKey(null);
        }
    };

    const handleOpenBillingModal = (feature: FeatureCatalogEntry) => {
        setBillingCycle('monthly');
        setBillingModal({ featureKey: feature.key, featureLabel: feature.label, pricing: feature.pricing });
    };

    const handleConfirmRequest = async () => {
        if (!billingModal || !tenantId) return;
        setRequesting(true);
        try {
            await managementApi.requestFeatureActivation(billingModal.featureKey, billingCycle);
            // Refresh silenzioso solo delle features (senza setLoading)
            const featuresRes = await managementApi.getTenantFeatures(tenantId);
            setTenantFeatures(featuresRes.data ?? []);
            setBillingModal(null);
            showToast({ message: 'Richiesta inviata. Il team ti contatterà per la fatturazione.', type: 'success' });
        } catch {
            showToast({ message: 'Errore nell\'invio della richiesta', type: 'error' });
        } finally {
            setRequesting(false);
        }
    };

    const handleEnableAll = async () => {
        if (!tenantId || !canToggleDirectly) return;
        const enabledKeys = new Set(tenantFeatures.filter(f => f.isEnabled).map(f => f.featureKey));
        const toEnable = catalogFeatures.filter(cf => !enabledKeys.has(cf.key));
        if (!toEnable.length) {
            showToast({ message: 'Tutte le funzionalità sono già abilitate', type: 'info' });
            return;
        }
        setBulkToggling(true);
        try {
            await managementApi.bulkSetTenantFeatures(tenantId,
                toEnable.map(f => ({ featureKey: f.key, isEnabled: true }))
            );
            const featuresRes = await managementApi.getTenantFeatures(tenantId);
            setTenantFeatures(featuresRes.data ?? []);
            showToast({ message: `${toEnable.length} funzionalità abilitate`, type: 'success' });
        } catch {
            showToast({ message: 'Errore durante l\'abilitazione delle funzionalità', type: 'error' });
        } finally {
            setBulkToggling(false);
        }
    };

    const handleEnableCategory = async (features: FeatureCatalogEntry[]) => {
        if (!tenantId || !canToggleDirectly) return;
        const enabledKeys = new Set(tenantFeatures.filter(f => f.isEnabled).map(f => f.featureKey));
        const toEnable = features.filter(f => !enabledKeys.has(f.key));
        if (!toEnable.length) return;
        setBulkToggling(true);
        try {
            await managementApi.bulkSetTenantFeatures(tenantId,
                toEnable.map(f => ({ featureKey: f.key, isEnabled: true }))
            );
            const featuresRes = await managementApi.getTenantFeatures(tenantId);
            setTenantFeatures(featuresRes.data ?? []);
            showToast({ message: `${toEnable.length} funzionalità abilitate`, type: 'success' });
        } catch {
            showToast({ message: 'Errore durante l\'abilitazione', type: 'error' });
        } finally {
            setBulkToggling(false);
        }
    };

    const handleSaveLimit = async (featureKey: string, limitValue: string) => {
        if (!tenantId) return;
        const limit = parseInt(limitValue, 10);
        if (isNaN(limit) || limit < 0) return;
        try {
            await managementApi.setTenantFeature(tenantId, featureKey, { isEnabled: true, usageLimit: limit || null });
            const featuresRes = await managementApi.getTenantFeatures(tenantId);
            setTenantFeatures(featuresRes.data ?? []);
            setLimitEdits(prev => { const next = { ...prev }; delete next[featureKey]; return next; });
            showToast({ message: 'Limite aggiornato', type: 'success' });
        } catch {
            showToast({ message: 'Errore nell\'aggiornamento del limite', type: 'error' });
        }
    };

    const handleSaveTenant = async (tenantId: string, data: { name: string; settings: TenantSettings }) => {
        setIsSavingTenant(true);
        try {
            await managementApi.updateTenant(tenantId, data);
            await refreshTenantAccess();
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('tenant-access:changed'));
            }
            showToast({ message: 'Tenant aggiornato con successo', type: 'success' });
            setTenantToEdit(null);
            await loadData();
        } catch {
            showToast({ message: 'Errore nell\'aggiornamento del tenant', type: 'error' });
            throw new Error('Errore aggiornamento tenant');
        } finally {
            setIsSavingTenant(false);
        }
    };

    // ── Loading ──────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">Caricamento...</span>
            </div>
        );
    }

    if (error || !tenant) {
        return (
            <div className="p-6">
                <button
                    onClick={() => navigate('/management/my-tenants')}
                    className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6"
                >
                    <ArrowLeft className="h-4 w-4 mr-1.5" />
                    Torna ai miei tenant
                </button>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                    <span className="text-red-700 dark:text-red-300">
                        {error ?? 'Tenant non trovato o non accessibile.'}
                    </span>
                </div>
            </div>
        );
    }

    const accessConfig = ACCESS_LEVEL_CONFIG[tenant.accessLevel ?? 'READ'];

    // Mappa chiave → TenantFeatureRecord per lookup rapido
    const featureMap = new Map<string, TenantFeatureRecord>(
        tenantFeatures.map((f) => [f.featureKey, f])
    );

    const enabledCount = catalogFeatures.filter((cf) => featureMap.get(cf.key)?.isEnabled).length;

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 pb-10">
            {/* Back button */}
            <button
                onClick={() => navigate('/management/my-tenants')}
                className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Torna ai miei tenant
            </button>

            {/* ── Tenant Header ─────────────────────────────────────────── */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-8">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-center gap-2">
                                {tenant.settings?.logoUrl ? (
                                    <img
                                        src={tenant.settings.logoUrl}
                                        alt={`Logo ${tenant.name}`}
                                        className="h-16 w-16 rounded-xl object-contain bg-white/20 p-1"
                                    />
                                ) : (
                                    <div className="h-16 w-16 rounded-xl bg-white/20 flex items-center justify-center">
                                        <Building2 className="h-8 w-8 text-white" />
                                    </div>
                                )}
                                {(tenant.settings?.branches?.MEDICA?.logo || tenant.settings?.branches?.FORMAZIONE?.logo || tenant.settings?.branches?.MDL?.logo) && (
                                    <div className="flex gap-1">
                                        {tenant.settings?.branches?.MEDICA?.logo && (
                                            <img src={tenant.settings.branches.MEDICA.logo} className="h-7 rounded bg-white/10 p-0.5 object-contain" alt="Medica" />
                                        )}
                                        {tenant.settings?.branches?.FORMAZIONE?.logo && (
                                            <img src={tenant.settings.branches.FORMAZIONE.logo} className="h-7 rounded bg-white/10 p-0.5 object-contain" alt="Formazione" />
                                        )}
                                        {tenant.settings?.branches?.MDL?.logo && (
                                            <img src={tenant.settings.branches.MDL.logo} className="h-7 rounded bg-white/10 p-0.5 object-contain" alt="MDL" />
                                        )}
                                    </div>
                                )}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">{tenant.name}</h1>
                                <p className="text-violet-200 text-sm mt-0.5">{tenant.slug}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    {tenant.isPrimary && (
                                        <span className="inline-flex items-center gap-1 bg-yellow-400/20 text-yellow-200 border border-yellow-300/30 px-2.5 py-0.5 rounded-full text-xs font-medium">
                                            <Star className="h-3 w-3 fill-current" />
                                            Primario
                                        </span>
                                    )}
                                    {tenant.isAdminAccess && (
                                        <span className="inline-flex items-center gap-1 bg-white/20 text-white border border-white/30 px-2.5 py-0.5 rounded-full text-xs font-medium">
                                            <Crown className="h-3 w-3" />
                                            Admin
                                        </span>
                                    )}
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${accessConfig.color}`}>
                                        <Shield className="h-3 w-3" />
                                        {accessConfig.label}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${tenant.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                                }`}>
                                {tenant.isActive ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                                {tenant.isActive ? 'Attivo' : 'Inattivo'}
                            </span>
                            <button
                                onClick={() => setTenantToEdit(tenant)}
                                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                                title="Modifica tenant"
                            >
                                <Edit2 className="h-4 w-4 text-white" />
                            </button>
                            <button
                                onClick={loadData}
                                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                                title="Ricarica"
                            >
                                <RefreshCw className="h-4 w-4 text-white" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats bar */}
                <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-700 border-t border-gray-100 dark:border-gray-700">
                    <div className="px-6 py-4 text-center">
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{enabledCount}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Funzionalità abilitate</p>
                    </div>
                    <div className="px-6 py-4 text-center">
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{catalogFeatures.length}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Disponibili nel catalogo</p>
                    </div>
                    <div className="px-6 py-4 text-center">
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-50 capitalize">
                            {tenant.billingPlan ?? 'Standard'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Piano attivo</p>
                    </div>
                </div>
            </div>

            {/* ── Admin shortcut ────────────────────────────────────────── */}
            {isAdmin && (
                <div className="flex items-center justify-between bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300 text-sm">
                        <Info className="h-4 w-4" />
                        Come admin puoi abilitare e disabilitare funzionalità direttamente dai toggle qui sotto.
                    </div>
                    <button
                        onClick={() => navigate(`/management/tenant-access?tenantId=${tenant.id}`)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 dark:text-violet-300 hover:text-violet-900 dark:hover:text-violet-100 bg-white dark:bg-gray-800 border border-violet-300 dark:border-violet-700 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <Settings className="h-3.5 w-3.5" />
                        Gestisci accessi
                    </button>
                </div>
            )}
            {!isAdmin && isTenantAdmin && (
                <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 text-blue-700 dark:text-blue-300 text-sm">
                    <ShoppingCart className="h-4 w-4 shrink-0" />
                    Puoi richiedere l'attivazione di nuove funzionalità. Il team ti contatterà per la fatturazione.
                </div>
            )}

            {/* ── Feature Catalog ───────────────────────────────────────── */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
                        <Tag className="h-5 w-5 text-violet-600" />
                        Funzionalità Disponibili
                    </h2>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-full">
                            {enabledCount} / {catalogFeatures.length} abilitate
                        </span>
                        {canToggleDirectly && (
                            <button
                                onClick={handleEnableAll}
                                disabled={bulkToggling || enabledCount === catalogFeatures.length}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 px-2.5 py-1.5 rounded-lg transition-colors hover:bg-violet-100 dark:hover:bg-violet-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Abilita tutte le funzionalità"
                            >
                                {bulkToggling ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                                Abilita tutte
                            </button>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    {catalogCategories.map((cat) => {
                        const featuresInCat = catalogFeatures.filter((f) => f.category === cat.key);
                        if (!featuresInCat.length) return null;

                        return (
                            <div key={cat.key} className={`rounded-xl border overflow-hidden ${CATEGORY_COLOR_MAP[cat.color] ?? CATEGORY_COLOR_MAP.gray}`}>
                                {/* Category header */}
                                <div className="px-4 py-3 border-b border-current/10 flex items-center gap-2">
                                    <span className="text-lg">{cat.icon}</span>
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{cat.label}</h3>
                                    <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                                        {featuresInCat.filter((f) => featureMap.get(f.key)?.isEnabled).length} / {featuresInCat.length} attive
                                    </span>
                                    {canToggleDirectly && featuresInCat.some(f => !featureMap.get(f.key)?.isEnabled) && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleEnableCategory(featuresInCat); }}
                                            disabled={bulkToggling}
                                            className="ml-1 inline-flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-200 disabled:opacity-50"
                                            title={`Abilita tutte le funzionalità di ${cat.label}`}
                                        >
                                            <Zap className="h-3 w-3" />
                                            Abilita tutto
                                        </button>
                                    )}
                                </div>

                                {/* Features list */}
                                <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                    {featuresInCat.map((feature) => {
                                        const record = featureMap.get(feature.key);
                                        const isEnabled = record?.isEnabled ?? false;
                                        const isToggling = togglingKey === feature.key;

                                        const isPending = record?.notes === 'PENDING_ACTIVATION';
                                        const isRejected = record?.notes === 'REJECTED';

                                        return (
                                            <div
                                                key={feature.key}
                                                className="flex items-center gap-4 px-4 py-3 bg-white/60 dark:bg-gray-800/60 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors"
                                            >
                                                {/* Icon + text */}
                                                <span className="text-xl shrink-0 w-8 text-center">{feature.icon}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-medium text-gray-900 dark:text-gray-50 text-sm">
                                                            {feature.label}
                                                        </span>
                                                        {isEnabled ? (
                                                            <span className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-2 py-0.5 rounded-full font-medium">
                                                                <CheckCircle2 className="h-3 w-3" />
                                                                Attiva
                                                            </span>
                                                        ) : isPending ? (
                                                            <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs px-2 py-0.5 rounded-full font-medium">
                                                                <Clock className="h-3 w-3" />
                                                                In attesa di approvazione
                                                            </span>
                                                        ) : isRejected ? (
                                                            <span className="inline-flex items-center gap-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs px-2 py-0.5 rounded-full font-medium">
                                                                <XCircle className="h-3 w-3" />
                                                                Richiesta rifiutata
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full">
                                                                <XCircle className="h-3 w-3" />
                                                                Non attiva
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                                                        {feature.description}
                                                    </p>
                                                </div>

                                                {/* Price */}
                                                <div className="text-right shrink-0 min-w-[80px]">
                                                    <div className="flex items-center justify-end gap-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                        {feature.pricing && feature.pricing.price > 0 && (
                                                            <Euro className="h-3.5 w-3.5 text-gray-400" />
                                                        )}
                                                        {formatPrice(feature.pricing)}
                                                    </div>
                                                    {feature.pricing?.priceYearly != null && feature.pricing.priceYearly > 0 && (
                                                        <p className="text-xs text-gray-400 dark:text-gray-500">
                                                            € {feature.pricing.priceYearly.toFixed(0)}/anno
                                                        </p>
                                                    )}
                                                    {feature.pricing?.note && (
                                                        <p className="text-xs text-green-600 dark:text-green-400">
                                                            {feature.pricing.note}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Action */}
                                                {canToggleDirectly ? (
                                                    feature.type === 'limit' ? (
                                                        /* Admin: limite numerico */
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <button
                                                                onClick={() => handleToggleFeature(feature.key, isEnabled)}
                                                                disabled={isToggling}
                                                                className={`transition-colors ${isEnabled ? 'text-green-600 hover:text-green-700 dark:text-green-400' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500'} disabled:opacity-50`}
                                                                title={isEnabled ? 'Disabilita' : 'Abilita'}
                                                            >
                                                                {isToggling ? <Loader2 className="h-5 w-5 animate-spin" /> : isEnabled ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                                                            </button>
                                                            {isEnabled && (
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    placeholder="∞"
                                                                    value={limitEdits[feature.key] ?? (record?.usageLimit?.toString() ?? '')}
                                                                    onChange={(e) => setLimitEdits(prev => ({ ...prev, [feature.key]: e.target.value }))}
                                                                    onBlur={(e) => { if (limitEdits[feature.key] !== undefined) handleSaveLimit(feature.key, e.target.value); }}
                                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveLimit(feature.key, (e.target as HTMLInputElement).value); }}
                                                                    className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-violet-500 focus:border-violet-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50"
                                                                    title="Limite massimo (∅ = illimitato)"
                                                                />
                                                            )}
                                                        </div>
                                                    ) : (
                                                        /* Admin: toggle diretto */
                                                        <button
                                                            onClick={() => handleToggleFeature(feature.key, isEnabled)}
                                                            disabled={isToggling}
                                                            className={`shrink-0 transition-colors ${isEnabled
                                                                ? 'text-green-600 hover:text-green-700 dark:text-green-400'
                                                                : 'text-gray-400 hover:text-gray-600 dark:text-gray-500'
                                                                } disabled:opacity-50`}
                                                            title={isEnabled ? 'Disabilita funzionalità' : 'Abilita funzionalità'}
                                                        >
                                                            {isToggling ? (
                                                                <Loader2 className="h-6 w-6 animate-spin" />
                                                            ) : isEnabled ? (
                                                                <ToggleRight className="h-6 w-6" />
                                                            ) : (
                                                                <ToggleLeft className="h-6 w-6" />
                                                            )}
                                                        </button>
                                                    )
                                                ) : isTenantAdmin && !isEnabled && !isPending ? (
                                                    /* Tenant Admin: pulsante richiesta attivazione */
                                                    <button
                                                        onClick={() => handleOpenBillingModal(feature)}
                                                        className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 dark:text-violet-300 hover:text-violet-900 dark:hover:text-violet-100 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                                                        title="Richiedi attivazione"
                                                    >
                                                        <ShoppingCart className="h-3.5 w-3.5" />
                                                        Attiva
                                                    </button>
                                                ) : null}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Billing Modal ────────────────────────────────────────── */}
            {billingModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">
                        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                                Attiva: {billingModal.featureLabel}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Scegli il ciclo di fatturazione. Il team ti contatterà per completare l'attivazione.
                            </p>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            {/* Billing cycle selector */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setBillingCycle('monthly')}
                                    className={`rounded-xl border-2 px-4 py-4 text-left transition-all ${billingCycle === 'monthly'
                                        ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/20'
                                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                        }`}
                                >
                                    <div className="font-semibold text-gray-900 dark:text-gray-50 text-sm">Mensile</div>
                                    {billingModal.pricing && billingModal.pricing.price > 0 ? (
                                        <div className="text-xl font-bold text-violet-600 mt-1">
                                            € {billingModal.pricing.price.toFixed(2)}
                                            <span className="text-sm font-normal text-gray-500">/mese</span>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-green-600 mt-1">Incluso nel piano</div>
                                    )}
                                </button>
                                <button
                                    onClick={() => setBillingCycle('yearly')}
                                    className={`rounded-xl border-2 px-4 py-4 text-left transition-all ${billingCycle === 'yearly'
                                        ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/20'
                                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                        }`}
                                >
                                    <div className="font-semibold text-gray-900 dark:text-gray-50 text-sm flex items-center gap-1.5">
                                        Annuale
                                        {billingModal.pricing?.priceYearly != null && billingModal.pricing.price > 0 && billingModal.pricing.priceYearly < billingModal.pricing.price * 12 && (
                                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Risparmio</span>
                                        )}
                                    </div>
                                    {billingModal.pricing?.priceYearly != null && billingModal.pricing.priceYearly > 0 ? (
                                        <div className="text-xl font-bold text-violet-600 mt-1">
                                            € {billingModal.pricing.priceYearly.toFixed(0)}
                                            <span className="text-sm font-normal text-gray-500">/anno</span>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-green-600 mt-1">Incluso nel piano</div>
                                    )}
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                La richiesta verrà inviata al team di ElementMedica. Riceverai una conferma e le istruzioni di pagamento via email.
                            </p>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                            <button
                                onClick={() => setBillingModal(null)}
                                disabled={requesting}
                                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleConfirmRequest}
                                disabled={requesting}
                                className="px-4 py-2 text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {requesting && <Loader2 className="h-4 w-4 animate-spin" />}
                                Invia richiesta
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Tenant ID ─────────────────────────────────────────────── */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                    ID Tenant
                </p>
                <code className="text-xs font-mono text-gray-600 dark:text-gray-300 break-all">
                    {tenant.id}
                </code>
            </div>

            {/* Tenant Edit Modal */}
            {tenantToEdit && (
                <TenantEditModal
                    tenant={tenantToEdit}
                    isOpen={!!tenantToEdit}
                    onClose={() => setTenantToEdit(null)}
                    onSave={handleSaveTenant}
                    isSaving={isSavingTenant}
                    canEditFeatures={isSuperAdmin || isAdmin}
                />
            )}
        </div>
    );
};

export default MyTenantDetailPage;
