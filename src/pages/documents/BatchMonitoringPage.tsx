/**
 * Batch Monitoring Page
 * 
 * Page for monitoring batch document generation jobs.
 * Displays active and recent batches with status, progress, and actions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader,
  ChevronDown,
  ChevronRight,
  FileText,
  Mail
} from 'lucide-react';
import { documentService } from '../../services/documentService';
import type { BatchStatusResponse, GeneratedDocument } from '../../types/templates';

interface BatchJob {
  batchId: string;
  status: BatchStatusResponse;
  documents: GeneratedDocument[];
  expanded: boolean;
  generatedAt: Date;
}

const BatchMonitoringPage: React.FC = () => {
  const [batches, setBatches] = useState<BatchJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 secondi

  // Stati per filtri
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'failed'>('all');
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());

  /**
   * Load batch jobs
   */
  const loadBatches = useCallback(async () => {
    try {
      setError(null);

      // Get all documents grouped by batchId
      const response = await documentService.list({ limit: 1000 });

      // Group documents by batchId
      const batchMap = new Map<string, GeneratedDocument[]>();
      response.data.forEach(doc => {
        if (doc.batchId) {
          if (!batchMap.has(doc.batchId)) {
            batchMap.set(doc.batchId, []);
          }
          batchMap.get(doc.batchId)!.push(doc);
        }
      });

      // Get status for each batch
      const batchJobs: BatchJob[] = [];
      for (const [batchId, docs] of batchMap.entries()) {
        try {
          const status = await documentService.getBatchStatus(batchId);
          batchJobs.push({
            batchId,
            status,
            documents: docs,
            expanded: expandedBatches.has(batchId),
            generatedAt: new Date(docs[0].generatedAt),
          });
        } catch (err) {
        }
      }

      // Sort by date (most recent first)
      batchJobs.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());

      setBatches(batchJobs);
    } catch (err: unknown) {
      setError('Errore durante il caricamento dei batch');
    } finally {
      setLoading(false);
    }
  }, [expandedBatches]);

  /**
   * Auto-refresh effect
   */
  useEffect(() => {
    loadBatches();

    if (autoRefresh) {
      const interval = setInterval(loadBatches, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, loadBatches]);

  /**
   * Toggle batch expansion
   */
  const toggleBatchExpansion = (batchId: string) => {
    setExpandedBatches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(batchId)) {
        newSet.delete(batchId);
      } else {
        newSet.add(batchId);
      }
      return newSet;
    });
  };

  /**
   * Get status color
   */
  const getStatusColor = (status: BatchStatusResponse): string => {
    if (status.failed > 0) return 'text-red-600';
    if (status.completed === status.total) return 'text-green-600';
    return 'text-blue-600';
  };

  /**
   * Get status icon
   */
  const getStatusIcon = (status: BatchStatusResponse) => {
    if (status.failed > 0) return <AlertCircle className="w-5 h-5 text-red-600" />;
    if (status.completed === status.total) return <CheckCircle className="w-5 h-5 text-green-600" />;
    return <Loader className="w-5 h-5 text-blue-600 animate-spin" />;
  };

  /**
   * Filter batches
   */
  const filteredBatches = batches.filter(batch => {
    if (statusFilter === 'all') return true;

    if (statusFilter === 'active') {
      return batch.status.inProgress > 0;
    }

    if (statusFilter === 'completed') {
      return batch.status.completed === batch.status.total && batch.status.failed === 0;
    }

    if (statusFilter === 'failed') {
      return batch.status.failed > 0;
    }

    return true;
  });

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Caricamento batch...</p>
        </div>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-medium text-red-800 mb-1">Errore</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button
            onClick={loadBatches}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm font-medium transition-colors"
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">Monitoraggio Batch</h1>
        <p className="text-gray-600 dark:text-gray-400">Monitora lo stato dei batch di generazione documenti</p>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-black/30 border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          {/* Filters */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Stato:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50"
            >
              <option value="all">Tutti</option>
              <option value="active">In Corso</option>
              <option value="completed">Completati</option>
              <option value="failed">Con Errori</option>
            </select>
          </div>

          {/* Auto-refresh controls */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700"
              />
              <span className="text-gray-700 dark:text-gray-300">Auto-refresh</span>
            </label>

            {autoRefresh && (
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50"
              >
                <option value={3000}>3s</option>
                <option value={5000}>5s</option>
                <option value={10000}>10s</option>
                <option value={30000}>30s</option>
              </select>
            )}

            <button
              onClick={loadBatches}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Aggiorna
            </button>
          </div>
        </div>
      </div>

      {/* Batch list */}
      {filteredBatches.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">Nessun batch trovato</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {statusFilter !== 'all'
              ? 'Prova a cambiare i filtri o aggiorna la pagina'
              : 'I batch di generazione documenti appariranno qui'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBatches.map(batch => {
            const isExpanded = expandedBatches.has(batch.batchId);
            const isActive = batch.status.inProgress > 0;
            const hasErrors = batch.status.failed > 0;

            return (
              <div
                key={batch.batchId}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-black/30 border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {/* Batch header */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Status icon and info */}
                    <div className="flex items-start gap-3 flex-1">
                      {getStatusIcon(batch.status)}

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900 dark:text-gray-50">
                            Batch #{batch.batchId.slice(0, 8)}
                          </h3>
                          <span className={`text-sm font-medium ${getStatusColor(batch.status)}`}>
                            {isActive ? 'In corso' : hasErrors ? 'Completato con errori' : 'Completato'}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {new Date(batch.generatedAt).toLocaleString('it-IT')}
                          </span>
                          <span>{batch.status.total} documenti</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress stats */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <div className="text-green-600 font-medium">
                          {batch.status.completed} completati
                        </div>
                        {batch.status.failed > 0 && (
                          <div className="text-red-600">
                            {batch.status.failed} falliti
                          </div>
                        )}
                        {batch.status.inProgress > 0 && (
                          <div className="text-blue-600">
                            {batch.status.inProgress} in corso
                          </div>
                        )}
                      </div>

                      {/* Expand button */}
                      <button
                        onClick={() => toggleBatchExpansion(batch.batchId)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                      <span>Progresso</span>
                      <span className="font-medium">{Math.round(batch.status.percentage)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${hasErrors ? 'bg-red-500' : isActive ? 'bg-blue-500' : 'bg-green-500'
                          }`}
                        style={{ width: `${batch.status.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-700/50">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-50 mb-3">
                      Documenti ({batch.documents.length})
                    </h4>

                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {batch.documents.map(doc => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 text-sm"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-gray-50">{doc.filename}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {doc.entityType} • {doc.entityId}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {doc.status === 'GENERATED' && (
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                Generato
                              </span>
                            )}
                            {doc.status === 'ARCHIVED' && (
                              <span className="flex items-center gap-1 text-red-600">
                                <X className="w-4 h-4" />
                                Archiviato
                              </span>
                            )}
                            {doc.status === 'DRAFT' && (
                              <span className="flex items-center gap-1 text-gray-600">
                                <Clock className="w-4 h-4" />
                                Bozza
                              </span>
                            )}
                            {doc.status === 'SENT' && (
                              <span className="flex items-center gap-1 text-blue-600">
                                <Mail className="w-4 h-4" />
                                Inviato
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BatchMonitoringPage;
