#!/usr/bin/env node
/**
 * Pre-render Pages Script
 * 
 * Build-time script that pre-renders all CMS pages for a brand
 * using Puppeteer to produce static HTML files.
 * 
 * Usage:
 *   node scripts/prerender-pages.js --brand=element-sicurezza
 *   node scripts/prerender-pages.js --brand=element-medica
 *   node scripts/prerender-pages.js --brand=all
 * 
 * Output:
 *   backend/public/prerendered/{brand}/{slug}.html
 * 
 * Prerequisites:
 *   - API server running on port 4001
 *   - Frontend dev server running on the brand's port (5173/5174)
 *   - OR: built frontend served via a temporary static server
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

// ─────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────

const BRANDS = {
  'element-sicurezza': {
    port: 5173,
    domain: 'www.elementsicurezza.com',
    slugs: [
      'homepage-sicurezza',
      'chi-siamo-sicurezza',
      'servizi-sicurezza',
      'formazione',
      'contatti-sicurezza',
      'privacy-policy',
      'cookie-policy',
    ],
  },
  'element-medica': {
    port: 5174,
    domain: 'www.elementmedica.com',
    slugs: [
      'homepage-medica',
      'chi-siamo-medica',
      'ambulatorio',
      'team-medico',
      'prestazioni',
      'prenota-visita',
      'contatti-medica',
      'privacy-policy',
      'cookie-policy',
    ],
  },
};

/**
 * Maps CMS slug → public URL path (must match frontend router)
 */
const SLUG_TO_PATH = {
  'homepage-sicurezza': '/',
  'chi-siamo-sicurezza': '/chi-siamo',
  'servizi-sicurezza': '/servizi',
  'formazione': '/formazione',
  'contatti-sicurezza': '/contatti',
  'homepage-medica': '/',
  'chi-siamo-medica': '/chi-siamo',
  'ambulatorio': '/ambulatorio',
  'team-medico': '/medici',
  'prestazioni': '/prestazioni',
  'prenota-visita': '/prenota',
  'contatti-medica': '/contatti',
  'privacy-policy': '/privacy',
  'cookie-policy': '/cookie',
};

// ─────────────────────────────────────────────
// CLI argument parsing
// ─────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const config = { brand: null, verbose: false, timeout: 15000 };

  for (const arg of args) {
    if (arg.startsWith('--brand=')) {
      config.brand = arg.split('=')[1];
    } else if (arg === '--verbose' || arg === '-v') {
      config.verbose = true;
    } else if (arg.startsWith('--timeout=')) {
      config.timeout = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node scripts/prerender-pages.js [options]

Options:
  --brand=<name>    Brand to pre-render (element-sicurezza, element-medica, all)
  --timeout=<ms>    Page render timeout in milliseconds (default: 15000)
  --verbose, -v     Enable verbose logging
  --help, -h        Show this help message

Examples:
  node scripts/prerender-pages.js --brand=element-sicurezza
  node scripts/prerender-pages.js --brand=all --verbose
      `);
      process.exit(0);
    }
  }

  if (!config.brand) {
    console.error('❌ --brand argument is required. Use --help for usage.');
    process.exit(1);
  }

  return config;
}

// ─────────────────────────────────────────────
// Pre-render engine
// ─────────────────────────────────────────────

async function renderPage(browser, brand, slug, port, timeout) {
  const urlPath = SLUG_TO_PATH[slug] || `/${slug}`;
  const url = `http://localhost:${port}${urlPath}`;
  const outputDir = resolve(PROJECT_ROOT, 'backend/public/prerendered', brand);
  const outputFile = resolve(outputDir, `${slug}.html`);

  // Ensure output directory exists
  fs.mkdirSync(outputDir, { recursive: true });

  const page = await browser.newPage();

  try {
    // Set viewport for consistent rendering
    await page.setViewport({ width: 1280, height: 800 });

    // Set a realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (compatible; ElementMedicaPrerender/1.0; +https://www.elementmedica.com)'
    );

    // Navigate and wait for CMS content to load
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout,
    });

    // Wait for CMS content signal (data-cms-loaded attribute)
    try {
      await page.waitForSelector('[data-cms-loaded]', { timeout: timeout / 2 });
    } catch {
      // Fallback: wait for any h1 element
      try {
        await page.waitForSelector('h1', { timeout: 5000 });
      } catch {
        console.warn(`  ⚠️  No content marker found for ${slug}, using current state`);
      }
    }

    // Small delay for any final animations/renders
    await new Promise(r => setTimeout(r, 500));

    // Get the rendered HTML
    let html = await page.content();

    // Inject prerender meta tag
    html = html.replace(
      '<head>',
      `<head>\n    <meta name="prerender-status-code" content="200">\n    <meta name="prerender-date" content="${new Date().toISOString()}">`
    );

    // Remove client-side scripts (they'll just error without the SPA runtime)
    html = html.replace(/<script\b[^>]*src="[^"]*\.(js|mjs)"[^>]*><\/script>/gi, '');

    // Write the pre-rendered HTML
    fs.writeFileSync(outputFile, html, 'utf-8');

    const sizeKB = (Buffer.byteLength(html) / 1024).toFixed(1);
    console.log(`  ✅ ${slug} → ${outputFile} (${sizeKB} KB)`);

    return { slug, success: true, size: sizeKB };
  } catch (error) {
    console.error(`  ❌ ${slug} → ${error.message}`);
    return { slug, success: false, error: error.message };
  } finally {
    await page.close();
  }
}

async function prerenderBrand(brand, config) {
  const brandConfig = BRANDS[brand];
  if (!brandConfig) {
    console.error(`❌ Unknown brand: ${brand}`);
    return [];
  }

  console.log(`\n🔄 Pre-rendering ${brand} (${brandConfig.slugs.length} pages)...`);
  console.log(`   Server: http://localhost:${brandConfig.port}`);
  console.log(`   Domain: ${brandConfig.domain}\n`);

  // Dynamic import of Puppeteer (optional dependency)
  let puppeteer;
  try {
    puppeteer = (await import('puppeteer')).default;
  } catch {
    console.error('❌ Puppeteer is not installed. Run: npm install puppeteer --save-dev');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  const results = [];

  try {
    for (const slug of brandConfig.slugs) {
      const result = await renderPage(browser, brand, slug, brandConfig.port, config.timeout);
      results.push(result);
    }
  } finally {
    await browser.close();
  }

  return results;
}

// ─────────────────────────────────────────────
// Sitemap generation
// ─────────────────────────────────────────────

function generateSitemap(brand, results) {
  const brandConfig = BRANDS[brand];
  const domain = `https://${brandConfig.domain}`;
  const successfulSlugs = results.filter(r => r.success).map(r => r.slug);

  const urls = successfulSlugs.map(slug => {
    const path = SLUG_TO_PATH[slug] || `/${slug}`;
    const priority = path === '/' ? '1.0' : '0.8';
    const changefreq = path === '/' ? 'weekly' : 'monthly';

    return `  <url>
    <loc>${domain}${path}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  });

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  const outputDir = resolve(PROJECT_ROOT, 'backend/public/prerendered', brand);
  const outputFile = resolve(outputDir, 'sitemap.xml');
  fs.writeFileSync(outputFile, sitemap, 'utf-8');
  console.log(`\n📄 Sitemap generated: ${outputFile}`);
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

async function main() {
  const config = parseArgs();
  const startTime = Date.now();

  console.log('═══════════════════════════════════════');
  console.log('  ElementMedica SSG Pre-render Engine  ');
  console.log('═══════════════════════════════════════');

  const brandsToProcess = config.brand === 'all'
    ? Object.keys(BRANDS)
    : [config.brand];

  const allResults = {};

  for (const brand of brandsToProcess) {
    const results = await prerenderBrand(brand, config);
    allResults[brand] = results;

    // Generate sitemap for successfully rendered pages
    generateSitemap(brand, results);
  }

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n═══════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════');

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const [brand, results] of Object.entries(allResults)) {
    const success = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    totalSuccess += success;
    totalFailed += failed;
    console.log(`  ${brand}: ${success} ✅ / ${failed} ❌`);
  }

  console.log(`\n  Total: ${totalSuccess} rendered, ${totalFailed} failed`);
  console.log(`  Time: ${elapsed}s`);
  console.log('═══════════════════════════════════════\n');

  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
