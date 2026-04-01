/**
 * Management Preferences Page
 * 
 * Pagina preferenze personali per Management (tema, accessibilità, etc.)
 * P60: Design System Unificato e Dark Mode
 * 
 * @module pages/management/ManagementPreferencesPage
 */

import React from 'react';
import { Settings } from 'lucide-react';
import { ThemeSelector } from '../../components/settings/ThemeSelector';

const ManagementPreferencesPage: React.FC = () => {
    return (
        <div className="p-6 max-w-4xl">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <Settings className="h-6 w-6 text-violet-600" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        Preferenze Personali
                    </h2>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Configura l'aspetto e le preferenze dell'interfaccia
                </p>
            </div>

            {/* Theme Selector */}
            <div className="mb-6">
                <ThemeSelector />
            </div>
        </div>
    );
};

export default ManagementPreferencesPage;
