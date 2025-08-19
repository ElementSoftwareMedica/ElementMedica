/**
 * useGDPREntityPage Hook - Hook principale per gestione template
 * 
 * Hook che gestisce lo stato e le azioni principali del template
 * GDPR-compliant per pagine entità.
 * 
 * @version 1.0
 * @date 30 Dicembre 2024
 */

import { useState, useEffect, useCallback, useReducer } from 'react';
import { BaseEntity } from '../types/entity.types';
import { GDPREntityPageConfig, TemplateState, TemplateActions } from '../types/template.types';
import { GDPRAuditAction } from '../types/gdpr.types';
import { useGDPRAudit } from './useGDPRAudit';
import { useGDPRConsent } from './useGDPRConsent';
import { apiService } from '../../../services/api';

/**
 * Configurazione hook
 */
export interface UseGDPREntityPageConfig<T extends BaseEntity = BaseEntity> {
  /** Configurazione template */
  config: GDPREntityPageConfig<T>;
  
  /** Dati iniziali */
  initialData?: T[];
  
  /** Callback personalizzate */
  onEntityCreate?: (entity: Omit<T, 'id'>) => Promise<T>;
  onEntityUpdate?: (id: string, entity: Partial<T>) => Promise<T>;
  onEntityDelete?: (id: string) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
  
  /** Configurazione cache */
  enableCache?: boolean;
  cacheTTL?: number;
}

/**
 * Azioni del reducer
 */
type EntityPageAction<T extends BaseEntity> = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ENTITIES'; payload: T[] }
  | { type: 'ADD_ENTITY'; payload: T }
  | { type: 'UPDATE_ENTITY'; payload: { id: string; entity: Partial<T> } }
  | { type: 'REMOVE_ENTITY'; payload: string }
  | { type: 'REMOVE_ENTITIES'; payload: string[] }
  | { type: 'SET_FILTERS'; payload: Record<string, any> }
  | { type: 'SET_SORTING'; payload: { field: keyof T; direction: 'asc' | 'desc' } | null }
  | { type: 'SET_PAGINATION'; payload: { page?: number; pageSize?: number; total?: number } }
  | { type: 'SET_SELECTED_ENTITIES'; payload: T[] }
  | { type: 'SET_UI_STATE'; payload: Partial<TemplateState<T>['ui']> }
  | { type: 'RESET_STATE' };

/**
 * Reducer per gestione stato
 */
function entityPageReducer<T extends BaseEntity>(
  state: TemplateState<T>,
  action: EntityPageAction<T>
): TemplateState<T> {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
      
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
      
    case 'SET_ENTITIES':
      return {
        ...state,
        entities: action.payload,
        loading: false,
        error: null,
        pagination: {
          ...state.pagination,
          total: action.payload.length
        }
      };
      
    case 'ADD_ENTITY':
      return {
        ...state,
        entities: [...state.entities, action.payload],
        pagination: {
          ...state.pagination,
          total: state.pagination.total + 1
        }
      };
      
    case 'UPDATE_ENTITY':
      return {
        ...state,
        entities: state.entities.map(entity =>
          entity.id === action.payload.id
            ? { ...entity, ...action.payload.entity }
            : entity
        )
      };
      
    case 'REMOVE_ENTITY':
      return {
        ...state,
        entities: state.entities.filter(entity => entity.id !== action.payload),
        selectedEntities: state.selectedEntities.filter(entity => entity.id !== action.payload),
        pagination: {
          ...state.pagination,
          total: Math.max(0, state.pagination.total - 1)
        }
      };
      
    case 'REMOVE_ENTITIES':
      return {
        ...state,
        entities: state.entities.filter(entity => !action.payload.includes(entity.id)),
        selectedEntities: state.selectedEntities.filter(entity => !action.payload.includes(entity.id)),
        pagination: {
          ...state.pagination,
          total: Math.max(0, state.pagination.total - action.payload.length)
        }
      };
      
    case 'SET_FILTERS':
      return {
        ...state,
        filters: action.payload,
        pagination: { ...state.pagination, page: 1 }
      };
      
    case 'SET_SORTING':
      return { ...state, sorting: action.payload };
      
    case 'SET_PAGINATION':
      return {
        ...state,
        pagination: { ...state.pagination, ...action.payload }
      };
      
    case 'SET_SELECTED_ENTITIES':
      return { ...state, selectedEntities: action.payload };
      
    case 'SET_UI_STATE':
      return {
        ...state,
        ui: { ...state.ui, ...action.payload }
      };
      
    case 'RESET_STATE':
      return {
        entities: [],
        loading: false,
        error: null,
        selectedEntities: [],
        filters: {},
        sorting: null,
        pagination: { page: 1, pageSize: 10, total: 0 },
        ui: {
          density: 'standard',
          sidebarCollapsed: false,
          activeModal: null
        }
      };
      
    default:
      return state;
  }
}

/**
 * Hook principale per gestione template GDPR
 */
export function useGDPREntityPage<T extends BaseEntity = BaseEntity>({
  config,
  initialData,
  onEntityCreate,
  onEntityUpdate,
  onEntityDelete,
  onBulkDelete,
  enableCache = true,
  cacheTTL = 300000 // 5 minuti
}: UseGDPREntityPageConfig<T>) {
  
  // Stato iniziale
  const initialState: TemplateState<T> = {
    entities: initialData || [],
    loading: false,
    error: null,
    selectedEntities: [],
    filters: {},
    sorting: null,
    pagination: {
      page: 1,
      pageSize: config.ui.table.defaultPageSize,
      total: initialData?.length || 0
    },
    ui: {
      density: config.ui.table.defaultDensity,
      sidebarCollapsed: config.ui.layout.sidebar?.defaultCollapsed || false,
      activeModal: null
    }
  };
  
  const [state, dispatch] = useReducer(entityPageReducer<T>, initialState);
  
  // Hooks GDPR
  const { logAction } = useGDPRAudit({
    config: config.gdpr.auditConfig,
    entityType: config.entity.name
  });
  
  const { checkConsent } = useGDPRConsent({
    config: config.gdpr.consentConfig,
    personId: 'current-user' // Da implementare con context utente reale
  });
  
  // Cache per entità
  const [cache, setCache] = useState<Map<string, { data: T[]; timestamp: number }>>(new Map());
  
  // Carica entità dal server
  const loadEntities = useCallback(async (forceRefresh = false) => {
    const cacheKey = `${config.api.baseEndpoint}_${JSON.stringify(state.filters)}_${JSON.stringify(state.sorting)}`;
    
    // Verifica cache se abilitata
    if (enableCache && !forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cacheTTL) {
        dispatch({ type: 'SET_ENTITIES', payload: cached.data });
        return;
      }
    }
    
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // Log azione
      await logAction('READ' as GDPRAuditAction, undefined, {
        filters: state.filters,
        sorting: state.sorting,
        pagination: state.pagination
      });
      
      // Costruisci parametri query
      const params = new URLSearchParams();
      
      // Aggiungi filtri
      Object.entries(state.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
      
      // Aggiungi ordinamento
      if (state.sorting) {
        params.append('sortBy', state.sorting.field.toString());
        params.append('sortOrder', state.sorting.direction);
      }
      
      // Aggiungi paginazione
      params.append('page', state.pagination.page.toString());
      params.append('limit', state.pagination.pageSize.toString());
      
      // Chiamata API
      const response = await apiService.get(`${config.api.endpoints.list}?${params.toString()}`);
      
      const entities = (response as any).data || [];
      const total = (response as any).total || entities.length;
      
      // Aggiorna cache
      if (enableCache) {
        setCache(prev => new Map(prev.set(cacheKey, {
          data: entities,
          timestamp: Date.now()
        })));
      }
      
      dispatch({ type: 'SET_ENTITIES', payload: entities });
      dispatch({ type: 'SET_PAGINATION', payload: { total } });
      
    } catch (error) {
      console.error('Errore nel caricamento entità:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Errore nel caricamento dei dati' });
    }
  }, [config, state.filters, state.sorting, state.pagination, enableCache, cacheTTL, cache, logAction]);
  
  // Crea nuova entità
  const createEntity = useCallback(async (entityData: Omit<T, 'id'>): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // Verifica consensi se richiesto
      if (config.gdpr.requiresConsent && config.gdpr.consentConfig) {
        const verification = await checkConsent(config.gdpr.consentConfig.requiredConsents);
        if (!verification.hasConsent) {
          throw new Error('Consensi GDPR mancanti per questa operazione');
        }
      }
      
      let newEntity: T;
      
      if (onEntityCreate) {
        newEntity = await onEntityCreate(entityData);
      } else {
        const response = await apiService.post(config.api.endpoints.create, entityData);
        newEntity = response.data;
      }
      
      dispatch({ type: 'ADD_ENTITY', payload: newEntity });
      
      // Invalida cache
      if (enableCache) {
        setCache(new Map());
      }
      
    } catch (error) {
      console.error('Errore nella creazione entità:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Errore nella creazione dell\'elemento' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [config, onEntityCreate, checkConsent, enableCache]);
  
  // Aggiorna entità esistente
  const updateEntity = useCallback(async (id: string, entityData: Partial<T>): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // Verifica consensi se richiesto
      if (config.gdpr.requiresConsent && config.gdpr.consentConfig) {
        const verification = await checkConsent(config.gdpr.consentConfig.requiredConsents);
        if (!verification.hasConsent) {
          throw new Error('Consensi GDPR mancanti per questa operazione');
        }
      }
      
      if (onEntityUpdate) {
        await onEntityUpdate(id, entityData);
      } else {
        await apiService.put(config.api.endpoints.update.replace(':id', id), entityData);
      }
      
      dispatch({ type: 'UPDATE_ENTITY', payload: { id, entity: entityData } });
      
      // Invalida cache
      if (enableCache) {
        setCache(new Map());
      }
      
    } catch (error) {
      console.error('Errore nell\'aggiornamento entità:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Errore nell\'aggiornamento dell\'elemento' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [config, onEntityUpdate, checkConsent, enableCache]);
  
  // Elimina entità
  const deleteEntity = useCallback(async (id: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      if (onEntityDelete) {
        await onEntityDelete(id);
      } else {
        await apiService.delete(config.api.endpoints.delete.replace(':id', id));
      }
      
      dispatch({ type: 'REMOVE_ENTITY', payload: id });
      
      // Invalida cache
      if (enableCache) {
        setCache(new Map());
      }
      
    } catch (error) {
      console.error('Errore nell\'eliminazione entità:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Errore nell\'eliminazione dell\'elemento' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [config, onEntityDelete, enableCache]);
  
  // Elimina entità multiple
  const bulkDelete = useCallback(async (ids: string[]) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      if (onBulkDelete) {
        await onBulkDelete(ids);
      } else if (config.api.endpoints.bulkDelete) {
        await apiService.post(config.api.endpoints.bulkDelete, { ids });
      } else {
        // Fallback: elimina uno per uno
        await Promise.all(ids.map(id => 
          apiService.delete(config.api.endpoints.delete.replace(':id', id))
        ));
      }
      
      dispatch({ type: 'REMOVE_ENTITIES', payload: ids });
      
      // Invalida cache
      if (enableCache) {
        setCache(new Map());
      }
      
    } catch (error) {
      console.error('Errore nell\'eliminazione multipla:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Errore nell\'eliminazione degli elementi' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [config, onBulkDelete, enableCache]);
  
  // Azioni template
  const actions: TemplateActions<T> = {
    loadEntities,
    createEntity,
    updateEntity,
    deleteEntity,
    bulkDelete,
    
    setFilters: (filters) => dispatch({ type: 'SET_FILTERS', payload: filters }),
    setSorting: (field, direction) => dispatch({ type: 'SET_SORTING', payload: { field, direction } }),
    setPage: (page) => dispatch({ type: 'SET_PAGINATION', payload: { page } }),
    setPageSize: (pageSize) => dispatch({ type: 'SET_PAGINATION', payload: { pageSize, page: 1 } }),
    setSelectedEntities: (entities) => dispatch({ type: 'SET_SELECTED_ENTITIES', payload: entities }),
    
    openModal: (modalId, _data) => dispatch({ type: 'SET_UI_STATE', payload: { activeModal: modalId } }),
    closeModal: () => dispatch({ type: 'SET_UI_STATE', payload: { activeModal: null } }),
    
    requestConsent: async (consentTypes) => {
      // Implementa richiesta consenso
      console.log('Richiesta consenso:', consentTypes);
    },
    revokeConsent: async (consentTypes) => {
      // Implementa revoca consenso
      console.log('Revoca consenso:', consentTypes);
    },
    exportData: async (format) => {
      // Implementa export dati
      console.log('Export dati:', format);
    },
    requestDeletion: async (reason) => {
      // Implementa richiesta cancellazione
      console.log('Richiesta cancellazione:', reason);
    }
  };
  
  // Carica dati iniziali
  useEffect(() => {
    if (!initialData) {
      loadEntities();
    }
  }, []);
  
  // Ricarica quando cambiano filtri, ordinamento o paginazione
  useEffect(() => {
    if (!initialData) {
      loadEntities();
    }
  }, [state.filters, state.sorting, state.pagination.page, state.pagination.pageSize]);
  
  return {
    state,
    actions,
    loading: state.loading,
    error: state.error,
    
    // Utility functions
    clearError: () => dispatch({ type: 'SET_ERROR', payload: null }),
    resetState: () => dispatch({ type: 'RESET_STATE' }),
    refreshData: () => loadEntities(true),
    
    // Cache utilities
    clearCache: () => setCache(new Map()),
    getCacheSize: () => cache.size
  };
}

export default useGDPREntityPage;