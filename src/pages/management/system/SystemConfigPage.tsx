/**
 * System Configuration Page - Management Section
 *
 * Impostazioni reali di sistema: sicurezza, feature flags, tema.
 * Le impostazioni generali e email sono gestite separatamente (Messaggistica).
 *
 * @module pages/management/system/SystemConfigPage
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    Settings,
    Save,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Shield,
    ToggleLeft,
    Sun
} from 'lucide-react';
import { useAuth } from '../../../hooks/auth/useAuth';
import { apiGet, apiPut } from '../../../services/api';
import { ThemeSelector } from '../../../components/settings/ThemeSelector';

// Configuration categories
interface ConfigCategory {
    id: string;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    settings: ConfigSetting[];
}

interface ConfigSetting {
    key: string;
    label: string;
    description: string;
    type: 'text' | 'number' | 'boolean' | 'select' | 'textarea';
    value: any;
    options?: { value: string; label: string }[];
    required?: boolean;
    validation?: {
        min?: number;
        max?: number;
        pattern?: string;
    };
}

// Configurazioni reali del sistema (corrispondono ai DEFAULT_CONFIG del backend)
const DEFAULT_CONFIG_CATEGORIES: ConfigCategory[] = [
    {
        id: 'security',
        label: 'Sicurezza',
        description: 'Impostazioni di sicurezza e autenticazione',
        icon: Shield,
        settings: [
            {
                key: 'security.sessionTimeout',
                label: 'Timeout Sessione (minuti)',
                description: 'Durata massima sessione inattiva',
                type: 'number',
                value: 30,
                validation: { min: 15, max: 480 }
            },
            {
                key: 'security.loginAttempts',
                label: 'Tentativi Login Max',
                description: 'Numero massimo di tentativi di login falliti prima del blocco',
                type: 'number',
                value: 5,
                validation: { min: 3, max: 10 }
            },
            {
                key: 'security.lockoutDuration',
                label: 'Durata Blocco (minuti)',
                description: 'Durata blocco account dopo troppi tentativi',
                type: 'number',
                value: 15,
                validation: { min: 5, max: 1440 }
            },
            {
                key: 'security.twoFactorEnabled',
                label: 'Autenticazione a Due Fattori',
                description: 'Abilita 2FA come opzione per gli utenti',
                type: 'boolean',
                value: false
            },
            {
                key: 'security.passwordMinLength',
                label: 'Lunghezza Minima Password',
                description: 'Numero minimo di caratteri per le password',
                type: 'number',
                value: 8,
                validation: { min: 6, max: 32 }
            }
        ]
    },
    {
        id: 'features',
        label: 'Feature Flags',
        description: 'Attiva o disattiva moduli del sistema per questo tenant',
        icon: ToggleLeft,
        settings: [
            {
                key: 'features.gdprModule',
                label: 'Modulo GDPR',
                description: 'Abilita funzionalità GDPR e privacy',
                type: 'boolean',
                value: true
            },
            {
                key: 'features.cmsModule',
                label: 'Modulo CMS',
                description: 'Abilita gestione analytics pagine e form pubblici',
                type: 'boolean',
                value: true
            },
            {
                key: 'features.trainingModule',
                label: 'Modulo Formazione',
                description: 'Abilita gestione corsi e attestati',
                type: 'boolean',
                value: true
            },
            {
                key: 'features.billingModule',
                label: 'Modulo Fatturazione',
                description: 'Abilita fatturazione e gestione pagamenti',
                type: 'boolean',
                value: true
            }
        ]
    }
];

const SystemConfigPage: React.FC = () => {
    const { user } = useAuth();
    const [categories, setCategories] = useState<ConfigCategory[]>(DEFAULT_CONFIG_CATEGORIES);
    const [activeCategory, setActiveCategory] = useState('security');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [originalValues, setOriginalValues] = useState<Record<string, any>>({});

    // Load configuration from API
    const loadConfig = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiGet<{ data: Record<string, any> }>('/api/v1/settings/config');

            if (response?.data) {
                // Update categories with loaded values
                setCategories(prev => prev.map(category => ({
                    ...category,
                    settings: category.settings.map(setting => ({
                        ...setting,
                        value: response.data[setting.key] ?? setting.value
                    }))
                })));

                // Store original values
                const originals: Record<string, any> = {};
                Object.entries(response.data).forEach(([key, value]) => {
                    originals[key] = value;
                });
                setOriginalValues(originals);
            }
        } catch (err: unknown) {
            // Use defaults if API fails
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    // Update setting value
    const updateSetting = (categoryId: string, key: string, value: any) => {
        setCategories(prev => prev.map(category => {
            if (category.id !== categoryId) return category;
            return {
                ...category,
                settings: category.settings.map(setting => {
                    if (setting.key !== key) return setting;
                    return { ...setting, value };
                })
            };
        }));
        setHasChanges(true);
        setSuccess(null);
    };

    // Save configuration
    const saveConfig = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            // Collect all settings
            const config: Record<string, any> = {};
            categories.forEach(category => {
                category.settings.forEach(setting => {
                    config[setting.key] = setting.value;
                });
            });

            await apiPut('/api/v1/settings/config', config);

            setSuccess('Configurazione salvata con successo');
            setHasChanges(false);
            setOriginalValues(config);
        } catch (err: unknown) {
            setError('Errore nel salvataggio della configurazione');
        } finally {
            setSaving(false);
        }
    };

    // Reset to original values
    const resetChanges = () => {
        setCategories(prev => prev.map(category => ({
            ...category,
            settings: category.settings.map(setting => ({
                ...setting,
                value: originalValues[setting.key] ?? setting.value
            }))
        })));
        setHasChanges(false);
    };

    // Get active category
    const activeCategoryData = categories.find(c => c.id === activeCategory);

    // Render setting input based on type
    const renderSettingInput = (setting: ConfigSetting, categoryId: string) => {
        switch (setting.type) {
            case 'boolean':
                return (
                    <button
                        onClick={() => updateSetting(categoryId, setting.key, !setting.value)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${setting.value ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-600'
                            }`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${setting.value ? 'translate-x-6' : 'translate-x-1'
                                }`}
                        />
                    </button>
                );

            case 'select':
                return (
                    <select
                        value={setting.value}
                        onChange={(e) => updateSetting(categoryId, setting.key, e.target.value)}
                        className="w-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                    >
                        {setting.options?.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                );

            case 'number':
                return (
                    <input
                        type="number"
                        value={setting.value}
                        onChange={(e) => updateSetting(categoryId, setting.key, parseInt(e.target.value))}
                        min={setting.validation?.min}
                        max={setting.validation?.max}
                        className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                    />
                );

            case 'textarea':
                return (
                    <textarea
                        value={setting.value}
                        onChange={(e) => updateSetting(categoryId, setting.key, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                        rows={3}
                    />
                );

            default:
                return (
                    <input
                        type="text"
                        value={setting.value}
                        onChange={(e) => updateSetting(categoryId, setting.key, e.target.value)}
                        className="w-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                    />
                );
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 flex items-center gap-3">
                        <Settings className="w-7 h-7 text-purple-600" />
                        Configurazioni Sistema
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Gestione impostazioni globali e feature flags
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadConfig}
                        disabled={loading}
                        className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Ricarica"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    {hasChanges && (
                        <button
                            onClick={resetChanges}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Annulla modifiche
                        </button>
                    )}
                    <button
                        onClick={saveConfig}
                        disabled={saving || !hasChanges}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Salva Modifiche
                    </button>
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <p className="text-green-700">{success}</p>
                </div>
            )}

            {hasChanges && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <p className="text-amber-700">Hai modifiche non salvate. Ricorda di salvare prima di uscire.</p>
                </div>
            )}

            {/* Content */}
            <div className="flex gap-6">
                {/* Category Sidebar */}
                <div className="w-64 flex-shrink-0">
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {categories.map(category => {
                            const Icon = category.icon;
                            return (
                                <button
                                    key={category.id}
                                    onClick={() => setActiveCategory(category.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${activeCategory === category.id
                                        ? 'bg-purple-50 dark:bg-purple-900/30 border-l-4 border-purple-600 text-purple-700 dark:text-purple-400'
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="font-medium">{category.label}</span>
                                </button>
                            );
                        })}
                        <button
                            onClick={() => setActiveCategory('tema')}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${activeCategory === 'tema'
                                ? 'bg-purple-50 dark:bg-purple-900/30 border-l-4 border-purple-600 text-purple-700 dark:text-purple-400'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}
                        >
                            <Sun className="w-5 h-5" />
                            <span className="font-medium">Tema</span>
                        </button>
                    </div>
                </div>

                {/* Settings Panel */}
                <div className="flex-1">
                    {loading ? (
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                        </div>
                    ) : activeCategory === 'tema' ? (
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Tema Interfaccia</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Modalità di visualizzazione del pannello di gestione</p>
                            </div>
                            <div className="p-6">
                                <ThemeSelector />
                            </div>
                        </div>
                    ) : activeCategoryData && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{activeCategoryData.label}</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{activeCategoryData.description}</p>
                            </div>
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                {activeCategoryData.settings.map(setting => (
                                    <div key={setting.key} className="px-6 py-4 flex items-center justify-between">
                                        <div className="flex-1 pr-8">
                                            <div className="font-medium text-gray-900 dark:text-gray-50">{setting.label}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">{setting.description}</div>
                                            <div className="text-xs text-gray-400 mt-1">{setting.key}</div>
                                        </div>
                                        <div>
                                            {renderSettingInput(setting, activeCategoryData.id)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SystemConfigPage;
