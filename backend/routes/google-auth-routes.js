/**
 * Google OAuth2 Routes
 * Handles authentication, authorization, and token management for Google Workspace integration
 */

import express from 'express';
import prisma from '../config/prisma-optimization.js';
import middleware from '../middleware/auth.js';
import {
  getOAuth2Client,
  saveTokens,
  revokeTokens,
  getConnectionStatus,
  getValidAccessToken
} from '../services/googleTokenService.js';
import { importDocument } from '../services/googleDocsImporter.js';
import { importPresentation } from '../services/googleSlidesImporter.js';
import logger from '../utils/logger.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';
import googleDocsService from '../services/google-docs-service.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Middleware destructuring
const { authenticate: authenticateToken, requirePermission } = middleware;

// Helper to get authenticated user info
const getAuthUser = (req) => ({
  userId: req.person.id,
  tenantId: getEffectiveTenantId(req)
});

/**
 * GET /api/v1/google/auth/url
 * Generate Google OAuth2 authorization URL
 */
router.get('/auth/url', authenticateToken, requirePermission('templates:manage'), async (req, res) => {
  try {
    const { userId, tenantId } = getAuthUser(req);

    const oauth2Client = getOAuth2Client();

    // Generate authorization URL with required scopes
    const scopes = [
      'https://www.googleapis.com/auth/documents',           // Read/write Google Docs
      'https://www.googleapis.com/auth/presentations',       // Read/write Google Slides  
      'https://www.googleapis.com/auth/drive',                // Full Drive access (needed to access existing files)
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Request refresh token
      scope: scopes,
      prompt: 'consent', // Force consent to get refresh token
      state: JSON.stringify({ userId, tenantId }) // Pass user context
    });

    logger.info('Generated Google OAuth2 URL', {
      component: 'google-auth-routes',
      action: 'getAuthUrl',
      userId,
      tenantId
    });

    res.json({
      success: true,
      data: {
        authUrl,
        scopes
      }
    });
  } catch (error) {
    logger.error('Failed to generate auth URL', {
      component: 'google-auth-routes',
      action: 'getAuthUrl',
      error: 'Operazione non riuscita'
    });

    res.status(500).json({
      success: false,
      error: 'Errore nella generazione dell\'URL di autorizzazione',
    });
  }
});

/**
 * POST /api/v1/google/auth/callback
 * Handle OAuth2 callback and exchange code for tokens
 */
router.post('/auth/callback', authenticateToken, requirePermission('templates:manage'), async (req, res) => {
  try {
    const { userId, tenantId } = getAuthUser(req);
    const { code, state } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Codice di autorizzazione obbligatorio'
      });
    }

    // Verify state matches user context (optional security check)
    if (state) {
      try {
        const stateData = JSON.parse(state);
        if (stateData.userId !== userId || stateData.tenantId !== tenantId) {
          logger.warn('State mismatch in OAuth callback', {
            component: 'google-auth-routes',
            action: 'callback',
            userId,
            tenantId,
            stateUserId: stateData.userId,
            stateTenantId: stateData.tenantId
          });
        }
      } catch (parseError) {
        logger.warn('Failed to parse state parameter', {
          component: 'google-auth-routes',
          action: 'callback',
          error: parseError.message
        });
      }
    }

    const oauth2Client = getOAuth2Client();

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    // Save tokens to database
    await saveTokens(userId, tenantId, tokens);

    logger.info('Google OAuth2 tokens obtained and saved', {
      component: 'google-auth-routes',
      action: 'callback',
      userId,
      tenantId,
      hasRefreshToken: !!tokens.refresh_token
    });

    res.json({
      success: true,
      message: 'Connessione a Google completata',
      data: {
        connected: true,
        scopes: tokens.scope ? tokens.scope.split(' ') : []
      }
    });
  } catch (error) {
    logger.error('OAuth callback failed', {
      component: 'google-auth-routes',
      action: 'callback',
      error: 'Operazione non riuscita',
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Errore nella connessione a Google',
    });
  }
});

/**
 * GET /api/v1/google/status
 * Get current Google connection status
 */
router.get('/status', authenticateToken, requirePermission('templates:read'), async (req, res) => {
  try {
    const { userId, tenantId } = getAuthUser(req);

    const status = await getConnectionStatus(userId, tenantId);

    logger.debug('Retrieved Google connection status', {
      component: 'google-auth-routes',
      action: 'getStatus',
      userId,
      tenantId,
      connected: status.connected
    });

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Failed to get connection status', {
      component: 'google-auth-routes',
      action: 'getStatus',
      error: 'Operazione non riuscita'
    });

    res.status(500).json({
      success: false,
      error: 'Errore nel recupero dello stato connessione',
    });
  }
});

/**
 * DELETE /api/v1/google/disconnect
 * Disconnect Google account and revoke tokens
 */
router.delete('/disconnect', authenticateToken, requirePermission('templates:manage'), async (req, res) => {
  try {
    const { userId, tenantId } = getAuthUser(req);

    await revokeTokens(userId, tenantId);

    logger.info('Google account disconnected', {
      component: 'google-auth-routes',
      action: 'disconnect',
      userId,
      tenantId
    });

    res.json({
      success: true,
      message: 'Account Google disconnesso',
      data: {
        connected: false
      }
    });
  } catch (error) {
    logger.error('Failed to disconnect Google account', {
      component: 'google-auth-routes',
      action: 'disconnect',
      error: 'Operazione non riuscita'
    });

    res.status(500).json({
      success: false,
      error: 'Errore nella disconnessione da Google',
    });
  }
});

/**
 * POST /api/v1/google/import-docs
 * Import Google Docs document and convert to template data
 */
router.post('/import-docs', authenticateToken, requirePermission('templates:create'), async (req, res) => {
  try {
    const { userId, tenantId } = getAuthUser(req);
    const { documentId, convertToHtml = true } = req.body;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: 'ID o URL del documento obbligatorio'
      });
    }

    logger.info('Starting Google Docs import', {
      component: 'google-auth-routes',
      action: 'importDocs',
      userId,
      tenantId,
      documentId,
      convertToHtml
    });

    const templateData = await importDocument(documentId, userId, tenantId, convertToHtml);

    logger.info('Google Docs imported successfully', {
      component: 'google-auth-routes',
      action: 'importDocs',
      userId,
      tenantId,
      title: templateData.name
    });

    res.json({
      success: true,
      message: 'Documento importato con successo',
      data: templateData
    });
  } catch (error) {
    logger.error('Failed to import Google Docs', {
      component: 'google-auth-routes',
      action: 'importDocs',
      error: 'Operazione non riuscita',
      stack: error.stack
    });

    // Check for specific errors
    if (error.message.includes('not connected')) {
      return res.status(401).json({
        success: false,
        error: 'Non connesso a Google',
        message: 'Collegare prima il proprio account Google',
        code: 'GOOGLE_NOT_CONNECTED'
      });
    }

    if (error.message.includes('Invalid Google Docs URL')) {
      return res.status(400).json({
        success: false,
        error: 'URL del documento non valido',
      });
    }

    if (error.code === 404 || error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Documento non trovato',
        message: 'Il documento Google Docs specificato non è stato trovato o non è accessibile'
      });
    }

    if (error.code === 403 || error.message.includes('permission')) {
      return res.status(403).json({
        success: false,
        error: 'Permesso negato',
        message: 'Non hai i permessi per accedere a questo documento'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Errore nell\'importazione del documento',
    });
  }
});

/**
 * POST /api/v1/google/import-slides
 * Import Google Slides presentation and convert to template data
 */
router.post('/import-slides', authenticateToken, requirePermission('templates:create'), async (req, res) => {
  try {
    const { userId, tenantId } = getAuthUser(req);
    const { presentationId, convertToHtml = true } = req.body;

    if (!presentationId) {
      return res.status(400).json({
        success: false,
        error: 'ID o URL della presentazione obbligatorio'
      });
    }

    logger.info('Starting Google Slides import', {
      component: 'google-auth-routes',
      action: 'importSlides',
      userId,
      tenantId,
      presentationId,
      convertToHtml
    });

    const templateData = await importPresentation(presentationId, userId, tenantId, convertToHtml);

    logger.info('Google Slides imported successfully', {
      component: 'google-auth-routes',
      action: 'importSlides',
      userId,
      tenantId,
      title: templateData.name
    });

    res.json({
      success: true,
      message: 'Presentazione importata con successo',
      data: templateData
    });
  } catch (error) {
    logger.error('Failed to import Google Slides', {
      component: 'google-auth-routes',
      action: 'importSlides',
      error: 'Operazione non riuscita',
      stack: error.stack
    });

    // Check for specific errors
    if (error.message.includes('not connected')) {
      return res.status(401).json({
        success: false,
        error: 'Non connesso a Google',
        message: 'Collegare prima il proprio account Google',
        code: 'GOOGLE_NOT_CONNECTED'
      });
    }

    if (error.message.includes('Invalid Google Slides URL')) {
      return res.status(400).json({
        success: false,
        error: 'URL della presentazione non valido',
      });
    }

    if (error.code === 404 || error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Presentazione non trovata',
        message: 'La presentazione Google Slides specificata non è stata trovata o non è accessibile'
      });
    }

    if (error.code === 403 || error.message.includes('permission')) {
      return res.status(403).json({
        success: false,
        error: 'Permesso negato',
        message: 'Non hai i permessi per accedere a questa presentazione'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Errore nell\'importazione della presentazione',
    });
  }
});

/**
 * POST /api/v1/google/generate
 * Generate document from template with placeholder replacement
 */
router.post('/generate', authenticateToken, requirePermission('templates:create'), async (req, res) => {
  try {
    const { userId, tenantId } = getAuthUser(req);
    const { templateId, type, data } = req.body;

    if (!templateId && !type) {
      return res.status(400).json({
        success: false,
        error: 'Specificare templateId o type'
      });
    }

    logger.info('Generating document from Google template', {
      component: 'google-auth-routes',
      action: 'generate',
      userId,
      tenantId,
      templateId,
      type
    });

    // Get template (by ID or default for type)
    let template;
    if (templateId) {
      template = await prisma.templateLink.findFirst({
        where: { id: templateId, tenantId, deletedAt: null }
      });
    } else {
      template = await prisma.templateLink.findFirst({
        where: { type, tenantId, isDefault: true, deletedAt: null }
      });
    }

    if (!template) {
      return res.status(404).json({
        success: false,
        error: templateId ? 'Template non trovato' : `Nessun template predefinito trovato per il tipo ${type}`
      });
    }

    // Check if template uses native Google format
    if (!template.googleDocsId && !template.googleSlidesId) {
      return res.status(400).json({
        success: false,
        error: 'Il template non è collegato a un documento Google'
      });
    }

    // Get valid access token
    const accessToken = await getValidAccessToken(userId, tenantId);

    // Use Google API to create a copy and replace placeholders
    const documentId = template.googleDocsId || template.googleSlidesId;
    const documentType = template.googleDocsId ? 'docs' : 'slides';

    // Generate document title
    const timestamp = Date.now();
    const documentTitle = `${template.name} - ${new Date().toLocaleDateString('it-IT')} - ${timestamp}`;

    logger.info('Generating document with Google API', {
      component: 'google-auth-routes',
      action: 'generate',
      userId,
      tenantId,
      documentId,
      documentType,
      documentTitle
    });

    // Generate the document
    const { pdfBuffer, documentId: copiedDocId } = await googleDocsService.generateDocumentFromTemplate(
      accessToken,
      documentId,
      documentType,
      data || {},
      documentTitle
    );

    // Save PDF to uploads directory
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'generated-docs');
    await fs.mkdir(uploadsDir, { recursive: true });

    const filename = `${template.type.toLowerCase()}_${timestamp}.pdf`;
    const filepath = path.join(uploadsDir, filename);

    await fs.writeFile(filepath, pdfBuffer);

    const fileUrl = `/uploads/generated-docs/${filename}`;

    // Optional: Clean up the copied document in Google Drive
    // Uncomment if you want to delete the intermediate copy
    // await googleDocsService.deleteFile(accessToken, copiedDocId);

    logger.info('Document generated and saved successfully', {
      component: 'google-auth-routes',
      action: 'generate',
      userId,
      tenantId,
      documentId: copiedDocId,
      documentType,
      fileUrl,
      fileSize: pdfBuffer.length
    });

    res.json({
      success: true,
      message: 'Documento generato con successo',
      fileUrl,
      fileName: filename,
      fileFormat: 'PDF',
      googleDocumentId: copiedDocId
    });
  } catch (error) {
    logger.error('Failed to generate document', {
      component: 'google-auth-routes',
      action: 'generate',
      error: 'Operazione non riuscita',
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Errore nella generazione del documento',
      code: 'GENERATE_FAILED',
      message: 'Operazione non riuscita'
    });
  }
});

export default router;
