/**
 * Tenant Validation Utilities - Week 12 Multi-Tenant Implementation
 * Utility per la validazione dei dati e limiti dei tenant
 */

import { TenantValidationResult, TenantLimitsCheck } from '../types/tenant.types';
import { validateSlug } from './slugGenerator';
import { logger } from './logger';

/**
 * Valida i dati di input per la creazione di un tenant
 */
export function validateTenantInput(data: {
  name: string;
  slug?: string;
  domain?: string;
  billingPlan?: string;
  maxUsers?: number;
  maxCompanies?: number;
}): TenantValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validazione nome
  if (!data.name || data.name.trim().length === 0) {
    errors.push('Nome tenant è richiesto');
  } else if (data.name.length < 2) {
    errors.push('Nome tenant deve essere di almeno 2 caratteri');
  } else if (data.name.length > 100) {
    errors.push('Nome tenant non può superare i 100 caratteri');
  }

  // Validazione slug
  if (data.slug) {
    const slugValidation = validateSlug(data.slug);
    if (!slugValidation.isValid) {
      errors.push(...slugValidation.errors);
    }
  }

  // Validazione dominio
  if (data.domain) {
    const domainValidation = validateDomain(data.domain);
    if (!domainValidation.isValid) {
      errors.push(...domainValidation.errors);
    }
  }

  // Validazione piano di billing
  if (data.billingPlan) {
    const validPlans = ['basic', 'professional', 'enterprise'];
    if (!validPlans.includes(data.billingPlan)) {
      errors.push('Piano di billing non valido. Valori accettati: basic, professional, enterprise');
    }
  }

  // Validazione limiti utenti
  if (data.maxUsers !== undefined) {
    if (data.maxUsers < 1) {
      errors.push('Limite utenti deve essere almeno 1');
    } else if (data.maxUsers > 10000) {
      warnings.push('Limite utenti molto alto (>10000), verificare se necessario');
    }
  }

  // Validazione limiti aziende
  if (data.maxCompanies !== undefined) {
    if (data.maxCompanies < 1) {
      errors.push('Limite aziende deve essere almeno 1');
    } else if (data.maxCompanies > 1000) {
      warnings.push('Limite aziende molto alto (>1000), verificare se necessario');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Valida un dominio
 */
export function validateDomain(domain: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!domain) {
    errors.push('Dominio è richiesto');
    return { isValid: false, errors };
  }

  // Rimuovi protocollo se presente
  const cleanDomain = domain.replace(/^https?:\/\//, '').toLowerCase();

  // Validazione lunghezza
  if (cleanDomain.length > 253) {
    errors.push('Dominio troppo lungo (max 253 caratteri)');
  }

  // Validazione formato
  const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/;
  if (!domainRegex.test(cleanDomain)) {
    errors.push('Formato dominio non valido');
  }

  // Verifica che non sia un IP
  const ipRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
  if (ipRegex.test(cleanDomain)) {
    errors.push('Non è possibile utilizzare un indirizzo IP come dominio');
  }

  // Lista di domini riservati
  const reservedDomains = [
    'localhost',
    'example.com',
    'test.com',
    'invalid',
    'local'
  ];

  if (reservedDomains.includes(cleanDomain)) {
    errors.push('Questo dominio è riservato e non può essere utilizzato');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Valida i limiti di un tenant
 */
export function validateTenantLimits(data: {
  currentUsers: number;
  maxUsers: number;
  currentCompanies: number;
  maxCompanies: number;
  currentStorage?: number;
  maxStorage?: number;
}): TenantLimitsCheck {
  return {
    users: {
      current: data.currentUsers,
      limit: data.maxUsers,
      exceeded: data.currentUsers >= data.maxUsers,
      remaining: Math.max(0, data.maxUsers - data.currentUsers)
    },
    companies: {
      current: data.currentCompanies,
      limit: data.maxCompanies,
      exceeded: data.currentCompanies >= data.maxCompanies,
      remaining: Math.max(0, data.maxCompanies - data.currentCompanies)
    },
    storage: {
      current: data.currentStorage || 0,
      limit: data.maxStorage || 0,
      exceeded: (data.currentStorage || 0) >= (data.maxStorage || 0),
      remaining: Math.max(0, (data.maxStorage || 0) - (data.currentStorage || 0))
    }
  };
}

/**
 * Valida le impostazioni di un tenant
 */
export function validateTenantSettings(settings: Record<string, any>): TenantValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validazione tema
  if (settings.theme) {
    const validThemes = ['default', 'dark', 'light', 'custom'];
    if (!validThemes.includes(settings.theme)) {
      errors.push('Tema non valido');
    }
  }

  // Validazione locale
  if (settings.locale) {
    const localeRegex = /^[a-z]{2}-[A-Z]{2}$/;
    if (!localeRegex.test(settings.locale)) {
      errors.push('Formato locale non valido (es. it-IT)');
    }
  }

  // Validazione timezone
  if (settings.timezone) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: settings.timezone });
    } catch {
      errors.push('Timezone non valido');
    }
  }

  // Validazione colori
  if (settings.primaryColor) {
    if (!isValidColor(settings.primaryColor)) {
      errors.push('Colore primario non valido');
    }
  }

  if (settings.secondaryColor) {
    if (!isValidColor(settings.secondaryColor)) {
      errors.push('Colore secondario non valido');
    }
  }

  // Validazione logo URL
  if (settings.logo) {
    if (!isValidUrl(settings.logo)) {
      errors.push('URL logo non valido');
    }
  }

  // Validazione CSS personalizzato
  if (settings.customCss) {
    if (typeof settings.customCss !== 'string') {
      errors.push('CSS personalizzato deve essere una stringa');
    } else if (settings.customCss.length > 50000) {
      warnings.push('CSS personalizzato molto lungo, potrebbe influire sulle performance');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Valida le impostazioni di sicurezza di un tenant
 */
export function validateTenantSecuritySettings(settings: Record<string, any>): TenantValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validazione timeout sessione
  if (settings.sessionTimeout !== undefined) {
    if (typeof settings.sessionTimeout !== 'number' || settings.sessionTimeout < 300) {
      errors.push('Timeout sessione deve essere almeno 300 secondi (5 minuti)');
    } else if (settings.sessionTimeout > 86400) {
      warnings.push('Timeout sessione molto lungo (>24 ore)');
    }
  }

  // Validazione tentativi falliti
  if (settings.maxFailedAttempts !== undefined) {
    if (typeof settings.maxFailedAttempts !== 'number' || settings.maxFailedAttempts < 3) {
      errors.push('Numero massimo tentativi falliti deve essere almeno 3');
    } else if (settings.maxFailedAttempts > 20) {
      warnings.push('Numero massimo tentativi falliti molto alto');
    }
  }

  // Validazione durata blocco
  if (settings.lockoutDuration !== undefined) {
    if (typeof settings.lockoutDuration !== 'number' || settings.lockoutDuration < 300) {
      errors.push('Durata blocco deve essere almeno 300 secondi (5 minuti)');
    }
  }

  // Validazione policy password
  if (settings.passwordPolicy) {
    const policy = settings.passwordPolicy;
    
    if (policy.minLength !== undefined) {
      if (typeof policy.minLength !== 'number' || policy.minLength < 6) {
        errors.push('Lunghezza minima password deve essere almeno 6 caratteri');
      } else if (policy.minLength > 128) {
        errors.push('Lunghezza minima password troppo alta (max 128)');
      }
    }

    if (policy.maxAge !== undefined) {
      if (typeof policy.maxAge !== 'number' || policy.maxAge < 30) {
        warnings.push('Scadenza password molto breve (<30 giorni)');
      } else if (policy.maxAge > 365) {
        warnings.push('Scadenza password molto lunga (>1 anno)');
      }
    }
  }

  // Validazione whitelist IP
  if (settings.ipWhitelist) {
    if (!Array.isArray(settings.ipWhitelist)) {
      errors.push('Whitelist IP deve essere un array');
    } else {
      for (const ip of settings.ipWhitelist) {
        if (!isValidIpAddress(ip)) {
          errors.push(`Indirizzo IP non valido: ${ip}`);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Valida i dati di billing di un tenant
 */
export function validateTenantBilling(billing: {
  plan: string;
  maxUsers: number;
  maxCompanies: number;
  maxStorage: number;
}): TenantValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validazione piano
  const validPlans = ['basic', 'professional', 'enterprise'];
  if (!validPlans.includes(billing.plan)) {
    errors.push('Piano di billing non valido');
  }

  // Validazione limiti in base al piano
  const planLimits = {
    basic: { maxUsers: 50, maxCompanies: 5, maxStorage: 1024 * 1024 * 1024 }, // 1GB
    professional: { maxUsers: 200, maxCompanies: 20, maxStorage: 10 * 1024 * 1024 * 1024 }, // 10GB
    enterprise: { maxUsers: 1000, maxCompanies: 100, maxStorage: 100 * 1024 * 1024 * 1024 } // 100GB
  };

  const limits = planLimits[billing.plan as keyof typeof planLimits];
  if (limits) {
    if (billing.maxUsers > limits.maxUsers) {
      warnings.push(`Limite utenti superiore al piano ${billing.plan} (max ${limits.maxUsers})`);
    }
    if (billing.maxCompanies > limits.maxCompanies) {
      warnings.push(`Limite aziende superiore al piano ${billing.plan} (max ${limits.maxCompanies})`);
    }
    if (billing.maxStorage > limits.maxStorage) {
      warnings.push(`Limite storage superiore al piano ${billing.plan}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Utility functions
 */
function isValidColor(color: string): boolean {
  // Valida colori hex, rgb, rgba, hsl, hsla e nomi CSS
  const colorRegex = /^(#[0-9A-Fa-f]{3,8}|rgb\(.*\)|rgba\(.*\)|hsl\(.*\)|hsla\(.*\)|[a-zA-Z]+)$/;
  return colorRegex.test(color);
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isValidIpAddress(ip: string): boolean {
  // Valida IPv4 e IPv6
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Valida la compatibilità tra tenant e utente
 */
export function validateTenantUserCompatibility(
  tenantId: string,
  personId: string,
  userTenantId?: string,
  userGlobalRole?: string
): TenantValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Super admin può accedere a qualsiasi tenant
  if (userGlobalRole === 'SUPER_ADMIN') {
    return { isValid: true, errors, warnings };
  }

  // Verifica che l'utente appartenga al tenant
  if (userTenantId && userTenantId !== tenantId) {
    errors.push('Utente non autorizzato ad accedere a questo tenant');
  }

  if (!userTenantId) {
    warnings.push('Utente senza tenant assegnato');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Log delle validazioni per debug
 */
export function logValidationResult(
  context: string,
  result: TenantValidationResult
): void {
  if (!result.isValid) {
    logger.error(`Validazione fallita [${context}]:`, {
      errors: result.errors,
      warnings: result.warnings
    });
  } else if (result.warnings.length > 0) {
    logger.warn(`Validazione con warning [${context}]:`, {
      warnings: result.warnings
    });
  } else {
    logger.debug(`Validazione riuscita [${context}]`);
  }
}