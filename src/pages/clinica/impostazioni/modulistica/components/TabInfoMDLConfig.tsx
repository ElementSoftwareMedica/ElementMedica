/**
 * TabInfoMDLConfig - Sezione configurazione MDL per questionari
 *
 * Visibile solo quando il tipo documento è un questionario MDL.
 * Copre tutti i campi di QuestionarioMedicoConfig:
 *   specializzazione, codiciRischio, tipiVisitaMDL, compilabileDa,
 *   tempoStimato, istruzioni, periodicità, tariffazione.
 *
 * @module pages/clinica/impostazioni/modulistica/components
 */

import React, { useState } from 'react';
import {
    Stethoscope, Clock, Euro, BookOpen, AlertTriangle, ChevronDown
} from 'lucide-react';
import type { FormData, CodiceRischio, TipoVisitaMDL } from './types';
import {
    COMPILATORI_QUESTIONARIO,
    TIPI_VISITA_MDL_OPTIONS,
    CODICI_RISCHIO_OPTIONS,
} from './types';

interface TabInfoMDLConfigProps {
    formData: FormData;
    onChange: (updates: Partial<FormData>) => void;
}

const SPECIALIZZAZIONI_MEDICHE = [
    '', 'Cardiologia', 'Dermatologia', 'Endocrinologia', 'Gastroenterologia',
    'Ginecologia', 'Medicina del Lavoro', 'Medicina Generale', 'Neurologia',
    'Oculistica', 'Ortopedia', 'Otorinolaringoiatria', 'Pediatria',
    'Pneumologia', 'Urologia', 'Altro',
];

// Raggruppa i codici rischio per categoria
const rischiByCategoria = (): Map<string, typeof CODICI_RISCHIO_OPTIONS> => {
    const map = new Map<string, typeof CODICI_RISCHIO_OPTIONS>();
    CODICI_RISCHIO_OPTIONS.forEach(r => {
        if (!map.has(r.categoria)) map.set(r.categoria, []);
        map.get(r.categoria)!.push(r);
    });
    return map;
};

const RISCHI_GROUPED = rischiByCategoria();

const TabInfoMDLConfig: React.FC<TabInfoMDLConfigProps> = ({ formData, onChange }) => {
    const [mdlOpen, setMdlOpen] = useState(false);

    const toggleRischio = (code: CodiceRischio) => {
        const current = formData.codiciRischio;
        onChange({
            codiciRischio: current.includes(code)
                ? current.filter(c => c !== code)
                : [...current, code]
        });
    };

    const toggleTipoVisita = (tipo: TipoVisitaMDL) => {
        const current = formData.tipiVisitaMDL;
        onChange({
            tipiVisitaMDL: current.includes(tipo)
                ? current.filter(t => t !== tipo)
                : [...current, tipo]
        });
    };

    return (
        <div className="space-y-6 mt-6 pt-6 border-t-2 border-teal-100">
            {/* Specializzazione + Compilabile da */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Specializzazione medica
                    </label>
                    <select
                        value={formData.specializzazione}
                        onChange={e => onChange({ specializzazione: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm bg-white"
                    >
                        {SPECIALIZZAZIONI_MEDICHE.map(s => (
                            <option key={s} value={s}>{s === '' ? '— Nessuna —' : s}</option>
                        ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-400">Ambito clinico del questionario</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Compilabile da
                    </label>
                    <select
                        value={formData.compilabileDa}
                        onChange={e => onChange({ compilabileDa: e.target.value as typeof formData.compilabileDa })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
                    >
                        {COMPILATORI_QUESTIONARIO.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-400">
                        {COMPILATORI_QUESTIONARIO.find(c => c.value === formData.compilabileDa)?.desc}
                    </p>
                </div>
            </div>

            {/* Sezione collassabile: Tipi visita MDL + Codici rischio */}
            <div className="border border-teal-100 rounded-lg overflow-hidden">
                <button
                    type="button"
                    onClick={() => setMdlOpen(o => !o)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-teal-50 hover:bg-teal-100 transition-colors text-left"
                >
                    <span className="flex items-center gap-2 text-sm font-semibold text-teal-700">
                        <Stethoscope className="w-4 h-4" />
                        Medicina del Lavoro
                        {(formData.tipiVisitaMDL.length > 0 || formData.codiciRischio.length > 0) && (
                            <span className="px-1.5 py-0.5 text-xs bg-teal-200 text-teal-800 rounded-full">
                                {formData.tipiVisitaMDL.length + formData.codiciRischio.length} selezioni
                            </span>
                        )}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-teal-500 transition-transform duration-200 ${mdlOpen ? 'rotate-180' : ''}`} />
                </button>

                {mdlOpen && (
                    <div className="px-4 py-4 space-y-5 border-t border-teal-100">
                        {/* Tipi visita MDL */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tipi visita applicabili
                                {formData.tipiVisitaMDL.length > 0 && (
                                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-teal-100 text-teal-700 rounded-full">
                                        {formData.tipiVisitaMDL.length} selezionati
                                    </span>
                                )}
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {TIPI_VISITA_MDL_OPTIONS.map(tv => (
                                    <label
                                        key={tv.value}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm ${formData.tipiVisitaMDL.includes(tv.value)
                                                ? 'border-teal-400 bg-teal-50 text-teal-800'
                                                : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.tipiVisitaMDL.includes(tv.value)}
                                            onChange={() => toggleTipoVisita(tv.value)}
                                            className="rounded text-teal-600 focus:ring-teal-500"
                                        />
                                        {tv.label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Codici rischio */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                <label className="text-sm font-medium text-gray-700">
                                    Rischi lavorativi associati
                                    {formData.codiciRischio.length > 0 && (
                                        <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                                            {formData.codiciRischio.length} selezionati
                                        </span>
                                    )}
                                </label>
                            </div>
                            <div className="space-y-3">
                                {Array.from(RISCHI_GROUPED.entries()).map(([categoria, rischi]) => (
                                    <div key={categoria} className="border border-gray-200 rounded-lg p-3">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{categoria}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {rischi.map(r => (
                                                <label
                                                    key={r.value}
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer border transition-colors ${formData.codiciRischio.includes(r.value)
                                                            ? 'bg-amber-100 border-amber-400 text-amber-800'
                                                            : 'bg-white border-gray-200 text-gray-600 hover:border-amber-300 hover:bg-amber-50'
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.codiciRischio.includes(r.value)}
                                                        onChange={() => toggleRischio(r.value)}
                                                        className="sr-only"
                                                    />
                                                    <span className="font-bold text-teal-700">{r.value}</span>
                                                    {r.label}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Tempo stimato + Periodicità */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Clock className="inline w-3.5 h-3.5 mr-1 text-gray-400" />
                        Tempo stimato compilazione (min)
                    </label>
                    <input
                        type="number"
                        value={formData.tempoStimato}
                        onChange={e => onChange({ tempoStimato: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
                        placeholder="es. 10"
                        min="1"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Periodicità (mesi)
                    </label>
                    <input
                        type="number"
                        value={formData.periodicitaMesi}
                        onChange={e => onChange({ periodicitaMesi: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
                        placeholder="es. 12 (annuale)"
                        min="1"
                    />
                    <p className="mt-1 text-xs text-gray-400">Frequenza di ricompilazione obbligatoria</p>
                </div>
            </div>

            {/* Istruzioni paziente + medico */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        <BookOpen className="inline w-3.5 h-3.5 mr-1 text-blue-400" />
                        Istruzioni per il paziente
                    </label>
                    <textarea
                        value={formData.istruzioniPaziente}
                        onChange={e => onChange({ istruzioniPaziente: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm resize-none"
                        placeholder="Istruzioni mostrate al paziente prima della compilazione..."
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        <BookOpen className="inline w-3.5 h-3.5 mr-1 text-teal-400" />
                        Istruzioni per il medico
                    </label>
                    <textarea
                        value={formData.istruzioniMedico}
                        onChange={e => onChange({ istruzioniMedico: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm resize-none"
                        placeholder="Note operative e indicazioni cliniche per il medico..."
                    />
                </div>
            </div>

            {/* Opzioni comportamento */}
            <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={formData.richiedeRevisione}
                        onChange={e => onChange({ richiedeRevisione: e.target.checked })}
                        className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <div>
                        <span className="text-sm font-medium text-gray-900">Richiede revisione medico</span>
                        <p className="text-xs text-gray-500">Il medico deve validare le risposte del paziente</p>
                    </div>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={formData.promemoria}
                        onChange={e => onChange({ promemoria: e.target.checked })}
                        className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <div>
                        <span className="text-sm font-medium text-gray-900">Promemoria automatico</span>
                        <p className="text-xs text-gray-500">Invia reminder prima della scadenza di periodicità</p>
                    </div>
                </label>
            </div>

            {/* Tariffazione */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                    <Euro className="w-4 h-4 text-gray-400" />
                    <p className="text-sm font-semibold text-gray-700">Tariffazione</p>
                </div>
                <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.isPagamento}
                            onChange={e => onChange({ isPagamento: e.target.checked })}
                            className="rounded text-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">Questionario a pagamento</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.fatturabile}
                            onChange={e => onChange({ fatturabile: e.target.checked })}
                            className="rounded text-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">Genera movimento contabile</span>
                    </label>
                </div>
                {formData.isPagamento && (
                    <div className="pt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Prezzo default (€)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.prezzoDefault}
                            onChange={e => onChange({ prezzoDefault: e.target.value })}
                            className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
                            placeholder="0.00"
                        />
                        <p className="mt-1 text-xs text-gray-400">Usato se non è associata a una voce tariffario</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TabInfoMDLConfig;
