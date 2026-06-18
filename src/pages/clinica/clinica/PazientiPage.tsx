/**
 * Pazienti Page
 * Lista e gestione pazienti con ricerca CF per integrazione Person esistenti
 *
 * @module pages/poliambulatorio/clinica/PazientiPage
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users, Search, Plus, Eye, Phone, Mail,
    Calendar, FileText, AlertCircle, CheckCircle, Link2, Receipt, UserCheck, Clock,
    SlidersHorizontal, X, ChevronUp, ChevronDown, Building2, Stethoscope, UserCog
} from 'lucide-react';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { useToast } from '../../../hooks/useToast';
import { apiGet, apiPost } from '../../../services/api';
import type { PersonTenantProfile } from '../../../types/personMultiTenant';
import { DatePickerElegante } from '../../../components/ui/DatePickerElegante';
import { DateRangeCalendar, DateRange } from '../../../components/ui/DateRangeCalendar';
import { ActionButton, CRUDPrimaryButton } from '../../../components/ui';
import ListPaginationFooter from '../../../components/ui/ListPaginationFooter';
import { DEFAULT_ETHNICITY, ETHNICITY_OPTIONS } from '../../../constants/ethnicityOptions';

// ============================================================
// TYPES
// ============================================================

interface Paziente {
    id: string;
    firstName: string;
    lastName: string;
    taxCode: string | null;
    email: string | null;
    phone: string | null;
    birthDate: string | null;
    residenceAddress: string | null;
    residenceCity: string | null;
    postalCode: string | null;
    province: string | null;
    personRoles: Array<{ roleType: string; tenantId: string }>;
    visiteComePaziente?: Array<{
        id: string;
        dataOra: string;
        stato: string;
    }>;
    tenantProfiles?: PersonTenantProfile[];
    currentProfile?: PersonTenantProfile;
}

interface SearchPerson {
    id: string;
    firstName: string;
    lastName: string;
    taxCode: string | null;
    email: string | null;
    phone: string | null;
    birthDate: string | null;
    residenceAddress: string | null;
    residenceCity: string | null;
    postalCode: string | null;
    province: string | null;
    roles: string[];
    isFromOtherTenant?: boolean;
    tenantProfiles?: PersonTenantProfile[];
}

interface SearchResult {
    found: boolean;
    isPazienteInTenant: boolean;
    isFromOtherTenant: boolean;
    person?: SearchPerson;
}

interface Company {
    id: string;
    ragioneSociale: string;
}

// ============================================================
// COLUMN DEFINITIONS
// ============================================================

type PazienteCol = 'taxCode' | 'contatti' | 'ultimaVisita' | 'ruoli';

const COL_DEFS: Record<PazienteCol, { label: string }> = {
    taxCode: { label: 'Codice Fiscale' },
    contatti: { label: 'Contatti' },
    ultimaVisita: { label: 'Ultima Visita' },
    ruoli: { label: 'Ruoli' },
};
const ALL_COLS: PazienteCol[] = ['taxCode', 'contatti', 'ultimaVisita', 'ruoli'];
const DEFAULT_COLS: PazienteCol[] = ['taxCode', 'contatti', 'ultimaVisita', 'ruoli'];

// ============================================================
// BRANCHE SPECIALISTICHE (same list as TariffarioMedicoPage)
// ============================================================

const BRANCHE_SPECIALISTICHE = [
    'Cardiologia',
    'Dermatologia',
    'Endocrinologia',
    'Gastroenterologia',
    'Ginecologia',
    'Medicina del Lavoro',
    'Medicina Generale',
    'Neurologia',
    'Oculistica',
    'Ortopedia',
    'Otorinolaringoiatria',
    'Pediatria',
    'Pneumologia',
    'Urologia',
    'Altro',
];

// ============================================================
// PERSISTENZA PREFERENZE (localStorage + midnight-reset)
// ============================================================

const LS_KEY = 'pazienti-prefs';

function toLocalDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fromLocalDateStr(s: string): Date {
    const [y, m, day] = s.split('-').map(Number);
    return new Date(y, m - 1, day);
}
function readPrefs(): Record<string, unknown> {
    try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}'); }
    catch { return {}; }
}
function savePrefs(update: Record<string, unknown>) {
    const todayStr = toLocalDateStr(new Date());
    try { localStorage.setItem(LS_KEY, JSON.stringify({ ...readPrefs(), ...update, savedDate: todayStr })); }
    catch { /* storage unavailable */ }
}
function readFilterPref<T>(key: string, defaultVal: T): T {
    const prefs = readPrefs();
    const todayStr = toLocalDateStr(new Date());
    if (prefs.savedDate && prefs.savedDate !== todayStr) return defaultVal;
    return (prefs[key] as T) ?? defaultVal;
}
function readColPref<T>(key: string, defaultVal: T): T {
    // Column visibility persists regardless of date
    const prefs = readPrefs();
    return (prefs[key] as T) ?? defaultVal;
}
function getInitialPeriodoRange(): DateRange | null {
    const prefs = readPrefs();
    const todayStr = toLocalDateStr(new Date());
    if (!prefs.periodoStart) return null;
    if (prefs.savedDate && prefs.savedDate !== todayStr) return null;
    try {
        return {
            start: fromLocalDateStr(prefs.periodoStart as string),
            end: prefs.periodoEnd ? fromLocalDateStr(prefs.periodoEnd as string) : fromLocalDateStr(prefs.periodoStart as string),
        };
    } catch { return null; }
}

// ============================================================
// COMPONENT
// ============================================================

const PazientiPage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();

    const [pazienti, setPazienti] = useState<Paziente[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
    const [stats, setStats] = useState({ total: 0, conVisite: 0, conContatto: 0 });

    // Filters (persist with midnight reset)
    const [roleFilter, setRoleFilter] = useState<string>(() => readFilterPref('roleFilter', ''));
    const [companyFilter, setCompanyFilter] = useState<string>(() => readFilterPref('companyFilter', ''));
    const [periodoRange, setPeriodoRange] = useState<DateRange | null>(getInitialPeriodoRange);
    const [brancaFilter, setBrancaFilter] = useState<string>(() => readFilterPref('brancaFilter', ''));

    // Column visibility (persists always, no midnight reset)
    const [visibleCols, setVisibleCols] = useState<Set<PazienteCol>>(() => {
        const stored = readColPref<PazienteCol[] | null>('visibleCols', null);
        return new Set(stored ?? DEFAULT_COLS);
    });
    const [showColMenu, setShowColMenu] = useState(false);
    const colMenuRef = useRef<HTMLDivElement>(null);

    // Companies for filter dropdown
    const [companies, setCompanies] = useState<Company[]>([]);

    // Modal per nuovo paziente
    const [showNewModal, setShowNewModal] = useState(false);
    const [newPaziente, setNewPaziente] = useState({
        firstName: '', lastName: '', taxCode: '', email: '',
        phone: '', birthDate: '', etnia: DEFAULT_ETHNICITY,
        residenceAddress: '', residenceCity: '', postalCode: '', province: ''
    });
    const [cfSearchResult, setCfSearchResult] = useState<SearchResult | null>(null);
    const [cfSearching, setCfSearching] = useState(false);
    const [saving, setSaving] = useState(false);

    // Close col menu on outside click
    useEffect(() => {
        if (!showColMenu) return;
        const handler = (e: MouseEvent) => {
            if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node))
                setShowColMenu(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showColMenu]);

    // Fetch companies for filter dropdown
    useEffect(() => {
        if (!isReady) return;
        apiGet<{ success: boolean; data: Company[] }>('/api/v1/clinica/pazienti/companies')
            .then(r => { if (r.success) setCompanies(r.data); })
            .catch(() => {});
    }, [isReady, tenantFilterKey]);

    // Persist filter preferences
    useEffect(() => {
        savePrefs({
            roleFilter,
            companyFilter,
            brancaFilter,
            periodoStart: periodoRange?.start ? toLocalDateStr(periodoRange.start) : null,
            periodoEnd: periodoRange?.end ? toLocalDateStr(periodoRange.end) : null,
            visibleCols: Array.from(visibleCols),
        });
    }, [roleFilter, companyFilter, brancaFilter, periodoRange, visibleCols]);

    const activeFilterCount = [roleFilter, companyFilter, brancaFilter, periodoRange ? '1' : ''].filter(Boolean).length;

    const resetFilters = () => {
        setRoleFilter('');
        setCompanyFilter('');
        setPeriodoRange(null);
        setBrancaFilter('');
        setSearchTerm('');
        setPagination(p => ({ ...p, page: 1 }));
    };

    const toggleCol = (col: PazienteCol) =>
        setVisibleCols(prev => {
            const next = new Set(prev);
            next.has(col) ? next.delete(col) : next.add(col);
            return next;
        });

    // Fetch pazienti
    const fetchPazienti = useCallback(async () => {
        setLoading(true);
        try {
            const tenantParams = getTenantFilterParams();
            const params = new URLSearchParams();
            params.set('page', String(pagination.page));
            params.set('pageSize', String(pagination.pageSize));
            if (searchTerm) params.set('search', searchTerm);
            if (tenantParams.tenantIds) params.set('tenantIds', tenantParams.tenantIds.join(','));
            if (tenantParams.allTenants) params.set('allTenants', 'true');
            if (roleFilter) params.set('roleFilter', roleFilter);
            if (companyFilter) params.set('companyTenantProfileId', companyFilter);
            if (periodoRange?.start) params.set('periodoStart', toLocalDateStr(periodoRange.start));
            if (periodoRange?.end) params.set('periodoEnd', toLocalDateStr(periodoRange.end));
            if (brancaFilter) params.set('brancaSpecialistica', brancaFilter);

            const response = await apiGet<{
                success: boolean;
                data: Paziente[];
                pagination: typeof pagination;
                stats?: typeof stats;
            }>(`/api/v1/clinica/pazienti?${params.toString()}`);

            if (response.success) {
                setPazienti(response.data);
                setPagination(response.pagination);
                setStats(response.stats || {
                    total: response.pagination.total,
                    conVisite: response.data.filter(p => (p.visiteComePaziente?.length || 0) > 0).length,
                    conContatto: response.data.filter(p => p.email || p.phone).length
                });
            }
        } catch {
            setError('Errore nel caricamento pazienti');
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.pageSize, searchTerm, roleFilter, companyFilter, periodoRange, brancaFilter, getTenantFilterParams, tenantFilterKey]);

    useEffect(() => {
        if (isReady) fetchPazienti();
    }, [fetchPazienti, isReady]);

    // Reset page on filter change
    useEffect(() => {
        setPagination(p => ({ ...p, page: 1 }));
    }, [searchTerm, roleFilter, companyFilter, brancaFilter, periodoRange]);

    // Ricerca paziente per CF con debounce
    const searchByTaxCode = useMemo(() => {
        let timeoutId: ReturnType<typeof setTimeout>;
        return (taxCode: string) => {
            clearTimeout(timeoutId);
            if (taxCode.length !== 16) { setCfSearchResult(null); return; }
            timeoutId = setTimeout(async () => {
                setCfSearching(true);
                try {
                    const response = await apiGet<{
                        success: boolean;
                        found: boolean;
                        isPazienteInTenant?: boolean;
                        person?: SearchResult['person'];
                    }>(`/api/v1/clinica/pazienti/cerca-cf/${taxCode.toUpperCase()}`);
                    if (response.success) {
                        setCfSearchResult({
                            found: response.found,
                            isPazienteInTenant: response.isPazienteInTenant || false,
                            isFromOtherTenant: response.person?.isFromOtherTenant || false,
                            person: response.person
                        });
                        if (response.found && response.person) {
                            setNewPaziente(prev => ({
                                ...prev,
                                firstName: response.person!.firstName || prev.firstName,
                                lastName: response.person!.lastName || prev.lastName,
                                email: response.person!.email || prev.email,
                                phone: response.person!.phone || prev.phone,
                                birthDate: response.person!.birthDate?.split('T')[0] || prev.birthDate,
                                residenceAddress: response.person!.residenceAddress || prev.residenceAddress,
                                residenceCity: response.person!.residenceCity || prev.residenceCity,
                                postalCode: response.person!.postalCode || prev.postalCode,
                                province: response.person!.province || prev.province
                            }));
                        }
                    }
                } catch { /* noop */ } finally {
                    setCfSearching(false);
                }
            }, 500);
        };
    }, []);

    const handleTaxCodeChange = (value: string) => {
        const cleanValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
        setNewPaziente(prev => ({ ...prev, taxCode: cleanValue }));
        searchByTaxCode(cleanValue);
    };

    const handleSave = async () => {
        if (!newPaziente.firstName || !newPaziente.lastName) {
            setError('Nome e cognome sono obbligatori');
            return;
        }
        setSaving(true);
        try {
            const response = await apiPost<{
                success: boolean;
                data: Paziente;
                isNew: boolean;
                wasLinked: boolean;
                message: string;
            }>('/api/v1/clinica/pazienti', newPaziente);
            if (response.success) {
                setShowNewModal(false);
                setNewPaziente({
                    firstName: '', lastName: '', taxCode: '', email: '',
                    phone: '', birthDate: '', etnia: DEFAULT_ETHNICITY,
                    residenceAddress: '', residenceCity: '', postalCode: '', province: ''
                });
                setCfSearchResult(null);
                fetchPazienti();
                if (response.wasLinked) {
                    showToast({ type: 'success', message: `${response.message} - Il paziente è stato collegato all'anagrafica esistente dalla formazione.` });
                }
            }
        } catch {
            setError('Errore nel salvataggio paziente');
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (date: string | null) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('it-IT');
    };

    const handlePageSizeChange = (pageSize: number) => {
        setPagination(p => ({ ...p, page: 1, pageSize }));
    };

    const colCount = 2 + Array.from(visibleCols).length; // Paziente + optional cols + Azioni

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="w-7 h-7 text-teal-600" />
                        Anagrafica pazienti
                    </h1>
                    <p className="text-gray-600 mt-1">Ricerca, cartelle cliniche e contatti dei pazienti</p>
                </div>
                <CRUDPrimaryButton onClick={() => setShowNewModal(true)}>
                    <Plus className="w-4 h-4" />
                    Nuovo Paziente
                </CRUDPrimaryButton>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <UserCheck className="h-5 w-5 text-teal-600" />
                        <div>
                            <p className="text-sm text-slate-500">Pazienti in lista</p>
                            <p className="text-2xl font-semibold text-slate-950">{stats.total || pagination.total || pazienti.length}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-amber-600" />
                        <div>
                            <p className="text-sm text-slate-500">Con visite registrate</p>
                            <p className="text-2xl font-semibold text-slate-950">{stats.conVisite}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-indigo-600" />
                        <div>
                            <p className="text-sm text-slate-500">Con contatto</p>
                            <p className="text-2xl font-semibold text-slate-950">{stats.conContatto}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-3">
                {/* Row 1: Search + Periodo + Filters + Columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cerca per nome, CF, email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl bg-gradient-to-r from-white to-gray-50 shadow-sm hover:border-teal-400 hover:shadow-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:ring-offset-1 text-sm h-10 transition-all duration-300"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Periodo */}
                    <DateRangeCalendar
                        value={periodoRange ?? { start: new Date(), end: new Date() }}
                        onChange={(range) => setPeriodoRange(range.start ? range : null)}
                        placeholder="Periodo visita/app."
                        theme="teal"
                        size="md"
                        clearable
                        showPresets
                    />

                    {/* Role filter */}
                    <div className="relative">
                        <UserCog className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl bg-gradient-to-r from-white to-gray-50 shadow-sm hover:border-teal-400 hover:shadow-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:ring-offset-1 appearance-none text-sm h-10 transition-all duration-300"
                        >
                            <option value="">Tutti i ruoli</option>
                            <option value="DIPENDENTE">Solo dipendenti</option>
                            <option value="PAZIENTE_SOLO">Solo pazienti</option>
                        </select>
                    </div>

                    {/* Company filter */}
                    <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                        <select
                            value={companyFilter}
                            onChange={(e) => setCompanyFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl bg-gradient-to-r from-white to-gray-50 shadow-sm hover:border-teal-400 hover:shadow-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:ring-offset-1 appearance-none text-sm h-10 transition-all duration-300"
                        >
                            <option value="">Tutte le aziende</option>
                            {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.ragioneSociale}</option>
                            ))}
                        </select>
                    </div>

                    {/* Branca specialistica */}
                    <div className="relative">
                        <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                        <select
                            value={brancaFilter}
                            onChange={(e) => setBrancaFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl bg-gradient-to-r from-white to-gray-50 shadow-sm hover:border-teal-400 hover:shadow-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:ring-offset-1 appearance-none text-sm h-10 transition-all duration-300"
                        >
                            <option value="">Tutte le branche</option>
                            {BRANCHE_SPECIALISTICHE.map(b => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                    </div>

                    {/* Controls: Columns + Reset */}
                    <div className="flex items-center gap-2">
                        {/* Column selector */}
                        <div className="relative" ref={colMenuRef}>
                            <button
                                onClick={() => setShowColMenu(v => !v)}
                                className={`flex items-center gap-3 group h-10 text-sm px-3 bg-gradient-to-r from-white to-gray-50 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 transition-all duration-300 ease-out ${showColMenu ? 'border-teal-300 shadow-md ring-2 ring-teal-100' : 'border-gray-200 hover:border-teal-400 hover:shadow-md'}`}
                            >
                                <div className={`p-1.5 rounded-lg transition-colors duration-200 ${showColMenu ? 'bg-teal-100' : 'bg-teal-50 group-hover:bg-teal-100'}`}>
                                    <SlidersHorizontal className={`h-4 w-4 ${showColMenu ? 'text-teal-600' : 'text-teal-500'}`} />
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Colonne</span>
                                    <span className="font-medium text-gray-900 text-xs">{visibleCols.size}/{ALL_COLS.length}</span>
                                </div>
                            </button>
                            {showColMenu && (
                                <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-48 space-y-0.5">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Colonne visibili</p>
                                    {ALL_COLS.map((key) => {
                                        const def = COL_DEFS[key];
                                        return (
                                            <div key={key} className="flex items-center gap-2 px-1 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => toggleCol(key)}>
                                                <input type="checkbox" checked={visibleCols.has(key)} onChange={() => toggleCol(key)} className="rounded accent-teal-600 flex-shrink-0 pointer-events-none" />
                                                <span className="text-sm text-gray-700 flex-1">{def.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Reset filters */}
                        {(activeFilterCount > 0 || searchTerm) && (
                            <button
                                onClick={resetFilters}
                                title="Reimposta tutti i filtri"
                                className="h-10 px-3 flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-xl hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-all duration-200 shadow-sm"
                            >
                                <X className="w-3.5 h-3.5" />
                                {activeFilterCount > 0 && <span className="w-4 h-4 rounded-full bg-teal-600 text-white text-[9px] font-bold flex items-center justify-center">{activeFilterCount}</span>}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paziente</th>
                            {visibleCols.has('taxCode') && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Codice Fiscale</th>}
                            {visibleCols.has('contatti') && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contatti</th>}
                            {visibleCols.has('ultimaVisita') && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ultima Visita</th>}
                            {visibleCols.has('ruoli') && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ruoli</th>}
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Azioni</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={colCount} className="px-6 py-12 text-center text-gray-500">Caricamento...</td>
                            </tr>
                        ) : pazienti.length === 0 ? (
                            <tr>
                                <td colSpan={colCount} className="px-6 py-12 text-center text-gray-500">
                                    {(activeFilterCount > 0 || searchTerm) ? 'Nessun paziente corrisponde ai filtri selezionati' : 'Nessun paziente trovato'}
                                </td>
                            </tr>
                        ) : (
                            pazienti.map((paziente) => (
                                <tr
                                    key={paziente.id}
                                    className="hover:bg-teal-50/70 cursor-pointer transition-colors"
                                    onClick={() => navigate(`/poliambulatorio/pazienti/${paziente.id}`)}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                                                <span className="text-teal-700 font-semibold text-sm">
                                                    {paziente.firstName[0]}{paziente.lastName[0]}
                                                </span>
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">{paziente.lastName} {paziente.firstName}</div>
                                                {paziente.birthDate && (
                                                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                        <Calendar className="w-3 h-3" />
                                                        {formatDate(paziente.birthDate)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    {visibleCols.has('taxCode') && (
                                        <td className="px-6 py-4 text-sm font-mono text-gray-600">{paziente.taxCode || '-'}</td>
                                    )}
                                    {visibleCols.has('contatti') && (
                                        <td className="px-6 py-4 text-sm space-y-0.5">
                                            {paziente.email && (
                                                <div className="flex items-center gap-1.5 text-gray-600">
                                                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                                                    <span className="truncate max-w-[180px]">{paziente.email}</span>
                                                </div>
                                            )}
                                            {paziente.phone && (
                                                <div className="flex items-center gap-1.5 text-gray-600">
                                                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                                                    {paziente.phone}
                                                </div>
                                            )}
                                            {!paziente.email && !paziente.phone && <span className="text-gray-400">-</span>}
                                        </td>
                                    )}
                                    {visibleCols.has('ultimaVisita') && (
                                        <td className="px-6 py-4 text-sm">
                                            {paziente.visiteComePaziente?.[0] ? (
                                                <div>
                                                    <div className="text-gray-900">{formatDate(paziente.visiteComePaziente[0].dataOra)}</div>
                                                    <span className={`mt-0.5 inline-block px-2 py-0.5 rounded-full text-xs ${paziente.visiteComePaziente[0].stato === 'COMPLETATA'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-yellow-100 text-yellow-800'}`}>
                                                        {paziente.visiteComePaziente[0].stato}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                    )}
                                    {visibleCols.has('ruoli') && (
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {Array.from(new Set(paziente.personRoles.map(r => r.roleType))).map((roleType) => (
                                                    <span key={roleType} className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleType === 'PAZIENTE' ? 'bg-blue-100 text-blue-800'
                                                        : roleType === 'EMPLOYEE' ? 'bg-purple-100 text-purple-800'
                                                            : roleType === 'TRAINER' || roleType === 'SENIOR_TRAINER' || roleType === 'EXTERNAL_TRAINER' ? 'bg-green-100 text-green-800'
                                                                : roleType === 'MEDICO' || roleType === 'MEDICO_COMPETENTE' ? 'bg-teal-100 text-teal-800'
                                                                    : 'bg-gray-100 text-gray-700'}`}>
                                                        {roleType === 'PAZIENTE' ? 'Paziente'
                                                            : roleType === 'EMPLOYEE' ? 'Dipendente'
                                                                : roleType === 'TRAINER' ? 'Formatore'
                                                                    : roleType === 'SENIOR_TRAINER' ? 'Form. Senior'
                                                                        : roleType === 'EXTERNAL_TRAINER' ? 'Form. Esterno'
                                                                            : roleType === 'MEDICO' ? 'Medico'
                                                                                : roleType === 'MEDICO_COMPETENTE' ? 'Med. Competente'
                                                                                    : roleType}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                    )}
                                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                        <ActionButton
                                            theme="teal"
                                            actions={[
                                                {
                                                    label: 'Cartella clinica',
                                                    icon: <Eye className="w-4 h-4" />,
                                                    onClick: () => navigate(`/poliambulatorio/pazienti/${paziente.id}`)
                                                },
                                                {
                                                    label: 'Referti',
                                                    icon: <FileText className="w-4 h-4" />,
                                                    onClick: () => navigate(`/poliambulatorio/pazienti/${paziente.id}#referti`)
                                                },
                                                {
                                                    label: 'Fatture',
                                                    icon: <Receipt className="w-4 h-4" />,
                                                    onClick: () => navigate(`/poliambulatorio/pazienti/${paziente.id}#fatture`)
                                                },
                                            ]}
                                        />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {pagination.total > 0 && (
                    <ListPaginationFooter
                        page={pagination.page}
                        pageSize={pagination.pageSize}
                        total={pagination.total}
                        totalPages={pagination.totalPages || 1}
                        onPageChange={(page) => setPagination(p => ({ ...p, page }))}
                        onPageSizeChange={handlePageSizeChange}
                    />
                )}
            </div>

            {/* Modal Nuovo Paziente */}
            {showNewModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b">
                            <h2 className="text-xl font-semibold">Nuovo Paziente</h2>
                            <p className="text-sm text-gray-500 mt-1">Inserisci il CF per verificare se esiste già in anagrafica</p>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Codice Fiscale */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Codice Fiscale</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={newPaziente.taxCode}
                                        onChange={(e) => handleTaxCodeChange(e.target.value)}
                                        placeholder="RSSMRA80A01H501U"
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                                        maxLength={16}
                                    />
                                    {cfSearching && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                                        </div>
                                    )}
                                </div>
                                {cfSearchResult && (
                                    <div className={`mt-2 p-3 rounded-lg ${cfSearchResult.found ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                                        {cfSearchResult.found ? (
                                            <div className="flex items-start gap-2">
                                                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                                <div>
                                                    <p className="font-medium text-green-800">Persona trovata: {cfSearchResult.person?.firstName} {cfSearchResult.person?.lastName}</p>
                                                    {cfSearchResult.isFromOtherTenant && (
                                                        <p className="text-sm text-green-600 flex items-center gap-1">
                                                            <Link2 className="w-4 h-4" />
                                                            Presente in anagrafica formazione - verrà collegato automaticamente
                                                        </p>
                                                    )}
                                                    {cfSearchResult.isPazienteInTenant && (
                                                        <p className="text-sm text-blue-600">Già registrato come paziente in questa clinica</p>
                                                    )}
                                                    <p className="text-sm text-gray-600 mt-1">Ruoli: {cfSearchResult.person?.roles?.join(', ') || 'Nessuno'}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-gray-600">Nessuna corrispondenza - verrà creato un nuovo paziente</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome <span className="text-red-500">*</span></label>
                                    <input type="text" value={newPaziente.firstName} onChange={(e) => setNewPaziente(p => ({ ...p, firstName: e.target.value }))} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cognome <span className="text-red-500">*</span></label>
                                    <input type="text" value={newPaziente.lastName} onChange={(e) => setNewPaziente(p => ({ ...p, lastName: e.target.value }))} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input type="email" value={newPaziente.email} onChange={(e) => setNewPaziente(p => ({ ...p, email: e.target.value }))} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                                    <input type="tel" value={newPaziente.phone} onChange={(e) => setNewPaziente(p => ({ ...p, phone: e.target.value }))} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Data di Nascita</label>
                                <DatePickerElegante
                                    value={newPaziente.birthDate}
                                    onChange={(date) => setNewPaziente(p => ({ ...p, birthDate: date ? date.toISOString().split('T')[0] : '' }))}
                                    theme="teal"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Etnia</label>
                                <select value={newPaziente.etnia} onChange={(e) => setNewPaziente(p => ({ ...p, etnia: e.target.value }))} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500">
                                    {ETHNICITY_OPTIONS.map(option => (
                                        <option key={option.value || 'empty'} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo</label>
                                <input type="text" value={newPaziente.residenceAddress} onChange={(e) => setNewPaziente(p => ({ ...p, residenceAddress: e.target.value }))} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Città</label>
                                    <input type="text" value={newPaziente.residenceCity} onChange={(e) => setNewPaziente(p => ({ ...p, residenceCity: e.target.value }))} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">CAP</label>
                                    <input type="text" value={newPaziente.postalCode} onChange={(e) => setNewPaziente(p => ({ ...p, postalCode: e.target.value }))} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" maxLength={5} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
                                    <input type="text" value={newPaziente.province} onChange={(e) => setNewPaziente(p => ({ ...p, province: e.target.value.toUpperCase() }))} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" maxLength={2} />
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => { setShowNewModal(false); setCfSearchResult(null); setNewPaziente({ firstName: '', lastName: '', taxCode: '', email: '', phone: '', birthDate: '', etnia: DEFAULT_ETHNICITY, residenceAddress: '', residenceCity: '', postalCode: '', province: '' }); }}
                                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !newPaziente.firstName || !newPaziente.lastName}
                                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                            >
                                {saving ? 'Salvataggio...' : cfSearchResult?.found && !cfSearchResult.isPazienteInTenant ? 'Collega Paziente' : 'Crea Paziente'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PazientiPage;
