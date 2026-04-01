/**
 * @file csvHelpers.ts
 * @description CSV parsing and processing utilities for GenericImport
 */

import Papa from 'papaparse';

/**
 * Normalize a string for case-insensitive comparison
 * Removes whitespace and converts to uppercase
 */
export const normalizeString = (str: any): string => {
  if (!str) return '';
  return String(str).replace(/\s+/g, '').toUpperCase();
};

/**
 * Manual CSV parsing fallback when Papa Parse fails
 * Splits by delimiter and handles quoted values
 */
export const manualCsvParse = (
  text: string,
  delimiter: string,
  headers: string[]
): any[] => {
  const lines = text.split('\n').slice(1); // Skip header row
  return lines
    .filter(line => line.trim())
    .map(line => {
      const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
      const obj: Record<string, any> = {};
      headers.forEach((header, idx) => {
        obj[header.trim()] = values[idx] || '';
      });
      return obj;
    });
};

/**
 * Default CSV file processing with multi-stage fallback
 * Handles BOM removal, multiple delimiters, and header validation
 */
export const defaultProcessFile = async (
  file: File,
  csvHeaderMap: Record<string, string>,
  csvDelimiter: string
): Promise<any[]> => {
  // Read file as text
  const text = await file.text();
  
  // Remove BOM if present (UTF-8 byte order mark)
  const cleanText = text.replace(/^\uFEFF/, '');
  
  // Stage 1: Try with specified delimiter
  let parseResult = Papa.parse(cleanText, {
    header: true,
    delimiter: csvDelimiter,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(),
  });
  
  
  // Stage 2: Try semicolon delimiter if single column detected OR if data is empty
  const needsRetry = !parseResult.data || 
                      parseResult.data.length === 0 || 
                      Object.keys(parseResult.data[0] as object).length === 1 ||
                      Object.keys(parseResult.data[0] as object).some(k => k.includes(';'));
  
  if (needsRetry) {
    parseResult = Papa.parse(cleanText, {
      header: true,
      delimiter: ';',
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
    });
    
  }
  
  // Stage 3: Auto-detect delimiter if still single column
  if (parseResult.data.length > 0 && Object.keys(parseResult.data[0] as object).length === 1) {
    parseResult = Papa.parse(cleanText, {
      header: true,
      delimiter: '', // Auto-detect
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
    });
  }
  
  // Stage 4: Try comma delimiter if still single column
  if (parseResult.data.length > 0 && Object.keys(parseResult.data[0] as object).length === 1) {
    parseResult = Papa.parse(cleanText, {
      header: true,
      delimiter: ',',
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
    });
  }
  
  // Stage 5: Manual parsing fallback with semicolon
  if (parseResult.data.length > 0 && Object.keys(parseResult.data[0] as object).length === 1) {
    const lines = cleanText.split('\n');
    const headers = lines[0].split(';').map(h => h.trim());
    if (headers.length > 1) {
      const manualData = manualCsvParse(cleanText, ';', headers);
      parseResult = { data: manualData, errors: [], meta: parseResult.meta };
    }
  }
  
  // Stage 6: Manual parsing fallback with comma
  if (parseResult.data.length > 0 && Object.keys(parseResult.data[0] as object).length === 1) {
    const lines = cleanText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    if (headers.length > 1) {
      const manualData = manualCsvParse(cleanText, ',', headers);
      parseResult = { data: manualData, errors: [], meta: parseResult.meta };
    }
  }
  
  // Check for parsing errors - ma solo se NON abbiamo dati validi
  // Se abbiamo dati con più di 1 colonna, ignoriamo gli errori di parsing
  const hasValidData = parseResult.data && 
                        parseResult.data.length > 0 && 
                        Object.keys(parseResult.data[0] as object).length > 1;
  
  if (!hasValidData && parseResult.errors && parseResult.errors.length > 0) {
    const errorMessages = parseResult.errors.map(e => e.message).join(', ');
    throw new Error(`Errore nel parsing del CSV: ${errorMessages}`);
  }
  
  // Verify data exists
  if (!parseResult.data || parseResult.data.length === 0) {
    throw new Error('Il file CSV è vuoto o non contiene dati validi');
  }
  
  // Extract and validate headers (filtra campi interni di PapaParse come __parsed_extra)
  const csvHeaders = Object.keys(parseResult.data[0] as object)
    .filter(h => !h.startsWith('__'))
    .map(h => h.trim());
  const expectedHeaders = Object.keys(csvHeaderMap);
  
  
  // Check header compatibility (almeno 1 header deve matchare)
  const matchingHeaders = csvHeaders.filter(csvHeader => 
    expectedHeaders.some(expected => 
      expected.toLowerCase() === csvHeader.toLowerCase()
    )
  );
  
  
  if (matchingHeaders.length === 0) {
    throw new Error(
      `Le intestazioni del CSV non corrispondono.\n` +
      `Trovate: ${csvHeaders.join(', ')}\n` +
      `Attese almeno una tra: ${expectedHeaders.slice(0, 10).join(', ')}...`
    );
  }
  
  // Map CSV fields to entity fields
  const mappedEntities = parseResult.data.map((row: any) => {
    const mapped: Record<string, any> = {};
    
    Object.entries(row).forEach(([k, v]) => {
      // Find correct mapping for CSV header
      const csvHeader = k.trim();
      let mappedKey = csvHeader; // Default: use original header
      
      // Search for case-insensitive match in csvHeaderMap
      for (const [headerKey, fieldKey] of Object.entries(csvHeaderMap)) {
        if (headerKey.toLowerCase() === csvHeader.toLowerCase()) {
          mappedKey = fieldKey;
          break;
        }
      }
      
      // Keep all fields, even if empty (important for templates)
      mapped[mappedKey] = v !== null && v !== undefined ? v.toString().trim() : '';
    });
    
    return mapped;
  });
  
  return mappedEntities;
};

/**
 * Check if an error is a conflict error (HTTP 409)
 */
export const isConflictError = (error: any): boolean => {
  return error?.response?.status === 409;
};

/**
 * Validate ISO 8601 date format
 */
export const isValidISODate = (dateStr: string): boolean => {
  if (!dateStr) return true; // Empty dates are valid
  
  // Check ISO 8601 format (YYYY-MM-DD)
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;
  if (!isoDateRegex.test(dateStr)) return false;
  
  // Verify date is valid
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
};

/**
 * Validate common fields that can cause 500 errors
 */
export const validateCommonFields = (item: Record<string, any>): string[] => {
  const errors: string[] = [];
  
  // Date field validation
  const dateFields = ['birthDate', 'birth_date', 'data_nascita', 'date', 'startDate', 'endDate'];
  dateFields.forEach(field => {
    if (item[field] && !isValidISODate(item[field])) {
      errors.push(`Il campo ${field} contiene una data non valida: ${item[field]}`);
    }
  });
  
  // Email validation
  if (item.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email)) {
    errors.push('Il formato dell\'email non è valido');
  }
  
  return errors;
};

/**
 * Normalize entity fields based on CSV header mapping
 * Ensures consistent field names after import
 */
export const normalizeItemFields = (
  item: Record<string, any>,
  csvHeaderMap: Record<string, string>
): Record<string, any> => {
  const result: Record<string, any> = {};
  
  // Map fields according to csvHeaderMap
  for (const [header, field] of Object.entries(csvHeaderMap)) {
    if (item[field] !== undefined) {
      result[field] = item[field];
    }
  }
  
  // Copy unmapped fields
  for (const [key, value] of Object.entries(item)) {
    if (result[key] === undefined) {
      result[key] = value;
    }
  }
  
  return result;
};
