/**
 * GDPR Consent Modal - Modale per gestione consensi GDPR
 * 
 * Componente per la gestione dei consensi GDPR con interfaccia
 * user-friendly e conformità normativa.
 * 
 * @version 1.0
 * @date 30 Dicembre 2024
 */

import React, { useState, useEffect } from 'react';
import { GDPRConsentConfig, GDPRConsentType, GDPRConsent } from '../types/gdpr.types';
import { Modal } from '../../../design-system/molecules/Modal';
import { Button } from '../../../design-system/atoms/Button';
import { Card } from '../../../design-system/molecules/Card';
import { Label } from '../../../design-system/atoms/Label';
// Note: Some UI components may need to be implemented or imported from alternative sources
// Switch, Badge, Separator, Alert, ScrollArea, Checkbox are not available in current design system
import { Shield, Info, Clock, AlertTriangle } from 'lucide-react';

/**
 * Props del componente GDPRConsentModal
 */
export interface GDPRConsentModalProps {
  /** Stato apertura modale */
  open: boolean;
  
  /** Callback chiusura modale */
  onClose: () => void;
  
  /** Configurazione consensi GDPR */
  config?: GDPRConsentConfig;
  
  /** Consensi attuali dell'utente */
  currentConsents: Record<string, boolean>;
  
  /** Callback per richiesta consenso */
  onConsentChange: (consentTypes: GDPRConsentType[]) => Promise<void>;
  
  /** Callback per revoca consenso */
  onConsentRevoke: (consentTypes: GDPRConsentType[]) => Promise<void>;
  
  /** Mostra solo consensi mancanti */
  showOnlyMissing?: boolean;
  
  /** Modalità sola lettura */
  readOnly?: boolean;
}

/**
 * Descrizioni dei tipi di consenso
 */
const CONSENT_DESCRIPTIONS: Record<GDPRConsentType, {
  title: string;
  description: string;
  purpose: string;
  legalBasis: string;
  icon: React.ReactNode;
}> = {
  DATA_PROCESSING: {
    title: 'Trattamento Dati Personali',
    description: 'Consenso per il trattamento dei tuoi dati personali per le finalità del servizio.',
    purpose: 'Gestione account, erogazione servizi, comunicazioni necessarie',
    legalBasis: 'Art. 6(1)(a) GDPR - Consenso dell\'interessato',
    icon: <Shield className="h-5 w-5 text-blue-600" />
  },
  DATA_STORAGE: {
    title: 'Conservazione Dati',
    description: 'Consenso per la conservazione dei dati oltre il periodo strettamente necessario.',
    purpose: 'Miglioramento servizi, analisi storiche, backup di sicurezza',
    legalBasis: 'Art. 6(1)(a) GDPR - Consenso dell\'interessato',
    icon: <Shield className="h-5 w-5 text-green-600" />
  },
  DATA_SHARING: {
    title: 'Condivisione Dati',
    description: 'Consenso per la condivisione dei dati con partner e fornitori di servizi.',
    purpose: 'Integrazione servizi, supporto tecnico, elaborazioni esterne',
    legalBasis: 'Art. 6(1)(a) GDPR - Consenso dell\'interessato',
    icon: <Shield className="h-5 w-5 text-orange-600" />
  },
  MARKETING: {
    title: 'Comunicazioni Marketing',
    description: 'Consenso per l\'invio di comunicazioni promozionali e marketing.',
    purpose: 'Newsletter, offerte commerciali, aggiornamenti prodotti',
    legalBasis: 'Art. 6(1)(a) GDPR - Consenso dell\'interessato',
    icon: <Shield className="h-5 w-5 text-purple-600" />
  },
  ANALYTICS: {
    title: 'Analisi e Statistiche',
    description: 'Consenso per l\'utilizzo dei dati a fini analitici e statistici.',
    purpose: 'Miglioramento UX, analisi comportamentali, ottimizzazione servizi',
    legalBasis: 'Art. 6(1)(a) GDPR - Consenso dell\'interessato',
    icon: <Shield className="h-5 w-5 text-cyan-600" />
  },
  PROFILING: {
    title: 'Profilazione',
    description: 'Consenso per attività di profilazione e personalizzazione.',
    purpose: 'Contenuti personalizzati, raccomandazioni, targeting',
    legalBasis: 'Art. 6(1)(a) GDPR - Consenso dell\'interessato',
    icon: <Shield className="h-5 w-5 text-red-600" />
  },
  AUTOMATED_DECISION: {
    title: 'Decisioni Automatizzate',
    description: 'Consenso per processi decisionali automatizzati che ti riguardano.',
    purpose: 'Approvazioni automatiche, scoring, classificazioni',
    legalBasis: 'Art. 22 GDPR - Decisioni automatizzate',
    icon: <Shield className="h-5 w-5 text-indigo-600" />
  }
};

/**
 * Modale per gestione consensi GDPR
 */
export function GDPRConsentModal({
  open,
  onClose,
  config,
  currentConsents,
  onConsentChange,
  onConsentRevoke,
  showOnlyMissing = false,
  readOnly = false
}: GDPRConsentModalProps) {
  
  const [pendingConsents, setPendingConsents] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [acceptAll, setAcceptAll] = useState(false);
  
  // Inizializza consensi pending con quelli attuali
  useEffect(() => {
    setPendingConsents({ ...currentConsents });
  }, [currentConsents, open]);
  
  // Aggiorna stato "Accetta tutto"
  useEffect(() => {
    if (!config) return;
    
    const allRequired = config.requiredConsents.every(type => pendingConsents[type]);
    const allOptional = config.optionalConsents?.every(type => pendingConsents[type]) ?? true;
    
    setAcceptAll(allRequired && allOptional);
  }, [pendingConsents, config]);
  
  // Consensi da mostrare
  const consentsToShow = React.useMemo(() => {
    if (!config) return [];
    
    const allConsents = [...config.requiredConsents, ...(config.optionalConsents || [])];
    
    if (showOnlyMissing) {
      return allConsents.filter(type => !currentConsents[type]);
    }
    
    return allConsents;
  }, [config, currentConsents, showOnlyMissing]);
  
  // Handler per cambio consenso singolo
  const handleConsentToggle = (consentType: GDPRConsentType, granted: boolean) => {
    setPendingConsents(prev => ({
      ...prev,
      [consentType]: granted
    }));
  };
  
  // Handler per "Accetta tutto"
  const handleAcceptAll = (accept: boolean) => {
    if (!config) return;
    
    const newConsents = { ...pendingConsents };
    
    // Imposta tutti i consensi richiesti
    config.requiredConsents.forEach(type => {
      newConsents[type] = accept;
    });
    
    // Imposta tutti i consensi opzionali
    config.optionalConsents?.forEach(type => {
      newConsents[type] = accept;
    });
    
    setPendingConsents(newConsents);
    setAcceptAll(accept);
  };
  
  // Handler per salvataggio
  const handleSave = async () => {
    if (!config) return;
    
    setLoading(true);
    
    try {
      // Identifica consensi da concedere e revocare
      const toGrant: GDPRConsentType[] = [];
      const toRevoke: GDPRConsentType[] = [];
      
      Object.entries(pendingConsents).forEach(([type, granted]) => {
        const consentType = type as GDPRConsentType;
        const currentlyGranted = currentConsents[type];
        
        if (granted && !currentlyGranted) {
          toGrant.push(consentType);
        } else if (!granted && currentlyGranted) {
          toRevoke.push(consentType);
        }
      });
      
      // Esegui operazioni
      if (toGrant.length > 0) {
        await onConsentChange(toGrant);
      }
      
      if (toRevoke.length > 0) {
        await onConsentRevoke(toRevoke);
      }
      
      onClose();
    } catch (error) {
      console.error('Errore nel salvataggio consensi:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Verifica se ci sono consensi richiesti mancanti
  const missingRequiredConsents = config?.requiredConsents.filter(type => !pendingConsents[type]) || [];
  const canSave = missingRequiredConsents.length === 0;
  
  return (
    <Modal 
      isOpen={open} 
      onClose={onClose}
      title="Gestione Consensi GDPR"
      size="xl"
      className="max-w-4xl"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Shield className="h-5 w-5" />
          Gestione Consensi GDPR
        </div>
        <p className="text-sm text-gray-600">
          Gestisci i tuoi consensi per il trattamento dei dati personali in conformità al GDPR.
          I consensi contrassegnati come obbligatori sono necessari per l'utilizzo del servizio.
        </p>
        
        <div className="max-h-[60vh] overflow-y-auto pr-4">
          <div className="space-y-6">
            {/* Informazioni generali */}
            <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <strong>I tuoi diritti:</strong> Puoi modificare o revocare i tuoi consensi in qualsiasi momento.
                La revoca non compromette la liceità del trattamento basata sul consenso prestato prima della revoca.
              </div>
            </div>
            
            {/* Controllo "Accetta tutto" */}
            {!readOnly && consentsToShow.length > 1 && (
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">Accetta tutti i consensi</Label>
                    <p className="text-sm text-gray-600">
                      Concedi tutti i consensi disponibili con un solo click
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={acceptAll}
                    onChange={(e) => handleAcceptAll(e.target.checked)}
                    disabled={loading}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
              </Card>
            )}
            
            <hr className="border-gray-200" />
            
            {/* Lista consensi */}
            <div className="space-y-4">
              {consentsToShow.map((consentType) => {
                const consentInfo = CONSENT_DESCRIPTIONS[consentType];
                const isRequired = config?.requiredConsents.includes(consentType);
                const isGranted = pendingConsents[consentType];
                const isCurrentlyGranted = currentConsents[consentType];
                
                return (
                  <Card key={consentType} className={`p-4 transition-colors ${
                    isGranted ? 'border-green-200 bg-green-50/50' : 'border-gray-200'
                  }`}>
                    <div className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {consentInfo.icon}
                          <div className="space-y-1">
                            <h3 className="text-base font-semibold flex items-center gap-2">
                              {consentInfo.title}
                              {isRequired && (
                                <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                                  Obbligatorio
                                </span>
                              )}
                              {isCurrentlyGranted && (
                                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                  Attivo
                                </span>
                              )}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {consentInfo.description}
                            </p>
                          </div>
                        </div>
                        
                        {!readOnly && (
                          <input
                            type="checkbox"
                            checked={isGranted}
                            onChange={(e) => handleConsentToggle(consentType, e.target.checked)}
                            disabled={loading || (isRequired && showOnlyMissing)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        )}
                        
                        {readOnly && (
                          <span className={`px-2 py-1 text-xs rounded ${
                            isGranted ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {isGranted ? 'Concesso' : 'Non concesso'}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="pt-0">
                      <div className="space-y-3 text-sm">
                        <div>
                          <strong>Finalità:</strong>
                          <p className="text-gray-600 mt-1">{consentInfo.purpose}</p>
                        </div>
                        
                        <div>
                          <strong>Base giuridica:</strong>
                          <p className="text-gray-600 mt-1">{consentInfo.legalBasis}</p>
                        </div>
                        
                        {config?.consentValidityDays && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Clock className="h-4 w-4" />
                            <span>Validità: {config.consentValidityDays} giorni</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
            
            {/* Avviso consensi mancanti */}
            {missingRequiredConsents.length > 0 && (
              <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <strong>Attenzione:</strong> Alcuni consensi obbligatori non sono stati concessi.
                  È necessario concedere tutti i consensi obbligatori per utilizzare il servizio.
                </div>
              </div>
            )}
            
            {/* Informazioni aggiuntive */}
            {config?.requiresReconfirmation && (
              <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <strong>Riconferma periodica:</strong> Ti verrà richiesto di riconfermare i tuoi consensi
                  ogni {config.reconfirmationIntervalDays} giorni per garantire che siano sempre aggiornati.
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annulla
          </Button>
          
          {!readOnly && (
            <Button
              onClick={handleSave}
              disabled={!canSave || loading}
              className="min-w-[120px]"
            >
              {loading ? 'Salvataggio...' : 'Salva Consensi'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default GDPRConsentModal;