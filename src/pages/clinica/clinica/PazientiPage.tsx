/**
 * Pazienti Page
 * Lista e gestione pazienti con ricerca CF per integrazione Person esistenti
 * 
 * @module pages/poliambulatorio/clinica/PazientiPage
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users, Search, Plus, Eye, Phone, Mail,
    Calendar, FileText, AlertCircle, CheckCircle, Link2, Receipt, UserCheck, Clock
} from 'lucide-react';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { useToast } from '../../../hooks/useToast';
import { apiGet, apiPost } from '../../../services/api';
import type { PersonTenantProfile } from '../../../types/personMultiTenant';
import { DatePickerElegante } from '../../../components/ui/DatePickerElegante';
import { ActionButton, CRUDPrimaryButton } from '../../../components/ui';
import ListPaginationFooter from '../../../components/ui/ListPaginationFooter';
import { DEFAULT_ETHNICITY, ETHNICITY_OPTIONS } from '../../../constants/ethnicityOptions';

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
    // Progetto 48: Multi-tenant support
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
    // Progetto 48: Multi-tenant support
    tenantProfiles?: PersonTenantProfile[];
}

interface SearchResult {
    found: boolean;
    isPazienteInTenant: boolean;
    isFromOtherTenant: boolean;
    person?: SearchPerson;
}

const PazientiPage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();

    // Tenant filter from global context
    const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();

    const [pazienti, setPazienti] = useState<Paziente[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0
    });
    const [stats, setStats] = useState({
        total: 0,
        conVisite: 0,
        conContatto: 0
    });

    // Modal per nuovo paziente
    const [showNewModal, setShowNewModal] = useState(false);
    const [newPaziente, setNewPaziente] = useState({
        firstName: '',
        lastName: '',
        taxCode: '',
        email: '',
        phone: '',
        birthDate: '',
        etnia: DEFAULT_ETHNICITY,
        residenceAddress: '',
        residenceCity: '',
        postalCode: '',
        province: ''
    });
    const [cfSearchResult, setCfSearchResult] = useState<SearchResult | null>(null);
    const [cfSearching, setCfSearching] = useState(false);
    const [saving, setSaving] = useState(false);

    // Fetch pazienti
    const fetchPazienti = useCallback(async () => {
        setLoading(true);
        try {
            const tenantParams = getTenantFilterParams();
            let url = `/api/v1/clinica/pazienti?page=${pagination.page}&pageSize=${pagination.pageSize}&search=${searchTerm}`;
            if (tenantParams.tenantIds) {
                url += `&tenantIds=${tenantParams.tenantIds.join(',')}`;
            }
            if (tenantParams.allTenants) {
                url += `&allTenants=true`;
            }

            const response = await apiGet<{
                success: boolean;
                data: Paziente[];
                pagination: typeof pagination;
                stats?: typeof stats;
            }>(url);

            if (response.success) {
                setPazienti(response.data);
                setPagination(response.pagination);
                setStats(response.stats || {
                    total: response.pagination.total,
                    conVisite: response.data.filter(p => (p.visiteComePaziente?.length || 0) > 0).length,
                    conContatto: response.data.filter(p => p.email || p.phone).length
                });
            }
        } catch (err) {
            setError('Errore nel caricamento pazienti');
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.pageSize, searchTerm, getTenantFilterParams, tenantFilterKey]);

    useEffect(() => {
        if (isReady) {
            fetchPazienti();
        }
    }, [fetchPazienti, isReady]);

    // Ricerca paziente per CF con debounce custom
    const searchByTaxCode = useMemo(() => {
        let timeoutId: ReturnType<typeof setTimeout>;
        return (taxCode: string) => {
            clearTimeout(timeoutId);

            if (taxCode.length !== 16) {
                setCfSearchResult(null);
                return;
            }

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

                        // Auto-compila dati se trovato
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
                } catch (err) {
                } finally {
                    setCfSearching(false);
                }
            }, 500);
        };
    }, []);

    // Handle CF change
    const handleTaxCodeChange = (value: string) => {
        const cleanValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
        setNewPaziente(prev => ({ ...prev, taxCode: cleanValue }));
        searchByTaxCode(cleanValue);
    };

    // Salva nuovo paziente
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
                    phone: '', birthDate: '', etnia: DEFAULT_ETHNICITY, residenceAddress: '',
                    residenceCity: '', postalCode: '', province: ''
                });
                setCfSearchResult(null);
                fetchPazienti();

                // Mostra messaggio appropriato
                if (response.wasLinked) {
                    showToast({ type: 'success', message: `${response.message} - Il paziente è stato collegato all'anagrafica esistente dalla formazione.` });
                }
            }
        } catch (err) {
            setError('Errore nel salvataggio paziente');
        } finally {
            setSaving(false);
        }
    };

    // Formatta data
    const formatDate = (date: string | null) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('it-IT');
    };

    const handlePageSizeChange = (pageSize: number) => {
        setPagination(p => ({ ...p, page: 1, pageSize }));
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            {/* Header */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-teal-600 flex items-center justify-center shadow-sm">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-950">
                                Anagrafica pazienti
                            </h1>
                            <p className="text-slate-500 mt-1">
                                Ricerca, cartelle cliniche e contatti dei pazienti
                            </p>
                        </div>
                    </div>
                    <CRUDPrimaryButton onClick={() => setShowNewModal(true)}>
                        <Plus className="w-5 h-5 mr-2" />
                        Nuovo Paziente
                    </CRUDPrimaryButton>
                </div>
                <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-3">
                            <UserCheck className="h-5 w-5 text-teal-600" />
                            <div>
                                <p className="text-sm text-slate-500">Pazienti in lista</p>
                                <p className="text-2xl font-semibold text-slate-950">{stats.total || pagination.total || pazienti.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-3">
                            <Clock className="h-5 w-5 text-amber-600" />
                            <div>
                                <p className="text-sm text-slate-500">Con visite registrate</p>
                                <p className="text-2xl font-semibold text-slate-950">{stats.conVisite}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-3">
                            <Mail className="h-5 w-5 text-indigo-600" />
                            <div>
                                <p className="text-sm text-slate-500">Con contatto</p>
                                <p className="text-2xl font-semibold text-slate-950">{stats.conContatto}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cerca per nome, cognome, codice fiscale, email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-slate-50/60"
                    />
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">✕</button>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paziente</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Codice Fiscale</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contatti</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ultima Visita</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ruoli</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Azioni</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                    Caricamento...
                                </td>
                            </tr>
                        ) : pazienti.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                    Nessun paziente trovato
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
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                                                <span className="text-teal-700 font-semibold">
                                                    {paziente.firstName[0]}{paziente.lastName[0]}
                                                </span>
                                            </div>
                                            <div className="ml-4">
                                                <div className="font-medium text-gray-900">
                                                    {paziente.lastName} {paziente.firstName}
                                                </div>
                                                {paziente.birthDate && (
                                                    <div className="text-sm text-gray-500">
                                                        <Calendar className="w-3 h-3 inline mr-1" />
                                                        {formatDate(paziente.birthDate)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-mono text-gray-600">
                                        {paziente.taxCode || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        {paziente.email && (
                                            <div className="flex items-center gap-1 text-gray-600">
                                                <Mail className="w-4 h-4" />
                                                {paziente.email}
                                            </div>
                                        )}
                                        {paziente.phone && (
                                            <div className="flex items-center gap-1 text-gray-600">
                                                <Phone className="w-4 h-4" />
                                                {paziente.phone}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        {paziente.visiteComePaziente?.[0] ? (
                                            <div>
                                                <div className="text-gray-900">{formatDate(paziente.visiteComePaziente[0].dataOra)}</div>
                                                <span className={`px-2 py-0.5 rounded-full text-xs ${paziente.visiteComePaziente[0].stato === 'COMPLETATA'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {paziente.visiteComePaziente[0].stato}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">Nessuna visita</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {/* Deduplicate role types - a person may have same role in multiple tenants */}
                                            {Array.from(new Set(paziente.personRoles.map(r => r.roleType))).map((roleType) => (
                                                <span
                                                    key={roleType}
                                                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleType === 'PAZIENTE'
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : roleType === 'EMPLOYEE'
                                                            ? 'bg-purple-100 text-purple-800'
                                                            : roleType === 'TRAINER' || roleType === 'SENIOR_TRAINER' || roleType === 'EXTERNAL_TRAINER'
                                                                ? 'bg-green-100 text-green-800'
                                                                : roleType === 'MEDICO' || roleType === 'MEDICO_COMPETENTE'
                                                                    ? 'bg-teal-100 text-teal-800'
                                                                    : 'bg-gray-100 text-gray-700'
                                                        }`}
                                                >
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

                {/* Pagination */}
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
                            <p className="text-sm text-gray-500 mt-1">
                                Inserisci il CF per verificare se esiste già in anagrafica
                            </p>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Codice Fiscale con ricerca */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Codice Fiscale
                                </label>
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

                                {/* Risultato ricerca CF */}
                                {cfSearchResult && (
                                    <div className={`mt-2 p-3 rounded-lg ${cfSearchResult.found
                                        ? 'bg-green-50 border border-green-200'
                                        : 'bg-gray-50 border border-gray-200'
                                        }`}>
                                        {cfSearchResult.found ? (
                                            <div className="flex items-start gap-2">
                                                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                                <div>
                                                    <p className="font-medium text-green-800">
                                                        Persona trovata: {cfSearchResult.person?.firstName} {cfSearchResult.person?.lastName}
                                                    </p>
                                                    {cfSearchResult.isFromOtherTenant && (
                                                        <p className="text-sm text-green-600 flex items-center gap-1">
                                                            <Link2 className="w-4 h-4" />
                                                            Presente in anagrafica formazione - verrà collegato automaticamente
                                                        </p>
                                                    )}
                                                    {cfSearchResult.isPazienteInTenant && (
                                                        <p className="text-sm text-blue-600">
                                                            Già registrato come paziente in questa clinica
                                                        </p>
                                                    )}
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        Ruoli: {cfSearchResult.person?.roles?.join(', ') || 'Nessuno'}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-gray-600">
                                                Nessuna corrispondenza - verrà creato un nuovo paziente
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Dati anagrafici */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nome <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newPaziente.firstName}
                                        onChange={(e) => setNewPaziente(p => ({ ...p, firstName: e.target.value }))}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Cognome <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newPaziente.lastName}
                                        onChange={(e) => setNewPaziente(p => ({ ...p, lastName: e.target.value }))}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={newPaziente.email}
                                        onChange={(e) => setNewPaziente(p => ({ ...p, email: e.target.value }))}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                                    <input
                                        type="tel"
                                        value={newPaziente.phone}
                                        onChange={(e) => setNewPaziente(p => ({ ...p, phone: e.target.value }))}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
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
                                <select
                                    value={newPaziente.etnia}
                                    onChange={(e) => setNewPaziente(p => ({ ...p, etnia: e.target.value }))}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                                >
                                    {ETHNICITY_OPTIONS.map(option => (
                                        <option key={option.value || 'empty'} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo</label>
                                <input
                                    type="text"
                                    value={newPaziente.residenceAddress}
                                    onChange={(e) => setNewPaziente(p => ({ ...p, residenceAddress: e.target.value }))}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Città</label>
                                    <input
                                        type="text"
                                        value={newPaziente.residenceCity}
                                        onChange={(e) => setNewPaziente(p => ({ ...p, residenceCity: e.target.value }))}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">CAP</label>
                                    <input
                                        type="text"
                                        value={newPaziente.postalCode}
                                        onChange={(e) => setNewPaziente(p => ({ ...p, postalCode: e.target.value }))}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        maxLength={5}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
                                    <input
                                        type="text"
                                        value={newPaziente.province}
                                        onChange={(e) => setNewPaziente(p => ({ ...p, province: e.target.value.toUpperCase() }))}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        maxLength={2}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowNewModal(false);
                                    setCfSearchResult(null);
                                    setNewPaziente({
                                        firstName: '', lastName: '', taxCode: '', email: '',
                                        phone: '', birthDate: '', etnia: DEFAULT_ETHNICITY, residenceAddress: '',
                                        residenceCity: '', postalCode: '', province: ''
                                    });
                                }}
                                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !newPaziente.firstName || !newPaziente.lastName}
                                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                            >
                                {saving ? 'Salvataggio...' : cfSearchResult?.found && !cfSearchResult.isPazienteInTenant
                                    ? 'Collega Paziente'
                                    : 'Crea Paziente'
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PazientiPage;
