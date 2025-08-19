/**
 * Tenant Extractor Utilities - Week 12 Multi-Tenant Implementation
 * Utility per estrarre informazioni tenant dalle richieste HTTP
 */

import { Request } from 'express';
import { logger } from './logger';

/**
 * Interfaccia per le informazioni tenant estratte
 */
export interface TenantInfo {
  tenantId?: string;
  slug?: string;
  domain?: string;
  source: 'header' | 'subdomain' | 'domain' | 'query' | 'body' | 'default';
}

/**
 * Estrae informazioni tenant da una richiesta HTTP
 */
export function extractTenantFromRequest(req: Request): TenantInfo {
  // 1. Controlla header X-Tenant-ID (priorità più alta)
  const tenantIdHeader = req.get('X-Tenant-ID');
  if (tenantIdHeader) {
    logger.debug(`Tenant ID trovato in header: ${tenantIdHeader}`);
    return {
      tenantId: tenantIdHeader,
      source: 'header'
    };
  }

  // 2. Controlla header X-Tenant-Slug
  const tenantSlugHeader = req.get('X-Tenant-Slug');
  if (tenantSlugHeader) {
    logger.debug(`Tenant slug trovato in header: ${tenantSlugHeader}`);
    return {
      slug: tenantSlugHeader,
      source: 'header'
    };
  }

  // 3. Estrai da subdomain (es. tenant1.example.com)
  const host = req.get('Host');
  if (host) {
    const subdomainInfo = extractFromSubdomain(host);
    if (subdomainInfo.slug) {
      logger.debug(`Tenant slug trovato in subdomain: ${subdomainInfo.slug}`);
      return {
        slug: subdomainInfo.slug,
        source: 'subdomain'
      };
    }
  }

  // 4. Controlla dominio personalizzato
  if (host) {
    const customDomain = extractFromCustomDomain(host);
    if (customDomain.domain) {
      logger.debug(`Dominio personalizzato trovato: ${customDomain.domain}`);
      return {
        domain: customDomain.domain,
        source: 'domain'
      };
    }
  }

  // 5. Controlla query parameters
  const queryTenantId = req.query.tenantId as string;
  const queryTenantSlug = req.query.tenant as string;
  
  if (queryTenantId) {
    logger.debug(`Tenant ID trovato in query: ${queryTenantId}`);
    return {
      tenantId: queryTenantId,
      source: 'query'
    };
  }
  
  if (queryTenantSlug) {
    logger.debug(`Tenant slug trovato in query: ${queryTenantSlug}`);
    return {
      slug: queryTenantSlug,
      source: 'query'
    };
  }

  // 6. Controlla body (per richieste POST/PUT)
  if (req.body) {
    const bodyTenantId = req.body.tenantId;
    const bodyTenantSlug = req.body.tenant;
    
    if (bodyTenantId) {
      logger.debug(`Tenant ID trovato in body: ${bodyTenantId}`);
      return {
        tenantId: bodyTenantId,
        source: 'body'
      };
    }
    
    if (bodyTenantSlug) {
      logger.debug(`Tenant slug trovato in body: ${bodyTenantSlug}`);
      return {
        slug: bodyTenantSlug,
        source: 'body'
      };
    }
  }

  // 7. Nessuna informazione tenant trovata
  logger.debug('Nessuna informazione tenant trovata nella richiesta');
  return {
    source: 'default'
  };
}

/**
 * Estrae tenant slug da subdomain
 * Esempi:
 * - tenant1.example.com -> tenant1
 * - api.tenant1.example.com -> tenant1
 * - www.example.com -> null
 */
function extractFromSubdomain(host: string): { slug?: string } {
  try {
    // Rimuovi porta se presente
    const hostname = host.split(':')[0];
    
    // Lista di subdomain da ignorare
    const ignoredSubdomains = ['www', 'api', 'admin', 'app', 'dashboard', 'localhost'];
    
    // Split del hostname
    const parts = hostname.split('.');
    
    // Se ci sono almeno 3 parti (subdomain.domain.tld)
    if (parts.length >= 3) {
      const subdomain = parts[0];
      
      // Controlla se il subdomain non è nella lista degli ignorati
      if (!ignoredSubdomains.includes(subdomain.toLowerCase())) {
        // Valida che il subdomain sia un slug valido
        if (isValidSlug(subdomain)) {
          return { slug: subdomain };
        }
      }
      
      // Se il primo subdomain è ignorato, controlla il secondo
      if (parts.length >= 4 && ignoredSubdomains.includes(subdomain.toLowerCase())) {
        const secondSubdomain = parts[1];
        if (isValidSlug(secondSubdomain)) {
          return { slug: secondSubdomain };
        }
      }
    }
    
    return {};
  } catch (error) {
    logger.error('Errore nell\'estrazione del subdomain:', error);
    return {};
  }
}

/**
 * Estrae tenant da dominio personalizzato
 * Controlla se il dominio è nella lista dei domini personalizzati
 */
function extractFromCustomDomain(host: string): { domain?: string } {
  try {
    // Rimuovi porta se presente
    const hostname = host.split(':')[0].toLowerCase();
    
    // Lista di domini di sistema da ignorare
    const systemDomains = [
      'localhost',
      '127.0.0.1',
      'example.com',
      'test.com',
      'dev.com'
    ];
    
    // Se non è un dominio di sistema, potrebbe essere un dominio personalizzato
    if (!systemDomains.some(domain => hostname.includes(domain))) {
      // Valida che sia un dominio valido
      if (isValidDomain(hostname)) {
        return { domain: hostname };
      }
    }
    
    return {};
  } catch (error) {
    logger.error('Errore nell\'estrazione del dominio personalizzato:', error);
    return {};
  }
}

/**
 * Valida che una stringa sia un slug valido
 */
function isValidSlug(slug: string): boolean {
  // Slug deve essere alfanumerico con trattini, lunghezza 2-50 caratteri
  const slugRegex = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
  return slugRegex.test(slug.toLowerCase());
}

/**
 * Valida che una stringa sia un dominio valido
 */
function isValidDomain(domain: string): boolean {
  // Regex semplificata per validazione dominio
  const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/;
  return domainRegex.test(domain.toLowerCase()) && domain.length <= 253;
}

/**
 * Costruisce URL tenant-aware
 */
export function buildTenantUrl(
  baseUrl: string,
  tenantSlug: string,
  path = '',
  useSubdomain = true
): string {
  try {
    const url = new URL(baseUrl);
    
    if (useSubdomain) {
      // Usa subdomain: tenant.example.com/path
      const hostname = url.hostname;
      const parts = hostname.split('.');
      
      // Se già c'è un subdomain, sostituiscilo
      if (parts.length >= 3) {
        parts[0] = tenantSlug;
      } else {
        // Aggiungi subdomain
        parts.unshift(tenantSlug);
      }
      
      url.hostname = parts.join('.');
    } else {
      // Usa path: example.com/tenant/path
      const pathSegments = url.pathname.split('/').filter(Boolean);
      pathSegments.unshift(tenantSlug);
      url.pathname = '/' + pathSegments.join('/');
    }
    
    // Aggiungi path aggiuntivo se fornito
    if (path) {
      url.pathname = url.pathname.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
    }
    
    return url.toString();
  } catch (error) {
    logger.error('Errore nella costruzione URL tenant:', error);
    return baseUrl;
  }
}

/**
 * Estrae tenant context da JWT token
 */
export function extractTenantFromToken(token: any): { tenantId?: string; tenantSlug?: string } {
  try {
    if (token && typeof token === 'object') {
      return {
        tenantId: token.tenantId,
        tenantSlug: token.tenantSlug
      };
    }
    return {};
  } catch (error) {
    logger.error('Errore nell\'estrazione tenant dal token:', error);
    return {};
  }
}

/**
 * Normalizza tenant identifier
 */
export function normalizeTenantIdentifier(identifier: string): string {
  return identifier
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Verifica se una richiesta è tenant-scoped
 */
export function isTenantScopedRequest(req: Request): boolean {
  const tenantInfo = extractTenantFromRequest(req);
  return !!(tenantInfo.tenantId || tenantInfo.slug || tenantInfo.domain);
}

/**
 * Ottiene tenant ID dalla richiesta (con fallback)
 */
export function getTenantIdFromRequest(req: Request, defaultTenantId?: string): string | undefined {
  const tenantInfo = extractTenantFromRequest(req);
  
  if (tenantInfo.tenantId) {
    return tenantInfo.tenantId;
  }
  
  // Se abbiamo solo slug o domain, il middleware dovrebbe aver già risolto il tenantId
  // Controlla se è stato impostato nella richiesta
  const extendedReq = req as any;
  if (extendedReq.tenantId) {
    return extendedReq.tenantId;
  }
  
  return defaultTenantId;
}

/**
 * Utility per debug delle informazioni tenant
 */
export function debugTenantInfo(req: Request): void {
  const tenantInfo = extractTenantFromRequest(req);
  const host = req.get('Host');
  const userAgent = req.get('User-Agent');
  
  logger.debug('=== TENANT DEBUG INFO ===', {
    host,
    userAgent,
    tenantInfo,
    headers: {
      'X-Tenant-ID': req.get('X-Tenant-ID'),
      'X-Tenant-Slug': req.get('X-Tenant-Slug'),
    },
    query: {
      tenantId: req.query.tenantId,
      tenant: req.query.tenant,
    },
    body: req.body ? {
      tenantId: req.body.tenantId,
      tenant: req.body.tenant,
    } : null,
  });
}