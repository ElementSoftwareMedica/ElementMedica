/**
 * Allegato3APage - Cartella Sanitaria e di Rischio
 * 
 * Pagina per visualizzare e generare la Cartella Sanitaria e di Rischio
 * del lavoratore secondo D.Lgs 81/08 Art. 41 c.5 (Allegato 3A).
 * 
 * Sezioni:
 * 1. Dati Anagrafici Lavoratore
 * 2. Dati Azienda
 * 3. Dati Lavorativi e Storico Mansioni
 * 4. Rischi Professionali
 * 5. Accertamenti Sanitari
 * 6. Giudizio di Idoneità Attuale
 * 7. Medico Competente
 * 
 * @module pages/clinica/mdl/Allegato3APage
 * @project P56 - Medicina del Lavoro Sistema Completo - FASE 5
 * @compliance D.Lgs 81/08 Art. 41 c.5
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    FileText,
    User,
    Building2,
    Briefcase,
    AlertTriangle,
    Stethoscope,
    CheckCircle2,
    UserCheck,
    Download,
    Search,
    ChevronRight,
    Calendar,
    Phone,
    Mail,
    MapPin,
    Shield,
    Clock,
    Printer,
    RefreshCw,
    AlertCircle,
    Filter,
    Users,
    Archive
} from 'lucide-react';
import {
    clinicaApi,
    type Allegato3AData,
    type Allegato3AStats
} from '../../../services/clinicaApi';
import { apiGet, apiDownloadWithFilename } from '../../../services/api';
import { useToast } from '../../../hooks/useToast';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import Modal from '../../../design-system/molecules/Modal/Modal';
import { formatMedicoName } from '../../../utils/textFormatters';

// Import Element Medica theme
import '../../../styles/clinica-theme.css';

// =====================================================
// COMPONENTE PRINCIPALE
// =====================================================

const Allegato3APage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { showToast } = useToast();

    // Tenant filter from global context
    const { isReady, tenantFilterKey, getTenantFilterParams } = useTenantFilter();

    // State
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>(searchParams.get('companyId') || '');
    const [selectedWorkerId, setSelectedWorkerId] = useState<string>(searchParams.get('workerId') || '');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const [isDownloadingZip, setIsDownloadingZip] = useState(false);

    // ---------------------------------------------------------------------------
    // Download handlers
    // ---------------------------------------------------------------------------

    /** Scarica PDF per il lavoratore corrente in vista dettaglio */
    const handleDownloadPdf = useCallback(async () => {
        if (!selectedWorkerId || !selectedCompanyId) return;
        setIsDownloadingPdf(true);
        try {
            const { blob, filename } = await apiDownloadWithFilename(
                `/api/v1/clinica/allegato-3a/${selectedWorkerId}/${selectedCompanyId}/pdf`
            );
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || `allegato3a_${selectedWorkerId}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showToast({ type: 'success', message: 'PDF scaricato con successo' });
        } catch {
            showToast({ type: 'error', message: 'Errore durante la generazione del PDF' });
        } finally {
            setIsDownloadingPdf(false);
        }
    }, [selectedWorkerId, selectedCompanyId, showToast]);

    /** Scarica ZIP con tutti i PDF dei lavoratori dell'azienda */
    const handleDownloadZip = useCallback(async () => {
        if (!selectedCompanyId) return;
        setIsDownloadingZip(true);
        try {
            const { blob, filename } = await apiDownloadWithFilename(
                `/api/v1/clinica/allegato-3a/bulk/${selectedCompanyId}/zip`
            );
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || `allegati3a_${selectedCompanyId}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showToast({ type: 'success', message: 'Archivio ZIP scaricato con successo' });
        } catch {
            showToast({ type: 'error', message: 'Errore durante la generazione dello ZIP' });
        } finally {
            setIsDownloadingZip(false);
        }
    }, [selectedCompanyId, showToast]);

    // Fetch companies for selection - using companies API (P49 pattern)
    const { data: companiesResponse } = useQuery({
        queryKey: ['companies-for-allegato3a', tenantFilterKey],
        queryFn: async () => {
            const tenantParams = getTenantFilterParams();
            const params = new URLSearchParams();
            params.append('limit', '100');
            if (tenantParams.tenantIds) {
                params.append('tenantIds', tenantParams.tenantIds.join(','));
            }
            if (tenantParams.allTenants) {
                params.append('allTenants', 'true');
            }
            const response = await apiGet<{ id: string; ragioneSociale: string; piva?: string }[]>(`/api/v1/companies?${params.toString()}`);
            return response;
        },
        enabled: isReady
    });

    // Fetch stats for selected company
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['allegato3a-stats', selectedCompanyId, tenantFilterKey],
        queryFn: () => clinicaApi.allegato3A.getStats(selectedCompanyId),
        enabled: isReady && !!selectedCompanyId
    });

    // Fetch bulk data for company (list of workers with their data)
    const { data: bulkData, isLoading: bulkLoading } = useQuery({
        queryKey: ['allegato3a-bulk', selectedCompanyId, tenantFilterKey],
        queryFn: () => clinicaApi.allegato3A.generateBulk(selectedCompanyId),
        enabled: isReady && !!selectedCompanyId && viewMode === 'list'
    });

    // Fetch single worker data
    const { data: workerData, isLoading: workerLoading } = useQuery({
        queryKey: ['allegato3a-worker', selectedWorkerId, selectedCompanyId, tenantFilterKey],
        queryFn: () => clinicaApi.allegato3A.generate(selectedWorkerId, selectedCompanyId),
        enabled: isReady && !!selectedWorkerId && !!selectedCompanyId && viewMode === 'detail'
    });

    // Filter workers by search
    const filteredWorkers = useMemo(() => {
        if (!bulkData?.workers) return [];
        if (!searchTerm) return bulkData.workers;

        const search = searchTerm.toLowerCase();
        return bulkData.workers.filter(w =>
            w.lavoratore?.firstName?.toLowerCase().includes(search) ||
            w.lavoratore?.lastName?.toLowerCase().includes(search) ||
            w.lavoratore?.taxCode?.toLowerCase().includes(search) ||
            w.datiLavorativi?.mansioneAttuale?.toLowerCase().includes(search)
        );
    }, [bulkData?.workers, searchTerm]);

    // Handle view worker detail
    const handleViewWorker = useCallback((personId: string) => {
        setSelectedWorkerId(personId);
        setViewMode('detail');
    }, []);

    // Handle back to list
    const handleBackToList = useCallback(() => {
        setSelectedWorkerId('');
        setViewMode('list');
    }, []);

    // Format date
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'N/D';
        return new Date(dateStr).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    // =====================================================
    // RENDER: Company Selection
    // =====================================================

    const renderCompanySelection = () => (
        <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleziona Azienda
            </label>
            <select
                value={selectedCompanyId}
                onChange={(e) => {
                    setSelectedCompanyId(e.target.value);
                    setSelectedWorkerId('');
                    setViewMode('list');
                }}
                className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
                <option value="">-- Seleziona un'azienda --</option>
                {companiesResponse?.map((company: { id: string; ragioneSociale: string; piva?: string }) => (
                    <option key={company.id} value={company.id}>
                        {company.ragioneSociale}{company.piva ? ` (${company.piva})` : ''}
                    </option>
                ))}
            </select>
        </div>
    );

    // =====================================================
    // RENDER: Stats Cards
    // =====================================================

    const renderStats = () => {
        if (!stats) return null;

        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="h-5 w-5 text-teal-500" />
                        <span className="text-sm text-gray-600">Totale Lavoratori</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.totaleWorkers}</p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="text-sm text-green-700">Giudizio Valido</span>
                    </div>
                    <p className="text-2xl font-bold text-green-700">{stats.withActiveGiudizio}</p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        <span className="text-sm text-red-700">Giudizio Scaduto</span>
                    </div>
                    <p className="text-2xl font-bold text-red-700">{stats.withExpiredGiudizio}</p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-5 w-5 text-yellow-600" />
                        <span className="text-sm text-yellow-700">Visite Pending</span>
                    </div>
                    <p className="text-2xl font-bold text-yellow-700">{stats.pendingVisits}</p>
                </div>
            </div>
        );
    };

    // =====================================================
    // RENDER: Workers List
    // =====================================================

    const renderWorkersList = () => {
        if (bulkLoading) {
            return (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                    <span className="ml-3 text-gray-500">Caricamento lavoratori...</span>
                </div>
            );
        }

        if (filteredWorkers.length === 0) {
            return (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Nessun lavoratore trovato
                    </h3>
                    <p className="text-gray-500">
                        {searchTerm ? 'Prova a modificare la ricerca' : 'Seleziona un\'azienda per visualizzare i lavoratori'}
                    </p>
                </div>
            );
        }

        return (
            <div className="space-y-3">
                {filteredWorkers.map((worker) => (
                    <div
                        key={worker.lavoratore.id}
                        onClick={() => handleViewWorker(worker.lavoratore.id)}
                        className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-md hover:border-teal-300 transition-all"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                                        <User className="h-5 w-5 text-teal-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900">
                                            {worker.lavoratore.lastName} {worker.lavoratore.firstName}
                                        </h4>
                                        <p className="text-sm text-gray-500">
                                            CF: {worker.lavoratore.taxCode || 'N/D'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-4 text-sm">
                                    <span className="flex items-center gap-1 text-gray-600">
                                        <Briefcase className="h-4 w-4" />
                                        {worker.datiLavorativi?.mansioneAttuale || 'N/D'}
                                    </span>
                                    {worker.giudizioAttuale && (
                                        <span className={`
                                            flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                                            ${worker.giudizioAttuale.esito === 'IDONEO'
                                                ? 'bg-green-100 text-green-700'
                                                : worker.giudizioAttuale.esito === 'NON_IDONEO'
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-yellow-100 text-yellow-700'
                                            }
                                        `}>
                                            <CheckCircle2 className="h-3 w-3" />
                                            {worker.giudizioAttuale.esito}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // =====================================================
    // RENDER: Worker Detail (Allegato 3A)
    // =====================================================

    const renderWorkerDetail = () => {
        if (workerLoading) {
            return (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                    <span className="ml-3 text-gray-500">Caricamento cartella sanitaria...</span>
                </div>
            );
        }

        if (!workerData) {
            return (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                    <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Dati non disponibili
                    </h3>
                    <button
                        onClick={handleBackToList}
                        className="text-teal-600 hover:text-teal-800"
                    >
                        Torna alla lista
                    </button>
                </div>
            );
        }

        const { lavoratore, azienda, datiLavorativi, rischiProfessionali, accertamentiSanitari, giudizioAttuale, medicoCompetente } = workerData;

        return (
            <div className="space-y-6">
                {/* Header with actions */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={handleBackToList}
                        className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
                    >
                        ← Torna alla lista
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => window.print()}
                            className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                        >
                            <Printer className="h-4 w-4" />
                            Stampa
                        </button>
                        <button
                            onClick={handleDownloadPdf}
                            disabled={isDownloadingPdf}
                            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isDownloadingPdf
                                ? <RefreshCw className="h-4 w-4 animate-spin" />
                                : <Download className="h-4 w-4" />}
                            {isDownloadingPdf ? 'Generazione...' : 'Scarica PDF'}
                        </button>
                    </div>
                </div>

                {/* Section 1: Dati Anagrafici Lavoratore */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <User className="h-5 w-5 text-teal-600" />
                        1. Dati Anagrafici Lavoratore
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 uppercase">Cognome</label>
                            <p className="font-medium">{lavoratore.lastName || 'N/D'}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase">Nome</label>
                            <p className="font-medium">{lavoratore.firstName || 'N/D'}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase">Codice Fiscale</label>
                            <p className="font-medium font-mono">{lavoratore.taxCode || 'N/D'}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase">Data di Nascita</label>
                            <p className="font-medium">{formatDate(lavoratore.birthDate)}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase">Luogo di Nascita</label>
                            <p className="font-medium">{lavoratore.birthPlace || 'N/D'}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase">Sesso</label>
                            <p className="font-medium">{lavoratore.gender === 'MALE' ? 'M' : lavoratore.gender === 'FEMALE' ? 'F' : 'N/D'}</p>
                        </div>
                        {lavoratore.residenza && (
                            <>
                                <div className="md:col-span-2">
                                    <label className="text-xs text-gray-500 uppercase">Residenza</label>
                                    <p className="font-medium flex items-center gap-1">
                                        <MapPin className="h-4 w-4 text-gray-400" />
                                        {lavoratore.residenza.indirizzo}, {lavoratore.residenza.cap} {lavoratore.residenza.citta} ({lavoratore.residenza.provincia})
                                    </p>
                                </div>
                            </>
                        )}
                        {lavoratore.contatti?.email && (
                            <div>
                                <label className="text-xs text-gray-500 uppercase">Email</label>
                                <p className="font-medium flex items-center gap-1">
                                    <Mail className="h-4 w-4 text-gray-400" />
                                    {lavoratore.contatti.email}
                                </p>
                            </div>
                        )}
                        {lavoratore.contatti?.phone && (
                            <div>
                                <label className="text-xs text-gray-500 uppercase">Telefono</label>
                                <p className="font-medium flex items-center gap-1">
                                    <Phone className="h-4 w-4 text-gray-400" />
                                    {lavoratore.contatti.phone}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Section 2: Dati Azienda */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-teal-600" />
                        2. Dati Azienda
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                            <label className="text-xs text-gray-500 uppercase">Ragione Sociale</label>
                            <p className="font-medium">{azienda.ragioneSociale || 'N/D'}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase">P.IVA</label>
                            <p className="font-medium font-mono">{azienda.piva || 'N/D'}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase">Codice Fiscale</label>
                            <p className="font-medium font-mono">{azienda.codiceFiscale || 'N/D'}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase">Codice ATECO</label>
                            <p className="font-medium">{azienda.codiceAteco || 'N/D'}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase">Settore</label>
                            <p className="font-medium">{azienda.settore || 'N/D'}</p>
                        </div>
                        {azienda.sedeLegale && (
                            <div className="md:col-span-3">
                                <label className="text-xs text-gray-500 uppercase">Sede Legale</label>
                                <p className="font-medium flex items-center gap-1">
                                    <MapPin className="h-4 w-4 text-gray-400" />
                                    {azienda.sedeLegale.indirizzo}, {azienda.sedeLegale.cap} {azienda.sedeLegale.citta} ({azienda.sedeLegale.provincia})
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Section 3: Dati Lavorativi */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-teal-600" />
                        3. Dati Lavorativi
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="text-xs text-gray-500 uppercase">Data Assunzione</label>
                            <p className="font-medium">{formatDate(datiLavorativi.dataAssunzione)}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase">Mansione Attuale</label>
                            <p className="font-medium">{datiLavorativi.mansioneAttuale || 'N/D'}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase">Codice Mansione</label>
                            <p className="font-medium font-mono">{datiLavorativi.mansioneCodice || 'N/D'}</p>
                        </div>
                        {datiLavorativi.reparto && (
                            <div>
                                <label className="text-xs text-gray-500 uppercase">Reparto</label>
                                <p className="font-medium">{datiLavorativi.reparto}</p>
                            </div>
                        )}
                        {datiLavorativi.turno && (
                            <div>
                                <label className="text-xs text-gray-500 uppercase">Turno</label>
                                <p className="font-medium">{datiLavorativi.turno}</p>
                            </div>
                        )}
                    </div>

                    {/* Storico Mansioni */}
                    {datiLavorativi.storicoMansioni && datiLavorativi.storicoMansioni.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Storico Mansioni</h4>
                            <div className="space-y-2">
                                {datiLavorativi.storicoMansioni.map((m, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                                        <span>{m.mansioneNome} ({m.mansioneCodice})</span>
                                        <span className="text-gray-500">
                                            {formatDate(m.dataInizio)} - {m.dataFine ? formatDate(m.dataFine) : 'Attuale'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Section 4: Rischi Professionali */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-teal-600" />
                        4. Rischi Professionali
                    </h3>
                    {rischiProfessionali && rischiProfessionali.length > 0 ? (
                        <div className="space-y-3">
                            {rischiProfessionali.map((rischio, idx) => (
                                <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium">{rischio.tipo}</span>
                                        <span className={`
                                            px-2 py-0.5 rounded-full text-xs font-medium
                                            ${rischio.livello === 'MOLTO_ALTO' ? 'bg-red-100 text-red-700' :
                                                rischio.livello === 'ALTO' ? 'bg-orange-100 text-orange-700' :
                                                    rischio.livello === 'MEDIO' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-green-100 text-green-700'}
                                        `}>
                                            {rischio.livello}
                                        </span>
                                    </div>
                                    {rischio.descrizione && (
                                        <p className="text-sm text-gray-600 mb-2">{rischio.descrizione}</p>
                                    )}
                                    {rischio.dpiRichiesti && rischio.dpiRichiesti.length > 0 && (
                                        <div className="text-sm">
                                            <span className="text-gray-500">DPI: </span>
                                            <span>{rischio.dpiRichiesti.join(', ')}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-4">Nessun rischio registrato</p>
                    )}
                </div>

                {/* Section 5: Accertamenti Sanitari */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Stethoscope className="h-5 w-5 text-teal-600" />
                        5. Accertamenti Sanitari
                    </h3>
                    {accertamentiSanitari && accertamentiSanitari.length > 0 ? (
                        <div className="space-y-3">
                            {accertamentiSanitari.map((acc) => (
                                <div key={acc.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium">{acc.tipo}</span>
                                        <span className="text-sm text-gray-500 flex items-center gap-1">
                                            <Calendar className="h-4 w-4" />
                                            {formatDate(acc.data)}
                                        </span>
                                    </div>
                                    {acc.esito && (
                                        <p className="text-sm mb-1">
                                            <span className="text-gray-500">Esito: </span>
                                            <span className="font-medium">{acc.esito}</span>
                                        </p>
                                    )}
                                    {acc.medicoEsecutore && (
                                        <p className="text-sm text-gray-500">
                                            Eseguito da: {acc.medicoEsecutore}
                                        </p>
                                    )}
                                    {acc.prestazioniEseguite && acc.prestazioniEseguite.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-gray-200">
                                            <span className="text-xs text-gray-500 uppercase">Prestazioni:</span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {acc.prestazioniEseguite.map((p) => (
                                                    <span key={p.id} className="px-2 py-0.5 bg-white rounded text-xs">
                                                        {p.nome}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-4">Nessun accertamento registrato</p>
                    )}
                </div>

                {/* Section 6: Giudizio di Idoneità */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-teal-600" />
                        6. Giudizio di Idoneità Attuale
                    </h3>
                    {giudizioAttuale ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 uppercase">Data</label>
                                <p className="font-medium">{formatDate(giudizioAttuale.data)}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase">Esito</label>
                                <p className={`
                                    inline-flex items-center gap-1 px-3 py-1 rounded-full font-medium
                                    ${giudizioAttuale.esito === 'IDONEO'
                                        ? 'bg-green-100 text-green-700'
                                        : giudizioAttuale.esito === 'NON_IDONEO'
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-yellow-100 text-yellow-700'
                                    }
                                `}>
                                    {giudizioAttuale.esito}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase">Tipo Visita</label>
                                <p className="font-medium">{giudizioAttuale.tipoVisita || 'N/D'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase">Valido Fino</label>
                                <p className="font-medium">{formatDate(giudizioAttuale.validoFino)}</p>
                            </div>
                            {giudizioAttuale.limitazioni && (
                                <div className="md:col-span-2">
                                    <label className="text-xs text-gray-500 uppercase">Limitazioni</label>
                                    <p className="font-medium text-yellow-700">{giudizioAttuale.limitazioni}</p>
                                </div>
                            )}
                            {giudizioAttuale.prescrizioniIdoneita && (
                                <div className="md:col-span-2">
                                    <label className="text-xs text-gray-500 uppercase">Prescrizioni</label>
                                    <p className="font-medium text-blue-700">{giudizioAttuale.prescrizioniIdoneita}</p>
                                </div>
                            )}
                            <div>
                                <label className="text-xs text-gray-500 uppercase">Prossima Visita</label>
                                <p className="font-medium">{formatDate(giudizioAttuale.prossimaVisita)}</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-4">Nessun giudizio registrato</p>
                    )}
                </div>

                {/* Section 7: Medico Competente */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-teal-600" />
                        7. Medico Competente
                    </h3>
                    {medicoCompetente ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 uppercase">Nome</label>
                                <p className="font-medium">{formatMedicoName(medicoCompetente)}</p>
                            </div>
                            {medicoCompetente.specializzazione && (
                                <div>
                                    <label className="text-xs text-gray-500 uppercase">Specializzazione</label>
                                    <p className="font-medium">{medicoCompetente.specializzazione}</p>
                                </div>
                            )}
                            {medicoCompetente.alboMedici && (
                                <div>
                                    <label className="text-xs text-gray-500 uppercase">Iscrizione Albo</label>
                                    <p className="font-medium">{medicoCompetente.alboMedici}</p>
                                </div>
                            )}
                            {medicoCompetente.email && (
                                <div>
                                    <label className="text-xs text-gray-500 uppercase">Email</label>
                                    <p className="font-medium flex items-center gap-1">
                                        <Mail className="h-4 w-4 text-gray-400" />
                                        {medicoCompetente.email}
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-4">Nessun medico competente assegnato</p>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center text-sm text-gray-500 py-4">
                    <p>Documento generato il {formatDate(workerData.generatedAt)} - D.Lgs 81/08 Art. 41 c.5</p>
                </div>
            </div>
        );
    };

    // =====================================================
    // MAIN RENDER
    // =====================================================

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="p-2 bg-teal-100 rounded-lg">
                        <FileText className="h-6 w-6 text-teal-600" />
                    </div>
                    Allegato 3A - Cartella Sanitaria
                </h1>
                <p className="text-gray-500 mt-1">
                    Cartella Sanitaria e di Rischio del Lavoratore - D.Lgs 81/08 Art. 41 c.5
                </p>
            </div>

            {/* Company Selection */}
            {renderCompanySelection()}

            {/* Content based on selection */}
            {selectedCompanyId && (
                <>
                    {/* Stats */}
                    {viewMode === 'list' && renderStats()}

                    {/* Search + actions (only in list mode) */}
                    {viewMode === 'list' && (
                        <div className="mb-4 flex items-center gap-3 flex-wrap">
                            <div className="relative flex-1 min-w-0 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Cerca per nome, cognome, CF, mansione..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                                />
                            </div>
                            <button
                                onClick={handleDownloadZip}
                                disabled={isDownloadingZip || !bulkData?.workers?.length}
                                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed flex-shrink-0"
                                title="Scarica un archivio ZIP con i PDF di tutti i lavoratori"
                            >
                                {isDownloadingZip
                                    ? <RefreshCw className="h-4 w-4 animate-spin" />
                                    : <Archive className="h-4 w-4" />}
                                {isDownloadingZip ? 'Generazione ZIP...' : 'Scarica tutto ZIP'}
                            </button>
                        </div>
                    )}

                    {/* List or Detail */}
                    {viewMode === 'list' ? renderWorkersList() : renderWorkerDetail()}
                </>
            )}

            {/* Empty state */}
            {!selectedCompanyId && (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                    <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 mb-2">
                        Seleziona un'azienda
                    </h3>
                    <p className="text-gray-500">
                        Seleziona un'azienda per visualizzare le cartelle sanitarie dei lavoratori
                    </p>
                </div>
            )}
        </div>
    );
};

export default Allegato3APage;
