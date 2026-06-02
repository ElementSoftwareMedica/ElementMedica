/**
 * QuickActionNominaModal - Modal per creare nomina MC/RSPP direttamente da CompanyDetails
 * 
 * Modal pre-compilato con l'azienda corrente per aggiungere rapidamente
 * la nomina di Medico Competente o RSPP.
 * 
 * @module components/companies/quick-actions/QuickActionNominaModal
 * @project P58 - Company Details Enhancement
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
    Loader2,
    UserCheck,
    Calendar,
    Info,
    Stethoscope,
    Shield,
    Search,
    ChevronDown,
    Check
} from 'lucide-react';
import { clinicaApi, type TipoNominaRuolo, type NominaRuolo } from '../../../services/clinicaApi';
import { useToast } from '../../../hooks/useToast';
import Modal from '../../../design-system/molecules/Modal/Modal';
import { apiGet } from '../../../services/api';
import { DatePickerElegante } from '../../ui/DatePickerElegante';
import ElegantSelect from '../../ui/ElegantSelect';

export type NominaTipo = 'MC' | 'MC_COORDINATO' | 'RSPP';

interface SuccessorOfNomina {
    id: string;
    dataScadenza?: string;
    dataFine?: string;
    persona?: { firstName?: string; lastName?: string; fullName?: string };
}

interface QuickActionNominaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    companyId: string;
    companyName: string;
    /** Tipo di nomina da creare (MC o RSPP) */
    tipo: NominaTipo;
    /** ID della nomina da modificare (modalità edit) */
    editingNominaId?: string | null;
    /** Tenant ID per la query */
    tenantId?: string;
    /** Nomina predecessore per modalità successore */
    successorOf?: SuccessorOfNomina | null;
}

interface PersonOption {
    id: string;
    firstName: string;
    lastName: string;
    taxCode?: string;
    email?: string;
}

interface SiteOption {
    id: string;
    siteName: string;
    citta?: string;
}

const NOMINA_CONFIG: Record<NominaTipo, {
    label: string;
    icon: React.ReactNode;
    description: string;
    color: string;
    backendValue: TipoNominaRuolo; // Valore da inviare al backend
}> = {
    MC: {
        label: 'Medico Competente',
        icon: <Stethoscope className="h-5 w-5" />,
        description: 'Art. 38-40 D.Lgs 81/08 - Sorveglianza sanitaria',
        color: 'blue',
        backendValue: 'MEDICO_COMPETENTE' as TipoNominaRuolo
    },
    MC_COORDINATO: {
        label: 'Medico Competente Coordinato',
        icon: <Stethoscope className="h-5 w-5" />,
        description: 'Medico competente coordinato su azienda o singola sede',
        color: 'teal',
        backendValue: 'MEDICO_COMPETENTE_COORDINATO' as TipoNominaRuolo
    },
    RSPP: {
        label: 'RSPP',
        icon: <Shield className="h-5 w-5" />,
        description: 'Art. 32 D.Lgs 81/08 - Responsabile Servizio Prevenzione Protezione',
        color: 'indigo',
        backendValue: 'RSPP' as TipoNominaRuolo
    }
};

export const QuickActionNominaModal: React.FC<QuickActionNominaModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    companyId,
    companyName,
    tipo,
    editingNominaId,
    tenantId,
    successorOf
}) => {
    const { showToast } = useToast();
    const config = NOMINA_CONFIG[tipo];
    const isEditMode = Boolean(editingNominaId);
    const isSuccessorMode = Boolean(successorOf);

    // Ref per il dropdown searchable
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        personId: '',
        siteId: '',
        dataInizio: new Date().toISOString().split('T')[0],
        dataScadenza: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0], // Scadenza annuale default
        note: ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [searchTerm, setSearchTerm] = useState('');

    // P59: Headers per operazioni cross-tenant
    const operateTenantHeaders: Record<string, string> = tenantId ? { 'X-Operate-Tenant-Id': tenantId } : {};

    // Chiudi dropdown quando si clicca fuori
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Query per caricare i dati esistenti in edit mode
    // P59 Fix: Usa apiGet con headers cross-tenant per supportare aziende di altri tenant
    const { data: existingNomina, isError: nominaError } = useQuery({
        queryKey: ['nomina-ruolo', editingNominaId, tenantId],
        queryFn: async () => {
            if (!editingNominaId) return null;
            // Usa apiGet direttamente per passare headers cross-tenant
            return await apiGet<NominaRuolo>(`/api/v1/clinica/nomine-ruolo/${editingNominaId}`, {}, {
                headers: operateTenantHeaders
            });
        },
        enabled: isOpen && isEditMode,
        retry: false // Non ritentare se non trova la nomina
    });

    // Pre-popola il form quando si hanno i dati esistenti
    useEffect(() => {
        if (existingNomina && isEditMode) {
            setFormData({
                personId: existingNomina.personId || '',
                siteId: existingNomina.siteId || '',
                dataInizio: existingNomina.dataInizio ? existingNomina.dataInizio.split('T')[0] : new Date().toISOString().split('T')[0],
                dataScadenza: existingNomina.dataScadenza ? existingNomina.dataScadenza.split('T')[0] : '',
                note: existingNomina.note || ''
            });
        }
    }, [existingNomina, isEditMode]);

    // Reset form quando si apre in modalità create o successor
    useEffect(() => {
        if (isOpen && !isEditMode) {
            const today = new Date();
            const nextYear = new Date(today);
            nextYear.setFullYear(today.getFullYear() + 1);

            // Modalità successore: la data inizio è il giorno dopo la scadenza della nomina predecessore
            let defaultDataInizio = today.toISOString().split('T')[0];
            let defaultDataScadenza = nextYear.toISOString().split('T')[0];
            let defaultNote = '';

            if (isSuccessorMode && successorOf) {
                const predecessorEnd = successorOf.dataFine || successorOf.dataScadenza;
                if (predecessorEnd) {
                    const startDate = new Date(predecessorEnd);
                    startDate.setDate(startDate.getDate() + 1);
                    defaultDataInizio = startDate.toISOString().split('T')[0];

                    const scadenza = new Date(startDate);
                    scadenza.setFullYear(scadenza.getFullYear() + 1);
                    defaultDataScadenza = scadenza.toISOString().split('T')[0];
                }
                const predecessorName = successorOf.persona?.fullName
                    || `${successorOf.persona?.firstName || ''} ${successorOf.persona?.lastName || ''}`.trim()
                    || '';
                defaultNote = predecessorName
                    ? `Successore di ${predecessorName}`
                    : `Successore da nomina ${successorOf.id}`;
            }

            setFormData({
                personId: '',
                siteId: '',
                dataInizio: defaultDataInizio,
                dataScadenza: defaultDataScadenza,
                note: defaultNote
            });
            setErrors({});
            setSearchTerm('');
        }
    }, [isOpen, isEditMode, isSuccessorMode, successorOf]);

    // Fetch persone (medici/professionisti) filtrate per tenant corrente
    // P59: Filtra per roleType specifico in base al tipo di nomina E per tenantId
    const { data: personsData, isLoading: isLoadingPersons } = useQuery({
        queryKey: ['persons-nomina-select', searchTerm, tipo, tenantId],
        queryFn: async () => {
            // P59: Determina i roleType da filtrare
            // - MC: solo MEDICO_COMPETENTE e MEDICO
            // - RSPP: solo RSPP, CONSULENTE_SICUREZZA, TECNICO_SICUREZZA
            const roleTypeFilter = tipo === 'MC' || tipo === 'MC_COORDINATO'
                ? 'MEDICO_COMPETENTE'
                : 'RSPP,CONSULENTE_SICUREZZA,TECNICO_SICUREZZA';

            const response = await apiGet<{ data: PersonOption[] }>('/api/v1/persons', {
                search: searchTerm,
                limit: 30,
                roleType: roleTypeFilter,
                // Filtra MC per specialità "Medicina del Lavoro"
                ...((tipo === 'MC' || tipo === 'MC_COORDINATO') && { specialty: 'Medicina del Lavoro' }),
                // P59 Fix: Passa tenantId esplicitamente per filtrare correttamente
                ...(tenantId && { tenantId })
            });
            return response.data || [];
        },
        staleTime: 30 * 1000,
        enabled: isOpen
    });

    // Fetch sedi dell'azienda
    const { data: sitesData } = useQuery({
        queryKey: ['company-sites-select', companyId],
        queryFn: async () => {
            const response = await apiGet<{ sites: SiteOption[] }>(`/api/v1/company-sites/company/${companyId}`);
            return response.sites || [];
        },
        staleTime: 60 * 1000,
        enabled: isOpen && !!companyId
    });

    const persons = personsData || [];
    const sites = sitesData || [];

    // Mutation per creare la nomina
    const createMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            return clinicaApi.nomineRuolo.create({
                personId: data.personId,
                companyTenantProfileId: companyId,
                siteId: data.siteId || undefined,
                tipoRuolo: config.backendValue, // Usa il valore mappato per il backend
                dataInizio: data.dataInizio,
                dataScadenza: data.dataScadenza || undefined,
                note: data.note || undefined
            });
        },
        onSuccess: () => {
            showToast({ type: 'success', message: `Nomina ${config.label} creata con successo` });
            onSuccess();
            onClose();
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante la creazione' });
        }
    });

    // Mutation per aggiornare la nomina
    const updateMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            if (!editingNominaId) {
                throw new Error('ID nomina mancante per aggiornamento');
            }
            return clinicaApi.nomineRuolo.update(editingNominaId, {
                personId: data.personId,
                siteId: data.siteId || undefined,
                dataInizio: data.dataInizio,
                dataScadenza: data.dataScadenza || undefined,
                note: data.note || undefined
            });
        },
        onSuccess: () => {
            showToast({ type: 'success', message: `Nomina ${config.label} aggiornata con successo` });
            onSuccess();
            onClose();
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante l\'aggiornamento' });
        }
    });

    const isPending = createMutation.isPending || updateMutation.isPending;

    const validateForm = useCallback(() => {
        const newErrors: Record<string, string> = {};

        if (!formData.personId) {
            newErrors.personId = `Seleziona un ${tipo === 'MC' || tipo === 'MC_COORDINATO' ? 'medico' : 'professionista'}`;
        }
        if (!formData.dataInizio) {
            newErrors.dataInizio = 'Data inizio obbligatoria';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData, tipo]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            if (isEditMode) {
                updateMutation.mutate(formData);
            } else {
                createMutation.mutate(formData);
            }
        }
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditMode ? `Modifica ${config.label}` : isSuccessorMode ? `Nomina Successore ${config.label}` : `Aggiungi ${config.label}`}
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Info azienda */}
                <div className={`p-4 rounded-lg bg-${config.color}-50 border border-${config.color}-200`}>
                    <div className="flex items-center">
                        <div className={`p-2 rounded-lg bg-${config.color}-100 text-${config.color}-600`}>
                            {config.icon}
                        </div>
                        <div className="ml-3">
                            <p className={`text-sm font-semibold text-${config.color}-800`}>
                                {companyName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {config.description}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Banner successore */}
                {isSuccessorMode && successorOf && (
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                        <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                            Nomina successore di: {successorOf.persona?.fullName || `${successorOf.persona?.firstName || ''} ${successorOf.persona?.lastName || ''}`.trim() || 'N/D'}
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            La nomina corrente terminerà il giorno prima dell&apos;inizio della nuova nomina. Non ci saranno sovrapposizioni di date.
                        </p>
                    </div>
                )}

                {/* Selezione persona - Dropdown con ricerca integrata */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {tipo === 'MC' || tipo === 'MC_COORDINATO' ? 'Medico Competente' : 'Professionista'} *
                    </label>
                    <div className="relative" ref={dropdownRef}>
                        {/* Input che mostra la selezione o permette la ricerca */}
                        <div
                            className={`w-full px-3 py-2 border rounded-lg cursor-pointer flex items-center justify-between ${errors.personId ? 'border-red-300 dark:border-red-700' : 'border-gray-300 dark:border-gray-600'
                                } ${isDropdownOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''} bg-white dark:bg-gray-700`}
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <span className={formData.personId ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}>
                                {formData.personId
                                    ? (() => {
                                        const selected = persons.find(p => p.id === formData.personId);
                                        return selected
                                            ? `${selected.lastName} ${selected.firstName}${selected.taxCode ? ` (${selected.taxCode})` : ''}`
                                            : 'Seleziona...';
                                    })()
                                    : 'Seleziona...'}
                            </span>
                            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {/* Dropdown panel */}
                        {isDropdownOpen && (
                            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg dark:shadow-black/30">
                                {/* Search input dentro il dropdown */}
                                <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                                        <input
                                            type="text"
                                            placeholder="Cerca per nome..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                                            onClick={(e) => e.stopPropagation()}
                                            autoFocus
                                        />
                                        {isLoadingPersons && (
                                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                                        )}
                                    </div>
                                </div>

                                {/* Lista persone */}
                                <div className="max-h-48 overflow-y-auto">
                                    {persons.length === 0 ? (
                                        <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                                            {isLoadingPersons ? 'Caricamento...' : 'Nessun risultato trovato'}
                                        </div>
                                    ) : (
                                        persons.map((person) => (
                                            <div
                                                key={person.id}
                                                className={`px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 ${formData.personId === person.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                                                    }`}
                                                onClick={() => {
                                                    handleChange('personId', person.id);
                                                    setIsDropdownOpen(false);
                                                    setSearchTerm('');
                                                }}
                                            >
                                                <div>
                                                    <div className="text-sm font-medium">
                                                        {person.lastName} {person.firstName}
                                                    </div>
                                                    {person.taxCode && (
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                                            {person.taxCode}
                                                        </div>
                                                    )}
                                                </div>
                                                {formData.personId === person.id && (
                                                    <Check className="h-4 w-4 text-blue-600" />
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    {errors.personId && (
                        <p className="mt-1 text-xs text-red-600">{errors.personId}</p>
                    )}
                </div>

                {/* Selezione sede (opzionale) */}
                {sites.length > 0 && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Sede Operativa
                        </label>
                        <ElegantSelect
                            value={formData.siteId}
                            onChange={(value) => handleChange('siteId', value)}
                            placeholder="Tutte le sedi"
                            options={[
                                { value: '', label: 'Tutte le sedi' },
                                ...sites.map((site) => ({
                                    value: site.id,
                                    label: `${site.siteName}${site.citta ? ` - ${site.citta}` : ''}`,
                                })),
                            ]}
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Lascia vuoto per applicare a tutte le sedi
                        </p>
                    </div>
                )}

                {/* Date */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            <Calendar className="inline h-4 w-4 mr-1" />
                            Data Inizio *
                        </label>
                        <DatePickerElegante
                            value={formData.dataInizio}
                            onChange={(date) => handleChange('dataInizio', date ? date.toISOString().split('T')[0] : '')}
                            theme="teal"
                        />
                        {errors.dataInizio && (
                            <p className="mt-1 text-xs text-red-600">{errors.dataInizio}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            <Calendar className="inline h-4 w-4 mr-1" />
                            Scadenza
                        </label>
                        <DatePickerElegante
                            value={formData.dataScadenza}
                            onChange={(date) => handleChange('dataScadenza', date ? date.toISOString().split('T')[0] : '')}
                            theme="teal"
                        />
                    </div>
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
                        placeholder="Note aggiuntive..."
                    />
                </div>

                {/* Info normativa */}
                <div className="flex items-start p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <Info className="h-4 w-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                    <p className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                        {tipo === 'MC' || tipo === 'MC_COORDINATO'
                            ? 'Il Medico Competente è obbligatorio per le aziende con lavoratori esposti a rischi specifici (Art. 41 D.Lgs 81/08).'
                            : 'L\'RSPP è obbligatorio per tutte le aziende. Può essere il datore di lavoro stesso per aziende fino a 30 dipendenti (Art. 34 D.Lgs 81/08).'
                        }
                    </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                        disabled={isPending}
                    >
                        Annulla
                    </button>
                    <button
                        type="submit"
                        disabled={isPending}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Salvataggio...
                            </>
                        ) : (
                            <>
                                <UserCheck className="h-4 w-4 mr-2" />
                                {isEditMode ? 'Salva Modifiche' : 'Crea Nomina'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default QuickActionNominaModal;
