/**
 * GDPRDeletionRequestModal - Modal per la richiesta di cancellazione dati GDPR
 * 
 * Componente che permette agli utenti di richiedere la cancellazione
 * dei propri dati personali in conformità al diritto all'oblio GDPR.
 * 
 * @version 1.0
 * @date 30 Gennaio 2025
 */

import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, CheckCircle, Clock, X, Loader, Shield } from 'lucide-react';
import { GDPRDeletionRequest, GDPRDeletionReason, GDPRDeletionStatus } from '../types/gdpr.types';
import { Button } from '../../../design-system/atoms/Button';
import { Card } from '../../../design-system/molecules/Card';
import { cn } from '../../../design-system/utils';

export interface GDPRDeletionRequestModalProps {
  /** Indica se il modal è aperto */
  isOpen: boolean;
  
  /** Callback per chiudere il modal */
  onClose: () => void;
  
  /** ID dell'entità da cancellare */
  entityId: string;
  
  /** Tipo di entità */
  entityType: string;
  
  /** Callback per avviare la richiesta di cancellazione */
  onSubmitDeletion: (request: Omit<GDPRDeletionRequest, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  
  /** Lista delle richieste di cancellazione esistenti */
  existingRequests?: GDPRDeletionRequest[];
  
  /** Indica se ci sono dati che non possono essere cancellati */
  hasRetentionConstraints?: boolean;
  
  /** Dettagli sui vincoli di conservazione */
  retentionDetails?: string[];
  
  /** Stato di caricamento */
  loading?: boolean;
  
  /** Classi CSS personalizzate */
  className?: string;
}

export const GDPRDeletionRequestModal: React.FC<GDPRDeletionRequestModalProps> = ({
  isOpen,
  onClose,
  entityId,
  entityType,
  onSubmitDeletion,
  existingRequests = [],
  hasRetentionConstraints = false,
  retentionDetails = [],
  loading = false,
  className = ''
}) => {
  const [selectedReason, setSelectedReason] = useState<GDPRDeletionReason>('NO_LONGER_NECESSARY');
  const [customReason, setCustomReason] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<'reason' | 'confirmation' | 'review'>('reason');

  const CONFIRMATION_TEXT = 'CANCELLA I MIEI DATI';

  // Reset form quando il modal si apre
  useEffect(() => {
    if (isOpen) {
      setSelectedReason('NO_LONGER_NECESSARY');
      setCustomReason('');
      setConfirmationText('');
      setHasConfirmed(false);
      setIsSubmitting(false);
      setCurrentStep('reason');
    }
  }, [isOpen]);

  // Gestisce la chiusura del modal
  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  // Gestisce l'invio della richiesta di cancellazione
  const handleSubmit = async () => {
    if (isSubmitting || !hasConfirmed) return;
    
    setIsSubmitting(true);
    
    try {
      await onSubmitDeletion({
        entityId,
        entityType,
        reason: selectedReason,
        customReason: selectedReason === 'OTHER' ? customReason.trim() : undefined,
        requestedAt: new Date()
      });
      
      onClose();
    } catch (error) {
      console.error('Errore durante la richiesta di cancellazione:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ottieni la configurazione per lo stato della richiesta
  const getStatusConfig = (status: GDPRDeletionStatus) => {
    switch (status) {
      case 'PENDING':
        return {
          icon: Clock,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          label: 'In attesa'
        };
      case 'UNDER_REVIEW':
        return {
          icon: Loader,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          label: 'In revisione'
        };
      case 'APPROVED':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          label: 'Approvata'
        };
      case 'COMPLETED':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          label: 'Completata'
        };
      case 'REJECTED':
        return {
          icon: X,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          label: 'Rifiutata'
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          label: 'Sconosciuto'
        };
    }
  };

  // Ottieni la descrizione per il motivo di cancellazione
  const getReasonDescription = (reason: GDPRDeletionReason) => {
    switch (reason) {
      case 'NO_LONGER_NECESSARY':
        return 'I dati non sono più necessari per gli scopi originali';
      case 'WITHDRAW_CONSENT':
        return 'Ritiro il consenso al trattamento dei dati';
      case 'UNLAWFUL_PROCESSING':
        return 'I dati sono stati trattati in modo illecito';
      case 'LEGAL_OBLIGATION':
        return 'Cancellazione richiesta per obbligo legale';
      case 'OTHER':
        return 'Altro motivo (specificare)';
      default:
        return '';
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

  // Verifica se può procedere al passo successivo
  const canProceed = () => {
    if (currentStep === 'reason') {
      return selectedReason !== 'OTHER' || customReason.trim().length > 0;
    }
    if (currentStep === 'confirmation') {
      return confirmationText === CONFIRMATION_TEXT;
    }
    return hasConfirmed;
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
              <div className="p-2 bg-red-50 rounded-full">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Richiesta Cancellazione Dati
                </h2>
                <p className="text-sm text-gray-500">
                  Diritto all'oblio secondo il GDPR
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
                            statusConfig.color
                          )} />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {formatDate(request.createdAt)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {statusConfig.label} - {getReasonDescription(request.reason)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Vincoli di conservazione */}
            {hasRetentionConstraints && (
              <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-2">Vincoli di conservazione attivi:</p>
                    <ul className="list-disc list-inside space-y-1 text-yellow-700">
                      {retentionDetails.map((detail, index) => (
                        <li key={index}>{detail}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs">
                      Alcuni dati potrebbero non essere cancellabili immediatamente per motivi legali.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Selezione motivo */}
            {currentStep === 'reason' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Motivo della richiesta di cancellazione
                  </h3>
                  
                  <div className="space-y-3">
                    {(['NO_LONGER_NECESSARY', 'WITHDRAW_CONSENT', 'UNLAWFUL_PROCESSING', 'LEGAL_OBLIGATION', 'OTHER'] as GDPRDeletionReason[]).map((reason) => (
                      <label
                        key={reason}
                        className={cn(
                          'relative flex cursor-pointer rounded-lg border p-4 focus:outline-none',
                          selectedReason === reason
                            ? 'border-red-600 bg-red-50'
                            : 'border-gray-300 bg-white hover:bg-gray-50'
                        )}
                      >
                        <input
                          type="radio"
                          name="reason"
                          value={reason}
                          checked={selectedReason === reason}
                          onChange={(e) => setSelectedReason(e.target.value as GDPRDeletionReason)}
                          className="sr-only"
                        />
                        <div className="flex items-center w-full">
                          <div className="text-sm flex-1">
                            <div className="font-medium text-gray-900">
                              {getReasonDescription(reason)}
                            </div>
                          </div>
                        </div>
                        {selectedReason === reason && (
                          <CheckCircle className="h-5 w-5 text-red-600 absolute top-4 right-4" />
                        )}
                      </label>
                    ))}
                  </div>

                  {selectedReason === 'OTHER' && (
                    <div className="mt-4">
                      <label htmlFor="customReason" className="block text-sm font-medium text-gray-700 mb-2">
                        Specifica il motivo
                      </label>
                      <textarea
                        id="customReason"
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                        placeholder="Descrivi il motivo della richiesta di cancellazione..."
                        maxLength={500}
                        required
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        {customReason.length}/500 caratteri
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Conferma */}
            {currentStep === 'confirmation' && (
              <div className="space-y-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="text-sm text-red-800">
                      <p className="font-medium mb-2">Attenzione: Azione irreversibile</p>
                      <ul className="list-disc list-inside space-y-1 text-red-700">
                        <li>Questa azione cancellerà permanentemente i tuoi dati</li>
                        <li>Non sarà possibile recuperare i dati una volta cancellati</li>
                        <li>Alcuni dati potrebbero essere conservati per motivi legali</li>
                        <li>La cancellazione potrebbe richiedere fino a 30 giorni</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmation" className="block text-sm font-medium text-gray-700 mb-2">
                    Per confermare, digita: <span className="font-mono font-bold">{CONFIRMATION_TEXT}</span>
                  </label>
                  <input
                    id="confirmation"
                    type="text"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder={CONFIRMATION_TEXT}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Revisione finale */}
            {currentStep === 'review' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Riepilogo richiesta
                  </h3>
                  
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <span className="font-medium text-gray-700">Motivo:</span>
                      <span className="ml-2 text-gray-600">
                        {getReasonDescription(selectedReason)}
                      </span>
                    </div>
                    
                    {selectedReason === 'OTHER' && customReason && (
                      <div>
                        <span className="font-medium text-gray-700">Dettagli:</span>
                        <span className="ml-2 text-gray-600">{customReason}</span>
                      </div>
                    )}
                    
                    <div>
                      <span className="font-medium text-gray-700">Entità:</span>
                      <span className="ml-2 text-gray-600">{entityType} (ID: {entityId})</span>
                    </div>
                  </div>
                </div>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={hasConfirmed}
                    onChange={(e) => setHasConfirmed(e.target.checked)}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700">
                    Confermo di voler procedere con la cancellazione dei miei dati personali
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200">
            <div className="flex space-x-2">
              {currentStep !== 'reason' && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (currentStep === 'confirmation') setCurrentStep('reason');
                    if (currentStep === 'review') setCurrentStep('confirmation');
                  }}
                  disabled={isSubmitting}
                >
                  Indietro
                </Button>
              )}
            </div>
            
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Annulla
              </Button>
              
              {currentStep === 'review' ? (
                <Button
                  variant="destructive"
                  onClick={handleSubmit}
                  disabled={!canProceed() || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                      Elaborazione...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Conferma cancellazione
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    if (currentStep === 'reason') setCurrentStep('confirmation');
                    if (currentStep === 'confirmation') setCurrentStep('review');
                  }}
                  disabled={!canProceed()}
                >
                  Continua
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default GDPRDeletionRequestModal;