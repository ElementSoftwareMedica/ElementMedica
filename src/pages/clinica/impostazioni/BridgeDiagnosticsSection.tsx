/**
 * BridgeDiagnosticsSection
 * 
 * Runs connectivity diagnostics and displays results for the Medical Device Bridge.
 * 
 * @module pages/clinica/impostazioni/BridgeDiagnosticsSection
 */

import { useState, useCallback } from 'react';
import {
    Activity,
    Loader2,
    CheckCircle,
    XCircle,
    AlertCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { bridgeDirectApi, strumentiBridgeApi } from '@/services/bridgeApi';
import { BRIDGE_PORT, type DiagnosticResult } from './bridgeSettingsData';

interface BridgeDiagnosticsSectionProps {
    bridgeConnected: boolean;
}

function StatusIcon({ status }: { status: DiagnosticResult['status'] }) {
    switch (status) {
        case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
        case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
        case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-500" />;
        case 'pending': return <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />;
    }
}

export default function BridgeDiagnosticsSection({ bridgeConnected }: BridgeDiagnosticsSectionProps) {
    const { showToast } = useToast();
    const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
    const [isRunning, setIsRunning] = useState(false);

    const runDiagnostics = useCallback(async () => {
        setIsRunning(true);
        const results: DiagnosticResult[] = [];

        // Test 1: Backend API health (authenticated)
        results.push({ test: 'Backend API', status: 'pending', message: 'Verifica sessione webapp...' });
        setDiagnostics([...results]);

        try {
            const health = await strumentiBridgeApi.getBackendHealth();
            if (health?.valid) {
                results[results.length - 1] = {
                    test: 'Backend API',
                    status: 'success',
                    message: 'Sessione valida e API raggiungibile (porta 4001)',
                };
            } else {
                results[results.length - 1] = {
                    test: 'Backend API',
                    status: 'error',
                    message: 'API non ha restituito uno stato valido',
                };
            }
        } catch {
            results[results.length - 1] = {
                test: 'Backend API',
                status: 'error',
                message: 'Sessione non valida o API non raggiungibile',
                details: 'Se compare 401, effettuare nuovamente login e riprovare la diagnostica.',
            };
        }
        setDiagnostics([...results]);

        // Test 2: Bridge connectivity (direct)
        results.push({ test: 'Bridge Locale', status: 'pending', message: 'Verifica connessione...' });
        setDiagnostics([...results]);

        try {
            const isConnected = await bridgeDirectApi.isConnected();
            if (isConnected) {
                results[results.length - 1] = {
                    test: 'Bridge Locale',
                    status: 'success',
                    message: `Bridge raggiungibile (localhost:${BRIDGE_PORT})`,
                };
            } else {
                results[results.length - 1] = {
                    test: 'Bridge Locale',
                    status: 'error',
                    message: `Bridge non raggiungibile su localhost:${BRIDGE_PORT}`,
                    details: 'Aprire %LOCALAPPDATA%\\ElementMedica\\MedicalDeviceBridge\\logs\\bridge-runtime.log e rieseguire install.bat per vedere il controllo avvio.',
                };
            }
        } catch {
            results[results.length - 1] = {
                test: 'Bridge Locale',
                status: 'error',
                message: 'Errore durante il test di connessione',
                details: 'Il Bridge potrebbe non essere installato o si e\' chiuso subito: controllare bridge-runtime.log e permessi SmartScreen/antivirus.',
            };
        }
        setDiagnostics([...results]);

        // Test 3: Bridge status via backend proxy
        results.push({ test: 'Canale Backend-Bridge', status: 'pending', message: 'Verifica routing...' });
        setDiagnostics([...results]);

        try {
            const status = await strumentiBridgeApi.getBridgeStatus();
            if (status?.bridgeConnected) {
                results[results.length - 1] = {
                    test: 'Canale Backend-Bridge',
                    status: 'success',
                    message: 'Il Backend riesce a raggiungere il Bridge',
                };
            } else {
                results[results.length - 1] = {
                    test: 'Canale Backend-Bridge',
                    status: 'warning',
                    message: status?.message || 'Bridge non raggiungibile dal backend',
                    details: 'Il Bridge potrebbe non essere in esecuzione. Il backend gestirà i risultati quando il Bridge sarà attivo.',
                };
            }
        } catch {
            results[results.length - 1] = {
                test: 'Canale Backend-Bridge',
                status: 'warning',
                message: 'Non è stato possibile verificare il routing Backend→Bridge',
            };
        }
        setDiagnostics([...results]);

        // Test 4: Auto-config activation flow
        results.push({ test: 'Configurazione Automatica', status: 'pending', message: 'Verifica stato attivazione...' });
        setDiagnostics([...results]);

        if (bridgeConnected) {
            results[results.length - 1] = {
                test: 'Configurazione Automatica',
                status: 'success',
                message: 'Bridge attivo: configurazione tenant applicata automaticamente',
            };
        } else {
            results[results.length - 1] = {
                test: 'Configurazione Automatica',
                status: 'warning',
                message: 'Bridge non ancora attivo su questa postazione',
                details: 'Completare installazione e attivazione con codice licenza per applicare la configurazione tenant.',
            };
        }
        setDiagnostics([...results]);

        setIsRunning(false);

        const hasErrors = results.some(r => r.status === 'error');
        showToast({
            title: hasErrors ? 'Diagnostica completata con errori' : 'Diagnostica completata',
            message: hasErrors
                ? 'Alcuni test hanno fallito. Verificare la configurazione.'
                : 'Tutti i test sono passati correttamente.',
            type: hasErrors ? 'warning' : 'success',
        });
    }, [bridgeConnected, showToast]);

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-teal-600" />
                    Diagnostica connessione
                </h3>
                <button
                    onClick={runDiagnostics}
                    disabled={isRunning}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                    {isRunning ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Activity className="w-4 h-4" />
                    )}
                    {isRunning ? 'Test in corso...' : 'Esegui diagnostica'}
                </button>
            </div>

            {diagnostics.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-500">
                    <Activity className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>Clicca &quot;Esegui diagnostica&quot; per verificare la configurazione</p>
                </div>
            ) : (
                <div className="divide-y divide-gray-100">
                    {diagnostics.map((diag, idx) => (
                        <div key={idx} className="px-5 py-3 flex items-start gap-3">
                            <StatusIcon status={diag.status} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-800 text-sm">{diag.test}</span>
                                </div>
                                <p className="text-sm text-gray-600 mt-0.5">{diag.message}</p>
                                {diag.details && (
                                    <p className="text-xs text-gray-400 mt-1">{diag.details}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
