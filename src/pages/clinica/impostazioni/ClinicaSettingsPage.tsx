/**
 * Clinica Settings Page
 * 
 * Pagina impostazioni per il modulo Poliambulatorio
 * 
 * @module pages/poliambulatorio/impostazioni/ClinicaSettingsPage
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
    Loader2,
    Stethoscope,
    Palette,
    PenTool,
    Cable,
    MonitorDown
} from 'lucide-react';
import { ThemeSelector } from '../../../components/settings/ThemeSelector';

interface SettingsSection {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    link?: string; // Optional link for navigation
}

const settingsSections: SettingsSection[] = [
    {
        id: 'aspetto',
        title: 'Aspetto',
        description: 'Tema chiaro, scuro o automatico',
        icon: Palette
    },
    {
        id: 'generale',
        title: 'Impostazioni Generali',
        description: 'Configurazione base del poliambulatorio (sedi, ambulatori)',
        icon: Building2,
        link: '/poliambulatorio/struttura'
    },
    {
        id: 'visit-templates',
        title: 'Template Visita',
        description: 'Configura i campi e il layout della pagina visita',
        icon: Stethoscope,
        link: '/poliambulatorio/impostazioni/visit-templates'
    },
    {
        id: 'modulistica',
        title: 'Modulistica',
        description: 'Gestione documenti e moduli da compilare durante le visite',
        icon: FileText,
        link: '/poliambulatorio/impostazioni/modulistica'
    },
    {
        id: 'firma',
        title: 'Firma Digitale',
        description: 'Acquisisci e gestisci la firma digitale per i referti',
        icon: PenTool,
        link: '/poliambulatorio/impostazioni/firma'
    },
    {
        id: 'email-template',
        title: 'Template Email Referto',
        description: 'Configura il testo delle email di invio referto per branca, medico o prestazione',
        icon: Mail,
        link: '/poliambulatorio/impostazioni/email-template'
    },
    {
        id: 'consensi-firma',
        title: 'Consensi Firma Tablet',
        description: 'Personalizza i moduli di consenso informato presentati al paziente sul tablet',
        icon: Shield,
        link: '/poliambulatorio/impostazioni/consensi-firma'
    },
    {
        id: 'bridge',
        title: 'Medical Device Bridge',
        description: 'Collegamento dispositivi medici (ECG, Spirometro, Audiometro)',
        icon: Cable,
        link: '/poliambulatorio/impostazioni/bridge'
    },
    {
        id: 'orari',
        title: 'Orari & Disponibilità',
        description: 'Gestione degli orari dei medici e disponibilità ambulatori',
        icon: Clock,
        link: '/poliambulatorio/disponibilita'
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
        id: 'utenti',
        title: 'Utenti e Ruoli',
        description: 'Gestione personale, medici e permessi',
        icon: Users,
        link: '/poliambulatorio/personale/medici'
    },
    {
        id: 'desktop-app',
        title: 'App Desktop MDL',
        description: 'Scarica l’app per lavorare offline durante le visite in azienda',
        icon: MonitorDown,
        link: '/settings/desktop'
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

                    // Se ha un link, usa Link invece di button
                    if (section.link) {
                        return (
                            <Link
                                key={section.id}
                                to={section.link}
                                className="block bg-white rounded-lg border border-gray-200 hover:border-teal-300 hover:shadow-md transition-all"
                            >
                                <div className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 rounded-lg bg-teal-100 text-teal-600">
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
