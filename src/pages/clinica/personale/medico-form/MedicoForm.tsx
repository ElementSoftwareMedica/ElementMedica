/**
 * MedicoForm - Main Component
 * 
 * Form completo per creazione/modifica medici con:
 * - Auto-calcolo data di nascita da codice fiscale
 * - Multi-select specializzazioni con opzioni custom
 * - Secondo numero iscrizione albo (medicina lavoro/sport)
 * - Campi completi: pec, residenza, iban, foto profilo, note
 * - Breve e completa descrizione professionale
 * - Gestione duplicati cross-tenant (409 Conflict)
 * - Username automatico (nome.cognome con incremento)
 * 
 * Password di default: Password1!
 * 
 * Refactored from 1862-line monolithic component into modular structure.
 * 
 * @module pages/poliambulatorio/personale/medico-form/MedicoForm
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Stethoscope,
    ArrowLeft,
    Save,
    User,
    Mail,
    Phone,
    CreditCard,
    Building,
    Key,
    AlertCircle,
    Loader2,
    Info,
    MapPin,
    Calendar,
    Camera,
    Plus,
    X,
    ChevronDown,
    Briefcase,
    Award,
    Landmark
} from 'lucide-react';
import {
    mediciApi,
    prestazioniApi,
    type Medico,
    type CreatePersonDocumentInput
} from '../../../../services/clinicaApi';
import { useToast } from '../../../../hooks/useToast';
import { useTenantFilter } from '../../../../context/TenantFilterContext';
import { useAuth } from '../../../../context/AuthContext';
import { useRoleGuard } from '../../../../hooks/useRoleGuard';
import { getAllSpecialties, addCustomSpecialty as addSpecialtyToStore } from '../../../../constants/specialties';

// Modular components
import CredentialsModal from './CredentialsModal';
import ConflictModal from './ConflictModal';
import DocumentUploadModal from './DocumentUploadModal';
import DocumentsList from './DocumentsList';
import PrestazioniAbilitateSelector from './PrestazioniAbilitateSelector';

// Types and constants
import {
    PROVINCE,
    DOCUMENT_TYPES,
    DEFAULT_PASSWORD,
    extractBirthDateFromCF,
    getInitialFormData,
    type MedicoFormData,
    type CredentialsModalState,
    type ConflictModalState,
    type DocumentFormState
} from './types';

// Import Element Medica theme
import { DatePickerElegante } from '../../../../components/ui/DatePickerElegante';
import '../../../../styles/clinica-theme.css';

// CF utilities
import {
    generateTaxCode,
    extractBirthPlaceFromTaxCode,
    extractGenderFromTaxCode,
} from '../../../../utils/codiceFiscale';

const MedicoForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEdit = id && id !== 'nuovo';
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { user } = useAuth();
    const { isMedico, isMedicoCompetente } = useRoleGuard();
    const currentMedicoPersonId = isMedico && !isMedicoCompetente ? user?.id : undefined;
    const fileInputRef = useRef<HTMLInputElement>(null);

    // P61: Tenant filter for prestazioni - rispetta X-Operate-Tenant-Id
    const { getTenantFilterParams, tenantFilterKey, isReady: tenantReady } = useTenantFilter();

    // Credentials modal state
    const [credentialsModal, setCredentialsModal] = useState<CredentialsModalState>({
        open: false,
        credentials: null
    });

    // Conflict modal state (for cross-tenant handling)
    const [conflictModal, setConflictModal] = useState<ConflictModalState>({
        open: false,
        message: ''
    });

    // Specialties dropdown state
    const [showSpecialtiesDropdown, setShowSpecialtiesDropdown] = useState(false);
    const [customSpecialty, setCustomSpecialty] = useState('');
    const [specialtySearch, setSpecialtySearch] = useState('');
    const [availableSpecialties, setAvailableSpecialties] = useState<string[]>(getAllSpecialties());
    const specialtiesRef = useRef<HTMLDivElement>(null);

    // Prestazioni state - only showAllPrestazioni needed for the new selector
    const [showAllPrestazioni, setShowAllPrestazioni] = useState(false);

    // Documents state
    const [showDocumentModal, setShowDocumentModal] = useState(false);
    const [documentForm, setDocumentForm] = useState<DocumentFormState>({
        tipo: 'CONTRATTO',
        titolo: '',
        descrizione: '',
        dataScadenza: '',
        file: null
    });
    const [isUploadingDoc, setIsUploadingDoc] = useState(false);

    // Form state
    const [formData, setFormData] = useState<MedicoFormData>(getInitialFormData());
    const [errors, setErrors] = useState<Partial<Record<keyof MedicoFormData, string>>>({});

    // Fetch prestazioni for selection - P61: Uses tenant filter to get prestazioni from selected tenant
    const { data: prestazioniResponse } = useQuery({
        queryKey: ['prestazioni', tenantFilterKey],
        queryFn: () => prestazioniApi.getAll({ ...getTenantFilterParams(), limit: 500 }),
        staleTime: 5 * 60 * 1000,
        enabled: tenantReady
    });
    const prestazioniList = prestazioniResponse?.data || [];

    // Fetch documents for this medico (only in edit mode)
    const { data: documents = [], refetch: refetchDocuments } = useQuery({
        queryKey: ['medico-documents', id],
        queryFn: () => mediciApi.getDocuments(id!),
        enabled: !!isEdit && !!id,
        staleTime: 30 * 1000
    });

    // Refresh available specialties when dropdown opens
    useEffect(() => {
        if (showSpecialtiesDropdown) {
            setAvailableSpecialties(getAllSpecialties());
        }
    }, [showSpecialtiesDropdown]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (specialtiesRef.current && !specialtiesRef.current.contains(event.target as Node)) {
                setShowSpecialtiesDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Auto-extract birthDate, gender, birthPlace, birthProvince from taxCode (16 chars)
    useEffect(() => {
        if (formData.taxCode && formData.taxCode.length === 16) {
            const updates: Partial<typeof formData> = {};

            if (!formData.birthDate) {
                const extractedDate = extractBirthDateFromCF(formData.taxCode);
                if (extractedDate) updates.birthDate = extractedDate;
            }
            if (!formData.gender) {
                const g = extractGenderFromTaxCode(formData.taxCode);
                if (g) updates.gender = g as typeof formData.gender;
            }
            if (!formData.birthPlace) {
                const bp = extractBirthPlaceFromTaxCode(formData.taxCode);
                if (bp) {
                    updates.birthPlace = bp.comune;
                    if (!formData.birthProvince && bp.provincia) {
                        updates.birthProvince = bp.provincia;
                    }
                }
            }

            if (Object.keys(updates).length > 0) {
                setFormData(prev => ({ ...prev, ...updates }));
            }
        }
    }, [formData.taxCode]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-calculate taxCode when all required fields are set and taxCode is empty
    useEffect(() => {
        if (
            !formData.taxCode &&
            formData.firstName &&
            formData.lastName &&
            formData.birthDate &&
            formData.gender &&
            formData.birthPlace
        ) {
            const computed = generateTaxCode(
                formData.lastName,
                formData.firstName,
                formData.birthDate,
                formData.gender || 'MALE',
                formData.birthPlace
            );
            if (computed) {
                setFormData(prev => ({ ...prev, taxCode: computed }));
            }
        }
    }, [formData.firstName, formData.lastName, formData.birthDate, formData.gender, formData.birthPlace]); // eslint-disable-line react-hooks/exhaustive-deps

    // Fetch existing medico for edit
    const { data: medicoData, isLoading: isLoadingMedico } = useQuery({
        queryKey: ['medico', id],
        queryFn: () => mediciApi.getById(id!),
        enabled: !!isEdit
    });

    // Populate form when editing
    useEffect(() => {
        if (medicoData) {
            const data = medicoData as unknown as Record<string, unknown>;
            const abilitazioni = (data.abilitazioni as Array<{ prestazioneId: string }>) || [];
            const prestazioniIds = abilitazioni.map(a => a.prestazioneId);

            setFormData({
                firstName: medicoData.firstName || '',
                lastName: medicoData.lastName || '',
                email: medicoData.email || '',
                phone: medicoData.phone || '',
                taxCode: medicoData.taxCode || '',
                birthDate: data.birthDate ? String(data.birthDate).split('T')[0] : '',
                gender: (data.gender as typeof formData.gender) || '',
                birthPlace: (data.birthPlace as string) || '',
                birthProvince: (data.birthProvince as string) || '',
                pec: (data.pec as string) || '',
                residenceAddress: (data.residenceAddress as string) || '',
                residenceCity: (data.residenceCity as string) || '',
                province: (data.province as string) || '',
                postalCode: (data.postalCode as string) || '',
                iban: (data.iban as string) || '',
                profileImage: medicoData.profileImage || '',
                notes: medicoData.notes || '',
                specialties: Array.isArray(data.specialties) ? data.specialties as string[] : [],
                registerCode: (data.registerCode as string) || '',
                registerCode2: (data.registerCode2 as string) || '',
                shortDescription: (data.shortDescription as string) || '',
                fullDescription: (data.fullDescription as string) || '',
                prestazioniIds,
                createAccount: !!medicoData.username,
                password: DEFAULT_PASSWORD
            });
        }
    }, [medicoData]);

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (data: Partial<Medico> & {
            createAccount?: boolean;
            password?: string;
            specialties?: string[];
            alboRegione?: string;
            registerCode?: string;
            registerCode2?: string;
            shortDescription?: string;
            fullDescription?: string;
            prestazioniIds?: string[];
        }) => mediciApi.create(data),
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ['medici'] });
            showToast({ type: 'success', message: 'Medico creato con successo' });

            if (response?.credentials) {
                setCredentialsModal({
                    open: true,
                    credentials: response.credentials
                });
            } else {
                navigate('/poliambulatorio/personale/medici');
            }
        },
        onError: (error: Error & {
            response?: {
                status?: number;
                data?: {
                    error?: string;
                    existingPersonId?: string;
                    existingPersonName?: string;
                    canEnable?: boolean;
                }
            }
        }) => {
            if (error.response?.status === 409 || error.message?.includes('409') || error.message?.includes('già')) {
                const responseData = error.response?.data;
                setConflictModal({
                    open: true,
                    message: responseData?.error || 'Codice fiscale già presente nel sistema',
                    existingPersonId: responseData?.existingPersonId,
                    existingPersonName: responseData?.existingPersonName,
                    canEnable: responseData?.canEnable
                });
            } else {
                showToast({ type: 'error', message: 'Errore nella creazione' });
            }
        }
    });

    // Enable existing person as medico mutation
    const enableMedicoMutation = useMutation({
        mutationFn: (data: Parameters<typeof mediciApi.enable>[0]) =>
            mediciApi.enable(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['medici'] });
            showToast({ type: 'success', message: 'Medico abilitato con successo' });
            setConflictModal({ open: false, message: '' });
            navigate('/poliambulatorio/personale/medici');
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore nell\'abilitazione' });
        }
    });

    // Document upload mutation
    const uploadDocumentMutation = useMutation({
        mutationFn: async (data: CreatePersonDocumentInput) => {
            return mediciApi.uploadDocument(id!, data);
        },
        onSuccess: () => {
            refetchDocuments();
            setShowDocumentModal(false);
            setDocumentForm({
                tipo: 'CONTRATTO',
                titolo: '',
                descrizione: '',
                dataScadenza: '',
                file: null
            });
            showToast({ type: 'success', message: 'Documento caricato con successo' });
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore nel caricamento' });
        }
    });

    // Delete document mutation
    const deleteDocumentMutation = useMutation({
        mutationFn: (docId: string) => mediciApi.deleteDocument(id!, docId),
        onSuccess: () => {
            refetchDocuments();
            showToast({ type: 'success', message: 'Documento eliminato' });
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore nell\'eliminazione' });
        }
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: (data: Partial<Medico> & {
            specialties?: string[];
            registerCode?: string;
            registerCode2?: string;
            shortDescription?: string;
            fullDescription?: string;
            prestazioniIds?: string[];
        }) => mediciApi.update(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['medici'] });
            queryClient.invalidateQueries({ queryKey: ['medico', id] });
            showToast({ type: 'success', message: 'Medico aggiornato con successo' });
            navigate(`/poliambulatorio/personale/medici/${id}`);
        },
        onError: (error: Error & {
            response?: { status?: number; data?: { error?: string } }
        }) => {
            if (error.response?.status === 409) {
                showToast({ type: 'error', message: error.response.data?.error || 'Codice fiscale già esistente' });
            } else {
                showToast({ type: 'error', message: 'Errore nell\'aggiornamento' });
            }
        }
    });

    const validateForm = (): boolean => {
        const newErrors: Partial<Record<keyof MedicoFormData, string>> = {};

        if (!formData.firstName.trim()) {
            newErrors.firstName = 'Il nome è obbligatorio';
        }
        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Il cognome è obbligatorio';
        }
        if (!formData.taxCode || formData.taxCode.length !== 16) {
            newErrors.taxCode = 'Il codice fiscale è obbligatorio (16 caratteri)';
        }
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Email non valida';
        }
        if (formData.pec && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.pec)) {
            newErrors.pec = 'PEC non valida';
        }
        if (formData.postalCode && !/^\d{5}$/.test(formData.postalCode)) {
            newErrors.postalCode = 'CAP non valido (5 cifre)';
        }
        if (formData.iban && !/^IT\d{2}[A-Z]\d{22}$/.test(formData.iban.replace(/\s/g, '').toUpperCase())) {
            newErrors.iban = 'IBAN italiano non valido';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle specialty toggle
    const toggleSpecialty = (specialty: string) => {
        setFormData(prev => ({
            ...prev,
            specialties: prev.specialties.includes(specialty)
                ? prev.specialties.filter(s => s !== specialty)
                : [...prev.specialties, specialty]
        }));
    };

    // Handle custom specialty add
    const addCustomSpecialty = () => {
        const trimmed = customSpecialty.trim();
        if (trimmed && !formData.specialties.includes(trimmed)) {
            addSpecialtyToStore(trimmed);
            setAvailableSpecialties(getAllSpecialties());
            setFormData(prev => ({
                ...prev,
                specialties: [...prev.specialties, trimmed]
            }));
            setCustomSpecialty('');
            showToast({ type: 'success', message: `Specializzazione "${trimmed}" aggiunta e sincronizzata` });
        }
    };

    // Filter specialties based on search
    const filteredSpecializzazioni = availableSpecialties.filter(s =>
        s.toLowerCase().includes(specialtySearch.toLowerCase())
    );

    // Handle quick add from search
    const handleQuickAddSpecialty = () => {
        const trimmed = specialtySearch.trim();
        if (trimmed && !availableSpecialties.includes(trimmed)) {
            addSpecialtyToStore(trimmed);
            setAvailableSpecialties(getAllSpecialties());
            toggleSpecialty(trimmed);
            setSpecialtySearch('');
            showToast({ type: 'success', message: `Specializzazione "${trimmed}" aggiunta` });
        }
    };

    // Handle profile image upload
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, profileImage: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const baseAnagraficaData = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            taxCode: formData.taxCode,
            birthDate: formData.birthDate || undefined,
            gender: formData.gender || undefined,
            birthPlace: formData.birthPlace || undefined,
            birthProvince: formData.birthProvince || undefined,
            pec: formData.pec || undefined,
            residenceAddress: formData.residenceAddress || undefined,
            residenceCity: formData.residenceCity || undefined,
            province: formData.province || undefined,
            postalCode: formData.postalCode || undefined,
            iban: formData.iban?.replace(/\s/g, '').toUpperCase() || undefined,
            profileImage: formData.profileImage || undefined,
        };

        const submitData = currentMedicoPersonId ? baseAnagraficaData : {
            ...baseAnagraficaData,
            notes: formData.notes || undefined,
            specialties: formData.specialties.length > 0 ? formData.specialties : undefined,
            registerCode: formData.registerCode || undefined,
            registerCode2: formData.registerCode2 || undefined,
            shortDescription: formData.shortDescription || undefined,
            fullDescription: formData.fullDescription || undefined,
            prestazioniIds: formData.prestazioniIds.length > 0 ? formData.prestazioniIds : undefined,
            ...(isEdit ? {} : {
                createAccount: formData.createAccount,
                password: formData.createAccount ? formData.password : undefined
            })
        };

        if (currentMedicoPersonId && id && id !== currentMedicoPersonId && medicoData?.personId !== currentMedicoPersonId) {
            showToast({ type: 'error', message: 'Puoi modificare solo il tuo profilo anagrafico' });
            return;
        }

        if (isEdit) {
            updateMutation.mutate(submitData);
        } else {
            createMutation.mutate(submitData);
        }
    };

    // Handle enable existing person as medico
    const handleEnableMedico = () => {
        if (conflictModal.existingPersonId) {
            enableMedicoMutation.mutate({
                personId: conflictModal.existingPersonId,
                email: formData.email,
                phone: formData.phone,
                pec: formData.pec,
                residenceAddress: formData.residenceAddress,
                residenceCity: formData.residenceCity,
                province: formData.province,
                postalCode: formData.postalCode,
                iban: formData.iban,
                notes: formData.notes,
                specialties: formData.specialties,
                registerCode: formData.registerCode,
                registerCode2: formData.registerCode2,
                shortDescription: formData.shortDescription,
                fullDescription: formData.fullDescription,
                prestazioniIds: formData.prestazioniIds.length > 0 ? formData.prestazioniIds : undefined
            });
        }
    };

    // Handle document upload
    const handleDocumentUpload = async () => {
        if (!documentForm.file || !documentForm.tipo || !documentForm.titolo) {
            showToast({ type: 'error', message: 'Seleziona un file e compila i campi obbligatori' });
            return;
        }

        setIsUploadingDoc(true);

        try {
            const fileUrl = URL.createObjectURL(documentForm.file);

            await uploadDocumentMutation.mutateAsync({
                tipo: documentForm.tipo,
                titolo: documentForm.titolo,
                descrizione: documentForm.descrizione || undefined,
                fileName: documentForm.file.name,
                fileUrl: fileUrl,
                fileSize: documentForm.file.size,
                mimeType: documentForm.file.type || 'application/pdf',
                dataScadenza: documentForm.dataScadenza || undefined
            });
        } catch {
            // Error handled by mutation
        } finally {
            setIsUploadingDoc(false);
        }
    };

    const handleCredentialsModalClose = () => {
        setCredentialsModal({ open: false, credentials: null });
        navigate('/poliambulatorio/personale/medici');
    };

    const isPending = createMutation.isPending || updateMutation.isPending || enableMedicoMutation.isPending;

    if (isEdit && isLoadingMedico) {
        return (
            <div className="p-6 clinica-theme">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
                    <span className="ml-2 text-gray-600">Caricamento medico...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto clinica-theme" data-brand="element-medica">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate('/poliambulatorio/personale/medici')}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Stethoscope className="h-7 w-7 text-teal-600" />
                        {isEdit ? 'Modifica Medico' : 'Nuovo Medico'}
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {isEdit
                            ? 'Modifica i dati del medico'
                            : 'Inserisci i dati del nuovo medico'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Foto Profilo */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Camera className="h-5 w-5 text-teal-600" />
                        Foto Profilo
                    </h2>
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            {formData.profileImage ? (
                                <img
                                    src={formData.profileImage}
                                    alt="Foto profilo"
                                    className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                                    <User className="h-10 w-10 text-gray-400" />
                                </div>
                            )}
                            {formData.profileImage && (
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, profileImage: '' })}
                                    className="absolute -top-1 -right-1 p-1 bg-red-100 rounded-full hover:bg-red-200 transition-colors"
                                >
                                    <X className="h-4 w-4 text-red-600" />
                                </button>
                            )}
                        </div>
                        <div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                            >
                                <Camera className="h-4 w-4" />
                                {formData.profileImage ? 'Cambia foto' : 'Carica foto'}
                            </button>
                            <p className="text-xs text-gray-500 mt-2">JPG, PNG. Max 5MB</p>
                        </div>
                    </div>
                </div>

                {/* Dati Anagrafici */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <User className="h-5 w-5 text-teal-600" />
                        Dati Anagrafici
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nome *
                            </label>
                            <input
                                type="text"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${errors.firstName ? 'border-red-500' : 'border-gray-200'
                                    }`}
                                placeholder="Mario"
                            />
                            {errors.firstName && (
                                <p className="text-sm text-red-500 mt-1">{errors.firstName}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cognome *
                            </label>
                            <input
                                type="text"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${errors.lastName ? 'border-red-500' : 'border-gray-200'
                                    }`}
                                placeholder="Rossi"
                            />
                            {errors.lastName && (
                                <p className="text-sm text-red-500 mt-1">{errors.lastName}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <CreditCard className="inline h-4 w-4 mr-1" />
                                Codice Fiscale *
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={formData.taxCode}
                                    onChange={(e) => setFormData({ ...formData, taxCode: e.target.value.toUpperCase() })}
                                    maxLength={16}
                                    className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent font-mono uppercase ${errors.taxCode ? 'border-red-500' : formData.taxCode.length === 16 ? 'border-teal-400' : 'border-gray-200'}`}
                                    placeholder="RSSMRA80A01H501U"
                                />
                                {(formData.firstName && formData.lastName && formData.birthDate && formData.gender && formData.birthPlace) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const computed = generateTaxCode(
                                                formData.lastName, formData.firstName,
                                                formData.birthDate, formData.gender || 'MALE', formData.birthPlace
                                            );
                                            if (computed) setFormData(prev => ({ ...prev, taxCode: computed }));
                                        }}
                                        className="px-3 py-2 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 whitespace-nowrap"
                                        title="Ricalcola il codice fiscale dai dati anagrafici"
                                    >
                                        Ricalcola
                                    </button>
                                )}
                            </div>
                            {errors.taxCode && (
                                <p className="text-sm text-red-500 mt-1">{errors.taxCode}</p>
                            )}
                            {!errors.taxCode && formData.taxCode.length === 16 && (
                                <p className="text-xs text-teal-600 mt-1">✓ Codice fiscale compilato</p>
                            )}
                            {!formData.taxCode && formData.firstName && formData.lastName && formData.birthDate && formData.gender && formData.birthPlace && (
                                <p className="text-xs text-amber-600 mt-1">Usa "Ricalcola" per generarlo automaticamente</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Calendar className="inline h-4 w-4 mr-1" />
                                Data di Nascita
                            </label>
                            <DatePickerElegante
                                value={formData.birthDate}
                                onChange={(date) => setFormData({ ...formData, birthDate: date ? date.toISOString().split('T')[0] : '' })}
                                theme="teal"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Auto-calcolata dal codice fiscale
                            </p>
                        </div>

                        {/* Sesso */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <User className="inline h-4 w-4 mr-1" />
                                Sesso
                            </label>
                            <select
                                value={formData.gender}
                                onChange={(e) => setFormData({ ...formData, gender: e.target.value as typeof formData.gender })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                            >
                                <option value="">— Seleziona —</option>
                                <option value="MALE">Maschile (M)</option>
                                <option value="FEMALE">Femminile (F)</option>
                                <option value="OTHER">Altro</option>
                                <option value="NOT_SPECIFIED">Non specificato</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Auto-ricavato dal codice fiscale</p>
                        </div>

                        {/* Comune di nascita */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <MapPin className="inline h-4 w-4 mr-1" />
                                Comune di Nascita
                            </label>
                            <input
                                type="text"
                                value={formData.birthPlace}
                                onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                placeholder="es. Milano"
                            />
                            <p className="text-xs text-gray-500 mt-1">Necessario per calcolare il codice fiscale</p>
                        </div>

                        {/* Provincia di nascita */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <MapPin className="inline h-4 w-4 mr-1" />
                                Provincia di Nascita
                            </label>
                            <select
                                value={formData.birthProvince}
                                onChange={(e) => setFormData({ ...formData, birthProvince: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                            >
                                <option value="">— Seleziona —</option>
                                <option value="EE">Estero (EE)</option>
                                {PROVINCE.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Auto-ricavata dal codice fiscale</p>
                        </div>
                    </div>
                </div>

                {/* Contatti */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Mail className="h-5 w-5 text-teal-600" />
                        Contatti
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Mail className="inline h-4 w-4 mr-1" />
                                Email
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${errors.email ? 'border-red-500' : 'border-gray-200'
                                    }`}
                                placeholder="mario.rossi@email.com"
                            />
                            {errors.email && (
                                <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Mail className="inline h-4 w-4 mr-1" />
                                PEC
                            </label>
                            <input
                                type="email"
                                value={formData.pec}
                                onChange={(e) => setFormData({ ...formData, pec: e.target.value })}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${errors.pec ? 'border-red-500' : 'border-gray-200'
                                    }`}
                                placeholder="mario.rossi@pec.it"
                            />
                            {errors.pec && (
                                <p className="text-sm text-red-500 mt-1">{errors.pec}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Phone className="inline h-4 w-4 mr-1" />
                                Telefono
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                placeholder="+39 333 1234567"
                            />
                        </div>
                    </div>
                </div>

                {/* Residenza */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-teal-600" />
                        Residenza
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Indirizzo
                            </label>
                            <input
                                type="text"
                                value={formData.residenceAddress}
                                onChange={(e) => setFormData({ ...formData, residenceAddress: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                placeholder="Via Roma 123"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Città
                            </label>
                            <input
                                type="text"
                                value={formData.residenceCity}
                                onChange={(e) => setFormData({ ...formData, residenceCity: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                placeholder="Roma"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Provincia
                                </label>
                                <select
                                    value={formData.province}
                                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                >
                                    <option value="">Seleziona...</option>
                                    {PROVINCE.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    CAP
                                </label>
                                <input
                                    type="text"
                                    value={formData.postalCode}
                                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                                    maxLength={5}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${errors.postalCode ? 'border-red-500' : 'border-gray-200'
                                        }`}
                                    placeholder="00100"
                                />
                                {errors.postalCode && (
                                    <p className="text-sm text-red-500 mt-1">{errors.postalCode}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dati Bancari */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Landmark className="h-5 w-5 text-teal-600" />
                        Dati Bancari
                    </h2>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            IBAN
                        </label>
                        <input
                            type="text"
                            value={formData.iban}
                            onChange={(e) => setFormData({ ...formData, iban: e.target.value.toUpperCase() })}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent font-mono uppercase ${errors.iban ? 'border-red-500' : 'border-gray-200'
                                }`}
                            placeholder="IT60X0542811101000000123456"
                        />
                        {errors.iban && (
                            <p className="text-sm text-red-500 mt-1">{errors.iban}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            Per accredito competenze (formato: IT + 2 cifre + 1 lettera + 22 cifre)
                        </p>
                    </div>
                </div>

                {/* Dati Professionali */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-teal-600" />
                        Dati Professionali
                    </h2>

                    <div className="space-y-4">
                        {/* Specializzazioni */}
                        <div ref={specialtiesRef} className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Award className="inline h-4 w-4 mr-1" />
                                Specializzazioni
                            </label>

                            {/* Selected specialties */}
                            <div className="flex flex-wrap gap-2 mb-2">
                                {formData.specialties.map(specialty => (
                                    <span
                                        key={specialty}
                                        className="inline-flex items-center gap-1 px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm"
                                    >
                                        {specialty}
                                        <button
                                            type="button"
                                            onClick={() => toggleSpecialty(specialty)}
                                            className="p-0.5 hover:bg-teal-200 rounded-full"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>

                            {/* Dropdown trigger */}
                            <button
                                type="button"
                                onClick={() => setShowSpecialtiesDropdown(!showSpecialtiesDropdown)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg flex items-center justify-between hover:border-teal-400 transition-colors"
                            >
                                <span className="text-gray-500">
                                    {formData.specialties.length > 0
                                        ? `${formData.specialties.length} specializzazioni selezionate`
                                        : 'Seleziona specializzazioni...'}
                                </span>
                                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showSpecialtiesDropdown ? 'rotate-180' : ''
                                    }`} />
                            </button>

                            {/* Dropdown */}
                            {showSpecialtiesDropdown && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
                                    {/* Search */}
                                    <div className="p-2 border-b border-gray-100">
                                        <input
                                            type="text"
                                            value={specialtySearch}
                                            onChange={(e) => setSpecialtySearch(e.target.value)}
                                            className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-teal-500 focus:border-transparent"
                                            placeholder="Cerca specializzazione..."
                                        />
                                    </div>

                                    {/* Options */}
                                    <div className="max-h-48 overflow-y-auto">
                                        {filteredSpecializzazioni.length > 0 ? (
                                            filteredSpecializzazioni.map(specialty => (
                                                <button
                                                    key={specialty}
                                                    type="button"
                                                    onClick={() => toggleSpecialty(specialty)}
                                                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${formData.specialties.includes(specialty) ? 'bg-teal-50 text-teal-700' : ''
                                                        }`}
                                                >
                                                    {specialty}
                                                    {formData.specialties.includes(specialty) && (
                                                        <span className="text-teal-600">✓</span>
                                                    )}
                                                </button>
                                            ))
                                        ) : specialtySearch && (
                                            <button
                                                type="button"
                                                onClick={handleQuickAddSpecialty}
                                                className="w-full px-3 py-2 text-left text-sm text-teal-600 hover:bg-teal-50 flex items-center gap-2"
                                            >
                                                <Plus className="h-4 w-4" />
                                                Aggiungi "{specialtySearch}"
                                            </button>
                                        )}
                                    </div>

                                    {/* Custom specialty input */}
                                    <div className="p-2 border-t border-gray-100">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={customSpecialty}
                                                onChange={(e) => setCustomSpecialty(e.target.value)}
                                                className="flex-1 px-3 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-teal-500"
                                                placeholder="Nuova specializzazione..."
                                            />
                                            <button
                                                type="button"
                                                onClick={addCustomSpecialty}
                                                disabled={!customSpecialty.trim()}
                                                className="px-3 py-1.5 bg-teal-600 text-white rounded text-sm hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Albo */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <Building className="inline h-4 w-4 mr-1" />
                                    N° Iscrizione Albo Medici
                                </label>
                                <input
                                    type="text"
                                    value={formData.registerCode}
                                    onChange={(e) => setFormData({ ...formData, registerCode: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                    placeholder="Es: RM 123456"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <Building className="inline h-4 w-4 mr-1" />
                                    N° Iscrizione Albo (Lavoro/Sport)
                                </label>
                                <input
                                    type="text"
                                    value={formData.registerCode2}
                                    onChange={(e) => setFormData({ ...formData, registerCode2: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                    placeholder="Es: ELENCO MED. LAVORO"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Per medicina del lavoro o medicina sportiva
                                </p>
                            </div>
                        </div>

                        {/* Descrizioni */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Breve Descrizione
                            </label>
                            <input
                                type="text"
                                value={formData.shortDescription}
                                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                                maxLength={200}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                placeholder="Es: Specialista in Cardiologia con 15 anni di esperienza"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Max 200 caratteri - Mostrata nelle liste e nei profili
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Descrizione Completa
                            </label>
                            <textarea
                                value={formData.fullDescription}
                                onChange={(e) => setFormData({ ...formData, fullDescription: e.target.value })}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                                placeholder="Descrizione estesa del profilo professionale, formazione, esperienze..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Note Interne
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                                placeholder="Note riservate visibili solo agli amministratori..."
                            />
                        </div>
                    </div>
                </div>

                {!currentMedicoPersonId && (
                    <PrestazioniAbilitateSelector
                        prestazioni={prestazioniList}
                        selectedIds={formData.prestazioniIds}
                        onSelectionChange={(ids) => setFormData(prev => ({ ...prev, prestazioniIds: ids }))}
                        specialties={formData.specialties}
                        showAllPrestazioni={showAllPrestazioni}
                        onShowAllChange={setShowAllPrestazioni}
                    />
                )}

                {/* Documenti (solo in modifica) */}
                {isEdit && !currentMedicoPersonId && (
                    <DocumentsList
                        documents={documents}
                        onAddDocument={() => setShowDocumentModal(true)}
                        onDeleteDocument={(docId) => deleteDocumentMutation.mutate(docId)}
                    />
                )}

                {/* Account Utente (solo in creazione) */}
                {!isEdit && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Key className="h-5 w-5 text-teal-600" />
                            Account Utente
                        </h2>

                        <div className="space-y-4">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.createAccount}
                                    onChange={(e) => setFormData({ ...formData, createAccount: e.target.checked })}
                                    className="mt-1 h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                                />
                                <div>
                                    <span className="text-sm font-medium text-gray-900">
                                        Crea account di accesso
                                    </span>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Il medico potrà accedere al sistema con le proprie credenziali
                                    </p>
                                </div>
                            </label>

                            {formData.createAccount && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium text-blue-900">
                                                Credenziali account
                                            </p>
                                            <p className="text-sm text-blue-700 mt-1">
                                                Le credenziali (username e password) verranno mostrate al completamento della creazione.
                                            </p>
                                            <p className="text-xs text-blue-600 mt-2">
                                                La password deve essere cambiata al primo accesso
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/poliambulatorio/personale/medici')}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Annulla
                    </button>
                    <button
                        type="submit"
                        disabled={isPending}
                        className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Salvataggio...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                {isEdit ? 'Salva Modifiche' : 'Crea Medico'}
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Modals */}
            <CredentialsModal
                state={credentialsModal}
                onClose={handleCredentialsModalClose}
            />

            <ConflictModal
                state={conflictModal}
                onClose={() => setConflictModal({ open: false, message: '' })}
                onEnable={handleEnableMedico}
                onBack={() => {
                    setConflictModal({ open: false, message: '' });
                    navigate('/poliambulatorio/personale/medici');
                }}
                isEnabling={enableMedicoMutation.isPending}
            />

            <DocumentUploadModal
                isOpen={showDocumentModal}
                onClose={() => setShowDocumentModal(false)}
                documentForm={documentForm}
                setDocumentForm={setDocumentForm}
                onUpload={handleDocumentUpload}
                isUploading={isUploadingDoc}
            />
        </div>
    );
};

export default MedicoForm;
