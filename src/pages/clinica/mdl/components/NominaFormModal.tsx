/**
 * NominaFormModal - Form per creazione/modifica nomina figura sicurezza
 *
 * Modal form per gestire nomine MC, RSPP, ASPP, RLS secondo D.Lgs 81/08.
 * - Autocomplete persona unico (no doppio campo)
 * - Sezione movimenti contabili (solo in modifica)
 *
 * @module pages/clinica/mdl/components/NominaFormModal
 * @project P56 - Medicina del Lavoro Sistema Completo - FASE 3
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
    Loader2,
    UserCheck,
    Building2,
    Calendar,
    Info,
    Search,
    X,
    TrendingUp,
    TrendingDown,
    ChevronDown,
    CheckCircle,
    Clock,
    AlertCircle
} from 'lucide-react';
import {
    clinicaApi,
    type NominaRuolo,
    type TipoNominaRuolo
} from '../../../../services/clinicaApi';
import { useToast } from '../../../../hooks/useToast';
import Modal from '../../../../design-system/molecules/Modal/Modal';
import { DatePickerElegante } from '../../../../components/ui/DatePickerElegante';
import { apiGet } from '../../../../services/api';

interface NominaFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    nomina?: NominaRuolo | null;
}

const RUOLO_OPTIONS: { value: TipoNominaRuolo; label: string; description: string }[] = [
    { value: 'MEDICO_COMPETENTE', label: 'Medico Competente', description: 'Art. 38-40 D.Lgs 81/08' },
    { value: 'MEDICO_COMPETENTE_COORDINATO', label: 'Medico Competente Coordinato', description: 'Art. 39 c.6 D.Lgs 81/08' },
    { value: 'RSPP', label: 'RSPP', description: 'Responsabile SPP - Art. 32' },
    { value: 'ASPP', label: 'ASPP', description: 'Addetto SPP - Art. 32' },
    { value: 'RLS', label: 'RLS', description: 'Rappresentante Lavoratori - Art. 47-50' },
    { value: 'PREPOSTO', label: 'Preposto', description: 'Art. 19 D.Lgs 81/08' },
    { value: 'ADDETTO_PS', label: 'Addetto Primo Soccorso', description: 'Art. 45 - DM 388/03' },
    { value: 'ADDETTO_AI', label: 'Addetto Antincendio', description: 'Art. 46 - DM 10/03/98' }
];

interface PersonOption {
    id: string;
    firstName: string;
    lastName: string;
    taxCode?: string;
}

interface MovimentoItem {
    id: string;
    direzione: 'ENTRATA' | 'USCITA';
    tipo: string;
    stato: string;
    dataEsecuzione: string;
    importoNetto: number;
    descrizione?: string;
}

interface CompanyOption {
    id: string;
    companyTenantProfileId?: string | null;
    ragioneSociale: string;
    sites?: Array<{
        id: string;
        siteName: string;
        citta?: string;
        companyTenantProfileId?: string;
    }>;
}

type ConflictResolution = 'CEASE_PREVIOUS' | 'START_AFTER_PREVIOUS';

const formatPersonLabel = (p: PersonOption) =>
    `${p.lastName || 'N/D'} ${p.firstName || ''}${p.taxCode ? ` (${p.taxCode})` : ''}`.trim();

const statoMovimentoColor = (stato: string): string => {
    switch (stato) {
        case 'PAGATO': return 'text-green-700 bg-green-50 dark:text-green-300 dark:bg-green-900/30';
        case 'FATTURATO': return 'text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/30';
        case 'DA_FATTURARE': return 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-900/30';
        case 'STORNATO': return 'text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-900/30';
        default: return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-800';
    }
};

const NominaFormModal: React.FC<NominaFormModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    nomina
}) => {
    const { showToast } = useToast();
    const isEditing = !!nomina;
    const searchInputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const companyDropdownRef = useRef<HTMLDivElement>(null);

    const [formData, setFormData] = useState({
        personId: '',
        siteId: '',
        companyTenantProfileId: '',
        tipoRuolo: '' as TipoNominaRuolo | '',
        dataInizio: '',
        dataFine: '',
        dataScadenza: '',
        note: ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [personSearchText, setPersonSearchText] = useState('');
    const [showPersonSearch, setShowPersonSearch] = useState(false);
    const [selectedPerson, setSelectedPerson] = useState<PersonOption | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [companySearchText, setCompanySearchText] = useState('');
    const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
    const [pendingResolution, setPendingResolution] = useState<ConflictResolution | null>(null);
    const [nominaConflict, setNominaConflict] = useState<{
        message: string;
        code?: string;
        existingNomina?: NominaRuolo | null;
    } | null>(null);

    const { data: companiesData } = useQuery({
        queryKey: ['companies-select'],
        queryFn: async () => {
            const response = await apiGet<CompanyOption[]>('/api/v1/companies');
            return Array.isArray(response) ? response : [];
        },
        staleTime: 5 * 60 * 1000
    });

    const { data: personsData, isLoading: isLoadingPersons } = useQuery({
        queryKey: ['persons-autocomplete-nomina', personSearchText, formData.tipoRuolo],
        queryFn: async () => {
            if (formData.tipoRuolo === 'MEDICO_COMPETENTE' || formData.tipoRuolo === 'MEDICO_COMPETENTE_COORDINATO') {
                const response = await apiGet<{ data: PersonOption[] }>('/api/v1/clinica/medici', {
                    search: personSearchText, specializzazione: 'Medicina del Lavoro', attivo: 'true', limit: 20
                });
                return response?.data || [];
            }
            if (formData.tipoRuolo === 'RSPP' || formData.tipoRuolo === 'ASPP') {
                const response = await apiGet<{ data: PersonOption[] }>('/api/v1/trainers', {
                    search: personSearchText, attivo: 'true', limit: 20
                });
                return response?.data || [];
            }
            const response = await apiGet<{ data: PersonOption[] }>('/api/v1/persons', {
                search: personSearchText, limit: 20
            });
            return response.data || [];
        },
        enabled: !!formData.tipoRuolo && (showPersonSearch || !isEditing) && personSearchText.length >= 2,
        staleTime: 30 * 1000
    });

    const { data: movimentiData } = useQuery({
        queryKey: ['movimenti-nomina', nomina?.id],
        queryFn: () => apiGet<{ data: MovimentoItem[]; total: number }>('/api/v1/movimenti-contabili', {
            nominaRuoloId: nomina!.id,
            pageSize: 50
        }),
        enabled: isEditing && !!nomina?.id && isOpen,
        staleTime: 60 * 1000
    });

    const getCompanyProfileId = useCallback((company: CompanyOption) => company.companyTenantProfileId || company.id, []);
    const companies = (companiesData || [])
        .map(c => ({
            ...c,
            sites: (c.sites || []).map(s => ({
                ...s,
                companyTenantProfileId: s.companyTenantProfileId || c.companyTenantProfileId || c.id
            }))
        }))
        .sort((a, b) => (a.ragioneSociale || '').localeCompare(b.ragioneSociale || '', 'it', { sensitivity: 'base' }));
    const selectedCompany = companies.find(c => getCompanyProfileId(c) === formData.companyTenantProfileId) || null;
    const filteredCompanies = companies.filter(c =>
        !companySearchText.trim() ||
        (c.ragioneSociale || '').toLowerCase().includes(companySearchText.trim().toLowerCase())
    );
    // Derive CompanySite list from companies (filtered by selected company if any)
    const sedi = companies.flatMap(c =>
        (c.sites || []).map(s => ({ id: s.id, siteName: s.siteName, citta: s.citta, companyTenantProfileId: getCompanyProfileId(c) }))
    ).filter(s => !formData.companyTenantProfileId || s.companyTenantProfileId === formData.companyTenantProfileId);
    const persons = personsData || [];
    const movimenti = movimentiData?.data || [];

    useEffect(() => {
        if (isOpen) {
            if (nomina) {
                // Derive companyTenantProfileId from site if not directly set
                const derivedCompanyId = nomina.companyTenantProfileId
                    || nomina.site?.companyTenantProfileId
                    || (companiesData || []).find(c => c.sites?.some(s => s.id === nomina.siteId))?.companyTenantProfileId
                    || (companiesData || []).find(c => c.sites?.some(s => s.id === nomina.siteId))?.id
                    || '';
                setFormData({
                    personId: nomina.personId || '',
                    siteId: nomina.siteId || '',
                    companyTenantProfileId: derivedCompanyId,
                    tipoRuolo: nomina.tipoRuolo || '',
                    dataInizio: nomina.dataInizio ? nomina.dataInizio.split('T')[0] : '',
                    dataFine: nomina.dataFine ? nomina.dataFine.split('T')[0] : '',
                    dataScadenza: nomina.dataScadenza ? nomina.dataScadenza.split('T')[0] : '',
                    note: nomina.note || ''
                });
                if (nomina.person) {
                    setSelectedPerson({
                        id: nomina.person.id,
                        firstName: nomina.person.firstName,
                        lastName: nomina.person.lastName,
                        taxCode: nomina.person.taxCode
                    });
                } else {
                    setSelectedPerson(null);
                }
                setShowPersonSearch(false);
                setPersonSearchText('');
                const company = (companiesData || []).find(c => (c.companyTenantProfileId || c.id) === derivedCompanyId);
                setCompanySearchText(company?.ragioneSociale || '');
            } else {
                setFormData({
                    personId: '', siteId: '', companyTenantProfileId: '', tipoRuolo: '',
                    dataInizio: new Date().toISOString().split('T')[0],
                    dataFine: '', dataScadenza: '', note: ''
                });
                setSelectedPerson(null);
                setShowPersonSearch(true);
                setPersonSearchText('');
                setCompanySearchText('');
            }
            setErrors({});
            setShowDropdown(false);
            setShowCompanyDropdown(false);
            setNominaConflict(null);
            setPendingResolution(null);
        }
    }, [nomina, isOpen, companiesData]);

    useEffect(() => {
        const handleClickOutside = (evt: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(evt.target as Node)) {
                setShowDropdown(false);
            }
            if (companyDropdownRef.current && !companyDropdownRef.current.contains(evt.target as Node)) {
                setShowCompanyDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleClose = useCallback(() => {
        setFormData({ personId: '', siteId: '', companyTenantProfileId: '', tipoRuolo: '', dataInizio: '', dataFine: '', dataScadenza: '', note: '' });
        setErrors({});
        setSelectedPerson(null);
        setPersonSearchText('');
        setCompanySearchText('');
        setShowPersonSearch(false);
        setShowDropdown(false);
        setShowCompanyDropdown(false);
        setNominaConflict(null);
        setPendingResolution(null);
        onClose();
    }, [onClose]);

    const handleInputChange = useCallback((field: string, value: string) => {
        setFormData(prev => {
            if (field === 'tipoRuolo' && value !== prev.tipoRuolo) {
                setSelectedPerson(null);
                setPersonSearchText('');
                setShowPersonSearch(true);
                return { ...prev, tipoRuolo: value as TipoNominaRuolo | '', personId: '' };
            }
            if (field === 'companyTenantProfileId' && value !== prev.companyTenantProfileId) {
                // When company changes, clear siteId if not part of new company's sites
                const companySites = companies.find(c => getCompanyProfileId(c) === value)?.sites || [];
                const siteStillValid = companySites.some(s => s.id === prev.siteId);
                return { ...prev, companyTenantProfileId: value, ...(siteStillValid ? {} : { siteId: '' }) };
            }
            if (field === 'siteId' && value) {
                // Auto-select company when a site is selected
                const siteCompany = companies.find(c => c.sites?.some(s => s.id === value));
                if (siteCompany && !prev.companyTenantProfileId) {
                    return { ...prev, siteId: value, companyTenantProfileId: getCompanyProfileId(siteCompany) };
                }
            }
            return { ...prev, [field]: value } as typeof prev;
        });
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
        setNominaConflict(null);
    }, [errors, companies, getCompanyProfileId]);

    const handleSelectCompany = (company: CompanyOption) => {
        const profileId = getCompanyProfileId(company);
        setFormData(prev => {
            const companySites = company.sites || [];
            const siteStillValid = companySites.some(s => s.id === prev.siteId);
            return { ...prev, companyTenantProfileId: profileId, ...(siteStillValid ? {} : { siteId: '' }) };
        });
        setCompanySearchText(company.ragioneSociale || '');
        setShowCompanyDropdown(false);
        setNominaConflict(null);
        if (errors.association) setErrors(prev => ({ ...prev, association: '' }));
    };

    const handleClearCompany = () => {
        setFormData(prev => ({ ...prev, companyTenantProfileId: '', siteId: '' }));
        setCompanySearchText('');
        setShowCompanyDropdown(true);
        setNominaConflict(null);
    };

    const handleSelectPerson = (person: PersonOption) => {
        setSelectedPerson(person);
        setFormData(prev => ({ ...prev, personId: person.id }));
        setPersonSearchText('');
        setShowDropdown(false);
        setShowPersonSearch(false);
        if (errors.personId) setErrors(prev => ({ ...prev, personId: '' }));
    };

    const handleClearPerson = () => {
        setSelectedPerson(null);
        setFormData(prev => ({ ...prev, personId: '' }));
        setPersonSearchText('');
        setShowPersonSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
    };

    const validate = useCallback(() => {
        const newErrors: Record<string, string> = {};
        if (!formData.personId) newErrors.personId = 'Persona obbligatoria';
        if (!formData.tipoRuolo) newErrors.tipoRuolo = 'Ruolo obbligatorio';
        if (!formData.dataInizio) newErrors.dataInizio = 'Data inizio obbligatoria';
        if (!formData.siteId && !formData.companyTenantProfileId)
            newErrors.association = 'Seleziona almeno una sede o un\'azienda';
        if (formData.dataFine && formData.dataInizio && new Date(formData.dataFine) < new Date(formData.dataInizio))
            newErrors.dataFine = 'Data fine non può precedere la data inizio';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData]);

    const buildPayload = useCallback(() => ({
        ...formData,
        tipoRuolo: formData.tipoRuolo as TipoNominaRuolo,
        siteId: formData.siteId || undefined,
        companyTenantProfileId: formData.companyTenantProfileId || undefined,
        dataFine: formData.dataFine || undefined,
        dataScadenza: formData.dataScadenza || undefined,
        note: formData.note || undefined,
        ...(pendingResolution ? { conflictResolution: pendingResolution } : {})
    }), [formData, pendingResolution]);

    const handleConflictError = useCallback((error: Error & { status?: number; response?: { data?: any } }, fallback: string) => {
        const data = error.response?.data;
        if (error.status === 409 || data?.code) {
            setNominaConflict({
                message: data?.error || error.message || fallback,
                code: data?.code,
                existingNomina: data?.existingNomina || null
            });
            showToast({ type: 'warning', message: 'Esiste già una nomina attiva: scegli come procedere.' });
            return;
        }
        showToast({ type: 'error', message: fallback });
    }, [showToast]);

    const createMutation = useMutation({
        mutationFn: () => clinicaApi.nomineRuolo.create(buildPayload()),
        onSuccess: () => { showToast({ type: 'success', message: 'Nomina creata con successo' }); onSuccess(); handleClose(); },
        onError: (error: Error & { status?: number; response?: { data?: any } }) => handleConflictError(error, 'Errore durante la creazione')
    });

    const updateMutation = useMutation({
        mutationFn: () => clinicaApi.nomineRuolo.update(nomina!.id, buildPayload()),
        onSuccess: () => { showToast({ type: 'success', message: 'Nomina aggiornata con successo' }); onSuccess(); handleClose(); },
        onError: (error: Error & { status?: number; response?: { data?: any } }) => handleConflictError(error, 'Errore durante l\'aggiornamento')
    });

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        if (isEditing) updateMutation.mutate();
        else createMutation.mutate();
    }, [validate, isEditing, createMutation, updateMutation]);

    const handleResolveConflict = (resolution: ConflictResolution) => {
        setPendingResolution(resolution);
        setNominaConflict(null);
        setTimeout(() => {
            if (isEditing) updateMutation.mutate();
            else createMutation.mutate();
        }, 0);
    };

    const isPending = createMutation.isPending || updateMutation.isPending;
    const selectedRuolo = RUOLO_OPTIONS.find(r => r.value === formData.tipoRuolo);

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={isEditing ? 'Modifica Nomina' : 'Nuova Nomina Figura Sicurezza'} size="lg">
            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">

                {/* Ruolo */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tipo Ruolo <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={formData.tipoRuolo}
                        onChange={(e) => handleInputChange('tipoRuolo', e.target.value)}
                        className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-800 dark:text-gray-100 transition-colors ${errors.tipoRuolo ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    >
                        <option value="">— Seleziona ruolo —</option>
                        {RUOLO_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    {errors.tipoRuolo && <p className="text-red-500 text-xs mt-1">{errors.tipoRuolo}</p>}
                    {selectedRuolo && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                            <Info className="h-3 w-3 flex-shrink-0" />
                            {selectedRuolo.description}
                        </p>
                    )}
                </div>

                {/* Persona — autocomplete unico senza doppio campo */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Persona <span className="text-red-500">*</span>
                    </label>
                    {formData.tipoRuolo === 'MEDICO_COMPETENTE' && (
                        <div className="flex items-center gap-1.5 text-xs text-teal-700 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-300 px-3 py-1.5 rounded-lg mb-2">
                            <UserCheck className="h-3.5 w-3.5 flex-shrink-0" />
                            Ricerca tra i medici con specialità Medicina del Lavoro
                        </div>
                    )}
                    {(formData.tipoRuolo === 'RSPP' || formData.tipoRuolo === 'ASPP') && (
                        <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1.5 rounded-lg mb-2">
                            <UserCheck className="h-3.5 w-3.5 flex-shrink-0" />
                            Ricerca tra i formatori abilitati
                        </div>
                    )}
                    {!formData.tipoRuolo && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300 px-3 py-1.5 rounded-lg mb-2">
                            <Info className="h-3.5 w-3.5 flex-shrink-0" />
                            Seleziona prima il tipo di ruolo
                        </div>
                    )}

                    {selectedPerson && !showPersonSearch ? (
                        <div className="flex items-center gap-2 px-3 py-2.5 border border-teal-200 dark:border-teal-700 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                            <UserCheck className="h-4 w-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                            <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {formatPersonLabel(selectedPerson)}
                            </span>
                            <button
                                type="button"
                                onClick={handleClearPerson}
                                disabled={!formData.tipoRuolo}
                                className="text-xs text-teal-600 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-200 underline flex-shrink-0 flex items-center gap-1 disabled:opacity-50"
                            >
                                <ChevronDown className="h-3 w-3" />
                                Cambia
                            </button>
                        </div>
                    ) : (
                        <div className="relative" ref={dropdownRef}>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder={formData.tipoRuolo ? 'Cerca per cognome o nome...' : 'Seleziona prima il ruolo'}
                                    value={personSearchText}
                                    onChange={(e) => {
                                        setPersonSearchText(e.target.value);
                                        setShowDropdown(e.target.value.length >= 2);
                                    }}
                                    onFocus={() => personSearchText.length >= 2 && setShowDropdown(true)}
                                    disabled={!formData.tipoRuolo}
                                    className={`w-full pl-9 pr-9 border rounded-lg py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-800 dark:text-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors ${errors.personId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                />
                                {personSearchText && (
                                    <button type="button" onClick={() => { setPersonSearchText(''); setShowDropdown(false); }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                            {showDropdown && formData.tipoRuolo && (
                                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                                    {isLoadingPersons ? (
                                        <div className="flex items-center gap-2 px-3 py-3 text-sm text-gray-500">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Ricerca in corso...
                                        </div>
                                    ) : persons.length > 0 ? (
                                        persons.map(p => (
                                            <button key={p.id} type="button" onClick={() => handleSelectPerson(p)}
                                                className="w-full text-left px-3 py-2.5 text-sm hover:bg-teal-50 dark:hover:bg-teal-900/30 hover:text-teal-700 dark:hover:text-teal-300 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                                                <span className="font-medium">{p.lastName} {p.firstName}</span>
                                                {p.taxCode && <span className="ml-2 text-xs text-gray-400">{p.taxCode}</span>}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">
                                            {personSearchText.length >= 2 ? 'Nessun risultato trovato' : 'Digita almeno 2 caratteri'}
                                        </div>
                                    )}
                                </div>
                            )}
                            {personSearchText.length > 0 && personSearchText.length < 2 && (
                                <p className="text-amber-600 text-xs mt-1">Digita almeno 2 caratteri per cercare</p>
                            )}
                        </div>
                    )}
                    {errors.personId && <p className="text-red-500 text-xs mt-1">{errors.personId}</p>}
                </div>

                {/* Associazione */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-500" />
                        Associazione <span className="font-normal text-gray-500 dark:text-gray-400 text-xs ml-1">(almeno una richiesta)</span>
                    </h3>
                    {errors.association && <p className="text-red-500 text-xs mb-2">{errors.association}</p>}
                    <div className="grid grid-cols-1 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Azienda</label>
                            <div className="relative" ref={companyDropdownRef}>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={companySearchText}
                                        onChange={(e) => {
                                            setCompanySearchText(e.target.value);
                                            setShowCompanyDropdown(true);
                                            if (selectedCompany && e.target.value !== selectedCompany.ragioneSociale) {
                                                setFormData(prev => ({ ...prev, companyTenantProfileId: '', siteId: '' }));
                                            }
                                        }}
                                        onFocus={() => setShowCompanyDropdown(true)}
                                        placeholder="Cerca azienda..."
                                        className="w-full pl-9 pr-9 border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-800 dark:text-gray-100 transition-colors"
                                    />
                                    {formData.companyTenantProfileId && (
                                        <button
                                            type="button"
                                            onClick={handleClearCompany}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            title="Cambia azienda"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                                {showCompanyDropdown && (
                                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                                        {filteredCompanies.length > 0 ? (
                                            filteredCompanies.map(c => (
                                                <button
                                                    key={getCompanyProfileId(c)}
                                                    type="button"
                                                    onClick={() => handleSelectCompany(c)}
                                                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-teal-50 dark:hover:bg-teal-900/30 hover:text-teal-700 dark:hover:text-teal-300 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                                                >
                                                    <span className="font-medium">{c.ragioneSociale}</span>
                                                    {(c.sites?.length || 0) > 0 && (
                                                        <span className="ml-2 text-xs text-gray-400">{c.sites?.length} sed{c.sites?.length === 1 ? 'e' : 'i'}</span>
                                                    )}
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">Nessuna azienda trovata</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Sede</label>
                            <select value={formData.siteId} onChange={(e) => handleInputChange('siteId', e.target.value)}
                                disabled={!formData.companyTenantProfileId}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-800 dark:text-gray-100">
                                <option value="">— Tutte le sedi —</option>
                                {sedi.map(s => <option key={s.id} value={s.id}>{s.siteName}{s.citta ? ` (${s.citta})` : ''}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {nominaConflict && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-amber-900">Nomina attiva già presente</p>
                                <p className="text-xs text-amber-800 mt-1">{nominaConflict.message}</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleResolveConflict('CEASE_PREVIOUS')}
                                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700"
                                    >
                                        Cessa precedente e salva nuova
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleResolveConflict('START_AFTER_PREVIOUS')}
                                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-amber-300 text-amber-800 hover:bg-amber-100"
                                    >
                                        Avvia dopo cessazione precedente
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setNominaConflict(null); setPendingResolution(null); }}
                                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                                    >
                                        Annulla
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Date Nomina */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        Date Nomina
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                Data Inizio <span className="text-red-500">*</span>
                            </label>
                            <DatePickerElegante value={formData.dataInizio}
                                onChange={(date) => handleInputChange('dataInizio', date ? date.toISOString().split('T')[0] : '')} theme="teal" />
                            {errors.dataInizio && <p className="text-red-500 text-xs mt-1">{errors.dataInizio}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Data Fine</label>
                            <DatePickerElegante value={formData.dataFine}
                                onChange={(date) => handleInputChange('dataFine', date ? date.toISOString().split('T')[0] : '')} theme="teal" />
                            {errors.dataFine && <p className="text-red-500 text-xs mt-1">{errors.dataFine}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Data Scadenza</label>
                            <DatePickerElegante value={formData.dataScadenza}
                                onChange={(date) => handleInputChange('dataScadenza', date ? date.toISOString().split('T')[0] : '')} theme="teal" />
                        </div>
                    </div>
                </div>

                {/* Note */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note</label>
                    <textarea value={formData.note} onChange={(e) => handleInputChange('note', e.target.value)}
                        placeholder="Note aggiuntive..." rows={2}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-800 dark:text-gray-100 resize-none" />
                </div>

                {/* Movimenti contabili — solo in modifica */}
                {isEditing && (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-gray-500" />
                                Movimenti Contabili
                            </h3>
                            {movimenti.length > 0 && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {movimenti.length} moviment{movimenti.length !== 1 ? 'i' : 'o'}
                                </span>
                            )}
                        </div>
                        {movimenti.length === 0 ? (
                            <div className="px-4 py-6 text-center">
                                <Clock className="h-7 w-7 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                <p className="text-sm text-gray-500 dark:text-gray-400">Nessun movimento contabile associato</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    I movimenti vengono generati automaticamente all'erogazione di servizi
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {movimenti.map((mov) => (
                                    <div key={mov.id} className="flex items-center gap-3 px-4 py-2.5">
                                        {mov.direzione === 'ENTRATA'
                                            ? <TrendingUp className="h-4 w-4 text-green-500 flex-shrink-0" />
                                            : <TrendingDown className="h-4 w-4 text-red-500 flex-shrink-0" />}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                {mov.tipo?.replace(/_/g, ' ')}
                                            </p>
                                            {mov.descrizione && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{mov.descrizione}</p>
                                            )}
                                        </div>
                                        <div className="text-right flex-shrink-0 mr-2">
                                            <p className={`text-sm font-semibold ${mov.direzione === 'ENTRATA' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {mov.direzione === 'USCITA' ? '-' : '+'}€{Number(mov.importoNetto).toFixed(2)}
                                            </p>
                                            <p className="text-xs text-gray-400">{new Date(mov.dataEsecuzione).toLocaleDateString('it-IT')}</p>
                                        </div>
                                        <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${statoMovimentoColor(mov.stato)}`}>
                                            {mov.stato === 'PAGATO'
                                                ? <CheckCircle className="h-3 w-3" />
                                                : <AlertCircle className="h-3 w-3" />}
                                            {mov.stato?.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <button type="button" onClick={handleClose} disabled={isPending}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        Annulla
                    </button>
                    <button type="submit" disabled={isPending}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors">
                        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isEditing ? 'Aggiorna' : 'Crea'} Nomina
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default NominaFormModal;
