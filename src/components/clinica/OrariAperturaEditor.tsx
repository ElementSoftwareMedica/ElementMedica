/**
 * OrariAperturaEditor
 * 
 * Componente avanzato per la gestione degli orari di apertura settimanali.
 * Supporta multiple fasce orarie per giorno, copia orari, presets.
 * 
 * @module components/clinica/OrariAperturaEditor
 */

import React, { useState, useCallback } from 'react';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import {
    Clock,
    Plus,
    Trash2,
    Copy,
    ClipboardPaste,
    RotateCcw,
    ChevronDown,
    ChevronUp,
    Check,
    AlertCircle,
    Moon
} from 'lucide-react';

// Giorni della settimana
const GIORNI_SETTIMANA = [
    { value: 1, label: 'Lunedì', short: 'Lun' },
    { value: 2, label: 'Martedì', short: 'Mar' },
    { value: 3, label: 'Mercoledì', short: 'Mer' },
    { value: 4, label: 'Giovedì', short: 'Gio' },
    { value: 5, label: 'Venerdì', short: 'Ven' },
    { value: 6, label: 'Sabato', short: 'Sab' },
    { value: 0, label: 'Domenica', short: 'Dom' }
];

// Presets orari comuni
const PRESETS_ORARI = [
    {
        name: 'Orario continuato 9-18',
        description: 'Lun-Ven 9:00-18:00',
        orari: {
            1: [{ fascia: 1, oraInizio: '09:00', oraFine: '18:00' }],
            2: [{ fascia: 1, oraInizio: '09:00', oraFine: '18:00' }],
            3: [{ fascia: 1, oraInizio: '09:00', oraFine: '18:00' }],
            4: [{ fascia: 1, oraInizio: '09:00', oraFine: '18:00' }],
            5: [{ fascia: 1, oraInizio: '09:00', oraFine: '18:00' }],
            6: [],
            0: []
        }
    },
    {
        name: 'Orario spezzato',
        description: 'Lun-Ven 8:30-12:30 / 14:30-18:30',
        orari: {
            1: [{ fascia: 1, oraInizio: '08:30', oraFine: '12:30' }, { fascia: 2, oraInizio: '14:30', oraFine: '18:30' }],
            2: [{ fascia: 1, oraInizio: '08:30', oraFine: '12:30' }, { fascia: 2, oraInizio: '14:30', oraFine: '18:30' }],
            3: [{ fascia: 1, oraInizio: '08:30', oraFine: '12:30' }, { fascia: 2, oraInizio: '14:30', oraFine: '18:30' }],
            4: [{ fascia: 1, oraInizio: '08:30', oraFine: '12:30' }, { fascia: 2, oraInizio: '14:30', oraFine: '18:30' }],
            5: [{ fascia: 1, oraInizio: '08:30', oraFine: '12:30' }, { fascia: 2, oraInizio: '14:30', oraFine: '18:30' }],
            6: [],
            0: []
        }
    },
    {
        name: 'Orario medico ambulatorio',
        description: 'Lun-Ven 8:00-13:00 / 15:00-19:00, Sab 8:00-12:00',
        orari: {
            1: [{ fascia: 1, oraInizio: '08:00', oraFine: '13:00' }, { fascia: 2, oraInizio: '15:00', oraFine: '19:00' }],
            2: [{ fascia: 1, oraInizio: '08:00', oraFine: '13:00' }, { fascia: 2, oraInizio: '15:00', oraFine: '19:00' }],
            3: [{ fascia: 1, oraInizio: '08:00', oraFine: '13:00' }, { fascia: 2, oraInizio: '15:00', oraFine: '19:00' }],
            4: [{ fascia: 1, oraInizio: '08:00', oraFine: '13:00' }, { fascia: 2, oraInizio: '15:00', oraFine: '19:00' }],
            5: [{ fascia: 1, oraInizio: '08:00', oraFine: '13:00' }, { fascia: 2, oraInizio: '15:00', oraFine: '19:00' }],
            6: [{ fascia: 1, oraInizio: '08:00', oraFine: '12:00' }],
            0: []
        }
    },
    {
        name: 'Orario esteso',
        description: 'Lun-Sab 7:00-21:00',
        orari: {
            1: [{ fascia: 1, oraInizio: '07:00', oraFine: '21:00' }],
            2: [{ fascia: 1, oraInizio: '07:00', oraFine: '21:00' }],
            3: [{ fascia: 1, oraInizio: '07:00', oraFine: '21:00' }],
            4: [{ fascia: 1, oraInizio: '07:00', oraFine: '21:00' }],
            5: [{ fascia: 1, oraInizio: '07:00', oraFine: '21:00' }],
            6: [{ fascia: 1, oraInizio: '08:00', oraFine: '13:00' }],
            0: []
        }
    }
];

export interface FasciaOraria {
    id?: string;
    fascia: number;
    oraInizio: string;
    oraFine: string;
    note?: string;
}

export interface OrarioGiornaliero {
    giornoSettimana: number;
    isChiuso: boolean;
    fasce: FasciaOraria[];
}

interface OrariAperturaEditorProps {
    value: OrarioGiornaliero[];
    onChange: (orari: OrarioGiornaliero[]) => void;
    readonly?: boolean;
    maxFascePerGiorno?: number;
}

const OrariAperturaEditor: React.FC<OrariAperturaEditorProps> = ({
    value,
    onChange,
    readonly = false,
    maxFascePerGiorno = 4
}) => {
    const { confirmWarning } = useConfirmDialog();
    const [expandedDays, setExpandedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Lun-Ven espansi
    const [copiedDay, setCopiedDay] = useState<OrarioGiornaliero | null>(null);
    const [showPresets, setShowPresets] = useState(false);

    // Inizializza gli orari se vuoti
    const orari: OrarioGiornaliero[] = value.length > 0
        ? value
        : GIORNI_SETTIMANA.map(g => ({
            giornoSettimana: g.value,
            isChiuso: g.value === 0 || g.value === 6, // Sab e Dom chiusi di default
            fasce: []
        }));

    // Trova l'orario per un giorno specifico
    const getOrarioGiorno = (giornoSettimana: number): OrarioGiornaliero => {
        return orari.find(o => o.giornoSettimana === giornoSettimana) || {
            giornoSettimana,
            isChiuso: giornoSettimana === 0 || giornoSettimana === 6,
            fasce: []
        };
    };

    // Aggiorna un orario specifico
    const updateOrario = useCallback((giornoSettimana: number, updates: Partial<OrarioGiornaliero>) => {
        const newOrari = orari.map(o =>
            o.giornoSettimana === giornoSettimana
                ? { ...o, ...updates }
                : o
        );

        // Se il giorno non esiste, aggiungilo
        if (!orari.find(o => o.giornoSettimana === giornoSettimana)) {
            newOrari.push({
                giornoSettimana,
                isChiuso: false,
                fasce: [],
                ...updates
            });
        }

        onChange(newOrari);
    }, [orari, onChange]);

    // Toggle giorno aperto/chiuso
    const toggleGiornoChiuso = (giornoSettimana: number) => {
        const orario = getOrarioGiorno(giornoSettimana);
        updateOrario(giornoSettimana, {
            isChiuso: !orario.isChiuso,
            fasce: !orario.isChiuso ? [] : orario.fasce
        });
    };

    // Aggiungi fascia oraria
    const addFascia = (giornoSettimana: number) => {
        const orario = getOrarioGiorno(giornoSettimana);
        if (orario.fasce.length >= maxFascePerGiorno) return;

        const nuovaFascia = orario.fasce.length + 1;
        const defaultOra = nuovaFascia === 1
            ? { oraInizio: '08:30', oraFine: '12:30' }
            : nuovaFascia === 2
                ? { oraInizio: '14:30', oraFine: '18:30' }
                : { oraInizio: '09:00', oraFine: '12:00' };

        updateOrario(giornoSettimana, {
            isChiuso: false,
            fasce: [...orario.fasce, {
                fascia: nuovaFascia,
                ...defaultOra
            }]
        });
    };

    // Rimuovi fascia oraria
    const removeFascia = (giornoSettimana: number, fasciaIndex: number) => {
        const orario = getOrarioGiorno(giornoSettimana);
        const newFasce = orario.fasce
            .filter((_, i) => i !== fasciaIndex)
            .map((f, i) => ({ ...f, fascia: i + 1 })); // Rinumera le fasce

        updateOrario(giornoSettimana, { fasce: newFasce });
    };

    // Aggiorna fascia oraria
    const updateFascia = (giornoSettimana: number, fasciaIndex: number, updates: Partial<FasciaOraria>) => {
        const orario = getOrarioGiorno(giornoSettimana);
        const newFasce = orario.fasce.map((f, i) =>
            i === fasciaIndex ? { ...f, ...updates } : f
        );
        updateOrario(giornoSettimana, { fasce: newFasce });
    };

    // Copia giorno
    const copyDay = (giornoSettimana: number) => {
        const orario = getOrarioGiorno(giornoSettimana);
        setCopiedDay({ ...orario });
    };

    // Incolla giorno
    const pasteDay = (giornoSettimana: number) => {
        if (!copiedDay) return;
        updateOrario(giornoSettimana, {
            isChiuso: copiedDay.isChiuso,
            fasce: copiedDay.fasce.map(f => ({ ...f }))
        });
    };

    // Applica preset
    const applyPreset = (preset: typeof PRESETS_ORARI[0]) => {
        const newOrari = GIORNI_SETTIMANA.map(g => ({
            giornoSettimana: g.value,
            isChiuso: (preset.orari[g.value as keyof typeof preset.orari] || []).length === 0,
            fasce: (preset.orari[g.value as keyof typeof preset.orari] || []).map((f, i) => ({
                ...f,
                fascia: i + 1
            }))
        }));
        onChange(newOrari);
        setShowPresets(false);
    };

    // Reset orari
    const resetOrari = async () => {
        const confirmed = await confirmWarning(
            'Reset orari',
            'Sei sicuro di voler resettare tutti gli orari?'
        );
        if (confirmed) {
            onChange(GIORNI_SETTIMANA.map(g => ({
                giornoSettimana: g.value,
                isChiuso: g.value === 0 || g.value === 6,
                fasce: []
            })));
        }
    };

    // Toggle espansione giorno
    const toggleExpand = (giornoSettimana: number) => {
        setExpandedDays(prev =>
            prev.includes(giornoSettimana)
                ? prev.filter(d => d !== giornoSettimana)
                : [...prev, giornoSettimana]
        );
    };

    // Calcola ore totali settimanali
    const calcolaOreTotali = (): number => {
        let totale = 0;
        orari.forEach(giorno => {
            if (!giorno.isChiuso) {
                giorno.fasce.forEach(fascia => {
                    const [inizioH, inizioM] = fascia.oraInizio.split(':').map(Number);
                    const [fineH, fineM] = fascia.oraFine.split(':').map(Number);
                    const inizioMinuti = inizioH * 60 + inizioM;
                    const fineMinuti = fineH * 60 + fineM;
                    totale += (fineMinuti - inizioMinuti) / 60;
                });
            }
        });
        return Math.round(totale * 10) / 10;
    };

    // Valida orari
    const validateOrari = (giorno: OrarioGiornaliero): string[] => {
        const errors: string[] = [];

        for (let i = 0; i < giorno.fasce.length; i++) {
            const fascia = giorno.fasce[i];
            const [inizioH, inizioM] = fascia.oraInizio.split(':').map(Number);
            const [fineH, fineM] = fascia.oraFine.split(':').map(Number);
            const inizioMinuti = inizioH * 60 + inizioM;
            const fineMinuti = fineH * 60 + fineM;

            if (fineMinuti <= inizioMinuti) {
                errors.push(`Fascia ${i + 1}: orario fine deve essere dopo inizio`);
            }

            // Controlla sovrapposizioni con fasce successive
            for (let j = i + 1; j < giorno.fasce.length; j++) {
                const altra = giorno.fasce[j];
                const [altraInizioH, altraInizioM] = altra.oraInizio.split(':').map(Number);
                const altraInizioMinuti = altraInizioH * 60 + altraInizioM;

                if (fineMinuti > altraInizioMinuti) {
                    errors.push(`Fascia ${i + 1} si sovrappone con fascia ${j + 1}`);
                }
            }
        }

        return errors;
    };

    return (
        <div className="space-y-4">
            {/* Header con azioni */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-teal-600" />
                    <div>
                        <h3 className="font-semibold text-gray-900">Orari di Apertura</h3>
                        <p className="text-xs text-gray-500">
                            Ore settimanali totali: <span className="font-semibold">{calcolaOreTotali()}h</span>
                        </p>
                    </div>
                </div>

                {!readonly && (
                    <div className="flex items-center gap-2">
                        {/* Presets */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowPresets(!showPresets)}
                                className="px-3 py-1.5 text-sm bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 flex items-center gap-1"
                            >
                                <Clock className="h-4 w-4" />
                                Presets
                                <ChevronDown className="h-4 w-4" />
                            </button>

                            {showPresets && (
                                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 z-20">
                                    <div className="p-2">
                                        {PRESETS_ORARI.map((preset, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => applyPreset(preset)}
                                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                                            >
                                                <p className="font-medium text-gray-900">{preset.name}</p>
                                                <p className="text-xs text-gray-500">{preset.description}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Reset */}
                        <button
                            type="button"
                            onClick={resetOrari}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100"
                            title="Reset orari"
                        >
                            <RotateCcw className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Clipboard info */}
            {copiedDay && !readonly && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm">
                    <ClipboardPaste className="h-4 w-4" />
                    <span>
                        Orario copiato da {GIORNI_SETTIMANA.find(g => g.value === copiedDay.giornoSettimana)?.label}.
                        Clicca "Incolla" su un altro giorno.
                    </span>
                    <button
                        onClick={() => setCopiedDay(null)}
                        className="ml-auto text-blue-600 hover:text-blue-800"
                    >
                        Annulla
                    </button>
                </div>
            )}

            {/* Griglia giorni */}
            <div className="space-y-2">
                {GIORNI_SETTIMANA.map(giorno => {
                    const orarioGiorno = getOrarioGiorno(giorno.value);
                    const isExpanded = expandedDays.includes(giorno.value);
                    const errors = validateOrari(orarioGiorno);
                    const hasErrors = errors.length > 0;

                    return (
                        <div
                            key={giorno.value}
                            className={`border rounded-xl transition-all ${orarioGiorno.isChiuso
                                ? 'bg-gray-50 border-gray-200'
                                : hasErrors
                                    ? 'bg-red-50 border-red-200'
                                    : 'bg-white border-gray-200 hover:border-teal-300'
                                }`}
                        >
                            {/* Header giorno */}
                            <div
                                className="flex items-center justify-between p-3 cursor-pointer"
                                onClick={() => toggleExpand(giorno.value)}
                            >
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!readonly) toggleGiornoChiuso(giorno.value);
                                        }}
                                        disabled={readonly}
                                        className={`w-10 h-6 rounded-full transition-colors relative ${!orarioGiorno.isChiuso
                                            ? 'bg-teal-500'
                                            : 'bg-gray-300'
                                            } ${readonly ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <span
                                            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${!orarioGiorno.isChiuso ? 'right-0.5' : 'left-0.5'
                                                }`}
                                        />
                                    </button>

                                    <div>
                                        <span className={`font-medium ${orarioGiorno.isChiuso ? 'text-gray-400' : 'text-gray-900'}`}>
                                            {giorno.label}
                                        </span>
                                        {orarioGiorno.isChiuso ? (
                                            <span className="ml-2 text-sm text-gray-400 flex items-center gap-1">
                                                <Moon className="h-3 w-3" /> Chiuso
                                            </span>
                                        ) : orarioGiorno.fasce.length > 0 ? (
                                            <span className="ml-2 text-sm text-gray-500">
                                                {orarioGiorno.fasce.map(f => `${f.oraInizio}-${f.oraFine}`).join(' / ')}
                                            </span>
                                        ) : (
                                            <span className="ml-2 text-sm text-amber-600">
                                                Nessun orario definito
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {hasErrors && (
                                        <AlertCircle className="h-4 w-4 text-red-500" />
                                    )}

                                    {!readonly && !orarioGiorno.isChiuso && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    copyDay(giorno.value);
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-teal-600 rounded"
                                                title="Copia orario"
                                            >
                                                <Copy className="h-4 w-4" />
                                            </button>

                                            {copiedDay && copiedDay.giornoSettimana !== giorno.value && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        pasteDay(giorno.value);
                                                    }}
                                                    className="p-1.5 text-blue-500 hover:text-blue-700 rounded"
                                                    title="Incolla orario"
                                                >
                                                    <ClipboardPaste className="h-4 w-4" />
                                                </button>
                                            )}
                                        </>
                                    )}

                                    {isExpanded ? (
                                        <ChevronUp className="h-5 w-5 text-gray-400" />
                                    ) : (
                                        <ChevronDown className="h-5 w-5 text-gray-400" />
                                    )}
                                </div>
                            </div>

                            {/* Dettaglio fasce orarie */}
                            {isExpanded && !orarioGiorno.isChiuso && (
                                <div className="px-3 pb-3 border-t border-gray-100 pt-3">
                                    <div className="space-y-2">
                                        {orarioGiorno.fasce.length === 0 ? (
                                            <p className="text-sm text-gray-400 text-center py-2">
                                                Nessuna fascia oraria. Clicca "Aggiungi fascia" per iniziare.
                                            </p>
                                        ) : (
                                            orarioGiorno.fasce.map((fascia, idx) => (
                                                <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                                                    <span className="text-xs font-medium text-gray-500 w-16">
                                                        Fascia {idx + 1}
                                                    </span>

                                                    <input
                                                        type="time"
                                                        value={fascia.oraInizio}
                                                        onChange={(e) => updateFascia(giorno.value, idx, { oraInizio: e.target.value })}
                                                        disabled={readonly}
                                                        className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100"
                                                    />

                                                    <span className="text-gray-400">-</span>

                                                    <input
                                                        type="time"
                                                        value={fascia.oraFine}
                                                        onChange={(e) => updateFascia(giorno.value, idx, { oraFine: e.target.value })}
                                                        disabled={readonly}
                                                        className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100"
                                                    />

                                                    <input
                                                        type="text"
                                                        value={fascia.note || ''}
                                                        onChange={(e) => updateFascia(giorno.value, idx, { note: e.target.value })}
                                                        disabled={readonly}
                                                        placeholder="Note (opz.)"
                                                        className="flex-1 px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100"
                                                    />

                                                    {!readonly && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeFascia(giorno.value, idx)}
                                                            className="p-1 text-red-400 hover:text-red-600 rounded"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))
                                        )}

                                        {/* Errors */}
                                        {hasErrors && (
                                            <div className="mt-2 text-xs text-red-600 space-y-1">
                                                {errors.map((err, i) => (
                                                    <p key={i} className="flex items-center gap-1">
                                                        <AlertCircle className="h-3 w-3" /> {err}
                                                    </p>
                                                ))}
                                            </div>
                                        )}

                                        {/* Add fascia button */}
                                        {!readonly && orarioGiorno.fasce.length < maxFascePerGiorno && (
                                            <button
                                                type="button"
                                                onClick={() => addFascia(giorno.value)}
                                                className="w-full py-2 text-sm text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg flex items-center justify-center gap-1 transition-colors"
                                            >
                                                <Plus className="h-4 w-4" />
                                                Aggiungi fascia oraria
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legenda */}
            <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-teal-500 rounded-full"></span>
                    Aperto
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-gray-300 rounded-full"></span>
                    Chiuso
                </span>
                <span className="flex items-center gap-1">
                    <Check className="h-3 w-3 text-green-500" />
                    Orari validi
                </span>
                <span className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 text-red-500" />
                    Errori orario
                </span>
            </div>
        </div>
    );
};

export default OrariAperturaEditor;
