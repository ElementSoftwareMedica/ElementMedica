/**
 * CompanySorveglianzaSection — Sorveglianza Sanitaria (Art. 41 D.Lgs 81/08)
 *
 * Tabella compatta con checkbox per selezione multipla, scheduling singolo e massivo.
 *
 * @module components/companies/CompanySorveglianzaSection
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
    HeartPulse,
    AlertTriangle,
    CheckCircle2,
    Clock,
    XCircle,
    Users,
    Loader2,
    Search,
    ExternalLink,
    CalendarClock,
    FileSearch,
    RefreshCw,
    Calendar,
    CheckSquare,
    Square,
    FileText,
    Printer,
    Plus,
    Pencil,
    X,
    Check,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { apiGet, apiPost } from '../../services/api';
import {
    appuntamentiApi,
    appuntamentoPrestazioniApi,
    mansioniApi,
    nomineRuoloApi,
    prestazioniApi,
    protocolliSanitariApi,
    rischioPrestazioniApi,
    slotsApi,
    visiteApi,
    type NominaRuolo,
    type TipoVisitaMDL
} from '../../services/clinicaApi';
import { cn } from '../../design-system/utils';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../context/AuthContext';
import ElegantSelect from '../ui/ElegantSelect';
import { DatePickerElegante } from '../ui/DatePickerElegante';
import { DEFAULT_ETHNICITY, ETHNICITY_OPTIONS } from '../../constants/ethnicityOptions';
import { extractBirthDateFromTaxCode, extractBirthPlaceFromTaxCode, extractGenderFromTaxCode, generateTaxCode } from '../../utils/codiceFiscale';
import ScheduleWeekModal from './ScheduleWeekModal';

// ─── Tipi ────────────────────────────────────────────────────

interface CompanySorveglianzaSectionProps {
    companyId: string;
    companySites?: Array<{
        id: string;
        siteName?: string | null;
        citta?: string | null;
    }>;
    isCrossTenant?: boolean;
}

interface Accertamento {
    id: string;
    nome: string;
    codice: string;
    isObbligatoria: boolean;
    periodicita?: string | null;
    periodicitaCustomMesi?: number | null;
    note?: string | null;
    ultimaEsecuzione?: string | null;
    dataScadenza?: string | null;
}

interface Questionario {
    id: string;
    nome: string;
    codice?: string | null;
    periodicitaMesi?: number | null;
    tipo: 'questionario';
}

interface MansioneRecord {
    id: string;
    nome: string;
    descrizione?: string;
    assignmentId: string;
    protocollo: {
        id: string;
        codice: string;
        denominazione: string;
        periodicitaMesi: number;
    } | null;
}

interface SorveglianzaRecord {
    personId: string;
    firstName: string;
    lastName: string;
    mansioni: MansioneRecord[];
    accertamenti: Accertamento[];
    questionari?: Questionario[];
    ultimaVisita: string | null;
    prossimaVisita: string | null;
    appuntamentoProgrammato?: string | null;
    statoGiudizio: 'IDONEO' | 'IDONEO_CON_PRESCRIZIONI' | 'IDONEO_CON_LIMITAZIONI' | 'NON_IDONEO_TEMPORANEO' | 'NON_IDONEO_PERMANENTE' | null;
    statoGiudizioRecord: 'VALIDO' | 'SCADUTO' | 'SOSTITUITO' | 'RICORRIBILE' | 'RICORSO_IN_CORSO' | null;
    isPrimaVisita?: boolean;
}

type ScadenzaStatus = 'scaduta' | 'urgente' | 'presto' | 'ok' | 'non_programmata';

type NewEmployeeForm = {
    firstName: string;
    lastName: string;
    taxCode: string;
    birthDate: string;
    birthPlace: string;
    birthProvince: string;
    gender: string;
    etnia: string;
    email: string;
    phone: string;
    residenceAddress: string;
    residenceCity: string;
    postalCode: string;
    province: string;
    title: string;
    hiredDate: string;
    siteId: string;
    repartoId: string;
    mansioneMode: 'existing' | 'new';
    mansioneId: string;
    mansioneIds: Set<string>;
    newMansioneCodice: string;
    newMansioneNome: string;
    selectedRischi: Set<string>;
    riskLevels: Record<string, string>;
    protocolloSanitarioId: string;
};

type DirectVisitForm = {
    tipoVisitaMDL: TipoVisitaMDL;
    prestazioneId: string;
    selectedAccertamenti: Set<string>;
};

// ─── Costanti ────────────────────────────────────────────

const GIUDIZIO_LABELS: Record<NonNullable<SorveglianzaRecord['statoGiudizio']>, { label: string; cls: string }> = {
    IDONEO: { label: 'Idoneo', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    IDONEO_CON_PRESCRIZIONI: { label: 'Idoneo c/ prescr.', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    IDONEO_CON_LIMITAZIONI: { label: 'Idoneo c/ limit.', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    NON_IDONEO_TEMPORANEO: { label: 'Non idoneo (temp.)', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    NON_IDONEO_PERMANENTE: { label: 'Non idoneo', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
};

const STATUS_CONFIG: Record<ScadenzaStatus, {
    icon: React.FC<{ className?: string }>;
    label: string;
    rowCls: string;
    textCls: string;
    statCls: string;
}> = {
    scaduta: { icon: XCircle, label: 'Scaduta', rowCls: 'bg-red-50/60 dark:bg-red-900/10', textCls: 'text-red-600 dark:text-red-400', statCls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    urgente: { icon: AlertTriangle, label: 'Urgente', rowCls: 'bg-orange-50/60 dark:bg-orange-900/10', textCls: 'text-orange-600 dark:text-orange-400', statCls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    presto: { icon: Clock, label: 'In scadenza', rowCls: 'bg-amber-50/50 dark:bg-amber-900/10', textCls: 'text-amber-600 dark:text-amber-400', statCls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    ok: { icon: CheckCircle2, label: 'Regolare', rowCls: '', textCls: 'text-emerald-600 dark:text-emerald-400', statCls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    non_programmata: { icon: CalendarClock, label: 'Da programmare', rowCls: 'bg-gray-50/60 dark:bg-gray-700/20', textCls: 'text-gray-400 dark:text-gray-500', statCls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' }
};

// ─── Utility ────────────────────────────────────────────────────

function getScadenzaStatus(r: SorveglianzaRecord): ScadenzaStatus {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let d: Date | null = null;
    if (r.prossimaVisita) d = new Date(r.prossimaVisita);
    else if (r.ultimaVisita) {
        const periodi = r.mansioni
            .filter(m => m.protocollo?.periodicitaMesi)
            .map(m => m.protocollo!.periodicitaMesi);
        if (periodi.length > 0) {
            d = new Date(r.ultimaVisita);
            d.setMonth(d.getMonth() + Math.min(...periodi));
        }
    }
    if (!d) return 'non_programmata';
    const diff = Math.floor((d.getTime() - today.getTime()) / 86_400_000);
    if (diff < 0) return 'scaduta';
    if (diff <= 14) return 'urgente';
    if (diff <= 60) return 'presto';
    return 'ok';
}

function getEffectiveScadenza(r: SorveglianzaRecord): Date | null {
    if (r.prossimaVisita) return new Date(r.prossimaVisita);
    if (r.ultimaVisita) {
        const periodi = r.mansioni
            .filter(m => m.protocollo?.periodicitaMesi)
            .map(m => m.protocollo!.periodicitaMesi);
        if (periodi.length > 0) {
            const d = new Date(r.ultimaVisita);
            d.setMonth(d.getMonth() + Math.min(...periodi));
            return d;
        }
    }
    return null;
}

function fmtDate(s: string | null | undefined): string {
    if (!s) return '—';
    return new Date(s).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function fmtScadenza(r: SorveglianzaRecord): string {
    const d = getEffectiveScadenza(r);
    return d ? d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';
}

function toLocalDateString(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function minutesFromTime(value?: string | null): number {
    if (!value) return 0;
    const [hours = 0, minutes = 0] = value.split(':').map(Number);
    return (hours * 60) + minutes;
}


const CompanySorveglianzaSection: React.FC<CompanySorveglianzaSectionProps> = ({
    companyId,
    companySites = [],
    isCrossTenant = false,
}) => {
    const { showToast } = useToast();
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [scheduleTarget, setScheduleTarget] = useState<SorveglianzaRecord[] | null>(null);
    const [assignProtTarget, setAssignProtTarget] = useState<{ mansioneId: string; mansioneName: string; currentProtocolloId?: string } | null>(null);
    const [protSearch, setProtSearch] = useState('');
    const [expandedAccertamenti, setExpandedAccertamenti] = useState<Set<string>>(new Set());
    const [newEmployeeOpen, setNewEmployeeOpen] = useState(false);
    const [newEmployeeForm, setNewEmployeeForm] = useState<NewEmployeeForm>({
        firstName: '',
        lastName: '',
        taxCode: '',
        birthDate: '',
        birthPlace: '',
        birthProvince: '',
        gender: '',
        etnia: DEFAULT_ETHNICITY,
        email: '',
        phone: '',
        residenceAddress: '',
        residenceCity: '',
        postalCode: '',
        province: '',
        title: '',
        hiredDate: toLocalDateString(new Date()),
        siteId: '',
        repartoId: '',
        mansioneMode: 'existing',
        mansioneId: '',
        mansioneIds: new Set<string>(),
        newMansioneCodice: '',
        newMansioneNome: '',
        selectedRischi: new Set<string>(),
        riskLevels: {},
        protocolloSanitarioId: ''
    });
    const [riskSearch, setRiskSearch] = useState('');
    const [directVisitTarget, setDirectVisitTarget] = useState<SorveglianzaRecord | null>(null);
    const [directVisitForm, setDirectVisitForm] = useState<DirectVisitForm>({
        tipoVisitaMDL: 'PERIODICA',
        prestazioneId: '',
        selectedAccertamenti: new Set<string>()
    });
    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: [`company-sorveglianza-${companyId}`],
        queryFn: async () => {
            const resp = await apiGet<{ data: SorveglianzaRecord[] }>(
                `/api/v1/companies/${companyId}/sorveglianza-sanitaria`
            );
            return resp.data || [];
        },
        staleTime: 2 * 60 * 1000,
        enabled: !isCrossTenant,
        retry: false
    });

    const records = data || [];
    const todayKey = toLocalDateString(new Date());
    const nowMinutes = (() => {
        const current = new Date();
        return current.getHours() * 60 + current.getMinutes();
    })();

    const { data: mansioniList } = useQuery({
        queryKey: ['company-sorveglianza-mansioni', newEmployeeOpen],
        queryFn: () => apiGet<{ data?: Array<{ id: string; codice?: string; denominazione: string; rischiAssociati?: Array<{ codiceRischio?: string; nome?: string; livello?: string; categoria?: string }> }> }>('/api/v1/clinica/mansioni?limit=300'),
        enabled: newEmployeeOpen,
        staleTime: 60_000,
    });

    const { data: employeeSuggestedProtocols } = useQuery({
        queryKey: ['company-sorveglianza-protocolli-mansione', newEmployeeForm.mansioneId],
        queryFn: () => protocolliSanitariApi.getByMansione(newEmployeeForm.mansioneId),
        enabled: newEmployeeOpen && newEmployeeForm.mansioneMode === 'existing' && !!newEmployeeForm.mansioneId,
        staleTime: 60_000,
    });

    const { data: employeeAllProtocols } = useQuery({
        queryKey: ['company-sorveglianza-protocolli-all', newEmployeeOpen],
        queryFn: () => protocolliSanitariApi.getAll({ isAttivo: true, limit: 300 }),
        enabled: newEmployeeOpen,
        staleTime: 60_000,
    });

    const { data: riskCatalog } = useQuery({
        queryKey: ['company-sorveglianza-risk-catalog'],
        queryFn: () => rischioPrestazioniApi.getCatalogo(),
        enabled: newEmployeeOpen,
        staleTime: 10 * 60_000,
    });

    const { data: riskPrestazioniData } = useQuery({
        queryKey: ['company-sorveglianza-risk-prestazioni'],
        queryFn: () => rischioPrestazioniApi.getAll({ limit: 500 }),
        enabled: newEmployeeOpen && newEmployeeForm.selectedRischi.size > 0,
        staleTime: 2 * 60_000,
    });

    const { data: repartiData } = useQuery({
        queryKey: ['company-sorveglianza-reparti', newEmployeeForm.siteId],
        queryFn: () => apiGet<{ reparti?: Array<{ id: string; nome: string }> }>(`/api/v1/reparto/site/${newEmployeeForm.siteId}`),
        enabled: newEmployeeOpen && !!newEmployeeForm.siteId,
        staleTime: 60_000,
    });

    const { data: allPrestazioniData } = useQuery({
        queryKey: ['company-sorveglianza-prestazioni-mdl'],
        queryFn: () => prestazioniApi.getAll({ limit: 300, filters: { isActive: true } }),
        enabled: !!directVisitTarget,
        staleTime: 60_000,
    });

    const { data: todaySlotsData } = useQuery({
        queryKey: ['company-sorveglianza-current-doctor-slots', user?.id, todayKey],
        queryFn: () => slotsApi.getAll({
            dataInizio: todayKey,
            dataFine: todayKey,
            disponibile: true,
            medicoId: user?.id,
            filters: {
                dataInizio: todayKey,
                dataFine: todayKey,
                disponibile: true,
                medicoId: user?.id,
            },
            limit: 50,
        }),
        enabled: !!user?.id,
        staleTime: 15_000,
    });

    const { data: companyNomine } = useQuery({
        queryKey: ['company-sorveglianza-nomine', companyId],
        queryFn: () => nomineRuoloApi.getByCompany(companyId),
        enabled: !isCrossTenant && !!companyId,
        staleTime: 60_000,
    });

    const activeCompanyMedicoCompetenteId = useMemo(() => {
        const now = new Date();
        const nomine = (companyNomine || [])
            .filter((nomina: NominaRuolo) =>
                nomina.stato === 'ATTIVA' &&
                !nomina.deletedAt &&
                ['MEDICO_COMPETENTE', 'MEDICO_COMPETENTE_COORDINATO'].includes(nomina.tipoRuolo) &&
                (!nomina.dataFine || new Date(nomina.dataFine) >= now)
            )
            .sort((a: NominaRuolo, b: NominaRuolo) => {
                const rolePriority = (value: NominaRuolo['tipoRuolo']) => value === 'MEDICO_COMPETENTE' ? 0 : 1;
                return rolePriority(a.tipoRuolo) - rolePriority(b.tipoRuolo) ||
                    new Date(b.dataInizio || 0).getTime() - new Date(a.dataInizio || 0).getTime();
            });
        return nomine[0]?.personId || null;
    }, [companyNomine]);

    // Fetch protocolli disponibili per il modal assegnazione
    const { data: protocolliList, isLoading: isLoadingProtocolli } = useQuery({
        queryKey: ['protocolli-sanitari-for-assign'],
        queryFn: () => protocolliSanitariApi.getAll({ isAttivo: true, limit: 100 }),
        enabled: !!assignProtTarget,
        staleTime: 30 * 1000
    });

    // Mutation per assegnare protocollo a mansione
    const assignProtMutation = useMutation({
        mutationFn: ({ protocolloId, mansioneId }: { protocolloId: string; mansioneId: string }) =>
            protocolliSanitariApi.update(protocolloId, { mansioniIds: [mansioneId] }),
        onSuccess: () => {
            showToast({ message: 'Protocollo sanitario assegnato', type: 'success' });
            setAssignProtTarget(null);
            setProtSearch('');
            refetch();
            queryClient.invalidateQueries({ queryKey: ['protocolli-sanitari-for-assign'] });
        },
        onError: () => {
            showToast({ message: 'Errore nell\'assegnazione del protocollo', type: 'error' });
        }
    });

    const filteredProtocolli = useMemo(() => {
        const items = protocolliList?.data || [];
        const q = protSearch.toLowerCase().trim();
        if (!q) return items;
        return items.filter((p: { codice?: string; denominazione?: string }) =>
            p.codice?.toLowerCase().includes(q) || p.denominazione?.toLowerCase().includes(q)
        );
    }, [protocolliList, protSearch]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return records;
        return records.filter(r =>
            r.lastName?.toLowerCase().includes(q) ||
            r.firstName?.toLowerCase().includes(q) ||
            r.mansioni?.some(m => m.nome?.toLowerCase().includes(q))
        );
    }, [records, search]);

    const riskOptions = useMemo(() => {
        const items = riskCatalog?.flatList || [];
        const q = riskSearch.toLowerCase().trim();
        const filteredItems = q
            ? items.filter(risk =>
                risk.codice?.toLowerCase().includes(q) ||
                risk.nome?.toLowerCase().includes(q) ||
                risk.categoria?.toLowerCase().includes(q)
            )
            : items;
        return filteredItems.slice(0, 80);
    }, [riskCatalog?.flatList, riskSearch]);

    const mansioniOptionsForEmployee = useMemo(() => {
        const items = mansioniList?.data || [];
        const selectedRisks = Array.from(newEmployeeForm.selectedRischi);
        if (selectedRisks.length === 0) return items;
        return items.filter(mansione => {
            const risks = (mansione.rischiAssociati || []).map(r => r.codiceRischio || r.nome).filter(Boolean);
            return selectedRisks.every(riskCode => risks.includes(riskCode));
        });
    }, [mansioniList?.data, newEmployeeForm.selectedRischi]);

    useEffect(() => {
        const taxCode = newEmployeeForm.taxCode?.trim().toUpperCase();
        if (taxCode.length !== 16) return;

        const birthPlaceInfo = extractBirthPlaceFromTaxCode(taxCode);
        const birthDate = extractBirthDateFromTaxCode(taxCode);
        const gender = extractGenderFromTaxCode(taxCode);
        setNewEmployeeForm(prev => ({
            ...prev,
            birthDate: prev.birthDate || (birthDate ? toLocalDateString(birthDate) : ''),
            birthPlace: prev.birthPlace || birthPlaceInfo?.comune || '',
            birthProvince: prev.birthProvince || birthPlaceInfo?.provincia || '',
            gender: prev.gender || gender || '',
        }));
    }, [newEmployeeForm.taxCode]);

    useEffect(() => {
        if (
            !newEmployeeForm.firstName.trim() ||
            !newEmployeeForm.lastName.trim() ||
            !newEmployeeForm.birthDate ||
            !newEmployeeForm.birthPlace.trim() ||
            !newEmployeeForm.gender ||
            newEmployeeForm.gender === 'OTHER' ||
            newEmployeeForm.taxCode.trim()
        ) {
            return;
        }

        const generated = generateTaxCode(
            newEmployeeForm.lastName,
            newEmployeeForm.firstName,
            newEmployeeForm.birthDate,
            newEmployeeForm.gender as 'MALE' | 'FEMALE',
            newEmployeeForm.birthPlace
        );
        if (generated) {
            setNewEmployeeForm(prev => ({ ...prev, taxCode: generated }));
        }
    }, [
        newEmployeeForm.firstName,
        newEmployeeForm.lastName,
        newEmployeeForm.birthDate,
        newEmployeeForm.birthPlace,
        newEmployeeForm.gender,
        newEmployeeForm.taxCode,
    ]);

    const syncRisksFromMansioni = useCallback((mansioneIds: Set<string>) => {
        setNewEmployeeForm(prev => {
            const selectedRischi = new Set(prev.selectedRischi);
            const riskLevels = { ...prev.riskLevels };
            (mansioniList?.data || [])
                .filter(mansione => mansioneIds.has(mansione.id))
                .forEach(mansione => {
                    (mansione.rischiAssociati || []).forEach(risk => {
                        const code = risk.codiceRischio || risk.nome;
                        if (!code) return;
                        selectedRischi.add(code);
                        riskLevels[code] = riskLevels[code] || risk.livello || 'MEDIO';
                    });
                });
            return {
                ...prev,
                mansioneIds,
                mansioneId: Array.from(mansioneIds)[0] || '',
                selectedRischi,
                riskLevels,
                protocolloSanitarioId: ''
            };
        });
    }, [mansioniList?.data]);

    const protocolOptionsForEmployee = useMemo(() => {
        const suggestedByMansione = employeeSuggestedProtocols || [];
        const allProtocols = employeeAllProtocols?.data || [];
        if (newEmployeeForm.mansioneMode === 'existing') {
            const source = suggestedByMansione.length ? suggestedByMansione : allProtocols;
            return source.map(protocollo => ({
                value: protocollo.id,
                label: `${suggestedByMansione.some(sp => sp.id === protocollo.id) ? 'Suggerito - ' : ''}${protocollo.denominazione}`
            }));
        }

        const selectedRisks = Array.from(newEmployeeForm.selectedRischi);
        if (selectedRisks.length === 0) {
            return allProtocols.map(protocollo => ({ value: protocollo.id, label: protocollo.denominazione }));
        }

        const mappings = riskPrestazioniData?.data || [];
        const relevantMappings = mappings.filter(mapping => selectedRisks.includes(mapping.codiceRischio));
        const requiredIds = new Set(
            relevantMappings
                .filter(mapping => mapping.obbligatoria)
                .map(mapping => mapping.prestazioneId)
                .filter(Boolean)
        );
        const optionalIds = new Set(
            relevantMappings
                .filter(mapping => !mapping.obbligatoria)
                .map(mapping => mapping.prestazioneId)
                .filter(Boolean)
        );

        const scored = allProtocols.map(protocollo => {
            const mandatoryIds = new Set((protocollo.prestazioni || []).filter(p => p.isObbligatoria).map(p => p.prestazioneId));
            const coversRequired = Array.from(requiredIds).every(id => mandatoryIds.has(id));
            const mandatoryExtra = Array.from(mandatoryIds).filter(id => !requiredIds.has(id) && !optionalIds.has(id));
            const exact = coversRequired && mandatoryExtra.length === 0;
            return { protocollo, coversRequired, exact, extra: mandatoryExtra.length };
        });

        const best = scored
            .filter(item => item.coversRequired)
            .sort((a, b) => Number(b.exact) - Number(a.exact) || a.extra - b.extra);
        const source = best.length ? best : scored;

        return source.map(item => ({
            value: item.protocollo.id,
            label: `${item.exact ? 'Suggerito - ' : item.coversRequired ? 'Compatibile - ' : ''}${item.protocollo.denominazione}`
        }));
    }, [
        employeeAllProtocols?.data,
        employeeSuggestedProtocols,
        newEmployeeForm.mansioneMode,
        newEmployeeForm.selectedRischi,
        riskPrestazioniData?.data,
    ]);

    const stats = useMemo(() => {
        const c = { totale: records.length, scaduta: 0, urgente: 0, presto: 0, ok: 0, non_programmata: 0 };
        for (const r of records) {
            const s = getScadenzaStatus(r);
            c[s]++;
        }
        return c;
    }, [records]);

    const futureScheduledVisits = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return records
            .filter(record => record.appuntamentoProgrammato && new Date(record.appuntamentoProgrammato) >= today)
            .sort((a, b) => new Date(a.appuntamentoProgrammato!).getTime() - new Date(b.appuntamentoProgrammato!).getTime());
    }, [records]);

    const handlePrintScheduledVisits = useCallback(() => {
        if (futureScheduledVisits.length === 0) {
            showToast({ message: 'Non ci sono visite programmate future da stampare', type: 'error' });
            return;
        }
        const rows = futureScheduledVisits.map(record => {
            const date = new Date(record.appuntamentoProgrammato!);
            const mansioni = record.mansioni.map(m => m.nome).join(', ') || '—';
            const accertamenti = record.accertamenti.map(a => a.nome).join(', ') || '—';
            return `<tr><td>${date.toLocaleDateString('it-IT')}</td><td>${date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</td><td>${record.lastName} ${record.firstName}</td><td>${mansioni}</td><td>${accertamenti}</td></tr>`;
        }).join('');
        const popup = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=800');
        if (!popup) return;
        popup.document.write(`
            <html><head><title>Calendario visite programmate</title>
            <style>
                body{font-family:Inter,Arial,sans-serif;color:#0f172a;padding:28px}
                h1{font-size:20px;margin:0 0 4px}
                p{color:#64748b;margin:0 0 18px}
                table{width:100%;border-collapse:collapse;font-size:12px}
                th,td{border-bottom:1px solid #e2e8f0;text-align:left;padding:9px 8px;vertical-align:top}
                th{background:#f8fafc;color:#475569;text-transform:uppercase;font-size:10px;letter-spacing:.04em}
                @media print{button{display:none} body{padding:0}}
            </style></head><body>
            <button onclick="window.print()" style="float:right;padding:8px 12px;border:1px solid #0f766e;border-radius:10px;background:#0f766e;color:white">Stampa / salva PDF</button>
            <h1>Calendario visite programmate</h1>
            <p>Visite mediche del lavoro future</p>
            <table><thead><tr><th>Data</th><th>Ora</th><th>Dipendente</th><th>Mansioni</th><th>Accertamenti</th></tr></thead><tbody>${rows}</tbody></table>
            </body></html>
        `);
        popup.document.close();
    }, [futureScheduledVisits, showToast]);

    const rowKey = (r: SorveglianzaRecord) => r.personId;

    const handleToggle = useCallback((r: SorveglianzaRecord) => {
        const k = rowKey(r);
        setSelected(prev => {
            const next = new Set(prev);
            next.has(k) ? next.delete(k) : next.add(k);
            return next;
        });
    }, []);

    const allFilteredSelected = filtered.length > 0 && filtered.every(r => selected.has(rowKey(r)));
    const someSelected = selected.size > 0;

    const handleToggleAll = useCallback(() => {
        if (allFilteredSelected) {
            setSelected(prev => { const next = new Set(prev); filtered.forEach(r => next.delete(rowKey(r))); return next; });
        } else {
            setSelected(prev => { const next = new Set(prev); filtered.forEach(r => next.add(rowKey(r))); return next; });
        }
    }, [allFilteredSelected, filtered]);

    const openSchedule = useCallback((targets: SorveglianzaRecord[]) => setScheduleTarget(targets), []);

    const openBulkSchedule = useCallback(() => {
        const targets = filtered.filter(r => selected.has(rowKey(r)));
        if (targets.length === 0) { showToast({ message: 'Seleziona almeno un dipendente', type: 'error' }); return; }
        setScheduleTarget(targets);
    }, [filtered, selected, showToast]);

    const resetNewEmployeeForm = useCallback(() => {
        setNewEmployeeForm({
            firstName: '',
            lastName: '',
            taxCode: '',
            birthDate: '',
            birthPlace: '',
            birthProvince: '',
            gender: '',
            etnia: DEFAULT_ETHNICITY,
            email: '',
            phone: '',
            residenceAddress: '',
            residenceCity: '',
            postalCode: '',
            province: '',
            title: '',
            hiredDate: toLocalDateString(new Date()),
            siteId: '',
            repartoId: '',
            mansioneMode: 'existing',
            mansioneId: '',
            mansioneIds: new Set<string>(),
            newMansioneCodice: '',
            newMansioneNome: '',
            selectedRischi: new Set<string>(),
            riskLevels: {},
            protocolloSanitarioId: ''
        });
    }, []);

    const createEmployeeMutation = useMutation({
        mutationFn: async () => {
            const firstName = newEmployeeForm.firstName.trim();
            const lastName = newEmployeeForm.lastName.trim();
            if (!firstName || !lastName || !newEmployeeForm.taxCode.trim()) {
                throw new Error('Compila nome, cognome e codice fiscale');
            }

            const selectedMansioneIds = Array.from(newEmployeeForm.mansioneIds).filter(Boolean);
            let mansioneIdsToAssign = selectedMansioneIds;
            if (newEmployeeForm.mansioneMode === 'new') {
                if (!newEmployeeForm.newMansioneCodice.trim() || !newEmployeeForm.newMansioneNome.trim()) {
                    throw new Error('Inserisci codice e nome della nuova mansione');
                }
                const createdMansione = await mansioniApi.create({
                    codice: newEmployeeForm.newMansioneCodice.trim().toUpperCase(),
                    denominazione: newEmployeeForm.newMansioneNome.trim(),
                    rischi: Array.from(newEmployeeForm.selectedRischi).map(codiceRischio => {
                        const catalogRisk = riskCatalog?.flatList?.find(risk => risk.codice === codiceRischio);
                        return {
                            codiceRischio: codiceRischio as any,
                            livello: (newEmployeeForm.riskLevels[codiceRischio] || 'MEDIO') as any,
                            categoria: (catalogRisk?.categoria || 'ALTRO') as any,
                            descrizioneEsposizione: catalogRisk?.nome || codiceRischio,
                        };
                    }),
                });
                mansioneIdsToAssign = [createdMansione.id];
            } else if (mansioneIdsToAssign.length === 0) {
                throw new Error('Seleziona almeno una mansione o creane una nuova');
            }

            const createdPerson = await apiPost<any>('/api/v1/persons', {
                firstName,
                lastName,
                taxCode: newEmployeeForm.taxCode.trim().toUpperCase(),
                birthDate: newEmployeeForm.birthDate || undefined,
                birthPlace: newEmployeeForm.birthPlace.trim() || undefined,
                birthProvince: newEmployeeForm.birthProvince.trim() || undefined,
                gender: newEmployeeForm.gender || undefined,
                etnia: newEmployeeForm.etnia || DEFAULT_ETHNICITY,
                email: newEmployeeForm.email.trim() || undefined,
                phone: newEmployeeForm.phone.trim() || undefined,
                residenceAddress: newEmployeeForm.residenceAddress.trim() || undefined,
                residenceCity: newEmployeeForm.residenceCity.trim() || undefined,
                postalCode: newEmployeeForm.postalCode.trim() || undefined,
                province: newEmployeeForm.province.trim() || undefined,
                roleType: 'EMPLOYEE',
                companyId,
                companyTenantProfileId: companyId,
                title: newEmployeeForm.title.trim() || undefined,
                hiredDate: newEmployeeForm.hiredDate || undefined,
                siteId: newEmployeeForm.siteId || undefined,
                repartoId: newEmployeeForm.repartoId || undefined,
                status: 'ACTIVE',
            });
            const personId = createdPerson?.data?.id || createdPerson?.id;
            if (!personId) throw new Error('Creazione dipendente non completata');

            for (const [index, mansioneId] of mansioneIdsToAssign.entries()) {
                await apiPost(`/api/v1/clinica/mansioni/${mansioneId}/assign`, {
                    personId,
                    isPrimaria: index === 0,
                    dataInizio: newEmployeeForm.hiredDate || toLocalDateString(new Date()),
                });
            }
            const risksFromSelectedMansioni = new Set(
                (mansioniList?.data || [])
                    .filter(mansione => mansioneIdsToAssign.includes(mansione.id))
                    .flatMap(mansione => (mansione.rischiAssociati || []).map(risk => risk.codiceRischio || risk.nome).filter(Boolean))
            );
            for (const codiceRischio of Array.from(newEmployeeForm.selectedRischi).filter(code => !risksFromSelectedMansioni.has(code))) {
                const catalogRisk = riskCatalog?.flatList?.find(risk => risk.codice === codiceRischio);
                await mansioniApi.addWorkerRischio(personId, {
                    codiceRischio: codiceRischio as any,
                    livello: (newEmployeeForm.riskLevels[codiceRischio] || 'MEDIO') as any,
                    categoria: (catalogRisk?.categoria || 'FISICO') as any,
                    note: catalogRisk?.nome || codiceRischio,
                });
            }
            await mansioniApi.updateWorkerOccupationalProfile(personId, {
                companyTenantProfileId: companyId,
                title: newEmployeeForm.title.trim() || null,
                hiredDate: newEmployeeForm.hiredDate || null,
                siteId: newEmployeeForm.siteId || null,
                repartoId: newEmployeeForm.repartoId || null,
                protocolloSanitarioId: newEmployeeForm.protocolloSanitarioId || null,
            });
            return createdPerson;
        },
        onSuccess: () => {
            showToast({ message: 'Dipendente creato e collegato alla sorveglianza sanitaria', type: 'success' });
            setNewEmployeeOpen(false);
            resetNewEmployeeForm();
            refetch();
        },
        onError: (error: unknown) => {
            showToast({ message: error instanceof Error ? error.message : 'Errore nella creazione del dipendente', type: 'error' });
        }
    });

    const getCurrentDoctorSlot = useCallback(() => {
        const slots = todaySlotsData?.data || [];
        return slots.find(slot => {
            const start = minutesFromTime(slot.oraInizio);
            const end = minutesFromTime(slot.oraFine);
            return nowMinutes >= start && nowMinutes <= end;
        }) || null;
    }, [nowMinutes, todaySlotsData?.data]);

    const isMainMdlPrestazione = (name?: string | null): boolean =>
        /visita\s+medica.*lavoro|medicina\s+del\s+lavoro|visita.*lavoro/i.test(name || '');
    const sortedMdlAccertamenti = (accertamenti: Accertamento[]): Accertamento[] =>
        [...accertamenti].sort((a, b) => {
            const mainDiff = Number(isMainMdlPrestazione(b.nome)) - Number(isMainMdlPrestazione(a.nome));
            if (mainDiff !== 0) return mainDiff;
            const requiredDiff = Number(b.isObbligatoria) - Number(a.isObbligatoria);
            if (requiredDiff !== 0) return requiredDiff;
            return a.nome.localeCompare(b.nome, 'it');
        });
    const isInMdlWindow = (value?: string | null): boolean => {
        if (!value) return false;
        const due = new Date(value);
        if (Number.isNaN(due.getTime())) return false;
        due.setHours(0, 0, 0, 0);
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - 60);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        end.setDate(end.getDate() + 30);
        return due >= start && due <= end;
    };
    const getAccertamentoDueDate = (acc: Accertamento): string | null => {
        if (acc.dataScadenza) return acc.dataScadenza;
        if (!acc.ultimaEsecuzione) return null;
        const mesi = acc.periodicitaCustomMesi || (acc.periodicita === 'MESI_6' ? 6 : acc.periodicita === 'MESI_12' ? 12 : acc.periodicita === 'MESI_24' ? 24 : acc.periodicita === 'MESI_36' ? 36 : acc.periodicita === 'MESI_60' ? 60 : null);
        if (!mesi) return null;
        const due = new Date(acc.ultimaEsecuzione);
        due.setMonth(due.getMonth() + mesi);
        return due.toISOString();
    };
    const buildDirectVisitForm = (record: SorveglianzaRecord): DirectVisitForm => {
        const accertamenti = sortedMdlAccertamenti(record.accertamenti || []);
        const defaultPrestazione = accertamenti.find(a => isMainMdlPrestazione(a.nome)) || accertamenti[0];
        const hasPrevious = !record.isPrimaVisita && !!record.ultimaVisita;
        const dueIds = new Set<string>();
        let hasDueAccertamento = false;
        if (defaultPrestazione?.id) dueIds.add(defaultPrestazione.id);
        accertamenti.forEach(acc => {
            if (acc.id && acc.isObbligatoria && isInMdlWindow(getAccertamentoDueDate(acc))) {
                hasDueAccertamento = true;
                dueIds.add(acc.id);
            }
        });
        return {
            tipoVisitaMDL: !hasPrevious ? 'PREVENTIVA' : hasDueAccertamento ? 'PERIODICA' : 'STRAORDINARIA',
            prestazioneId: defaultPrestazione?.id || '',
            selectedAccertamenti: dueIds,
        };
    };

    const openDirectVisitModal = useCallback((record: SorveglianzaRecord) => {
        setDirectVisitTarget(record);
        setDirectVisitForm(buildDirectVisitForm(record));
    }, []);

    const createDirectVisitMutation = useMutation({
        mutationFn: async ({ target, form }: { target: SorveglianzaRecord; form: DirectVisitForm }) => {
            if (!target) throw new Error('Seleziona un dipendente');
            if (!user?.id) throw new Error('Utente medico non identificato');
            const slot = getCurrentDoctorSlot();
            const now = new Date();
            const prestazioneId = form.prestazioneId || target.accertamenti[0]?.id;
            if (!prestazioneId) throw new Error('Seleziona la prestazione principale');
            const medicoId = slot?.medicoId || activeCompanyMedicoCompetenteId || user.id;

            const todayAppointments = await appuntamentiApi.getAll({
                pazienteId: target.personId,
                dataInizio: todayKey,
                dataFine: todayKey,
                filters: {
                    pazienteId: target.personId,
                    dataInizio: todayKey,
                    dataFine: todayKey,
                },
                limit: 50,
            });
            const existingMdlAppointment = (todayAppointments.data || []).find((app: any) => {
                if (['ANNULLATO', 'CANCELLATO'].includes(app.stato)) return false;
                return app.tipoVisitaMDL || /medicina\s+del\s+lavoro|visita\s+medica\s+del\s+lavoro/i.test(app.prestazione?.nome || '');
            });

            const appuntamento = existingMdlAppointment
                ? await appuntamentiApi.update(existingMdlAppointment.id, {
                    stato: existingMdlAppointment.stato === 'COMPLETATO' ? existingMdlAppointment.stato : 'IN_CORSO',
                    tipoVisitaMDL: existingMdlAppointment.tipoVisitaMDL || form.tipoVisitaMDL,
                    companyTenantProfileId: existingMdlAppointment.companyTenantProfileId || companyId,
                    noteInterne: [
                        existingMdlAppointment.noteInterne,
                        'Visita MdL collegata da Sorveglianza Sanitaria usando appuntamento già presente oggi',
                    ].filter(Boolean).join('\n'),
                } as any)
                : await appuntamentiApi.create({
                    pazienteId: target.personId,
                    medicoId,
                    ...(slot?.ambulatorioId ? { ambulatorioId: slot.ambulatorioId } : {}),
                    prestazioneId,
                    companyTenantProfileId: companyId,
                    tipoVisitaMDL: form.tipoVisitaMDL,
                    dataOra: now.toISOString(),
                    durataMinuti: 30,
                    stato: 'IN_CORSO',
                    createdFromSorveglianzaSanitaria: true,
                    noteInterne: slot
                        ? 'Visita MdL creata direttamente da Sorveglianza Sanitaria'
                        : 'Visita MdL creata direttamente da Sorveglianza Sanitaria senza slot disponibilità attivo',
                    promemoriaEmail: false,
                    promemoriaSms: false,
                    isOverbooking: !slot,
                } as any);

            const visitaResponse = await visiteApi.getOrCreateByAppuntamento(appuntamento.id);
            const visita = visitaResponse.data;

            const medicoRefertanteId = appuntamento.medicoId || medicoId;
            const selectedExtra = Array.from(form.selectedAccertamenti)
                .filter(id => id && id !== prestazioneId)
                .map((prestazioneId, index) => ({ prestazioneId, medicoRefertanteId, ordine: index + 1 }));
            if (selectedExtra.length > 0) {
                await appuntamentoPrestazioniApi.create(appuntamento.id, selectedExtra, visita?.id);
            }

            return visita;
        },
        onSuccess: (visita) => {
            showToast({ message: 'Visita medica del lavoro creata', type: 'success' });
            setDirectVisitTarget(null);
            navigate(`/poliambulatorio/visite/${visita.id}`);
        },
        onError: (error: unknown) => {
            showToast({ message: error instanceof Error ? error.message : 'Errore nella creazione della visita', type: 'error' });
        }
    });

    const handleCreateDirectVisit = useCallback((record: SorveglianzaRecord) => {
        const slot = getCurrentDoctorSlot();
        const status = getScadenzaStatus(record);
        if (!slot || status === 'ok' || status === 'non_programmata') {
            openDirectVisitModal(record);
            return;
        }
        setDirectVisitTarget(record);
        const nextForm = buildDirectVisitForm(record);
        setDirectVisitForm(nextForm);
        createDirectVisitMutation.mutate({ target: record, form: nextForm });
    }, [createDirectVisitMutation, getCurrentDoctorSlot, openDirectVisitModal]);

    const handleModalClose = useCallback(() => setScheduleTarget(null), []);
    const handleModalSuccess = useCallback(() => { setScheduleTarget(null); setSelected(new Set()); }, []);

    return (
        <>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-black/30 border border-gray-100 dark:border-gray-700 overflow-hidden">

                {/* Header */}
                <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <HeartPulse className="h-4 w-4 text-teal-600" />
                            <h2 className="text-sm font-semibold text-teal-800 dark:text-teal-400">Sorveglianza Sanitaria</h2>
                            {!isCrossTenant && records.length > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 text-xs font-medium">
                                    {records.length}
                                </span>
                            )}
                            <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">Art. 41 D.Lgs 81/08</span>
                        </div>
                        {!isCrossTenant && (
                            <button onClick={() => refetch()} disabled={isFetching} title="Aggiorna"
                                className="p-1.5 text-gray-400 hover:text-teal-600 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors">
                                <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
                            </button>
                        )}
                    </div>
                </div>

                {isCrossTenant ? (
                    <div className="flex flex-col items-center py-8 text-center">
                        <HeartPulse className="h-10 w-10 text-gray-300 mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">Azienda importata — sorveglianza gestita dal tenant proprietario</p>
                    </div>
                ) : isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    </div>
                ) : records.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-center px-6">
                        <FileSearch className="h-10 w-10 text-gray-300 mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">Nessun dato di sorveglianza</p>
                        <p className="text-xs text-gray-400 mt-0.5">Assegna mansioni ai dipendenti per monitorare le visite</p>
                    </div>
                ) : (
                    <div>
                        {/* Barra stat + ricerca */}
                        <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 space-y-2">
                            <div className="flex flex-wrap gap-1.5">
                                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300">
                                    <Users className="h-3 w-3" />{stats.totale}
                                </div>
                                {stats.scaduta > 0 && (
                                    <div className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', STATUS_CONFIG.scaduta.statCls)}>
                                        <XCircle className="h-3 w-3" />{stats.scaduta} scadute
                                    </div>
                                )}
                                {stats.urgente > 0 && (
                                    <div className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', STATUS_CONFIG.urgente.statCls)}>
                                        <AlertTriangle className="h-3 w-3" />{stats.urgente} urgenti
                                    </div>
                                )}
                                {stats.presto > 0 && (
                                    <div className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', STATUS_CONFIG.presto.statCls)}>
                                        <Clock className="h-3 w-3" />{stats.presto} in scadenza
                                    </div>
                                )}
                                {stats.ok > 0 && (
                                    <div className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', STATUS_CONFIG.ok.statCls)}>
                                        <CheckCircle2 className="h-3 w-3" />{stats.ok} regolari
                                    </div>
                                )}
                                {stats.non_programmata > 0 && (
                                    <div className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', STATUS_CONFIG.non_programmata.statCls)}>
                                        <CalendarClock className="h-3 w-3" />{stats.non_programmata} da programmare
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setNewEmployeeOpen(true)}
                                    className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-100 dark:border-teal-700 dark:bg-teal-900/20 dark:text-teal-300"
                                >
                                    <Plus className="h-3 w-3" />
                                    Nuovo dipendente
                                </button>
                                <button
                                    type="button"
                                    onClick={handlePrintScheduledVisits}
                                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                    title="Stampa calendario visite programmate"
                                >
                                    <Printer className="h-3 w-3" />
                                    Calendario visite
                                </button>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                                    placeholder="Cerca dipendente o mansione…"
                                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                            </div>
                        </div>

                        {/* Bulk action bar */}
                        {someSelected && (
                            <div className="px-4 py-2 bg-teal-50 dark:bg-teal-900/20 border-b border-teal-100 dark:border-teal-800 flex items-center justify-between">
                                <span className="text-sm font-medium text-teal-700 dark:text-teal-300">
                                    {selected.size} selezionat{selected.size === 1 ? 'o' : 'i'}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setSelected(new Set())}
                                        className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2 py-1 rounded transition-colors">
                                        Deseleziona tutto
                                    </button>
                                    <button onClick={openBulkSchedule}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors">
                                        <Calendar className="h-3.5 w-3.5" />
                                        Programma selezionati ({selected.size})
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Tabella compatta */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-700/30">
                                        <th className="w-8 px-3 py-2">
                                            <button onClick={handleToggleAll} title={allFilteredSelected ? 'Deseleziona tutti' : 'Seleziona tutti'}
                                                className="text-gray-400 hover:text-teal-600 transition-colors">
                                                {allFilteredSelected
                                                    ? <CheckSquare className="h-4 w-4 text-teal-600" />
                                                    : <Square className="h-4 w-4" />
                                                }
                                            </button>
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Dipendente</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Mansione</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">Protocollo</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 hidden xl:table-cell">Accertamenti</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">Giudizio</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">Ultima</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Prossima</th>
                                        <th className="w-10 px-2 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40">
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="py-6 text-center text-sm text-gray-400">
                                                Nessun risultato
                                            </td>
                                        </tr>
                                    ) : filtered.map(record => {
                                        const status = getScadenzaStatus(record);
                                        const cfg = STATUS_CONFIG[status];
                                        const StatusIcon = cfg.icon;
                                        const giudizio = record.statoGiudizio ? GIUDIZIO_LABELS[record.statoGiudizio] : null;
                                        const k = rowKey(record);
                                        const isChecked = selected.has(k);
                                        return (
                                            <tr key={k} className={cn('group transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30', cfg.rowCls, isChecked && 'bg-teal-50/40 dark:bg-teal-900/10')}>
                                                <td className="px-3 py-2">
                                                    <button onClick={() => handleToggle(record)} className="text-gray-400 hover:text-teal-600 transition-colors">
                                                        {isChecked ? <CheckSquare className="h-4 w-4 text-teal-600" /> : <Square className="h-4 w-4" />}
                                                    </button>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <Link to={`/employees/${record.personId}`}
                                                        className="font-medium text-gray-900 dark:text-gray-100 hover:text-teal-700 dark:hover:text-teal-400 transition-colors inline-flex items-center gap-1 whitespace-nowrap">
                                                        {record.lastName} {record.firstName}
                                                        <ExternalLink className="h-3 w-3 text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
                                                    </Link>
                                                </td>
                                                <td className="px-3 py-2 text-gray-600 dark:text-gray-400 hidden md:table-cell">
                                                    <div className="space-y-0.5" title={record.mansioni.map(m => m.nome).join(', ')}>
                                                        {record.mansioni.slice(0, 3).map(m => (
                                                            <p key={m.id} className="text-sm truncate max-w-[160px]">
                                                                {m.nome}
                                                                {!m.protocollo && <span className="ml-1 text-[10px] text-amber-500" title="Nessun protocollo sanitario">⚠</span>}
                                                            </p>
                                                        ))}
                                                        {record.mansioni.length > 3 && (
                                                            <p className="text-[10px] text-gray-400 dark:text-gray-500">+{record.mansioni.length - 3} altre</p>
                                                        )}
                                                    </div>
                                                </td>
                                                {/* Protocollo Sanitario — deduplica per protocollo ID */}
                                                <td className="px-3 py-2 hidden lg:table-cell">
                                                    <div className="space-y-0.5">
                                                        {(() => {
                                                            // Dedup: raggruppa per protocollo, mostra ogni protocollo una sola volta
                                                            const seen = new Map<string, typeof record.mansioni[0]>();
                                                            const noProtocol: typeof record.mansioni = [];
                                                            for (const m of record.mansioni) {
                                                                if (m.protocollo) {
                                                                    if (!seen.has(m.protocollo.id)) {
                                                                        seen.set(m.protocollo.id, m);
                                                                    }
                                                                } else {
                                                                    noProtocol.push(m);
                                                                }
                                                            }
                                                            const uniqueWithProt = Array.from(seen.values());
                                                            const items = [...uniqueWithProt, ...noProtocol].slice(0, 3);
                                                            const totalUnique = uniqueWithProt.length + noProtocol.length;
                                                            return (
                                                                <>
                                                                    {items.map(m => (
                                                                        <div key={m.protocollo?.id || m.id} className="flex items-center gap-1 group/prot">
                                                                            {m.protocollo ? (
                                                                                <>
                                                                                    <FileText className="h-3 w-3 text-teal-500 flex-shrink-0" />
                                                                                    <span className="text-[11px] text-gray-600 dark:text-gray-400 truncate max-w-[140px]" title={`${m.protocollo.codice} — ${m.protocollo.denominazione}`}>
                                                                                        {m.protocollo.denominazione}
                                                                                    </span>
                                                                                    <button
                                                                                        onClick={() => setAssignProtTarget({ mansioneId: m.id, mansioneName: m.nome, currentProtocolloId: m.protocollo!.id })}
                                                                                        className="opacity-0 group-hover/prot:opacity-100 p-0.5 rounded text-gray-400 hover:text-teal-600 transition-all"
                                                                                        title="Cambia protocollo"
                                                                                    >
                                                                                        <Pencil className="h-2.5 w-2.5" />
                                                                                    </button>
                                                                                </>
                                                                            ) : (
                                                                                <button
                                                                                    onClick={() => setAssignProtTarget({ mansioneId: m.id, mansioneName: m.nome })}
                                                                                    className="flex items-center gap-1 text-[11px] text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
                                                                                    title={`Assegna protocollo a ${m.nome}`}
                                                                                >
                                                                                    <Plus className="h-3 w-3" />
                                                                                    Assegna
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                    {totalUnique > 3 && (
                                                                        <p className="text-[10px] text-gray-400 dark:text-gray-500">+{totalUnique - 3}</p>
                                                                    )}
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 hidden xl:table-cell align-top">
                                                    {(() => {
                                                        const allItems = [
                                                            ...record.accertamenti.map(a => ({ ...a, tipo: 'prestazione' as const })),
                                                            ...(record.questionari ?? []).map(q => ({ ...q, isObbligatoria: false, tipo: 'questionario' as const })),
                                                        ];
                                                        if (allItems.length === 0) {
                                                            return record.mansioni.some(m => !m.protocollo)
                                                                ? <span className="text-[11px] text-amber-500">Assegna protocollo</span>
                                                                : <span className="text-gray-300 text-xs">—</span>;
                                                        }
                                                        const isExpanded = expandedAccertamenti.has(record.personId);
                                                        const COLLAPSED_COUNT = 3;
                                                        const visible = isExpanded ? allItems : allItems.slice(0, COLLAPSED_COUNT);
                                                        const extra = allItems.length - COLLAPSED_COUNT;
                                                        return (
                                                            <div className="space-y-0.5" title={allItems.map(a => a.nome).join('\n')}>
                                                                {visible.map(a => (
                                                                    <p key={a.id} className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[160px]">
                                                                        {a.tipo === 'questionario'
                                                                            ? <span className="text-purple-500 mr-0.5">Q</span>
                                                                            : a.isObbligatoria && <span className="text-teal-500 mr-0.5">•</span>
                                                                        }
                                                                        {a.nome}
                                                                        {a.tipo === 'questionario' && 'periodicitaMesi' in a && a.periodicitaMesi && (
                                                                            <span className="text-purple-400 ml-1">({a.periodicitaMesi}m)</span>
                                                                        )}
                                                                    </p>
                                                                ))}
                                                                {extra > 0 && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setExpandedAccertamenti(prev => {
                                                                                const next = new Set(prev);
                                                                                if (next.has(record.personId)) next.delete(record.personId);
                                                                                else next.add(record.personId);
                                                                                return next;
                                                                            });
                                                                        }}
                                                                        className="flex items-center gap-0.5 text-[10px] text-teal-500 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 transition-colors"
                                                                    >
                                                                        {isExpanded ? (
                                                                            <><ChevronUp className="h-3 w-3" />Mostra meno</>
                                                                        ) : (
                                                                            <><ChevronDown className="h-3 w-3" />+{extra} altri</>
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-3 py-2 hidden lg:table-cell">
                                                    {giudizio
                                                        ? <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', giudizio.cls)}>{giudizio.label}</span>
                                                        : <span className="text-gray-300 text-xs">—</span>
                                                    }
                                                </td>
                                                <td className="px-3 py-2 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap hidden sm:table-cell">
                                                    {fmtDate(record.ultimaVisita)}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-1">
                                                            <StatusIcon className={cn('h-3.5 w-3.5 flex-shrink-0', cfg.textCls)} />
                                                            <span className={cn('text-xs font-medium', cfg.textCls)}>{fmtScadenza(record)}</span>
                                                        </div>
                                                        {record.appuntamentoProgrammato && (
                                                            <div className="flex items-center gap-1 ml-[18px]">
                                                                <Calendar className="h-3 w-3 text-teal-500 flex-shrink-0" />
                                                                <span className="text-[11px] text-teal-600 dark:text-teal-400">
                                                                    {new Date(record.appuntamentoProgrammato).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-2 py-2">
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => openSchedule([record])} title="Programma visita medica"
                                                            className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                                                            <Calendar className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button onClick={() => handleCreateDirectVisit(record)} title="Crea visita medica del lavoro"
                                                            className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                                                            <FileText className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {scheduleTarget && (
                <ScheduleWeekModal
                    companyId={companyId}
                    persone={scheduleTarget.map(r => {
                        const primaryMansione = r.mansioni[0];
                        const minPeriodicita = r.mansioni
                            .filter(m => m.protocollo?.periodicitaMesi)
                            .map(m => m.protocollo!.periodicitaMesi)
                            .sort((a, b) => a - b)[0];
                        return {
                            personId: r.personId,
                            firstName: r.firstName,
                            lastName: r.lastName,
                            mansione: primaryMansione ? { id: primaryMansione.id, nome: primaryMansione.nome } : undefined,
                            ultimaVisita: r.ultimaVisita,
                            prossimaVisita: r.prossimaVisita,
                            isPrimaVisita: r.isPrimaVisita,
                            protocollo: minPeriodicita ? { periodicitaMesi: minPeriodicita } : null,
                            accertamenti: r.accertamenti.map(a => ({
                                id: a.id,
                                nome: a.nome,
                                isObbligatoria: a.isObbligatoria,
                                periodicita: a.periodicita,
                                periodicitaCustomMesi: a.periodicitaCustomMesi,
                                ultimaEsecuzione: a.ultimaEsecuzione,
                                dataScadenza: a.dataScadenza,
                            })),
                        };
                    })}
                    onClose={handleModalClose}
                    onSuccess={handleModalSuccess}
                />
            )}

            {newEmployeeOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setNewEmployeeOpen(false)} />
                    <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
                        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
                            <div>
                                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Nuovo dipendente</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Crea la Person e collega mansione, protocollo e sorveglianza sanitaria.</p>
                            </div>
                            <button onClick={() => setNewEmployeeOpen(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="max-h-[72vh] space-y-5 overflow-y-auto p-5">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Nome
                                    <input value={newEmployeeForm.firstName} onChange={e => setNewEmployeeForm(f => ({ ...f, firstName: e.target.value }))} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
                                </label>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Cognome
                                    <input value={newEmployeeForm.lastName} onChange={e => setNewEmployeeForm(f => ({ ...f, lastName: e.target.value }))} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
                                </label>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Codice fiscale
                                    <input value={newEmployeeForm.taxCode} onChange={e => setNewEmployeeForm(f => ({ ...f, taxCode: e.target.value.toUpperCase() }))} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono shadow-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
                                </label>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Data di nascita
                                    <div className="mt-1">
                                        <DatePickerElegante
                                            value={newEmployeeForm.birthDate}
                                            onChange={date => setNewEmployeeForm(f => ({ ...f, birthDate: date ? toLocalDateString(date) : '', taxCode: '' }))}
                                            placeholder="Data di nascita"
                                            compact
                                        />
                                    </div>
                                </label>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Luogo di nascita
                                    <input value={newEmployeeForm.birthPlace} onChange={e => setNewEmployeeForm(f => ({ ...f, birthPlace: e.target.value, taxCode: '' }))} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
                                </label>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Provincia nascita
                                    <input value={newEmployeeForm.birthProvince} onChange={e => setNewEmployeeForm(f => ({ ...f, birthProvince: e.target.value.toUpperCase() }))} maxLength={2} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm uppercase shadow-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
                                </label>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Sesso
                                    <ElegantSelect
                                        className="mt-1"
                                        value={newEmployeeForm.gender}
                                        onChange={value => setNewEmployeeForm(f => ({ ...f, gender: value, taxCode: '' }))}
                                        placeholder="Seleziona"
                                        options={[
                                            { value: '', label: 'Non indicato' },
                                            { value: 'MALE', label: 'Maschile' },
                                            { value: 'FEMALE', label: 'Femminile' },
                                        ]}
                                    />
                                </label>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Etnia
                                    <ElegantSelect
                                        className="mt-1"
                                        value={newEmployeeForm.etnia}
                                        onChange={value => setNewEmployeeForm(f => ({ ...f, etnia: value || DEFAULT_ETHNICITY }))}
                                        options={ETHNICITY_OPTIONS.map(option => ({ value: option.value, label: option.label }))}
                                    />
                                </label>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Email
                                    <input value={newEmployeeForm.email} onChange={e => setNewEmployeeForm(f => ({ ...f, email: e.target.value }))} type="email" className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
                                </label>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Telefono
                                    <input value={newEmployeeForm.phone} onChange={e => setNewEmployeeForm(f => ({ ...f, phone: e.target.value }))} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
                                </label>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Data assunzione
                                    <div className="mt-1">
                                        <DatePickerElegante
                                            value={newEmployeeForm.hiredDate}
                                            onChange={date => setNewEmployeeForm(f => ({ ...f, hiredDate: date ? toLocalDateString(date) : '' }))}
                                            placeholder="Data assunzione"
                                            compact
                                        />
                                    </div>
                                </label>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Citta residenza
                                    <input value={newEmployeeForm.residenceCity} onChange={e => setNewEmployeeForm(f => ({ ...f, residenceCity: e.target.value }))} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
                                </label>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Provincia residenza
                                    <input value={newEmployeeForm.province} onChange={e => setNewEmployeeForm(f => ({ ...f, province: e.target.value.toUpperCase() }))} maxLength={2} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm uppercase shadow-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
                                </label>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    CAP
                                    <input value={newEmployeeForm.postalCode} onChange={e => setNewEmployeeForm(f => ({ ...f, postalCode: e.target.value }))} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
                                </label>
                                <label className="sm:col-span-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Indirizzo residenza
                                    <input value={newEmployeeForm.residenceAddress} onChange={e => setNewEmployeeForm(f => ({ ...f, residenceAddress: e.target.value }))} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
                                </label>
                                <label className="sm:col-span-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Titolo / qualifica
                                    <input value={newEmployeeForm.title} onChange={e => setNewEmployeeForm(f => ({ ...f, title: e.target.value }))} placeholder="es. Operaio, Impiegato, Magazziniere" className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
                                </label>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Sede aziendale
                                    <ElegantSelect
                                        className="mt-1"
                                        value={newEmployeeForm.siteId}
                                        onChange={value => setNewEmployeeForm(f => ({ ...f, siteId: value, repartoId: '' }))}
                                        placeholder="Seleziona sede"
                                        options={[
                                            { value: '', label: 'Nessuna sede' },
                                            ...companySites.map(site => ({
                                                value: site.id,
                                                label: [site.siteName || 'Sede', site.citta].filter(Boolean).join(' - ')
                                            }))
                                        ]}
                                    />
                                </label>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Reparto
                                    <ElegantSelect
                                        className="mt-1"
                                        value={newEmployeeForm.repartoId}
                                        onChange={value => setNewEmployeeForm(f => ({ ...f, repartoId: value }))}
                                        placeholder={newEmployeeForm.siteId ? 'Seleziona reparto' : 'Seleziona prima la sede'}
                                        disabled={!newEmployeeForm.siteId}
                                        options={[
                                            { value: '', label: 'Nessun reparto' },
                                            ...((repartiData?.reparti || []).map(reparto => ({ value: reparto.id, label: reparto.nome })))
                                        ]}
                                    />
                                </label>
                            </div>

                            <div className="rounded-2xl border border-teal-100 bg-teal-50/40 p-4 dark:border-teal-900/40 dark:bg-teal-900/10">
                                <div className="mb-3 flex flex-wrap gap-2">
                                    <button type="button" onClick={() => setNewEmployeeForm(f => ({ ...f, mansioneMode: 'existing' }))} className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold', newEmployeeForm.mansioneMode === 'existing' ? 'bg-teal-600 text-white' : 'bg-white text-teal-700 border border-teal-200')}>
                                        Mansione esistente
                                    </button>
                                    <button type="button" onClick={() => setNewEmployeeForm(f => ({ ...f, mansioneMode: 'new', mansioneId: '', protocolloSanitarioId: '' }))} className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold', newEmployeeForm.mansioneMode === 'new' ? 'bg-teal-600 text-white' : 'bg-white text-teal-700 border border-teal-200')}>
                                        Nuova mansione
                                    </button>
                                </div>
                                <div className="mb-4 rounded-xl border border-white/70 bg-white/80 p-3 dark:border-gray-700 dark:bg-gray-800/80">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Rischi del dipendente</p>
                                            <p className="text-xs text-gray-500">Selezionando rischi filtro le mansioni compatibili; selezionando mansioni eredito i relativi rischi.</p>
                                        </div>
                                        <input
                                            value={riskSearch}
                                            onChange={event => setRiskSearch(event.target.value)}
                                            placeholder="Cerca rischio..."
                                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 sm:w-64"
                                        />
                                    </div>
                                    <div className="mt-3 grid max-h-44 grid-cols-1 gap-2 overflow-y-auto pr-1 lg:grid-cols-2">
                                        {riskOptions.length === 0 ? (
                                            <p className="text-sm text-gray-400">Nessun rischio trovato.</p>
                                        ) : riskOptions.map(risk => {
                                            const checked = newEmployeeForm.selectedRischi.has(risk.codice);
                                            return (
                                                <label key={risk.codice} className={cn('flex items-start gap-2 rounded-xl border px-3 py-2 transition-colors', checked ? 'border-teal-200 bg-teal-50 dark:border-teal-800 dark:bg-teal-900/20' : 'border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800')}>
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={event => setNewEmployeeForm(f => {
                                                            const selectedRischi = new Set(f.selectedRischi);
                                                            const riskLevels = { ...f.riskLevels };
                                                            if (event.target.checked) {
                                                                selectedRischi.add(risk.codice);
                                                                riskLevels[risk.codice] = riskLevels[risk.codice] || 'MEDIO';
                                                            } else {
                                                                selectedRischi.delete(risk.codice);
                                                                delete riskLevels[risk.codice];
                                                            }
                                                            return { ...f, selectedRischi, riskLevels, mansioneId: '', mansioneIds: new Set<string>(), protocolloSanitarioId: '' };
                                                        })}
                                                        className="mt-1 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                                    />
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block text-sm font-medium text-gray-800 dark:text-gray-100">{risk.nome}</span>
                                                        <span className="block text-xs text-gray-500">{risk.codice} · {risk.categoria}</span>
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                                {newEmployeeForm.mansioneMode === 'existing' ? (
                                    <div className="rounded-xl border border-white/70 bg-white/80 p-3 dark:border-gray-700 dark:bg-gray-800/80">
                                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Mansioni compatibili</p>
                                        {mansioniOptionsForEmployee.length === 0 ? (
                                            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                                Nessuna mansione contiene tutti i rischi selezionati. Passa a “Nuova mansione” per crearne una coerente.
                                            </div>
                                        ) : (
                                            <div className="mt-3 grid max-h-56 grid-cols-1 gap-2 overflow-y-auto pr-1 lg:grid-cols-2">
                                                {mansioniOptionsForEmployee.map(mansione => {
                                                    const checked = newEmployeeForm.mansioneIds.has(mansione.id);
                                                    return (
                                                        <label key={mansione.id} className={cn('rounded-xl border px-3 py-2 transition-colors', checked ? 'border-teal-200 bg-teal-50 dark:border-teal-800 dark:bg-teal-900/20' : 'border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800')}>
                                                            <span className="flex items-start gap-2">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={checked}
                                                                    onChange={event => {
                                                                        const next = new Set(newEmployeeForm.mansioneIds);
                                                                        event.target.checked ? next.add(mansione.id) : next.delete(mansione.id);
                                                                        syncRisksFromMansioni(next);
                                                                    }}
                                                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                                                />
                                                                <span className="min-w-0 flex-1">
                                                                    <span className="block text-sm font-medium text-gray-800 dark:text-gray-100">
                                                                        {mansione.denominazione}{mansione.codice ? ` (${mansione.codice})` : ''}
                                                                    </span>
                                                                    <span className="mt-1 flex flex-wrap gap-1">
                                                                        {(mansione.rischiAssociati || []).length === 0 ? (
                                                                            <span className="text-xs text-gray-400">Nessun rischio esplicitato</span>
                                                                        ) : (mansione.rischiAssociati || []).slice(0, 5).map(risk => (
                                                                            <span key={risk.codiceRischio || risk.nome} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                                                                                {risk.nome || risk.codiceRischio}
                                                                            </span>
                                                                        ))}
                                                                    </span>
                                                                </span>
                                                            </span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Codice
                                            <input value={newEmployeeForm.newMansioneCodice} onChange={e => setNewEmployeeForm(f => ({ ...f, newMansioneCodice: e.target.value.toUpperCase() }))} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono shadow-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
                                        </label>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Nome mansione
                                            <input value={newEmployeeForm.newMansioneNome} onChange={e => setNewEmployeeForm(f => ({ ...f, newMansioneNome: e.target.value }))} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
                                        </label>
                                        <div className="sm:col-span-2 rounded-xl border border-white/70 bg-white/80 p-3 dark:border-gray-700 dark:bg-gray-800/80">
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Rischi associati alla mansione</p>
                                                <input
                                                    value={riskSearch}
                                                    onChange={event => setRiskSearch(event.target.value)}
                                                    placeholder="Cerca rischio..."
                                                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 sm:w-64"
                                                />
                                            </div>
                                            <div className="mt-3 grid max-h-56 grid-cols-1 gap-2 overflow-y-auto pr-1 lg:grid-cols-2">
                                                {riskOptions.length === 0 ? (
                                                    <p className="text-sm text-gray-400">Nessun rischio trovato.</p>
                                                ) : riskOptions.map(risk => {
                                                    const checked = newEmployeeForm.selectedRischi.has(risk.codice);
                                                    return (
                                                        <div key={risk.codice} className={cn('rounded-xl border px-3 py-2 transition-colors', checked ? 'border-teal-200 bg-teal-50 dark:border-teal-800 dark:bg-teal-900/20' : 'border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800')}>
                                                            <label className="flex items-start gap-2">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={checked}
                                                                    onChange={event => setNewEmployeeForm(f => {
                                                                        const selectedRischi = new Set(f.selectedRischi);
                                                                        const riskLevels = { ...f.riskLevels };
                                                                        if (event.target.checked) {
                                                                            selectedRischi.add(risk.codice);
                                                                            riskLevels[risk.codice] = riskLevels[risk.codice] || 'MEDIO';
                                                                        } else {
                                                                            selectedRischi.delete(risk.codice);
                                                                            delete riskLevels[risk.codice];
                                                                        }
                                                                        return { ...f, selectedRischi, riskLevels, protocolloSanitarioId: '' };
                                                                    })}
                                                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                                                />
                                                                <span className="min-w-0 flex-1">
                                                                    <span className="block text-sm font-medium text-gray-800 dark:text-gray-100">{risk.nome}</span>
                                                                    <span className="block text-xs text-gray-500">{risk.codice} · {risk.categoria}</span>
                                                                </span>
                                                            </label>
                                                            {checked && (
                                                                <ElegantSelect
                                                                    className="mt-2"
                                                                    value={newEmployeeForm.riskLevels[risk.codice] || 'MEDIO'}
                                                                    onChange={value => setNewEmployeeForm(f => ({
                                                                        ...f,
                                                                        riskLevels: { ...f.riskLevels, [risk.codice]: value }
                                                                    }))}
                                                                    options={[
                                                                        { value: 'BASSO', label: 'Rischio basso' },
                                                                        { value: 'MEDIO', label: 'Rischio medio' },
                                                                        { value: 'ALTO', label: 'Rischio alto' },
                                                                        { value: 'MOLTO_ALTO', label: 'Rischio molto alto' },
                                                                    ]}
                                                                />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="mt-3">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Protocollo sanitario
                                        <ElegantSelect
                                            className="mt-1"
                                            value={newEmployeeForm.protocolloSanitarioId}
                                            onChange={value => setNewEmployeeForm(f => ({ ...f, protocolloSanitarioId: value }))}
                                            placeholder="Seleziona protocollo"
                                            options={[
                                                { value: '', label: 'Nessun protocollo' },
                                                ...protocolOptionsForEmployee
                                            ]}
                                        />
                                    </label>
                                    <p className="mt-2 text-xs text-teal-700 dark:text-teal-300">
                                        La proposta usa i protocolli della mansione o, per una nuova mansione, quelli che coprono gli accertamenti obbligatori dei rischi selezionati senza aggiungere obblighi non pertinenti.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 border-t border-gray-100 px-5 py-4 dark:border-gray-700">
                            <button onClick={() => setNewEmployeeOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">Annulla</button>
                            <button onClick={() => createEmployeeMutation.mutate()} disabled={createEmployeeMutation.isPending} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
                                {createEmployeeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                Crea dipendente
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {directVisitTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setDirectVisitTarget(null)} />
                    <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
                        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
                            <div>
                                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Crea visita medica del lavoro</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{directVisitTarget.lastName} {directVisitTarget.firstName}</p>
                            </div>
                            <button onClick={() => setDirectVisitTarget(null)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-4 p-5">
                            {!getCurrentDoctorSlot() && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                    Non risulta uno slot disponibilità attivo per il medico corrente in questo momento. La visita può comunque essere creata: il sistema userà un ambulatorio attivo del tenant come fallback e la segnerà come overbooking.
                                </div>
                            )}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Tipo visita
                                    <ElegantSelect
                                        className="mt-1"
                                        value={directVisitForm.tipoVisitaMDL}
                                        onChange={value => setDirectVisitForm(f => ({ ...f, tipoVisitaMDL: value as TipoVisitaMDL }))}
                                        options={[
                                            { value: 'PERIODICA', label: 'Periodica' },
                                            { value: 'PREVENTIVA', label: 'Preventiva' },
                                            { value: 'PREVENTIVA_PREASSUNTIVA', label: 'Preventiva preassuntiva' },
                                            { value: 'STRAORDINARIA', label: 'Straordinaria' },
                                            { value: 'CAMBIO_MANSIONE', label: 'Cambio mansione' },
                                            { value: 'SU_RICHIESTA_LAVORATORE', label: 'Su richiesta lavoratore' },
                                            { value: 'PRECEDENTE_ASSENZA', label: 'Precedente assenza' },
                                            { value: 'CESSAZIONE_RAPPORTO', label: 'Cessazione rapporto' },
                                        ]}
                                    />
                                </label>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Prestazione principale
                                    <ElegantSelect
                                        className="mt-1"
                                        value={directVisitForm.prestazioneId}
                                        onChange={value => setDirectVisitForm(f => ({ ...f, prestazioneId: value }))}
                                        placeholder="Seleziona prestazione"
                                        options={[
                                            { value: '', label: 'Seleziona prestazione' },
                                            ...((allPrestazioniData?.data || []).map(p => ({ value: p.id, label: p.nome })))
                                        ]}
                                    />
                                </label>
                            </div>
                            <div className="rounded-xl border border-gray-100 p-3 dark:border-gray-700">
                                <p className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">Accertamenti da collegare</p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    {directVisitTarget.accertamenti.length === 0 ? (
                                        <p className="text-sm text-gray-400">Nessun accertamento associato al protocollo.</p>
                                    ) : sortedMdlAccertamenti(directVisitTarget.accertamenti).map(accertamento => {
                                        const isMain = accertamento.id === directVisitForm.prestazioneId;
                                        return (
                                        <label key={accertamento.id} className={cn('flex items-center gap-2 rounded-lg border px-3 py-2 text-sm dark:border-gray-700', isMain ? 'border-teal-200 bg-teal-50 dark:bg-teal-900/20' : 'border-gray-100')}>
                                            <input
                                                type="checkbox"
                                                checked={isMain || directVisitForm.selectedAccertamenti.has(accertamento.id)}
                                                disabled={isMain}
                                                onChange={event => setDirectVisitForm(f => {
                                                    const next = new Set(f.selectedAccertamenti);
                                                    event.target.checked ? next.add(accertamento.id) : next.delete(accertamento.id);
                                                    return { ...f, selectedAccertamenti: next };
                                                })}
                                                className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 disabled:opacity-60"
                                            />
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate">{isMain ? 'Visita Medica del Lavoro' : accertamento.nome}</span>
                                                {!accertamento.isObbligatoria && <span className="text-[10px] text-gray-400">facoltativo</span>}
                                            </span>
                                        </label>
                                    )})}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 border-t border-gray-100 px-5 py-4 dark:border-gray-700">
                            <button onClick={() => setDirectVisitTarget(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">Annulla</button>
                            <button onClick={() => createDirectVisitMutation.mutate({ target: directVisitTarget, form: directVisitForm })} disabled={createDirectVisitMutation.isPending} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                                {createDirectVisitMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                Crea e apri visita
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Assegnazione Protocollo Sanitario */}
            {assignProtTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => { setAssignProtTarget(null); setProtSearch(''); }} />
                    <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-4 max-h-[70vh] flex flex-col">
                        {/* Header */}
                        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {assignProtTarget.currentProtocolloId ? 'Cambia' : 'Assegna'} Protocollo Sanitario
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Mansione: <span className="font-medium">{assignProtTarget.mansioneName}</span>
                                </p>
                            </div>
                            <button onClick={() => { setAssignProtTarget(null); setProtSearch(''); }}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Ricerca */}
                        <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                <input type="text" value={protSearch} onChange={e => setProtSearch(e.target.value)}
                                    placeholder="Cerca protocollo…"
                                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    autoFocus />
                            </div>
                        </div>

                        {/* Lista protocolli */}
                        <div className="overflow-y-auto flex-1 px-2 py-2">
                            {isLoadingProtocolli ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                                </div>
                            ) : filteredProtocolli.length === 0 ? (
                                <div className="text-center py-8 text-sm text-gray-400">
                                    Nessun protocollo disponibile
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {filteredProtocolli.map((p: { id: string; codice: string; denominazione: string; periodicitaVisiteMesi?: number; mansione?: { denominazione: string } | null }) => {
                                        const isCurrent = p.id === assignProtTarget.currentProtocolloId;
                                        return (
                                            <button
                                                key={p.id}
                                                onClick={() => assignProtMutation.mutate({ protocolloId: p.id, mansioneId: assignProtTarget.mansioneId })}
                                                disabled={assignProtMutation.isPending}
                                                className={cn(
                                                    'w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-3',
                                                    isCurrent
                                                        ? 'bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800'
                                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/40 border border-transparent'
                                                )}
                                            >
                                                <FileText className={cn('h-4 w-4 flex-shrink-0', isCurrent ? 'text-teal-600' : 'text-gray-400')} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{p.codice}</span>
                                                        {isCurrent && (
                                                            <span className="flex items-center gap-0.5 text-[10px] text-teal-600 dark:text-teal-400 font-medium">
                                                                <Check className="h-2.5 w-2.5" /> Attuale
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.denominazione}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {p.periodicitaVisiteMesi && (
                                                            <span className="text-[10px] text-gray-400">ogni {p.periodicitaVisiteMesi} mesi</span>
                                                        )}
                                                        {p.mansione && !isCurrent && (
                                                            <span className="text-[10px] text-amber-500">Assegnato a: {p.mansione.denominazione}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CompanySorveglianzaSection;
