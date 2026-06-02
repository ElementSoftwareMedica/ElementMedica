/**
 * Pre-Render Service
 * 
 * Puppeteer-based SSG engine that pre-renders CMS pages to static HTML.
 * Used for:
 * 1. Build-time full site rendering
 * 2. On-demand rendering triggered by CMS webhooks
 * 3. Incremental regeneration of single pages
 * 
 * The pre-rendered HTML includes all meta tags, JSON-LD, and visible content
 * for maximum SEO effectiveness. React will "hydrate" the HTML on the client.
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

// Snap Chromium namespace isolation workaround (same pattern as pdfService).
// See pdfService.js for detailed explanation.
const SNAP_CHROMIUM_TMP = '/tmp/snap-private-tmp/snap.chromium/tmp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PRERENDERED_DIR = path.resolve(__dirname, '../../prerendered');

// Brand → port mapping for development
const BRAND_PORTS = {
  'element-sicurezza': 5173,
  'element-medica': 5174,
};

// Default slugs per brand
const BRAND_SLUGS = {
  'element-sicurezza': [
    'homepage',
    'medicina-del-lavoro',
    'corsi',
    'rspp',
    'chi-siamo',
    'contatti',
    'lavora-con-noi',
    'servizi',
    'privacy-policy',
    'cookie-policy',
    'termini',
  ],
  'element-medica': [
    'medica-homepage',
    'medica-medicina-del-lavoro',
    'medica-diagnostica',
    'medica-visite-specialistiche',
    'medica-prenota',
    'medica-chi-siamo',
    'medica-contatti',
    'medica-medici',
    'privacy-policy',
    'cookie-policy',
    'termini',
  ],
};

// Map CMS slug → public URL path
const SLUG_TO_PATH = {
  'homepage': '/',
  'medica-homepage': '/',
  'medicina-del-lavoro': '/medicina-del-lavoro',
  'medica-medicina-del-lavoro': '/medicina-del-lavoro',
  'corsi': '/corsi',
  'rspp': '/rspp',
  'chi-siamo': '/chi-siamo',
  'medica-chi-siamo': '/chi-siamo',
  'contatti': '/contatti',
  'medica-contatti': '/contatti',
  'lavora-con-noi': '/lavora-con-noi',
  'servizi': '/servizi',
  'medica-diagnostica': '/diagnostica',
  'medica-visite-specialistiche': '/visite-specialistiche',
  'medica-prenota': '/prenota',
  'medica-medici': '/medici',
  'privacy-policy': '/privacy-policy',
  'cookie-policy': '/cookie-policy',
  'termini': '/termini',
};

/**
 * @typedef {Object} PrerenderResult
 * @property {string} slug - The CMS slug that was rendered
 * @property {string} path - URL path on the public site
 * @property {string} outputFile - Path to saved HTML file
 * @property {number} renderTimeMs - Time taken to render
 * @property {number} htmlSize - HTML file size in bytes
 * @property {string} title - Extracted <title> from the rendered page
 * @property {string} status - 'success' | 'error'
 * @property {string} [error] - Error message if status is 'error'
 */

class PrerenderService {
  constructor() {
    this.browser = null;
    this._browserDirName = null; // track userDataDir for cleanup
    this.isRendering = false;
    this.renderQueue = [];
  }

  /**
   * Launch or reuse Puppeteer browser instance
   */
  async getBrowser() {
    if (!this.browser || !this.browser.isConnected()) {
      // Clean up the previous browser's userDataDir (if browser disconnected/crashed)
      if (this._browserDirName) {
        for (const base of [tmpdir(), SNAP_CHROMIUM_TMP]) {
          try { await fs.rm(path.join(base, this._browserDirName), { recursive: true, force: true }); } catch { /* ignore */ }
        }
        this._browserDirName = null;
      }
      const dirSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const userDataDirName = `em-pdf-prerender-${dirSuffix}`;
      this.browser = await puppeteer.launch({
        headless: 'new',
        userDataDir: path.join(tmpdir(), userDataDirName),
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--no-zygote',
          '--disable-background-networking',
          '--disable-extensions',
        ],
        timeout: 30000,
      });
      this._browserDirName = userDataDirName;
      logger.info('Puppeteer browser launched for pre-rendering');
    }
    return this.browser;
  }

  /**
   * Pre-render a single CMS page to static HTML
   * 
   * @param {string} slug - CMS page slug
   * @param {string} brand - Brand ID ('element-sicurezza' | 'element-medica')
   * @param {Object} [options]
   * @param {string} [options.baseUrl] - Override base URL (default: localhost:{port})
   * @param {number} [options.timeout] - Page load timeout in ms (default: 15000)
   * @param {boolean} [options.waitForContent] - Wait for CMS content to load (default: true)
   * @returns {Promise<PrerenderResult>}
   */
  async renderPage(slug, brand, options = {}) {
    const startTime = Date.now();
    const port = BRAND_PORTS[brand] || 5173;
    const baseUrl = options.baseUrl || `http://localhost:${port}`;
    const timeout = options.timeout || 15000;
    const urlPath = SLUG_TO_PATH[slug] || `/${slug}`;
    const fullUrl = `${baseUrl}${urlPath}`;

    logger.info({ slug, brand, url: fullUrl }, 'Pre-rendering page');

    let page = null;
    try {
      const browser = await this.getBrowser();
      page = await browser.newPage();

      // Set viewport for desktop rendering
      await page.setViewport({ width: 1280, height: 800 });

      // Set user agent to identify as prerender bot
      await page.setUserAgent('ElementCMS-Prerender/1.0');

      // Navigate to the page
      await page.goto(fullUrl, {
        waitUntil: 'networkidle0',
        timeout,
      });

      // Wait for CMS content to be loaded
      if (options.waitForContent !== false) {
        try {
          // Wait for either CMS content marker or timeout
          await page.waitForFunction(
            () => {
              // Check if CMS content has loaded (CMSPageRenderer sets this)
              const cmsLoaded = document.querySelector('[data-cms-loaded="true"]');
              // Or if the page has meaningful content (h1 exists)
              const hasContent = document.querySelector('h1') !== null;
              // Or if error state (404, etc.)
              const hasError = document.querySelector('[data-error]') !== null;
              return cmsLoaded || hasContent || hasError;
            },
            { timeout: timeout - 2000 }
          );
        } catch {
          logger.warn({ slug, brand }, 'Timeout waiting for CMS content marker, proceeding with current HTML');
        }
      }

      // Small delay to ensure React hydration-ready state
      await new Promise(resolve => setTimeout(resolve, 500));

      // Extract the full HTML
      const html = await page.content();

      // Extract title for logging
      const title = await page.title();

      // Inject prerender meta tag
      const enhancedHtml = html.replace(
        '</head>',
        `  <meta name="x-prerendered" content="true" />\n` +
        `  <meta name="x-prerender-date" content="${new Date().toISOString()}" />\n` +
        `  <meta name="x-prerender-brand" content="${brand}" />\n` +
        `</head>`
      );

      // Save to file
      const outputDir = path.join(PRERENDERED_DIR, brand);
      await fs.mkdir(outputDir, { recursive: true });

      // Use slug as filename (replace / with -)
      const safeSlug = slug.replace(/\//g, '-') || 'homepage';
      const outputFile = path.join(outputDir, `${safeSlug}.html`);
      await fs.writeFile(outputFile, enhancedHtml, 'utf-8');

      const renderTimeMs = Date.now() - startTime;
      const htmlSize = Buffer.byteLength(enhancedHtml, 'utf-8');

      logger.info({
        slug,
        brand,
        renderTimeMs,
        htmlSize,
        title,
        outputFile,
      }, 'Page pre-rendered successfully');

      return {
        slug,
        path: urlPath,
        outputFile,
        renderTimeMs,
        htmlSize,
        title,
        status: 'success',
      };
    } catch (error) {
      const renderTimeMs = Date.now() - startTime;
      logger.error(
        { slug, brand, error: error.message, renderTimeMs },
        'Failed to pre-render page'
      );
      return {
        slug,
        path: SLUG_TO_PATH[slug] || `/${slug}`,
        outputFile: '',
        renderTimeMs,
        htmlSize: 0,
        title: '',
        status: 'error',
        error: error.message,
      };
    } finally {
      if (page) {
        await page.close().catch(() => { });
      }
    }
  }

  /**
   * Pre-render all pages for a brand
   * 
   * @param {string} brand - Brand ID
   * @param {Object} [options]
   * @returns {Promise<PrerenderResult[]>}
   */
  async renderAllPages(brand, options = {}) {
    const slugs = BRAND_SLUGS[brand];
    if (!slugs) {
      throw new Error(`Unknown brand: ${brand}`);
    }

    logger.info({ brand, pageCount: slugs.length }, 'Starting full pre-render for brand');

    const results = [];
    for (const slug of slugs) {
      const result = await this.renderPage(slug, brand, options);
      results.push(result);

      // Small delay between renders to avoid overloading
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'error').length;

    logger.info({ brand, successful, failed, total: results.length }, 'Full pre-render completed');

    return results;
  }

  /**
   * Delete a pre-rendered page
   * 
   * @param {string} slug - CMS page slug
   * @param {string} brand - Brand ID
   * @returns {Promise<boolean>}
   */
  async deletePage(slug, brand) {
    const safeSlug = slug.replace(/\//g, '-') || 'homepage';
    const filePath = path.join(PRERENDERED_DIR, brand, `${safeSlug}.html`);

    try {
      await fs.unlink(filePath);
      logger.info({ slug, brand }, 'Pre-rendered page deleted');
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.warn({ slug, brand }, 'Pre-rendered page not found for deletion');
        return false;
      }
      throw error;
    }
  }

  /**
   * Get pre-render status for a brand
   * 
   * @param {string} brand - Brand ID
   * @returns {Promise<Object>}
   */
  async getStatus(brand) {
    const brandDir = path.join(PRERENDERED_DIR, brand);
    const expectedSlugs = BRAND_SLUGS[brand] || [];

    try {
      const files = await fs.readdir(brandDir);
      const htmlFiles = files.filter(f => f.endsWith('.html'));

      const fileDetails = await Promise.all(
        htmlFiles.map(async (file) => {
          const filePath = path.join(brandDir, file);
          const stat = await fs.stat(filePath);
          return {
            slug: file.replace('.html', ''),
            size: stat.size,
            lastModified: stat.mtime.toISOString(),
          };
        })
      );

      return {
        brand,
        totalExpected: expectedSlugs.length,
        totalRendered: htmlFiles.length,
        coverage: `${Math.round((htmlFiles.length / expectedSlugs.length) * 100)}%`,
        pages: fileDetails,
        missing: expectedSlugs.filter(slug =>
          !htmlFiles.includes(`${slug.replace(/\//g, '-')}.html`)
        ),
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {
          brand,
          totalExpected: expectedSlugs.length,
          totalRendered: 0,
          coverage: '0%',
          pages: [],
          missing: expectedSlugs,
        };
      }
      throw error;
    }
  }

  /**
   * Close the browser instance
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Puppeteer browser closed');
    }
  }
}

// Singleton instance
const prerenderService = new PrerenderService();

export default prerenderService;
export { PrerenderService, BRAND_SLUGS, SLUG_TO_PATH, BRAND_PORTS };
