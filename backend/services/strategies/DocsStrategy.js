/**
 * Google Docs Strategy
 * Implements Google Docs-specific import logic using Strategy Pattern
 */

import { google } from 'googleapis';
import { BaseGoogleImporter } from '../BaseGoogleImporter.js';

export class DocsStrategy extends BaseGoogleImporter {
  constructor() {
    super('docs');
  }

  /**
   * Fetch document from Google Docs API
   * @param {string} documentId - Google Docs document ID
   * @param {string} accessToken - Valid access token
   * @returns {Promise<object>} Document data
   */
  async fetch(documentId, accessToken) {
    return this.executeWithErrorHandling(
      'fetchDocument',
      async () => {
        const oauth2Client = this.getAuthenticatedClient(accessToken);
        const docs = google.docs({ version: 'v1', auth: oauth2Client });
        const response = await docs.documents.get({ documentId });
        return response.data;
      },
      {
        documentId,
        title: undefined // Will be set after response
      }
    );
  }

  /**
   * Format text run with Google Docs style
   * @param {object} textRun - Text run object from Google Docs
   * @returns {string} HTML formatted text
   */
  formatTextRun(textRun) {
    if (!textRun.content) return '';
    
    const style = textRun.style || {};
    return this.formatTextWithStyle(textRun.content, style);
  }

  /**
   * Convert paragraph to HTML
   * @param {object} paragraph - Paragraph object from Google Docs
   * @returns {string} HTML paragraph
   */
  convertParagraphToHTML(paragraph) {
    if (!paragraph.elements) return '';

    // Extract text content
    let content = '';
    for (const element of paragraph.elements) {
      if (element.textRun) {
        content += this.formatTextRun(element.textRun);
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
   * Convert list to HTML
   * @param {array} listItems - Array of list item paragraphs
   * @param {object} lists - Lists metadata from document
   * @returns {string} HTML list
   */
  convertListToHTML(listItems, lists) {
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
        .map(el => this.formatTextRun(el.textRun))
        .join('');
      html += `<li>${content}</li>`;
    }

    html += `</${tag}>`;
    return html;
  }

  /**
   * Convert table to HTML
   * @param {object} table - Table object from Google Docs
   * @returns {string} HTML table
   */
  convertTableToHTML(table) {
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
              .map(el => this.formatTextRun(el.textRun))
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
   * @returns {object} { content, header, footer, title }
   */
  convertToHTML(document) {
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
                htmlContent += this.convertListToHTML(listItems, lists);
              }
              // Start new list
              currentList = listId;
              listItems = [paragraph];
            }
          } else {
            // Finish any pending list
            if (currentList && listItems.length > 0) {
              htmlContent += this.convertListToHTML(listItems, lists);
              currentList = null;
              listItems = [];
            }

            // Convert regular paragraph
            htmlContent += this.convertParagraphToHTML(paragraph);
          }
        }

        // Handle tables
        if (element.table) {
          // Finish any pending list
          if (currentList && listItems.length > 0) {
            htmlContent += this.convertListToHTML(listItems, lists);
            currentList = null;
            listItems = [];
          }

          htmlContent += this.convertTableToHTML(element.table);
        }
      }

      // Finish any remaining list
      if (currentList && listItems.length > 0) {
        htmlContent += this.convertListToHTML(listItems, lists);
      }

      // Extract header: use first HEADING_1 or TITLE if present
      const firstHeading = content.find(el => {
        if (el.paragraph) {
          const style = el.paragraph.paragraphStyle?.namedStyleType;
          return style === 'HEADING_1' || style === 'TITLE';
        }
        return false;
      });

      if (firstHeading) {
        htmlHeader = this.convertParagraphToHTML(firstHeading.paragraph);
        // Remove from content (already included in header)
        htmlContent = htmlContent.replace(htmlHeader, '');
      }

      this.logSuccess('convertToHTML', {
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
      this.logError('convertToHTML', error);
      throw error;
    }
  }

  /**
   * Import Google Docs document and convert to template
   * @param {string} documentId - Google Docs document ID or URL
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @param {boolean} convertToHtml - Whether to convert to HTML (default: true)
   * @returns {Promise<object>} Template data
   */
  async import(documentId, userId, tenantId, convertToHtml = true) {
    try {
      // Extract document ID from URL if full URL provided
      documentId = this.extractResourceId(documentId, 'document');

      this.logSuccess('importDocument - START', {
        documentId,
        userId,
        tenantId,
        convertToHtml
      });

      // Get valid access token
      const accessToken = await this.getAccessToken(userId, tenantId);

      // Fetch document from Google Docs
      const document = await this.fetch(documentId, accessToken);

      let templateData;

      if (convertToHtml) {
        // Convert to HTML
        const html = this.convertToHTML(document);

        // Extract markers
        const markers = this.extractMarkers(
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
          content: null,
          header: null,
          footer: null,
          googleDocsId: documentId,
          googleDocsUrl: `https://docs.google.com/document/d/${documentId}`,
          markers: null,
          description: `Linked to Google Docs (native format): ${document.title}`,
          lastSyncedAt: new Date(),
          syncEnabled: true,
          autoSync: true,
          nativeFormat: true
        };
      }

      this.logSuccess('importDocument - COMPLETE', {
        documentId,
        title: document.title,
        markersCount: templateData.markers?.length || 0
      });

      return templateData;
    } catch (error) {
      this.logError('importDocument', error, {
        documentId,
        userId,
        tenantId
      });
      throw error;
    }
  }
}

export default DocsStrategy;
