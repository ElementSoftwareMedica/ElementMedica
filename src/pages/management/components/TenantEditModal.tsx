/**
 * TenantEditModal Component
 * 
 * Modal per la modifica dei dati del tenant (usati anche nei placeholder dei template)
 * @project 43 - Tenant Roles Management System
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    X,
    Building2,
    Save,
    MapPin,
    Phone,
    Mail,
    Globe,
    FileText,
    Image,
    Loader2,
    Upload,
    Stethoscope,
    GraduationCap,
    Landmark,
    ToggleLeft,
    ToggleRight,
    Zap,
    ChevronDown,
    ChevronRight,
    Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '../../../hooks/useToast';
import type { Tenant, TenantSettings, TenantFeatureRecord } from '../types';
import { managementApi } from '../api';
import cmsMediaService from '../../../services/cmsMediaService';

// Feature categories for organized display
const FEATURE_CATEGORIES: { key: string; label: string; icon: string; color: string; features: { key: string; label: string; description: string }[] }[] = [
    {
        key: 'branch', label: 'Branch', icon: '🏢', color: 'blue',
        features: [
            { key: 'BRANCH_MEDICA', label: 'Clinica (Medica)', description: 'Funzionalità ambulatorio e visite mediche' },
            { key: 'BRANCH_FORMAZIONE', label: 'Formazione', description: 'Corsi di formazione e sicurezza' },
            { key: 'BRANCH_LABORATORIO', label: 'Laboratorio', description: 'Analisi e laboratorio' },
            { key: 'BRANCH_CONSULENZA', label: 'Consulenza', description: 'Servizi di consulenza' },
        ]
    },
    {
        key: 'fatturazione', label: 'Fatturazione', icon: '💰', color: 'green',
        features: [
            { key: 'FATTURAZIONE_ELETTRONICA', label: 'Fatturazione Elettronica', description: 'Invio fatture al SDI' },
            { key: 'FATTURAZIONE_PA', label: 'Fatturazione PA', description: 'Fatture verso la Pubblica Amministrazione' },
            { key: 'FATTURAZIONE_SPLIT_PAYMENT', label: 'Split Payment', description: 'Gestione split payment IVA' },
        ]
    },
    {
        key: 'comunicazioni', label: 'Comunicazioni', icon: '📧', color: 'purple',
        features: [
            { key: 'PEC_INTEGRATION', label: 'Integrazione PEC', description: 'Invio e ricezione PEC automatica' },
            { key: 'SMS_NOTIFICATIONS', label: 'Notifiche SMS', description: 'Invio SMS a pazienti e lavoratori' },
            { key: 'WHATSAPP_INTEGRATION', label: 'WhatsApp', description: 'Messaggi WhatsApp automatici' },
        ]
    },
    {
        key: 'mdl', label: 'Medicina del Lavoro', icon: '🩺', color: 'teal',
        features: [
            { key: 'MDL_BASE', label: 'MDL Base', description: 'Visite di medicina del lavoro' },
            { key: 'MDL_SORVEGLIANZA', label: 'Sorveglianza Sanitaria', description: 'Piano sorveglianza sanitaria' },
            { key: 'MDL_ALLEGATO_3B', label: 'Allegato 3B', description: 'Generazione Allegato 3B INAIL' },
            { key: 'MDL_PROTOCOLLI', label: 'Protocolli Sanitari', description: 'Gestione protocolli sanitari' },
        ]
    },
    {
        key: 'avanzate', label: 'Funzionalità Avanzate', icon: '⚡', color: 'amber',
        features: [
            { key: 'MULTI_SEDE', label: 'Multi-Sede', description: 'Gestione sedi multiple' },
            { key: 'API_ACCESS', label: 'Accesso API', description: 'API pubbliche per widget e integrazioni' },
            { key: 'WHITE_LABEL', label: 'White Label', description: 'Personalizzazione completa del brand' },
            { key: 'SSO_INTEGRATION', label: 'SSO', description: 'Single Sign-On integration' },
            { key: 'CUSTOM_REPORTS', label: 'Report Personalizzati', description: 'reportistica avanzata' },
            { key: 'DATA_EXPORT_ADVANCED', label: 'Export Avanzato', description: 'Export dati in formati avanzati' },
        ]
    },
    {
        key: 'firma', label: 'Firma Digitale', icon: '✍️', color: 'indigo',
        features: [
            { key: 'FIRMA_GRAFOMETRICA', label: 'Firma Grafometrica', description: 'Firma su tablet/dispositivo' },
            { key: 'FIRMA_FEQ', label: 'Firma FEQ', description: 'Firma Elettronica Qualificata' },
            { key: 'FIRMA_FEA', label: 'Firma FEA', description: 'Firma Elettronica Avanzata' },
            { key: 'FIRMA_REMOTA', label: 'Firma Remota', description: 'Firma digitale remota' },
            { key: 'FIRMA_BIOMETRICA', label: 'Firma Biometrica', description: 'Firma con dati biometrici' },
        ]
    },
    {
        key: 'fse', label: 'Fascicolo Sanitario', icon: '📋', color: 'rose',
        features: [
            { key: 'FSE_EXPORT_CDA', label: 'Export CDA2', description: 'Esportazione documenti in formato CDA2' },
            { key: 'FSE_CONSENSI_AVANZATI', label: 'Consensi Avanzati', description: 'Gestione consensi FSE avanzati' },
        ]
    },
];

interface TenantEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenant: Tenant | null;
    onSave: (tenantId: string, data: { name: string; settings: TenantSettings }) => Promise<void>;
    isSaving?: boolean;
    canEditFeatures?: boolean;
}

interface FormData {
    name: string;
    // Settings fields (usati nei placeholder dei template)
    address: string;
    cap: string;
    city: string;
    provincia: string;
    vatNumber: string;
    fiscalCode: string;
    iban: string;
    sdi: string;
    phone: string;
    email: string;
    pec: string;
    website: string;
    logoUrl: string;
    // Branch branding
    branchMedicaName: string;
    branchMedicaLogo: string;
    branchFormazioneName: string;
    branchFormazioneLogo: string;
    branchMdlName: string;
    branchMdlLogo: string;
}

type LogoField = 'logoUrl' | 'branchMedicaLogo' | 'branchFormazioneLogo' | 'branchMdlLogo';

const INITIAL_FORM: FormData = {
    name: '',
    address: '',
    cap: '',
    city: '',
    provincia: '',
    vatNumber: '',
    fiscalCode: '',
    iban: '',
    sdi: '',
    phone: '',
    email: '',
    pec: '',
    website: '',
    logoUrl: '',
    branchMedicaName: '',
    branchMedicaLogo: '',
    branchFormazioneName: '',
    branchFormazioneLogo: '',
    branchMdlName: '',
    branchMdlLogo: ''
};

const TenantEditModal: React.FC<TenantEditModalProps> = ({
    isOpen,
    onClose,
    tenant,
    onSave,
    isSaving = false,
    canEditFeatures = false
}) => {
    const { showToast } = useToast();
    const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [isUploadingBranchMedica, setIsUploadingBranchMedica] = useState(false);
    const [isUploadingBranchFormazione, setIsUploadingBranchFormazione] = useState(false);
    const [isUploadingBranchMdl, setIsUploadingBranchMdl] = useState(false);
    const [tenantMedia, setTenantMedia] = useState<Awaited<ReturnType<typeof cmsMediaService.listMedia>>['media']>([]);
    const [loadingTenantMedia, setLoadingTenantMedia] = useState(false);
    const [tenantMediaError, setTenantMediaError] = useState<string | null>(null);
    const logoFileInputRef = useRef<HTMLInputElement>(null);
    const branchMedicaLogoInputRef = useRef<HTMLInputElement>(null);
    const branchFormazioneLogoInputRef = useRef<HTMLInputElement>(null);
    const branchMdlLogoInputRef = useRef<HTMLInputElement>(null);

    // Feature management state
    const [tenantFeatures, setTenantFeatures] = useState<TenantFeatureRecord[]>([]);
    const [loadingFeatures, setLoadingFeatures] = useState(false);
    const [togglingFeature, setTogglingFeature] = useState<string | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

    // Load tenant features when modal opens
    const loadTenantFeatures = useCallback(async (tenantId: string) => {
        setLoadingFeatures(true);
        try {
            const res = await managementApi.getTenantFeatures(tenantId);
            setTenantFeatures(res.data || []);
        } catch {
            // Features may not be available yet, start with empty
            setTenantFeatures([]);
        } finally {
            setLoadingFeatures(false);
        }
    }, []);

    // Check if a feature is enabled
    const isFeatureEnabled = (featureKey: string): boolean => {
        const feature = tenantFeatures.find(f => f.featureKey === featureKey);
        return feature?.isEnabled ?? false;
    };

    // Toggle a feature
    const handleToggleFeature = async (featureKey: string) => {
        if (!tenant || togglingFeature) return;
        const currentlyEnabled = isFeatureEnabled(featureKey);
        setTogglingFeature(featureKey);
        try {
            const res = await managementApi.setTenantFeature(tenant.id, featureKey, {
                isEnabled: !currentlyEnabled
            });
            // Update local state
            setTenantFeatures(prev => {
                const existing = prev.findIndex(f => f.featureKey === featureKey);
                if (existing >= 0) {
                    const updated = [...prev];
                    updated[existing] = res.data;
                    return updated;
                }
                return [...prev, res.data];
            });
            showToast({
                message: `${!currentlyEnabled ? 'Attivata' : 'Disattivata'}: ${FEATURE_CATEGORIES.flatMap(c => c.features).find(f => f.key === featureKey)?.label || featureKey}`,
                type: 'success'
            });
        } catch {
            showToast({ message: 'Errore nell\'aggiornamento della funzionalità', type: 'error' });
        } finally {
            setTogglingFeature(null);
        }
    };

    const toggleCategory = (key: string) => {
        setExpandedCategories(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Combina loading locale con isSaving esterno
    const isDisabled = loading || isSaving;

    const loadTenantMedia = useCallback(async () => {
        if (!tenant || !isOpen) {
            return;
        }

        setLoadingTenantMedia(true);
        setTenantMediaError(null);

        try {
            const result = await cmsMediaService.listMedia({
                mimeType: 'image/',
                limit: 24,
                page: 1
            });
            setTenantMedia(result.media || []);
        } catch {
            setTenantMedia([]);
            setTenantMediaError('Impossibile caricare la libreria immagini del tenant');
        } finally {
            setLoadingTenantMedia(false);
        }
    }, [isOpen, tenant]);

    const handleMediaSelection = (field: LogoField, url: string) => {
        handleChange(field, url);
        showToast({ message: 'Immagine selezionata dalla libreria tenant', type: 'success' });
    };

    const uploadLogoAsset = async (
        field: LogoField,
        file: File,
        setUploading: (value: boolean) => void,
        inputRef: React.RefObject<HTMLInputElement>,
        successMessage: string,
        fallbackErrorMessage: string
    ) => {
        const validation = cmsMediaService.validateFile(file);
        if (!validation.valid) {
            showToast({ message: validation.error || 'File non valido', type: 'error' });
            if (inputRef.current) inputRef.current.value = '';
            return;
        }

        if (!file.type.startsWith('image/')) {
            showToast({ message: 'Seleziona un file immagine PNG, JPG, WEBP o GIF', type: 'error' });
            if (inputRef.current) inputRef.current.value = '';
            return;
        }

        setUploading(true);

        try {
            const uploaded = await cmsMediaService.uploadFiles([file]);
            if (uploaded?.[0]?.url) {
                handleChange(field, uploaded[0].url);
                await loadTenantMedia();
                showToast({ message: successMessage, type: 'success' });
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : fallbackErrorMessage;
            showToast({ message, type: 'error' });
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const renderMediaLibrary = (
        field: LogoField,
        currentValue: string,
        accentClassName: string
    ) => {
        if (loadingTenantMedia) {
            return (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Caricamento immagini del tenant...
                </div>
            );
        }

        if (tenantMediaError) {
            return (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                    {tenantMediaError}
                </div>
            );
        }

        if (tenantMedia.length === 0) {
            return (
                <div className="mt-3 rounded-lg border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    Nessuna immagine gia caricata per questo tenant.
                </div>
            );
        }

        return (
            <div className="mt-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Libreria immagini gia caricate
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {tenantMedia.map((media) => {
                        const previewUrl = cmsMediaService.getOptimalUrl(media, 'thumbnail');
                        const isSelected = currentValue === media.url;

                        return (
                            <button
                                key={media.id}
                                type="button"
                                onClick={() => handleMediaSelection(field, media.url)}
                                className={`overflow-hidden rounded-xl border text-left transition-all ${isSelected
                                    ? `${accentClassName} ring-2 ring-offset-1 ring-offset-white dark:ring-offset-gray-800`
                                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                                    }`}
                            >
                                <div className="flex h-20 items-center justify-center bg-gray-50 dark:bg-gray-900/60">
                                    <img
                                        src={previewUrl}
                                        alt={media.title || media.originalName}
                                        className="h-full w-full object-contain"
                                    />
                                </div>
                                <div className="px-2 py-2">
                                    <p className="truncate text-xs font-medium text-gray-700 dark:text-gray-200">
                                        {media.title || media.originalName}
                                    </p>
                                    <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                                        {cmsMediaService.formatFileSize(media.size)}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await uploadLogoAsset(
            'logoUrl',
            file,
            setIsUploadingLogo,
            logoFileInputRef,
            'Logo caricato con successo',
            'Errore nel caricamento del logo'
        );
    };

    const handleBranchLogoUpload = async (
        field: 'branchMedicaLogo' | 'branchFormazioneLogo' | 'branchMdlLogo',
        setUploading: (v: boolean) => void,
        inputRef: React.RefObject<HTMLInputElement>,
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await uploadLogoAsset(
            field,
            file,
            setUploading,
            inputRef,
            'Logo branch caricato con successo',
            'Errore nel caricamento del logo branch'
        );
    };

    // Popola il form quando il tenant cambia
    useEffect(() => {
        if (tenant) {
            const settings = tenant.settings || {};
            setFormData({
                name: tenant.name || '',
                address: settings.address || '',
                cap: settings.cap || '',
                city: settings.city || '',
                provincia: settings.provincia || '',
                vatNumber: settings.vatNumber || '',
                fiscalCode: settings.fiscalCode || '',
                iban: settings.iban || '',
                sdi: settings.sdi || '',
                phone: settings.phone || '',
                email: settings.email || '',
                pec: settings.pec || '',
                website: settings.website || '',
                logoUrl: settings.logoUrl || '',
                branchMedicaName: settings.branches?.MEDICA?.name || '',
                branchMedicaLogo: settings.branches?.MEDICA?.logo || '',
                branchFormazioneName: settings.branches?.FORMAZIONE?.name || '',
                branchFormazioneLogo: settings.branches?.FORMAZIONE?.logo || '',
                branchMdlName: settings.branches?.MDL?.name || '',
                branchMdlLogo: settings.branches?.MDL?.logo || ''
            });
            setErrors({});
            // Load features for this tenant
            loadTenantFeatures(tenant.id);
            loadTenantMedia();
        }
    }, [tenant, loadTenantFeatures, loadTenantMedia]);

    const handleChange = (field: keyof FormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user types
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Partial<Record<keyof FormData, string>> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Il nome è obbligatorio';
        }

        // Validazione P.IVA (11 cifre)
        if (formData.vatNumber && !/^\d{11}$/.test(formData.vatNumber.replace(/\s/g, ''))) {
            newErrors.vatNumber = 'La P.IVA deve essere di 11 cifre';
        }

        // Validazione CAP (5 cifre)
        if (formData.cap && !/^\d{5}$/.test(formData.cap.replace(/\s/g, ''))) {
            newErrors.cap = 'Il CAP deve essere di 5 cifre';
        }

        // Validazione IBAN (IT + 2 cifre controllo + 22 alfanumerici = 27 caratteri per Italia)
        if (formData.iban && !/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(formData.iban)) {
            newErrors.iban = 'IBAN non valido';
        }

        // Validazione email
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Email non valida';
        }

        // Validazione PEC
        if (formData.pec && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.pec)) {
            newErrors.pec = 'PEC non valida';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm() || !tenant) return;

        setLoading(true);
        try {
            // Costruisci l'oggetto settings con tutti i campi
            const settings: TenantSettings = {
                ...(tenant.settings || {}),
                address: formData.address || undefined,
                cap: formData.cap || undefined,
                city: formData.city || undefined,
                provincia: formData.provincia || undefined,
                vatNumber: formData.vatNumber || undefined,
                fiscalCode: formData.fiscalCode || undefined,
                iban: formData.iban || undefined,
                sdi: formData.sdi || undefined,
                phone: formData.phone || undefined,
                email: formData.email || undefined,
                pec: formData.pec || undefined,
                website: formData.website || undefined,
                logoUrl: formData.logoUrl || undefined,
                branches: {
                    ...(tenant.settings?.branches || {}),
                    MEDICA: (formData.branchMedicaName || formData.branchMedicaLogo) ? {
                        name: formData.branchMedicaName || undefined,
                        logo: formData.branchMedicaLogo || undefined
                    } : (tenant.settings?.branches?.MEDICA || undefined),
                    FORMAZIONE: (formData.branchFormazioneName || formData.branchFormazioneLogo) ? {
                        name: formData.branchFormazioneName || undefined,
                        logo: formData.branchFormazioneLogo || undefined
                    } : (tenant.settings?.branches?.FORMAZIONE || undefined),
                    MDL: (formData.branchMdlName || formData.branchMdlLogo) ? {
                        name: formData.branchMdlName || undefined,
                        logo: formData.branchMdlLogo || undefined
                    } : (tenant.settings?.branches?.MDL || undefined)
                }
            };

            // Rimuovi campi undefined
            Object.keys(settings).forEach(key => {
                if (settings[key] === undefined || settings[key] === '') {
                    delete settings[key];
                }
            });
            // Rimuovi branches se nessun branch ha dati
            if (settings.branches && !settings.branches.MEDICA && !settings.branches.FORMAZIONE && !settings.branches.MDL) {
                delete settings.branches;
            }

            await onSave(tenant.id, {
                name: formData.name,
                settings
            });

            onClose();
        } catch (err: unknown) {
            showToast({
                message: 'Errore durante il salvataggio',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !tenant) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl dark:shadow-black/50 w-full max-w-2xl max-h-[90vh] overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700">
                    <div className="flex items-center">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mr-3">
                            <Building2 className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">Modifica Tenant</h3>
                            <p className="text-sm text-blue-100">{tenant.slug}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5 text-white" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                    <div className="space-y-6">
                        {/* Dati Generali */}
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-4 flex items-center">
                                <Building2 className="h-4 w-4 mr-2 text-blue-600" />
                                Dati Generali
                            </h4>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Nome Azienda *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => handleChange('name', e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 ${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                            }`}
                                        placeholder="Nome dell'azienda"
                                    />
                                    {errors.name && (
                                        <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Dati Fiscali */}
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-4 flex items-center">
                                <FileText className="h-4 w-4 mr-2 text-green-600" />
                                Dati Fiscali
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Partita IVA
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.vatNumber}
                                        onChange={(e) => handleChange('vatNumber', e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 ${errors.vatNumber ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                            }`}
                                        placeholder="12345678901"
                                        maxLength={11}
                                    />
                                    {errors.vatNumber && (
                                        <p className="text-sm text-red-500 mt-1">{errors.vatNumber}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Codice Fiscale
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.fiscalCode}
                                        onChange={(e) => handleChange('fiscalCode', e.target.value.toUpperCase())}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                                        placeholder="RSSMRA80A01H501Z"
                                        maxLength={16}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        IBAN
                                    </label>
                                    <div className="relative">
                                        <Landmark className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={formData.iban}
                                            onChange={(e) => handleChange('iban', e.target.value.toUpperCase().replace(/\s/g, ''))}
                                            className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 ${errors.iban ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                            placeholder="IT60X0542811101000000123456"
                                            maxLength={34}
                                        />
                                    </div>
                                    {errors.iban && (
                                        <p className="text-sm text-red-500 mt-1">{errors.iban}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Codice Destinatario (SDI)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.sdi}
                                        onChange={(e) => handleChange('sdi', e.target.value.toUpperCase())}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                                        placeholder="XXXXXXX"
                                        maxLength={7}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Indirizzo */}
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-4 flex items-center">
                                <MapPin className="h-4 w-4 mr-2 text-red-600" />
                                Indirizzo Sede
                            </h4>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Indirizzo
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => handleChange('address', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                                        placeholder="Via Roma 123"
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            CAP
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.cap}
                                            onChange={(e) => handleChange('cap', e.target.value)}
                                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 ${errors.cap ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                                }`}
                                            placeholder="20100"
                                            maxLength={5}
                                        />
                                        {errors.cap && (
                                            <p className="text-sm text-red-500 mt-1">{errors.cap}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Città
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.city}
                                            onChange={(e) => handleChange('city', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                                            placeholder="Milano"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Provincia
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.provincia}
                                            onChange={(e) => handleChange('provincia', e.target.value.toUpperCase())}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                                            placeholder="MI"
                                            maxLength={2}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contatti */}
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-4 flex items-center">
                                <Phone className="h-4 w-4 mr-2 text-purple-600" />
                                Contatti
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Telefono
                                    </label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => handleChange('phone', e.target.value)}
                                            className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                                            placeholder="02 12345678"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Email
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => handleChange('email', e.target.value)}
                                            className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 ${errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                                }`}
                                            placeholder="info@azienda.it"
                                        />
                                    </div>
                                    {errors.email && (
                                        <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        PEC
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            type="email"
                                            value={formData.pec}
                                            onChange={(e) => handleChange('pec', e.target.value)}
                                            className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 ${errors.pec ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                                }`}
                                            placeholder="azienda@pec.it"
                                        />
                                    </div>
                                    {errors.pec && (
                                        <p className="text-sm text-red-500 mt-1">{errors.pec}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Sito Web
                                    </label>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            type="url"
                                            value={formData.website}
                                            onChange={(e) => handleChange('website', e.target.value)}
                                            className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                                            placeholder="www.azienda.it"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Branding */}
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-4 flex items-center">
                                <Image className="h-4 w-4 mr-2 text-orange-600" />
                                Branding
                            </h4>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Logo Generale
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        value={formData.logoUrl}
                                        onChange={(e) => handleChange('logoUrl', e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                                        placeholder="https://example.com/logo.png"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => logoFileInputRef.current?.click()}
                                        disabled={isUploadingLogo || isDisabled}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-lg transition-colors"
                                        title="Carica immagine dal dispositivo"
                                    >
                                        {isUploadingLogo ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Upload className="h-4 w-4" />
                                        )}
                                        <span className="hidden sm:inline">Carica</span>
                                    </button>
                                    <input
                                        ref={logoFileInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                                        className="hidden"
                                        onChange={handleLogoFileUpload}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Carica un'immagine PNG, JPG, WEBP o GIF, scegli dalla libreria del tenant oppure inserisci l'URL del logo.
                                </p>
                                {renderMediaLibrary('logoUrl', formData.logoUrl, 'border-teal-500 ring-teal-500')}
                                {formData.logoUrl && (
                                    <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Anteprima:</p>
                                        <img
                                            src={formData.logoUrl}
                                            alt="Logo preview"
                                            className="max-h-16 object-contain"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Branding per Branch */}
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-4 flex items-center">
                                <Image className="h-4 w-4 mr-2 text-purple-600" />
                                Branding per Branch
                            </h4>
                            <div className="space-y-4">
                                {/* Branch MEDICA */}
                                <div className="border border-teal-200 dark:border-teal-800 rounded-xl p-4 bg-teal-50/30 dark:bg-teal-900/10">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Stethoscope className="h-4 w-4 text-teal-600" />
                                        <span className="text-sm font-medium text-teal-700 dark:text-teal-400">Branch Clinica (MEDICA)</span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Nome Branch
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.branchMedicaName}
                                                onChange={(e) => handleChange('branchMedicaName', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                                                placeholder="es. ElementMedica Clinica"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Logo Branch Medica
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="url"
                                                    value={formData.branchMedicaLogo}
                                                    onChange={(e) => handleChange('branchMedicaLogo', e.target.value)}
                                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                                                    placeholder="https://example.com/logo-medica.png"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => branchMedicaLogoInputRef.current?.click()}
                                                    disabled={isUploadingBranchMedica || isDisabled}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-lg transition-colors"
                                                    title="Carica immagine"
                                                >
                                                    {isUploadingBranchMedica ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                                                </button>
                                                <input
                                                    ref={branchMedicaLogoInputRef}
                                                    type="file"
                                                    accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                                                    className="hidden"
                                                    onChange={(e) => handleBranchLogoUpload('branchMedicaLogo', setIsUploadingBranchMedica, branchMedicaLogoInputRef, e)}
                                                />
                                            </div>
                                        </div>
                                        {renderMediaLibrary('branchMedicaLogo', formData.branchMedicaLogo, 'border-teal-500 ring-teal-500')}
                                        {formData.branchMedicaLogo && (
                                            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg border border-teal-100 dark:border-teal-900">
                                                <img
                                                    src={formData.branchMedicaLogo}
                                                    alt="Logo MEDICA preview"
                                                    className="max-h-12 object-contain"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Branch FORMAZIONE */}
                                <div className="border border-blue-200 dark:border-blue-800 rounded-xl p-4 bg-blue-50/30 dark:bg-blue-900/10">
                                    <div className="flex items-center gap-2 mb-3">
                                        <GraduationCap className="h-4 w-4 text-blue-600" />
                                        <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Branch Formazione (FORMAZIONE)</span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Nome Branch
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.branchFormazioneName}
                                                onChange={(e) => handleChange('branchFormazioneName', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                                                placeholder="es. ElementSicurezza"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Logo Branch Formazione
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="url"
                                                    value={formData.branchFormazioneLogo}
                                                    onChange={(e) => handleChange('branchFormazioneLogo', e.target.value)}
                                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                                                    placeholder="https://example.com/logo-formazione.png"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => branchFormazioneLogoInputRef.current?.click()}
                                                    disabled={isUploadingBranchFormazione || isDisabled}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
                                                    title="Carica immagine"
                                                >
                                                    {isUploadingBranchFormazione ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                                                </button>
                                                <input
                                                    ref={branchFormazioneLogoInputRef}
                                                    type="file"
                                                    accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                                                    className="hidden"
                                                    onChange={(e) => handleBranchLogoUpload('branchFormazioneLogo', setIsUploadingBranchFormazione, branchFormazioneLogoInputRef, e)}
                                                />
                                            </div>
                                        </div>
                                        {renderMediaLibrary('branchFormazioneLogo', formData.branchFormazioneLogo, 'border-blue-500 ring-blue-500')}
                                        {formData.branchFormazioneLogo && (
                                            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg border border-blue-100 dark:border-blue-900">
                                                <img
                                                    src={formData.branchFormazioneLogo}
                                                    alt="Logo FORMAZIONE preview"
                                                    className="max-h-12 object-contain"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Branch MDL (Medicina del Lavoro) */}
                                <div className="border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 bg-emerald-50/30 dark:bg-emerald-900/10">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Briefcase className="h-4 w-4 text-emerald-600" />
                                        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Medicina del Lavoro (MDL)</span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Nome Branch
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.branchMdlName}
                                                onChange={(e) => handleChange('branchMdlName', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                                                placeholder="es. Medicina del Lavoro"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Logo Branch MDL
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="url"
                                                    value={formData.branchMdlLogo}
                                                    onChange={(e) => handleChange('branchMdlLogo', e.target.value)}
                                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                                                    placeholder="https://example.com/logo-mdl.png"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => branchMdlLogoInputRef.current?.click()}
                                                    disabled={isUploadingBranchMdl || isDisabled}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors"
                                                    title="Carica immagine"
                                                >
                                                    {isUploadingBranchMdl ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                                                </button>
                                                <input
                                                    ref={branchMdlLogoInputRef}
                                                    type="file"
                                                    accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                                                    className="hidden"
                                                    onChange={(e) => handleBranchLogoUpload('branchMdlLogo', setIsUploadingBranchMdl, branchMdlLogoInputRef, e)}
                                                />
                                            </div>
                                        </div>
                                        {renderMediaLibrary('branchMdlLogo', formData.branchMdlLogo, 'border-emerald-500 ring-emerald-500')}
                                        {formData.branchMdlLogo && (
                                            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg border border-emerald-100 dark:border-emerald-900">
                                                <img
                                                    src={formData.branchMdlLogo}
                                                    alt="Logo MDL preview"
                                                    className="max-h-12 object-contain"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Funzionalità — solo per admin/super admin */}
                        {canEditFeatures && (
                            <div>
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-4 flex items-center">
                                    <Zap className="h-4 w-4 mr-2 text-amber-600" />
                                    Funzionalità
                                </h4>

                                {loadingFeatures ? (
                                    <div className="flex items-center justify-center py-6">
                                        <Loader2 className="h-5 w-5 animate-spin text-gray-400 mr-2" />
                                        <span className="text-sm text-gray-500">Caricamento funzionalità...</span>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {FEATURE_CATEGORIES.map(category => {
                                            const isExpanded = expandedCategories[category.key] ?? false;
                                            const enabledCount = category.features.filter(f => isFeatureEnabled(f.key)).length;

                                            return (
                                                <div key={category.key} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                                    {/* Category Header */}
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleCategory(category.key)}
                                                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-base">{category.icon}</span>
                                                            <span className="text-sm font-medium text-gray-900 dark:text-gray-50">{category.label}</span>
                                                            {enabledCount > 0 && (
                                                                <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium px-2 py-0.5 rounded-full">
                                                                    {enabledCount}/{category.features.length}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {isExpanded ? (
                                                            <ChevronDown className="h-4 w-4 text-gray-400" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4 text-gray-400" />
                                                        )}
                                                    </button>

                                                    {/* Category Features */}
                                                    {isExpanded && (
                                                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                                            {category.features.map(feature => {
                                                                const enabled = isFeatureEnabled(feature.key);
                                                                const isToggling = togglingFeature === feature.key;

                                                                return (
                                                                    <div key={feature.key} className="flex items-center justify-between px-4 py-3">
                                                                        <div className="flex-1 min-w-0 mr-3">
                                                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-50">{feature.label}</p>
                                                                            <p className="text-xs text-gray-500 dark:text-gray-400">{feature.description}</p>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleToggleFeature(feature.key)}
                                                                            disabled={isToggling}
                                                                            className="flex-shrink-0 focus:outline-none"
                                                                            title={enabled ? 'Disattiva' : 'Attiva'}
                                                                        >
                                                                            {isToggling ? (
                                                                                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                                                                            ) : enabled ? (
                                                                                <ToggleRight className="h-7 w-7 text-green-600" />
                                                                            ) : (
                                                                                <ToggleLeft className="h-7 w-7 text-gray-400" />
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Info placeholder */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <p className="text-sm text-blue-800 dark:text-blue-300">
                                <strong>Nota:</strong> Questi dati vengono utilizzati automaticamente nei template
                                dei documenti (preventivi, attestati, fatture, ecc.) come placeholder.
                            </p>
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={isDisabled}
                    >
                        Annulla
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isDisabled}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {isDisabled ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Salvataggio...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-2" />
                                Salva Modifiche
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default TenantEditModal;
