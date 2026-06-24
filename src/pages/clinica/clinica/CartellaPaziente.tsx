/**
 * CartellaPaziente - Vista unificata del paziente
 * 
 * Mostra storico visite, referti, documenti allegati
 * e grafici trend dei dati clinici.
 * 
 * @module pages/poliambulatorio/clinica/CartellaPaziente
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import {
    ArrowLeft,
    User,
    Calendar,
    FileText,
    Activity,
    Phone,
    Mail,
    MapPin,
    ChevronRight,
    Download,
    Eye,
    Plus,
    Search,
    RefreshCw,
    Stethoscope,
    Paperclip,
    TrendingUp,
    Heart,
    Thermometer,
    AlertCircle,
    CheckCircle2,
    History,
    Shield,
    Droplets,
    Candy,
    GraduationCap,
    ClipboardList,
    X,
    XCircle
} from 'lucide-react';
import {
    pazientiApi,
    visiteApi,
    refertiApi,
    appuntamentiApi,
    documentiCliniciApi,
    modulisticaDocumentiApi,
    mansioniApi,
    protocolliSanitariApi,
    Paziente,
    Visita,
    Referto,
    Appuntamento
} from '../../../services/clinicaApi';
import { apiDownload, apiGet } from '../../../services/api';
import questionariService from '../../../services/questionariService';
import { formatDate, formatTime } from '../../../utils/dateUtils';
import { formatMedicoName } from '../../../utils/textFormatters';
import { ConsentFSEForm, ConsentFSESummary } from '../../../components/clinica/consent-fse';
import ConsentiTabletFirmati from './components/ConsentiTabletFirmati';
import ConsensiPazienteUnificati from './components/ConsensiPazienteUnificati';
import { useBillingAccess } from '../../../hooks/useBillingAccess';
import { useRoleGuard } from '../../../hooks/useRoleGuard';
import QuickFatturazioneTab from '../../finance/billing/components/QuickFatturazioneTab';
import { ProfiloSaluteCard } from '../../../components/clinica/ProfiloSaluteCard';
import { Euro } from 'lucide-react';
import OccupationalHistoryCard from './components/OccupationalHistoryCard';
import MDLInfoCard from './components/MDLInfoCard';
import type { ProtocolloSanitario, WorkerOccupationalProfile } from '../../../services/clinicaApi';

// ============================================
// TYPES
// ============================================

type TabType = 'overview' | 'visite' | 'documenti' | 'trend' | 'consensi' | 'fatturazione' | 'medicina_lavoro' | 'formazione';

interface TimelineEvent {
    id: string;
    tipo: 'visita' | 'referto' | 'appuntamento' | 'documento';
    titolo: string;
    data: Date;
    descrizione?: string;
    stato?: string;
    link?: string;
    referto?: Referto;
    visitaId?: string;
}

type PatientDocumentKind = 'referto' | 'allegato' | 'questionario' | 'modulo';

interface PatientDocumentRow {
    id: string;
    kind: PatientDocumentKind;
    title: string;
    date?: string;
    status?: string;
    subtitle?: string;
    href?: string;
    downloadHref?: string;
    visitaId?: string;
    sourceId?: string;
    blobUrl?: string;
}

interface QuickLookState {
    title: string;
    url: string;
    downloadUrl?: string;
}

const toArray = <T,>(value: unknown): T[] => {
    if (Array.isArray(value)) return value as T[];
    if (value && typeof value === 'object') {
        const data = (value as { data?: unknown; items?: unknown; results?: unknown }).data
            ?? (value as { items?: unknown }).items
            ?? (value as { results?: unknown }).results;
        return Array.isArray(data) ? data as T[] : [];
    }
    return [];
};

const getRefertoForVisita = (visita: Visita & { referti?: Referto[] | null }, referti: Referto[] = []) =>
    visita.referti?.[0] || referti.find(r => r.visitaId === visita.id);

const buildVisitRefertoAction = (visita: Visita & {
    prestazione?: { nome?: string } | null;
    referti?: Referto[] | null;
}, referti: Referto[] = []) => getRefertoForVisita(visita, referti) || ({
    id: `visita-${visita.id}`,
    visitaId: visita.id,
    titolo: `Referto - ${visita.prestazione?.nome || 'Visita'}`,
    stato: visita.stato,
    createdAt: visita.updatedAt || visita.createdAt || visita.dataOra,
} as unknown as Referto);

const RISK_LABELS: Record<string, string> = {
    RUM: 'Rumore',
    VIB_MB: 'Vibrazioni mano-braccio',
    VIB_WBV: 'Vibrazioni corpo intero',
    RAD_ION: 'Radiazioni ionizzanti',
    RAD_NIR: 'Radiazioni non ionizzanti',
    CEM: 'Campi elettromagnetici',
    MIC: 'Microclima severo',
    CHI: 'Agenti chimici',
    CAN: 'Agenti cancerogeni/mutageni',
    AMI: 'Amianto',
    PIO: 'Piombo e composti',
    BIO: 'Agenti biologici',
    MMC: 'Movimentazione manuale carichi',
    MOV_RIP: 'Movimenti ripetitivi',
    POS: 'Posture incongrue',
    NOT: 'Lavoro notturno',
    VDT: 'Videoterminale',
    SLC: 'Stress lavoro-correlato',
    QUO: 'Lavoro in quota',
    SPA_CON: 'Spazi confinati',
    GUI_MEZ: 'Guida automezzi',
    CAR_ELE: 'Carrelli elevatori',
    ELE: 'Rischio elettrico',
    INC: 'Rischio incendio',
    ISO: 'Lavoro isolato',
    IPE: 'Lavori con funi/ipogei',
    POL: 'Polveri/silice',
    ALC: 'Alcol/sostanze psicotrope',
};

const riskLabel = (r: any) => {
    const code = r.codiceRischio || r.codice || r.rischio?.codice;
    const name = r.nome || r.denominazione || r.rischio?.nome || r.rischio?.denominazione || r.descrizione || RISK_LABELS[code] || code || 'Rischio';
    const level = r.livello || r.livelloRischio || r.rischioLivello;
    return [name, code && !String(name).includes(String(code)) ? `(${code})` : null, level ? `livello ${String(level).toLowerCase()}` : null]
        .filter(Boolean)
        .join(' ');
};

const dedupeVisite = (items: Visita[] = []) => {
    const byKey = new Map<string, Visita>();
    items.forEach(visita => {
        const key = visita.isVisitaSecundaria
            ? ((visita as any).appPrestazioneId || visita.id)
            : (visita.appuntamentoId || visita.id);
        const previous = byKey.get(key);
        const previousDate = previous ? new Date(previous.updatedAt || previous.createdAt).getTime() : 0;
        const currentDate = new Date(visita.updatedAt || visita.createdAt).getTime();
        if (!previous || currentDate >= previousDate) {
            byKey.set(key, visita);
        }
    });
    return Array.from(byKey.values());
};

const QuickLookModal: React.FC<{ state: QuickLookState | null; onClose: () => void }> = ({ state, onClose }) => {
    if (!state) return null;
    return (
        <div className="fixed inset-0 z-[1200] bg-slate-950/70 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-5xl h-[86vh] rounded-xl shadow-2xl overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{state.title}</p>
                        <p className="text-xs text-gray-500">Anteprima documento</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {state.downloadUrl && (
                            <a
                                href={state.downloadUrl}
                                download
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                                <Download className="h-3.5 w-3.5" />
                                Scarica
                            </a>
                        )}
                        <button type="button" onClick={onClose} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
                <iframe title={state.title} src={state.url} className="flex-1 w-full bg-gray-50" />
            </div>
        </div>
    );
};

const unavailablePdfDataUrl = () =>
    `data:text/html;charset=utf-8,${encodeURIComponent('<div style="font-family:system-ui;padding:32px;color:#334155"><h2>Referto PDF non ancora disponibile</h2><p>Non risulta un PDF generato per questa visita.</p></div>')}`;

// ============================================
// COMPONENTS
// ============================================

/**
 * Patient Header Card
 */
const PatientHeader: React.FC<{
    paziente: Paziente;
    personId?: string;
    onEdit: () => void;
}> = ({ paziente, personId, onEdit }) => {
    const eta = useMemo(() => {
        const dob = paziente.birthDate || paziente.dataNascita;
        if (!dob) return null;
        const nascita = new Date(dob);
        const oggi = new Date();
        let eta = oggi.getFullYear() - nascita.getFullYear();
        const m = oggi.getMonth() - nascita.getMonth();
        if (m < 0 || (m === 0 && oggi.getDate() < nascita.getDate())) {
            eta--;
        }
        return eta;
    }, [paziente.birthDate, paziente.dataNascita]);

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start gap-6">
                <div className="w-24 h-24 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <User className="h-12 w-12 text-teal-600" />
                </div>

                <div className="flex-1">
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {paziente.lastName || paziente.cognome} {paziente.firstName || paziente.nome}
                            </h1>
                            <p className="text-gray-500">
                                {paziente.taxCode || paziente.codiceFiscale || 'CF non disponibile'}
                                {eta && ` • ${eta} anni`}
                            </p>
                        </div>
                        <button
                            onClick={onEdit}
                            className="px-4 py-2 text-teal-600 border border-teal-600 rounded-lg hover:bg-teal-50"
                        >
                            Modifica
                        </button>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {(paziente.phone || paziente.telefono) && (
                            <div className="flex items-center gap-2 text-gray-600">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <span>{paziente.phone || paziente.telefono}</span>
                            </div>
                        )}
                        {paziente.email && (
                            <div className="flex items-center gap-2 text-gray-600">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <span>{paziente.email}</span>
                            </div>
                        )}
                        {(paziente.residenceAddress || paziente.indirizzo) && (
                            <div className="flex items-center gap-2 text-gray-600">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <span>{paziente.residenceAddress || paziente.indirizzo}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Profilo di Salute — sezione integrata nella card anagrafica */}
            {personId && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                    <ProfiloSaluteCard personId={personId} tabLayout />
                </div>
            )}
        </div>
    );
};

/**
 * Stats Cards
 */
const StatsCards: React.FC<{
    visite: Visita[];
    referti: Referto[];
    appuntamenti: Appuntamento[];
    consensiFirmati: number;
}> = ({ visite, referti, appuntamenti, consensiFirmati }) => {
    const stats = useMemo(() => ({
        totaleVisite: visite.length,
        visiteAnno: visite.filter(v => {
            const d = new Date(v.createdAt);
            const oggi = new Date();
            return d.getFullYear() === oggi.getFullYear();
        }).length,
        totaleReferti: referti.length,
        consensiFirmati,
        appuntamentiFuturi: appuntamenti
            .filter(a => new Date(a.dataOra) > new Date() && a.stato !== 'ANNULLATO').length,
        prossimoApp: appuntamenti
            .filter(a => new Date(a.dataOra) > new Date() && a.stato !== 'ANNULLATO')
            .sort((a, b) => new Date(a.dataOra).getTime() - new Date(b.dataOra).getTime())[0]
    }), [visite, referti, appuntamenti, consensiFirmati]);

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Stethoscope className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{stats.totaleVisite}</p>
                        <p className="text-xs text-gray-500">Visite totali</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{stats.totaleReferti}</p>
                        <p className="text-xs text-gray-500">Referti</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{stats.consensiFirmati}</p>
                        <p className="text-xs text-gray-500">Consensi firmati</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{stats.appuntamentiFuturi}</p>
                        <p className="text-xs text-gray-500">
                            {stats.prossimoApp ? `Prossimo ${formatDate(new Date(stats.prossimoApp.dataOra), 'short')}` : 'App. futuri'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * Timeline Component
 */
const Timeline: React.FC<{
    events: TimelineEvent[];
    maxItems?: number;
    onQuickLookReferto?: (referto: Referto, visitaId?: string) => void;
    onDownloadReferto?: (referto: Referto, visitaId?: string) => void;
}> = ({ events, maxItems = 10, onQuickLookReferto, onDownloadReferto }) => {
    const sortedEvents = useMemo(() =>
        [...events]
            .sort((a, b) => b.data.getTime() - a.data.getTime())
            .slice(0, maxItems),
        [events, maxItems]
    );

    const getEventIcon = (tipo: TimelineEvent['tipo']) => {
        switch (tipo) {
            case 'visita': return <Stethoscope className="h-4 w-4" />;
            case 'referto': return <FileText className="h-4 w-4" />;
            case 'appuntamento': return <Calendar className="h-4 w-4" />;
            case 'documento': return <Paperclip className="h-4 w-4" />;
        }
    };

    const getEventColor = (tipo: TimelineEvent['tipo']) => {
        switch (tipo) {
            case 'visita': return 'bg-blue-500';
            case 'referto': return 'bg-purple-500';
            case 'appuntamento': return 'bg-amber-500';
            case 'documento': return 'bg-gray-500';
        }
    };

    return (
        <div className="space-y-4">
            {sortedEvents.map((event, index) => (
                <div key={event.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${getEventColor(event.tipo)}`}>
                            {getEventIcon(event.tipo)}
                        </div>
                        {index < sortedEvents.length - 1 && (
                            <div className="w-0.5 flex-1 bg-gray-200 my-2" />
                        )}
                    </div>

                    <div className="flex-1 pb-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="font-medium text-gray-900">{event.titolo}</p>
                                {event.descrizione && (
                                    <p className="text-sm text-gray-500">{event.descrizione}</p>
                                )}
                            </div>
                            <span className="text-xs text-gray-400">
                                {formatDate(event.data, 'short')}
                            </span>
                        </div>
                        {event.link && (
                            <Link
                                to={event.link}
                                className="mt-2 inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700"
                            >
                                Visualizza <ChevronRight className="h-4 w-4" />
                            </Link>
                        )}
                        {event.referto && (
                            <span className="mt-2 ml-3 inline-flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => onQuickLookReferto?.(event.referto!, event.visitaId)}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                                    title="Anteprima referto"
                                >
                                    <Eye className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onDownloadReferto?.(event.referto!, event.visitaId)}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                                    title="Scarica referto PDF"
                                >
                                    <Download className="h-4 w-4" />
                                </button>
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

/**
 * Visits List — shows prestazione, medico, and referto PDF access
 */
const VisiteList: React.FC<{
    visite: (Visita & {
        prestazione?: { id: string; nome: string; codice?: string } | null;
        medico?: { id: string; firstName?: string; lastName?: string; gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED' | null } | null;
        referti?: Referto[] | null;
    })[];
    referti?: Referto[];
    canOpenVisit: boolean;
    onQuickLookReferto: (referto: Referto, visitaId?: string) => void;
    onDownloadReferto: (referto: Referto, visitaId?: string) => void;
}> = ({ visite, referti = [], canOpenVisit, onQuickLookReferto, onDownloadReferto }) => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');

    const filteredVisite = useMemo(() =>
        visite.filter(v =>
            !search ||
            v.note?.toLowerCase().includes(search.toLowerCase()) ||
            (v.prestazione?.nome || '').toLowerCase().includes(search.toLowerCase())
        ).sort((a, b) => new Date(b.dataOra || b.createdAt).getTime() - new Date(a.dataOra || a.createdAt).getTime()),
        [visite, search]
    );

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cerca nelle visite…"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
                />
            </div>

            {filteredVisite.length === 0 ? (
                <div className="text-center py-8">
                    <Stethoscope className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">Nessuna visita trovata</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredVisite.map(visita => {
                        const dataOra = visita.dataOra || visita.createdAt;
                        const referto = buildVisitRefertoAction(visita, referti);
                        const rowTarget = canOpenVisit
                            ? `/poliambulatorio/visite/${visita.id}`
                            : !String(referto.id).startsWith('visita-')
                                ? `/poliambulatorio/referti/${referto.id}`
                                : null;
                        return (
                            <div
                                key={visita.id}
                                role={rowTarget ? 'button' : undefined}
                                tabIndex={rowTarget ? 0 : undefined}
                                onClick={() => rowTarget && navigate(rowTarget)}
                                onKeyDown={(e) => {
                                    if (rowTarget && (e.key === 'Enter' || e.key === ' ')) {
                                        e.preventDefault();
                                        navigate(rowTarget);
                                    }
                                }}
                                className={`p-4 bg-white rounded-lg border border-gray-200 hover:border-teal-200 hover:shadow-sm transition-all ${rowTarget ? 'cursor-pointer' : ''}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-gray-900 text-sm">
                                                {visita.prestazione?.nome || 'Visita'}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${visita.stato === 'COMPLETATA' ? 'bg-green-100 text-green-700' :
                                                visita.stato === 'IN_CORSO' ? 'bg-amber-100 text-amber-700' :
                                                    visita.stato === 'ANNULLATA' ? 'bg-red-100 text-red-700' :
                                                        'bg-gray-100 text-gray-700'
                                                }`}>
                                                {visita.stato}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {formatDate(new Date(dataOra), 'short')}
                                            </span>
                                            {visita.medico && (
                                                <span className="flex items-center gap-1">
                                                    <Stethoscope className="h-3 w-3" />
                                                    {formatMedicoName(visita.medico)}
                                                </span>
                                            )}
                                        </div>
                                        {visita.note && (
                                            <p className="text-xs text-gray-400 mt-1 line-clamp-1">{visita.note}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onQuickLookReferto(referto, visita.id);
                                            }}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors"
                                            title="Anteprima referto"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDownloadReferto(referto, visita.id);
                                            }}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:text-teal-700 hover:bg-teal-50 transition-colors"
                                            title="Scarica referto PDF"
                                        >
                                            <Download className="h-4 w-4" />
                                        </button>
                                        {canOpenVisit && (
                                            <Link
                                                to={`/poliambulatorio/visite/${visita.id}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                                                title="Apri visita"
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

/**
 * DocumentiList - Lista documenti paziente (Cartella Sanitaria)
 * Mostra referti PDF generati, attestati, certificati, ecc.
 */
const DocumentiList: React.FC<{
    pazienteId: string;
    referti?: Referto[];
    visite?: (Visita & { prestazione?: { nome?: string } | null; referti?: Referto[] | null })[];
    onQuickLookDocument: (doc: PatientDocumentRow) => void;
    onDownloadDocument: (doc: PatientDocumentRow) => void;
}> = ({ pazienteId, referti = [], visite = [], onQuickLookDocument, onDownloadDocument }) => {
    const [filter, setFilter] = useState<'all' | PatientDocumentKind>('all');

    const allegatiQuery = useQuery({
        queryKey: ['paziente-allegati-visite', pazienteId],
        queryFn: () => documentiCliniciApi.getAllegatiPaziente(pazienteId),
        enabled: !!pazienteId,
        staleTime: 60_000,
    });

    const questionariQuery = useQuery({
        queryKey: ['paziente-questionari-compilati', pazienteId],
        queryFn: () => questionariService.getQuestionariPaziente(pazienteId, { limit: 100 })
            .then(res => toArray<any>(res)),
        enabled: !!pazienteId,
        staleTime: 60_000,
    });

    const moduliQuery = useQuery({
        queryKey: ['paziente-modulistica-documenti', pazienteId],
        queryFn: () => modulisticaDocumentiApi.getAll({ pazienteId, limit: 100 })
            .then(res => res.data || []),
        enabled: !!pazienteId,
        staleTime: 60_000,
    });

    const documents = useMemo<PatientDocumentRow[]>(() => {
        const refertoRows: PatientDocumentRow[] = referti.map(referto => ({
            id: `referto-${referto.id}`,
            kind: 'referto',
            title: referto.titolo || `Referto del ${formatDate(new Date(referto.createdAt), 'short')}`,
            date: referto.createdAt,
            status: referto.firmato ? 'Firmato' : referto.stato,
            subtitle: referto.visita?.prestazione?.nome,
            href: `/poliambulatorio/referti/${referto.id}`,
            visitaId: referto.visitaId,
        }));
        const refertoVisitaRows: PatientDocumentRow[] = visite
            .filter(visita => !referti.some(referto => referto.visitaId === visita.id))
            .map(visita => ({
                id: `referto-visita-${visita.id}`,
                kind: 'referto',
                title: `Referto - ${visita.prestazione?.nome || 'Visita'}`,
                date: visita.updatedAt || visita.createdAt || visita.dataOra,
                status: visita.stato,
                subtitle: visita.prestazione?.nome,
                visitaId: visita.id,
            }));

        const allegatoRows: PatientDocumentRow[] = toArray<any>(allegatiQuery.data).map(allegato => ({
            id: `allegato-${allegato.id}`,
            kind: 'allegato',
            title: allegato.nome || allegato.fileName || 'Allegato visita',
            date: allegato.dataEsecuzione || allegato.createdAt,
            status: allegato.tipologiaClinica || allegato.tipo,
            subtitle: [
                allegato.visita?.prestazione?.nome,
                allegato.visita?.dataOra ? formatDate(new Date(allegato.visita.dataOra), 'short') : null,
            ].filter(Boolean).join(' - '),
            href: allegato.fileUrl || `/api/v1/clinica/documenti/visita/download/${allegato.id}`,
            downloadHref: `/api/v1/clinica/documenti/visita/download/${allegato.id}`,
        }));

        const questionarioRows: PatientDocumentRow[] = toArray<any>(questionariQuery.data).map(q => ({
            id: `questionario-${q.id}`,
            kind: 'questionario',
            title: q.template?.nome || q.documentoTemplate?.nome || q.nome || q.titolo || 'Questionario',
            date: q.updatedAt || q.createdAt || q.compilatoAt,
            status: q.stato,
            subtitle: q.visita?.prestazione?.nome || q.tipo,
            sourceId: q.id,
            href: q.pdfUrl || q.fileUrl || q.documentoPdfUrl || q.documentoUrl || undefined,
            downloadHref: q.pdfUrl || q.fileUrl || q.documentoPdfUrl || q.documentoUrl || undefined,
        }));

        const moduloRows: PatientDocumentRow[] = toArray<any>(moduliQuery.data).map(doc => ({
            id: `modulo-${doc.id}`,
            kind: 'modulo',
            title: doc.documentoTemplate?.nome || doc.documentoTemplate?.titolo || doc.note || 'Modulo',
            date: doc.updatedAt || doc.createdAt,
            status: doc.dataScadenza && new Date(doc.dataScadenza) < new Date() ? 'Scaduto' : doc.stato,
            subtitle: [
                doc.visita?.dataOra ? formatDate(new Date(doc.visita.dataOra), 'short') : null,
                doc.dataScadenza ? `Scade ${formatDate(new Date(doc.dataScadenza), 'short')}` : null,
            ].filter(Boolean).join(' - '),
            href: doc.pdfUrl || doc.fileUrl || doc.downloadUrl || undefined,
            downloadHref: doc.pdfUrl || doc.fileUrl || doc.downloadUrl || undefined,
        }));

        return [...refertoRows, ...refertoVisitaRows, ...allegatoRows, ...questionarioRows, ...moduloRows]
            .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    }, [allegatiQuery.data, moduliQuery.data, questionariQuery.data, referti, visite]);

    const filteredDocs = filter === 'all' ? documents : documents.filter(doc => doc.kind === filter);
    const isLoading = allegatiQuery.isLoading || questionariQuery.isLoading || moduliQuery.isLoading;
    const hasError = allegatiQuery.isError || questionariQuery.isError || moduliQuery.isError;
    const refetch = () => {
        allegatiQuery.refetch();
        questionariQuery.refetch();
        moduliQuery.refetch();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 text-teal-600 animate-spin" />
            </div>
        );
    }

    if (hasError) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-red-300 mx-auto mb-4" />
                <p className="text-red-500">Errore nel caricamento documenti</p>
                <button
                    onClick={() => refetch()}
                    className="mt-4 px-4 py-2 text-teal-600 hover:bg-teal-50 rounded-lg"
                >
                    Riprova
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filter tabs */}
            <div className="flex gap-2 flex-wrap">
                {([
                    { key: 'all', label: 'Tutti' },
                    { key: 'referto', label: 'Referti' },
                    { key: 'allegato', label: 'Allegati' },
                    { key: 'questionario', label: 'Questionari' },
                    { key: 'modulo', label: 'Moduli' }
                ] as const).map(f => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f.key
                            ? 'bg-teal-100 text-teal-700'
                            : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {filteredDocs.length === 0 ? (
                <div className="text-center py-8">
                    <Paperclip className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">Nessun documento trovato</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredDocs.map(doc => {
                        const docDate = doc.date ? new Date(doc.date) : new Date();
                        const kindClass = doc.kind === 'referto' ? 'bg-teal-100 text-teal-700'
                            : doc.kind === 'allegato' ? 'bg-blue-100 text-blue-700'
                                : doc.kind === 'questionario' ? 'bg-violet-100 text-violet-700'
                                    : 'bg-amber-100 text-amber-700';
                        const kindLabel = doc.kind === 'referto' ? 'Referto'
                            : doc.kind === 'allegato' ? 'Allegato'
                                : doc.kind === 'questionario' ? 'Questionario'
                                    : 'Modulo';

                        return (
                            <div
                                key={doc.id}
                                className="p-4 bg-white rounded-lg border border-gray-200 hover:border-teal-300 transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-5 w-5 text-gray-400" />
                                            <span className="font-medium text-gray-900">
                                                {doc.title}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                                            <span>{formatDate(docDate, 'short')}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${kindClass}`}>
                                                {kindLabel}
                                            </span>
                                            {doc.status && (
                                                <span className="text-xs">
                                                    {String(doc.status).replace(/_/g, ' ')}
                                                </span>
                                            )}
                                            {doc.subtitle && <span className="text-xs">{doc.subtitle}</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {(doc.href || doc.visitaId) && (
                                            <button
                                                type="button"
                                                onClick={() => onQuickLookDocument(doc)}
                                                className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded"
                                                title="Quicklook"
                                            >
                                                <Eye className="h-5 w-5" />
                                            </button>
                                        )}
                                        {(doc.downloadHref || doc.href || doc.visitaId) && (
                                            <button
                                                type="button"
                                                onClick={() => onDownloadDocument(doc)}
                                                className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded"
                                                title="Scarica"
                                            >
                                                <Download className="h-5 w-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

/**
 * Trend Chart Component - Grafici parametri vitali
 * @param initialField - Optional field name from URL param to auto-select the corresponding metric
 */
type MetricKey = 'pressione' | 'frequenza' | 'temperatura' | 'peso' | 'bmi' | 'saturazione' | 'glicemia';

/** Maps visit field names (from datiStrutturati) to TrendChart metric keys */
const FIELD_TO_METRIC: Record<string, MetricKey> = {
    pressioneSistolica: 'pressione',
    pressioneDiastolica: 'pressione',
    sistolica: 'pressione',
    diastolica: 'pressione',
    pressione: 'pressione',
    frequenzaCardiaca: 'frequenza',
    frequenza: 'frequenza',
    temperatura: 'temperatura',
    peso: 'peso',
    altezza: 'peso',
    bmi: 'bmi',
    saturazione: 'saturazione',
    saturazioneO2: 'saturazione',
    glicemia: 'glicemia',
};

const TrendChart: React.FC<{ pazienteId: string; initialField?: string }> = ({ pazienteId, initialField }) => {
    const [selectedMetric, setSelectedMetric] = useState<MetricKey>(() => {
        if (initialField) {
            return FIELD_TO_METRIC[initialField] || 'pressione';
        }
        return 'pressione';
    });

    // Sync selectedMetric when initialField changes (e.g., navigating from different vital parameter)
    useEffect(() => {
        if (initialField) {
            const mapped = FIELD_TO_METRIC[initialField];
            if (mapped) {
                setSelectedMetric(mapped);
            }
        }
    }, [initialField]);

    // Fetch real historical data from patient visits
    const { data: storicoData, isLoading: isLoadingStorico } = useQuery({
        queryKey: ['paziente-trend-storico', pazienteId],
        queryFn: () => pazientiApi.getStorico(pazienteId),
        enabled: !!pazienteId,
        staleTime: 5 * 60 * 1000
    });

    // Extract vital parameters from datiStrutturati of each visit
    const trendData = useMemo(() => {
        if (!storicoData?.visite) return [];

        const dataPoints: Array<{
            data: string;
            dataOraRaw: string;
            pressione_sys: number | null;
            pressione_dia: number | null;
            frequenza: number | null;
            temperatura: number | null;
            peso: number | null;
            bmi: number | null;
            saturazione: number | null;
            glicemia: number | null;
        }> = [];

        for (const visita of storicoData.visite) {
            if (!visita.datiStrutturati || typeof visita.datiStrutturati !== 'object') continue;

            const dati = visita.datiStrutturati as Record<string, unknown>;
            const dateStr = visita.dataOra || visita.createdAt;

            // Helper: extract numeric value from individual field or composite VITALS object
            const extractNum = (keys: string[]): number | null => {
                for (const key of keys) {
                    if (typeof dati[key] === 'number') return dati[key] as number;
                }
                // Also check composite VITALS objects (e.g., parametriVitali.sistolica)
                for (const val of Object.values(dati)) {
                    if (val && typeof val === 'object' && !Array.isArray(val)) {
                        const obj = val as Record<string, unknown>;
                        for (const key of keys) {
                            if (typeof obj[key] === 'number') return obj[key] as number;
                        }
                    }
                }
                return null;
            };

            const sys = extractNum(['pressioneSistolica', 'sistolica']);
            const dia = extractNum(['pressioneDiastolica', 'diastolica']);
            const fc = extractNum(['frequenzaCardiaca', 'frequenza']);
            const temp = extractNum(['temperatura']);
            const peso = extractNum(['peso']);
            const altezza = extractNum(['altezza']);
            const spo2 = extractNum(['saturazioneO2', 'saturazione']);
            const glic = extractNum(['glicemia']);
            // Calculate BMI from peso/altezza if both present
            const rawBmi = extractNum(['bmi']);
            const bmi = rawBmi !== null ? rawBmi
                : (peso !== null && altezza !== null && altezza > 0)
                    ? Math.round((peso / Math.pow(altezza / 100, 2)) * 10) / 10
                    : null;

            if (sys !== null || dia !== null || fc !== null || temp !== null || peso !== null || bmi !== null || spo2 !== null || glic !== null) {
                const d = new Date(dateStr);
                dataPoints.push({
                    data: d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
                    dataOraRaw: dateStr,
                    pressione_sys: sys,
                    pressione_dia: dia,
                    frequenza: fc,
                    temperatura: temp,
                    peso: peso,
                    bmi: bmi,
                    saturazione: spo2,
                    glicemia: glic
                });
            }
        }

        // Sort chronologically and take last 20 data points
        return dataPoints
            .sort((a, b) => new Date(a.dataOraRaw).getTime() - new Date(b.dataOraRaw).getTime())
            .slice(-20);
    }, [storicoData?.visite]);

    const metrics = {
        pressione: {
            label: 'Pressione Arteriosa',
            icon: Activity,
            color: '#ef4444',
            unit: 'mmHg',
            lines: [
                { key: 'pressione_sys', name: 'Sistolica', color: '#ef4444' },
                { key: 'pressione_dia', name: 'Diastolica', color: '#3b82f6' }
            ]
        },
        frequenza: {
            label: 'Frequenza Cardiaca',
            icon: Heart,
            color: '#ec4899',
            unit: 'bpm',
            lines: [{ key: 'frequenza', name: 'FC', color: '#ec4899' }]
        },
        temperatura: {
            label: 'Temperatura',
            icon: Thermometer,
            color: '#f59e0b',
            unit: '°C',
            lines: [{ key: 'temperatura', name: 'Temp', color: '#f59e0b' }]
        },
        peso: {
            label: 'Peso Corporeo',
            icon: User,
            color: '#10b981',
            unit: 'kg',
            lines: [{ key: 'peso', name: 'Peso', color: '#10b981' }]
        },
        bmi: {
            label: 'BMI (Indice Massa Corporea)',
            icon: Activity,
            color: '#8b5cf6',
            unit: '',
            lines: [{ key: 'bmi', name: 'BMI', color: '#8b5cf6' }]
        },
        saturazione: {
            label: 'Saturazione O₂',
            icon: Droplets,
            color: '#06b6d4',
            unit: '%',
            lines: [{ key: 'saturazione', name: 'SpO₂', color: '#06b6d4' }]
        },
        glicemia: {
            label: 'Glicemia',
            icon: Candy,
            color: '#d97706',
            unit: 'mg/dL',
            lines: [{ key: 'glicemia', name: 'Glicemia', color: '#d97706' }]
        }
    };

    const currentMetric = metrics[selectedMetric];
    const Icon = currentMetric.icon;

    // Calcola ultimo valore e variazione - type-safe
    const lastValue = trendData.length > 0 ? trendData[trendData.length - 1] : null;
    const prevValue = trendData.length > 1 ? trendData[trendData.length - 2] : null;

    type TrendDataKey = 'pressione_sys' | 'pressione_dia' | 'frequenza' | 'temperatura' | 'peso' | 'bmi' | 'saturazione' | 'glicemia';

    // Fields where increase is NOT positive (higher = worse)
    const inverseFields: TrendDataKey[] = ['bmi', 'temperatura', 'glicemia'];

    const getVariation = (key: TrendDataKey) => {
        const curr = lastValue?.[key] ?? null;
        const prev = prevValue?.[key] ?? null;
        if (curr === null) return null;
        const diff = prev !== null ? curr - prev : 0;
        return { value: curr, diff, isPositive: diff >= 0 };
    };

    // Loading state
    if (isLoadingStorico) {
        return (
            <div className="flex items-center justify-center py-16">
                <RefreshCw className="h-6 w-6 text-teal-600 animate-spin mr-3" />
                <span className="text-gray-500">Caricamento trend...</span>
            </div>
        );
    }

    // Empty state
    if (trendData.length === 0) {
        return (
            <div className="text-center py-16">
                <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Nessun dato disponibile</h3>
                <p className="text-sm text-gray-400">I dati dei parametri vitali appariranno qui dopo le visite con campi compilati.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Metric selector */}
            <div className="flex gap-2 flex-wrap">
                {(Object.keys(metrics) as Array<keyof typeof metrics>).map(key => {
                    const metric = metrics[key];
                    const MetricIcon = metric.icon;
                    return (
                        <button
                            key={key}
                            onClick={() => setSelectedMetric(key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${selectedMetric === key
                                ? 'bg-teal-100 text-teal-700 ring-2 ring-teal-500'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            <MetricIcon className="h-4 w-4" />
                            {metric.label}
                        </button>
                    );
                })}
            </div>

            {/* Chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl`} style={{ backgroundColor: `${currentMetric.color}20` }}>
                            <Icon className="h-6 w-6" style={{ color: currentMetric.color }} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">{currentMetric.label}</h3>
                            <p className="text-sm text-gray-500">Ultime {trendData.length} rilevazioni</p>
                        </div>
                    </div>

                    {/* Current value */}
                    <div className="text-right">
                        {currentMetric.lines.map(line => {
                            const variation = getVariation(line.key as TrendDataKey);
                            if (!variation) return (
                                <div key={line.key} className="mb-1 last:mb-0">
                                    <span className="text-gray-400 text-sm">N/D</span>
                                </div>
                            );
                            return (
                                <div key={line.key} className="mb-1 last:mb-0">
                                    <span className="text-2xl font-bold" style={{ color: line.color }}>
                                        {variation.value}
                                    </span>
                                    <span className="text-gray-500 ml-1">{currentMetric.unit}</span>
                                    {prevValue && variation.diff !== 0 && (() => {
                                        const isInverse = inverseFields.includes(line.key as TrendDataKey);
                                        const isPositive = isInverse
                                            ? variation.diff < 0  // For BMI/temp, decrease is positive
                                            : variation.diff > 0;
                                        return (
                                            <span className={`ml-2 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                                {variation.diff >= 0 ? '↑' : '↓'} {Math.abs(variation.diff).toFixed(1)}
                                            </span>
                                        );
                                    })()}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                                dataKey="data"
                                stroke="#9ca3af"
                                fontSize={12}
                            />
                            <YAxis
                                stroke="#9ca3af"
                                fontSize={12}
                                domain={['dataMin - 5', 'dataMax + 5']}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'white',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                }}
                                formatter={(value: number) => [`${value} ${currentMetric.unit}`, '']}
                            />
                            <Legend />
                            {currentMetric.lines.map(line => (
                                <Area
                                    key={line.key}
                                    type="monotone"
                                    dataKey={line.key}
                                    name={line.name}
                                    stroke={line.color}
                                    fill={`${line.color}20`}
                                    strokeWidth={2}
                                    dot={{ fill: line.color, strokeWidth: 2 }}
                                    activeDot={{ r: 6 }}
                                />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(Object.keys(metrics) as Array<keyof typeof metrics>).map(key => {
                    const metric = metrics[key];
                    const MetricIcon = metric.icon;
                    const lastValKey = metric.lines[0].key as TrendDataKey;
                    const lastVal = lastValue?.[lastValKey] ?? null;
                    return (
                        <div
                            key={key}
                            className={`p-4 rounded-xl border ${selectedMetric === key ? 'border-teal-300 bg-teal-50' : 'border-gray-200 bg-white'
                                }`}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <MetricIcon className="h-5 w-5" style={{ color: metric.color }} />
                                <span className="text-sm text-gray-600">{metric.label}</span>
                            </div>
                            <p className="text-xl font-bold text-gray-900">
                                {key === 'pressione'
                                    ? `${lastValue?.pressione_sys ?? '—'}/${lastValue?.pressione_dia ?? '—'}`
                                    : lastVal ?? '—'
                                }
                                <span className="text-sm font-normal text-gray-500 ml-1">
                                    {metric.unit}
                                </span>
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const CartellaPaziente: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const { hasBillingFeature } = useBillingAccess();
    const { isPazienteOnly } = useRoleGuard();
    const [quickLook, setQuickLook] = useState<QuickLookState | null>(null);
    const [showAllPastAppointments, setShowAllPastAppointments] = useState(false);

    // Read tab from query params (e.g., ?tab=trend&field=peso)
    useEffect(() => {
        const tabParam = searchParams.get('tab');
        const allowedTabs = hasBillingFeature
            ? ['overview', 'visite', 'documenti', 'trend', 'consensi', 'fatturazione', 'medicina_lavoro', 'formazione']
            : ['overview', 'visite', 'documenti', 'trend', 'consensi', 'medicina_lavoro', 'formazione'];

        if (tabParam && allowedTabs.includes(tabParam)) {
            setActiveTab(tabParam as TabType);
        } else if (!hasBillingFeature && activeTab === 'fatturazione') {
            setActiveTab('overview');
        }
    }, [activeTab, hasBillingFeature, searchParams]);

    // Queries
    const { data: paziente, isLoading: loadingPaziente } = useQuery({
        queryKey: ['paziente', id],
        queryFn: () => pazientiApi.getById(id!),
        enabled: !!id
    });

    const { data: visite } = useQuery({
        queryKey: ['visite-paziente', id],
        queryFn: () => visiteApi.getByPaziente(id!),
        enabled: !!id
    });

    const { data: referti } = useQuery({
        queryKey: ['referti-paziente', id],
        queryFn: () => refertiApi.getByPaziente(id!),
        enabled: !!id
    });

    const { data: appuntamentiData } = useQuery({
        queryKey: ['appuntamenti-paziente', id],
        queryFn: () => appuntamentiApi.getByPaziente(id!),
        enabled: !!id
    });

    const { data: consensiFirmatiData } = useQuery({
        queryKey: ['paziente-consensi-firmati', id],
        queryFn: () => apiGet<{ success: boolean; data: any[] }>(`/api/v1/clinica/pazienti/${id}/consensi-firmati`)
            .then(res => res.data || [])
            .catch(() => []),
        enabled: !!id,
    });

    const appuntamenti = useMemo(() => toArray<Appuntamento>(appuntamentiData), [appuntamentiData]);
    const appuntamentiFuturi = useMemo(() => appuntamenti
        .filter(a => new Date(a.dataOra) > new Date() && a.stato !== 'ANNULLATO')
        .sort((a, b) => new Date(a.dataOra).getTime() - new Date(b.dataOra).getTime()), [appuntamenti]);
    const appuntamentiPassati = useMemo(() => appuntamenti
        .filter(a => new Date(a.dataOra) <= new Date() || a.stato === 'ANNULLATO')
        .sort((a, b) => new Date(b.dataOra).getTime() - new Date(a.dataOra).getTime()), [appuntamenti]);

    const visiteDeduped = useMemo(
        () => dedupeVisite((paziente as any)?.visiteComePaziente || toArray<Visita>(visite)),
        [paziente, visite]
    );

	    const refertiList = useMemo(() => {
	        const byId = new Map<string, Referto>();
        toArray<Referto>(referti).forEach(referto => {
            if (referto?.id) byId.set(referto.id, referto);
        });
        visiteDeduped.forEach(visita => {
            ((visita as any).referti || []).forEach((referto: Referto) => {
                if (referto?.id) byId.set(referto.id, { ...referto, visitaId: referto.visitaId || visita.id });
            });
        });
	        return Array.from(byId.values());
	    }, [referti, visiteDeduped]);

	    const refertiDisplayList = useMemo(() => {
	        const byVisit = new Set(refertiList.map(referto => referto.visitaId).filter(Boolean));
	        const synthetic = visiteDeduped
	            .filter(visita => !byVisit.has(visita.id))
	            .map(visita => buildVisitRefertoAction(visita as Visita & { referti?: Referto[] | null }, refertiList));
	        return [...refertiList, ...synthetic];
	    }, [refertiList, visiteDeduped]);

    const consensiFirmatiCount = useMemo(() => {
        const tokens = toArray<any>(consensiFirmatiData);
        const validCodes = new Set<string>();
        tokens.forEach(t => {
            if (!t.firmatoAt) return;
            (t.firmatoConsensi || t.documentiDaMostrare || []).forEach((c: string) => validCodes.add(c));
        });
        return validCodes.size;
    }, [consensiFirmatiData]);

    const resolveRefertoPdfUrl = async (referto: Referto, visitaId?: string) => {
        const existingUrl = (referto as any).pdfUrl || (referto as any).fileUrl || (referto as any).documentUrl;
        if (existingUrl) return existingUrl;
        const targetVisitaId = visitaId || referto.visitaId;
        if (!targetVisitaId) return null;
        const pdf = await visiteApi.getRefertoPdf(targetVisitaId);
        return pdf?.fileUrl || null;
    };

	    const handleQuickLookReferto = async (referto: Referto, visitaId?: string) => {
	        try {
	            const pdfUrl = await resolveRefertoPdfUrl(referto, visitaId);
	            const fallbackUrl = String(referto.id).startsWith('visita-')
	                ? unavailablePdfDataUrl()
	                : `/poliambulatorio/referti/${referto.id}`;
	            setQuickLook({
	                title: referto.titolo || 'Referto PDF',
	                url: pdfUrl || fallbackUrl,
	                downloadUrl: pdfUrl || undefined,
	            });
	        } catch {
	            setQuickLook({ title: referto.titolo || 'Referto', url: unavailablePdfDataUrl() });
	        }
	    };

	    const handleDownloadReferto = async (referto: Referto, visitaId?: string) => {
	        const pdfUrl = await resolveRefertoPdfUrl(referto, visitaId);
	        if (!pdfUrl && String(referto.id).startsWith('visita-')) {
	            setQuickLook({ title: referto.titolo || 'Referto', url: unavailablePdfDataUrl() });
	            return;
	        }
	        window.open(pdfUrl || `/poliambulatorio/referti/${referto.id}`, '_blank', 'noopener,noreferrer');
	    };

    const handleQuickLookDocument = async (doc: PatientDocumentRow) => {
	        if (doc.kind === 'referto' && doc.visitaId) {
	            const pdf = await visiteApi.getRefertoPdf(doc.visitaId);
	            setQuickLook({
	                title: doc.title,
	                url: pdf?.fileUrl || doc.href || unavailablePdfDataUrl(),
	                downloadUrl: pdf?.fileUrl || doc.href,
	            });
            return;
        }
        if (doc.kind === 'questionario' && !doc.href && doc.sourceId) {
            try {
                const generated = await questionariService.generateCompilatoPdf(doc.sourceId);
                setQuickLook({
                    title: doc.title,
                    url: generated?.pdfUrl || unavailablePdfDataUrl(),
                    downloadUrl: generated?.pdfUrl,
                });
            } catch {
                setQuickLook({ title: doc.title, url: unavailablePdfDataUrl() });
            }
            return;
        }
        setQuickLook({
            title: doc.title,
            url: doc.downloadHref || doc.href || (doc.visitaId ? `/poliambulatorio/referti/${doc.visitaId}` : '#'),
            downloadUrl: doc.downloadHref || doc.href,
        });
    };

    const handleDownloadDocument = async (doc: PatientDocumentRow) => {
	        if (doc.kind === 'referto' && doc.visitaId) {
	            const pdf = await visiteApi.getRefertoPdf(doc.visitaId);
	            if (pdf?.fileUrl || doc.href) {
	                window.open(pdf?.fileUrl || doc.href, '_blank', 'noopener,noreferrer');
	            } else {
	                setQuickLook({ title: doc.title, url: unavailablePdfDataUrl() });
	            }
	            return;
        }
        if (doc.kind === 'questionario' && !doc.downloadHref && !doc.href && doc.sourceId) {
            try {
                const generated = await questionariService.generateCompilatoPdf(doc.sourceId);
                if (generated?.pdfUrl) window.open(generated.pdfUrl, '_blank', 'noopener,noreferrer');
                else setQuickLook({ title: doc.title, url: unavailablePdfDataUrl() });
            } catch {
                setQuickLook({ title: doc.title, url: unavailablePdfDataUrl() });
            }
            return;
        }
        const url = doc.downloadHref || doc.href;
        if (!url) return;
        try {
            const blob = await apiDownload(url);
            const objectUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = objectUrl;
            a.download = doc.title;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(objectUrl);
        } catch {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    // Timeline events
    const timelineEvents = useMemo<TimelineEvent[]>(() => {
        const events: TimelineEvent[] = [];

        visiteDeduped.forEach(v => {
            const referto = buildVisitRefertoAction(v as Visita & { referti?: Referto[] | null }, refertiList);
            events.push({
                id: `visita-${v.id}`,
                tipo: 'visita',
                titolo: v.prestazione?.nome || 'Visita',
                descrizione: [
                    v.medico ? formatMedicoName(v.medico as any) : null,
                    v.stato ? String(v.stato).replace(/_/g, ' ') : null,
                ].filter(Boolean).join(' - '),
                data: new Date(v.createdAt),
                stato: v.stato,
                referto,
                visitaId: v.id,
                link: isPazienteOnly
                    ? !String(referto.id).startsWith('visita-') ? `/poliambulatorio/referti/${referto.id}` : undefined
                    : `/poliambulatorio/visite/${v.id}`
            });
        });

        refertiList
            .filter(r => !visiteDeduped.some(v => v.id === r.visitaId))
            .forEach(r => {
            events.push({
                id: `referto-${r.id}`,
                tipo: 'referto',
                titolo: r.firmato ? 'Referto firmato' : 'Referto',
                data: new Date(r.createdAt),
                stato: r.stato,
                link: `/poliambulatorio/referti/${r.id}`
            });
        });

        appuntamenti.forEach(a => {
            events.push({
                id: `app-${a.id}`,
                tipo: 'appuntamento',
                titolo: a.prestazione?.nome || 'Appuntamento',
                data: new Date(a.dataOra),
                stato: a.stato,
                link: isPazienteOnly ? undefined : `/poliambulatorio/agenda/appuntamenti/${a.id}`
            });
        });

        return events;
    }, [visiteDeduped, refertiList, appuntamenti, isPazienteOnly]);

    // Check if patient has a company assigned (for MDL tab visibility)
    const isPatientWithCompany = useMemo(() => {
        const profiles: any[] = (paziente as any)?.tenantProfiles || [];
        const roles: any[] = (paziente as any)?.personRoles || [];
        return profiles.some((p: any) => p.companyTenantProfileId != null) ||
            roles.some((r: any) => r.roleType === 'EMPLOYEE');
    }, [paziente]);

    // MDL data (lazy loaded when tab is active)
    const { data: mdlData } = useQuery<WorkerOccupationalProfile>({
        queryKey: ['mdl-rischi-paziente', id],
        queryFn: () => apiGet<any>(`/api/v1/clinica/mansioni/worker/${id}/occupational-profile`)
            .then((r: any) => {
                const data = r?.data ?? r;
                return {
                    rischi: Array.isArray(data?.rischi) ? data.rischi : [],
                    mansioni: Array.isArray(data?.mansioni) ? data.mansioni : [],
                    hasPersonalizedRisks: !!data?.hasPersonalizedRisks,
                    statoOccupazionale: data?.statoOccupazionale,
                    syncResult: data?.syncResult,
                };
            })
            .catch(() => ({ rischi: [], mansioni: [], hasPersonalizedRisks: false })),
        enabled: !!id && (activeTab === 'medicina_lavoro' || isPatientWithCompany)
    });

    const currentOccupationalProtocollo = useMemo(() => {
        const current = mdlData?.statoOccupazionale?.current as any;
        return current?.protocolloSanitario
            || current?.snapshot?.protocolloSanitario
            || mdlData?.statoOccupazionale?.history?.find((h: any) => h?.protocolloSanitario)?.protocolloSanitario
            || null;
    }, [mdlData?.statoOccupazionale]);

    const { data: protocolliDisponibiliData } = useQuery({
        queryKey: ['protocolli-sanitari-attivi-cartella'],
        queryFn: () => protocolliSanitariApi.getAll({ limit: 200, isAttivo: true }),
        enabled: !!id && activeTab === 'medicina_lavoro',
        staleTime: 5 * 60 * 1000,
    });

    const protocolliDisponibili = useMemo<ProtocolloSanitario[]>(() =>
        toArray<ProtocolloSanitario>((protocolliDisponibiliData as any)?.data ?? protocolliDisponibiliData),
        [protocolliDisponibiliData]
    );

    const updateOccupationalProfileMutation = useMutation({
        mutationFn: (protocolloSanitarioId: string | null) =>
            mansioniApi.updateWorkerOccupationalProfile(id!, { protocolloSanitarioId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mdl-rischi-paziente', id] });
            queryClient.invalidateQueries({ queryKey: ['scadenze-persona', id] });
            queryClient.invalidateQueries({ queryKey: ['mdl-scadenze-cartella', id] });
            queryClient.invalidateQueries({ queryKey: ['paziente', id] });
        },
    });

    const { data: mdlGiudizi } = useQuery({
        queryKey: ['mdl-giudizi-paziente', id],
        queryFn: () => apiGet<any>(`/api/v1/clinica/giudizi-idoneita?personId=${id}&limit=10`)
            .then(r => Array.isArray(r) ? r : (r?.data || r?.giudizi || []))
            .catch(() => []),
        enabled: !!id && (activeTab === 'medicina_lavoro' || isPatientWithCompany)
    });

    const { data: mdlScadenze } = useQuery({
        queryKey: ['mdl-scadenze-cartella', id],
        queryFn: () => apiGet<any>(`/api/v1/clinica/scadenze-mdl/persona/${id}`)
            .then(r => toArray<any>(r?.data ?? r))
            .catch(() => []),
        enabled: !!id && activeTab === 'medicina_lavoro',
    });

    const mdlAccertamenti = useMemo(() => {
        const rows = toArray<any>(mdlScadenze);
        const byName = new Map<string, { nome: string; tipo: string; prossima?: string; periodicita?: number | string; fonte?: string }>();
        const current = mdlData?.statoOccupazionale?.current as any;
        const protocollo = current?.protocolloSanitario || current?.snapshot?.protocolloSanitario;

        (protocollo?.prestazioni || []).forEach((p: any) => {
            const nome = p.prestazione?.nome || p.nome || p.prestazioneId;
            if (!nome) return;
            byName.set(nome, {
                nome,
                tipo: p.prestazione?.tipo === 'QUESTIONARIO' ? 'Questionario' : 'Prestazione',
                periodicita: p.periodicitaCustomMesi || protocollo.periodicitaVisiteMesi,
                fonte: p.isObbligatoria ? 'Protocollo' : 'Protocollo opzionale',
            });
        });

        rows
            .filter(r => r.prestazioneTipo !== 'VISITA_MEDICINA_LAVORO')
            .forEach(r => {
                const nome = r.prestazioneName || r.documentoTemplate?.nome || 'Accertamento';
                byName.set(nome, {
                    ...byName.get(nome),
                    nome,
                    tipo: r.prestazioneTipo === 'QUESTIONARIO' ? 'Questionario' : 'Prestazione',
                    prossima: r.scadenze?.find((s: any) => !s.eseguita)?.dataScadenza,
                    periodicita: r.periodicitaMesi || byName.get(nome)?.periodicita,
                    fonte: byName.get(nome)?.fonte || 'Aggiunto/modificato',
                });
            });

        return Array.from(byName.values())
            .map(r => ({
                ...r,
            }))
            .sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
    }, [mdlScadenze, mdlData?.statoOccupazionale]);

    // Courses (formazione)
    const { data: corsiFData } = useQuery({
        queryKey: ['corsi-paziente', id],
        queryFn: () => apiGet<any>(`/api/v1/schedules?personId=${id}&limit=10`)
            .then(r => Array.isArray(r) ? r : (r?.data || r?.items || []))
            .catch(() => []),
        enabled: !!id && activeTab === 'formazione'
    });

    const { data: attestatiData } = useQuery({
        queryKey: ['attestati-paziente', id],
        queryFn: () => modulisticaDocumentiApi.getAll({ pazienteId: id!, limit: 100 })
            .then(res => (res.data || []).filter((doc: any) => {
                const tipo = doc.documentoTemplate?.tipo || doc.documentoTemplate?.type || '';
                return String(tipo).toUpperCase().includes('CERTIFICATE')
                    || String(tipo).toUpperCase().includes('ATTESTATO');
            }))
            .catch(() => []),
        enabled: !!id && activeTab === 'formazione'
    });

    // Loading
    if (loadingPaziente) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <RefreshCw className="h-8 w-8 text-teal-600 animate-spin" />
            </div>
        );
    }

    // Not found
    if (!paziente) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                    <p className="text-gray-700">Paziente non trovato</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="mt-4 text-teal-600 hover:text-teal-700"
                    >
                        Torna indietro
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <QuickLookModal state={quickLook} onClose={() => setQuickLook(null)} />
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Cartella Paziente</h1>
                            <p className="text-sm text-gray-500">{paziente.lastName || paziente.cognome} {paziente.firstName || paziente.nome}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
                {/* Patient Header */}
                <PatientHeader
                    paziente={paziente}
                    personId={id}
                    onEdit={() => navigate(`/poliambulatorio/pazienti/${id}/modifica`)}
                />

	                {/* Stats */}
		                <StatsCards
		                    visite={visiteDeduped}
		                    referti={refertiDisplayList}
		                    appuntamenti={appuntamenti}
	                        consensiFirmati={consensiFirmatiCount}
		                />

                {/* Tabs */}
                <div className="bg-white rounded-xl border border-gray-200">
                    <div className="border-b border-gray-200">
                        <nav className="flex gap-1 p-2">
                            {([
	                                { key: 'overview', label: 'Panoramica', count: null, icon: <Activity className="h-4 w-4" /> },
	                                { key: 'visite', label: 'Visite', count: visiteDeduped.length, icon: <Stethoscope className="h-4 w-4" /> },
		                                { key: 'documenti', label: 'Documenti', count: refertiDisplayList.length, icon: <Paperclip className="h-4 w-4" /> },
	                                { key: 'trend', label: 'Trend', count: null, icon: <TrendingUp className="h-4 w-4" /> },
	                                { key: 'consensi', label: 'Consensi', count: null, icon: <Shield className="h-4 w-4" /> },
	                                ...(hasBillingFeature ? [{ key: 'fatturazione' as const, label: 'Fatture', count: null, icon: <Euro className="h-4 w-4" /> }] : []),
	                                ...(isPatientWithCompany ? [{ key: 'medicina_lavoro' as const, label: 'Medicina del Lavoro', count: mdlData?.mansioni?.length || null, icon: <ClipboardList className="h-4 w-4" /> }] : []),
	                                { key: 'formazione' as const, label: 'Formazione', count: null, icon: <GraduationCap className="h-4 w-4" /> }
	                            ] as const).map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === tab.key
                                        ? 'bg-teal-100 text-teal-700'
                                        : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
	                                    {tab.icon}
	                                    {tab.label}
	                                    {typeof tab.count === 'number' && tab.count > 0 && (
	                                        <span className="ml-1 rounded-full bg-white/80 px-1.5 py-0.5 text-[11px] text-gray-500">
	                                            {tab.count}
	                                        </span>
	                                    )}
	                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="p-6">
                        {activeTab === 'overview' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <History className="h-5 w-5 text-gray-400" />
                                        Cronologia Recente
                                    </h3>
                                    <Timeline
                                        events={timelineEvents}
                                        maxItems={8}
                                        onQuickLookReferto={handleQuickLookReferto}
                                        onDownloadReferto={handleDownloadReferto}
                                    />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <Calendar className="h-5 w-5 text-gray-400" />
                                        Prossimi Appuntamenti
                                    </h3>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-semibold uppercase text-gray-400">Futuri</span>
                                        {!isPazienteOnly && (
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/poliambulatorio/appuntamenti/nuovo?pazienteId=${id}`)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50"
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                                Prenota
                                            </button>
                                        )}
                                    </div>
                                    {appuntamentiFuturi
                                        .slice(0, 4)
                                        .map(app => (
                                            <div key={app.id} className="p-3 bg-gray-50 rounded-lg mb-2">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-medium text-gray-900">
                                                            {app.prestazione?.nome || 'Appuntamento'}
                                                        </p>
                                                        <p className="text-sm text-gray-500">
                                                            {formatDate(new Date(app.dataOra), 'full')} alle {formatTime(new Date(app.dataOra))}
                                                        </p>
                                                    </div>
	                                                    {!isPazienteOnly && (
	                                                        <Link
	                                                            to={`/poliambulatorio/agenda/appuntamenti/${app.id}`}
	                                                            className="text-teal-600 hover:text-teal-700"
	                                                        >
	                                                            <ChevronRight className="h-5 w-5" />
	                                                        </Link>
	                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    {appuntamenti.filter(a => new Date(a.dataOra) > new Date() && a.stato !== 'ANNULLATO').length === 0 && (
                                        <div className="text-center py-8 text-gray-500">
                                            <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                                            <p>Nessun appuntamento programmato</p>
	                                            {!isPazienteOnly && (
	                                                <button
                                                        type="button"
                                                        onClick={() => navigate(`/poliambulatorio/appuntamenti/nuovo?pazienteId=${id}`)}
	                                                    className="mt-2 inline-flex items-center gap-1 text-teal-600 hover:text-teal-700"
	                                                >
	                                                    <Plus className="h-4 w-4" />
	                                                    Prenota appuntamento
	                                                </button>
	                                            )}
                                        </div>
                                    )}
                                    {appuntamentiPassati.length > 0 && (
                                        <div className="mt-5 border-t border-gray-100 pt-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-semibold uppercase text-gray-400">Passati</span>
                                                {appuntamentiPassati.length > 3 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowAllPastAppointments(v => !v)}
                                                        className="text-xs font-medium text-teal-700 hover:text-teal-800"
                                                    >
                                                        {showAllPastAppointments ? 'Mostra meno' : 'Vedi tutti'}
                                                    </button>
                                                )}
                                            </div>
                                            {(showAllPastAppointments ? appuntamentiPassati : appuntamentiPassati.slice(0, 3)).map(app => (
                                                <button
                                                    key={app.id}
                                                    type="button"
                                                    onClick={() => !isPazienteOnly && navigate(`/poliambulatorio/agenda/appuntamenti/${app.id}`)}
                                                    className="w-full p-3 bg-white border border-gray-100 rounded-lg mb-2 text-left hover:border-teal-200"
                                                >
                                                    <p className="text-sm font-medium text-gray-800">{app.prestazione?.nome || 'Appuntamento'}</p>
                                                    <p className="text-xs text-gray-500">{formatDate(new Date(app.dataOra), 'full')} alle {formatTime(new Date(app.dataOra))}</p>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {/* Consensi FSE Summary */}
                                {id && (
                                    <div className="lg:col-span-2">
                                        <ConsentFSESummary
                                            personId={id}
                                            onViewDetails={() => setActiveTab('consensi')}
                                        />
                                    </div>
                                )}

                            </div>
                        )}

	                        {activeTab === 'visite' && (
	                            <VisiteList
	                                visite={visiteDeduped as any}
	                                referti={refertiList}
	                                canOpenVisit={!isPazienteOnly}
                                    onQuickLookReferto={handleQuickLookReferto}
                                    onDownloadReferto={handleDownloadReferto}
	                            />
	                        )}
	                        {activeTab === 'documenti' && id && (
	                            <div className="space-y-6">
		                                <DocumentiList
	                                        pazienteId={id}
	                                        referti={refertiList}
	                                        visite={visiteDeduped as any}
	                                        onQuickLookDocument={handleQuickLookDocument}
	                                        onDownloadDocument={handleDownloadDocument}
	                                    />
	                            </div>
	                        )}
                        {activeTab === 'trend' && id && <TrendChart pazienteId={id} initialField={searchParams.get('field') || undefined} />}
                        {activeTab === 'consensi' && id && (
                            <div>
                                <ConsentFSEForm
                                    personId={id}
                                    personName={`${paziente.lastName || paziente.cognome} ${paziente.firstName || paziente.nome}`}
                                />
                                <ConsentiTabletFirmati pazienteId={id} />
                                <ConsensiPazienteUnificati personId={id} />
                            </div>
                        )}
                        {hasBillingFeature && activeTab === 'fatturazione' && id && (
                            <QuickFatturazioneTab
                                context={{
                                    tipoServizio: 'VISITA',
                                    personaId: id,
                                    cessionarioDenominazione: `${paziente.lastName || paziente.cognome || ''} ${paziente.firstName || paziente.nome || ''}`.trim(),
                                    cessionarioCF: paziente.codiceFiscale || paziente.taxCode,
                                    sistemaTsDefault: 0,
                                }}
                                compact={false}
                            />
                        )}

                        {activeTab === 'medicina_lavoro' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <ClipboardList className="h-5 w-5 text-teal-600" />
                                    Medicina del Lavoro
                                </h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <MDLInfoCard
                                            mansioni={(mdlData?.mansioni || []) as any}
                                            protocolli={currentOccupationalProtocollo ? [currentOccupationalProtocollo] : null}
                                            rischi={(mdlData?.rischi || []) as any}
                                            hasPersonalizedRisks={mdlData?.hasPersonalizedRisks}
                                            pazienteId={id!}
                                            isReadonly={isPazienteOnly}
                                        />
                                        {!isPazienteOnly && (
                                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                                <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">
                                                    Protocollo sanitario assegnato
                                                </label>
                                                <select
                                                    value={(currentOccupationalProtocollo as any)?.id || ''}
                                                    onChange={(e) => updateOccupationalProfileMutation.mutate(e.target.value || null)}
                                                    disabled={updateOccupationalProfileMutation.isPending}
                                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100 disabled:opacity-60"
                                                >
                                                    <option value="">Nessun protocollo</option>
                                                    {protocolliDisponibili.map(protocollo => (
                                                        <option key={protocollo.id} value={protocollo.id}>
                                                            {protocollo.denominazione}{protocollo.codice ? ` (${protocollo.codice})` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                                <p className="mt-2 text-xs text-slate-500">
                                                    Cambiare protocollo aggiorna lo stato occupazionale del lavoratore senza forzare mansioni o rischi non assegnati.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <OccupationalHistoryCard
                                        statoOccupazionale={mdlData?.statoOccupazionale}
                                        className="lg:col-span-1"
                                    />
                                    <div className="lg:col-span-2">
                                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Accertamenti previsti</h4>
                                        {!mdlAccertamenti.length ? (
                                            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500">Nessun accertamento programmato.</div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {mdlAccertamenti.map((a, idx) => (
                                                    <div key={`${a.nome}-${idx}`} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                                                        <p className="text-sm font-medium text-gray-800">{a.nome}</p>
                                                        <p className="text-xs text-gray-500">
                                                            {a.tipo}
                                                            {a.periodicita ? ` - ogni ${a.periodicita} mesi` : ''}
                                                            {a.prossima ? ` - prossima ${formatDate(new Date(a.prossima), 'short')}` : ''}
                                                            {a.fonte ? ` - ${a.fonte}` : ''}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {/* Giudizi di Idoneità */}
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Giudizi di Idoneità</h4>
                                        {!mdlGiudizi || mdlGiudizi.length === 0 ? (
                                            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500">Nessun giudizio registrato.</div>
                                        ) : (
                                            <div className="space-y-2">
                                                {(mdlGiudizi as any[]).slice(0, 5).map((g: any, idx: number) => {
                                                    const tipo = g.tipoGiudizio || g.tipo || '';
                                                    const ok = tipo.startsWith('IDONEO') && !tipo.includes('NON');
                                                    const nok = tipo.startsWith('NON_IDONEO');
                                                    return (
                                                        <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200 flex items-start gap-2">
                                                            {ok ? <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" /> : nok ? <XCircle className="h-4 w-4 text-red-500 mt-0.5" /> : <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />}
                                                            <div className="flex-1">
                                                                <p className={`text-sm font-medium ${ok ? 'text-green-700' : nok ? 'text-red-700' : 'text-amber-700'}`}>{tipo.replace(/_/g, ' ')}</p>
                                                                {g.dataScadenza && <p className="text-xs text-gray-400">Scade: {new Date(g.dataScadenza).toLocaleDateString('it-IT')}</p>}
                                                            </div>
                                                            <span className="text-xs text-gray-400 flex-shrink-0">{g.dataVisita ? new Date(g.dataVisita).toLocaleDateString('it-IT') : ''}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'formazione' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <GraduationCap className="h-5 w-5 text-blue-600" />
                                    Formazione
                                </h3>

                                {/* Corsi */}
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Corsi Frequentati</h4>
                                    {!corsiFData || (corsiFData as any[]).length === 0 ? (
                                        <div className="bg-gray-50 rounded-lg p-6 text-center text-sm text-gray-500">
                                            Nessun corso registrato.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {(corsiFData as any[]).map((corso: any, idx: number) => {
                                                const status = (corso.status || corso.stato || '').toUpperCase();
                                                const statusCls = status === 'COMPLETED' || status === 'COMPLETATO'
                                                    ? 'bg-green-100 text-green-700'
                                                    : status === 'IN_PROGRESS' || status === 'IN_CORSO'
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : status === 'CANCELLED' || status === 'ANNULLATO'
                                                            ? 'bg-red-100 text-red-700'
                                                            : 'bg-gray-100 text-gray-600';
                                                const statusLabel = status === 'COMPLETED' || status === 'COMPLETATO' ? 'Completato'
                                                    : status === 'IN_PROGRESS' || status === 'IN_CORSO' ? 'In corso'
                                                        : status === 'CANCELLED' || status === 'ANNULLATO' ? 'Annullato'
                                                            : status === 'PLANNED' || status === 'PIANIFICATO' ? 'Pianificato'
                                                                : status || null;
                                                const dataCorso = corso.startDate || corso.dataInizio;
                                                return (
                                                    <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-800">
                                                                    {corso.course?.title || corso.course?.nome || corso.courseName || corso.nome || `Corso ${idx + 1}`}
                                                                </p>
                                                                {dataCorso && (
                                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                                        {new Date(dataCorso).toLocaleDateString('it-IT')}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            {statusLabel && (
                                                                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${statusCls}`}>
                                                                    {statusLabel}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Attestati / Certificati (da DocumentoCompilato tipo CERTIFICATE) */}
                                {(attestatiData as any[])?.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Attestati / Certificati</h4>
                                        <div className="space-y-2">
                                            {(attestatiData as any[]).map((att: any, idx: number) => {
                                                const nome = att.metadata?.displayFilename || att.metadata?.courseName || att.filename || `Attestato ${idx + 1}`;
                                                return (
                                                    <div key={att.id || idx} className="bg-blue-50 rounded-lg p-3 border border-blue-200 flex items-start justify-between gap-2">
                                                        <div>
                                                            <p className="text-sm font-medium text-blue-900">{nome}</p>
                                                            {att.generatedAt && (
                                                                <p className="text-xs text-blue-600 mt-0.5">
                                                                    Generato: {new Date(att.generatedAt).toLocaleDateString('it-IT')}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <Link
                                                            to={`/poliambulatorio/documenti/${att.id}`}
                                                            className="p-1 text-blue-400 hover:text-blue-600 rounded flex-shrink-0 transition-colors"
                                                            title="Apri attestato"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Link>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CartellaPaziente;
