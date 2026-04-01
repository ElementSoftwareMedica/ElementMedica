/**
 * QuickActionSopralluogoModal - Modal per programmare sopralluogo da CompanyDetails
 * 
 * Modal pre-compilato con l'azienda e le sue sedi per programmare
 * rapidamente un sopralluogo di medicina del lavoro.
 * 
 * Supporta:
 * - Sopralluogo Medico Competente (default: MC nominato)
 * - Sopralluogo RSPP (default: RSPP nominato)
 * - Upload PDF esito sopralluogo con drag & drop
 * 
 * @module components/companies/quick-actions/QuickActionSopralluogoModal
 * @project P58 - Company Details Enhancement
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { DatePickerElegante } from '@/components/ui/DatePickerElegante';
import {
    Loader2,
    ClipboardCheck,
    ClipboardList,
    Calendar,
    MapPin,
    User,
    Info,
    Upload,
    FileText,
    Stethoscope,
    Shield,
    Eye,
    ExternalLink,
    X,
    AlertTriangle
} from 'lucide-react';
import { useToast } from '../../../hooks/useToast';
import { useAuth } from '../../../context/AuthContext'; // P59: Per tenant dell'utente
import Modal from '../../../design-system/molecules/Modal/Modal';
import { apiGet, apiUpload } from '../../../services/api';
import { cn } from '../../../design-system/utils';
import { formatMedicoName } from '../../../utils/textFormatters';

interface QuickActionSopralluogoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    companyId: string;
    companyTenantProfileId?: string; // P48: CompanyTenantProfile.id per nomine queries
    companyName: string;
    tenantId?: string; // P59: TenantId per cross-tenant operations
    editingSopralluogoId?: string | null; // P59: ID del sopralluogo da modificare (edit mode)
}

interface SiteOption {
    id: string;
    siteName: string;
    citta?: string;
    indirizzo?: string;
    prossimoSopralluogo?: string;
    ultimoSopralluogo?: string;
    // Oggetti relazione con ID nested (struttura API response)
    medicoCompetente?: { id: string; firstName: string; lastName: string };
    rspp?: { id: string; firstName: string; lastName: string };
}

interface PersonOption {
    id: string;
    firstName: string;
    lastName: string;
    gender?: string;
    role?: string;
    roleType?: string; // P59: roleType per filtering
    specialties?: string[]; // P59: specialties per filtering MC
}

export const QuickActionSopralluogoModal: React.FC<QuickActionSopralluogoModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    companyId,
    companyTenantProfileId,
    companyName,
    tenantId, // P59: TenantId per cross-tenant operations
    editingSopralluogoId // P59: ID del sopralluogo da modificare (edit mode)
}) => {
    const { showToast } = useToast();
    const { user } = useAuth(); // P59: Per ottenere tenant dell'utente loggato
    const dropZoneRef = useRef<HTMLDivElement>(null);

    // P59 Fix: Track if form has been initialized for this modal opening
    // This prevents resetting esitoFile when existingSopralluogo updates
    const isInitializedRef = useRef(false);
    const previousIsOpenRef = useRef(false);

    // P59: Flag per determinare se siamo in edit mode
    const isEditMode = !!editingSopralluogoId;

    // Drag & drop state
    const [isDragging, setIsDragging] = useState(false);

    // P59: PDF Preview modal state
    const [showPdfPreview, setShowPdfPreview] = useState(false);

    // P59: Prepara headers per cross-tenant operations
    const operateTenantHeaders: Record<string, string> = tenantId ? { 'X-Operate-Tenant-Id': tenantId } : {};

    // P59: TenantId dell'utente loggato per filtrare gli operatori (MC/RSPP)
    const userTenantId = user?.tenantId;

    // P59: Opzioni per lo stato del sopralluogo
    const statoSopralluogoOptions = [
        { value: 'PROGRAMMATO', label: 'Programmato', color: 'bg-blue-100 text-blue-800' },
        { value: 'ESEGUITO', label: 'Eseguito', color: 'bg-green-100 text-green-800' },
        { value: 'CONFORME', label: 'A posto / Conforme', color: 'bg-emerald-100 text-emerald-800' },
        { value: 'CON_PRESCRIZIONI', label: 'Con prescrizioni', color: 'bg-amber-100 text-amber-800' },
        { value: 'NON_CONFORME', label: 'Non conforme', color: 'bg-red-100 text-red-800' }
    ];

    // Form state
    const [formData, setFormData] = useState({
        siteId: '',
        dataProgrammata: '',
        oraInizio: '09:00',
        oraFine: '12:00',
        eseguitoDaId: '',
        tipoSopralluogo: 'ORDINARIO' as 'ORDINARIO' | 'STRAORDINARIO' | 'VERIFICA',
        categoriaEsecutore: 'MC' as 'MC' | 'RSPP', // Medico Competente o RSPP
        statoSopralluogo: 'PROGRAMMATO' as 'PROGRAMMATO' | 'ESEGUITO' | 'CONFORME' | 'CON_PRESCRIZIONI' | 'NON_CONFORME',
        prescrizioniNote: '', // Note aggiuntive se ci sono prescrizioni
        esitoFile: null as File | null,
        note: ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // P59: Fetch dati sopralluogo esistente per edit mode
    const { data: existingSopralluogo, isLoading: isLoadingExisting } = useQuery({
        queryKey: ['sopralluogo-edit', editingSopralluogoId],
        queryFn: async () => {
            // apiGet signature: (url, params, options) - headers go in options
            const response = await apiGet<any>(`/api/v1/sopralluogo/${editingSopralluogoId}`, {}, { headers: operateTenantHeaders });
            return response;
        },
        enabled: isOpen && isEditMode && !!editingSopralluogoId,
        staleTime: 0 // Sempre fresh in edit mode
    });

    // Reset form quando si apre o quando cambiano i dati esistenti
    useEffect(() => {
        // P59 Fix: Detect when modal opens (transition from closed to open)
        const justOpened = isOpen && !previousIsOpenRef.current;
        previousIsOpenRef.current = isOpen;

        // Reset initialization flag when modal closes
        if (!isOpen) {
            isInitializedRef.current = false;
            return;
        }

        // Only initialize form data once when modal opens
        // Don't reset if already initialized (to preserve user-selected file)
        if (isInitializedRef.current && !justOpened) {
            return;
        }

        if (isEditMode && existingSopralluogo) {
            // Edit mode: popola con dati esistenti
            // P59: Map API fields to form fields
            // API: dataEsecuzione, esecutoreId, valutazione
            // Form: dataProgrammata, oraInizio, oraFine, eseguitoDaId, categoriaEsecutore, tipoSopralluogo

            // Estrai data e ora da dataEsecuzione (formato: "2024-01-15T09:00:00.000Z")
            const dataEsecuzione = existingSopralluogo.dataEsecuzione
                ? new Date(existingSopralluogo.dataEsecuzione)
                : null;
            const dataProgrammata = dataEsecuzione
                ? dataEsecuzione.toISOString().split('T')[0]
                : '';
            const oraInizio = dataEsecuzione
                ? dataEsecuzione.toTimeString().slice(0, 5)
                : '09:00';

            // Estrai categoriaEsecutore e tipoSopralluogo da valutazione (formato: "MC - ORDINARIO")
            let categoriaEsecutore: 'MC' | 'RSPP' = 'MC';
            let tipoSopralluogo: 'ORDINARIO' | 'STRAORDINARIO' | 'VERIFICA' = 'ORDINARIO';
            if (existingSopralluogo.valutazione) {
                const parts = existingSopralluogo.valutazione.split(' - ');
                if (parts.length >= 2) {
                    categoriaEsecutore = parts[0] === 'RSPP' ? 'RSPP' : 'MC';
                    tipoSopralluogo = ['ORDINARIO', 'STRAORDINARIO', 'VERIFICA'].includes(parts[1])
                        ? parts[1] as 'ORDINARIO' | 'STRAORDINARIO' | 'VERIFICA'
                        : 'ORDINARIO';
                }
            }

            // P59: Estrai stato e prescrizioni dal campo esito (formato: "STATO|prescrizioni note")
            let statoSopralluogo: 'PROGRAMMATO' | 'ESEGUITO' | 'CONFORME' | 'CON_PRESCRIZIONI' | 'NON_CONFORME' = 'PROGRAMMATO';
            let prescrizioniNote = '';
            if (existingSopralluogo.esito) {
                const esitoParts = existingSopralluogo.esito.split('|');
                const validStati = ['PROGRAMMATO', 'ESEGUITO', 'CONFORME', 'CON_PRESCRIZIONI', 'NON_CONFORME'];
                if (validStati.includes(esitoParts[0])) {
                    statoSopralluogo = esitoParts[0] as typeof statoSopralluogo;
                    prescrizioniNote = esitoParts[1] || '';
                } else {
                    // Compatibilità con vecchi dati: se esito non è un nostro stato, assumiamo ESEGUITO
                    statoSopralluogo = 'ESEGUITO';
                }
            }

            setFormData({
                siteId: existingSopralluogo.siteId || '',
                dataProgrammata,
                oraInizio,
                oraFine: '12:00', // Default, non salvato in API
                eseguitoDaId: existingSopralluogo.esecutoreId || '', // API usa esecutoreId, form usa eseguitoDaId
                tipoSopralluogo,
                categoriaEsecutore,
                statoSopralluogo,
                prescrizioniNote,
                esitoFile: null, // File non viene ri-scaricato, l'utente può caricare uno nuovo
                note: existingSopralluogo.note || ''
            });
            isInitializedRef.current = true;
        } else if (!isEditMode && justOpened) {
            // Create mode: valori di default (only on first open)
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);

            setFormData({
                siteId: '',
                dataProgrammata: nextWeek.toISOString().split('T')[0],
                oraInizio: '09:00',
                oraFine: '12:00',
                eseguitoDaId: '',
                tipoSopralluogo: 'ORDINARIO',
                categoriaEsecutore: 'MC',
                statoSopralluogo: 'PROGRAMMATO',
                prescrizioniNote: '',
                esitoFile: null,
                note: ''
            });
            isInitializedRef.current = true;
        }
        setErrors({});
        setIsDragging(false);
    }, [isOpen, isEditMode, existingSopralluogo]);

    // Fetch sedi dell'azienda
    const { data: sitesData, isLoading: isLoadingSites } = useQuery({
        queryKey: ['company-sites-sopralluogo', companyId],
        queryFn: async () => {
            const response = await apiGet<{ sites: SiteOption[] }>(`/api/v1/company-sites/company/${companyId}`);
            return response.sites || [];
        },
        staleTime: 60 * 1000,
        enabled: isOpen && !!companyId
    });

    // P48: Use companyTenantProfileId (not companyId) for nomine queries
    const nomineProfileId = companyTenantProfileId || companyId;

    // P59: Fetch RSPP nominato per l'azienda (per auto-selezione)
    const { data: nominaRsppData } = useQuery({
        queryKey: ['nomina-rspp-azienda-sopralluogo', nomineProfileId, tenantId],
        queryFn: async () => {
            const response = await apiGet<{ data: Array<{ id: string; personId: string; person?: { id: string; firstName: string; lastName: string; gender?: string } }> }>(
                '/api/v1/clinica/nomine-ruolo',
                {
                    companyTenantProfileId: nomineProfileId,
                    tipoRuolo: 'RSPP',
                    stato: 'ATTIVA',
                    limit: 1
                },
                { headers: operateTenantHeaders }
            );
            return response.data?.[0] || null;
        },
        staleTime: 60 * 1000,
        enabled: isOpen && !!nomineProfileId
    });

    // P59: Fetch MC nominato per l'azienda (per auto-selezione)
    const { data: nominaMcData } = useQuery({
        queryKey: ['nomina-mc-azienda-sopralluogo', nomineProfileId, tenantId],
        queryFn: async () => {
            const response = await apiGet<{ data: Array<{ id: string; personId: string; person?: { id: string; firstName: string; lastName: string; gender?: string } }> }>(
                '/api/v1/clinica/nomine-ruolo',
                {
                    companyTenantProfileId: nomineProfileId,
                    tipoRuolo: 'MEDICO_COMPETENTE',
                    stato: 'ATTIVA',
                    limit: 1
                },
                { headers: operateTenantHeaders }
            );
            return response.data?.[0] || null;
        },
        staleTime: 60 * 1000,
        enabled: isOpen && !!nomineProfileId
    });

    const nominaRspp = nominaRsppData;
    const nominaMc = nominaMcData;

    // Fetch medici/tecnici per sopralluogo
    // P59: Filtra per tenant dell'utente loggato - gli operatori (MC/RSPP) devono essere del tenant dell'utente
    const { data: operatorsData } = useQuery({
        queryKey: ['sopralluogo-operators', userTenantId],
        queryFn: async () => {
            interface ApiPerson {
                id: string;
                firstName: string;
                lastName: string;
                gender?: string;
                title?: string;
                specialties?: string[];
                personRoles?: { roleType: string; isActive: boolean }[];
            }
            const response = await apiGet<{ data: ApiPerson[] }>('/api/v1/persons', {
                roleType: 'MEDICO_COMPETENTE,RSPP,CONSULENTE_SICUREZZA,TECNICO_SICUREZZA',
                tenantId: userTenantId, // P59: Filtra per tenant utente
                limit: 100
            });
            // P59: Trasforma la response per estrarre roleType e specialties
            return (response.data || []).map(p => ({
                id: p.id,
                firstName: p.firstName,
                lastName: p.lastName,
                gender: p.gender,
                role: p.title,
                // Estrai roleType dal primo personRole attivo
                roleType: p.personRoles?.find(pr => pr.isActive)?.roleType,
                specialties: p.specialties || []
            })) as PersonOption[];
        },
        staleTime: 5 * 60 * 1000,
        enabled: isOpen && !!userTenantId
    });

    const sites = sitesData || [];
    const allOperators = operatorsData || [];
    const selectedSite = sites.find(s => s.id === formData.siteId);

    // P59: Filtra operatori in base a categoriaEsecutore
    // MC (Medico Competente) filtra per specialty "Medico del Lavoro" o roleType MEDICO_COMPETENTE
    // RSPP filtra per roleType RSPP, CONSULENTE_SICUREZZA, TECNICO_SICUREZZA O per specialty
    // P48 Fix: Always include the nominated person even if roleType/specialties don't match
    const nominatedPersonId = formData.categoriaEsecutore === 'MC'
        ? nominaMc?.personId
        : nominaRspp?.personId;

    const operators = allOperators.filter(op => {
        // Always include the person nominated for this company
        if (nominatedPersonId && op.id === nominatedPersonId) return true;

        if (formData.categoriaEsecutore === 'MC') {
            // Per MC: cerca specialty "Medico del Lavoro" o roleType MEDICO_COMPETENTE
            const hasMdlSpecialty = op.specialties?.some(s =>
                s.toLowerCase().includes('medico del lavoro') ||
                s.toLowerCase().includes('medicina del lavoro')
            );
            const isMC = op.roleType === 'MEDICO_COMPETENTE' || op.roleType === 'MEDICO';
            return hasMdlSpecialty || isMC;
        } else {
            // Per RSPP: cerca roleType RSPP, CONSULENTE_SICUREZZA, TECNICO_SICUREZZA
            const hasRsppRole = ['RSPP', 'CONSULENTE_SICUREZZA', 'TECNICO_SICUREZZA'].includes(op.roleType || '');
            // P59 Fix: Cerca anche nelle specialties
            const hasRsppSpecialty = op.specialties?.some(s =>
                s.toUpperCase().includes('RSPP') ||
                s.toUpperCase().includes('SICUREZZA') ||
                s.toLowerCase().includes('responsabile servizio prevenzione') ||
                s.toLowerCase().includes('tecnico sicurezza') ||
                s.toLowerCase().includes('consulente sicurezza')
            );
            return hasRsppRole || hasRsppSpecialty;
        }
    });

    // Auto-seleziona prima sede se una sola
    useEffect(() => {
        if (sites.length === 1 && !formData.siteId) {
            setFormData(prev => ({ ...prev, siteId: sites[0].id }));
        }
    }, [sites, formData.siteId]);

    // P59: Auto-seleziona esecutore in base a nominato (MC o RSPP) dell'azienda
    // Priorità: nomina azienda > sede > nessuno
    useEffect(() => {
        if (formData.categoriaEsecutore && !formData.eseguitoDaId && !isEditMode) {
            // Prima prova con la nomina dell'azienda
            let defaultId = formData.categoriaEsecutore === 'MC'
                ? nominaMc?.personId
                : nominaRspp?.personId;

            // Se non c'è nomina azienda, prova con la sede
            if (!defaultId && selectedSite) {
                defaultId = formData.categoriaEsecutore === 'MC'
                    ? selectedSite.medicoCompetente?.id
                    : selectedSite.rspp?.id;
            }

            if (defaultId) {
                setFormData(prev => ({ ...prev, eseguitoDaId: defaultId || '' }));
            }
        }
    }, [formData.categoriaEsecutore, formData.eseguitoDaId, nominaMc, nominaRspp, selectedSite, isEditMode]);

    // Quando cambia la categoria esecutore, resetta e imposta il default dalla nomina
    const handleCategoriaChange = (categoria: 'MC' | 'RSPP') => {
        // Priorità: nomina azienda > sede > nessuno
        let defaultId = categoria === 'MC'
            ? (nominaMc?.personId || selectedSite?.medicoCompetente?.id)
            : (nominaRspp?.personId || selectedSite?.rspp?.id);

        setFormData(prev => ({
            ...prev,
            categoriaEsecutore: categoria,
            eseguitoDaId: defaultId || ''
        }));
    };

    // P59: Mutation per creare/aggiornare sopralluogo - usa POST o PUT a seconda della modalità
    const createMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            // Usa FormData per supportare upload file PDF
            const uploadFormData = new FormData();
            uploadFormData.append('siteId', data.siteId);
            uploadFormData.append('dataEsecuzione', `${data.dataProgrammata}T${data.oraInizio}:00`);
            if (data.eseguitoDaId) {
                uploadFormData.append('esecutoreId', data.eseguitoDaId);
            }
            if (data.note) {
                uploadFormData.append('note', data.note);
            }
            // Tipo sopralluogo come valutazione
            uploadFormData.append('valutazione', `${data.categoriaEsecutore} - ${data.tipoSopralluogo}`);

            // P59: Stato sopralluogo - formato: "STATO|prescrizioni note" per supportare prescrizioni
            const esitoValue = data.statoSopralluogo === 'CON_PRESCRIZIONI' && data.prescrizioniNote
                ? `${data.statoSopralluogo}|${data.prescrizioniNote}`
                : data.statoSopralluogo;
            uploadFormData.append('esito', esitoValue);

            // Allega il file PDF se presente
            if (data.esitoFile) {
                uploadFormData.append('documento', data.esitoFile);
            }

            // P59: Usa PUT se siamo in edit mode, altrimenti POST
            const url = isEditMode
                ? `/api/v1/sopralluogo/${editingSopralluogoId}`
                : '/api/v1/sopralluogo';

            // P59: Passa headers per cross-tenant operations
            return apiUpload(url, uploadFormData, {
                headers: operateTenantHeaders,
                method: isEditMode ? 'PUT' : 'POST'
            });
        },
        onSuccess: () => {
            showToast({
                type: 'success',
                message: isEditMode
                    ? 'Sopralluogo aggiornato con successo'
                    : 'Sopralluogo programmato con successo'
            });
            onSuccess();
            onClose();
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante la programmazione' });
        }
    });

    // File processing helper
    const processFile = useCallback((file: File) => {
        if (file.type !== 'application/pdf') {
            showToast({ type: 'error', message: 'Il file deve essere in formato PDF' });
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            showToast({ type: 'error', message: 'Il file non può superare i 10MB' });
            return;
        }
        setFormData(prev => ({ ...prev, esitoFile: file }));
    }, [showToast]);

    // Drag & drop handlers
    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
            setIsDragging(false);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            processFile(files[0]);
        }
    }, [processFile]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const validateForm = useCallback(() => {
        const newErrors: Record<string, string> = {};

        if (!formData.siteId) {
            newErrors.siteId = 'Seleziona una sede';
        }
        if (!formData.dataProgrammata) {
            newErrors.dataProgrammata = 'Data obbligatoria';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            createMutation.mutate(formData);
        }
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    // P59: Determina se il form sta ancora caricando i dati
    const isLoadingData = isEditMode && isLoadingExisting;

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={isEditMode ? 'Modifica Sopralluogo' : 'Programma Sopralluogo'}
                size="lg"
            >
                {isLoadingData ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                        <span className="ml-3 text-gray-500">Caricamento dati...</span>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col max-h-[calc(80vh-120px)]">
                        {/* P59: Contenuto scrollabile */}
                        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                            {/* Info azienda */}
                            <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700">
                                <div className="flex items-center">
                                    <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-300">
                                        <ClipboardCheck className="h-5 w-5" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">
                                            {companyName}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Sopralluogo di Medicina del Lavoro - Art. 25 D.Lgs 81/08
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Selezione sede */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    <MapPin className="inline h-4 w-4 mr-1" />
                                    Sede *
                                </label>
                                {isLoadingSites ? (
                                    <div className="flex items-center justify-center py-4">
                                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                                    </div>
                                ) : sites.length === 0 ? (
                                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                            Nessuna sede registrata. Aggiungi prima una sede per programmare il sopralluogo.
                                        </p>
                                    </div>
                                ) : (
                                    <select
                                        value={formData.siteId}
                                        onChange={(e) => handleChange('siteId', e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.siteId ? 'border-red-300' : 'border-gray-300'
                                            }`}
                                    >
                                        <option value="">Seleziona sede...</option>
                                        {sites.map((site) => (
                                            <option key={site.id} value={site.id}>
                                                {site.siteName} - {site.citta || site.indirizzo || 'Indirizzo non specificato'}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                {errors.siteId && (
                                    <p className="mt-1 text-xs text-red-600">{errors.siteId}</p>
                                )}
                                {selectedSite?.ultimoSopralluogo && (
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        Ultimo sopralluogo: {new Date(selectedSite.ultimoSopralluogo).toLocaleDateString('it-IT')}
                                    </p>
                                )}
                            </div>

                            {/* Categoria Sopralluogo (MC o RSPP) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Eseguito da
                                </label>
                                <div className="flex gap-3">
                                    <label
                                        className={cn(
                                            "flex-1 flex items-center justify-center px-4 py-3 rounded-lg border cursor-pointer transition-colors",
                                            formData.categoriaEsecutore === 'MC'
                                                ? 'bg-teal-50 dark:bg-teal-900/30 border-teal-300 dark:border-teal-600 text-teal-700 dark:text-teal-300'
                                                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                                        )}
                                    >
                                        <input
                                            type="radio"
                                            name="categoriaEsecutore"
                                            value="MC"
                                            checked={formData.categoriaEsecutore === 'MC'}
                                            onChange={() => handleCategoriaChange('MC')}
                                            className="sr-only"
                                        />
                                        <Stethoscope className="h-4 w-4 mr-2" />
                                        <span className="text-sm font-medium">Medico Competente</span>
                                    </label>
                                    <label
                                        className={cn(
                                            "flex-1 flex items-center justify-center px-4 py-3 rounded-lg border cursor-pointer transition-colors",
                                            formData.categoriaEsecutore === 'RSPP'
                                                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                                                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                                        )}
                                    >
                                        <input
                                            type="radio"
                                            name="categoriaEsecutore"
                                            value="RSPP"
                                            checked={formData.categoriaEsecutore === 'RSPP'}
                                            onChange={() => handleCategoriaChange('RSPP')}
                                            className="sr-only"
                                        />
                                        <Shield className="h-4 w-4 mr-2" />
                                        <span className="text-sm font-medium">RSPP</span>
                                    </label>
                                </div>
                            </div>

                            {/* Tipo sopralluogo */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tipo Sopralluogo
                                </label>
                                <div className="flex gap-3">
                                    {(['ORDINARIO', 'STRAORDINARIO', 'VERIFICA'] as const).map((tipo) => (
                                        <label
                                            key={tipo}
                                            className={cn(
                                                "flex-1 flex items-center justify-center px-4 py-2 rounded-lg border cursor-pointer transition-colors",
                                                formData.tipoSopralluogo === tipo
                                                    ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300'
                                                    : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                                            )}
                                        >
                                            <input
                                                type="radio"
                                                name="tipoSopralluogo"
                                                value={tipo}
                                                checked={formData.tipoSopralluogo === tipo}
                                                onChange={(e) => handleChange('tipoSopralluogo', e.target.value)}
                                                className="sr-only"
                                            />
                                            <span className="text-sm font-medium capitalize">
                                                {tipo.toLowerCase()}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* P59: Stato Sopralluogo */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    <ClipboardList className="inline h-4 w-4 mr-1" />
                                    Stato Sopralluogo
                                </label>
                                <select
                                    value={formData.statoSopralluogo}
                                    onChange={(e) => handleChange('statoSopralluogo', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                                >
                                    {statoSopralluogoOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* P59: Campo prescrizioni visibile solo se stato è CON_PRESCRIZIONI */}
                            {formData.statoSopralluogo === 'CON_PRESCRIZIONI' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        <AlertTriangle className="inline h-4 w-4 mr-1 text-amber-500" />
                                        Dettaglio Prescrizioni
                                    </label>
                                    <textarea
                                        value={formData.prescrizioniNote}
                                        onChange={(e) => handleChange('prescrizioniNote', e.target.value)}
                                        placeholder="Descrivi le prescrizioni rilevate durante il sopralluogo..."
                                        rows={3}
                                        className="w-full px-3 py-2 border border-amber-300 dark:border-amber-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-amber-50 dark:bg-amber-900/30 dark:text-gray-100 dark:placeholder-gray-400"
                                    />
                                </div>
                            )}

                            {/* Data e ora */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        <Calendar className="inline h-4 w-4 mr-1" />
                                        Data *
                                    </label>
                                    <DatePickerElegante
                                        value={formData.dataProgrammata ? new Date(formData.dataProgrammata) : null}
                                        onChange={(date) => {
                                            if (date) {
                                                handleChange('dataProgrammata', date.toISOString().split('T')[0]);
                                            }
                                        }}
                                        placeholder="Seleziona data"
                                        minDate={formData.statoSopralluogo === 'PROGRAMMATO' ? new Date() : undefined}
                                        theme="blue"
                                    />
                                    {errors.dataProgrammata && (
                                        <p className="mt-1 text-xs text-red-600">{errors.dataProgrammata}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Ora Inizio
                                    </label>
                                    <input
                                        type="time"
                                        value={formData.oraInizio}
                                        onChange={(e) => handleChange('oraInizio', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Ora Fine
                                    </label>
                                    <input
                                        type="time"
                                        value={formData.oraFine}
                                        onChange={(e) => handleChange('oraFine', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                                    />
                                </div>
                            </div>

                            {/* Operatore specifico */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    <User className="inline h-4 w-4 mr-1" />
                                    {formData.categoriaEsecutore === 'MC' ? 'Medico Competente' : 'RSPP'}
                                    {selectedSite && (
                                        <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                                            (default: nominato per la sede)
                                        </span>
                                    )}
                                </label>
                                <select
                                    value={formData.eseguitoDaId}
                                    onChange={(e) => handleChange('eseguitoDaId', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                                >
                                    <option value="">Da assegnare</option>
                                    {operators.map((op) => {
                                        const isNominated = nominatedPersonId && op.id === nominatedPersonId;
                                        const isDefault = selectedSite && (
                                            (formData.categoriaEsecutore === 'MC' && selectedSite.medicoCompetente?.id === op.id) ||
                                            (formData.categoriaEsecutore === 'RSPP' && selectedSite.rspp?.id === op.id)
                                        );
                                        return (
                                            <option key={op.id} value={op.id}>
                                                {formatMedicoName({ firstName: op.firstName, lastName: op.lastName, gender: op.gender as 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED' | null })}
                                                {op.role && ` - ${op.role}`}
                                                {isNominated ? ' (nominato)' : isDefault ? ' (nominato sede)' : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            {/* Upload PDF esito sopralluogo */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    <Upload className="inline h-4 w-4 mr-1" />
                                    Esito Sopralluogo (PDF)
                                </label>

                                {/* P59: Mostra documento esistente in edit mode */}
                                {isEditMode && existingSopralluogo?.documentoUrl && !formData.esitoFile && (
                                    <div className="mb-3 p-3 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {existingSopralluogo.documentoNome || 'Verbale Sopralluogo'}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Documento attualmente caricato</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPdfPreview(true)}
                                                    className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 transition-colors"
                                                    title="Visualizza PDF"
                                                >
                                                    <Eye className="h-3.5 w-3.5 mr-1" />
                                                    Visualizza
                                                </button>
                                                <a
                                                    href={existingSopralluogo.documentoUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                                                    title="Apri in nuova scheda"
                                                >
                                                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                                    Apri
                                                </a>
                                            </div>
                                        </div>
                                        <p className="mt-2 text-xs text-indigo-600 dark:text-indigo-400">
                                            💡 Carica un nuovo file sotto per sostituire il documento esistente
                                        </p>
                                    </div>
                                )}

                                <div
                                    ref={dropZoneRef}
                                    onDragEnter={handleDragEnter}
                                    onDragLeave={handleDragLeave}
                                    onDragOver={handleDragOver}
                                    onDrop={handleDrop}
                                    className={cn(
                                        "mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors cursor-pointer",
                                        isDragging
                                            ? "border-indigo-500 bg-indigo-50"
                                            : "border-gray-300 hover:border-indigo-400",
                                        formData.esitoFile && "border-green-400 bg-green-50"
                                    )}
                                >
                                    <div className="space-y-1 text-center">
                                        <FileText className={cn(
                                            "mx-auto h-10 w-10",
                                            isDragging ? "text-indigo-500" : formData.esitoFile ? "text-green-500" : "text-gray-400"
                                        )} />
                                        {isDragging ? (
                                            <p className="text-sm text-indigo-600 font-medium">
                                                Rilascia il file qui
                                            </p>
                                        ) : (
                                            <>
                                                <div className="flex text-sm text-gray-600">
                                                    <label
                                                        htmlFor="esito-upload"
                                                        className="relative cursor-pointer rounded-md font-medium text-indigo-600 hover:text-indigo-500"
                                                    >
                                                        <span>{isEditMode && existingSopralluogo?.documentoUrl ? 'Sostituisci file' : 'Carica un file'}</span>
                                                        <input
                                                            id="esito-upload"
                                                            name="esito-upload"
                                                            type="file"
                                                            accept="application/pdf"
                                                            className="sr-only"
                                                            onChange={handleFileChange}
                                                        />
                                                    </label>
                                                    <p className="pl-1">o trascina qui</p>
                                                </div>
                                                <p className="text-xs text-gray-500">PDF fino a 10MB</p>
                                            </>
                                        )}
                                        {formData.esitoFile && !isDragging && (
                                            <p className="text-sm text-green-600 font-medium mt-2">
                                                ✓ {formData.esitoFile.name}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Opzionale: carica il verbale di sopralluogo già compilato
                                </p>
                            </div>

                            {/* Note */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Note
                                </label>
                                <textarea
                                    value={formData.note}
                                    onChange={(e) => handleChange('note', e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                                    placeholder="Obiettivi del sopralluogo, aree da verificare..."
                                />
                            </div>

                            {/* Info normativa */}
                            <div className="flex items-start p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                                <Info className="h-4 w-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                                <p className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                    Il sopralluogo periodico è obbligatorio almeno una volta all'anno per verificare le condizioni
                                    di lavoro e l'adeguatezza delle misure di prevenzione (Art. 25, comma 1, lett. l).
                                </p>
                            </div>
                        </div> {/* Fine contenuto scrollabile */}

                        {/* Actions - sticky in fondo */}
                        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 sticky bottom-0">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                                disabled={createMutation.isPending}
                            >
                                Annulla
                            </button>
                            <button
                                type="submit"
                                disabled={createMutation.isPending || sites.length === 0}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                                {createMutation.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Salvataggio...
                                    </>
                                ) : (
                                    <>
                                        <ClipboardCheck className="h-4 w-4 mr-2" />
                                        {isEditMode ? 'Aggiorna' : 'Programma'}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* P59: Modal preview PDF */}
            {showPdfPreview && existingSopralluogo?.documentoUrl && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl dark:shadow-black/50 w-[90vw] h-[90vh] max-w-6xl overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600">
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                    {existingSopralluogo.documentoNome || 'Verbale Sopralluogo'}
                                </h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={existingSopralluogo.documentoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                                >
                                    <ExternalLink className="h-4 w-4 mr-1.5" />
                                    Apri in nuova scheda
                                </a>
                                <button
                                    onClick={() => setShowPdfPreview(false)}
                                    className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                    title="Chiudi"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                        {/* PDF Viewer */}
                        <div className="w-full h-[calc(100%-56px)]">
                            <iframe
                                src={existingSopralluogo.documentoUrl}
                                className="w-full h-full border-0"
                                title="Anteprima Sopralluogo"
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default QuickActionSopralluogoModal;
