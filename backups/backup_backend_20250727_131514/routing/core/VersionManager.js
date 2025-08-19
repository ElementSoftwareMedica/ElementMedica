/**
 * VersionManager - Sistema di gestione versioni API per il routing
 * Gestisce la risoluzione delle versioni API dalle richieste
 */

import { logger } from '../../utils/logger.js';
import { RouterMapUtils } from './RouterMap.js';

class VersionManager {
  constructor(routerMap) {
    this.routerMap = routerMap;
    this.currentVersion = routerMap?.versions?.current || 'v1';
    this.supportedVersions = routerMap?.versions?.supported || ['v1', 'v2'];
    this.defaultVersion = routerMap?.versions?.default || 'v1';
  }

  /**
   * Risolve la versione API dalla richiesta
   * Priorità: x-api-version header > path > query param > default
   * @param {Object} req - Express request object
   * @returns {string} - Versione risolta
   */
  resolveVersion(req) {
    // 1. Header x-api-version (dal proxy - massima priorità)
    const headerVersion = req.headers['x-api-version'];
    if (headerVersion && this.isValidVersion(headerVersion)) {
      logger.debug('Version resolved from x-api-version header', { 
        version: headerVersion,
        component: 'VersionManager'
      });
      return headerVersion;
    }

    // 2. Estrazione da path /api/v1, /api/v2
    const pathVersion = this.extractVersionFromPath(req.path);
    if (pathVersion && this.isValidVersion(pathVersion)) {
      logger.debug('Version resolved from path', { 
        version: pathVersion,
        path: req.path,
        component: 'VersionManager'
      });
      return pathVersion;
    }

    // 3. Query parameter ?version=v1
    const queryVersion = req.query?.version;
    if (queryVersion && this.isValidVersion(queryVersion)) {
      logger.debug('Version resolved from query param', { 
        version: queryVersion,
        component: 'VersionManager'
      });
      return queryVersion;
    }

    // 4. Versione di default
    logger.debug('Using default version', { 
      version: this.defaultVersion,
      component: 'VersionManager'
    });
    return this.defaultVersion;
  }

  /**
   * Estrae la versione dal path URL
   * @param {string} path - Path della richiesta
   * @returns {string|null} - Versione estratta o null
   */
  extractVersionFromPath(path) {
    const match = path.match(/^\/api\/(v\d+)\//);
    return match ? match[1] : null;
  }

  /**
   * Normalizza la versione (es. v1, 1.0 -> v1)
   * @param {string} version - Versione da normalizzare
   * @returns {string} - Versione normalizzata
   */
  normalizeVersion(version) {
    if (!version) return this.defaultVersion;
    
    // Se già nel formato vX
    if (/^v\d+$/.test(version)) {
      return version;
    }
    
    // Se nel formato X.Y.Z -> vX
    const semverMatch = version.match(/^(\d+)\.\d+\.\d+$/);
    if (semverMatch) {
      return `v${semverMatch[1]}`;
    }
    
    // Se solo numero -> vX
    const numberMatch = version.match(/^\d+$/);
    if (numberMatch) {
      return `v${version}`;
    }
    
    return this.defaultVersion;
  }

  /**
   * Verifica se una versione è valida/supportata
   * @param {string} version - Versione da verificare
   * @returns {boolean} - True se valida
   */
  isValidVersion(version) {
    const normalized = this.normalizeVersion(version);
    return this.supportedVersions.includes(normalized);
  }

  /**
   * Ottiene informazioni su una versione
   * @param {string} version - Versione richiesta
   * @returns {Object} - Informazioni versione
   */
  getVersionInfo(version) {
    const normalized = this.normalizeVersion(version);
    return {
      version: normalized,
      isSupported: this.isValidVersion(version),
      isCurrent: normalized === this.currentVersion,
      isDefault: normalized === this.defaultVersion
    };
  }

  /**
   * Ottiene tutte le versioni supportate
   * @returns {Array} - Array delle versioni supportate
   */
  getSupportedVersions() {
    return [...this.supportedVersions];
  }

  /**
   * Ottiene la versione corrente
   * @returns {string} - Versione corrente
   */
  getCurrentVersion() {
    return this.currentVersion;
  }

  /**
   * Ottiene la versione di default
   * @returns {string} - Versione di default
   */
  getDefaultVersion() {
    return this.defaultVersion;
  }

  /**
   * Verifica se una versione è deprecata
   * @param {string} version - Versione da verificare
   * @returns {boolean} - True se deprecata
   */
  isVersionDeprecated(version) {
    const normalized = this.normalizeVersion(version);
    return this.routerMap?.versions?.deprecated?.includes(normalized) || false;
  }

  /**
   * Verifica se una versione è sunset (non più supportata)
   * @param {string} version - Versione da verificare
   * @returns {boolean} - True se sunset
   */
  isVersionSunset(version) {
    const normalized = this.normalizeVersion(version);
    return this.routerMap?.versions?.sunset?.includes(normalized) || false;
  }

  /**
   * Genera route dinamiche per tutte le versioni supportate
   * @returns {Object} - Route dinamiche generate
   */
  generateDynamicRoutes() {
    const dynamicRoutes = {};
    const baseDynamicRoutes = RouterMapUtils.getDynamicRoutes();
    
    for (const version of this.supportedVersions) {
      for (const [pattern, config] of Object.entries(baseDynamicRoutes)) {
        const versionedPattern = pattern.replace(':version', version);
        dynamicRoutes[versionedPattern] = {
          ...config,
          version: version,
          pattern: versionedPattern
        };
      }
    }
    
    return dynamicRoutes;
  }

  /**
   * Crea middleware Express per la risoluzione delle versioni
   * @returns {Function} - Middleware Express
   */
  createVersionMiddleware() {
    return (req, res, next) => {
      try {
        // Risolvi la versione dalla richiesta
        const resolvedVersion = this.resolveVersion(req);
        
        // Imposta la versione nell'oggetto request
        req.apiVersion = resolvedVersion;
        
        // Imposta header di risposta per indicare la versione utilizzata
        res.set('API-Version', resolvedVersion);
        
        logger.debug('Version middleware processed request', {
          originalUrl: req.originalUrl,
          resolvedVersion,
          headers: {
            'x-api-version': req.headers['x-api-version'],
            'accept-version': req.headers['accept-version']
          },
          component: 'VersionManager'
        });
        
        next();
      } catch (error) {
        logger.error('Version middleware error', {
          error: error.message,
          url: req.originalUrl,
          component: 'VersionManager'
        });
        
        // In caso di errore, usa la versione di default
        req.apiVersion = this.defaultVersion;
        res.set('API-Version', this.defaultVersion);
        next();
      }
    };
  }

  /**
   * Ottiene informazioni su tutte le versioni
   * @returns {Object} - Informazioni complete sulle versioni
   */
  getAllVersionsInfo() {
    return {
      current: this.currentVersion,
      default: this.defaultVersion,
      supported: this.supportedVersions,
      versions: this.supportedVersions.map(version => this.getVersionInfo(version))
    };
  }
}

export default VersionManager;