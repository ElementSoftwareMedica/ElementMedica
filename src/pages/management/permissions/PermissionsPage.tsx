/**
 * Permissions Page - Consolidated Permissions Management
 * 
 * Tab-based interface combining:
 * - Tab 1: Gestione Permessi (advanced role-based permission management)
 * - Tab 2: Matrice Permessi (visual permission matrix overview)
 * 
 * @module pages/management/permissions/PermissionsPage
 * @project 69 - Roles & Permissions Refactoring
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Shield,
    Settings,
    Grid3X3,
    Users,
    Loader2
} from 'lucide-react';

// Lazy load tab content components
const PermissionManagementTab = lazy(() => import('./PermissionManagementTab'));
const PermissionMatrixTab = lazy(() => import('./PermissionMatrixTab'));
const PersonPermissionsTab = lazy(() => import('./PersonPermissionsTab'));

// Tab configuration
type TabId = 'management' | 'matrix' | 'person';

interface TabConfig {
    id: TabId;
    label: string;
    icon: React.ElementType;
    description: string;
}

const TABS: TabConfig[] = [
    {
        id: 'management',
        label: 'Gestione Permessi',
        icon: Settings,
        description: 'Configura permessi CRUD, scope e campi per ogni ruolo'
    },
    {
        id: 'matrix',
        label: 'Matrice Permessi',
        icon: Grid3X3,
        description: 'Visualizzazione matrice permessi per risorsa e ruolo'
    },
    {
        id: 'person',
        label: 'Per Persona',
        icon: Users,
        description: 'Gestisci permessi personalizzati per singoli utenti'
    }
];

// Tab content loader
const TabLoader = () => (
    <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Caricamento...</span>
    </div>
);

const PermissionsPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    // Get initial tab from URL or default to 'management'
    const initialTab = (searchParams.get('tab') as TabId) || 'management';
    const [activeTab, setActiveTab] = useState<TabId>(initialTab);

    // Sync URL with tab changes
    const handleTabChange = (tabId: TabId) => {
        setActiveTab(tabId);
        const newParams = new URLSearchParams(searchParams);
        if (tabId === 'management') {
            newParams.delete('tab'); // Default tab doesn't need URL param
        } else {
            newParams.set('tab', tabId);
        }
        setSearchParams(newParams, { replace: true });
    };

    // Sync tab state with URL changes (e.g., browser back/forward)
    useEffect(() => {
        const tabFromUrl = searchParams.get('tab') as TabId | null;
        if (tabFromUrl && TABS.some(t => t.id === tabFromUrl)) {
            setActiveTab(tabFromUrl);
        } else if (!tabFromUrl) {
            setActiveTab('management');
        }
    }, [searchParams]);

    const activeTabConfig = TABS.find(t => t.id === activeTab);

    return (
        <div className="flex flex-col h-[calc(100vh-7rem)]">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 -mx-6 -mt-6 px-6 py-4 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl shadow-lg">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                                Permessi
                            </h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {activeTabConfig?.description}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation - P69: Flex layout for height management */}
            <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden mt-6">
                {/* Tab Headers */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${isActive
                                    ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border-b-2 border-violet-600'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                                    }`}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? 'text-violet-600 dark:text-violet-400' : ''}`} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content - P69: Flex-1 for proper height */}
                <div className="flex-1 flex flex-col p-6 overflow-y-auto min-h-0">
                    <Suspense fallback={<TabLoader />}>
                        {activeTab === 'management' && <PermissionManagementTab />}
                        {activeTab === 'matrix' && <PermissionMatrixTab />}
                        {activeTab === 'person' && <PersonPermissionsTab />}
                    </Suspense>
                </div>
            </div>
        </div>
    );
};

export default PermissionsPage;
