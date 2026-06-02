/**
 * ImpostazioniNotifichePage — Configurazione notifiche del poliambulatorio
 */

import React, { useState } from 'react';
import { ArrowLeft, Bell, Mail, MessageSquare, Save, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';

const ImpostazioniNotifichePage: React.FC = () => {
    const { showToast } = useToast();
    const [saving, setSaving] = useState(false);

    const [settings, setSettings] = useState({
        emailAppuntamentoConferma: true,
        emailAppuntamentoPromemoria: true,
        emailRefertoPronte: true,
        emailFatturaEmessa: false,
        smsPromemoria: false,
        smsOrePromemoria: 24,
        notificheInternal: true,
        notificheScadenzeMDL: true
    });

    const toggle = (key: keyof typeof settings) => {
        setSettings(s => ({ ...s, [key]: !s[key] }));
    };

    const handleSave = async () => {
        setSaving(true);
        await new Promise(r => setTimeout(r, 600));
        setSaving(false);
        showToast({ message: 'Impostazioni notifiche salvate', type: 'success' });
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="mb-6">
                <Link to="/poliambulatorio/impostazioni" className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 mb-3">
                    <ArrowLeft className="h-4 w-4" />
                    Torna a Impostazioni
                </Link>
                <div className="flex items-center gap-3">
                    <Bell className="h-7 w-7 text-teal-600" />
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Notifiche</h1>
                        <p className="text-sm text-gray-500">Configura quando e come vengono inviate le notifiche</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {/* Email */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Mail className="h-5 w-5 text-blue-500" />
                        <h2 className="font-semibold text-gray-800">Notifiche Email</h2>
                    </div>
                    <div className="space-y-3">
                        {[
                            { key: 'emailAppuntamentoConferma' as const, label: 'Conferma appuntamento', desc: 'Email al paziente alla prenotazione' },
                            { key: 'emailAppuntamentoPromemoria' as const, label: 'Promemoria appuntamento', desc: 'Email di promemoria 24h prima' },
                            { key: 'emailRefertoPronte' as const, label: 'Referto pronto', desc: 'Email al paziente quando il referto è disponibile' },
                            { key: 'emailFatturaEmessa' as const, label: 'Fattura emessa', desc: 'Email al paziente con la fattura' }
                        ].map(({ key, label, desc }) => (
                            <label key={key} className="flex items-center justify-between py-2 cursor-pointer">
                                <div>
                                    <p className="text-sm font-medium text-gray-700">{label}</p>
                                    <p className="text-xs text-gray-400">{desc}</p>
                                </div>
                                <button
                                    onClick={() => toggle(key)}
                                    className={`relative w-10 h-5.5 rounded-full transition-colors ${settings[key] ? 'bg-teal-500' : 'bg-gray-300'}`}
                                    style={{ minWidth: '2.5rem', height: '1.375rem' }}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings[key] ? 'translate-x-4' : ''}`} />
                                </button>
                            </label>
                        ))}
                    </div>
                </div>

                {/* SMS */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <MessageSquare className="h-5 w-5 text-green-500" />
                        <h2 className="font-semibold text-gray-800">Notifiche SMS</h2>
                    </div>
                    <div className="space-y-3">
                        <label className="flex items-center justify-between py-2 cursor-pointer">
                            <div>
                                <p className="text-sm font-medium text-gray-700">Promemoria SMS</p>
                                <p className="text-xs text-gray-400">SMS di promemoria al paziente (richiede integrazione SMS)</p>
                            </div>
                            <button
                                onClick={() => toggle('smsPromemoria')}
                                className={`relative rounded-full transition-colors ${settings.smsPromemoria ? 'bg-teal-500' : 'bg-gray-300'}`}
                                style={{ minWidth: '2.5rem', height: '1.375rem' }}
                            >
                                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.smsPromemoria ? 'translate-x-4' : ''}`} />
                            </button>
                        </label>
                        {settings.smsPromemoria && (
                            <div className="flex items-center gap-3 pl-2">
                                <label className="text-sm text-gray-600">Ore prima dell'appuntamento:</label>
                                <select
                                    value={settings.smsOrePromemoria}
                                    onChange={e => setSettings(s => ({ ...s, smsOrePromemoria: Number(e.target.value) }))}
                                    className="text-sm border border-gray-300 rounded-lg px-2 py-1"
                                >
                                    {[1, 2, 4, 6, 12, 24, 48].map(h => (
                                        <option key={h} value={h}>{h}h</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                {/* Notifiche interne */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Bell className="h-5 w-5 text-teal-500" />
                        <h2 className="font-semibold text-gray-800">Notifiche di sistema</h2>
                    </div>
                    <div className="space-y-3">
                        {[
                            { key: 'notificheInternal' as const, label: 'Notifiche in-app', desc: 'Ricezione notifiche nel pannello laterale' },
                            { key: 'notificheScadenzeMDL' as const, label: 'Scadenze Medicina del Lavoro', desc: 'Avvisi in-app per sorveglianze sanitarie in scadenza' }
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

export default ImpostazioniNotifichePage;
