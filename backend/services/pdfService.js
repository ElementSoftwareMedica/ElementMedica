/**
 * PDF Service - Generazione PDF da HTML tramite Puppeteer
 * 
 * Utilizza browser pool per ottimizzare performance
 * - Min 1 istanza browser (abbassato da 2 per ridurre consumo memoria idle)
 * - Max 3 istanze browser in produzione (default era 10 → OOM risk)
 * - Idle destroy dopo 2 minuti (da 5 → libera memoria prima)
 * 
 * GDPR Compliant:
 * - Nessun dato salvato in cache browser
 * - Session isolate per ogni generazione
 *
 * Memory tuning (env vars):
 *   PUPPETEER_MIN_BROWSERS=1   (produzione: 1, dev: 1)
 *   PUPPETEER_MAX_BROWSERS=3   (produzione: 3, dev: 2)
 *   PUPPETEER_ACQUIRE_TIMEOUT=15000
 */

import puppeteer from 'puppeteer';
import genericPool from 'generic-pool';
import { rm, readdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { logger } from '../utils/logger.js';

/**
 * Root cause of disk-filling bug:
 * /usr/bin/chromium-browser on Ubuntu is a SNAP package.
 * Snap has filesystem namespace isolation: /tmp inside the snap process
 * maps to /tmp/snap-private-tmp/snap.chromium/tmp/ on the host.
 *
 * When Puppeteer auto-creates a temp dir (puppeteer_dev_chrome_profile-*)
 * in host /tmp and passes it as --user-data-dir, Chrome (snap) writes to
 * /tmp/snap-private-tmp/snap.chromium/tmp/puppeteer_dev_chrome_profile-*.
 * browser.close() deletes the empty host-side dir but never touches the
 * snap-side copy. On crash/SIGKILL no cleanup happens at all.
 *
 * Fix: explicit userDataDir with a predictable name. On destroy(), we clean
 * both the host path AND the snap-private-tmp path.
 */
const SNAP_CHROMIUM_TMP = '/tmp/snap-private-tmp/snap.chromium/tmp';

/**
 * Remove leftover browser temp dirs from previous crashes (best-effort, at startup).
 * Targets both host /tmp and snap-private-tmp because we generate em-pdf-* names.
 */
async function cleanupOrphanedBrowserDirs() {
  const bases = [tmpdir(), SNAP_CHROMIUM_TMP];
  for (const base of bases) {
    try {
      const entries = await readdir(base);
      for (const entry of entries) {
        if (entry.startsWith('em-pdf-')) {
          try {
            await rm(join(base, entry), { recursive: true, force: true });
          } catch { /* ignore */ }
        }
      }
    } catch { /* dir doesn't exist — ok */ }
  }
}
// Fire-and-forget: clean orphaned dirs on module load (from previous crashes/SIGKILL)
cleanupOrphanedBrowserDirs().catch(() => { });

// Configurazione browser pool
// Produzione: impostare PUPPETEER_MIN_BROWSERS=1 PUPPETEER_MAX_BROWSERS=3 in env
const MIN_BROWSERS = parseInt(process.env.PUPPETEER_MIN_BROWSERS || '1');
const MAX_BROWSERS = parseInt(process.env.PUPPETEER_MAX_BROWSERS || '3');
const ACQUIRE_TIMEOUT = parseInt(process.env.PUPPETEER_ACQUIRE_TIMEOUT || '15000');

/**
 * Browser Pool Factory
 * Gestisce creazione/distruzione browser instances
 */
const browserPoolFactory = {
  create: async () => {
    try {
      logger.debug('Creating new browser instance', { service: 'pdfService' });

      // Generate a unique name for this browser's user-data dir.
      // We pass it explicitly so Puppeteer doesn't auto-create a puppeteer_dev_chrome_profile-*
      // in /tmp (which snap Chromium would "shadow" and never clean up properly).
      const dirSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const userDataDirName = `em-pdf-${dirSuffix}`;
      const userDataDir = join(tmpdir(), userDataDirName);

      const browser = await puppeteer.launch({
        headless: true, // Puppeteer v22+: true = new headless (was 'new', now deprecated)
        userDataDir,    // explicit dir → we control cleanup; no puppeteer_dev_chrome_profile-* created
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          // Use /tmp for shm to avoid /dev/shm exhaustion in containers
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--no-first-run',
          // --no-zygote reduces per-process overhead without --single-process instability
          '--no-zygote',
          // Memory/network optimizations for server-side PDF
          '--disable-background-networking',
          '--disable-extensions',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--metrics-recording-only',
          '--mute-audio',
          '--safebrowsing-disable-auto-update',
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser', // Fallback to system chromium
      });

      // Store dir name for cleanup (see destroy() below)
      browser._emPdfDirName = userDataDirName;

      logger.info('Browser instance created', {
        service: 'pdfService',
        pid: browser.process()?.pid,
        userDataDir,
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
    const dirName = browser._emPdfDirName;
    try {
      await browser.close();
      logger.debug('Browser instance destroyed', { service: 'pdfService' });
    } catch (error) {
      logger.error('Failed to destroy browser instance', {
        service: 'pdfService',
        error: error.message,
      });
    }
    // Clean up userDataDir from BOTH the host /tmp AND the snap-private-tmp path.
    // On non-snap systems one of these will fail silently (dir doesn't exist) — that's fine.
    if (dirName) {
      for (const base of [tmpdir(), SNAP_CHROMIUM_TMP]) {
        try {
          await rm(join(base, dirName), { recursive: true, force: true });
        } catch { /* ignore */ }
      }
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
  // Idle browsers destroyed after 2 minutes → frees ~200-400MB per instance
  idleTimeoutMillis: 120000,
  // Check for idle browsers every 30s (was 60s)
  evictionRunIntervalMillis: 30000,
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

    logger.debug('generatePDF called', {
      service: 'pdfService',
      htmlLength: html?.length,
      options: JSON.stringify(options)
    });

    try {
      // Acquire browser from pool
      browser = await browserPool.acquire();
      logger.debug('Browser acquired from pool', { service: 'pdfService' });

      // Create new page
      page = await browser.newPage();

      // Determine viewport based on orientation
      const isLandscape = options.landscape === true;
      const viewportWidth = isLandscape ? 1123 : 794;  // A4 at 96 DPI
      const viewportHeight = isLandscape ? 794 : 1123;

      // Set viewport matching A4 dimensions
      await page.setViewport({
        width: viewportWidth,
        height: viewportHeight,
        deviceScaleFactor: 2,
      });

      // Set HTML content
      // baseURL è necessario per risolvere URL relativi (es: /uploads/logos/xxx.png)
      // Nota: NON usare 'networkidle0' - attende che TUTTE le richieste di rete
      // si azzerino (Google Fonts, risorse esterne) causando timeout da 30s+.
      // Con 'load' il DOM è pronto e le immagini base64/locali sono caricate.
      await page.setContent(html, {
        waitUntil: ['domcontentloaded', 'load'],
        timeout: 45000,
        baseURL: process.env.APP_URL || `http://127.0.0.1:${process.env.API_PORT || 4001}`,
      });

      // Attendi caricamento immagini (importante per logo e altre immagini)
      await page.evaluate(() => {
        return Promise.all(
          Array.from(document.querySelectorAll('img'))
            .filter(img => !img.complete)
            .map(img => new Promise((resolve, reject) => {
              img.addEventListener('load', resolve);
              img.addEventListener('error', () => {
                logger.warn('Image failed to load in PDF generation', { src: img.src });
                resolve(); // Non fallire per immagini mancanti
              });
              // Timeout per singola immagine
              setTimeout(resolve, 5000);
            }))
        );
      });

      // Default PDF options - l'ordine è importante!
      // Prima applica i default, poi le options, ma alcuni valori critici vengono forzati dopo
      const pdfOptions = {
        format: options.format || 'A4',
        printBackground: true, // Sempre true per background colors
        margin: options.margin || {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
        ...options,
        // Forza preferCSSPageSize: false per rispettare i margini di Puppeteer
        // ma mantieni page-break CSS che funziona comunque
        preferCSSPageSize: false,
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
      // Cleanup con timeout guards per evitare hang su browser in stato errato
      if (page) {
        try {
          await Promise.race([
            page.close(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('page.close timeout')), 5000))
          ]);
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
          await Promise.race([
            browserPool.release(browser),
            new Promise((_, reject) => setTimeout(() => reject(new Error('browserPool.release timeout')), 5000))
          ]);
          logger.debug('Browser released to pool', { service: 'pdfService' });
        } catch (error) {
          logger.error('Failed to release browser', {
            service: 'pdfService',
            error: error.message,
          });
          // Force destroy se il release fallisce in modo permanente
          try { await browserPool.destroy(browser); } catch (_) { /* ignore */ }
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
        waitUntil: ['domcontentloaded', 'load'],
        timeout: 45000,
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
