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

interface TutoreData {
    nome: string;
    cognome: string;
    cf: string;
}

/**
 * ConsensiData - Tipo per i dati dei consensi
 * Include i consensi booleani e opzionalmente i dati del tutore per minorenni
 */
interface ConsensiData {
    [key: string]: boolean | TutoreData | undefined;
    tutore?: TutoreData;
}

interface ConsensoPrivacyModalProps {
    appuntamento: Appuntamento;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (consensi: ConsensiData) => void;
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
        id: 'consenso_minorenne',
        nome: 'Consenso Genitore/Tutore (Minorenne)',
        descrizione: 'Come genitore/tutore legale del minore, autorizzo il trattamento dei dati personali e sanitari e lo svolgimento della prestazione sanitaria.',
        obbligatorio: false,  // Diventa obbligatorio se il paziente è minorenne
        versione: '1.0',
        dataUltimaModifica: '2024-06-01'
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
    const [tutoreNome, setTutoreNome] = useState('');
    const [tutoreCognome, setTutoreCognome] = useState('');
    const [tutoreCF, setTutoreCF] = useState('');

    // Calcola se il paziente è minorenne
    const paziente = appuntamento.paziente;
    const isMinorenne = React.useMemo(() => {
        if (!paziente?.dataNascita && !paziente?.birthDate) return false;
        const birthDate = new Date(paziente.dataNascita || paziente.birthDate || '');
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            return age - 1 < 18;
        }
        return age < 18;
    }, [paziente]);

    // Consensi con obbligatorietà dinamica per minorenni
    const consensiConObbligatori = React.useMemo(() => {
        return CONSENSI_RICHIESTI.map(c => ({
            ...c,
            obbligatorio: c.id === 'consenso_minorenne' ? isMinorenne : c.obbligatorio,
            // Nascondi il consenso minorenne se il paziente è maggiorenne
            hidden: c.id === 'consenso_minorenne' && !isMinorenne
        }));
    }, [isMinorenne]);

    // Verifica se tutti i consensi obbligatori sono stati dati
    const consensiObbligatoriOk = consensiConObbligatori
        .filter(c => c.obbligatorio && !c.hidden)
        .every(c => consensi[c.id]);

    // Per minorenni, verifica anche i dati del tutore
    const tutoreDataOk = !isMinorenne || (tutoreNome.trim() && tutoreCognome.trim() && tutoreCF.trim().length === 16);

    // Handler toggle consenso
    const handleToggle = useCallback((id: string) => {
        setConsensi(prev => ({ ...prev, [id]: !prev[id] }));
    }, []);

    // Handler conferma
    const handleConfirm = useCallback(() => {
        if (consensiObbligatoriOk && tutoreDataOk) {
            // Include tutore data if minorenne
            const consensiData = isMinorenne
                ? { ...consensi, tutore: { nome: tutoreNome, cognome: tutoreCognome, cf: tutoreCF } }
                : consensi;
            onConfirm(consensiData);
        }
    }, [consensiObbligatoriOk, tutoreDataOk, consensi, isMinorenne, tutoreNome, tutoreCognome, tutoreCF, onConfirm]);

    // Handler stampa
    const handlePrint = useCallback(() => {
        window.print();
    }, []);

    if (!isOpen) return null;

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
                            <div className="flex items-center gap-2">
                                <p className="text-sm text-gray-500">
                                    {paziente?.codiceFiscale || paziente?.taxCode || 'CF non disponibile'}
                                </p>
                                {isMinorenne && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                        Minorenne
                                    </span>
                                )}
                            </div>
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

                {/* Tutore Section (solo se minorenne) */}
                {isMinorenne && (
                    <div className="px-6 py-4 bg-amber-50 border-b border-amber-200">
                        <h3 className="font-medium text-amber-800 mb-3 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Dati Genitore/Tutore Legale *
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Cognome *</label>
                                <input
                                    type="text"
                                    value={tutoreCognome}
                                    onChange={(e) => setTutoreCognome(e.target.value)}
                                    placeholder="Cognome tutore"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Nome *</label>
                                <input
                                    type="text"
                                    value={tutoreNome}
                                    onChange={(e) => setTutoreNome(e.target.value)}
                                    placeholder="Nome tutore"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Codice Fiscale *</label>
                                <input
                                    type="text"
                                    value={tutoreCF}
                                    onChange={(e) => setTutoreCF(e.target.value.toUpperCase().slice(0, 16))}
                                    placeholder="RSSMRA85M01H501Z"
                                    maxLength={16}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Consensi List */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                    <p className="text-sm text-gray-600 mb-4">
                        <Info className="h-4 w-4 inline mr-1" />
                        I consensi contrassegnati con <span className="text-red-500">*</span> sono obbligatori
                    </p>

                    {consensiConObbligatori.filter(c => !c.hidden).map((consenso) => (
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
                                disabled={!consensiObbligatoriOk || !tutoreDataOk || isLoading}
                                className={`
                                    px-6 py-2 rounded-lg font-medium flex items-center gap-2
                                    ${consensiObbligatoriOk && tutoreDataOk
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
                    {consensiObbligatoriOk && !tutoreDataOk && (
                        <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            Inserire i dati del genitore/tutore (nome, cognome e codice fiscale)
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConsensoPrivacyModal;
