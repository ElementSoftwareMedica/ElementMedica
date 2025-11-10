/**
 * Base Google Importer Service
 * Provides common functionality for Google Docs and Google Slides importers
 * Implements Strategy Pattern - base class with shared OAuth2, error handling, logging
 */

import { getOAuth2Client, getValidAccessToken } from './googleTokenService.js';
import logger from '../utils/logger.js';

export class BaseGoogleImporter {
  /**
   * @param {string} serviceType - Type of Google service ('docs' or 'slides')
   */
  constructor(serviceType) {
    this.serviceType = serviceType;
    this.componentName = `google${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)}Importer`;
  }

  /**
   * Get authenticated OAuth2 client
   * @param {string} accessToken - Valid Google access token
   * @returns {object} Authenticated OAuth2 client
   */
  getAuthenticatedClient(accessToken) {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });
    return oauth2Client;
  }

  /**
   * Execute function with standardized error handling and logging
   * @param {string} action - Action name for logging
   * @param {Function} fn - Async function to execute
   * @param {object} metadata - Additional metadata for logging
   * @returns {Promise<any>} Result of function execution
   */
  async executeWithErrorHandling(action, fn, metadata = {}) {
    try {
      const result = await fn();
      
      this.logSuccess(action, metadata);
      
      return result;
    } catch (error) {
      this.logError(action, error, metadata);
      throw error;
    }
  }

  /**
   * Log success message
   * @param {string} action - Action that succeeded
   * @param {object} details - Additional details for logging
   */
  logSuccess(action, details = {}) {
    logger.info(`${action} successful`, {
      component: this.componentName,
      action,
      ...details
    });
  }

  /**
   * Log error message
   * @param {string} action - Action that failed
   * @param {Error} error - Error object
   * @param {object} details - Additional details for logging
   */
  logError(action, error, details = {}) {
    logger.error(`Failed to ${action}`, {
      component: this.componentName,
      action,
      error: error.message,
      code: error.code,
      ...details
    });
  }

  /**
   * Extract markers from HTML content
   * Markers are in format {{marker.name}} or {{marker.subfield}}
   * SHARED by both Docs and Slides importers
   * @param {string} html - HTML content
   * @returns {array} Array of unique markers
   */
  extractMarkers(html) {
    try {
      const markerRegex = /\{\{([a-zA-Z0-9._-]+)\}\}/g;
      const markers = new Set();
      let match;

      while ((match = markerRegex.exec(html)) !== null) {
        markers.add(match[1]);
      }

      const markerArray = Array.from(markers).map(marker => {
        const parts = marker.split('.');
        return {
          key: marker,
          category: parts[0],
          field: parts.length > 1 ? parts.slice(1).join('.') : null,
          description: `Marker: ${marker}`
        };
      });

      this.logSuccess('extractMarkers', {
        count: markerArray.length,
        markers: markerArray.map(m => m.key)
      });

      return markerArray;
    } catch (error) {
      this.logError('extractMarkers', error);
      return [];
    }
  }

  /**
   * Extract resource ID from Google URL
   * Works for both Docs and Slides URLs
   * @param {string} urlOrId - Google URL or resource ID
   * @param {string} resourceType - 'document' or 'presentation'
   * @returns {string} Extracted resource ID
   * @throws {Error} If URL format is invalid
   */
  extractResourceId(urlOrId, resourceType) {
    // If already an ID, return as-is
    if (!urlOrId.includes('docs.google.com')) {
      return urlOrId;
    }

    // Extract ID from URL
    const regex = resourceType === 'document' 
      ? /\/document\/d\/([a-zA-Z0-9-_]+)/
      : /\/presentation\/d\/([a-zA-Z0-9-_]+)/;
    
    const match = urlOrId.match(regex);
    
    if (match) {
      return match[1];
    }
    
    throw new Error(`Invalid Google ${resourceType === 'document' ? 'Docs' : 'Slides'} URL`);
  }

  /**
   * Get valid access token for user and tenant
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<string>} Valid access token
   */
  async getAccessToken(userId, tenantId) {
    return await getValidAccessToken(userId, tenantId);
  }

  /**
   * Format HTML text with style
   * SHARED text formatting logic
   * @param {string} text - Text content
   * @param {object} style - Style object from Google API
   * @returns {string} HTML formatted text
   */
  formatTextWithStyle(text, style = {}) {
    // Escape HTML special characters
    text = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    // Apply text formatting
    if (style.bold) {
      text = `<strong>${text}</strong>`;
    }
    if (style.italic) {
      text = `<em>${text}</em>`;
    }
    if (style.underline) {
      text = `<u>${text}</u>`;
    }
    if (style.strikethrough) {
      text = `<s>${text}</s>`;
    }

    // Apply foreground color
    if (style.foregroundColor?.opaqueColor?.rgbColor) {
      const color = style.foregroundColor.opaqueColor.rgbColor;
      const r = Math.round((color.red || 0) * 255);
      const g = Math.round((color.green || 0) * 255);
      const b = Math.round((color.blue || 0) * 255);
      text = `<span style="color: rgb(${r}, ${g}, ${b})">${text}</span>`;
    }

    // Apply background color
    if (style.backgroundColor?.opaqueColor?.rgbColor) {
      const color = style.backgroundColor.opaqueColor.rgbColor;
      const r = Math.round((color.red || 0) * 255);
      const g = Math.round((color.green || 0) * 255);
      const b = Math.round((color.blue || 0) * 255);
      text = `<span style="background-color: rgb(${r}, ${g}, ${b})">${text}</span>`;
    }

    // Apply links
    if (style.link?.url) {
      text = `<a href="${style.link.url}" target="_blank">${text}</a>`;
    }

    return text;
  }

  // ==================== ABSTRACT METHODS ====================
  // These MUST be implemented by concrete strategy classes

  /**
   * Fetch resource from Google API
   * @abstract
   * @param {string} resourceId - Resource ID (document ID or presentation ID)
   * @param {string} accessToken - Valid access token
   * @returns {Promise<object>} Resource data from Google API
   */
  async fetch(resourceId, accessToken) {
    throw new Error('fetch() must be implemented by concrete strategy class');
  }

  /**
   * Convert Google resource to HTML
   * @abstract
   * @param {object} resource - Resource data from Google API
   * @returns {object} { content, header, footer, title }
   */
  convertToHTML(resource) {
    throw new Error('convertToHTML() must be implemented by concrete strategy class');
  }

  /**
   * Import resource and prepare template data
   * @abstract
   * @param {string} resourceId - Resource ID or URL
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @param {boolean} convertToHtml - Whether to convert to HTML or keep native format
   * @returns {Promise<object>} Template data
   */
  async import(resourceId, userId, tenantId, convertToHtml = true) {
    throw new Error('import() must be implemented by concrete strategy class');
  }
}

export default BaseGoogleImporter;
