import React from 'react';
import { Euro, Tag, Plus, Trash2 } from 'lucide-react';
import type { SpesaAccessoria, ScontoApplicato, TipoServizio, CompanyConfig } from '../types';

interface FormFieldsProps {
  prezzoUnitario: number;
  onPrezzoChange: (value: number) => void;
  tipoServizio: TipoServizio;
  onTipoServizioChange: (value: TipoServizio) => void;
  speseAccessorie: SpesaAccessoria[];
  onAddSpesa: () => void;
  onRemoveSpesa: (index: number) => void;
  onUpdateSpesa: (index: number, field: 'descrizione' | 'importo', value: string | number) => void;
  codiceSconto: string;
  onCodiceChange: (value: string) => void;
  onValidateSconto: () => void;
  scontoApplicato: ScontoApplicato | null;
  loadingSconto: boolean;
  note: string;
  onNoteChange: (value: string) => void;
  selectedConfig?: CompanyConfig;
}

/**
 * Form fields component for preventivo configuration
 * 
 * Groups all form inputs: price, service type, expenses, discount, notes
 */
export function FormFields({
  prezzoUnitario,
  onPrezzoChange,
  tipoServizio,
  onTipoServizioChange,
  speseAccessorie,
  onAddSpesa,
  onRemoveSpesa,
  onUpdateSpesa,
  codiceSconto,
  onCodiceChange,
  onValidateSconto,
  scontoApplicato,
  loadingSconto,
  note,
  onNoteChange,
  selectedConfig
}: FormFieldsProps) {
  return (
    <div className="space-y-4">
      {/* Prezzo Unitario */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Euro className="inline w-4 h-4 mr-1" />
          Prezzo Unitario (per partecipante)
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={prezzoUnitario}
          onChange={(e) => onPrezzoChange(parseFloat(e.target.value) || 0)}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          placeholder="Es: 500.00"
        />
        {selectedConfig && (
          <p className="text-xs text-gray-500 mt-1">
            Prezzo base: €{prezzoUnitario.toFixed(2)} ×{' '}
            {selectedConfig.numPartecipanti} ={' '}
            <span className="font-semibold">
              €{(prezzoUnitario * selectedConfig.numPartecipanti).toFixed(2)}
            </span>
          </p>
        )}
      </div>

      {/* Tipo Servizio */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo Servizio (IVA)
        </label>
        <select
          value={tipoServizio}
          onChange={(e) => onTipoServizioChange(e.target.value as TipoServizio)}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        >
          <option value="MEDICO_COMPETENTE">Medico Competente (IVA 10%)</option>
          <option value="CORSO">Formazione (IVA 22%)</option>
          <option value="RSPP">RSPP (IVA 22%)</option>
          <option value="DVR">DVR (IVA 22%)</option>
          <option value="PRIVACY">Privacy (IVA 22%)</option>
          <option value="ALTRO">Altro (IVA 22%)</option>
        </select>
      </div>

      {/* Spese Accessorie */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">
            Spese Accessorie (condivise)
          </label>
          <button
            onClick={onAddSpesa}
            className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Aggiungi
          </button>
        </div>
        {speseAccessorie.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Nessuna spesa accessoria</p>
        ) : (
          <div className="space-y-2">
            {speseAccessorie.map((spesa, index) => (
              <div key={index} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={spesa.descrizione}
                  onChange={(e) => onUpdateSpesa(index, 'descrizione', e.target.value)}
                  placeholder="Descrizione"
                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={spesa.importo}
                  onChange={(e) => onUpdateSpesa(index, 'importo', e.target.value)}
                  placeholder="0.00"
                  className="w-28 px-3 py-2 border rounded-lg text-sm"
                />
                <button
                  onClick={() => onRemoveSpesa(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Codice Sconto */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Tag className="inline w-4 h-4 mr-1" />
          Codice Sconto (opzionale)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={codiceSconto}
            onChange={(e) => onCodiceChange(e.target.value.toUpperCase())}
            placeholder="Es: SCONTO10"
            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 uppercase"
          />
          <button
            onClick={onValidateSconto}
            disabled={!codiceSconto.trim() || loadingSconto}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loadingSconto ? 'Verifica...' : 'Applica'}
          </button>
        </div>
        {scontoApplicato && (
          <div className="mt-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded border border-green-200">
            ✅ Sconto "{scontoApplicato.codice}" applicato: -
            {scontoApplicato.percentuale}%
          </div>
        )}
      </div>

      {/* Note */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Note Aggiuntive
        </label>
        <textarea
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          rows={3}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
          placeholder="Eventuali note o dettagli aggiuntivi..."
        />
      </div>
    </div>
  );
}
