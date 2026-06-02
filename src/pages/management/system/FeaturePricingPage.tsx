/**
 * FeaturePricingPage
 *
 * Pagina per ADMIN/SUPER_ADMIN per gestire i prezzi delle funzionalità.
 * Supporta prezzi mensili, annuali, note e pricing a fasce (tiered).
 *
 * @module pages/management/system/FeaturePricingPage
 * @project 69 - Feature Management + Pricing Admin
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Tag,
    Euro,
    Save,
    RefreshCw,
    AlertCircle,
    Loader2,
    ChevronDown,
    ChevronUp,
    Plus,
    Trash2,
    Info,
    CheckCircle,
    Bell,
    Check,
    X,
    Clock,
    Edit2,
    Building2,
    Calendar,
} from 'lucide-react';
import { DatePickerElegante } from '../../../components/ui/DatePickerElegante';
import { managementApi } from '../api';
import type { FeatureCatalogEntry, FeatureCategoryDef, FeaturePricing, PricingTier, FeatureSubscription } from '../types';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../hooks/useToast';

// ─── Types ────────────────────────────────────────────────────────────────────

type PricingDraft = {
    price: string;
    priceYearly: string;
    currency: string;
    billingCycle: 'monthly' | 'yearly';
    note: string;
    tiers: TierDraft[];
};

type TierDraft = {
    upToQuantity: string; // stringa per input, '' = illimitato
    pricePerUnit: string;
    label: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pricingToForm(pricing: FeaturePricing | null): PricingDraft {
    return {
        price: pricing?.price?.toString() ?? '0',
        priceYearly: pricing?.priceYearly?.toString() ?? '0',
        currency: pricing?.currency ?? 'EUR',
        billingCycle: pricing?.billingCycle ?? 'monthly',
        note: pricing?.note ?? '',
        tiers: (pricing?.tiers ?? []).map(t => ({
            upToQuantity: t.upToQuantity != null ? t.upToQuantity.toString() : '',
            pricePerUnit: t.pricePerUnit.toString(),
            label: t.label ?? '',
        })),
    };
}

function formToPricing(draft: PricingDraft): FeaturePricing {
    const tiers: PricingTier[] = draft.tiers
        .filter(t => t.pricePerUnit !== '')
        .map(t => ({
            upToQuantity: t.upToQuantity === '' ? null : parseInt(t.upToQuantity, 10),
            pricePerUnit: parseFloat(t.pricePerUnit) || 0,
            label: t.label || undefined,
        }));

    return {
        price: parseFloat(draft.price) || 0,
        priceYearly: parseFloat(draft.priceYearly) || 0,
        currency: draft.currency,
        billingCycle: draft.billingCycle,
        note: draft.note || undefined,
        tiers: tiers.length > 0 ? tiers : undefined,
    };
}

const CATEGORY_COLORS: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200',
    teal: 'bg-teal-50 border-teal-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
    gray: 'bg-gray-50 border-gray-200',
    amber: 'bg-amber-50 border-amber-200',
    indigo: 'bg-indigo-50 border-indigo-200',
    red: 'bg-red-50 border-red-200',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const TierEditor: React.FC<{
    tiers: TierDraft[];
    onChange: (tiers: TierDraft[]) => void;
}> = ({ tiers, onChange }) => {
    const addTier = () => {
        onChange([...tiers, { upToQuantity: '', pricePerUnit: '0', label: '' }]);
    };

    const removeTier = (idx: number) => {
        onChange(tiers.filter((_, i) => i !== idx));
    };

    const updateTier = (idx: number, field: keyof TierDraft, value: string) => {
        onChange(tiers.map((t, i) => i === idx ? { ...t, [field]: value } : t));
    };

    return (
        <div className="mt-2 space-y-2">
            {tiers.map((tier, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-200">
                    <div className="flex-1 grid grid-cols-3 gap-2">
                        <div>
                            <label className="text-xs text-gray-500 block mb-0.5">Fino a quantità</label>
                            <input
                                type="number"
                                value={tier.upToQuantity}
                                onChange={(e) => updateTier(idx, 'upToQuantity', e.target.value)}
                                placeholder="∞ illimitato"
                                min="1"
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-0.5">Prezzo/unità (€)</label>
                            <input
                                type="number"
                                value={tier.pricePerUnit}
                                onChange={(e) => updateTier(idx, 'pricePerUnit', e.target.value)}
                                step="0.01"
                                min="0"
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-0.5">Etichetta</label>
                            <input
                                type="text"
                                value={tier.label}
                                onChange={(e) => updateTier(idx, 'label', e.target.value)}
                                placeholder="es. Prime 5 incluse"
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => removeTier(idx)}
                        className="p-1.5 text-red-400 hover:text-red-600 rounded transition-colors shrink-0"
                        title="Rimuovi fascia"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            ))}
            <button
                onClick={addTier}
                className="inline-flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 font-medium"
            >
                <Plus className="h-3.5 w-3.5" />
                Aggiungi fascia di prezzo
            </button>
            {tiers.length > 0 && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Lascia "fino a" vuoto per l'ultima fascia = illimitato
                </p>
            )}
        </div>
    );
};

// ─── Main FeatureRow ──────────────────────────────────────────────────────────

const FeatureRow: React.FC<{
    feature: FeatureCatalogEntry;
    draft: PricingDraft;
    onChange: (draft: PricingDraft) => void;
    isDirty: boolean;
}> = ({ feature, draft, onChange, isDirty }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className={`bg-white rounded-lg border transition-all ${isDirty ? 'border-violet-300 shadow-sm' : 'border-gray-200'}`}>
            {/* Row header */}
            <div className="flex items-center gap-3 px-4 py-3">
                <span className="text-xl w-7 text-center shrink-0">{feature.icon}</span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900">{feature.label}</span>
                        {isDirty && (
                            <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-medium">modificato</span>
                        )}
                        {draft.tiers.length > 0 && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                                {draft.tiers.length} fasce
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{feature.description}</p>
                </div>

                {/* Quick price inputs */}
                <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1">
                        <label className="text-xs text-gray-500 whitespace-nowrap">€/mese</label>
                        <input
                            type="number"
                            value={draft.price}
                            onChange={(e) => onChange({ ...draft, price: e.target.value })}
                            step="0.01"
                            min="0"
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
                        />
                    </div>
                    <div className="flex items-center gap-1">
                        <label className="text-xs text-gray-500 whitespace-nowrap">€/anno</label>
                        <input
                            type="number"
                            value={draft.priceYearly}
                            onChange={(e) => onChange({ ...draft, priceYearly: e.target.value })}
                            step="0.01"
                            min="0"
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
                        />
                    </div>
                    <button
                        onClick={() => setExpanded(v => !v)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
                        title="Espandi opzioni avanzate"
                    >
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            {/* Advanced options (expanded) */}
            {expanded && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">Valuta</label>
                            <select
                                value={draft.currency}
                                onChange={(e) => onChange({ ...draft, currency: e.target.value })}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
                            >
                                <option value="EUR">EUR (€)</option>
                                <option value="USD">USD ($)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">Ciclo principale</label>
                            <select
                                value={draft.billingCycle}
                                onChange={(e) => onChange({ ...draft, billingCycle: e.target.value as 'monthly' | 'yearly' })}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
                            >
                                <option value="monthly">Mensile</option>
                                <option value="yearly">Annuale</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">Nota (opzionale, es. "Incluso nel piano base")</label>
                        <input
                            type="text"
                            value={draft.note}
                            onChange={(e) => onChange({ ...draft, note: e.target.value })}
                            placeholder="es. Incluso nel piano Professional"
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
                        />
                    </div>
                    {/* Tiered pricing */}
                    <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">
                            Pricing a fasce{' '}
                            <span className="font-normal text-gray-400">(es. prime 5 attivazioni incluse, poi 10€ l'una)</span>
                        </label>
                        <TierEditor
                            tiers={draft.tiers}
                            onChange={(tiers) => onChange({ ...draft, tiers })}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const FeaturePricingPage: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const userRoleType = user?.roleType ?? '';
    const userRolesArr = user?.roles ?? [];
    const userGlobalRole = (user as { globalRole?: string } | null)?.globalRole ?? '';
    const isSuperAdmin = userRoleType === 'SUPER_ADMIN' || userRolesArr.includes('SUPER_ADMIN') || userGlobalRole === 'SUPER_ADMIN';
    const isAdmin = isSuperAdmin || userRoleType === 'ADMIN' || userRolesArr.includes('ADMIN') || userGlobalRole === 'ADMIN';

    const [features, setFeatures] = useState<FeatureCatalogEntry[]>([]);
    const [categories, setCategories] = useState<FeatureCategoryDef[]>([]);
    const [drafts, setDrafts] = useState<Record<string, PricingDraft>>({});
    const [originalPricing, setOriginalPricing] = useState<Record<string, FeaturePricing | null>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());

    // Subscriptions tab
    const [activeTab, setActiveTab] = useState<'pricing' | 'subscriptions'>('pricing');
    const [subscriptions, setSubscriptions] = useState<FeatureSubscription[]>([]);
    const [subsLoading, setSubsLoading] = useState(false);
    const [subsError, setSubsError] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [subsFilterStatus, setSubsFilterStatus] = useState<'all' | 'pending' | 'active' | 'rejected'>('all');
    // Tenant groups collapsibili: Set degli ID tenant collassati
    const [collapsedTenants, setCollapsedTenants] = useState<Set<string>>(new Set());

    const toggleTenantCollapse = (tenantId: string) => {
        setCollapsedTenants(prev => {
            const next = new Set(prev);
            if (next.has(tenantId)) next.delete(tenantId);
            else next.add(tenantId);
            return next;
        });
    };

    // Inline editing for subscriptions
    const [editingSubId, setEditingSubId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState<{ validUntil: string; customPrice: string }>({ validUntil: '', customPrice: '' });
    const [savingEdit, setSavingEdit] = useState(false);

    const loadCatalog = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await managementApi.getFeatureCatalog();
            const featureList = res.data?.features ?? [];
            const categoryList = res.data?.categories ?? [];
            setFeatures(featureList);
            setCategories(categoryList);

            const origMap: Record<string, FeaturePricing | null> = {};
            const draftMap: Record<string, PricingDraft> = {};
            featureList.forEach(f => {
                origMap[f.key] = f.pricing;
                draftMap[f.key] = pricingToForm(f.pricing);
            });
            setOriginalPricing(origMap);
            setDrafts(draftMap);
        } catch {
            setError('Errore nel caricamento del catalogo funzionalità');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCatalog();
    }, [loadCatalog]);

    const loadSubscriptions = useCallback(async () => {
        setSubsLoading(true);
        setSubsError(null);
        try {
            const res = await managementApi.getFeatureSubscriptions();
            setSubscriptions(res.data ?? []);
        } catch {
            setSubsError('Errore nel caricamento delle sottoscrizioni');
        } finally {
            setSubsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'subscriptions') loadSubscriptions();
    }, [activeTab, loadSubscriptions]);

    const handleApprove = async (id: string) => {
        setProcessingId(id);
        try {
            await managementApi.approveFeatureSubscription(id);
            showToast({ message: 'Funzionalità attivata con successo', type: 'success' });
            loadSubscriptions();
        } catch {
            showToast({ message: 'Errore nell\'approvazione', type: 'error' });
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id: string) => {
        setProcessingId(id);
        try {
            await managementApi.rejectFeatureSubscription(id);
            showToast({ message: 'Richiesta rifiutata', type: 'success' });
            loadSubscriptions();
        } catch {
            showToast({ message: 'Errore nel rifiuto della richiesta', type: 'error' });
        } finally {
            setProcessingId(null);
        }
    };

    const handleStartEdit = (sub: FeatureSubscription) => {
        const config = sub.config as Record<string, unknown> | null;
        setEditDraft({
            validUntil: sub.validUntil ? new Date(sub.validUntil).toISOString().split('T')[0] : '',
            customPrice: config?.customPrice !== undefined ? String(config.customPrice) : '',
        });
        setEditingSubId(sub.id);
    };

    const handleCancelEdit = () => {
        setEditingSubId(null);
        setEditDraft({ validUntil: '', customPrice: '' });
    };

    const handleSaveSubscriptionEdit = async (sub: FeatureSubscription) => {
        setSavingEdit(true);
        try {
            const existingConfig = (sub.config as Record<string, unknown>) ?? {};
            const newConfig: Record<string, unknown> = { ...existingConfig };
            if (editDraft.customPrice !== '') {
                newConfig.customPrice = parseFloat(editDraft.customPrice);
            } else {
                delete newConfig.customPrice;
            }
            await managementApi.setTenantFeature(sub.tenantId, sub.featureKey, {
                isEnabled: sub.isEnabled,
                validUntil: editDraft.validUntil || null,
                config: newConfig,
            });
            showToast({ message: 'Sottoscrizione aggiornata con successo', type: 'success' });
            setEditingSubId(null);
            loadSubscriptions();
        } catch {
            showToast({ message: 'Errore nel salvataggio', type: 'error' });
        } finally {
            setSavingEdit(false);
        }
    };

    const handleSaveAll = async () => {
        if (!isAdmin) return;
        setSaving(true);
        const updates: Record<string, FeaturePricing> = {};
        Object.entries(drafts).forEach(([key, draft]) => {
            updates[key] = formToPricing(draft);
        });
        try {
            await managementApi.updateFeaturePricing(updates);
            // Mark all as saved
            setSavedKeys(new Set(Object.keys(drafts)));
            // Update original to reflect saved state
            setOriginalPricing(Object.fromEntries(
                Object.entries(drafts).map(([k, d]) => [k, formToPricing(d)])
            ));
            showToast({ message: 'Tutti i prezzi salvati con successo', type: 'success' });
        } catch {
            showToast({ message: 'Errore nel salvataggio dei prezzi', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleSaveFeature = async (featureKey: string) => {
        if (!isAdmin) return;
        setSaving(true);
        try {
            await managementApi.updateFeaturePricing({
                [featureKey]: formToPricing(drafts[featureKey]),
            });
            setSavedKeys(prev => new Set([...Array.from(prev), featureKey]));
            setOriginalPricing(prev => ({
                ...prev,
                [featureKey]: formToPricing(drafts[featureKey]),
            }));
            showToast({ message: 'Prezzo salvato con successo', type: 'success' });
        } catch {
            showToast({ message: 'Errore nel salvataggio del prezzo', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const isDirty = (featureKey: string) => {
        const orig = originalPricing[featureKey];
        const current = formToPricing(drafts[featureKey] ?? pricingToForm(null));
        return JSON.stringify(orig) !== JSON.stringify(current);
    };

    const dirtyCount = features.filter(f => isDirty(f.key)).length;

    if (!isAdmin) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-center">
                    <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
                    <p className="text-red-700 font-medium">Accesso negato</p>
                    <p className="text-red-600 text-sm mt-1">Solo ADMIN e SUPER_ADMIN possono gestire i prezzi.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
                <span className="ml-3 text-gray-600">Caricamento catalogo prezzi...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                    <span className="text-red-700">{error}</span>
                    <button onClick={loadCatalog} className="ml-auto text-sm text-red-600 hover:text-red-800 underline">
                        Riprova
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Tag className="w-7 h-7 text-violet-600" />
                        Funzionalità
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm">
                        Configura prezzi mensili, annuali e fasce di utilizzo per ciascuna funzionalità.
                        {dirtyCount > 0 && (
                            <span className="ml-2 text-amber-600 font-medium">
                                {dirtyCount} funzionalità modificate
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadCatalog}
                        disabled={loading}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Ricarica"
                    >
                        <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleSaveAll}
                        disabled={saving || dirtyCount === 0}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                        {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        {saving ? 'Salvataggio...' : `Salva tutto${dirtyCount > 0 ? ` (${dirtyCount})` : ''}`}
                    </button>
                </div>
            </div>

            {/* Info banner */}
            <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <Info className="h-5 w-5 text-violet-600 shrink-0 mt-0.5" />
                <div className="text-sm text-violet-700">
                    <strong>Pricing a fasce</strong>: usa i pannelli espandibili (▼) per configurare prezzi progressivi.
                    Esempio: prime 5 attivazioni desktop gratuite, poi €10/mese ciascuna. Lascia "fino a quantità" vuoto per la fascia finale = illimitato.
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('pricing')}
                    className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'pricing'
                        ? 'bg-white border border-gray-200 border-b-white text-violet-700 -mb-px'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <span className="flex items-center gap-2">
                        <Euro className="h-4 w-4" />
                        Prezzi
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('subscriptions')}
                    className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'subscriptions'
                        ? 'bg-white border border-gray-200 border-b-white text-violet-700 -mb-px'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <span className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Sottoscrizioni
                        {subscriptions.filter(s => s.notes === 'PENDING_ACTIVATION').length > 0 && (
                            <span className="bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                                {subscriptions.filter(s => s.notes === 'PENDING_ACTIVATION').length}
                            </span>
                        )}
                    </span>
                </button>
            </div>

            {/* Subscriptions tab */}
            {activeTab === 'subscriptions' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        {/* Status filter */}
                        <div className="flex items-center gap-1 text-sm">
                            {(['all', 'pending', 'active', 'rejected'] as const).map(s => (
                                <button
                                    key={s}
                                    onClick={() => setSubsFilterStatus(s)}
                                    className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${subsFilterStatus === s
                                        ? 'bg-violet-100 text-violet-700'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    {s === 'all' ? 'Tutte' : s === 'pending' ? 'In attesa' : s === 'active' ? 'Attive' : 'Rifiutate'}
                                    {s !== 'all' && (() => {
                                        const count = subscriptions.filter(sub =>
                                            s === 'pending' ? sub.notes === 'PENDING_ACTIVATION' :
                                                s === 'active' ? sub.isEnabled :
                                                    s === 'rejected' ? sub.notes === 'REJECTED' : true
                                        ).length;
                                        return count > 0 ? (
                                            <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${s === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                s === 'active' ? 'bg-green-100 text-green-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>{count}</span>
                                        ) : null;
                                    })()}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={loadSubscriptions}
                            disabled={subsLoading}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Ricarica"
                        >
                            <RefreshCw className={`h-4 w-4 ${subsLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {subsLoading && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
                            <span className="ml-3 text-gray-500 text-sm">Caricamento...</span>
                        </div>
                    )}

                    {subsError && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                            <span className="text-red-700 text-sm">{subsError}</span>
                        </div>
                    )}

                    {!subsLoading && !subsError && (() => {
                        // Filter by status
                        const filtered = subscriptions.filter(sub => {
                            if (subsFilterStatus === 'pending') return sub.notes === 'PENDING_ACTIVATION';
                            if (subsFilterStatus === 'active') return sub.isEnabled;
                            if (subsFilterStatus === 'rejected') return sub.notes === 'REJECTED';
                            return true;
                        });

                        if (filtered.length === 0) {
                            return (
                                <div className="text-center py-12 text-gray-400">
                                    <Bell className="h-10 w-10 mx-auto mb-3 opacity-40" />
                                    <p className="text-sm">Nessuna sottoscrizione trovata</p>
                                </div>
                            );
                        }

                        // Group by tenant
                        const byTenant = filtered.reduce<Record<string, { name: string; slug: string; subs: FeatureSubscription[] }>>((acc, sub) => {
                            const tid = sub.tenantId;
                            if (!acc[tid]) {
                                acc[tid] = { name: sub.tenant?.name ?? sub.tenantId, slug: sub.tenant?.slug ?? '', subs: [] };
                            }
                            acc[tid].subs.push(sub);
                            return acc;
                        }, {});

                        return Object.entries(byTenant).map(([tenantId, group]) => {
                            // ── Calcolo totale billing per tenant ────────────────
                            let monthlyTotal = 0;
                            let yearlyTotal = 0;
                            let hasCustomPrice = false;
                            group.subs.filter(s => s.isEnabled).forEach(sub => {
                                const featureMeta = features.find(f => f.key === sub.featureKey);
                                const config = sub.config as Record<string, unknown> | null;
                                const cycle = (config?.billingCycle as string) ?? 'monthly';
                                const custom = config?.customPrice as number | undefined;
                                const catalogPrice = cycle === 'yearly' && featureMeta?.pricing?.priceYearly
                                    ? featureMeta.pricing.priceYearly
                                    : featureMeta?.pricing?.price;
                                const price = custom !== undefined ? custom : (catalogPrice ?? 0);
                                if (custom !== undefined) hasCustomPrice = true;
                                if (cycle === 'yearly') yearlyTotal += price;
                                else monthlyTotal += price;
                            });
                            const tenantObj = group.subs[0]?.tenant;

                            return (
                                <div key={tenantId} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                    {/* Tenant header - cliccabile per collassare */}
                                    <button
                                        type="button"
                                        onClick={() => toggleTenantCollapse(tenantId)}
                                        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100 hover:bg-gray-100 transition-colors text-left"
                                    >
                                        <Building2 className="h-4 w-4 text-violet-500 shrink-0" />
                                        <span className="font-semibold text-gray-900 text-sm">{group.name}</span>
                                        {group.slug && <span className="text-gray-400 text-xs font-mono">({group.slug})</span>}
                                        {tenantObj?.subscriptionStatus && tenantObj.subscriptionStatus !== 'active' && (
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tenantObj.subscriptionStatus === 'trial' ? 'bg-blue-100 text-blue-700' : tenantObj.subscriptionStatus === 'past_due' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                {tenantObj.subscriptionStatus}
                                            </span>
                                        )}
                                        <span className="ml-auto flex items-center gap-3 text-xs text-gray-500">
                                            {/* Billing totals */}
                                            {(monthlyTotal > 0 || yearlyTotal > 0) && (
                                                <span className="flex items-center gap-1.5 bg-violet-50 text-violet-700 px-2.5 py-1 rounded-full font-medium border border-violet-100">
                                                    <Euro className="h-3 w-3" />
                                                    {monthlyTotal > 0 && <span>€ {monthlyTotal.toFixed(2)}/mese</span>}
                                                    {monthlyTotal > 0 && yearlyTotal > 0 && <span className="text-violet-400">·</span>}
                                                    {yearlyTotal > 0 && <span>€ {yearlyTotal.toFixed(2)}/anno</span>}
                                                    {hasCustomPrice && <span title="Prezzi personalizzati attivi" className="text-amber-500">⚡</span>}
                                                </span>
                                            )}
                                            <span className="bg-gray-200 px-2 py-0.5 rounded-full">
                                                {group.subs.length} funzionalità
                                            </span>
                                            {collapsedTenants.has(tenantId)
                                                ? <ChevronDown className="h-4 w-4 text-gray-400" />
                                                : <ChevronUp className="h-4 w-4 text-gray-400" />
                                            }
                                        </span>
                                    </button>

                                    {/* Feature rows - visibili se non collassato */}
                                    {!collapsedTenants.has(tenantId) && (
                                        <div className="divide-y divide-gray-50">
                                            {group.subs.map(sub => {
                                                const featureMeta = features.find(f => f.key === sub.featureKey);
                                                const config = sub.config as Record<string, unknown> | null;
                                                const billingCycle = (config?.billingCycle as string) ?? 'monthly';
                                                const customPrice = config?.customPrice as number | undefined;
                                                const catalogPrice = billingCycle === 'yearly' && featureMeta?.pricing?.priceYearly
                                                    ? featureMeta.pricing.priceYearly
                                                    : featureMeta?.pricing?.price;
                                                const displayPrice = customPrice !== undefined ? customPrice : catalogPrice;
                                                const isPending = sub.notes === 'PENDING_ACTIVATION';
                                                const isActive = sub.isEnabled;
                                                const isRejected = sub.notes === 'REJECTED';
                                                const isProcessing = processingId === sub.id;
                                                const isEditing = editingSubId === sub.id;

                                                return (
                                                    <div key={sub.id} className="px-4 py-3">
                                                        <div className="flex items-center gap-3 flex-wrap">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="font-medium text-gray-800 text-sm">
                                                                        {featureMeta?.icon} {featureMeta?.label ?? sub.featureKey}
                                                                    </span>
                                                                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${isPending ? 'bg-amber-100 text-amber-700' :
                                                                        isActive ? 'bg-green-100 text-green-700' :
                                                                            isRejected ? 'bg-red-100 text-red-700' :
                                                                                'bg-gray-100 text-gray-600'
                                                                        }`}>
                                                                        {isPending && <Clock className="h-3 w-3" />}
                                                                        {isActive && <Check className="h-3 w-3" />}
                                                                        {isRejected && <X className="h-3 w-3" />}
                                                                        {isPending ? 'In attesa' : isActive ? 'Attiva' : isRejected ? 'Rifiutata' : 'N/D'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-4 mt-0.5 text-xs text-gray-400 flex-wrap">
                                                                    <span>{billingCycle === 'yearly' ? 'Annuale' : 'Mensile'}</span>
                                                                    {displayPrice !== undefined && (
                                                                        <span className={customPrice !== undefined ? 'text-violet-600 font-medium' : ''}>
                                                                            {customPrice !== undefined ? '⚡ ' : ''}
                                                                            € {typeof displayPrice === 'number' ? displayPrice.toFixed(2) : displayPrice}
                                                                            {billingCycle === 'yearly' ? '/anno' : '/mese'}
                                                                            {customPrice !== undefined && <span className="text-gray-400 font-normal"> (prezzo personalizzato)</span>}
                                                                        </span>
                                                                    )}
                                                                    {sub.validUntil && (
                                                                        <span className={`flex items-center gap-1 ${new Date(sub.validUntil) < new Date() ? 'text-red-500' : ''}`}>
                                                                            <Calendar className="h-3 w-3" />
                                                                            Scade: {new Date(sub.validUntil).toLocaleDateString('it-IT')}
                                                                            {new Date(sub.validUntil) < new Date() && ' (scaduta)'}
                                                                        </span>
                                                                    )}
                                                                    <span className="text-gray-300">
                                                                        Aggiunta: {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString('it-IT') : '—'}
                                                                    </span>
                                                                    {/* Riconciliazione pro-rata: se attivata a metà mese, mostra l'importo pro-rated */}
                                                                    {sub.isEnabled && sub.createdAt && displayPrice && billingCycle === 'monthly' && (() => {
                                                                        const activatedAt = new Date(sub.createdAt);
                                                                        const dayOfMonth = activatedAt.getDate();
                                                                        const daysInMonth = new Date(activatedAt.getFullYear(), activatedAt.getMonth() + 1, 0).getDate();
                                                                        if (dayOfMonth > 1) {
                                                                            const remainingDays = daysInMonth - dayOfMonth + 1;
                                                                            const proRated = ((displayPrice as number) / daysInMonth) * remainingDays;
                                                                            return (
                                                                                <span className="flex items-center gap-1 text-amber-600 font-medium" title="Importo pro-rata per il primo mese parziale">
                                                                                    ⚖️ Pro-rata 1° mese: € {proRated.toFixed(2)}
                                                                                    <span className="text-gray-400 font-normal">({remainingDays}/{daysInMonth}gg)</span>
                                                                                </span>
                                                                            );
                                                                        }
                                                                        return null;
                                                                    })()}
                                                                </div>
                                                            </div>

                                                            {/* Action buttons */}
                                                            {!isEditing && (
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    {isPending && (
                                                                        <>
                                                                            <button
                                                                                onClick={() => handleReject(sub.id)}
                                                                                disabled={isProcessing}
                                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors disabled:opacity-50"
                                                                            >
                                                                                {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                                                                                Rifiuta
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleApprove(sub.id)}
                                                                                disabled={isProcessing}
                                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
                                                                            >
                                                                                {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                                                                Approva
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                    <button
                                                                        onClick={() => handleStartEdit(sub)}
                                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-600 hover:text-violet-700 bg-gray-50 hover:bg-violet-50 border border-gray-200 hover:border-violet-200 rounded-lg transition-colors"
                                                                        title="Modifica prezzo / scadenza"
                                                                    >
                                                                        <Edit2 className="h-3.5 w-3.5" />
                                                                        Modifica
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Inline edit panel */}
                                                        {isEditing && (
                                                            <div className="mt-3 p-3 bg-violet-50 border border-violet-200 rounded-lg">
                                                                <div className="flex items-end gap-3 flex-wrap">
                                                                    <div className="flex-1 min-w-[150px]">
                                                                        <label className="block text-xs font-medium text-violet-700 mb-1">
                                                                            Prezzo personalizzato ({billingCycle === 'yearly' ? '€/anno' : '€/mese'})
                                                                        </label>
                                                                        <div className="relative">
                                                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                                                                            <input
                                                                                type="number"
                                                                                min="0"
                                                                                step="0.01"
                                                                                placeholder={catalogPrice !== undefined ? String(catalogPrice) : '0.00'}
                                                                                value={editDraft.customPrice}
                                                                                onChange={e => setEditDraft(d => ({ ...d, customPrice: e.target.value }))}
                                                                                className="w-full pl-7 pr-3 py-1.5 text-sm border border-violet-300 rounded-lg focus:ring-2 focus:ring-violet-400 focus:border-violet-400"
                                                                            />
                                                                        </div>
                                                                        <p className="text-xs text-gray-400 mt-0.5">
                                                                            {customPrice !== undefined ? 'Personalizzato attivo' : `Catalogo: € ${catalogPrice?.toFixed(2) ?? '—'}`}. Lascia vuoto per usare il prezzo catalogo.
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex-1 min-w-[150px]">
                                                                        <label className="block text-xs font-medium text-violet-700 mb-1">
                                                                            Data scadenza
                                                                        </label>
                                                                        <DatePickerElegante
                                                                            value={editDraft.validUntil}
                                                                            onChange={(v: Date | null) => setEditDraft(d => ({ ...d, validUntil: v ? v.toISOString().split('T')[0] : '' }))}
                                                                            placeholder="Nessuna scadenza"
                                                                            className="w-full text-sm"
                                                                        />
                                                                        <p className="text-xs text-gray-400 mt-0.5">Lascia vuoto per nessuna scadenza.</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 shrink-0">
                                                                        <button
                                                                            onClick={handleCancelEdit}
                                                                            disabled={savingEdit}
                                                                            className="px-3 py-1.5 text-xs text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                                                                        >
                                                                            Annulla
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleSaveSubscriptionEdit(sub)}
                                                                            disabled={savingEdit}
                                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors disabled:opacity-50"
                                                                        >
                                                                            {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                                                            Salva
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        });
                    })()}
                </div>
            )}

            {/* Pricing tab content */}
            {activeTab === 'pricing' && (<>
                {categories.map((cat) => {
                    const featuresInCat = features.filter(f => f.category === cat.key);
                    if (!featuresInCat.length) return null;

                    return (
                        <div key={cat.key} className={`rounded-xl border overflow-hidden ${CATEGORY_COLORS[cat.color] ?? CATEGORY_COLORS.gray}`}>
                            <div className="px-4 py-3 border-b border-black/5 flex items-center gap-2">
                                <span className="text-lg">{cat.icon}</span>
                                <h2 className="font-semibold text-gray-800 text-sm">{cat.label}</h2>
                                <span className="ml-auto text-xs text-gray-500">
                                    {featuresInCat.length} funzionalità
                                </span>
                            </div>
                            <div className="p-3 space-y-2">
                                {featuresInCat.map(feature => {
                                    const draft = drafts[feature.key];
                                    if (!draft) return null;
                                    const dirty = isDirty(feature.key);
                                    const justSaved = savedKeys.has(feature.key) && !dirty;

                                    return (
                                        <div key={feature.key} className="relative">
                                            <FeatureRow
                                                feature={feature}
                                                draft={draft}
                                                onChange={(newDraft) => {
                                                    setDrafts(prev => ({ ...prev, [feature.key]: newDraft }));
                                                    setSavedKeys(prev => {
                                                        const s = new Set(Array.from(prev));
                                                        s.delete(feature.key);
                                                        return s;
                                                    });
                                                }}
                                                isDirty={dirty}
                                            />
                                            {justSaved && (
                                                <div className="absolute top-3 right-12 flex items-center gap-1 text-green-600 text-xs font-medium">
                                                    <CheckCircle className="h-3.5 w-3.5" />
                                                    Salvato
                                                </div>
                                            )}
                                            {dirty && (
                                                <button
                                                    onClick={() => handleSaveFeature(feature.key)}
                                                    disabled={saving}
                                                    className="absolute top-2 right-10 text-xs text-violet-600 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 border border-violet-200 px-2 py-1 rounded transition-colors font-medium"
                                                    title="Salva solo questa funzionalità"
                                                >
                                                    Salva
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {/* Bottom save bar */}
                {dirtyCount > 0 && (
                    <div className="sticky bottom-4 flex justify-end">
                        <div className="bg-white border border-gray-200 shadow-lg rounded-xl px-4 py-3 flex items-center gap-4">
                            <span className="text-sm text-gray-600">
                                <strong className="text-amber-600">{dirtyCount}</strong> funzionalità con modifiche non salvate
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={loadCatalog}
                                    className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-300 transition-colors"
                                >
                                    Annulla tutto
                                </button>
                                <button
                                    onClick={handleSaveAll}
                                    disabled={saving}
                                    className="inline-flex items-center gap-1.5 text-sm px-4 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 font-medium"
                                >
                                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                    Salva tutto
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>)}
        </div>
    );
};

export default FeaturePricingPage;
