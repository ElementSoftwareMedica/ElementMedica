/**
 * Management Page Types
 * @project 43 - Tenant Roles Management System
 */

/**
 * Tenant Settings - Campi usati nei placeholder dei template
 */
export interface BranchBranding {
    name?: string;
    logo?: string;
}

export interface TenantSettings {
    // Dati anagrafici azienda
    address?: string;
    cap?: string;
    city?: string;
    provincia?: string;
    vatNumber?: string;
    fiscalCode?: string;
    iban?: string;
    sdi?: string;
    // Contatti
    phone?: string;
    email?: string;
    pec?: string;
    website?: string;
    // Branding
    logoUrl?: string;
    // Branding per branch
    branches?: {
        MEDICA?: BranchBranding;
        FORMAZIONE?: BranchBranding;
        MDL?: BranchBranding;
        [key: string]: BranchBranding | undefined;
    };
    // Altri campi custom
    [key: string]: unknown;
}

export interface Tenant {
    id: string;
    name: string;
    slug: string;
    domain?: string;
    billingPlan: string;
    settings?: TenantSettings;
    isActive: boolean;
    subscriptionStatus?: string; // active, trial, past_due, suspended, cancelled
    subscriptionExpiresAt?: string;
    accessLevel?: TenantAccessLevel;
    enabledFeatures?: string[];
    isPrimary?: boolean;
    isAdminAccess?: boolean;
}

export type TenantAccessLevel = 'READ' | 'WRITE' | 'ADMIN' | 'FULL';

export interface PersonTenantAccess {
    id: string;
    personId: string;
    tenantId: string;
    accessLevel: TenantAccessLevel;
    enabledFeatures: string[];
    defaultRoleType?: string;
    customPermissions?: Record<string, unknown>;
    restrictions?: Record<string, unknown>;
    isActive: boolean;
    isPrimary: boolean;
    grantedBy?: string;
    grantedAt: string;
    validFrom: string;
    validUntil?: string;
    lastAccessAt?: string;
    tenant?: Tenant;
    person?: PersonSummary;
    grantedByPerson?: PersonSummary;
}

export interface PersonSummary {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    globalRole?: string;
    status?: string;
    profileImage?: string;
}

export interface Feature {
    id: string;
    name: string;
    description: string;
}

export interface FeaturePreset {
    id: string;
    name: string;
    description: string;
    features: string[];
}

export interface TenantFeatureRecord {
    id: string;
    tenantId: string;
    featureKey: string;
    isEnabled: boolean;
    tier: string | null;
    config: Record<string, unknown> | null;
    validFrom: string;
    validUntil: string | null;
    usageCount: number;
    usageLimit: number | null;
    lastUsedAt: string | null;
    enabledBy: string | null;
    enabledAt: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface FeatureSubscription extends TenantFeatureRecord {
    tenant: {
        id: string;
        name: string;
        slug: string;
        billingPlan?: string;
        isActive?: boolean;
        subscriptionStatus?: string;
        subscriptionStartDate?: string | null;
    };
}

export interface PricingTier {
    upToQuantity: number | null; // null = unlimitato (fascia finale)
    pricePerUnit: number;
    label?: string; // es. "Prime 5 attivazioni", "Aggiuntive"
}

export interface FeaturePricing {
    price: number;
    priceYearly: number;
    currency: string;
    billingCycle: 'monthly' | 'yearly';
    note?: string;
    tiers?: PricingTier[]; // pricing a fasce (es. prime N incluse, poi X€ l'una)
}

export interface FeatureCatalogEntry {
    key: string;
    label: string;
    description: string;
    category: string;
    icon: string;
    pricing: FeaturePricing | null;
    /** 'limit' = funzionalità con limite numerico (usageLimit) invece di semplice on/off */
    type?: 'standard' | 'limit';
}

export interface FeatureCategoryDef {
    key: string;
    label: string;
    icon: string;
    color: string;
}

export interface FeatureCatalogResponse {
    success: boolean;
    data: {
        features: FeatureCatalogEntry[];
        categories: FeatureCategoryDef[];
    };
}

export interface ManagementTab {
    id: string;
    label: string;
    icon?: React.ReactNode;
    permission?: string;
}

// API Response types
export interface AccessibleTenantsResponse {
    success: boolean;
    data: Tenant[];
    meta: {
        total: number;
        features: string[];
    };
}

export interface PersonTenantAccessResponse {
    success: boolean;
    data: PersonTenantAccess;
    message?: string;
}

export interface FeaturesResponse {
    success: boolean;
    data: Feature[];
}
