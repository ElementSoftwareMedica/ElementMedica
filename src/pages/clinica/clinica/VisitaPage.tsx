/**
 * VisitaPage - Main clinical visit page
 * 
 * Complete refactor using P52 VisitTemplate system:
 * - Dynamic fields from medico-specific templates
 * - Configurable sidebar sections
 * - Auto-save with revision tracking
 * - Timer with persistence
 * - GDPR compliant access logging
 * 
 * Layout:
 * - Sticky header with patient data, timer, and actions
 * - Left sidebar: Quick actions + Section navigation
 * - Center: Form sections
 * 
 * @module pages/clinica/clinica/VisitaPage
 * @project P52 - Clinical Visit Template System
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
    AlertCircle,
    Loader2,
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
    X,
    Heart,
    Mail
} from 'lucide-react';
import { visiteApi, appuntamentiApi, pazientiApi, mediciApi, convenzioniApi, scontiApi, prestazioniApi, documentiCliniciApi, mansioniApi, protocolliSanitariApi, profiloDiSaluteApi, scadenzeMDLApi, giudiziIdoneitaApi, appuntamentoPrestazioniApi, type VisitAccessControl, type Convenzione, type ScadenzaProtocolloGruppo, type GiudizioIdoneita } from '../../../services/clinicaApi';
import type { SorveglianzaStats } from './components/VisitaScadenzaCard';
import * as queueApi from '../../../services/queueApi';
import questionariService from '../../../services/questionariService';
import { apiGet, apiPost } from '../../../services/api';
import { strumentiBridgeApi, type EsameStrumentale } from '../../../services/bridgeApi';
import { useToast } from '../../../hooks/useToast';
import { useSmartBack } from '../../../hooks/useSmartBack';
import { DatePickerElegante } from '../../../components/ui/DatePickerElegante';
import { ElegantSelect } from '../../../components/ui/ElegantSelect';
import { DEFAULT_ETHNICITY, ETHNICITY_OPTIONS } from '../../../constants/ethnicityOptions';
import { useAutoCollapseSidebar, useSidebar } from '../../../contexts/SidebarContext';
import { useAuth } from '../../../context/AuthContext';
import { getToken } from '../../../services/auth';

// Hooks
import { useVisitaData, useVisitaTimer, useVisitaForm, useVisitaSidebar } from './hooks';

// Components - Session #12b: Using QuickActionsIntegrated with integrated menus
// Session #13: Added ExitVisitDialog for exit confirmation, ModulisticaModal
// Session #16: Added VisitaViewModal and RevisionDiffModal
// Session #17: Added AllegatiUploadModal for file uploads
// P61: Added QuestionariModal for medical questionnaires, QueueViewModal for queue management
import { StickyVisitHeader, VisitSidebar, FormSection, QuickActionsIntegrated, AccessControlCard, toVisitAccessControl, PrestazioniCard, ExitVisitDialog, ModulisticaModal, QuestionariModal, QueueViewModal, VoceTariffarioItem } from './components';
import { VisitaViewModal } from './components/VisitaViewModal';
import { RevisionDiffModal } from './components/RevisionDiffModal';
import FirmaVisitaCard from './components/FirmaVisitaCard';
import FirmaWarningDialog, { type FirmaWarningAction, type UnsignedDocSummary } from './components/FirmaWarningDialog';
import MedicoRefertanteCard from './components/MedicoRefertanteCard';
import { VisiteCollegateModal } from './components/VisiteCollegateModal';
import { PDFPreviewDialog } from '@/components/ui/PDFPreviewDialog';
import EsamiStrumentaliCard from '@/components/clinica/EsamiStrumentaliCard';
import VisitaScadenzaCard from './components/VisitaScadenzaCard';
import MDLInfoCard from './components/MDLInfoCard';
import GiudizioFormModal from '../mdl/components/GiudizioFormModal';
import { ProfiloSaluteCard } from '../../../components/clinica/ProfiloSaluteCard';
import type { AccessControlConfig, PrestazioneItem, VisitaRiepilogo, AllegatoRiepilogo, RevisioneRiepilogo, ExitVisitAction } from './components';

// Types
import type { SectionFields } from './types';

const prestazioneItemKey = (item: PrestazioneItem) =>
    item.appPrestazioneId || `${item.isQuestionario ? 'questionario' : 'prestazione'}:${item.id}`;

const mergePrestazioneItems = (current: PrestazioneItem[], incoming: PrestazioneItem[]) => {
    const byKey = new Map(current.map(item => [prestazioneItemKey(item), item]));
    incoming.forEach(item => {
        const key = prestazioneItemKey(item);
        byKey.set(key, { ...(byKey.get(key) || {}), ...item });
    });
    return Array.from(byKey.values());
};

const extractConvenzioneDiscount = (condizioni?: Record<string, unknown> | null) => {
    const scontoInfo = condizioni?.scontoInfo as { tipo?: string; valore?: number } | undefined;
    const percentuale = Number(
        condizioni?.scontoPercentuale
        ?? condizioni?.percentualeSconto
        ?? (scontoInfo?.tipo === 'PERCENTUALE' ? scontoInfo.valore : 0)
        ?? 0
    );
    const fisso = Number(
        condizioni?.scontoFisso
        ?? (scontoInfo?.tipo === 'VALORE_ASSOLUTO' ? scontoInfo.valore : 0)
        ?? 0
    );
    return {
        scontoPercentuale: Number.isFinite(percentuale) && percentuale > 0 ? percentuale : undefined,
        scontoFisso: Number.isFinite(fisso) && fisso > 0 ? fisso : undefined,
    };
};

// ============================================
// MAIN COMPONENT
// ============================================

export const VisitaPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const goBack = useSmartBack('/poliambulatorio/visite');
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const { hasPermission, user } = useAuth();
    const isEmbeddedVisit = useMemo(() => new URLSearchParams(location.search).get('embedded') === '1', [location.search]);

    // Permission checks for granular PrestazioniCard features
    const canViewPrices = hasPermission('clinica.visite', 'view_prices');
    const canManageConvenzioni = hasPermission('clinica.visite', 'manage_convenzioni');
    const canChangeRefertante = hasPermission('clinica.visite', 'change_refertante');

    // Auto-collapse main sidebar when entering visit page; expose expand() for completion
    useAutoCollapseSidebar();
    const { setCollapsed: setMainSidebarCollapsed } = useSidebar();

    // ============================================
    // DATA LOADING
    // ============================================
    const { context, refetch } = useVisitaData();
    const {
        visitaId,
        appuntamentoId,
        isNew,
        visita,
        appuntamento,
        paziente,
        prestazione,
        template,
        isLoading,
        isLoadingTemplate,
        error
    } = context;

    // ============================================
    // TIMER (auto-start for visits in progress)
    // ============================================
    const {
        timer,
        startTimer,
        pauseTimer,
        stopTimer,
        formatElapsed
    } = useVisitaTimer(visitaId, {
        autoStart: true,
        visitaStato: visita?.stato,
        initialDuration: visita?.durataEffettiva ?? undefined
    });

    // Keep a ref of elapsed seconds for save payloads (avoids re-renders)
    const timerElapsedSecondsRef = useRef(0);
    useEffect(() => {
        timerElapsedSecondsRef.current = timer.elapsedSeconds;
    }, [timer.elapsedSeconds]);



    // ============================================
    // INLINE PANELS DATA (storico paziente)
    // ============================================
    const { data: storicoData, isLoading: isLoadingStorico } = useQuery({
        queryKey: ['paziente-storico', paziente?.id],
        queryFn: () => pazientiApi.getStorico(paziente!.id),
        enabled: !!paziente?.id
    });

    // ============================================
    // SORVEGLIANZA SANITARIA (MDL) — protocollo per mansione
    // Fetch patient's mansioni and their sanitario protocol when visit is MDL.
    // Used to pre-fill prossimoControllo and accertamenti note in VisitaScadenzaCard.
    // ============================================
    const isMDLVisit = !!(appuntamento?.tipoVisitaMDL || visita?.tipoVisitaMDL);

    const { data: workerRisksData } = useQuery({
        queryKey: ['worker-risks', paziente?.id],
        queryFn: () => mansioniApi.getWorkerRisks(paziente!.id),
        enabled: isMDLVisit && !!paziente?.id,
        staleTime: 5 * 60 * 1000,
    });
    // getWorkerRisks uses extractData -> workerRisksData is already { rischi, mansioni }.
    // Prefer the occupational snapshot/current assignment so protocol scheduling follows
    // the employee's actual active mansione, not every mansione linked to the protocol.
    const primaryMansioneId = (
        workerRisksData?.statoOccupazionale?.current?.mansioneId ||
        workerRisksData?.mansioni?.find((m: any) => m._isPrimaria)?.id ||
        workerRisksData?.mansioni?.[0]?.id ||
        null
    );
    const formatRischioLabel = (rischio: any) => {
        const labels: Record<string, string> = {
            RUM: 'Rumore',
            VIB_MB: 'Vibrazioni mano-braccio',
            VIB_WBV: 'Vibrazioni corpo intero',
            RAD_ION: 'Radiazioni ionizzanti',
            RAD_NIR: 'Radiazioni non ionizzanti',
            CEM: 'Campi elettromagnetici',
            MIC: 'Microclima',
            CHI: 'Chimico',
            CAN: 'Cancerogeni',
            AMI: 'Amianto',
            PIO: 'Piombo',
            BIO: 'Biologico',
            MMC: 'Movimentazione manuale carichi',
            MOV_RIP: 'Movimenti ripetitivi',
            POS: 'Posture incongrue',
            NOT: 'Lavoro notturno',
            VDT: 'Videoterminale',
            SLC: 'Stress lavoro-correlato',
            QUO: 'Lavoro in quota',
            SPA_CON: 'Spazi confinati',
            GUI_MEZ: 'Guida mezzi',
            CAR_ELE: 'Carrelli elevatori',
            ELE: 'Elettrico',
            INC: 'Incendio',
            ISO: 'Isolamento',
            IPE: 'Iperbarico',
            POL: 'Polveri',
            ALC: 'Alcol'
        };
        const code = rischio?.codiceRischio || rischio?.codice || rischio?.codice_rischio;
        const level = rischio?.livello || rischio?.livelloRischio;
        const base = rischio?.descrizione || rischio?.nome || rischio?.label || labels[code] || code;
        return [base, level ? `Liv. ${String(level).toLowerCase()}` : null].filter(Boolean).join(' - ');
    };

    const occupationalSummary = useMemo(() => {
        const current = workerRisksData?.statoOccupazionale?.current;
        if (!current) return null;
        const snapshot = current.snapshot || {};
        const mansione = current.mansione?.denominazione
            || snapshot?.mansioni?.find((m: { isPrimaria?: boolean }) => m.isPrimaria)?.denominazione
            || snapshot?.mansioni?.[0]?.denominazione
            || current.titolo
            || null;
        const mansioni = [
            ...(Array.isArray(snapshot?.mansioni) ? snapshot.mansioni.map((m: any) => m.denominazione || m.nome || m.label).filter(Boolean) : []),
            ...(Array.isArray(workerRisksData?.mansioni) ? workerRisksData.mansioni.map((m: any) => m.denominazione || m.nome || m.label).filter(Boolean) : []),
            current.mansione?.denominazione,
        ].filter(Boolean);
        return {
            mansione,
            mansioni: Array.from(new Set(mansioni)),
            azienda: current.companyTenantProfile?.company?.ragioneSociale || snapshot?.company?.ragioneSociale || null,
            sede: current.site?.siteName || snapshot?.site?.siteName || null,
            protocollo: current.protocolloSanitario?.denominazione || snapshot?.protocolloSanitario?.denominazione || null,
            reparto: (current as any).department || current.reparto || (snapshot as any)?.department || snapshot?.reparto || null,
            title: current.title || current.titolo || snapshot?.title || null,
            hiredDate: current.hiredDate || snapshot?.hiredDate || null,
            endDate: current.endDate || snapshot?.endDate || null,
            tipoContratto: current.tipoContratto || snapshot?.tipoContratto || null,
            tipoCollaboratore: current.tipoCollaboratore || snapshot?.tipoCollaboratore || null,
            rischi: Array.isArray(workerRisksData?.rischi)
                ? workerRisksData.rischi.map(formatRischioLabel).filter(Boolean)
                : [],
            periodo: [current.dataInizio || (current as any).startDate, current.dataFine || (current as any).endDate]
                .filter(Boolean)
                .map((d: string | Date) => new Date(d).toLocaleDateString('it-IT'))
                .join(' - ') || null,
            historyCount: Array.isArray(workerRisksData?.statoOccupazionale?.history)
                ? workerRisksData.statoOccupazionale.history.length
                : 0,
            rischiCount: Array.isArray(workerRisksData?.rischi)
                ? workerRisksData.rischi.length
                : 0,
        };
    }, [workerRisksData?.rischi, workerRisksData?.statoOccupazionale]);

    const { data: protocolliMansione } = useQuery({
        queryKey: ['protocolli-mansione', primaryMansioneId],
        queryFn: () => protocolliSanitariApi.getByMansione(primaryMansioneId!),
        enabled: isMDLVisit && !!primaryMansioneId,
        staleTime: 5 * 60 * 1000,
    });

    // Point 4: All ScadenzaPrestazioneProtocollo for patient — shown in VisitaScadenzaCard
    const { data: scadenzePersona } = useQuery<ScadenzaProtocolloGruppo[]>({
        queryKey: ['scadenze-persona', paziente?.id],
        queryFn: () => scadenzeMDLApi.getScadenzePersona(paziente!.id),
        enabled: isMDLVisit && !!paziente?.id,
        staleTime: 30_000,
    });

    // Auto-generate initial scadenze when piano is empty but mansioni exist
    const scadenzeAutoGenRef = useRef(false);
    const generaScadenzeMutation = useMutation({
        mutationFn: (personId: string) => scadenzeMDLApi.generaIniziali(personId),
        onSuccess: (data) => {
            if (data?.created && data.created > 0) {
                queryClient.invalidateQueries({ queryKey: ['scadenze-persona', paziente?.id] });
            }
        },
    });
    useEffect(() => {
        if (
            isMDLVisit &&
            paziente?.id &&
            workerRisksData?.mansioni?.length &&
            scadenzePersona !== undefined &&
            scadenzePersona?.length === 0 &&
            !scadenzeAutoGenRef.current &&
            !generaScadenzeMutation.isPending
        ) {
            scadenzeAutoGenRef.current = true;
            generaScadenzeMutation.mutate(paziente.id);
        }
    }, [isMDLVisit, paziente?.id, workerRisksData?.mansioni?.length, scadenzePersona]);

    // ============================================
    // MEDICO PRESTAZIONI ABILITATE (Session #12b)
    // Load medico details to get enabled prestazioni
    // ============================================
    const { data: medicoDetails } = useQuery({
        queryKey: ['medico-dettaglio', appuntamento?.medicoId],
        queryFn: async () => {
            const medici = await mediciApi.getAll({ pageSize: 500 });
            return medici.data.find(medico => medico.id === appuntamento!.medicoId) || null;
        },
        enabled: !!appuntamento?.medicoId,
        retry: 1
    });

    // ============================================
    // CONVENZIONI DISPONIBILI (Session #16)
    // Load available convenzioni for dropdown
    // ============================================
    const { data: convenzioniData } = useQuery({
        queryKey: ['convenzioni-disponibili'],
        queryFn: () => convenzioniApi.getAll({ limit: 100, isActive: true }),
        staleTime: 5 * 60 * 1000 // 5 minutes cache
    });

    // State for "Visualizza tutte le prestazioni" toggle
    const [showAllPrestazioni, setShowAllPrestazioni] = useState(false);

    // ============================================
    // FALLBACK: ALL TENANT PRESTAZIONI
    // Load all active prestazioni when medico has no ACTIVE abilitazioni configured
    // ============================================
    const medicoHasAbilitazioni = !!(medicoDetails?.abilitazioni?.filter(
        (ab: { attivo?: boolean; deletedAt?: string | null; prestazione?: { id?: string } }) =>
            ab.attivo !== false && !ab.deletedAt && ab.prestazione?.id
    )?.length);
    const { data: allPrestazioniData } = useQuery({
        queryKey: ['prestazioni-tutte-tenant'],
        queryFn: () => prestazioniApi.getAll({ limit: 500, isActive: true }),
        staleTime: 5 * 60 * 1000,
        enabled: !!appuntamento?.medicoId && (!medicoHasAbilitazioni || showAllPrestazioni)
    });

    // ============================================
    // MEDICI DISPONIBILI (for prestazione aggiuntiva refertante)
    // ============================================
    const { data: mediciData } = useQuery({
        queryKey: ['medici-disponibili'],
        queryFn: () => mediciApi.getAll({ limit: 200 }),
        staleTime: 5 * 60 * 1000
    });

    const mediciDisponibili = useMemo(() => {
        if (!mediciData?.data) return [];
        return mediciData.data.map((m: { id: string; firstName?: string; lastName?: string; gender?: string }) => ({
            id: m.id,
            firstName: m.firstName || '',
            lastName: m.lastName || '',
            gender: m.gender
        }));
    }, [mediciData?.data]);

    // State for current convenzione (from appuntamento or changed)
    const [selectedConvenzioneId, setSelectedConvenzioneId] = useState<string | null>(
        appuntamento?.convenzione?.id || null
    );



    // Update when appuntamento loads
    useEffect(() => {
        if (appuntamento?.convenzione?.id) {
            setSelectedConvenzioneId(appuntamento.convenzione.id);
        }
    }, [appuntamento?.convenzione?.id]);

    // Transform convenzioni to ConvenzioneItem array
    const convenzioniDisponibili = useMemo(() => {
        if (!convenzioniData?.data) return [];
        return convenzioniData.data.map((c: Convenzione) => {
            const discount = extractConvenzioneDiscount(c.condizioni as Record<string, unknown> | null);
            return {
                id: c.id,
                nome: c.nome,
                tipo: c.tipo || 'convenzione',
                codiceSconto: typeof (c.condizioni as any)?.codiceSconto === 'string' ? (c.condizioni as any).codiceSconto : undefined,
                ...discount,
            };
        });
    }, [convenzioniData?.data]);

    // Get current convenzione details
    const convenzioneAssociata = useMemo(() => {
        if (!selectedConvenzioneId) return null;

        // First check from appuntamento
        if (appuntamento?.convenzione?.id === selectedConvenzioneId) {
            const discount = extractConvenzioneDiscount(appuntamento.convenzione.condizioni as Record<string, unknown> | null);
            return {
                id: appuntamento.convenzione.id,
                nome: appuntamento.convenzione.nome,
                tipo: 'convenzione',
                codiceSconto: typeof (appuntamento.convenzione.condizioni as any)?.codiceSconto === 'string'
                    ? (appuntamento.convenzione.condizioni as any).codiceSconto
                    : undefined,
                ...discount,
            };
        }

        // Otherwise find from disponibili
        return convenzioniDisponibili.find(c => c.id === selectedConvenzioneId) || null;
    }, [selectedConvenzioneId, appuntamento?.convenzione, convenzioniDisponibili]);

    // Transform abilitazioni to PrestazioneItem array (with fallback to all tenant prestazioni)
    const prestazioniMedico = useMemo((): PrestazioneItem[] => {
        // "Visualizza tutte" toggle: show all tenant prestazioni
        if (showAllPrestazioni && allPrestazioniData?.data?.length) {
            return allPrestazioniData.data.map((p: { id: string; codice?: string; nome: string; tipo?: string; prezzoBase?: number | null; prezzoPrimaVisita?: number | null; prezzoControllo?: number | null; durata?: number | null }) => ({
                id: p.id,
                codice: p.codice || '',
                nome: p.nome || '',
                tipo: (p as any).tipo || undefined,
                prezzo: p.prezzoBase ? Number(p.prezzoBase) : undefined,
                prezzoPrimaVisita: p.prezzoPrimaVisita ? Number(p.prezzoPrimaVisita) : undefined,
                prezzoControllo: p.prezzoControllo ? Number(p.prezzoControllo) : undefined,
                durata: p.durata || undefined
            }));
        }

        // Primary source: medico active abilitazioni
        if (medicoHasAbilitazioni) {
            return (medicoDetails?.abilitazioni || [])
                .filter((ab: { attivo?: boolean; deletedAt?: string | null }) => ab.attivo !== false && !ab.deletedAt)
                .map((ab: { prestazione?: { id: string; codice?: string; nome: string; tipo?: string; prezzoBase?: number | null; prezzoPrimaVisita?: number | null; prezzoControllo?: number | null; durata?: number | null } }) => ({
                    id: ab.prestazione?.id || '',
                    codice: ab.prestazione?.codice || '',
                    nome: ab.prestazione?.nome || '',
                    tipo: (ab.prestazione as any)?.tipo || undefined,
                    prezzo: ab.prestazione?.prezzoBase ? Number(ab.prestazione.prezzoBase) : undefined,
                    prezzoPrimaVisita: ab.prestazione?.prezzoPrimaVisita ? Number(ab.prestazione.prezzoPrimaVisita) : undefined,
                    prezzoControllo: ab.prestazione?.prezzoControllo ? Number(ab.prestazione.prezzoControllo) : undefined,
                    durata: ab.prestazione?.durata || undefined
                }))
                .filter((p: PrestazioneItem) => p.id);
        }

        // Fallback: all tenant prestazioni (when medico has no active abilitazioni)
        if (allPrestazioniData?.data?.length) {
            return allPrestazioniData.data.map((p: { id: string; codice?: string; nome: string; tipo?: string; prezzoBase?: number | null; prezzoPrimaVisita?: number | null; prezzoControllo?: number | null; durata?: number | null }) => ({
                id: p.id,
                codice: p.codice || '',
                nome: p.nome || '',
                tipo: (p as any).tipo || undefined,
                prezzo: p.prezzoBase ? Number(p.prezzoBase) : undefined,
                prezzoPrimaVisita: p.prezzoPrimaVisita ? Number(p.prezzoPrimaVisita) : undefined,
                prezzoControllo: p.prezzoControllo ? Number(p.prezzoControllo) : undefined,
                durata: p.durata || undefined
            }));
        }

        return [];
    }, [medicoHasAbilitazioni, medicoDetails?.abilitazioni, allPrestazioniData?.data, showAllPrestazioni]);

    // MDL Tariffario filter: limit available prestazioni to those in the company tariffario
    // to prevent billing non-agreed services. Only applies when:
    //   - visit is MDL (isMDLVisit)
    //   - tariffario voci are loaded (_vociTariffario is non-empty)
    //   - "Visualizza tutte" toggle is OFF (showAllPrestazioni=false)
    const prestazioniPerMDL = useMemo((): typeof prestazioniMedico => {
        const voci = (appuntamento as any)?._vociTariffario as Array<{
            prestazioneId: string;
            prezzoBase: number | string;
            categoriaVisita: string | null;
        }> | undefined;
        const tipoVisitaAttuale = visita?.tipoVisitaMDL || appuntamento?.tipoVisitaMDL || null;

        // Only filter when MDL + tariffario available + "show all" toggle is OFF
        if (!isMDLVisit || !voci?.length || showAllPrestazioni) {
            return prestazioniMedico;
        }

        const tariffarioIds = new Set(voci.map(v => v.prestazioneId).filter(Boolean));
        const filtered = prestazioniMedico.filter(p => p.id && tariffarioIds.has(p.id));

        // Enrich with tariffario prices and deduplicate by id
        // (tariffario may have multiple categoriaVisita voci for same prestazioneId)
        const seen = new Set<string>();
        return filtered
            .map(p => {
                const voce = (p.id === (appuntamento?.prestazioneId || visita?.prestazioneId) && tipoVisitaAttuale
                    ? voci.find(v => v.prestazioneId === p.id && v.categoriaVisita === tipoVisitaAttuale)
                    : null)
                    ?? voci.find(v => v.prestazioneId === p.id && !v.categoriaVisita)
                    ?? voci.find(v => v.prestazioneId === p.id);
                return voce ? { ...p, prezzo: Number(voce.prezzoBase) || p.prezzo } : p;
            })
            .filter(p => {
                if (seen.has(p.id)) return false;
                seen.add(p.id);
                return true;
            });
    }, [isMDLVisit, appuntamento, visita?.prestazioneId, visita?.tipoVisitaMDL, prestazioniMedico, showAllPrestazioni]);

    // Transform storico data for inline panels
    const storicoVisite = useMemo((): VisitaRiepilogo[] => {
        if (!storicoData?.visite) return [];
        // Exclude current visit
        return storicoData.visite
            .filter(v => v.id !== visitaId)
            .map(v => ({
                id: v.id,
                dataOra: v.dataOra || '',
                prestazione: v.prestazione ? { nome: v.prestazione.nome } : undefined,
                medico: v.medico ? { firstName: v.medico.firstName || '', lastName: v.medico.lastName || '' } : undefined,
                stato: v.stato,
                isVisitaSecundaria: (v as any).isVisitaSecundaria,
                visitaParentId: (v as any).visitaParentId || null
            }));
    }, [storicoData?.visite, visitaId]);

    // Allegati - load from documenti clinici API (Session #12b → S72 real implementation)
    const { data: allegatiData, isLoading: isLoadingAllegati } = useQuery({
        queryKey: ['allegati-visita', visitaId],
        queryFn: () => documentiCliniciApi.getAllegatiVisita(visitaId!),
        enabled: !!visitaId && !isNew,
        retry: (failureCount, error: any) => {
            if (error?.response?.status === 404) return false;
            return failureCount < 2;
        }
    });

    const allegati = useMemo((): AllegatoRiepilogo[] => {
        if (!allegatiData || !Array.isArray(allegatiData)) return [];
        return allegatiData.map(a => ({
            id: a.id,
            nome: a.nome,
            tipo: a.mimeType?.startsWith('image/') ? 'immagine' as const : 'documento' as const,
            dataCaricamento: a.createdAt,
            dimensione: a.fileSize ? `${(a.fileSize / 1024).toFixed(1)} KB` : undefined,
            url: `/api/v1/clinica/documenti/visita/download/${a.id}`,
            fromLinkedVisit: a.fromLinkedVisit ?? false // P73: allegato da visita collegata
        }));
    }, [allegatiData]);

    // Revisioni - from visita.revisions
    const revisioni = useMemo((): RevisioneRiepilogo[] => {
        if (!visita?.revisions || !Array.isArray(visita.revisions)) return [];
        return visita.revisions.map((rev, index) => ({
            id: rev.id || `rev-${index}`,
            numeroRevisione: rev.revisionNumber || index + 1,
            dataCreazione: rev.changedAt || '',
            motivo: rev.changeReason || undefined,
            createdBy: rev.changer ? {
                firstName: rev.changer.firstName || '',
                lastName: rev.changer.lastName || ''
            } : undefined
        }));
    }, [visita?.revisions]);

    // Extended revisioni with previousData/newData for diff modal (Session #16)
    const revisioniEstese = useMemo(() => {
        if (!visita?.revisions || !Array.isArray(visita.revisions)) return [];
        return visita.revisions.map((rev, index) => ({
            id: rev.id || `rev-${index}`,
            numeroRevisione: rev.version || rev.revisionNumber || index + 1,
            dataCreazione: rev.createdAt || rev.changedAt || '',
            motivo: rev.motivo || rev.changeReason || undefined,
            previousData: rev.previousData as Record<string, unknown> | undefined,
            newData: rev.newData as Record<string, unknown> | undefined,
            changeType: rev.changeType,
            changedFields: rev.changedFields,
            createdBy: rev.createdBy || rev.changer ? {
                firstName: (rev.createdBy || rev.changer)?.firstName || '',
                lastName: (rev.createdBy || rev.changer)?.lastName || ''
            } : undefined
        }));
    }, [visita?.revisions]);

    // ============================================
    // P61: QUESTIONARI COMPILATI PER VISITA
    // ============================================
    const { data: questionariCompilati = [] } = useQuery({
        queryKey: ['questionari-visita', visitaId],
        queryFn: () => questionariService.getQuestionariVisita(visitaId!),
        enabled: !!visitaId
    });

    const questionariCount = questionariCompilati?.length || 0;

    // Map to riepilogo format for QuickActions inline display
    const questionariRiepilogo = useMemo(() => {
        return (questionariCompilati || []).map(q => ({
            id: q.id,
            templateNome: q.documentoTemplate?.nome || q.template?.nome || 'Documento',
            tipo: q.documentoTemplate?.tipo || q.template?.tipo,
            stato: q.stato,
            dataCompilazione: q.dataCompilazione || q.createdAt,
            esitoCritico: q.esitoCritico,
            punteggioPercentuale: q.punteggioPercentuale,
            richiedeFirma: q.documentoTemplate?.richiedeFirma || q.template?.richiedeFirma,
            richiedeFirmaMedico: q.documentoTemplate?.richiedeFirmaMedico || q.template?.richiedeFirmaMedico,
            // S68: Pass firma status and PDF info
            firmaPaziente: q.firmaPaziente,
            firmaMedico: q.firmaMedico,
            pdfUrl: q.pdfUrl
        }));
    }, [questionariCompilati]);

    // P62: Applica firme batch ai questionari selezionati
    const applicaFirmeMutation = useMutation({
        mutationFn: async ({ compilatoIds, tipoFirma }: { compilatoIds: string[]; tipoFirma: 'paziente' | 'medico' }) => {
            // Recupera la firma salvata per il tipo richiesto
            // Per il medico: usa l'ID dell'utente loggato (chi sta firmando), NON visita.medicoId
            const personId = tipoFirma === 'medico' ? user?.id : paziente?.id;
            if (!personId) throw new Error(`ID ${tipoFirma} non disponibile`);

            const savedSignature = await apiGet<{ imageUrl?: string; firmaId?: string }>(`/api/v1/signatures/saved/${personId}`);
            const firma = savedSignature?.imageUrl;
            if (!firma) throw new Error(`Nessuna firma salvata per ${tipoFirma}. Acquisire prima la firma nella sezione "Firma Digitale".`);

            // Applica la firma a ciascun compilato
            const results = await Promise.allSettled(
                compilatoIds.map(id =>
                    tipoFirma === 'medico'
                        ? questionariService.firmaMedico(id, firma)
                        : questionariService.firmaPaziente(id, firma)
                )
            );

            // S71: Treat 409 (already signed) as success, only count real failures
            const realFailures = results.filter(r => {
                if (r.status === 'rejected') {
                    const err = r.reason as any;
                    // 409 = already signed — not a real failure
                    if (err?.status === 409 || err?.response?.status === 409) return false;
                    return true;
                }
                return false;
            });
            const alreadySigned = results.filter(r =>
                r.status === 'rejected' &&
                ((r.reason as any)?.status === 409 || (r.reason as any)?.response?.status === 409)
            ).length;

            if (realFailures.length > 0) {
                const firstError = (realFailures[0] as PromiseRejectedResult).reason;
                throw new Error(firstError?.message || `${realFailures.length} di ${compilatoIds.length} firme non applicate`);
            }

            // S71: Auto-generate PDF for compilati that reached COMPLETATO
            const completatoIds: string[] = [];
            for (const r of results) {
                if (r.status === 'fulfilled') {
                    const compilato = r.value;
                    if (compilato?.stato === 'COMPLETATO') {
                        completatoIds.push(compilato.id);
                    }
                }
            }
            // Fire-and-forget PDF generation for completed docs
            if (completatoIds.length > 0) {
                Promise.allSettled(
                    completatoIds.map(id => questionariService.generateCompilatoPdf(id))
                ).then((pdfResults) => {
                    const pdfOk = pdfResults.filter(r => r.status === 'fulfilled').length;
                    if (pdfOk > 0) {
                        // Re-invalidate to pick up pdfUrl
                        queryClient.invalidateQueries({ queryKey: ['questionari-visita', visitaId] });
                        queryClient.invalidateQueries({ queryKey: ['documenti-da-compilare'] });
                    }
                });
            }

            return { results, alreadySigned };
        },
        onSuccess: (data, { compilatoIds, tipoFirma }) => {
            const applied = compilatoIds.length - (data.alreadySigned || 0);
            const message = data.alreadySigned > 0
                ? `Firma ${tipoFirma} applicata a ${applied} questionari (${data.alreadySigned} già firmati)`
                : `Firma ${tipoFirma} applicata a ${compilatoIds.length} questionari`;
            showToast({
                type: 'success',
                title: 'Firme applicate',
                message,
            });
            queryClient.invalidateQueries({ queryKey: ['questionari-visita', visitaId] });
            // S71: Also invalidate modulistica queries for stale state fix
            queryClient.invalidateQueries({ queryKey: ['documenti-da-compilare'] });
            queryClient.invalidateQueries({ queryKey: ['documento-compilato'] });
        },
        onError: (error: Error) => {
            // Distingui "firma mancante" (warning: azione necessaria) da errori tecnici (error)
            const isNoSignature = error.message?.startsWith('Nessuna firma salvata');
            showToast({
                type: isNoSignature ? 'warning' : 'error',
                title: isNoSignature ? 'Firma mancante' : 'Errore firma',
                message: isNoSignature
                    ? 'Nessuna firma salvata. Usare il pulsante "Acquisisci firma" nella card "Firma" sulla sinistra.'
                    : 'Errore nell\'applicazione delle firme',
            });
            // S71: Still invalidate to sync state even on error
            queryClient.invalidateQueries({ queryKey: ['questionari-visita', visitaId] });
        },
    });

    const handleApplicaFirme = useCallback((compilatoIds: string[], tipoFirma: 'paziente' | 'medico') => {
        if (compilatoIds.length === 0) return;
        applicaFirmeMutation.mutate({ compilatoIds, tipoFirma });
    }, [applicaFirmeMutation]);

    // ============================================
    // ACCESS CONTROL REF (used by useVisitaForm for saving)
    // ============================================
    const accessControlRef = useRef<VisitAccessControl | null>(null);

    // ============================================
    // FORM
    // ============================================
    const {
        values,
        validation,
        autosave,
        isReadonly,
        completionPhase,
        handleFieldChange,
        handleSave,
        handleComplete,
        handleNuovaVersione,
        handleAnnullaModifiche,
        resetForm,
        // P65.7: Follow-up / scadenza
        prossimoControllo,
        noteFollowup,
        setProssimoControllo,
        setNoteFollowup
    } = useVisitaForm(visitaId, template, visita, isNew, accessControlRef, timerElapsedSecondsRef);

    // ============================================
    // S68: FIRMA WARNING DIALOG — check unsigned docs before completing
    // ============================================
    const [isFirmaWarningOpen, setIsFirmaWarningOpen] = useState(false);
    const [firmaWarningSummary, setFirmaWarningSummary] = useState<UnsignedDocSummary>({
        missingPaziente: 0,
        missingMedico: 0,
        idsMissingPaziente: [],
        idsMissingMedico: [],
        hasSavedFirmaPaziente: false,
        hasSavedFirmaMedico: false
    });
    const [isFirmaWarningLoading, setIsFirmaWarningLoading] = useState(false);

    // S68: PDF preview state
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [pdfPreviewTitle, setPdfPreviewTitle] = useState('Documento');
    const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);

    const handleViewPdf = useCallback(async (compilatoId: string, pdfUrl?: string) => {
        if (pdfUrl) {
            // Open existing PDF
            const doc = questionariCompilati?.find(q => q.id === compilatoId);
            setPdfPreviewTitle(doc?.documentoTemplate?.nome || 'Documento');
            setPdfPreviewUrl(pdfUrl);
            setIsPdfPreviewOpen(true);
            return;
        }

        // S71: No PDF yet — try to generate on-demand
        const doc = questionariCompilati?.find(q => q.id === compilatoId);
        const isSignedOrComplete = doc?.stato === 'COMPLETATO' || doc?.firmaPaziente || doc?.firmaMedico;
        if (!isSignedOrComplete) {
            showToast({ message: 'PDF non ancora generato per questo documento', type: 'warning' });
            return;
        }

        showToast({ message: 'Generazione PDF in corso...', type: 'info' });
        try {
            const result = await questionariService.generateCompilatoPdf(compilatoId);
            if (result?.pdfUrl) {
                setPdfPreviewTitle(doc?.documentoTemplate?.nome || 'Documento');
                setPdfPreviewUrl(result.pdfUrl);
                setIsPdfPreviewOpen(true);
                // Invalidate to update pdfUrl in the list
                queryClient.invalidateQueries({ queryKey: ['questionari-visita', visitaId] });
                queryClient.invalidateQueries({ queryKey: ['documenti-da-compilare'] });
            }
        } catch {
            showToast({ message: 'Errore nella generazione del PDF', type: 'error' });
        }
    }, [questionariCompilati, showToast, queryClient, visitaId]);

    // P72_15 Task 7: "Non programmare" — IDs prestazioni (aggiunte + facoltative) da escludere dal piano
    // NOTA: dichiarato qui (prima di completeAndScheduleMDL) per evitare TDZ nella dependency array
    const [prestazioniNonProgrammare, setPrestazioniNonProgrammare] = useState<string[]>([]);

    useEffect(() => {
        if (visita?.datiStrutturati && typeof visita.datiStrutturati === 'object') {
            const dati = visita.datiStrutturati as { _prestazioniNonProgrammare?: string[] };
            setPrestazioniNonProgrammare(dati._prestazioniNonProgrammare ?? []);
        }
    }, [visita?.datiStrutturati]);

    const handleNonProgrammareChange = useCallback((ids: string[]) => {
        setPrestazioniNonProgrammare(ids);
        handleFieldChange('_prestazioniNonProgrammare', ids);
    }, [handleFieldChange]);

    // P72_18: date override manuali del piano sorveglianza (prestazioneId → ISO date)
    const [pianoDateOverrides, setPianoDateOverrides] = useState<Record<string, string>>({});

    // Restore pianoDateOverrides from datiStrutturati on mount
    useEffect(() => {
        if (visita?.datiStrutturati && typeof visita.datiStrutturati === 'object') {
            const dati = visita.datiStrutturati as { _pianoDateOverrides?: Record<string, string> };
            if (dati._pianoDateOverrides && Object.keys(dati._pianoDateOverrides).length > 0) {
                setPianoDateOverrides(dati._pianoDateOverrides);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visita?.id]); // Solo su cambio visita, non ad ogni aggiornamento

    const handlePianoDateOverridesChange = useCallback((dates: Record<string, string>) => {
        setPianoDateOverrides(dates);
        // Persisti in datiStrutturati per sopravvivere alla navigazione
        handleFieldChange('_pianoDateOverrides', dates);
    }, [handleFieldChange]);

    // P72_21 FIX: Dichiarato qui (prima di completeAndScheduleMDL) per evitare TDZ nella dependency array.
    // L'inizializzazione avviene nel useEffect dedicato più in basso.
    const [prestazioniAggiuntive, setPrestazioniAggiuntive] = useState<PrestazioneItem[]>([]);
    const prestazioniNonEseguite = useMemo(() => {
        return prestazioniAggiuntive.filter(p => {
            if (p.isPrimary || p.isQuestionario) return false;
            if (p.esecuzioneStatus === 'NON_ESEGUITA' || p.statoAppPrestazione === 'ANNULLATA') return true;
            if (p.esecuzioneStatus === 'ESEGUITA' || p.esecuzioneStatus === 'IN_ATTESA_REFERTO') return false;
            const stato = p.statoAppPrestazione || '';
            return !stato || ['DA_ESEGUIRE', 'IN_CORSO'].includes(stato);
        });
    }, [prestazioniAggiuntive]);
    const [isNonEseguiteWarningOpen, setIsNonEseguiteWarningOpen] = useState(false);
    const bypassNonEseguiteWarningRef = useRef(false);

    // FLAG: segnala che questa sessione ha appena completato la visita → useEffect espande la sidebar
    // Dichiarato prima di completeAndScheduleMDL per evitare TDZ nella closure.
    const [visitaCompletataThisSession, setVisitaCompletataThisSession] = useState(false);
    // Giudizio idoneità modal — aperto automaticamente al completamento di una visita MDL
    const [isGiudizioModalOpen, setIsGiudizioModalOpen] = useState(false);
    // Existing giudizio for modal edit mode (nuova versione: update instead of create)
    const [existingGiudizioForModal, setExistingGiudizioForModal] = useState<GiudizioIdoneita | null>(null);
    const mdlVisitTypeForScheduling = visita?.tipoVisitaMDL || appuntamento?.tipoVisitaMDL || null;
    const shouldAdvanceMDLPlan = !!mdlVisitTypeForScheduling && ['PERIODICA', 'PREVENTIVA', 'PREVENTIVA_PREASSUNTIVA'].includes(String(mdlVisitTypeForScheduling));

    /**
     * Helper: chiama handleComplete e poi, se è una visita MDL, schedula le prossime scadenze.
     * Usato internamente da handleCompleteWithFirmaCheck e handleFirmaWarningAction.
     */
    const completeAndScheduleMDL = useCallback(async () => {
        await handleComplete();

        // Forza il refetch della visita per aggiornare lo stato a COMPLETATA nel UI
        // (invalidateQueries in onSuccess del mutation è asincrono e potrebbe non essere ancora completato)
        await queryClient.refetchQueries({ queryKey: ['visita', visitaId] });

        // MDL scheduling: marca scadenze come eseguite e crea le successive
        if (isMDLVisit && shouldAdvanceMDLPlan && !isNew && visitaId && primaryMansioneId && paziente?.id) {
            try {
                await scadenzeMDLApi.programmaPrestazioni({
                    personId: paziente.id,
                    mansioneId: primaryMansioneId,
                    visitaId,
                    dataVisita: prossimoControllo || appuntamento?.dataOra || new Date().toISOString(),
                    excludePrestazioniIds: prestazioniNonProgrammare.length > 0 ? prestazioniNonProgrammare : undefined,
                    dateOverrides: Object.keys(pianoDateOverrides).length > 0 ? pianoDateOverrides : undefined,
                    // P72_20: passa le prestazioni aggiuntive per creare ScadenzaPrestazioneProtocollo
                    // P72_22: escludi isQuestionario (compilatoId ≠ prestazioneId, gestiti separatamente)
                    prestazioniAggiuntive: prestazioniAggiuntive
                        .filter(p => p.id && /^[0-9a-f]{8}-/i.test(p.id) && !p.isQuestionario)
                        .map(p => ({ id: p.id, periodicitaMesi: (p as any).periodicitaMesi ?? 0 })),
                    // P72_23: questionari periodici — crea ScadenzaPrestazioneProtocollo con documentoTemplateId
                    questionariAggiuntivi: prestazioniAggiuntive
                        .filter(p => p.isQuestionario && p.documentoTemplateId && (p.periodicitaMesi ?? 0) > 0)
                        .map(p => ({ documentoTemplateId: p.documentoTemplateId!, periodicitaMesi: p.periodicitaMesi ?? 0 }))
                });
            } catch (err) {
                // Non bloccare il flusso ma avvisa l'utente
                if (import.meta.env.DEV) {
                    console.error('Errore schedulazione scadenze MDL:', err);
                }
                showToast({ message: 'Attenzione: la programmazione delle prossime scadenze non è riuscita. Riprovare dalla scheda sorveglianza.', type: 'warning' });
            }
        }

        // Segnala che la visita è stata completata in questa sessione (usato per espandere la sidebar nelle visite secondarie)
        setVisitaCompletataThisSession(true);
        // Giudizio idoneità per visita MDL completata:
        // 1. Se esiste già un giudizio per questa visita → aggiorna automaticamente (NO modal)
        // 2. Se non esiste e il campo è compilato → crea automaticamente (NO modal)
        // 3. Se non esiste e il campo è vuoto → apri modal per compilazione manuale
        if (isMDLVisit && paziente?.id && visitaId) {
            const giudizioFieldValue = values?.giudizioIdoneitaMdl;

            // SEMPRE: cerca un giudizio esistente per questa visita (indipendentemente da nuova versione)
            let existingGiudizio: GiudizioIdoneita | null = null;
            try {
                const giudiziResult = await giudiziIdoneitaApi.getAll({ personId: paziente.id, limit: 100 } as Parameters<typeof giudiziIdoneitaApi.getAll>[0]);
                const giudizi = (giudiziResult as any)?.data ?? giudiziResult ?? [];
                existingGiudizio = Array.isArray(giudizi)
                    ? giudizi.find((g: GiudizioIdoneita) => g.visitaId === visitaId) ?? null
                    : null;
            } catch { /* non bloccare il flusso */ }

            const GIUDIZIO_MAP: Record<string, string> = {
                'idoneo': 'IDONEO',
                'idoneo_prescrizioni': 'IDONEO_CON_PRESCRIZIONI',
                'idoneo_limitazioni': 'IDONEO_CON_LIMITAZIONI',
                'idoneo_limitazioni_prescrizioni': 'IDONEO_CON_LIMITAZIONI_PRESCRIZIONI',
                'temporaneamente_non_idoneo': 'NON_IDONEO_TEMPORANEO',
                'non_idoneo': 'NON_IDONEO_PERMANENTE',
            };
            const prescrizioniGiudizio = Array.isArray(values?.prescrizioniNormativaMdl)
                ? values.prescrizioniNormativaMdl.join('\n')
                : values?.prescrizioniNormativaMdl ? String(values.prescrizioniNormativaMdl) : undefined;
            const limitazioniGiudizio = Array.isArray(values?.limitazioniMansioneMdl)
                ? values.limitazioniMansioneMdl.join('\n')
                : values?.limitazioniMansioneMdl ? String(values.limitazioniMansioneMdl) : undefined;
            const tempisticaGiudizio = values?.tempisticaGiudizioIdoneitaMdl ? String(values.tempisticaGiudizioIdoneitaMdl) : undefined;

            if (existingGiudizio?.id) {
                // Giudizio già esistente → aggiorna automaticamente senza aprire il modal
                const tipoGiudizio = giudizioFieldValue
                    ? (GIUDIZIO_MAP[String(giudizioFieldValue)] || existingGiudizio.tipoGiudizio)
                    : existingGiudizio.tipoGiudizio;
                try {
                    await giudiziIdoneitaApi.update(existingGiudizio.id, {
                        tipoGiudizio,
                        prescrizioniIdoneita: prescrizioniGiudizio,
                        limitazioni: limitazioniGiudizio,
                        motivazioni: tempisticaGiudizio,
                        dataScadenza: prossimoControllo ? new Date(prossimoControllo).toISOString() : undefined,
                        stato: 'VALIDO',
                    } as Partial<GiudizioIdoneita>);
                    await giudiziIdoneitaApi.generateDocuments(existingGiudizio.id);
                    if (existingGiudizio.dataNotificaLavoratore || existingGiudizio.dataNotificaDatoreLavoro) {
                        showToast({ type: 'warning', message: 'Giudizio già inviato: verifica se reinviarlo a lavoratore e azienda.' });
                    }
                    showToast({ type: 'success', message: 'Giudizio di idoneità aggiornato automaticamente (Art. 41 c.7)' });
                } catch {
                    showToast({ type: 'warning', message: 'Attenzione: giudizio di idoneità non aggiornato. Aggiornalo manualmente.' });
                }
            } else if (!giudizioFieldValue || String(giudizioFieldValue).trim() === '') {
                // Nessun giudizio esistente + campo vuoto → apri modal per compilazione manuale
                setIsGiudizioModalOpen(true);
            } else {
                // Nessun giudizio esistente + campo compilato → crea automaticamente
                const tipoGiudizio = GIUDIZIO_MAP[String(giudizioFieldValue)] || 'IDONEO';
                try {
                    const giudizio = await giudiziIdoneitaApi.create({
                        personId: paziente.id,
                        medicoCompetenteId: visita?.medicoId ?? undefined,
                        tipoGiudizio,
                        visitaId,
                        mansioneIds: workerRisksData?.mansioni?.map((m: { id: string }) => m.id) ?? [],
                        prescrizioniIdoneita: prescrizioniGiudizio,
                        limitazioni: limitazioniGiudizio,
                        motivazioni: tempisticaGiudizio,
                        dataScadenza: prossimoControllo ? new Date(prossimoControllo).toISOString() : undefined,
                    } as Parameters<typeof giudiziIdoneitaApi.create>[0]);
                    if (giudizio?.id) {
                        await giudiziIdoneitaApi.generateDocuments(giudizio.id);
                        showToast({ type: 'success', message: 'Giudizio di idoneità generato automaticamente (Art. 41 c.7)' });
                    }
                } catch {
                    showToast({ type: 'warning', message: 'Attenzione: giudizio di idoneità non generato automaticamente. Crealo manualmente.' });
                }
            }
        }
    }, [handleComplete, queryClient, isMDLVisit, shouldAdvanceMDLPlan, isNew, visitaId, primaryMansioneId, paziente?.id, prossimoControllo, appuntamento?.dataOra, prestazioniNonProgrammare, pianoDateOverrides, prestazioniAggiuntive, values, visita?.medicoId, showToast]);

    const handleCompleteWithFirmaCheck = useCallback(async () => {
        if (prestazioniNonEseguite.length > 0 && !bypassNonEseguiteWarningRef.current) {
            setIsNonEseguiteWarningOpen(true);
            return;
        }
        bypassNonEseguiteWarningRef.current = false;

        if (!questionariCompilati || questionariCompilati.length === 0) {
            // No compilati — proceed directly
            await completeAndScheduleMDL();
            return;
        }

        // Analyze unsigned docs
        const missingPazienteIds: string[] = [];
        const missingMedicoIds: string[] = [];

        for (const q of questionariCompilati) {
            const tpl = q.documentoTemplate || q.template;
            const richiedeFirma = tpl?.richiedeFirma;
            const richiedeFirmaMedico = tpl?.richiedeFirmaMedico;

            // Missing patient signature: template requires it AND document doesn't have it
            if (richiedeFirma && !q.firmaPaziente && !['COMPLETATO', 'ANNULLATO', 'SCADUTO'].includes(q.stato)) {
                missingPazienteIds.push(q.id);
            }
            // Missing medico signature: template requires it AND document doesn't have it
            if (richiedeFirmaMedico && !q.firmaMedico && !['COMPLETATO', 'ANNULLATO', 'SCADUTO'].includes(q.stato)) {
                missingMedicoIds.push(q.id);
            }
        }

        if (missingPazienteIds.length === 0 && missingMedicoIds.length === 0) {
            // All signed — proceed directly
            await completeAndScheduleMDL();
            return;
        }

        // Check if saved signatures exist
        let hasSavedPaz = false;
        let hasSavedMed = false;
        try {
            if (paziente?.id) {
                const savedPaz = await apiGet<{ imageUrl?: string }>(`/api/v1/signatures/saved/${paziente.id}`);
                hasSavedPaz = !!savedPaz?.imageUrl;
            }
        } catch { /* no saved signature */ }
        try {
            // Usa l'ID dell'utente loggato per il medico
            const medicoPersonId = user?.id;
            if (medicoPersonId) {
                const savedMed = await apiGet<{ imageUrl?: string }>(`/api/v1/signatures/saved/${medicoPersonId}`);
                hasSavedMed = !!savedMed?.imageUrl;
            }
        } catch { /* no saved signature */ }

        setFirmaWarningSummary({
            missingPaziente: missingPazienteIds.length,
            missingMedico: missingMedicoIds.length,
            idsMissingPaziente: missingPazienteIds,
            idsMissingMedico: missingMedicoIds,
            hasSavedFirmaPaziente: hasSavedPaz,
            hasSavedFirmaMedico: hasSavedMed
        });
        setIsFirmaWarningOpen(true);
    }, [prestazioniNonEseguite.length, questionariCompilati, completeAndScheduleMDL, paziente?.id, user?.id]);

    /**
     * Handle firma warning dialog action
     */
    const handleFirmaWarningAction = useCallback(async (action: FirmaWarningAction) => {
        if (action === 'cancel') {
            setIsFirmaWarningOpen(false);
            return;
        }

        setIsFirmaWarningLoading(true);

        try {
            if (action === 'continue-without') {
                setIsFirmaWarningOpen(false);
                await completeAndScheduleMDL();
                return;
            }

            // Apply requested signatures
            const applyFirme = async (ids: string[], tipo: 'paziente' | 'medico') => {
                // Per il medico: usa l'ID dell'utente loggato
                const personId = tipo === 'medico' ? user?.id : paziente?.id;
                if (!personId || ids.length === 0) return;

                const saved = await apiGet<{ imageUrl?: string }>(`/api/v1/signatures/saved/${personId}`);
                const firma = saved?.imageUrl;
                if (!firma) {
                    showToast({
                        type: 'warning',
                        message: `Nessuna firma ${tipo} salvata. Acquisirla prima nella sezione Firma Digitale.`
                    });
                    return;
                }

                await Promise.allSettled(
                    ids.map(id =>
                        tipo === 'medico'
                            ? questionariService.firmaMedico(id, firma)
                            : questionariService.firmaPaziente(id, firma)
                    )
                );
            };

            if (action === 'firma-paziente') {
                await applyFirme(firmaWarningSummary.idsMissingPaziente, 'paziente');
            } else if (action === 'firma-medico') {
                await applyFirme(firmaWarningSummary.idsMissingMedico, 'medico');
            } else if (action === 'firma-tutte') {
                await applyFirme(firmaWarningSummary.idsMissingPaziente, 'paziente');
                await applyFirme(firmaWarningSummary.idsMissingMedico, 'medico');
            }

            // Refresh compilati and proceed with completion
            queryClient.invalidateQueries({ queryKey: ['questionari-visita', visitaId] });
            setIsFirmaWarningOpen(false);
            await completeAndScheduleMDL();
        } catch (error) {
            showToast({
                type: 'error',
                message: 'Errore durante l\'applicazione delle firme'
            });
        } finally {
            setIsFirmaWarningLoading(false);
        }
    }, [firmaWarningSummary, completeAndScheduleMDL, user?.id, paziente?.id, queryClient, visitaId, showToast]);

    // ============================================
    // ALLERGIE (editable text field in Quick Actions)
    // ============================================
    const [allergieText, setAllergieText] = useState<string>('');
    const [allergieInitialized, setAllergieInitialized] = useState(false);
    const [allergieSaved, setAllergieSaved] = useState(false);

    // P71: Invio referto via email
    const [invioRefertoMail, setInvioRefertoMail] = useState<boolean>(false);
    // Modal: chiedi se reinviare email quando si crea una nuova versione
    const [showEmailResendModal, setShowEmailResendModal] = useState(false);
    useEffect(() => {
        if (visita?.invioRefertoMail !== undefined) {
            setInvioRefertoMail(!!visita.invioRefertoMail);
        }
    }, [visita?.invioRefertoMail]);

    // Wrapper per handleNuovaVersione: se invioRefertoMail è attivo, chiede conferma
    const handleNuovaVersioneClick = useCallback(() => {
        if (invioRefertoMail) {
            setShowEmailResendModal(true);
        } else {
            handleNuovaVersione();
        }
    }, [invioRefertoMail, handleNuovaVersione]);

    const saveInvioRefertoMailMutation = useMutation({
        mutationFn: async (value: boolean) => {
            if (!visitaId) throw new Error('ID visita non disponibile');
            return visiteApi.updateImpostazioniInvio(visitaId, value);
        },
        onSuccess: (_data, value) => {
            setInvioRefertoMail(value);
            showToast({
                message: value
                    ? 'Il referto verrà inviato via email al termine della visita'
                    : 'Invio referto via email disabilitato',
                type: 'success'
            });
        },
        onError: () => {
            showToast({ message: 'Errore nel salvataggio delle impostazioni', type: 'error' });
        }
    });

    // Fetch profiloDiSalute per allergieFarmaci fallback
    const { data: profiloDiSaluteData } = useQuery({
        queryKey: ['profilo-di-salute', paziente?.id],
        queryFn: () => profiloDiSaluteApi.getByPerson(paziente!.id),
        enabled: !!paziente?.id,
        staleTime: 5 * 60_000,
    });
    // getByPerson uses extractData → returns ProfiloDiSalute | null directly (no .data wrapper)
    const allergieProfilo = (profiloDiSaluteData as { allergieFarmaci?: string | null } | null)?.allergieFarmaci ?? null;

    // Initialize allergieText: from visita.datiStrutturati._allergie first,
    // then fallback to profiloDiSalute.allergieFarmaci, then empty string
    useEffect(() => {
        if (allergieInitialized) return;
        const datiAllergie = visita?.datiStrutturati && typeof visita.datiStrutturati === 'object'
            ? (visita.datiStrutturati as { _allergie?: string })._allergie
            : undefined;
        if (datiAllergie) {
            setAllergieText(datiAllergie);
            setAllergieInitialized(true);
        } else if (allergieProfilo && profiloDiSaluteData) {
            // Pre-populate from shared profilo di salute
            setAllergieText(allergieProfilo);
            setAllergieInitialized(true);
        } else if (visita !== undefined && profiloDiSaluteData !== undefined) {
            // Both loaded but both empty — mark as initialized
            setAllergieInitialized(true);
        }
    }, [visita?.datiStrutturati, allergieProfilo, profiloDiSaluteData, visita, allergieInitialized]);

    // Mutation for saving allergie immediately with feedback toast
    // Also syncs allergieFarmaci on profiloDiSalute for cross-visit consistency
    const saveAllergieMutation = useMutation({
        mutationFn: async () => {
            if (!visitaId) throw new Error('Visita non disponibile');
            const currentDati = (visita?.datiStrutturati as Record<string, unknown>) || {};
            const updatedDati = { ...currentDati, _allergie: allergieText };
            // Sync to visita
            await visiteApi.update(visitaId, { datiStrutturati: updatedDati } as any);
            // Sync allergieFarmaci to profiloDiSalute so other visits see it
            if (paziente?.id) {
                await profiloDiSaluteApi.upsert(paziente.id, { allergieFarmaci: allergieText || undefined });
            }
        },
        onSuccess: () => {
            showToast({ message: 'Allergie salvate', type: 'success' });
            setAllergieSaved(true);
            queryClient.invalidateQueries({ queryKey: ['visita', visitaId] });
            queryClient.invalidateQueries({ queryKey: ['profilo-di-salute', paziente?.id] });
        },
        onError: () => {
            showToast({ message: 'Errore salvataggio allergie', type: 'error' });
        }
    });

    // Wrapper for allergie text change — resets saved indicator when user edits
    const handleAllergieChange = useCallback((value: string) => {
        setAllergieText(value);
        setAllergieSaved(false);
    }, []);

    // Handler to save allergie text — triggers immediate save + form sync
    const handleSaveAllergie = useCallback(() => {
        handleFieldChange('_allergie', allergieText);
        saveAllergieMutation.mutate();
    }, [allergieText, handleFieldChange, saveAllergieMutation]);

    // ============================================
    // SIDEBAR
    // ============================================
    const {
        state: sidebarState,
        sections,
        toggleSection,
        setActiveSection,
        toggleMinimize
    } = useVisitaSidebar(template);

    // Track expanded sections locally
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
    // Left column horizontal collapse state (Sezioni sidebar stays open, but whole column can hide)
    const [isLeftColCollapsed, setIsLeftColCollapsed] = useState(false);

    // Espande la sidebar principale (ClinicaLayout) quando si completa la visita
    useEffect(() => {
        if (visitaCompletataThisSession) {
            if (isEmbeddedVisit) {
                window.parent?.postMessage({
                    type: 'elementmedica:secondary-visit-completed',
                    visitaId
                }, window.location.origin);
            } else {
                setMainSidebarCollapsed(false);
            }
            setVisitaCompletataThisSession(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visitaCompletataThisSession, isEmbeddedVisit, visitaId]);

    const handleEmbeddedCancel = useCallback(() => {
        if (!isEmbeddedVisit) return;
        window.parent?.postMessage({
            type: 'elementmedica:secondary-visit-cancelled',
            visitaId
        }, window.location.origin);
    }, [isEmbeddedVisit, visitaId]);

    useEffect(() => {
        if (!isEmbeddedVisit) return;
        const handleCancelMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (event.data?.type !== 'elementmedica:secondary-visit-cancel') return;
            handleEmbeddedCancel();
        };
        window.addEventListener('message', handleCancelMessage);
        return () => window.removeEventListener('message', handleCancelMessage);
    }, [handleEmbeddedCancel, isEmbeddedVisit]);

    // Access Control state
    const [accessControl, setAccessControl] = useState<AccessControlConfig>(() => {
        // Initialize from visita or default
        const visitaAccessControl = visita?.accessControl as AccessControlConfig | undefined;
        return {
            accessLevel: visitaAccessControl?.accessLevel || 'ALL',
            confidentiality: (visita?.confidentiality as 'NORMAL' | 'RESTRICTED' | 'HIGHLY_RESTRICTED') || 'NORMAL',
            allowedPersonIds: visitaAccessControl?.allowedPersonIds || [],
            applyAsDefault: visitaAccessControl?.applyAsDefault || false
        };
    });

    // Update accessControl when visita loads
    useEffect(() => {
        if (visita) {
            const visitaAccessControl = visita.accessControl as AccessControlConfig | undefined;
            const newAccessControl: AccessControlConfig = {
                accessLevel: visitaAccessControl?.accessLevel || 'ALL',
                confidentiality: (visita.confidentiality as 'NORMAL' | 'RESTRICTED' | 'HIGHLY_RESTRICTED') || 'NORMAL',
                allowedPersonIds: visitaAccessControl?.allowedPersonIds || [],
                applyAsDefault: visitaAccessControl?.applyAsDefault || false
            };
            setAccessControl(newAccessControl);
            accessControlRef.current = toVisitAccessControl(newAccessControl);
        }
    }, [visita]);

    // Sync accessControl state with ref (convert to API format)
    useEffect(() => {
        accessControlRef.current = toVisitAccessControl(accessControl);
    }, [accessControl]);

    // ============================================
    // EXIT VISIT DIALOG (Session #14 - Fixed without useBlocker)
    // Uses beforeunload + popstate + history manipulation
    // useBlocker requires createBrowserRouter which is not used in this project
    // ============================================
    const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
    const [pendingNavigationPath, setPendingNavigationPath] = useState<number | string | null>(null);
    const [isExitActionLoading, setIsExitActionLoading] = useState(false);

    // Track if we should block navigation
    const shouldBlockNavigation = useMemo(() => {
        // Don't block while visit data is still loading
        if (isLoading || !visita) {
            return false;
        }
        // Don't block if visit is completed or cancelled
        if (visita.stato === 'COMPLETATA' || visita.stato === 'ANNULLATA') {
            return false;
        }
        // Don't block during exit action
        if (isExitActionLoading) {
            return false;
        }
        // Block all other navigation for visits in progress
        return true;
    }, [isLoading, visita, isExitActionLoading]);

    // Ref to track if we're handling navigation
    const isNavigatingRef = useRef(false);
    // Ref to track if we're restoring history state (popstate handler)
    const isRestoringHistoryRef = useRef(false);

    // Block browser back/forward button, page refresh, AND React Router navigation
    // React Router uses history.pushState internally - we intercept that too
    useEffect(() => {
        if (!shouldBlockNavigation) return;

        // Handler for beforeunload (refresh/close tab)
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = 'Hai modifiche non salvate. Sei sicuro di voler uscire?';
            return e.returnValue;
        };

        // Handler for popstate (back/forward button)
        const handlePopState = () => {
            if (isNavigatingRef.current) return;

            // Push state back to prevent navigation
            isRestoringHistoryRef.current = true;
            window.history.pushState(null, '', window.location.href);
            isRestoringHistoryRef.current = false;

            // Show exit dialog
            setPendingNavigationPath(-1);
            setIsExitDialogOpen(true);
        };

        // Intercept history.pushState to catch React Router <Link> navigation
        // React Router v6 (BrowserRouter) uses pushState under the hood
        const originalPushState = window.history.pushState.bind(window.history);
        const originalReplaceState = window.history.replaceState.bind(window.history);

        window.history.pushState = function (state: unknown, title: string, url?: string | URL | null) {
            // Allow if we're deliberately navigating (after exit action)
            if (isNavigatingRef.current || isRestoringHistoryRef.current) {
                return originalPushState(state, title, url);
            }

            const targetUrl = url ? String(url) : '';
            const currentPath = window.location.pathname;

            // Allow same-page navigations (hash changes, query params on same path)
            if (!targetUrl || targetUrl === window.location.href) {
                return originalPushState(state, title, url);
            }

            // Allow if staying on the same visit page (e.g. replacing visit ID)
            if (targetUrl.includes('/poliambulatorio/visite/') || targetUrl.includes('/visita/')) {
                return originalPushState(state, title, url);
            }

            // Block navigation to other pages - show exit dialog
            setPendingNavigationPath(targetUrl);
            setIsExitDialogOpen(true);
            // Don't call originalPushState - navigation is blocked
        };

        window.history.replaceState = function (state: unknown, title: string, url?: string | URL | null) {
            if (isNavigatingRef.current || isRestoringHistoryRef.current) {
                return originalReplaceState(state, title, url);
            }

            const targetUrl = url ? String(url) : '';
            if (!targetUrl || targetUrl === window.location.href) {
                return originalReplaceState(state, title, url);
            }

            // Block navigation to other pages
            if (!targetUrl.includes('/poliambulatorio/visite/') && !targetUrl.includes('/visita/')) {
                setPendingNavigationPath(targetUrl);
                setIsExitDialogOpen(true);
                return;
            }

            return originalReplaceState(state, title, url);
        };

        // Push initial state to history so we can detect back button
        isRestoringHistoryRef.current = true;
        window.history.pushState(null, '', window.location.href);
        isRestoringHistoryRef.current = false;

        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('popstate', handlePopState);
            // Restore original history methods
            window.history.pushState = originalPushState;
            window.history.replaceState = originalReplaceState;
        };
    }, [shouldBlockNavigation]);

    // ============================================
    // MODULISTICA MODAL (Session #13)
    // ============================================
    const [isModulisticaModalOpen, setIsModulisticaModalOpen] = useState(false);

    // ============================================
    // P61: QUESTIONARI MEDICI MODAL
    // ============================================
    const [isQuestionariModalOpen, setIsQuestionariModalOpen] = useState(false);

    // ============================================
    // Auto-expand Azioni Rapide section after compilation
    // ============================================
    const [autoExpandSection, setAutoExpandSection] = useState<string | null>(null);

    // ============================================
    // VISITA VIEW & REVISION DIFF MODALS (Session #16)
    // ============================================
    const [isVisitaViewModalOpen, setIsVisitaViewModalOpen] = useState(false);
    const [selectedVisitaIdForView, setSelectedVisitaIdForView] = useState<string | null>(null);
    const [selectedSecondaryVisitId, setSelectedSecondaryVisitId] = useState<string | null>(null);
    const secondaryVisitFrameRef = useRef<HTMLIFrameElement | null>(null);
    const [selectedEsameStrumentale, setSelectedEsameStrumentale] = useState<EsameStrumentale | null>(null);
    const [isRevisionDiffModalOpen, setIsRevisionDiffModalOpen] = useState(false);
    const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);

    useEffect(() => {
        const handleSecondaryVisitMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (!['elementmedica:secondary-visit-completed', 'elementmedica:secondary-visit-cancelled'].includes(event.data?.type)) return;

            const completedVisitId = event.data.visitaId as string | undefined;
            setSelectedSecondaryVisitId(null);
            if (event.data?.type === 'elementmedica:secondary-visit-completed' && completedVisitId) {
                setPrestazioniAggiuntive(prev => {
                    const updated = prev.map(p => p.visitaSecondariaId === completedVisitId
                        ? { ...p, esecuzioneStatus: 'ESEGUITA' as const, statoAppPrestazione: 'ESEGUITA' as const }
                        : p
                    );
                    handleFieldChange('_prestazioniAggiuntive', updated);
                    return updated;
                });
            }
            queryClient.invalidateQueries({ queryKey: ['appuntamento', appuntamento?.id] });
            queryClient.invalidateQueries({ queryKey: ['visite'] });
            queryClient.invalidateQueries({ queryKey: ['visite-count'] });
            queryClient.invalidateQueries({ queryKey: ['prestazioni-da-refertare-list'] });
            queryClient.invalidateQueries({ queryKey: ['prestazioni-da-refertare-count'] });
        };

        window.addEventListener('message', handleSecondaryVisitMessage);
        return () => window.removeEventListener('message', handleSecondaryVisitMessage);
    }, [appuntamento?.id, handleFieldChange, queryClient]);

    const handleCloseSecondaryVisitModal = useCallback(() => {
        secondaryVisitFrameRef.current?.contentWindow?.postMessage({
            type: 'elementmedica:secondary-visit-cancel'
        }, window.location.origin);
        window.setTimeout(() => setSelectedSecondaryVisitId(null), 120);
    }, []);

    const { data: esamiStrumentali = [] } = useQuery<EsameStrumentale[]>({
        queryKey: ['esami-strumentali', visitaId],
        queryFn: () => strumentiBridgeApi.getEsamiVisita(visitaId!),
        enabled: !!visitaId,
        staleTime: 30_000,
    });

    // ============================================
    // P61: QUEUE MANAGEMENT STATE
    // ============================================
    const [isQueueLoading, setIsQueueLoading] = useState(false);
    const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
    const [embeddedEditSession, setEmbeddedEditSession] = useState(false);
    const [embeddedActiveSection, setEmbeddedActiveSection] = useState<string | null>(null);

    // Profilo di Salute — modal scheda completa
    const [profiloSaluteModalOpen, setProfiloSaluteModalOpen] = useState(false);
    const [patientEditModalOpen, setPatientEditModalOpen] = useState(false);
    const [occupationalEditModalOpen, setOccupationalEditModalOpen] = useState(false);
    const [patientEditForm, setPatientEditForm] = useState({
        firstName: '',
        lastName: '',
        taxCode: '',
        birthDate: '',
        birthPlace: '',
        birthProvince: '',
        gender: '',
        etnia: DEFAULT_ETHNICITY,
        residenceAddress: '',
        residenceCity: '',
        postalCode: '',
        province: '',
        phone: '',
        email: ''
    });

    useEffect(() => {
        if (!paziente) return;
        setPatientEditForm({
            firstName: paziente.firstName || paziente.nome || '',
            lastName: paziente.lastName || paziente.cognome || '',
            taxCode: paziente.taxCode || paziente.codiceFiscale || '',
            birthDate: paziente.birthDate || paziente.dataNascita ? String(paziente.birthDate || paziente.dataNascita).split('T')[0] : '',
            birthPlace: paziente.birthPlace || (paziente as any).comuneNascita || '',
            birthProvince: paziente.birthProvince || (paziente as any).provinciaNascita || '',
            gender: paziente.gender || paziente.sesso || '',
            etnia: (paziente as any).etnia || DEFAULT_ETHNICITY,
            residenceAddress: paziente.residenceAddress || (paziente as any).indirizzo || '',
            residenceCity: paziente.residenceCity || (paziente as any).comune || '',
            postalCode: paziente.postalCode || (paziente as any).cap || '',
            province: paziente.province || (paziente as any).provincia || '',
            phone: paziente.phone || paziente.telefono || '',
            email: paziente.email || ''
        });
    }, [paziente]);

    const updatePatientMutation = useMutation({
        mutationFn: () => pazientiApi.update(paziente!.id, {
            firstName: patientEditForm.firstName.trim(),
            lastName: patientEditForm.lastName.trim(),
            taxCode: patientEditForm.taxCode.trim(),
            birthDate: patientEditForm.birthDate || null,
            birthPlace: patientEditForm.birthPlace.trim() || null,
            birthProvince: patientEditForm.birthProvince.trim() || null,
            gender: patientEditForm.gender || null,
            etnia: patientEditForm.etnia || null,
            residenceAddress: patientEditForm.residenceAddress.trim() || null,
            residenceCity: patientEditForm.residenceCity.trim() || null,
            postalCode: patientEditForm.postalCode.trim() || null,
            province: patientEditForm.province.trim() || null,
            phone: patientEditForm.phone.trim() || null,
            email: patientEditForm.email.trim() || null,
        } as any),
        onSuccess: async () => {
            showToast({ message: 'Anagrafica paziente aggiornata', type: 'success' });
            setPatientEditModalOpen(false);
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['visita-data'] }),
                queryClient.invalidateQueries({ queryKey: ['paziente', paziente?.id] }),
                queryClient.invalidateQueries({ queryKey: ['paziente-storico', paziente?.id] }),
            ]);
            refetch();
        },
        onError: () => showToast({ message: 'Errore durante il salvataggio dell’anagrafica', type: 'error' })
    });

    const { data: allProtocolliData } = useQuery({
        queryKey: ['protocolli-sanitari-visita-occupational-edit'],
        queryFn: () => protocolliSanitariApi.getAll({ isAttivo: true, limit: 200 }),
        enabled: occupationalEditModalOpen,
        staleTime: 5 * 60 * 1000,
    });

    const [occupationalEditForm, setOccupationalEditForm] = useState({
        title: '',
        hiredDate: '',
        endDate: '',
        tipoContratto: '',
        tipoCollaboratore: '',
        protocolloSanitarioId: '',
    });

    useEffect(() => {
        const current = workerRisksData?.statoOccupazionale?.current;
        const snapshot = current?.snapshot || {};
        if (!current) return;
        setOccupationalEditForm({
            title: current.titolo || current.title || snapshot.title || '',
            hiredDate: (current.dataInizio || current.hiredDate || snapshot.hiredDate || '') ? String(current.dataInizio || current.hiredDate || snapshot.hiredDate).split('T')[0] : '',
            endDate: (current.dataFine || current.endDate || snapshot.endDate || '') ? String(current.dataFine || current.endDate || snapshot.endDate).split('T')[0] : '',
            tipoContratto: current.tipoContratto || snapshot.tipoContratto || '',
            tipoCollaboratore: current.tipoCollaboratore || snapshot.tipoCollaboratore || '',
            protocolloSanitarioId: current.protocolloSanitarioId || current.protocolloSanitario?.id || snapshot.protocolloSanitario?.id || '',
        });
    }, [workerRisksData?.statoOccupazionale?.current]);

    const updateOccupationalMutation = useMutation({
        mutationFn: () => mansioniApi.updateWorkerOccupationalProfile(paziente!.id, {
            title: occupationalEditForm.title || null,
            hiredDate: occupationalEditForm.hiredDate || null,
            endDate: occupationalEditForm.endDate || null,
            tipoContratto: occupationalEditForm.tipoContratto || null,
            tipoCollaboratore: occupationalEditForm.tipoCollaboratore || null,
            protocolloSanitarioId: occupationalEditForm.protocolloSanitarioId || null,
        }),
        onSuccess: async () => {
            showToast({ message: 'Stato occupazionale aggiornato', type: 'success' });
            setOccupationalEditModalOpen(false);
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['worker-risks', paziente?.id] }),
                queryClient.invalidateQueries({ queryKey: ['profilo-salute', paziente?.id] }),
            ]);
        },
        onError: () => showToast({ message: 'Errore nel salvataggio dello stato occupazionale', type: 'error' }),
    });

    // P73: Visite collegate (secondarie o principale) modal
    const [isVisiteCollegateOpen, setIsVisiteCollegateOpen] = useState(false);

    // P61: Query queue stats for "In Attesa" badge on Coda button
    const { data: queueStats } = useQuery({
        queryKey: ['queue-stats', appuntamento?.queueSessionId],
        queryFn: () => queueApi.getSessionStats(appuntamento!.queueSessionId!),
        enabled: !!appuntamento?.queueSessionId,
        refetchInterval: 30000, // Auto-refresh every 30s
        staleTime: 10000
    });

    // Handler per visualizzare una visita precedente
    const handleViewVisita = useCallback((visitaIdToView: string) => {
        setSelectedVisitaIdForView(visitaIdToView);
        setIsVisitaViewModalOpen(true);
    }, []);

    // Handler per visualizzare il diff di una revisione
    const handleViewRevision = useCallback((revisionId: string) => {
        setSelectedRevisionId(revisionId);
        setIsRevisionDiffModalOpen(true);
    }, []);

    // ============================================
    // P61: QUEUE HANDLERS
    // ============================================
    const handleChiamaPaziente = useCallback(async () => {
        if (!appuntamento?.id || !appuntamento?.ambulatorioId) {
            showToast({ message: 'Dati appuntamento mancanti per la chiamata', type: 'warning' });
            return;
        }

        setIsQueueLoading(true);
        try {
            // ALWAYS refetch appuntamento to get fresh queueEntryId
            const freshAppuntamento = await appuntamentiApi.getById(appuntamento.id);
            const entryId = freshAppuntamento?.queueEntryId;

            if (!entryId) {
                showToast({
                    message: 'Il paziente non è ancora in coda. Registralo prima dall\'accettazione.',
                    type: 'warning'
                });
                return;
            }

            await queueApi.callSpecific({
                entryId,
                ambulatorioId: appuntamento.ambulatorioId,
                displayedMessage: `Chiamata paziente ${paziente?.firstName || ''} ${paziente?.lastName || ''}`,
                appuntamentoId: appuntamento.id
            });
            showToast({ message: 'Paziente chiamato dalla sala d\'attesa', type: 'success' });
            // Refetch appuntamento to update queueEntryStato
            queryClient.invalidateQueries({ queryKey: ['appuntamento', appuntamento.id] });
        } catch (error) {
            const errorMsg = 'Errore sconosciuto';
            if (errorMsg.includes('Entry non trovata')) {
                showToast({
                    message: 'Numero coda non valido. Il paziente potrebbe non essere più in coda.',
                    type: 'warning'
                });
                // Refetch to update stale data
                queryClient.invalidateQueries({ queryKey: ['appuntamento', appuntamento.id] });
            } else {
                showToast({ message: `Errore durante la chiamata: ${errorMsg}`, type: 'error' });
            }
        } finally {
            setIsQueueLoading(false);
        }
    }, [appuntamento, paziente, showToast, queryClient]);

    const handleRichiamaPaziente = useCallback(async () => {
        if (!appuntamento?.queueEntryId) return;

        setIsQueueLoading(true);
        try {
            await queueApi.recallEntry(appuntamento.queueEntryId, `Richiamata paziente ${paziente?.firstName || ''} ${paziente?.lastName || ''}`);
            showToast({ message: 'Paziente richiamato dalla sala d\'attesa', type: 'success' });
        } catch (error) {
            showToast({ message: 'Errore durante la richiamata del paziente', type: 'error' });
        } finally {
            setIsQueueLoading(false);
        }
    }, [appuntamento, paziente, showToast]);

    const handleViewQueue = useCallback(() => {
        setIsQueueModalOpen(true);
    }, []);

    // Handle back button click - show dialog instead of immediate navigation
    const handleBackClick = useCallback(() => {
        // For existing visits (not new), ALWAYS show exit dialog UNLESS visit is COMPLETATA/ANNULLATA
        // This ensures user can save draft, complete, or cancel before leaving

        // If visit is already completed or cancelled, navigate directly to the list
        // (use specific path instead of navigate(-1) — the history blocker may have added extra entries)
        if (visita?.stato === 'COMPLETATA' || visita?.stato === 'ANNULLATA') {
            goBack();
            return;
        }

        // For ANY other case (new visit, IN_CORSO, BOZZA, INIZIATA, or even while loading)
        // Show the exit dialog to let user decide what to do
        setPendingNavigationPath(-1);
        setIsExitDialogOpen(true);
    }, [visita?.stato, goBack]);

    // Handle exit dialog actions
    const handleExitAction = useCallback(async (action: ExitVisitAction, deletionReason?: string) => {
        setIsExitActionLoading(true);

        try {
            switch (action) {
                case 'save-draft':
                    // Save as draft and navigate away
                    await handleSave();
                    break;

                case 'save-complete':
                    // Complete the visit (with firma check) and navigate away
                    await handleCompleteWithFirmaCheck();
                    break;

                case 'discard': {
                    // Detect visit type to choose correct revert strategy
                    const visitaStato = visita?.stato;
                    const isNuovaVersione = visita?.revisions?.some(
                        (r: { changeType?: string }) => r.changeType === 'NEW_VERSION'
                    );

                    if (visitaStato === 'COMPLETATA' || visitaStato === 'ANNULLATA') {
                        // Read-only view: nessuna modifica attiva, naviga senza chiamate backend
                        break;
                    }

                    if (isNuovaVersione && visitaId) {
                        // Nuova versione in corso: annullaModifiche ripristina dati + stato COMPLETATA
                        // e aggiorna anche l'appuntamento a COMPLETATO internamente
                        try {
                            await visiteApi.annullaModifiche(visitaId);
                        } catch (error) {
                            // Non bloccante: naviga comunque per evitare di bloccare l'utente
                        }
                        break;
                    }

                    // Prima visita (nuova o esistente IN_CORSO senza revisioni):
                    // Elimina la visita (soft delete GDPR) + ripristina appuntamento
                    if (visitaId && !isNew) {
                        try {
                            const reason = deletionReason || 'Visita annullata dall\'utente durante l\'uscita';
                            await visiteApi.delete(visitaId, reason);
                        } catch (error) {
                            // Continue anyway - vogliamo navigare fuori
                        }
                    }
                    // Reset appuntamento: azzera oraInizio e ripristina lo stato corretto
                    if (appuntamento?.id) {
                        try {
                            await appuntamentiApi.annullaVisita(appuntamento.id);
                        } catch (error) {
                            // Fallback: ripristina lo stato in base a oraArrivo
                            try {
                                const statoRipristino = appuntamento.oraArrivo ? 'IN_ATTESA' : 'PRENOTATO';
                                await appuntamentiApi.changeStato(appuntamento.id, statoRipristino);
                            } catch (_) {
                                // silently ignore
                            }
                        }
                    }
                    break;
                }
            }

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['visite'] });
            queryClient.invalidateQueries({ queryKey: ['visite-count'] });
            queryClient.invalidateQueries({ queryKey: ['appuntamenti'] });
            queryClient.invalidateQueries({ queryKey: ['prestazioni-da-refertare-list'] });
            queryClient.invalidateQueries({ queryKey: ['prestazioni-da-refertare-count'] });
            // Invalidate specific appuntamento so AppuntamentoDetailPage reflects changes
            if (appuntamento?.id) {
                queryClient.invalidateQueries({ queryKey: ['appuntamento', appuntamento.id] });
            }
            await queryClient.refetchQueries({ queryKey: ['visite'] });

            // Mark that we're navigating to prevent popstate handler from blocking
            isNavigatingRef.current = true;

            // Navigate back to the exact originating page/tab when available.
            if (pendingNavigationPath === -1 || pendingNavigationPath === null) {
                goBack();
            } else if (typeof pendingNavigationPath === 'string') {
                navigate(pendingNavigationPath);
            } else {
                goBack();
            }
        } catch (error) {
            showToast({
                message: 'Errore durante il salvataggio. Riprova.',
                type: 'error'
            });
            throw error; // Re-throw to keep dialog open
        } finally {
            setIsExitActionLoading(false);
        }
    }, [handleSave, handleCompleteWithFirmaCheck, visitaId, isNew, visita?.stato, visita?.revisions, appuntamento?.id, appuntamento?.oraArrivo, queryClient, pendingNavigationPath, navigate, goBack, showToast]);

    // ============================================
    // NOTE INTERNE (medico-segreteria communication)
    // ============================================
    const [noteInterne, setNoteInterne] = useState<string>('');

    // Initialize noteInterne from appuntamento
    useEffect(() => {
        if (appuntamento?.noteInterne) {
            setNoteInterne(appuntamento.noteInterne);
        }
    }, [appuntamento?.noteInterne]);

    // Mutation for saving noteInterne
    const saveNoteInterneMutation = useMutation({
        mutationFn: async () => {
            if (!appuntamento?.id) throw new Error('Appuntamento non disponibile');
            return appuntamentiApi.update(appuntamento.id, { noteInterne });
        },
        onSuccess: () => {
            showToast({ message: 'Note interne salvate', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['appuntamenti', appuntamento?.id] });
        },
        onError: (err: Error) => {
            showToast({ message: 'Errore', type: 'error' });
        }
    });

    // ============================================
    // RIGENERA MOVIMENTI CONTABILI (recovery per visite COMPLETATA con billing BOZZA)
    // ============================================
    const rigeneraMovimentiMutation = useMutation({
        mutationFn: () => {
            if (!visitaId) throw new Error('Visita non disponibile');
            return apiPost<{ message: string; warnings?: string[] }>(`/api/v1/clinica/visite/${visitaId}/rigenera-movimenti`, {});
        },
        onSuccess: (data) => {
            showToast({
                type: 'success',
                title: 'Movimenti rigenerati',
                message: data.message || 'Movimenti contabili rigenerati con successo.',
            });
            queryClient.invalidateQueries({ queryKey: ['visita', visitaId] });
        },
        onError: () => {
            showToast({ type: 'error', message: 'Errore durante la rigenerazione dei movimenti contabili.' });
        },
    });

    // ============================================
    // PRESTAZIONI AGGIUNTIVE
    // ============================================
    // Nota: useState dichiarato sopra (prima di completeAndScheduleMDL) per evitare TDZ

    // Initialize from visita.datiStrutturati._prestazioniAggiuntive,
    // with fallback to appuntamento.prestazioni (populated by sorveglianza sanitaria programma endpoint)
    useEffect(() => {
        // Priority 1: datiStrutturati already has saved prestazioni (user modified during a previous session)
        if (visita?.datiStrutturati && typeof visita.datiStrutturati === 'object') {
            const dati = visita.datiStrutturati as { _prestazioniAggiuntive?: PrestazioneItem[] };
            const saved = dati._prestazioniAggiuntive;
            if (saved && saved.length > 0) {
                const tipoMDL = visita?.tipoVisitaMDL || appuntamento?.tipoVisitaMDL;
                const shouldUseProtocolPrestazioni = tipoMDL === 'PREVENTIVA'
                    || tipoMDL === 'PREVENTIVA_PREASSUNTIVA';
                if (isMDLVisit && tipoMDL && !shouldUseProtocolPrestazioni) {
                    const appointmentPrestazioneIds = new Set(
                        (((appuntamento as any)?.prestazioni || []) as Array<{ prestazione?: { id?: string } }>)
                            .map(ap => ap.prestazione?.id)
                            .filter(Boolean) as string[]
                    );
                    const protocolPrestazioneIds = new Set(
                        (scadenzePersona || [])
                            .map(g => g.prestazioneId)
                            .filter(Boolean) as string[]
                    );
                    const explicitOnly = saved.filter(p => appointmentPrestazioneIds.has(p.id) || !protocolPrestazioneIds.has(p.id));
                    setPrestazioniAggiuntive(prev => mergePrestazioneItems(prev, explicitOnly));
                } else {
                    setPrestazioniAggiuntive(prev => mergePrestazioneItems(prev, saved));
                }
            }
        }
        // Priority 2: AppuntamentoPrestazione records created when booking the appointment
        const appPrestazioni = (appuntamento as any)?.prestazioni as Array<{
            id?: string;
            stato?: PrestazioneItem['statoAppPrestazione'];
            dataEsecuzione?: string | null;
            refertoId?: string | null;
            medicoRefertanteId?: string | null;
            visitaSecondariaId?: string | null;
            prestazione?: { id: string; nome: string; codice?: string; prezzoBase?: number | string | null; durataPrevista?: number | null };
            movimentiContabili?: Array<{ id: string; importoNetto: number | string | null; importoLordo: number | string | null; stato: string }>;
        }> | undefined;
        if (appPrestazioni && appPrestazioni.length > 0) {
            const mappedAppPrestazioni = appPrestazioni
                    // Exclude the main prestazione to avoid duplicates.
                    // Compare with both appuntamento.prestazioneId AND visita.prestazioneId
                    // (appuntamento.prestazioneId may be null for legacy data pre-backfill)
                    .filter(ap => {
                        if (!ap.prestazione) return false;
                        const mainId = (appuntamento as any)?.prestazioneId || visita?.prestazioneId;
                        return ap.prestazione.id !== mainId;
                    })
                    .map(ap => {
                        // Use tariffario price from linked MovimentoContabile when available (importoNetto — ESENTE IVA MDL),
                        // fallback to Prestazione.prezzoBase
                        const { importoNetto: movNetto, importoLordo: movLordo } = ap.movimentiContabili?.[0] ?? {};
                        const tariffarioPrice = movNetto ?? movLordo;
                        const prezzo = tariffarioPrice != null
                            ? Number(tariffarioPrice)
                            : ap.prestazione!.prezzoBase ? Number(ap.prestazione!.prezzoBase) : undefined;
                        return {
                            id: ap.prestazione!.id,
                            codice: ap.prestazione!.codice || '',
                            nome: ap.prestazione!.nome || '',
                            prezzo,
                            durata: ap.prestazione!.durataPrevista || undefined,
                            aCaricoTipo: 'azienda' as const, // Sorveglianza sanitaria MDL → sempre a carico azienda
                            appPrestazioneId: ap.id,
                            statoAppPrestazione: ap.stato,
                            dataEsecuzione: ap.dataEsecuzione ?? null,
                            refertoId: ap.refertoId ?? null,
                            medicoRefertanteId: ap.medicoRefertanteId ?? undefined,
                            visitaSecondariaId: ap.visitaSecondariaId ?? undefined,
                        };
                    });
            setPrestazioniAggiuntive(prev => mergePrestazioneItems(prev, mappedAppPrestazioni));
        }
    }, [visita?.datiStrutturati, visita?.tipoVisitaMDL, appuntamento, isMDLVisit, scadenzePersona]);

    // P72_FIX: Auto-merge prestazioni from protocollo scadenze into prestazioniAggiuntive
    // When an MDL visit has scadenze but the booking didn't include all prestazioni as AppuntamentoPrestazione,
    // auto-add the missing ones so the PrestazioniCard shows the full protocol.
    const scadenzeAutoMergeRef = useRef(false);
    useEffect(() => {
        if (!isMDLVisit || !scadenzePersona?.length || scadenzeAutoMergeRef.current) return;
        const tipoMDL = visita?.tipoVisitaMDL || appuntamento?.tipoVisitaMDL;
        const shouldMergeProtocolPrestazioni = tipoMDL === 'PREVENTIVA'
            || tipoMDL === 'PREVENTIVA_PREASSUNTIVA';
        if (!shouldMergeProtocolPrestazioni) {
            scadenzeAutoMergeRef.current = true;
            return;
        }
        // Wait until initial prestazioni are loaded (either from datiStrutturati or appuntamento)
        if (visita?.id === undefined && !appuntamento) return;

        const mainPrestazioneId = appuntamento?.prestazioneId || visita?.prestazioneId;
        const existingIds = new Set([
            ...(mainPrestazioneId ? [mainPrestazioneId] : []),
            ...prestazioniAggiuntive.map(p => p.id)
        ]);

        // Find scadenze with prestazioneId not already displayed (exclude questionari)
        // Lookup appuntamento prestazioni for prices when auto-merging
        const appPrest = (appuntamento as any)?.prestazioni as Array<{
            prestazione?: { id: string; prezzoBase?: number | string | null };
            movimentiContabili?: Array<{ importoNetto?: number | string | null; importoLordo?: number | string | null }>;
        }> | undefined;
        const missing = scadenzePersona
            .filter(g => g.prestazioneId && !existingIds.has(g.prestazioneId) && g.prestazioneTipo !== 'QUESTIONARIO')
            .map(g => {
                // Try to get price from appuntamento prestazioni (movimenti > prezzoBase)
                const matchedAp = appPrest?.find(ap => ap.prestazione?.id === g.prestazioneId);
                let prezzo: number | undefined;
                if (matchedAp) {
                    const mov = matchedAp.movimentiContabili?.[0];
                    const movPrice = mov ? (mov.importoNetto ?? mov.importoLordo) : null;
                    prezzo = movPrice != null ? Number(movPrice) : (matchedAp.prestazione?.prezzoBase ? Number(matchedAp.prestazione.prezzoBase) : undefined);
                }
                return {
                    id: g.prestazioneId!,
                    codice: g.prestazioneCodice || '',
                    nome: g.prestazioneName || '',
                    prezzo,
                    aCaricoTipo: 'azienda' as const,
                };
            });

        if (missing.length > 0) {
            scadenzeAutoMergeRef.current = true;
            setPrestazioniAggiuntive(prev => {
                const ids = new Set(prev.map(p => p.id));
                const toAdd = missing.filter(m => !ids.has(m.id));
                if (toAdd.length === 0) return prev;
                const merged = [...prev, ...toAdd];
                handleFieldChange('_prestazioniAggiuntive', merged);
                return merged;
            });
        } else {
            scadenzeAutoMergeRef.current = true;
        }
    }, [isMDLVisit, scadenzePersona, prestazioniAggiuntive, visita?.id, visita?.tipoVisitaMDL, appuntamento, handleFieldChange]);

    // Convert prestazione to PrestazioneItem
    // Note: _prezzoTariffario is enriched on appuntamento.prestazione (via AppuntamentoService.getById),
    // NOT on the separately-fetched prestazione object (prestazioniApi.getById).
    // Use appuntamento.prestazione._prezzoTariffario as primary source of company tariffario price.
    const prestazionePrincipale = useMemo((): PrestazioneItem | null => {
        if (!prestazione) return null;
        const tipoVisitaAttuale = visita?.tipoVisitaMDL || appuntamento?.tipoVisitaMDL || null;
        const mainPrestazioneId = appuntamento?.prestazioneId || visita?.prestazioneId || prestazione.id;
        const voci = (appuntamento as any)?._vociTariffario as Array<{
            prestazioneId: string;
            prezzoBase: number | string;
            categoriaVisita: string | null;
        }> | undefined;
        const voceTariffario =
            (tipoVisitaAttuale && voci?.find(v => v.prestazioneId === mainPrestazioneId && v.categoriaVisita === tipoVisitaAttuale))
            ?? voci?.find(v => v.prestazioneId === mainPrestazioneId && !v.categoriaVisita)
            ?? voci?.find(v => v.prestazioneId === mainPrestazioneId);
        const appPrestazione = (appuntamento as any)?.prestazione as { _prezzoTariffario?: number } | undefined;
        const prezzoTariffario = (voceTariffario ? Number(voceTariffario.prezzoBase) : undefined)
            ?? appPrestazione?._prezzoTariffario
            ?? (prestazione as any)._prezzoTariffario as number | undefined;
        return {
            id: prestazione.id,
            codice: prestazione.codice || '',
            nome: prestazione.nome,
            tipo: (prestazione as any).tipo || undefined,
            prezzo: prezzoTariffario ?? (prestazione.prezzoBase ? Number(prestazione.prezzoBase) : undefined),
            prezzoPrimaVisita: (prestazione as any).prezzoPrimaVisita ? Number((prestazione as any).prezzoPrimaVisita) : undefined,
            prezzoControllo: (prestazione as any).prezzoControllo ? Number((prestazione as any).prezzoControllo) : undefined,
            durata: prestazione.durataPrevista || undefined,
            isPrimary: true
        };
    }, [prestazione, appuntamento, visita?.prestazioneId, visita?.tipoVisitaMDL]);

    // Voci tariffario per la prestazione principale (MDL) — usate nel selettore tipo visita
    // Fallback a visita.prestazioneId per appuntamenti legacy con prestazioneId null
    const vociTariffarioPrincipale = useMemo((): VoceTariffarioItem[] => {
        const voci = (appuntamento as any)?._vociTariffario as Array<{ prestazioneId: string; prezzoBase: number | string; categoriaVisita: string | null }> | undefined;
        const mainPrestazioneId = appuntamento?.prestazioneId || visita?.prestazioneId;
        if (!voci || !mainPrestazioneId) return [];
        return voci.filter(v => v.prestazioneId === mainPrestazioneId);
    }, [appuntamento, visita?.prestazioneId]);

    // Sorveglianza sanitaria stats — derived from first active MDL protocol for patient's mansione
    // getByMansione uses extractData → protocolliMansione is already ProtocolloSanitario[]
    const sorveglianzaStats = useMemo((): SorveglianzaStats | null => {
        const protocolli = protocolliMansione;
        if (!protocolli?.length) return null;
        const protocollo = protocolli.find(p => p.isAttivo) ?? protocolli[0];
        const accertamenti = (protocollo.prestazioni ?? [])
            .sort((a, b) => (b.isObbligatoria ? 1 : 0) - (a.isObbligatoria ? 1 : 0))
            .map(p => ({ nome: p.prestazione?.nome ?? '', isObbligatoria: p.isObbligatoria }))
            .filter(a => a.nome.length > 0);
        return {
            periodicitaMesi: protocollo.periodicitaVisiteMesi,
            accertamenti,
            denominazione: protocollo.denominazione,
        };
    }, [protocolliMansione]);

    /**
     * Wrapper di handleSave che, per visite MDL, genera automaticamente i PDF
     * del giudizio idoneità (Art. 41 c.7 D.Lgs 81/08) se ancora non generati.
     * Sincronizza anche prossimoControllo → ScadenzaPrestazioneProtocollo (Task 5).
     *
     * NOTA: La programmazione delle scadenze (programmaPrestazioni) viene eseguita
     * SOLO in completeAndScheduleMDL (cioè alla CHIUSURA della visita), non ad
     * ogni salvataggio, per evitare che le date del piano di sorveglianza vengano
     * avanzate erroneamente ad ogni save.
     */
    const handleSaveWithMDLScheduling = useCallback(async () => {
        await handleSave();

        if (!isMDLVisit || isNew || !visitaId) return;

        // P72_15 Task 5: Sincronizza prossimoControllo → dataScadenza della ScadenzaPrestazioneProtocollo
        // per la VMdL (o per la prima scadenza aperta trovata), in modo che il piano di sorveglianza
        // rifletta la data impostata dal MC.
        if (shouldAdvanceMDLPlan && prossimoControllo && scadenzePersona?.length) {
            try {
                const vmlGroup = scadenzePersona.find(g => g.prestazioneTipo === 'VISITA_MEDICINA_LAVORO')
                    ?? scadenzePersona[0]; // fallback: prima prestazione
                const openScadenza = vmlGroup?.scadenze?.find(s => !s.eseguita);
                if (openScadenza?.id) {
                    await scadenzeMDLApi.patchDataScadenza(openScadenza.id, prossimoControllo);
                }
            } catch {
                // Non bloccare il flusso
            }
        }

        // Genera i PDF del giudizio idoneità se non ancora generati (Art. 41 c.7)
        try {
            const giudiziResult = await giudiziIdoneitaApi.getAll({ personId: paziente?.id, limit: 100 } as Parameters<typeof giudiziIdoneitaApi.getAll>[0]);
            const giudizi = (giudiziResult as any)?.data ?? giudiziResult ?? [];
            const giudizio = Array.isArray(giudizi) ? giudizi.find((g: { visitaId?: string; pdfLavoratoreUrl?: string }) => g.visitaId === visitaId && !g.pdfLavoratoreUrl) : null;
            if (giudizio?.id) {
                await giudiziIdoneitaApi.generateDocuments(giudizio.id);
                showToast({ type: 'success', message: 'Documenti giudizio idoneità generati (Art. 41 c.7 D.Lgs 81/08)' });
            }
        } catch {
            // Non bloccare il flusso
        }
    }, [handleSave, isMDLVisit, isNew, visitaId, shouldAdvanceMDLPlan, prossimoControllo, scadenzePersona, showToast, paziente?.id]);

    // Handler per aggiungere prestazione aggiuntiva
    const handleAddPrestazione = useCallback((item: PrestazioneItem) => {
        const itemToAdd: PrestazioneItem = {
            ...item,
            createdDuringVisit: item.createdDuringVisit ?? (!item.isQuestionario && !item.isPrimary)
        };

        setPrestazioniAggiuntive(prev => {
            const updated = mergePrestazioneItems(prev, [itemToAdd]);
            handleFieldChange('_prestazioniAggiuntive', updated);
            return updated;
        });

        // P72_15: Crea AppuntamentoPrestazione per generare movimenti contabili (ENTRATA + USCITA).
        // Condizioni: visita non nuova, appuntamento noto, prestazioneId è un UUID valido (non temp).
        // P72_19+: skip per questionari compilati — billing già gestito da QuestionarioMedicoService
        const appId = appuntamento?.id;
        const isRealUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemToAdd.id);
        if (!isNew && appId && isRealUuid && !itemToAdd.appPrestazioneId && !itemToAdd.isQuestionario) {
            appuntamentoPrestazioniApi.create(appId, [{
                prestazioneId: itemToAdd.id,
                medicoRefertanteId: itemToAdd.medicoRefertanteId || appuntamento?.medicoId || undefined,
            }], visitaId ?? undefined).then(created => {
                const createdItem = created?.[0];
                const appPrestId = createdItem?.id;
                if (appPrestId) {
                    setPrestazioniAggiuntive(prev => {
                        const updated = prev.map(p =>
                            p.id === itemToAdd.id
                                ? { ...p, appPrestazioneId: appPrestId, visitaSecondariaId: createdItem.visitaSecondariaId ?? undefined, createdDuringVisit: true }
                                : p
                        );
                        // P72_17: Persist appPrestazioneId in datiStrutturati so removal works after reload
                        handleFieldChange('_prestazioniAggiuntive', updated);
                        return updated;
                    });
                }
            }).catch(() => { /* Non bloccare il flusso */ });
        }
    }, [handleFieldChange, isNew, appuntamento?.id, appuntamento?.medicoId, visitaId]);

    // R17: Auto-add from tariffario is handled exclusively via onPrestazioneSuggerita callback
    // in QuestionariModal (compile + firma paths). This avoids duplicates on re-renders.

    // Handler per rimuovere prestazione aggiuntiva
    const handleRemovePrestazione = useCallback((prestazioneId: string) => {
        // P72_15: Se la prestazione ha un AppuntamentoPrestazioni associato, eliminalo
        // (il backend annullerà anche i movimenti contabili collegati)
        const itemToRemove = prestazioniAggiuntive.find(p => p.id === prestazioneId || p.appPrestazioneId === prestazioneId);
        if (itemToRemove?.appPrestazioneId) {
            appuntamentoPrestazioniApi.delete(itemToRemove.appPrestazioneId)
                .catch(() => { /* Non bloccare il flusso */ });
        }
        // P72_22: Per questionari, annulla movimenti contabili senza eliminare il documento
        if (itemToRemove?.isQuestionario && itemToRemove.id) {
            questionariService.annullaMovimentiCompilato(itemToRemove.id)
                .catch(() => { /* Non bloccare il flusso */ });
        }

        setPrestazioniAggiuntive(prev => {
            const updated = prev.filter(p => p.id !== prestazioneId && p.appPrestazioneId !== prestazioneId);
            handleFieldChange('_prestazioniAggiuntive', updated);
            return updated;
        });
    }, [prestazioniAggiuntive, handleFieldChange]);

    // ============================================
    // CODICI SCONTO MANAGEMENT
    // (Must be declared BEFORE handleChangeConvenzione which references it)
    // ============================================
    const [codiciScontoApplicati, setCodiciScontoApplicati] = useState<Array<{
        codice: string;
        descrizione?: string;
        scontoPercentuale?: number;
        scontoFisso?: number;
    }>>([]);

    // Initialize from visita datiStrutturati
    useEffect(() => {
        if (visita?.datiStrutturati) {
            const dati = visita.datiStrutturati as Record<string, unknown>;
            if (Array.isArray(dati._codiciSconto)) {
                setCodiciScontoApplicati(dati._codiciSconto);
            }
        }
    }, [visita?.datiStrutturati]);

    // ============================================
    // CONVENZIONE HANDLER (Session #16)
    // Updates both local state and appuntamento
    // ============================================
    const handleChangeConvenzione = useCallback(async (convenzioneId: string | null) => {
        if (!appuntamento?.id) return;

        try {
            // Update local state immediately for UI responsiveness
            setSelectedConvenzioneId(convenzioneId);

            // Update appuntamento in backend
            await appuntamentiApi.update(appuntamento.id, {
                convenzioneId: convenzioneId || undefined
            });

            // Invalidate cache to refresh appuntamento data
            queryClient.invalidateQueries({ queryKey: ['appuntamento', appuntamento.id] });

            // Auto-retrieve codice sconto from convenzione's condizioni
            if (convenzioneId) {
                const conv = convenzioniDisponibili.find(c => c.id === convenzioneId) ||
                    (appuntamento?.convenzione?.id === convenzioneId ? {
                        id: convenzioneId,
                        nome: appuntamento.convenzione.nome,
                        tipo: 'convenzione',
                        codiceSconto: typeof (appuntamento.convenzione.condizioni as any)?.codiceSconto === 'string'
                            ? (appuntamento.convenzione.condizioni as any).codiceSconto
                            : undefined,
                        ...extractConvenzioneDiscount(appuntamento.convenzione.condizioni as Record<string, unknown> | null)
                    } : null);

                // Try to fetch full convenzione details for codice sconto
                try {
                    const convDetails = await convenzioniApi.getById(convenzioneId);
                    const condizioni = convDetails?.condizioni || {};
                    const convenzioneDiscount = extractConvenzioneDiscount(condizioni as Record<string, unknown> | null);
                    if (
                        condizioni.codiceSconto
                        && typeof condizioni.codiceSconto === 'string'
                        && !convenzioneDiscount.scontoPercentuale
                        && !convenzioneDiscount.scontoFisso
                    ) {
                        // Auto-apply the convenzione's codice sconto if not already applied
                        const codice = condizioni.codiceSconto;
                        if (!codiciScontoApplicati.some(cs => cs.codice === codice)) {
                            // Validate codice sconto via API to get actual tipo/valore from DB
                            try {
                                const result = await scontiApi.validate({
                                    codice,
                                    prezzoBase: prestazionePrincipale?.prezzo || 0,
                                    prestazioneId: prestazionePrincipale?.id
                                });

                                if (result.valid && result.sconto) {
                                    const tipoSconto = (result.sconto.tipo as string || '').toUpperCase();
                                    const newSconto = {
                                        codice: result.sconto.codice || codice,
                                        descrizione: result.sconto.descrizione || `Sconto ${conv?.nome || 'convenzione'}`,
                                        scontoPercentuale: (tipoSconto === 'PERCENTUALE' || tipoSconto === 'PERCENTUALE')
                                            ? result.sconto.valore : undefined,
                                        scontoFisso: (tipoSconto === 'VALORE_ASSOLUTO' || tipoSconto === 'FISSO')
                                            ? result.sconto.valore : undefined
                                    };
                                    const newList = [...codiciScontoApplicati, newSconto];
                                    setCodiciScontoApplicati(newList);
                                    handleFieldChange('_codiciSconto', newList);
                                }
                            } catch {
                                // Validation failed — fallback to condizioni values
                                const newSconto = {
                                    codice,
                                    descrizione: `Sconto ${conv?.nome || 'convenzione'}`,
                                    ...extractConvenzioneDiscount(condizioni as Record<string, unknown> | null)
                                };
                                if (newSconto.scontoPercentuale || newSconto.scontoFisso) {
                                    const newList = [...codiciScontoApplicati, newSconto];
                                    setCodiciScontoApplicati(newList);
                                    handleFieldChange('_codiciSconto', newList);
                                }
                            }
                        }
                    }
                } catch {
                    // Convenzione detail fetch failed — no auto-apply, just the percentage
                }
            } else {
                // Convenzione removed — clear auto-applied sconti from convenzione
                // (keep manually-added ones)
                const condizioniConvenzioneCorrente = appuntamento?.convenzione?.condizioni as any;
                const codiceConvenzione = typeof condizioniConvenzioneCorrente?.codiceSconto === 'string'
                    ? String(condizioniConvenzioneCorrente.codiceSconto).toUpperCase()
                    : '';
                const filtered = codiciScontoApplicati.filter(sconto =>
                    String(sconto.codice || '').toUpperCase() !== codiceConvenzione
                    && !/convenzione/i.test(`${sconto.descrizione || ''} ${sconto.codice || ''}`)
                );
                if (filtered.length !== codiciScontoApplicati.length) {
                    setCodiciScontoApplicati(filtered);
                    handleFieldChange('_codiciSconto', filtered);
                }
            }

            showToast({
                type: 'success',
                message: convenzioneId ? 'Convenzione associata' : 'Convenzione rimossa'
            });
        } catch (error) {
            // Revert on error
            setSelectedConvenzioneId(appuntamento?.convenzione?.id || null);
            showToast({
                type: 'error',
                message: 'Errore nell\'aggiornamento della convenzione'
            });
        }
    }, [appuntamento?.id, appuntamento?.convenzione, convenzioniDisponibili, codiciScontoApplicati, handleFieldChange, queryClient, showToast, prestazionePrincipale]);

    // ============================================
    // PRIMA VISITA / CONTROLLO TOGGLE
    // ============================================
    const handleTogglePrimaVisita = useCallback(async (isPrimaVisita: boolean) => {
        if (!visitaId) return;
        try {
            await visiteApi.update(visitaId, { isPrimaVisita } as any);
            queryClient.invalidateQueries({ queryKey: ['visita', visitaId] });
            showToast({
                type: 'success',
                message: isPrimaVisita ? 'Impostata come prima visita' : 'Impostata come controllo'
            });
        } catch (err) {
            showToast({ type: 'error', message: 'Errore nell\'aggiornamento' });
        }
    }, [visitaId, queryClient, showToast]);

    // Handler per cambio tipo visita MDL (P56)
    const handleChangeTipoVisita = useCallback(async (tipo: string) => {
        if (!visitaId) return;
        try {
            await visiteApi.update(visitaId, { tipoVisitaMDL: tipo || null } as any);
            queryClient.invalidateQueries({ queryKey: ['visita', visitaId] });
            showToast({ type: 'success', message: 'Tipo visita aggiornato' });
        } catch {
            showToast({ type: 'error', message: 'Errore aggiornamento tipo visita' });
        }
    }, [visitaId, queryClient, showToast]);

    // ============================================
    // UPDATE PRESTAZIONE AGGIUNTIVA (medico refertante, a carico)
    // ============================================
    const handleUpdatePrestazione = useCallback((prestazioneId: string, updates: Partial<PrestazioneItem>) => {
        // P72: Persist medicoRefertanteId change to DB so MovimentoContabileGenerator picks up correct medico at completion
        if (updates.medicoRefertanteId !== undefined) {
            const existing = prestazioniAggiuntive.find(p => p.id === prestazioneId);
            if (existing?.appPrestazioneId && updates.medicoRefertanteId) {
                appuntamentoPrestazioniApi.assignMedicoRefertante(existing.appPrestazioneId, updates.medicoRefertanteId)
                    .catch(() => { /* Non bloccare il flusso */ });
            }
        }
        if (updates.statoAppPrestazione !== undefined || updates.esecuzioneStatus !== undefined) {
            const existing = prestazioniAggiuntive.find(p => p.id === prestazioneId);
            const targetStato = updates.statoAppPrestazione
                ?? (updates.esecuzioneStatus === 'NON_ESEGUITA'
                    ? 'ANNULLATA'
                    : updates.esecuzioneStatus === 'IN_ATTESA_REFERTO'
                        ? 'IN_ATTESA_REFERTO'
                        : updates.esecuzioneStatus === 'ESEGUITA'
                            ? 'ESEGUITA'
                            : undefined);
            const appPrestazioneActionId = existing?.appPrestazioneId || existing?.id;
            if (appPrestazioneActionId && targetStato) {
                appuntamentoPrestazioniApi.updateStato(appPrestazioneActionId, targetStato, {
                    applyNormalPreset: targetStato === 'ESEGUITA',
                    visitaParentId: visitaId ?? undefined
                })
                    .then(() => {
                        queryClient.invalidateQueries({ queryKey: ['appuntamento', appuntamento?.id] });
                        queryClient.invalidateQueries({ queryKey: ['prestazioni-da-refertare-list'] });
                        queryClient.invalidateQueries({ queryKey: ['prestazioni-da-refertare-count'] });
                        queryClient.invalidateQueries({ queryKey: ['visite'] });
                        queryClient.invalidateQueries({ queryKey: ['visite-count'] });
                    })
                    .catch(() => {
                        setPrestazioniAggiuntive(prev => prev.map(p => p.id === prestazioneId ? existing : p));
                        showToast({ type: 'error', message: 'Errore aggiornamento stato prestazione' });
                    });
            }
        }
        setPrestazioniAggiuntive(prev => {
            const updated = prev.map(p =>
                p.id === prestazioneId ? { ...p, ...updates } : p
            );
            handleFieldChange('_prestazioniAggiuntive', updated);
            return updated;
        });
    }, [handleFieldChange, prestazioniAggiuntive, queryClient, appuntamento?.id, showToast]);

    const handleOpenVisitaSecondaria = useCallback(async (prestazioneItem: PrestazioneItem) => {
        if (prestazioneItem.visitaSecondariaId) {
            setSelectedSecondaryVisitId(prestazioneItem.visitaSecondariaId);
            return;
        }
        try {
            const appPrestazioneActionId = prestazioneItem.appPrestazioneId || prestazioneItem.id;
            const result = await appuntamentoPrestazioniApi.ensureVisitaSecondaria(
                appPrestazioneActionId,
                visitaId ?? undefined
            );
            const secondaryId = result?.visitaSecondariaId || result?.visita?.id;
            if (!secondaryId) {
                throw new Error('Visita secondaria non restituita');
            }

            setPrestazioniAggiuntive(prev => {
                const updated = prev.map(p =>
                    p.appPrestazioneId === prestazioneItem.appPrestazioneId || p.id === prestazioneItem.id
                        ? { ...p, appPrestazioneId: result?.appPrestazioneId || appPrestazioneActionId, visitaSecondariaId: secondaryId }
                        : p
                );
                handleFieldChange('_prestazioniAggiuntive', updated);
                return updated;
            });

            queryClient.invalidateQueries({ queryKey: ['appuntamento', appuntamento?.id] });
            queryClient.invalidateQueries({ queryKey: ['visita', visitaId] });
            setSelectedSecondaryVisitId(secondaryId);
        } catch {
            showToast({
                type: 'error',
                message: 'Non riesco ad aprire la scheda accertamento'
            });
        }
    }, [appuntamento?.id, handleFieldChange, queryClient, showToast, visitaId]);

    const handleAddCodiceSconto = useCallback(async (codice: string) => {
        // Check if already applied
        if (codiciScontoApplicati.some(cs => cs.codice === codice)) {
            showToast({ type: 'warning', message: 'Codice sconto già applicato' });
            return;
        }

        try {
            // Validate via API
            const result = await scontiApi.validate({
                codice,
                prezzoBase: prestazionePrincipale?.prezzo || 0,
                prestazioneId: prestazionePrincipale?.id
            });

            if (!result.valid) {
                showToast({
                    type: 'error',
                    message: result.errors?.[0] || 'Codice sconto non valido'
                });
                return;
            }

            const tipoSconto = ((result.sconto?.tipo as string) || '').toUpperCase();
            const newSconto = {
                codice: result.sconto?.codice || codice,
                descrizione: result.sconto?.descrizione,
                scontoPercentuale: (tipoSconto === 'PERCENTUALE')
                    ? result.sconto?.valore : undefined,
                scontoFisso: (tipoSconto === 'VALORE_ASSOLUTO' || tipoSconto === 'FISSO')
                    ? result.sconto?.valore : undefined
            };

            const newList = [...codiciScontoApplicati, newSconto];
            setCodiciScontoApplicati(newList);
            handleFieldChange('_codiciSconto', newList);

            showToast({ type: 'success', message: `Codice sconto ${codice} applicato` });
        } catch (error) {
            showToast({ type: 'error', message: 'Errore nella validazione del codice sconto' });
        }
    }, [codiciScontoApplicati, showToast, prestazionePrincipale, handleFieldChange]);

    const handleRemoveCodiceSconto = useCallback((codice: string) => {
        const newList = codiciScontoApplicati.filter(cs => cs.codice !== codice);
        setCodiciScontoApplicati(newList);
        handleFieldChange('_codiciSconto', newList);
        showToast({ type: 'info', message: `Codice sconto ${codice} rimosso` });
    }, [codiciScontoApplicati, handleFieldChange, showToast]);

    // Initialize expanded sections from template
    useEffect(() => {
        if (sections.length > 0) {
            const initialExpanded = new Set(
                sections
                    .filter(s => s.isExpanded)
                    .map(s => s.section)
            );
            setExpandedSections(initialExpanded);
        }
    }, [sections]);

    const toggleExpanded = useCallback((sectionId: string) => {
        setExpandedSections(prev => {
            const newSet = new Set(prev);
            if (newSet.has(sectionId)) {
                newSet.delete(sectionId);
            } else {
                newSet.add(sectionId);
            }
            return newSet;
        });
    }, []);

    const embeddedSections = useMemo(() => {
        if (!isEmbeddedVisit) return sections;
        const fullWidthTypes = new Set(['TEXTAREA', 'RICHTEXT', 'RICH_TEXT', 'DOCUMENT_UPLOAD', 'STRUMENTARIO_IMPORT', 'CHART', 'MULTI_CHOICE']);
        return sections.map(section => {
            let row = 0;
            let col = 0;
            return {
                ...section,
                fields: section.fields.map(field => {
                    const width = fullWidthTypes.has(String(field.type)) ? 12 : 6;
                    if (width === 12 && col !== 0) {
                        row += 1;
                        col = 0;
                    }
                    const position = { ...(field.position || {}), row, col };
                    const size = { ...(field.size || {}), width, height: field.size?.height || 1 };
                    if (width === 12) {
                        row += 1;
                        col = 0;
                    } else {
                        col = col === 0 ? 6 : 0;
                        if (col === 0) row += 1;
                    }
                    return { ...field, position, size };
                })
            };
        });
    }, [isEmbeddedVisit, sections]);

    const embeddedUsesTabs = isEmbeddedVisit
        && template?.sidebarConfig?.sectionLayout === 'tabs'
        && embeddedSections.length > 1;

    useEffect(() => {
        if (!isEmbeddedVisit || embeddedSections.length === 0) return;
        const currentStillVisible = embeddedActiveSection
            && embeddedSections.some(section => section.section === embeddedActiveSection);
        if (!currentStillVisible) {
            const defaultTab = template?.sidebarConfig?.defaultTab;
            const defaultSection = embeddedSections.find(section => section.section === defaultTab);
            setEmbeddedActiveSection(defaultSection?.section || embeddedSections[0].section);
        }
    }, [embeddedActiveSection, embeddedSections, isEmbeddedVisit, template?.sidebarConfig?.defaultTab]);

    const embeddedVisibleSections = useMemo(() => {
        if (!embeddedUsesTabs) return embeddedSections;
        return embeddedSections.filter(section => section.section === embeddedActiveSection);
    }, [embeddedActiveSection, embeddedSections, embeddedUsesTabs]);

    const embeddedNormalPresetEntries = useMemo(() => {
        const entries: Array<readonly [string, unknown]> = [];
        embeddedSections.forEach(section => {
            section.fields.forEach(field => {
                const metadata = field.metadata as { normalPreset?: unknown } | undefined;
                if (metadata?.normalPreset !== undefined) {
                    entries.push([field.name, metadata.normalPreset] as const);
                }
            });
        });
        return entries;
    }, [embeddedSections]);

    const handleApplyEmbeddedNormality = useCallback(() => {
        embeddedNormalPresetEntries.forEach(([fieldName, normalValue]) => {
            handleFieldChange(fieldName, normalValue);
        });
        showToast({
            type: 'success',
            message: 'Valori di normalità applicati'
        });
    }, [embeddedNormalPresetEntries, handleFieldChange, showToast]);

    // ============================================
    // CREATE NEW VISIT
    // ============================================
    const createVisitMutation = useMutation({
        mutationFn: async () => {
            if (!appuntamento || !paziente) {
                throw new Error('Dati appuntamento mancanti');
            }

            // Create visita with required fields only
            // Note: Backend may require additional fields via body, not all are on TS interface
            return visiteApi.create({
                appuntamentoId: appuntamento.id,
                pazienteId: paziente.id,
                medicoId: appuntamento.medicoId,
                prestazioneId: appuntamento.prestazioneId || '',
                stato: 'IN_CORSO',
                datiStrutturati: {}
            } as Parameters<typeof visiteApi.create>[0]);
        },
        onSuccess: (newVisita) => {
            showToast({ message: 'Visita creata', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['visite'] });
            navigate(`/poliambulatorio/visite/${newVisita.id}`, { replace: true });
        },
        onError: (err: Error) => {
            showToast({ message: 'Errore del server', type: 'error' });
        }
    });

    // Auto-create visit when ready
    useEffect(() => {
        if (isNew && appuntamento && paziente && !createVisitMutation.isPending) {
            createVisitMutation.mutate();
        }
    }, [isNew, appuntamento, paziente, createVisitMutation]);

    // ============================================
    // TIMER HANDLERS
    // ============================================
    const handleStartTimer = useCallback(() => {
        startTimer();
        if (visitaId && visita?.stato !== 'IN_CORSO') {
            visiteApi.inizia(visitaId).catch(() => { });
        }
    }, [startTimer, visitaId, visita?.stato]);

    const handleStopTimer = useCallback(() => {
        // Show exit dialog instead of confirm() — user chooses save-complete/save-draft/discard
        setIsExitDialogOpen(true);
        setPendingNavigationPath(null);
    }, [setIsExitDialogOpen]);

    // ============================================
    // TIMER VISIBILITY (from template settings)
    // ============================================
    const [showTimer, setShowTimer] = useState(true);

    useEffect(() => {
        // Initialize from template config if available
        if (template?.sidebarConfig?.showTimer !== undefined) {
            setShowTimer(template.sidebarConfig.showTimer);
        }
    }, [template?.sidebarConfig?.showTimer]);

    const toggleTimerVisibility = useCallback(() => {
        setShowTimer(prev => !prev);
    }, []);

    // ============================================
    // QUICK ACTIONS HANDLERS
    // ============================================
    const handleViewHistory = useCallback(() => {
        if (paziente?.id) {
            // Navigate to patient's clinical folder with history tab
            navigate(`/poliambulatorio/pazienti/${paziente.id}?tab=visite`);
        }
    }, [paziente?.id, navigate]);

    const handleViewEsamiMicrobio = useCallback(() => {
        if (paziente?.id) {
            // Navigate to patient's microbiological exams
            navigate(`/poliambulatorio/pazienti/${paziente.id}?tab=esami-microbiologici`);
        }
    }, [paziente?.id, navigate]);

    const handleViewModulistica = useCallback(() => {
        // Open Modulistica modal instead of navigating away
        setIsModulisticaModalOpen(true);
    }, []);

    // P61: Handler per aprire il modal dei Questionari Medici
    const handleViewQuestionari = useCallback(() => {
        setIsQuestionariModalOpen(true);
    }, []);

    const handleViewRevisions = useCallback(() => {
        // Scroll to and expand the "Storico Visita" section in QuickActions sidebar
        // The sidebar already shows revisions inline — this is a no-op scroll hint
    }, []);

    // ============================================
    // INLINE CHART HANDLER (Session #13b / Fix S59)
    // Opens full chart view for a specific parameter
    // Navigates to patient's CartellaPaziente → tab trend
    // ============================================
    const handleOpenFullChart = useCallback((fieldName: string) => {
        if (!paziente?.id) {
            // Fallback: try to get pazienteId from visita data
            const fallbackPazienteId = visita?.pazienteId;
            if (fallbackPazienteId) {
                navigate(`/poliambulatorio/pazienti/${fallbackPazienteId}?tab=trend&field=${fieldName}`);
                return;
            }
            showToast({ message: 'Dati paziente non ancora caricati. Riprova tra un momento.', type: 'warning' });
            return;
        }
        navigate(`/poliambulatorio/pazienti/${paziente.id}?tab=trend&field=${fieldName}`);
    }, [paziente?.id, visita?.pazienteId, navigate, showToast]);

    // ============================================
    // ACCESS CONTROL HANDLER
    // ============================================
    const handleAccessControlChange = useCallback((config: AccessControlConfig) => {
        setAccessControl(config);
        // Mark form as dirty so it gets saved
        // The accessControl will be included in the save payload
    }, []);

    // ============================================
    // REFERTO PDF HANDLER
    // Opens the generated PDF referto in a new tab
    // If no PDF exists, shows an error message
    // ============================================
    const handleOpenReferto = useCallback(async (): Promise<string | undefined> => {
        if (!visitaId) {
            showToast({ message: 'Visita non ancora salvata', type: 'error' });
            return undefined;
        }

        try {
            const refertoPdf = await visiteApi.getRefertoPdf(visitaId);

            if (!refertoPdf || !refertoPdf.fileUrl) {
                showToast({
                    message: 'Nessun referto PDF disponibile. Salva la visita per generare il referto.',
                    type: 'warning'
                });
                return undefined;
            }

            // Open PDF in new tab with display filename as title
            const newWindow = window.open(refertoPdf.fileUrl, '_blank');
            if (newWindow) {
                newWindow.document.title = refertoPdf.displayFilename || 'Referto';
            }
            return refertoPdf.fileUrl;
        } catch (error) {
            showToast({
                message: 'Errore nel recupero del referto PDF',
                type: 'error'
            });
            return undefined;
        }
    }, [visitaId, showToast]);

    // Handler: apri PDF Giudizio di Idoneità (per lavoratore)
    const handleOpenGiudizioPdf = useCallback(async () => {
        if (!visitaId || !paziente?.id) {
            showToast({ message: 'Dati visita non disponibili', type: 'error' });
            return;
        }
        try {
            const giudiziResult = await giudiziIdoneitaApi.getAll({ personId: paziente.id, limit: 100 } as Parameters<typeof giudiziIdoneitaApi.getAll>[0]);
            const giudizi = (giudiziResult as any)?.data ?? giudiziResult ?? [];
            const giudizio = Array.isArray(giudizi)
                ? giudizi.find((g: GiudizioIdoneita) => g.visitaId === visitaId)
                : null;
            if (!giudizio?.id) {
                showToast({ message: 'Nessun giudizio di idoneità trovato per questa visita', type: 'warning' });
                return;
            }
            // P73: Fetch PDF con auth token via blob (window.open non invia Authorization header)
            const pdfUrl = giudiziIdoneitaApi.getPdfUrl(giudizio.id, 'lavoratore');
            const token = getToken();
            if (!token) {
                showToast({ message: 'Sessione scaduta, effettua nuovamente il login', type: 'error' });
                return;
            }
            const response = await fetch(pdfUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Frontend-Id': import.meta.env.VITE_BRAND_ID || 'element-medica',
                    ...(localStorage.getItem('tenantMode.operateTenantId')
                        ? { 'X-Operate-Tenant-Id': localStorage.getItem('tenantMode.operateTenantId')! }
                        : {}),
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
        } catch {
            showToast({ message: 'Errore nel recupero del PDF giudizio', type: 'error' });
        }
    }, [visitaId, paziente?.id, showToast]);

    // ============================================
    // LOADING STATE
    // ============================================
    if (isLoading || createVisitMutation.isPending) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 text-teal-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Caricamento visita...</p>
                </div>
            </div>
        );
    }

    // ============================================
    // ERROR STATE
    // ============================================
    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl border border-red-200 p-8 max-w-md text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Errore</h2>
                    <p className="text-gray-600 mb-6">Si è verificato un errore nel caricamento della visita. Riprova o contatta il supporto.</p>
                    <button
                        onClick={goBack}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Torna indietro
                    </button>
                </div>
            </div>
        );
    }

    // ============================================
    // NO PATIENT STATE
    // ============================================
    if (!paziente) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl border border-amber-200 p-8 max-w-md text-center">
                    <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Paziente non trovato</h2>
                    <p className="text-gray-600 mb-6">
                        Non è stato possibile recuperare i dati del paziente.
                    </p>
                    <button
                            onClick={goBack}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Torna indietro
                    </button>
                </div>
            </div>
        );
    }

    // Determine section layout from template
    // - 'tabs': sidebar with tab navigation - shows ONLY active section
    // - 'sections': sidebar with sections + ALL sections rendered continuously with headers
    // - 'continuous': ALL sections rendered continuously WITHOUT headers
    const sectionLayout = template?.sidebarConfig?.sectionLayout || 'tabs';

    if (isEmbeddedVisit) {
        const prestazioneNome = prestazione?.nome || visita?.prestazione?.nome || 'Accertamento';
        const isCompletedSecondary = visita?.stato === 'COMPLETATA';
        const isEditingSecondary = embeddedEditSession || (!isReadonly && !isCompletedSecondary);
        return (
            <div className="min-h-full bg-slate-50">
                <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{prestazioneNome}</p>
                            <p className="text-xs text-slate-500">
                                Scheda compatta. Usa "Compila normalità" per inserire rapidamente i valori nella norma.
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            {isEditingSecondary && embeddedNormalPresetEntries.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleApplyEmbeddedNormality}
                                    disabled={!!completionPhase}
                                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                                >
                                    Compila Normalità
                                </button>
                            )}
                            {!isEditingSecondary ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEmbeddedEditSession(true);
                                        void handleNuovaVersioneClick();
                                    }}
                                    className="rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                                >
                                    Modifica
                                </button>
                            ) : (
                                <>
                                    <button
	                                        type="button"
	                                        onClick={handleEmbeddedCancel}
	                                        disabled={!!completionPhase}
	                                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
	                                    >
                                        Annulla
                                    </button>
                                    <button
	                                        type="button"
	                                        onClick={() => void handleCompleteWithFirmaCheck()}
	                                        disabled={!!completionPhase}
	                                        className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
	                                    >
                                        Salva e completa
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <main className="mx-auto max-w-none space-y-2 p-2">
                    {isLoadingTemplate ? (
                        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                            <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-teal-600" />
                            <p className="text-sm text-slate-500">Caricamento template...</p>
                        </div>
                    ) : embeddedSections.length === 0 ? (
                        <div className="rounded-xl border border-amber-200 bg-white p-8 text-center">
                            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-amber-500" />
                            <p className="text-sm font-semibold text-slate-900">Template non configurato</p>
                            <p className="mt-1 text-xs text-slate-500">Non ci sono campi disponibili per questa prestazione.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {embeddedUsesTabs && (
                                <div className="inline-flex max-w-full flex-wrap gap-1 rounded-2xl border border-teal-100 bg-white/90 p-1.5 shadow-sm shadow-teal-900/5 ring-1 ring-slate-100">
                                    {embeddedSections.map(section => (
                                        <button
                                            key={section.section}
                                            type="button"
                                            onClick={() => setEmbeddedActiveSection(section.section)}
                                            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${embeddedActiveSection === section.section
                                                ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/20'
                                                : 'text-slate-600 hover:bg-teal-50 hover:text-teal-700'
                                                }`}
                                        >
                                            {section.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {embeddedVisibleSections.map(section => (
                                <div key={section.section} className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
                                    <FormSection
                                        section={section}
                                        values={values}
                                        errors={validation.errors}
                                        onChange={handleFieldChange}
                                        isExpanded={true}
                                        onToggleExpand={() => { }}
                                        layout="continuous"
                                        compact
                                        showNormalPresetButton={false}
                                        disabled={!isEditingSecondary}
                                        pazienteId={paziente?.id}
                                        onOpenFullChart={handleOpenFullChart}
                                        visitaId={visitaId ?? undefined}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* ========== EXIT VISIT DIALOG (Session #14 - Fixed) ========== */}
            <ExitVisitDialog
                isOpen={isExitDialogOpen}
                onClose={() => {
                    setIsExitDialogOpen(false);
                    setPendingNavigationPath(null);
                }}
                onAction={handleExitAction}
                hasUnsavedChanges={autosave.isDirty || isNew}
                canComplete={validation.isValid}
                isLoading={isExitActionLoading}
                isNuovaVersione={visita?.revisions?.some((r: { changeType?: string }) => r.changeType === 'NEW_VERSION')}
            />

            {isNonEseguiteWarningOpen && (
                <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-start gap-3 border-b border-red-100 bg-red-50 px-5 py-4">
                            <div className="mt-0.5 rounded-full bg-red-100 p-2 text-red-600">
                                <AlertCircle className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-base font-semibold text-slate-900">Accertamenti non eseguiti</h3>
                                <p className="mt-1 text-sm text-slate-600">
                                    Ci sono prestazioni segnate come non eseguite o ancora da completare. Completando la visita, i relativi movimenti contabili verranno trattati come non eseguibili.
                                </p>
                            </div>
                        </div>
                        <div className="space-y-2 px-5 py-4">
                            {prestazioniNonEseguite.slice(0, 6).map(p => (
                                <div key={p.appPrestazioneId || p.id} className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50/60 px-3 py-2 text-sm">
                                    <span className="font-medium text-slate-800">{p.nome}</span>
                                    <span className="text-xs font-semibold text-red-600">Da verificare</span>
                                </div>
                            ))}
                            {prestazioniNonEseguite.length > 6 && (
                                <p className="text-xs text-slate-500">+{prestazioniNonEseguite.length - 6} altre prestazioni</p>
                            )}
                        </div>
                        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setIsNonEseguiteWarningOpen(false)}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Rivedi prestazioni
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    bypassNonEseguiteWarningRef.current = true;
                                    setIsNonEseguiteWarningOpen(false);
                                    void handleCompleteWithFirmaCheck();
                                }}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                            >
                                Completa comunque
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========== MODULISTICA MODAL (Session #13, #53 inline compilation) ========== */}
            <ModulisticaModal
                isOpen={isModulisticaModalOpen}
                onClose={() => setIsModulisticaModalOpen(false)}
                pazienteId={paziente?.id || ''}
                visitaId={visitaId || undefined}
                prestazioneId={visita?.prestazioneId}
                medicoId={visita?.medicoId}
                pazienteNome={paziente ? `${paziente.firstName} ${paziente.lastName}` : undefined}
                readOnly={isReadonly}
                onDocumentoCompletato={() => {
                    queryClient.invalidateQueries({ queryKey: ['documenti-da-compilare'] });
                    queryClient.invalidateQueries({ queryKey: ['questionari-visita', visitaId] });
                    refetch();
                    // Auto-expand modulistica section in Azioni Rapide
                    setAutoExpandSection('modulistica');
                }}
            />

            {/* ========== P61: QUESTIONARI MEDICI MODAL ========== */}
            <QuestionariModal
                isOpen={isQuestionariModalOpen}
                onClose={() => setIsQuestionariModalOpen(false)}
                pazienteId={paziente?.id || ''}
                visitaId={visitaId || undefined}
                tipoVisitaMDL={visita?.tipoVisitaMDL}
                codiciRischio={[]}
                pazienteNome={paziente ? `${paziente.firstName} ${paziente.lastName}` : undefined}
                medicoId={visita?.medicoId}
                readOnly={isReadonly}
                companyTenantProfileId={
                    (appuntamento as any)?.companyTenantProfileId
                    || (paziente as any)?.companyTenantProfileId           // normalizePerson appiana questo al top level
                    || (paziente as any)?.currentProfile?.companyTenantProfileId
                    || (paziente as any)?.tenantProfiles?.[0]?.companyTenantProfileId
                    || null
                }
                onPrestazioneSuggerita={(data) => {
                    // P72_18: Voci tipo QUESTIONAIRE — billing gestito dal backend.
                    // P72_19+: mostra comunque il questionario nel Piano e nella card Prestazioni.
                    if (!data.prestazioneId && data.compilatoId) {
                        // Aggiungi il questionario come voce di display (isQuestionario: true → no billing duplicato)
                        const alreadyPresent = prestazioniAggiuntive.some(
                            p => p.id === data.compilatoId || (p.isQuestionario && p.nome === data.nome)
                        );
                        if (!alreadyPresent) {
                            handleAddPrestazione({
                                id: data.compilatoId,
                                codice: '',
                                nome: data.nome || 'Questionario compilato',
                                prezzo: data.prezzoBase || 0,
                                aCaricoTipo: 'azienda' as const,
                                isQuestionario: true,
                                esecuzioneStatus: 'ESEGUITA',
                                statoQuestionario: 'COMPLETATO',
                                // P72_23: salva per creare ScadenzaPrestazioneProtocollo dopo la visita
                                documentoTemplateId: data.documentoTemplateId,
                                periodicitaMesi: data.periodicitaMesi ?? 0
                            });
                        }
                        return;
                    }
                    if (!data.prestazioneId) {
                        // Nessun compilatoId e nessun prestazioneId — nulla da fare
                        return;
                    }
                    const nome = data.nome || 'Prestazione';
                    const alreadyPresent = prestazioniAggiuntive.some(
                        p => p.id === data.prestazioneId || p.nome === nome
                    );
                    if (!alreadyPresent) {
                        handleAddPrestazione({
                            id: data.prestazioneId,
                            codice: '',
                            nome,
                            prezzo: data.prezzoBase,
                            aCaricoTipo: 'azienda' as const
                        });
                    }
                }}
                onQuestionarioCompletato={(questionarioId) => {
                    // Refresh data quando un questionario viene completato
                    queryClient.invalidateQueries({ queryKey: ['questionari-visita', visitaId] });
                    refetch();
                    // Auto-expand questionari section in Azioni Rapide
                    setAutoExpandSection('questionari');
                }}
            />

            {/* ========== VISITA VIEW MODAL (Session #16) ========== */}
            {selectedVisitaIdForView && (
                <VisitaViewModal
                    visitaId={selectedVisitaIdForView}
                    isOpen={isVisitaViewModalOpen}
                    onClose={() => {
                        setIsVisitaViewModalOpen(false);
                        setSelectedVisitaIdForView(null);
                    }}
                />
            )}

            {selectedSecondaryVisitId && (
                <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                            <div>
                                <p className="text-sm font-semibold text-slate-800">Visita secondaria</p>
                                <p className="text-xs text-slate-500">Compilazione della prestazione collegata senza uscire dalla visita principale</p>
                            </div>
                            <button
                                type="button"
                                onClick={handleCloseSecondaryVisitModal}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                title="Chiudi"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <iframe
                            ref={secondaryVisitFrameRef}
                            src={`/poliambulatorio/visite-embedded/${selectedSecondaryVisitId}?embedded=1`}
                            className="min-h-0 flex-1 border-0"
                            title="Visita secondaria"
                        />
                    </div>
                </div>
            )}

            {selectedEsameStrumentale && (
                <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                            <div>
                                <p className="text-sm font-semibold text-slate-800">Dati importati dal dispositivo</p>
                                <p className="text-xs text-slate-500">
                                    {selectedEsameStrumentale.tipoEsame || 'Esame strumentale'}
                                    {selectedEsameStrumentale.dataEsame ? ` · ${new Date(selectedEsameStrumentale.dataEsame).toLocaleDateString('it-IT')}` : ''}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedEsameStrumentale(null)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                title="Chiudi"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="max-h-[70vh] overflow-y-auto p-4">
                            {selectedEsameStrumentale.risultati?.length ? (
                                <div className="space-y-2">
                                    {selectedEsameStrumentale.risultati.map((r, idx) => (
                                        <div key={r.testId || `${r.testName}-${idx}`} className="grid grid-cols-[1fr_auto] gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                                            <span className="font-medium text-slate-700">{r.testName || r.testId}</span>
                                            <span className="font-semibold text-slate-900">{r.value}{r.unit ? ` ${r.unit}` : ''}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500">Nessun valore numerico importato.</p>
                            )}
                            {selectedEsameStrumentale.findings?.length ? (
                                <div className="mt-4 rounded-lg border border-teal-100 bg-teal-50 p-3 text-sm text-teal-800">
                                    {selectedEsameStrumentale.findings.join(' - ')}
                                </div>
                            ) : null}
                            {typeof selectedEsameStrumentale.metadata?.allegatoVisitaId === 'string' && (
                                <div className="mt-4 flex justify-end">
                                    <a
                                        href={`/api/v1/clinica/documenti/visita/download/${selectedEsameStrumentale.metadata.allegatoVisitaId}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50"
                                    >
                                        Apri PDF importato
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ========== REVISION DIFF MODAL (Session #16) ========== */}
            {selectedRevisionId && (
                <RevisionDiffModal
                    revisionId={selectedRevisionId}
                    revisioni={revisioniEstese}
                    isOpen={isRevisionDiffModalOpen}
                    onClose={() => {
                        setIsRevisionDiffModalOpen(false);
                        setSelectedRevisionId(null);
                    }}
                    currentVisita={visita ? {
                        datiStrutturati: visita.datiStrutturati as Record<string, unknown>,
                        updatedAt: visita.updatedAt
                    } : undefined}
                    activeFieldKeys={sections.flatMap(s => s.fields.map(f => f.name))}
                />
            )}

            {/* ========== QUEUE VIEW MODAL (P61) ========== */}
            {appuntamento?.queueSessionId && (
                <QueueViewModal
                    isOpen={isQueueModalOpen}
                    onClose={() => setIsQueueModalOpen(false)}
                    sessionId={appuntamento.queueSessionId}
                    medicoId={appuntamento.medicoId}
                    currentEntryId={appuntamento.queueEntryId}
                />
            )}

            {/* ========== VISITE COLLEGATE MODAL (P73) ========== */}
            {isVisiteCollegateOpen && visitaId && (
                <VisiteCollegateModal
                    visitaId={visitaId}
                    isVisitaSecundaria={!!(visita as any)?.isVisitaSecundaria}
                    onClose={() => setIsVisiteCollegateOpen(false)}
                />
            )}

            {/* ========== STICKY HEADER with Patient + Actions ========== */}
            <StickyVisitHeader
                paziente={paziente}
                appuntamento={appuntamento || undefined}
                prestazione={prestazione}
                template={template}
                visita={visita}
                visitaId={visitaId}
                autosave={autosave}
                isReadonly={isReadonly}
                completionPhase={completionPhase}
                versioneCorrente={(revisioni?.length || 0) + 1}
                onBack={handleBackClick}
                onSave={handleSaveWithMDLScheduling}
                onComplete={handleCompleteWithFirmaCheck}
                onNuovaVersione={() => handleNuovaVersioneClick()}
                onAnnullaModifiche={async () => {
                    await handleAnnullaModifiche();
                    await refetch();
                }}
                onCreateReferto={handleOpenReferto}
                onOpenGiudizioPdf={handleOpenGiudizioPdf}
                // P61: Queue actions
                onChiamaPaziente={handleChiamaPaziente}
                onRichiamaPaziente={handleRichiamaPaziente}
                onViewQueue={handleViewQueue}
                isQueueLoading={isQueueLoading}
                queueInAttesaCount={queueStats?.inAttesa}
                // ProfiloSalute espandibile nella barra superiore
                personId={paziente.id}
                onEditProfiloSalute={() => setProfiloSaluteModalOpen(true)}
                onEditPatient={() => setPatientEditModalOpen(true)}
                // P74: invio referto via email nel menu Salva e Completa
                invioRefertoMail={invioRefertoMail}
                onInvioRefertoMailChange={(v) => saveInvioRefertoMailMutation.mutate(v)}
                isMDLVisit={isMDLVisit}
                saveInvioMailPending={saveInvioRefertoMailMutation.isPending}
                occupationalSummary={occupationalSummary}
                onEditOccupationalSummary={() => setOccupationalEditModalOpen(true)}
            />

            {/* ========== MAIN CONTENT ========== */}
            {/* Session #17: Reduced padding when sidebar is collapsed for better space usage */}
            <main className="max-w-screen-2xl mx-auto px-2 sm:px-4 lg:px-6 py-4">
                {sectionLayout === 'tabs' ? (
                    /* ========== TABS LAYOUT: Sidebar + ONLY active section ========== */
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
                        {/* ========== LEFT SIDEBAR toggle strip (when collapsed) ========== */}
                        {isLeftColCollapsed && (
                            <div className="hidden lg:flex flex-col items-center py-2">
                                <button
                                    type="button"
                                    onClick={() => setIsLeftColCollapsed(false)}
                                    className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-lg shadow-sm text-gray-400 hover:text-teal-600 hover:border-teal-300 transition-all"
                                    title="Espandi pannello laterale"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                        {/* ========== LEFT SIDEBAR (Quick Actions + Sections Navigation) ========== */}
                        {!isLeftColCollapsed && (
                            <div className="lg:col-span-1 space-y-4">
                                {/* Session #12b: QuickActionsIntegrated with all menus integrated */}
                                <QuickActionsIntegrated
                                    pazienteId={paziente.id}
                                    patientName={`${paziente.firstName ?? ''} ${paziente.lastName ?? ''}`.trim()}
                                    visitaId={visitaId || undefined}
                                    timer={timer}
                                    formattedTime={formatElapsed(timer.elapsedSeconds)}
                                    showTimer={showTimer}
                                    isTimerReadonly={isReadonly}
                                    autoExpandSection={autoExpandSection}
                                    onAutoExpandHandled={() => setAutoExpandSection(null)}
                                    isReadonly={isReadonly}
                                    onTimerStart={handleStartTimer}
                                    onTimerPause={pauseTimer}
                                    onTimerStop={handleStopTimer}
                                    onViewHistory={handleViewHistory}
                                    onViewEsamiMicrobio={handleViewEsamiMicrobio}
                                    onViewModulistica={handleViewModulistica}
                                    onViewQuestionari={handleViewQuestionari}
                                    showQuestionari={!(visita as any)?.isVisitaSecundaria}
                                    visitaPrincipaleId={(visita as any)?.isVisitaSecundaria ? (visita as any)?.visitaParentId : undefined}
                                    onViewVisitaPrincipale={() => (visita as any)?.visitaParentId && window.open('/poliambulatorio/visite/' + (visita as any).visitaParentId, '_blank', 'noopener,noreferrer')}
                                    questionariCount={questionariCount}
                                    questionariCompilati={questionariRiepilogo}
                                    onApplicaFirme={handleApplicaFirme}
                                    isApplicandoFirme={applicaFirmeMutation.isPending}
                                    onViewPdf={handleViewPdf}
                                    onViewRevisions={handleViewRevisions}
                                    onViewVisita={handleViewVisita}
                                    onViewRevision={handleViewRevision}
                                    noteInterne={noteInterne}
                                    onNoteInterneChange={setNoteInterne}
                                    onNoteInterneSave={() => saveNoteInterneMutation.mutate()}
                                    isNoteInterneSaving={saveNoteInterneMutation.isPending}
                                    // Allergie editable
                                    allergieText={allergieText}
                                    onAllergieChange={handleAllergieChange}
                                    onAllergieSave={handleSaveAllergie}
                                    isAllergieSaving={saveAllergieMutation.isPending}
                                    isAllergieSaved={allergieSaved}
                                    // Integrated panel data
                                    storicoVisite={storicoVisite}
                                    allegati={allegati}
                                    isLoadingAllegati={isLoadingAllegati}
                                    revisioni={revisioni}
                                    isLoadingStorico={isLoadingStorico}
                                />

                                {/* Firma Digitale Card — sotto azioni rapide */}
                                {paziente?.id && (
                                    <FirmaVisitaCard
                                        pazienteId={paziente.id}
                                        pazienteNome={`${paziente.firstName} ${paziente.lastName}`}
                                        visitaId={visitaId || undefined}
                                        medicoId={user?.id || visita?.medicoId}
                                        medicoNome={medicoDetails ? `${medicoDetails.firstName || ''} ${medicoDetails.lastName || ''}`.trim() : undefined}
                                        isReadonly={isReadonly}
                                    />
                                )}

                                {/* Esami Strumentali - Bridge dispositivi medici */}
                                {paziente?.id && visitaId && (
                                    <EsamiStrumentaliCard
                                        visitaId={visitaId}
                                        pazienteId={paziente.id}
                                        pazienteNome={paziente.firstName || ''}
                                        pazienteCognome={paziente.lastName || ''}
                                        pazienteDataNascita={paziente.birthDate || paziente.dataNascita}
                                        pazienteGenere={paziente.gender || paziente.sesso}
                                        pazienteCodiceFiscale={paziente.taxCode || paziente.codiceFiscale}
                                        medicoId={user?.id || visita?.medicoId || ''}
                                        tenantId={user?.tenantId || ''}
                                        isReadOnly={isReadonly}
                                    />
                                )}

                                <div className="sticky top-32">
                                    <VisitSidebar
                                        sections={sections}
                                        activeSection={sidebarState.activeSection}
                                        collapsedSections={sidebarState.collapsedSections}
                                        onSectionClick={(id) => {
                                            setActiveSection(id);
                                            // Scroll to section
                                            const element = document.getElementById(`section-${id}`);
                                            element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }}
                                        onToggleCollapse={toggleSection}
                                        isMinimized={sidebarState.isMinimized}
                                        onToggleMinimize={toggleMinimize}
                                    />

                                    {/* Prestazioni Card */}
                                    <PrestazioniCard
                                        prestazionePrincipale={prestazionePrincipale}
                                        prestazioniAggiuntive={prestazioniAggiuntive}
                                        onAddPrestazione={handleAddPrestazione}
                                        onRemovePrestazione={handleRemovePrestazione}
                                        onUpdatePrestazione={handleUpdatePrestazione}
                                        prestazioniDisponibili={prestazioniPerMDL}
                                        showAllPrestazioni={showAllPrestazioni}
                                        onToggleShowAll={setShowAllPrestazioni}
                                        convenzioneAssociata={convenzioneAssociata}
                                        convenzioniDisponibili={convenzioniDisponibili}
                                        onChangeConvenzione={handleChangeConvenzione}
                                        codiciScontoApplicati={codiciScontoApplicati}
                                        onAddCodiceSconto={handleAddCodiceSconto}
                                        onRemoveCodiceSconto={handleRemoveCodiceSconto}
                                        isFatturata={!!visita?.fatture?.length}
                                        disabled={isReadonly || !canChangeRefertante}
                                        isPrimaVisita={visita?.isPrimaVisita}
                                        onTogglePrimaVisita={handleTogglePrimaVisita}
                                        canViewPrices={canViewPrices}
                                        canManageConvenzioni={canManageConvenzioni}
                                        mediciDisponibili={mediciDisponibili}
                                        medicoId={visita?.medicoId}
                                        isMDL={!!appuntamento?.tipoVisitaMDL || vociTariffarioPrincipale.length > 0 || !!visita?.tipoVisitaMDL}
                                        tipoVisitaMDL={visita?.tipoVisitaMDL || appuntamento?.tipoVisitaMDL || undefined}
                                        onChangeTipoVisita={handleChangeTipoVisita}
                                        vociTariffarioPrincipale={vociTariffarioPrincipale}
                                        esamiStrumentali={esamiStrumentali}
                                        onOpenEsameStrumentale={(esame) => setSelectedEsameStrumentale(esame as EsameStrumentale)}
                                        onOpenVisitaSecondaria={handleOpenVisitaSecondaria}
                                        className="mt-4"
                                    />
                                    {/* P73: Visite collegate */}
                                    {(!(visita as any)?.isVisitaSecundaria && prestazioniAggiuntive.some(p => p.visitaSecondariaId)) && (
                                        <button
                                            type="button"
                                            onClick={() => setIsVisiteCollegateOpen(true)}
                                            className="mt-4 w-full flex items-center justify-between px-4 py-3 bg-teal-50 border border-teal-200 rounded-xl text-sm font-medium text-teal-700 hover:bg-teal-100 hover:border-teal-300 transition-colors"
                                        >
                                            <span className="flex items-center gap-2">
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                                </svg>
                                                {(visita as any)?.isVisitaSecundaria ? 'Visita principale' : 'Visite specialistiche collegate'}
                                            </span>
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="9 18 15 12 9 6" />
                                            </svg>
                                        </button>
                                    )}

                                    {/* Access Control Card */}
                                    <AccessControlCard
                                        value={accessControl}
                                        onChange={handleAccessControlChange}
                                        disabled={isReadonly}
                                        className="mt-4"
                                    />

                                    {/* Medico Refertante Card */}
                                    <MedicoRefertanteCard
                                        visitaId={visitaId}
                                        medicoId={visita?.medicoId || ''}
                                        medicoRefertanteId={visita?.medicoRefertanteId}
                                        medicoRefertante={visita?.medicoRefertante}
                                        medicoVisita={visita?.medico}
                                        disabled={isReadonly || !canChangeRefertante}
                                        className="mt-4"
                                    />

                                    {/* MDL Info Card — mansioni, protocollo, rischi */}
                                    {isMDLVisit && paziente?.id && workerRisksData && (
                                        <>
                                            <MDLInfoCard
                                                mansioni={workerRisksData.mansioni ?? []}
                                                protocolli={protocolliMansione ?? null}
                                                rischi={workerRisksData.rischi ?? []}
                                                hasPersonalizedRisks={workerRisksData.hasPersonalizedRisks}
                                                pazienteId={paziente.id}
                                                isReadonly={isReadonly}
                                                className="mt-4"
                                            />
                                        </>
                                    )}

                                    {/* Prossimo Controllo / Scadenza */}
                                    <VisitaScadenzaCard
                                        visita={visita}
                                        template={template}
                                        prestazione={prestazione}
                                        prossimoControllo={prossimoControllo}
                                        noteFollowup={noteFollowup}
                                        onChange={setProssimoControllo}
                                        onNoteChange={setNoteFollowup}
                                        isReadonly={isReadonly}
                                        className="mt-4"
                                        isMDL={!!appuntamento?.tipoVisitaMDL || vociTariffarioPrincipale.length > 0 || !!visita?.tipoVisitaMDL}
                                        tipoVisitaMDL={visita?.tipoVisitaMDL || appuntamento?.tipoVisitaMDL || undefined}
                                        sorveglianzaStats={sorveglianzaStats}
                                        personaScadenze={scadenzePersona ?? null}
                                        pazienteId={paziente?.id ?? null}
                                        prestazioniAggiuntive={prestazioniAggiuntive}
                                        nonProgrammareIds={prestazioniNonProgrammare}
                                        onNonProgrammareChange={handleNonProgrammareChange}
                                        onEditDatesChange={handlePianoDateOverridesChange}
                                        initialEditDates={pianoDateOverrides}
                                    />
                                </div>
                                {/* Collapse left column button */}
                                <button
                                    type="button"
                                    onClick={() => setIsLeftColCollapsed(true)}
                                    className="hidden lg:flex w-full items-center justify-center gap-1.5 py-1.5 text-xs text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg border border-dashed border-gray-200 hover:border-teal-300 transition-all"
                                    title="Comprimi pannello laterale"
                                >
                                    <ChevronLeft className="h-3 w-3" />
                                    <span>Comprimi</span>
                                </button>
                            </div>
                        )}

                        {/* ========== CENTER: FORM (takes 4 columns) - ONLY ACTIVE SECTION ========== */}
                        <div className={`${isLeftColCollapsed ? 'lg:col-span-5' : 'lg:col-span-4'} space-y-6`}>
                            {isLoadingTemplate ? (
                                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                                    <Loader2 className="h-8 w-8 text-teal-600 animate-spin mx-auto mb-4" />
                                    <p className="text-gray-500">Caricamento template...</p>
                                </div>
                            ) : sections.length === 0 ? (
                                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                                    <AlertCircle className="h-10 w-10 text-amber-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        Nessun template configurato
                                    </h3>
                                    <p className="text-gray-500 mb-4">
                                        Non è stato trovato un template per questa visita.
                                        Verranno utilizzati i campi standard.
                                    </p>
                                    <button
                                        onClick={() => navigate('/poliambulatorio/impostazioni/visit-templates')}
                                        className="text-teal-600 hover:text-teal-700 font-medium"
                                    >
                                        Configura template →
                                    </button>
                                </div>
                            ) : (
                                /* In tabs mode, show ONLY the active section */
                                sections
                                    .filter(section => section.section === sidebarState.activeSection)
                                    .map((section) => (
                                        <FormSection
                                            key={section.section}
                                            section={section}
                                            values={values}
                                            errors={validation.errors}
                                            onChange={handleFieldChange}
                                            isExpanded={true}
                                            onToggleExpand={() => { }}
                                            layout="continuous"
                                            disabled={isReadonly}
                                            pazienteId={paziente?.id}
                                            onOpenFullChart={handleOpenFullChart}
                                            visitaId={visitaId ?? undefined}
                                        />
                                    ))
                            )}
                        </div>
                    </div>
                ) : sectionLayout === 'sections' ? (
                    /* ========== SECTIONS LAYOUT: Sidebar + ALL sections with headers ========== */
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
                        {/* ========== LEFT SIDEBAR toggle strip (when collapsed) ========== */}
                        {isLeftColCollapsed && (
                            <div className="hidden lg:flex flex-col items-center py-2">
                                <button
                                    type="button"
                                    onClick={() => setIsLeftColCollapsed(false)}
                                    className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-lg shadow-sm text-gray-400 hover:text-teal-600 hover:border-teal-300 transition-all"
                                    title="Espandi pannello laterale"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                        {/* Quick Actions + Section Navigation Sidebar */}
                        {!isLeftColCollapsed && (
                            <div className="lg:col-span-1 space-y-4">
                                {/* Session #12b: QuickActionsIntegrated with all menus integrated */}
                                <QuickActionsIntegrated
                                    pazienteId={paziente.id}
                                    patientName={`${paziente.firstName ?? ''} ${paziente.lastName ?? ''}`.trim()}
                                    visitaId={visitaId || undefined}
                                    timer={timer}
                                    formattedTime={formatElapsed(timer.elapsedSeconds)}
                                    showTimer={showTimer}
                                    isTimerReadonly={isReadonly}
                                    autoExpandSection={autoExpandSection}
                                    onAutoExpandHandled={() => setAutoExpandSection(null)}
                                    isReadonly={isReadonly}
                                    onTimerStart={handleStartTimer}
                                    onTimerPause={pauseTimer}
                                    onTimerStop={handleStopTimer}
                                    onViewHistory={handleViewHistory}
                                    onViewEsamiMicrobio={handleViewEsamiMicrobio}
                                    onViewModulistica={handleViewModulistica}
                                    onViewQuestionari={handleViewQuestionari}
                                    showQuestionari={!(visita as any)?.isVisitaSecundaria}
                                    visitaPrincipaleId={(visita as any)?.isVisitaSecundaria ? (visita as any)?.visitaParentId : undefined}
                                    onViewVisitaPrincipale={() => (visita as any)?.visitaParentId && window.open('/poliambulatorio/visite/' + (visita as any).visitaParentId, '_blank', 'noopener,noreferrer')}
                                    questionariCount={questionariCount}
                                    questionariCompilati={questionariRiepilogo}
                                    onApplicaFirme={handleApplicaFirme}
                                    isApplicandoFirme={applicaFirmeMutation.isPending}
                                    onViewPdf={handleViewPdf}
                                    onViewRevisions={handleViewRevisions}
                                    onViewVisita={handleViewVisita}
                                    onViewRevision={handleViewRevision}
                                    noteInterne={noteInterne}
                                    onNoteInterneChange={setNoteInterne}
                                    onNoteInterneSave={() => saveNoteInterneMutation.mutate()}
                                    isNoteInterneSaving={saveNoteInterneMutation.isPending}
                                    // Allergie editable
                                    allergieText={allergieText}
                                    onAllergieChange={handleAllergieChange}
                                    onAllergieSave={handleSaveAllergie}
                                    isAllergieSaving={saveAllergieMutation.isPending}
                                    isAllergieSaved={allergieSaved}
                                    // Integrated panel data
                                    storicoVisite={storicoVisite}
                                    allegati={allegati}
                                    isLoadingAllegati={isLoadingAllegati}
                                    revisioni={revisioni}
                                    isLoadingStorico={isLoadingStorico}
                                />

                                {/* Firma Digitale Card — sotto azioni rapide */}
                                {paziente?.id && (
                                    <FirmaVisitaCard
                                        pazienteId={paziente.id}
                                        pazienteNome={`${paziente.firstName} ${paziente.lastName}`}
                                        visitaId={visitaId || undefined}
                                        medicoId={user?.id || visita?.medicoId}
                                        medicoNome={medicoDetails ? `${medicoDetails.firstName || ''} ${medicoDetails.lastName || ''}`.trim() : undefined}
                                        isReadonly={isReadonly}
                                    />
                                )}

                                {/* Esami Strumentali - Bridge dispositivi medici */}
                                {paziente?.id && visitaId && (
                                    <EsamiStrumentaliCard
                                        visitaId={visitaId}
                                        pazienteId={paziente.id}
                                        pazienteNome={paziente.firstName || ''}
                                        pazienteCognome={paziente.lastName || ''}
                                        pazienteDataNascita={paziente.birthDate || paziente.dataNascita}
                                        pazienteGenere={paziente.gender || paziente.sesso}
                                        pazienteCodiceFiscale={paziente.taxCode || paziente.codiceFiscale}
                                        medicoId={user?.id || visita?.medicoId || ''}
                                        tenantId={user?.tenantId || ''}
                                        isReadOnly={isReadonly}
                                    />
                                )}
                                <div className="sticky top-32">
                                    <VisitSidebar
                                        sections={sections}
                                        activeSection={sidebarState.activeSection}
                                        collapsedSections={sidebarState.collapsedSections}
                                        onSectionClick={(id) => {
                                            setActiveSection(id);
                                            // Scroll to section
                                            const element = document.getElementById(`section-${id}`);
                                            element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }}
                                        onToggleCollapse={toggleSection}
                                        isMinimized={sidebarState.isMinimized}
                                        onToggleMinimize={toggleMinimize}
                                    />

                                    {/* Prestazioni Card */}
                                    <PrestazioniCard
                                        prestazionePrincipale={prestazionePrincipale}
                                        prestazioniAggiuntive={prestazioniAggiuntive}
                                        onAddPrestazione={handleAddPrestazione}
                                        onRemovePrestazione={handleRemovePrestazione}
                                        onUpdatePrestazione={handleUpdatePrestazione}
                                        prestazioniDisponibili={prestazioniPerMDL}
                                        showAllPrestazioni={showAllPrestazioni}
                                        onToggleShowAll={setShowAllPrestazioni}
                                        convenzioneAssociata={convenzioneAssociata}
                                        convenzioniDisponibili={convenzioniDisponibili}
                                        onChangeConvenzione={handleChangeConvenzione}
                                        codiciScontoApplicati={codiciScontoApplicati}
                                        onAddCodiceSconto={handleAddCodiceSconto}
                                        onRemoveCodiceSconto={handleRemoveCodiceSconto}
                                        isFatturata={!!visita?.fatture?.length}
                                        disabled={isReadonly || !canChangeRefertante}
                                        isPrimaVisita={visita?.isPrimaVisita}
                                        onTogglePrimaVisita={handleTogglePrimaVisita}
                                        canViewPrices={canViewPrices}
                                        canManageConvenzioni={canManageConvenzioni}
                                        mediciDisponibili={mediciDisponibili}
                                        medicoId={visita?.medicoId}
                                        isMDL={!!appuntamento?.tipoVisitaMDL || vociTariffarioPrincipale.length > 0 || !!visita?.tipoVisitaMDL}
                                        tipoVisitaMDL={visita?.tipoVisitaMDL || appuntamento?.tipoVisitaMDL || undefined}
                                        onChangeTipoVisita={handleChangeTipoVisita}
                                        vociTariffarioPrincipale={vociTariffarioPrincipale}
                                        esamiStrumentali={esamiStrumentali}
                                        onOpenEsameStrumentale={(esame) => setSelectedEsameStrumentale(esame as EsameStrumentale)}
                                        onOpenVisitaSecondaria={handleOpenVisitaSecondaria}
                                        className="mt-4"
                                    />
                                    {/* P73: Visite collegate */}
                                    {(!(visita as any)?.isVisitaSecundaria && prestazioniAggiuntive.some(p => p.visitaSecondariaId)) && (
                                        <button
                                            type="button"
                                            onClick={() => setIsVisiteCollegateOpen(true)}
                                            className="mt-4 w-full flex items-center justify-between px-4 py-3 bg-teal-50 border border-teal-200 rounded-xl text-sm font-medium text-teal-700 hover:bg-teal-100 hover:border-teal-300 transition-colors"
                                        >
                                            <span className="flex items-center gap-2">
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                                </svg>
                                                {(visita as any)?.isVisitaSecundaria ? 'Visita principale' : 'Visite specialistiche collegate'}
                                            </span>
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="9 18 15 12 9 6" />
                                            </svg>
                                        </button>
                                    )}

                                    {/* Access Control Card */}
                                    <AccessControlCard
                                        value={accessControl}
                                        onChange={handleAccessControlChange}
                                        disabled={isReadonly}
                                        className="mt-4"
                                    />

                                    {/* Medico Refertante Card */}
                                    <MedicoRefertanteCard
                                        visitaId={visitaId}
                                        medicoId={visita?.medicoId || ''}
                                        medicoRefertanteId={visita?.medicoRefertanteId}
                                        medicoRefertante={visita?.medicoRefertante}
                                        medicoVisita={visita?.medico}
                                        disabled={isReadonly || !canChangeRefertante}
                                        className="mt-4"
                                    />

                                    {/* MDL Info Card — mansioni, protocollo, rischi */}
                                    {isMDLVisit && paziente?.id && workerRisksData && (
                                        <>
                                            <MDLInfoCard
                                                mansioni={workerRisksData.mansioni ?? []}
                                                protocolli={protocolliMansione ?? null}
                                                rischi={workerRisksData.rischi ?? []}
                                                hasPersonalizedRisks={workerRisksData.hasPersonalizedRisks}
                                                pazienteId={paziente.id}
                                                isReadonly={isReadonly}
                                                className="mt-4"
                                            />
                                        </>
                                    )}

                                    {/* Prossimo Controllo / Scadenza */}
                                    <VisitaScadenzaCard
                                        visita={visita}
                                        template={template}
                                        prestazione={prestazione}
                                        prossimoControllo={prossimoControllo}
                                        noteFollowup={noteFollowup}
                                        onChange={setProssimoControllo}
                                        onNoteChange={setNoteFollowup}
                                        isReadonly={isReadonly}
                                        className="mt-4"
                                        isMDL={!!appuntamento?.tipoVisitaMDL || vociTariffarioPrincipale.length > 0 || !!visita?.tipoVisitaMDL}
                                        tipoVisitaMDL={visita?.tipoVisitaMDL || appuntamento?.tipoVisitaMDL || undefined}
                                        sorveglianzaStats={sorveglianzaStats}
                                        personaScadenze={scadenzePersona ?? null}
                                        pazienteId={paziente?.id ?? null}
                                        prestazioniAggiuntive={prestazioniAggiuntive}
                                        nonProgrammareIds={prestazioniNonProgrammare}
                                        onNonProgrammareChange={handleNonProgrammareChange}
                                        onEditDatesChange={handlePianoDateOverridesChange}
                                        initialEditDates={pianoDateOverrides}
                                    />
                                </div>
                                {/* Collapse left column button */}
                                <button
                                    type="button"
                                    onClick={() => setIsLeftColCollapsed(true)}
                                    className="hidden lg:flex w-full items-center justify-center gap-1.5 py-1.5 text-xs text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg border border-dashed border-gray-200 hover:border-teal-300 transition-all"
                                    title="Comprimi pannello laterale"
                                >
                                    <ChevronLeft className="h-3 w-3" />
                                    <span>Comprimi</span>
                                </button>
                            </div>
                        )}

                        {/* Form with ALL sections expanded with headers (card style) */}
                        <div className={`${isLeftColCollapsed ? 'lg:col-span-5' : 'lg:col-span-4'} space-y-6`}>
                            {isLoadingTemplate ? (
                                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                                    <Loader2 className="h-8 w-8 text-teal-600 animate-spin mx-auto mb-4" />
                                    <p className="text-gray-500">Caricamento template...</p>
                                </div>
                            ) : sections.length === 0 ? (
                                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                                    <AlertCircle className="h-10 w-10 text-amber-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        Nessun template configurato
                                    </h3>
                                    <p className="text-gray-500">Nessuna sezione disponibile.</p>
                                </div>
                            ) : (
                                /* Sections mode: ALL sections with expandable card headers */
                                sections.map((section) => (
                                    <FormSection
                                        key={section.section}
                                        section={section}
                                        values={values}
                                        errors={validation.errors}
                                        onChange={handleFieldChange}
                                        isExpanded={expandedSections.has(section.section)}
                                        onToggleExpand={() => toggleExpanded(section.section)}
                                        layout="sections"
                                        disabled={isReadonly}
                                        pazienteId={paziente?.id}
                                        onOpenFullChart={handleOpenFullChart}
                                        visitaId={visitaId ?? undefined}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    /* ========== CONTINUOUS LAYOUT: Full width, ALL sections WITHOUT headers ========== */
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
                        {/* ========== LEFT SIDEBAR toggle strip (when collapsed) ========== */}
                        {isLeftColCollapsed && (
                            <div className="hidden lg:flex flex-col items-center py-2">
                                <button
                                    type="button"
                                    onClick={() => setIsLeftColCollapsed(false)}
                                    className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-lg shadow-sm text-gray-400 hover:text-teal-600 hover:border-teal-300 transition-all"
                                    title="Espandi pannello laterale"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                        {/* Quick Actions only (no section navigation needed) */}
                        {!isLeftColCollapsed && (
                            <div className="lg:col-span-1">

                                {/* Esami Strumentali - Bridge dispositivi medici */}
                                {paziente?.id && visitaId && (
                                    <EsamiStrumentaliCard
                                        visitaId={visitaId}
                                        pazienteId={paziente.id}
                                        pazienteNome={paziente.firstName || ''}
                                        pazienteCognome={paziente.lastName || ''}
                                        pazienteDataNascita={paziente.birthDate || paziente.dataNascita}
                                        pazienteGenere={paziente.gender || paziente.sesso}
                                        pazienteCodiceFiscale={paziente.taxCode || paziente.codiceFiscale}
                                        medicoId={user?.id || visita?.medicoId || ''}
                                        tenantId={user?.tenantId || ''}
                                        isReadOnly={isReadonly}
                                    />
                                )}
                                <div className="sticky top-32 space-y-4">
                                    {/* Session #12b: QuickActionsIntegrated with all menus integrated */}
                                    <QuickActionsIntegrated
                                        pazienteId={paziente.id}
                                        patientName={`${paziente.firstName ?? ''} ${paziente.lastName ?? ''}`.trim()}
                                        visitaId={visitaId || undefined}
                                        timer={timer}
                                        formattedTime={formatElapsed(timer.elapsedSeconds)}
                                        showTimer={showTimer}
                                        isTimerReadonly={isReadonly}
                                        autoExpandSection={autoExpandSection}
                                        onAutoExpandHandled={() => setAutoExpandSection(null)}
                                        isReadonly={isReadonly}
                                        onTimerStart={handleStartTimer}
                                        onTimerPause={pauseTimer}
                                        onTimerStop={handleStopTimer}
                                        onViewHistory={handleViewHistory}
                                        onViewEsamiMicrobio={handleViewEsamiMicrobio}
                                        onViewModulistica={handleViewModulistica}
                                        onViewQuestionari={handleViewQuestionari}
                                        showQuestionari={!(visita as any)?.isVisitaSecundaria}
                                        visitaPrincipaleId={(visita as any)?.isVisitaSecundaria ? (visita as any)?.visitaParentId : undefined}
                                        onViewVisitaPrincipale={() => (visita as any)?.visitaParentId && window.open('/poliambulatorio/visite/' + (visita as any).visitaParentId, '_blank', 'noopener,noreferrer')}
                                        questionariCount={questionariCount}
                                        questionariCompilati={questionariRiepilogo}
                                        onApplicaFirme={handleApplicaFirme}
                                        isApplicandoFirme={applicaFirmeMutation.isPending}
                                        onViewPdf={handleViewPdf}
                                        onViewRevisions={handleViewRevisions}
                                        onViewVisita={handleViewVisita}
                                        onViewRevision={handleViewRevision}
                                        noteInterne={noteInterne}
                                        onNoteInterneChange={setNoteInterne}
                                        onNoteInterneSave={() => saveNoteInterneMutation.mutate()}
                                        isNoteInterneSaving={saveNoteInterneMutation.isPending}
                                        // Allergie editable
                                        allergieText={allergieText}
                                        onAllergieChange={handleAllergieChange}
                                        onAllergieSave={handleSaveAllergie}
                                        isAllergieSaving={saveAllergieMutation.isPending}
                                        isAllergieSaved={allergieSaved}
                                        // Integrated panel data
                                        storicoVisite={storicoVisite}
                                        allegati={allegati}
                                        isLoadingAllegati={isLoadingAllegati}
                                        revisioni={revisioni}
                                        isLoadingStorico={isLoadingStorico}
                                    />

                                    {/* Firma Digitale Card — sotto azioni rapide */}
                                    {paziente?.id && (
                                        <FirmaVisitaCard
                                            pazienteId={paziente.id}
                                            pazienteNome={`${paziente.firstName} ${paziente.lastName}`}
                                            visitaId={visitaId || undefined}
                                            medicoId={user?.id || visita?.medicoId}
                                            medicoNome={medicoDetails ? `${medicoDetails.firstName || ''} ${medicoDetails.lastName || ''}`.trim() : undefined}
                                            isReadonly={isReadonly}
                                        />
                                    )}

                                    {/* Prestazioni Card */}
                                    <PrestazioniCard
                                        prestazionePrincipale={prestazionePrincipale}
                                        prestazioniAggiuntive={prestazioniAggiuntive}
                                        onAddPrestazione={handleAddPrestazione}
                                        onRemovePrestazione={handleRemovePrestazione}
                                        onUpdatePrestazione={handleUpdatePrestazione}
                                        prestazioniDisponibili={prestazioniPerMDL}
                                        showAllPrestazioni={showAllPrestazioni}
                                        onToggleShowAll={setShowAllPrestazioni}
                                        convenzioneAssociata={convenzioneAssociata}
                                        convenzioniDisponibili={convenzioniDisponibili}
                                        onChangeConvenzione={handleChangeConvenzione}
                                        codiciScontoApplicati={codiciScontoApplicati}
                                        onAddCodiceSconto={handleAddCodiceSconto}
                                        onRemoveCodiceSconto={handleRemoveCodiceSconto}
                                        isFatturata={!!visita?.fatture?.length}
                                        disabled={isReadonly || !canChangeRefertante}
                                        isPrimaVisita={visita?.isPrimaVisita}
                                        onTogglePrimaVisita={handleTogglePrimaVisita}
                                        canViewPrices={canViewPrices}
                                        canManageConvenzioni={canManageConvenzioni}
                                        mediciDisponibili={mediciDisponibili}
                                        medicoId={visita?.medicoId}
                                        isMDL={!!appuntamento?.tipoVisitaMDL || vociTariffarioPrincipale.length > 0 || !!visita?.tipoVisitaMDL}
                                        tipoVisitaMDL={visita?.tipoVisitaMDL || appuntamento?.tipoVisitaMDL || undefined}
                                        onChangeTipoVisita={handleChangeTipoVisita}
                                        vociTariffarioPrincipale={vociTariffarioPrincipale}
                                        esamiStrumentali={esamiStrumentali}
                                        onOpenEsameStrumentale={(esame) => setSelectedEsameStrumentale(esame as EsameStrumentale)}
                                        onOpenVisitaSecondaria={handleOpenVisitaSecondaria}
                                    />
                                    {/* P73: Visite collegate */}
                                    {(!(visita as any)?.isVisitaSecundaria && prestazioniAggiuntive.some(p => p.visitaSecondariaId)) && (
                                        <button
                                            type="button"
                                            onClick={() => setIsVisiteCollegateOpen(true)}
                                            className="mt-4 w-full flex items-center justify-between px-4 py-3 bg-teal-50 border border-teal-200 rounded-xl text-sm font-medium text-teal-700 hover:bg-teal-100 hover:border-teal-300 transition-colors"
                                        >
                                            <span className="flex items-center gap-2">
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                                </svg>
                                                {(visita as any)?.isVisitaSecundaria ? 'Visita principale' : 'Visite specialistiche collegate'}
                                            </span>
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="9 18 15 12 9 6" />
                                            </svg>
                                        </button>
                                    )}

                                    {/* Access Control Card */}
                                    <AccessControlCard
                                        value={accessControl}
                                        onChange={handleAccessControlChange}
                                        disabled={isReadonly}
                                    />

                                    {/* Medico Refertante Card */}
                                    <MedicoRefertanteCard
                                        visitaId={visitaId}
                                        medicoId={visita?.medicoId || ''}
                                        medicoRefertanteId={visita?.medicoRefertanteId}
                                        medicoRefertante={visita?.medicoRefertante}
                                        medicoVisita={visita?.medico}
                                        disabled={isReadonly || !canChangeRefertante}
                                    />

                                    {/* MDL Info Card — mansioni, protocollo, rischi */}
                                    {isMDLVisit && paziente?.id && workerRisksData && (
                                        <>
                                            <MDLInfoCard
                                                mansioni={workerRisksData.mansioni ?? []}
                                                protocolli={protocolliMansione ?? null}
                                                rischi={workerRisksData.rischi ?? []}
                                                hasPersonalizedRisks={workerRisksData.hasPersonalizedRisks}
                                                pazienteId={paziente.id}
                                                isReadonly={isReadonly}
                                            />
                                        </>
                                    )}

                                    {/* Prossimo Controllo / Scadenza */}
                                    <VisitaScadenzaCard
                                        visita={visita}
                                        template={template}
                                        prestazione={prestazione}
                                        prossimoControllo={prossimoControllo}
                                        noteFollowup={noteFollowup}
                                        onChange={setProssimoControllo}
                                        onNoteChange={setNoteFollowup}
                                        isReadonly={isReadonly}
                                        className="mt-4"
                                        isMDL={!!appuntamento?.tipoVisitaMDL || vociTariffarioPrincipale.length > 0 || !!visita?.tipoVisitaMDL}
                                        tipoVisitaMDL={visita?.tipoVisitaMDL || appuntamento?.tipoVisitaMDL || undefined}
                                        sorveglianzaStats={sorveglianzaStats}
                                        personaScadenze={scadenzePersona ?? null}
                                        pazienteId={paziente?.id ?? null}
                                        prestazioniAggiuntive={prestazioniAggiuntive}
                                        nonProgrammareIds={prestazioniNonProgrammare}
                                        onNonProgrammareChange={handleNonProgrammareChange}
                                        onEditDatesChange={handlePianoDateOverridesChange}
                                        initialEditDates={pianoDateOverrides}
                                    />
                                </div>
                                {/* Collapse left column button */}
                                <button
                                    type="button"
                                    onClick={() => setIsLeftColCollapsed(true)}
                                    className="hidden lg:flex w-full items-center justify-center gap-1.5 py-1.5 text-xs text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg border border-dashed border-gray-200 hover:border-teal-300 transition-all"
                                    title="Comprimi pannello laterale"
                                >
                                    <ChevronLeft className="h-3 w-3" />
                                    <span>Comprimi</span>
                                </button>
                            </div>
                        )}

                        {/* Form takes more space - ALL sections in continuous flow without headers */}
                        <div className={`${isLeftColCollapsed ? 'lg:col-span-5' : 'lg:col-span-4'}`}>
                            {isLoadingTemplate ? (
                                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                                    <Loader2 className="h-8 w-8 text-teal-600 animate-spin mx-auto mb-4" />
                                    <p className="text-gray-500">Caricamento template...</p>
                                </div>
                            ) : sections.length === 0 ? (
                                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                                    <AlertCircle className="h-10 w-10 text-amber-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        Nessun template configurato
                                    </h3>
                                    <p className="text-gray-500">Nessuna sezione disponibile.</p>
                                </div>
                            ) : (
                                /* Continuous mode: One card containing ALL sections with minimal headers */
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
                                    {sections.map((section, index) => (
                                        <React.Fragment key={section.section}>
                                            {index > 0 && (
                                                <hr className="border-gray-200" />
                                            )}
                                            <FormSection
                                                section={section}
                                                values={values}
                                                errors={validation.errors}
                                                onChange={handleFieldChange}
                                                isExpanded={true}
                                                onToggleExpand={() => { }}
                                                layout="continuous"
                                                disabled={isReadonly}
                                                pazienteId={paziente?.id}
                                                onOpenFullChart={handleOpenFullChart}
                                                visitaId={visitaId ?? undefined}
                                            />
                                        </React.Fragment>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* S68: Firma Warning Dialog — shown before completing with unsigned docs */}
            <FirmaWarningDialog
                isOpen={isFirmaWarningOpen}
                onAction={handleFirmaWarningAction}
                summary={firmaWarningSummary}
                isLoading={isFirmaWarningLoading}
            />

            {/* S68: PDF Preview Dialog */}
            <PDFPreviewDialog
                isOpen={isPdfPreviewOpen}
                onClose={() => setIsPdfPreviewOpen(false)}
                url={pdfPreviewUrl}
                title={pdfPreviewTitle}
            />

            {/* R25: Profilo di Salute — modal scheda completa con tab */}
            {profiloSaluteModalOpen && paziente?.id && (
                <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/60 overflow-y-auto p-4">
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl my-4">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl z-10">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Heart className="h-5 w-5 text-red-400" />
                                Profilo di Salute — {paziente.firstName} {paziente.lastName}
                            </h2>
                            <button
                                onClick={() => setProfiloSaluteModalOpen(false)}
                                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            {/* isReadonly={false}: il profilo di salute è dati anagrafici del paziente, sempre modificabili */}
                            <ProfiloSaluteCard personId={paziente.id} isReadonly={false} tabLayout autoEdit hideHeader />
                        </div>
                    </div>
                </div>
            )}
            {occupationalEditModalOpen && paziente?.id && (
                <div className="fixed inset-0 z-[210] flex items-start justify-center overflow-y-auto bg-black/60 p-4">
                    <div className="my-4 w-full max-w-4xl rounded-xl bg-white shadow-2xl">
                        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-xl border-b border-gray-200 bg-white px-6 py-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Modifica stato occupazionale</h2>
                                <p className="text-xs text-gray-500">Azienda, mansioni e rischi collegati al lavoratore in visita</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setOccupationalEditModalOpen(false)}
                                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
                            <label className="text-sm font-medium text-gray-700">
                                Qualifica / Titolo
                                <input
                                    value={occupationalEditForm.title}
                                    onChange={event => setOccupationalEditForm(prev => ({ ...prev, title: event.target.value }))}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                                />
                            </label>
                            <label className="text-sm font-medium text-gray-700">
                                Protocollo sanitario
                                <ElegantSelect
                                    value={occupationalEditForm.protocolloSanitarioId}
                                    onChange={value => setOccupationalEditForm(prev => ({ ...prev, protocolloSanitarioId: value }))}
                                    className="mt-1"
                                    placeholder="Non assegnato"
                                    options={[
                                        { value: '', label: 'Non assegnato' },
                                        ...(((allProtocolliData as any)?.data ?? allProtocolliData ?? []) as any[]).map(protocollo => ({
                                            value: protocollo.id,
                                            label: protocollo.denominazione || protocollo.codice || 'Protocollo senza nome',
                                        })),
                                    ]}
                                />
                            </label>
                            <label className="text-sm font-medium text-gray-700">
                                Data assunzione
                                <DatePickerElegante
                                    value={occupationalEditForm.hiredDate || null}
                                    onChange={date => setOccupationalEditForm(prev => ({ ...prev, hiredDate: date ? date.toISOString().split('T')[0] : '' }))}
                                    theme="teal"
                                    size="sm"
                                    clearable
                                />
                            </label>
                            <label className="text-sm font-medium text-gray-700">
                                Fine rapporto
                                <DatePickerElegante
                                    value={occupationalEditForm.endDate || null}
                                    onChange={date => setOccupationalEditForm(prev => ({ ...prev, endDate: date ? date.toISOString().split('T')[0] : '' }))}
                                    theme="teal"
                                    size="sm"
                                    clearable
                                />
                            </label>
                            <label className="text-sm font-medium text-gray-700">
                                Tipo contratto
                                <ElegantSelect
                                    value={occupationalEditForm.tipoContratto}
                                    onChange={value => setOccupationalEditForm(prev => ({ ...prev, tipoContratto: value }))}
                                    className="mt-1"
                                    placeholder="Non indicato"
                                    options={[
                                        { value: '', label: 'Non indicato' },
                                        { value: 'DIPENDENTE_INDETERMINATO', label: 'Dipendente indeterminato' },
                                        { value: 'DIPENDENTE_DETERMINATO', label: 'Dipendente determinato' },
                                        { value: 'LIBERA_PROFESSIONE', label: 'Libera professione' },
                                        { value: 'COCOCO', label: 'Co.co.co.' },
                                        { value: 'PRESTAZIONE_OCCASIONALE', label: 'Prestazione occasionale' },
                                        { value: 'STAGE_TIROCINIO', label: 'Stage / tirocinio' },
                                        { value: 'APPRENDISTATO', label: 'Apprendistato' },
                                        { value: 'SOMMINISTRAZIONE', label: 'Somministrazione' },
                                    ]}
                                />
                            </label>
                            <label className="text-sm font-medium text-gray-700">
                                Tipo collaboratore
                                <ElegantSelect
                                    value={occupationalEditForm.tipoCollaboratore}
                                    onChange={value => setOccupationalEditForm(prev => ({ ...prev, tipoCollaboratore: value }))}
                                    className="mt-1"
                                    placeholder="Non indicato"
                                    options={[
                                        { value: '', label: 'Non indicato' },
                                        { value: 'AMMINISTRATIVO', label: 'Amministrativo' },
                                        { value: 'MEDICO', label: 'Medico' },
                                        { value: 'INFERMIERE', label: 'Infermiere' },
                                        { value: 'FORMATORE', label: 'Formatore' },
                                        { value: 'RSPP', label: 'RSPP' },
                                        { value: 'TECNICO', label: 'Tecnico' },
                                        { value: 'RECEPTIONIST', label: 'Receptionist' },
                                        { value: 'DIREZIONE', label: 'Direzione' },
                                        { value: 'ALTRO', label: 'Altro' },
                                    ]}
                                />
                            </label>
                            <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-xs font-semibold uppercase text-slate-500">Contesto attuale</p>
                                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                    {[
                                        ['Azienda', occupationalSummary?.azienda],
                                        ['Sede', occupationalSummary?.sede],
                                        ['Reparto', occupationalSummary?.reparto],
                                        ['Mansioni', occupationalSummary?.mansioni?.join(', ')],
                                        ['Rischi', occupationalSummary?.rischi?.join(', ')],
                                    ].filter(([, value]) => value).map(([label, value]) => (
                                        <div key={label} className="rounded-lg bg-white px-3 py-2">
                                            <p className="text-[10px] font-semibold uppercase text-slate-400">{label}</p>
                                            <p className="text-sm text-slate-700">{value}</p>
                                        </div>
                                    ))}
                                </div>
                                <p className="mt-3 text-xs text-slate-500">
                                    Mansioni e rischi restano gestiti dalla card Medicina del Lavoro della visita, così il dettaglio personalizzato del dipendente rimane tracciato correttamente.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
                            <button type="button" onClick={() => setOccupationalEditModalOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
                                Annulla
                            </button>
                            <button
                                type="button"
                                onClick={() => updateOccupationalMutation.mutate()}
                                disabled={updateOccupationalMutation.isPending}
                                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                            >
                                {updateOccupationalMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                Salva stato occupazionale
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {patientEditModalOpen && paziente?.id && (
                <div className="fixed inset-0 z-[210] flex items-start justify-center overflow-y-auto bg-black/60 p-4">
                    <div className="my-4 w-full max-w-4xl rounded-xl bg-white shadow-2xl">
                        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-xl border-b border-gray-200 bg-white px-6 py-4">
                            <h2 className="text-lg font-semibold text-gray-900">Modifica anagrafica paziente</h2>
                            <button
                                type="button"
                                onClick={() => setPatientEditModalOpen(false)}
                                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
                            <label className="text-sm font-medium text-gray-700">
                                Nome
                                <input
                                    value={patientEditForm.firstName}
                                    onChange={event => setPatientEditForm(prev => ({ ...prev, firstName: event.target.value }))}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                                />
                            </label>
                            <label className="text-sm font-medium text-gray-700">
                                Cognome
                                <input
                                    value={patientEditForm.lastName}
                                    onChange={event => setPatientEditForm(prev => ({ ...prev, lastName: event.target.value }))}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                                />
                            </label>
                            <label className="text-sm font-medium text-gray-700">
                                Codice fiscale
                                <input
                                    value={patientEditForm.taxCode}
                                    onChange={event => setPatientEditForm(prev => ({ ...prev, taxCode: event.target.value.toUpperCase() }))}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                                />
                            </label>
                            <label className="text-sm font-medium text-gray-700">
                                Data nascita
                                <DatePickerElegante
                                    value={patientEditForm.birthDate || null}
                                    onChange={date => setPatientEditForm(prev => ({ ...prev, birthDate: date ? date.toISOString().split('T')[0] : '' }))}
                                    placeholder="Seleziona data"
                                    theme="teal"
                                    size="sm"
                                    clearable
                                />
                            </label>
                            <label className="text-sm font-medium text-gray-700">
                                Luogo nascita
                                <input
                                    value={patientEditForm.birthPlace}
                                    onChange={event => setPatientEditForm(prev => ({ ...prev, birthPlace: event.target.value }))}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                                />
                            </label>
                            <label className="text-sm font-medium text-gray-700">
                                Provincia nascita
                                <input
                                    value={patientEditForm.birthProvince}
                                    onChange={event => setPatientEditForm(prev => ({ ...prev, birthProvince: event.target.value.toUpperCase().slice(0, 2) }))}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                                />
                            </label>
                            <label className="text-sm font-medium text-gray-700">
                                Sesso
                                <ElegantSelect
                                    value={patientEditForm.gender}
                                    onChange={value => setPatientEditForm(prev => ({ ...prev, gender: value }))}
                                    className="mt-1"
                                    placeholder="Non indicato"
                                    options={[
                                        { value: '', label: 'Non indicato' },
                                        { value: 'MALE', label: 'Maschio' },
                                        { value: 'FEMALE', label: 'Femmina' },
                                    ]}
                                />
                            </label>
                            <label className="text-sm font-medium text-gray-700">
                                Etnia
                                <ElegantSelect
                                    value={patientEditForm.etnia}
                                    onChange={value => setPatientEditForm(prev => ({ ...prev, etnia: value }))}
                                    className="mt-1"
                                    options={ETHNICITY_OPTIONS.map(option => ({ value: option.value, label: option.label }))}
                                />
                            </label>
                            <label className="text-sm font-medium text-gray-700">
                                Telefono
                                <input
                                    value={patientEditForm.phone}
                                    onChange={event => setPatientEditForm(prev => ({ ...prev, phone: event.target.value }))}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                                />
                            </label>
                            <label className="text-sm font-medium text-gray-700">
                                Email
                                <input
                                    type="email"
                                    value={patientEditForm.email}
                                    onChange={event => setPatientEditForm(prev => ({ ...prev, email: event.target.value }))}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                                />
                            </label>
                            <label className="text-sm font-medium text-gray-700 sm:col-span-2">
                                Indirizzo residenza
                                <input
                                    value={patientEditForm.residenceAddress}
                                    onChange={event => setPatientEditForm(prev => ({ ...prev, residenceAddress: event.target.value }))}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                                />
                            </label>
                            <label className="text-sm font-medium text-gray-700">
                                Comune residenza
                                <input
                                    value={patientEditForm.residenceCity}
                                    onChange={event => setPatientEditForm(prev => ({ ...prev, residenceCity: event.target.value }))}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                                />
                            </label>
                            <label className="text-sm font-medium text-gray-700">
                                CAP
                                <input
                                    value={patientEditForm.postalCode}
                                    onChange={event => setPatientEditForm(prev => ({ ...prev, postalCode: event.target.value }))}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                                />
                            </label>
                            <label className="text-sm font-medium text-gray-700">
                                Provincia residenza
                                <input
                                    value={patientEditForm.province}
                                    onChange={event => setPatientEditForm(prev => ({ ...prev, province: event.target.value.toUpperCase().slice(0, 2) }))}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                                />
                            </label>
                        </div>
                        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
                            <button
                                type="button"
                                onClick={() => setPatientEditModalOpen(false)}
                                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                            >
                                Annulla
                            </button>
                            <button
                                type="button"
                                onClick={() => updatePatientMutation.mutate()}
                                disabled={updatePatientMutation.isPending}
                                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                            >
                                {updatePatientMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                Salva anagrafica
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Giudizio idoneità — aperto automaticamente dopo completamento visita MDL */}
            {isGiudizioModalOpen && isMDLVisit && (
                <GiudizioFormModal
                    isOpen={isGiudizioModalOpen}
                    mode={existingGiudizioForModal ? 'edit' : 'create'}
                    giudizio={existingGiudizioForModal}
                    prefillData={{
                        personId: paziente?.id,
                        visitaId: visitaId ?? undefined,
                        medicoCompetenteId: visita?.medicoId ?? undefined,
                        mansioneIds: workerRisksData?.mansioni?.map((m: { id: string }) => m.id) ?? [],
                    }}
                    onSuccess={async (giudizio) => {
                        setIsGiudizioModalOpen(false);
                        setExistingGiudizioForModal(null);
                        if (giudizio?.id) {
                            try {
                                await giudiziIdoneitaApi.generateDocuments(giudizio.id);
                                showToast({
                                    type: 'success', message: existingGiudizioForModal
                                        ? 'Giudizio di idoneità aggiornato e documenti Art. 41 c.7 rigenerati'
                                        : 'Giudizio di idoneità e documenti Art. 41 c.7 generati'
                                });
                            } catch {
                                // Non bloccare il flusso
                            }
                        }
                    }}
                    onClose={() => {
                        setIsGiudizioModalOpen(false);
                        setExistingGiudizioForModal(null);
                    }}
                />
            )}

            {/* ===== MODAL: Reinvia email referto su nuova versione ===== */}
            {showEmailResendModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    onClick={() => setShowEmailResendModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-3">
                            <div className="p-2.5 bg-teal-100 rounded-xl flex-shrink-0">
                                <Mail className="w-5 h-5 text-teal-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Crea nuova versione</h2>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    L&apos;invio referto via email è attivato. Vuoi reinviare il referto al paziente al termine della nuova versione?
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-1">
                            <button
                                onClick={() => {
                                    setShowEmailResendModal(false);
                                    // Disabilita l'email prima di creare la versione
                                    saveInvioRefertoMailMutation.mutate(false, {
                                        onSuccess: () => handleNuovaVersione()
                                    });
                                }}
                                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                No, non reinviare
                            </button>
                            <button
                                onClick={() => {
                                    setShowEmailResendModal(false);
                                    handleNuovaVersione();
                                }}
                                className="flex-1 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                            >
                                <Mail className="w-4 h-4" />
                                Sì, reinvia email
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VisitaPage;
