/**
 * P68 - Disponibilità Calendario v3
 * Calendario turni con:
 * - Celle per ogni fascia (Mattina/Pomeriggio) per ogni giorno
 * - Drag-select per colorare disponibilità
 * - Vista aggregata per tutti i dipendenti
 * - Conteggi fabbisogno per mansione ai bordi
 * - Permessi: dipendenti modificano solo proprie, HR manager tutte
 * - Salvataggio multi-profilo con composite key (profiloHR + data + fascia)
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantFilter } from '@/context/TenantFilterContext';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Check,
    X,
    Save,
    Users,
    Info,
    Paintbrush,
    Eraser,
    BarChart3,
    Shield,
    Clock,
    CalendarPlus,
    Briefcase,
    Trash2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import { CRUDButton, CRUDPrimaryButton } from '@/components/shared/CRUDButton';
import {
    disponibilitaApi,
    profiliHRApi,
    mansioniInterneApi,
    turniApi,
    type PreferenzaDisponibilita,
    type FasciaOraria,
    type DisponibilitaCalendario,
    type ProfiloHR,
    type MansioneInterna,
    type TurnoAssegnato,
    type TurnoTemplate,
} from './api';

// ============================================================================
// CONSTANTS
// ============================================================================

// Fasce orarie per le colonne del calendario
const FASCE: FasciaOraria[] = ['MATTINA', 'POMERIGGIO'];
const FASCIA_LABELS: Record<FasciaOraria, string> = {
    MATTINA: 'M',
    POMERIGGIO: 'P',
    GIORNATA_INTERA: 'G',
    FLESSIBILE: 'F',
};

// Preferenze disponibilità - Senza ½ mattina/pomeriggio (ridondante con colonne M/P)
const PREFERENZE_ATTIVE: PreferenzaDisponibilita[] = [
    'DISPONIBILE',
    'PREFERISCO_NO',
    'NON_DISPONIBILE',
    'SMART_WORKING',
];

// Colori per la selezione disponibilità
const DISPONIBILITA_COLORS: Record<PreferenzaDisponibilita, { bg: string; label: string; icon: React.ReactNode }> = {
    DISPONIBILE: { bg: 'bg-emerald-500', label: 'Disponibile', icon: <Check className="w-3 h-3" /> },
    PREFERISCO_NO: { bg: 'bg-amber-400', label: 'Preferisco No', icon: <span className="text-[10px]">?</span> },
    NON_DISPONIBILE: { bg: 'bg-red-500', label: 'Non Disponibile', icon: <X className="w-3 h-3" /> },
    SMART_WORKING: { bg: 'bg-blue-400', label: 'Smart Working', icon: <span className="text-[10px]">SW</span> },
    MEZZA_GIORNATA_MATTINA: { bg: 'bg-teal-400', label: '½ Mattina', icon: <span className="text-[10px]">½M</span> },
    MEZZA_GIORNATA_POMERIGGIO: { bg: 'bg-indigo-400', label: '½ Pomeriggio', icon: <span className="text-[10px]">½P</span> },
};

// Nomi giorni abbreviati in italiano
const GIORNO_ABBR = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];

// Modalità pagina
type PageMode = 'disponibilita' | 'turni';

// Orari default per fasce quando si assegna un turno senza template
const FASCIA_DEFAULT_HOURS: Record<FasciaOraria, { oraInizio: string; oraFine: string }> = {
    MATTINA: { oraInizio: '08:00', oraFine: '13:00' },
    POMERIGGIO: { oraInizio: '14:00', oraFine: '19:00' },
    GIORNATA_INTERA: { oraInizio: '08:00', oraFine: '17:00' },
    FLESSIBILE: { oraInizio: '08:00', oraFine: '16:00' },
};

type ApiMutationError = Error & {
    response?: {
        status?: number;
        data?: { message?: string };
    };
};

// ============================================================================
// HELPERS - Date in LOCAL timezone (no UTC conversion!)
// ============================================================================

function getDaysInMonth(year: number, month: number): Date[] {
    const days: Date[] = [];
    const lastDay = new Date(year, month + 1, 0);
    for (let d = 1; d <= lastDay.getDate(); d++) {
        days.push(new Date(year, month, d));
    }
    return days;
}

/** Format date as YYYY-MM-DD using LOCAL timezone (NOT UTC) */
function formatDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/** Parse a date string preserving local timezone */
function parseLocalDate(dateStr: string): Date {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
}

// ============================================================================
// COMPONENT
// ============================================================================

const DisponibilitaPage: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    // Permissions: HR manager can edit all, employee only own
    const isManager = user?.roles?.includes('ADMIN') || user?.roles?.includes('SUPER_ADMIN') || user?.roles?.includes('HR_MANAGER');

    // Stato mese corrente
    const [currentDate, setCurrentDate] = useState(new Date());
    const anno = currentDate.getFullYear();
    const mese = currentDate.getMonth() + 1;

    // Modalità pagina: disponibilità (paint) o turni (assegnazione)
    const [pageMode, setPageMode] = useState<PageMode>('disponibilita');

    // Stato turni mode: mansione selezionata e template opzionale
    const [selectedMansioneId, setSelectedMansioneId] = useState<string>('');
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

    // Stato selezione per drag (disponibilità mode)
    const [selectedColor, setSelectedColor] = useState<PreferenzaDisponibilita>('DISPONIBILE');
    const [isDragging, setIsDragging] = useState(false);
    const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
    const dragStartRef = useRef<string | null>(null);
    const pendingTurniRef = useRef(new Set<string>());

    // Dati modificati localmente (prima del salvataggio)
    const [localChanges, setLocalChanges] = useState<Map<string, PreferenzaDisponibilita>>(new Map());

    // Tenant filter for multi-tenant data isolation
    const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();

    // ========================================================================
    // QUERIES
    // ========================================================================

    // Query: lista profili HR
    const { data: profiliData } = useQuery({
        queryKey: ['hr', 'profili', 'list', tenantFilterKey],
        queryFn: () => {
            const tenantParams = getTenantFilterParams();
            const params: Record<string, unknown> = { isActive: true };
            if (tenantParams.tenantIds) {
                params.tenantIds = tenantParams.tenantIds.join(',');
            }
            if (tenantParams.allTenants) {
                params.allTenants = true;
            }
            return profiliHRApi.list(params);
        },
        enabled: isReady,
    });

    // Query: mansioni interne
    const { data: mansioniData } = useQuery({
        queryKey: ['hr', 'mansioni-interne', 'list', tenantFilterKey],
        queryFn: () => {
            const tenantParams = getTenantFilterParams();
            const params: Record<string, unknown> = { isActive: true };
            if (tenantParams.tenantIds) {
                params.tenantIds = tenantParams.tenantIds.join(',');
            }
            if (tenantParams.allTenants) {
                params.allTenants = true;
            }
            return mansioniInterneApi.list(params);
        },
        enabled: isReady,
    });

    // Query: disponibilità del mese (format date keys with LOCAL timezone)
    const dataInizio = `${anno}-${String(mese).padStart(2, '0')}-01`;
    const dataFine = `${anno}-${String(mese).padStart(2, '0')}-${new Date(anno, mese, 0).getDate()}`;

    const { data: disponibilitaData, isLoading } = useQuery({
        queryKey: ['hr', 'disponibilita', anno, mese, tenantFilterKey],
        queryFn: () => {
            const tenantParams = getTenantFilterParams();
            const params: Record<string, unknown> = { dataInizio, dataFine };
            if (tenantParams.tenantIds) {
                params.tenantIds = tenantParams.tenantIds.join(',');
            }
            if (tenantParams.allTenants) {
                params.allTenants = true;
            }
            return disponibilitaApi.list(params);
        },
        enabled: isReady,
    });

    // Query: turni assegnati del mese
    const { data: turniData } = useQuery({
        queryKey: ['hr', 'turni', 'list', anno, mese, tenantFilterKey],
        queryFn: () => turniApi.listTurni({ dataInizio, dataFine }),
        enabled: isReady,
    });

    // Query: turno templates
    const { data: templatesData } = useQuery({
        queryKey: ['hr', 'turni', 'templates', tenantFilterKey],
        queryFn: () => turniApi.listTemplates(),
        enabled: isReady && pageMode === 'turni',
    });

    // ========================================================================
    // MUTATION: salvataggio multi-profilo
    // ========================================================================

    const saveMutation = useMutation({
        mutationFn: disponibilitaApi.bulkMulti,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr', 'disponibilita'] });
            setLocalChanges(new Map());
            showToast({ message: 'Disponibilità salvate con successo', type: 'success' });
        },
        onError: () => {
            showToast({ message: 'Errore nel salvataggio', type: 'error' });
        },
    });

    // MUTATION: assegnazione turno
    const createTurnoMutation = useMutation({
        mutationFn: turniApi.createTurno,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr', 'turni'] });
            showToast({ message: 'Turno assegnato', type: 'success' });
        },
        onError: (error: ApiMutationError) => {
            if (error?.response?.status === 409) {
                queryClient.invalidateQueries({ queryKey: ['hr', 'turni'] });
                showToast({ message: 'Turno gia presente, calendario aggiornato', type: 'info' });
                return;
            }
            const msg = error?.response?.data?.message || 'Errore nell\'assegnazione del turno';
            showToast({ message: msg, type: 'error' });
        },
        onSettled: () => {
            pendingTurniRef.current.clear();
        },
    });

    // MUTATION: rimozione turno
    const deleteTurnoMutation = useMutation({
        mutationFn: (id: string) => turniApi.deleteTurno(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr', 'turni'] });
            showToast({ message: 'Turno rimosso', type: 'success' });
        },
        onError: (error: ApiMutationError) => {
            if (error?.response?.status === 404) {
                queryClient.invalidateQueries({ queryKey: ['hr', 'turni'] });
                showToast({ message: 'Turno gia rimosso, calendario aggiornato', type: 'info' });
                return;
            }
            showToast({ message: 'Errore nella rimozione', type: 'error' });
        },
        onSettled: () => {
            pendingTurniRef.current.clear();
        },
    });

    // ========================================================================
    // COMPUTED: giorni, mappatura disponibilità, profili, mansioni
    // ========================================================================

    const daysInMonth = useMemo(() => getDaysInMonth(anno, mese - 1), [anno, mese]);
    const today = formatDateKey(new Date());

    // Mappa disponibilità: `${YYYY-MM-DD}_${fascia}_${profiloHRId}` -> record
    const disponibilitaMap = useMemo(() => {
        const map = new Map<string, DisponibilitaCalendario>();
        if (disponibilitaData?.data) {
            for (const d of disponibilitaData.data) {
                // Use LOCAL parsing for the date from server
                const rawDate = typeof d.data === 'string' ? d.data.split('T')[0] : '';
                const dateKey = rawDate || formatDateKey(parseLocalDate(new Date(d.data).toISOString().split('T')[0]));
                const fascia = d.fasciaPreferita || 'GIORNATA_INTERA';
                const key = `${dateKey}_${fascia}_${d.profiloHRId}`;
                map.set(key, d);
            }
        }
        return map;
    }, [disponibilitaData]);

    // Profili filtrati
    const profili: ProfiloHR[] = profiliData?.data || [];

    // Mappa mansioni per ID
    const mansioniMap = useMemo(() => {
        const map = new Map<string, MansioneInterna>();
        if (mansioniData?.data) {
            for (const m of mansioniData.data) {
                map.set(m.id, m);
            }
        }
        return map;
    }, [mansioniData]);

    // Elenco mansioni attive che hanno fabbisogno configurato
    const mansioniConFabbisogno = useMemo(() => {
        return Array.from(mansioniMap.values()).filter(m => {
            if (!m.isActive) return false;
            const req = m.requisitiMinimi as { fabbisognoMattina?: number; fabbisognoPomeriggio?: number } | undefined;
            return (req?.fabbisognoMattina || 0) > 0 || (req?.fabbisognoPomeriggio || 0) > 0;
        });
    }, [mansioniMap]);

    // Mappa turni: `${YYYY-MM-DD}_${profiloHRId}` -> TurnoAssegnato[]
    const turniMap = useMemo(() => {
        const map = new Map<string, TurnoAssegnato[]>();
        if (turniData?.data) {
            for (const t of turniData.data) {
                const rawDate = typeof t.data === 'string' ? t.data.split('T')[0] : '';
                const key = `${rawDate}_${t.profiloHRId}`;
                const existing = map.get(key) || [];
                existing.push(t);
                map.set(key, existing);
            }
        }
        return map;
    }, [turniData]);

    // Templates list e mansioni attive
    const templates: TurnoTemplate[] = templatesData?.data || [];
    const mansioniList: MansioneInterna[] = Array.from(mansioniMap.values()).filter(m => m.isActive);

    // Il profilo HR dell'utente corrente (per permessi)
    const currentUserProfiloId = useMemo(() => {
        if (!user?.id) return null;
        const p = profili.find(pr => pr.personTenantProfile?.person?.id === user.id);
        return p?.id || null;
    }, [profili, user?.id]);

    // ========================================================================
    // DRAG HANDLERS
    // ========================================================================

    const getCellKey = useCallback((data: string, fascia: FasciaOraria, profiloHRId: string) =>
        `${data}_${fascia}_${profiloHRId}`, []);

    /** Check if user can edit THIS cell (own profile or manager) */
    const canEditCell = useCallback((profiloHRId: string) => {
        if (isManager) return true;
        return profiloHRId === currentUserProfiloId;
    }, [isManager, currentUserProfiloId]);

    const handleMouseDown = useCallback((data: string, fascia: FasciaOraria, profiloHRId: string) => {
        if (!canEditCell(profiloHRId)) return;
        const key = getCellKey(data, fascia, profiloHRId);
        setIsDragging(true);
        dragStartRef.current = key;
        setSelectedCells(new Set([key]));
        setLocalChanges(prev => {
            const next = new Map(prev);
            next.set(key, selectedColor);
            return next;
        });
    }, [canEditCell, getCellKey, selectedColor]);

    const handleMouseEnter = useCallback((data: string, fascia: FasciaOraria, profiloHRId: string) => {
        if (!isDragging) return;
        if (!canEditCell(profiloHRId)) return;
        const key = getCellKey(data, fascia, profiloHRId);
        setSelectedCells(prev => new Set([...prev, key]));
        setLocalChanges(prev => {
            const next = new Map(prev);
            next.set(key, selectedColor);
            return next;
        });
    }, [isDragging, canEditCell, getCellKey, selectedColor]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        dragStartRef.current = null;
        setSelectedCells(new Set());
    }, []);

    // ========================================================================
    // ACTIONS
    // ========================================================================

    const handleSaveAll = useCallback(() => {
        if (localChanges.size === 0) {
            showToast({ message: 'Nessuna modifica da salvare', type: 'info' });
            return;
        }

        // Build entries array for bulk-multi endpoint
        const entries: Array<{
            profiloHRId: string;
            data: string;
            preferenza: PreferenzaDisponibilita;
            fasciaPreferita: FasciaOraria;
        }> = [];

        for (const [key, preferenza] of localChanges) {
            const parts = key.split('_');
            // key format: YYYY-MM-DD_FASCIA_profiloHRId
            const data = parts[0];
            const fascia = parts[1] as FasciaOraria;
            const profiloHRId = parts[2];
            entries.push({ profiloHRId, data, preferenza, fasciaPreferita: fascia });
        }

        saveMutation.mutate({ entries });
    }, [localChanges, saveMutation, showToast]);

    const handleClearChanges = useCallback(() => {
        setLocalChanges(new Map());
        showToast({ message: 'Modifiche annullate', type: 'info' });
    }, [showToast]);

    // === TURNI MODE HANDLERS ===

    /** Handle cell click in turni mode: assign or remove turno */
    const handleTurnoCellClick = useCallback((dataKey: string, fascia: FasciaOraria, profiloHRId: string) => {
        if (!isManager) return;

        // Check if turno already exists for this profilo+date+fascia
        const turniKey = `${dataKey}_${profiloHRId}`;
        const operationKey = `${turniKey}_${fascia}`;
        if (pendingTurniRef.current.has(operationKey)) return;
        const existingTurni = turniMap.get(turniKey) || [];

        // Find turno that matches this fascia (by time range)
        const fasciaHours = FASCIA_DEFAULT_HOURS[fascia];
        const matchingTurno = existingTurni.find(t =>
            t.oraInizio === fasciaHours.oraInizio && t.oraFine === fasciaHours.oraFine
        );

        if (matchingTurno) {
            // Remove turno
            pendingTurniRef.current.add(operationKey);
            deleteTurnoMutation.mutate(matchingTurno.id);
        } else {
            // Create turno with mansione
            let oraInizio = fasciaHours.oraInizio;
            let oraFine = fasciaHours.oraFine;

            // If template selected, use template hours
            if (selectedTemplateId) {
                const tmpl = templates.find(t => t.id === selectedTemplateId);
                if (tmpl) {
                    oraInizio = tmpl.oraInizio;
                    oraFine = tmpl.oraFine;
                }
            }

            pendingTurniRef.current.add(operationKey);
            createTurnoMutation.mutate({
                profiloHRId,
                data: dataKey,
                oraInizio,
                oraFine,
                stato: 'PIANIFICATO' as TurnoAssegnato['stato'],
                mansioneInternaId: selectedMansioneId || undefined,
            });
        }
    }, [isManager, turniMap, selectedTemplateId, selectedMansioneId, templates, createTurnoMutation, deleteTurnoMutation]);

    // Navigazione mese
    const goToPrevMonth = () => setCurrentDate(new Date(anno, mese - 2, 1));
    const goToNextMonth = () => setCurrentDate(new Date(anno, mese, 1));

    // ========================================================================
    // CONTEGGI per day/fascia: quanti "DISPONIBILE" per mansione
    // ========================================================================

    const countsByDayFascia = useMemo(() => {
        const counts = new Map<string, Map<string, number>>();

        for (const day of daysInMonth) {
            const dateKey = formatDateKey(day);
            for (const fascia of FASCE) {
                const dayFasciaKey = `${dateKey}_${fascia}`;
                const mansioneCounts = new Map<string, number>();

                for (const profilo of profili) {
                    const cellKey = getCellKey(dateKey, fascia, profilo.id);
                    const preferenza = localChanges.get(cellKey) || disponibilitaMap.get(cellKey)?.preferenza;
                    if (preferenza === 'DISPONIBILE' || preferenza === 'SMART_WORKING') {
                        const mansioneId = profilo.mansioneInternaId || '__unassigned__';
                        mansioneCounts.set(mansioneId, (mansioneCounts.get(mansioneId) || 0) + 1);
                    }
                }

                counts.set(dayFasciaKey, mansioneCounts);
            }
        }

        return counts;
    }, [daysInMonth, profili, localChanges, disponibilitaMap, getCellKey]);

    // Conteggi turni per day/fascia e per mansione
    const turniCountsByDayFascia = useMemo(() => {
        const counts = new Map<string, Map<string, number>>();

        for (const day of daysInMonth) {
            const dateKey = formatDateKey(day);
            for (const fascia of FASCE) {
                const dayFasciaKey = `${dateKey}_${fascia}`;
                const mansioneCounts = new Map<string, number>();
                const fasciaHours = FASCIA_DEFAULT_HOURS[fascia];

                for (const profilo of profili) {
                    const turniKey = `${dateKey}_${profilo.id}`;
                    const turni = turniMap.get(turniKey) || [];
                    const matchingTurno = turni.find(t =>
                        t.oraInizio === fasciaHours.oraInizio && t.oraFine === fasciaHours.oraFine
                    );
                    if (matchingTurno) {
                        const mansioneId = matchingTurno.mansioneInternaId || '__unassigned__';
                        mansioneCounts.set(mansioneId, (mansioneCounts.get(mansioneId) || 0) + 1);
                    }
                }

                counts.set(dayFasciaKey, mansioneCounts);
            }
        }

        return counts;
    }, [daysInMonth, profili, turniMap]);

    // Totale disponibilità e turni per profilo nel mese
    const profiloOreMese = useMemo(() => {
        const oreMap = new Map<string, { dispM: number; dispP: number; turniM: number; turniP: number }>();

        for (const profilo of profili) {
            let dispM = 0;
            let dispP = 0;
            let turniM = 0;
            let turniP = 0;

            for (const day of daysInMonth) {
                const dateKey = formatDateKey(day);
                for (const fascia of FASCE) {
                    const cellKey = getCellKey(dateKey, fascia, profilo.id);
                    const pref = localChanges.get(cellKey) || disponibilitaMap.get(cellKey)?.preferenza;
                    if (pref === 'DISPONIBILE' || pref === 'SMART_WORKING') {
                        if (fascia === 'MATTINA') dispM++;
                        else dispP++;
                    }
                }

                // Count turni from turniMap
                const turniKey = `${dateKey}_${profilo.id}`;
                const turni = turniMap.get(turniKey) || [];
                for (const t of turni) {
                    if (t.oraInizio === FASCIA_DEFAULT_HOURS.MATTINA.oraInizio) turniM++;
                    else turniP++;
                }
            }

            oreMap.set(profilo.id, { dispM, dispP, turniM, turniP });
        }

        return oreMap;
    }, [profili, daysInMonth, localChanges, disponibilitaMap, getCellKey, turniMap]);

    // ========================================================================
    // RENDER CELL
    // ========================================================================

    const renderCell = useCallback((day: Date, fascia: FasciaOraria, profilo: ProfiloHR) => {
        const dataKey = formatDateKey(day);
        const cellKey = getCellKey(dataKey, fascia, profilo.id);

        const localPreferenza = localChanges.get(cellKey);
        const serverData = disponibilitaMap.get(cellKey);
        const preferenza = localPreferenza || serverData?.preferenza;
        const isModified = localChanges.has(cellKey);
        const isToday = dataKey === today;
        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
        const isSelected = selectedCells.has(cellKey);
        const canEdit = canEditCell(profilo.id);

        // Turni data: find turno for this fascia
        const turniKey = `${dataKey}_${profilo.id}`;
        const cellTurni = turniMap.get(turniKey) || [];
        const fasciaHours = FASCIA_DEFAULT_HOURS[fascia];
        const matchingTurno = cellTurni.find(t =>
            t.oraInizio === fasciaHours.oraInizio && t.oraFine === fasciaHours.oraFine
        );
        const hasTurno = !!matchingTurno;

        const isTurniMode = pageMode === 'turni';
        const bgColor = preferenza ? DISPONIBILITA_COLORS[preferenza]?.bg : '';

        // Turno sigla: use mansione sigla or fallback
        let turnoSigla = '';
        let turnoColore = '';
        if (hasTurno && matchingTurno) {
            const mansione = matchingTurno.mansioneInterna;
            if (mansione) {
                turnoSigla = mansione.sigla || mansione.nome.substring(0, 2).toUpperCase();
                turnoColore = mansione.colore || '#7c3aed';
            } else {
                turnoSigla = 'T';
                turnoColore = '#7c3aed';
            }
        }

        return (
            <td
                key={cellKey}
                className={`
                    relative h-8 min-w-[28px] border border-gray-200 select-none
                    transition-all duration-75
                    ${isTurniMode && isManager ? 'cursor-pointer' : ''}
                    ${!isTurniMode && canEdit ? 'cursor-pointer' : ''}
                    ${!isTurniMode && !canEdit ? 'cursor-not-allowed opacity-60' : ''}
                    ${isWeekend ? 'bg-gray-50 dark:bg-gray-800' : ''}
                    ${isToday ? 'ring-2 ring-violet-500 ring-inset' : ''}
                    ${isSelected && !isTurniMode ? 'ring-2 ring-blue-400' : ''}
                    ${isModified && !isTurniMode ? 'ring-1 ring-orange-400' : ''}
                    ${!isTurniMode && bgColor ? bgColor + ' text-white' : ''}
                    ${!isTurniMode && !bgColor && canEdit ? 'hover:bg-gray-100 dark:hover:bg-gray-700' : ''}
                    ${isTurniMode && !hasTurno && isManager ? 'hover:bg-violet-50 dark:hover:bg-violet-900/30' : ''}
                `}
                onMouseDown={isTurniMode
                    ? () => handleTurnoCellClick(dataKey, fascia, profilo.id)
                    : () => handleMouseDown(dataKey, fascia, profilo.id)
                }
                onMouseEnter={isTurniMode
                    ? undefined
                    : () => handleMouseEnter(dataKey, fascia, profilo.id)
                }
                title={
                    isTurniMode
                        ? hasTurno
                            ? `${turnoSigla}: ${fasciaHours.oraInizio}-${fasciaHours.oraFine} (clicca per rimuovere)`
                            : 'Clicca per assegnare turno'
                        : [
                            preferenza ? DISPONIBILITA_COLORS[preferenza].label : 'Clicca per impostare',
                            hasTurno ? `[Turno: ${turnoSigla}]` : '',
                            !canEdit ? '(solo lettura)' : '',
                            isModified ? '(modificato)' : '',
                        ].filter(Boolean).join(' ')
                }
            >
                {/* Disponibilità mode: show color icon */}
                {!isTurniMode && preferenza && (
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                        {DISPONIBILITA_COLORS[preferenza].icon}
                    </span>
                )}
                {/* Disponibilità mode: show turno sigla overlay if present */}
                {!isTurniMode && hasTurno && (
                    <span
                        className="absolute top-0 right-0 text-[7px] font-bold px-0.5 rounded-bl leading-none"
                        style={{ backgroundColor: turnoColore, color: '#fff' }}
                    >
                        {turnoSigla}
                    </span>
                )}
                {/* Turni mode: show disponibilità as background tint + turno sigla centered */}
                {isTurniMode && (
                    <>
                        {/* Disponibilità background tint */}
                        {preferenza && (
                            <span className={`absolute inset-0 ${bgColor} opacity-25 rounded-sm`} />
                        )}
                        {/* Turno sigla */}
                        {hasTurno ? (
                            <span
                                className="absolute inset-0 flex items-center justify-center text-[10px] font-bold rounded-sm"
                                style={{ backgroundColor: `${turnoColore}30`, color: turnoColore }}
                            >
                                {turnoSigla}
                            </span>
                        ) : preferenza ? (
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] opacity-40">
                                {DISPONIBILITA_COLORS[preferenza].icon}
                            </span>
                        ) : null}
                    </>
                )}
            </td>
        );
    }, [getCellKey, localChanges, disponibilitaMap, today, selectedCells, canEditCell, handleMouseDown, handleMouseEnter, pageMode, turniMap, isManager, handleTurnoCellClick]);

    // Nome mese formattato
    const monthName = currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

    // ========================================================================
    // RENDER
    // ========================================================================

    return (
        <div
            className="p-6 max-w-full overflow-x-auto"
            onMouseUp={pageMode === 'disponibilita' ? handleMouseUp : undefined}
            onMouseLeave={pageMode === 'disponibilita' ? handleMouseUp : undefined}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Calendar className="w-8 h-8 text-violet-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {pageMode === 'turni' ? 'Assegnazione Turni' : 'Calendario Disponibilità'}
                        </h1>
                        <p className="text-sm text-gray-500">
                            {pageMode === 'turni'
                                ? 'Clicca sulle celle per assegnare o rimuovere turni'
                                : isManager
                                    ? 'Gestisci le disponibilità del team e assegna turni'
                                    : 'Inserisci le tue disponibilità'
                            }
                        </p>
                    </div>
                    {isManager && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-violet-100 text-violet-700 rounded-full flex items-center gap-1">
                            <Shield className="w-3 h-3" /> HR Manager
                        </span>
                    )}
                </div>

                {/* Mode toggle + Toolbar */}
                <div className="flex items-center gap-2">
                    {isManager && (
                        <div className="flex items-center bg-gray-100 rounded-lg p-0.5 mr-2">
                            <button
                                onClick={() => {
                                    setPageMode('disponibilita');
                                    setIsDragging(false);
                                    setSelectedCells(new Set());
                                    dragStartRef.current = null;
                                }}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${pageMode === 'disponibilita'
                                        ? 'bg-white text-violet-700 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <Calendar className="w-3.5 h-3.5" />
                                Disponibilità
                            </button>
                            <button
                                onClick={() => {
                                    setPageMode('turni');
                                    setIsDragging(false);
                                    setSelectedCells(new Set());
                                    dragStartRef.current = null;
                                }}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${pageMode === 'turni'
                                        ? 'bg-violet-600 text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <CalendarPlus className="w-3.5 h-3.5" />
                                Turni
                            </button>
                        </div>
                    )}
                    {pageMode === 'disponibilita' && (
                        <>
                            {localChanges.size > 0 && (
                                <>
                                    <span className="text-sm text-orange-600 font-medium">
                                        {localChanges.size} modifiche
                                    </span>
                                    <CRUDButton
                                        variant="outline"
                                        onClick={handleClearChanges}
                                    >
                                        <Eraser className="w-4 h-4" />
                                        Annulla
                                    </CRUDButton>
                                </>
                            )}
                            <CRUDPrimaryButton
                                theme="violet"
                                onClick={handleSaveAll}
                                disabled={localChanges.size === 0 || saveMutation.isPending}
                            >
                                <Save className="w-4 h-4" />
                                {saveMutation.isPending ? 'Salvataggio...' : `Salva${localChanges.size > 0 ? ` (${localChanges.size})` : ''}`}
                            </CRUDPrimaryButton>
                        </>
                    )}
                </div>
            </div>

            {/* Navigazione mese */}
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={goToPrevMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-semibold capitalize">{monthName}</h2>
                <button
                    onClick={goToNextMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Palette colori - SOLO in modalità disponibilità */}
            {pageMode === 'disponibilita' && (
                <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                    <Paintbrush className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 mr-2">Seleziona:</span>
                    {PREFERENZE_ATTIVE.map((key) => {
                        const config = DISPONIBILITA_COLORS[key];
                        return (
                            <button
                                key={key}
                                onClick={() => setSelectedColor(key)}
                                className={`
                                    flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium
                                    transition-all border-2
                                    ${selectedColor === key
                                        ? `${config.bg} text-white border-gray-800 shadow-lg scale-105`
                                        : `${config.bg} text-white border-transparent opacity-70 hover:opacity-100`
                                    }
                                `}
                                title={config.label}
                            >
                                {config.icon}
                                <span className="hidden sm:inline">{config.label}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Toolbar turni - SOLO in modalità turni */}
            {pageMode === 'turni' && isManager && (
                <div className="flex items-center gap-4 mb-4 p-3 bg-violet-50 rounded-lg border border-violet-200">
                    <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-violet-600" />
                        <span className="text-sm font-medium text-violet-700">Mansione:</span>
                        <select
                            value={selectedMansioneId}
                            onChange={(e) => setSelectedMansioneId(e.target.value)}
                            className="text-sm border border-violet-300 rounded-md px-2 py-1 bg-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                        >
                            <option value="">— Tutte —</option>
                            {mansioniList.map((m: any) => (
                                <option key={m.id} value={m.id}>{m.nome}</option>
                            ))}
                        </select>
                    </div>
                    {templates.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-violet-700">Template orario:</span>
                            <select
                                value={selectedTemplateId}
                                onChange={(e) => setSelectedTemplateId(e.target.value)}
                                className="text-sm border border-violet-300 rounded-md px-2 py-1 bg-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                            >
                                <option value="">— Orario fascia —</option>
                                {templates.map((t: any) => (
                                    <option key={t.id} value={t.id}>{t.nome} ({t.oraInizio}-{t.oraFine})</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="flex items-center gap-3 ml-auto text-xs text-violet-600">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-violet-500 inline-block" /> Turno assegnato</span>
                        <span className="flex items-center gap-1"><Trash2 className="w-3 h-3" /> Clicca per rimuovere</span>
                    </div>
                </div>
            )}

            {/* Info permessi */}
            <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                <Info className="w-4 h-4" />
                <span>
                    {pageMode === 'turni'
                        ? 'Clicca sulle celle per assegnare turni ai dipendenti. Clicca su un turno esistente per rimuoverlo.'
                        : isManager
                            ? 'Clicca e trascina per selezionare più celle di qualsiasi dipendente. Usa il pulsante "Salva" per confermare.'
                            : 'Puoi modificare solo le tue disponibilità. Clicca e trascina per selezionare più celle.'
                    }
                </span>
            </div>

            {/* Tabella calendario */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
                </div>
            ) : (
                <div className="overflow-x-auto border rounded-lg shadow-sm">
                    <table className="min-w-full border-collapse">
                        <thead>
                            {/* Header giorni */}
                            <tr className="bg-gray-100">
                                <th className="sticky left-0 z-20 bg-gray-100 px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r-2 border-gray-300 min-w-[160px]">
                                    <div className="flex items-center gap-1">
                                        <Users className="w-4 h-4" />
                                        Dipendente
                                    </div>
                                </th>

                                {daysInMonth.map((day) => {
                                    const dateKey = formatDateKey(day);
                                    const isToday = dateKey === today;
                                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                    return (
                                        <th
                                            key={dateKey}
                                            colSpan={FASCE.length}
                                            className={`
                                                px-1 py-1 text-center text-xs font-medium border-x border-gray-200
                                                ${isToday ? 'bg-violet-100 text-violet-800' : ''}
                                                ${isWeekend ? 'bg-gray-200 text-gray-600' : 'text-gray-700'}
                                            `}
                                        >
                                            <div className="flex flex-col items-center leading-tight">
                                                <span className="text-[10px] uppercase">
                                                    {GIORNO_ABBR[day.getDay()]}
                                                </span>
                                                <span className="font-bold">{day.getDate()}</span>
                                            </div>
                                        </th>
                                    );
                                })}

                                {/* Colonna riassuntiva a destra */}
                                <th className="sticky right-0 z-20 bg-gray-100 px-2 py-2 text-center text-xs font-semibold text-gray-700 border-l-2 border-gray-300 min-w-[100px]">
                                    <div className="flex items-center gap-1 justify-center">
                                        <BarChart3 className="w-3 h-3" />
                                        {pageMode === 'turni' ? 'Turni' : 'Disp.'}
                                    </div>
                                </th>
                            </tr>

                            {/* Sub-header fasce */}
                            <tr className="bg-gray-50">
                                <th className="sticky left-0 z-20 bg-gray-50 border-r-2 border-gray-300"></th>
                                {daysInMonth.map((day) => (
                                    <React.Fragment key={`fasce-${formatDateKey(day)}`}>
                                        {FASCE.map((fascia) => (
                                            <th
                                                key={`${formatDateKey(day)}-${fascia}`}
                                                className="px-0.5 py-0.5 text-center text-[10px] font-medium text-gray-500 border-x border-gray-200"
                                            >
                                                {FASCIA_LABELS[fascia]}
                                            </th>
                                        ))}
                                    </React.Fragment>
                                ))}
                                <th className="sticky right-0 z-20 bg-gray-50 border-l-2 border-gray-300 px-1 text-[10px] text-gray-500">
                                    <div className="flex gap-1 justify-center">
                                        <span title="Mattina">M</span>
                                        <span title="Pomeriggio">P</span>
                                    </div>
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {profili.length === 0 ? (
                                <tr>
                                    <td colSpan={2 + daysInMonth.length * FASCE.length} className="text-center py-8 text-gray-500">
                                        Nessun profilo HR trovato
                                    </td>
                                </tr>
                            ) : (
                                profili.map((profilo: ProfiloHR) => {
                                    const person = profilo.personTenantProfile?.person;
                                    const mansione = profilo.mansioneInternaId ? mansioniMap.get(profilo.mansioneInternaId) : null;
                                    const ore = profiloOreMese.get(profilo.id);
                                    const canEdit = canEditCell(profilo.id);

                                    return (
                                        <tr
                                            key={profilo.id}
                                            className={`hover:bg-gray-50/50 ${!canEdit ? 'bg-gray-50/30' : ''}`}
                                        >
                                            {/* Nome dipendente */}
                                            <td className="sticky left-0 z-10 bg-white px-3 py-2 border-r-2 border-gray-300 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {person?.lastName} {person?.firstName?.charAt(0)}.
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        {mansione && (
                                                            <span
                                                                className="text-[10px] font-medium px-1.5 py-0.5 rounded inline-block w-fit"
                                                                style={{
                                                                    backgroundColor: mansione.colore ? `${mansione.colore}20` : '#e5e7eb',
                                                                    color: mansione.colore || '#374151'
                                                                }}
                                                            >
                                                                {mansione.sigla || mansione.nome.substring(0, 3).toUpperCase()}
                                                            </span>
                                                        )}
                                                        {!canEdit && (
                                                            <span className="text-[9px] text-gray-400 italic">sola lettura</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Celle giorni x fasce */}
                                            {daysInMonth.map((day) => (
                                                <React.Fragment key={`${profilo.id}-${formatDateKey(day)}`}>
                                                    {FASCE.map((fascia) => renderCell(day, fascia, profilo))}
                                                </React.Fragment>
                                            ))}

                                            {/* Riassunto per riga */}
                                            <td className="sticky right-0 z-10 bg-white px-2 py-1 border-l-2 border-gray-300 text-center">
                                                <div className="flex gap-1 justify-center text-[10px]">
                                                    {pageMode === 'turni' ? (
                                                        <>
                                                            <span className="px-1 py-0.5 bg-violet-100 text-violet-700 rounded font-medium" title="Turni mattina">
                                                                {ore?.turniM || 0}
                                                            </span>
                                                            <span className="px-1 py-0.5 bg-violet-200 text-violet-800 rounded font-medium" title="Turni pomeriggio">
                                                                {ore?.turniP || 0}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="px-1 py-0.5 bg-emerald-100 text-emerald-700 rounded font-medium" title="Disponibilità mattina">
                                                                {ore?.dispM || 0}
                                                            </span>
                                                            <span className="px-1 py-0.5 bg-emerald-200 text-emerald-800 rounded font-medium" title="Disponibilità pomeriggio">
                                                                {ore?.dispP || 0}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>

                        {/* Footer: conteggi disponibili/turni + fabbisogno per mansione */}
                        {profili.length > 0 && (
                            <tfoot>
                                {/* Riga totale disponibili o turni */}
                                <tr className={`border-t-2 border-gray-300 ${pageMode === 'turni' ? 'bg-violet-50' : 'bg-blue-50'}`}>
                                    <td className={`sticky left-0 z-20 px-3 py-1.5 text-xs font-semibold border-r-2 border-gray-300 ${pageMode === 'turni' ? 'bg-violet-50 text-violet-800' : 'bg-blue-50 text-blue-800'}`}>
                                        <div className="flex items-center gap-1">
                                            {pageMode === 'turni' ? <Briefcase className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                                            {pageMode === 'turni' ? 'Turni' : 'Disponibili'}
                                        </div>
                                    </td>
                                    {daysInMonth.map((day) => {
                                        const dateKey = formatDateKey(day);
                                        return (
                                            <React.Fragment key={`count-${dateKey}`}>
                                                {FASCE.map((fascia) => {
                                                    const dayFasciaKey = `${dateKey}_${fascia}`;
                                                    if (pageMode === 'turni') {
                                                        const turniCounts = turniCountsByDayFascia.get(dayFasciaKey);
                                                        const totalTurni = turniCounts
                                                            ? Array.from(turniCounts.values()).reduce((sum, c) => sum + c, 0)
                                                            : 0;
                                                        return (
                                                            <td
                                                                key={`${dateKey}-${fascia}-count`}
                                                                className="text-center text-[10px] font-bold text-violet-700 border-x border-gray-200 py-1"
                                                            >
                                                                {totalTurni || ''}
                                                            </td>
                                                        );
                                                    } else {
                                                        const mansioneCounts = countsByDayFascia.get(dayFasciaKey);
                                                        const totalAvailable = mansioneCounts
                                                            ? Array.from(mansioneCounts.values()).reduce((sum, c) => sum + c, 0)
                                                            : 0;
                                                        return (
                                                            <td
                                                                key={`${dateKey}-${fascia}-count`}
                                                                className="text-center text-[10px] font-bold text-blue-700 border-x border-gray-200 py-1"
                                                            >
                                                                {totalAvailable || ''}
                                                            </td>
                                                        );
                                                    }
                                                })}
                                            </React.Fragment>
                                        );
                                    })}
                                    <td className={`sticky right-0 z-20 border-l-2 border-gray-300 ${pageMode === 'turni' ? 'bg-violet-50' : 'bg-blue-50'}`}></td>
                                </tr>

                                {/* Righe fabbisogno per mansione: confronta turni/disponibili vs fabbisogno */}
                                {mansioniConFabbisogno.map((mansione) => {
                                    const requisiti = mansione.requisitiMinimi as {
                                        fabbisognoMattina?: number;
                                        fabbisognoPomeriggio?: number;
                                    } | undefined;
                                    const fabbM = requisiti?.fabbisognoMattina || 0;
                                    const fabbP = requisiti?.fabbisognoPomeriggio || 0;

                                    return (
                                        <tr key={`fabb-${mansione.id}`} className="bg-gray-50 border-t border-gray-200">
                                            <td className="sticky left-0 z-20 bg-gray-50 px-3 py-1 text-[10px] border-r-2 border-gray-300">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3 text-gray-400" />
                                                    <span
                                                        className="font-medium px-1 py-0.5 rounded"
                                                        style={{
                                                            backgroundColor: mansione.colore ? `${mansione.colore}20` : '#f3f4f6',
                                                            color: mansione.colore || '#6b7280',
                                                        }}
                                                    >
                                                        {mansione.sigla || mansione.nome.substring(0, 3).toUpperCase()}
                                                    </span>
                                                    <span className="text-gray-500">
                                                        richiesti: {fabbM}M / {fabbP}P
                                                    </span>
                                                </div>
                                            </td>
                                            {daysInMonth.map((day) => {
                                                const dateKey = formatDateKey(day);
                                                return (
                                                    <React.Fragment key={`fabb-${mansione.id}-${dateKey}`}>
                                                        {FASCE.map((fascia) => {
                                                            const dayFasciaKey = `${dateKey}_${fascia}`;
                                                            // In turni mode: count assigned turni for this mansione
                                                            // In disponibilità mode: count available employees for this mansione
                                                            const countsSource = pageMode === 'turni'
                                                                ? turniCountsByDayFascia.get(dayFasciaKey)
                                                                : countsByDayFascia.get(dayFasciaKey);
                                                            const available = countsSource?.get(mansione.id) || 0;
                                                            const required = fascia === 'MATTINA' ? fabbM : fabbP;
                                                            const isSatisfied = available >= required;
                                                            const isShort = required > 0 && available < required;

                                                            return (
                                                                <td
                                                                    key={`${dateKey}-${fascia}-${mansione.id}`}
                                                                    className={`
                                                                        text-center text-[9px] font-medium border-x border-gray-200 py-0.5
                                                                        ${isShort ? 'bg-red-50 text-red-700' : ''}
                                                                        ${isSatisfied && required > 0 ? 'bg-green-50 text-green-700' : ''}
                                                                    `}
                                                                    title={`${available}/${required} ${mansione.nome}`}
                                                                >
                                                                    {required > 0 ? `${available}/${required}` : ''}
                                                                </td>
                                                            );
                                                        })}
                                                    </React.Fragment>
                                                );
                                            })}
                                            <td className="sticky right-0 z-20 bg-gray-50 border-l-2 border-gray-300"></td>
                                        </tr>
                                    );
                                })}
                            </tfoot>
                        )}
                    </table>
                </div>
            )}

            {/* Legenda */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-600">
                <span className="font-medium">Legenda:</span>
                {PREFERENZE_ATTIVE.map((key) => {
                    const config = DISPONIBILITA_COLORS[key];
                    return (
                        <div key={key} className="flex items-center gap-1">
                            <div className={`w-4 h-4 rounded ${config.bg}`} />
                            <span>{config.label}</span>
                        </div>
                    );
                })}
                <div className="flex items-center gap-1 ml-4">
                    <div className="w-4 h-4 rounded ring-2 ring-orange-400" />
                    <span>Modificato</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded ring-2 ring-violet-500" />
                    <span>Oggi</span>
                </div>
                {mansioniConFabbisogno.length > 0 && (
                    <>
                        <div className="flex items-center gap-1 ml-4">
                            <div className="w-4 h-4 rounded bg-red-50 border border-red-200 text-red-700 flex items-center justify-center text-[8px]">!</div>
                            <span>Sotto fabbisogno</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-4 h-4 rounded bg-green-50 border border-green-200 text-green-700 flex items-center justify-center text-[8px]">✓</div>
                            <span>Fabbisogno ok</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default DisponibilitaPage;
