/**
 * Management Config Hub
 *
 * Hub di configurazione centralizzato per il ramo Management.
 * Raggruppa in un unico hub tabbed:
 *  - Messaggistica (SMTP, WhatsApp, PEC)
 *  - Config Sistema (impostazioni globali + preferenze tema)
 *
 * Accessibile via /management/config
 *
 * @module pages/management/system/ManagementConfigHub
 */

import React, { lazy, Suspense, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle, Settings2, Loader2, Lock, ExternalLink } from 'lucide-react';
import { useAuth } from '../../../hooks/auth/useAuth';
import { useTenantAccess } from '../../../hooks/useTenantAccess';

// Lazy imports
const MessagingConfigPage = lazy(() => import('../../settings/MessagingConfigPage'));
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
        id: 'sistema',
        label: 'Config Sistema',
        icon: <Settings2 className="h-4 w-4" />,
        description: 'Preferenze tema dell\'interfaccia (chiaro/scuro/automatico)',
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
    const { user } = useAuth();
    const { hasFeature, currentTenantId } = useTenantAccess();

    // Global admin = ADMIN or SUPER_ADMIN only
    const isGlobalAdmin = user?.role === 'Admin' ||
        user?.globalRole === 'ADMIN' ||
        user?.globalRole === 'SUPER_ADMIN' ||
        user?.roles?.includes('ADMIN') ||
        user?.roles?.includes('SUPER_ADMIN');

    // Feature checks for tabs
    const hasMessagingFeature = isGlobalAdmin ||
        hasFeature('PEC_INTEGRATION') ||
        hasFeature('SMS_NOTIFICATIONS') ||
        hasFeature('WHATSAPP_INTEGRATION');

    // Visible tabs based on role/features
    const visibleTabs = CONFIG_TABS.filter(tab => {
        if (tab.id === 'messaging') return hasMessagingFeature || isGlobalAdmin;
        if (tab.id === 'sistema') return isGlobalAdmin;
        return true;
    });

    const [activeTab, setActiveTab] = useState<string>(() => {
        const hash = tabFromHash(location.hash);
        return hash;
    });

    // Sincronizza tab con URL hash, redirect se tab non visibile
    useEffect(() => {
        const hash = tabFromHash(location.hash);
        const isVisible = visibleTabs.some(t => t.id === hash);
        if (isVisible) {
            setActiveTab(hash);
        } else if (visibleTabs.length > 0) {
            const defaultTab = visibleTabs[0].id;
            setActiveTab(defaultTab);
            navigate(`/management/config#${defaultTab}`, { replace: true });
        }
    }, [location.hash]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        navigate(`/management/config#${tabId}`, { replace: true });
    };

    const currentTab = visibleTabs.find(t => t.id === activeTab) ?? visibleTabs[0];

    // Upsell block for locked tabs
    const FeatureUpsell: React.FC<{ feature: string; label: string }> = ({ feature, label }) => (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {label} non attivo
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
                Questa funzionalità non è attiva per il tuo tenant. Attivala per sbloccare {label.toLowerCase()}.
            </p>
            {currentTenantId && (
                <a
                    href={`/management/my-tenants/${currentTenantId}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm font-medium"
                >
                    <ExternalLink className="w-4 h-4" />
                    Attiva la funzionalità
                </a>
            )}
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-6 max-w-7xl">
            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-3 text-gray-900 dark:text-gray-100">
                    <Settings2 className="h-7 w-7 text-violet-600" />
                    Configurazione
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Impostazioni centralizzate: messaggistica e configurazione sistema
                </p>
            </div>

            {/* Hub Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                {/* Tab Bar */}
                <div className="border-b border-gray-200 dark:border-gray-700 px-2 pt-2">
                    <nav className="flex gap-1 overflow-x-auto" aria-label="Config tabs">
                        {visibleTabs.map(tab => {
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
                        {currentTab?.description}
                    </p>
                </div>

                {/* Tab Content */}
                <div className="p-0">
                    <Suspense fallback={<LoadingSpinner />}>
                        {activeTab === 'messaging' && (
                            hasMessagingFeature
                                ? <MessagingConfigPage />
                                : <FeatureUpsell feature="messaging" label="Messaggistica" />
                        )}
                        {activeTab === 'sistema' && <SystemConfigPage />}
                    </Suspense>
                </div>
            </div>
        </div>
    );
};

export default ManagementConfigHub;
