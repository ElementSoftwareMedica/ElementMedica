import React from 'react';
import { AlertCircle, HelpCircle, UploadCloud, Download } from 'lucide-react';
import { sanitizeErrorMessage } from '../../utils/errorUtils';

interface CSVFormatErrorProps {
  message: string;
  expectedHeaders?: string[];
  foundHeaders?: string[];
  onClose?: () => void;
  className?: string;
}

/**
 * Componente per visualizzare errori di formato CSV in modo chiaro con suggerimenti
 */
const CSVFormatError: React.FC<CSVFormatErrorProps> = ({
  message,
  expectedHeaders = [],
  foundHeaders = [],
  onClose,
  className = ''
}) => {
  return (
    <div className={`bg-red-50 border-l-4 border-red-500 p-4 rounded-md ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-red-500" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">Errore nel formato CSV</h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{sanitizeErrorMessage(message, 'Errore nel formato del file CSV')}</p>
            
            {(expectedHeaders.length > 0 || foundHeaders.length > 0) && (
              <div className="mt-3 border-t border-red-200 pt-3">
                <div className="grid grid-cols-2 gap-4">
                  {expectedHeaders.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-red-800">
                        Intestazioni attese
                      </h4>
                      <ul className="mt-1 list-disc list-inside text-xs">
                        {expectedHeaders.map((header, index) => (
                          <li key={index}>{header}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {foundHeaders.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-red-800">
                        Intestazioni trovate
                      </h4>
                      <ul className="mt-1 list-disc list-inside text-xs">
                        {foundHeaders.map((header, index) => (
                          <li key={index}>{header}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="mt-3 bg-red-100 p-3 rounded-md">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-red-800 flex items-center">
                <HelpCircle className="h-3 w-3 mr-1" />
                Suggerimenti
              </h4>
              <ul className="mt-1 list-disc list-inside text-xs space-y-1">
                <li>Verifica che il file sia in formato CSV valido</li>
                <li>Assicurati che il separatore sia il punto e virgola (;)</li>
                <li>Controlla che le intestazioni delle colonne siano corrette</li>
                <li>Assicurati che non ci siano caratteri speciali non supportati</li>
                <li>Verifica che il file non sia danneggiato</li>
              </ul>
              
              <div className="mt-3 flex flex-col space-y-2">
                <div className="flex items-center text-xs text-red-800">
                  <Download className="h-3 w-3 mr-1" />
                  <span>Scarica un template CSV corretto dalla pagina principale</span>
                </div>
                
                <div className="flex items-center text-xs text-red-800">
                  <UploadCloud className="h-3 w-3 mr-1" />
                  <button 
                    onClick={onClose}
                    className="font-medium underline hover:text-red-900"
                  >
                    Carica un nuovo file
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {onClose && (
          <button
            type="button"
            className="ml-auto flex-shrink-0 text-red-500 hover:text-red-700"
            onClick={onClose}
            aria-label="Chiudi"
          >
            <span className="sr-only">Chiudi</span>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default CSVFormatError;