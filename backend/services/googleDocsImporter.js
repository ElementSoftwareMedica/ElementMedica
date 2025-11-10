/**
 * Google Docs Importer Service
 * REFACTORED: Uses Strategy Pattern with DocsStrategy
 * Maintains backward compatibility with existing API
 */

import { DocsStrategy } from './strategies/DocsStrategy.js';

// Singleton instance
const docsStrategy = new DocsStrategy();

export async function fetchDocument(documentId, accessToken) {
  return await docsStrategy.fetch(documentId, accessToken);
}

export function convertToHTML(document) {
  return docsStrategy.convertToHTML(document);
}

export function extractMarkers(html) {
  return docsStrategy.extractMarkers(html);
}

export async function importDocument(documentId, userId, tenantId, convertToHtml = true) {
  return await docsStrategy.import(documentId, userId, tenantId, convertToHtml);
}

export default {
  fetchDocument,
  convertToHTML,
  extractMarkers,
  importDocument
};
