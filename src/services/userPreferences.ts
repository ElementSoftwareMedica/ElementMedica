/**
 * Servizi per la gestione delle preferenze utente
 * Utilizza localStorage per persistenza locale
 */

// Tipi di preferenze supportate
type PreferenceType = 'viewMode' | 'columnWidths' | 'hiddenColumns' | 'columnOrder';

/**
 * Salva una preferenza utente in localStorage
 * @param section La sezione/pagina di riferimento
 * @param type Il tipo di preferenza
 * @param value Il valore da salvare
 */
export const savePreference = async (
  section: string,
  type: PreferenceType,
  value: unknown
): Promise<void> => {
  try {
    const key = `${section}-${type}`;
    localStorage.setItem(key, JSON.stringify(value));
    return Promise.resolve();
  } catch (error) {
    console.error('Error saving user preference to localStorage:', error);
    return Promise.reject(error);
  }
};

/**
 * Recupera una preferenza utente da localStorage
 * @param section La sezione/pagina di riferimento
 * @param type Il tipo di preferenza 
 * @returns Il valore della preferenza o undefined se non trovato
 */
export const getPreference = async <T>(
  section: string,
  type: PreferenceType
): Promise<T | undefined> => {
  try {
    const key = `${section}-${type}`;
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : undefined;
  } catch (error) {
    console.error('Error loading user preference from localStorage:', error);
    return undefined;
  }
};

/**
 * Salva la modalità di visualizzazione per una sezione
 * @param section Nome della sezione/pagina
 * @param mode Modalità di visualizzazione ('table' o 'grid')
 */
export const saveViewMode = async (
  section: string,
  mode: 'table' | 'grid'
): Promise<void> => {
  return savePreference(section, 'viewMode', mode);
};

/**
 * Recupera la modalità di visualizzazione per una sezione
 * @param section Nome della sezione/pagina
 * @returns La modalità di visualizzazione o 'table' come default
 */
export const getViewMode = async (
  section: string
): Promise<'table' | 'grid'> => {
  const mode = await getPreference<'table' | 'grid'>(section, 'viewMode');
  return mode || 'table';
};

/**
 * Salva le larghezze delle colonne di una tabella
 * @param tableName Nome della tabella
 * @param widths Oggetto con le larghezze delle colonne
 */
export const saveTableWidths = async (
  tableName: string,
  widths: Record<string, number>
): Promise<void> => {
  return savePreference(tableName, 'columnWidths', widths);
};

/**
 * Recupera le larghezze delle colonne di una tabella
 * @param tableName Nome della tabella
 * @returns Oggetto con le larghezze delle colonne o oggetto vuoto
 */
export const getTableWidths = async (
  tableName: string
): Promise<Record<string, number>> => {
  const widths = await getPreference<Record<string, number>>(tableName, 'columnWidths');
  return widths || {};
};

/**
 * Salva le colonne nascoste di una tabella
 * @param tableName Nome della tabella
 * @param hiddenColumns Array con le chiavi delle colonne nascoste
 */
export const saveHiddenColumns = async (
  tableName: string,
  hiddenColumns: string[]
): Promise<void> => {
  return savePreference(tableName, 'hiddenColumns', hiddenColumns);
};

/**
 * Recupera le colonne nascoste di una tabella
 * @param tableName Nome della tabella
 * @returns Array con le chiavi delle colonne nascoste o array vuoto
 */
export const getHiddenColumns = async (
  tableName: string
): Promise<string[]> => {
  const columns = await getPreference<string[]>(tableName, 'hiddenColumns');
  return columns || [];
};

/**
 * Salva l'ordine delle colonne di una tabella
 * @param tableName Nome della tabella
 * @param columnOrder Oggetto con l'ordine delle colonne
 */
export const saveColumnOrder = async (
  tableName: string,
  columnOrder: Record<string, number>
): Promise<void> => {
  return savePreference(tableName, 'columnOrder', columnOrder);
};

/**
 * Recupera l'ordine delle colonne di una tabella
 * @param tableName Nome della tabella
 * @returns Oggetto con l'ordine delle colonne o oggetto vuoto
 */
export const getColumnOrder = async (
  tableName: string
): Promise<Record<string, number>> => {
  const order = await getPreference<Record<string, number>>(tableName, 'columnOrder');
  return order || {};
};

/**
 * Salva le preferenze della tabella (metodo unificato)
 */
export const saveTablePreferences = async (
  tableName: string, 
  preferences: {
    columnWidths?: Record<string, number>;
    hiddenColumns?: string[];
    columnOrder?: Record<string, number>;
  }
): Promise<void> => {
  const promises: Promise<void>[] = [];
  
  if (preferences.columnWidths) {
    promises.push(saveTableWidths(tableName, preferences.columnWidths));
  }
  
  if (preferences.hiddenColumns) {
    promises.push(saveHiddenColumns(tableName, preferences.hiddenColumns));
  }
  
  if (preferences.columnOrder) {
    promises.push(saveColumnOrder(tableName, preferences.columnOrder));
  }
  
  await Promise.all(promises);
};

/**
 * Carica tutte le preferenze della tabella (metodo unificato)
 */
export const loadTablePreferences = async (
  tableName: string
): Promise<{
  columnWidths: Record<string, number>;
  hiddenColumns: string[];
  columnOrder: Record<string, number>;
}> => {
  const [columnWidths, hiddenColumns, columnOrder] = await Promise.all([
    getTableWidths(tableName),
    getHiddenColumns(tableName),
    getColumnOrder(tableName)
  ]);
  
  return {
    columnWidths,
    hiddenColumns,
    columnOrder
  };
};

/**
 * Hook per utilizzare le preferenze della tabella
 * @param tableName Nome della tabella
 */
export const useTablePreferences = (tableName: string) => {
  return {
    savePreferences: (preferences: {
      columnWidths?: Record<string, number>;
      hiddenColumns?: string[];
      columnOrder?: Record<string, number>;
    }) => saveTablePreferences(tableName, preferences),
    
    loadPreferences: () => loadTablePreferences(tableName)
  };
};