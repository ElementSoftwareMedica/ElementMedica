/**
 * MedicoForm
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
 * @module pages/poliambulatorio/personale/MedicoForm
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
    CheckCircle2,
    Info,
    MapPin,
    Calendar,
    Camera,
    FileText,
    Plus,
    X,
    ChevronDown,
    Briefcase,
    Award,
    Landmark,
    Upload,
    Trash2,
    Clock,
    ExternalLink
} from 'lucide-react';
import {
    mediciApi,
    prestazioniApi,
    type Medico,
    type Prestazione,
    type PersonDocument,
    type TipoDocumentoPersonale,
    type CreatePersonDocumentInput
} from '../../../services/clinicaApi';
import { useToast } from '../../../hooks/useToast';
import { getAllSpecialties, addCustomSpecialty as addSpecialtyToStore } from '../../../constants/specialties';
import Modal from '../../../design-system/molecules/Modal/Modal';

// Import Element Medica theme
import '../../../styles/clinica-theme.css';

// Specializzazioni now use centralized module for sync with prestazioni branche
// Custom specialties can be added and will appear in both medici and prestazioni

// Province italiane
const PROVINCE = [
    'AG', 'AL', 'AN', 'AO', 'AP', 'AQ', 'AR', 'AT', 'AV', 'BA', 'BG', 'BI', 'BL', 'BN', 'BO',
    'BR', 'BS', 'BT', 'BZ', 'CA', 'CB', 'CE', 'CH', 'CL', 'CN', 'CO', 'CR', 'CS', 'CT', 'CZ',
    'EN', 'FC', 'FE', 'FG', 'FI', 'FM', 'FR', 'GE', 'GO', 'GR', 'IM', 'IS', 'KR', 'LC', 'LE',
    'LI', 'LO', 'LT', 'LU', 'MB', 'MC', 'ME', 'MI', 'MN', 'MO', 'MS', 'MT', 'NA', 'NO', 'NU',
    'OR', 'PA', 'PC', 'PD', 'PE', 'PG', 'PI', 'PN', 'PO', 'PR', 'PT', 'PU', 'PV', 'PZ', 'RA',
    'RC', 'RE', 'RG', 'RI', 'RM', 'RN', 'RO', 'SA', 'SI', 'SO', 'SP', 'SR', 'SS', 'SU', 'SV',
    'TA', 'TE', 'TN', 'TO', 'TP', 'TR', 'TS', 'TV', 'UD', 'VA', 'VB', 'VC', 'VE', 'VI', 'VR', 'VT', 'VV'
];

// Tipi di documenti personali per medici con labels (solo documenti dipendente/medico, non clinici)
const DOCUMENT_TYPES: { value: TipoDocumentoPersonale; label: string; hasExpiry?: boolean }[] = [
    { value: 'ALLEGATO_3', label: 'Allegato 3 (Autocertificazione)' },
    { value: 'CONTRATTO', label: 'Contratto di Lavoro' },
    { value: 'ASSICURAZIONE', label: 'Polizza RC Professionale', hasExpiry: true },
    { value: 'ISCRIZIONE_ALBO', label: 'Certificato Iscrizione Albo' },
    { value: 'CURRICULUM', label: 'Curriculum Vitae' },
    { value: 'LAUREA', label: 'Diploma di Laurea' },
    { value: 'SPECIALIZZAZIONE', label: 'Attestato Specializzazione' },
    { value: 'FORMAZIONE', label: 'Attestato Formazione/ECM', hasExpiry: true },
    { value: 'DOCUMENTO_IDENTITA', label: 'Documento di Identità', hasExpiry: true },
    { value: 'CODICE_FISCALE', label: 'Tessera Sanitaria/CF' },
    { value: 'CERTIFICATO_PENALE', label: 'Casellario Giudiziale', hasExpiry: true },
    { value: 'VISITA_MEDICA_IDONEITA', label: 'Idoneità Sanitaria', hasExpiry: true },
    { value: 'PRIVACY', label: 'Consenso Privacy' },
    { value: 'ALTRO', label: 'Altro' }
];

interface MedicoFormData {
    // Dati anagrafici
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    taxCode: string;
    birthDate: string;
    pec: string;
    // Residenza
    residenceAddress: string;
    residenceCity: string;
    province: string;
    postalCode: string;
    // Dati bancari
    iban: string;
    // Profilo
    profileImage: string;
    notes: string;
    // Dati professionali
    specialties: string[];
    registerCode: string;
    registerCode2: string;
    shortDescription: string;
    fullDescription: string;
    // Prestazioni abilitate
    prestazioniIds: string[];
    // Account
    createAccount: boolean;
    password: string;
}

const DEFAULT_PASSWORD = 'Password1!';

/**
 * Estrae la data di nascita dal codice fiscale italiano
 * @param cf - Codice fiscale (16 caratteri)
 * @returns Data in formato YYYY-MM-DD o null se non valido
 */
const extractBirthDateFromCF = (cf: string): string | null => {
    if (!cf || cf.length < 11) return null;

    const months = ['A', 'B', 'C', 'D', 'E', 'H', 'L', 'M', 'P', 'R', 'S', 'T'];

    // Anno: caratteri 6-7
    const year = parseInt(cf.substr(6, 2), 10);
    const currentYear = new Date().getFullYear() % 100;
    const fullYear = year > currentYear ? 1900 + year : 2000 + year;

    // Mese: carattere 8 (lettera)
    const monthCode = cf.substr(8, 1).toUpperCase();
    const month = months.indexOf(monthCode) + 1;

    // Giorno: caratteri 9-10 (femmine: +40)
    let day = parseInt(cf.substr(9, 2), 10);
    if (day > 40) day -= 40;

    // Validazione
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    return `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const MedicoForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEdit = id && id !== 'nuovo';
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Credentials modal state
    const [credentialsModal, setCredentialsModal] = useState<{
        open: boolean;
        credentials: { username: string; temporaryPassword: string } | null;
    }>({ open: false, credentials: null });

    // Conflict modal state (for cross-tenant handling)
    const [conflictModal, setConflictModal] = useState<{
        open: boolean;
        message: string;
        existingPersonId?: string;
        existingPersonName?: string;
        canEnable?: boolean;
    }>({ open: false, message: '' });

    // Specialties dropdown state - using centralized specialties
    const [showSpecialtiesDropdown, setShowSpecialtiesDropdown] = useState(false);
    const [customSpecialty, setCustomSpecialty] = useState('');
    const [specialtySearch, setSpecialtySearch] = useState('');
    const [availableSpecialties, setAvailableSpecialties] = useState<string[]>(getAllSpecialties());
    const specialtiesRef = useRef<HTMLDivElement>(null);

    // Refresh available specialties when dropdown opens
    useEffect(() => {
        if (showSpecialtiesDropdown) {
            setAvailableSpecialties(getAllSpecialties());
        }
    }, [showSpecialtiesDropdown]);

    // Prestazioni state
    const [showPrestazioniDropdown, setShowPrestazioniDropdown] = useState(false);
    const [prestazioniSearch, setPrestazioniSearch] = useState('');
    const [showAllPrestazioni, setShowAllPrestazioni] = useState(false);
    const prestazioniRef = useRef<HTMLDivElement>(null);

    // Documents state
    const [showDocumentModal, setShowDocumentModal] = useState(false);
    const [documentForm, setDocumentForm] = useState<{
        tipo: TipoDocumentoPersonale;
        titolo: string;
        descrizione: string;
        dataScadenza: string;
        file: File | null;
    }>({
        tipo: 'CONTRATTO',
        titolo: '',
        descrizione: '',
        dataScadenza: '',
        file: null
    });
    const [isUploadingDoc, setIsUploadingDoc] = useState(false);
    const documentInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [formData, setFormData] = useState<MedicoFormData>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        taxCode: '',
        birthDate: '',
        pec: '',
        residenceAddress: '',
        residenceCity: '',
        province: '',
        postalCode: '',
        iban: '',
        profileImage: '',
        notes: '',
        specialties: [],
        registerCode: '',
        registerCode2: '',
        shortDescription: '',
        fullDescription: '',
        prestazioniIds: [],
        createAccount: true,
        password: DEFAULT_PASSWORD
    });

    const [errors, setErrors] = useState<Partial<Record<keyof MedicoFormData, string>>>({});

    // Fetch prestazioni for selection
    const { data: prestazioniResponse } = useQuery({
        queryKey: ['prestazioni'],
        queryFn: () => prestazioniApi.getAll(),
        staleTime: 5 * 60 * 1000
    });

    // Extract prestazioni array from paginated response
    const prestazioniList = prestazioniResponse?.data || [];

    // Fetch documents for this medico (only in edit mode)
    const { data: documents = [], refetch: refetchDocuments } = useQuery({
        queryKey: ['medico-documents', id],
        queryFn: () => mediciApi.getDocuments(id!),
        enabled: !!isEdit && !!id,
        staleTime: 30 * 1000
    });

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (specialtiesRef.current && !specialtiesRef.current.contains(event.target as Node)) {
                setShowSpecialtiesDropdown(false);
            }
            if (prestazioniRef.current && !prestazioniRef.current.contains(event.target as Node)) {
                setShowPrestazioniDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Auto-extract birthDate from taxCode
    useEffect(() => {
        if (formData.taxCode && formData.taxCode.length >= 11 && !formData.birthDate) {
            const extractedDate = extractBirthDateFromCF(formData.taxCode);
            if (extractedDate) {
                setFormData(prev => ({ ...prev, birthDate: extractedDate }));
            }
        }
    }, [formData.taxCode, formData.birthDate]);

    // Fetch existing medico for edit
    const { data: medicoData, isLoading: isLoadingMedico } = useQuery({
        queryKey: ['medico', id],
        queryFn: () => mediciApi.getById(id!),
        enabled: !!isEdit
    });

    // Populate form when editing
    useEffect(() => {
        if (medicoData) {
            // Helper to safely cast Person-compatible data
            const data = medicoData as unknown as Record<string, unknown>;

            // Extract abilitazioni (prestazioni IDs)
            const abilitazioni = (data.abilitazioni as Array<{ prestazioneId: string }>) || [];
            const prestazioniIds = abilitazioni.map(a => a.prestazioneId);

            setFormData({
                firstName: medicoData.firstName || '',
                lastName: medicoData.lastName || '',
                email: medicoData.email || '',
                phone: medicoData.phone || '',
                taxCode: medicoData.taxCode || '',
                birthDate: data.birthDate ? String(data.birthDate).split('T')[0] : '',
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
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['medici'] });
            showToast({ type: 'success', message: 'Medico creato con successo' });

            // Show credentials if account was created
            if (data && 'credentials' in data && data.credentials) {
                setCredentialsModal({
                    open: true,
                    credentials: data.credentials as { username: string; temporaryPassword: string }
                });
            } else {
                navigate('/poliambulatorio/personale/medici');
            }
        },
        onError: (error: Error & {
            response?: {
                status?: number; data?: {
                    error?: string;
                    existingPersonId?: string;
                    existingPersonName?: string;
                    canEnable?: boolean;
                }
            }
        }) => {
            // Handle 409 Conflict - person already exists
            if (error.response?.status === 409 || error.message?.includes('409') || error.message?.includes('già')) {
                const responseData = error.response?.data;
                setConflictModal({
                    open: true,
                    message: responseData?.error || error.message || 'Codice fiscale già presente nel sistema',
                    existingPersonId: responseData?.existingPersonId,
                    existingPersonName: responseData?.existingPersonName,
                    canEnable: responseData?.canEnable
                });
            } else {
                showToast({ type: 'error', message: error.message || 'Errore nella creazione' });
            }
        }
    });

    // Enable existing person as medico mutation
    const enableMedicoMutation = useMutation({
        mutationFn: (data: { personId: string; specialties?: string[]; registerCode?: string; registerCode2?: string }) =>
            mediciApi.enable(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['medici'] });
            showToast({ type: 'success', message: 'Medico abilitato con successo' });
            setConflictModal({ open: false, message: '' });
            navigate('/poliambulatorio/personale/medici');
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: error.message || 'Errore nell\'abilitazione' });
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
            showToast({ type: 'error', message: error.message || 'Errore nel caricamento' });
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
            showToast({ type: 'error', message: error.message || 'Errore nell\'eliminazione' });
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
        onError: (error: Error) => {
            showToast({ type: 'error', message: error.message || 'Errore nell\'aggiornamento' });
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

    // Handle custom specialty add - saves to both form and centralized store
    const addCustomSpecialty = () => {
        const trimmed = customSpecialty.trim();
        if (trimmed && !formData.specialties.includes(trimmed)) {
            // Add to centralized store for sync with prestazioni
            addSpecialtyToStore(trimmed);
            setAvailableSpecialties(getAllSpecialties());

            // Add to current form
            setFormData(prev => ({
                ...prev,
                specialties: [...prev.specialties, trimmed]
            }));
            setCustomSpecialty('');
            showToast({ type: 'success', message: `Specializzazione "${trimmed}" aggiunta e sincronizzata` });
        }
    };

    // Handle prestazione toggle
    const togglePrestazione = (prestazioneId: string) => {
        setFormData(prev => ({
            ...prev,
            prestazioniIds: prev.prestazioniIds.includes(prestazioneId)
                ? prev.prestazioniIds.filter(id => id !== prestazioneId)
                : [...prev.prestazioniIds, prestazioneId]
        }));
    };

    // Filter prestazioni based on search and specializzazioni
    // Se showAllPrestazioni è false, filtra per branca specialistica del medico
    const filteredPrestazioni = prestazioniList.filter(p => {
        // Prima applica il filtro di ricerca testuale
        const matchesSearch = p.nome?.toLowerCase().includes(prestazioniSearch.toLowerCase()) ||
            p.codice?.toLowerCase().includes(prestazioniSearch.toLowerCase());

        if (!matchesSearch) return false;

        // Se showAllPrestazioni è true, mostra tutte
        if (showAllPrestazioni) return true;

        // Se il medico non ha specializzazioni, mostra tutte
        if (!formData.specialties || formData.specialties.length === 0) return true;

        // Get branche della prestazione (supporta sia array che singolo valore legacy)
        const branche = p.brancheSpecialistiche && p.brancheSpecialistiche.length > 0
            ? p.brancheSpecialistiche
            : (p.brancaSpecialistica ? [p.brancaSpecialistica] : []);

        // Se la prestazione non ha branche specialistiche, mostrala sempre
        if (branche.length === 0) return true;

        // Controlla se almeno una branca della prestazione corrisponde a una delle specializzazioni del medico
        return branche.some(branca =>
            formData.specialties.some(spec =>
                branca.toLowerCase().includes(spec.toLowerCase()) ||
                spec.toLowerCase().includes(branca.toLowerCase())
            )
        );
    });

    // Filter specialties based on search using centralized list
    const filteredSpecializzazioni = availableSpecialties.filter(s =>
        s.toLowerCase().includes(specialtySearch.toLowerCase())
    );

    // Handle quick add from search - saves to store and adds to form
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
            // For now, create a data URL (in production, upload to server)
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

        const submitData = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            taxCode: formData.taxCode,
            birthDate: formData.birthDate || undefined,
            pec: formData.pec || undefined,
            residenceAddress: formData.residenceAddress || undefined,
            residenceCity: formData.residenceCity || undefined,
            province: formData.province || undefined,
            postalCode: formData.postalCode || undefined,
            iban: formData.iban?.replace(/\s/g, '').toUpperCase() || undefined,
            profileImage: formData.profileImage || undefined,
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
                specialties: formData.specialties,
                registerCode: formData.registerCode,
                registerCode2: formData.registerCode2
            });
        }
    };

    // Handle document file selection
    const handleDocumentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setDocumentForm(prev => ({
                ...prev,
                file,
                titolo: prev.titolo || file.name.replace(/\.[^/.]+$/, '') // Use filename as default title
            }));
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
            // In production, this would upload to S3/cloud storage
            // For now, create a blob URL for local development
            const fileUrl = URL.createObjectURL(documentForm.file);

            await uploadDocumentMutation.mutateAsync({
                tipo: documentForm.tipo,
                titolo: documentForm.titolo,
                descrizione: documentForm.descrizione || undefined,
                fileName: documentForm.file.name,
                fileUrl: fileUrl, // In production: S3 URL
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

    // Get document type label
    const getDocumentTypeLabel = (tipo: TipoDocumentoPersonale): string => {
        return DOCUMENT_TYPES.find(dt => dt.value === tipo)?.label || tipo;
    };

    // Check if document is expiring soon (within 30 days)
    const isExpiringSoon = (doc: PersonDocument): boolean => {
        if (!doc.dataScadenza) return false;
        const daysUntilExpiry = Math.ceil(
            (new Date(doc.dataScadenza).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
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
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${errors.firstName ? 'border-red-300' : 'border-gray-200'
                                    }`}
                                placeholder="Nome del medico"
                            />
                            {errors.firstName && (
                                <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>
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
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${errors.lastName ? 'border-red-300' : 'border-gray-200'
                                    }`}
                                placeholder="Cognome del medico"
                            />
                            {errors.lastName && (
                                <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <CreditCard className="h-4 w-4 inline mr-1" />
                                Codice Fiscale
                            </label>
                            <input
                                type="text"
                                value={formData.taxCode}
                                onChange={(e) => setFormData({ ...formData, taxCode: e.target.value.toUpperCase() })}
                                maxLength={16}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all uppercase ${errors.taxCode ? 'border-red-300' : 'border-gray-200'
                                    }`}
                                placeholder="RSSMRA80A01H501U"
                            />
                            {errors.taxCode && (
                                <p className="text-red-500 text-xs mt-1">{errors.taxCode}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                                La data di nascita verrà calcolata automaticamente
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Calendar className="h-4 w-4 inline mr-1" />
                                Data di Nascita
                            </label>
                            <input
                                type="date"
                                value={formData.birthDate}
                                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                            />
                            {formData.taxCode && formData.birthDate && (
                                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Calcolata dal codice fiscale
                                </p>
                            )}
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
                                <Mail className="h-4 w-4 inline mr-1" />
                                Email
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${errors.email ? 'border-red-300' : 'border-gray-200'
                                    }`}
                                placeholder="email@esempio.com"
                            />
                            {errors.email && (
                                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Mail className="h-4 w-4 inline mr-1" />
                                PEC
                            </label>
                            <input
                                type="email"
                                value={formData.pec}
                                onChange={(e) => setFormData({ ...formData, pec: e.target.value })}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${errors.pec ? 'border-red-300' : 'border-gray-200'
                                    }`}
                                placeholder="medico@pec.it"
                            />
                            {errors.pec && (
                                <p className="text-red-500 text-xs mt-1">{errors.pec}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Phone className="h-4 w-4 inline mr-1" />
                                Telefono
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                                placeholder="+39 123 456 7890"
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
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                                placeholder="Via Roma, 123"
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
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                                placeholder="Milano"
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
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                                >
                                    <option value="">--</option>
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
                                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                                    maxLength={5}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${errors.postalCode ? 'border-red-300' : 'border-gray-200'
                                        }`}
                                    placeholder="20100"
                                />
                                {errors.postalCode && (
                                    <p className="text-red-500 text-xs mt-1">{errors.postalCode}</p>
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
                            onChange={(e) => setFormData({ ...formData, iban: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                            maxLength={27}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all uppercase ${errors.iban ? 'border-red-300' : 'border-gray-200'
                                }`}
                            placeholder="IT60X0542811101000000123456"
                        />
                        {errors.iban && (
                            <p className="text-red-500 text-xs mt-1">{errors.iban}</p>
                        )}
                    </div>
                </div>

                {/* Dati Professionali */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Stethoscope className="h-5 w-5 text-teal-600" />
                        Dati Professionali
                    </h2>

                    <div className="space-y-4">
                        {/* Multi-select Specializzazioni */}
                        <div ref={specialtiesRef}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Award className="h-4 w-4 inline mr-1" />
                                Specializzazioni
                            </label>

                            {/* Selected specialties tags */}
                            {formData.specialties.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {formData.specialties.map((specialty, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center gap-1 px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm"
                                        >
                                            {specialty}
                                            <button
                                                type="button"
                                                onClick={() => toggleSpecialty(specialty)}
                                                className="p-0.5 hover:bg-teal-200 rounded-full transition-colors"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Dropdown trigger */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowSpecialtiesDropdown(!showSpecialtiesDropdown)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-left flex items-center justify-between hover:border-teal-500 transition-colors"
                                >
                                    <span className="text-gray-500">
                                        {formData.specialties.length === 0
                                            ? 'Seleziona specializzazioni...'
                                            : `${formData.specialties.length} specializzazione/i selezionata/e`}
                                    </span>
                                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showSpecialtiesDropdown ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown menu */}
                                {showSpecialtiesDropdown && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-hidden">
                                        {/* Search input */}
                                        <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                                            <input
                                                type="text"
                                                value={specialtySearch}
                                                onChange={(e) => setSpecialtySearch(e.target.value)}
                                                placeholder="Cerca specializzazione..."
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                            />
                                        </div>

                                        {/* Custom specialty input */}
                                        <div className="p-2 border-b border-gray-100">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={customSpecialty}
                                                    onChange={(e) => setCustomSpecialty(e.target.value)}
                                                    placeholder="Aggiungi specializzazione personalizzata..."
                                                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            addCustomSpecialty();
                                                        }
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={addCustomSpecialty}
                                                    disabled={!customSpecialty.trim()}
                                                    className="px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Preset options with search filter */}
                                        <div className="max-h-48 overflow-y-auto">
                                            {filteredSpecializzazioni.length === 0 && specialtySearch.trim() ? (
                                                <button
                                                    type="button"
                                                    onClick={handleQuickAddSpecialty}
                                                    className="w-full px-3 py-2 text-left text-sm text-teal-700 hover:bg-teal-50 flex items-center gap-2"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                    Crea nuova specializzazione: "{specialtySearch.trim()}"
                                                </button>
                                            ) : filteredSpecializzazioni.length === 0 ? (
                                                <p className="px-3 py-2 text-sm text-gray-500 text-center">
                                                    Nessuna specializzazione trovata
                                                </p>
                                            ) : (
                                                <>
                                                    {filteredSpecializzazioni.map((specialty) => (
                                                        <label
                                                            key={specialty}
                                                            className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.specialties.includes(specialty)}
                                                                onChange={() => toggleSpecialty(specialty)}
                                                                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                                                            />
                                                            <span className="text-sm text-gray-700">{specialty}</span>
                                                        </label>
                                                    ))}
                                                    {/* Quick add from search if not in list */}
                                                    {specialtySearch.trim() && !availableSpecialties.some(s => s.toLowerCase() === specialtySearch.trim().toLowerCase()) && (
                                                        <button
                                                            type="button"
                                                            onClick={handleQuickAddSpecialty}
                                                            className="w-full px-3 py-2 text-left text-sm text-teal-700 hover:bg-teal-50 flex items-center gap-2 border-t border-gray-100"
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                            Crea nuova: "{specialtySearch.trim()}"
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Albo Medici */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <Building className="h-4 w-4 inline mr-1" />
                                    N° Iscrizione Albo
                                </label>
                                <input
                                    type="text"
                                    value={formData.registerCode}
                                    onChange={(e) => setFormData({ ...formData, registerCode: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                                    placeholder="Es. MI-12345"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Includi la sigla provinciale (es. MI-12345)
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    N° Iscrizione 2° Albo
                                    <span className="text-xs text-gray-500 ml-1">(Lavoro/Sport)</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.registerCode2}
                                    onChange={(e) => setFormData({ ...formData, registerCode2: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                                    placeholder="Es. MI-67890"
                                />
                            </div>
                        </div>

                        {/* Descrizioni */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <FileText className="h-4 w-4 inline mr-1" />
                                Breve Descrizione
                            </label>
                            <input
                                type="text"
                                value={formData.shortDescription}
                                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                                maxLength={500}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                                placeholder="Breve presentazione del medico (max 500 caratteri)"
                            />
                            <p className="text-xs text-gray-500 mt-1 text-right">
                                {formData.shortDescription.length}/500
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
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all resize-none"
                                placeholder="Descrizione dettagliata del profilo professionale, esperienza, formazione..."
                            />
                        </div>
                    </div>
                </div>

                {/* Note */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-teal-600" />
                        Note Interne
                    </h2>

                    <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all resize-none"
                        placeholder="Note interne visibili solo agli amministratori..."
                    />
                </div>

                {/* Prestazioni Abilitate */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Stethoscope className="h-5 w-5 text-teal-600" />
                        Prestazioni Abilitate
                    </h2>

                    {/* Selected prestazioni tags */}
                    {formData.prestazioniIds.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {formData.prestazioniIds.map((prestazioneId) => {
                                const prestazione = prestazioniList.find(p => p.id === prestazioneId);
                                return (
                                    <span
                                        key={prestazioneId}
                                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                                    >
                                        {prestazione?.nome || prestazioneId}
                                        <button
                                            type="button"
                                            onClick={() => togglePrestazione(prestazioneId)}
                                            className="p-0.5 hover:bg-blue-200 rounded-full transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                );
                            })}
                        </div>
                    )}

                    <div ref={prestazioniRef} className="relative">
                        <button
                            type="button"
                            onClick={() => setShowPrestazioniDropdown(!showPrestazioniDropdown)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-left flex items-center justify-between hover:border-teal-500 transition-colors"
                        >
                            <span className="text-gray-500">
                                {formData.prestazioniIds.length === 0
                                    ? 'Seleziona prestazioni...'
                                    : `${formData.prestazioniIds.length} prestazione/i selezionata/e`}
                            </span>
                            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showPrestazioniDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showPrestazioniDropdown && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-hidden">
                                {/* Search input */}
                                <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                                    <input
                                        type="text"
                                        value={prestazioniSearch}
                                        onChange={(e) => setPrestazioniSearch(e.target.value)}
                                        placeholder="Cerca prestazione..."
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                    />

                                    {/* Toggle mostra tutte */}
                                    <label className="flex items-center gap-2 mt-2 text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                                        <input
                                            type="checkbox"
                                            checked={showAllPrestazioni}
                                            onChange={(e) => setShowAllPrestazioni(e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                        />
                                        <span>
                                            Mostra tutte le prestazioni
                                            {!showAllPrestazioni && formData.specialties.length > 0 && (
                                                <span className="text-xs text-gray-400 ml-1">
                                                    (filtrate per: {formData.specialties.join(', ')})
                                                </span>
                                            )}
                                        </span>
                                    </label>
                                </div>

                                {/* Options */}
                                <div className="max-h-56 overflow-y-auto">
                                    {filteredPrestazioni.length === 0 ? (
                                        <p className="px-3 py-4 text-sm text-gray-500 text-center">
                                            {prestazioniList.length === 0
                                                ? 'Nessuna prestazione disponibile. Crea prima le prestazioni nel catalogo.'
                                                : 'Nessuna prestazione trovata'}
                                        </p>
                                    ) : (
                                        filteredPrestazioni.map((prestazione) => {
                                            // Get branche (supporta sia array che legacy)
                                            const branche = prestazione.brancheSpecialistiche && prestazione.brancheSpecialistiche.length > 0
                                                ? prestazione.brancheSpecialistiche
                                                : (prestazione.brancaSpecialistica ? [prestazione.brancaSpecialistica] : []);

                                            return (
                                                <label
                                                    key={prestazione.id}
                                                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.prestazioniIds.includes(prestazione.id)}
                                                        onChange={() => togglePrestazione(prestazione.id)}
                                                        className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium text-gray-700">{prestazione.nome}</span>
                                                            {prestazione.codice && (
                                                                <span className="text-xs text-gray-500">({prestazione.codice})</span>
                                                            )}
                                                        </div>
                                                        {branche.length > 0 && (
                                                            <span className="text-xs text-teal-600">{branche.join(', ')}</span>
                                                        )}
                                                    </div>
                                                </label>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        Seleziona le prestazioni che questo medico è abilitato ad erogare
                    </p>
                </div>

                {/* Documenti (solo in edit mode) */}
                {isEdit && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-teal-600" />
                                Documenti
                            </h2>
                            <button
                                type="button"
                                onClick={() => setShowDocumentModal(true)}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                            >
                                <Upload className="h-4 w-4" />
                                Carica Documento
                            </button>
                        </div>

                        {documents.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                <p className="text-sm">Nessun documento caricato</p>
                                <p className="text-xs mt-1">Carica contratti, assicurazioni, certificati e altri documenti</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {documents.map((doc) => (
                                    <div
                                        key={doc.id}
                                        className={`flex items-center justify-between p-4 rounded-lg border ${doc.isExpired
                                            ? 'bg-red-50 border-red-200'
                                            : isExpiringSoon(doc)
                                                ? 'bg-amber-50 border-amber-200'
                                                : 'bg-gray-50 border-gray-200'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${doc.isExpired
                                                ? 'bg-red-100'
                                                : isExpiringSoon(doc)
                                                    ? 'bg-amber-100'
                                                    : 'bg-gray-100'
                                                }`}>
                                                <FileText className={`h-5 w-5 ${doc.isExpired
                                                    ? 'text-red-600'
                                                    : isExpiringSoon(doc)
                                                        ? 'text-amber-600'
                                                        : 'text-gray-600'
                                                    }`} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{doc.titolo}</p>
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <span className="px-2 py-0.5 bg-white border border-gray-200 rounded">
                                                        {getDocumentTypeLabel(doc.tipo)}
                                                    </span>
                                                    {doc.version > 1 && (
                                                        <span className="text-blue-600">v{doc.version}</span>
                                                    )}
                                                    {doc.dataScadenza && (
                                                        <span className={`flex items-center gap-1 ${doc.isExpired
                                                            ? 'text-red-600 font-medium'
                                                            : isExpiringSoon(doc)
                                                                ? 'text-amber-600'
                                                                : ''
                                                            }`}>
                                                            <Clock className="h-3 w-3" />
                                                            {doc.isExpired
                                                                ? 'Scaduto'
                                                                : `Scade: ${new Date(doc.dataScadenza).toLocaleDateString('it-IT')}`
                                                            }
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={doc.fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                                title="Visualizza"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (confirm('Sei sicuro di voler eliminare questo documento?')) {
                                                        deleteDocumentMutation.mutate(doc.id);
                                                    }
                                                }}
                                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Elimina"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
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
                                                Password di default
                                            </p>
                                            <p className="text-sm text-blue-700 mt-1">
                                                L'account verrà creato con la password: <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">{DEFAULT_PASSWORD}</code>
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

            {/* Credentials Modal */}
            <Modal
                isOpen={credentialsModal.open}
                onClose={handleCredentialsModalClose}
                title="Credenziali di accesso"
            >
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-green-100 rounded-full">
                            <CheckCircle2 className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                Medico creato con successo
                            </h3>
                            <p className="text-gray-500">
                                Comunica queste credenziali al medico
                            </p>
                        </div>
                    </div>
                    {credentialsModal.credentials && (
                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase">
                                    Username
                                </label>
                                <p className="text-lg font-mono font-semibold text-gray-900">
                                    {credentialsModal.credentials.username}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase">
                                    Password Temporanea
                                </label>
                                <p className="text-lg font-mono font-semibold text-gray-900">
                                    {credentialsModal.credentials.temporaryPassword}
                                </p>
                            </div>
                        </div>
                    )}
                    <p className="text-sm text-amber-600 mt-4 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        La password deve essere cambiata al primo accesso
                    </p>
                    <div className="flex justify-end mt-6">
                        <button
                            onClick={handleCredentialsModalClose}
                            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                        >
                            Chiudi
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Conflict Modal - 409 Error */}
            <Modal
                isOpen={conflictModal.open}
                onClose={() => setConflictModal({ open: false, message: '' })}
                title="Persona già esistente"
            >
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-amber-100 rounded-full">
                            <AlertCircle className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                Attenzione
                            </h3>
                            <p className="text-gray-500">
                                {conflictModal.message}
                            </p>
                        </div>
                    </div>

                    {conflictModal.existingPersonName && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                            <p className="text-sm text-gray-700">
                                <strong>Persona trovata:</strong> {conflictModal.existingPersonName}
                            </p>
                        </div>
                    )}

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-amber-800">
                            {conflictModal.canEnable ? (
                                <>
                                    Questa persona esiste già nel sistema. Puoi abilitarla come medico
                                    per la tua organizzazione cliccando su "Abilita come Medico".
                                </>
                            ) : (
                                <>
                                    Una persona con lo stesso codice fiscale è già registrata come medico
                                    per questa organizzazione. Verifica i dati inseriti.
                                </>
                            )}
                        </p>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setConflictModal({ open: false, message: '' })}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Modifica Dati
                        </button>
                        {conflictModal.canEnable ? (
                            <button
                                onClick={handleEnableMedico}
                                disabled={enableMedicoMutation.isPending}
                                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                            >
                                {enableMedicoMutation.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Abilitazione...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="h-4 w-4" />
                                        Abilita come Medico
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    setConflictModal({ open: false, message: '' });
                                    navigate('/poliambulatorio/personale/medici');
                                }}
                                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                            >
                                Torna alla Lista
                            </button>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Document Upload Modal */}
            <Modal
                isOpen={showDocumentModal}
                onClose={() => {
                    setShowDocumentModal(false);
                    setDocumentForm({
                        tipo: 'CONTRATTO',
                        titolo: '',
                        descrizione: '',
                        dataScadenza: '',
                        file: null
                    });
                }}
                title="Carica Documento"
            >
                <div className="p-6 space-y-4">
                    {/* File Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            File <span className="text-red-500">*</span>
                        </label>
                        <input
                            ref={documentInputRef}
                            type="file"
                            onChange={handleDocumentFileChange}
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            className="hidden"
                        />
                        <div
                            onClick={() => documentInputRef.current?.click()}
                            className={`w-full p-4 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${documentForm.file
                                ? 'border-teal-500 bg-teal-50'
                                : 'border-gray-300 hover:border-teal-400'
                                }`}
                        >
                            {documentForm.file ? (
                                <div className="flex items-center justify-center gap-2">
                                    <FileText className="h-5 w-5 text-teal-600" />
                                    <span className="text-teal-700 font-medium">{documentForm.file.name}</span>
                                    <span className="text-gray-500 text-sm">
                                        ({(documentForm.file.size / 1024).toFixed(1)} KB)
                                    </span>
                                </div>
                            ) : (
                                <div className="text-gray-500">
                                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                    <p>Clicca per selezionare un file</p>
                                    <p className="text-xs mt-1">PDF, DOC, DOCX, JPG, PNG</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Document Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tipo Documento <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={documentForm.tipo}
                            onChange={(e) => setDocumentForm(prev => ({
                                ...prev,
                                tipo: e.target.value as TipoDocumentoPersonale
                            }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        >
                            {DOCUMENT_TYPES.map(dt => (
                                <option key={dt.value} value={dt.value}>
                                    {dt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Titolo <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={documentForm.titolo}
                            onChange={(e) => setDocumentForm(prev => ({ ...prev, titolo: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            placeholder="Es: Polizza RC 2024"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Descrizione
                        </label>
                        <textarea
                            value={documentForm.descrizione}
                            onChange={(e) => setDocumentForm(prev => ({ ...prev, descrizione: e.target.value }))}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                            placeholder="Note aggiuntive (opzionale)"
                        />
                    </div>

                    {/* Expiry Date (if applicable) */}
                    {DOCUMENT_TYPES.find(dt => dt.value === documentForm.tipo)?.hasExpiry && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Data Scadenza
                            </label>
                            <input
                                type="date"
                                value={documentForm.dataScadenza}
                                onChange={(e) => setDocumentForm(prev => ({ ...prev, dataScadenza: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Riceverai una notifica quando il documento sta per scadere
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={() => setShowDocumentModal(false)}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Annulla
                        </button>
                        <button
                            type="button"
                            onClick={handleDocumentUpload}
                            disabled={isUploadingDoc || !documentForm.file || !documentForm.titolo}
                            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                        >
                            {isUploadingDoc ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Caricamento...
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4" />
                                    Carica
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default MedicoForm;
