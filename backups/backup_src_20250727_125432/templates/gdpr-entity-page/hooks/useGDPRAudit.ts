/**
 * useGDPRAudit Hook - Hook per gestione audit GDPR
 * 
 * Hook che gestisce il logging delle azioni e l'audit trail
 * per la conformità GDPR.
 * 
 * @version 1.0
 * @date 30 Dicembre 2024
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  GDPRAuditConfig,
  GDPRAuditAction,
  GDPRAuditLogEntry,
  GDPRAuditLevel,
  GDPRAwareOperation,
  GDPROperationResult
} from '../types/gdpr.types';
import { apiService } from '../../../services/api';

/**
 * Configurazione hook audit
 */
export interface UseGDPRAuditConfig {
  /** Configurazione audit GDPR */
  config?: GDPRAuditConfig;
  
  /** Tipo di entità */
  entityType: string;
  
  /** ID della persona (utente corrente) */
  personId?: string;
  
  /** Livello di audit override */
  auditLevel?: GDPRAuditLevel;
  
  /** Abilita audit automatico */
  autoAudit?: boolean;
  
  /** Buffer size per batch logging */
  bufferSize?: number;
  
  /** Intervallo flush buffer (ms) */
  flushInterval?: number;
}

/**
 * Stato audit
 */
interface AuditState {
  auditLog: GDPRAuditLogEntry[];
  loading: boolean;
  error: string | null;
  lastSync: Date | null;
  pendingEntries: GDPRAuditLogEntry[];
  stats: {
    totalEntries: number;
    successfulOperations: number;
    failedOperations: number;
    lastWeekEntries: number;
  };
}

/**
 * Metadati browser per audit
 */
interface BrowserMetadata {
  userAgent: string;
  ipAddress?: string;
  sessionId?: string;
  timestamp: Date;
  timezone: string;
  language: string;
  screen: {
    width: number;
    height: number;
    colorDepth: number;
  };
}

/**
 * Hook per gestione audit GDPR
 */
export function useGDPRAudit({
  config,
  entityType,
  personId = 'current-user', // Da implementare con context utente reale
  auditLevel,
  autoAudit = true,
  bufferSize = 10,
  flushInterval = 30000 // 30 secondi
}: UseGDPRAuditConfig) {
  
  const [state, setState] = useState<AuditState>({
    auditLog: [],
    loading: false,
    error: null,
    lastSync: null,
    pendingEntries: [],
    stats: {
      totalEntries: 0,
      successfulOperations: 0,
      failedOperations: 0,
      lastWeekEntries: 0
    }
  });
  
  const bufferRef = useRef<GDPRAuditLogEntry[]>([]);
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string>(generateSessionId());
  
  // Genera session ID univoco
  function generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Ottieni metadati browser
  const getBrowserMetadata = useCallback((): BrowserMetadata => {
    return {
      userAgent: navigator.userAgent,
      sessionId: sessionIdRef.current,
      timestamp: new Date(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth
      }
    };
  }, []);
  
  // Determina se un'azione deve essere loggata
  const shouldLogAction = useCallback((action: GDPRAuditAction): boolean => {
    if (!config || !autoAudit) return false;
    
    const level = auditLevel || 'standard';
    
    switch (level) {
      case 'minimal':
        return config.minimalActions.includes(action);
      case 'standard':
        return config.standardActions.includes(action);
      case 'comprehensive':
        return config.comprehensiveActions.includes(action);
      default:
        return false;
    }
  }, [config, auditLevel, autoAudit]);
  
  // Crea entry di audit
  const createAuditEntry = useCallback((
    action: GDPRAuditAction,
    entityId?: string,
    data?: any,
    oldData?: any,
    success: boolean = true,
    errorMessage?: string,
    reason?: string
  ): GDPRAuditLogEntry => {
    const metadata = getBrowserMetadata();
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Calcola changes se disponibili oldData e newData
    let changes: Record<string, { from: any; to: any }> | undefined;
    if (oldData && data && typeof data === 'object' && typeof oldData === 'object') {
      changes = {};
      Object.keys({ ...oldData, ...data }).forEach(key => {
        if (oldData[key] !== data[key]) {
          changes![key] = {
            from: oldData[key],
            to: data[key]
          };
        }
      });
    }
    
    const entry: GDPRAuditLogEntry = {
      id,
      personId,
      action,
      entityType,
      entityId,
      timestamp: metadata.timestamp,
      success,
      oldData,
      newData: data,
      changes,
      reason,
      errorMessage,
      metadata: {
        sessionId: metadata.sessionId,
        timezone: metadata.timezone,
        language: metadata.language,
        screen: metadata.screen
      }
    };
    
    // Aggiungi metadati opzionali se configurati
    if (config?.includeUserAgent) {
      entry.userAgent = metadata.userAgent;
    }
    
    if (config?.includeIpAddress) {
      // L'IP address dovrebbe essere aggiunto dal backend
      entry.ipAddress = 'to-be-set-by-backend';
    }
    
    if (config?.includeSessionId) {
      entry.sessionId = metadata.sessionId;
    }
    
    return entry;
  }, [config, entityType, personId, getBrowserMetadata]);
  
  // Flush buffer al server
  const flushBuffer = useCallback(async () => {
    if (bufferRef.current.length === 0) return;
    
    const entriesToSend = [...bufferRef.current];
    bufferRef.current = [];
    
    try {
      await apiService.post('/api/gdpr/audit/batch', {
        entries: entriesToSend
      });
      
      setState(prev => ({
        ...prev,
        lastSync: new Date(),
        stats: {
          ...prev.stats,
          totalEntries: prev.stats.totalEntries + entriesToSend.length,
          successfulOperations: prev.stats.successfulOperations + entriesToSend.filter(e => e.success).length,
          failedOperations: prev.stats.failedOperations + entriesToSend.filter(e => !e.success).length
        }
      }));
      
    } catch (error) {
      console.error('Errore nel flush audit buffer:', error);
      
      // Rimetti le entries nel buffer
      bufferRef.current = [...entriesToSend, ...bufferRef.current];
      
      setState(prev => ({
        ...prev,
        error: 'Errore nella sincronizzazione audit log'
      }));
    }
  }, []);
  
  // Aggiungi entry al buffer
  const addToBuffer = useCallback((entry: GDPRAuditLogEntry) => {
    bufferRef.current.push(entry);
    
    // Aggiungi anche al log locale
    setState(prev => ({
      ...prev,
      auditLog: [entry, ...prev.auditLog].slice(0, 100), // Mantieni solo le ultime 100 entries localmente
      pendingEntries: [...prev.pendingEntries, entry]
    }));
    
    // Flush se buffer è pieno
    if (bufferRef.current.length >= bufferSize) {
      flushBuffer();
    }
    
    // Reset timeout flush
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
    }
    
    flushTimeoutRef.current = setTimeout(flushBuffer, flushInterval);
  }, [bufferSize, flushInterval, flushBuffer]);
  
  // Log azione principale
  const logAction = useCallback(async (
    action: GDPRAuditAction,
    entityId?: string,
    data?: any,
    oldData?: any,
    options?: {
      reason?: string;
      success?: boolean;
      errorMessage?: string;
      metadata?: Record<string, any>;
      immediate?: boolean;
    }
  ) => {
    if (!shouldLogAction(action)) return;
    
    const entry = createAuditEntry(
      action,
      entityId,
      data,
      oldData,
      options?.success ?? true,
      options?.errorMessage,
      options?.reason
    );
    
    // Aggiungi metadati personalizzati
    if (options?.metadata) {
      entry.metadata = { ...entry.metadata, ...options.metadata };
    }
    
    if (options?.immediate) {
      // Invio immediato
      try {
        await apiService.post('/api/gdpr/audit', entry);
        
        setState(prev => ({
          ...prev,
          auditLog: [entry, ...prev.auditLog].slice(0, 100),
          lastSync: new Date(),
          stats: {
            ...prev.stats,
            totalEntries: prev.stats.totalEntries + 1,
            successfulOperations: entry.success ? prev.stats.successfulOperations + 1 : prev.stats.successfulOperations,
            failedOperations: !entry.success ? prev.stats.failedOperations + 1 : prev.stats.failedOperations
          }
        }));
        
      } catch (error) {
        console.error('Errore nel logging immediato:', error);
        // Fallback al buffer
        addToBuffer(entry);
      }
    } else {
      // Aggiungi al buffer
      addToBuffer(entry);
    }
  }, [shouldLogAction, createAuditEntry, addToBuffer]);
  
  // Log operazione GDPR-aware
  const logGDPROperation = useCallback(async <T = any>(
    operation: GDPRAwareOperation<T>
  ): Promise<GDPROperationResult<T>> => {
    const startTime = Date.now();
    
    try {
      // Log inizio operazione
      await logAction(
        operation.operation,
        operation.entityId,
        operation.data,
        undefined,
        {
          reason: operation.reason,
          metadata: {
            ...operation.metadata,
            riskLevel: operation.riskLevel,
            startTime
          }
        }
      );
      
      // Qui andrebbe eseguita l'operazione reale
      // Per ora simuliamo il successo
      const result: GDPROperationResult<T> = {
        success: true,
        data: operation.data,
        auditLogId: `audit-${Date.now()}`,
        metadata: {
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
      
      // Log completamento operazione
      await logAction(
        operation.operation,
        operation.entityId,
        result.data,
        operation.data,
        {
          success: true,
          metadata: {
            ...operation.metadata,
            duration: result.metadata?.duration,
            auditLogId: result.auditLogId
          }
        }
      );
      
      return result;
      
    } catch (error: any) {
      // Log errore operazione
      await logAction(
        operation.operation,
        operation.entityId,
        operation.data,
        undefined,
        {
          success: false,
          errorMessage: error.message,
          metadata: {
            ...operation.metadata,
            duration: Date.now() - startTime,
            stackTrace: config?.includeStackTrace ? error.stack : undefined
          }
        }
      );
      
      return {
        success: false,
        errors: [error.message],
        metadata: {
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
    }
  }, [logAction, config]);
  
  // Carica storico audit
  const loadAuditHistory = useCallback(async (
    filters?: {
      startDate?: Date;
      endDate?: Date;
      actions?: GDPRAuditAction[];
      entityId?: string;
      success?: boolean;
      limit?: number;
      offset?: number;
    }
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const params = new URLSearchParams();
      
      if (filters?.startDate) {
        params.append('startDate', filters.startDate.toISOString());
      }
      
      if (filters?.endDate) {
        params.append('endDate', filters.endDate.toISOString());
      }
      
      if (filters?.actions) {
        filters.actions.forEach(action => params.append('actions', action));
      }
      
      if (filters?.entityId) {
        params.append('entityId', filters.entityId);
      }
      
      if (filters?.success !== undefined) {
        params.append('success', filters.success.toString());
      }
      
      params.append('entityType', entityType);
      params.append('personId', personId);
      params.append('limit', (filters?.limit || 50).toString());
      params.append('offset', (filters?.offset || 0).toString());
      
      const response = await apiService.get(`/api/gdpr/audit?${params.toString()}`);
      
      setState(prev => ({
        ...prev,
        auditLog: (response as any).data || [],
        loading: false,
        stats: {
          ...prev.stats,
          totalEntries: (response as any).total || 0,
          lastWeekEntries: (response as any).lastWeekCount || 0
        }
      }));
      
    } catch (error) {
      console.error('Errore nel caricamento audit history:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Errore nel caricamento dello storico audit'
      }));
    }
  }, [entityType, personId]);
  
  // Export audit log
  const exportAuditLog = useCallback(async (
    format: 'json' | 'csv' | 'xlsx' = 'json',
    filters?: Parameters<typeof loadAuditHistory>[0]
  ): Promise<Blob> => {
    const params = new URLSearchParams();
    params.append('format', format);
    params.append('entityType', entityType);
    params.append('personId', personId);
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }
    
    const response = await apiService.get(
      `/api/gdpr/audit/export?${params.toString()}`,
      { responseType: 'blob' }
    );
    
    return (response as any).data;
  }, [entityType, personId]);
  
  // Cleanup e flush finale
  useEffect(() => {
    return () => {
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
      
      // Flush finale
      if (bufferRef.current.length > 0) {
        flushBuffer();
      }
    };
  }, [flushBuffer]);
  
  // Carica statistiche iniziali
  useEffect(() => {
    if (autoAudit) {
      loadAuditHistory({ limit: 10 });
    }
  }, [autoAudit, loadAuditHistory]);
  
  return {
    // Stato
    auditLog: state.auditLog,
    loading: state.loading,
    error: state.error,
    lastSync: state.lastSync,
    pendingEntries: state.pendingEntries,
    stats: state.stats,
    
    // Azioni
    logAction,
    logGDPROperation,
    loadAuditHistory,
    exportAuditLog,
    flushBuffer,
    
    // Utility
    getAuditHistory: () => state.auditLog,
    getPendingCount: () => bufferRef.current.length,
    clearError: () => setState(prev => ({ ...prev, error: null })),
    
    // Configurazione
    isAuditEnabled: autoAudit && !!config,
    currentAuditLevel: auditLevel || 'standard',
    sessionId: sessionIdRef.current
  };
}

export default useGDPRAudit;