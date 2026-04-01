/**
 * Progetto 48 - Person Multi-Tenant Types
 * 
 * Tipi TypeScript per la nuova struttura Person:
 * - Person (PersonCore): Dati anagrafici globali e autenticazione
 * - PersonTenantProfile: Dati specifici per ogni tenant
 * - PersonDataShareConsent: Consensi condivisione cross-tenant
 */

// ============================================
// ENUMS
// ============================================

export enum Gender {
    MALE = 'MALE',
    FEMALE = 'FEMALE',
    OTHER = 'OTHER',
    NOT_SPECIFIED = 'NOT_SPECIFIED'
}

export enum PersonStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    SUSPENDED = 'SUSPENDED',
    TERMINATED = 'TERMINATED',
    PENDING = 'PENDING'
}

// ============================================
// PERSON (ex PersonCore) - DATI GLOBALI
// ============================================

/**
 * Person - Dati anagrafici globali e autenticazione
 * Questi dati sono condivisi tra tutti i tenant
 */
export interface Person {
    id: string;

    // Anagrafica immutabile
    firstName: string;
    lastName: string;
    birthDate?: string | Date | null;
    birthPlace?: string | null;       // Comune di nascita (P48)
    birthProvince?: string | null;    // Provincia nascita (P48)
    gender?: Gender | null;

    // Identificatori univoci globali
    taxCode?: string | null;          // Codice Fiscale
    vatNumber?: string | null;        // Partita IVA

    // Autenticazione (globale)
    username?: string | null;
    password?: string | null;         // Never sent to frontend
    lastLogin?: string | Date | null;
    failedAttempts?: number;
    lockedUntil?: string | Date | null;

    // GDPR globale
    gdprConsentDate?: string | Date | null;
    gdprConsentVersion?: string | null;
    dataRetentionUntil?: string | Date | null;

    // Immagine profilo (globale)
    profileImage?: string | null;

    // Metadata
    createdAt: string | Date;
    updatedAt: string | Date;
    deletedAt?: string | Date | null;

    // Relazioni (opzionali, incluse quando requested)
    tenantProfiles?: PersonTenantProfile[];
    personRoles?: PersonRole[];
}

/**
 * DTO per creare una nuova Person
 */
export interface CreatePersonDTO {
    firstName: string;
    lastName: string;
    birthDate?: string | null;
    birthPlace?: string | null;
    birthProvince?: string | null;
    gender?: Gender | null;
    taxCode?: string | null;
    vatNumber?: string | null;
    username?: string | null;
    profileImage?: string | null;
}

/**
 * DTO per aggiornare una Person
 */
export interface UpdatePersonDTO {
    firstName?: string;
    lastName?: string;
    birthDate?: string | null;
    birthPlace?: string | null;
    birthProvince?: string | null;
    gender?: Gender | null;
    taxCode?: string | null;
    vatNumber?: string | null;
    username?: string | null;
    profileImage?: string | null;
}

// ============================================
// PERSON TENANT PROFILE - DATI PER TENANT
// ============================================

/**
 * PersonTenantProfile - Dati specifici per ogni tenant
 * Ogni persona può avere profili diversi in tenant diversi
 */
export interface PersonTenantProfile {
    id: string;
    personId: string;
    tenantId: string;

    // Contatti (possono variare per tenant)
    email?: string | null;
    phone?: string | null;
    pec?: string | null;

    // Residenza/Domicilio (può variare)
    residenceAddress?: string | null;
    residenceCity?: string | null;
    postalCode?: string | null;
    province?: string | null;

    // Status e ruolo nel tenant
    status: PersonStatus;
    title?: string | null;         // Qualifica in questo tenant

    // Dati lavorativi (specifici per tenant)
    hiredDate?: string | Date | null;
    endDate?: string | Date | null;
    hourlyRate?: number | string | null;
    monthlyRate?: number | string | null;
    iban?: string | null;

    // Professionale
    registerCode?: string | null;   // Albo professionale
    registerCode2?: string | null;  // Secondo albo
    specialties?: string[];
    certifications?: string[];

    // Organizzazione - P49 Multi-Tenant
    companyTenantProfileId?: string | null;
    /** @deprecated Use companyTenantProfileId */
    companyId?: string | null;
    siteId?: string | null;
    repartoId?: string | null;

    // Descrizioni e note
    shortDescription?: string | null;
    fullDescription?: string | null;
    notes?: string | null;

    // Preferenze
    preferences?: Record<string, unknown> | null;

    // Flags
    isActive: boolean;
    isPrimary: boolean;             // Se è il tenant principale della persona
    dataShareConsent: boolean;      // Consenso base condivisione

    // Metadata
    createdAt: string | Date;
    updatedAt: string | Date;
    deletedAt?: string | Date | null;

    // Relazioni (opzionali, incluse quando requested) - P49
    person?: Person;
    tenant?: { id: string; name: string; slug?: string };
    companyTenantProfile?: { id: string; company?: { id: string; ragioneSociale: string } };
    /** @deprecated Use companyTenantProfile */
    company?: { id: string; ragioneSociale: string };
    site?: { id: string; siteName: string };
    reparto?: { id: string; nome: string };
}

/**
 * DTO per creare un PersonTenantProfile
 */
export interface CreatePersonTenantProfileDTO {
    personId: string;
    tenantId: string;
    email?: string | null;
    phone?: string | null;
    pec?: string | null;
    residenceAddress?: string | null;
    residenceCity?: string | null;
    postalCode?: string | null;
    province?: string | null;
    status?: PersonStatus;
    title?: string | null;
    hiredDate?: string | null;
    hourlyRate?: number | null;
    monthlyRate?: number | null;
    iban?: string | null;
    registerCode?: string | null;
    specialties?: string[];
    certifications?: string[];
    companyId?: string | null;
    siteId?: string | null;
    repartoId?: string | null;
    shortDescription?: string | null;
    notes?: string | null;
    isPrimary?: boolean;
}

/**
 * DTO per aggiornare un PersonTenantProfile
 */
export interface UpdatePersonTenantProfileDTO {
    email?: string | null;
    phone?: string | null;
    pec?: string | null;
    residenceAddress?: string | null;
    residenceCity?: string | null;
    postalCode?: string | null;
    province?: string | null;
    status?: PersonStatus;
    title?: string | null;
    hiredDate?: string | null;
    endDate?: string | null;
    hourlyRate?: number | null;
    monthlyRate?: number | null;
    iban?: string | null;
    registerCode?: string | null;
    registerCode2?: string | null;
    specialties?: string[];
    certifications?: string[];
    companyId?: string | null;
    siteId?: string | null;
    repartoId?: string | null;
    shortDescription?: string | null;
    fullDescription?: string | null;
    notes?: string | null;
    preferences?: Record<string, unknown>;
    isActive?: boolean;
    isPrimary?: boolean;
    dataShareConsent?: boolean;
}

// ============================================
// PERSON DATA SHARE CONSENT - CONSENSI GDPR
// ============================================

/**
 * Tipi di dati condivisibili tra tenant
 */
export enum SharedDataType {
    ANAGRAFICA = 'anagrafica',      // Nome, cognome, CF, data nascita
    CONTATTI = 'contatti',          // Email, telefono, indirizzo
    CLINICA = 'clinica',            // Dati medici/sanitari
    FORMAZIONE = 'formazione',      // Corsi, attestati
    LAVORATIVO = 'lavorativo',      // Mansione, qualifica, contratto
    PAGAMENTI = 'pagamenti'         // IBAN, tariffe
}

/**
 * Metodi di consenso
 */
export enum ConsentMethod {
    EXPLICIT = 'explicit',          // Consenso esplicito firmato
    IMPLICIT = 'implicit',          // Consenso implicito da azione
    LEGAL_BASIS = 'legal_basis'     // Base legale (es. obblighi di legge)
}

/**
 * PersonDataShareConsent - Consenso per condivisione dati cross-tenant
 */
export interface PersonDataShareConsent {
    id: string;
    personId: string;

    // Tenant coinvolti
    sourceTenantId: string;         // Tenant che possiede i dati
    targetTenantId: string;         // Tenant che può accedere

    // Cosa è condiviso
    sharedDataTypes: SharedDataType[] | string[];
    excludedFields: string[];

    // Consenso
    consentGiven: boolean;
    consentDate?: string | Date | null;
    consentMethod?: ConsentMethod | string | null;
    consentProof?: string | null;   // URL documento firmato
    legalBasis?: string | null;

    // Validità
    validFrom: string | Date;
    validUntil?: string | Date | null;

    // Revoca
    isRevoked: boolean;
    revokedAt?: string | Date | null;
    revokedReason?: string | null;
    revokedBy?: string | null;

    // Metadata
    createdAt: string | Date;
    updatedAt: string | Date;

    // Relazioni (opzionali)
    person?: Person;
    sourceTenant?: { id: string; name: string };
    targetTenant?: { id: string; name: string };
}

/**
 * DTO per creare un PersonDataShareConsent
 */
export interface CreatePersonDataShareConsentDTO {
    personId: string;
    sourceTenantId: string;
    targetTenantId: string;
    sharedDataTypes: SharedDataType[] | string[];
    excludedFields?: string[];
    consentMethod?: ConsentMethod | string;
    consentProof?: string | null;
    legalBasis?: string | null;
    validUntil?: string | null;
}

// ============================================
// PERSON ROLE (riferimento)
// ============================================

export interface PersonRole {
    id: string;
    personId: string;
    roleType?: string;
    isActive: boolean;
    isPrimary: boolean;
    assignedAt: string | Date;
    assignedBy?: string;
    validFrom: string | Date;
    validUntil?: string | Date | null;
    companyId?: string | null;
    tenantId: string;
    customRoleId?: string | null;
}

// ============================================
// HELPER TYPES - PER COMPATIBILITÀ
// ============================================

/**
 * PersonWithProfile - Person combinata con il profilo del tenant corrente
 * Usato per backward compatibility con codice esistente
 */
export interface PersonWithProfile extends Person {
    // Dati dal profilo tenant corrente (merged per compatibilità)
    email?: string | null;
    phone?: string | null;
    pec?: string | null;
    residenceAddress?: string | null;
    residenceCity?: string | null;
    postalCode?: string | null;
    province?: string | null;
    status?: PersonStatus;
    title?: string | null;
    hiredDate?: string | Date | null;
    hourlyRate?: number | string | null;
    iban?: string | null;
    registerCode?: string | null;
    specialties?: string[];
    certifications?: string[];
    companyId?: string | null;
    siteId?: string | null;
    repartoId?: string | null;
    shortDescription?: string | null;
    fullDescription?: string | null;
    notes?: string | null;
    isActive?: boolean;

    // Il tenantId del profilo corrente
    tenantId?: string;

    // Il profilo completo se incluso
    currentProfile?: PersonTenantProfile;
}

/**
 * Utility type per convertire PersonWithProfile a Person + Profile separati
 */
export function splitPersonWithProfile(personWithProfile: PersonWithProfile): {
    person: Person;
    profile: Partial<PersonTenantProfile>;
} {
    const {
        email, phone, pec, residenceAddress, residenceCity, postalCode, province,
        status, title, hiredDate, hourlyRate, iban, registerCode, specialties,
        certifications, companyId, siteId, repartoId, shortDescription, fullDescription,
        notes, isActive, tenantId, currentProfile,
        ...personData
    } = personWithProfile;

    return {
        person: personData as Person,
        profile: {
            email, phone, pec, residenceAddress, residenceCity, postalCode, province,
            status, title, hiredDate, hourlyRate, iban, registerCode, specialties,
            certifications, companyId, siteId, repartoId, shortDescription, fullDescription,
            notes, isActive, tenantId
        }
    };
}

/**
 * Utility type per combinare Person + Profile in PersonWithProfile
 */
export function mergePersonWithProfile(
    person: Person,
    profile: PersonTenantProfile | null
): PersonWithProfile {
    if (!profile) {
        return person as PersonWithProfile;
    }

    return {
        ...person,
        email: profile.email,
        phone: profile.phone,
        pec: profile.pec,
        residenceAddress: profile.residenceAddress,
        residenceCity: profile.residenceCity,
        postalCode: profile.postalCode,
        province: profile.province,
        status: profile.status,
        title: profile.title,
        hiredDate: profile.hiredDate,
        hourlyRate: profile.hourlyRate,
        iban: profile.iban,
        registerCode: profile.registerCode,
        specialties: profile.specialties,
        certifications: profile.certifications,
        companyId: profile.companyId,
        siteId: profile.siteId,
        repartoId: profile.repartoId,
        shortDescription: profile.shortDescription,
        fullDescription: profile.fullDescription,
        notes: profile.notes,
        isActive: profile.isActive,
        tenantId: profile.tenantId,
        currentProfile: profile
    };
}

// ============================================
// RESPONSE TYPES
// ============================================

export interface PersonsResponse {
    persons: PersonWithProfile[];
    total: number;
    page: number;
    totalPages: number;
}

export interface PersonTenantProfilesResponse {
    profiles: PersonTenantProfile[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface DataAccessCheckResult {
    allowed: boolean;
    reason: 'same_tenant' | 'consent_valid' | 'no_consent' | 'consent_revoked' | 'consent_expired' | 'data_type_not_shared' | 'error';
    excludedFields?: string[];
    consentId?: string;
    sharedTypes?: string[];
    expiredAt?: string | Date;
    revokedAt?: string | Date;
    error?: string;
}

// ============================================
// CONSENT STATUS & TYPES (per widget)
// ============================================

/**
 * Status del consenso per il widget
 */
export type ConsentStatus = 'GRANTED' | 'REVOKED' | 'EXPIRED' | 'PENDING';

/**
 * Input per creare un nuovo consenso (widget)
 */
export interface CreateConsentInput {
    personId: string;
    sourceTenantId: string;
    targetTenantId: string;
    purpose: string;
    scope?: string[];
    legalBasis?: string;
    expiresAt?: Date;
}

/**
 * Versione del consenso con status calcolato per i widget
 */
export interface PersonDataShareConsentWithStatus extends PersonDataShareConsent {
    status: ConsentStatus;
    purpose: string;
    scope: string[];
    grantedAt: string | Date;
    expiresAt?: string | Date | null;
}

