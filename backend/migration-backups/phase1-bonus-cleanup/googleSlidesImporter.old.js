/**
 * Google Slides Importer Service
 * Fetches Google Slides presentations and converts them to HTML for template editor
 */

import { google } from 'googleapis';
import { getOAuth2Client, getValidAccessToken } from './googleTokenService.js';
import logger from '../utils/logger.js';

/**
 * Fetch Google Slides presentation content
 * @param {string} presentationId - Google Slides presentation ID
 * @param {string} accessToken - Valid OAuth2 access token
 * @returns {Promise<object>} Presentation data from Google Slides API
 */
async function fetchPresentation(presentationId, accessToken) {
  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const slides = google.slides({ version: 'v1', auth: oauth2Client });

    const response = await slides.presentations.get({
      presentationId: presentationId
    });

    logger.info('Google Slides presentation fetched successfully', {
      component: 'googleSlidesImporter',
      action: 'fetchPresentation',
      presentationId,
      title: response.data.title,
      slidesCount: response.data.slides?.length || 0
    });

    return response.data;
  } catch (error) {
    logger.error('Failed to fetch Google Slides presentation', {
      component: 'googleSlidesImporter',
      action: 'fetchPresentation',
      presentationId,
      error: error.message,
      code: error.code
    });
    throw new Error(`Failed to fetch presentation: ${error.message}`);
  }
}

/**
 * Extract text from text element
 * @param {object} textElement - Text element from slide
 * @returns {string} Formatted text
 */
function extractText(textElement) {
  if (!textElement.textRun || !textElement.textRun.content) {
    return '';
  }

  let text = textElement.textRun.content;
  const style = textElement.textRun.style || {};

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

  // Apply text color
  if (style.foregroundColor && style.foregroundColor.opaqueColor) {
    const color = style.foregroundColor.opaqueColor.rgbColor;
    if (color) {
      const r = Math.round((color.red || 0) * 255);
      const g = Math.round((color.green || 0) * 255);
      const b = Math.round((color.blue || 0) * 255);
      text = `<span style="color: rgb(${r}, ${g}, ${b})">${text}</span>`;
    }
  }

  // Apply links
  if (style.link && style.link.url) {
    text = `<a href="${style.link.url}" target="_blank">${text}</a>`;
  }

  return text;
}

/**
 * Convert slide shape to HTML
 * @param {object} shape - Shape element from slide
 * @returns {string} HTML content
 */
function convertShapeToHTML(shape) {
  if (!shape.text || !shape.text.textElements) {
    return '';
  }

  let html = '';
  const textElements = shape.text.textElements;

  // Check if it's a title or body text
  const shapeType = shape.shapeType;
  const isTitle = shapeType === 'TEXT_BOX' && shape.placeholder?.type === 'TITLE';
  const isSubtitle = shapeType === 'TEXT_BOX' && shape.placeholder?.type === 'SUBTITLE';

  let content = '';
  for (const element of textElements) {
    content += extractText(element);
  }

  // Remove newlines and trim
  content = content.replace(/\n/g, '').trim();

  if (!content) return '';

  // Wrap in appropriate tag
  if (isTitle) {
    html = `<h2>${content}</h2>`;
  } else if (isSubtitle) {
    html = `<h3>${content}</h3>`;
  } else {
    html = `<p>${content}</p>`;
  }

  return html;
}

/**
 * Convert slide table to HTML
 * @param {object} table - Table element from slide
 * @returns {string} HTML table
 */
function convertTableToHTML(table) {
  if (!table.tableRows) return '';

  let html = '<table border="1" style="border-collapse: collapse; width: 100%; margin: 10px 0;">';

  for (const row of table.tableRows) {
    html += '<tr>';
    for (const cell of row.tableCells) {
      html += '<td style="padding: 8px; border: 1px solid #ddd;">';
      
      if (cell.text && cell.text.textElements) {
        let cellContent = '';
        for (const element of cell.text.textElements) {
          cellContent += extractText(element);
        }
        html += cellContent.replace(/\n/g, '<br>');
      }
      
      html += '</td>';
    }
    html += '</tr>';
  }

  html += '</table>';
  return html;
}

/**
 * Convert slide image to HTML
 * @param {object} image - Image element from slide
 * @returns {string} HTML image tag with placeholder
 */
function convertImageToHTML(image) {
  // Note: Google Slides API doesn't provide direct image URLs
  // Images need to be downloaded separately via contentUrl with authentication
  
  const contentUrl = image.contentUrl;
  const title = image.title || 'Slide Image';
  
  if (contentUrl) {
    return `<div class="slide-image" data-content-url="${contentUrl}">
      <p><em>[Immagine: ${title}]</em></p>
      <p class="note">Nota: Le immagini da Google Slides richiedono download separato con autenticazione.</p>
    </div>`;
  }
  
  return `<p><em>[Immagine: ${title}]</em></p>`;
}

/**
 * Convert single slide to HTML
 * @param {object} slide - Slide object from presentation
 * @param {number} slideNumber - Slide number (1-based)
 * @returns {string} HTML for slide
 */
function convertSlideToHTML(slide, slideNumber) {
  let html = `<div class="slide" data-slide-number="${slideNumber}">`;
  html += `<h2 class="slide-title">Slide ${slideNumber}</h2>`;

  if (!slide.pageElements) {
    html += '<p><em>Slide vuota</em></p>';
    html += '</div>';
    return html;
  }

  // Process each element on the slide
  for (const element of slide.pageElements) {
    if (element.shape) {
      html += convertShapeToHTML(element.shape);
    } else if (element.table) {
      html += convertTableToHTML(element.table);
    } else if (element.image) {
      html += convertImageToHTML(element.image);
    }
  }

  html += '</div>';
  html += '<hr style="margin: 20px 0; border: 1px dashed #ccc;">';

  return html;
}

/**
 * Convert Google Slides presentation to HTML
 * @param {object} presentation - Google Slides presentation data
 * @returns {object} Converted HTML with sections
 */
export function convertToHTML(presentation) {
  try {
    const slides = presentation.slides || [];
    let htmlContent = '';

    // Add presentation title as header
    const htmlHeader = `<h1>${presentation.title}</h1>`;

    // Convert each slide
    slides.forEach((slide, index) => {
      htmlContent += convertSlideToHTML(slide, index + 1);
    });

    // Add footer with slide count
    const htmlFooter = `<p class="slide-count">Totale slide: ${slides.length}</p>`;

    logger.info('Presentation converted to HTML successfully', {
      component: 'googleSlidesImporter',
      action: 'convertToHTML',
      title: presentation.title,
      slidesCount: slides.length,
      contentLength: htmlContent.length
    });

    return {
      content: htmlContent.trim(),
      header: htmlHeader.trim(),
      footer: htmlFooter.trim(),
      title: presentation.title
    };
  } catch (error) {
    logger.error('Failed to convert presentation to HTML', {
      component: 'googleSlidesImporter',
      action: 'convertToHTML',
      error: error.message
    });
    throw error;
  }
}

/**
 * Extract markers from HTML content
 * Markers are in format {{marker.name}} or {{marker.subfield}}
 * @param {string} html - HTML content
 * @returns {array} Array of unique markers
 */
export function extractMarkers(html) {
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

    logger.info('Markers extracted from presentation', {
      component: 'googleSlidesImporter',
      action: 'extractMarkers',
      count: markerArray.length,
      markers: markerArray.map(m => m.key)
    });

    return markerArray;
  } catch (error) {
    logger.error('Failed to extract markers', {
      component: 'googleSlidesImporter',
      action: 'extractMarkers',
      error: error.message
    });
    return [];
  }
}

/**
 * Import Google Slides presentation and convert to template
 * @param {string} presentationId - Google Slides presentation ID or URL
 * @param {string} userId - User ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<object>} Imported template data
 */
export async function importPresentation(presentationId, userId, tenantId, convertToHtml = true) {
  try {
    // Extract presentation ID from URL if full URL provided
    if (presentationId.includes('docs.google.com/presentation')) {
      const urlMatch = presentationId.match(/\/presentation\/d\/([a-zA-Z0-9-_]+)/);
      if (urlMatch) {
        presentationId = urlMatch[1];
      } else {
        throw new Error('Invalid Google Slides URL');
      }
    }

    logger.info('Starting presentation import', {
      component: 'googleSlidesImporter',
      action: 'importPresentation',
      presentationId,
      userId,
      tenantId,
      convertToHtml
    });

    // Get valid access token
    const accessToken = await getValidAccessToken(userId, tenantId);

    // Fetch presentation from Google Slides
    const presentation = await fetchPresentation(presentationId, accessToken);

    let templateData;

    if (convertToHtml) {
      // Convert to HTML
      const html = convertToHTML(presentation);

      // Extract markers
      const markers = extractMarkers(
        html.content + html.header + html.footer
      );

      // Prepare template data with HTML content
      templateData = {
        name: presentation.title,
        content: html.content,
        header: html.header,
        footer: html.footer,
        googleSlidesId: presentationId,
        googleDocsUrl: `https://docs.google.com/presentation/d/${presentationId}`,
        markers: markers.length > 0 ? markers : null,
        description: `Imported from Google Slides: ${presentation.title}`,
        lastSyncedAt: new Date(),
        syncEnabled: false,
        autoSync: false
      };
    } else {
      // Keep native Google format - store only reference
      templateData = {
        name: presentation.title,
        content: null, // No HTML conversion
        header: null,
        footer: null,
        googleSlidesId: presentationId,
        googleDocsUrl: `https://docs.google.com/presentation/d/${presentationId}`,
        markers: null, // Markers will be replaced via Google API
        description: `Linked to Google Slides (native format): ${presentation.title}`,
        lastSyncedAt: new Date(),
        syncEnabled: true, // Enable sync for native format
        autoSync: true, // Auto-sync changes
        nativeFormat: true // Flag to indicate native format
      };
    }

    logger.info('Presentation imported successfully', {
      component: 'googleSlidesImporter',
      action: 'importPresentation',
      presentationId,
      title: presentation.title,
      slidesCount: presentation.slides?.length || 0,
      markersCount: markers.length
    });

    return templateData;
  } catch (error) {
    logger.error('Failed to import presentation', {
      component: 'googleSlidesImporter',
      action: 'importPresentation',
      presentationId,
      userId,
      tenantId,
      error: error.message
    });
    throw error;
  }
}

export default {
  fetchPresentation,
  convertToHTML,
  extractMarkers,
  importPresentation
};
