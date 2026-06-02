/**
 * TenantAdminDetailPage
 *
 * Pagina dettaglio tenant per ADMIN/SUPER_ADMIN: /management/tenants/:id
 * Carica il tenant tramite l'endpoint admin (getTenant), mostra il catalogo funzionalità
 * con toggle individuali e preset di configurazione rapida.
 *
 * @project 69 - Feature Management Admin Detail
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
    CheckCircle2,
    XCircle,
    Crown,
    Edit2,
    Users,
    Zap,
} from 'lucide-react';
import { managementApi } from '../api';
import type { Tenant, TenantFeatureRecord, FeatureCatalogEntry, FeatureCategoryDef, TenantSettings } from '../types';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../hooks/useToast';
import TenantEditModal from '../components/TenantEditModal';

// ─── Constants ────────────────────────────────────────────────────────────────

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

/**
 * Preset di configurazione rapida delle funzionalità
 * Usa le chiavi del catalogo ufficiale (featureCatalog.js)
 */
const FEATURE_PRESETS = [
    {
        id: 'medica',
        name: '🏥 Element Medica',
        description: 'Poliambulatorio, visite, sorveglianza sanitaria',
        features: ['BRANCH_MEDICA', 'MDL_BASE', 'MDL_SORVEGLIANZA'],
        color: 'bg-teal-50 border-teal-200 hover:bg-teal-100 dark:bg-teal-900/20 dark:border-teal-800',
        textColor: 'text-teal-800 dark:text-teal-200',
    },
    {
        id: 'formazione',
        name: '🎓 Element Sicurezza',
        description: 'Corsi di formazione, attestati, registri presenze',
        features: ['BRANCH_FORMAZIONE'],
        color: 'bg-blue-50 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-800',
        textColor: 'text-blue-800 dark:text-blue-200',
    },
    {
        id: 'completo',
        name: '⚡ Pacchetto Completo',
        description: 'Medica + Formazione + Fatturazione + PEC',
        features: ['BRANCH_MEDICA', 'BRANCH_FORMAZIONE', 'MDL_BASE', 'MDL_SORVEGLIANZA', 'FATTURAZIONE_ELETTRONICA', 'PEC_INTEGRATION', 'MULTI_SEDE'],
        color: 'bg-purple-50 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/20 dark:border-purple-800',
        textColor: 'text-purple-800 dark:text-purple-200',
    },
    {
        id: 'base',
        name: '📦 Solo Base',
        description: 'Nessuna funzionalità aggiuntiva attiva',
        features: [] as string[],
        color: 'bg-gray-50 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-600',
        textColor: 'text-gray-700 dark:text-gray-300',
    },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(pricing: FeatureCatalogEntry['pricing']): string {
    if (!pricing) return '—';
    if (pricing.price === 0) return 'Incluso';
    return `€ ${pricing.price.toFixed(2)}/mese`;
}

const BILLING_PLAN_COLORS: Record<string, string> = {
    enterprise: 'bg-purple-100 text-purple-800',
    professional: 'bg-blue-100 text-blue-800',
    basic: 'bg-gray-100 text-gray-800',
    free: 'bg-green-100 text-green-800',
};

// ─── Component ───────────────────────────────────────────────────────────────

const TenantAdminDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();

    const userRoleType = user?.roleType ?? '';
    const userRolesArr = user?.roles ?? [];
    const userGlobalRole = (user as { globalRole?: string } | null)?.globalRole ?? '';
    const isSuperAdmin = userRoleType === 'SUPER_ADMIN' || userRolesArr.includes('SUPER_ADMIN') || userGlobalRole === 'SUPER_ADMIN';
    const isAdmin = isSuperAdmin || userRoleType === 'ADMIN' || userRolesArr.includes('ADMIN') || userGlobalRole === 'ADMIN';
    const canToggleFeatures = isAdmin;

    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [tenantFeatures, setTenantFeatures] = useState<TenantFeatureRecord[]>([]);
    const [catalogFeatures, setCatalogFeatures] = useState<FeatureCatalogEntry[]>([]);
    const [catalogCategories, setCatalogCategories] = useState<FeatureCategoryDef[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [togglingKey, setTogglingKey] = useState<string | null>(null);
    const [applyingPreset, setApplyingPreset] = useState<string | null>(null);
    const [tenantToEdit, setTenantToEdit] = useState<Tenant | null>(null);
    const [isSavingTenant, setIsSavingTenant] = useState(false);

    const loadData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const [tenantRes, catalogRes, featuresRes] = await Promise.all([
                managementApi.getTenant(id),
                managementApi.getFeatureCatalog(),
                managementApi.getTenantFeatures(id),
            ]);
            setTenant(tenantRes.data ?? null);
            setCatalogFeatures(catalogRes.data?.features ?? []);
            setCatalogCategories(catalogRes.data?.categories ?? []);
            setTenantFeatures(featuresRes.data ?? []);
        } catch {
            setError('Errore nel caricamento dei dati del tenant');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleToggleFeature = async (featureKey: string, currentEnabled: boolean) => {
        if (!id || !canToggleFeatures) return;
        setTogglingKey(featureKey);
        try {
            await managementApi.setTenantFeature(id, featureKey, { isEnabled: !currentEnabled });
            setTenantFeatures(prev =>
                prev.some(f => f.featureKey === featureKey)
                    ? prev.map(f => f.featureKey === featureKey ? { ...f, isEnabled: !currentEnabled } : f)
                    : [...prev, {
                        id: featureKey,
                        tenantId: id,
                        featureKey,
                        isEnabled: !currentEnabled,
                        tier: null,
                        config: null,
                        validFrom: new Date().toISOString(),
                        validUntil: null,
                        usageCount: 0,
                        usageLimit: null,
                        lastUsedAt: null,
                        enabledBy: user?.id ?? null,
                        enabledAt: new Date().toISOString(),
                        notes: null,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    } as TenantFeatureRecord]
            );
            showToast({
                message: `Funzionalità ${!currentEnabled ? 'abilitata' : 'disabilitata'} con successo`,
                type: 'success',
            });
        } catch {
            showToast({ message: 'Errore nell\'aggiornamento della funzionalità', type: 'error' });
        } finally {
            setTogglingKey(null);
        }
    };

    const handleApplyPreset = async (preset: typeof FEATURE_PRESETS[number]) => {
        if (!id || !canToggleFeatures) return;
        setApplyingPreset(preset.id);
        try {
            const allKeys = catalogFeatures.map(f => f.key);
            const presetSet = new Set(preset.features);
            const bulkUpdates = allKeys.map(key => ({
                featureKey: key,
                isEnabled: presetSet.has(key),
            }));
            await managementApi.bulkSetTenantFeatures(id, bulkUpdates);
            await loadData();
            showToast({
                message: `Preset "${preset.name}" applicato con successo`,
                type: 'success',
            });
        } catch {
            showToast({ message: 'Errore nell\'applicazione del preset', type: 'error' });
        } finally {
            setApplyingPreset(null);
        }
    };

    const handleSaveTenant = async (tenantId: string, data: { name: string; settings: TenantSettings }) => {
        setIsSavingTenant(true);
        try {
            await managementApi.updateTenant(tenantId, data);
            await loadData();
            showToast({ message: 'Tenant aggiornato con successo', type: 'success' });
            setTenantToEdit(null);
        } catch {
            showToast({ message: 'Errore nell\'aggiornamento del tenant', type: 'error' });
            throw new Error('save failed');
        } finally {
            setIsSavingTenant(false);
        }
    };

    // ── Loading / Error ──────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">Caricamento tenant...</span>
            </div>
        );
    }

    if (error || !tenant) {
        return (
            <div className="p-6">
                <button
                    onClick={() => navigate('/management/tenants')}
                    className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4 mr-1.5" />
                    Torna alla lista tenant
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

    // Mappa chiave → TenantFeatureRecord per lookup rapido
    const featureMap = new Map<string, TenantFeatureRecord>(
        tenantFeatures.map((f) => [f.featureKey, f])
    );
    const enabledCount = catalogFeatures.filter((cf) => featureMap.get(cf.key)?.isEnabled).length;

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 pb-10">
            {/* Back button */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/management/tenants')}
                    className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4 mr-1.5" />
                    Torna alla lista tenant
                </button>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate(`/management/tenant-access?tenantId=${tenant.id}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
                    >
                        <Users className="h-4 w-4" />
                        Gestisci Utenti
                    </button>
                    {canToggleFeatures && (
                        <button
                            onClick={() => setTenantToEdit(tenant)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
                        >
                            <Edit2 className="h-4 w-4" />
                            Modifica Tenant
                        </button>
                    )}
                </div>
            </div>

            {/* ── Tenant Header ─────────────────────────────────────────── */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-8">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
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
                            <div>
                                <h1 className="text-2xl font-bold text-white">{tenant.name}</h1>
                                <p className="text-violet-200 text-sm mt-0.5">{tenant.slug}</p>
                                {tenant.domain && (
                                    <p className="text-violet-300 text-xs mt-0.5">{tenant.domain}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
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
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${BILLING_PLAN_COLORS[tenant.billingPlan] || BILLING_PLAN_COLORS.basic}`}>
                                        <Shield className="h-3 w-3" />
                                        Piano {tenant.billingPlan ? tenant.billingPlan.charAt(0).toUpperCase() + tenant.billingPlan.slice(1) : 'Basic'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {tenant.subscriptionStatus && tenant.subscriptionStatus !== 'active' && (
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${tenant.subscriptionStatus === 'trial' ? 'bg-blue-100 text-blue-800' :
                                        tenant.subscriptionStatus === 'past_due' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                    }`}>
                                    {tenant.subscriptionStatus === 'trial' ? 'Trial' :
                                        tenant.subscriptionStatus === 'past_due' ? 'Pag. scaduto' :
                                            tenant.subscriptionStatus === 'suspended' ? 'Sospeso' :
                                                tenant.subscriptionStatus === 'cancelled' ? 'Cancellato' :
                                                    tenant.subscriptionStatus}
                                </span>
                            )}
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${tenant.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                {tenant.isActive ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                                {tenant.isActive ? 'Attivo' : 'Inattivo'}
                            </span>
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
                            {tenant.billingPlan ? tenant.billingPlan.charAt(0).toUpperCase() + tenant.billingPlan.slice(1) : 'Basic'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Piano</p>
                    </div>
                </div>
            </div>

            {/* ── Preset di Configurazione ──────────────────────────────── */}
            {canToggleFeatures && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Zap className="h-5 w-5 text-amber-500" />
                        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50">
                            Preset di Configurazione Rapida
                        </h2>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                            Clicca un preset per abilitare/disabilitare le funzionalità corrispondenti
                        </span>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {FEATURE_PRESETS.map(preset => (
                            <button
                                key={preset.id}
                                onClick={() => handleApplyPreset(preset)}
                                disabled={!!applyingPreset}
                                className={`relative p-3 rounded-xl border text-left transition-all ${preset.color} disabled:opacity-60 disabled:cursor-not-allowed`}
                            >
                                {applyingPreset === preset.id && (
                                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/60 dark:bg-black/40">
                                        <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
                                    </div>
                                )}
                                <div className={`font-semibold text-sm ${preset.textColor}`}>
                                    {preset.name}
                                </div>
                                <div className={`text-xs mt-1 opacity-75 ${preset.textColor}`}>
                                    {preset.description}
                                </div>
                                {preset.features.length > 0 && (
                                    <div className={`text-xs mt-1.5 font-medium opacity-60 ${preset.textColor}`}>
                                        {preset.features.length} funzionalità
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Feature Catalog ───────────────────────────────────────── */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
                        <Tag className="h-5 w-5 text-violet-600" />
                        Funzionalità Disponibili
                    </h2>
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-full">
                        {enabledCount} / {catalogFeatures.length} abilitate
                    </span>
                </div>

                <div className="space-y-4">
                    {catalogCategories.map((cat) => {
                        const featuresInCat = catalogFeatures.filter((f) => f.category === cat.key);
                        if (!featuresInCat.length) return null;
                        const enabledInCat = featuresInCat.filter((f) => featureMap.get(f.key)?.isEnabled).length;

                        return (
                            <div
                                key={cat.key}
                                className={`rounded-xl border overflow-hidden ${CATEGORY_COLOR_MAP[cat.color] ?? CATEGORY_COLOR_MAP.gray}`}
                            >
                                {/* Category header */}
                                <div className="px-4 py-3 border-b border-black/5 dark:border-white/10 flex items-center gap-2">
                                    <span className="text-lg">{cat.icon}</span>
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{cat.label}</h3>
                                    <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                                        {enabledInCat} / {featuresInCat.length} attive
                                    </span>
                                </div>

                                {/* Features list */}
                                <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                    {featuresInCat.map((feature) => {
                                        const record = featureMap.get(feature.key);
                                        const isEnabled = record?.isEnabled ?? false;
                                        const isToggling = togglingKey === feature.key;

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
                                                <div className="text-right shrink-0 min-w-[90px] hidden sm:block">
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
                                                        <p className="text-xs text-green-600 dark:text-green-400 max-w-[90px] text-right">
                                                            {feature.pricing.note}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Toggle */}
                                                {canToggleFeatures ? (
                                                    <button
                                                        onClick={() => handleToggleFeature(feature.key, isEnabled)}
                                                        disabled={isToggling || !!applyingPreset}
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
                                                ) : (
                                                    <div className={`shrink-0 ${isEnabled ? 'text-green-500' : 'text-gray-300'}`}>
                                                        {isEnabled ? (
                                                            <CheckCircle2 className="h-5 w-5" />
                                                        ) : (
                                                            <XCircle className="h-5 w-5" />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Tenant ID ─────────────────────────────────────────────── */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                    ID Tenant
                </p>
                <code className="text-xs font-mono text-gray-600 dark:text-gray-300 break-all">
                    {tenant.id}
                </code>
            </div>

            {/* TenantEditModal */}
            {tenantToEdit && (
                <TenantEditModal
                    tenant={tenantToEdit}
                    isOpen={!!tenantToEdit}
                    onClose={() => setTenantToEdit(null)}
                    onSave={handleSaveTenant}
                    isSaving={isSavingTenant}
                    canEditFeatures={canToggleFeatures}
                />
            )}
        </div>
    );
};

export default TenantAdminDetailPage;
