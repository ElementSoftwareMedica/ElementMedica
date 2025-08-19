/**
 * GDPRAuditPanel - Pannello per visualizzare e gestire l'audit trail GDPR
 * 
 * Componente che mostra la cronologia delle azioni GDPR per un'entità,
 * permettendo di visualizzare, filtrare e esportare i log di audit.
 * 
 * @version 1.0
 * @date 30 Gennaio 2025
 */

import React, { useState, useEffect } from 'react';
import { Calendar, Download, Filter, Search, Eye } from 'lucide-react';
import { GDPRAuditLogEntry, GDPRAuditAction } from '../types/gdpr.types';
import { Button } from '../../../design-system/atoms/Button';
import { Card } from '../../../design-system/molecules/Card';
import { SearchBar } from '../../../design-system/molecules/SearchBar';
import { cn } from '../../../design-system/utils';

export interface GDPRAuditPanelProps {
  /** ID dell'entità per cui mostrare l'audit trail */
  entityId: string;
  
  /** Tipo di entità */
  entityType: string;
  
  /** Log di audit da visualizzare */
  auditLogs?: GDPRAuditLogEntry[];
  
  /** Callback per caricare più log */
  onLoadMore?: () => void;
  
  /** Callback per esportare i log */
  onExport?: (logs: GDPRAuditLogEntry[]) => void;
  
  /** Stato di caricamento */
  loading?: boolean;
  
  /** Classi CSS personalizzate */
  className?: string;
}

export const GDPRAuditPanel: React.FC<GDPRAuditPanelProps> = ({
  entityId,
  entityType,
  auditLogs,
  onLoadMore,
  onExport,
  loading = false,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<GDPRAuditAction | 'all'>('all');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // Filtra i log in base ai criteri di ricerca
  const filteredLogs = (auditLogs || []).filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ipAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userAgent?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = selectedAction === 'all' || log.action === selectedAction;
    
    return matchesSearch && matchesAction;
  });

  // Formatta la data per la visualizzazione
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('it-IT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(date));
  };

  // Ottieni il colore per il tipo di azione
  const getActionColor = (action: GDPRAuditAction) => {
    switch (action) {
      case 'VIEW':
        return 'bg-blue-100 text-blue-800';
      case 'CREATE':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-yellow-100 text-yellow-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      case 'EXPORT':
        return 'bg-purple-100 text-purple-800';
      case 'CONSENT_GIVEN':
        return 'bg-emerald-100 text-emerald-800';
      case 'CONSENT_REVOKED':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Gestisce l'espansione/contrazione dei dettagli del log
  const toggleLogExpansion = (logId: string) => {
    setExpandedLog(expandedLog === logId ? null : logId);
  };

  return (
    <Card className={cn('p-6', className)}>
      {/* Header del pannello */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            Audit Trail GDPR
          </h3>
          <span className="text-sm text-gray-500">
            ({filteredLogs.length} di {(auditLogs || []).length} log)
          </span>
        </div>
        
        {onExport && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport(filteredLogs)}
            disabled={filteredLogs.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Esporta
          </Button>
        )}
      </div>

      {/* Controlli di filtro */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Cerca nei log di audit..."
            className="w-full"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value as GDPRAuditAction | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tutte le azioni</option>
            <option value="VIEW">Visualizzazione</option>
            <option value="CREATE">Creazione</option>
            <option value="UPDATE">Modifica</option>
            <option value="DELETE">Eliminazione</option>
            <option value="EXPORT">Esportazione</option>
            <option value="CONSENT_GIVEN">Consenso dato</option>
            <option value="CONSENT_REVOKED">Consenso revocato</option>
          </select>
        </div>
      </div>

      {/* Lista dei log */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Caricamento log...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {(auditLogs || []).length === 0 
                ? 'Nessun log di audit disponibile'
                : 'Nessun log corrisponde ai criteri di ricerca'
              }
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              {/* Riga principale del log */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    getActionColor(log.action)
                  )}>
                    {log.action}
                  </span>
                  
                  <div className="text-sm">
                    <span className="font-medium text-gray-900">
                      {formatDate(log.timestamp)}
                    </span>
                    {log.ipAddress && (
                      <span className="text-gray-500 ml-2">
                        da {log.ipAddress}
                      </span>
                    )}
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleLogExpansion(log.id)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>

              {/* Dettagli espansi */}
              {expandedLog === log.id && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">ID Sessione:</span>
                      <span className="ml-2 text-gray-600">{log.sessionId || 'N/A'}</span>
                    </div>
                    
                    <div>
                      <span className="font-medium text-gray-700">User Agent:</span>
                      <span className="ml-2 text-gray-600 truncate" title={log.userAgent}>
                        {log.userAgent || 'N/A'}
                      </span>
                    </div>
                    
                    {log.oldData && (
                      <div className="md:col-span-2">
                        <span className="font-medium text-gray-700">Dati precedenti:</span>
                        <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                          {JSON.stringify(log.oldData, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {log.newData && (
                      <div className="md:col-span-2">
                        <span className="font-medium text-gray-700">Nuovi dati:</span>
                        <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                          {JSON.stringify(log.newData, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {log.metadata && (
                      <div className="md:col-span-2">
                        <span className="font-medium text-gray-700">Metadati:</span>
                        <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pulsante per caricare più log */}
      {onLoadMore && !loading && filteredLogs.length > 0 && (
        <div className="text-center mt-6">
          <Button
            variant="outline"
            onClick={onLoadMore}
          >
            Carica altri log
          </Button>
        </div>
      )}
    </Card>
  );
};

export default GDPRAuditPanel;