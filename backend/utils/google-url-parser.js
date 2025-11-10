/**
 * Utility functions for parsing and validating Google document URLs
 */

/**
 * Extracts document ID and type from a Google Docs/Slides/Sheets URL
 * @param {string} url - The Google document URL
 * @returns {{id: string, type: 'docs'|'slides'|'sheets'} | null} - Extracted info or null if invalid
 */
export function parseGoogleUrl(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Remove whitespace
  url = url.trim();

  // Match Google document URLs
  // Formats:
  // - https://docs.google.com/document/d/{id}/...
  // - https://docs.google.com/presentation/d/{id}/...
  // - https://docs.google.com/spreadsheets/d/{id}/...
  
  const patterns = [
    { regex: /\/document\/d\/([a-zA-Z0-9-_]+)/, type: 'docs' },
    { regex: /\/presentation\/d\/([a-zA-Z0-9-_]+)/, type: 'slides' },
    { regex: /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/, type: 'sheets' }
  ];

  for (const { regex, type } of patterns) {
    const match = url.match(regex);
    if (match) {
      return {
        id: match[1],
        type: type
      };
    }
  }

  // Check if it's already just an ID (no URL structure)
  // Google Doc IDs are typically 44 characters, alphanumeric with hyphens and underscores
  if (/^[a-zA-Z0-9-_]{25,}$/.test(url)) {
    // It's likely an ID, but we can't determine type without URL context
    return {
      id: url,
      type: null // Type unknown when only ID is provided
    };
  }

  return null;
}

/**
 * Validates if a document ID matches the expected type based on URL
 * @param {string} url - The Google document URL
 * @param {'docs'|'slides'|'sheets'} expectedType - Expected document type
 * @returns {boolean} - True if type matches
 */
export function validateGoogleUrlType(url, expectedType) {
  const parsed = parseGoogleUrl(url);
  if (!parsed) {
    return false;
  }
  
  // If type could not be determined from URL (just an ID), we can't validate
  if (parsed.type === null) {
    return true; // Assume valid since we can't determine type
  }
  
  return parsed.type === expectedType;
}

/**
 * Determines the correct database field for a Google URL
 * @param {string} url - The Google document URL
 * @returns {'googleDocsId'|'googleSlidesId'|null} - Correct field name or null if invalid
 */
export function getGoogleFieldForUrl(url) {
  const parsed = parseGoogleUrl(url);
  if (!parsed || !parsed.type) {
    return null;
  }

  switch (parsed.type) {
    case 'docs':
      return 'googleDocsId';
    case 'slides':
      return 'googleSlidesId';
    case 'sheets':
      return 'googleSheetsId'; // In case you add sheets support later
    default:
      return null;
  }
}

/**
 * Extracts just the document ID from a URL or returns the input if it's already an ID
 * @param {string} urlOrId - Google document URL or ID
 * @returns {string|null} - Document ID or null if invalid
 */
export function extractGoogleDocId(urlOrId) {
  if (!urlOrId || typeof urlOrId !== 'string') {
    return null;
  }

  const parsed = parseGoogleUrl(urlOrId);
  return parsed ? parsed.id : null;
}

/**
 * Detects document type from template object, with validation
 * @param {Object} template - Template object with googleDocsId and/or googleSlidesId
 * @returns {{documentId: string, documentType: 'docs'|'slides', warnings: string[]}} - Document info with any warnings
 */
export function detectDocumentType(template) {
  const warnings = [];
  let documentId = null;
  let documentType = null;

  // Check both fields
  const hasDocsId = template.googleDocsId && template.googleDocsId.trim();
  const hasSlidesId = template.googleSlidesId && template.googleSlidesId.trim();

  if (hasDocsId && hasSlidesId) {
    warnings.push('Template has both googleDocsId and googleSlidesId populated. Using googleSlidesId (Slides takes precedence).');
    documentId = template.googleSlidesId;
    documentType = 'slides';
  } else if (hasDocsId) {
    documentId = template.googleDocsId;
    
    // Validate: check if it's actually a Slides URL in the Docs field
    const parsed = parseGoogleUrl(documentId);
    if (parsed && parsed.type === 'slides') {
      warnings.push(`⚠️  MISMATCH: Google Slides URL found in googleDocsId field (template ID: ${template.id}). Auto-correcting to use Slides API.`);
      documentType = 'slides';
      documentId = parsed.id; // Use just the ID
    } else if (parsed && parsed.type === 'docs') {
      documentType = 'docs';
      documentId = parsed.id;
    } else {
      // Assume docs if we can't parse (could be just an ID)
      documentType = 'docs';
    }
  } else if (hasSlidesId) {
    documentId = template.googleSlidesId;
    
    // Validate: check if it's actually a Docs URL in the Slides field
    const parsed = parseGoogleUrl(documentId);
    if (parsed && parsed.type === 'docs') {
      warnings.push(`⚠️  MISMATCH: Google Docs URL found in googleSlidesId field (template ID: ${template.id}). Auto-correcting to use Docs API.`);
      documentType = 'docs';
      documentId = parsed.id;
    } else if (parsed && parsed.type === 'slides') {
      documentType = 'slides';
      documentId = parsed.id;
    } else {
      // Assume slides if we can't parse
      documentType = 'slides';
    }
  }

  return {
    documentId,
    documentType,
    warnings
  };
}
