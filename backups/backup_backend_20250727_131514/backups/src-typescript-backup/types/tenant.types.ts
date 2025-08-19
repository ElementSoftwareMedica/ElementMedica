/**
 * Tenant Types - Week 12 Multi-Tenant Implementation
 * Definizioni dei tipi per il sistema multi-tenant
 */

import { Tenant, TenantConfiguration, EnhancedUserRole, TenantUsage } from '@prisma/client';

// =====================================================
// TENANT TYPES
// =====================================================

export interface TenantCreateInput {
  name: string;
  slug?: string;
  domain?: string;
  settings?: Record<string, any>;
  billingPlan?: 'basic' | 'professional' | 'enterprise';
  maxUsers?: number;
  maxCompanies?: number;
  isActive?: boolean;
}

export interface TenantUpdateInput {
  name?: string;
  slug?: string;
  domain?: string;
  settings?: Record<string, any>;
  billingPlan?: 'basic' | 'professional' | 'enterprise';
  maxUsers?: number;
  maxCompanies?: number;
  isActive?: boolean;
}

export interface TenantWithStats extends Tenant {
  _count: {
    persons: number;
    companies: number;
    courses: number;
    trainers: number;
  };
}

export interface TenantWithConfigurations extends Tenant {
  configurations: TenantConfiguration[];
}

// =====================================================
// TENANT CONFIGURATION TYPES
// =====================================================

export interface TenantConfigurationInput {
  configKey: string;
  configValue: any;
  configType?: 'general' | 'ui' | 'billing' | 'security';
  isEncrypted?: boolean;
}

export interface TenantSettings {
  theme?: string;
  locale?: string;
  timezone?: string;
  currency?: string;
  dateFormat?: string;
  timeFormat?: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  customCss?: string;
}

export interface TenantSecuritySettings {
  sessionTimeout?: number;
  maxFailedAttempts?: number;
  lockoutDuration?: number;
  passwordPolicy?: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    maxAge?: number;
  };
  twoFactorRequired?: boolean;
  ipWhitelist?: string[];
}

export interface TenantBillingSettings {
  plan: 'basic' | 'professional' | 'enterprise';
  maxUsers: number;
  maxCompanies: number;
  maxStorage: number; // in bytes
  maxApiCalls: number; // per month
  features: string[];
  customPricing?: {
    userPrice: number;
    companyPrice: number;
    storagePrice: number; // per GB
  };
}

// =====================================================
// ENHANCED USER ROLE TYPES
// =====================================================

export type RoleType = 
  | 'global_admin'     // Accesso completo a tutti i tenant
  | 'company_admin'    // Amministratore di una specifica azienda
  | 'manager'          // Manager di dipartimento/area
  | 'trainer'          // Formatore
  | 'employee';        // Dipendente standard

export type RoleScope = 
  | 'global'           // Accesso globale (solo per global_admin)
  | 'tenant'           // Accesso a livello tenant
  | 'company'          // Accesso a livello azienda
  | 'department';      // Accesso a livello dipartimento

export interface EnhancedUserRoleInput {
  personId: string;
  tenantId: string;
  roleType: RoleType;
  roleScope?: RoleScope;
  permissions?: Record<string, any>;
  companyId?: string;
  departmentId?: string;
  assignedBy?: string;
  expiresAt?: Date;
}

export interface EnhancedUserRoleWithRelations extends EnhancedUserRole {
  user: {
    id: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  company?: {
    id: string;
    ragioneSociale: string;
  };
}

// =====================================================
// TENANT USAGE TYPES
// =====================================================

export type UsageType = 
  | 'persons'
  | 'companies'
  | 'courses'
  | 'storage'
  | 'api_calls'
  | 'documents'
  | 'trainers';

export interface TenantUsageInput {
  tenantId: string;
  usageType: UsageType;
  usageValue: number;
  usageLimit?: number;
  billingPeriod: Date;
  metadata?: Record<string, any>;
}

export interface TenantUsageStats {
  period: Date;
  usage: {
    persons: { current: number; limit: number; percentage: number };
    companies: { current: number; limit: number; percentage: number };
    courses: { current: number; limit: number; percentage: number };
    storage: { current: number; limit: number; percentage: number };
    api_calls: { current: number; limit: number; percentage: number };
  };
}

// =====================================================
// TENANT CONTEXT TYPES
// =====================================================

export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  tenantDomain?: string;
  tenantSettings: TenantSettings;
  personRoles: EnhancedUserRole[];
  permissions: string[];
  limits: {
    persons: { current: number; limit: number };
    companies: { current: number; limit: number };
  };
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface TenantListResponse {
  tenants: TenantWithStats[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TenantResponse {
  tenant: TenantWithConfigurations;
  stats: {
    users: number;
    companies: number;
    courses: number;
    trainers: number;
  };
  usage: TenantUsageStats;
}

// =====================================================
// MIDDLEWARE TYPES
// =====================================================

export interface TenantRequest extends Request {
  tenant?: TenantContext;
  tenantId?: string;
}

// =====================================================
// VALIDATION TYPES
// =====================================================

export interface TenantValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface TenantLimitsCheck {
  users: {
    current: number;
    limit: number;
    exceeded: boolean;
    remaining: number;
  };
  companies: {
    current: number;
    limit: number;
    exceeded: boolean;
    remaining: number;
  };
  storage: {
    current: number;
    limit: number;
    exceeded: boolean;
    remaining: number;
  };
}

// =====================================================
// BILLING TYPES
// =====================================================

export interface BillingPlan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  features: {
    maxUsers: number;
    maxCompanies: number;
    maxStorage: number; // in GB
    maxApiCalls: number;
    customBranding: boolean;
    prioritySupport: boolean;
    advancedReporting: boolean;
    ssoIntegration: boolean;
    customDomain: boolean;
  };
  isActive: boolean;
}

export interface TenantBilling {
  tenantId: string;
  plan: BillingPlan;
  subscriptionStart: Date;
  subscriptionEnd: Date;
  isActive: boolean;
  autoRenew: boolean;
  paymentMethod?: {
    type: 'card' | 'bank_transfer' | 'paypal';
    last4?: string;
    expiryMonth?: number;
    expiryYear?: number;
  };
  usage: TenantUsageStats;
  nextBillingDate: Date;
  amount: number;
}

// =====================================================
// EXPORT ALL TYPES
// =====================================================

export type {
  Tenant,
  TenantConfiguration,
  EnhancedUserRole,
  TenantUsage,
};