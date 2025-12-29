/**
 * Pazienti Page
 * Lista e gestione pazienti con ricerca CF per integrazione Person esistenti
 * 
 * @module pages/poliambulatorio/clinica/PazientiPage
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users, Search, Plus, Edit, Eye, Phone, Mail,
    Calendar, FileText, AlertCircle, CheckCircle, Link2
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { useToast } from '../../../hooks/useToast';
import { apiGet, apiPost, apiPut } from '../../../services/api';

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
}

interface SearchResult {
    found: boolean;
    isPazienteInTenant: boolean;
    isFromOtherTenant: boolean;
    person?: SearchPerson;
}

const PazientiPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();

    // Tenant filter from global context
    const { getTenantFilterParams, tenantFilterKey } = useTenantFilter();

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

    // Modal per nuovo paziente
    const [showNewModal, setShowNewModal] = useState(false);
    const [newPaziente, setNewPaziente] = useState({
        firstName: '',
        lastName: '',
        taxCode: '',
        email: '',
        phone: '',
        birthDate: '',
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
            let url = `/api/v1/poliambulatorio/pazienti?page=${pagination.page}&pageSize=${pagination.pageSize}&search=${searchTerm}`;
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
            }>(url);

            if (response.success) {
                setPazienti(response.data);
                setPagination(response.pagination);
            }
        } catch (err) {
            setError('Errore nel caricamento pazienti');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.pageSize, searchTerm, getTenantFilterParams]);

    useEffect(() => {
        fetchPazienti();
    }, [fetchPazienti]);

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
                    }>(`/api/v1/poliambulatorio/pazienti/cerca-cf/${taxCode.toUpperCase()}`);

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
                    console.error('Error searching by CF:', err);
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
            }>('/api/v1/poliambulatorio/pazienti', newPaziente);

            if (response.success) {
                setShowNewModal(false);
                setNewPaziente({
                    firstName: '', lastName: '', taxCode: '', email: '',
                    phone: '', birthDate: '', residenceAddress: '',
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
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    // Formatta data
    const formatDate = (date: string | null) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('it-IT');
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="w-7 h-7 text-blue-600" />
                        Anagrafica Pazienti
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Gestione pazienti con integrazione anagrafica formazione
                    </p>
                </div>
                <button
                    onClick={() => setShowNewModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <Plus className="w-5 h-5" />
                    Nuovo Paziente
                </button>
            </div>

            {/* Search */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cerca per nome, cognome, codice fiscale, email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
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
                                <tr key={paziente.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                <span className="text-blue-600 font-medium">
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
                                            {paziente.personRoles.map((role, idx) => (
                                                <span
                                                    key={idx}
                                                    className={`px-2 py-0.5 rounded-full text-xs ${role.roleType === 'PAZIENTE'
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : role.roleType === 'EMPLOYEE'
                                                            ? 'bg-purple-100 text-purple-800'
                                                            : 'bg-gray-100 text-gray-800'
                                                        }`}
                                                >
                                                    {role.roleType}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => navigate(`/poliambulatorio/pazienti/${paziente.id}`)}
                                                className="p-2 text-gray-400 hover:text-blue-600"
                                                title="Visualizza cartella"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => navigate(`/poliambulatorio/pazienti/${paziente.id}#referti`)}
                                                className="p-2 text-gray-400 hover:text-green-600"
                                                title="Referti"
                                            >
                                                <FileText className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                            Mostrando {(pagination.page - 1) * pagination.pageSize + 1} - {Math.min(pagination.page * pagination.pageSize, pagination.total)} di {pagination.total}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                                disabled={pagination.page === 1}
                                className="px-3 py-1 border rounded disabled:opacity-50"
                            >
                                Precedente
                            </button>
                            <button
                                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                                disabled={pagination.page >= pagination.totalPages}
                                className="px-3 py-1 border rounded disabled:opacity-50"
                            >
                                Successivo
                            </button>
                        </div>
                    </div>
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
                                <input
                                    type="date"
                                    value={newPaziente.birthDate}
                                    onChange={(e) => setNewPaziente(p => ({ ...p, birthDate: e.target.value }))}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
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
                                        phone: '', birthDate: '', residenceAddress: '',
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
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
