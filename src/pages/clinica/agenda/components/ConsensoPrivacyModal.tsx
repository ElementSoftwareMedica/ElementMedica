/**
 * ConsensoPrivacyModal - Modal per gestione consenso privacy durante check-in
 * 
 * Verifica e registra i consensi GDPR necessari prima dell'accettazione.
 * 
 * @module pages/poliambulatorio/agenda/components/ConsensoPrivacyModal
 */

import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    X,
    Shield,
    CheckCircle,
    AlertCircle,
    FileText,
    Clock,
    User,
    Info,
    Printer
} from 'lucide-react';
import { Appuntamento } from '../../../../services/clinicaApi';

// ============================================
// TYPES
// ============================================

interface ConsensoType {
    id: string;
    nome: string;
    descrizione: string;
    obbligatorio: boolean;
    versione: string;
    dataUltimaModifica: string;
}

interface ConsensoPrivacyModalProps {
    appuntamento: Appuntamento;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (consensi: Record<string, boolean>) => void;
    isLoading?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const CONSENSI_RICHIESTI: ConsensoType[] = [
    {
        id: 'privacy_trattamento',
        nome: 'Trattamento Dati Personali',
        descrizione: 'Autorizzo il trattamento dei miei dati personali ai sensi del GDPR (Reg. UE 2016/679) per le finalità sanitarie.',
        obbligatorio: true,
        versione: '1.2',
        dataUltimaModifica: '2024-01-15'
    },
    {
        id: 'privacy_sanitario',
        nome: 'Trattamento Dati Sanitari',
        descrizione: 'Autorizzo il trattamento dei miei dati sanitari (categorie particolari ex art. 9 GDPR) per la prestazione sanitaria richiesta.',
        obbligatorio: true,
        versione: '1.1',
        dataUltimaModifica: '2024-01-15'
    },
    {
        id: 'consenso_informato',
        nome: 'Consenso Informato',
        descrizione: 'Dichiaro di essere stato informato sulle modalità, i rischi e le alternative della prestazione sanitaria e di acconsentire al suo svolgimento.',
        obbligatorio: true,
        versione: '2.0',
        dataUltimaModifica: '2024-03-01'
    },
    {
        id: 'privacy_comunicazioni',
        nome: 'Comunicazioni Sanitarie',
        descrizione: 'Autorizzo l\'invio di comunicazioni relative ai miei appuntamenti e referti via email/SMS.',
        obbligatorio: false,
        versione: '1.0',
        dataUltimaModifica: '2023-06-01'
    },
    {
        id: 'privacy_marketing',
        nome: 'Comunicazioni Promozionali',
        descrizione: 'Acconsento a ricevere comunicazioni su servizi, promozioni e iniziative del poliambulatorio.',
        obbligatorio: false,
        versione: '1.0',
        dataUltimaModifica: '2023-06-01'
    }
];

// ============================================
// COMPONENT
// ============================================

export const ConsensoPrivacyModal: React.FC<ConsensoPrivacyModalProps> = ({
    appuntamento,
    isOpen,
    onClose,
    onConfirm,
    isLoading = false
}) => {
    // State per i consensi
    const [consensi, setConsensi] = useState<Record<string, boolean>>(() =>
        CONSENSI_RICHIESTI.reduce((acc, c) => ({ ...acc, [c.id]: false }), {})
    );
    const [showInfo, setShowInfo] = useState<string | null>(null);

    // Verifica se tutti i consensi obbligatori sono stati dati
    const consensiObbligatoriOk = CONSENSI_RICHIESTI
        .filter(c => c.obbligatorio)
        .every(c => consensi[c.id]);

    // Handler toggle consenso
    const handleToggle = useCallback((id: string) => {
        setConsensi(prev => ({ ...prev, [id]: !prev[id] }));
    }, []);

    // Handler conferma
    const handleConfirm = useCallback(() => {
        if (consensiObbligatoriOk) {
            onConfirm(consensi);
        }
    }, [consensiObbligatoriOk, consensi, onConfirm]);

    // Handler stampa
    const handlePrint = useCallback(() => {
        window.print();
    }, []);

    if (!isOpen) return null;

    const paziente = appuntamento.paziente;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Shield className="h-7 w-7" />
                            <div>
                                <h2 className="text-lg font-semibold">Consenso Privacy</h2>
                                <p className="text-sm text-teal-100">
                                    Verifica consensi prima dell'accettazione
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Patient Info */}
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-teal-100 rounded-full flex items-center justify-center">
                            <User className="h-6 w-6 text-teal-600" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900">
                                {paziente ? `${paziente.cognome} ${paziente.nome}` : 'Paziente'}
                            </p>
                            <p className="text-sm text-gray-500">
                                {paziente?.codiceFiscale || 'CF non disponibile'}
                            </p>
                        </div>
                        <div className="ml-auto text-right">
                            <p className="text-sm text-gray-500">Appuntamento</p>
                            <p className="font-medium text-gray-900">
                                {new Date(appuntamento.dataOra).toLocaleTimeString('it-IT', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Consensi List */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                    <p className="text-sm text-gray-600 mb-4">
                        <Info className="h-4 w-4 inline mr-1" />
                        I consensi contrassegnati con <span className="text-red-500">*</span> sono obbligatori
                    </p>

                    {CONSENSI_RICHIESTI.map((consenso) => (
                        <div
                            key={consenso.id}
                            className={`
                                border rounded-xl p-4 transition-all
                                ${consensi[consenso.id]
                                    ? 'border-teal-300 bg-teal-50'
                                    : 'border-gray-200 bg-white'}
                            `}
                        >
                            <div className="flex items-start gap-3">
                                {/* Checkbox */}
                                <label className="flex items-center cursor-pointer mt-1">
                                    <input
                                        type="checkbox"
                                        checked={consensi[consenso.id]}
                                        onChange={() => handleToggle(consenso.id)}
                                        className="sr-only"
                                    />
                                    <div className={`
                                        h-6 w-6 rounded-md border-2 flex items-center justify-center
                                        transition-all
                                        ${consensi[consenso.id]
                                            ? 'bg-teal-600 border-teal-600'
                                            : 'border-gray-300'}
                                    `}>
                                        {consensi[consenso.id] && (
                                            <CheckCircle className="h-4 w-4 text-white" />
                                        )}
                                    </div>
                                </label>

                                {/* Content */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900">
                                            {consenso.nome}
                                        </span>
                                        {consenso.obbligatorio && (
                                            <span className="text-red-500">*</span>
                                        )}
                                        <span className="text-xs text-gray-400">
                                            v{consenso.versione}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {consenso.descrizione}
                                    </p>
                                    <button
                                        onClick={() => setShowInfo(showInfo === consenso.id ? null : consenso.id)}
                                        className="text-xs text-teal-600 hover:text-teal-700 mt-2 flex items-center gap-1"
                                    >
                                        <FileText className="h-3 w-3" />
                                        Visualizza informativa completa
                                    </button>
                                </div>
                            </div>

                            {/* Info panel */}
                            {showInfo === consenso.id && (
                                <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600">
                                    <p className="mb-2">
                                        <strong>Ultima modifica:</strong> {new Date(consenso.dataUltimaModifica).toLocaleDateString('it-IT')}
                                    </p>
                                    <p>
                                        Per maggiori informazioni, consultare l'informativa privacy
                                        completa disponibile presso la reception o sul sito web.
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                        >
                            <Printer className="h-4 w-4" />
                            Stampa modulo
                        </button>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={!consensiObbligatoriOk || isLoading}
                                className={`
                                    px-6 py-2 rounded-lg font-medium flex items-center gap-2
                                    ${consensiObbligatoriOk
                                        ? 'bg-teal-600 text-white hover:bg-teal-700'
                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
                                    disabled:opacity-50
                                `}
                            >
                                {isLoading ? (
                                    <Clock className="h-4 w-4 animate-spin" />
                                ) : (
                                    <CheckCircle className="h-4 w-4" />
                                )}
                                Conferma Accettazione
                            </button>
                        </div>
                    </div>

                    {!consensiObbligatoriOk && (
                        <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            Tutti i consensi obbligatori devono essere accettati
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConsensoPrivacyModal;
