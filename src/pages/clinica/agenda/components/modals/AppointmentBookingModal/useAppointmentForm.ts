/**
 * useAppointmentForm - Hook for managing appointment booking form state
 * @module pages/clinica/agenda/components/modals/AppointmentBookingModal/useAppointmentForm
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';

import {
    appuntamentiApi,
    appuntamentoPrestazioniApi,
    mediciApi,
    pazientiApi,
    prestazioniApi,
    tariffarioMedicoApi,
    convenzioniApi,
    scontiApi,
    bundleApi,
    mansioniApi,
    protocolliSanitariApi,
    scadenzeMDLApi,
    Appuntamento,
    Paziente,
    Prestazione,
    Convenzione,
    TariffarioMedico,
    OffertaBundle,
    Medico,
    Mansione,
    ProtocolloSanitario,
    ProtocolloPrestazione,
    TipoVisitaMDL
} from '../../../../../../services/clinicaApi';
import { tariffariAziendaliApi } from '../../../../../../services/tariffarioAziendaleApi';
import { useToast } from '../../../../../../hooks/useToast';
import { useTenantMode } from '../../../../../../contexts/TenantModeContext';
import type { CalendarEvent } from '../../../types/calendar.types';
import type {
    AppointmentBookingModalProps,
    ScontoValidato,
    NewPatientData,
    EditPatientData,
    RescheduleData,
    UseAppointmentFormReturn
} from './types';

export function useAppointmentForm(
    props: Pick<AppointmentBookingModalProps, 'isOpen' | 'slotInfo' | 'medico' | 'existingAppointment' | 'onSuccess' | 'onClose' | 'allMedici'>
): UseAppointmentFormReturn {
    const { isOpen, slotInfo, medico, existingAppointment, onSuccess, onClose, allMedici = [] } = props;
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    // Project 51: Get tenant context for filtering entities
    const { operateTenantId, canPerformCRUD, operateTenant } = useTenantMode();

    const isEditMode = !!existingAppointment;
    const initialOverbooking = slotInfo?.isOverbooking && !isEditMode;

    // State
    const [forceOverbooking, setForceOverbooking] = useState(false);
    const [overbookingAccepted, setOverbookingAccepted] = useState(false);
    const [pazienteSearch, setPazienteSearch] = useState('');
    const [selectedPaziente, setSelectedPaziente] = useState<Paziente | null>(null);
    const [selectedPrestazione, setSelectedPrestazione] = useState<Prestazione | null>(null);
    const [selectedBundle, setSelectedBundle] = useState<OffertaBundle | null>(null);
    const [selectionType, setSelectionType] = useState<'prestazione' | 'bundle'>('prestazione');
    const [selectedTariffario, setSelectedTariffario] = useState<TariffarioMedico | null>(null);
    const [durataMinuti, setDurataMinuti] = useState(30);
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedConvenzione, setSelectedConvenzione] = useState<Convenzione | null>(null);
    const [codiceSconto, setCodiceSconto] = useState('');
    const [scontoValidato, setScontoValidato] = useState<ScontoValidato | null>(null);
    const [isValidatingSconto, setIsValidatingSconto] = useState(false);
    const [convenzioneWarning, setConvenzioneWarning] = useState<string | null>(null);
    const [showReschedulePanel, setShowReschedulePanel] = useState(false);
    const [rescheduleData, setRescheduleData] = useState<RescheduleData>({ date: '', time: '', medicoId: '' });
    const [showNewPatientForm, setShowNewPatientForm] = useState(false);
    const [newPatientData, setNewPatientData] = useState<NewPatientData>({ firstName: '', lastName: '', phone: '', email: '' });
    const [isCreatingPatient, setIsCreatingPatient] = useState(false);
    const [isEditingPatient, setIsEditingPatient] = useState(false);
    const [editPatientData, setEditPatientData] = useState<EditPatientData>({ firstName: '', lastName: '', phone: '', email: '' });

    // Duplicate booking check state
    const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
    const [duplicateAppointments, setDuplicateAppointments] = useState<Appuntamento[]>([]);
    const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);
    const [isSavingPatient, setIsSavingPatient] = useState(false);

    // MDL - Medicina del Lavoro
    const [tipoVisitaMDL, setTipoVisitaMDL] = useState<TipoVisitaMDL | null>(null);
    /** Prestazioni da protocollo selezionate dall'utente (pre-seleziona le obbligatorie) */
    const [prestazioniSelezionate, setPrestazioniSelezionate] = useState<Set<string>>(new Set());

    const isOverbooking = initialOverbooking || forceOverbooking;

    // Queries - Project 51: All tenant-specific entities are filtered by operateTenantId
    // This prevents mixing entities from different tenants in appointments
    const { data: tariffarioData } = useQuery({
        queryKey: ['tariffario-medico-modal', medico?.id, operateTenantId],
        queryFn: () => tariffarioMedicoApi.getByMedico(medico!.id),
        enabled: isOpen && !!medico?.id && !!operateTenantId
    });

    const { data: convenzioniData } = useQuery({
        queryKey: ['convenzioni-modal', operateTenantId],
        queryFn: () => convenzioniApi.getAll({
            limit: 100,
            filters: { stato: 'ATTIVA' },
            tenantIds: operateTenantId || undefined
        }),
        enabled: isOpen && !!operateTenantId
    });

    const { data: medicoDetails } = useQuery({
        queryKey: ['medico-details-modal', medico?.id, operateTenantId],
        queryFn: () => mediciApi.getById(medico!.id),
        enabled: isOpen && !!medico?.id && !!operateTenantId
    });

    const { data: prestazioniData } = useQuery({
        queryKey: ['prestazioni-modal', operateTenantId],
        queryFn: () => prestazioniApi.getAll({
            limit: 100,
            filters: { isActive: true },
            tenantIds: operateTenantId || undefined
        }),
        enabled: isOpen && !!operateTenantId
    });

    const { data: bundleData } = useQuery({
        queryKey: ['bundles-modal', operateTenantId],
        queryFn: () => bundleApi.getAll({
            limit: 100,
            attivo: true,
            tenantIds: operateTenantId || undefined
        }),
        enabled: isOpen && !!operateTenantId
    });

    const { data: allMediciWithAbilitazioni } = useQuery({
        queryKey: ['all-medici-abilitazioni', operateTenantId],
        queryFn: async () => {
            const allMediciResult = await mediciApi.getAll({
                limit: 100,
                tenantIds: operateTenantId || undefined
            });
            const mediciWithAbilitazioni = await Promise.all(
                allMediciResult.data.map(async (m) => {
                    try {
                        const details = await mediciApi.getById(m.id);
                        return { ...m, abilitazioni: details.abilitazioni || [] };
                    } catch {
                        return { ...m, abilitazioni: [] };
                    }
                })
            );
            return mediciWithAbilitazioni;
        },
        enabled: isOpen && isEditMode
    });

    // MDL queries — active only when a MDL prestazione is selected for an existing patient
    const isMDLVisit = selectedPrestazione?.tipo === 'VISITA_MEDICINA_LAVORO';
    const patientCompanyId =
        (selectedPaziente?.currentProfile as any)?.companyTenantProfileId
        ?? (selectedPaziente?.tenantProfiles?.[0] as any)?.companyTenantProfileId
        ?? null;

    const { data: workerRisksData, isLoading: isLoadingWorkerRisks } = useQuery({
        queryKey: ['worker-risks-modal', selectedPaziente?.id],
        queryFn: () => mansioniApi.getWorkerRisks(selectedPaziente!.id),
        enabled: isOpen && !!selectedPaziente?.id,
        staleTime: 5 * 60_000,
    });

    const firstMansioneId = workerRisksData?.mansioni?.[0]?.id ?? null;

    const { data: protocolliData, isLoading: isLoadingProtocolli } = useQuery({
        queryKey: ['protocolli-by-mansione-modal', firstMansioneId],
        queryFn: () => protocolliSanitariApi.getByMansione(firstMansioneId!),
        enabled: isOpen && !!firstMansioneId && isMDLVisit,
        staleTime: 5 * 60_000,
    });

    // Carica storico MDL in anticipo (senza aspettare isMDLVisit) per l'auto-selezione del tipoVisitaMDL
    const { data: storicoMDLData, isLoading: isLoadingStorico } = useQuery({
        queryKey: ['storico-mdl-modal', selectedPaziente?.id],
        queryFn: () => pazientiApi.getStorico(selectedPaziente!.id),
        enabled: isOpen && !!selectedPaziente?.id,
        staleTime: 5 * 60_000,
    });

    // P72: Fetch ScadenzaPrestazioneProtocollo in scadenza per il paziente nella finestra ±60 giorni dalla data appuntamento
    // Usato per auto-selezionare le prestazioni in scadenza nel panel Sorveglianza Sanitaria
    const targetDateISOForQuery = useMemo(() => {
        if (existingAppointment?.start) return new Date(existingAppointment.start).toISOString();
        if (slotInfo?.date) {
            const d = new Date(slotInfo.date);
            const hours = Math.floor(slotInfo.hour ?? 0);
            const minutes = Math.round(((slotInfo.hour ?? 0) - hours) * 60);
            d.setHours(hours, minutes, 0, 0);
            return d.toISOString();
        }
        return null;
    }, [existingAppointment, slotInfo]);

    const { data: scadenzeInScadenzaData, isLoading: isLoadingScadenze } = useQuery({
        queryKey: ['scadenze-in-scadenza-modal', selectedPaziente?.id, targetDateISOForQuery],
        queryFn: () => scadenzeMDLApi.getScadenzeInScadenza(
            selectedPaziente!.id,
            targetDateISOForQuery!,
            {
                giorni: 60,
                ...(existingAppointment?.id && { excludeAppuntamentoId: existingAppointment.id }),
            }
        ),
        enabled: isOpen && !!selectedPaziente?.id && isMDLVisit && !!targetDateISOForQuery,
        staleTime: 2 * 60_000,
    });

    // MDL: fetch voci tariffario per prestazione e filtra per azienda paziente
    const { data: vociTariffarioData } = useQuery({
        queryKey: ['voci-tariffario-by-prestazione-modal', selectedPrestazione?.id, tipoVisitaMDL],
        queryFn: () => tariffariAziendaliApi.getVociByPrestazione(selectedPrestazione!.id),
        enabled: isOpen && !!selectedPrestazione?.id && isMDLVisit,
        staleTime: 5 * 60_000,
    });

    // Prezzo aziendale per la prestazione selezionata (da tariffario M2M)
    // Priorità: voce con categoriaVisita === tipoVisitaMDL > voce senza categoria > null
    const companyPrezzoTariffario = useMemo((): number | null => {
        if (!vociTariffarioData?.data || !patientCompanyId) return null;
        const isCompanyVoce = (v: { attivo: boolean; tariffarioAziendale?: { companyAssociations?: Array<{ companyTenantProfile: { id: string } }> } }) =>
            v.attivo && v.tariffarioAziendale?.companyAssociations?.some(
                (a) => a.companyTenantProfile.id === patientCompanyId
            );
        // 1. Voce specifica per tipo visita MDL
        const vocePerTipo = tipoVisitaMDL
            ? vociTariffarioData.data.find(v => isCompanyVoce(v) && (v as { categoriaVisita?: string }).categoriaVisita === tipoVisitaMDL)
            : null;
        if (vocePerTipo) return Number(vocePerTipo.prezzoBase);
        // 2. Voce generica (senza categoriaVisita)
        const voceGenerica = vociTariffarioData.data.find(v => isCompanyVoce(v) && !(v as { categoriaVisita?: string }).categoriaVisita);
        return voceGenerica ? Number(voceGenerica.prezzoBase) : null;
    }, [vociTariffarioData, patientCompanyId, tipoVisitaMDL]);

    // MDL derived values
    // Data target: la data dell'appuntamento che si sta prenotando
    const targetAppointmentDate = useMemo(() => {
        if (existingAppointment?.start) return new Date(existingAppointment.start);
        if (slotInfo?.date) {
            const d = new Date(slotInfo.date);
            const hours = Math.floor(slotInfo.hour ?? 0);
            const minutes = Math.round(((slotInfo.hour ?? 0) - hours) * 60);
            d.setHours(hours, minutes, 0, 0);
            return d;
        }
        return new Date();
    }, [existingAppointment, slotInfo]);

    // "Ultima visita MDL" — derivata da ScadenzaPrestazioneProtocollo eseguita (backend-computed)
    const lastMDLVisit = useMemo(() => {
        const raw = storicoMDLData?.ultimaScadenzaMDL;
        if (!raw) return null;
        return {
            dataOra: raw.dataOra ?? raw.dataEsecuzione,
            tipoVisitaMDL: raw.tipoVisitaMDL,
            giudizioIdoneita: raw.giudizioIdoneita,
            isFallbackAppuntamento: raw.isFallbackAppuntamento ?? false,
        };
    }, [storicoMDLData]);

    const prossimaVisitaData = useMemo(() => {
        // Fonte autorevole: ScadenzaPrestazioneProtocollo.dataScadenza (dataScadenza manuale, non calcolata).
        // Non usiamo un fallback calcolato dalla periodicità: se non esiste una scadenza nel piano
        // di sorveglianza, la data viene mostrata come "Da pianificare" nel pannello MDL.
        const prossimaScadenzaMDL = storicoMDLData?.prossimaScadenzaMDL;
        if (prossimaScadenzaMDL) return new Date(prossimaScadenzaMDL);
        return null;
    }, [storicoMDLData]);

    const prestazioniProtocollo = useMemo((): ProtocolloPrestazione[] => {
        const protocollo = (protocolliData as ProtocolloSanitario[] | undefined)?.[0];
        return protocollo?.prestazioni ?? [];
    }, [protocolliData]);

    // Inizializza le prestazioni selezionate con le obbligatorie ogni volta che si carica il protocollo.
    // Le scadenze in-scadenza (sotto) sovrascriveranno questa selezione iniziale quando disponibili.
    // P74: non pre-selezionare se il tipo visita non è ancora scelto (tipoVisitaMDL null).
    useEffect(() => {
        if (prestazioniProtocollo.length > 0) {
            // Attendiamo che l'utente (o l'auto-selezione da scadenze) confermi un tipo visita:
            // finché è null il campo resta vuoto, così l'utente vede a protocollo ma non trova
            // accertamenti già spuntati senza aver scelto il tipo.
            if (!tipoVisitaMDL) {
                setPrestazioniSelezionate(new Set());
                return;
            }
            const obbligatorieIds = new Set(
                prestazioniProtocollo
                    .filter(pp => pp.isObbligatoria && pp.prestazioneId && pp.prestazioneId !== selectedPrestazione?.id)
                    .map(pp => pp.prestazioneId!)
            );
            setPrestazioniSelezionate(obbligatorieIds);
        } else {
            setPrestazioniSelezionate(new Set());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prestazioniProtocollo.map(pp => pp.id).join(',')]);

    // P72: Auto-selezione prestazioni da ScadenzaPrestazioneProtocollo in scadenza (±60 giorni).
    // Priorità: scadenze (fonte dati reali) > protocollo obbligatorie (default).
    // Il ref evita di sovrascrivere le scelte manuali dell'utente dopo la prima auto-selezione.
    const autoSelezioneScadenzeKey = useRef<string | null>(null);
    useEffect(() => {
        if (!isMDLVisit || isLoadingScadenze || scadenzeInScadenzaData === undefined) return;
        const selectionKey = `${selectedPaziente?.id ?? ''}|${targetDateISOForQuery ?? ''}`;
        if (autoSelezioneScadenzeKey.current === selectionKey) return; // già processato
        autoSelezioneScadenzeKey.current = selectionKey;

        const scadenzeList = Array.isArray(scadenzeInScadenzaData) ? scadenzeInScadenzaData : (scadenzeInScadenzaData as any)?.data ?? [];
        if (scadenzeList.length > 0) {
            // Ci sono prestazioni in scadenza: auto-selezioniamo solo quelle obbligatorie nel protocollo
            const obbligatorieByPrestazione = new Set(
                prestazioniProtocollo.filter(pp => pp.isObbligatoria).map(pp => pp.prestazioneId).filter(Boolean)
            );
            const prestazioniIds = new Set(
                scadenzeList
                    .map((s: { prestazioneId: string }) => s.prestazioneId)
                    .filter((id: string) => id && id !== selectedPrestazione?.id && obbligatorieByPrestazione.has(id))
            ) as Set<string>;
            setPrestazioniSelezionate(prestazioniIds);
        } else {
            // Nessuna scadenza in ±60 giorni: mostriamo solo la visita principale, senza accertamenti pre-selezionati
            setPrestazioniSelezionate(new Set());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scadenzeInScadenzaData, isLoadingScadenze, isMDLVisit]);

    // Reset autoSelezione ref cuando cambia paziente o data
    useEffect(() => {
        autoSelezioneScadenzeKey.current = null;
    }, [selectedPaziente?.id, targetDateISOForQuery]);

    const onTogglePrestazione = useCallback((prestazioneId: string) => {
        setPrestazioniSelezionate(prev => {
            const next = new Set(prev);
            if (next.has(prestazioneId)) {
                next.delete(prestazioneId);
            } else {
                next.add(prestazioneId);
            }
            return next;
        });
    }, []);

    // True se il paziente ha già almeno una visita MDL (determina auto-selezione PERIODICA vs PREVENTIVA)
    const hasPrevVisita = useMemo(
        () => ((storicoMDLData as any)?.visite ?? []).some((v: any) => v.tipoVisitaMDL),
        [storicoMDLData]
    );

    // Auto-selezione tipo visita MDL.
    // Priorità: scadenze in ±60gg + hasPrevVisita → PERIODICA | scadenze + !hasPrevVisita → PREVENTIVA | nessuna scadenza → selezione manuale
    // Un ref traccia il valore auto-impostato per consentire l'override quando arrivano le scadenze.
    const autoSetTipoRef = useRef<TipoVisitaMDL | null>(null);
    useEffect(() => {
        if (!isMDLVisit || isEditMode || !selectedPaziente?.id) return;

        const scadenzeList = Array.isArray(scadenzeInScadenzaData)
            ? scadenzeInScadenzaData
            : (scadenzeInScadenzaData as { data?: unknown[] } | undefined)?.data ?? [];
        const hasScadenzeLoaded = !isLoadingScadenze && !!targetDateISOForQuery;

        if (hasScadenzeLoaded && (scadenzeList as unknown[]).length > 0) {
            // Ci sono scadenze in ±60gg → PREVENTIVA se è la prima volta, altrimenti PERIODICA
            if (tipoVisitaMDL === null || tipoVisitaMDL === autoSetTipoRef.current) {
                const tipo: TipoVisitaMDL = hasPrevVisita ? 'PERIODICA' : 'PREVENTIVA';
                autoSetTipoRef.current = tipo;
                setTipoVisitaMDL(tipo);
            }
            return;
        }

        if (hasScadenzeLoaded && (scadenzeList as unknown[]).length === 0 && !isLoadingStorico && storicoMDLData !== undefined && !hasPrevVisita) {
            // Nessuna scadenza in ±60gg → NON auto-impostare nessun tipo.
            // Il tipo deve essere scelto manualmente dall'operatore (potrebbe essere PREVENTIVA,
            // CAMBIO_MANSIONE, o altro — non è detto che sia una prima visita).
            // hasPrevVisita=false + nessuna scadenza → selezione manuale obbligatoria come hasPrevVisita=true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMDLVisit, isEditMode, selectedPaziente?.id, scadenzeInScadenzaData, isLoadingScadenze, targetDateISOForQuery, isLoadingStorico, storicoMDLData, hasPrevVisita, tipoVisitaMDL]);

    // Reset ref quando cambia paziente o si chiude il pannello MDL
    useEffect(() => {
        autoSetTipoRef.current = null;
    }, [selectedPaziente?.id, isMDLVisit]);

    const mdlData = useMemo(() => {
        const scadenzeList = Array.isArray(scadenzeInScadenzaData) ? scadenzeInScadenzaData : (scadenzeInScadenzaData as any)?.data ?? [];
        const hasScadenzeLoaded = !isLoadingScadenze && isMDLVisit && !!selectedPaziente?.id && !!targetDateISOForQuery;
        return {
            isMDLVisit,
            mansioni: workerRisksData?.mansioni ?? [],
            protocolli: protocolliData ?? [],
            prestazioniProtocollo,
            prestazioniSelezionate,
            onTogglePrestazione,
            ultimaVisitaMDL: lastMDLVisit,
            prossimaVisitaData,
            companyPrezzoTariffario,
            isLoading: isLoadingWorkerRisks || isLoadingProtocolli || isLoadingStorico || isLoadingScadenze,
            isEmployee: !!patientCompanyId,
            hasPrevVisita,
            prossimaScadenzaIsBooked: storicoMDLData?.prossimaScadenzaIsBooked ?? false,
            prossimaScadenzaAppuntamentoData: storicoMDLData?.prossimaScadenzaAppuntamentoData ?? null,
            // P72: Scadenze in ±60 giorni per auto-selezione
            scadenzeInScadenza: scadenzeList,
            hasScadenzeLoaded,
            nessunScadenzaTrovata: hasScadenzeLoaded && scadenzeList.length === 0,
        };
    }, [isMDLVisit, workerRisksData, protocolliData, prestazioniProtocollo, prestazioniSelezionate, onTogglePrestazione, lastMDLVisit, prossimaVisitaData, companyPrezzoTariffario, isLoadingWorkerRisks, isLoadingProtocolli, isLoadingStorico, isLoadingScadenze, patientCompanyId, hasPrevVisita, storicoMDLData, scadenzeInScadenzaData, selectedPaziente?.id, targetDateISOForQuery]);

    // Filtered lists
    const filteredPrestazioni = useMemo(() => {
        if (!prestazioniData?.data) return [];
        if (medicoDetails?.abilitazioni && medicoDetails.abilitazioni.length > 0) {
            const abilitazioniIds = medicoDetails.abilitazioni
                .filter(a => a.attivo)
                .map(a => a.prestazioneId);
            return prestazioniData.data.filter(p => abilitazioniIds.includes(p.id));
        }
        return prestazioniData.data;
    }, [prestazioniData, medicoDetails]);

    const filteredBundles = useMemo(() => {
        if (!bundleData?.data) return [];
        if (medicoDetails?.abilitazioni && medicoDetails.abilitazioni.length > 0) {
            const abilitazioniIds = new Set(
                medicoDetails.abilitazioni
                    .filter(a => a.attivo)
                    .map(a => a.prestazioneId)
            );
            return bundleData.data.filter(bundle => {
                if (!bundle.prestazioni || bundle.prestazioni.length === 0) return false;
                return bundle.prestazioni.every(bp => abilitazioniIds.has(bp.prestazioneId));
            });
        }
        return bundleData.data;
    }, [bundleData, medicoDetails]);

    const filteredMediciForReschedule = useMemo(() => {
        const mediciList = allMediciWithAbilitazioni || allMedici;
        if (!mediciList || mediciList.length === 0) return [];
        if (!selectedPrestazione) return mediciList;

        return mediciList.filter(m => {
            const medicoAbilitazioni = (m as Medico & { abilitazioni?: Array<{ prestazioneId: string; attivo?: boolean }> }).abilitazioni;
            if (!medicoAbilitazioni || medicoAbilitazioni.length === 0) return true;
            return medicoAbilitazioni.some(
                a => a.prestazioneId === selectedPrestazione.id && (a.attivo !== false)
            );
        });
    }, [allMediciWithAbilitazioni, allMedici, selectedPrestazione]);

    const filteredConvenzioni = useMemo(() => {
        if (!convenzioniData?.data) return [];
        if (!selectedPrestazione && !selectedBundle) return convenzioniData.data;

        return convenzioniData.data.filter(conv => {
            const condizioni = conv.condizioni as {
                prestazioniIds?: string[];
                bundleIds?: string[];
            } | null;

            if (selectedPrestazione) {
                const hasListinoForPrestazione = conv.listiniPrezzo?.some(
                    listino => listino.prestazioneId === selectedPrestazione.id
                );
                if (hasListinoForPrestazione) return true;
                if (condizioni?.prestazioniIds && condizioni.prestazioniIds.length > 0) {
                    return condizioni.prestazioniIds.includes(selectedPrestazione.id);
                }
                return false;
            }

            if (selectedBundle) {
                const hasListinoForBundle = conv.listiniPrezzo?.some(
                    listino => listino.bundleId === selectedBundle.id
                );
                if (hasListinoForBundle) return true;
                if (condizioni?.bundleIds && condizioni.bundleIds.length > 0) {
                    return condizioni.bundleIds.includes(selectedBundle.id);
                }
                return false;
            }

            return false;
        });
    }, [convenzioniData, selectedPrestazione, selectedBundle]);

    // Reset form
    const resetForm = useCallback(() => {
        setPazienteSearch('');
        setSelectedPaziente(null);
        setSelectedPrestazione(null);
        setSelectedBundle(null);
        setSelectionType('prestazione');
        setSelectedTariffario(null);
        setDurataMinuti(30);
        setNote('');
        setTipoVisitaMDL(null);
        setPrestazioniSelezionate(new Set());
        setSelectedConvenzione(null);
        setCodiceSconto('');
        setScontoValidato(null);
        setConvenzioneWarning(null);
        setShowReschedulePanel(false);
        setRescheduleData({ date: '', time: '', medicoId: '' });
        setShowNewPatientForm(false);
        setNewPatientData({ firstName: '', lastName: '', phone: '', email: '' });
        setOverbookingAccepted(false);
        setForceOverbooking(false);
    }, []);

    // Initialize form when modal opens
    useEffect(() => {
        if (isOpen) {
            if (existingAppointment) {
                const app = existingAppointment.raw as Appuntamento;
                if (app.paziente) {
                    const pazienteData = app.paziente as Paziente & { firstName?: string; lastName?: string; phone?: string };
                    const mappedPaziente: Paziente = {
                        ...pazienteData,
                        nome: pazienteData.nome || pazienteData.firstName || '',
                        cognome: pazienteData.cognome || pazienteData.lastName || '',
                        telefono: pazienteData.telefono || pazienteData.phone || ''
                    };
                    setSelectedPaziente(mappedPaziente);
                }
                if (app.prestazione) {
                    setSelectedPrestazione(app.prestazione);
                    setSelectionType('prestazione');
                }
                const duration = app.durataMinuti !== undefined && app.durataMinuti !== null ? app.durataMinuti : 30;
                setDurataMinuti(duration);
                setNote(app.note || '');
                setTipoVisitaMDL((app.tipoVisitaMDL as TipoVisitaMDL | undefined) || null);

                const appDate = new Date(app.dataOra);
                setRescheduleData({
                    date: appDate.toISOString().split('T')[0],
                    time: appDate.toTimeString().slice(0, 5),
                    medicoId: app.medicoId || ''
                });
                setShowReschedulePanel(false);

                if (!app.convenzioneId) {
                    setSelectedConvenzione(null);
                    setCodiceSconto('');
                    setScontoValidato(null);
                }
            } else {
                resetForm();
            }
            setShowNewPatientForm(false);
            setNewPatientData({ firstName: '', lastName: '', phone: '', email: '' });
            setOverbookingAccepted(false);
            setForceOverbooking(false);
        }
    }, [isOpen, existingAppointment, resetForm]);

    // Restore convenzione when data loads in edit mode
    useEffect(() => {
        if (isOpen && existingAppointment && convenzioniData?.data) {
            const app = existingAppointment.raw as Appuntamento;
            if (app.convenzioneId) {
                const savedConvenzione = convenzioniData.data.find(c => c.id === app.convenzioneId);
                if (savedConvenzione) {
                    setSelectedConvenzione(savedConvenzione);
                }
            }
        }
    }, [isOpen, existingAppointment, convenzioniData]);

    // Auto-set duration when prestazione/bundle/tipoVisitaMDL changes
    // For MDL visits: use per-type duration if available
    useEffect(() => {
        if (selectedPrestazione) {
            let durata = selectedPrestazione.durataPrevista || 30;
            if (tipoVisitaMDL === 'PREVENTIVA' || tipoVisitaMDL === 'PREVENTIVA_PREASSUNTIVA') {
                durata = selectedPrestazione.durataPrimaVisita || durata;
            } else if (tipoVisitaMDL === 'PERIODICA') {
                durata = selectedPrestazione.durataControllo || durata;
            }
            setDurataMinuti(durata);
        } else if (selectedBundle) {
            setDurataMinuti(selectedBundle.durataBundle || 60);
        }
    }, [selectedPrestazione, selectedBundle, tipoVisitaMDL]);

    // Reset convenzione if it's no longer compatible
    useEffect(() => {
        if (selectedConvenzione && (selectedPrestazione || selectedBundle)) {
            const isStillValid = filteredConvenzioni.some(c => c.id === selectedConvenzione.id);
            if (!isStillValid) {
                setSelectedConvenzione(null);
                setCodiceSconto('');
                setScontoValidato(null);
            }
        }
    }, [selectedPrestazione, selectedBundle, filteredConvenzioni, selectedConvenzione]);

    // Auto-apply convenzione discount
    useEffect(() => {
        if (selectedConvenzione) {
            const condizioni = selectedConvenzione.condizioni as {
                codiceSconto?: string;
                bundleIds?: string[];
                prestazioniIds?: string[];
                percentualeSconto?: number;
                scontoFisso?: number;
            } | null;

            if (condizioni?.codiceSconto) {
                setCodiceSconto(condizioni.codiceSconto);

                (async () => {
                    setIsValidatingSconto(true);
                    try {
                        const result = await scontiApi.validate({
                            codice: condizioni.codiceSconto!,
                            prezzoBase: 100
                        });
                        if (result.valid && result.sconto) {
                            const tipoSconto = result.sconto.tipo?.toUpperCase() === 'PERCENTUALE'
                                ? 'PERCENTUALE'
                                : 'VALORE_ASSOLUTO';
                            setScontoValidato({
                                valid: true,
                                tipo: tipoSconto as 'PERCENTUALE' | 'VALORE_ASSOLUTO',
                                valore: Number(result.sconto.valore)
                            });
                        } else {
                            const errorMsg = result.errors?.length ? result.errors[0] : 'Codice sconto non valido';
                            setScontoValidato({ valid: false, error: errorMsg });
                        }
                    } catch (err: unknown) {
                        const errorMsg = 'Errore nella validazione';
                        setScontoValidato({ valid: false, error: errorMsg });
                    } finally {
                        setIsValidatingSconto(false);
                    }
                })();
            } else if (condizioni?.percentualeSconto) {
                setScontoValidato({
                    valid: true,
                    tipo: 'PERCENTUALE',
                    valore: condizioni.percentualeSconto
                });
                setCodiceSconto('');
            } else if (condizioni?.scontoFisso) {
                setScontoValidato({
                    valid: true,
                    tipo: 'VALORE_ASSOLUTO',
                    valore: condizioni.scontoFisso
                });
                setCodiceSconto('');
            }

            // Check compatibility warning
            if (selectedBundle && condizioni?.bundleIds && condizioni.bundleIds.length > 0) {
                if (!condizioni.bundleIds.includes(selectedBundle.id)) {
                    setConvenzioneWarning('Questo bundle non è incluso nella convenzione selezionata');
                } else {
                    setConvenzioneWarning(null);
                }
            } else if (selectedPrestazione && condizioni?.prestazioniIds && condizioni.prestazioniIds.length > 0) {
                if (!condizioni.prestazioniIds.includes(selectedPrestazione.id)) {
                    setConvenzioneWarning('Questa prestazione non è inclusa nella convenzione selezionata');
                } else {
                    setConvenzioneWarning(null);
                }
            } else {
                setConvenzioneWarning(null);
            }
        } else {
            setConvenzioneWarning(null);
            setCodiceSconto('');
            setScontoValidato(null);
        }
    }, [selectedConvenzione, selectedPrestazione, selectedBundle]);

    // Actions
    const handleValidateSconto = useCallback(async () => {
        if (!codiceSconto.trim()) return;

        setIsValidatingSconto(true);
        try {
            const result = await scontiApi.validate({
                codice: codiceSconto.trim(),
                prezzoBase: 100
            });
            if (result.valid && result.sconto) {
                const tipoSconto = result.sconto.tipo?.toUpperCase() === 'PERCENTUALE'
                    ? 'PERCENTUALE'
                    : 'VALORE_ASSOLUTO';
                setScontoValidato({
                    valid: true,
                    tipo: tipoSconto as 'PERCENTUALE' | 'VALORE_ASSOLUTO',
                    valore: Number(result.sconto.valore)
                });
            } else {
                // Capture error messages from backend validation
                const errorMsg = result.errors?.length ? result.errors[0] : 'Codice sconto non valido';
                setScontoValidato({ valid: false, error: errorMsg });
            }
        } catch (err: unknown) {
            const errorMsg = 'Errore nella validazione';
            setScontoValidato({ valid: false, error: errorMsg });
        } finally {
            setIsValidatingSconto(false);
        }
    }, [codiceSconto]);

    const calcolaPrezzoScontato = useCallback((prezzoBase: number | undefined): number | null => {
        if (!prezzoBase || !scontoValidato?.valid || !scontoValidato.valore) return null;

        if (scontoValidato.tipo === 'PERCENTUALE') {
            return prezzoBase * (1 - scontoValidato.valore / 100);
        } else {
            return Math.max(0, prezzoBase - scontoValidato.valore);
        }
    }, [scontoValidato]);

    const handleCreateProvisionalPatient = useCallback(async () => {
        const { firstName, lastName, phone, email } = newPatientData;

        if (!firstName.trim() || !lastName.trim()) {
            showToast({ type: 'error', message: 'Nome e cognome sono obbligatori' });
            return;
        }

        if (!phone.trim() && !email.trim()) {
            showToast({ type: 'error', message: 'Inserisci almeno un recapito (telefono o email)' });
            return;
        }

        setIsCreatingPatient(true);
        try {
            const response = await pazientiApi.createProvisional({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                phone: phone.trim() || undefined,
                email: email.trim() || undefined
            });

            if (response.success && response.data) {
                const newPaziente = {
                    id: response.data.id,
                    nome: response.data.firstName,
                    cognome: response.data.lastName,
                    codiceFiscale: response.data.taxCode || '',
                    dataNascita: response.data.birthDate,
                    telefono: response.data.phone,
                    email: response.data.email,
                    indirizzo: response.data.residenceAddress,
                    tenantId: response.data.tenantId,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                } as Paziente;
                setSelectedPaziente(newPaziente);
                setShowNewPatientForm(false);
                setNewPatientData({ firstName: '', lastName: '', phone: '', email: '' });
                showToast({
                    type: 'success',
                    message: response.isNew
                        ? 'Paziente creato con successo'
                        : 'Paziente già esistente selezionato'
                });
            }
        } catch (error) {
            showToast({
                type: 'error',
                message: 'Errore nella creazione del paziente'
            });
        } finally {
            setIsCreatingPatient(false);
        }
    }, [newPatientData, showToast]);

    const handleSavePatientEdit = useCallback(async () => {
        if (!selectedPaziente) return;

        const { firstName, lastName, phone, email } = editPatientData;

        if (!firstName.trim() || !lastName.trim()) {
            showToast({ type: 'error', message: 'Nome e cognome sono obbligatori' });
            return;
        }

        setIsSavingPatient(true);
        try {
            const response = await pazientiApi.update(selectedPaziente.id, {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                phone: phone.trim() || undefined,
                email: email.trim() || undefined
            });

            if (response) {
                const updatedResponse = response as Paziente & { firstName?: string; lastName?: string };
                const updatedPaziente = {
                    ...selectedPaziente,
                    nome: updatedResponse.nome || updatedResponse.firstName || firstName.trim(),
                    cognome: updatedResponse.cognome || updatedResponse.lastName || lastName.trim(),
                    telefono: updatedResponse.telefono || (updatedResponse as Paziente & { phone?: string }).phone || phone.trim(),
                    email: updatedResponse.email || email.trim()
                } as Paziente;
                setSelectedPaziente(updatedPaziente);
                setIsEditingPatient(false);
                queryClient.invalidateQueries({ queryKey: ['pazienti-search-modal'] });
                showToast({ type: 'success', message: 'Dati paziente aggiornati' });
            }
        } catch (error) {
            showToast({
                type: 'error',
                message: 'Errore nell\'aggiornamento del paziente'
            });
        } finally {
            setIsSavingPatient(false);
        }
    }, [selectedPaziente, editPatientData, showToast, queryClient]);

    const startEditingPatient = useCallback(() => {
        if (!selectedPaziente) return;
        setEditPatientData({
            firstName: selectedPaziente.nome || (selectedPaziente as Paziente & { firstName?: string }).firstName || '',
            lastName: selectedPaziente.cognome || (selectedPaziente as Paziente & { lastName?: string }).lastName || '',
            phone: selectedPaziente.telefono || (selectedPaziente as Paziente & { phone?: string }).phone || '',
            email: selectedPaziente.email || ''
        });
        setIsEditingPatient(true);
    }, [selectedPaziente]);

    const cancelEditingPatient = useCallback(() => {
        setIsEditingPatient(false);
        setEditPatientData({ firstName: '', lastName: '', phone: '', email: '' });
    }, []);

    const handleSubmit = useCallback(async () => {
        const hasSelection = selectedPrestazione || selectedBundle;
        if (!selectedPaziente || !hasSelection || !medico) {
            showToast({ type: 'error', message: 'Compila tutti i campi obbligatori' });
            return;
        }

        setIsSubmitting(true);

        let appointmentDate: Date;
        let appointmentMedicoId = medico.id;

        if (isEditMode && existingAppointment) {
            if (rescheduleData.date && rescheduleData.time) {
                appointmentDate = new Date(`${rescheduleData.date}T${rescheduleData.time}`);
            } else {
                appointmentDate = existingAppointment.start;
            }
            if (rescheduleData.medicoId) {
                appointmentMedicoId = rescheduleData.medicoId;
            }
        } else if (slotInfo) {
            appointmentDate = new Date(slotInfo.date);
            const hours = Math.floor(slotInfo.hour);
            const minutes = Math.round((slotInfo.hour - hours) * 60);
            appointmentDate.setHours(hours, minutes, 0, 0);
        } else {
            showToast({ type: 'error', message: 'Data/ora non valida' });
            setIsSubmitting(false);
            return;
        }

        // Check for duplicate booking (same patient, same doctor, same day)
        // Skip if user already confirmed or in edit mode
        if (!duplicateConfirmed && !isEditMode) {
            try {
                const duplicateCheck = await appuntamentiApi.checkDuplicate(
                    selectedPaziente.id,
                    appointmentMedicoId,
                    appointmentDate.toISOString()
                );

                if (duplicateCheck.hasDuplicate && duplicateCheck.existingAppointments.length > 0) {
                    setDuplicateAppointments(duplicateCheck.existingAppointments);
                    setShowDuplicateWarning(true);
                    setIsSubmitting(false);
                    return; // Stop submission, wait for user confirmation
                }
            } catch {
                // If check fails, log but continue with booking
            }
        }

        const appointmentData: Partial<Appuntamento> & { durataMinuti?: number; isOverbooking?: boolean } = {
            pazienteId: selectedPaziente.id,
            medicoId: appointmentMedicoId,
            ambulatorioId: isEditMode && existingAppointment ? existingAppointment.ambulatorioId : slotInfo?.ambulatorioId,
            prestazioneId: selectedPrestazione?.id,
            convenzioneId: selectedConvenzione?.id || undefined,
            dataOra: appointmentDate.toISOString(),
            durataMinuti: durataMinuti,
            isOverbooking: isOverbooking || false,
            note: note || undefined,
            stato: isEditMode ? (existingAppointment?.stato || 'PRENOTATO') : 'PRENOTATO',
            tipoVisitaMDL: tipoVisitaMDL || undefined,
        };

        try {
            if (isEditMode && existingAppointment) {
                await appuntamentiApi.update(existingAppointment.id, appointmentData);
                showToast({ type: 'success', message: 'Appuntamento aggiornato con successo' });
            } else {
                const newApp = await appuntamentiApi.create(appointmentData);

                // MDL: aggiungi solo le prestazioni protocollo selezionate dall'utente
                const newAppId = (newApp as Appuntamento & { id: string })?.id;
                if (isMDLVisit && newAppId && prestazioniSelezionate.size > 0) {
                    const extraPrestazioni = prestazioniProtocollo
                        .filter(pp => pp.prestazioneId &&
                            pp.prestazioneId !== selectedPrestazione?.id &&
                            prestazioniSelezionate.has(pp.prestazioneId))
                        .map((pp, idx) => ({ prestazioneId: pp.prestazioneId, ordine: idx + 1 }));
                    if (extraPrestazioni.length > 0) {
                        try {
                            await appuntamentoPrestazioniApi.create(newAppId, extraPrestazioni);
                        } catch {
                            // Le prestazioni aggiuntive non bloccano il flusso principale
                        }
                    }
                }

                showToast({ type: 'success', message: 'Appuntamento creato con successo' });
            }

            queryClient.invalidateQueries({ queryKey: ['appuntamenti'], refetchType: 'all' });
            queryClient.invalidateQueries({ queryKey: ['appuntamenti-calendario'], refetchType: 'all' });
            setDuplicateConfirmed(false);
            onSuccess();
            onClose();
        } catch (error) {
            const isConflict = (error as Error & { status?: number })?.message?.toLowerCase().includes('conflict') ||
                (error as Error & { status?: number })?.message?.toLowerCase().includes('esistente') ||
                (error as { status?: number })?.status === 409;

            if (isConflict && !isOverbooking) {
                setForceOverbooking(true);
                showToast({
                    type: 'warning',
                    message: 'Esiste già un appuntamento in questo orario. Conferma l\'overbooking per procedere.',
                    duration: 5000
                });
            } else {
                showToast({ type: 'error', message: isEditMode ? 'Errore nell\'aggiornamento dell\'appuntamento' : 'Errore nella creazione dell\'appuntamento' });
            }
        } finally {
            setIsSubmitting(false);
        }
    }, [
        selectedPaziente, selectedPrestazione, selectedBundle, medico, isEditMode, existingAppointment,
        rescheduleData, slotInfo, selectedConvenzione, durataMinuti, isOverbooking, note, duplicateConfirmed,
        isMDLVisit, prestazioniProtocollo, prestazioniSelezionate, tipoVisitaMDL,
        showToast, queryClient, onSuccess, onClose
    ]);

    // Handler for confirming duplicate booking
    const handleConfirmDuplicate = useCallback(() => {
        setDuplicateConfirmed(true);
        setShowDuplicateWarning(false);
        // Re-trigger submit with duplicate confirmed
        handleSubmit();
    }, [handleSubmit]);

    // Handler for canceling duplicate booking
    const handleCancelDuplicate = useCallback(() => {
        setShowDuplicateWarning(false);
        setDuplicateAppointments([]);
        setDuplicateConfirmed(false);
    }, []);

    return {
        // Tenant context (Project 51)
        operateTenantId,
        operateTenant,
        canPerformCRUD,

        // Patient state
        pazienteSearch,
        setPazienteSearch,
        selectedPaziente,
        setSelectedPaziente,

        // Prestazione/Bundle state
        selectedPrestazione,
        setSelectedPrestazione,
        selectedBundle,
        setSelectedBundle,
        selectionType,
        setSelectionType,
        selectedTariffario,
        setSelectedTariffario,

        // Duration and notes
        durataMinuti,
        setDurataMinuti,
        note,
        setNote,

        // Convenzione and discount
        selectedConvenzione,
        setSelectedConvenzione,
        codiceSconto,
        setCodiceSconto,
        scontoValidato,
        setScontoValidato,
        isValidatingSconto,
        convenzioneWarning,

        // Overbooking
        forceOverbooking,
        setForceOverbooking,
        overbookingAccepted,
        setOverbookingAccepted,

        // Reschedule
        showReschedulePanel,
        setShowReschedulePanel,
        rescheduleData,
        setRescheduleData,

        // New patient
        showNewPatientForm,
        setShowNewPatientForm,
        newPatientData,
        setNewPatientData,
        isCreatingPatient,

        // Edit patient
        isEditingPatient,
        setIsEditingPatient,
        editPatientData,
        setEditPatientData,
        isSavingPatient,

        // Submit state
        isSubmitting,

        // Computed values
        isEditMode,
        isOverbooking,

        // MDL - Medicina del Lavoro
        tipoVisitaMDL,
        setTipoVisitaMDL,
        mdlData,

        // Duplicate booking warning
        showDuplicateWarning,
        duplicateAppointments,
        handleConfirmDuplicate,
        handleCancelDuplicate,

        // Actions
        handleValidateSconto,
        handleCreateProvisionalPatient,
        handleSavePatientEdit,
        startEditingPatient,
        cancelEditingPatient,
        handleSubmit,
        calcolaPrezzoScontato,
        resetForm,

        // Pass through filtered data (need to add to type)
        filteredPrestazioni,
        filteredBundles,
        filteredMediciForReschedule,
        filteredConvenzioni,
        medicoDetails
    } as UseAppointmentFormReturn & {
        filteredPrestazioni: Prestazione[];
        filteredBundles: OffertaBundle[];
        filteredMediciForReschedule: Medico[];
        filteredConvenzioni: Convenzione[];
        medicoDetails: Medico | null;
        showDuplicateWarning: boolean;
        duplicateAppointments: Appuntamento[];
        handleConfirmDuplicate: () => void;
        handleCancelDuplicate: () => void;
    };
}

export default useAppointmentForm;
