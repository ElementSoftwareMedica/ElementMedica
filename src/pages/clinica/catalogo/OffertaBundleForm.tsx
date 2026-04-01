/**
 * OffertaBundleForm Component
 * 
 * Form per creazione/modifica bundle di prestazioni con prezzi scontati.
 * Allineato allo schema Prisma OffertaBundle + OffertaBundlePrestazione.
 * 
 * Campi:
 * - codice (opzionale)
 * - nome (required)
 * - descrizione (opzionale)
 * - prestazioni con quantità e flag obbligatoria
 * - prezzoBundle (calcolato o override)
 * - scontoPercentuale (alternativa a prezzoBundle)
 * - compensoMedicoTipo/Valore (come distribuire il compenso)
 * - validoDa/validoA
 * - attivo
 * 
 * @module pages/clinica/catalogo/OffertaBundleForm
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft,
    Save,
    Loader2,
    Package,
    Calendar,
    Plus,
    Trash2,
    Info,
    AlertCircle,
    Euro,
    Percent,
    GripVertical,
    Tag,
    TrendingDown,
    Clock,
    Ticket,
    Users,
    Search,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import {
    bundleApi,
    prestazioniApi,
    OffertaBundlePrestazione,
    OffertaBundleInput,
    Prestazione,
    TipoCompensoMedico
} from '../../../services/clinicaApi';
import { apiGet } from '../../../services/api';
import { useToast } from '../../../hooks/useToast';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { DatePickerElegante } from '../../../components/ui/DatePickerElegante';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import '../../../styles/clinica-theme.css';

// =====================================================
// TYPES
// =====================================================

// Type for CodiceSconto from /api/v1/codici-sconto
interface CodiceSconto {
    id: string;
    codice: string;
    nome: string;
    descrizione?: string;
    tipoSconto: 'PERCENTUALE' | 'VALORE_ASSOLUTO';
    valore: number;
    dataInizio: string;
    dataFine: string;
    attivo: boolean;
    applicabileServizi: string[];
    tenantId: string;
}

interface PrestazioneItem {
    prestazioneId: string;
    quantita: number;
    obbligatoria: boolean;
    ordine: number;
    // Cached data for display
    nome?: string;
    prezzo?: number;      // prezzoBase from prestazione
    durata?: number;      // durataPrevista from prestazione
}

type TipoScontoBundle = 'percentuale' | 'assoluto' | 'prezzo_fisso' | 'codice_sconto';

interface FormData {
    codice: string;
    nome: string;
    descrizione: string;
    prestazioni: PrestazioneItem[];
    prezzoBundle: string;
    tipoSconto: TipoScontoBundle;  // NEW: type of discount
    useScontoPercentuale: boolean;  // Keep for backward compat
    scontoPercentuale: string;
    scontoAssoluto: string;         // NEW: absolute discount value
    durataBundle: string;  // Durata totale esecuzione in minuti
    compensoMedicoTipo: TipoCompensoMedico;
    compensoMedicoValore: string;
    compensoMedicoMinimo: string;
    compensoMedicoMassimo: string;
    validoDa: string;
    validoA: string;
    attivo: boolean;
    codiciScontoIds: string[];
}

interface FormErrors {
    [key: string]: string;
}

// =====================================================
// CONSTANTS
// =====================================================

const COMPENSO_TIPO_OPTIONS: { value: TipoCompensoMedico; label: string; description: string }[] = [
    { value: 'PERCENTUALE', label: 'Percentuale', description: 'Percentuale sul prezzo bundle' },
    { value: 'FISSO', label: 'Fisso', description: 'Importo fisso indipendente dal prezzo' },
    { value: 'MINIMO_MASSIMO', label: 'Min/Max', description: 'Percentuale con limiti min/max' },
];

const getInitialFormData = (): FormData => ({
    codice: '',
    nome: '',
    descrizione: '',
    prestazioni: [],
    prezzoBundle: '',
    tipoSconto: 'percentuale',
    useScontoPercentuale: true,
    scontoPercentuale: '10',
    scontoAssoluto: '',
    durataBundle: '',
    compensoMedicoTipo: 'PERCENTUALE',
    compensoMedicoValore: '30',
    compensoMedicoMinimo: '',
    compensoMedicoMassimo: '',
    validoDa: new Date().toISOString().split('T')[0],
    validoA: '',
    attivo: true,
    codiciScontoIds: [],
});

// =====================================================
// HELPER FUNCTIONS
// =====================================================

const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR'
    }).format(value);
};

// =====================================================
// MAIN COMPONENT
// =====================================================

const OffertaBundleForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { getTenantFilterParams, tenantFilterKey, isReady: isTenantFilterReady } = useTenantFilter();
    const { confirmWarning } = useConfirmDialog();
    const isEditing = Boolean(id);

    // State
    const [formData, setFormData] = useState<FormData>(getInitialFormData());
    const [errors, setErrors] = useState<FormErrors>({});
    const [isDirty, setIsDirty] = useState(false);
    const [codiciScontoSearch, setCodiciScontoSearch] = useState('');
    const [showAllCodiciSconto, setShowAllCodiciSconto] = useState(false);
    const MAX_VISIBLE_CODICI_SCONTO = 6;

    // Queries for dropdowns - now with tenant filter to ensure consistency
    const { data: prestazioniResponse, isLoading: isLoadingPrestazioni } = useQuery({
        queryKey: ['prestazioni', { limit: 100, attivo: true }, tenantFilterKey],
        queryFn: () => {
            const tenantParams = getTenantFilterParams();
            return prestazioniApi.getAll({
                limit: 100,
                attivo: true,
                ...tenantParams
            });
        },
        enabled: isTenantFilterReady
    });

    // Query for discount codes - fetch from /api/v1/codici-sconto
    // Filter for applicabileServizi containing BUNDLE or VISITA
    const { data: codiciScontoResponse, isLoading: isLoadingCodiciSconto } = useQuery({
        queryKey: ['codici-sconto', 'for-bundle', tenantFilterKey],
        queryFn: async () => {
            const tenantParams = getTenantFilterParams();
            const queryParams = new URLSearchParams();
            queryParams.set('limit', '100');
            queryParams.set('attivo', 'true');
            if (tenantParams.allTenants) {
                queryParams.set('allTenants', 'true');
            }
            if (tenantParams.tenantIds && tenantParams.tenantIds.length > 0) {
                queryParams.set('tenantIds', tenantParams.tenantIds.join(','));
            }
            const response = await apiGet<{ success: boolean; data: CodiceSconto[] }>(`/api/v1/codici-sconto?${queryParams.toString()}`);
            return response;
        },
        enabled: isTenantFilterReady
    });

    // Query for editing
    const { data: bundle, isLoading: isLoadingBundle } = useQuery({
        queryKey: ['bundles', id],
        queryFn: () => bundleApi.getById(id!),
        enabled: isEditing,
    });

    // Calculate prices directly from prestazioni.prezzoBase (no need to query listini)
    // Price and duration are stored in PrestazioneItem when adding

    // Populate form when editing
    useEffect(() => {
        if (bundle) {
            const prestazioni: PrestazioneItem[] = (bundle.prestazioni || []).map((p: OffertaBundlePrestazione, idx: number) => ({
                prestazioneId: p.prestazioneId,
                quantita: p.quantita || 1,
                obbligatoria: p.obbligatoria ?? true,
                ordine: p.ordine ?? idx,
                nome: p.prestazione?.nome,
                prezzo: p.prestazione?.prezzoBase || 0,
                durata: p.prestazione?.durataPrevista || 30,
            }));

            // Determine discount type from existing data
            let tipoSconto: TipoScontoBundle = 'percentuale';
            if (bundle.codiciScontoIds && bundle.codiciScontoIds.length > 0) {
                tipoSconto = 'codice_sconto';
            } else if (bundle.prezzoBundle && !bundle.scontoPercentuale) {
                tipoSconto = 'prezzo_fisso';
            } else if (bundle.scontoPercentuale) {
                tipoSconto = 'percentuale';
            }

            setFormData({
                codice: bundle.codice || '',
                nome: bundle.nome || '',
                descrizione: bundle.descrizione || '',
                prestazioni,
                prezzoBundle: bundle.prezzoBundle ? String(bundle.prezzoBundle) : '',
                tipoSconto,
                useScontoPercentuale: !bundle.prezzoBundle && !!bundle.scontoPercentuale,
                scontoPercentuale: bundle.scontoPercentuale ? String(bundle.scontoPercentuale) : '10',
                scontoAssoluto: '',
                durataBundle: bundle.durataBundle ? String(bundle.durataBundle) : '',
                compensoMedicoTipo: bundle.compensoMedicoTipo || 'PERCENTUALE',
                compensoMedicoValore: bundle.compensoMedicoValore ? String(bundle.compensoMedicoValore) : '30',
                compensoMedicoMinimo: bundle.compensoMedicoMinimo ? String(bundle.compensoMedicoMinimo) : '',
                compensoMedicoMassimo: bundle.compensoMedicoMassimo ? String(bundle.compensoMedicoMassimo) : '',
                validoDa: bundle.validoDa ? bundle.validoDa.split('T')[0] : '',
                validoA: bundle.validoA ? bundle.validoA.split('T')[0] : '',
                attivo: bundle.attivo ?? true,
                codiciScontoIds: bundle.codiciScontoIds || [],
            });
        }
    }, [bundle]);

    // Extract arrays
    const prestazioniList = prestazioniResponse?.data || [];

    // Filter codici sconto by applicabileServizi (BUNDLE or VISITA) and attivo
    const allCodiciSconto = codiciScontoResponse?.data || [];
    const codiciScontoList = useMemo(() => {
        return allCodiciSconto.filter((cs: CodiceSconto) => {
            if (!cs.attivo) return false;
            // Check if dataFine is in the future
            if (new Date(cs.dataFine) < new Date()) return false;
            // Check if applicabileServizi includes BUNDLE or VISITA
            const servizi = cs.applicabileServizi || [];
            return servizi.includes('BUNDLE') || servizi.includes('VISITA');
        });
    }, [allCodiciSconto]);

    // Filtered and paginated codici sconto for display
    const filteredCodiciSconto = useMemo(() => {
        let filtered = codiciScontoList;

        // Apply search filter
        if (codiciScontoSearch.trim()) {
            const searchLower = codiciScontoSearch.toLowerCase().trim();
            filtered = filtered.filter((cs: CodiceSconto) =>
                cs.codice.toLowerCase().includes(searchLower) ||
                cs.nome.toLowerCase().includes(searchLower)
            );
        }

        return filtered;
    }, [codiciScontoList, codiciScontoSearch]);

    // Visible codici sconto (limited or all)
    const visibleCodiciSconto = useMemo(() => {
        // Always show selected ones first, then others
        const selected = filteredCodiciSconto.filter((cs: CodiceSconto) => formData.codiciScontoIds.includes(cs.id));
        const notSelected = filteredCodiciSconto.filter((cs: CodiceSconto) => !formData.codiciScontoIds.includes(cs.id));
        const sorted = [...selected, ...notSelected];

        if (showAllCodiciSconto || codiciScontoSearch.trim()) {
            return sorted;
        }
        return sorted.slice(0, MAX_VISIBLE_CODICI_SCONTO);
    }, [filteredCodiciSconto, formData.codiciScontoIds, showAllCodiciSconto, codiciScontoSearch]);

    const hasMoreCodiciSconto = filteredCodiciSconto.length > MAX_VISIBLE_CODICI_SCONTO && !showAllCodiciSconto && !codiciScontoSearch.trim();

    // Calculate totals - using prezzo from PrestazioneItem directly (no more prezziMap)
    const calcoliPrezzo = useMemo(() => {
        // Sum of individual prices and durations from prestazioni
        const prezzoSingoli = formData.prestazioni.reduce((sum, p) => {
            return sum + ((p.prezzo || 0) * p.quantita);
        }, 0);

        const durataTotale = formData.prestazioni.reduce((sum, p) => {
            return sum + ((p.durata || 30) * p.quantita);
        }, 0);

        let prezzoBundle = 0;
        let scontoEffettivo = 0;
        let risparmio = 0;

        switch (formData.tipoSconto) {
            case 'percentuale': {
                const sconto = parseFloat(formData.scontoPercentuale) || 0;
                prezzoBundle = prezzoSingoli * (1 - sconto / 100);
                scontoEffettivo = sconto;
                risparmio = prezzoSingoli - prezzoBundle;
                break;
            }
            case 'assoluto': {
                const scontoVal = parseFloat(formData.scontoAssoluto) || 0;
                prezzoBundle = Math.max(0, prezzoSingoli - scontoVal);
                risparmio = scontoVal;
                scontoEffettivo = prezzoSingoli > 0
                    ? (scontoVal / prezzoSingoli) * 100
                    : 0;
                break;
            }
            case 'prezzo_fisso': {
                prezzoBundle = parseFloat(formData.prezzoBundle) || prezzoSingoli;
                risparmio = prezzoSingoli - prezzoBundle;
                scontoEffettivo = prezzoSingoli > 0
                    ? (risparmio / prezzoSingoli) * 100
                    : 0;
                break;
            }
            case 'codice_sconto': {
                // With discount codes, use full price - discount is applied at checkout
                prezzoBundle = prezzoSingoli;
                risparmio = 0;
                scontoEffettivo = 0;
                break;
            }
        }

        return {
            prezzoSingoli,
            prezzoBundle,
            risparmio,
            scontoEffettivo,
            durataTotale,
        };
    }, [formData.prestazioni, formData.tipoSconto, formData.scontoPercentuale, formData.scontoAssoluto, formData.prezzoBundle]);

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: OffertaBundleInput) => {
            return bundleApi.create(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bundles'] });
            showToast({ type: 'success', message: 'Bundle creato con successo' });
            navigate('/poliambulatorio/catalogo/bundles');
        },
        onError: (error: Error & { response?: { data?: { error?: string; message?: string }; status?: number } }) => {

            // Handle specific error cases via status code
            const status = error.response?.status;
            if (status === 409) {
                showToast({ type: 'error', message: 'Il codice bundle è già in uso. Prova con un codice diverso.' });
            } else if (status === 404) {
                showToast({ type: 'error', message: 'Una o più prestazioni selezionate non sono più disponibili. Ricarica la pagina.' });
            } else if (status === 500) {
                showToast({ type: 'error', message: 'Errore del server. Riprova tra qualche secondo o contatta l\'assistenza.' });
            } else {
                showToast({ type: 'error', message: 'Errore durante la creazione del bundle' });
            }
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data: OffertaBundleInput) => bundleApi.update(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bundles'] });
            queryClient.invalidateQueries({ queryKey: ['bundles', id] });
            showToast({ type: 'success', message: 'Bundle aggiornato con successo' });
            navigate('/poliambulatorio/catalogo/bundles');
        },
        onError: (error: Error & { response?: { data?: { error?: string; message?: string }; status?: number } }) => {

            // Handle specific error cases via status code
            const status = error.response?.status;
            if (status === 409) {
                showToast({ type: 'error', message: 'Il codice bundle è già in uso. Prova con un codice diverso.' });
            } else if (status === 404) {
                showToast({ type: 'error', message: 'Il bundle non è stato trovato. Potrebbe essere stato eliminato.' });
            } else if (status === 500) {
                showToast({ type: 'error', message: 'Errore del server. Riprova tra qualche secondo o contatta l\'assistenza.' });
            } else {
                showToast({ type: 'error', message: 'Errore durante l\'aggiornamento del bundle' });
            }
        }
    });

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    // Validation
    const validate = useCallback((): boolean => {
        const newErrors: FormErrors = {};

        if (!formData.nome.trim()) {
            newErrors.nome = 'Il nome è obbligatorio';
        }

        if (formData.prestazioni.length < 2) {
            newErrors.prestazioni = 'Seleziona almeno 2 prestazioni per creare un bundle';
        }

        // Validate based on discount type
        switch (formData.tipoSconto) {
            case 'percentuale': {
                const sconto = parseFloat(formData.scontoPercentuale);
                if (isNaN(sconto) || sconto < 0 || sconto > 100) {
                    newErrors.scontoPercentuale = 'Lo sconto deve essere tra 0 e 100';
                }
                break;
            }
            case 'assoluto': {
                const sconto = parseFloat(formData.scontoAssoluto);
                if (isNaN(sconto) || sconto < 0) {
                    newErrors.scontoAssoluto = 'Inserisci un valore di sconto valido';
                }
                break;
            }
            case 'prezzo_fisso': {
                const prezzo = parseFloat(formData.prezzoBundle);
                if (isNaN(prezzo) || prezzo <= 0) {
                    newErrors.prezzoBundle = 'Inserisci un prezzo valido';
                }
                break;
            }
            case 'codice_sconto': {
                if (formData.codiciScontoIds.length === 0) {
                    newErrors.codiciScontoIds = 'Seleziona almeno un codice sconto';
                }
                break;
            }
        }

        if (formData.compensoMedicoTipo !== 'FISSO') {
            const valore = parseFloat(formData.compensoMedicoValore);
            if (isNaN(valore) || valore < 0 || valore > 100) {
                newErrors.compensoMedicoValore = 'La percentuale deve essere tra 0 e 100';
            }
        }

        if (formData.compensoMedicoTipo === 'FISSO') {
            const valore = parseFloat(formData.compensoMedicoValore);
            if (isNaN(valore) || valore < 0) {
                newErrors.compensoMedicoValore = 'Inserisci un importo valido';
            }
        }

        if (formData.validoA && formData.validoDa && new Date(formData.validoA) <= new Date(formData.validoDa)) {
            newErrors.validoA = 'La data fine deve essere successiva alla data inizio';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData]);

    // Handlers
    const handleChange = useCallback((field: keyof FormData, value: string | boolean | PrestazioneItem[] | string[]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);

        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    }, [errors]);

    const handleAddPrestazione = useCallback((prestazioneId: string) => {
        const prestazione = prestazioniList.find((p: Prestazione) => p.id === prestazioneId);
        if (!prestazione) return;

        // Check if already added
        if (formData.prestazioni.some(p => p.prestazioneId === prestazioneId)) {
            showToast({ type: 'warning', message: 'Prestazione già presente nel bundle' });
            return;
        }

        const newItem: PrestazioneItem = {
            prestazioneId,
            quantita: 1,
            obbligatoria: true,
            ordine: formData.prestazioni.length,
            nome: prestazione.nome,
            prezzo: prestazione.prezzoBase || 0,
            durata: prestazione.durataPrevista || 30,
        };

        handleChange('prestazioni', [...formData.prestazioni, newItem]);
    }, [formData.prestazioni, prestazioniList, handleChange, showToast]);

    const handleRemovePrestazione = useCallback((prestazioneId: string) => {
        const filtered = formData.prestazioni
            .filter(p => p.prestazioneId !== prestazioneId)
            .map((p, idx) => ({ ...p, ordine: idx }));
        handleChange('prestazioni', filtered);
    }, [formData.prestazioni, handleChange]);

    const handlePrestazioneChange = useCallback((
        prestazioneId: string,
        field: 'quantita' | 'obbligatoria',
        value: number | boolean
    ) => {
        const updated = formData.prestazioni.map(p =>
            p.prestazioneId === prestazioneId ? { ...p, [field]: value } : p
        );
        handleChange('prestazioni', updated);
    }, [formData.prestazioni, handleChange]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) {
            showToast({ type: 'error', message: 'Correggi gli errori nel form' });
            return;
        }

        // Calculate final price and discount based on tipo sconto
        let finalPrezzoBundle: number | undefined;
        let finalScontoPercentuale: number | undefined;
        let finalCodiciScontoIds: string[] | undefined;

        switch (formData.tipoSconto) {
            case 'percentuale':
                finalPrezzoBundle = calcoliPrezzo.prezzoBundle || 0;
                finalScontoPercentuale = parseFloat(formData.scontoPercentuale) || 0;
                break;
            case 'assoluto':
                finalPrezzoBundle = calcoliPrezzo.prezzoBundle || 0;
                finalScontoPercentuale = calcoliPrezzo.scontoEffettivo || 0; // Calculated
                break;
            case 'prezzo_fisso':
                finalPrezzoBundle = parseFloat(formData.prezzoBundle) || 0;
                finalScontoPercentuale = calcoliPrezzo.scontoEffettivo || 0; // Calculated
                break;
            case 'codice_sconto':
                finalPrezzoBundle = calcoliPrezzo.prezzoSingoli || 0; // Full price, discount applied via code
                finalCodiciScontoIds = formData.codiciScontoIds;
                break;
        }

        const submitData: OffertaBundleInput = {
            codice: formData.codice.trim() || undefined,
            nome: formData.nome.trim(),
            descrizione: formData.descrizione.trim() || undefined,
            prestazioni: formData.prestazioni.map(p => ({
                prestazioneId: p.prestazioneId,
                quantita: p.quantita,
                obbligatoria: p.obbligatoria,
                ordine: p.ordine,
            })),
            prezzoBundle: finalPrezzoBundle,
            scontoPercentuale: finalScontoPercentuale,
            durataBundle: formData.durataBundle
                ? (isNaN(parseInt(formData.durataBundle, 10)) ? undefined : parseInt(formData.durataBundle, 10))
                : (calcoliPrezzo.durataTotale || undefined),
            compensoMedicoTipo: formData.compensoMedicoTipo,
            compensoMedicoValore: formData.compensoMedicoValore
                ? (isNaN(parseFloat(formData.compensoMedicoValore)) ? undefined : parseFloat(formData.compensoMedicoValore))
                : undefined,
            compensoMedicoMinimo: formData.compensoMedicoMinimo
                ? (isNaN(parseFloat(formData.compensoMedicoMinimo)) ? undefined : parseFloat(formData.compensoMedicoMinimo))
                : undefined,
            compensoMedicoMassimo: formData.compensoMedicoMassimo
                ? (isNaN(parseFloat(formData.compensoMedicoMassimo)) ? undefined : parseFloat(formData.compensoMedicoMassimo))
                : undefined,
            validoDa: formData.validoDa || undefined,
            validoA: formData.validoA || undefined,
            attivo: formData.attivo,
            codiciScontoIds: finalCodiciScontoIds,
        };

        if (isEditing) {
            updateMutation.mutate(submitData);
        } else {
            createMutation.mutate(submitData);
        }
    };

    const handleCancel = async () => {
        if (isDirty && !(await confirmWarning('Modifiche non salvate', 'Hai modifiche non salvate. Vuoi uscire?'))) {
            return;
        }
        navigate('/poliambulatorio/catalogo/bundles');
    };

    // Loading state
    if (isEditing && isLoadingBundle) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            </div>
        );
    }

    // Available prestazioni (not yet added)
    const availablePrestazioni = prestazioniList.filter(
        (p: Prestazione) => !formData.prestazioni.some(fp => fp.prestazioneId === p.id)
    );

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={handleCancel}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {isEditing ? 'Modifica Bundle' : 'Nuovo Bundle'}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {isEditing ? 'Modifica i dettagli del pacchetto' : 'Crea un nuovo pacchetto di prestazioni'}
                    </p>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5 text-purple-500" />
                        Informazioni Base
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Codice */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Codice <span className="text-gray-400">(opzionale)</span>
                            </label>
                            <input
                                type="text"
                                value={formData.codice}
                                onChange={(e) => handleChange('codice', e.target.value)}
                                placeholder="Es. BUNDLE-001"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                        </div>

                        {/* Nome */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Nome <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.nome}
                                onChange={(e) => handleChange('nome', e.target.value)}
                                placeholder="Es. Check-Up Completo"
                                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent ${errors.nome
                                    ? 'border-red-500'
                                    : 'border-gray-300 dark:border-gray-600'
                                    }`}
                            />
                            {errors.nome && (
                                <p className="mt-1 text-sm text-red-500">{errors.nome}</p>
                            )}
                        </div>

                        {/* Descrizione - full width */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Descrizione <span className="text-gray-400">(opzionale)</span>
                            </label>
                            <textarea
                                value={formData.descrizione}
                                onChange={(e) => handleChange('descrizione', e.target.value)}
                                rows={3}
                                placeholder="Descrizione del pacchetto..."
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Prestazioni Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Tag className="w-5 h-5 text-blue-500" />
                        Prestazioni Incluse
                        <span className="ml-2 text-sm font-normal text-gray-500">
                            ({formData.prestazioni.length} selezionate)
                        </span>
                    </h2>

                    {/* Add Prestazione */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Aggiungi Prestazione
                        </label>
                        <div className="flex gap-2">
                            <select
                                id="add-prestazione-select"
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                                defaultValue=""
                                onChange={(e) => {
                                    if (e.target.value) {
                                        handleAddPrestazione(e.target.value);
                                        e.target.value = '';
                                    }
                                }}
                                disabled={isLoadingPrestazioni}
                            >
                                <option value="">Seleziona prestazione...</option>
                                {availablePrestazioni.map((p: Prestazione) => (
                                    <option key={p.id} value={p.id}>
                                        {p.codice ? `[${p.codice}] ` : ''}{p.nome}
                                    </option>
                                ))}
                            </select>
                            {isLoadingPrestazioni && (
                                <Loader2 className="w-5 h-5 animate-spin text-gray-400 self-center" />
                            )}
                        </div>
                    </div>

                    {/* Prestazioni List */}
                    {formData.prestazioni.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                            <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                            <p className="text-gray-500 dark:text-gray-400">
                                Nessuna prestazione selezionata
                            </p>
                            <p className="text-sm text-gray-400 dark:text-gray-500">
                                Seleziona almeno 2 prestazioni per creare un bundle
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {formData.prestazioni.map((item) => (
                                <div
                                    key={item.prestazioneId}
                                    className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                                >
                                    <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />

                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-900 dark:text-white truncate">
                                            {item.nome || prestazioniList.find((p: Prestazione) => p.id === item.prestazioneId)?.nome || 'Prestazione'}
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <Euro className="w-3 h-3" />
                                                {formatCurrency(item.prezzo || 0)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {item.durata || 30} min
                                            </span>
                                            {item.quantita > 1 && (
                                                <span className="text-teal-600 dark:text-teal-400 font-medium">
                                                    Tot: {formatCurrency((item.prezzo || 0) * item.quantita)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Quantità */}
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm text-gray-600 dark:text-gray-400">Qtà:</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={item.quantita}
                                            onChange={(e) => handlePrestazioneChange(
                                                item.prestazioneId,
                                                'quantita',
                                                parseInt(e.target.value) || 1
                                            )}
                                            className="w-16 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>

                                    {/* Obbligatoria Toggle */}
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={item.obbligatoria}
                                            onChange={(e) => handlePrestazioneChange(
                                                item.prestazioneId,
                                                'obbligatoria',
                                                e.target.checked
                                            )}
                                            className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                                        />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Obbl.</span>
                                    </label>

                                    {/* Remove */}
                                    <button
                                        type="button"
                                        onClick={() => handleRemovePrestazione(item.prestazioneId)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {errors.prestazioni && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-red-500">
                            <AlertCircle className="w-4 h-4" />
                            {errors.prestazioni}
                        </div>
                    )}
                </div>

                {/* Pricing Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Euro className="w-5 h-5 text-green-500" />
                        Prezzo Bundle
                    </h2>

                    {/* Price Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="text-center">
                            <div className="text-sm text-gray-500 dark:text-gray-400">Somma Singoli</div>
                            <div className={`text-lg font-semibold ${formData.tipoSconto === 'codice_sconto' ? 'text-teal-700 dark:text-teal-300' : 'text-gray-600 dark:text-gray-300 line-through'}`}>
                                {formatCurrency(calcoliPrezzo.prezzoSingoli)}
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-sm text-gray-500 dark:text-gray-400">Durata Tot.</div>
                            <div className="text-lg font-semibold text-purple-700 dark:text-purple-300 flex items-center justify-center gap-1">
                                <Clock className="w-4 h-4" />
                                {calcoliPrezzo.durataTotale} min
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-sm text-teal-600 dark:text-teal-400">Prezzo Bundle</div>
                            <div className="text-xl font-bold text-teal-700 dark:text-teal-300">
                                {formatCurrency(calcoliPrezzo.prezzoBundle)}
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-sm text-green-600 dark:text-green-400 flex items-center justify-center gap-1">
                                <TrendingDown className="w-3 h-3" />
                                Risparmio
                            </div>
                            <div className="text-lg font-bold text-green-700 dark:text-green-300">
                                {calcoliPrezzo.scontoEffettivo > 0 ? (
                                    <>
                                        {calcoliPrezzo.scontoEffettivo.toFixed(0)}%
                                        <span className="text-sm font-normal ml-1">
                                            ({formatCurrency(calcoliPrezzo.risparmio)})
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-gray-400 text-sm font-normal">Vedi codice</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Discount Type Selection */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Tipo di Sconto
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {[
                                { value: 'percentuale' as const, label: 'Sconto %', icon: Percent, desc: 'Es: 10% di sconto' },
                                { value: 'assoluto' as const, label: 'Sconto €', icon: Euro, desc: 'Es: -50€ sul totale' },
                                { value: 'prezzo_fisso' as const, label: 'Prezzo Fisso', icon: Tag, desc: 'Imposta prezzo finale' },
                                { value: 'codice_sconto' as const, label: 'Codice Sconto', icon: Ticket, desc: 'Usa codice al checkout' },
                            ].map((opt) => {
                                const Icon = opt.icon;
                                const isActive = formData.tipoSconto === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => {
                                            handleChange('tipoSconto', opt.value);
                                            // Reset related fields
                                            if (opt.value !== 'codice_sconto') {
                                                handleChange('codiciScontoIds', []);
                                            }
                                        }}
                                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${isActive
                                            ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                                            : 'border-gray-200 dark:border-gray-600 hover:border-teal-300 dark:hover:border-teal-700'
                                            }`}
                                    >
                                        <Icon className={`w-5 h-5 ${isActive ? 'text-teal-600' : 'text-gray-400'}`} />
                                        <span className={`text-sm font-medium ${isActive ? 'text-teal-700 dark:text-teal-300' : 'text-gray-600 dark:text-gray-400'}`}>
                                            {opt.label}
                                        </span>
                                        <span className="text-xs text-gray-400 dark:text-gray-500 text-center">
                                            {opt.desc}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Discount Input based on type */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {formData.tipoSconto === 'percentuale' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Sconto Percentuale
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.5"
                                        value={formData.scontoPercentuale}
                                        onChange={(e) => handleChange('scontoPercentuale', e.target.value)}
                                        className={`w-full pl-4 pr-10 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent ${errors.scontoPercentuale ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                            }`}
                                    />
                                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                </div>
                                {errors.scontoPercentuale && (
                                    <p className="mt-1 text-sm text-red-500">{errors.scontoPercentuale}</p>
                                )}
                            </div>
                        )}

                        {formData.tipoSconto === 'assoluto' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Sconto in Euro
                                </label>
                                <div className="relative">
                                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.scontoAssoluto}
                                        onChange={(e) => handleChange('scontoAssoluto', e.target.value)}
                                        placeholder={`Max: ${calcoliPrezzo.prezzoSingoli.toFixed(2)}`}
                                        className={`w-full pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent ${errors.scontoAssoluto ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                            }`}
                                    />
                                </div>
                                {errors.scontoAssoluto && (
                                    <p className="mt-1 text-sm text-red-500">{errors.scontoAssoluto}</p>
                                )}
                            </div>
                        )}

                        {formData.tipoSconto === 'prezzo_fisso' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Prezzo Bundle Finale
                                </label>
                                <div className="relative">
                                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.prezzoBundle}
                                        onChange={(e) => handleChange('prezzoBundle', e.target.value)}
                                        placeholder={calcoliPrezzo.prezzoSingoli.toFixed(2)}
                                        className={`w-full pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent ${errors.prezzoBundle ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                            }`}
                                    />
                                </div>
                                {errors.prezzoBundle && (
                                    <p className="mt-1 text-sm text-red-500">{errors.prezzoBundle}</p>
                                )}
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Inserisci il prezzo finale desiderato. Lo sconto viene calcolato automaticamente.
                                </p>
                            </div>
                        )}

                        {formData.tipoSconto === 'codice_sconto' && (
                            <div className="md:col-span-2">
                                <p className="text-sm text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-2">
                                    <Info className="w-4 h-4" />
                                    Il bundle verrà venduto a prezzo pieno. Lo sconto sarà applicato al checkout usando il codice.
                                </p>
                                {errors.codiciScontoIds && (
                                    <p className="mt-1 text-sm text-red-500">{errors.codiciScontoIds}</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Integrated Codici Sconto Selection - Only when tipoSconto === 'codice_sconto' */}
                    {formData.tipoSconto === 'codice_sconto' && (
                        <div className="mt-6 pt-6 border-t border-teal-200 dark:border-teal-700">
                            <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                <Ticket className="w-4 h-4 text-teal-500" />
                                Seleziona Codici Sconto
                                <span className="ml-2 text-sm font-normal text-gray-500">
                                    ({formData.codiciScontoIds.length} selezionati)
                                </span>
                            </h3>

                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1">
                                <Info className="w-3 h-3" />
                                Mostra codici con Applicabilità "Bundle/Pacchetti" o "Visite Mediche"
                            </p>

                            {/* Search input for codici sconto */}
                            {codiciScontoList.length > MAX_VISIBLE_CODICI_SCONTO && (
                                <div className="relative mb-3">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={codiciScontoSearch}
                                        onChange={(e) => setCodiciScontoSearch(e.target.value)}
                                        placeholder="Cerca codice sconto per nome o codice..."
                                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                    />
                                    {codiciScontoSearch && (
                                        <button
                                            type="button"
                                            onClick={() => setCodiciScontoSearch('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Loading state */}
                            {isLoadingCodiciSconto ? (
                                <div className="flex items-center justify-center py-6">
                                    <Loader2 className="w-5 h-5 animate-spin text-teal-500" />
                                    <span className="ml-2 text-sm text-gray-500">Caricamento...</span>
                                </div>
                            ) : codiciScontoList.length === 0 ? (
                                <div className="text-center py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                                    <Ticket className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Nessun codice sconto disponibile
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                        Crea codici sconto in Management → Codici Sconto
                                    </p>
                                </div>
                            ) : filteredCodiciSconto.length === 0 ? (
                                <div className="text-center py-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Nessun codice sconto trovato per "{codiciScontoSearch}"
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {visibleCodiciSconto.map((sconto: CodiceSconto) => {
                                            const isSelected = formData.codiciScontoIds.includes(sconto.id);
                                            return (
                                                <label
                                                    key={sconto.id}
                                                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${isSelected
                                                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                                                        : 'border-gray-200 dark:border-gray-600 hover:border-teal-300 dark:hover:border-teal-700'
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                handleChange('codiciScontoIds', [...formData.codiciScontoIds, sconto.id]);
                                                            } else {
                                                                handleChange('codiciScontoIds', formData.codiciScontoIds.filter(id => id !== sconto.id));
                                                            }
                                                        }}
                                                        className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-medium text-sm text-gray-900 dark:text-white">
                                                                {sconto.codice}
                                                            </span>
                                                            <span className={`px-1.5 py-0.5 text-xs rounded-full ${sconto.tipoSconto === 'PERCENTUALE'
                                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                                }`}>
                                                                {sconto.tipoSconto === 'PERCENTUALE' ? `${sconto.valore}%` : `€${sconto.valore}`}
                                                            </span>
                                                            {sconto.applicabileServizi.map((servizio: string) => (
                                                                <span key={servizio} className="px-1 py-0.5 text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded">
                                                                    {servizio === 'BUNDLE' ? '📦' : servizio === 'VISITA' ? '🏥' : servizio}
                                                                </span>
                                                            ))}
                                                        </div>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">{sconto.nome}</span>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>

                                    {/* Show more / Show less button */}
                                    {hasMoreCodiciSconto && !codiciScontoSearch && (
                                        <button
                                            type="button"
                                            onClick={() => setShowAllCodiciSconto(!showAllCodiciSconto)}
                                            className="mt-3 w-full py-2 text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 border border-teal-200 dark:border-teal-700 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors flex items-center justify-center gap-2"
                                        >
                                            {showAllCodiciSconto ? (
                                                <>
                                                    <ChevronUp className="w-4 h-4" />
                                                    Mostra meno
                                                </>
                                            ) : (
                                                <>
                                                    <ChevronDown className="w-4 h-4" />
                                                    Mostra altri {filteredCodiciSconto.length - MAX_VISIBLE_CODICI_SCONTO} codici
                                                </>
                                            )}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Durata Bundle Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-purple-500" />
                        Durata Esecuzione
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Durata Bundle (minuti)
                            </label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="number"
                                    min="5"
                                    max="480"
                                    placeholder="Es: 45"
                                    value={formData.durataBundle}
                                    onChange={(e) => handleChange('durataBundle', e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                />
                            </div>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Tempo totale per eseguire il bundle. Se vuoto, usa la somma delle durate delle prestazioni.
                            </p>
                        </div>

                        {/* Durata Calcolata - Solo visualizzazione */}
                        {formData.prestazioni.length > 0 && (
                            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                                <div className="text-sm text-purple-600 dark:text-purple-400">Durata Somma Prestazioni</div>
                                <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                                    {formData.prestazioni.reduce((sum, p) => {
                                        const prest = prestazioniList.find(pr => pr.id === p.prestazioneId);
                                        return sum + ((prest?.durataPrevista || 30) * p.quantita);
                                    }, 0)} min
                                </div>
                                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                                    Usata se non imposti una durata bundle personalizzata
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Compenso Medico Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Percent className="w-5 h-5 text-orange-500" />
                        Compenso Medico
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Tipo */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Tipo Compenso
                            </label>
                            <select
                                value={formData.compensoMedicoTipo}
                                onChange={(e) => handleChange('compensoMedicoTipo', e.target.value as TipoCompensoMedico)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                            >
                                {COMPENSO_TIPO_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {COMPENSO_TIPO_OPTIONS.find(o => o.value === formData.compensoMedicoTipo)?.description}
                            </p>
                        </div>

                        {/* Valore */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {formData.compensoMedicoTipo === 'FISSO' ? 'Importo €' : 'Percentuale %'}
                            </label>
                            <input
                                type="number"
                                min="0"
                                max={formData.compensoMedicoTipo === 'FISSO' ? undefined : 100}
                                step={formData.compensoMedicoTipo === 'FISSO' ? '0.01' : '0.5'}
                                value={formData.compensoMedicoValore}
                                onChange={(e) => handleChange('compensoMedicoValore', e.target.value)}
                                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent ${errors.compensoMedicoValore
                                    ? 'border-red-500'
                                    : 'border-gray-300 dark:border-gray-600'
                                    }`}
                            />
                            {errors.compensoMedicoValore && (
                                <p className="mt-1 text-sm text-red-500">{errors.compensoMedicoValore}</p>
                            )}
                        </div>

                        {/* Minimo (solo per MINIMO_MASSIMO) */}
                        {formData.compensoMedicoTipo === 'MINIMO_MASSIMO' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Minimo €
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.compensoMedicoMinimo}
                                        onChange={(e) => handleChange('compensoMedicoMinimo', e.target.value)}
                                        placeholder="0.00"
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Massimo €
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.compensoMedicoMassimo}
                                        onChange={(e) => handleChange('compensoMedicoMassimo', e.target.value)}
                                        placeholder="Nessun limite"
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Validity Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-500" />
                        Validità e Stato
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Valido Da */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Valido Da
                            </label>
                            <DatePickerElegante
                                value={formData.validoDa}
                                onChange={(date) => handleChange('validoDa', date ? date.toISOString().split('T')[0] : '')}
                                theme="teal"
                            />
                        </div>

                        {/* Valido A */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Valido Fino A <span className="text-gray-400">(opzionale)</span>
                            </label>
                            <DatePickerElegante
                                value={formData.validoA}
                                onChange={(date) => handleChange('validoA', date ? date.toISOString().split('T')[0] : '')}
                                minDate={formData.validoDa ? new Date(formData.validoDa) : undefined}
                                theme="teal"
                            />
                            {errors.validoA && (
                                <p className="mt-1 text-sm text-red-500">{errors.validoA}</p>
                            )}
                        </div>

                        {/* Attivo */}
                        <div className="flex items-end">
                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 w-full">
                                <input
                                    type="checkbox"
                                    checked={formData.attivo}
                                    onChange={(e) => handleChange('attivo', e.target.checked)}
                                    className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                                />
                                <div>
                                    <div className="font-medium text-gray-900 dark:text-white">Attivo</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        Bundle disponibile per la vendita
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Info Box */}
                <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                        <strong>Nota:</strong> Il bundle raggruppa più prestazioni con un prezzo scontato.
                        Il compenso medico viene calcolato sul prezzo bundle e distribuito proporzionalmente
                        tra i medici che eseguono le singole prestazioni.
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        Annulla
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="clinica-button-primary flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Salvataggio...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                {isEditing ? 'Salva Modifiche' : 'Crea Bundle'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default OffertaBundleForm;
