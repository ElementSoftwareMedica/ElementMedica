/**
 * VisitaViewModal - Modal for viewing a previous visit in read-only mode
 * 
 * Displays visit details including:
 * - Patient and doctor info
 * - Visit date, status, and cost
 * - Prestazioni eseguite (primary + additional)
 * - Structured data from template fields (translated to Italian)
 * - Giudizio di idoneità with decoded prescrizioni/limitazioni
 * - "Open in new tab" button
 * 
 * Access control is handled by the backend - this modal receives
 * only the visits the user is authorized to see.
 * 
 * @module pages/clinica/clinica/components/VisitaViewModal
 * @project P52 - Clinical Visit Template System
 * @session #16 - Visite Precedenti Modal
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    X,
    Calendar,
    Clock,
    User,
    Stethoscope,
    FileText,
    Activity,
    Pill,
    AlertCircle,
    Loader2,
    Eye,
    ExternalLink,
    Shield,
    Euro,
    ClipboardList
} from 'lucide-react';
import { apiGet } from '../../../../services/api';
import { formatMedicoName } from '../../../../utils/textFormatters';

// ============================================================
// LABEL MAPS — translate DB codes to readable Italian
// ============================================================

const PRESCRIZIONI_CODE_MAP: Record<string, string> = {
    uso_dpi_guanti: 'Uso obbligatorio DPI: guanti protettivi',
    uso_dpi_scarpe: 'Uso obbligatorio DPI: scarpe antinfortunistiche',
    uso_dpi_cuffie: 'Uso obbligatorio DPI: cuffie / tappi antirumore',
    uso_dpi_mascherina: 'Uso obbligatorio DPI: mascherina FFP2/FFP3',
    uso_dpi_visiera: 'Uso obbligatorio DPI: visiera / occhiali protettivi',
    uso_dpi_imbracatura: 'Uso obbligatorio DPI: imbracatura di sicurezza',
    divieto_mmc_20: 'Divieto movimentazione manuale carichi > 20 kg',
    divieto_mmc_10: 'Divieto movimentazione manuale carichi > 10 kg',
    pause_vdt: 'Pause obbligatorie VDT: 15 minuti ogni 2 ore',
    limitazione_notturno: 'Limitazione turni notturni (max 2 notti/settimana)',
    controllo_oft_annuale: 'Controllo oftalmologico annuale (videoterminali)',
    sorveg_rafforzata_semestrale: 'Sorveglianza sanitaria rafforzata semestrale',
    formazione_rischio_chimico: 'Obbligo formazione specifica rischio chimico',
    formazione_rischio_biologico: 'Obbligo formazione specifica rischio biologico',
    evitare_cancerogeni: 'Evitare esposizione a sostanze cancerogene / mutagene',
    esposizione_rumore_limitata: 'Limitazione esposizione a rumore (< 80 dB)',
};

const LIMITAZIONI_CODE_MAP: Record<string, string> = {
    no_lavoro_quota: 'Non idoneo a lavori in quota (> 2 m)',
    no_piattaforme_elevabili: 'Non idoneo a lavori su piattaforme elevabili / cestelli',
    no_guida_mezzi: 'Non idoneo alla conduzione di automezzi / mezzi operativi',
    no_spazi_confinati: 'Non idoneo a lavori in spazi confinati',
    limitazione_notturno_mansione: 'Limitata idoneità ai turni notturni',
    no_vibrazioni: 'Non idoneo a mansioni con esposizione a vibrazioni mano-braccio',
    no_rumore_85db: 'Non idoneo a mansioni con esposizione a rumore > 85 dB',
    limitazione_mmc: 'Limitata movimentazione manuale di carichi (< 10 kg)',
    no_cancerogeni: 'Non idoneo a mansioni con esposizione a cancerogeni / mutageni',
    limitazione_chimici: 'Limitata esposizione a sostanze chimiche pericolose',
    no_stress_termico: 'Non idoneo a lavori con stress termico (ambiente caldo / freddo)',
    no_vdt_prolungato: 'Uso VDT limitato (max 2 ore continuative senza pausa)',
};

const TIPO_GIUDIZIO_LABELS: Record<string, { label: string; color: string }> = {
    IDONEO: { label: 'Idoneo', color: 'bg-green-100 text-green-700' },
    IDONEO_CON_PRESCRIZIONI: { label: 'Idoneo parziale con prescrizioni', color: 'bg-blue-100 text-blue-700' },
    IDONEO_CON_LIMITAZIONI: { label: 'Idoneo parziale con limitazioni', color: 'bg-amber-100 text-amber-700' },
    IDONEO_CON_LIMITAZIONI_PRESCRIZIONI: { label: 'Idoneo parziale con limitazioni e prescrizioni', color: 'bg-orange-100 text-orange-700' },
    NON_IDONEO_TEMPORANEO: { label: 'Temporaneamente non idoneo', color: 'bg-orange-100 text-orange-700' },
    NON_IDONEO_PERMANENTE: { label: 'Non idoneo permanente', color: 'bg-red-100 text-red-700' },
};

/** Label map for datiStrutturati keys → human-readable Italian */
const DATI_STRUTTURATI_LABELS: Record<string, string> = {
    anamnesiFamiliare: 'Anamnesi Familiare',
    anamnesiPatologicaRemota: 'Anamnesi Patologica Remota',
    anamnesiPatologicaProssima: 'Anamnesi Patologica Prossima',
    anamnesiLavorativa: 'Anamnesi Lavorativa',
    peso: 'Peso (kg)',
    altezza: 'Altezza (cm)',
    bmi: 'BMI',
    pressioneSistolica: 'Pressione Sistolica (mmHg)',
    pressioneDiastolica: 'Pressione Diastolica (mmHg)',
    frequenzaCardiaca: 'Frequenza Cardiaca (bpm)',
    saturazioneO2: 'Saturazione O₂ (%)',
    temperatura: 'Temperatura (°C)',
    esameObiettivo: 'Esame Obiettivo',
    diagnosiPrincipale: 'Diagnosi Principale',
    diagnosiSecondarie: 'Diagnosi Secondarie',
    terapia: 'Terapia',
    prescrizioni: 'Prescrizioni Farmacologiche',
    prossimoControllo: 'Prossimo Controllo',
    noteFollowup: 'Note Follow-up',
    prescrizioniFollowup: 'Prescrizioni Follow-up',
    esamiProssimaVisita: 'Esami Prossima Visita',
    giudizioIdoneitaMdl: 'Giudizio Idoneità MDL',
    prescrizioniNormativaMdl: 'Prescrizioni Normativa MDL',
    limitazioniMansioneMdl: 'Limitazioni Mansione MDL',
    prescrizioniAziendaMdl: 'Prescrizioni Azienda MDL',
    ecgStrumentario: 'ECG (strumentario)',
    audiometriaStrumentario: 'Audiometria (strumentario)',
    spirometriaStrumentario: 'Spirometria (strumentario)',
};

/** Decode stored codes to Italian labels using the code maps */
function decodeCodes(stored: string | unknown, codeMap: Record<string, string>): string[] {
    if (!stored) return [];
    // Handle arrays directly (e.g. ["no_piattaforme_elevabili"])
    if (Array.isArray(stored)) {
        return stored.map(item => codeMap[String(item).trim()] || String(item));
    }
    const text = typeof stored === 'string' ? stored : JSON.stringify(stored);
    const parts = text.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
    return parts.map(part => codeMap[part] || part);
}

/** Format a datiStrutturati value for display */
function formatDatiValue(key: string, value: unknown): string {
    if (value === null || value === undefined || value === '') return '-';

    // Decode known code fields
    if (key === 'prescrizioniNormativaMdl' || key === 'prescrizioni') {
        const decoded = decodeCodes(value, PRESCRIZIONI_CODE_MAP);
        return decoded.length > 0 ? decoded.join('\n') : String(value);
    }
    if (key === 'limitazioniMansioneMdl') {
        const decoded = decodeCodes(value, LIMITAZIONI_CODE_MAP);
        return decoded.length > 0 ? decoded.join('\n') : String(value);
    }

    if (Array.isArray(value)) {
        if (value.length === 0) return '-';
        // Try to decode each array element
        return value.map(v => {
            if (typeof v === 'string') {
                return PRESCRIZIONI_CODE_MAP[v] || LIMITAZIONI_CODE_MAP[v] || v;
            }
            return String(v);
        }).join('\n');
    }

    if (typeof value === 'boolean') return value ? 'Sì' : 'No';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);

    // Check if it's a date string
    const dateStr = String(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        try {
            return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
        } catch { /* fallthrough */ }
    }

    return String(value);
}

// ============================================================
// TYPES
// ============================================================

interface GiudizioData {
    id: string;
    tipoGiudizio: string;
    stato: string;
    dataEmissione: string;
    dataScadenza?: string;
    prescrizioniIdoneita?: string;
    limitazioni?: string;
    motivazioni?: string;
    mansioni?: { mansione: { id: string; denominazione: string } }[];
}

interface PrestazioneData {
    id: string;
    codice?: string;
    nome: string;
    tipo?: string;
    prezzoBase?: number;
}

interface AppuntamentoPrestazione {
    id: string;
    prestazione: PrestazioneData;
}

interface VisitaWithRelations {
    id: string;
    stato: string;
    dataOra?: string;
    createdAt: string;
    updatedAt: string;
    totaleCosto?: number | null;
    paziente?: {
        firstName?: string;
        lastName?: string;
        taxCode?: string;
    };
    medico?: {
        firstName?: string;
        lastName?: string;
        gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED' | null;
    };
    medicoRefertante?: {
        firstName?: string;
        lastName?: string;
        gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED' | null;
    };
    prestazione?: PrestazioneData;
    appuntamento?: {
        id?: string;
        numeroPrenotazione?: string;
        prestazioni?: AppuntamentoPrestazione[];
    };
    giudizioIdoneita?: GiudizioData;
    anamnesi?: string;
    esamiObiettivo?: string;
    diagnosiPrincipale?: string;
    terapia?: string;
    prescrizioni?: string;
    noteClinico?: string;
    datiStrutturati?: Record<string, unknown>;
    tipoVisitaMDL?: string;
    isPrimaVisita?: boolean;
}

interface VisitaViewModalProps {
    visitaId: string;
    isOpen: boolean;
    onClose: () => void;
}

export const VisitaViewModal: React.FC<VisitaViewModalProps> = ({
    visitaId,
    isOpen,
    onClose
}) => {
    const { data: visita, isLoading, error } = useQuery<VisitaWithRelations>({
        queryKey: ['visita-view', visitaId],
        queryFn: async () => {
            const response = await apiGet<VisitaWithRelations>(`/api/v1/clinica/visite/${visitaId}`);
            return (response as any).data || response;
        },
        enabled: isOpen && !!visitaId,
        staleTime: 60000
    });

    if (!isOpen) return null;

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDateShort = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const getStatoColor = (stato: string) => {
        switch (stato) {
            case 'COMPLETATA': return 'bg-green-100 text-green-700';
            case 'IN_CORSO': return 'bg-blue-100 text-blue-700';
            case 'PROGRAMMATA': return 'bg-amber-100 text-amber-700';
            case 'ANNULLATA': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getStatoLabel = (stato: string) => {
        switch (stato) {
            case 'COMPLETATA': return 'Completata';
            case 'IN_CORSO': return 'In corso';
            case 'PROGRAMMATA': return 'Programmata';
            case 'ANNULLATA': return 'Annullata';
            default: return stato.replace(/_/g, ' ');
        }
    };

    // Collect all prestazioni: primary + additional from appuntamento
    const allPrestazioni: PrestazioneData[] = [];
    if (visita?.prestazione) {
        allPrestazioni.push(visita.prestazione);
    }
    if (visita?.appuntamento?.prestazioni) {
        for (const ap of visita.appuntamento.prestazioni) {
            if (ap.prestazione && !allPrestazioni.some(p => p.id === ap.prestazione.id)) {
                allPrestazioni.push(ap.prestazione);
            }
        }
    }

    // Filter datiStrutturati: exclude internal fields and fields already shown elsewhere
    const displayDati = visita?.datiStrutturati
        ? Object.entries(visita.datiStrutturati as Record<string, unknown>)
            .filter(([key]) => !key.startsWith('_'))
            // Skip fields already shown in dedicated sections
            .filter(([key]) => !['diagnosiPrincipale', 'esameObiettivo', 'terapia'].includes(key))
            .filter(([, value]) => value !== null && value !== undefined && value !== '' && value !== '{}')
        : [];

    return (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Eye className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Visita Precedente
                                </h2>
                                {visita && (
                                    <p className="text-sm text-gray-500">
                                        {formatDate(visita.dataOra || visita.createdAt)}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Open in new tab button */}
                            {visita && (
                                <button
                                    onClick={() => window.open(`/poliambulatorio/visite/${visita.id}`, '_blank')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
                                    title="Apri visita completa in nuova scheda"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    <span className="hidden sm:inline">Apri completa</span>
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 max-h-[75vh] overflow-y-auto">
                        {isLoading && (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
                            </div>
                        )}

                        {error && (
                            <div className="flex flex-col items-center justify-center py-12 text-red-500">
                                <AlertCircle className="h-10 w-10 mb-3" />
                                <p>Errore nel caricamento della visita</p>
                            </div>
                        )}

                        {visita && (
                            <div className="space-y-6">
                                {/* Status + Type + Cost Row */}
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatoColor(visita.stato || '')}`}>
                                            {getStatoLabel(visita.stato || '')}
                                        </span>
                                        {visita.tipoVisitaMDL && (
                                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                                                MDL
                                            </span>
                                        )}
                                        {visita.isPrimaVisita && (
                                            <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-xs font-medium">
                                                Prima visita
                                            </span>
                                        )}
                                    </div>
                                    {visita.totaleCosto != null && (
                                        <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                                            <Euro className="h-4 w-4 text-gray-400" />
                                            {Number(visita.totaleCosto).toFixed(2)} €
                                        </div>
                                    )}
                                </div>

                                {/* Patient & Doctor Info */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <User className="h-4 w-4 text-gray-400" />
                                            <span className="text-xs font-medium text-gray-500 uppercase">Paziente</span>
                                        </div>
                                        <p className="font-medium text-gray-900">
                                            {visita.paziente?.lastName} {visita.paziente?.firstName}
                                        </p>
                                        {visita.paziente?.taxCode && (
                                            <p className="text-sm text-gray-500">{visita.paziente.taxCode}</p>
                                        )}
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Stethoscope className="h-4 w-4 text-gray-400" />
                                            <span className="text-xs font-medium text-gray-500 uppercase">Medico</span>
                                        </div>
                                        <p className="font-medium text-gray-900">
                                            {visita.medico && formatMedicoName(visita.medico)}
                                        </p>
                                        {visita.medicoRefertante && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                Refertante: {formatMedicoName(visita.medicoRefertante)}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Prestazioni Eseguite */}
                                {allPrestazioni.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <Activity className="h-4 w-4 text-indigo-500" />
                                            Prestazioni Eseguite ({allPrestazioni.length})
                                        </h3>
                                        <div className="space-y-2">
                                            {allPrestazioni.map((p, idx) => (
                                                <div key={p.id || idx} className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                                                    <div>
                                                        <p className="font-medium text-gray-900 text-sm">{p.nome}</p>
                                                        {p.codice && (
                                                            <p className="text-xs text-gray-500">Cod. {p.codice}</p>
                                                        )}
                                                    </div>
                                                    {p.prezzoBase != null && (
                                                        <span className="text-sm font-medium text-gray-600">
                                                            {Number(p.prezzoBase).toFixed(2)} €
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Anamnesi */}
                                {visita.anamnesi && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <FileText className="h-4 w-4" />
                                            Anamnesi
                                        </h3>
                                        <div className="p-4 bg-gray-50 rounded-lg">
                                            <p className="text-gray-700 whitespace-pre-wrap">{visita.anamnesi}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Esame Obiettivo */}
                                {visita.esamiObiettivo && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Esame Obiettivo</h3>
                                        <div className="p-4 bg-gray-50 rounded-lg">
                                            <p className="text-gray-700 whitespace-pre-wrap">{visita.esamiObiettivo}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Diagnosi */}
                                {visita.diagnosiPrincipale && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Diagnosi Principale</h3>
                                        <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                                            <p className="text-gray-700">{visita.diagnosiPrincipale}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Terapia */}
                                {visita.terapia && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <Pill className="h-4 w-4" />
                                            Terapia
                                        </h3>
                                        <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                                            <p className="text-gray-700 whitespace-pre-wrap">{visita.terapia}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Prescrizioni */}
                                {visita.prescrizioni && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Prescrizioni</h3>
                                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                                            <p className="text-gray-700 whitespace-pre-wrap">{visita.prescrizioni}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Note */}
                                {visita.noteClinico && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Note Cliniche</h3>
                                        <div className="p-4 bg-gray-50 rounded-lg">
                                            <p className="text-gray-700 whitespace-pre-wrap">{visita.noteClinico}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Dati Strutturati - translated */}
                                {displayDati.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <ClipboardList className="h-4 w-4" />
                                            Dati Strutturati
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {displayDati.map(([key, value]) => {
                                                const label = DATI_STRUTTURATI_LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                                                const displayValue = formatDatiValue(key, value);
                                                const isMultiLine = displayValue.includes('\n');
                                                return (
                                                    <div key={key} className={`p-3 bg-gray-50 rounded-lg ${isMultiLine ? 'sm:col-span-2' : ''}`}>
                                                        <span className="text-xs font-medium text-gray-500">{label}</span>
                                                        <p className="text-sm text-gray-900 mt-0.5 whitespace-pre-wrap">
                                                            {displayValue}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Giudizio di Idoneità */}
                                {visita.giudizioIdoneita && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <Shield className="h-4 w-4 text-purple-500" />
                                            Giudizio di Idoneità
                                        </h3>
                                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-100 space-y-3">
                                            {/* Tipo giudizio badge */}
                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${TIPO_GIUDIZIO_LABELS[visita.giudizioIdoneita.tipoGiudizio]?.color || 'bg-gray-100 text-gray-700'}`}>
                                                    {TIPO_GIUDIZIO_LABELS[visita.giudizioIdoneita.tipoGiudizio]?.label || visita.giudizioIdoneita.tipoGiudizio}
                                                </span>
                                                <div className="text-xs text-gray-500">
                                                    Emesso: {formatDateShort(visita.giudizioIdoneita.dataEmissione)}
                                                    {visita.giudizioIdoneita.dataScadenza && (
                                                        <> · Scade: {formatDateShort(visita.giudizioIdoneita.dataScadenza)}</>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Mansioni */}
                                            {visita.giudizioIdoneita.mansioni && visita.giudizioIdoneita.mansioni.length > 0 && (
                                                <div>
                                                    <span className="text-xs font-medium text-gray-500">Mansioni:</span>
                                                    <p className="text-sm text-gray-900">
                                                        {visita.giudizioIdoneita.mansioni.map(m => m.mansione.denominazione).join(', ')}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Prescrizioni */}
                                            {visita.giudizioIdoneita.prescrizioniIdoneita && (
                                                <div>
                                                    <span className="text-xs font-medium text-gray-500">Prescrizioni:</span>
                                                    <ul className="mt-1 space-y-0.5">
                                                        {decodeCodes(visita.giudizioIdoneita.prescrizioniIdoneita, PRESCRIZIONI_CODE_MAP).map((label, i) => (
                                                            <li key={i} className="text-sm text-gray-900 flex items-start gap-1.5">
                                                                <span className="text-blue-500 mt-0.5">•</span>
                                                                {label}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {/* Limitazioni */}
                                            {visita.giudizioIdoneita.limitazioni && (
                                                <div>
                                                    <span className="text-xs font-medium text-gray-500">Limitazioni:</span>
                                                    <ul className="mt-1 space-y-0.5">
                                                        {decodeCodes(visita.giudizioIdoneita.limitazioni, LIMITAZIONI_CODE_MAP).map((label, i) => (
                                                            <li key={i} className="text-sm text-gray-900 flex items-start gap-1.5">
                                                                <span className="text-amber-500 mt-0.5">•</span>
                                                                {label}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {/* Motivazioni */}
                                            {visita.giudizioIdoneita.motivazioni && (
                                                <div>
                                                    <span className="text-xs font-medium text-gray-500">Motivazioni:</span>
                                                    <p className="text-sm text-gray-900 whitespace-pre-wrap mt-0.5">
                                                        {visita.giudizioIdoneita.motivazioni}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Timestamps */}
                                <div className="flex items-center justify-between pt-4 border-t border-gray-200 text-xs text-gray-500">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>Creata: {formatDate(visita.createdAt)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        <span>Aggiornata: {formatDate(visita.updatedAt)}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                        {visita && (
                            <button
                                onClick={() => window.open(`/poliambulatorio/visite/${visita.id}`, '_blank')}
                                className="flex items-center gap-1.5 px-4 py-2 text-sm text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded-lg transition-colors font-medium"
                            >
                                <ExternalLink className="h-4 w-4" />
                                Apri visita completa
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                        >
                            Chiudi
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VisitaViewModal;
