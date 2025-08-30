import React, { useState, useEffect } from 'react';
import { 
  Cookie,
  Settings,
  X
} from 'lucide-react';
import { PublicButton } from './PublicButton';
import { PublicBadge } from './PublicBadge';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

/**
 * Consent Banner per il frontend pubblico
 * Gestisce consensi GDPR in modo elegante e poco invasivo
 */
export const ConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Sempre true, non modificabile
    analytics: false,
    marketing: false
  });

  useEffect(() => {
    // Controlla se l'utente ha già dato il consenso
    const cookieConsent = localStorage.getItem('cookie-consent');
    if (!cookieConsent) {
      // Mostra il banner dopo un breve delay per non essere invasivo
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('cookie-consent', JSON.stringify(allAccepted));
    setIsVisible(false);
    
    // Qui potresti inizializzare i servizi di analytics/marketing
    initializeServices(allAccepted);
  };

  const handleAcceptSelected = () => {
    const selectedPreferences = {
      ...preferences,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('cookie-consent', JSON.stringify(selectedPreferences));
    setIsVisible(false);
    
    initializeServices(selectedPreferences);
  };

  const handleRejectAll = () => {
    const onlyNecessary = {
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('cookie-consent', JSON.stringify(onlyNecessary));
    setIsVisible(false);
  };

  const initializeServices = (consent: CookiePreferences & { timestamp?: string }) => {
    // Qui inizializzeresti i servizi basati sui consensi
    if (consent.analytics) {
      // Inizializza Google Analytics, etc.
      console.log('Analytics enabled');
    }
    if (consent.marketing) {
      // Inizializza pixel di marketing, etc.
      console.log('Marketing enabled');
    }
  };

  const togglePreference = (key: keyof CookiePreferences) => {
    if (key === 'necessary') return; // Non modificabile
    
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
      <div className="container mx-auto px-4 py-4">
        {!showSettings ? (
          // Banner principale
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="bg-gray-100 p-2 rounded-full">
                <Cookie className="w-6 h-6 text-gray-700 flex-shrink-0" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">
                    Utilizziamo i cookie
                  </h3>
                  <PublicBadge variant="blue" size="sm">GDPR</PublicBadge>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Utilizziamo cookie tecnici necessari per il funzionamento del sito e, 
                  con il tuo consenso, cookie di analisi e marketing per migliorare i nostri servizi.
                  <button 
                    onClick={() => setShowSettings(true)}
                    className="text-gray-700 hover:text-gray-900 underline ml-1 font-medium"
                  >
                    Personalizza le preferenze
                  </button>
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 lg:flex-shrink-0">
              <PublicButton
                variant="outline"
                size="sm"
                onClick={handleRejectAll}
                className="text-gray-600 border-gray-300 hover:bg-gray-50"
              >
                Solo necessari
              </PublicButton>
              <PublicButton
                variant="primary"
                size="sm"
                onClick={handleAcceptAll}
              >
                Accetta tutti
              </PublicButton>
            </div>
          </div>
        ) : (
          // Pannello impostazioni
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-gray-100 p-1.5 rounded-full">
                  <Settings className="w-5 h-5 text-gray-700" />
                </div>
                <h3 className="font-semibold text-gray-900">
                  Preferenze Cookie
                </h3>
                <PublicBadge variant="gray" size="sm">Personalizza</PublicBadge>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Cookie necessari */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Cookie Necessari</h4>
                  <p className="text-sm text-gray-600">
                    Essenziali per il funzionamento del sito
                  </p>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 mr-2">Sempre attivi</span>
                  <div className="w-10 h-6 bg-green-600 rounded-full flex items-center justify-end px-1">
                    <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                  </div>
                </div>
              </div>
              
              {/* Cookie analytics */}
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Cookie di Analisi</h4>
                  <p className="text-sm text-gray-600">
                    Ci aiutano a migliorare il sito analizzando l'utilizzo
                  </p>
                </div>
                <button
                  onClick={() => togglePreference('analytics')}
                  className={`w-10 h-6 rounded-full flex items-center transition-colors ${
                    preferences.analytics 
                      ? 'bg-green-600 justify-end' 
                      : 'bg-gray-300 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full mx-1 shadow-sm"></div>
                </button>
              </div>
              
              {/* Cookie marketing */}
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Cookie di Marketing</h4>
                  <p className="text-sm text-gray-600">
                    Per mostrarti contenuti personalizzati e pubblicità rilevante
                  </p>
                </div>
                <button
                  onClick={() => togglePreference('marketing')}
                  className={`w-10 h-6 rounded-full flex items-center transition-colors ${
                    preferences.marketing 
                      ? 'bg-green-600 justify-end' 
                      : 'bg-gray-300 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full mx-1 shadow-sm"></div>
                </button>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <PublicButton
                variant="outline"
                size="sm"
                onClick={handleRejectAll}
                className="text-gray-600 border-gray-300 hover:bg-gray-50"
              >
                Rifiuta tutti
              </PublicButton>
              <PublicButton
                variant="primary"
                size="sm"
                onClick={handleAcceptSelected}
                className="flex-1"
              >
                Salva preferenze
              </PublicButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsentBanner;