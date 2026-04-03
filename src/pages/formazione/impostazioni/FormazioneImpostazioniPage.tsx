/**
 * Formazione Impostazioni Page
 *
 * Pagina impostazioni per il modulo ElementSicurezza (Formazione).
 * Struttura a card come ClinicaSettingsPage, con sezioni specifiche per la formazione.
 *
 * @module pages/formazione/impostazioni/FormazioneImpostazioniPage
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Settings,
    ChevronRight,
    Loader2,
    Save,
    Palette,
    PenTool,
    Activity,
    MonitorDown
} from 'lucide-react';
import { ThemeSelector } from '../../../components/settings/ThemeSelector';

interface SettingsSection {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    link?: string;
}

const settingsSections: SettingsSection[] = [
    {
        id: 'aspetto',
        title: 'Aspetto',
        description: 'Tema chiaro, scuro o automatico',
        icon: Palette
    },
    {
        id: 'firma',
        title: 'Firma Formatori',
        description: 'Acquisisci e gestisci la firma digitale dei formatori per attestati e registri',
        icon: PenTool,
        link: '/formazione/impostazioni/firma'
    },
    {
        id: 'logs',
        title: 'Log Attività',
        description: 'Visualizza le attività recenti del sistema',
        icon: Activity,
        link: '/management/logs'
    },
    {
        id: 'desktop-app',
        title: 'App Desktop MDL',
        description: 'Scarica l’app per lavorare offline durante le visite in azienda',
        icon: MonitorDown,
        link: '/formazione/impostazioni/desktop'
    }
];

const FormazioneImpostazioniPage: React.FC = () => {
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const handleSectionClick = (sectionId: string) => {
        setActiveSection(activeSection === sectionId ? null : sectionId);
    };

    const handleSave = async () => {
        setSaving(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSaving(false);
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Settings className="h-8 w-8 text-blue-600" />
                    <h1 className="text-2xl font-bold text-gray-900">
                        Impostazioni Formazione
                    </h1>
                </div>
                <p className="text-gray-600">
                    Configura le impostazioni del modulo ElementSicurezza
                </p>
            </div>

            {/* Settings Sections */}
            <div className="space-y-4">
                {settingsSections.map((section) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;

                    if (section.link) {
                        return (
                            <Link
                                key={section.id}
                                to={section.link}
                                className="block bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
                            >
                                <div className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
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
                                    <ChevronRight className="h-5 w-5 text-gray-400" />
                                </div>
                            </Link>
                        );
                    }

                    return (
                        <div
                            key={section.id}
                            className={`bg-white rounded-lg border transition-all ${isActive
                                ? 'border-blue-500 shadow-md'
                                : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <button
                                onClick={() => handleSectionClick(section.id)}
                                className="w-full p-4 flex items-center justify-between text-left"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg ${isActive
                                        ? 'bg-blue-100 text-blue-600'
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
                                    className={`h-5 w-5 text-gray-400 transition-transform ${isActive ? 'rotate-90' : ''}`}
                                />
                            </button>

                            {isActive && (
                                <div className="px-4 pb-4 border-t border-gray-100">
                                    <div className="pt-4">
                                        {section.id === 'aspetto' ? (
                                            <ThemeSelector />
                                        ) : (
                                            <p className="text-sm text-gray-500 italic">
                                                Questa sezione è in fase di sviluppo.
                                                Le impostazioni saranno disponibili a breve.
                                            </p>
                                        )}
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
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
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

export default FormazioneImpostazioniPage;
