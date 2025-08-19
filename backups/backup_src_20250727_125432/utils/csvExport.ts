/**
 * Utility per l'esportazione di dati in formato CSV
 */

/**
 * Rimuove i caratteri accentati da una stringa
 * 
 * @param str - Stringa da normalizzare
 * @returns Stringa senza caratteri accentati
 */
export const removeAccents = (str: string): string => {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

/**
 * Crea una stringa CSV dai dati forniti
 * 
 * @param data - Array di oggetti da convertire in CSV
 * @param headers - Oggetto che mappa le intestazioni CSV ai campi dell'oggetto
 * @param delimiter - Carattere delimitatore (default: ';')
 * @returns Stringa CSV formattata
 */
export const createCsvString = <T extends Record<string, any>>(
  data: T[],
  headers: Record<string, string>,
  delimiter: string = ';'
): string => {
  if (!data || data.length === 0) {
    // Se non ci sono dati, restituisce solo le intestazioni
    return Object.keys(headers).join(delimiter);
  }

  // Crea la riga di intestazione (rimuovendo accenti dalle intestazioni)
  const headerRow = Object.keys(headers).map(header => removeAccents(header)).join(delimiter);
  
  // Crea le righe di dati
  const rows = data.map(item => {
    return Object.entries(headers)
      .map(([_, field]) => {
        // Ottiene il valore dal campo specificato
        const value = item[field];
        
        // Formatta il valore per CSV (gestisce stringhe con virgole, nuove linee, etc.)
        if (value === null || value === undefined) {
          return '';
        } else if (typeof value === 'string') {
          // Rimuove gli accenti e poi gestisce i caratteri speciali
          const normalizedValue = removeAccents(value);
          // Escape di virgolette e aggiunta di virgolette per stringhe che contengono il delimitatore o altri caratteri speciali
          if (normalizedValue.includes(delimiter) || normalizedValue.includes('"') || normalizedValue.includes('\n')) {
            return `"${normalizedValue.replace(/"/g, '""')}"`;
          } else {
            return normalizedValue;
          }
        } else if (Array.isArray(value)) {
          // Converte array in una stringa, rimuovendo accenti
          return `"${removeAccents(value.join(', ')).replace(/"/g, '""')}"`;
        } else if (typeof value === 'object' && value !== null) {
          // Converte oggetti in stringhe JSON
          try {
            const jsonString = JSON.stringify(value);
            return `"${removeAccents(jsonString).replace(/"/g, '""')}"`;
          } catch (e) {
            return '';
          }
        } else {
          // Converte altri tipi in stringa
          return String(value);
        }
      })
      .join(delimiter);
  });
  
  // Combina intestazioni e righe
  return [headerRow, ...rows].join('\n');
};

/**
 * Scarica un file CSV
 * 
 * @param csvContent - Contenuto CSV da scaricare
 * @param filename - Nome del file (default: 'export.csv')
 */
export const downloadCsv = (csvContent: string, filename: string = 'export.csv'): void => {
  // Aggiungi il BOM per garantire che Excel riconosca correttamente i caratteri UTF-8
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Pulisci l'URL
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

/**
 * Esporta i dati in un file CSV e avvia il download
 * 
 * @param data - Array di oggetti da esportare
 * @param headers - Oggetto che mappa le intestazioni CSV ai campi dell'oggetto
 * @param filename - Nome del file da scaricare
 * @param delimiter - Carattere delimitatore (default: ';')
 */
export function exportToCsv<T extends Record<string, any>>(
  data: T[],
  headers: Record<string, keyof T | string>,
  filename: string,
  delimiter: string = ';'
): void {
  if (!data || data.length === 0) {
    console.warn('Nessun dato da esportare');
    return;
  }

  try {
    // Intestazioni come prima riga del CSV 
    const headerRow = Object.keys(headers).join(delimiter);
    
    // Converti ogni riga di dati in una riga CSV
    const csvRows = data.map(item => {
      return Object.values(headers)
        .map(propName => {
          // La proprietà potrebbe essere un percorso nidificato come 'company.name'
          let value: any;
          
          if (typeof propName === 'string' && propName.includes('.')) {
            // Handle nested properties
            const parts = propName.split('.');
            let current: any = item;
            for (const part of parts) {
              current = current && current[part];
            }
            value = current;
          } else {
            value = item[propName as keyof T];
          }
          
          // Gestisci valori nulli e undefined
          if (value === null || value === undefined) {
            return '';
          }
          
          // Converti valori booleani in stringhe
          if (typeof value === 'boolean') {
            return value ? '1' : '0';
          }
          
          // Converti date in stringhe nel formato italiano
          if (value instanceof Date) {
            return value.toLocaleDateString('it-IT');
          }
          
          // Formatta stringhe sostituendo caratteri problematici
          const str = String(value);
          
          // Verifica se la stringa contiene il delimitatore o caratteri speciali
          const needsQuotes = str.includes(delimiter) || str.includes('"') || str.includes('\n');
          
          if (needsQuotes) {
            // Se la stringa contiene il delimitatore, la racchiudiamo tra virgolette doppie
            // e sostituiamo le eventuali virgolette doppie con due virgolette doppie
            return `"${str.replace(/"/g, '""')}"`;
          }
          
          return str;
        })
        .join(delimiter);
    });
    
    // Unisci tutte le righe
    const csvContent = [headerRow, ...csvRows].join('\n');
    
    // Aggiungi BOM per garantire che i caratteri speciali vengano visualizzati correttamente in Excel
    // Il BOM (Byte Order Mark) indica a Excel che il file è codificato in UTF-8
    const BOM = '\uFEFF';
    const csvContentWithBOM = BOM + csvContent;
    
    // Crea un blob con il contenuto CSV
    const blob = new Blob([csvContentWithBOM], { type: 'text/csv;charset=utf-8' });
    
    // Crea un link per il download e simula un clic su di esso
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    
    // Pulisci
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Errore nell\'esportazione CSV:', error);
  }
}

/**
 * Funzione per scaricare un template CSV con solo le intestazioni
 * @param headers Intestazioni del CSV
 * @param filename Nome del file da scaricare
 * @param delimiter Delimitatore CSV (default: punto e virgola)
 */
export function downloadCsvTemplate(
  headers: string[], 
  filename: string,
  delimiter: string = ';'
): void {
  try {
    // Unisci le intestazioni con il delimitatore
    const headerRow = headers.join(delimiter);
    
    // Aggiungi BOM per la compatibilità con Excel
    const BOM = '\uFEFF';
    const csvContent = BOM + headerRow;
    
    // Crea un blob con il contenuto CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    
    // Crea un link per il download e simula un clic su di esso
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    
    // Pulisci
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Errore nel download del template CSV:', error);
  }
} 