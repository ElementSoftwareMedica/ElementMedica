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

/** Formati possibili di risposta dall'API /api/v1/persons */
interface PersonsApiResponse {
  persons?: Record<string, unknown>[];
  data?: { persons?: Record<string, unknown>[] } | Record<string, unknown>[];
  items?: Record<string, unknown>[];
  results?: Record<string, unknown>[];
  rows?: Record<string, unknown>[];
}

type PersonsResponse = Record<string, unknown>[] | PersonsApiResponse;

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
  const extractList = (resp: PersonsResponse): Record<string, unknown>[] => {
    if (!resp) return [];
    if (Array.isArray(resp)) return resp;
    const r = resp as PersonsApiResponse;
    if (Array.isArray(r?.persons)) return r.persons!; // Risposta paginata v1
    if (r?.data && !Array.isArray(r.data) && Array.isArray((r.data as { persons?: Record<string, unknown>[] }).persons)) return (r.data as { persons: Record<string, unknown>[] }).persons; // Variante annidata
    if (Array.isArray(r?.data)) return r.data as Record<string, unknown>[]; // Risposta con data: []
    if (Array.isArray(r?.items)) return r.items!; // Risposta con items: []
    if (Array.isArray(r?.results)) return r.results!; // Variante results: []
    if (Array.isArray(r?.rows)) return r.rows!; // Variante rows: []
    return [];
  };

  // Normalizza alias dei campi lato frontend per consistenza
  // P59: Aggiunge mapping personRoles -> roles per compatibilità con filterPersonsByRoleLevel
  const mapAliases = (items: Record<string, unknown>[]): Person[] => {
    return items.map((p: Record<string, unknown>) => {
      // Preserva il valore se già presente, altrimenti usa alias conosciuti
      const taxCode = (p.taxCode ?? p.codiceFiscale ?? p.fiscalCode ?? p.codice_fiscale ?? p.fiscal_code ?? p.cf) as string | undefined;
      // P59: Il backend restituisce personRoles, ma filterPersonsByRoleLevel usa roles
      const roles = (p.roles ?? p.personRoles ?? []) as string[];
      return {
        ...p,
        ...(taxCode ? { taxCode } : {}),
        roles // P59: Assicura che roles sia sempre presente per il filtro client-side
      } as unknown as Person;
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
      let all: Record<string, unknown>[] = [];
      let keepFetching = true;

      while (keepFetching) {
        qs.set('page', String(page));
        const url = `/api/v1/persons${qs.toString() ? `?${qs.toString()}` : ''}`;

        // fetch persons page
        const resp = await apiGet<PersonsResponse>(url);
        const chunk = extractList(resp);

        // Se l'API ignora la paginazione e restituisce sempre l'intera lista, evita duplicati
        if (page === 1) {
          all = chunk;
        } else {
          // Accoda evitando duplicati per id
          const existingIds = new Set(all.map((x) => x.id));
          const toAdd = chunk.filter((x) => x && !existingIds.has(x.id));
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

      if (list.length > 0) {
      }

      setPersons(list);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error fetching persons:', err);
      setError('Errore nel caricamento delle persone');
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