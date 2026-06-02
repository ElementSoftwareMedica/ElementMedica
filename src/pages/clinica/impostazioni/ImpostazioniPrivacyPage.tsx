/**
 * ImpostazioniPrivacyPage — Impostazioni Privacy e GDPR del poliambulatorio
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Save, Loader2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';
import { apiGet, apiPut } from '@/services/api';

interface PrivacySettings {
    dataProcessingConsent: boolean;
    analyticsConsent: boolean;
    marketingEmails: boolean;
    analyticsTracking: boolean;
    dataRetentionPeriod: number;
    autoDeleteInactive: boolean;
}

const ImpostazioniPrivacyPage: React.FC = () => {
    const { showToast } = useToast();
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<PrivacySettings>({
        dataProcessingConsent: true,
        analyticsConsent: true,
        marketingEmails: false,
        analyticsTracking: true,
        dataRetentionPeriod: 365,
        autoDeleteInactive: false
    });

    useEffect(() => {
        apiGet<{ success: boolean; data: { settings: PrivacySettings } }>('/api/v1/persons/me/privacy-settings')
            .then(r => { if (r.success) setSettings(s => ({ ...s, ...r.data.settings })); })
            .catch(() => { });
    }, []);

    const toggle = (key: keyof PrivacySettings) => {
        setSettings(s => ({ ...s, [key]: !s[key] }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await apiPut('/api/v1/persons/me/privacy-settings', settings);
            showToast({ message: 'Impostazioni privacy salvate', type: 'success' });
        } catch {
            showToast({ message: 'Errore durante il salvataggio', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="mb-6">
                <Link to="/poliambulatorio/impostazioni" className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 mb-3">
                    <ArrowLeft className="h-4 w-4" />
                    Torna a Impostazioni
                </Link>
                <div className="flex items-center gap-3">
                    <Shield className="h-7 w-7 text-teal-600" />
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Privacy e GDPR</h1>
                        <p className="text-sm text-gray-500">Gestisci le impostazioni di privacy e conformità GDPR</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {/* Consensi */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h2 className="font-semibold text-gray-800 mb-4">Consensi e trattamento dati</h2>
                    <div className="space-y-3">
                        {[
                            { key: 'analyticsConsent' as const, label: 'Analytics interni', desc: 'Dati di utilizzo del sistema per migliorare il servizio' },
                            { key: 'marketingEmails' as const, label: 'Comunicazioni promozionali', desc: 'Ricezione di aggiornamenti e novità di ElementMedica' },
                            { key: 'analyticsTracking' as const, label: 'Monitoraggio navigazione', desc: 'Tracciamento delle pagine visitate nel pannello' }
                        ].map(({ key, label, desc }) => (
                            <label key={key} className="flex items-center justify-between py-2 cursor-pointer">
                                <div>
                                    <p className="text-sm font-medium text-gray-700">{label}</p>
                                    <p className="text-xs text-gray-400">{desc}</p>
                                </div>
                                <button
                                    onClick={() => toggle(key)}
                                    className={`relative rounded-full transition-colors ${settings[key] ? 'bg-teal-500' : 'bg-gray-300'}`}
                                    style={{ minWidth: '2.5rem', height: '1.375rem' }}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings[key] ? 'translate-x-4' : ''}`} />
                                </button>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Retention */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h2 className="font-semibold text-gray-800 mb-4">Conservazione dei dati</h2>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-700">Periodo di conservazione</p>
                                <p className="text-xs text-gray-400">Per quanto tempo conservare i dati del paziente</p>
                            </div>
                            <select
                                value={settings.dataRetentionPeriod}
                                onChange={e => setSettings(s => ({ ...s, dataRetentionPeriod: Number(e.target.value) }))}
                                className="text-sm border border-gray-300 rounded-lg px-2 py-1.5"
                            >
                                <option value={365}>1 anno</option>
                                <option value={730}>2 anni</option>
                                <option value={1825}>5 anni</option>
                                <option value={3650}>10 anni</option>
                            </select>
                        </div>
                        <label className="flex items-center justify-between py-2 cursor-pointer">
                            <div>
                                <p className="text-sm font-medium text-gray-700">Elimina automaticamente inattivi</p>
                                <p className="text-xs text-gray-400">Soft-delete automatico dopo il periodo di conservazione</p>
                            </div>
                            <button
                                onClick={() => toggle('autoDeleteInactive')}
                                className={`relative rounded-full transition-colors ${settings.autoDeleteInactive ? 'bg-teal-500' : 'bg-gray-300'}`}
                                style={{ minWidth: '2.5rem', height: '1.375rem' }}
                            >
                                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.autoDeleteInactive ? 'translate-x-4' : ''}`} />
                            </button>
                        </label>
                    </div>
                </div>

                {/* Links GDPR */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h2 className="font-semibold text-blue-800 mb-2 text-sm">Strumenti GDPR avanzati</h2>
                    <div className="flex flex-col gap-2">
                        <Link to="/management/gdpr/audit" className="inline-flex items-center gap-1.5 text-sm text-blue-700 hover:underline">
                            <ExternalLink className="h-3.5 w-3.5" />
                            Audit Log — storico operazioni
                        </Link>
                        <Link to="/management/gdpr/export" className="inline-flex items-center gap-1.5 text-sm text-blue-700 hover:underline">
                            <ExternalLink className="h-3.5 w-3.5" />
                            Esportazione dati pazienti
                        </Link>
                        <Link to="/management/gdpr/consent" className="inline-flex items-center gap-1.5 text-sm text-blue-700 hover:underline">
                            <ExternalLink className="h-3.5 w-3.5" />
                            Gestione consensi
                        </Link>
                    </div>
                </div>
            </div>

            <div className="mt-6 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 text-sm font-medium"
                >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salva impostazioni
                </button>
            </div>
        </div>
    );
};

export default ImpostazioniPrivacyPage;
