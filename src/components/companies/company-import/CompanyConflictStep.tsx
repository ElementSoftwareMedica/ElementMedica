import React, { useState } from 'react';
import {
    AlertTriangle, Building2, MapPin, SkipForward, RefreshCw,
    PlusCircle, ChevronDown, ChevronUp, CheckCircle2, X
} from 'lucide-react';
import type { ImportErrorItem, ConflictResolution } from './types';

interface CompanyConflictStepProps {
    conflicts: ImportErrorItem[];
    onResolve: (resolutions: ConflictResolution[]) => void;
    onCancel: () => void;
    isResolving: boolean;
}

const CompanyConflictStep: React.FC<CompanyConflictStepProps> = ({
    conflicts,
    onResolve,
    onCancel,
    isResolving,
}) => {
    const [resolutions, setResolutions] = useState<Record<number, ConflictResolution>>(() => {
        const init: Record<number, ConflictResolution> = {};
        conflicts.forEach(c => {
            init[c.index] = { index: c.index, action: 'skip' };
        });
        return init;
    });
    const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>(() => {
        const init: Record<number, boolean> = {};
        conflicts.forEach(c => { init[c.index] = true; }); // expanded by default
        return init;
    });
    const [siteNames, setSiteNames] = useState<Record<number, string>>({});

    const updateResolution = (index: number, update: Partial<ConflictResolution>) => {
        setResolutions(prev => ({ ...prev, [index]: { ...prev[index], ...update } }));
    };

    const toggleExpand = (index: number) => {
        setExpandedRows(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const handleConfirm = () => {
        const resolved: ConflictResolution[] = conflicts.map(c => {
            const res = resolutions[c.index] ?? { index: c.index, action: 'skip' as const };
            if (res.action === 'addAsSite') {
                return {
                    ...res,
                    profileId: c.existingCompany?.id,
                    siteName: siteNames[c.index] || c.data.siteName || c.data.siteCitta || c.data.citta || 'Sede Principale',
                    originalData: c.data,
                };
            }
            if (res.action === 'overwrite') {
                return { ...res, profileId: c.existingCompany?.id, originalData: c.data };
            }
            return res;
        });
        onResolve(resolved);
    };

    const overwriteCount = Object.values(resolutions).filter(r => r.action === 'overwrite').length;
    const siteCount = Object.values(resolutions).filter(r => r.action === 'addAsSite').length;
    const skipCount = Object.values(resolutions).filter(r => r.action === 'skip').length;

    /** Applica la stessa azione a tutti i conflitti che hanno l'opzione disponibile */
    const applyBulkAction = (action: 'skip' | 'overwrite') => {
        setResolutions(prev => {
            const next = { ...prev };
            conflicts.forEach(c => {
                if (action === 'overwrite' && c.existingCompany) {
                    next[c.index] = { index: c.index, action: 'overwrite', profileId: c.existingCompany.id };
                } else if (action === 'skip') {
                    next[c.index] = { index: c.index, action: 'skip' };
                }
            });
            return next;
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/70 flex items-center justify-center z-[1000] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-3xl max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="flex items-start gap-3 px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex-shrink-0">
                        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                            {conflicts.length} {conflicts.length === 1 ? 'conflitto rilevato' : 'conflitti rilevati'}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            Le seguenti aziende esistono già. Specifica l&apos;azione da eseguire per ognuna.
                        </p>
                    </div>
                    {/* Bulk actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                            onClick={() => applyBulkAction('overwrite')}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800 transition-colors"
                            title="Imposta 'Sovrascrivi' per tutti i conflitti"
                        >
                            <RefreshCw className="h-3 w-3" /> Tutti sovrascrivi
                        </button>
                        <button
                            onClick={() => applyBulkAction('skip')}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-colors"
                            title="Imposta 'Salta' per tutti i conflitti"
                        >
                            <SkipForward className="h-3 w-3" /> Tutti salta
                        </button>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Conflict list */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                    {conflicts.map(conflict => {
                        const res = resolutions[conflict.index];
                        const isExpanded = expandedRows[conflict.index] ?? true;
                        const hasSiteData = !!(
                            conflict.data.siteCitta || conflict.data.citta ||
                            conflict.data.indirizzo || conflict.data.siteIndirizzo ||
                            conflict.data.siteName
                        );

                        return (
                            <div
                                key={conflict.index}
                                className={`rounded-xl border transition-colors overflow-hidden ${res?.action === 'overwrite'
                                        ? 'border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-900/10'
                                        : res?.action === 'addAsSite'
                                            ? 'border-green-200 dark:border-green-800 bg-green-50/40 dark:bg-green-900/10'
                                            : 'border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/20'
                                    }`}
                            >
                                {/* Card header row */}
                                <button
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                                    onClick={() => toggleExpand(conflict.index)}
                                >
                                    <Building2 className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                                                {conflict.data.ragioneSociale}
                                            </span>
                                            {conflict.data.piva && (
                                                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono flex-shrink-0">
                                                    P.IVA {conflict.data.piva}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-amber-600 dark:text-amber-400 truncate">{conflict.error}</p>
                                    </div>
                                    {/* Resolution badge */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {res?.action === 'skip' && (
                                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                                <SkipForward className="h-3 w-3" /> Salta
                                            </span>
                                        )}
                                        {res?.action === 'overwrite' && (
                                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                                                <RefreshCw className="h-3 w-3" /> Sovrascrivi
                                            </span>
                                        )}
                                        {res?.action === 'addAsSite' && (
                                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                                                <PlusCircle className="h-3 w-3" /> Nuova Sede
                                            </span>
                                        )}
                                        {isExpanded
                                            ? <ChevronUp className="h-4 w-4 text-gray-400" />
                                            : <ChevronDown className="h-4 w-4 text-gray-400" />}
                                    </div>
                                </button>

                                {/* Expanded content */}
                                {isExpanded && (
                                    <div className="border-t border-inherit px-4 py-3 space-y-3">
                                        {/* Data comparison grid */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                                                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Dal CSV</p>
                                                <dl className="space-y-1">
                                                    {conflict.data.piva && (
                                                        <div className="text-xs flex gap-1.5">
                                                            <span className="text-gray-500 w-14 flex-shrink-0">P.IVA</span>
                                                            <span className="text-gray-900 dark:text-gray-100 font-mono">{conflict.data.piva}</span>
                                                        </div>
                                                    )}
                                                    {conflict.data.mail && (
                                                        <div className="text-xs flex gap-1.5">
                                                            <span className="text-gray-500 w-14 flex-shrink-0">Email</span>
                                                            <span className="text-gray-900 dark:text-gray-100 truncate">{conflict.data.mail}</span>
                                                        </div>
                                                    )}
                                                    {conflict.data.telefono && (
                                                        <div className="text-xs flex gap-1.5">
                                                            <span className="text-gray-500 w-14 flex-shrink-0">Telefono</span>
                                                            <span className="text-gray-900 dark:text-gray-100">{conflict.data.telefono}</span>
                                                        </div>
                                                    )}
                                                    {(conflict.data.siteCitta || conflict.data.citta) && (
                                                        <div className="text-xs flex gap-1.5">
                                                            <span className="text-gray-500 w-14 flex-shrink-0">Città</span>
                                                            <span className="text-gray-900 dark:text-gray-100">{conflict.data.siteCitta || conflict.data.citta}</span>
                                                        </div>
                                                    )}
                                                </dl>
                                            </div>

                                            {conflict.existingCompany && (
                                                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-100 dark:border-amber-800">
                                                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-2">Nel database</p>
                                                    <dl className="space-y-1">
                                                        <div className="text-xs flex gap-1.5">
                                                            <span className="text-amber-500 w-14 flex-shrink-0">Nome</span>
                                                            <span className="text-amber-900 dark:text-amber-200 font-medium truncate">{conflict.existingCompany.ragioneSociale}</span>
                                                        </div>
                                                        {conflict.existingCompany.piva && (
                                                            <div className="text-xs flex gap-1.5">
                                                                <span className="text-amber-500 w-14 flex-shrink-0">P.IVA</span>
                                                                <span className="text-amber-900 dark:text-amber-200 font-mono">{conflict.existingCompany.piva}</span>
                                                            </div>
                                                        )}
                                                    </dl>
                                                    {conflict.existingCompany.sites && conflict.existingCompany.sites.length > 0 && (
                                                        <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-700">
                                                            <p className="text-xs text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1">
                                                                <MapPin className="h-3 w-3" />
                                                                {conflict.existingCompany.sites.length} {conflict.existingCompany.sites.length === 1 ? 'sede' : 'sedi'}
                                                            </p>
                                                            <ul className="space-y-0.5">
                                                                {conflict.existingCompany.sites.slice(0, 2).map(s => (
                                                                    <li key={s.id} className="text-xs text-amber-700 dark:text-amber-300 truncate">
                                                                        • {s.siteName}{s.citta ? ` — ${s.citta}` : ''}
                                                                    </li>
                                                                ))}
                                                                {conflict.existingCompany.sites.length > 2 && (
                                                                    <li className="text-xs text-amber-400">+{conflict.existingCompany.sites.length - 2} altre</li>
                                                                )}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Resolution options */}
                                        <div className="space-y-1.5 pt-1">
                                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Come procedere?</p>

                                            {/* Skip */}
                                            <label className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${res?.action === 'skip' ? 'bg-gray-100 dark:bg-gray-700/80 ring-1 ring-gray-300 dark:ring-gray-600' : 'hover:bg-gray-50 dark:hover:bg-gray-700/40'}`}>
                                                <input
                                                    type="radio"
                                                    name={`res-${conflict.index}`}
                                                    checked={res?.action === 'skip'}
                                                    onChange={() => updateResolution(conflict.index, { action: 'skip' })}
                                                    className="accent-gray-500 flex-shrink-0"
                                                />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Salta questa riga</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Non importare, mantieni i dati esistenti invariati</p>
                                                </div>
                                            </label>

                                            {/* Overwrite */}
                                            {conflict.existingCompany && (
                                                <label className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${res?.action === 'overwrite' ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-300 dark:ring-blue-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700/40'}`}>
                                                    <input
                                                        type="radio"
                                                        name={`res-${conflict.index}`}
                                                        checked={res?.action === 'overwrite'}
                                                        onChange={() => updateResolution(conflict.index, { action: 'overwrite', profileId: conflict.existingCompany!.id })}
                                                        className="accent-blue-600 flex-shrink-0"
                                                    />
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Sovrascrivi</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Aggiorna i dati dell&apos;azienda con quelli del CSV</p>
                                                    </div>
                                                </label>
                                            )}

                                            {/* Add as site */}
                                            {conflict.existingCompany && hasSiteData && (
                                                <div className={`rounded-lg transition-colors ${res?.action === 'addAsSite' ? 'bg-green-50 dark:bg-green-900/20 ring-1 ring-green-300 dark:ring-green-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700/40'}`}>
                                                    <label className="flex items-center gap-3 p-2.5 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name={`res-${conflict.index}`}
                                                            checked={res?.action === 'addAsSite'}
                                                            onChange={() => updateResolution(conflict.index, { action: 'addAsSite', profileId: conflict.existingCompany!.id })}
                                                            className="accent-green-600 flex-shrink-0"
                                                        />
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                                                                <MapPin className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                                                Aggiungi come nuova sede
                                                            </p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">Registra l&apos;indirizzo del CSV come nuova sede operativa</p>
                                                        </div>
                                                    </label>
                                                    {res?.action === 'addAsSite' && (
                                                        <div className="px-3 pb-3">
                                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Nome sede</label>
                                                            <input
                                                                type="text"
                                                                value={siteNames[conflict.index] ?? (conflict.data.siteName || conflict.data.siteCitta || conflict.data.citta || '')}
                                                                onChange={e => setSiteNames(prev => ({ ...prev, [conflict.index]: e.target.value }))}
                                                                onClick={e => e.stopPropagation()}
                                                                placeholder="Es. Sede Milano, Filiale Roma..."
                                                                className="w-full text-sm px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                            />
                                                            {(conflict.data.siteIndirizzo || conflict.data.indirizzo) && (
                                                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                                    📍 {conflict.data.siteIndirizzo || conflict.data.indirizzo}
                                                                    {(conflict.data.siteCitta || conflict.data.citta) && `, ${conflict.data.siteCitta || conflict.data.citta}`}
                                                                    {(conflict.data.sitoProvincia || conflict.data.provincia) && ` (${conflict.data.sitoProvincia || conflict.data.provincia})`}
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 rounded-b-2xl flex-shrink-0">
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        {skipCount > 0 && (
                            <span className="flex items-center gap-1">
                                <SkipForward className="h-3 w-3" /> {skipCount} salta
                            </span>
                        )}
                        {overwriteCount > 0 && (
                            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                <RefreshCw className="h-3 w-3" /> {overwriteCount} sovrascrivi
                            </span>
                        )}
                        {siteCount > 0 && (
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <PlusCircle className="h-3 w-3" /> {siteCount} nuova sede
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onCancel}
                            disabled={isResolving}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                        >
                            Torna all&apos;import
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={isResolving}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isResolving ? (
                                <>
                                    <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Importazione in corso...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Conferma ({overwriteCount + siteCount} azion{overwriteCount + siteCount === 1 ? 'e' : 'i'})
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompanyConflictStep;
