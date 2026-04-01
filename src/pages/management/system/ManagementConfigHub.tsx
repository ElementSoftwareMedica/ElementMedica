/**
 * Management Config Hub
 *
 * Hub di configurazione centralizzato per il ramo Management.
 * Raggruppa in un unico hub tabbed:
 *  - Messaggistica (SMTP, WhatsApp, PEC)
 *  - Widget Pubblici (tenant per frontend pubblico)
 *  - Preferenze (tema, accessibilità)
 *  - Config Sistema (impostazioni globali)
 *
 * Accessibile via /management/config
 *
 * @module pages/management/system/ManagementConfigHub
 */

import React, { lazy, Suspense, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle, Globe, Settings2, Sliders, Loader2 } from 'lucide-react';

// Lazy imports - componenti esistenti riutilizzati
const MessagingConfigPage = lazy(() => import('../../settings/MessagingConfigPage'));
const PublicBrandSettingsPage = lazy(() => import('../PublicBrandSettingsPage'));
const ManagementPreferencesPage = lazy(() => import('../ManagementPreferencesPage'));
const SystemConfigPage = lazy(() => import('./SystemConfigPage'));

// ─────────────────────────────────────────────
// Tipi
// ─────────────────────────────────────────────
interface ConfigTab {
    id: string;
    label: string;
    icon: React.ReactNode;
    description: string;
}

const CONFIG_TABS: ConfigTab[] = [
    {
        id: 'messaging',
        label: 'Messaggistica',
        icon: <MessageCircle className="h-4 w-4" />,
        description: 'Configura SMTP, WhatsApp e PEC per l\'invio di comunicazioni',
    },
    {
        id: 'widget-pubblici',
        label: 'Widget Pubblici',
        icon: <Globe className="h-4 w-4" />,
        description: 'Associa il tenant corretto ai widget del frontend pubblico (medici, corsi, disponibilità)',
    },
    {
        id: 'preferenze',
        label: 'Preferenze',
        icon: <Sliders className="h-4 w-4" />,
        description: 'Tema, accessibilità e preferenze personali dell\'interfaccia',
    },
    {
        id: 'sistema',
        label: 'Config Sistema',
        icon: <Settings2 className="h-4 w-4" />,
        description: 'Impostazioni globali e parametri di sistema',
    },
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const tabFromHash = (hash: string): string => {
    const id = hash.replace('#', '');
    return CONFIG_TABS.find(t => t.id === id)?.id ?? 'messaging';
};

const LoadingSpinner: React.FC<{ color?: string }> = ({ color = 'violet' }) => (
    <div className="flex items-center justify-center py-16">
        <Loader2 className={`h-8 w-8 animate-spin text-${color}-600`} />
    </div>
);

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
const ManagementConfigHub: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<string>(() =>
        tabFromHash(location.hash)
    );

    // Sincronizza tab con URL hash
    useEffect(() => {
        setActiveTab(tabFromHash(location.hash));
    }, [location.hash]);

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        navigate(`/management/config#${tabId}`, { replace: true });
    };

    const currentTab = CONFIG_TABS.find(t => t.id === activeTab) ?? CONFIG_TABS[0];

    return (
        <div className="container mx-auto px-4 py-6 max-w-7xl">
            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-3 text-gray-900 dark:text-gray-100">
                    <Settings2 className="h-7 w-7 text-violet-600" />
                    Configurazione
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Impostazioni centralizzate: messaggistica, widget pubblici, preferenze e sistema
                </p>
            </div>

            {/* Hub Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                {/* Tab Bar */}
                <div className="border-b border-gray-200 dark:border-gray-700 px-2 pt-2">
                    <nav className="flex gap-1 overflow-x-auto" aria-label="Config tabs">
                        {CONFIG_TABS.map(tab => {
                            const isActive = tab.id === activeTab;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={[
                                        'flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap',
                                        isActive
                                            ? 'border-violet-600 text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30'
                                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800',
                                    ].join(' ')}
                                    aria-current={isActive ? 'page' : undefined}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Tab Description */}
                <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {currentTab.description}
                    </p>
                </div>

                {/* Tab Content */}
                <div className="p-0">
                    <Suspense fallback={<LoadingSpinner />}>
                        {activeTab === 'messaging' && <MessagingConfigPage />}
                        {activeTab === 'widget-pubblici' && <PublicBrandSettingsPage />}
                        {activeTab === 'preferenze' && <ManagementPreferencesPage />}
                        {activeTab === 'sistema' && <SystemConfigPage />}
                    </Suspense>
                </div>
            </div>
        </div>
    );
};

export default ManagementConfigHub;
