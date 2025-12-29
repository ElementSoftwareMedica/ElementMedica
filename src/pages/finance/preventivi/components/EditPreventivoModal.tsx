/**
 * EditPreventivoModal Component
 * 
 * Modal for editing existing preventivi with discount management.
 * Extracted from PreventiviPage.tsx as part of Project 46 modularization.
 */

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { 
  X, 
  FileText, 
  Plus, 
  Tag, 
  Trash2, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { apiPost } from '@/services/api';
import { 
  Preventivo, 
  PreventivoVoce, 
  CreatePreventivoData, 
  TIPO_SERVIZIO_CONFIG 
} from '../types';

interface EditPreventivoModalProps {
  isOpen: boolean;
  onClose: () => void;
  preventivo: Preventivo | null;
  onSubmit: (id: string, data: Partial<CreatePreventivoData>) => Promise<void>;
  onRemoveSconto?: (preventivoId: string, scontoId: string) => Promise<any>;
  onApplySconto?: (preventivoId: string, codiceSconto: string) => Promise<any>;
  onRefresh?: () => void;
}

interface ScontoInfo {
  id: string;
  codiceTesto: string;
  tipoSconto: string;
  valoreSconto: number;
  importoScontato: number;
  cumulabile?: boolean;
}

interface ScontoValidation {
  isValid: boolean;
  isValidating: boolean;
  error: string | null;
  preview: {
    tipoSconto: string;
    valore: number;
    importoSconto: number;
    cumulabile: boolean;
  } | null;
}

const EditPreventivoModal: React.FC<EditPreventivoModalProps> = ({
  isOpen, 
  onClose, 
  preventivo, 
  onSubmit, 
  onRemoveSconto, 
  onApplySconto, 
  onRefresh
}) => {
  const [formData, setFormData] = useState<CreatePreventivoData>({
    tipoServizio: 'CORSO',
    titoloServizio: '',
    descrizioneServizio: '',
    prezzoTotale: 0,
    aliquotaIva: 22,
    note: '',
    voci: [{ id: '1', descrizione: '', quantita: 1, prezzoUnitario: 0, subtotale: 0 }],
    codiceSconto: ''
  });
  const [loading, setLoading] = useState(false);
  const [scontoInfo, setScontoInfo] = useState<ScontoInfo | null>(null);

  // Stato per validazione e preview sconto
  const [scontoValidation, setScontoValidation] = useState<ScontoValidation>({
    isValid: false, 
    isValidating: false, 
    error: null, 
    preview: null
  });

  // Popola il form quando il preventivo cambia
  useEffect(() => {
    if (preventivo && isOpen) {
      const dettagliVoci = preventivo.dettagliServizio?.voci || [];

      // IMPORTANTE: prezzoTotale è il prezzo ORIGINALE (prima dello sconto)
      // imponibile è il prezzo DOPO lo sconto
      const prezzoOriginale = Number(preventivo.prezzoTotale || preventivo.imponibile || 0);

      const voci: PreventivoVoce[] = dettagliVoci.length > 0
        ? dettagliVoci.map((v: any, i: number) => ({
          id: String(i + 1),
          descrizione: v.descrizione || v.titoloServizio || '',
          quantita: v.quantita || 1,
          prezzoUnitario: Number(v.prezzoUnitario || v.importo || 0),
          subtotale: Number(v.prezzoTotale || v.subtotale || v.importo || 0)
        }))
        : [{
          id: '1',
          descrizione: preventivo.titoloServizio || '',
          quantita: 1,
          prezzoUnitario: prezzoOriginale,
          subtotale: prezzoOriginale
        }];

      // Controlla se c'è già uno sconto applicato
      if (preventivo.sconti && preventivo.sconti.length > 0) {
        const sconto = preventivo.sconti[0];
        setScontoInfo({
          id: sconto.id,
          codiceTesto: sconto.codiceTesto || sconto.nomeCodice || '',
          tipoSconto: sconto.tipoSconto || 'PERCENTUALE',
          valoreSconto: sconto.valoreSconto || 0,
          importoScontato: sconto.importoScontato || 0
        });
      } else {
        setScontoInfo(null);
      }

      setFormData({
        tipoServizio: preventivo.tipoServizio as CreatePreventivoData['tipoServizio'] || 'ALTRO',
        titoloServizio: preventivo.titoloServizio || '',
        descrizioneServizio: preventivo.descrizioneServizio || '',
        prezzoTotale: prezzoOriginale,
        aliquotaIva: Number(preventivo.aliquotaIva || 22),
        note: preventivo.note || '',
        aziendaId: preventivo.aziendaId || undefined,
        personaId: preventivo.personaId || undefined,
        corsoId: preventivo.corsoId || undefined,
        voci,
        codiceSconto: ''
      });

      // Reset validazione sconto
      setScontoValidation({ isValid: false, isValidating: false, error: null, preview: null });
    }
  }, [preventivo, isOpen]);

  // Valida codice sconto in tempo reale
  const validateCodiceSconto = async (codice: string) => {
    if (!codice || codice.length < 3) {
      setScontoValidation({ isValid: false, isValidating: false, error: null, preview: null });
      return;
    }

    setScontoValidation(prev => ({ ...prev, isValidating: true, error: null }));

    try {
      const totaleVoci = (formData.voci || []).reduce((sum, v) => sum + v.subtotale, 0);
      const response = await apiPost<any>('/api/v1/codici-sconto/valida-preview', {
        codice,
        importo: totaleVoci,
        tipoServizio: formData.tipoServizio
      });

      if (response.valido) {
        const preview = {
          tipoSconto: response.codice.tipoSconto,
          valore: response.codice.valore,
          importoSconto: response.importoSconto,
          cumulabile: response.codice.cumulabile
        };
        setScontoValidation({
          isValid: true,
          isValidating: false,
          error: null,
          preview
        });
      } else {
        setScontoValidation({
          isValid: false,
          isValidating: false,
          error: response.motivo || 'Codice non valido',
          preview: null
        });
      }
    } catch (err: any) {
      setScontoValidation({
        isValid: false,
        isValidating: false,
        error: err.response?.data?.error || 'Errore validazione codice',
        preview: null
      });
    }
  };

  // Debounce validazione codice
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.codiceSconto && formData.codiceSconto.length >= 3) {
        validateCodiceSconto(formData.codiceSconto);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.codiceSconto, formData.voci]);

  // Gestione rimozione sconto
  const handleRemoveSconto = async () => {
    if (!preventivo || !scontoInfo || !onRemoveSconto) return;

    setLoading(true);
    try {
      await onRemoveSconto(preventivo.id, scontoInfo.id);
      setScontoInfo(null);
      onRefresh?.();
    } catch (err: any) {
      console.error('Errore rimozione sconto:', err);
    } finally {
      setLoading(false);
    }
  };

  // Gestione applicazione nuovo sconto
  const handleApplySconto = async () => {
    if (!preventivo || !formData.codiceSconto || !scontoValidation.isValid || !onApplySconto) return;

    setLoading(true);
    try {
      await onApplySconto(preventivo.id, formData.codiceSconto);
      setFormData(prev => ({ ...prev, codiceSconto: '' }));
      setScontoValidation({ isValid: false, isValidating: false, error: null, preview: null });
      onRefresh?.();
      onClose();
    } catch (err: any) {
      const errorMsg = err.response?.status === 409
        ? 'Sconto già applicato a questo preventivo'
        : err.response?.data?.error || 'Errore applicazione sconto';
      setScontoValidation(prev => ({ ...prev, error: errorMsg }));
    } finally {
      setLoading(false);
    }
  };

  // Calcola subtotale per una voce
  const updateVoceSubtotale = (voce: PreventivoVoce): PreventivoVoce => ({
    ...voce,
    subtotale: voce.quantita * voce.prezzoUnitario
  });

  // Aggiungi nuova voce
  const addVoce = () => {
    const newVoci = [...(formData.voci || []), {
      id: Date.now().toString(),
      descrizione: '',
      quantita: 1,
      prezzoUnitario: 0,
      subtotale: 0
    }];
    setFormData({ ...formData, voci: newVoci });
  };

  // Rimuovi voce
  const removeVoce = (id: string) => {
    if ((formData.voci?.length || 0) <= 1) return;
    const newVoci = (formData.voci || []).filter(v => v.id !== id);
    setFormData({ ...formData, voci: newVoci });
  };

  // Aggiorna voce
  const updateVoce = (id: string, field: keyof PreventivoVoce, value: string | number) => {
    const newVoci = (formData.voci || []).map(v => {
      if (v.id !== id) return v;
      const updated = { ...v, [field]: value };
      return updateVoceSubtotale(updated);
    });
    setFormData({ ...formData, voci: newVoci });
  };

  // Calcola totali
  const totaleVoci = (formData.voci || []).reduce((sum, v) => sum + v.subtotale, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preventivo) return;

    setLoading(true);
    try {
      const vociDescription = (formData.voci || [])
        .filter(v => v.descrizione && v.subtotale > 0)
        .map(v => `• ${v.descrizione}: ${v.quantita} x €${v.prezzoUnitario.toFixed(2)} = €${v.subtotale.toFixed(2)}`)
        .join('\n');

      const fullDescription = vociDescription
        ? `${formData.descrizioneServizio || ''}\n\nDettaglio voci:\n${vociDescription}`.trim()
        : formData.descrizioneServizio;

      await onSubmit(preventivo.id, {
        ...formData,
        prezzoTotale: totaleVoci,
        descrizioneServizio: fullDescription
      });
      onClose();
    } catch (err) {
      console.error('Error updating preventivo:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !preventivo) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-500 to-blue-600">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Modifica Preventivo {preventivo.numero}
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        <form 
          onSubmit={handleSubmit} 
          className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]" 
          noValidate
        >
          <div className="space-y-6">
            {/* Tipo Servizio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo Servizio
              </label>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(TIPO_SERVIZIO_CONFIG).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFormData({ 
                        ...formData, 
                        tipoServizio: key as CreatePreventivoData['tipoServizio'] 
                      })}
                      className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                        formData.tipoServizio === key
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${config.color}`} />
                      <span className="text-xs font-medium text-center">{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Titolo Servizio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titolo Servizio *
              </label>
              <input
                type="text"
                value={formData.titoloServizio}
                onChange={(e) => setFormData({ ...formData, titoloServizio: e.target.value })}
                placeholder="Es. Corso Sicurezza sul Lavoro"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* VOCI DEL PREVENTIVO */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-gray-700">
                  Voci del Preventivo
                </label>
                <button
                  type="button"
                  onClick={addVoce}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Aggiungi voce
                </button>
              </div>

              <div className="space-y-3">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
                  <div className="col-span-5">Descrizione</div>
                  <div className="col-span-2 text-center">Qtà</div>
                  <div className="col-span-2 text-right">Prezzo Unit.</div>
                  <div className="col-span-2 text-right">Subtotale</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Voci */}
                {(formData.voci || []).map((voce) => (
                  <div 
                    key={voce.id} 
                    className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-gray-200"
                  >
                    <div className="col-span-5">
                      <input
                        type="text"
                        value={voce.descrizione}
                        onChange={(e) => updateVoce(voce.id, 'descrizione', e.target.value)}
                        placeholder="Es. Partecipante corso base"
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={voce.quantita}
                        onChange={(e) => updateVoce(voce.id, 'quantita', parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-1.5 text-sm text-center border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">€</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={voce.prezzoUnitario}
                          onChange={(e) => updateVoce(voce.id, 'prezzoUnitario', parseFloat(e.target.value) || 0)}
                          className="w-full pl-5 pr-2 py-1.5 text-sm text-right border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="col-span-2 text-right font-medium text-gray-900 text-sm">
                      € {voce.subtotale.toFixed(2)}
                    </div>
                    <div className="col-span-1 text-center">
                      {(formData.voci?.length || 0) > 1 && (
                        <button
                          type="button"
                          onClick={() => removeVoce(voce.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Codice Sconto */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-green-600" />
                  Gestione Sconto
                </div>
              </label>

              {/* Sconto già applicato */}
              {scontoInfo && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="font-medium">
                          Sconto applicato: {scontoInfo.codiceTesto}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-green-600">
                        {scontoInfo.tipoSconto === 'PERCENTUALE'
                          ? `${scontoInfo.valoreSconto}% = -€${Number(scontoInfo.importoScontato || 0).toFixed(2)}`
                          : `-€${Number(scontoInfo.importoScontato || 0).toFixed(2)}`
                        }
                      </div>
                    </div>
                    {onRemoveSconto && (
                      <button
                        type="button"
                        onClick={handleRemoveSconto}
                        disabled={loading}
                        className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200 flex items-center gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Rimuovi
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Input nuovo codice sconto */}
              {(!scontoInfo || scontoInfo.cumulabile) && (
                <div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.codiceSconto || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        codiceSconto: e.target.value.toUpperCase() 
                      })}
                      placeholder="Inserisci codice sconto"
                      className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 uppercase ${
                        scontoValidation.error ? 'border-red-300' :
                        scontoValidation.isValid ? 'border-green-300' : 'border-gray-300'
                      }`}
                    />
                    {scontoValidation.isValid && onApplySconto && (
                      <button
                        type="button"
                        onClick={handleApplySconto}
                        disabled={loading}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Applica
                      </button>
                    )}
                  </div>

                  {/* Stato validazione */}
                  {scontoValidation.isValidating && (
                    <div className="mt-1 text-xs text-blue-600 flex items-center gap-1">
                      <span className="animate-spin rounded-full h-3 w-3 border-b border-blue-600"></span>
                      Verifica codice in corso...
                    </div>
                  )}
                  {scontoValidation.error && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {scontoValidation.error}
                    </p>
                  )}
                  {scontoValidation.isValid && scontoValidation.preview && (
                    <div className="mt-2 p-2 bg-green-50 rounded border border-green-200 text-sm">
                      <div className="flex items-center gap-1 text-green-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span className="font-medium">Codice valido!</span>
                      </div>
                      <div className="text-green-600 mt-1">
                        {scontoValidation.preview.tipoSconto === 'PERCENTUALE'
                          ? `Sconto ${scontoValidation.preview.valore}% = -€${scontoValidation.preview.importoSconto.toFixed(2)}`
                          : `Sconto fisso: -€${scontoValidation.preview.importoSconto.toFixed(2)}`
                        }
                        {scontoValidation.preview.cumulabile && (
                          <span className="ml-2 text-xs bg-green-200 px-1.5 py-0.5 rounded">
                            Cumulabile
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* IVA */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Aliquota IVA
              </label>
              <select
                value={formData.aliquotaIva}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  aliquotaIva: parseFloat(e.target.value) 
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="0">0% (Esente)</option>
                <option value="4">4%</option>
                <option value="10">10%</option>
                <option value="22">22%</option>
              </select>
            </div>

            {/* Totali Preview con dettaglio sconto */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-medium text-gray-700 mb-3">Riepilogo Economico</h4>
              <div className="space-y-2 text-sm">
                {/* Subtotale voci */}
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Subtotale voci ({(formData.voci || []).filter(v => v.subtotale > 0).length}):
                  </span>
                  <span className="font-medium">€ {totaleVoci.toFixed(2)}</span>
                </div>

                {/* Sconto applicato */}
                {scontoInfo && (
                  <div className="flex justify-between text-green-700 bg-green-50 -mx-2 px-2 py-1 rounded">
                    <span className="flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5" />
                      Sconto ({scontoInfo.codiceTesto})
                      {scontoInfo.tipoSconto === 'PERCENTUALE' && ` ${scontoInfo.valoreSconto}%`}
                    </span>
                    <span className="font-medium">
                      -€ {Number(scontoInfo.importoScontato || 0).toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Preview sconto nuovo (non ancora applicato) */}
                {!scontoInfo && scontoValidation.isValid && scontoValidation.preview && (
                  <div className="flex justify-between text-amber-700 bg-amber-50 -mx-2 px-2 py-1 rounded">
                    <span className="flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5" />
                      Sconto (da applicare)
                      {scontoValidation.preview.tipoSconto === 'PERCENTUALE' && 
                        ` ${scontoValidation.preview.valore}%`}
                    </span>
                    <span className="font-medium">
                      -€ {scontoValidation.preview.importoSconto.toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Imponibile */}
                <div className="flex justify-between">
                  <span className="text-gray-600">Imponibile:</span>
                  <span className="font-medium">€ {(
                    totaleVoci -
                    (scontoInfo?.importoScontato || 0) -
                    (scontoValidation.preview?.importoSconto || 0)
                  ).toFixed(2)}</span>
                </div>

                {/* IVA */}
                <div className="flex justify-between">
                  <span className="text-gray-600">IVA ({formData.aliquotaIva}%):</span>
                  <span className="font-medium">€ {(
                    (totaleVoci - (scontoInfo?.importoScontato || 0) - (scontoValidation.preview?.importoSconto || 0))
                    * (formData.aliquotaIva / 100)
                  ).toFixed(2)}</span>
                </div>

                {/* Totale finale */}
                <div className="flex justify-between pt-2 border-t border-blue-300">
                  <span className="text-gray-900 font-semibold">TOTALE:</span>
                  <span className="text-xl font-bold text-blue-600">€ {(
                    (totaleVoci - (scontoInfo?.importoScontato || 0) - (scontoValidation.preview?.importoSconto || 0))
                    * (1 + formData.aliquotaIva / 100)
                  ).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Note</label>
              <textarea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Note aggiuntive..."
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annulla
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={loading || !formData.titoloServizio || totaleVoci <= 0}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Salva Modifiche
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default EditPreventivoModal;
