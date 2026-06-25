/**
 * System Configuration Page - Management Section
 *
 * Impostazioni di sistema REALI. Attualmente l'unica impostazione di sistema con
 * effetto concreto e lato-client è il tema dell'interfaccia (chiaro/scuro/automatico),
 * gestito da ThemeContext e applicato globalmente su entrambi i branch (Sicurezza/Medica).
 *
 * Le ex impostazioni "Sicurezza" e "Feature Flags" sono state rimosse:
 *  - le security.* non erano lette da alcun middleware (impostazioni fittizie);
 *  - i feature flag sono gestiti dalla pagina dedicata (Funzionalità & Pricing / Tenant).
 *
 * @module pages/management/system/SystemConfigPage
 */

import React from 'react';
import { Sun, Moon, Monitor, Palette, Info } from 'lucide-react';
import { ThemeSelector } from '../../../components/settings/ThemeSelector';
import { useTheme } from '../../../context/ThemeContext';

const SystemConfigPage: React.FC = () => {
    const { mode, isDark } = useTheme();

    const modeLabel = mode === 'light' ? 'Chiaro' : mode === 'dark' ? 'Scuro' : 'Automatico';
    const ModeIcon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Monitor;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50 flex items-center gap-3">
                        <Palette className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                        Tema interfaccia
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        La preferenza si applica all'intera interfaccia, su entrambi i branch.
                    </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 text-sm font-medium border border-violet-100 dark:border-violet-900/50">
                    <ModeIcon className="w-4 h-4" />
                    {modeLabel}
                    {mode === 'auto' && (
                        <span className="text-violet-400 dark:text-violet-500">
                            ({isDark ? 'Scuro — sistema' : 'Chiaro — sistema'})
                        </span>
                    )}
                </div>
            </div>

            {/* Theme card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
                        Modalità di visualizzazione
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Scegli tra tema chiaro, scuro oppure automatico (segue il sistema operativo).
                    </p>
                </div>
                <div className="p-6">
                    <ThemeSelector />
                </div>
            </div>

            {/* Info note */}
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                <Info className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    La gestione delle funzionalità (feature) del tenant è disponibile nella pagina
                    dedicata <span className="font-medium text-gray-700 dark:text-gray-300">Funzionalità &amp; Pricing</span>.
                    Le impostazioni di sicurezza (timeout sessione, policy password) sono applicate
                    a livello di piattaforma.
                </p>
            </div>
        </div>
    );
};

export default SystemConfigPage;
