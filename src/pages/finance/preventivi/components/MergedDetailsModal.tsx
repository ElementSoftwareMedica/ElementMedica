/**
 * MergedDetailsModal Component
 * 
 * Modal that displays details of merged preventivi.
 * Extracted from PreventiviPage.tsx as part of Project 46 modularization.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  X, 
  Layers, 
  FileText 
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Preventivo, TIPO_SERVIZIO_CONFIG } from '../types';

interface MergedVoce {
  originalPreventivoId?: string;
  originalNumero?: string;
  titoloServizio?: string;
  descrizioneServizio?: string;
  tipoServizio?: string;
  prezzoUnitario?: number;
  quantita?: number;
  prezzoTotale?: number;
  scontoTotale?: number;
  descrizione?: string;
  importo?: number;
}

interface MergedDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preventivo: Preventivo | null;
}

const MergedDetailsModal: React.FC<MergedDetailsModalProps> = ({ 
  isOpen, 
  onClose, 
  preventivo 
}) => {
  if (!isOpen || !preventivo) return null;

  const mergedFromIds = preventivo.dettagliServizio?.mergedFromIds || [];
  const mergedFromNumeri = preventivo.dettagliServizio?.mergedFromNumeri || [];
  const mergedAt = preventivo.dettagliServizio?.mergedAt;
  const voci: MergedVoce[] = preventivo.dettagliServizio?.voci || [];

  // Calculate totals from voci
  const totalePreventivi = voci.reduce(
    (sum, v) => sum + Number(v.prezzoTotale || v.importo || 0), 
    0
  );
  const totaleSconti = voci.reduce(
    (sum, v) => sum + Number(v.scontoTotale || 0), 
    0
  );

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-purple-50">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Layers className="h-5 w-5 text-purple-600" />
            Preventivo Unificato
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-purple-100 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[65vh]">
          {/* Info preventivo corrente */}
          <div className="mb-6 bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-400" />
                <span className="font-mono font-bold text-lg text-gray-900">
                  {preventivo.numero}
                </span>
              </div>
              <span className="text-lg font-bold text-green-600">
                € {Number(preventivo.importoFinale || 0).toFixed(2)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Cliente:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {preventivo.azienda?.ragioneSociale || 
                   `${preventivo.persona?.firstName} ${preventivo.persona?.lastName}` || 
                   '-'}
                </span>
              </div>
              {mergedAt && (
                <div>
                  <span className="text-gray-500">Unificato il:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {format(new Date(mergedAt), 'dd/MM/yyyy HH:mm', { locale: it })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Preventivi originali con dettagli completi */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs">
                {voci.length || mergedFromNumeri.length}
              </span>
              Preventivi originali uniti:
            </h3>
            <div className="space-y-3">
              {voci.length > 0 ? (
                // Se abbiamo le voci dettagliate
                voci.map((voce, index) => {
                  const tipoConfig = TIPO_SERVIZIO_CONFIG[voce.tipoServizio || 'ALTRO'] || 
                                     TIPO_SERVIZIO_CONFIG.ALTRO;
                  const TipoIcon = tipoConfig.icon;

                  return (
                    <div 
                      key={index} 
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100">
                            <span className="text-sm font-bold text-purple-700">
                              {index + 1}
                            </span>
                          </div>
                          <div>
                            <span className="font-mono font-medium text-gray-900">
                              {voce.originalNumero || mergedFromNumeri[index] || '-'}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <TipoIcon className={`h-3.5 w-3.5 ${tipoConfig.color}`} />
                              <span className="text-xs text-gray-500">{tipoConfig.label}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900">
                            € {Number(voce.prezzoTotale || voce.importo || 0).toFixed(2)}
                          </div>
                          {Number(voce.scontoTotale) > 0 && (
                            <div className="text-xs text-red-500">
                              -€ {Number(voce.scontoTotale).toFixed(2)} sconto
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="ml-11">
                        <p className="text-sm font-medium text-gray-700">
                          {voce.titoloServizio || '-'}
                        </p>
                        {voce.descrizioneServizio && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {voce.descrizioneServizio}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span>Qta: {voce.quantita || 1}</span>
                          <span>
                            Prezzo unit.: € {Number(voce.prezzoUnitario || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                // Fallback se non abbiamo le voci dettagliate
                mergedFromNumeri.map((numero: string, index: number) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-lg"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100">
                      <span className="text-sm font-bold text-purple-700">{index + 1}</span>
                    </div>
                    <div>
                      <span className="font-mono font-medium text-gray-900">{numero}</span>
                      {mergedFromIds[index] && (
                        <span className="ml-2 text-xs text-gray-400">
                          ID: {mergedFromIds[index].slice(0, 8)}...
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Riepilogo totali */}
          <div className="bg-purple-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-purple-700 mb-3">Riepilogo</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Totale preventivi originali:</span>
                <span className="font-medium text-gray-900">
                  € {totalePreventivi.toFixed(2)}
                </span>
              </div>
              {totaleSconti > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Totale sconti:</span>
                  <span className="font-medium text-red-600">
                    -€ {totaleSconti.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-purple-200">
                <span className="font-semibold text-gray-700">Imponibile:</span>
                <span className="font-bold text-gray-900">
                  € {Number(preventivo.imponibile || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">
                  IVA ({preventivo.aliquotaIva || 22}%):
                </span>
                <span className="font-medium text-gray-900">
                  € {Number(preventivo.importoIva || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-purple-200">
                <span className="font-bold text-purple-700">Totale unificato:</span>
                <span className="font-bold text-lg text-purple-700">
                  € {Number(preventivo.importoFinale || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <Button variant="outline" onClick={onClose}>Chiudi</Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MergedDetailsModal;
