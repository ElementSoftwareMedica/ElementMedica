/**
 * ConvenzionePicker - Convenzione and discount code selection component
 * @module pages/clinica/agenda/components/modals/AppointmentBookingModal/ConvenzionePicker
 */

import React from 'react';
import { Check, RefreshCw, AlertTriangle } from 'lucide-react';

import { ElegantSelect } from '@/components/ui/ElegantSelect';
import type { ConvenzionePickerProps } from './types';

export const ConvenzionePicker: React.FC<ConvenzionePickerProps> = ({
    selectedConvenzione,
    setSelectedConvenzione,
    codiceSconto,
    setCodiceSconto,
    scontoValidato,
    setScontoValidato,
    isValidatingSconto,
    handleValidateSconto,
    filteredConvenzioni,
    selectedPrestazione,
    selectedBundle,
    convenzioneWarning
}) => {
    return (
        <>
            {/* Convenzione Warning */}
            {convenzioneWarning && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    {convenzioneWarning}
                </div>
            )}

            {/* Convenzione e Sconto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Convenzione */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Convenzione {(selectedPrestazione || selectedBundle) && filteredConvenzioni.length > 0 && (
                            <span className="text-xs text-gray-400 ml-1">({filteredConvenzioni.length} disponibili)</span>
                        )}
                    </label>
                    <select
                        value={selectedConvenzione?.id || ''}
                        onChange={(e) => {
                            const conv = filteredConvenzioni.find(c => c.id === e.target.value);
                            setSelectedConvenzione(conv || null);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    >
                        <option value="">Nessuna convenzione</option>
                        {filteredConvenzioni.map(conv => (
                            <option key={conv.id} value={conv.id}>
                                {conv.nome} ({conv.codice})
                            </option>
                        ))}
                    </select>
                    {(selectedPrestazione || selectedBundle) && filteredConvenzioni.length === 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                            Nessuna convenzione disponibile per questa {selectedBundle ? 'offerta' : 'prestazione'}
                        </p>
                    )}
                </div>

                {/* Codice Sconto */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Codice Sconto
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={codiceSconto}
                            onChange={(e) => {
                                setCodiceSconto(e.target.value.toUpperCase());
                                setScontoValidato(null);
                            }}
                            placeholder="Es: SCONTO20"
                            className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${scontoValidato?.valid === true ? 'border-green-500 bg-green-50' :
                                scontoValidato?.valid === false ? 'border-red-500 bg-red-50' :
                                    'border-gray-300'
                                }`}
                        />
                        <button
                            type="button"
                            onClick={handleValidateSconto}
                            disabled={!codiceSconto.trim() || isValidatingSconto}
                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm disabled:opacity-50"
                        >
                            {isValidatingSconto ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                                <Check className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                    {scontoValidato?.valid === true && scontoValidato.valore && (
                        <p className="text-xs text-green-600 mt-1">
                            ✓ Sconto valido: {scontoValidato.tipo === 'PERCENTUALE'
                                ? `-${scontoValidato.valore}%`
                                : `-€${scontoValidato.valore.toFixed(2)}`}
                        </p>
                    )}
                    {scontoValidato?.valid === false && (
                        <p className="text-xs text-red-600 mt-1">
                            ✗ {scontoValidato.error || 'Codice sconto non valido'}
                        </p>
                    )}
                </div>
            </div>
        </>
    );
};

export default ConvenzionePicker;
