/**
 * useGDPREntityOperations Hook - Hook per operazioni CRUD con supporto GDPR
 * 
 * Hook che gestisce le operazioni CRUD (Create, Read, Update, Delete)
 * con controlli di consenso GDPR e audit logging.
 * 
 * @version 1.0
 * @date 30 Dicembre 2024
 */

import { useState, useCallback, useRef } from 'react';
import {
  BaseEntity,
  EntityOperationResult,
  EntityAPIConfig,
  EntityPermissions
} from '../types/entity.types';
import {
  GDPRConfig,
  GDPRConsentType
} from '../types/gdpr.types';
import { useGDPRConsent } from './useGDPRConsent';
import { useGDPRAudit } from './useGDPRAudit';
import { apiService } from '../../../services/api';

/**
 * Configurazione hook operazioni
 */
export interface UseGDPREntityOperationsConfig<T extends BaseEntity> {
  /** Configurazione API */
  apiConfig: EntityAPIConfig;
  
  /** Configurazione GDPR */
  gdprConfig?: GDPRConfig;
  
  /** Permessi richiesti */
  permissions: EntityPermissions;
  
  /** Tipo di entità */
  entityType: string;
  
  /** Validatore personalizzato */
  validator?: (entity: Partial<T>) => Promise<string[]>;
  
  /** Trasformatore dati pre-salvataggio */
  dataTransformer?: (entity: Partial<T>) => Partial<T>;
  
  /** Callback post-operazione */
  onOperationComplete?: (operation: string, result: EntityOperationResult<T>) => void;
  
  /** Abilita cache locale */
  enableCache?: boolean;
  
  /** TTL cache (ms) */
  cacheTTL?: number;
}

/**
 * Stato operazioni
 */
interface OperationsState<T extends BaseEntity> {
  loading: boolean;
  saving: boolean;
  deleting: boolean;
  error: string | null;
  lastOperation: string | null;
  cache: Map<string, { data: T; timestamp: number }>;
  optimisticUpdates: Map<string, Partial<T>>;
}

/**
 * Opzioni operazione
 */
interface OperationOptions {
  /** Richiedi consenso esplicito */
  requireConsent?: boolean;
  
  /** Tipi di consenso richiesti */
  consentTypes?: GDPRConsentType[];
  
  /** Motivo dell'operazione */
  reason?: string;
  
  /** Metadati aggiuntivi */
  metadata?: Record<string, unknown>;
  
  /** Bypass cache */
  bypassCache?: boolean;
  
  /** Update ottimistico */
  optimistic?: boolean;
  
  /** Validazione personalizzata */
  skipValidation?: boolean;
}

/**
 * Hook per operazioni CRUD con supporto GDPR
 */
export function useGDPREntityOperations<T extends BaseEntity>({
  apiConfig,
  gdprConfig,
  permissions,
  entityType,
  validator,
  dataTransformer,
  onOperationComplete,
  enableCache = true,
  cacheTTL = 300000 // 5 minuti
}: UseGDPREntityOperationsConfig<T>) {
  
  const [state, setState] = useState<OperationsState<T>>({
    loading: false,
    saving: false,
    deleting: false,
    error: null,
    lastOperation: null,
    cache: new Map(),
    optimisticUpdates: new Map()
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Hook GDPR
  const { checkConsent, requestConsent } = useGDPRConsent({
    config: gdprConfig?.consentConfig,
    personId: 'current-user' // TODO: Ottenere dall'auth context
  });
  
  const { logGDPROperation } = useGDPRAudit({
    config: gdprConfig?.auditConfig,
    entityType
  });
  
  // Verifica permessi
  const checkPermissions = useCallback((operation: string): boolean => {
    switch (operation) {
      case 'create':
        return permissions.create.length > 0;
      case 'read':
        return permissions.read.length > 0;
      case 'update':
        return permissions.update.length > 0;
      case 'delete':
        return permissions.delete.length > 0;
      case 'export':
        return permissions.export?.length > 0 || false;
      case 'import':
        return permissions.import?.length > 0 || false;
      default:
        return false;
    }
  }, [permissions]);
  
  // Verifica consensi GDPR
  const checkGDPRConsents = useCallback(async (
    operation: string,
    consentTypes?: GDPRConsentType[]
  ): Promise<boolean> => {
    if (!gdprConfig?.consentConfig || !consentTypes?.length) return true;
    
    // Verifica tutti i consensi richiesti
    const verification = await checkConsent(consentTypes);
    
    // Se ci sono consensi mancanti o scaduti, richiedili
    const missingOrExpired = [...verification.missingConsents, ...verification.expiredConsents];
    
    if (missingOrExpired.length > 0) {
      // Richiedi consensi mancanti/scaduti
      await requestConsent(missingOrExpired, {
        purpose: `Operazione ${operation} su ${entityType}`,
        legalBasis: 'legitimate_interest'
      });
    }
    
    return verification.hasConsent;
  }, [gdprConfig, checkConsent, requestConsent, entityType]);
  
  // Valida entità
  const validateEntity = useCallback(async (entity: Partial<T>): Promise<string[]> => {
    const errors: string[] = [];
    
    // Validazione base
    if (!entity) {
      errors.push('Entità non valida');
      return errors;
    }
    
    // Validazione personalizzata
    if (validator) {
      const customErrors = await validator(entity);
      errors.push(...customErrors);
    }
    
    return errors;
  }, [validator]);
  
  // Gestione cache
  const getCachedEntity = useCallback((id: string): T | null => {
    if (!enableCache) return null;
    
    const cached = state.cache.get(id);
    if (!cached) return null;
    
    // Verifica TTL
    if (Date.now() - cached.timestamp > cacheTTL) {
      state.cache.delete(id);
      return null;
    }
    
    return cached.data;
  }, [enableCache, cacheTTL, state.cache]);
  
  const setCachedEntity = useCallback((entity: T) => {
    if (!enableCache || !entity.id) return;
    
    setState(prev => {
      const newCache = new Map(prev.cache);
      newCache.set(entity.id!, {
        data: entity,
        timestamp: Date.now()
      });
      
      return {
        ...prev,
        cache: newCache
      };
    });
  }, [enableCache]);
  
  // Applica update ottimistico
  const applyOptimisticUpdate = useCallback((id: string, updates: Partial<T>) => {
    setState(prev => {
      const newOptimistic = new Map(prev.optimisticUpdates);
      newOptimistic.set(id, { ...newOptimistic.get(id), ...updates });
      
      return {
        ...prev,
        optimisticUpdates: newOptimistic
      };
    });
  }, []);
  
  // Rimuovi update ottimistico
  const removeOptimisticUpdate = useCallback((id: string) => {
    setState(prev => {
      const newOptimistic = new Map(prev.optimisticUpdates);
      newOptimistic.delete(id);
      
      return {
        ...prev,
        optimisticUpdates: newOptimistic
      };
    });
  }, []);
  
  // Cancella operazione in corso
  const cancelOperation = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    setState(prev => ({
      ...prev,
      loading: false,
      saving: false,
      deleting: false
    }));
  }, []);
  
  // CREATE - Crea nuova entità
  const createEntity = useCallback(async (
    entityData: Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
    options: OperationOptions = {}
  ): Promise<EntityOperationResult<T>> => {
    try {
      // Verifica permessi
      if (!checkPermissions('create')) {
        throw new Error('Permessi insufficienti per creare l\'entità');
      }
      
      // Verifica consensi GDPR
      await checkGDPRConsents('create', options.consentTypes);
      
      setState(prev => ({ ...prev, saving: true, error: null, lastOperation: 'create' }));
      
      // Validazione
      if (!options.skipValidation) {
        const errors = await validateEntity(entityData as Partial<T>);
        if (errors.length > 0) {
          throw new Error(`Errori di validazione: ${errors.join(', ')}`);
        }
      }
      
      // Trasformazione dati
      let processedData = entityData;
      if (dataTransformer) {
        processedData = dataTransformer(entityData as Partial<T>) as Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
      }
      
      // Abort controller
      abortControllerRef.current = new AbortController();
      
      // Log operazione GDPR
      const gdprResult = await logGDPROperation({
        operation: 'CREATE',
        entityType,
        data: processedData,
        reason: options.reason || 'Creazione nuova entità',
        riskLevel: 'MEDIUM',
        metadata: options.metadata
      });
      
      if (!gdprResult.success) {
        throw new Error('Errore nel logging GDPR');
      }
      
      // Chiamata API
      const response = await apiService.post(
        apiConfig.endpoints.create,
        processedData,
        {
          signal: abortControllerRef.current.signal,
          ...apiConfig.defaultOptions
        }
      ) as { data: T };
      
      const createdEntity = response.data;
      
      // Aggiorna cache
      setCachedEntity(createdEntity);
      
      const result: EntityOperationResult<T> = {
        success: true,
        data: createdEntity,
        operation: 'create'
      };
      
      setState(prev => ({ ...prev, saving: false }));
      
      // Callback
      onOperationComplete?.('create', result);
      
      return result;
      
    } catch (error: unknown) {
       const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
       setState(prev => ({
         ...prev,
         saving: false,
         error: errorMessage
       }));
       
       const result: EntityOperationResult<T> = {
         success: false,
         errors: [errorMessage],
         operation: 'create'
       };
      
      onOperationComplete?.('create', result);
      
      return result;
    } finally {
      abortControllerRef.current = null;
    }
  }, [
    checkPermissions,
    checkGDPRConsents,
    validateEntity,
    dataTransformer,
    logGDPROperation,
    apiConfig,
    entityType,
    setCachedEntity,
    onOperationComplete
  ]);
  
  // READ - Leggi entità
  const readEntity = useCallback(async (
    id: string,
    options: OperationOptions = {}
  ): Promise<EntityOperationResult<T>> => {
    try {
      // Verifica permessi
      if (!checkPermissions('read')) {
        throw new Error('Permessi insufficienti per leggere l\'entità');
      }
      
      // Verifica cache
      if (!options.bypassCache) {
        const cached = getCachedEntity(id);
        if (cached) {
          return {
            success: true,
            data: cached,
            operation: 'read'
          };
        }
      }
      
      setState(prev => ({ ...prev, loading: true, error: null, lastOperation: 'read' }));
      
      // Abort controller
      abortControllerRef.current = new AbortController();
      
      // Chiamata API
      const response = await apiService.get(
        `${apiConfig.endpoints.list}/${id}`,
        {
          signal: abortControllerRef.current.signal,
          ...apiConfig.defaultOptions
        }
      ) as { data: T };
      
      const entity = response.data;
      
      // Aggiorna cache
      setCachedEntity(entity);
      
      const result: EntityOperationResult<T> = {
        success: true,
        data: entity,
        operation: 'read'
      };
      
      setState(prev => ({ ...prev, loading: false }));
      
      onOperationComplete?.('read', result);
      
      return result;
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      
      const result: EntityOperationResult<T> = {
        success: false,
        errors: [errorMessage],
        operation: 'read'
      };
      
      onOperationComplete?.('read', result);
      
      return result;
    } finally {
      abortControllerRef.current = null;
    }
  }, [
    checkPermissions,
    getCachedEntity,
    apiConfig,
    setCachedEntity,
    onOperationComplete
  ]);
  
  // UPDATE - Aggiorna entità
  const updateEntity = useCallback(async (
    id: string,
    updates: Partial<T>,
    options: OperationOptions = {}
  ): Promise<EntityOperationResult<T>> => {
    try {
      // Verifica permessi
      if (!checkPermissions('update')) {
        throw new Error('Permessi insufficienti per aggiornare l\'entità');
      }
      
      // Verifica consensi GDPR
      await checkGDPRConsents('update', options.consentTypes);
      
      setState(prev => ({ ...prev, saving: true, error: null, lastOperation: 'update' }));
      
      // Ottieni dati correnti per audit
      const currentResult = await readEntity(id, { bypassCache: true });
      if (!currentResult.success) {
        throw new Error('Impossibile ottenere i dati correnti dell\'entità');
      }
      
      const currentData = currentResult.data!;
      
      // Update ottimistico
      if (options.optimistic) {
        applyOptimisticUpdate(id, updates);
      }
      
      // Validazione
      if (!options.skipValidation) {
        const mergedData = { ...currentData, ...updates };
        const errors = await validateEntity(mergedData);
        if (errors.length > 0) {
          if (options.optimistic) {
            removeOptimisticUpdate(id);
          }
          throw new Error(`Errori di validazione: ${errors.join(', ')}`);
        }
      }
      
      // Trasformazione dati
      let processedUpdates = updates;
      if (dataTransformer) {
        processedUpdates = dataTransformer(updates);
      }
      
      // Abort controller
      abortControllerRef.current = new AbortController();
      
      // Log operazione GDPR
      const gdprResult = await logGDPROperation({
        operation: 'UPDATE',
        entityType,
        entityId: id,
        data: processedUpdates,
        reason: options.reason || 'Aggiornamento entità',
        riskLevel: 'MEDIUM',
        metadata: {
          ...options.metadata,
          oldData: currentData
        }
      });
      
      if (!gdprResult.success) {
        if (options.optimistic) {
          removeOptimisticUpdate(id);
        }
        throw new Error('Errore nel logging GDPR');
      }
      
      // Chiamata API
      const response = await apiService.put(
          `${apiConfig.endpoints.update}/${id}`,
          processedUpdates
        ) as { data: T };
      
      const updatedEntity = response.data;
      
      // Rimuovi update ottimistico e aggiorna cache
      if (options.optimistic) {
        removeOptimisticUpdate(id);
      }
      setCachedEntity(updatedEntity);
      
      const result: EntityOperationResult<T> = {
        success: true,
        data: updatedEntity,
        operation: 'update'
      };
      
      setState(prev => ({ ...prev, saving: false }));
      
      onOperationComplete?.('update', result);
      
      return result;
      
    } catch (error: unknown) {
      // Rimuovi update ottimistico in caso di errore
      if (options.optimistic) {
        removeOptimisticUpdate(id);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      setState(prev => ({
        ...prev,
        saving: false,
        error: errorMessage
      }));
      
      const result: EntityOperationResult<T> = {
        success: false,
        errors: [errorMessage],
        operation: 'update'
      };
      
      onOperationComplete?.('update', result);
      
      return result;
    } finally {
      abortControllerRef.current = null;
    }
  }, [
    checkPermissions,
    checkGDPRConsents,
    readEntity,
    applyOptimisticUpdate,
    removeOptimisticUpdate,
    validateEntity,
    dataTransformer,
    logGDPROperation,
    apiConfig,
    entityType,
    setCachedEntity,
    onOperationComplete
  ]);
  
  // DELETE - Elimina entità
  const deleteEntity = useCallback(async (
    id: string,
    options: OperationOptions = {}
  ): Promise<EntityOperationResult<void>> => {
    try {
      // Verifica permessi
      if (!checkPermissions('delete')) {
        throw new Error('Permessi insufficienti per eliminare l\'entità');
      }
      
      // Verifica consensi GDPR (diritto all'oblio)
      await checkGDPRConsents('delete', options.consentTypes || ['DATA_PROCESSING']);
      
      setState(prev => ({ ...prev, deleting: true, error: null, lastOperation: 'delete' }));
      
      // Ottieni dati correnti per audit
      const currentResult = await readEntity(id, { bypassCache: true });
      const currentData = currentResult.success ? currentResult.data : null;
      
      // Abort controller
      abortControllerRef.current = new AbortController();
      
      // Log operazione GDPR
      const gdprResult = await logGDPROperation({
        operation: 'DELETE',
        entityType,
        entityId: id,
        data: currentData,
        reason: options.reason || 'Eliminazione entità',
        riskLevel: 'HIGH',
        metadata: options.metadata
      });
      
      if (!gdprResult.success) {
        throw new Error('Errore nel logging GDPR');
      }
      
      // Chiamata API
        await apiService.delete(`${apiConfig.endpoints.delete}/${id}`);
      
      // Rimuovi da cache
      setState(prev => {
        const newCache = new Map(prev.cache);
        newCache.delete(id);
        
        const newOptimistic = new Map(prev.optimisticUpdates);
        newOptimistic.delete(id);
        
        return {
          ...prev,
          cache: newCache,
          optimisticUpdates: newOptimistic,
          deleting: false
        };
      });
      
      const result: EntityOperationResult<void> = {
        success: true,
        operation: 'delete'
      };
      
      onOperationComplete?.('delete', result as EntityOperationResult<T>);
      
      return result;
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      setState(prev => ({
        ...prev,
        deleting: false,
        error: errorMessage
      }));
      
      const result: EntityOperationResult<void> = {
        success: false,
        errors: [errorMessage],
        operation: 'delete'
      };
      
      onOperationComplete?.('delete', result as EntityOperationResult<T>);
      
      return result;
    } finally {
      abortControllerRef.current = null;
    }
  }, [
    checkPermissions,
    checkGDPRConsents,
    readEntity,
    logGDPROperation,
    apiConfig,
    entityType,
    onOperationComplete
  ]);
  
  // Bulk operations
  const bulkDelete = useCallback(async (
    ids: string[],
    options: OperationOptions = {}
  ): Promise<EntityOperationResult<{ deleted: string[]; failed: string[] }>> => {
    const deleted: string[] = [];
    const failed: string[] = [];
    
    for (const id of ids) {
      try {
        const result = await deleteEntity(id, options);
        if (result.success) {
          deleted.push(id);
        } else {
          failed.push(id);
        }
      } catch {
        failed.push(id);
      }
    }
    
    return {
      success: failed.length === 0,
      data: { deleted, failed },
      operation: 'bulk_delete',
      errors: failed.length > 0 ? [`Fallite ${failed.length} eliminazioni`] : undefined
    };
  }, [deleteEntity]);
  
  // Clear cache
  const clearCache = useCallback(() => {
    setState(prev => ({
      ...prev,
      cache: new Map(),
      optimisticUpdates: new Map()
    }));
  }, []);
  
  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);
  
  return {
    // Stato
    loading: state.loading,
    saving: state.saving,
    deleting: state.deleting,
    error: state.error,
    lastOperation: state.lastOperation,
    
    // Operazioni CRUD
    createEntity,
    readEntity,
    updateEntity,
    deleteEntity,
    bulkDelete,
    
    // Utility
    cancelOperation,
    clearCache,
    clearError,
    getCachedEntity,
    
    // Stato cache
    cacheSize: state.cache.size,
    optimisticUpdatesCount: state.optimisticUpdates.size,
    
    // Configurazione
    permissions,
    entityType,
    isGDPREnabled: !!gdprConfig
  };
}

export default useGDPREntityOperations;