/**
 * Clinica Settings Page
 * 
 * Pagina impostazioni per il modulo Poliambulatorio
 * 
 * @module pages/poliambulatorio/impostazioni/ClinicaSettingsPage
 */

import React, { useState } from 'react';
import {
    Settings,
    Building2,
    Clock,
    Bell,
    Shield,
    FileText,
    Mail,
    Calendar,
    Users,
    ChevronRight,
    Save,
    Loader2
} from 'lucide-react';

interface SettingsSection {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
}

const settingsSections: SettingsSection[] = [
    {
        id: 'generale',
        title: 'Impostazioni Generali',
        description: 'Configurazione base del poliambulatorio',
        icon: Building2
    },
    {
        id: 'orari',
        title: 'Orari di Apertura',
        description: 'Gestione degli orari di apertura e chiusura',
        icon: Clock
    },
    {
        id: 'notifiche',
        title: 'Notifiche',
        description: 'Configurazione notifiche email e SMS',
        icon: Bell
    },
    {
        id: 'privacy',
        title: 'Privacy e GDPR',
        description: 'Impostazioni privacy e conformità GDPR',
        icon: Shield
    },
    {
        id: 'documenti',
        title: 'Documenti',
        description: 'Template documenti e referti',
        icon: FileText
    },
    {
        id: 'email',
        title: 'Email',
        description: 'Configurazione server email',
        icon: Mail
    },
    {
        id: 'appuntamenti',
        title: 'Appuntamenti',
        description: 'Impostazioni prenotazioni online',
        icon: Calendar
    },
    {
        id: 'utenti',
        title: 'Utenti e Ruoli',
        description: 'Gestione personale e permessi',
        icon: Users
    }
];

const ClinicaSettingsPage: React.FC = () => {
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const handleSectionClick = (sectionId: string) => {
        setActiveSection(activeSection === sectionId ? null : sectionId);
    };

    const handleSave = async () => {
        setSaving(true);
        // Simulate save
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSaving(false);
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Settings className="h-8 w-8 text-teal-600" />
                    <h1 className="text-2xl font-bold text-gray-900">
                        Impostazioni Poliambulatorio
                    </h1>
                </div>
                <p className="text-gray-600">
                    Configura le impostazioni del modulo Poliambulatorio
                </p>
            </div>

            {/* Settings Sections */}
            <div className="space-y-4">
                {settingsSections.map((section) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;

                    return (
                        <div
                            key={section.id}
                            className={`bg-white rounded-lg border transition-all ${isActive
                                    ? 'border-teal-500 shadow-md'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <button
                                onClick={() => handleSectionClick(section.id)}
                                className="w-full p-4 flex items-center justify-between text-left"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg ${isActive
                                            ? 'bg-teal-100 text-teal-600'
                                            : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900">
                                            {section.title}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {section.description}
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight
                                    className={`h-5 w-5 text-gray-400 transition-transform ${isActive ? 'rotate-90' : ''
                                        }`}
                                />
                            </button>

                            {isActive && (
                                <div className="px-4 pb-4 border-t border-gray-100">
                                    <div className="pt-4">
                                        <p className="text-sm text-gray-500 italic">
                                            Questa sezione è in fase di sviluppo.
                                            Le impostazioni saranno disponibili a breve.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Save Button */}
            <div className="mt-8 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                >
                    {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="h-4 w-4" />
                    )}
                    Salva Impostazioni
                </button>
            </div>
        </div>
    );
};

export default ClinicaSettingsPage;
