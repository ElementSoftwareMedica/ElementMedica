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
import { useNavigate } from 'react-router-dom';
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
import { visiteApi, appuntamentiApi, pazientiApi, mediciApi, convenzioniApi, scontiApi, prestazioniApi, documentiCliniciApi, mansioniApi, protocolliSanitariApi, profiloDiSaluteApi, scadenzeMDLApi, giudiziIdoneitaApi, appuntamentoPrestazioniApi, type VisitAccessControl, type Convenzione, type ScadenzaProtocolloGruppo } from '../../../services/clinicaApi';
import type { SorveglianzaStats } from './components/VisitaScadenzaCard';
import * as queueApi from '../../../services/queueApi';
import questionariService from '../../../services/questionariService';
import { apiGet, apiPost } from '../../../services/api';
import { useToast } from '../../../hooks/useToast';
import { useAutoCollapseSidebar, useSidebar } from '../../../contexts/SidebarContext';
import { useAuth } from '../../../context/AuthContext';

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

// ============================================
// MAIN COMPONENT
// ============================================

export const VisitaPage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const { hasPermission, user } = useAuth();

    // Permission checks for granular PrestazioniCard features
    const canViewPrices = hasPermission('clinica.visite', 'view_prices');
    const canManageConvenzioni = hasPermission('clinica.visite', 'manage_convenzioni');

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
    // getWorkerRisks uses extractData → workerRisksData is already { rischi, mansioni }
    const primaryMansioneId = workerRisksData?.mansioni?.[0]?.id ?? null;

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

    // ============================================
    // MEDICO PRESTAZIONI ABILITATE (Session #12b)
    // Load medico details to get enabled prestazioni
    // ============================================
    const { data: medicoDetails } = useQuery({
        queryKey: ['medico-dettaglio', appuntamento?.medicoId],
        queryFn: () => mediciApi.getById(appuntamento!.medicoId),
        enabled: !!appuntamento?.medicoId
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
        return convenzioniData.data.map((c: Convenzione) => ({
            id: c.id,
            nome: c.nome,
            tipo: c.tipo || 'convenzione',
            scontoPercentuale: typeof c.condizioni?.scontoPercentuale === 'number'
                ? c.condizioni.scontoPercentuale
                : undefined
        }));
    }, [convenzioniData?.data]);

    // Get current convenzione details
    const convenzioneAssociata = useMemo(() => {
        if (!selectedConvenzioneId) return null;

        // First check from appuntamento
        if (appuntamento?.convenzione?.id === selectedConvenzioneId) {
            const sconto = appuntamento.convenzione.condizioni?.scontoPercentuale;
            return {
                id: appuntamento.convenzione.id,
                nome: appuntamento.convenzione.nome,
                tipo: 'convenzione',
                scontoPercentuale: typeof sconto === 'number' ? sconto : undefined
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
                const voce = voci.find(v => v.prestazioneId === p.id);
                return voce ? { ...p, prezzo: Number(voce.prezzoBase) || p.prezzo } : p;
            })
            .filter(p => {
                if (seen.has(p.id)) return false;
                seen.add(p.id);
                return true;
            });
    }, [isMDLVisit, appuntamento, prestazioniMedico, showAllPrestazioni]);

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
                stato: v.stato
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

    // FLAG: segnala che questa sessione ha appena completato la visita → useEffect espande la sidebar
    // Dichiarato prima di completeAndScheduleMDL per evitare TDZ nella closure.
    const [visitaCompletataThisSession, setVisitaCompletataThisSession] = useState(false);
    // Giudizio idoneità modal — aperto automaticamente al completamento di una visita MDL
    const [isGiudizioModalOpen, setIsGiudizioModalOpen] = useState(false);

    /**
     * Helper: chiama handleComplete e poi, se è una visita MDL, schedula le prossime scadenze.
     * Usato internamente da handleCompleteWithFirmaCheck e handleFirmaWarningAction.
     */
    const completeAndScheduleMDL = useCallback(async () => {
        await handleComplete();

        // MDL scheduling: marca scadenze come eseguite e crea le successive
        if (isMDLVisit && !isNew && visitaId && primaryMansioneId && paziente?.id) {
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
                console.error('Errore schedulazione scadenze MDL:', err);
                showToast({ message: 'Attenzione: la programmazione delle prossime scadenze non è riuscita. Riprovare dalla scheda sorveglianza.', type: 'warning' });
            }
        }

        // Segnala che la visita è stata completata in questa sessione (usato per espandere la sidebar nelle visite secondarie)
        setVisitaCompletataThisSession(true);
        // Apri modal giudizio idoneità per visita MDL completata
        if (isMDLVisit) setIsGiudizioModalOpen(true);
    }, [handleComplete, isMDLVisit, isNew, visitaId, primaryMansioneId, paziente?.id, prossimoControllo, appuntamento?.dataOra, prestazioniNonProgrammare, pianoDateOverrides, prestazioniAggiuntive]);

    const handleCompleteWithFirmaCheck = useCallback(async () => {
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
    }, [questionariCompilati, completeAndScheduleMDL, paziente?.id, user?.id]);

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
            setMainSidebarCollapsed(false);
            setVisitaCompletataThisSession(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visitaCompletataThisSession]);

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
    const [isRevisionDiffModalOpen, setIsRevisionDiffModalOpen] = useState(false);
    const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);

    // ============================================
    // P61: QUEUE MANAGEMENT STATE
    // ============================================
    const [isQueueLoading, setIsQueueLoading] = useState(false);
    const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);

    // Profilo di Salute — modal scheda completa
    const [profiloSaluteModalOpen, setProfiloSaluteModalOpen] = useState(false);

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
            navigate('/poliambulatorio/visite');
            return;
        }

        // For ANY other case (new visit, IN_CORSO, BOZZA, INIZIATA, or even while loading)
        // Show the exit dialog to let user decide what to do
        setPendingNavigationPath(-1);
        setIsExitDialogOpen(true);
    }, [visita?.stato, navigate]);

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
            queryClient.invalidateQueries({ queryKey: ['appuntamenti'] });
            // Invalidate specific appuntamento so AppuntamentoDetailPage reflects changes
            if (appuntamento?.id) {
                queryClient.invalidateQueries({ queryKey: ['appuntamento', appuntamento.id] });
            }

            // Mark that we're navigating to prevent popstate handler from blocking
            isNavigatingRef.current = true;

            // Navigate away after action completes.
            // NOTE: navigate(-1) is unreliable here because the history blocker adds extra
            // pushState entries. Using a specific path avoids navigating to a stale duplicate entry.
            if (pendingNavigationPath === -1 || pendingNavigationPath === null) {
                navigate('/poliambulatorio/visite');
            } else if (typeof pendingNavigationPath === 'string') {
                navigate(pendingNavigationPath);
            } else {
                navigate('/poliambulatorio/visite');
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
    }, [handleSave, handleCompleteWithFirmaCheck, visitaId, isNew, visita?.stato, visita?.revisions, appuntamento?.id, appuntamento?.oraArrivo, queryClient, pendingNavigationPath, navigate, showToast]);

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
                setPrestazioniAggiuntive(saved);
                return;
            }
        }
        // Priority 2: AppuntamentoPrestazione records created when booking the appointment
        const appPrestazioni = (appuntamento as any)?.prestazioni as Array<{
            prestazione?: { id: string; nome: string; codice?: string; prezzoBase?: number | string | null; durataPrevista?: number | null };
            movimentiContabili?: Array<{ id: string; importoNetto: number | string | null; importoLordo: number | string | null; stato: string }>;
        }> | undefined;
        if (appPrestazioni && appPrestazioni.length > 0) {
            setPrestazioniAggiuntive(
                appPrestazioni
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
                        };
                    })
            );
        }
    }, [visita?.datiStrutturati, appuntamento]);

    // Convert prestazione to PrestazioneItem
    // Note: _prezzoTariffario is enriched on appuntamento.prestazione (via AppuntamentoService.getById),
    // NOT on the separately-fetched prestazione object (prestazioniApi.getById).
    // Use appuntamento.prestazione._prezzoTariffario as primary source of company tariffario price.
    const prestazionePrincipale = useMemo((): PrestazioneItem | null => {
        if (!prestazione) return null;
        const appPrestazione = (appuntamento as any)?.prestazione as { _prezzoTariffario?: number } | undefined;
        const prezzoTariffario = appPrestazione?._prezzoTariffario
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
    }, [prestazione, appuntamento]);

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
        if (prossimoControllo && scadenzePersona?.length) {
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
    }, [handleSave, isMDLVisit, isNew, visitaId, prossimoControllo, scadenzePersona, showToast, paziente?.id]);

    // Handler per aggiungere prestazione aggiuntiva
    const handleAddPrestazione = useCallback((item: PrestazioneItem) => {
        setPrestazioniAggiuntive(prev => [...prev, item]);
        // Save to datiStrutturati via handleFieldChange
        const newPrestazioni = [...prestazioniAggiuntive, item];
        handleFieldChange('_prestazioniAggiuntive', newPrestazioni);

        // P72_15: Crea AppuntamentoPrestazione per generare movimenti contabili (ENTRATA + USCITA).
        // Condizioni: visita non nuova, appuntamento noto, prestazioneId è un UUID valido (non temp).
        // P72_19+: skip per questionari compilati — billing già gestito da QuestionarioMedicoService
        const appId = appuntamento?.id;
        const isRealUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id);
        if (!isNew && appId && isRealUuid && !item.appPrestazioneId && !item.isQuestionario) {
            appuntamentoPrestazioniApi.create(appId, [{
                prestazioneId: item.id,
                medicoRefertanteId: item.medicoRefertanteId || appuntamento?.medicoId || undefined,
            }], visitaId ?? undefined).then(created => {
                const createdItem = created?.[0];
                const appPrestId = createdItem?.id;
                if (appPrestId) {
                    setPrestazioniAggiuntive(prev => {
                        const updated = prev.map(p =>
                            p.id === item.id
                                ? { ...p, appPrestazioneId: appPrestId, visitaSecondariaId: createdItem.visitaSecondariaId ?? undefined }
                                : p
                        );
                        // P72_17: Persist appPrestazioneId in datiStrutturati so removal works after reload
                        handleFieldChange('_prestazioniAggiuntive', updated);
                        return updated;
                    });
                }
            }).catch(() => { /* Non bloccare il flusso */ });
        }
    }, [prestazioniAggiuntive, handleFieldChange, isNew, appuntamento?.id, appuntamento?.medicoId]);

    // R17: Auto-add from tariffario is handled exclusively via onPrestazioneSuggerita callback
    // in QuestionariModal (compile + firma paths). This avoids duplicates on re-renders.

    // Handler per rimuovere prestazione aggiuntiva
    const handleRemovePrestazione = useCallback((prestazioneId: string) => {
        // P72_15: Se la prestazione ha un AppuntamentoPrestazioni associato, eliminalo
        // (il backend annullerà anche i movimenti contabili collegati)
        const itemToRemove = prestazioniAggiuntive.find(p => p.id === prestazioneId);
        if (itemToRemove?.appPrestazioneId) {
            appuntamentoPrestazioniApi.delete(itemToRemove.appPrestazioneId)
                .catch(() => { /* Non bloccare il flusso */ });
        }
        // P72_22: Per questionari, annulla movimenti contabili senza eliminare il documento
        if (itemToRemove?.isQuestionario && itemToRemove.id) {
            questionariService.annullaMovimentiCompilato(itemToRemove.id)
                .catch(() => { /* Non bloccare il flusso */ });
        }

        setPrestazioniAggiuntive(prev => prev.filter(p => p.id !== prestazioneId));
        // Save to datiStrutturati
        const newPrestazioni = prestazioniAggiuntive.filter(p => p.id !== prestazioneId);
        handleFieldChange('_prestazioniAggiuntive', newPrestazioni);
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
                        scontoPercentuale: appuntamento.convenzione.condizioni?.scontoPercentuale
                    } : null);

                // Try to fetch full convenzione details for codice sconto
                try {
                    const convDetails = await convenzioniApi.getById(convenzioneId);
                    const condizioni = convDetails?.condizioni || {};
                    if (condizioni.codiceSconto && typeof condizioni.codiceSconto === 'string') {
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
                                    scontoPercentuale: typeof condizioni.scontoPercentuale === 'number' ? condizioni.scontoPercentuale : undefined,
                                    scontoFisso: typeof condizioni.scontoFisso === 'number' ? condizioni.scontoFisso : undefined
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
        setPrestazioniAggiuntive(prev => {
            const updated = prev.map(p =>
                p.id === prestazioneId ? { ...p, ...updates } : p
            );
            handleFieldChange('_prestazioniAggiuntive', updated);
            return updated;
        });
    }, [handleFieldChange, prestazioniAggiuntive]);

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
                        onClick={() => navigate(-1)}
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
                        onClick={() => navigate(-1)}
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
                    // Dopo annullaModifiche, naviga direttamente alla lista
                    // (la visita torna COMPLETATA — non serve ExitDialog)
                    isNavigatingRef.current = true;
                    await handleAnnullaModifiche();
                    navigate('/poliambulatorio/visite');
                }}
                onCreateReferto={handleOpenReferto}
                // P61: Queue actions
                onChiamaPaziente={handleChiamaPaziente}
                onRichiamaPaziente={handleRichiamaPaziente}
                onViewQueue={handleViewQueue}
                isQueueLoading={isQueueLoading}
                queueInAttesaCount={queueStats?.inAttesa}
                // ProfiloSalute espandibile nella barra superiore
                personId={paziente.id}
                onEditProfiloSalute={() => setProfiloSaluteModalOpen(true)}
                // P74: invio referto via email nel menu Salva e Completa
                invioRefertoMail={invioRefertoMail}
                onInvioRefertoMailChange={(v) => saveInvioRefertoMailMutation.mutate(v)}
                isMDLVisit={isMDLVisit}
                saveInvioMailPending={saveInvioRefertoMailMutation.isPending}
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
                                        disabled={isReadonly}
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
                                        className="mt-4"
                                    />
                                    {/* P73: Visite collegate */}
                                    {((visita as any)?.isVisitaSecundaria || prestazioniAggiuntive.some(p => p.visitaSecondariaId)) && (
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
                                        disabled={isReadonly}
                                        className="mt-4"
                                    />

                                    {/* MDL Info Card — mansioni, protocollo, rischi */}
                                    {isMDLVisit && paziente?.id && workerRisksData && (
                                        <MDLInfoCard
                                            mansioni={workerRisksData.mansioni ?? []}
                                            protocolli={protocolliMansione ?? null}
                                            rischi={workerRisksData.rischi ?? []}
                                            pazienteId={paziente.id}
                                            isReadonly={isReadonly}
                                            className="mt-4"
                                        />
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
                                        disabled={isReadonly}
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
                                        className="mt-4"
                                    />
                                    {/* P73: Visite collegate */}
                                    {((visita as any)?.isVisitaSecundaria || prestazioniAggiuntive.some(p => p.visitaSecondariaId)) && (
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
                                        disabled={isReadonly}
                                        className="mt-4"
                                    />

                                    {/* MDL Info Card — mansioni, protocollo, rischi */}
                                    {isMDLVisit && paziente?.id && workerRisksData && (
                                        <MDLInfoCard
                                            mansioni={workerRisksData.mansioni ?? []}
                                            protocolli={protocolliMansione ?? null}
                                            rischi={workerRisksData.rischi ?? []}
                                            pazienteId={paziente.id}
                                            isReadonly={isReadonly}
                                            className="mt-4"
                                        />
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
                                        disabled={isReadonly}
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
                                    />
                                    {/* P73: Visite collegate */}
                                    {((visita as any)?.isVisitaSecundaria || prestazioniAggiuntive.some(p => p.visitaSecondariaId)) && (
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
                                        disabled={isReadonly}
                                    />

                                    {/* MDL Info Card — mansioni, protocollo, rischi */}
                                    {isMDLVisit && paziente?.id && workerRisksData && (
                                        <MDLInfoCard
                                            mansioni={workerRisksData.mansioni ?? []}
                                            protocolli={protocolliMansione ?? null}
                                            rischi={workerRisksData.rischi ?? []}
                                            pazienteId={paziente.id}
                                            isReadonly={isReadonly}
                                        />
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
                            <ProfiloSaluteCard personId={paziente.id} isReadonly={false} tabLayout autoEdit />
                        </div>
                    </div>
                </div>
            )}
            {/* Giudizio idoneità — aperto automaticamente dopo completamento visita MDL */}
            {isGiudizioModalOpen && isMDLVisit && (
                <GiudizioFormModal
                    isOpen={isGiudizioModalOpen}
                    mode="create"
                    prefillData={{
                        personId: paziente?.id,
                        visitaId: visitaId ?? undefined,
                        medicoCompetenteId: visita?.medicoId ?? undefined,
                        mansioneIds: primaryMansioneId ? [primaryMansioneId] : [],
                    }}
                    onSuccess={async (giudizio) => {
                        setIsGiudizioModalOpen(false);
                        if (giudizio?.id) {
                            try {
                                await giudiziIdoneitaApi.generateDocuments(giudizio.id);
                                showToast({ type: 'success', message: 'Giudizio di idoneità e documenti Art. 41 c.7 generati' });
                            } catch {
                                // Non bloccare il flusso
                            }
                        }
                    }}
                    onClose={() => setIsGiudizioModalOpen(false)}
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