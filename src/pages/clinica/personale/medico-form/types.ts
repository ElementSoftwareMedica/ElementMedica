/**
 * MedicoForm - Types and Constants
 * 
 * Centralized types, constants and utility functions for MedicoForm.
 */

import type { TipoDocumentoPersonale } from '../../../../services/clinicaApi';

// Province italiane
export const PROVINCE = [
    'AG', 'AL', 'AN', 'AO', 'AP', 'AQ', 'AR', 'AT', 'AV', 'BA', 'BG', 'BI', 'BL', 'BN', 'BO',
    'BR', 'BS', 'BT', 'BZ', 'CA', 'CB', 'CE', 'CH', 'CL', 'CN', 'CO', 'CR', 'CS', 'CT', 'CZ',
    'EN', 'FC', 'FE', 'FG', 'FI', 'FM', 'FR', 'GE', 'GO', 'GR', 'IM', 'IS', 'KR', 'LC', 'LE',
    'LI', 'LO', 'LT', 'LU', 'MB', 'MC', 'ME', 'MI', 'MN', 'MO', 'MS', 'MT', 'NA', 'NO', 'NU',
    'OR', 'PA', 'PC', 'PD', 'PE', 'PG', 'PI', 'PN', 'PO', 'PR', 'PT', 'PU', 'PV', 'PZ', 'RA',
    'RC', 'RE', 'RG', 'RI', 'RM', 'RN', 'RO', 'SA', 'SI', 'SO', 'SP', 'SR', 'SS', 'SU', 'SV',
    'TA', 'TE', 'TN', 'TO', 'TP', 'TR', 'TS', 'TV', 'UD', 'VA', 'VB', 'VC', 'VE', 'VI', 'VR', 'VT', 'VV'
];

// Tipi di documenti personali per medici con labels
export const DOCUMENT_TYPES: { value: TipoDocumentoPersonale; label: string; hasExpiry?: boolean }[] = [
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

export const DEFAULT_PASSWORD = 'Password123!';

export interface MedicoFormData {
    // Dati anagrafici
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    taxCode: string;
    birthDate: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED' | '';
    birthPlace: string;
    birthProvince: string;
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

export interface CredentialsModalState {
    open: boolean;
    credentials: { username: string; temporaryPassword: string } | null;
}

export interface ConflictModalState {
    open: boolean;
    message: string;
    existingPersonId?: string;
    existingPersonName?: string;
    canEnable?: boolean;
}

export interface DocumentFormState {
    tipo: TipoDocumentoPersonale;
    titolo: string;
    descrizione: string;
    dataScadenza: string;
    file: File | null;
}

/**
 * Estrae la data di nascita dal codice fiscale italiano
 * @param cf - Codice fiscale (16 caratteri)
 * @returns Data in formato YYYY-MM-DD o null se non valido
 */
export const extractBirthDateFromCF = (cf: string): string | null => {
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

/**
 * Get document type label from value
 */
export const getDocumentTypeLabel = (tipo: TipoDocumentoPersonale): string => {
    return DOCUMENT_TYPES.find(dt => dt.value === tipo)?.label || tipo;
};

/**
 * Validate form data
 */
export const validateMedicoForm = (formData: MedicoFormData): Partial<Record<keyof MedicoFormData, string>> => {
    const errors: Partial<Record<keyof MedicoFormData, string>> = {};

    if (!formData.firstName.trim()) {
        errors.firstName = 'Il nome è obbligatorio';
    }
    if (!formData.lastName.trim()) {
        errors.lastName = 'Il cognome è obbligatorio';
    }
    if (!formData.taxCode || formData.taxCode.length !== 16) {
        errors.taxCode = 'Il codice fiscale è obbligatorio (16 caratteri)';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = 'Email non valida';
    }
    if (formData.pec && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.pec)) {
        errors.pec = 'PEC non valida';
    }
    if (formData.postalCode && !/^\d{5}$/.test(formData.postalCode)) {
        errors.postalCode = 'CAP non valido (5 cifre)';
    }
    if (formData.iban && !/^IT\d{2}[A-Z]\d{22}$/.test(formData.iban.replace(/\s/g, '').toUpperCase())) {
        errors.iban = 'IBAN italiano non valido';
    }

    return errors;
};

/**
 * Get initial form data
 */
export const getInitialFormData = (): MedicoFormData => ({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    taxCode: '',
    birthDate: '',
    gender: '',
    birthPlace: '',
    birthProvince: '',
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
