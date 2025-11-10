/**
 * Google Slides Strategy
 * Implements Google Slides-specific import logic using Strategy Pattern
 */

import { google } from 'googleapis';
import { BaseGoogleImporter } from '../BaseGoogleImporter.js';

export class SlidesStrategy extends BaseGoogleImporter {
  constructor() {
    super('slides');
  }

  /**
   * Fetch presentation from Google Slides API
   * @param {string} presentationId - Google Slides presentation ID
   * @param {string} accessToken - Valid access token
   * @returns {Promise<object>} Presentation data
   */
  async fetch(presentationId, accessToken) {
    return this.executeWithErrorHandling(
      'fetchPresentation',
      async () => {
        const oauth2Client = this.getAuthenticatedClient(accessToken);
        const slides = google.slides({ version: 'v1', auth: oauth2Client });
        const response = await slides.presentations.get({ presentationId });
        return response.data;
      },
      {
        presentationId,
        title: undefined // Will be set after response
      }
    );
  }

  /**
   * Extract text from text element with formatting
   * @param {object} textElement - Text element from slide
   * @returns {string} HTML formatted text
   */
  extractText(textElement) {
    if (!textElement.textRun || !textElement.textRun.content) {
      return '';
    }

    const style = textElement.textRun.style || {};
    return this.formatTextWithStyle(textElement.textRun.content, style);
  }

  /**
   * Convert shape to HTML
   * @param {object} shape - Shape element from slide
   * @returns {string} HTML content
   */
  convertShapeToHTML(shape) {
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
      content += this.extractText(element);
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
   * Convert table to HTML
   * @param {object} table - Table element from slide
   * @returns {string} HTML table
   */
  convertTableToHTML(table) {
    if (!table.tableRows) return '';

    let html = '<table border="1" style="border-collapse: collapse; width: 100%; margin: 10px 0;">';

    for (const row of table.tableRows) {
      html += '<tr>';
      for (const cell of row.tableCells) {
        html += '<td style="padding: 8px; border: 1px solid #ddd;">';
        
        if (cell.text && cell.text.textElements) {
          let cellContent = '';
          for (const element of cell.text.textElements) {
            cellContent += this.extractText(element);
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
   * Convert image to HTML placeholder
   * @param {object} image - Image element from slide
   * @returns {string} HTML image placeholder
   */
  convertImageToHTML(image) {
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
  convertSlideToHTML(slide, slideNumber) {
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
        html += this.convertShapeToHTML(element.shape);
      } else if (element.table) {
        html += this.convertTableToHTML(element.table);
      } else if (element.image) {
        html += this.convertImageToHTML(element.image);
      }
    }

    html += '</div>';
    html += '<hr style="margin: 20px 0; border: 1px dashed #ccc;">';

    return html;
  }

  /**
   * Convert Google Slides presentation to HTML
   * @param {object} presentation - Google Slides presentation data
   * @returns {object} { content, header, footer, title }
   */
  convertToHTML(presentation) {
    try {
      const slides = presentation.slides || [];
      let htmlContent = '';

      // Add presentation title as header
      const htmlHeader = `<h1>${presentation.title}</h1>`;

      // Convert each slide
      slides.forEach((slide, index) => {
        htmlContent += this.convertSlideToHTML(slide, index + 1);
      });

      // Add footer with slide count
      const htmlFooter = `<p class="slide-count">Totale slide: ${slides.length}</p>`;

      this.logSuccess('convertToHTML', {
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
      this.logError('convertToHTML', error);
      throw error;
    }
  }

  /**
   * Import Google Slides presentation and convert to template
   * @param {string} presentationId - Google Slides presentation ID or URL
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @param {boolean} convertToHtml - Whether to convert to HTML (default: true)
   * @returns {Promise<object>} Template data
   */
  async import(presentationId, userId, tenantId, convertToHtml = true) {
    try {
      // Extract presentation ID from URL if full URL provided
      presentationId = this.extractResourceId(presentationId, 'presentation');

      this.logSuccess('importPresentation - START', {
        presentationId,
        userId,
        tenantId,
        convertToHtml
      });

      // Get valid access token
      const accessToken = await this.getAccessToken(userId, tenantId);

      // Fetch presentation from Google Slides
      const presentation = await this.fetch(presentationId, accessToken);

      let templateData;

      if (convertToHtml) {
        // Convert to HTML
        const html = this.convertToHTML(presentation);

        // Extract markers
        const markers = this.extractMarkers(
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
          content: null,
          header: null,
          footer: null,
          googleSlidesId: presentationId,
          googleDocsUrl: `https://docs.google.com/presentation/d/${presentationId}`,
          markers: null,
          description: `Linked to Google Slides (native format): ${presentation.title}`,
          lastSyncedAt: new Date(),
          syncEnabled: true,
          autoSync: true,
          nativeFormat: true
        };
      }

      this.logSuccess('importPresentation - COMPLETE', {
        presentationId,
        title: presentation.title,
        slidesCount: presentation.slides?.length || 0,
        markersCount: templateData.markers?.length || 0
      });

      return templateData;
    } catch (error) {
      this.logError('importPresentation', error, {
        presentationId,
        userId,
        tenantId
      });
      throw error;
    }
  }
}

export default SlidesStrategy;
