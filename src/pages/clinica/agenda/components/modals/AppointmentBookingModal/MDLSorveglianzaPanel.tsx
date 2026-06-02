/**
 * MDLSorveglianzaPanel - Panel shown when a Visita Medica del Lavoro is selected
 * Shows sorveglianza sanitaria protocol, last visit, next due date and tipoVisitaMDL selector
 *
 * @module pages/clinica/agenda/components/modals/AppointmentBookingModal/MDLSorveglianzaPanel
 */

import React from 'react';
import { Briefcase, Calendar, ClipboardList, AlertCircle, CheckCircle2, Circle, Loader2, CalendarCheck } from 'lucide-react';
import type { MDLSorveglianzaPanelProps } from './types';
import type { TipoVisitaMDL } from '../../../../../../services/clinicaApi';
import { CATEGORIA_VISITA_LABELS } from '../../../../../../services/tariffarioAziendaleApi';

const URGENCY_COLORS: Record<string, string> = {
    scaduto: 'text-red-700 bg-red-50 border-red-200',
    critico: 'text-orange-700 bg-orange-50 border-orange-200',
    urgente: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    attenzione: 'text-blue-700 bg-blue-50 border-blue-200',
    programmato: 'text-green-700 bg-green-50 border-green-200',
};

function formatLocalDate(date: Date | string | undefined | null): string {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
}

function computeUrgency(dueDate: Date): string {
    const now = new Date();
    const days = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return 'scaduto';
    if (days < 7) return 'critico';
    if (days <= 30) return 'urgente';
    if (days <= 60) return 'attenzione';
    return 'programmato';
}

export const MDLSorveglianzaPanel: React.FC<MDLSorveglianzaPanelProps> = ({
    mdlData,
    tipoVisitaMDL,
    setTipoVisitaMDL,
    selectedPrestazione,
}) => {
    const {
        mansioni,
        protocolli,
        prestazioniProtocollo,
        prestazioniSelezionate,
        onTogglePrestazione,
        ultimaVisitaMDL,
        prossimaVisitaData,
        companyPrezzoTariffario,
        isLoading,
        isEmployee,
        hasPrevVisita,
        prossimaScadenzaIsBooked,
        prossimaScadenzaAppuntamentoData,
        scadenzeInScadenza,
        hasScadenzeLoaded,
        nessunScadenzaTrovata,
    } = mdlData;

    const scadenzeAutoSelezionate = prestazioniSelezionate.size;

    const urgency = prossimaVisitaData ? computeUrgency(prossimaVisitaData) : null;
    const urgencyClass = urgency ? URGENCY_COLORS[urgency] ?? '' : '';

    const firstProtocollo = protocolli[0] ?? null;

    return (
        <div className="border border-blue-200 rounded-xl bg-blue-50/40 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white">
                <Briefcase className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-semibold">Sorveglianza Sanitaria — Medicina del Lavoro</span>
            </div>

            <div className="p-4 space-y-4">
                {isLoading ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Caricamento dati sorveglianza...</span>
                    </div>
                ) : (
                    <>
                        {/* Warning: paziente non è dipendente di un'azienda */}
                        {!isEmployee && (
                            <div className="flex items-start gap-2.5 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
                                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-orange-500" />
                                <div>
                                    <p className="font-semibold text-orange-900">Paziente non associato a un'azienda</p>
                                    <p className="text-xs text-orange-700 mt-0.5">
                                        La sorveglianza sanitaria MDL richiede che il paziente sia un dipendente.
                                        Assegna l'azienda al profilo del paziente prima di procedere.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Mansione */}
                        {mansioni.length > 0 && (
                            <div className="flex items-start gap-2">
                                <Briefcase className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Mansione</p>
                                    <p className="text-sm font-semibold text-gray-800">
                                        {mansioni.map(m => m.denominazione).join(', ')}
                                    </p>
                                    {firstProtocollo && (
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Protocollo: {firstProtocollo.denominazione} — periodicità {firstProtocollo.periodicitaVisiteMesi} mesi
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Ultima / Prossima visita */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white border border-gray-200 rounded-lg p-3">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Ultima visita MDL</p>
                                {ultimaVisitaMDL ? (
                                    <>
                                        <p className="text-sm font-semibold text-gray-800">
                                            {formatLocalDate(ultimaVisitaMDL.dataOra)}
                                        </p>
                                        {ultimaVisitaMDL.isFallbackAppuntamento && (
                                            <span className="inline-block mt-0.5 text-xs text-gray-400 italic">
                                                (dall'ultimo appuntamento)
                                            </span>
                                        )}
                                        {ultimaVisitaMDL.tipoVisitaMDL && (
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {CATEGORIA_VISITA_LABELS[ultimaVisitaMDL.tipoVisitaMDL as keyof typeof CATEGORIA_VISITA_LABELS] ?? ultimaVisitaMDL.tipoVisitaMDL}
                                            </p>
                                        )}
                                        {ultimaVisitaMDL.giudizioIdoneita && (
                                            <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full border ${ultimaVisitaMDL.giudizioIdoneita === 'IDONEO' ? 'bg-green-50 border-green-200 text-green-700'
                                                : ultimaVisitaMDL.giudizioIdoneita?.startsWith('NON') ? 'bg-red-50 border-red-200 text-red-700'
                                                    : 'bg-yellow-50 border-yellow-200 text-yellow-700'
                                                }`}>
                                                {ultimaVisitaMDL.giudizioIdoneita?.replace(/_/g, ' ')}
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-sm text-gray-400">Nessuna visita registrata</p>
                                )}
                            </div>

                            <div className={`rounded-lg p-3 border ${urgencyClass || 'bg-white border-gray-200'}`}>
                                <p className="text-xs font-medium uppercase tracking-wide mb-1 opacity-70">Prossima visita</p>
                                {prossimaVisitaData ? (
                                    <>
                                        <p className="text-sm font-semibold">
                                            {formatLocalDate(prossimaVisitaData)}
                                        </p>
                                        {prossimaScadenzaIsBooked && (
                                            <div className="flex items-center gap-1 mt-1 text-xs text-blue-700 font-medium">
                                                <CalendarCheck className="h-3 w-3 flex-shrink-0" />
                                                Appuntamento già prenotato
                                                {prossimaScadenzaAppuntamentoData && (
                                                    <span className="font-normal text-blue-600">
                                                        {' '}— {formatLocalDate(prossimaScadenzaAppuntamentoData)}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {urgency === 'scaduto' && (
                                            <span className="flex items-center gap-1 text-xs mt-1">
                                                <AlertCircle className="h-3 w-3" /> Scaduta
                                            </span>
                                        )}
                                    </>
                                ) : ultimaVisitaMDL ? (
                                    <p className="text-sm text-gray-400">Calcolo non disponibile</p>
                                ) : (
                                    <p className="text-sm text-gray-400">Da pianificare</p>
                                )}
                            </div>
                        </div>

                        {/* Prezzo tariffario aziendale */}
                        {companyPrezzoTariffario != null && (
                            <div className="flex items-center justify-between px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg">
                                <span className="text-xs font-medium text-teal-700">Prezzo da tariffario aziendale</span>
                                <span className="text-sm font-bold text-teal-800">
                                    {companyPrezzoTariffario.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                                </span>
                            </div>
                        )}

                        {/* Notice: nessuna scadenza trovata → selezione tipo visita obbligatoria */}
                        {nessunScadenzaTrovata && (
                            <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" />
                                <div>
                                    <p className="font-semibold text-amber-900">Nessuna prestazione in scadenza</p>
                                    <p className="text-xs text-amber-700 mt-0.5">
                                        Non ci sono prestazioni da protocollo in scadenza nei prossimi 60 giorni per questo paziente.
                                        È richiesta solo la visita principale — seleziona il tipo di visita MDL.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Notice: prestazioni auto-selezionate da scadenze protocollo */}
                        {hasScadenzeLoaded && scadenzeAutoSelezionate > 0 && (
                            <div className="flex items-start gap-2.5 p-3 bg-teal-50 border border-teal-200 rounded-lg text-sm text-teal-800">
                                <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5 text-teal-600" />
                                <div>
                                    <p className="font-semibold text-teal-900">
                                        {scadenzeAutoSelezionate === 1
                                            ? '1 prestazione in scadenza selezionata automaticamente'
                                            : `${scadenzeAutoSelezionate} prestazioni in scadenza selezionate automaticamente`}
                                    </p>
                                    <p className="text-xs text-teal-700 mt-0.5">
                                        Prestazioni con scadenza entro ±60 giorni dalla data dell'appuntamento. Puoi modificare la selezione qui sotto.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Tipo Visita MDL selector */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                                <Calendar className="h-3.5 w-3.5 inline mr-1" />
                                Tipo visita MDL
                                {nessunScadenzaTrovata && (
                                    <span className="ml-2 text-amber-600 font-semibold normal-case text-xs">— obbligatorio</span>
                                )}
                            </label>
                            <div className="grid grid-cols-2 gap-1.5">
                                {(Object.entries(CATEGORIA_VISITA_LABELS) as [TipoVisitaMDL, string][])
                                    .map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setTipoVisitaMDL(tipoVisitaMDL === value ? null : value)}
                                            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-colors text-left ${tipoVisitaMDL === value
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                                }`}
                                        >
                                            {tipoVisitaMDL === value
                                                ? <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                                                : <Circle className="h-3 w-3 flex-shrink-0 text-gray-300" />
                                            }
                                            {label}
                                        </button>
                                    ))}
                            </div>
                        </div>

                        {/* Prestazioni da protocollo — nascoste quando nessunScadenzaTrovata (mostrare solo la visita principale) */}
                        {(selectedPrestazione || prestazioniProtocollo.length > 0) && (
                            <div>
                                <p className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                                    <ClipboardList className="h-3.5 w-3.5 inline mr-1" />
                                    Prestazioni previste dal protocollo
                                    <span className="ml-1.5 text-gray-400 font-normal normal-case">
                                        ({prestazioniSelezionate.size}/{prestazioniProtocollo.filter(pp => pp.prestazioneId && pp.prestazioneId !== selectedPrestazione?.id).length} selezionate)
                                    </span>
                                </p>
                                <div className="space-y-1">
                                    {/* Visita principale (VML) — sempre inclusa, non togglable */}
                                    {selectedPrestazione && (
                                        <div className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border bg-blue-50 border-blue-300 text-sm">
                                            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-blue-600" />
                                            <div className="flex-1 min-w-0">
                                                <span className="font-semibold text-blue-900 truncate block">{selectedPrestazione.nome}</span>
                                                <span className="text-xs text-blue-600/70">Visita principale • Sempre inclusa</span>
                                            </div>
                                        </div>
                                    )}
                                    {/* Accertamenti protocollo — sempre visibili, ma non pre-selezionati se nessunScadenzaTrovata */}
                                    {prestazioniProtocollo.map((pp) => {
                                        const prest = pp.prestazione;
                                        if (!prest || !pp.prestazioneId) return null;
                                        // Salta la prestazione principale già mostrata nella riga "Visita principale"
                                        if (selectedPrestazione && pp.prestazioneId === selectedPrestazione.id) return null;
                                        const isSelected = prestazioniSelezionate.has(pp.prestazioneId);
                                        return (
                                            <button
                                                key={pp.id}
                                                type="button"
                                                onClick={() => onTogglePrestazione(pp.prestazioneId!)}
                                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm transition-colors text-left ${isSelected
                                                    ? 'bg-teal-50 border-teal-300 text-teal-800'
                                                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {isSelected
                                                    ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-teal-600" />
                                                    : <Circle className="h-4 w-4 flex-shrink-0 text-gray-300" />
                                                }
                                                <div className="flex-1 min-w-0">
                                                    <span className="font-medium truncate block">{prest.nome}</span>
                                                    <span className="text-xs opacity-60">
                                                        {pp.isObbligatoria ? 'Obbligatoria' : 'Facoltativa'}
                                                        {pp.periodicita && ` • ${pp.periodicita.replace(/_/g, ' ')}`}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Empty state when no protocol found */}
                        {mansioni.length === 0 && !isLoading && (
                            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                Nessuna mansione associata al paziente. Assegna una mansione per vedere il piano di sorveglianza.
                            </div>
                        )}

                        {mansioni.length > 0 && protocolli.length === 0 && !isLoading && (
                            <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
                                <ClipboardList className="h-4 w-4 flex-shrink-0" />
                                Nessun protocollo sanitario configurato per questa mansione.
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default MDLSorveglianzaPanel;
