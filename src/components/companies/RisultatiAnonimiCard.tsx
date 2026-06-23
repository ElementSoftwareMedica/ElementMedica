/**
 * RisultatiAnonimiCard
 *
 * R17: Card per la generazione dei Risultati Anonimi Collettivi (Art. 40 c.1 D.Lgs 81/08).
 * Consente al medico competente di selezionare un periodo e visualizzare statistiche
 * aggregate anonime sulle visite e giudizi dell'azienda.
 *
 * @module components/companies
 */

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import {
    BarChart3,
    X,
    Calendar,
    Users,
    Stethoscope,
    ShieldCheck,
    FileText,
    Loader2,
    AlertCircle,
    ChevronRight,
    Download,
    Eye,
    CheckCircle2,
    AlertTriangle,
    Info,
    ClipboardList,
    Activity,
    Upload,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { cn } from '../../design-system/utils';
import { useToast } from '../../hooks/useToast';
import { apiGet, apiDownload, apiPost, apiUpload } from '../../services/api';
import SigningWorkflowModal from '../schedules/components/DocumentManager/components/SigningWorkflowModal';
import type { SignaturePlacement } from '../schedules/components/DocumentManager/components/SigningWorkflowModal';
import { DatePickerElegante } from '../ui/DatePickerElegante';

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

interface PrestazioneItem {
    nome: string;
    conteggio: number;
}

interface RisultatiAnonimiStats {
    periodo: { da: string; a: string };
    totaleVisite: number;
    lavoratoriDistinti: number;
    visiteSenzaGiudizio: number;
    giudiziRegistratiPercentuale: number;
    tipiVisita: TipoVisitaItem[];
    giudizi: GiudizioItem[];
    prestazioniEseguite: PrestazioneItem[];
    esamiAggregati?: Array<{
        tipo: string;
        label: string;
        eseguiti: number;
        normali: number;
        alterati: number;
    }>;
    healthAggregates?: Record<string, number>;
}

interface RisultatiAnonimiCardProps {
    companyTenantProfileId: string;
    companyName: string;
    onActionComplete?: () => void;
}

interface MdlDocumentFile {
    filename: string;
    originalName: string;
    createdAt: string;
    signedOnline?: boolean;
    url: string;
}

// =============================================
// HELPERS
// =============================================

function getDefaultPeriod(): { from: string; to: string } {
    const prevYear = new Date().getFullYear() - 1;
    return {
        from: `${prevYear}-01-01`,
        to: `${prevYear}-12-31`
    };
}

function formatDateLabel(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

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

// =============================================
// COMPONENT
// =============================================

export const RisultatiAnonimiCard: React.FC<RisultatiAnonimiCardProps> = ({
    companyTenantProfileId,
    companyName,
    onActionComplete
}) => {
    const { showToast } = useToast();
    const defaults = useMemo(() => getDefaultPeriod(), []);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [dateFrom, setDateFrom] = useState(defaults.from);
    const [dateTo, setDateTo] = useState(defaults.to);
    const [queriedFrom, setQueriedFrom] = useState<string | null>(null);
    const [queriedTo, setQueriedTo] = useState<string | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isPdfGenerated, setIsPdfGenerated] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isSigning, setIsSigning] = useState(false);
    const [historyExpanded, setHistoryExpanded] = useState(false);
    const [signingFile, setSigningFile] = useState<MdlDocumentFile | null>(null);

    // =============================================
    // QUERY — fires only when user clicks "Genera"
    // =============================================

    const { data: stats, isLoading, isError, error, refetch } = useQuery<RisultatiAnonimiStats>({
        queryKey: ['risultati-anonimi', companyTenantProfileId, queriedFrom, queriedTo],
        queryFn: async () => {
            const resp = await apiGet<{ success: boolean; data: RisultatiAnonimiStats }>(
                `/api/v1/companies/${companyTenantProfileId}/risultati-anonimi?dateFrom=${queriedFrom}&dateTo=${queriedTo}`
            );
            if (!resp.success) throw new Error('Errore nel caricamento statistiche');
            return resp.data;
        },
        enabled: !!queriedFrom && !!queriedTo,
        retry: false,
        staleTime: 5 * 60 * 1000
    });

    const { data: documenti = [], refetch: refetchDocumenti } = useQuery<MdlDocumentFile[]>({
        queryKey: ['company-mdl-documents', companyTenantProfileId, 'risultati-anonimi'],
        queryFn: async () => {
            const resp = await apiGet<{ success: boolean; data: MdlDocumentFile[] }>(
                `/api/v1/companies/${companyTenantProfileId}/mdl-documents/risultati-anonimi/files`
            );
            return resp.data || [];
        },
        enabled: !!companyTenantProfileId,
        staleTime: 60_000
    });

    const handleGenera = () => {
        if (!dateFrom || !dateTo) {
            showToast({ type: 'warning', message: 'Selezionare date di inizio e fine periodo' });
            return;
        }
        if (dateFrom > dateTo) {
            showToast({ type: 'warning', message: 'La data di inizio deve essere prima della data di fine' });
            return;
        }
        setIsPdfGenerated(false);
        setQueriedFrom(dateFrom);
        setQueriedTo(dateTo);
    };

    const handleGeneraPdf = async () => {
        if (!stats || !queriedFrom || !queriedTo) return;
        setIsGeneratingPdf(true);
        try {
            const blob = await apiDownload(
                `/api/v1/companies/${companyTenantProfileId}/risultati-anonimi/pdf?dateFrom=${queriedFrom}&dateTo=${queriedTo}`
            );
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `risultati-anonimi-${companyName.replace(/\s+/g, '-')}-${queriedFrom}-${queriedTo}.docx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            setIsPdfGenerated(true);
            await refetchDocumenti();
            showToast({ type: 'success', message: 'Documento Word generato con successo' });
        } catch {
            showToast({ type: 'error', message: 'Errore nella generazione del documento' });
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handleOpenDocument = async (file: MdlDocumentFile) => {
        const blob = await apiDownload(file.url);
        window.open(URL.createObjectURL(blob), '_blank', 'noopener,noreferrer');
    };

    const handleUploadFirmato = async () => {
        if (!uploadFile) {
            showToast({ type: 'warning', message: 'Seleziona un PDF o una foto firmata' });
            return;
        }
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('documento', uploadFile);
            formData.append('note', `Risultati anonimi collettivi ${dateFrom} - ${dateTo}`);
            await apiUpload(`/api/v1/companies/${companyTenantProfileId}/mdl-documents/risultati-anonimi/upload`, formData);
            setUploadFile(null);
            await refetchDocumenti();
            showToast({ type: 'success', message: 'Documento firmato caricato' });
        } catch {
            showToast({ type: 'error', message: 'Errore durante il caricamento del documento firmato' });
        } finally {
            setIsUploading(false);
        }
    };

    const handleUploadFirmatoForFile = async (file: File, source: MdlDocumentFile) => {
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('documento', file);
            formData.append('note', `Documento firmato collegato a ${source.originalName}`);
            await apiUpload(`/api/v1/companies/${companyTenantProfileId}/mdl-documents/risultati-anonimi/upload`, formData);
            await refetchDocumenti();
            showToast({ type: 'success', message: 'Documento firmato caricato' });
        } catch {
            showToast({ type: 'error', message: 'Errore durante il caricamento del documento firmato' });
        } finally {
            setIsUploading(false);
        }
    };

    const getPreviewPdfUrl = () => (
        `/api/v1/companies/${companyTenantProfileId}/risultati-anonimi/pdf?dateFrom=${queriedFrom || dateFrom}&dateTo=${queriedTo || dateTo}&format=pdf`
    );

    const handleOnlineSign = async ({
        signatureDataUrl,
        placement
    }: {
        signatureDataUrl: string;
        placement: SignaturePlacement;
    }) => {
        try {
            setIsUploading(true);
            await apiPost(`/api/v1/companies/${companyTenantProfileId}/mdl-documents/risultati-anonimi/sign`, {
                signatureImage: signatureDataUrl,
                placement,
                sourceFilename: signingFile?.filename,
                dateFrom: queriedFrom || dateFrom,
                dateTo: queriedTo || dateTo,
            });
            setIsSigning(false);
            setSigningFile(null);
            await refetchDocumenti();
            showToast({ type: 'success', message: 'Documento firmato e archiviato' });
        } catch {
            showToast({ type: 'error', message: 'Errore durante la firma del documento' });
        } finally {
            setIsUploading(false);
        }
    };

    const openSignatureForFile = (file?: MdlDocumentFile) => {
        setSigningFile(file || null);
        setIsSigning(true);
    };

    // =============================================
    // MODAL
    // =============================================

    const modal = isModalOpen ? createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000] flex items-start justify-center p-4 pt-16 overflow-y-auto">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                            <BarChart3 className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                Risultati Anonimi Collettivi
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Art. 40 c.1 D.Lgs 81/08 — {companyName}
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

                {/* Period selector */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="flex-1 min-w-[150px]">
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                Dal
                            </label>
                            <DatePickerElegante
                                value={dateFrom || null}
                                onChange={(d) => setDateFrom(d ? d.toISOString().split('T')[0] : '')}
                                theme="teal"
                                size="sm"
                                placeholder="Dal..."
                            />
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                Al
                            </label>
                            <DatePickerElegante
                                value={dateTo || null}
                                onChange={(d) => setDateTo(d ? d.toISOString().split('T')[0] : '')}
                                theme="teal"
                                size="sm"
                                placeholder="Al..."
                            />
                        </div>

                        {/* Quick selectors */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {[
                                { label: defaults.from.slice(0, 4), value: { from: defaults.from, to: defaults.to } },
                                { label: String(new Date().getFullYear()), value: { from: `${new Date().getFullYear()}-01-01`, to: `${new Date().getFullYear()}-12-31` } },
                            ].map(preset => (
                                <button
                                    key={preset.label}
                                    onClick={() => { setDateFrom(preset.value.from); setDateTo(preset.value.to); }}
                                    className={cn(
                                        'px-3 py-2 text-xs font-medium rounded-lg border transition-colors',
                                        dateFrom === preset.value.from && dateTo === preset.value.to
                                            ? 'bg-teal-100 border-teal-300 text-teal-700 dark:bg-teal-900/40 dark:border-teal-600 dark:text-teal-300'
                                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
                                    )}
                                >
                                    Anno {preset.label}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handleGenera}
                            disabled={isLoading}
                            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60"
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                            Genera
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
                    {!queriedFrom && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <BarChart3 className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                Seleziona il periodo e clicca "Genera"
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                Pre-impostato all'anno precedente ({defaults.from.slice(0, 4)})
                            </p>
                        </div>
                    )}

                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="h-10 w-10 text-teal-500 animate-spin mb-3" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Elaborazione statistiche...</p>
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

                    {stats && !isLoading && (
                        <>
                            {/* Stats header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-teal-500" />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Periodo: {formatDateLabel(stats.periodo.da)} — {formatDateLabel(stats.periodo.a)}
                                    </span>
                                </div>
                                <button
                                    onClick={handleGeneraPdf}
                                    disabled={isGeneratingPdf || stats.totaleVisite === 0}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-50 dark:text-teal-400 dark:border-teal-700 dark:hover:bg-teal-900/30 transition-colors disabled:opacity-50"
                                >
                                    {isGeneratingPdf
                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        : <Download className="h-3.5 w-3.5" />
                                    }
                                    Esporta DOCX
                                </button>
                            </div>

                            {stats.totaleVisite === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                    <Info className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                        Nessuna visita completata nel periodo selezionato
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                        Prova a modificare il periodo di riferimento
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* KPI row */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 rounded-xl p-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Stethoscope className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                                                <span className="text-xs font-medium text-teal-700 dark:text-teal-300">Visite totali</span>
                                            </div>
                                            <p className="text-3xl font-bold text-teal-700 dark:text-teal-300">{stats.totaleVisite}</p>
                                        </div>

                                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Lavoratori</span>
                                            </div>
                                            <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{stats.lavoratoriDistinti}</p>
                                        </div>

                                        <div className={cn(
                                            'border rounded-xl p-4',
                                            stats.giudiziRegistratiPercentuale >= 80
                                                ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800'
                                                : 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800'
                                        )}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <ShieldCheck className={cn(
                                                    'h-4 w-4',
                                                    stats.giudiziRegistratiPercentuale >= 80 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                                                )} />
                                                <span className={cn(
                                                    'text-xs font-medium',
                                                    stats.giudiziRegistratiPercentuale >= 80 ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'
                                                )}>Giudizi registrati</span>
                                            </div>
                                            <p className={cn(
                                                'text-3xl font-bold',
                                                stats.giudiziRegistratiPercentuale >= 80 ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'
                                            )}>{stats.giudiziRegistratiPercentuale}%</p>
                                        </div>
                                    </div>

                                    {stats.healthAggregates && (
                                        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                                            {[
                                                ['Obesi', stats.healthAggregates.obesi],
                                                ['Sottopeso', stats.healthAggregates.sottopeso],
                                                ['Invalidità', stats.healthAggregates.invalidita],
                                                ['Fumatori', stats.healthAggregates.fumatori],
                                            ].map(([label, value]) => (
                                                <div key={String(label)} className="rounded-xl border border-gray-100 bg-white p-3 text-center dark:border-gray-700 dark:bg-gray-900">
                                                    <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
                                                    <p className="mt-1 text-xl font-bold text-gray-800 dark:text-gray-100">{Number(value || 0)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Giudizi idoneità */}
                                    {stats.giudizi.length > 0 && (
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <ShieldCheck className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                    Giudizi di idoneità
                                                </h3>
                                            </div>

                                            {/* Bar chart */}
                                            <div className="space-y-2.5">
                                                {stats.giudizi.map(g => (
                                                    <div key={g.tipo} className="flex items-center gap-3">
                                                        <div className="w-40 text-xs text-gray-600 dark:text-gray-400 truncate flex-shrink-0">
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
                                                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                                                ({g.percentuale}%)
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {stats.visiteSenzaGiudizio > 0 && (
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-40 text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                                                            Senza giudizio
                                                        </div>
                                                        <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full bg-gray-300 dark:bg-gray-600"
                                                                style={{ width: `${Math.max(Math.round(stats.visiteSenzaGiudizio / stats.totaleVisite * 100), 4)}%` }}
                                                            />
                                                        </div>
                                                        <div className="w-20 flex-shrink-0">
                                                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                                                {stats.visiteSenzaGiudizio}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Tipi di visita */}
                                    {stats.tipiVisita.length > 0 && (
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <ClipboardList className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                    Tipi di visita
                                                </h3>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {stats.tipiVisita.map(t => (
                                                    <div key={t.tipo} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{t.label}</p>
                                                        </div>
                                                        <span className="text-lg font-bold text-gray-800 dark:text-gray-200 flex-shrink-0">{t.conteggio}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Esami strumentali */}
                                    {stats.esamiAggregati && stats.esamiAggregati.length > 0 && (
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <Activity className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                    Esami strumentali
                                                </h3>
                                            </div>
                                            <div className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="bg-gray-50 dark:bg-gray-800/50">
                                                            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Esame</th>
                                                            <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Eseguiti</th>
                                                            <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Normali</th>
                                                            <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Alterati</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                        {stats.esamiAggregati.map(e => (
                                                            <tr key={e.tipo} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                                <td className="px-4 py-2.5 text-xs text-gray-700 dark:text-gray-300">{e.label}</td>
                                                                <td className="px-4 py-2.5 text-xs font-semibold text-gray-800 dark:text-gray-200 text-right">{e.eseguiti}</td>
                                                                <td className="px-4 py-2.5 text-xs font-semibold text-green-600 dark:text-green-400 text-right">{e.normali}</td>
                                                                <td className="px-4 py-2.5 text-xs font-semibold text-amber-600 dark:text-amber-400 text-right">{e.alterati}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* Prestazioni eseguite */}
                                    {stats.prestazioniEseguite.length > 0 && (
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <Stethoscope className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                    Accertamenti eseguiti
                                                </h3>
                                            </div>
                                            <div className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="bg-gray-50 dark:bg-gray-800/50">
                                                            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Prestazione</th>
                                                            <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">N°</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                        {stats.prestazioniEseguite.map((p, i) => (
                                                            <tr key={p.nome} className={cn(
                                                                'hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
                                                                i >= 5 ? 'hidden' : ''
                                                            )}>
                                                                <td className="px-4 py-2.5 text-xs text-gray-700 dark:text-gray-300">{p.nome}</td>
                                                                <td className="px-4 py-2.5 text-xs font-semibold text-gray-800 dark:text-gray-200 text-right">{p.conteggio}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                {stats.prestazioniEseguite.length > 5 && (
                                                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-400 dark:text-gray-500 text-center border-t border-gray-100 dark:border-gray-700">
                                                        +{stats.prestazioniEseguite.length - 5} altre prestazioni
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Nota Art. 40 */}
                                    <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                                        <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-blue-700 dark:text-blue-300">
                                            I dati sono aggregati ed anonimi ai sensi dell'Art. 40 c.1 D.Lgs 81/08.
                                            Non contengono dati personali identificabili dei lavoratori.
                                        </p>
                                    </div>

                                    {isPdfGenerated && (
                                    <div className="rounded-xl border border-gray-100 p-3 dark:border-gray-700">
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Documenti generati / firmati</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Quick-look, download e upload del documento firmato.</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="file"
                                                    accept="application/pdf,image/jpeg,image/png"
                                                    onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
                                                    className="max-w-[210px] text-xs text-gray-500 file:mr-2 file:rounded-md file:border-0 file:bg-gray-100 file:px-2 file:py-1 file:text-xs file:font-semibold"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setIsSigning(true)}
                                                    disabled={!queriedFrom || !queriedTo}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                                                >
                                                    <FileText className="h-3.5 w-3.5" />
                                                    Firma online
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleUploadFirmato}
                                                    disabled={isUploading || !uploadFile}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-50"
                                                >
                                                    <Upload className="h-3.5 w-3.5" />
                                                    Upload firmato
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            {documenti.length === 0 ? (
                                                <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">Nessun documento firmato caricato.</p>
                                            ) : documenti.map(file => (
                                                <div key={file.filename} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 text-xs dark:bg-gray-800">
                                                    <span className="min-w-0 flex-1 truncate text-gray-700 dark:text-gray-200">{file.originalName}</span>
                                                    <div className="flex items-center gap-1">
                                                        <button type="button" onClick={() => handleOpenDocument(file)} className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50" title="Quick-look">
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button type="button" onClick={() => apiDownload(file.url).then(blob => {
                                                            const url = URL.createObjectURL(blob);
                                                            const a = document.createElement('a');
                                                            a.href = url;
                                                            a.download = file.originalName;
                                                            a.click();
                                                            URL.revokeObjectURL(url);
                                                        })} className="rounded-md p-1.5 text-teal-600 hover:bg-teal-50" title="Download">
                                                            <Download className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    )}
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
                        <BarChart3 className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    Risultati Anonimi Collettivi
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Art. 40 c.1 D.Lgs 81/08 — Statistiche aggregate anonime per periodo
                                </p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex-shrink-0"
                            >
                                <BarChart3 className="h-4 w-4" />
                                Genera
                            </button>
                        </div>
                        <div className="mt-4 rounded-xl border border-gray-100 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={() => setHistoryExpanded(prev => !prev)}
                                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700/50"
                            >
                                <span>Documenti pregressi ({documenti.length})</span>
                                {historyExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                            {historyExpanded && (
                                <div className="space-y-2 border-t border-gray-100 p-3 dark:border-gray-700">
                                    {documenti.length === 0 ? (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Nessun documento generato o firmato.</p>
                                    ) : documenti.map(file => (
                                        <div key={file.filename} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 text-xs dark:bg-gray-900">
                                            <span className="min-w-0 flex-1 truncate text-gray-700 dark:text-gray-200">{file.originalName}</span>
                                            <div className="flex items-center gap-1">
                                                <button type="button" onClick={() => handleOpenDocument(file)} className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50" title="Quick-look">
                                                    <Eye className="h-3.5 w-3.5" />
                                                </button>
                                                <button type="button" onClick={() => apiDownload(file.url).then(blob => {
                                                    const url = URL.createObjectURL(blob);
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = file.originalName;
                                                    a.click();
                                                    URL.revokeObjectURL(url);
                                                })} className="rounded-md p-1.5 text-teal-600 hover:bg-teal-50" title="Download">
                                                    <Download className="h-3.5 w-3.5" />
                                                </button>
                                                <button type="button" onClick={() => openSignatureForFile(file)} className="rounded-md p-1.5 text-violet-600 hover:bg-violet-50" title="Firma online">
                                                    <FileText className="h-3.5 w-3.5" />
                                                </button>
                                                <label className="cursor-pointer rounded-md p-1.5 text-amber-600 hover:bg-amber-50" title="Upload firmato">
                                                    <Upload className="h-3.5 w-3.5" />
                                                    <input
                                                        type="file"
                                                        accept="application/pdf,image/jpeg,image/png"
                                                        className="hidden"
                                                        disabled={isUploading}
                                                        onChange={(event) => {
                                                            const selected = event.target.files?.[0];
                                                            if (selected) void handleUploadFirmatoForFile(selected, file);
                                                            event.target.value = '';
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {modal}
            {isSigning && (
                <SigningWorkflowModal
                    isOpen={isSigning}
                    documentId={signingFile?.filename || `risultati-anonimi-${companyTenantProfileId}-${queriedFrom || dateFrom}-${queriedTo || dateTo}`}
                    documentLabel={signingFile?.originalName || 'Risultati Anonimi Collettivi'}
                    previewUrl={signingFile?.url || getPreviewPdfUrl()}
                    onClose={() => {
                        setIsSigning(false);
                        setSigningFile(null);
                    }}
                    onConfirm={({ signatureDataUrl, placement }) => handleOnlineSign({ signatureDataUrl, placement })}
                />
            )}
        </>
    );
};

export default RisultatiAnonimiCard;
