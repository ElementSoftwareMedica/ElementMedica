/**
 * SalvaCompletaMenu - Split button con dropdown opzioni per completamento visita
 *
 * Il pulsante principale chiama onComplete().
 * Il chevron apre un pannello con opzioni configurabili:
 *  - Invia referto via email (con disabilitazione automatica per visite MDL)
 *  - Applica firma medico al salvataggio
 *  - Apri PDF dopo il completamento
 *  - Stampa N copie
 *  - Allegati marketing aggiuntivi (se mail attiva)
 *
 * @module pages/clinica/clinica/components/SalvaCompletaMenu
 * @project P74 - Document Management & Email Templates
 */

import React, { useState, useRef, useEffect, useId, useCallback } from 'react';
import {
    CheckCircle,
    ChevronDown,
    Mail,
    PenLine,
    FileText,
    Printer,
    Paperclip,
    Loader2,
    Info,
    BookmarkCheck
} from 'lucide-react';
import type { CompletionPhase } from '../types';
import { useToast } from '../../../../hooks/useToast';

const PREFS_KEY = (medicoId: string) => `salvaCompleta:prefs:${medicoId}`;

interface MedicoCompletionPrefs {
    applicaFirma: boolean;
    apriPdf: boolean;
    stampaCopie: number;
}

function loadMedicoPrefs(medicoId: string | undefined): MedicoCompletionPrefs | null {
    if (!medicoId) return null;
    try {
        const raw = localStorage.getItem(PREFS_KEY(medicoId));
        return raw ? (JSON.parse(raw) as MedicoCompletionPrefs) : null;
    } catch {
        return null;
    }
}

function saveMedicoPrefs(medicoId: string, prefs: MedicoCompletionPrefs): void {
    try {
        localStorage.setItem(PREFS_KEY(medicoId), JSON.stringify(prefs));
    } catch {
        // quota exceeded or private browsing — silently ignore
    }
}

export interface SalvaCompletaMenuOptions {
    /** Invia referto alla mail del paziente al completamento */
    invioRefertoMail: boolean;
    /** Applica la firma digitale del medico prima di completare */
    applicaFirma: boolean;
    /** Apri il PDF del referto subito dopo il completamento */
    apriPdf: boolean;
    /** Numero di copie cartacee da stampare (0 = nessuna) */
    stampaCopie: number;
    /** IDs dei documenti marketing da allegare all'email */
    allegatiExtra: string[];
}

interface MarketingDocOption {
    id: string;
    nome: string;
    fileName?: string | null;
}

interface SalvaCompletaMenuProps {
    isReadonly: boolean;
    completionPhase?: CompletionPhase;
    /** Stato attuale del flag "invia referto via mail" (persisted in DB) */
    invioRefertoMail: boolean;
    /** Callback per toggleare invioRefertoMail (persiste in DB) */
    onInvioRefertoMailChange: (value: boolean) => void;
    /** Se true, la visita è MDL → invio mail disabilitato (schedulato automaticamente) */
    isMDLVisit: boolean;
    /** Se true, la mutation di salvataggio mail è in corso */
    saveInvioMailPending?: boolean;
    /** Documenti marketing disponibili per allegati aggiuntivi */
    marketingDocs?: MarketingDocOption[];
    /** Callback per il completamento principale */
    onComplete: () => void;
    /** Callback per aprire PDF del referto (returns the fileUrl for printing support) */
    onCreateReferto: () => Promise<string | undefined>;
    /** ID del medico corrente — usato per caricare/salvare preferenze predefinite in localStorage */
    medicoId?: string;
}

// ── Minimal toggle sub-component ────────────────────────────────────────────
const Toggle: React.FC<{
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
    id?: string;
}> = ({ checked, onChange, disabled, id }) => (
    <button
        type="button"
        id={id}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        aria-pressed={checked}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200
            ${checked ? 'bg-teal-600' : 'bg-gray-200'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
);

// ── Main component ────────────────────────────────────────────────────────────
const SalvaCompletaMenu: React.FC<SalvaCompletaMenuProps> = ({
    isReadonly,
    completionPhase,
    invioRefertoMail,
    onInvioRefertoMailChange,
    isMDLVisit,
    saveInvioMailPending,
    marketingDocs,
    onComplete,
    onCreateReferto,
    medicoId
}) => {
    const { showToast } = useToast();

    // Initialize local options from saved medico preferences (or defaults)
    const savedPrefs = loadMedicoPrefs(medicoId);
    const [open, setOpen] = useState(false);
    const [applicaFirma, setApplicaFirma] = useState(savedPrefs?.applicaFirma ?? false);
    const [apriPdf, setApriPdf] = useState(savedPrefs?.apriPdf ?? false);
    const [stampaCopie, setStampaCopie] = useState(savedPrefs?.stampaCopie ?? 0);
    const [allegatiExtra, setAllegatiExtra] = useState<string[]>([]);

    const menuRef = useRef<HTMLDivElement>(null);
    const id = useId();

    // Re-load preferences when medicoId changes (e.g. navigating between visits)
    useEffect(() => {
        const prefs = loadMedicoPrefs(medicoId);
        if (prefs) {
            setApplicaFirma(prefs.applicaFirma);
            setApriPdf(prefs.apriPdf);
            setStampaCopie(prefs.stampaCopie);
        }
    }, [medicoId]);

    const handleSaveAsDefault = useCallback(() => {
        if (!medicoId) {
            showToast({ type: 'warning', message: 'Medico non identificato: impossibile salvare le preferenze' });
            return;
        }
        saveMedicoPrefs(medicoId, { applicaFirma, apriPdf, stampaCopie });
        showToast({ type: 'success', message: 'Preferenze salvate come predefinite per questo medico' });
    }, [medicoId, applicaFirma, apriPdf, stampaCopie, showToast]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const handleComplete = () => {
        setOpen(false);
        onComplete();
        // After completion, open/print the referto PDF
        if (apriPdf || stampaCopie > 0) {
            setTimeout(async () => {
                // Always call onCreateReferto – it opens the PDF in a new tab AND returns the URL
                const pdfUrl = await onCreateReferto();
                // If print copies requested, also open a dedicated window and trigger print
                if (stampaCopie > 0 && pdfUrl) {
                    // Open only if not already opened by apriPdf (avoid double tabs)
                    const printWindow = apriPdf ? null : window.open(pdfUrl, '_blank');
                    const target = printWindow;
                    if (target) {
                        target.addEventListener('load', () => {
                            try { target.focus(); target.print(); } catch (_) { }
                        });
                    }
                }
            }, 3000);
        }
    };

    const toggleAllegato = (docId: string) => {
        setAllegatiExtra(prev => prev.includes(docId) ? prev.filter(x => x !== docId) : [...prev, docId]);
    };

    const isDisabled = isReadonly || !!completionPhase;

    if (completionPhase) {
        // Multi-step progress indicator
        return (
            <div className="flex items-center gap-3 px-5 py-2 bg-teal-50 border border-teal-200 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-teal-700">
                        {completionPhase === 'saving' && 'Salvataggio dati...'}
                        {completionPhase === 'generating-pdf' && 'Generazione referto PDF...'}
                        {completionPhase === 'completing' && 'Completamento visita...'}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                        <div className={`h-1.5 w-8 rounded-full transition-colors duration-300 ${completionPhase === 'saving' ? 'bg-teal-500' : 'bg-teal-400'}`} />
                        <div className={`h-1.5 w-8 rounded-full transition-colors duration-300 ${completionPhase === 'generating-pdf' ? 'bg-teal-500' : completionPhase === 'completing' ? 'bg-teal-400' : 'bg-gray-200'}`} />
                        <div className={`h-1.5 w-8 rounded-full transition-colors duration-300 ${completionPhase === 'completing' ? 'bg-teal-500' : 'bg-gray-200'}`} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative" ref={menuRef}>
            {/* ─── Split button ─── */}
            <div className="flex rounded-lg overflow-hidden shadow-sm">
                {/* Primary action */}
                <button
                    onClick={handleComplete}
                    disabled={isDisabled}
                    title="Salva, genera il referto PDF e completa la visita"
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <CheckCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Salva e Completa</span>
                </button>

                {/* Divider */}
                <div className="w-px bg-teal-700/50" />

                {/* Dropdown toggle */}
                <button
                    onClick={() => setOpen(prev => !prev)}
                    disabled={isDisabled}
                    aria-expanded={open}
                    aria-controls={`${id}-menu`}
                    title="Opzioni completamento"
                    className={`flex items-center px-2 py-2 bg-teal-600 text-white hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                        ${open ? 'bg-teal-700' : ''}`}
                >
                    <ChevronDown className={`h-4 w-4 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {/* ─── Badge: opzioni attive ─── */}
            {(invioRefertoMail || applicaFirma || apriPdf || stampaCopie > 0) && (
                <div className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-teal-800 text-white text-[10px] font-bold rounded-full px-1">
                    {[invioRefertoMail, applicaFirma, apriPdf, stampaCopie > 0].filter(Boolean).length}
                </div>
            )}

            {/* ─── Dropdown panel ─── */}
            {open && (
                <div
                    id={`${id}-menu`}
                    role="menu"
                    className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden"
                >
                    <div className="px-4 py-3 bg-teal-50 border-b border-teal-100">
                        <p className="text-xs font-semibold text-teal-800 uppercase tracking-wide">Opzioni completamento</p>
                    </div>

                    <div className="p-3 space-y-3">
                        {/* 1. Invia referto via email */}
                        <div className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${invioRefertoMail ? 'bg-teal-50/50' : 'hover:bg-gray-50'}`}>
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 flex-shrink-0 mt-0.5">
                                <Mail className="h-3.5 w-3.5 text-teal-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800">Invia referto via email</p>
                                {isMDLVisit ? (
                                    <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                                        <Info className="h-3 w-3 flex-shrink-0" />
                                        Invio automatico schedulato per MDL
                                    </p>
                                ) : (
                                    <p className="text-xs text-gray-400 mt-0.5">Al completamento della visita</p>
                                )}
                            </div>
                            <Toggle
                                checked={invioRefertoMail}
                                onChange={onInvioRefertoMailChange}
                                disabled={isReadonly || isMDLVisit || saveInvioMailPending}
                            />
                        </div>

                        {/* Marketing allegati — visibile solo se invio mail attivo */}
                        {invioRefertoMail && !isMDLVisit && marketingDocs && marketingDocs.length > 0 && (
                            <div className="ml-10 pl-1">
                                <p className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
                                    <Paperclip className="h-3 w-3" />
                                    Allegati aggiuntivi
                                </p>
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {marketingDocs.map(doc => (
                                        <label key={doc.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={allegatiExtra.includes(doc.id)}
                                                onChange={() => toggleAllegato(doc.id)}
                                                className="rounded text-teal-600 text-xs focus:ring-teal-500"
                                            />
                                            <span className="text-xs text-gray-700 truncate">{doc.nome}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 2. Applica firma medico */}
                        <div className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${applicaFirma ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 flex-shrink-0 mt-0.5">
                                <PenLine className="h-3.5 w-3.5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800">Applica firma medico</p>
                                <p className="text-xs text-gray-400 mt-0.5">Aggiunge la firma digitale al referto</p>
                            </div>
                            <Toggle
                                checked={applicaFirma}
                                onChange={setApplicaFirma}
                                disabled={isReadonly}
                            />
                        </div>

                        {/* 3. Apri PDF dopo completamento */}
                        <div className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${apriPdf ? 'bg-gray-50' : 'hover:bg-gray-50'}`}>
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 flex-shrink-0 mt-0.5">
                                <FileText className="h-3.5 w-3.5 text-gray-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800">Apri PDF dopo completamento</p>
                                <p className="text-xs text-gray-400 mt-0.5">Apre il referto in una nuova scheda</p>
                            </div>
                            <Toggle
                                checked={apriPdf}
                                onChange={setApriPdf}
                                disabled={isReadonly}
                            />
                        </div>

                        {/* 4. Stampa copie */}
                        <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 flex-shrink-0 mt-0.5">
                                <Printer className="h-3.5 w-3.5 text-gray-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800">Stampa copie</p>
                                <p className="text-xs text-gray-400 mt-0.5">Numero copie cartacee da stampare</p>
                            </div>
                            <select
                                value={stampaCopie}
                                onChange={e => setStampaCopie(Number(e.target.value))}
                                disabled={isReadonly}
                                className="w-14 text-sm border border-gray-300 rounded-md px-1.5 py-1 focus:ring-1 focus:ring-teal-500 focus:border-transparent disabled:opacity-50"
                            >
                                {[0, 1, 2, 3, 4, 5].map(n => (
                                    <option key={n} value={n}>{n === 0 ? '—' : `${n}x`}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 space-y-2">
                        {/* Salva come predefinite per questo medico */}
                        {medicoId && (
                            <button
                                type="button"
                                onClick={handleSaveAsDefault}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-teal-700 border border-teal-300 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors text-sm font-medium"
                            >
                                <BookmarkCheck className="h-4 w-4" />
                                Salva come predefinite
                            </button>
                        )}
                        <button
                            onClick={handleComplete}
                            disabled={isDisabled}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 text-sm font-medium"
                        >
                            <CheckCircle className="h-4 w-4" />
                            Salva e Completa
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalvaCompletaMenu;
