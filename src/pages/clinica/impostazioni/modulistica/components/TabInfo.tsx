/**
 * Tab Info - Informazioni generali del template
 * 
 * @module pages/clinica/impostazioni/modulistica/components
 */

import React from 'react';
import type { FormData } from './types';
import { TIPI_DOCUMENTO, FASI_DOCUMENTO, BRANCH_TYPES, TIPI_QUESTIONARIO_MDL } from './types';
import type { TipoDocumentoTemplate, FaseDocumento } from '../../../../../services/clinicaApi';
import TabInfoMDLConfig from './TabInfoMDLConfig';
import DatePickerElegante from '../../../../../components/ui/DatePickerElegante';

interface TabInfoProps {
    formData: FormData;
    errors: Record<string, string>;
    onChange: (updates: Partial<FormData>) => void;
}

const TabInfo: React.FC<TabInfoProps> = ({ formData, errors, onChange }) => {
    return (
        <div className="space-y-6">
            {/* Nome e Codice */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                    <input
                        type="text"
                        value={formData.nome}
                        onChange={(e) => onChange({ nome: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 ${errors.nome ? 'border-red-300' : 'border-gray-300'}`}
                        placeholder="es. Consenso Anestesia Locale"
                    />
                    {errors.nome && <p className="mt-1 text-xs text-red-600">{errors.nome}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Codice</label>
                    <input
                        type="text"
                        value={formData.codice}
                        onChange={(e) => onChange({ codice: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                        placeholder="es. MOD-001"
                    />
                </div>
            </div>

            {/* Descrizione */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                <textarea
                    value={formData.descrizione}
                    onChange={(e) => onChange({ descrizione: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder="Descrizione del template..."
                />
            </div>

            {/* Tipo e Fase */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Documento</label>
                    <select
                        value={formData.tipo}
                        onChange={(e) => onChange({ tipo: e.target.value as TipoDocumentoTemplate })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    >
                        {(() => {
                            const groups = new Map<string, typeof TIPI_DOCUMENTO>();
                            TIPI_DOCUMENTO.forEach(t => {
                                const g = t.group || 'Altro';
                                if (!groups.has(g)) groups.set(g, []);
                                groups.get(g)!.push(t);
                            });
                            return Array.from(groups.entries()).map(([group, items]) => (
                                <optgroup key={group} label={group}>
                                    {items.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </optgroup>
                            ));
                        })()}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fase</label>
                    <select
                        value={formData.fase}
                        onChange={(e) => onChange({ fase: e.target.value as FaseDocumento })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    >
                        {FASI_DOCUMENTO.map(f => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Branch Types */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Applicabile a</label>
                <div className="flex gap-4">
                    {BRANCH_TYPES.map(bt => (
                        <label key={bt.value} className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={formData.branchTypes.includes(bt.value)}
                                onChange={(e) => {
                                    onChange({
                                        branchTypes: e.target.checked
                                            ? [...formData.branchTypes, bt.value]
                                            : formData.branchTypes.filter(b => b !== bt.value)
                                    });
                                }}
                                className="rounded text-teal-600 focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700">{bt.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Opzioni Firma */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Firme richieste</label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                            type="checkbox"
                            checked={formData.richiedeFirma}
                            onChange={(e) => onChange({ richiedeFirma: e.target.checked })}
                            className="rounded text-teal-600 focus:ring-teal-500"
                        />
                        <div>
                            <p className="font-medium text-gray-900 text-sm">Firma paziente</p>
                        </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                            type="checkbox"
                            checked={formData.richiedeFirmaMedico}
                            onChange={(e) => onChange({ richiedeFirmaMedico: e.target.checked })}
                            className="rounded text-teal-600 focus:ring-teal-500"
                        />
                        <div>
                            <p className="font-medium text-gray-900 text-sm">Firma medico</p>
                        </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                            type="checkbox"
                            checked={formData.richiedeFirmaDipendente}
                            onChange={(e) => onChange({ richiedeFirmaDipendente: e.target.checked })}
                            className="rounded text-teal-600 focus:ring-teal-500"
                        />
                        <div>
                            <p className="font-medium text-gray-900 text-sm">Firma dipendente</p>
                        </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                            type="checkbox"
                            checked={formData.richiedeFirmaFormatore}
                            onChange={(e) => onChange({ richiedeFirmaFormatore: e.target.checked })}
                            className="rounded text-teal-600 focus:ring-teal-500"
                        />
                        <div>
                            <p className="font-medium text-gray-900 text-sm">Firma formatore</p>
                        </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                            type="checkbox"
                            checked={formData.richiedeFirmaDatore}
                            onChange={(e) => onChange({ richiedeFirmaDatore: e.target.checked })}
                            className="rounded text-teal-600 focus:ring-teal-500"
                        />
                        <div>
                            <p className="font-medium text-gray-900 text-sm">Firma datore lavoro</p>
                        </div>
                    </label>
                </div>
            </div>

            {/* Posizione Firma nel Documento */}
            {(formData.richiedeFirma || formData.richiedeFirmaMedico || formData.richiedeFirmaDipendente || formData.richiedeFirmaFormatore || formData.richiedeFirmaDatore) && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Posizione firma nel documento</label>
                    <div className="flex gap-4">
                        {[
                            { value: 'footer' as const, label: 'In fondo al documento', desc: 'Le firme appaiono dopo il contenuto' },
                            { value: 'inline' as const, label: 'Nel corpo del documento', desc: 'Le firme appaiono dove indicato nel template' },
                            { value: 'both' as const, label: 'Entrambe le posizioni', desc: 'Firme nel corpo e riepilogo in fondo' },
                        ].map(opt => (
                            <label key={opt.value} className="flex items-start gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 flex-1">
                                <input
                                    type="radio"
                                    name="firmaPosition"
                                    value={opt.value}
                                    checked={formData.firmaPosition === opt.value}
                                    onChange={() => onChange({ firmaPosition: opt.value })}
                                    className="mt-0.5 text-teal-600 focus:ring-teal-500"
                                />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                                    <p className="text-xs text-gray-500">{opt.desc}</p>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {/* Scoring Configuration */}
            <div className="border border-gray-200 rounded-lg p-4">
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                    <input
                        type="checkbox"
                        checked={formData.haScoring}
                        onChange={(e) => onChange({ haScoring: e.target.checked })}
                        className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <div>
                        <p className="font-medium text-gray-900">Abilita scoring</p>
                        <p className="text-sm text-gray-500">Calcola un punteggio in base alle risposte (medicina del lavoro, screening, etc.)</p>
                    </div>
                </label>
                {formData.haScoring && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-gray-100">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Punteggio massimo</label>
                            <input
                                type="number"
                                value={formData.scoringMaxScore}
                                onChange={(e) => onChange({ scoringMaxScore: parseInt(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                min="1"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Soglia superamento</label>
                            <input
                                type="number"
                                value={formData.scoringPassingScore}
                                onChange={(e) => onChange({ scoringPassingScore: parseInt(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                min="0"
                            />
                            <p className="mt-1 text-xs text-gray-500">Punteggio minimo per esito positivo</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Soglia critica</label>
                            <input
                                type="number"
                                value={formData.sogliaCritica}
                                onChange={(e) => onChange({ sogliaCritica: parseInt(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                min="0"
                            />
                            <p className="mt-1 text-xs text-gray-500">Sotto questa soglia → esito critico</p>
                        </div>
                    </div>
                )}
            </div>

            {/* === Configurazione MDL (solo per tipi questionario MDL) === */}
            {TIPI_QUESTIONARIO_MDL.includes(formData.tipo) && (
                <TabInfoMDLConfig formData={formData} onChange={onChange} />
            )}

            {/* Validità e Ordine */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Validità (giorni)</label>
                    <input
                        type="number"
                        value={formData.validitaGiorni}
                        onChange={(e) => onChange({ validitaGiorni: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 ${errors.validitaGiorni ? 'border-red-300' : 'border-gray-300'}`}
                        placeholder="Nessuna scadenza"
                        min="1"
                    />
                    {errors.validitaGiorni && <p className="mt-1 text-xs text-red-600">{errors.validitaGiorni}</p>}
                    <p className="mt-1 text-xs text-gray-400">Durata dalla compilazione</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Scadenza fissa</label>
                    <DatePickerElegante
                        value={formData.scadenzaFissa || null}
                        onChange={(date: Date | null) => onChange({ scadenzaFissa: date ? date.toISOString().split('T')[0] : '' })}
                        clearable
                        theme="teal"
                        size="md"
                        placeholder="Nessuna scadenza fissa"
                        className="w-full"
                    />
                    <p className="mt-1 text-xs text-gray-400">Data scadenza assoluta</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ordine</label>
                    <input
                        type="number"
                        value={formData.ordine}
                        onChange={(e) => onChange({ ordine: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                        min="0"
                    />
                </div>
                <div className="flex items-center gap-4 pt-6">
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={formData.obbligatorio}
                            onChange={(e) => onChange({ obbligatorio: e.target.checked })}
                            className="rounded text-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">Obbligatorio</span>
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={formData.isActive}
                            onChange={(e) => onChange({ isActive: e.target.checked })}
                            className="rounded text-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">Attivo</span>
                    </label>
                </div>
            </div>
        </div>
    );
};

export default TabInfo;
