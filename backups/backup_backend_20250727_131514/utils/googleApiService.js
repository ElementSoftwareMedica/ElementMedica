import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import { logger } from './logger.js';
import { cacheService } from './cache.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Google API Service - Ottimizzato per performance e caching
 * Gestisce autenticazione e operazioni con Google Drive/Docs
 */
class GoogleApiService {
  constructor() {
    this.auth = null;
    this.drive = null;
    this.docs = null;
    this.sheets = null;
    this.initialized = false;
    this.credentialsPath = path.join(__dirname, '..', 'credentials.json');
    
    // Cache configuration
    this.cacheConfig = {
      authTokenTTL: 3600, // 1 hour
      fileMetadataTTL: 1800, // 30 minutes
      documentContentTTL: 900, // 15 minutes
      folderListTTL: 1800 // 30 minutes
    };
    
    // Rate limiting configuration
    this.rateLimits = {
      requestsPerSecond: 10,
      burstLimit: 100,
      requestQueue: [],
      lastRequestTime: 0
    };
  }

  /**
   * Inizializza il servizio Google API con autenticazione
   */
  async initialize() {
    try {
      if (this.initialized) {
        return true;
      }

      // Verifica esistenza file credentials
      if (!fs.existsSync(this.credentialsPath)) {
        throw new Error(`Credentials file not found: ${this.credentialsPath}`);
      }

      // Carica le credenziali
      const credentials = JSON.parse(fs.readFileSync(this.credentialsPath, 'utf8'));
      
      // Configura l'autenticazione JWT
      this.auth = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: [
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/documents',
          'https://www.googleapis.com/auth/spreadsheets'
        ]
      });

      // Autorizza e ottieni token
      await this.auth.authorize();
      
      // Inizializza i servizi API
      this.drive = google.drive({ version: 'v3', auth: this.auth });
      this.docs = google.docs({ version: 'v1', auth: this.auth });
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      
      this.initialized = true;
      
      logger.info('Google API Service initialized successfully', {
        service: 'google-api',
        scopes: ['drive', 'docs', 'sheets']
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize Google API Service', {
        service: 'google-api',
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Rate limiting per le richieste API
   */
  async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.rateLimits.lastRequestTime;
    const minInterval = 1000 / this.rateLimits.requestsPerSecond;
    
    if (timeSinceLastRequest < minInterval) {
      const delay = minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.rateLimits.lastRequestTime = Date.now();
  }

  /**
   * Wrapper per richieste API con retry e error handling
   */
  async apiRequest(operation, maxRetries = 3) {
    await this.ensureInitialized();
    await this.rateLimit();
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        return result;
      } catch (error) {
        logger.warn(`Google API request failed (attempt ${attempt}/${maxRetries})`, {
          service: 'google-api',
          error: error.message,
          attempt
        });
        
        // Se è l'ultimo tentativo, rilancia l'errore
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Attendi prima del retry (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Assicura che il servizio sia inizializzato
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Ottiene la lista dei file da Google Drive con caching
   */
  async listFiles(folderId = null, useCache = true) {
    const cacheKey = `drive:files:${folderId || 'root'}`;
    
    if (useCache) {
      try {
        const cached = await cacheService.get(cacheKey);
        if (cached) {
          logger.debug('Returning cached file list', { service: 'google-api', folderId });
          return cached;
        }
      } catch (error) {
        logger.warn('Cache read failed for file list', { service: 'google-api', error: error.message });
      }
    }

    const result = await this.apiRequest(async () => {
      const query = folderId ? `'${folderId}' in parents` : "'root' in parents";
      
      const response = await this.drive.files.list({
        q: query + " and trashed=false",
        fields: 'files(id,name,mimeType,modifiedTime,size,webViewLink,thumbnailLink)',
        orderBy: 'modifiedTime desc'
      });
      
      return response.data.files;
    });

    // Cache del risultato
    if (useCache) {
      try {
        await cacheService.set(cacheKey, result, this.cacheConfig.folderListTTL);
      } catch (error) {
        logger.warn('Cache write failed for file list', { service: 'google-api', error: error.message });
      }
    }

    logger.info('Retrieved file list from Google Drive', {
      service: 'google-api',
      folderId,
      fileCount: result.length
    });

    return result;
  }

  /**
   * Ottiene i metadati di un file specifico con caching
   */
  async getFileMetadata(fileId, useCache = true) {
    const cacheKey = `drive:metadata:${fileId}`;
    
    if (useCache) {
      try {
        const cached = await cacheService.get(cacheKey);
        if (cached) {
          logger.debug('Returning cached file metadata', { service: 'google-api', fileId });
          return cached;
        }
      } catch (error) {
        logger.warn('Cache read failed for file metadata', { service: 'google-api', error: error.message });
      }
    }

    const result = await this.apiRequest(async () => {
      const response = await this.drive.files.get({
        fileId,
        fields: 'id,name,mimeType,modifiedTime,size,webViewLink,thumbnailLink,parents,createdTime,lastModifyingUser'
      });
      
      return response.data;
    });

    // Cache del risultato
    if (useCache) {
      try {
        await cacheService.set(cacheKey, result, this.cacheConfig.fileMetadataTTL);
      } catch (error) {
        logger.warn('Cache write failed for file metadata', { service: 'google-api', error: error.message });
      }
    }

    return result;
  }

  /**
   * Ottiene il contenuto di un Google Doc con caching
   */
  async getDocumentContent(documentId, useCache = true) {
    const cacheKey = `docs:content:${documentId}`;
    
    if (useCache) {
      try {
        const cached = await cacheService.get(cacheKey);
        if (cached) {
          logger.debug('Returning cached document content', { service: 'google-api', documentId });
          return cached;
        }
      } catch (error) {
        logger.warn('Cache read failed for document content', { service: 'google-api', error: error.message });
      }
    }

    const result = await this.apiRequest(async () => {
      const response = await this.docs.documents.get({
        documentId
      });
      
      return response.data;
    });

    // Cache del risultato
    if (useCache) {
      try {
        await cacheService.set(cacheKey, result, this.cacheConfig.documentContentTTL);
      } catch (error) {
        logger.warn('Cache write failed for document content', { service: 'google-api', error: error.message });
      }
    }

    logger.info('Retrieved document content from Google Docs', {
      service: 'google-api',
      documentId,
      title: result.title
    });

    return result;
  }

  /**
   * Crea una copia di un template Google Doc
   */
  async copyTemplate(templateId, newName, destinationFolderId = null) {
    const result = await this.apiRequest(async () => {
      const copyRequest = {
        name: newName
      };
      
      if (destinationFolderId) {
        copyRequest.parents = [destinationFolderId];
      }
      
      const response = await this.drive.files.copy({
        fileId: templateId,
        requestBody: copyRequest
      });
      
      return response.data;
    });

    logger.info('Created copy of Google Doc template', {
      service: 'google-api',
      templateId,
      newFileId: result.id,
      newName
    });

    // Invalida cache delle liste di file
    this.invalidateFileListCache();

    return result;
  }

  /**
   * Aggiorna il contenuto di un Google Doc
   */
  async updateDocumentContent(documentId, requests) {
    const result = await this.apiRequest(async () => {
      const response = await this.docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests
        }
      });
      
      return response.data;
    });

    logger.info('Updated Google Doc content', {
      service: 'google-api',
      documentId,
      requestCount: requests.length
    });

    // Invalida cache del documento
    const cacheKey = `docs:content:${documentId}`;
    try {
      await cacheService.delete(cacheKey);
    } catch (error) {
      logger.warn('Failed to invalidate document cache', { service: 'google-api', error: error.message });
    }

    return result;
  }

  /**
   * Invalida la cache delle liste di file
   */
  async invalidateFileListCache() {
    try {
      const pattern = 'drive:files:*';
      await cacheService.deletePattern(pattern);
      logger.debug('Invalidated file list cache', { service: 'google-api' });
    } catch (error) {
      logger.warn('Failed to invalidate file list cache', { service: 'google-api', error: error.message });
    }
  }

  /**
   * Ottiene statistiche del servizio
   */
  getStats() {
    return {
      initialized: this.initialized,
      rateLimits: {
        requestsPerSecond: this.rateLimits.requestsPerSecond,
        lastRequestTime: this.rateLimits.lastRequestTime
      },
      cacheConfig: this.cacheConfig
    };
  }

  /**
   * Chiude il servizio e pulisce le risorse
   */
  async shutdown() {
    try {
      this.initialized = false;
      this.auth = null;
      this.drive = null;
      this.docs = null;
      this.sheets = null;
      
      logger.info('Google API Service shutdown completed', { service: 'google-api' });
    } catch (error) {
      logger.error('Error during Google API Service shutdown', {
        service: 'google-api',
        error: error.message
      });
    }
  }
}

// Esporta un'istanza singleton
const googleApiService = new GoogleApiService();
export default googleApiService;