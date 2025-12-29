/**
 * Management Page Types
 * @project 43 - Tenant Roles Management System
 */

export interface Tenant {
    id: string;
    name: string;
    slug: string;
    domain?: string;
    billingPlan: string;
    settings?: Record<string, unknown>;
    isActive: boolean;
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
