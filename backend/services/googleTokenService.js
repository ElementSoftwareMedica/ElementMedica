/**
 * Google OAuth2 Token Service
 * Handles token storage, retrieval, refresh, and revocation
 */

import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

/**
 * Initialize OAuth2 client
 */
export function getOAuth2Client() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  
  return oauth2Client;
}

/**
 * Save or update Google OAuth2 tokens for a user
 * @param {string} userId - Person ID
 * @param {string} tenantId - Tenant ID
 * @param {object} tokens - OAuth2 tokens from Google
 * @returns {Promise<object>} Saved token record
 */
export async function saveTokens(userId, tenantId, tokens) {
  try {
    const expiryDate = tokens.expiry_date || Date.now() + 3600 * 1000; // Default 1 hour
    
    // Parse scope from tokens or use default
    const scope = tokens.scope 
      ? (typeof tokens.scope === 'string' ? tokens.scope.split(' ') : tokens.scope)
      : [
          'https://www.googleapis.com/auth/documents.readonly',
          'https://www.googleapis.com/auth/presentations.readonly',
          'https://www.googleapis.com/auth/drive.readonly'
        ];

    const tokenData = {
      userId,
      tenantId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: BigInt(expiryDate),
      scope,
      tokenType: tokens.token_type || 'Bearer',
      updatedAt: new Date()
    };

    // Upsert: update if exists, create if not
    const savedToken = await prisma.googleTokens.upsert({
      where: {
        userId_tenantId: {
          userId,
          tenantId
        }
      },
      update: tokenData,
      create: {
        ...tokenData,
        createdAt: new Date()
      }
    });

    logger.info('Google tokens saved successfully', {
      component: 'googleTokenService',
      action: 'saveTokens',
      userId,
      tenantId,
      hasRefreshToken: !!tokens.refresh_token
    });

    return savedToken;
  } catch (error) {
    logger.error('Failed to save Google tokens', {
      component: 'googleTokenService',
      action: 'saveTokens',
      userId,
      tenantId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get stored Google tokens for a user
 * @param {string} userId - Person ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<object|null>} Token record or null if not found
 */
export async function getTokens(userId, tenantId) {
  try {
    const tokens = await prisma.googleTokens.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId
        }
      }
    });

    if (!tokens) {
      logger.debug('No Google tokens found', {
        component: 'googleTokenService',
        action: 'getTokens',
        userId,
        tenantId
      });
      return null;
    }

    // Convert BigInt to Number for JavaScript compatibility
    return {
      ...tokens,
      expiryDate: Number(tokens.expiryDate)
    };
  } catch (error) {
    logger.error('Failed to retrieve Google tokens', {
      component: 'googleTokenService',
      action: 'getTokens',
      userId,
      tenantId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Check if access token is expired
 * @param {object} tokens - Token record
 * @returns {boolean} True if expired
 */
export function isTokenExpired(tokens) {
  if (!tokens || !tokens.expiryDate) return true;
  
  const now = Date.now();
  const expiry = Number(tokens.expiryDate);
  
  // Consider expired if less than 5 minutes remaining (buffer)
  return expiry - now < 5 * 60 * 1000;
}

/**
 * Refresh access token using refresh token
 * @param {string} userId - Person ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<object>} New token record
 */
export async function refreshAccessToken(userId, tenantId) {
  try {
    const tokens = await getTokens(userId, tenantId);
    
    if (!tokens) {
      throw new Error('No tokens found for user');
    }

    if (!tokens.refreshToken) {
      throw new Error('No refresh token available');
    }

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: tokens.refreshToken
    });

    // Request new access token
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    // Update stored tokens with new access token
    const updatedTokens = await saveTokens(userId, tenantId, {
      access_token: credentials.access_token,
      refresh_token: tokens.refreshToken, // Keep existing refresh token
      expiry_date: credentials.expiry_date,
      token_type: credentials.token_type,
      scope: tokens.scope
    });

    logger.info('Access token refreshed successfully', {
      component: 'googleTokenService',
      action: 'refreshAccessToken',
      userId,
      tenantId
    });

    return updatedTokens;
  } catch (error) {
    logger.error('Failed to refresh access token', {
      component: 'googleTokenService',
      action: 'refreshAccessToken',
      userId,
      tenantId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get valid access token, refreshing if necessary
 * @param {string} userId - Person ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<string>} Valid access token
 */
export async function getValidAccessToken(userId, tenantId) {
  try {
    let tokens = await getTokens(userId, tenantId);
    
    if (!tokens) {
      throw new Error('User not connected to Google');
    }

    // Refresh if expired
    if (isTokenExpired(tokens)) {
      logger.debug('Access token expired, refreshing...', {
        component: 'googleTokenService',
        action: 'getValidAccessToken',
        userId,
        tenantId
      });
      
      tokens = await refreshAccessToken(userId, tenantId);
    }

    return tokens.accessToken;
  } catch (error) {
    logger.error('Failed to get valid access token', {
      component: 'googleTokenService',
      action: 'getValidAccessToken',
      userId,
      tenantId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Revoke Google OAuth2 tokens and delete from database
 * @param {string} userId - Person ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<boolean>} True if revoked successfully
 */
export async function revokeTokens(userId, tenantId) {
  try {
    const tokens = await getTokens(userId, tenantId);
    
    if (!tokens) {
      logger.warn('No tokens to revoke', {
        component: 'googleTokenService',
        action: 'revokeTokens',
        userId,
        tenantId
      });
      return true; // Already disconnected
    }

    // Revoke tokens with Google
    if (tokens.accessToken) {
      const oauth2Client = getOAuth2Client();
      try {
        await oauth2Client.revokeToken(tokens.accessToken);
        logger.info('Google tokens revoked successfully', {
          component: 'googleTokenService',
          action: 'revokeTokens',
          userId,
          tenantId
        });
      } catch (revokeError) {
        // Log but don't fail - token may already be invalid
        logger.warn('Failed to revoke token with Google (may already be invalid)', {
          component: 'googleTokenService',
          action: 'revokeTokens',
          userId,
          tenantId,
          error: revokeError.message
        });
      }
    }

    // Delete from database
    await prisma.googleTokens.delete({
      where: {
        userId_tenantId: {
          userId,
          tenantId
        }
      }
    });

    logger.info('Google tokens deleted from database', {
      component: 'googleTokenService',
      action: 'revokeTokens',
      userId,
      tenantId
    });

    return true;
  } catch (error) {
    logger.error('Failed to revoke Google tokens', {
      component: 'googleTokenService',
      action: 'revokeTokens',
      userId,
      tenantId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Check if user has valid Google connection
 * @param {string} userId - Person ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<boolean>} True if connected with valid tokens
 */
export async function isConnected(userId, tenantId) {
  try {
    const tokens = await getTokens(userId, tenantId);
    return tokens !== null && tokens.accessToken !== null;
  } catch (error) {
    logger.error('Failed to check Google connection status', {
      component: 'googleTokenService',
      action: 'isConnected',
      userId,
      tenantId,
      error: error.message
    });
    return false;
  }
}

/**
 * Get connection status with details
 * @param {string} userId - Person ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<object>} Connection status object
 */
export async function getConnectionStatus(userId, tenantId) {
  try {
    const tokens = await getTokens(userId, tenantId);
    
    if (!tokens) {
      return {
        connected: false,
        expiresAt: null,
        scopes: []
      };
    }

    return {
      connected: true,
      expiresAt: new Date(tokens.expiryDate),
      scopes: tokens.scope || [],
      tokenType: tokens.tokenType
    };
  } catch (error) {
    logger.error('Failed to get connection status', {
      component: 'googleTokenService',
      action: 'getConnectionStatus',
      userId,
      tenantId,
      error: error.message
    });
    throw error;
  }
}

export default {
  getOAuth2Client,
  saveTokens,
  getTokens,
  isTokenExpired,
  refreshAccessToken,
  getValidAccessToken,
  revokeTokens,
  isConnected,
  getConnectionStatus
};
