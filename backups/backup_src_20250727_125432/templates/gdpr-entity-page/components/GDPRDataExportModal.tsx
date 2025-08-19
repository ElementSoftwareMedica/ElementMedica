/**
 * GDPRDataExportModal - Modal per l'esportazione dei dati GDPR
 * 
 * Componente che permette agli utenti di richiedere ed esportare
 * i propri dati personali in conformità al diritto di portabilità GDPR.
 * 
 * @version 1.0
 * @date 30 Gennaio 2025
 */

import React, { useState, useEffect } from 'react';
import { Download, FileText, Calendar, CheckCircle, AlertCircle, X, Loader } from 'lucide-react';
import { GDPRExportRequest, GDPRExportFormat, GDPRExportStatus } from '../types/gdpr.types';
import { Button } from '../../../design-system/atoms/Button';
import { Card } from '../../../design-system/molecules/Card';
import { cn } from '../../../design-system/utils';

export interface GDPRDataExportModalProps {
  /** Indica se il modal è aperto */
  isOpen: boolean;
  
  /** Callback per chiudere il modal */
  onClose: () => void;
  
  /** ID dell'entità per cui esportare i dati */
  entityId: string;
  
  /** Tipo di entità */
  entityType: string;
  
  /** Callback per avviare l'esportazione */
  onExport: (request: Omit<GDPRExportRequest, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  
  /** Lista delle richieste di esportazione esistenti */
  existingRequests?: GDPRExportRequest[];
  
  /** Stato di caricamento */
  loading?: boolean;
  
  /** Classi CSS personalizzate */
  className?: string;
}

export const GDPRDataExportModal: React.FC<GDPRDataExportModalProps> = ({
  isOpen,
  onClose,
  entityId,
  entityType,
  onExport,
  existingRequests = [],
  loading = false,
  className = ''
}) => {
  const [selectedFormat, setSelectedFormat] = useState<GDPRExportFormat>('JSON');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeAuditTrail, setIncludeAuditTrail] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form quando il modal si apre
  useEffect(() => {
    if (isOpen) {
      setSelectedFormat('JSON');
      setIncludeMetadata(true);
      setIncludeAuditTrail(false);
      setReason('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Gestisce la chiusura del modal
  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  // Gestisce l'invio della richiesta di esportazione
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      await onExport({
        entityId,
        entityType,
        format: selectedFormat,
        includeMetadata,
        includeAuditTrail,
        reason: reason.trim() || undefined
      });
      
      onClose();
    } catch (error) {
      console.error('Errore durante l\'esportazione:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ottieni la configurazione per lo stato della richiesta
  const getStatusConfig = (status: GDPRExportStatus) => {
    switch (status) {
      case 'PENDING':
        return {
          icon: Loader,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          label: 'In elaborazione'
        };
      case 'PROCESSING':
        return {
          icon: Loader,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          label: 'Elaborazione'
        };
      case 'COMPLETED':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          label: 'Completata'
        };
      case 'FAILED':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          label: 'Fallita'
        };
      default:
        return {
          icon: FileText,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          label: 'Sconosciuto'
        };
    }
  };

  // Formatta la data
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('it-IT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <Card className={cn(
          'relative w-full max-w-2xl bg-white shadow-xl',
          className
        )}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-full">
                <Download className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Esportazione Dati GDPR
                </h2>
                <p className="text-sm text-gray-500">
                  Richiedi l'esportazione dei tuoi dati personali
                </p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Contenuto */}
          <div className="p-6">
            {/* Richieste esistenti */}
            {existingRequests.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Richieste precedenti
                </h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {existingRequests.slice(0, 3).map((request) => {
                    const statusConfig = getStatusConfig(request.status);
                    const StatusIcon = statusConfig.icon;
                    
                    return (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <StatusIcon className={cn(
                            'h-4 w-4',
                            statusConfig.color,
                            request.status === 'PROCESSING' && 'animate-spin'
                          )} />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {request.format} - {formatDate(request.createdAt)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {statusConfig.label}
                            </div>
                          </div>
                        </div>
                        
                        {request.status === 'COMPLETED' && request.downloadUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(request.downloadUrl, '_blank')}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Scarica
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Form per nuova richiesta */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Formato di esportazione */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Formato di esportazione
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(['JSON', 'CSV', 'XML'] as GDPRExportFormat[]).map((format) => (
                    <label
                      key={format}
                      className={cn(
                        'relative flex cursor-pointer rounded-lg border p-4 focus:outline-none',
                        selectedFormat === format
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-300 bg-white hover:bg-gray-50'
                      )}
                    >
                      <input
                        type="radio"
                        name="format"
                        value={format}
                        checked={selectedFormat === format}
                        onChange={(e) => setSelectedFormat(e.target.value as GDPRExportFormat)}
                        className="sr-only"
                      />
                      <div className="flex items-center">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{format}</div>
                          <div className="text-gray-500">
                            {format === 'JSON' && 'Formato strutturato per sviluppatori'}
                            {format === 'CSV' && 'Formato tabellare per fogli di calcolo'}
                            {format === 'XML' && 'Formato markup strutturato'}
                          </div>
                        </div>
                      </div>
                      {selectedFormat === format && (
                        <CheckCircle className="h-5 w-5 text-blue-600 absolute top-4 right-4" />
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Opzioni di inclusione */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Dati da includere
                </label>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={includeMetadata}
                      onChange={(e) => setIncludeMetadata(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-3 text-sm text-gray-700">
                      Includi metadati (date di creazione, modifica, ecc.)
                    </span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={includeAuditTrail}
                      onChange={(e) => setIncludeAuditTrail(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-3 text-sm text-gray-700">
                      Includi audit trail (cronologia delle modifiche)
                    </span>
                  </label>
                </div>
              </div>

              {/* Motivo della richiesta */}
              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo della richiesta (opzionale)
                </label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Descrivi brevemente il motivo della richiesta di esportazione..."
                  maxLength={500}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {reason.length}/500 caratteri
                </div>
              </div>

              {/* Informazioni legali */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Informazioni importanti:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700">
                      <li>La richiesta verrà elaborata entro 30 giorni come previsto dal GDPR</li>
                      <li>Riceverai una notifica quando l'esportazione sarà pronta</li>
                      <li>I dati esportati saranno disponibili per il download per 7 giorni</li>
                      <li>L'esportazione include solo i dati associati alla tua identità</li>
                    </ul>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Annulla
            </Button>
            
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || loading}
            >
              {isSubmitting ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Elaborazione...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Richiedi esportazione
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default GDPRDataExportModal;