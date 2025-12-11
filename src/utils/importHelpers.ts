/**
 * @file importHelpers.ts
 * @description Utilità condivise per import CSV (frontend)
 * Centralizza funzioni comuni usate dai vari import components
 */

/**
 * Normalizza Codice Fiscale (uppercase + trim)
 */
export function normalizeTaxCode(cf: string | null | undefined): string {
  if (!cf) return '';
  return cf.toString().trim().toUpperCase();
}

/**
 * Normalizza Partita IVA (rimuove IT prefix, uppercase + trim)
 */
export function normalizeVATNumber(piva: string | null | undefined): string {
  if (!piva) return '';
  return piva.toString().trim().replace(/^IT/i, '').toUpperCase();
}

/**
 * Normalizza email (lowercase + trim)
 */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  return email.toString().trim().toLowerCase();
}

/**
 * Rileva duplicati in un array basato su una chiave
 */
export function detectDuplicates<T extends Record<string, any>>(
  items: T[],
  key: keyof T
): Array<{ index: number; value: any; duplicateOf: number }> {
  const seen = new Map<string, number>();
  const duplicates: Array<{ index: number; value: any; duplicateOf: number }> = [];

  items.forEach((item, index) => {
    const value = item[key];
    if (!value) return;

    const normalized = typeof value === 'string' 
      ? value.toString().trim().toUpperCase() 
      : String(value);

    if (seen.has(normalized)) {
      duplicates.push({
        index,
        value: normalized,
        duplicateOf: seen.get(normalized)!
      });
    } else {
      seen.set(normalized, index);
    }
  });

  return duplicates;
}

/**
 * Conta righe con errori
 */
export function countRowsWithErrors(
  validationResults: Array<{ errors: string[] }>
): number {
  return validationResults.filter(r => r.errors && r.errors.length > 0).length;
}

/**
 * Filtra righe selezionate da un array
 */
export function filterSelectedRows<T>(
  items: T[],
  selectedIndexes: Set<number>
): T[] {
  return items.filter((_, index) => selectedIndexes.has(index));
}

/**
 * Formatta numero con separatore migliaia
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('it-IT').format(num);
}

/**
 * Crea CSV string da array di oggetti
 */
export function createCSVFromData(
  data: Array<Record<string, any>>,
  columns: string[],
  delimiter: string = ';'
): string {
  const headers = columns.join(delimiter);
  const rows = data.map(row => 
    columns.map(col => {
      const value = row[col] ?? '';
      // Escape delimiter se presente nel valore
      return String(value).includes(delimiter) 
        ? `"${value}"` 
        : value;
    }).join(delimiter)
  );

  return [headers, ...rows].join('\n');
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Calcola differenze tra due oggetti
 */
export function calculateObjectDiff(
  oldObj: Record<string, any>,
  newObj: Record<string, any>
): Record<string, { old: any; new: any }> {
  const diff: Record<string, { old: any; new: any }> = {};

  // Controlla tutti i campi del nuovo oggetto
  Object.keys(newObj).forEach(key => {
    const oldValue = oldObj[key];
    const newValue = newObj[key];

    // Normalizza per confronto
    const normalizedOld = oldValue?.toString().trim().toLowerCase();
    const normalizedNew = newValue?.toString().trim().toLowerCase();

    if (normalizedOld !== normalizedNew) {
      diff[key] = { old: oldValue, new: newValue };
    }
  });

  return diff;
}

/**
 * Valida formato email (client-side)
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Genera colori per status badges
 */
export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    ACTIVE: 'green',
    INACTIVE: 'gray',
    PENDING: 'yellow',
    SUSPENDED: 'orange',
    TERMINATED: 'red',
    ERROR: 'red',
    SUCCESS: 'green',
    WARNING: 'yellow'
  };

  return statusColors[status.toUpperCase()] || 'gray';
}

/**
 * Formatta data in formato IT
 */
export function formatDateIT(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('it-IT').format(d);
}

/**
 * Genera summary report per import
 */
export interface ImportSummary {
  total: number;
  selected: number;
  valid: number;
  withErrors: number;
  duplicates: number;
  conflicts: number;
}

export function generateImportSummary(
  data: any[],
  selectedRows: Set<number>,
  validationResults: Array<{ errors: string[] }>,
  duplicates: number,
  conflicts: number
): ImportSummary {
  return {
    total: data.length,
    selected: selectedRows.size,
    valid: data.length - countRowsWithErrors(validationResults),
    withErrors: countRowsWithErrors(validationResults),
    duplicates,
    conflicts
  };
}
