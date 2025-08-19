/**
 * Google API Service - Gestione centralizzata Google APIs
 */

import { google } from 'googleapis';
import { logger } from '../utils/logger.js';
import path from 'path';
import fs from 'fs';

export class GoogleAPIService {
  constructor() {
    this.auth = null;
    this.drive = null;
    this.docs = null;
    this.sheets = null;
    this.isInitialized = false;
    
    this.config = {
      keyFilePath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY || './config/google-service-account.json',
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/spreadsheets'
      ]
    };
  }

  /**
   * Inizializza Google API Service
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        logger.warn('Google API Service already initialized', { service: 'google-api' });
        return;
      }

      // Verifica se il file delle credenziali esiste
      if (!fs.existsSync(this.config.keyFilePath)) {
        logger.warn('Google service account key file not found, skipping Google API initialization', {
          service: 'google-api',
          keyFilePath: this.config.keyFilePath
        });
        return;
      }

      // Inizializza autenticazione
      this.auth = new google.auth.GoogleAuth({
        keyFile: this.config.keyFilePath,
        scopes: this.config.scopes
      });

      // Inizializza servizi Google
      this.drive = google.drive({ version: 'v3', auth: this.auth });
      this.docs = google.docs({ version: 'v1', auth: this.auth });
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });

      // Test connessione
      await this.testConnection();
      
      this.isInitialized = true;
      
      logger.info('Google API Service initialized successfully', {
        service: 'google-api',
        scopes: this.config.scopes.length
      });
      
    } catch (error) {
      logger.error('Failed to initialize Google API Service', {
        service: 'google-api',
        error: error.message
      });
      // Non lanciare errore per permettere al server di avviarsi anche senza Google APIs
    }
  }

  /**
   * Test di connessione
   */
  async testConnection() {
    if (!this.drive) {
      throw new Error('Google Drive API not initialized');
    }
    
    // Test semplice: lista primi 5 file
    await this.drive.files.list({
      pageSize: 5,
      fields: 'files(id, name)'
    });
  }

  /**
   * Verifica se il servizio è inizializzato e funzionante
   */
  isHealthy() {
    return this.isInitialized && this.auth !== null;
  }

  /**
   * Shutdown del servizio
   */
  async shutdown() {
    try {
      if (this.isInitialized) {
        // Cleanup se necessario
        this.auth = null;
        this.drive = null;
        this.docs = null;
        this.sheets = null;
        this.isInitialized = false;
        
        logger.info('Google API Service shutdown completed', { service: 'google-api' });
      }
    } catch (error) {
      logger.error('Error during Google API Service shutdown', {
        service: 'google-api',
        error: error.message
      });
    }
  }

  /**
   * Ottieni client Drive
   */
  getDriveClient() {
    if (!this.isInitialized || !this.drive) {
      throw new Error('Google Drive API not initialized');
    }
    return this.drive;
  }

  /**
   * Ottieni client Docs
   */
  getDocsClient() {
    if (!this.isInitialized || !this.docs) {
      throw new Error('Google Docs API not initialized');
    }
    return this.docs;
  }

  /**
   * Ottieni client Sheets
   */
  getSheetsClient() {
    if (!this.isInitialized || !this.sheets) {
      throw new Error('Google Sheets API not initialized');
    }
    return this.sheets;
  }

  /**
   * Lista file da Google Drive
   */
  async listFiles(options = {}) {
    const drive = this.getDriveClient();
    
    const defaultOptions = {
      pageSize: 10,
      fields: 'files(id, name, mimeType, modifiedTime)'
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    const response = await drive.files.list(mergedOptions);
    return response.data.files;
  }

  /**
   * Crea documento Google Docs
   */
  async createDocument(title) {
    const docs = this.getDocsClient();
    
    const response = await docs.documents.create({
      requestBody: {
        title: title
      }
    });
    
    return response.data;
  }

  /**
   * Leggi contenuto documento Google Docs
   */
  async getDocument(documentId) {
    const docs = this.getDocsClient();
    
    const response = await docs.documents.get({
      documentId: documentId
    });
    
    return response.data;
  }
}

export default GoogleAPIService;