/**
 * Google OAuth2 Routes
 * Handles authentication, authorization, and token management for Google Workspace integration
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import middleware from '../auth/middleware.js';
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
import googleDocsService from '../services/google-docs-service.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const prisma = new PrismaClient();

// Middleware destructuring
const { authenticate: authenticateToken, authorize: requirePermission } = middleware;

// Helper to get authenticated user info
const getAuthUser = (req) => ({
  userId: req.person.id,
  tenantId: req.person.tenantId
});

/**
 * GET /api/v1/google/auth/url
 * Generate Google OAuth2 authorization URL
 */
router.get('/auth/url', authenticateToken(), requirePermission('templates:manage'), async (req, res) => {
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
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to generate authorization URL',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/google/auth/callback
 * Handle OAuth2 callback and exchange code for tokens
 */
router.post('/auth/callback', authenticateToken(), requirePermission('templates:manage'), async (req, res) => {
  try {
    const { userId, tenantId } = getAuthUser(req);
    const { code, state } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required'
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
      message: 'Successfully connected to Google',
      data: {
        connected: true,
        scopes: tokens.scope ? tokens.scope.split(' ') : []
      }
    });
  } catch (error) {
    logger.error('OAuth callback failed', {
      component: 'google-auth-routes',
      action: 'callback',
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to connect to Google',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/google/status
 * Get current Google connection status
 */
router.get('/status', authenticateToken(), requirePermission('templates:read'), async (req, res) => {
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
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve connection status',
      message: error.message
    });
  }
});

/**
 * DELETE /api/v1/google/disconnect
 * Disconnect Google account and revoke tokens
 */
router.delete('/disconnect', authenticateToken(), requirePermission('templates:manage'), async (req, res) => {
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
      message: 'Successfully disconnected from Google',
      data: {
        connected: false
      }
    });
  } catch (error) {
    logger.error('Failed to disconnect Google account', {
      component: 'google-auth-routes',
      action: 'disconnect',
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to disconnect from Google',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/google/import-docs
 * Import Google Docs document and convert to template data
 */
router.post('/import-docs', authenticateToken(), requirePermission('templates:create'), async (req, res) => {
  try {
    const { userId, tenantId } = getAuthUser(req);
    const { documentId, convertToHtml = true } = req.body;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: 'Document ID or URL is required'
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
      message: 'Document imported successfully',
      data: templateData
    });
  } catch (error) {
    logger.error('Failed to import Google Docs', {
      component: 'google-auth-routes',
      action: 'importDocs',
      error: error.message,
      stack: error.stack
    });

    // Check for specific errors
    if (error.message.includes('not connected')) {
      return res.status(401).json({
        success: false,
        error: 'Not connected to Google',
        message: 'Please connect your Google account first',
        code: 'GOOGLE_NOT_CONNECTED'
      });
    }

    if (error.message.includes('Invalid Google Docs URL')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid document URL',
        message: error.message
      });
    }

    if (error.code === 404 || error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
        message: 'The specified Google Docs document was not found or is not accessible'
      });
    }

    if (error.code === 403 || error.message.includes('permission')) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied',
        message: 'You do not have permission to access this document'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to import document',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/google/import-slides
 * Import Google Slides presentation and convert to template data
 */
router.post('/import-slides', authenticateToken(), requirePermission('templates:create'), async (req, res) => {
  try {
    const { userId, tenantId } = getAuthUser(req);
    const { presentationId, convertToHtml = true } = req.body;

    if (!presentationId) {
      return res.status(400).json({
        success: false,
        error: 'Presentation ID or URL is required'
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
      message: 'Presentation imported successfully',
      data: templateData
    });
  } catch (error) {
    logger.error('Failed to import Google Slides', {
      component: 'google-auth-routes',
      action: 'importSlides',
      error: error.message,
      stack: error.stack
    });

    // Check for specific errors
    if (error.message.includes('not connected')) {
      return res.status(401).json({
        success: false,
        error: 'Not connected to Google',
        message: 'Please connect your Google account first',
        code: 'GOOGLE_NOT_CONNECTED'
      });
    }

    if (error.message.includes('Invalid Google Slides URL')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid presentation URL',
        message: error.message
      });
    }

    if (error.code === 404 || error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Presentation not found',
        message: 'The specified Google Slides presentation was not found or is not accessible'
      });
    }

    if (error.code === 403 || error.message.includes('permission')) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied',
        message: 'You do not have permission to access this presentation'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to import presentation',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/google/generate
 * Generate document from template with placeholder replacement
 */
router.post('/generate', authenticateToken(), requirePermission('templates:create'), async (req, res) => {
  try {
    const { userId, tenantId } = getAuthUser(req);
    const { templateId, type, data } = req.body;

    if (!templateId && !type) {
      return res.status(400).json({
        success: false,
        error: 'Either templateId or type is required'
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
        error: templateId ? 'Template not found' : `No default template found for type ${type}`
      });
    }

    // Check if template uses native Google format
    if (!template.googleDocsId && !template.googleSlidesId) {
      return res.status(400).json({
        success: false,
        error: 'Template is not linked to a Google document'
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
      message: 'Document generated successfully',
      fileUrl,
      fileName: filename,
      fileFormat: 'PDF',
      googleDocumentId: copiedDocId
    });
  } catch (error) {
    logger.error('Failed to generate document', {
      component: 'google-auth-routes',
      action: 'generate',
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to generate document',
      code: 'GENERATE_FAILED',
      message: error.message
    });
  }
});

export default router;
