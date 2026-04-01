/**
 * GiudizioFormModal - Modal per creare/modificare giudizi di idoneità
 * 
 * Form modale per la creazione e modifica dei giudizi MC
 * secondo Art. 41 D.Lgs 81/08.
 * 
 * @module pages/clinica/mdl/components/GiudizioFormModal
 * @project P56 - Medicina del Lavoro Sistema Completo
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    FileCheck,
    User,
    Stethoscope,
    Briefcase,
    Calendar,
    AlertTriangle,
    X,
    Loader2,
    ClipboardList,
    Ban
} from 'lucide-react';
import Modal from '../../../../design-system/molecules/Modal/Modal';
import {
    clinicaApi,
    mediciApi,
    visiteApi,
    type GiudizioIdoneita,
    type TipoGiudizioIdoneita,
    type StatoGiudizio
} from '../../../../services/clinicaApi';
import { apiGet } from '../../../../services/api';
import { useTenantFilter } from '../../../../context/TenantFilterContext';
import { DatePickerElegante } from '../../../../components/ui/DatePickerElegante';
import { getMedicoTitle } from '../../../../utils/textFormatters';

// Tipi di giudizio con etichette user-friendly
const TIPI_GIUDIZIO: { value: TipoGiudizioIdoneita; label: string; color: string }[] = [
    { value: 'IDONEO', label: 'Idoneo', color: 'bg-green-100 text-green-800' },
    { value: 'IDONEO_CON_PRESCRIZIONI', label: 'Idoneo con prescrizioni', color: 'bg-blue-100 text-blue-800' },
    { value: 'IDONEO_CON_LIMITAZIONI', label: 'Idoneo con limitazioni', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'NON_IDONEO_TEMPORANEO', label: 'Temporaneamente non idoneo', color: 'bg-orange-100 text-orange-800' },
    { value: 'NON_IDONEO_PERMANENTE', label: 'Non idoneo permanente', color: 'bg-red-100 text-red-800' }
];

// Mappature codice→etichetta per prescrizioni/limitazioni (da VisitTemplateService)
const PRESCRIZIONI_OPTIONS: { value: string; label: string }[] = [
    { value: 'uso_dpi_guanti', label: 'Uso obbligatorio DPI: guanti protettivi' },
    { value: 'uso_dpi_scarpe', label: 'Uso obbligatorio DPI: scarpe antinfortunistiche' },
    { value: 'uso_dpi_cuffie', label: 'Uso obbligatorio DPI: cuffie / tappi antirumore' },
    { value: 'uso_dpi_mascherina', label: 'Uso obbligatorio DPI: mascherina FFP2/FFP3' },
    { value: 'uso_dpi_visiera', label: 'Uso obbligatorio DPI: visiera / occhiali protettivi' },
    { value: 'uso_dpi_imbracatura', label: 'Uso obbligatorio DPI: imbracatura di sicurezza' },
    { value: 'divieto_mmc_20', label: 'Divieto movimentazione manuale carichi > 20 kg' },
    { value: 'divieto_mmc_10', label: 'Divieto movimentazione manuale carichi > 10 kg' },
    { value: 'pause_vdt', label: 'Pause obbligatorie VDT: 15 minuti ogni 2 ore' },
    { value: 'limitazione_notturno', label: 'Limitazione turni notturni (max 2 notti/settimana)' },
    { value: 'controllo_oft_annuale', label: 'Controllo oftalmologico annuale (videoterminali)' },
    { value: 'sorveg_rafforzata_semestrale', label: 'Sorveglianza sanitaria rafforzata semestrale' },
    { value: 'formazione_rischio_chimico', label: 'Obbligo formazione specifica rischio chimico' },
    { value: 'formazione_rischio_biologico', label: 'Obbligo formazione specifica rischio biologico' },
    { value: 'evitare_cancerogeni', label: 'Evitare esposizione a sostanze cancerogene / mutagene' },
    { value: 'esposizione_rumore_limitata', label: 'Limitazione esposizione a rumore (< 80 dB)' },
];

const LIMITAZIONI_OPTIONS: { value: string; label: string }[] = [
    { value: 'no_lavoro_quota', label: 'Non idoneo a lavori in quota (> 2 m)' },
    { value: 'no_piattaforme_elevabili', label: 'Non idoneo a lavori su piattaforme elevabili / cestelli' },
    { value: 'no_guida_mezzi', label: 'Non idoneo alla conduzione di automezzi / mezzi operativi' },
    { value: 'no_spazi_confinati', label: 'Non idoneo a lavori in spazi confinati' },
    { value: 'limitazione_notturno_mansione', label: 'Limitata idoneità ai turni notturni' },
    { value: 'no_vibrazioni', label: 'Non idoneo a mansioni con esposizione a vibrazioni mano-braccio' },
    { value: 'no_rumore_85db', label: 'Non idoneo a mansioni con esposizione a rumore > 85 dB' },
    { value: 'limitazione_mmc', label: 'Limitata movimentazione manuale di carichi (< 10 kg)' },
    { value: 'no_cancerogeni', label: 'Non idoneo a mansioni con esposizione a cancerogeni / mutageni' },
    { value: 'limitazione_chimici', label: 'Limitata esposizione a sostanze chimiche pericolose' },
    { value: 'no_stress_termico', label: 'Non idoneo a lavori con stress termico (ambiente caldo / freddo)' },
    { value: 'no_vdt_prolungato', label: 'Uso VDT limitato (max 2 ore continuative senza pausa)' },
];

/** Decodifica un valore memorizzato (codici o etichette) nelle descrizioni leggibili.
 *  Se il valore contiene i codici (es. "uso_dpi_guanti, no_lavoro_quota"), li sostituisce
 *  con le etichette corrispondenti. Se contiene già testo libero, lo restituisce invariato.
 */
function decodeOptionsToLabels(
    stored: string,
    options: { value: string; label: string }[]
): string {
    if (!stored) return '';
    const codeMap = new Map(options.map(o => [o.value, o.label]));
    // Prova a interpretare come lista di codici separati da virgola, punto-virgola o newline
    const parts = stored.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
    const decoded = parts.map(part => codeMap.get(part) ?? part);
    return decoded.join('\n');
}

interface GiudizioFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (giudizio: GiudizioIdoneita) => void;
    giudizio?: GiudizioIdoneita | null;
    mode: 'create' | 'edit';
    prefillData?: {
        personId?: string;
        visitaId?: string;
        medicoCompetenteId?: string;
        mansioneIds?: string[];
    };
}

interface FormState {
    personId: string;
    medicoCompetenteId: string;
    visitaId: string;
    mansioneIds: string[];
    tipoGiudizio: TipoGiudizioIdoneita;
    dataScadenza: string;
    prescrizioniIdoneita: string;
    limitazioni: string;
    motivazioni: string;
}

const GiudizioFormModal: React.FC<GiudizioFormModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    giudizio,
    mode,
    prefillData
}) => {
    const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Form state
    const [formState, setFormState] = useState<FormState>({
        personId: '',
        medicoCompetenteId: '',
        visitaId: '',
        mansioneIds: [],
        tipoGiudizio: 'IDONEO',
        dataScadenza: '',
        prescrizioniIdoneita: '',
        limitazioni: '',
        motivazioni: ''
    });

    // Load lavoratori (persons)
    const { data: lavoratoriResponse, isLoading: loadingLavoratori } = useQuery({
        queryKey: ['lavoratori-for-giudizio', tenantFilterKey],
        queryFn: async () => {
            const tenantParams = getTenantFilterParams();
            const params = new URLSearchParams();
            params.append('limit', '500');
            if (tenantParams.tenantIds) params.append('tenantIds', tenantParams.tenantIds.join(','));
            if (tenantParams.allTenants) params.append('allTenants', 'true');
            return apiGet<{ persons: Array<{ id: string; firstName: string; lastName: string; email?: string }> }>(
                `/api/v1/persons?${params.toString()}`
            );
        },
        enabled: isOpen && isReady
    });

    // Load medici competenti
    const { data: mediciResponse, isLoading: loadingMedici } = useQuery({
        queryKey: ['medici-for-giudizio', tenantFilterKey],
        queryFn: async () => {
            const tenantParams = getTenantFilterParams();
            return mediciApi.getAll({
                limit: 100,
                ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
                ...(tenantParams.allTenants && { allTenants: 'true' })
            });
        },
        enabled: isOpen && isReady
    });

    // Load mansioni
    const { data: mansioniResponse, isLoading: loadingMansioni } = useQuery({
        queryKey: ['mansioni-for-giudizio', tenantFilterKey],
        queryFn: async () => {
            const tenantParams = getTenantFilterParams();
            return clinicaApi.mansioni.getAll({
                limit: 500,
                ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
                ...(tenantParams.allTenants && { allTenants: 'true' })
            });
        },
        enabled: isOpen && isReady
    });

    // Load visite for selected person
    const { data: visiteResponse, isLoading: loadingVisite } = useQuery({
        queryKey: ['visite-for-giudizio', formState.personId, tenantFilterKey],
        queryFn: async () => {
            if (!formState.personId) return [];
            return visiteApi.getByPaziente(formState.personId);
        },
        enabled: isOpen && isReady && !!formState.personId
    });

    // P72_10: Load mansione attiva del lavoratore per auto-populate mansioneId
    const { data: workerRischiData } = useQuery({
        queryKey: ['worker-mansioni-giudizio', formState.personId],
        queryFn: () => clinicaApi.mansioni.getWorkerRisks(formState.personId),
        enabled: isOpen && isReady && !!formState.personId,
    });

    // Populate form when editing
    useEffect(() => {
        if (mode === 'edit' && giudizio) {
            setFormState({
                personId: giudizio.personId || '',
                medicoCompetenteId: giudizio.medicoCompetenteId || '',
                visitaId: giudizio.visitaId || '',
                mansioneIds: giudizio.mansioni?.map(m => m.mansioneId) || [],
                tipoGiudizio: giudizio.tipoGiudizio || 'IDONEO',
                dataScadenza: giudizio.dataScadenza ?
                    new Date(giudizio.dataScadenza).toISOString().split('T')[0] : '',
                prescrizioniIdoneita: decodeOptionsToLabels(giudizio.prescrizioniIdoneita || '', PRESCRIZIONI_OPTIONS),
                limitazioni: decodeOptionsToLabels(giudizio.limitazioni || '', LIMITAZIONI_OPTIONS),
                motivazioni: giudizio.motivazioni || ''
            });
        } else if (mode === 'create') {
            setFormState({
                personId: prefillData?.personId || '',
                medicoCompetenteId: prefillData?.medicoCompetenteId || '',
                visitaId: prefillData?.visitaId || '',
                mansioneIds: prefillData?.mansioneIds || [],
                tipoGiudizio: 'IDONEO',
                dataScadenza: '',
                prescrizioniIdoneita: '',
                limitazioni: '',
                motivazioni: ''
            });
        }
        setErrors({});
    }, [mode, giudizio, isOpen, prefillData]);

    // P72_10: Auto-popola mansioneIds da tutte le mansioni attive del lavoratore
    useEffect(() => {
        if (!formState.personId || formState.mansioneIds.length > 0) return;
        const mansioni = (workerRischiData as any)?.data?.mansioni as Array<{ id: string }> | undefined;
        if (mansioni?.length) {
            setFormState(prev => ({ ...prev, mansioneIds: mansioni.map(m => m.id) }));
        }
    }, [workerRischiData, formState.personId, formState.mansioneIds.length]);

    // Default scadenza a 12 mesi quando cambia tipo giudizio
    useEffect(() => {
        if (mode === 'create' && !formState.dataScadenza) {
            const defaultScadenza = new Date();
            defaultScadenza.setFullYear(defaultScadenza.getFullYear() + 1);
            setFormState(prev => ({
                ...prev,
                dataScadenza: defaultScadenza.toISOString().split('T')[0]
            }));
        }
    }, [mode, formState.dataScadenza]);

    // Extract data from responses
    const lavoratori = useMemo(() => {
        // apiGet returns raw response: { persons: [...] }
        const data = (lavoratoriResponse as any)?.persons || [];
        return Array.isArray(data) ? data : [];
    }, [lavoratoriResponse]);

    const medici = useMemo(() => {
        // mediciApi.getAll uses extractPaginatedData, returns { data: [...] }
        const data = mediciResponse?.data || [];
        return Array.isArray(data) ? data : [];
    }, [mediciResponse]);

    const mansioni = useMemo(() => {
        // clinicaApi.mansioni.getAll uses extractPaginatedData, returns { data: [...] }
        const data = mansioniResponse?.data || [];
        return Array.isArray(data) ? data : [];
    }, [mansioniResponse]);

    const visite = useMemo(() => {
        // visiteApi.getByPaziente uses extractData, returns array directly
        const data = visiteResponse || [];
        return Array.isArray(data) ? data : [];
    }, [visiteResponse]);

    // Validation
    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formState.personId) {
            newErrors.personId = 'Seleziona un lavoratore';
        }
        if (!formState.medicoCompetenteId) {
            newErrors.medicoCompetenteId = 'Seleziona il medico competente';
        }
        if (!formState.tipoGiudizio) {
            newErrors.tipoGiudizio = 'Seleziona il tipo di giudizio';
        }

        // Prescrizioni/limitazioni obbligatorie per alcuni tipi
        if (formState.tipoGiudizio === 'IDONEO_CON_PRESCRIZIONI' && !formState.prescrizioniIdoneita.trim()) {
            newErrors.prescrizioniIdoneita = 'Le prescrizioni sono obbligatorie per questo tipo di giudizio';
        }
        if (formState.tipoGiudizio === 'IDONEO_CON_LIMITAZIONI' && !formState.limitazioni.trim()) {
            newErrors.limitazioni = 'Le limitazioni sono obbligatorie per questo tipo di giudizio';
        }

        // Motivazioni obbligatorie per giudizi non idonei (Art. 41 D.Lgs 81/08)
        if ((formState.tipoGiudizio === 'NON_IDONEO_PERMANENTE' || formState.tipoGiudizio === 'NON_IDONEO_TEMPORANEO')
            && !formState.motivazioni.trim()) {
            newErrors.motivazioni = 'Le motivazioni sono obbligatorie per i giudizi di non idoneità (Art. 41 D.Lgs 81/08)';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Submit handler
    const handleSubmit = async (e: React.FormEvent, asBozza = false) => {
        e.preventDefault();
        if (!asBozza && !validate()) return;
        // For bozza: only require personId and medicoCompetenteId
        if (asBozza) {
            const bozzaErrors: Record<string, string> = {};
            if (!formState.personId) bozzaErrors.personId = 'Seleziona un lavoratore';
            if (!formState.medicoCompetenteId) bozzaErrors.medicoCompetenteId = 'Seleziona il medico competente';
            if (Object.keys(bozzaErrors).length > 0) { setErrors(bozzaErrors); return; }
        }

        setIsSubmitting(true);
        try {
            const payload = {
                personId: formState.personId,
                medicoCompetenteId: formState.medicoCompetenteId,
                tipoGiudizio: formState.tipoGiudizio,
                ...(asBozza && { stato: 'BOZZA' as StatoGiudizio }),
                ...(formState.visitaId && { visitaId: formState.visitaId }),
                ...(formState.mansioneIds.length > 0 && { mansioneIds: formState.mansioneIds }),
                ...(formState.dataScadenza && { dataScadenza: new Date(formState.dataScadenza).toISOString() }),
                ...(formState.prescrizioniIdoneita && { prescrizioniIdoneita: formState.prescrizioniIdoneita }),
                ...(formState.limitazioni && { limitazioni: formState.limitazioni }),
                ...(formState.motivazioni && { motivazioni: formState.motivazioni })
            };

            let result: GiudizioIdoneita;
            if (mode === 'edit' && giudizio) {
                result = await clinicaApi.giudiziIdoneita.update(giudizio.id, payload);
            } else {
                result = await clinicaApi.giudiziIdoneita.create(payload);
            }

            onSuccess(result);
        } catch (error) {
            const errorMessage = 'Errore sconosciuto';
            setErrors({ submit: errorMessage || 'Errore durante il salvataggio. Riprova.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isLoading = loadingLavoratori || loadingMedici || loadingMansioni;

    const modalTitle = mode === 'create' ? 'Nuovo Giudizio di Idoneità' : 'Modifica Giudizio';

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={modalTitle}
            size="xl"
        >
            <form onSubmit={handleSubmit} className="flex flex-col" style={{ maxHeight: '75vh' }}>
                <div className="flex-1 overflow-y-auto space-y-6 pr-1 pb-2 min-h-0">
                    {/* Edit mode: show existing person + mansione info prominently */}
                    {mode === 'edit' && giudizio && (giudizio.person || giudizio.mansioni?.length) && (
                        <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-1">
                            {giudizio.person && (
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-teal-600 shrink-0" />
                                    <span className="text-sm font-medium text-teal-900">
                                        {giudizio.person.firstName} {giudizio.person.lastName}
                                        {giudizio.person.taxCode && (
                                            <span className="ml-1 text-teal-600 font-normal text-xs">({giudizio.person.taxCode})</span>
                                        )}
                                    </span>
                                </div>
                            )}
                            {giudizio.mansioni && giudizio.mansioni.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <Briefcase className="h-4 w-4 text-teal-600 shrink-0" />
                                    <span className="text-sm text-teal-800">
                                        {giudizio.mansioni.map(m => m.mansione?.denominazione).filter(Boolean).join(', ')}
                                    </span>
                                </div>
                            )}
                            {giudizio.medicoCompetente && (
                                <div className="flex items-center gap-2">
                                    <Stethoscope className="h-4 w-4 text-teal-600 shrink-0" />
                                    <span className="text-sm text-teal-800">
                                        {giudizio.medicoCompetente.firstName} {giudizio.medicoCompetente.lastName}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error banner */}
                    {errors.submit && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                            <p className="text-sm text-red-700">{errors.submit}</p>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                        </div>
                    ) : (
                        <>
                            {/* Lavoratore */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                                    <User className="h-4 w-4" />
                                    Lavoratore *
                                </label>
                                <select
                                    value={formState.personId}
                                    onChange={(e) => setFormState(prev => ({ ...prev, personId: e.target.value, visitaId: '' }))}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 ${errors.personId ? 'border-red-500' : 'border-gray-200'
                                        }`}
                                    disabled={mode === 'edit'}
                                >
                                    <option value="">-- Seleziona lavoratore --</option>
                                    {lavoratori.map((lav) => (
                                        <option key={lav.id} value={lav.id}>
                                            {lav.lastName} {lav.firstName}
                                            {lav.taxCode ? ` (${lav.taxCode})` : ''}
                                        </option>
                                    ))}
                                </select>
                                {errors.personId && (
                                    <p className="text-sm text-red-600 mt-1">{errors.personId}</p>
                                )}
                            </div>

                            {/* Medico Competente */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                                    <Stethoscope className="h-4 w-4" />
                                    Medico Competente *
                                </label>
                                <select
                                    value={formState.medicoCompetenteId}
                                    onChange={(e) => setFormState(prev => ({ ...prev, medicoCompetenteId: e.target.value }))}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 ${errors.medicoCompetenteId ? 'border-red-500' : 'border-gray-200'
                                        }`}
                                >
                                    <option value="">-- Seleziona medico --</option>
                                    {medici.map((medico) => (
                                        <option key={medico.id} value={medico.id}>
                                            {getMedicoTitle(medico.gender as 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED' | null)} {medico.lastName} {medico.firstName}
                                        </option>
                                    ))}
                                </select>
                                {errors.medicoCompetenteId && (
                                    <p className="text-sm text-red-600 mt-1">{errors.medicoCompetenteId}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Mansioni (multi-select) */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                                        <Briefcase className="h-4 w-4" />
                                        Mansioni
                                    </label>
                                    <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto p-2 space-y-1">
                                        {mansioni.length === 0 && (
                                            <p className="text-xs text-gray-400 text-center py-2">Nessuna mansione disponibile</p>
                                        )}
                                        {mansioni.map((mansione) => (
                                            <label
                                                key={mansione.id}
                                                className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors text-sm ${formState.mansioneIds.includes(mansione.id)
                                                    ? 'bg-teal-50 text-teal-800'
                                                    : 'hover:bg-gray-50 text-gray-700'
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={formState.mansioneIds.includes(mansione.id)}
                                                    onChange={(e) => {
                                                        setFormState(prev => ({
                                                            ...prev,
                                                            mansioneIds: e.target.checked
                                                                ? [...prev.mansioneIds, mansione.id]
                                                                : prev.mansioneIds.filter(id => id !== mansione.id)
                                                        }));
                                                    }}
                                                    className="h-3.5 w-3.5 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                                                />
                                                <span>{mansione.codice} - {mansione.denominazione}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {formState.mansioneIds.length > 0 && (
                                        <p className="text-xs text-teal-600 mt-1">
                                            {formState.mansioneIds.length} mansion{formState.mansioneIds.length === 1 ? 'e' : 'i'} selezionat{formState.mansioneIds.length === 1 ? 'a' : 'e'}
                                        </p>
                                    )}
                                </div>

                                {/* Visita collegata (opzionale) */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                                        <Calendar className="h-4 w-4" />
                                        Visita collegata
                                    </label>
                                    <select
                                        value={formState.visitaId}
                                        onChange={(e) => setFormState(prev => ({ ...prev, visitaId: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                                        disabled={!formState.personId || loadingVisite}
                                    >
                                        <option value="">-- Nessuna visita --</option>
                                        {visite.map((visita) => (
                                            <option key={visita.id} value={visita.id}>
                                                {visita.dataOra ? new Date(visita.dataOra).toLocaleDateString('it-IT') : 'Data N/D'} - {visita.prestazione?.nome || 'Visita MDL'}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Tipo Giudizio */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Tipo Giudizio *
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    {TIPI_GIUDIZIO.map(tipo => (
                                        <label
                                            key={tipo.value}
                                            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${formState.tipoGiudizio === tipo.value
                                                ? 'border-teal-500 bg-teal-50'
                                                : 'border-gray-200 hover:bg-gray-50'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="tipoGiudizio"
                                                value={tipo.value}
                                                checked={formState.tipoGiudizio === tipo.value}
                                                onChange={(e) => setFormState(prev => ({
                                                    ...prev,
                                                    tipoGiudizio: e.target.value as TipoGiudizioIdoneita
                                                }))}
                                                className="h-4 w-4 text-teal-600 focus:ring-teal-500"
                                            />
                                            <span className={`px-2 py-0.5 rounded text-sm font-medium ${tipo.color}`}>
                                                {tipo.label}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                                {errors.tipoGiudizio && (
                                    <p className="text-sm text-red-600 mt-1">{errors.tipoGiudizio}</p>
                                )}
                            </div>

                            {/* Data Scadenza */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                                    <Calendar className="h-4 w-4" />
                                    Data Scadenza
                                </label>
                                <DatePickerElegante
                                    value={formState.dataScadenza}
                                    onChange={(date) => setFormState(prev => ({ ...prev, dataScadenza: date ? date.toISOString().split('T')[0] : '' }))}
                                    theme="teal"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Default: 12 mesi dalla data corrente
                                </p>
                            </div>

                            {/* Prescrizioni (obbligatorie per IDONEO_CON_PRESCRIZIONI; sempre visibili in edit per revisione) */}
                            {(formState.tipoGiudizio === 'IDONEO_CON_PRESCRIZIONI' || formState.prescrizioniIdoneita || mode === 'edit') && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <label className="flex items-center gap-2 text-sm font-medium text-blue-800 mb-1">
                                        <ClipboardList className="h-4 w-4" />
                                        Prescrizioni {formState.tipoGiudizio === 'IDONEO_CON_PRESCRIZIONI' && <span className="text-red-500">*</span>}
                                    </label>
                                    <p className="text-xs text-blue-600 mb-2">
                                        Indicare le condizioni e misure operative che il lavoratore deve rispettare per svolgere la mansione (es. uso di DPI specifici, limitazioni di orario, controlli periodici).
                                    </p>
                                    <textarea
                                        value={formState.prescrizioniIdoneita}
                                        onChange={(e) => setFormState(prev => ({ ...prev, prescrizioniIdoneita: e.target.value }))}
                                        rows={3}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white ${errors.prescrizioniIdoneita ? 'border-red-500' : 'border-blue-300'
                                            }`}
                                        placeholder="Es. Obbligo uso mascherina FFP2, niente lavori in quota, visita semestrale..."
                                    />
                                    {errors.prescrizioniIdoneita && (
                                        <p className="text-sm text-red-600 mt-1">{errors.prescrizioniIdoneita}</p>
                                    )}
                                </div>
                            )}

                            {/* Limitazioni (obbligatorie per IDONEO_CON_LIMITAZIONI; sempre visibili in edit per revisione) */}
                            {(formState.tipoGiudizio === 'IDONEO_CON_LIMITAZIONI' || formState.limitazioni || mode === 'edit') && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <label className="flex items-center gap-2 text-sm font-medium text-yellow-800 mb-1">
                                        <Ban className="h-4 w-4" />
                                        Limitazioni {formState.tipoGiudizio === 'IDONEO_CON_LIMITAZIONI' && <span className="text-red-500">*</span>}
                                    </label>
                                    <p className="text-xs text-yellow-700 mb-2">
                                        Indicare le attività o esposizioni che il lavoratore non può svolgere o deve evitare nella mansione (es. no movimentazione manuale carichi, no esposizione a solventi, no lavori notturni).
                                    </p>
                                    <textarea
                                        value={formState.limitazioni}
                                        onChange={(e) => setFormState(prev => ({ ...prev, limitazioni: e.target.value }))}
                                        rows={3}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-400 bg-white ${errors.limitazioni ? 'border-red-500' : 'border-yellow-300'
                                            }`}
                                        placeholder="Es. Vietata movimentazione manuale carichi >10 kg, no esposizione a rumore >80 dB..."
                                    />
                                    {errors.limitazioni && (
                                        <p className="text-sm text-red-600 mt-1">{errors.limitazioni}</p>
                                    )}
                                </div>
                            )}

                            {/* Motivazioni (per giudizi di non idoneità; sempre visibili in edit per revisione) */}
                            {(formState.tipoGiudizio === 'NON_IDONEO_TEMPORANEO' || formState.tipoGiudizio === 'NON_IDONEO_PERMANENTE' || formState.motivazioni || mode === 'edit') && (
                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                                        Motivazioni
                                    </label>
                                    <textarea
                                        value={formState.motivazioni}
                                        onChange={(e) => setFormState(prev => ({ ...prev, motivazioni: e.target.value }))}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                                        placeholder="Inserisci le motivazioni del giudizio..."
                                    />
                                </div>
                            )}
                        </>
                    )}

                </div>{/* end scrollable content */}

                {/* Actions - sticky at bottom */}
                <div className="flex justify-end gap-3 pt-4 border-t mt-2 flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        disabled={isSubmitting}
                    >
                        Annulla
                    </button>
                    <button
                        type="button"
                        onClick={(e) => handleSubmit(e as unknown as React.FormEvent, true)}
                        className="px-4 py-2 text-amber-700 bg-amber-50 border border-amber-300 rounded-lg hover:bg-amber-100 disabled:opacity-50 flex items-center gap-2"
                        disabled={isSubmitting || isLoading}
                    >
                        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        Salva come Bozza
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
                        disabled={isSubmitting || isLoading}
                    >
                        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {mode === 'create' ? 'Crea Giudizio' : 'Salva Modifiche'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default GiudizioFormModal;
