/**
 * Constants and types for BridgeSettingsPage
 * Extracted to reduce main page file size.
 * 
 * @module pages/clinica/impostazioni/bridgeSettingsData
 */

import { Heart, Wind, Ear, type LucideIcon } from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface DeviceConfig {
    name: string;
    type: string;
    icon: LucideIcon;
    description: string;
    software: string;
    protocol: string;
    outputFormat: string;
    setupSteps: SetupStep[];
    defaultPaths: {
        executable: string;
        gdtInput: string;
        gdtOutput: string;
    };
}

export interface SetupStep {
    title: string;
    description: string;
    detail?: string;
}

export interface DiagnosticResult {
    test: string;
    status: 'success' | 'error' | 'warning' | 'pending';
    message: string;
    details?: string;
}

// ============================================
// CONSTANTS
// ============================================

export const BRIDGE_PORT = 4050;

export const SUPPORTED_DEVICES: DeviceConfig[] = [
    {
        name: 'Edan SE-1515',
        type: 'ECG',
        icon: Heart,
        description: 'Elettrocardiografo 12 derivazioni',
        software: 'Edan PCECG / ECGViewer',
        protocol: 'GDT 2.1',
        outputFormat: 'GDT + PDF',
        defaultPaths: {
            executable: 'C:\\Program Files\\EDAN\\ECGViewer.exe',
            gdtInput: 'C:\\SE-1515\\GDTFolder001',
            gdtOutput: 'C:\\SE-1515\\GDTFolder001',
        },
        setupSteps: [
            {
                title: 'Installare il software Edan',
                description: 'Installare Edan PCECG o ECGViewer dal CD fornito con il dispositivo.',
                detail: 'Seguire la procedura di installazione standard. Annotare il percorso di installazione.',
            },
            {
                title: 'Creare le cartelle GDT',
                description: 'Se esiste C:\\SE-1515\\GDTFolder001 usa quella; altrimenti crea cartelle dedicate.',
                detail: 'Consigliato Edan: C:\\SE-1515\\GDTFolder001 (cartella unica). Alternativa: Input/Output separati.',
            },
            {
                title: 'Configurare GDT nel software Edan',
                description: 'Aprire il software Edan → Impostazioni → GDT/HL7 → Abilitare GDT 2.1.',
                detail: 'Impostare cartella GDT su C:\\SE-1515\\GDTFolder001 (o percorso scelto), formato GDT 2.1, export PDF attivo.',
            },
            {
                title: 'Verificare il collegamento',
                description: 'Collegare l\'ECG via USB, avviare il software Edan e verificare che rilevi il dispositivo.',
            },
        ],
    },
    {
        name: 'MIR MiniSpir',
        type: 'Spirometro',
        icon: Wind,
        description: 'Spirometro portatile',
        software: 'WinSpiro PRO',
        protocol: 'GDT 2.1',
        outputFormat: 'GDT + PDF',
        defaultPaths: {
            executable: 'C:\\Program Files\\MIR\\WinspiroPRO\\Winspiro.exe',
            gdtInput: 'C:\\GDT\\MIR\\Input',
            gdtOutput: 'C:\\GDT\\MIR\\Output',
        },
        setupSteps: [
            {
                title: 'Installare WinSpiro PRO',
                description: 'Scaricare e installare WinSpiro PRO dal sito MIR o dal CD fornito.',
                detail: 'Percorso predefinito: C:\\Program Files (x86)\\MIR\\WinSpiro PRO\\',
            },
            {
                title: 'Creare le cartelle GDT',
                description: 'Creare due cartelle per lo scambio dati GDT.',
                detail: 'Cartella Input: C:\\GDT\\MIR\\Input — Cartella Output: C:\\GDT\\MIR\\Output',
            },
            {
                title: 'Configurare GDT in WinSpiro',
                description: 'Aprire WinSpiro PRO → Strumenti/Opzioni e cercare Interfaccia GDT o voci PVS/EMR/External Interface.',
                detail: 'Se il menu GDT non compare, esegui WinSpiro come amministratore e verifica con il fornitore MIR se il modulo GDT e\' abilitato in licenza.',
            },
            {
                title: 'Verificare il collegamento',
                description: 'Collegare lo spirometro via USB, avviare WinSpiro e verificare che rilevi il dispositivo.',
            },
        ],
    },
    {
        name: 'Oscilla TSA',
        type: 'Audiometro',
        icon: Ear,
        description: 'Audiometro tonale e vocale',
        software: 'Oscilla AudioConsole',
        protocol: 'GDT 2.1',
        outputFormat: 'GDT + PDF',
        defaultPaths: {
            executable: 'C:\\Program Files\\Oscilla\\AudioConsole\\AudioConsole.exe',
            gdtInput: 'C:\\GDT\\OSCILLA\\Input',
            gdtOutput: 'C:\\GDT\\OSCILLA\\Output',
        },
        setupSteps: [
            {
                title: 'Installare Oscilla AudioConsole',
                description: 'Installare il software Oscilla AudioConsole dal CD fornito con il dispositivo.',
                detail: 'Percorso predefinito: C:\\Program Files\\Oscilla\\AudioConsole\\',
            },
            {
                title: 'Creare le cartelle GDT',
                description: 'Creare due cartelle per lo scambio dati GDT.',
                detail: 'Cartella Input: C:\\GDT\\OSCILLA\\Input — Cartella Output: C:\\GDT\\OSCILLA\\Output',
            },
            {
                title: 'Configurare GDT in AudioConsole',
                description: 'Aprire AudioConsole → Settings/Advanced e cercare GDT, PVS o External Interface.',
                detail: 'Se non trovi il menu, esegui come amministratore e verifica col fornitore Oscilla se la versione 4.5 richiede modulo/licenza GDT.',
            },
            {
                title: 'Verificare il collegamento',
                description: 'Collegare l\'audiometro via USB, avviare AudioConsole e verificare che rilevi il dispositivo.',
            },
        ],
    },
];
