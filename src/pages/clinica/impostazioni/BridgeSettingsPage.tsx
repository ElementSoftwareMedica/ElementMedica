/**
 * BridgeSettingsPage
 *
 * No-config settings page for Medical Device Bridge installation and diagnostics.
 *
 * @module pages/clinica/impostazioni/BridgeSettingsPage
 */

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Wifi,
    WifiOff,
    Loader2,
    RefreshCw,
    Cable,
    Download,
    ShieldCheck,
    Monitor,
    CheckCircle,
    KeyRound,
    ArrowRight,
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { bridgeDirectApi, strumentiBridgeApi } from '@/services/bridgeApi';
import { BRIDGE_PORT } from './bridgeSettingsData';
import BridgeLicensesSection from './BridgeLicensesSection';

export default function BridgeSettingsPage() {
    const { showToast } = useToast();
    const [isDownloading, setIsDownloading] = useState(false);

    const {
        data: bridgeState = 'offline',
        isLoading: isCheckingBridge,
        refetch: recheckBridge,
    } = useQuery({
        queryKey: ['bridge-settings-status'],
        queryFn: () => bridgeDirectApi.getConnectionState(),
        refetchInterval: 15000,
        retry: false,
    });

    const isOperational = bridgeState === 'operational';
    const isSetup = bridgeState === 'setup';

    const handleDownloadInstaller = useCallback(async () => {
        setIsDownloading(true);
        try {
            await strumentiBridgeApi.downloadInstaller();
            showToast({
                title: 'Download avviato',
                message: 'Pacchetto pronto: install.bat, guida e medical-bridge-win.exe.',
                type: 'success',
            });
        } catch (error) {
            const message = error instanceof Error && error.message
                ? error.message
                : 'Impossibile scaricare il pacchetto di installazione.';
            showToast({
                title: 'Errore download',
                message,
                type: 'error',
            });
        } finally {
            setIsDownloading(false);
        }
    }, [showToast]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Cable className="w-6 h-6 text-teal-600" />
                        Medical Device Bridge
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Installazione guidata no-config per postazioni multi-tenant
                    </p>
                </div>
                <button
                    onClick={() => recheckBridge()}
                    disabled={isCheckingBridge}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${isCheckingBridge ? 'animate-spin' : ''}`} />
                    Aggiorna stato
                </button>
            </div>

            <div className={`rounded-xl border-2 p-6 ${isOperational ? 'border-green-200 bg-green-50' : isSetup ? 'border-yellow-200 bg-yellow-50' : 'border-amber-200 bg-amber-50'}`}>
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${isOperational ? 'bg-green-100' : isSetup ? 'bg-yellow-100' : 'bg-amber-100'}`}>
                        {isCheckingBridge ? (
                            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                        ) : isOperational ? (
                            <Wifi className="w-8 h-8 text-green-600" />
                        ) : isSetup ? (
                            <Wifi className="w-8 h-8 text-yellow-600" />
                        ) : (
                            <WifiOff className="w-8 h-8 text-amber-600" />
                        )}
                    </div>
                    <div className="flex-1">
                        <h3 className={`text-lg font-semibold ${isOperational ? 'text-green-800' : isSetup ? 'text-yellow-800' : 'text-amber-800'}`}>
                            {isCheckingBridge
                                ? 'Verifica connessione in corso...'
                                : isOperational
                                    ? 'Bridge operativo su questa postazione'
                                    : isSetup
                                        ? 'Bridge in attivazione — inserire codice licenza'
                                        : 'Bridge non raggiungibile su questa postazione'}
                        </h3>
                        <p className={`text-sm mt-1 ${isOperational ? 'text-green-700' : isSetup ? 'text-yellow-700' : 'text-amber-700'}`}>
                            {isOperational
                                ? `Connessione locale attiva su localhost:${BRIDGE_PORT}. I dispositivi sono pronti all'uso.`
                                : isSetup
                                    ? `Bridge avviato su localhost:${BRIDGE_PORT} ma in attesa di attivazione. Aprire http://localhost:${BRIDGE_PORT}/setup e inserire il codice licenza generato qui sotto.`
                                    : `Nessuna risposta su localhost:${BRIDGE_PORT}. Scaricare il pacchetto aggiornato qui sotto, estrarre lo ZIP ed eseguire install.bat. Se il Bridge è già installato, aggiornarlo alla versione più recente per garantire la compatibilità con questa applicazione.`}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-gradient-to-br from-teal-50 via-white to-emerald-50 rounded-xl border-2 border-teal-200 overflow-hidden">
                <div className="px-6 py-5">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-teal-100 rounded-xl">
                            <Download className="w-8 h-8 text-teal-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-800">Installazione rapida Windows</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Scarica il pacchetto, esegui install.bat e inserisci la key di attivazione generata qui sotto.
                                Non sono richieste configurazioni manuali.
                            </p>
                            <div className="flex flex-wrap items-center gap-3 mt-4">
                                <button
                                    onClick={handleDownloadInstaller}
                                    disabled={isDownloading}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 shadow-sm"
                                >
                                    {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                    {isDownloading ? 'Download in corso...' : 'Scarica installer completo'}
                                </button>
                                <span className="text-xs text-gray-500">
                                    Contiene: install.bat + medical-bridge-win.exe + guida
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                            {
                                icon: <ShieldCheck className="w-4 h-4 text-teal-700" />,
                                title: 'Key per tenant',
                                desc: 'Le key sono isolate per singolo tenant',
                            },
                            {
                                icon: <KeyRound className="w-4 h-4 text-teal-700" />,
                                title: 'Attivazione guidata',
                                desc: 'Inserisci la key nel setup locale del Bridge',
                            },
                            {
                                icon: <Monitor className="w-4 h-4 text-teal-700" />,
                                title: 'Per postazione',
                                desc: 'Una licenza per ogni PC autorizzato',
                            },
                            {
                                icon: <CheckCircle className="w-4 h-4 text-teal-700" />,
                                title: 'Pronto in pochi minuti',
                                desc: 'Nessun file tecnico da modificare',
                            },
                        ].map((item) => (
                            <div key={item.title} className="bg-white/75 rounded-lg border border-teal-100 p-3">
                                <p className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                                    {item.icon}
                                    {item.title}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-teal-200 p-5">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-teal-600" />
                    Dove trovo la key di attivazione?
                </h3>
                <p className="text-sm text-gray-600 mt-2">
                    La key si genera nella sezione <strong>Key Bridge</strong> qui sotto.
                    Ogni key puo essere usata su un solo PC. Dopo l&apos;attivazione vedrai subito su quale postazione e attiva.
                </p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-800">1. Crea key</p>
                        <p className="text-xs text-gray-600 mt-1">Clicca "Nuova key" e assegna un nome alla postazione.</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-800">2. Copia e invia</p>
                        <p className="text-xs text-gray-600 mt-1">Invia il codice ELEM-XXXX-XXXX-XXXX all&apos;operatore del PC.</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-800">3. Verifica attivazione</p>
                        <p className="text-xs text-gray-600 mt-1">Controlla stato, ultimo contatto e nome del PC dalla lista key.</p>
                    </div>
                </div>
                <p className="text-xs text-teal-700 mt-3 flex items-center gap-1">
                    <ArrowRight className="w-3.5 h-3.5" />
                    Se una key risulta usata su un PC errato, revocala e generane una nuova.
                </p>
            </div>

            <BridgeLicensesSection />
        </div>
    );
}
