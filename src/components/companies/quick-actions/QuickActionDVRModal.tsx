/**
 * QuickActionDVRModal - Modal per gestione DVR da CompanyDetails
 * 
 * Modal per caricare o aggiornare il Documento di Valutazione Rischi (DVR)
 * per una sede aziendale.
 * 
 * @module components/companies/quick-actions/QuickActionDVRModal
 * @project P58 - Company Details Enhancement
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
    Loader2,
    FileText,
    Calendar,
    MapPin,
    Upload,
    Info,
    AlertTriangle,
    CheckCircle2,
    User,
    Shield,
    Eye,
    ExternalLink,
    X,
    ShieldAlert
} from 'lucide-react';
import { useToast } from '../../../hooks/useToast';
import { useAuth } from '../../../context/AuthContext'; // P59: Per tenant dell'utente
import Modal from '../../../design-system/molecules/Modal/Modal';
import { apiGet, apiUpload } from '../../../services/api';
import { cn } from '../../../design-system/utils';
import { formatMedicoName } from '../../../utils/textFormatters';
import { DatePickerElegante } from '../../ui/DatePickerElegante';
import { ElegantSelect } from '../../ui/ElegantSelect';

interface QuickActionDVRModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    companyId: string;
    companyName: string;
    tenantId?: string; // P59: TenantId per cross-tenant operations
    editingDVRId?: string | null; // P59: ID del DVR da modificare (edit mode)
}

interface SiteOption {
    id: string;
    siteName: string;
    citta?: string;
    indirizzo?: string;
    dvr?: string;
    dvrDataRedazione?: string;
    dvrDataRevisione?: string;
    dvrNumeroRevisione?: number;
    rsppId?: string; // Legacy field (deprecated)
    rspp?: { id: string; firstName: string; lastName: string; email?: string } | null; // P59: RSPP completo
}

interface PersonOption {
    id: string;
    firstName: string;
    lastName: string;
    gender?: string;
    role?: string;
}

// P59: Definizione rischi per selezione nel DVR (da CodiceRischio in schema.prisma)
const RISCHI_DVR = {
    FISICI: [
        { code: 'RUM', label: 'Rumore', desc: 'Art. 190-192 D.Lgs 81/08' },
        { code: 'VIB_MB', label: 'Vibrazioni mano-braccio', desc: 'Art. 200-202' },
        { code: 'VIB_WBV', label: 'Vibrazioni corpo intero', desc: 'Art. 200-202' },
        { code: 'RAD_ION', label: 'Radiazioni ionizzanti', desc: 'D.Lgs 101/2020' },
        { code: 'RAD_NIR', label: 'Radiazioni non ionizzanti', desc: 'Art. 180' },
        { code: 'CEM', label: 'Campi elettromagnetici', desc: 'Art. 206-212' },
        { code: 'MIC', label: 'Microclima severo', desc: 'Art. 180' }
    ],
    CHIMICI: [
        { code: 'CHI', label: 'Agenti chimici', desc: 'Art. 221-232' },
        { code: 'CAN', label: 'Cancerogeni/mutageni', desc: 'Art. 233-245' },
        { code: 'AMI', label: 'Amianto', desc: 'Art. 246-261' },
        { code: 'PIO', label: 'Piombo', desc: 'Art. 229' },
        { code: 'POL', label: 'Polveri/silice', desc: 'Art. 225' }
    ],
    BIOLOGICI: [
        { code: 'BIO', label: 'Agenti biologici', desc: 'Art. 266-286' }
    ],
    ERGONOMICI: [
        { code: 'MMC', label: 'Movimentazione carichi', desc: 'Art. 167-171' },
        { code: 'MOV_RIP', label: 'Movimenti ripetitivi', desc: 'Arti superiori' },
        { code: 'POS', label: 'Posture incongrue', desc: 'Prolungate' }
    ],
    ORGANIZZATIVI: [
        { code: 'NOT', label: 'Lavoro notturno', desc: 'D.Lgs 66/2003' },
        { code: 'VDT', label: 'Videoterminale', desc: '>20h/settimana Art. 172-178' },
        { code: 'SLC', label: 'Stress lavoro-correlato', desc: 'Art. 28' }
    ],
    SPECIFICI: [
        { code: 'QUO', label: 'Lavoro in quota', desc: '>2m Art. 107' },
        { code: 'SPA_CON', label: 'Spazi confinati', desc: 'DPR 177/2011' },
        { code: 'GUI_MEZ', label: 'Guida mezzi', desc: 'Automezzi/macchine' },
        { code: 'ISO', label: 'Lavoro isolato', desc: '' },
        { code: 'IPE', label: 'Lavori con funi/ipogei', desc: 'Art. 116-121' }
    ],
    SETTORIALI: [
        { code: 'CAR_ELE', label: 'Carrelli elevatori', desc: '' },
        { code: 'ELE', label: 'Rischio elettrico', desc: 'Art. 80-87' },
        { code: 'INC', label: 'Incendio/emergenza', desc: 'DM 10/03/1998' },
        { code: 'ALC', label: 'Alcol/sostanze', desc: 'L. 125/2001' }
    ]
} as const;

export const QuickActionDVRModal: React.FC<QuickActionDVRModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    companyId,
    companyName,
    tenantId, // P59: TenantId per cross-tenant operations
    editingDVRId // P59: ID del DVR da modificare (edit mode)
}) => {
    const { showToast } = useToast();
    const { user } = useAuth(); // P59: Per ottenere tenant dell'utente loggato
    const dropZoneRef = useRef<HTMLDivElement>(null);

    // P59 Fix: Track if form has been initialized for this modal opening
    // This prevents resetting dvrFile when existingDVR updates
    const isInitializedRef = useRef(false);
    const previousIsOpenRef = useRef(false);

    // P59: Edit mode detection
    const isEditMode = !!editingDVRId;

    // Drag & drop state
    const [isDragging, setIsDragging] = useState(false);

    // P59: PDF Preview modal state
    const [showPdfPreview, setShowPdfPreview] = useState(false);

    // P59: Prepara headers per cross-tenant operations
    const operateTenantHeaders: Record<string, string> = tenantId ? { 'X-Operate-Tenant-Id': tenantId } : {};

    // P59: TenantId dell'utente loggato per filtrare gli esecutori DVR (RSPP)
    const userTenantId = user?.tenantId;

    // Form state
    const [formData, setFormData] = useState({
        siteId: '',
        esecutoreId: '', // Chi ha redatto il DVR (default RSPP)
        effettuatoDaOriginal: '', // P59 Fix: Valore originale di effettuatoDa per edit mode
        dvrFile: null as File | null,
        dataRedazione: '',
        dataScadenza: '', // Scadenza annuale
        dataRevisione: '',
        numeroRevisione: 1,
        note: '',
        tipoDVR: 'NUOVO' as 'NUOVO' | 'AGGIORNAMENTO_CON_MODIFICHE' | 'AGGIORNAMENTO_SENZA_MODIFICHE',
        rischiRilevati: [] as string[] // P59: Array di codici rischio selezionati
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // P59: Fetch dati DVR esistente per edit mode
    const { data: existingDVR, isLoading: isLoadingExisting } = useQuery({
        queryKey: ['dvr-edit', editingDVRId],
        queryFn: async () => {
            // P59 Fix: Il secondo param è params, il terzo è options con headers
            const response = await apiGet<any>(`/api/v1/dvr/${editingDVRId}`, {}, { headers: operateTenantHeaders });
            return response;
        },
        enabled: isOpen && isEditMode && !!editingDVRId,
        staleTime: 0 // Sempre fresh in edit mode
    });

    // Fetch sedi dell'azienda - SPOSTATO QUI per averlo prima dell'useEffect
    const { data: sitesData, isLoading: isLoadingSites } = useQuery({
        queryKey: ['company-sites-dvr', companyId],
        queryFn: async () => {
            const response = await apiGet<{ sites: SiteOption[] }>(`/api/v1/company-sites/company/${companyId}`);
            return response.sites || [];
        },
        staleTime: 60 * 1000,
        enabled: isOpen && !!companyId
    });

    const sites = sitesData || [];

    // Fetch professionisti che possono essere esecutori DVR (RSPP, consulenti sicurezza)
    // P59: SPOSTATO QUI per averlo prima dell'useEffect di inizializzazione
    const { data: esecutoriData } = useQuery({
        queryKey: ['dvr-esecutori', userTenantId],
        queryFn: async () => {
            // Recupera persone con ruoli pertinenti (RSPP, consulenti)
            const response = await apiGet<{ data: PersonOption[] }>('/api/v1/persons', {
                roleType: 'RSPP,CONSULENTE_SICUREZZA,TECNICO_SICUREZZA',
                tenantId: userTenantId, // P59: Filtra per tenant utente
                limit: 100
            });
            return response.data || [];
        },
        staleTime: 60 * 1000,
        enabled: isOpen && !!userTenantId
    });

    const esecutori = esecutoriData || [];

    // P59 Fix: Track se abbiamo già fatto il match esecutore per prevenire loop
    const esecutoreMatchedRef = useRef(false);

    // Reset form quando si apre o quando cambiano i dati esistenti
    useEffect(() => {
        // P59 Fix: Detect when modal opens (transition from closed to open)
        const justOpened = isOpen && !previousIsOpenRef.current;
        previousIsOpenRef.current = isOpen;

        // Reset initialization flag when modal closes
        if (!isOpen) {
            isInitializedRef.current = false;
            esecutoreMatchedRef.current = false;
            return;
        }

        // Only initialize form data once when modal opens
        // Don't reset if already initialized (to preserve user-selected file)
        if (isInitializedRef.current && !justOpened) {
            return;
        }

        if (isEditMode && existingDVR) {
            // Edit mode: popola con dati esistenti
            // P59: Parse rischiRilevati da JSON string se presente
            let parsedRischi: string[] = [];
            if (existingDVR.rischiRilevati) {
                try {
                    parsedRischi = JSON.parse(existingDVR.rischiRilevati);
                } catch {
                    // Se non è JSON, prova a splittare per virgola
                    parsedRischi = existingDVR.rischiRilevati.split(',').map((r: string) => r.trim()).filter(Boolean);
                }
            }

            setFormData({
                siteId: existingDVR.siteId || '',
                esecutoreId: '', // Verrà popolato dall'useEffect dedicato quando esecutori sono disponibili
                effettuatoDaOriginal: existingDVR.effettuatoDa || '', // P59 Fix: Salva valore originale
                dvrFile: null, // File non viene ri-scaricato, l'utente può caricare uno nuovo
                dataRedazione: existingDVR.dataEsecuzione?.split('T')[0] || '',
                tipoDVR: (existingDVR.tipoDVR as 'NUOVO' | 'AGGIORNAMENTO_CON_MODIFICHE' | 'AGGIORNAMENTO_SENZA_MODIFICHE') || 'NUOVO',
                dataScadenza: existingDVR.dataScadenza?.split('T')[0] || '',
                dataRevisione: existingDVR.dataRevisione?.split('T')[0] || '',
                numeroRevisione: existingDVR.numeroRevisione || 1,
                note: existingDVR.note || '',
                rischiRilevati: parsedRischi
            });
            isInitializedRef.current = true;
        } else if (!isEditMode && justOpened) {
            // Create mode: valori di default (only on first open)
            const today = new Date();
            const nextYear = new Date(today);
            nextYear.setFullYear(today.getFullYear() + 1);

            setFormData({
                siteId: '',
                esecutoreId: '',
                effettuatoDaOriginal: '',
                dvrFile: null,
                dataRedazione: today.toISOString().split('T')[0],
                tipoDVR: 'NUOVO' as 'NUOVO' | 'AGGIORNAMENTO_CON_MODIFICHE' | 'AGGIORNAMENTO_SENZA_MODIFICHE',
                dataScadenza: nextYear.toISOString().split('T')[0], // Scadenza annuale default
                dataRevisione: '',
                numeroRevisione: 1,
                note: '',
                rischiRilevati: []
            });
            isInitializedRef.current = true;
        }
        setErrors({});
        setIsDragging(false);
    }, [isOpen, isEditMode, existingDVR]); // P59 Fix: Rimosso esecutori dalle deps per evitare loop infinito

    // P59 Fix: Effetto separato per matchare effettuatoDa con esecutore quando i dati sono disponibili
    useEffect(() => {
        if (!isEditMode || !existingDVR?.effettuatoDa || esecutori.length === 0 || esecutoreMatchedRef.current) {
            return;
        }

        // Cerca match esatto o parziale nel nome
        const matchedEsecutore = esecutori.find(e => {
            const fullName = formatMedicoName({
                firstName: e.firstName,
                lastName: e.lastName,
                gender: e.gender as 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED' | null
            });
            return fullName === existingDVR.effettuatoDa ||
                `${e.lastName} ${e.firstName}` === existingDVR.effettuatoDa ||
                `${e.firstName} ${e.lastName}` === existingDVR.effettuatoDa;
        });

        if (matchedEsecutore) {
            esecutoreMatchedRef.current = true;
            setFormData(prev => ({
                ...prev,
                esecutoreId: matchedEsecutore.id
            }));
        }
    }, [isEditMode, existingDVR?.effettuatoDa, esecutori.length]); // P59: Dipendenze stabili per evitare loop

    // P59: Fetch RSPP nominato per l'azienda (per auto-selezione "Redatto da")
    const { data: nominaRsppData } = useQuery({
        queryKey: ['nomina-rspp-azienda', companyId, tenantId],
        queryFn: async () => {
            const response = await apiGet<{ data: Array<{ id: string; personId: string; person?: { id: string; firstName: string; lastName: string; gender?: string } }> }>(
                '/api/v1/clinica/nomine-ruolo',
                {
                    companyTenantProfileId: companyId,
                    tipoRuolo: 'RSPP',
                    stato: 'ATTIVA',
                    limit: 1
                },
                { headers: operateTenantHeaders }
            );
            return response.data?.[0] || null;
        },
        staleTime: 60 * 1000,
        enabled: isOpen && !!companyId
    });

    const nominaRspp = nominaRsppData;

    // P59: Auto-seleziona RSPP nominato come default per "Redatto da" quando disponibile
    useEffect(() => {
        if (nominaRspp?.personId && !formData.esecutoreId && !isEditMode) {
            setFormData(prev => ({
                ...prev,
                esecutoreId: nominaRspp.personId
            }));
        }
    }, [nominaRspp, formData.esecutoreId, isEditMode]);

    // Auto-seleziona prima sede se una sola
    useEffect(() => {
        if (sites.length === 1 && !formData.siteId) {
            const site = sites[0];
            setFormData(prev => ({
                ...prev,
                siteId: site.id,
                numeroRevisione: (site.dvrNumeroRevisione || 0) + 1
                // P59: esecutoreId viene gestito dall'useEffect con nominaRspp
            }));
        }
    }, [sites, formData.siteId]);

    const selectedSite = sites.find(s => s.id === formData.siteId);

    // Quando cambia la sede, aggiorna numero revisione
    useEffect(() => {
        if (selectedSite) {
            setFormData(prev => ({
                ...prev,
                numeroRevisione: (selectedSite.dvrNumeroRevisione || 0) + 1
                // P59: esecutoreId viene gestito dall'useEffect con nominaRspp
            }));
        }
    }, [selectedSite]);

    // Mutation per salvare DVR - usa POST /api/v1/dvr con FormData per supportare upload file
    // P59: Usa PUT se siamo in edit mode
    const saveMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            // Trova nome esecutore per effettuatoDa
            const esecutore = esecutori.find(e => e.id === data.esecutoreId);
            // P59 Fix: Se non c'è esecutore selezionato, usa il valore originale (in edit) o il nome azienda
            const effettuatoDa = esecutore
                ? formatMedicoName({ firstName: esecutore.firstName, lastName: esecutore.lastName, gender: esecutore.gender as 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED' | null })
                : (data.effettuatoDaOriginal || companyName);

            // Usa FormData per supportare upload file PDF
            const uploadFormData = new FormData();
            uploadFormData.append('siteId', data.siteId);
            uploadFormData.append('effettuatoDa', effettuatoDa);
            if (data.esecutoreId) {
                uploadFormData.append('esecutoreId', data.esecutoreId);
            }
            uploadFormData.append('dataEsecuzione', data.dataRedazione);
            uploadFormData.append('tipoDVR', data.tipoDVR);
            uploadFormData.append('dataScadenza', data.dataScadenza);
            uploadFormData.append('note', data.note || `Revisione n. ${data.numeroRevisione}`);

            // P59: Serializza rischi rilevati come JSON
            if (data.rischiRilevati.length > 0) {
                uploadFormData.append('rischiRilevati', JSON.stringify(data.rischiRilevati));
            }

            // Allega il file PDF se presente
            if (data.dvrFile) {
                uploadFormData.append('documento', data.dvrFile);
            }

            // P59: Usa PUT se siamo in edit mode, altrimenti POST
            const url = isEditMode
                ? `/api/v1/dvr/${editingDVRId}`
                : '/api/v1/dvr';

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
                    ? 'DVR aggiornato con successo'
                    : 'DVR salvato con successo'
            });
            onSuccess();
            onClose();
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante il salvataggio' });
        }
    });

    const validateForm = useCallback(() => {
        const newErrors: Record<string, string> = {};

        if (!formData.siteId) {
            newErrors.siteId = 'Seleziona una sede';
        }
        if (!formData.dataRedazione) {
            newErrors.dataRedazione = 'Data redazione obbligatoria';
        }
        if (!formData.dataScadenza) {
            newErrors.dataScadenza = 'Data scadenza obbligatoria';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            saveMutation.mutate(formData);
        }
    };

    const handleChange = (field: string, value: string | number | string[]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    // File processing helper
    const processFile = useCallback((file: File) => {
        // Verifica tipo file (PDF)
        if (file.type !== 'application/pdf') {
            showToast({ type: 'error', message: 'Il DVR deve essere in formato PDF' });
            return;
        }
        // Verifica dimensione (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            showToast({ type: 'error', message: 'Il file non può superare i 10MB' });
            return;
        }
        setFormData(prev => ({ ...prev, dvrFile: file }));
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
        // Solo se usciamo dall'area di drop (non dai figli)
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

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={isEditMode ? "Modifica DVR" : "Nuovo DVR"}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                    {/* Info azienda */}
                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700">
                        <div className="flex items-center">
                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300">
                                <FileText className="h-5 w-5" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                                    {companyName}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Documento di Valutazione dei Rischi - Art. 28 D.Lgs 81/08
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
                                    Nessuna sede registrata. Aggiungi prima una sede per caricare il DVR.
                                </p>
                            </div>
                        ) : (
                            <ElegantSelect
                                value={formData.siteId}
                                onChange={(v) => handleChange('siteId', v)}
                                placeholder="Seleziona sede..."
                                options={[
                                    { value: '', label: 'Seleziona sede...' },
                                    ...sites.map((site) => ({
                                        value: site.id,
                                        label: `${site.siteName} - ${site.citta || site.indirizzo || 'Indirizzo non specificato'}${site.dvr ? ' ✓ (DVR presente)' : ''}`
                                    }))
                                ]}
                            />
                        )}
                        {errors.siteId && (
                            <p className="mt-1 text-xs text-red-600">{errors.siteId}</p>
                        )}
                    </div>

                    {/* Stato DVR corrente */}
                    {selectedSite && (
                        <div className={cn(
                            "p-4 rounded-lg border",
                            // P59 Fix: In edit mode o se la sede ha DVR, mostra verde
                            (isEditMode || selectedSite.dvr) ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700" : "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700"
                        )}>
                            <div className="flex items-start">
                                {(isEditMode || selectedSite.dvr) ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                                ) : (
                                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                                )}
                                <div className="ml-3">
                                    <p className={cn(
                                        "text-sm font-medium",
                                        (isEditMode || selectedSite.dvr) ? "text-green-800 dark:text-green-300" : "text-amber-800 dark:text-amber-300"
                                    )}>
                                        {isEditMode ? 'Modifica DVR esistente' : (selectedSite.dvr ? 'DVR Presente' : 'DVR Mancante')}
                                    </p>
                                    {/* P59 Fix: In edit mode mostra info dal DVR esistente */}
                                    {isEditMode && existingDVR && (
                                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 space-y-1">
                                            {existingDVR.dataEsecuzione && (
                                                <p>Data redazione: {new Date(existingDVR.dataEsecuzione).toLocaleDateString('it-IT')}</p>
                                            )}
                                            {existingDVR.documentoUrl && (
                                                <p className="flex items-center gap-1">
                                                    <FileText className="h-3 w-3" />
                                                    Documento caricato: {existingDVR.documentoNome || 'PDF'}
                                                </p>
                                            )}
                                            {existingDVR.effettuatoDa && (
                                                <p>Redatto da: {existingDVR.effettuatoDa}</p>
                                            )}
                                        </div>
                                    )}
                                    {!isEditMode && selectedSite.dvr && (
                                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 space-y-1">
                                            {selectedSite.dvrDataRedazione && (
                                                <p>Data redazione: {new Date(selectedSite.dvrDataRedazione).toLocaleDateString('it-IT')}</p>
                                            )}
                                            {selectedSite.dvrNumeroRevisione && (
                                                <p>Revisione n. {selectedSite.dvrNumeroRevisione}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Selezione esecutore (chi ha redatto il DVR) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            <User className="inline h-4 w-4 mr-1" />
                            Redatto da
                            {(selectedSite?.rspp?.id || selectedSite?.rsppId) && (
                                <span className="ml-1 text-xs text-blue-600 dark:text-blue-400">(default: RSPP)</span>
                            )}
                        </label>

                        {/* P59 Fix: Mostra valore originale se non matchato in edit mode */}
                        {isEditMode && formData.effettuatoDaOriginal && !formData.esecutoreId && (
                            <div className="mb-2 p-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-md">
                                <p className="text-sm text-amber-800 dark:text-amber-300">
                                    <User className="inline h-4 w-4 mr-1" />
                                    Valore attuale: <strong>{formData.effettuatoDaOriginal}</strong>
                                </p>
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                    Seleziona un esecutore per aggiornare, oppure lascia vuoto per mantenere il valore esistente
                                </p>
                            </div>
                        )}

                        <ElegantSelect
                            value={formData.esecutoreId}
                            onChange={(v) => handleChange('esecutoreId', v)}
                            options={[
                                {
                                    value: '',
                                    label: isEditMode && formData.effettuatoDaOriginal
                                        ? `Mantieni: ${formData.effettuatoDaOriginal}`
                                        : 'Non specificato (usa nome azienda)'
                                },
                                ...esecutori.map((person) => ({
                                    value: person.id,
                                    label: `${formatMedicoName({ firstName: person.firstName, lastName: person.lastName, gender: person.gender as 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED' | null })}${person.role ? ` - ${person.role}` : ''}${(selectedSite?.rspp?.id === person.id || selectedSite?.rsppId === person.id) ? ' (RSPP sede)' : ''}`
                                }))
                            ]}
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            <Shield className="inline h-3 w-3 mr-1" />
                            Di default viene selezionato l'RSPP della sede, se assegnato
                        </p>
                    </div>

                    {/* Upload file con drag & drop */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            <Upload className="inline h-4 w-4 mr-1" />
                            Carica DVR (PDF)
                        </label>

                        {/* P59: Mostra documento esistente in edit mode */}
                        {isEditMode && existingDVR?.documentoUrl && !formData.dvrFile && (
                            <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {existingDVR.documentoNome || 'Documento DVR'}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Documento attualmente caricato</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowPdfPreview(true)}
                                            className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors"
                                            title="Visualizza PDF"
                                        >
                                            <Eye className="h-3.5 w-3.5 mr-1" />
                                            Visualizza
                                        </button>
                                        <a
                                            href={existingDVR.documentoUrl}
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
                                <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
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
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-300 hover:border-blue-400",
                                formData.dvrFile && "border-green-400 bg-green-50"
                            )}
                        >
                            <div className="space-y-1 text-center">
                                <FileText className={cn(
                                    "mx-auto h-12 w-12",
                                    isDragging ? "text-blue-500" : formData.dvrFile ? "text-green-500" : "text-gray-400"
                                )} />
                                {isDragging ? (
                                    <p className="text-sm text-blue-600 font-medium">
                                        Rilascia il file qui
                                    </p>
                                ) : (
                                    <>
                                        <div className="flex text-sm text-gray-600">
                                            <label
                                                htmlFor="dvr-upload"
                                                className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500"
                                            >
                                                <span>{isEditMode && existingDVR?.documentoUrl ? 'Sostituisci file' : 'Carica un file'}</span>
                                                <input
                                                    id="dvr-upload"
                                                    name="dvr-upload"
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
                                {formData.dvrFile && !isDragging && (
                                    <p className="text-sm text-green-600 font-medium mt-2">
                                        ✓ {formData.dvrFile.name}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tipo DVR */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Tipo DVR *
                        </label>
                        <div className="flex flex-col gap-2">
                            {([
                                { value: 'NUOVO', label: 'Nuovo DVR (Prima redazione)' },
                                { value: 'AGGIORNAMENTO_CON_MODIFICHE', label: 'Aggiornamento con modifiche sostanziali' },
                                { value: 'AGGIORNAMENTO_SENZA_MODIFICHE', label: 'Aggiornamento annuale (conferma senza modifiche)' },
                            ] as const).map(({ value, label }) => (
                                <label key={value} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="tipoDVR"
                                        value={value}
                                        checked={formData.tipoDVR === value}
                                        onChange={() => handleChange('tipoDVR', value)}
                                        className="accent-teal-600"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                        {label}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Date e revisione */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                <Calendar className="inline h-4 w-4 mr-1" />
                                Data Redazione *
                            </label>
                            <DatePickerElegante
                                value={formData.dataRedazione}
                                onChange={(date) => handleChange('dataRedazione', date ? date.toISOString().split('T')[0] : '')}
                                theme="teal"
                            />
                            {errors.dataRedazione && (
                                <p className="mt-1 text-xs text-red-600">{errors.dataRedazione}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Scadenza *
                            </label>
                            <DatePickerElegante
                                value={formData.dataScadenza}
                                onChange={(date) => handleChange('dataScadenza', date ? date.toISOString().split('T')[0] : '')}
                                theme="teal"
                            />
                            {errors.dataScadenza && (
                                <p className="mt-1 text-xs text-red-600">{errors.dataScadenza}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                N. Revisione
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={formData.numeroRevisione}
                                onChange={(e) => handleChange('numeroRevisione', parseInt(e.target.value) || 1)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                            />
                        </div>
                    </div>

                    {/* P59: Card Rischi Rilevati */}
                    <div className="p-4 rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30">
                        <div className="flex items-center mb-3">
                            <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-2" />
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">Rischi Rilevati nel DVR</h4>
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                ({formData.rischiRilevati.length} selezionati)
                            </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                            Seleziona i rischi identificati nella valutazione. Questi verranno associati alla sorveglianza sanitaria dei lavoratori.
                        </p>

                        <div className="grid grid-cols-2 gap-4 max-h-[280px] overflow-y-auto">
                            {/* Colonna sinistra */}
                            <div className="space-y-3">
                                {/* Rischi Fisici */}
                                <div>
                                    <p className="text-xs font-semibold text-blue-700 mb-1.5 uppercase tracking-wide">Rischi Fisici</p>
                                    <div className="space-y-1">
                                        {RISCHI_DVR.FISICI.map(rischio => (
                                            <label key={rischio.code} className="flex items-center gap-2 p-1.5 rounded hover:bg-blue-50 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.rischiRilevati.includes(rischio.code)}
                                                    onChange={(e) => {
                                                        const newRischi = e.target.checked
                                                            ? [...formData.rischiRilevati, rischio.code]
                                                            : formData.rischiRilevati.filter(r => r !== rischio.code);
                                                        handleChange('rischiRilevati', newRischi);
                                                    }}
                                                    className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-gray-700">{rischio.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Rischi Chimici */}
                                <div>
                                    <p className="text-xs font-semibold text-purple-700 mb-1.5 uppercase tracking-wide">Rischi Chimici</p>
                                    <div className="space-y-1">
                                        {RISCHI_DVR.CHIMICI.map(rischio => (
                                            <label key={rischio.code} className="flex items-center gap-2 p-1.5 rounded hover:bg-purple-50 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.rischiRilevati.includes(rischio.code)}
                                                    onChange={(e) => {
                                                        const newRischi = e.target.checked
                                                            ? [...formData.rischiRilevati, rischio.code]
                                                            : formData.rischiRilevati.filter(r => r !== rischio.code);
                                                        handleChange('rischiRilevati', newRischi);
                                                    }}
                                                    className="h-3.5 w-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                />
                                                <span className="text-sm text-gray-700">{rischio.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Rischi Biologici */}
                                <div>
                                    <p className="text-xs font-semibold text-green-700 mb-1.5 uppercase tracking-wide">Rischi Biologici</p>
                                    <div className="space-y-1">
                                        {RISCHI_DVR.BIOLOGICI.map(rischio => (
                                            <label key={rischio.code} className="flex items-center gap-2 p-1.5 rounded hover:bg-green-50 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.rischiRilevati.includes(rischio.code)}
                                                    onChange={(e) => {
                                                        const newRischi = e.target.checked
                                                            ? [...formData.rischiRilevati, rischio.code]
                                                            : formData.rischiRilevati.filter(r => r !== rischio.code);
                                                        handleChange('rischiRilevati', newRischi);
                                                    }}
                                                    className="h-3.5 w-3.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                                />
                                                <span className="text-sm text-gray-700">{rischio.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Colonna destra */}
                            <div className="space-y-3">
                                {/* Rischi Ergonomici */}
                                <div>
                                    <p className="text-xs font-semibold text-orange-700 mb-1.5 uppercase tracking-wide">Rischi Ergonomici</p>
                                    <div className="space-y-1">
                                        {RISCHI_DVR.ERGONOMICI.map(rischio => (
                                            <label key={rischio.code} className="flex items-center gap-2 p-1.5 rounded hover:bg-orange-50 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.rischiRilevati.includes(rischio.code)}
                                                    onChange={(e) => {
                                                        const newRischi = e.target.checked
                                                            ? [...formData.rischiRilevati, rischio.code]
                                                            : formData.rischiRilevati.filter(r => r !== rischio.code);
                                                        handleChange('rischiRilevati', newRischi);
                                                    }}
                                                    className="h-3.5 w-3.5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                                />
                                                <span className="text-sm text-gray-700">{rischio.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Rischi Organizzativi */}
                                <div>
                                    <p className="text-xs font-semibold text-teal-700 mb-1.5 uppercase tracking-wide">Rischi Organizzativi</p>
                                    <div className="space-y-1">
                                        {RISCHI_DVR.ORGANIZZATIVI.map(rischio => (
                                            <label key={rischio.code} className="flex items-center gap-2 p-1.5 rounded hover:bg-teal-50 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.rischiRilevati.includes(rischio.code)}
                                                    onChange={(e) => {
                                                        const newRischi = e.target.checked
                                                            ? [...formData.rischiRilevati, rischio.code]
                                                            : formData.rischiRilevati.filter(r => r !== rischio.code);
                                                        handleChange('rischiRilevati', newRischi);
                                                    }}
                                                    className="h-3.5 w-3.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                                />
                                                <span className="text-sm text-gray-700">{rischio.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Rischi Specifici */}
                                <div>
                                    <p className="text-xs font-semibold text-red-700 mb-1.5 uppercase tracking-wide">Rischi Specifici</p>
                                    <div className="space-y-1">
                                        {RISCHI_DVR.SPECIFICI.map(rischio => (
                                            <label key={rischio.code} className="flex items-center gap-2 p-1.5 rounded hover:bg-red-50 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.rischiRilevati.includes(rischio.code)}
                                                    onChange={(e) => {
                                                        const newRischi = e.target.checked
                                                            ? [...formData.rischiRilevati, rischio.code]
                                                            : formData.rischiRilevati.filter(r => r !== rischio.code);
                                                        handleChange('rischiRilevati', newRischi);
                                                    }}
                                                    className="h-3.5 w-3.5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                                />
                                                <span className="text-sm text-gray-700">{rischio.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Rischi Settoriali */}
                                <div>
                                    <p className="text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Rischi Settoriali</p>
                                    <div className="space-y-1">
                                        {RISCHI_DVR.SETTORIALI.map(rischio => (
                                            <label key={rischio.code} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-100 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.rischiRilevati.includes(rischio.code)}
                                                    onChange={(e) => {
                                                        const newRischi = e.target.checked
                                                            ? [...formData.rischiRilevati, rischio.code]
                                                            : formData.rischiRilevati.filter(r => r !== rischio.code);
                                                        handleChange('rischiRilevati', newRischi);
                                                    }}
                                                    className="h-3.5 w-3.5 rounded border-gray-300 text-gray-600 focus:ring-gray-500"
                                                />
                                                <span className="text-sm text-gray-700">{rischio.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
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
                            placeholder="Motivo revisione, modifiche apportate..."
                        />
                    </div>

                    {/* Info normativa */}
                    <div className="flex items-start p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                        <Info className="h-4 w-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                        <p className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                            Il DVR è obbligatorio per tutte le aziende con lavoratori. Deve essere aggiornato
                            in caso di modifiche significative al processo produttivo, nuovi rischi, o infortuni
                            (Art. 28-29 D.Lgs 81/08). La revisione è consigliata almeno annualmente.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                            disabled={saveMutation.isPending}
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            disabled={saveMutation.isPending || sites.length === 0}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                            {saveMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Salvataggio...
                                </>
                            ) : (
                                <>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Salva DVR
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* P59: Modal preview PDF */}
            {showPdfPreview && existingDVR?.documentoUrl && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl dark:shadow-black/50 w-[90vw] h-[90vh] max-w-6xl overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600">
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                    {existingDVR.documentoNome || 'Documento DVR'}
                                </h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={existingDVR.documentoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                                >
                                    <ExternalLink className="h-4 w-4 mr-1.5" />
                                    Apri in nuova scheda
                                </a>
                                <button
                                    onClick={() => setShowPdfPreview(false)}
                                    className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                                    title="Chiudi"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                        {/* PDF Viewer */}
                        <div className="w-full h-[calc(100%-56px)]">
                            <iframe
                                src={existingDVR.documentoUrl}
                                className="w-full h-full border-0"
                                title="Anteprima DVR"
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default QuickActionDVRModal;
