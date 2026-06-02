#!/usr/bin/env node
/**
 * Post-build pre-compression script
 * Creates .gz versions of all compressible static assets in dist/ and dist-public/
 * 
 * With nginx `gzip_static on`, nginx serves the pre-compressed .gz file directly
 * without any CPU overhead per request. This replaces on-the-fly gzip compression.
 * 
 * Run: node scripts/compress-assets.mjs
 */

import { readdir, stat, readFile, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import { gzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);

// File extensions to pre-compress
const COMPRESSIBLE = new Set(['.js', '.css', '.html', '.json', '.svg', '.xml', '.txt', '.wasm', '.map']);

// Minimum file size to bother pre-compressing (bytes)
const MIN_SIZE = 1024;

async function* walkDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkDir(fullPath);
    } else {
      yield fullPath;
    }
  }
}

async function compressFile(filePath) {
  const ext = extname(filePath).toLowerCase();
  if (!COMPRESSIBLE.has(ext)) return null;

  // Skip already compressed files
  if (filePath.endsWith('.gz') || filePath.endsWith('.br')) return null;

  const { size } = await stat(filePath);
  if (size < MIN_SIZE) return null;

  const content = await readFile(filePath);
  const compressed = await gzipAsync(content, {
    level: 9,  // Maximum compression
    memLevel: 9,
  });

  const gzPath = filePath + '.gz';
  await writeFile(gzPath, compressed);

  const ratio = Math.round((1 - compressed.length / content.length) * 100);
  return { original: size, compressed: compressed.length, ratio };
}

async function compressDir(dir) {
  let totalOriginal = 0;
  let totalCompressed = 0;
  let fileCount = 0;

  for await (const filePath of walkDir(dir)) {
    const result = await compressFile(filePath);
    if (result) {
      totalOriginal += result.original;
      totalCompressed += result.compressed;
      fileCount++;
    }
  }

  const ratio = Math.round((1 - totalCompressed / totalOriginal) * 100);
  const savedKb = Math.round((totalOriginal - totalCompressed) / 1024);
  console.log(`  ${dir}: ${fileCount} files, ${Math.round(totalOriginal / 1024)}KB → ${Math.round(totalCompressed / 1024)}KB (${ratio}% reduction, saved ${savedKb}KB)`);
}

console.log('🗜️  Pre-compressing static assets with gzip level 9...');
console.log('   (nginx gzip_static on will serve these directly)\n');

await compressDir('dist');
await compressDir('dist-public');

console.log('\n✅ Pre-compression complete');
