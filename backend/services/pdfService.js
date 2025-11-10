/**
 * PDF Service - Generazione PDF da HTML tramite Puppeteer
 * 
 * Utilizza browser pool per ottimizzare performance
 * - Min 2 istanze browser
 * - Max 10 istanze browser
 * - Reuse browser instances per ridurre memory footprint
 * 
 * GDPR Compliant:
 * - Nessun dato salvato in cache browser
 * - Session isolate per ogni generazione
 */

import puppeteer from 'puppeteer';
import genericPool from 'generic-pool';
import { logger } from '../utils/logger.js';

// Configurazione browser pool
const MIN_BROWSERS = parseInt(process.env.PUPPETEER_MIN_BROWSERS || '2');
const MAX_BROWSERS = parseInt(process.env.PUPPETEER_MAX_BROWSERS || '10');
const ACQUIRE_TIMEOUT = parseInt(process.env.PUPPETEER_ACQUIRE_TIMEOUT || '10000');

/**
 * Browser Pool Factory
 * Gestisce creazione/distruzione browser instances
 */
const browserPoolFactory = {
  create: async () => {
    try {
      logger.debug('Creating new browser instance', { service: 'pdfService' });
      
      const browser = await puppeteer.launch({
        headless: 'new', // Use new headless mode
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process', // Reduce memory usage
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, // Optional: custom Chrome path
      });

      logger.info('Browser instance created', {
        service: 'pdfService',
        pid: browser.process()?.pid,
      });

      return browser;
    } catch (error) {
      logger.error('Failed to create browser instance', {
        service: 'pdfService',
        error: error.message,
      });
      throw error;
    }
  },

  destroy: async (browser) => {
    try {
      await browser.close();
      logger.debug('Browser instance destroyed', { service: 'pdfService' });
    } catch (error) {
      logger.error('Failed to destroy browser instance', {
        service: 'pdfService',
        error: error.message,
      });
    }
  },

  validate: async (browser) => {
    try {
      return browser.isConnected();
    } catch {
      return false;
    }
  },
};

/**
 * Create browser pool
 */
const browserPool = genericPool.createPool(browserPoolFactory, {
  min: MIN_BROWSERS,
  max: MAX_BROWSERS,
  acquireTimeoutMillis: ACQUIRE_TIMEOUT,
  idleTimeoutMillis: 300000, // 5 minutes idle before destroy
  evictionRunIntervalMillis: 60000, // Check every minute for idle browsers
  testOnBorrow: true,
});

logger.info('Browser pool initialized', {
  service: 'pdfService',
  minBrowsers: MIN_BROWSERS,
  maxBrowsers: MAX_BROWSERS,
});

/**
 * PDF Service Class
 */
class PDFService {
  /**
   * Generate PDF from HTML
   * 
   * @param {string} html - HTML content
   * @param {object} options - PDF generation options
   * @returns {Promise<Buffer>} - PDF buffer
   */
  async generatePDF(html, options = {}) {
    let browser = null;
    let page = null;

    try {
      // Acquire browser from pool
      browser = await browserPool.acquire();
      logger.debug('Browser acquired from pool', { service: 'pdfService' });

      // Create new page
      page = await browser.newPage();

      // Set viewport
      await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: 2,
      });

      // Set HTML content
      await page.setContent(html, {
        waitUntil: ['domcontentloaded', 'networkidle0'],
        timeout: 30000,
      });

      // Default PDF options
      const pdfOptions = {
        format: options.format || 'A4',
        printBackground: options.printBackground !== false,
        margin: options.margin || {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
        preferCSSPageSize: false,
        ...options,
      };

      // Generate PDF
      const startTime = Date.now();
      const pdfData = await page.pdf(pdfOptions);
      const duration = Date.now() - startTime;

      // Convert Uint8Array to Buffer
      const pdfBuffer = Buffer.from(pdfData);

      logger.info('PDF generated successfully', {
        service: 'pdfService',
        duration: `${duration}ms`,
        size: `${(pdfBuffer.length / 1024).toFixed(2)}KB`,
        format: pdfOptions.format,
      });

      return pdfBuffer;
    } catch (error) {
      logger.error('Failed to generate PDF', {
        service: 'pdfService',
        error: error.message,
        stack: error.stack,
      });
      throw error;
    } finally {
      // Cleanup
      if (page) {
        try {
          await page.close();
        } catch (error) {
          logger.warn('Failed to close page', {
            service: 'pdfService',
            error: error.message,
          });
        }
      }

      // Release browser back to pool
      if (browser) {
        try {
          await browserPool.release(browser);
          logger.debug('Browser released to pool', { service: 'pdfService' });
        } catch (error) {
          logger.error('Failed to release browser', {
            service: 'pdfService',
            error: error.message,
          });
        }
      }
    }
  }

  /**
   * Generate PDF from URL
   * 
   * @param {string} url - URL to generate PDF from
   * @param {object} options - PDF generation options
   * @returns {Promise<Buffer>} - PDF buffer
   */
  async generatePDFFromURL(url, options = {}) {
    let browser = null;
    let page = null;

    try {
      browser = await browserPool.acquire();
      page = await browser.newPage();

      await page.goto(url, {
        waitUntil: ['domcontentloaded', 'networkidle0'],
        timeout: 30000,
      });

      const pdfOptions = {
        format: options.format || 'A4',
        printBackground: options.printBackground !== false,
        margin: options.margin || {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
        ...options,
      };

      const pdfData = await page.pdf(pdfOptions);
      const pdfBuffer = Buffer.from(pdfData);

      logger.info('PDF generated from URL', {
        service: 'pdfService',
        url,
        size: `${(pdfBuffer.length / 1024).toFixed(2)}KB`,
      });

      return pdfBuffer;
    } catch (error) {
      logger.error('Failed to generate PDF from URL', {
        service: 'pdfService',
        url,
        error: error.message,
      });
      throw error;
    } finally {
      if (page) {
        await page.close();
      }
      if (browser) {
        await browserPool.release(browser);
      }
    }
  }

  /**
   * Generate landscape PDF
   * 
   * @param {string} html - HTML content
   * @param {object} options - PDF generation options
   * @returns {Promise<Buffer>} - PDF buffer
   */
  async generateLandscapePDF(html, options = {}) {
    return this.generatePDF(html, {
      ...options,
      landscape: true,
      format: options.format || 'A4',
    });
  }

  /**
   * Get pool statistics
   */
  getPoolStats() {
    return {
      size: browserPool.size,
      available: browserPool.available,
      pending: browserPool.pending,
      max: browserPool.max,
      min: browserPool.min,
    };
  }

  /**
   * Drain pool and close all browsers
   */
  async shutdown() {
    try {
      await browserPool.drain();
      await browserPool.clear();
      logger.info('Browser pool shutdown complete', { service: 'pdfService' });
    } catch (error) {
      logger.error('Error during browser pool shutdown', {
        service: 'pdfService',
        error: error.message,
      });
    }
  }
}

// Export singleton instance
export default new PDFService();
