/**
 * RiunionePeriodicaCard
 *
 * Card per la generazione del Verbale della Riunione Periodica (Art. 35 D.Lgs 81/08).
 * Consente di selezionare l'anno, visualizzare i dati aggregati e scaricare il PDF.
 *
 * @module components/companies
 */

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Users,
    X,
    Calendar,
    Stethoscope,
    ShieldCheck,
    FileText,
    Loader2,
    AlertCircle,
    Download,
    Info,
    ClipboardList,
    Activity,
    AlertTriangle,
} from 'lucide-react';
import { cn } from '../../design-system/utils';
import { useToast } from '../../hooks/useToast';
import { apiGet, apiDownload } from '../../services/api';

// =============================================
// TYPES
// =============================================

interface TipoVisitaItem {
    tipo: string;
    label: string;
    conteggio: number;
}

interface GiudizioItem {
    tipo: string;
    label: string;
    conteggio: number;
    percentuale: number;
}

interface EsameItem {
    tipo: string;
    label: string;
    eseguiti: number;
    normali: number;
    alterati: number;
}

interface PrestazioneItem {
    nome: string;
    conteggio: number;
}

interface PartecipanteItem {
    nome: string;
    ruolo: string;
}

interface RischioItem {
    codice: string;
    categoria: string;
    livelloMax: string;
    count: number;
}

interface ProtocolloItem {
    codice: string;
    denominazione: string;
    periodicitaMesi: number | null;
}

interface RiunioneData {
    azienda: {
        ragioneSociale: string;
        codiceFiscale: string;
        partitaIva: string;
        settoreAttivita: string;
        sedi: Array<{ id: string; siteName: string; citta: string; indirizzo: string }>;
    };
    annoRiferimento: number;
    periodo: { da: string; a: string };
    sorveglianzaSanitaria: {
        totaleVisite: number;
        lavoratoriDistinti: number;
        tipiVisita: TipoVisitaItem[];
        giudizi: GiudizioItem[];
        conPrescrizioni: number;
        conLimitazioni: number;
        esamiAggregati: EsameItem[];
        prestazioniEseguite: PrestazioneItem[];
    };
    partecipanti: {
        datoreLavoro: PartecipanteItem[];
        medicoCompetente: Array<PartecipanteItem & { gender?: string }>;
        rspp: PartecipanteItem[];
        rls: PartecipanteItem[];
    };
    protocolliSanitari: ProtocolloItem[];
    mansioni: Array<{ denominazione: string; rischi: Array<{ codice: string; livello: string; categoria: string }> }>;
    rischiAggregati: RischioItem[];
}

interface RiunionePeriodicaCardProps {
    companyTenantProfileId: string;
    companyName: string;
    onActionComplete?: () => void;
}

// =============================================
// HELPERS
// =============================================

function getGiudizioColor(tipo: string): string {
    const map: Record<string, string> = {
        IDONEO: 'bg-green-500',
        IDONEO_CON_PRESCRIZIONI: 'bg-yellow-400',
        IDONEO_CON_LIMITAZIONI: 'bg-amber-400',
        NON_IDONEO_TEMPORANEO: 'bg-orange-500',
        NON_IDONEO_PERMANENTE: 'bg-red-600'
    };
    return map[tipo] || 'bg-gray-400';
}

function getGiudizioTextColor(tipo: string): string {
    const map: Record<string, string> = {
        IDONEO: 'text-green-700',
        IDONEO_CON_PRESCRIZIONI: 'text-yellow-700',
        IDONEO_CON_LIMITAZIONI: 'text-amber-700',
        NON_IDONEO_TEMPORANEO: 'text-orange-700',
        NON_IDONEO_PERMANENTE: 'text-red-700'
    };
    return map[tipo] || 'text-gray-700';
}

function getRischioColor(livello: string): string {
    const map: Record<string, string> = {
        BASSO: 'bg-green-100 text-green-700',
        MEDIO: 'bg-amber-100 text-amber-700',
        ALTO: 'bg-red-100 text-red-700',
        MOLTO_ALTO: 'bg-red-200 text-red-800',
    };
    return map[livello] || 'bg-gray-100 text-gray-700';
}

// =============================================
// COMPONENT
// =============================================

export const RiunionePeriodicaCard: React.FC<RiunionePeriodicaCardProps> = ({
    companyTenantProfileId,
    companyName,
}) => {
    const { showToast } = useToast();
    const defaultYear = useMemo(() => new Date().getFullYear() - 1, []);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedYear, setSelectedYear] = useState(defaultYear);
    const [queriedYear, setQueriedYear] = useState<number | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    // Years for selection (last 5 years)
    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => currentYear - i);
    }, []);

    // =============================================
    // QUERY — fires only when user clicks "Genera"
    // =============================================

    const { data, isLoading, isError, error } = useQuery<RiunioneData>({
        queryKey: ['riunione-periodica', companyTenantProfileId, queriedYear],
        queryFn: async () => {
            const resp = await apiGet<{ success: boolean; data: RiunioneData }>(
                `/api/v1/companies/${companyTenantProfileId}/riunione-periodica/dati?anno=${queriedYear}`
            );
            if (!resp.success) throw new Error('Errore nel caricamento dati');
            return resp.data;
        },
        enabled: queriedYear !== null,
        retry: false,
        staleTime: 5 * 60 * 1000
    });

    const handleGenera = () => {
        setQueriedYear(selectedYear);
    };

    const handleDownloadPdf = async () => {
        setIsDownloading(true);
        try {
            const blob = await apiDownload(
                `/api/v1/companies/${companyTenantProfileId}/riunione-periodica/pdf?anno=${queriedYear}`
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `verbale-riunione-periodica-${queriedYear}-${companyName.replace(/\s+/g, '-')}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast({ type: 'success', message: 'PDF scaricato con successo' });
        } catch {
            showToast({ type: 'error', message: 'Errore nel download del PDF' });
        } finally {
            setIsDownloading(false);
        }
    };

    const ss = data?.sorveglianzaSanitaria;
    const allPartecipanti = data ? [
        ...data.partecipanti.datoreLavoro,
        ...data.partecipanti.medicoCompetente,
        ...data.partecipanti.rspp,
        ...data.partecipanti.rls,
    ] : [];

    // =============================================
    // MODAL
    // =============================================

    const modal = isModalOpen ? createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000] flex items-start justify-center p-4 pt-12 overflow-y-auto">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl mb-8">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                Verbale Riunione Periodica
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Art. 35 D.Lgs 81/08 — {companyName}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(false)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Year Selector */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Anno di riferimento:</span>
                        <div className="flex items-center gap-2 flex-wrap">
                            {years.map(year => (
                                <button
                                    key={year}
                                    onClick={() => setSelectedYear(year)}
                                    className={cn(
                                        'px-3 py-2 text-xs font-medium rounded-lg border transition-colors',
                                        selectedYear === year
                                            ? 'bg-teal-100 border-teal-300 text-teal-700 dark:bg-teal-900/40 dark:border-teal-600 dark:text-teal-300'
                                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
                                    )}
                                >
                                    {year}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={handleGenera}
                            disabled={isLoading}
                            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60 ml-auto"
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                            Genera
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto">
                    {queriedYear === null && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                Seleziona l'anno e clicca "Genera"
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                Pre-impostato all'anno precedente ({defaultYear})
                            </p>
                        </div>
                    )}

                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="h-10 w-10 text-teal-500 animate-spin mb-3" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Elaborazione dati riunione...</p>
                        </div>
                    )}

                    {isError && (
                        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-700">
                            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-red-700 dark:text-red-400">Errore nel caricamento</p>
                                <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                                    {(error as Error)?.message || 'Riprova o contatta il supporto'}
                                </p>
                            </div>
                        </div>
                    )}

                    {data && !isLoading && ss && (
                        <>
                            {/* Header with download button */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-teal-500" />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Periodo: {data.periodo.da} — {data.periodo.a}
                                    </span>
                                </div>
                                <button
                                    onClick={handleDownloadPdf}
                                    disabled={isDownloading || ss.totaleVisite === 0}
                                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {isDownloading
                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                        : <Download className="h-4 w-4" />
                                    }
                                    Scarica PDF
                                </button>
                            </div>

                            {ss.totaleVisite === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                    <Info className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                        Nessuna visita completata nel {data.annoRiferimento}
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                        Il verbale può comunque essere scaricato con i dati disponibili
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* KPI */}
                                    <div className="grid grid-cols-4 gap-3">
                                        <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 rounded-xl p-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                                <Stethoscope className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                                                <span className="text-xs font-medium text-teal-700 dark:text-teal-300">Visite</span>
                                            </div>
                                            <p className="text-2xl font-bold text-teal-700 dark:text-teal-300">{ss.totaleVisite}</p>
                                        </div>
                                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                                <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Lavoratori</span>
                                            </div>
                                            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{ss.lavoratoriDistinti}</p>
                                        </div>
                                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl p-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Prescrizioni</span>
                                            </div>
                                            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{ss.conPrescrizioni}</p>
                                        </div>
                                        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-xl p-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                                <ShieldCheck className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                                                <span className="text-xs font-medium text-orange-700 dark:text-orange-300">Limitazioni</span>
                                            </div>
                                            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{ss.conLimitazioni}</p>
                                        </div>
                                    </div>

                                    {/* Partecipanti */}
                                    {allPartecipanti.length > 0 && (
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                    Partecipanti alla Riunione
                                                </h3>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {allPartecipanti.map((p, i) => (
                                                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                                        <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center flex-shrink-0">
                                                            <span className="text-xs font-bold text-teal-700 dark:text-teal-300">
                                                                {p.nome?.charAt(0) || '?'}
                                                            </span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{p.nome || 'N/D'}</p>
                                                            <p className="text-[10px] text-gray-500 dark:text-gray-400">{p.ruolo}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Giudizi idoneità */}
                                    {ss.giudizi.length > 0 && (
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <ShieldCheck className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                    Giudizi di Idoneità
                                                </h3>
                                            </div>
                                            <div className="space-y-2">
                                                {ss.giudizi.map(g => (
                                                    <div key={g.tipo} className="flex items-center gap-3">
                                                        <div className="w-36 text-xs text-gray-600 dark:text-gray-400 truncate flex-shrink-0">
                                                            {g.label}
                                                        </div>
                                                        <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                            <div
                                                                className={cn('h-full rounded-full transition-all', getGiudizioColor(g.tipo))}
                                                                style={{ width: `${Math.max(g.percentuale, 4)}%` }}
                                                            />
                                                        </div>
                                                        <div className="w-20 flex items-center gap-1.5 flex-shrink-0">
                                                            <span className={cn('text-xs font-semibold', getGiudizioTextColor(g.tipo))}>
                                                                {g.conteggio}
                                                            </span>
                                                            <span className="text-xs text-gray-400">({g.percentuale}%)</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Esami strumentali */}
                                    {ss.esamiAggregati.length > 0 && (
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <Activity className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                    Esami Strumentali
                                                </h3>
                                            </div>
                                            <div className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="bg-gray-50 dark:bg-gray-800/50">
                                                            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Esame</th>
                                                            <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500">Eseguiti</th>
                                                            <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500">Normali</th>
                                                            <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500">Alterati</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                        {ss.esamiAggregati.map(e => (
                                                            <tr key={e.tipo} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                                <td className="px-4 py-2.5 text-xs text-gray-700 dark:text-gray-300">{e.label}</td>
                                                                <td className="px-4 py-2.5 text-xs font-semibold text-center">{e.eseguiti}</td>
                                                                <td className="px-4 py-2.5 text-xs text-center text-green-600">{e.normali || '-'}</td>
                                                                <td className="px-4 py-2.5 text-xs text-center text-red-600">{e.alterati || '-'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* Rischi */}
                                    {data.rischiAggregati.length > 0 && (
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <AlertTriangle className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                    Rischi Aziendali
                                                </h3>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {data.rischiAggregati.slice(0, 8).map(r => (
                                                    <span key={r.codice} className={cn('px-2.5 py-1 rounded-lg text-xs font-medium', getRischioColor(r.livelloMax))}>
                                                        {r.codice} — {r.livelloMax}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Note Art. 35 */}
                                    <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                                        <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-blue-700 dark:text-blue-300">
                                            Art. 35 D.Lgs 81/08: La riunione periodica è obbligatoria nelle aziende con più di 15 lavoratori.
                                            Il verbale include i dati dell'attività di sorveglianza sanitaria e i risultati anonimi collettivi.
                                        </p>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    ) : null;

    // =============================================
    // RENDER
    // =============================================

    return (
        <>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    Verbale Riunione Periodica
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Art. 35 D.Lgs 81/08 — Dati aggregati sorveglianza sanitaria
                                </p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex-shrink-0"
                            >
                                <FileText className="h-4 w-4" />
                                Genera Verbale
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {modal}
        </>
    );
};

export default RiunionePeriodicaCard;
