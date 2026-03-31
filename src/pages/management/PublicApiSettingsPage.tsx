/**
 * PublicApiSettingsPage — P75
 *
 * Gestione chiavi API pubbliche per il sistema embed.
 * - Crea/revoca chiavi API
 * - Configura widget abilitati con filtri per nome (prestazioni, corsi, medici, branche)
 * - Genera snippet embed
 * - Dashboard utilizzo e statistiche
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Key, Plus, Trash2, Copy, Check, ChevronDown, ChevronUp,
    Globe, Code2, AlertTriangle, Eye, EyeOff, Shield, Zap,
    BarChart3, TrendingUp, Settings, Save, X,
} from 'lucide-react';
import api from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import { CRUDButton, CRUDPrimaryButton } from '@/components/ui';
import { useTenantAccess } from '@/hooks/useTenantAccess';
import type { AxiosError } from 'axios';

// ─── Types ──────────────────────────────────────────────────

interface ApiKey {
    id: string;
    name: string;
    key?: string;
    keyPreview: string;
    allowedOrigins: string[];
    enabledWidgets: string[];
    widgetSettings: Record<string, Record<string, string[]>> | null;
    isActive: boolean;
    lastUsedAt: string | null;
    usageCount: number;
    createdAt: string;
}

interface KeyForm {
    name: string;
    allowedOrigins: string;
    enabledWidgets: string[];
    widgetSettings: Record<string, Record<string, string[]>>;
}

interface FeatureStatus {
    isEnabled: boolean;
    configured?: boolean;
    tier: string | null;
    usageCount: number;
    usageLimit: number | null;
    validUntil: string | null;
    isExpired?: boolean;
    config: Record<string, unknown> | null;
    message?: string;
}

interface UsageStats {
    period: { days: number; since: string };
    totalRequests: number;
    byWidget: Record<string, Record<string, number>>;
    byWidgetType: Array<{ widgetType: string; count: number }>;
}

interface WidgetOptions {
    prestazioni: Array<{ id: string; nome: string; branche: string[]; tipo: string }>;
    courses: Array<{ id: string; title: string; category: string }>;
    medici: Array<{ id: string; nome: string; title: string | null }>;
    branche: string[];
    forms: Array<{ id: string; name: string; description: string | null; type: string }>;
}

const WIDGET_OPTIONS = [
    { value: 'booking', label: 'Prenotazioni', icon: '📅', description: 'Slot disponibili e form prenotazione' },
    { value: 'courses', label: 'Corsi', icon: '📚', description: 'Lista corsi e calendari' },
    { value: 'schedules', label: 'Calendari', icon: '🗓️', description: 'Date e posti corsi programmati' },
    { value: 'contact', label: 'Contatti', icon: '✉️', description: 'Form di contatto / preventivo' },
    { value: 'doctors', label: 'Medici', icon: '👨‍⚕️', description: 'Profili medici pubblici' },
    { value: 'specialties', label: 'Specialità', icon: '🏥', description: 'Branche e prestazioni disponibili' },
    { value: 'forms', label: 'Form CMS', icon: '📝', description: 'Form pubblici dal CMS (sondaggi, contatti personalizzati)' },
];

// ─── Helpers ────────────────────────────────────────────────

function CopyButton({ text, label = 'Copia' }: { text: string; label?: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    return (
        <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
            {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
            {copied ? 'Copiato!' : label}
        </button>
    );
}

function CheckboxSelector({ items, selectedIds, onChange, emptyLabel }: {
    items: Array<{ id: string; label: string; sublabel?: string }>;
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    emptyLabel?: string;
}) {
    const [search, setSearch] = useState('');
    if (items.length === 0) return <p className="text-xs text-gray-400 italic">{emptyLabel || 'Nessun elemento disponibile.'}</p>;

    const filtered = search.trim()
        ? items.filter(i => i.label.toLowerCase().includes(search.toLowerCase()) || i.sublabel?.toLowerCase().includes(search.toLowerCase()))
        : items;

    const allFilteredSelected = filtered.length > 0 && filtered.every(i => selectedIds.includes(i.id));

    const handleToggleAll = () => {
        if (allFilteredSelected) {
            const filteredIds = new Set(filtered.map(i => i.id));
            onChange(selectedIds.filter(id => !filteredIds.has(id)));
        } else {
            const merged = new Set([...selectedIds, ...filtered.map(i => i.id)]);
            onChange([...merged]);
        }
    };

    return (
        <div className="space-y-2">
            {items.length > 5 && (
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Cerca..."
                    className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
            )}
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    onClick={handleToggleAll}
                    className="text-[11px] font-medium text-teal-600 hover:text-teal-800 transition-colors"
                >
                    {allFilteredSelected ? 'Deseleziona tutti' : 'Seleziona tutti'}
                </button>
                <span className="text-[11px] text-gray-400">
                    {selectedIds.length}/{items.length} selezionati
                </span>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {filtered.map(item => (
                    <label key={item.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer text-sm">
                        <input
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            onChange={() => {
                                onChange(
                                    selectedIds.includes(item.id)
                                        ? selectedIds.filter(x => x !== item.id)
                                        : [...selectedIds, item.id],
                                );
                            }}
                            className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-gray-800">{item.label}</span>
                        {item.sublabel && <span className="text-xs text-gray-400 ml-auto">{item.sublabel}</span>}
                    </label>
                ))}
                {filtered.length === 0 && (
                    <p className="text-xs text-gray-400 italic py-2 text-center">Nessun risultato per "{search}"</p>
                )}
            </div>
        </div>
    );
}

function WidgetSettingsPanel({ widgetKey, settings, onChange, options }: {
    widgetKey: string;
    settings: Record<string, string[]>;
    onChange: (settings: Record<string, string[]>) => void;
    options: WidgetOptions | undefined;
}) {
    const set = (field: string, ids: string[]) => onChange({ ...settings, [field]: ids });

    switch (widgetKey) {
        case 'booking':
            return (
                <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-600">Prestazioni visibili nel widget</div>
                    <CheckboxSelector
                        items={(options?.prestazioni ?? []).map(p => ({
                            id: p.id,
                            label: p.nome,
                            sublabel: p.branche?.join(', '),
                        }))}
                        selectedIds={settings.prestazioniIds ?? []}
                        onChange={ids => set('prestazioniIds', ids)}
                        emptyLabel="Nessuna prestazione trovata."
                    />
                    <p className="text-xs text-gray-400 italic mt-1">
                        Gli altri accertamenti seguiranno il protocollo sanitario. Il prezzo sarà come da tariffario aziendale.
                    </p>
                </div>
            );
        case 'courses':
            return (
                <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-600">Corsi visibili</div>
                    <CheckboxSelector
                        items={(options?.courses ?? []).map(c => ({ id: c.id, label: c.title, sublabel: c.category }))}
                        selectedIds={settings.courseIds ?? []}
                        onChange={ids => set('courseIds', ids)}
                        emptyLabel="Nessun corso pubblicato."
                    />
                </div>
            );
        case 'doctors':
            return (
                <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-600">Medici visibili</div>
                    <CheckboxSelector
                        items={(options?.medici ?? []).map(m => ({ id: m.id, label: m.nome, sublabel: m.title ?? undefined }))}
                        selectedIds={settings.doctorIds ?? []}
                        onChange={ids => set('doctorIds', ids)}
                        emptyLabel="Nessun medico trovato."
                    />
                </div>
            );
        case 'specialties':
            return (
                <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-600">Branche visibili</div>
                    <CheckboxSelector
                        items={(options?.branche ?? []).map(b => ({ id: b, label: b }))}
                        selectedIds={settings.brancheFilter ?? []}
                        onChange={ids => set('brancheFilter', ids)}
                        emptyLabel="Nessuna branca trovata."
                    />
                </div>
            );
        case 'schedules':
            return (
                <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-600">Calendari per corsi</div>
                    <CheckboxSelector
                        items={(options?.courses ?? []).map(c => ({ id: c.id, label: c.title, sublabel: c.category }))}
                        selectedIds={settings.courseIds ?? []}
                        onChange={ids => set('courseIds', ids)}
                        emptyLabel="Nessun corso pubblicato."
                    />
                </div>
            );
        case 'contact':
            return <p className="text-xs text-gray-400 italic">Nessun filtro disponibile per il widget contatti.</p>;
        case 'forms':
            return (
                <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-600">Form CMS visibili</div>
                    {(options?.forms ?? []).length === 0 ? (
                        <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2">
                            Nessun form pubblico trovato. Vai in <strong>CMS → Form Pubblici</strong> e imposta almeno un form come pubblico e attivo.
                        </div>
                    ) : (
                        <CheckboxSelector
                            items={(options?.forms ?? []).map(f => ({
                                id: f.id,
                                label: f.name,
                                sublabel: f.type,
                            }))}
                            selectedIds={settings.formIds ?? []}
                            onChange={ids => set('formIds', ids)}
                            emptyLabel="Nessun form pubblico trovato."
                        />
                    )}
                    <p className="text-xs text-gray-400 italic mt-1">
                        Lascia vuoto per mostrare tutti i form pubblici; seleziona quelli specifici per limitare l'accesso.
                    </p>
                </div>
            );
        default:
            return null;
    }
}

function countActiveFilters(ws: Record<string, Record<string, string[]>> | null | undefined): number {
    if (!ws) return 0;
    return Object.values(ws).reduce((sum, fields) =>
        sum + Object.values(fields).reduce((s, arr) => s + (arr.length > 0 ? 1 : 0), 0), 0);
}

function getSnippet(apiKey: string, widgetType: string, apiBase: string): string {
    const attrs: Record<string, string> = {
        booking: 'data-element-widget="booking"',
        courses: 'data-element-widget="courses" data-category=""',
        schedules: 'data-element-widget="schedules"',
        contact: 'data-element-widget="contact" data-service=""',
        doctors: 'data-element-widget="doctors" data-specialty=""',
        specialties: 'data-element-widget="specialties"',
        forms: 'data-element-widget="forms"\n       <!-- oppure per un form specifico: data-element-widget="forms" data-form-id="ID_FORM" -->',
    };
    return `<!-- Aggiungi dove vuoi il widget -->\n<div ${attrs[widgetType] || `data-element-widget="${widgetType}"`}></div>\n\n<!-- Script embed (una volta per pagina) -->\n<script src="${apiBase}/api/public/embed/${apiKey}/script.js" defer></script>`;
}

// ─── Component ──────────────────────────────────────────────

const PublicApiSettingsPage: React.FC = () => {
    const { showToast } = useToast();
    const { confirm: confirmDialog } = useConfirmDialog();
    const queryClient = useQueryClient();
    const { currentTenant } = useTenantAccess();
    const configuredApiBase = (import.meta.env.VITE_PUBLIC_API_BASE_URL || '').trim();
    const apiBase = configuredApiBase || `${window.location.protocol}//${window.location.host}`;

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newKeyForm, setNewKeyForm] = useState<KeyForm>({
        name: '',
        allowedOrigins: '',
        enabledWidgets: [],
        widgetSettings: {},
    });
    const [createdKey, setCreatedKey] = useState<string | null>(null);
    const [expandedKey, setExpandedKey] = useState<string | null>(null);
    const [expandedTab, setExpandedTab] = useState<'settings' | 'snippets'>('settings');
    const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
    const [editSettings, setEditSettings] = useState<Record<string, Record<string, string[]>>>({});
    const [editEnabledWidgets, setEditEnabledWidgets] = useState<string[]>([]);

    // ── Queries ──

    const { data: featureData } = useQuery<{ success: boolean; data: FeatureStatus }>({
        queryKey: ['api-feature-status', currentTenant?.id],
        queryFn: async () => {
            const res = await api.get('/api/v1/management/api-keys/feature/status');
            return res.data;
        },
        enabled: !!currentTenant,
    });

    const featureStatus = featureData?.data;

    const { data: usageData } = useQuery<{ success: boolean; data: UsageStats }>({
        queryKey: ['api-usage-stats', currentTenant?.id],
        queryFn: async () => {
            const res = await api.get('/api/v1/management/api-keys/usage/stats?days=30');
            return res.data;
        },
        enabled: !!featureStatus?.isEnabled && !!currentTenant,
    });

    const usageStats = usageData?.data;

    const { data, isLoading, error: keysError } = useQuery<{ success: boolean; data: ApiKey[] }>({
        queryKey: ['management-api-keys', currentTenant?.id],
        queryFn: async () => {
            const res = await api.get('/api/v1/management/api-keys');
            return res.data;
        },
        enabled: !!currentTenant,
    });

    const keys = data?.data ?? [];

    const { data: widgetOptionsData } = useQuery<{ success: boolean; data: WidgetOptions }>({
        queryKey: ['widget-options', currentTenant?.id],
        queryFn: async () => {
            const res = await api.get('/api/v1/management/api-keys/widget-options');
            return res.data;
        },
        enabled: !!currentTenant,
    });

    const widgetOptions = widgetOptionsData?.data;

    // Auto-expand the first key if there's only one
    useEffect(() => {
        if (keys.length === 1 && !expandedKey) {
            setExpandedKey(keys[0].id);
        }
    }, [keys]);

    const resolveNames = useMemo(() => {
        if (!widgetOptions) return (ws: Record<string, Record<string, string[]>> | null) => '';
        return (ws: Record<string, Record<string, string[]>> | null) => {
            if (!ws) return '';
            const parts: string[] = [];
            for (const [widget, fields] of Object.entries(ws)) {
                for (const [field, ids] of Object.entries(fields)) {
                    if (!ids.length) continue;
                    const names = ids.map(id => {
                        if (field === 'prestazioniIds') return widgetOptions.prestazioni.find(p => p.id === id)?.nome ?? id;
                        if (field === 'courseIds') return widgetOptions.courses.find(c => c.id === id)?.title ?? id;
                        if (field === 'doctorIds') return widgetOptions.medici.find(m => m.id === id)?.nome ?? id;
                        if (field === 'formIds') return widgetOptions.forms?.find(f => f.id === id)?.name ?? id;
                        if (field === 'brancheFilter') return id;
                        return id;
                    });
                    const opt = WIDGET_OPTIONS.find(o => o.value === widget);
                    parts.push(`${opt?.icon ?? ''} ${names.join(', ')}`);
                }
            }
            return parts.join(' · ');
        };
    }, [widgetOptions]);

    // ── Mutations ──

    const createMutation = useMutation({
        mutationFn: async (form: KeyForm) => {
            const origins = form.allowedOrigins
                .split(',')
                .map((s: string) => s.trim())
                .filter(Boolean);
            const res = await api.post('/api/v1/management/api-keys', {
                name: form.name,
                allowedOrigins: origins,
                enabledWidgets: form.enabledWidgets,
                widgetSettings: Object.keys(form.widgetSettings).length > 0 ? form.widgetSettings : undefined,
            });
            return res.data;
        },
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['management-api-keys'] });
            queryClient.invalidateQueries({ queryKey: ['api-usage-stats'] });
            setCreatedKey(res.data.key);
            setNewKeyForm({ name: '', allowedOrigins: '', enabledWidgets: [], widgetSettings: {} });
        },
        onError: (error: AxiosError<{ error?: string; message?: string; errors?: Array<{ msg?: string }> }>) => {
            const validationErrors = error.response?.data?.errors;
            const backendMessage = Array.isArray(validationErrors) && validationErrors.length > 0
                ? validationErrors.map(e => e.msg).filter(Boolean).join(' | ')
                : error.response?.data?.error || error.response?.data?.message;

            showToast({
                message: backendMessage || 'Errore nella creazione della chiave API.',
                type: 'error'
            });
        },
    });

    const toggleMutation = useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
            const res = await api.patch(`/api/v1/management/api-keys/${id}`, { isActive });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['management-api-keys'] });
        },
        onError: () => {
            showToast({ message: 'Errore nell\'aggiornamento della chiave.', type: 'error' });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await api.delete(`/api/v1/management/api-keys/${id}`);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['management-api-keys'] });
            showToast({ message: 'Chiave revocata con successo.', type: 'success' });
        },
        onError: () => {
            showToast({ message: 'Errore nella revoca della chiave.', type: 'error' });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, enabledWidgets, widgetSettings }: { id: string; enabledWidgets: string[]; widgetSettings: Record<string, Record<string, string[]>> }) => {
            const res = await api.patch(`/api/v1/management/api-keys/${id}`, { enabledWidgets, widgetSettings });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['management-api-keys'] });
            setEditingKeyId(null);
            showToast({ message: 'Impostazioni widget salvate.', type: 'success' });
        },
        onError: () => {
            showToast({ message: 'Errore nel salvataggio delle impostazioni.', type: 'error' });
        },
    });

    // ── Handlers ──

    const handleCreate = () => {
        if (!newKeyForm.name.trim()) {
            showToast({ message: 'Inserisci un nome per la chiave.', type: 'error' });
            return;
        }
        if (!newKeyForm.enabledWidgets.length) {
            showToast({ message: 'Seleziona almeno un widget da abilitare.', type: 'error' });
            return;
        }
        createMutation.mutate(newKeyForm);
    };

    const toggleWidget = (widget: string, form: KeyForm, setForm: React.Dispatch<React.SetStateAction<KeyForm>>) => {
        setForm(prev => ({
            ...prev,
            enabledWidgets: prev.enabledWidgets.includes(widget)
                ? prev.enabledWidgets.filter(w => w !== widget)
                : [...prev.enabledWidgets, widget],
        }));
    };

    const startEditing = (key: ApiKey) => {
        setEditingKeyId(key.id);
        setEditSettings(key.widgetSettings ? JSON.parse(JSON.stringify(key.widgetSettings)) : {});
        setEditEnabledWidgets([...key.enabledWidgets]);
        setExpandedTab('settings');
    };

    const cancelEditing = () => {
        setEditingKeyId(null);
        setEditSettings({});
        setEditEnabledWidgets([]);
    };

    const handleDelete = async (key: ApiKey) => {
        const confirmed = await confirmDialog({
            title: 'Conferma revoca',
            message: `Revocare la chiave "${key.name}"? Tutti i widget che la usano smetteranno di funzionare.`,
            variant: 'danger'
        });
        if (!confirmed) return;
        deleteMutation.mutate(key.id);
    };

    // ─── Render ──────────────────────────────────────────────────

    if (!currentTenant) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Key size={22} className="text-teal-600" />
                        API Pubbliche — Embed Widget
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Seleziona un tenant per gestire le chiavi API.</p>
                </div>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
                    <Shield size={36} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 text-sm">Seleziona un tenant dal menu in alto per visualizzare e gestire le chiavi API pubbliche.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Key size={22} className="text-teal-600" />
                        API Pubbliche — Embed Widget
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Chiavi API per <span className="font-medium text-gray-700">{currentTenant.name}</span> — integra prenotazioni, corsi, calendari, contatti, medici e specialità su qualsiasi sito esterno.
                    </p>
                </div>
                <CRUDPrimaryButton
                    onClick={() => { setShowCreateModal(true); setCreatedKey(null); }}
                    disabled={keys.length >= 10}
                >
                    <Plus size={16} /> Nuova Chiave
                </CRUDPrimaryButton>
            </div>

            {/* Info banner */}
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex gap-3 text-sm text-teal-800">
                <Zap size={18} className="shrink-0 mt-0.5 text-teal-600" />
                <div>
                    <strong>Come funziona:</strong> aggiungi la chiave come <code className="bg-white px-1 rounded font-mono text-xs">{'<script src="…/script.js">'}</code> su qualsiasi pagina web. Il widget si auto-inietta nei div con <code className="bg-white px-1 rounded font-mono text-xs">data-element-widget="…"</code>.
                </div>
            </div>

            {/* Feature status */}
            {featureStatus && !featureStatus.isEnabled && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-sm text-amber-800">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-600" />
                    <div>
                        <strong>Feature non attiva</strong> — {featureStatus.message || 'Le API pubbliche non sono abilitate per questo tenant. Contattare l\'amministratore per l\'attivazione.'}
                    </div>
                </div>
            )}

            {/* Usage stats */}
            {featureStatus?.isEnabled && usageStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1">
                            <BarChart3 size={13} />
                            Richieste (30gg)
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{usageStats.totalRequests.toLocaleString('it-IT')}</div>
                    </div>
                    {usageStats.byWidgetType.map(w => {
                        const opt = WIDGET_OPTIONS.find(o => o.value === w.widgetType);
                        return (
                            <div key={w.widgetType} className="bg-white border border-gray-200 rounded-xl p-4">
                                <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1">
                                    <TrendingUp size={13} />
                                    {opt?.icon} {opt?.label || w.widgetType}
                                </div>
                                <div className="text-2xl font-bold text-gray-900">{w.count.toLocaleString('it-IT')}</div>
                            </div>
                        );
                    })}
                    {featureStatus.usageLimit && (
                        <div className="sm:col-span-4 text-xs text-gray-500 flex items-center gap-2">
                            <Shield size={13} />
                            Utilizzo: {featureStatus.usageCount.toLocaleString('it-IT')} / {featureStatus.usageLimit.toLocaleString('it-IT')} richieste
                            {featureStatus.tier && <span className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">Piano: {featureStatus.tier}</span>}
                        </div>
                    )}
                </div>
            )}

            {/* Lista chiavi */}
            {/* Global Widget Overview — shows active widgets across all keys */}
            {keys.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <Settings size={16} className="text-teal-600" />
                        <h2 className="text-sm font-bold text-gray-900">Panoramica Widget Attivi</h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        {WIDGET_OPTIONS.map(opt => {
                            const activeKeys = keys.filter(k => k.isActive && k.enabledWidgets.includes(opt.value));
                            const isActive = activeKeys.length > 0;
                            const filterCount = activeKeys.reduce((sum, k) => {
                                const ws = k.widgetSettings?.[opt.value];
                                if (!ws) return sum;
                                return sum + Object.values(ws).reduce((s, arr: unknown) => s + (Array.isArray(arr) && arr.length > 0 ? arr.length : 0), 0);
                            }, 0);
                            return (
                                <div
                                    key={opt.value}
                                    className={`rounded-xl border p-3 text-center transition-all ${isActive
                                        ? 'border-teal-200 bg-teal-50'
                                        : 'border-gray-100 bg-gray-50 opacity-50'
                                        }`}
                                >
                                    <div className="text-2xl mb-1">{opt.icon}</div>
                                    <div className="text-xs font-semibold text-gray-800">{opt.label}</div>
                                    {isActive ? (
                                        <div className="text-[10px] text-teal-600 mt-1 font-medium">
                                            {activeKeys.length} {activeKeys.length === 1 ? 'chiave' : 'chiavi'}
                                            {filterCount > 0 && ` · ${filterCount} filtri`}
                                        </div>
                                    ) : (
                                        <div className="text-[10px] text-gray-400 mt-1">Non attivo</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <p className="text-xs text-gray-400">
                        Clicca "Gestisci" su una chiave per configurare quali prestazioni, medici e corsi mostrare nei widget pubblici.
                    </p>
                </div>
            )}

            {/* Lista chiavi dettaglio */}
            {keysError ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 text-sm text-red-800">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5 text-red-600" />
                    <div>
                        <strong>Errore nel caricamento delle chiavi API</strong> — Verifica di avere il permesso <em>settings:write</em> abilitato per il tuo ruolo.
                    </div>
                </div>
            ) : isLoading ? (
                <div className="text-sm text-gray-500 py-8 text-center">Caricamento...</div>
            ) : keys.length === 0 ? (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
                    <Key size={36} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 text-sm">Nessuna chiave API. Crea la prima per integrare i widget sul tuo sito.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {keys.map(key => (
                        <div key={key.id} className={`border rounded-xl overflow-hidden transition-all ${key.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-70'}`}>
                            {/* Row header */}
                            <div className="flex items-center gap-3 p-4">
                                <div className={`w-2 h-2 rounded-full shrink-0 ${key.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-sm text-gray-900">{key.name}</span>
                                        <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono text-gray-600">{key.keyPreview}</code>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                                        {key.enabledWidgets.map(w => {
                                            const opt = WIDGET_OPTIONS.find(o => o.value === w);
                                            return (
                                                <span key={w} className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">
                                                    {opt?.icon} {opt?.label || w}
                                                </span>
                                            );
                                        })}
                                        {key.usageCount > 0 && (
                                            <span className="text-xs text-gray-400">{key.usageCount.toLocaleString('it-IT')} richieste</span>
                                        )}
                                        {key.lastUsedAt && (
                                            <span className="text-xs text-gray-400">
                                                Ultimo uso: {new Date(key.lastUsedAt).toLocaleDateString('it-IT')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => toggleMutation.mutate({ id: key.id, isActive: !key.isActive })}
                                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${key.isActive ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-green-100 hover:bg-green-200 text-green-800'}`}
                                        disabled={toggleMutation.isPending}
                                    >
                                        {key.isActive ? <><EyeOff size={12} className="inline mr-1" />Disabilita</> : <><Eye size={12} className="inline mr-1" />Riabilita</>}
                                    </button>
                                    <button
                                        onClick={() => setExpandedKey(expandedKey === key.id ? null : key.id)}
                                        className="text-xs px-3 py-1.5 rounded-lg font-medium bg-teal-50 hover:bg-teal-100 text-teal-700 transition-colors flex items-center gap-1"
                                    >
                                        <Settings size={12} />
                                        Gestisci
                                        {countActiveFilters(key.widgetSettings) > 0 && (
                                            <span className="bg-teal-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                                                {countActiveFilters(key.widgetSettings)}
                                            </span>
                                        )}
                                        {expandedKey === key.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    </button>
                                    <CRUDButton
                                        variant="danger"
                                        onClick={() => handleDelete(key)}
                                        disabled={deleteMutation.isPending}
                                    >
                                        <Trash2 size={13} />
                                    </CRUDButton>
                                </div>
                            </div>

                            {/* Expanded panel with tabs */}
                            {expandedKey === key.id && (
                                <div className="border-t border-gray-100 bg-gray-50">
                                    {/* Tab bar */}
                                    <div className="flex border-b border-gray-200">
                                        <button
                                            onClick={() => setExpandedTab('settings')}
                                            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${expandedTab === 'settings' ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                        >
                                            <Settings size={13} /> Impostazioni Widget
                                        </button>
                                        <button
                                            onClick={() => setExpandedTab('snippets')}
                                            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${expandedTab === 'snippets' ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                        >
                                            <Code2 size={13} /> Codice Embed
                                        </button>
                                    </div>

                                    <div className="p-4 space-y-4">
                                        {expandedTab === 'settings' ? (
                                            /* ── Settings tab ── */
                                            editingKeyId === key.id ? (
                                                <div className="space-y-4">
                                                    {/* Widget type toggles */}
                                                    <div className="space-y-2">
                                                        <div className="text-xs font-semibold text-gray-600">Widget abilitati</div>
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                            {WIDGET_OPTIONS.map(opt => {
                                                                const isEnabled = editEnabledWidgets.includes(opt.value);
                                                                return (
                                                                    <button
                                                                        key={opt.value}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setEditEnabledWidgets(prev =>
                                                                                prev.includes(opt.value)
                                                                                    ? prev.filter(w => w !== opt.value)
                                                                                    : [...prev, opt.value]
                                                                            );
                                                                        }}
                                                                        className={`flex items-center gap-2 p-2.5 border rounded-xl text-left transition-all text-sm ${isEnabled ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                                                                    >
                                                                        <span className="text-lg leading-none">{opt.icon}</span>
                                                                        <span className="font-medium text-xs">{opt.label}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                    {/* Per-widget filter settings */}
                                                    {editEnabledWidgets.map(w => {
                                                        const opt = WIDGET_OPTIONS.find(o => o.value === w);
                                                        return (
                                                            <div key={w} className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
                                                                <div className="text-sm font-semibold text-gray-700">{opt?.icon} {opt?.label}</div>
                                                                <WidgetSettingsPanel
                                                                    widgetKey={w}
                                                                    settings={editSettings[w] ?? {}}
                                                                    onChange={(s) => setEditSettings(prev => ({ ...prev, [w]: s }))}
                                                                    options={widgetOptions}
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                    <div className="flex gap-2 pt-1">
                                                        <CRUDButton variant="secondary" onClick={cancelEditing}>
                                                            <X size={13} /> Annulla
                                                        </CRUDButton>
                                                        <CRUDPrimaryButton
                                                            onClick={() => updateMutation.mutate({ id: key.id, enabledWidgets: editEnabledWidgets, widgetSettings: editSettings })}
                                                            disabled={updateMutation.isPending || editEnabledWidgets.length === 0}
                                                        >
                                                            <Save size={13} /> {updateMutation.isPending ? 'Salvataggio...' : 'Salva Impostazioni'}
                                                        </CRUDPrimaryButton>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {key.enabledWidgets.map(w => {
                                                        const opt = WIDGET_OPTIONS.find(o => o.value === w);
                                                        const ws = key.widgetSettings?.[w];
                                                        const hasFilters = ws && Object.values(ws).some((arr: unknown) => Array.isArray(arr) && arr.length > 0);
                                                        const filterNames = hasFilters ? resolveNames({ [w]: ws as Record<string, string[]> }) : '';
                                                        const filterCount = ws ? Object.values(ws).reduce((s, arr: unknown) => s + (Array.isArray(arr) ? arr.length : 0), 0) : 0;
                                                        return (
                                                            <div key={w} className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-sm font-semibold text-gray-700">{opt?.icon} {opt?.label}</span>
                                                                    {hasFilters ? (
                                                                        <span className="text-[11px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">
                                                                            {filterCount} {filterCount === 1 ? 'filtro attivo' : 'filtri attivi'}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                                                            Mostra tutto
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {hasFilters && (
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {filterNames.replace(/^.+?\s/, '').split(', ').map((name, i) => (
                                                                            <span key={i} className="text-[11px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-100">
                                                                                {name}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                    <CRUDButton variant="secondary" onClick={() => startEditing(key)}>
                                                        <Settings size={13} /> Modifica filtri
                                                    </CRUDButton>
                                                </div>
                                            )
                                        ) : (
                                            /* ── Snippets tab ── */
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                                    <Code2 size={15} />
                                                    Snippet di integrazione
                                                </div>
                                                {key.enabledWidgets.map(w => {
                                                    const opt = WIDGET_OPTIONS.find(o => o.value === w);
                                                    const snippet = getSnippet(key.key || key.keyPreview, w, apiBase);
                                                    return (
                                                        <div key={w} className="space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-medium text-gray-600">{opt?.icon} Widget {opt?.label}</span>
                                                                <CopyButton text={snippet} label="Copia HTML" />
                                                            </div>
                                                            <pre className="bg-white border border-gray-200 rounded-lg p-3 text-xs font-mono text-gray-700 overflow-x-auto whitespace-pre-wrap break-all">
                                                                {snippet}
                                                            </pre>
                                                        </div>
                                                    );
                                                })}
                                                {key.allowedOrigins.length > 0 && (
                                                    <div className="flex items-start gap-2 text-xs text-gray-500">
                                                        <Globe size={13} className="shrink-0 mt-0.5" />
                                                        <span>Origini autorizzate: {key.allowedOrigins.join(', ')}</span>
                                                    </div>
                                                )}
                                                {key.allowedOrigins.length === 0 && (
                                                    <div className="flex items-start gap-2 text-xs text-amber-600">
                                                        <Shield size={13} className="shrink-0 mt-0.5" />
                                                        <span>Nessuna restrizione di origine: la chiave funziona da qualsiasi dominio.</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Modale: creazione chiave */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4">
                        {createdKey ? (
                            /* ── Chiave creata: mostra full key ── */
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-green-700 font-bold text-lg">
                                    <Check size={20} />
                                    Chiave creata con successo
                                </div>
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                                    <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
                                        <AlertTriangle size={16} />
                                        Copia ora — non sarà più visibile
                                    </div>
                                    <code className="block text-sm font-mono bg-white border border-amber-200 rounded-lg p-3 break-all text-gray-800">
                                        {createdKey}
                                    </code>
                                    <CopyButton text={createdKey} label="Copia chiave API" />
                                </div>
                                <p className="text-xs text-gray-500">
                                    Usa questa chiave nell'URL dello script embed. Non condividerla pubblicamente nei commit.
                                </p>
                                <button
                                    onClick={() => { setShowCreateModal(false); setCreatedKey(null); }}
                                    className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-sm transition-colors"
                                >
                                    Ho copiato la chiave, chiudi
                                </button>
                            </div>
                        ) : (
                            /* ── Form creazione ── */
                            <div className="space-y-5">
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <Key size={18} className="text-teal-600" />
                                    Nuova Chiave API
                                </h2>

                                <div className="space-y-1">
                                    <label className="block text-sm font-semibold text-gray-700">Nome *</label>
                                    <input
                                        type="text"
                                        value={newKeyForm.name}
                                        onChange={e => setNewKeyForm(p => ({ ...p, name: e.target.value }))}
                                        placeholder="Es. Sito principale, Landing corsi..."
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        maxLength={100}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-sm font-semibold text-gray-700">
                                        Widget abilitati *
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {WIDGET_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => toggleWidget(opt.value, newKeyForm, setNewKeyForm)}
                                                className={`flex items-start gap-2 p-3 border rounded-xl text-left transition-all ${newKeyForm.enabledWidgets.includes(opt.value) ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}
                                            >
                                                <span className="text-lg leading-none">{opt.icon}</span>
                                                <div>
                                                    <div className="text-sm font-semibold">{opt.label}</div>
                                                    <div className="text-xs text-gray-400 mt-0.5">{opt.description}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Per-widget settings with checkbox selectors */}
                                {newKeyForm.enabledWidgets.length > 0 && (
                                    <div className="space-y-1">
                                        <label className="block text-sm font-semibold text-gray-700">
                                            Filtri per widget
                                            <span className="font-normal text-gray-400 ml-1">(opzionale — lascia vuoto per mostrare tutto)</span>
                                        </label>
                                        <div className="space-y-3 bg-gray-50 rounded-xl p-3 border border-gray-200">
                                            {newKeyForm.enabledWidgets.map(w => {
                                                const opt = WIDGET_OPTIONS.find(o => o.value === w);
                                                return (
                                                    <div key={w} className="space-y-1">
                                                        <div className="text-xs font-semibold text-gray-600">{opt?.icon} {opt?.label}</div>
                                                        <WidgetSettingsPanel
                                                            widgetKey={w}
                                                            settings={newKeyForm.widgetSettings[w] ?? {}}
                                                            onChange={(s) => setNewKeyForm(prev => ({
                                                                ...prev,
                                                                widgetSettings: { ...prev.widgetSettings, [w]: s },
                                                            }))}
                                                            options={widgetOptions}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="block text-sm font-semibold text-gray-700">
                                        Origini autorizzate
                                        <span className="font-normal text-gray-400 ml-1">(opzionale, consigliato in produzione)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newKeyForm.allowedOrigins}
                                        onChange={e => setNewKeyForm(p => ({ ...p, allowedOrigins: e.target.value }))}
                                        placeholder="https://esempio.com, https://altro.it"
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    />
                                    <p className="text-xs text-gray-400">
                                        Separa più origini con virgola. Lascia vuoto per nessuna restrizione.
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                    >
                                        Annulla
                                    </button>
                                    <button
                                        onClick={handleCreate}
                                        disabled={createMutation.isPending}
                                        className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors"
                                    >
                                        {createMutation.isPending ? 'Creazione...' : 'Crea Chiave'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublicApiSettingsPage;
