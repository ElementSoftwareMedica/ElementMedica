import { useState, useEffect, useMemo } from 'react';
import { apiGet } from '../services/api';
import { 
  Person, 
  FilterConfig, 
  filterPersonsByRoleLevel, 
  filterEmployees, 
  filterTrainers,
  applyCustomFilter 
} from '../services/roleHierarchyService';

export interface UsePersonFiltersOptions {
  filterConfig?: FilterConfig;
  filterType?: 'all' | 'employees' | 'trainers' | 'custom';
  autoFetch?: boolean;
  includeDeleted?: boolean;
}

export interface UsePersonFiltersReturn {
  persons: Person[];
  filteredPersons: Person[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setPersons: (persons: Person[]) => void;
  totalCount: number;
  filteredCount: number;
}

/**
 * Hook personalizzato per la gestione delle persone con filtri gerarchici
 * Supporta filtri predefiniti per employees/trainers e filtri personalizzati
 */
export const usePersonFilters = ({
  filterConfig,
  filterType = 'all',
  autoFetch = true,
  includeDeleted = false
}: UsePersonFiltersOptions = {}): UsePersonFiltersReturn => {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calcola le persone filtrate in base alla configurazione
  const filteredPersons = useMemo(() => {
    if (!persons.length) return [];

    switch (filterType) {
      case 'employees':
        return filterEmployees(persons);
      
      case 'trainers':
        return filterTrainers(persons);
      
      case 'custom':
        if (filterConfig) {
          return applyCustomFilter(persons, filterConfig);
        }
        return persons;
      
      case 'all':
      default:
        return persons;
    }
  }, [persons, filterType, filterConfig]);

  // Helper per estrarre lista da possibili formati di risposta
  const extractList = (resp: any): any[] => {
    if (!resp) return [];
    if (Array.isArray(resp)) return resp;
    if (Array.isArray(resp?.persons)) return resp.persons; // Risposta paginata v1
    if (Array.isArray(resp?.data?.persons)) return resp.data.persons; // Variante annidata
    if (Array.isArray(resp?.data)) return resp.data; // Risposta con data: []
    if (Array.isArray(resp?.items)) return resp.items; // Risposta con items: []
    if (Array.isArray(resp?.results)) return resp.results; // Variante results: []
    if (Array.isArray(resp?.rows)) return resp.rows; // Variante rows: []
    return [];
  };

  // Normalizza alias dei campi lato frontend per consistenza (es. codiceFiscale/fiscalCode -> taxCode)
  const mapAliases = (items: any[]): Person[] => {
    return items.map((p: any) => {
      // Preserva il valore se già presente, altrimenti usa alias conosciuti (camelCase e snake_case)
      const taxCode = p.taxCode ?? p.codiceFiscale ?? p.fiscalCode ?? p.codice_fiscale ?? p.fiscal_code ?? p.cf;
      return {
        ...p,
        ...(taxCode ? { taxCode } : {})
      } as Person;
    });
  };

  // Fetch delle persone dal backend
  const fetchPersons = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      // Costruzione parametri: includi soft-deleted quando richiesto
      const LIMIT = 1000; // pagina ampia per l'import
      const qs = new URLSearchParams();
      if (includeDeleted) qs.set('includeDeleted', 'true');
      qs.set('limit', String(LIMIT));
      
      // Strategia: per l'import recupera tutte le pagine finché disponibili
      let page = 1;
      let all: any[] = [];
      let keepFetching = true;

      while (keepFetching) {
        qs.set('page', String(page));
        const url = `/api/v1/persons${qs.toString() ? `?${qs.toString()}` : ''}`;

        // Debug leggero
        console.log(`usePersonFilters: fetching ${url}`);
        const resp: any = await apiGet<any>(url);
        const chunk = extractList(resp);

        // Se l'API ignora la paginazione e restituisce sempre l'intera lista, evita duplicati
        if (page === 1) {
          all = chunk;
        } else {
          // Accoda evitando duplicati per id
          const existingIds = new Set(all.map((x: any) => x.id));
          const toAdd = chunk.filter((x: any) => x && !existingIds.has(x.id));
          all = all.concat(toAdd);
        }

        // Condizioni di stop: nessun elemento o meno del limite previsto (ultima pagina)
        if (!Array.isArray(chunk) || chunk.length < LIMIT || !includeDeleted) {
          keepFetching = false;
        } else {
          page += 1;
          // Failsafe: evita eccessivo numero di richieste
          if (page > 25) keepFetching = false;
        }
      }

      const list: Person[] = mapAliases(all);

      console.log(`usePersonFilters: fetched ${list.length} persons (includeDeleted=${includeDeleted}, filterType=${filterType})`);
      if (list.length > 0) {
        console.log('usePersonFilters: sample item', list[0]);
      }

      setPersons(list);
    } catch (err) {
      console.error('Error fetching persons:', err);
      setError(err instanceof Error ? err.message : 'Errore nel caricamento delle persone');
      setPersons([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch al mount se richiesto
  useEffect(() => {
    if (autoFetch) {
      fetchPersons();
    }
  }, [autoFetch, includeDeleted]);

  return {
    persons,
    filteredPersons,
    loading,
    error,
    refetch: fetchPersons,
    setPersons,
    totalCount: persons.length,
    filteredCount: filteredPersons.length
  };
};

/**
 * Hook semplificato per employees
 */
export const useEmployees = () => {
  return usePersonFilters({ filterType: 'employees' });
};

/**
 * Hook semplificato per trainers
 */
export const useTrainers = () => {
  return usePersonFilters({ filterType: 'trainers' });
};

/**
 * Hook per tutte le persone senza filtri
 */
export const useAllPersons = () => {
  return usePersonFilters({ filterType: 'all' });
};

/**
 * Hook per tutte le persone inclusi i soft-deleted (per importazione)
 */
export const useAllPersonsForImport = () => {
  return usePersonFilters({ filterType: 'all', includeDeleted: true });
};