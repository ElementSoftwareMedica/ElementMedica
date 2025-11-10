/**
 * Google Docs Importer Service
 * REFACTORED: Now uses Strategy Pattern with DocsStrategy
 * Maintains backward compatibility with existing API
 */

import { DocsStrategy } from './strategies/DocsStrategy.js';

// ==================== STRATEGY PATTERN IMPLEMENTATION ====================
// Singleton instance of DocsStrategy
const docsStrategy = new DocsStrategy();

/**
 * Fetch document from Google Docs API
 * BACKWARD COMPATIBLE: Delegates to DocsStrategy
 * @param {string} documentId - Google Docs document ID
 * @param {string} accessToken - Valid access token
 * @returns {Promise<object>} Document data from Google Docs API
 */
async function fetchDocument(documentId, accessToken) {
  return await docsStrategy.fetch(documentId, accessToken);
}

/**
 * Convert Google Docs text style to HTML tags
 * @param {object} textRun - Text run from Google Docs
 * @returns {string} HTML formatted text
 */
function formatTextRun(textRun) {
  if (!textRun.content) return '';

  let text = textRun.content;
  const style = textRun.textStyle || {};

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
  if (style.foregroundColor && style.foregroundColor.color) {
    const color = style.foregroundColor.color.rgbColor;
    if (color) {
      const r = Math.round((color.red || 0) * 255);
      const g = Math.round((color.green || 0) * 255);
      const b = Math.round((color.blue || 0) * 255);
      text = `<span style="color: rgb(${r}, ${g}, ${b})">${text}</span>`;
    }
  }

  // Apply background color
  if (style.backgroundColor && style.backgroundColor.color) {
    const color = style.backgroundColor.color.rgbColor;
    if (color) {
      const r = Math.round((color.red || 0) * 255);
      const g = Math.round((color.green || 0) * 255);
      const b = Math.round((color.blue || 0) * 255);
      text = `<span style="background-color: rgb(${r}, ${g}, ${b})">${text}</span>`;
    }
  }

  // Apply links
  if (style.link && style.link.url) {
    text = `<a href="${style.link.url}" target="_blank">${text}</a>`;
  }

  return text;
}

/**
 * Convert Google Docs paragraph to HTML
 * @param {object} paragraph - Paragraph object from Google Docs
 * @returns {string} HTML paragraph
 */
function convertParagraphToHTML(paragraph) {
  if (!paragraph.elements) return '';

  // Extract text content
  let content = '';
  for (const element of paragraph.elements) {
    if (element.textRun) {
      content += formatTextRun(element.textRun);
    }
  }

  // Skip empty paragraphs
  if (!content.trim()) return '<br>';

  // Determine paragraph style
  const style = paragraph.paragraphStyle || {};
  const namedStyle = style.namedStyleType || 'NORMAL_TEXT';

  // Convert to appropriate HTML tag
  switch (namedStyle) {
    case 'HEADING_1':
      return `<h1>${content}</h1>`;
    case 'HEADING_2':
      return `<h2>${content}</h2>`;
    case 'HEADING_3':
      return `<h3>${content}</h3>`;
    case 'HEADING_4':
      return `<h4>${content}</h4>`;
    case 'HEADING_5':
      return `<h5>${content}</h5>`;
    case 'HEADING_6':
      return `<h6>${content}</h6>`;
    case 'TITLE':
      return `<h1 class="title">${content}</h1>`;
    case 'SUBTITLE':
      return `<h2 class="subtitle">${content}</h2>`;
    default:
      // Handle alignment
      let paragraphTag = '<p';
      if (style.alignment && style.alignment !== 'START') {
        const alignmentMap = {
          'CENTER': 'center',
          'END': 'right',
          'JUSTIFIED': 'justify'
        };
        const align = alignmentMap[style.alignment] || 'left';
        paragraphTag += ` style="text-align: ${align}"`;
      }
      paragraphTag += `>${content}</p>`;
      return paragraphTag;
  }
}

/**
 * Convert Google Docs list to HTML
 * @param {array} listItems - Array of list item paragraphs
 * @param {object} lists - Lists metadata from document
 * @returns {string} HTML list
 */
function convertListToHTML(listItems, lists) {
  if (!listItems || listItems.length === 0) return '';

  const firstItem = listItems[0];
  const listId = firstItem.bullet.listId;
  const listProperties = lists[listId];

  // Determine if ordered or unordered
  const nestingLevel = firstItem.bullet.nestingLevel || 0;
  const listType = listProperties.listProperties.nestingLevels[nestingLevel];
  const isOrdered = listType.glyphType && listType.glyphType !== 'GLYPH_TYPE_UNSPECIFIED';

  const tag = isOrdered ? 'ol' : 'ul';
  let html = `<${tag}>`;

  for (const item of listItems) {
    const content = item.elements
      .filter(el => el.textRun)
      .map(el => formatTextRun(el.textRun))
      .join('');
    html += `<li>${content}</li>`;
  }

  html += `</${tag}>`;
  return html;
}

/**
 * Convert Google Docs table to HTML
 * @param {object} table - Table object from Google Docs
 * @returns {string} HTML table
 */
function convertTableToHTML(table) {
  if (!table.tableRows) return '';

  let html = '<table border="1" style="border-collapse: collapse; width: 100%;">';

  for (const row of table.tableRows) {
    html += '<tr>';
    for (const cell of row.tableCells) {
      html += '<td style="padding: 8px; border: 1px solid #ddd;">';
      
      // Process cell content
      for (const contentElement of cell.content) {
        if (contentElement.paragraph) {
          const cellContent = contentElement.paragraph.elements
            .filter(el => el.textRun)
            .map(el => formatTextRun(el.textRun))
            .join('');
          html += cellContent;
        }
      }
      
      html += '</td>';
    }
    html += '</tr>';
  }

  html += '</table>';
  return html;
}

/**
 * Convert Google Docs document to HTML
 * @param {object} document - Google Docs document data
 * @returns {object} Converted HTML with sections
 */
export function convertToHTML(document) {
  try {
    const body = document.body;
    const content = body.content;
    const lists = document.lists || {};

    let htmlContent = '';
    let htmlHeader = '';
    let htmlFooter = '';

    // Track lists to group consecutive list items
    let currentList = null;
    let listItems = [];

    for (const element of content) {
      // Handle paragraphs
      if (element.paragraph) {
        const paragraph = element.paragraph;

        // Check if it's a list item
        if (paragraph.bullet) {
          const listId = paragraph.bullet.listId;

          // Start new list or continue current
          if (currentList === listId) {
            listItems.push(paragraph);
          } else {
            // Finish previous list
            if (currentList && listItems.length > 0) {
              htmlContent += convertListToHTML(listItems, lists);
            }
            // Start new list
            currentList = listId;
            listItems = [paragraph];
          }
        } else {
          // Finish any pending list
          if (currentList && listItems.length > 0) {
            htmlContent += convertListToHTML(listItems, lists);
            currentList = null;
            listItems = [];
          }

          // Convert regular paragraph
          htmlContent += convertParagraphToHTML(paragraph);
        }
      }

      // Handle tables
      if (element.table) {
        // Finish any pending list
        if (currentList && listItems.length > 0) {
          htmlContent += convertListToHTML(listItems, lists);
          currentList = null;
          listItems = [];
        }

        htmlContent += convertTableToHTML(element.table);
      }
    }

    // Finish any remaining list
    if (currentList && listItems.length > 0) {
      htmlContent += convertListToHTML(listItems, lists);
    }

    // Extract header and footer if present
    // (Google Docs API doesn't provide headers/footers in basic document.get)
    // For now, use first heading as header if present
    const firstHeading = content.find(el => {
      if (el.paragraph) {
        const style = el.paragraph.paragraphStyle?.namedStyleType;
        return style === 'HEADING_1' || style === 'TITLE';
      }
      return false;
    });

    if (firstHeading) {
      htmlHeader = convertParagraphToHTML(firstHeading.paragraph);
      // Remove from content (already included in header)
      htmlContent = htmlContent.replace(htmlHeader, '');
    }

    logger.info('Document converted to HTML successfully', {
      component: 'googleDocsImporter',
      action: 'convertToHTML',
      title: document.title,
      contentLength: htmlContent.length
    });

    return {
      content: htmlContent.trim(),
      header: htmlHeader.trim(),
      footer: htmlFooter.trim(),
      title: document.title
    };
  } catch (error) {
    logger.error('Failed to convert document to HTML', {
      component: 'googleDocsImporter',
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

    logger.info('Markers extracted from content', {
      component: 'googleDocsImporter',
      action: 'extractMarkers',
      count: markerArray.length,
      markers: markerArray.map(m => m.key)
    });

    return markerArray;
  } catch (error) {
    logger.error('Failed to extract markers', {
      component: 'googleDocsImporter',
      action: 'extractMarkers',
      error: error.message
    });
    return [];
  }
}

/**
 * Import Google Docs document and convert to template
 * @param {string} documentId - Google Docs document ID or URL
 * @param {string} userId - User ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<object>} Imported template data
 */
export async function importDocument(documentId, userId, tenantId, convertToHtml = true) {
  try {
    // Extract document ID from URL if full URL provided
    if (documentId.includes('docs.google.com')) {
      const urlMatch = documentId.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
      if (urlMatch) {
        documentId = urlMatch[1];
      } else {
        throw new Error('Invalid Google Docs URL');
      }
    }

    logger.info('Starting document import', {
      component: 'googleDocsImporter',
      action: 'importDocument',
      documentId,
      userId,
      tenantId,
      convertToHtml
    });

    // Get valid access token
    const accessToken = await getValidAccessToken(userId, tenantId);

    // Fetch document from Google Docs
    const document = await fetchDocument(documentId, accessToken);

    let templateData;

    if (convertToHtml) {
      // Convert to HTML
      const html = convertToHTML(document);

      // Extract markers
      const markers = extractMarkers(
        html.content + html.header + html.footer
      );

      // Prepare template data with HTML content
      templateData = {
        name: document.title,
        content: html.content,
        header: html.header,
        footer: html.footer,
        googleDocsId: documentId,
        googleDocsUrl: `https://docs.google.com/document/d/${documentId}`,
        markers: markers.length > 0 ? markers : null,
        description: `Imported from Google Docs: ${document.title}`,
        lastSyncedAt: new Date(),
        syncEnabled: false,
        autoSync: false
      };
    } else {
      // Keep native Google format - store only reference
      templateData = {
        name: document.title,
        content: null, // No HTML conversion
        header: null,
        footer: null,
        googleDocsId: documentId,
        googleDocsUrl: `https://docs.google.com/document/d/${documentId}`,
        markers: null, // Markers will be replaced via Google API
        description: `Linked to Google Docs (native format): ${document.title}`,
        lastSyncedAt: new Date(),
        syncEnabled: true, // Enable sync for native format
        autoSync: true, // Auto-sync changes
        nativeFormat: true // Flag to indicate native format
      };
    }

    logger.info('Document imported successfully', {
      component: 'googleDocsImporter',
      action: 'importDocument',
      documentId,
      title: document.title,
      markersCount: markers.length
    });

    return templateData;
  } catch (error) {
    logger.error('Failed to import document', {
      component: 'googleDocsImporter',
      action: 'importDocument',
      documentId,
      userId,
      tenantId,
      error: error.message
    });
    throw error;
  }
}

export default {
  fetchDocument,
  convertToHTML,
  extractMarkers,
  importDocument
};
