/**
 * Google Slides Importer Service
 * REFACTORED: Uses Strategy Pattern with SlidesStrategy
 * Maintains backward compatibility with existing API
 */

import { SlidesStrategy } from './strategies/SlidesStrategy.js';

// Singleton instance
const slidesStrategy = new SlidesStrategy();

export async function fetchPresentation(presentationId, accessToken) {
  return await slidesStrategy.fetch(presentationId, accessToken);
}

export function convertToHTML(presentation) {
  return slidesStrategy.convertToHTML(presentation);
}

export function extractMarkers(html) {
  return slidesStrategy.extractMarkers(html);
}

export async function importPresentation(presentationId, userId, tenantId, convertToHtml = true) {
  return await slidesStrategy.import(presentationId, userId, tenantId, convertToHtml);
}

export default {
  fetchPresentation,
  convertToHTML,
  extractMarkers,
  importPresentation
};
