/**
 * PriceCalculator Widget Component
 * 
 * Componente per il calcolo real-time del prezzo di una prestazione.
 * Mostra il breakdown completo con:
 * - Fonte del prezzo (listino base, convenzione, bundle, ecc.)
 * - Compenso medico calcolato
 * - IVA applicata
 * - Eventuale sconto
 * 
 * Usato nel flusso di prenotazione e nella creazione fatture.
 * 
 * @module components/clinica/PriceCalculator
 */

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Euro,
    Info,
    Loader2,
    AlertCircle,
    Tag,
    User,
    Building2,
    Package,
    ChevronDown,
    ChevronUp,
    Percent,
    FileText,
} from 'lucide-react';

import { tariffarioApi, CalcoloPrezzoOutput, FontePrezzoBase } from '../../services/clinicaApi';

// =====================================================
// TYPES
// =====================================================

interface PriceCalculatorProps {
    prestazioneId: string;
    medicoId?: string;
    convenzioneId?: string;
    bundleId?: string;
    pazienteId?: string;
    codiceSconto?: string;
    quantity?: number;
    showBreakdown?: boolean;
    showCompensoMedico?: boolean;
    compact?: boolean;
    className?: string;
    onPriceCalculated?: (result: CalcoloPrezzoOutput) => void;
}

interface FonteConfig {
    label: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
}

// =====================================================
// CONSTANTS
// =====================================================

const FONTE_CONFIG: Record<FontePrezzoBase, FonteConfig> = {
    'LISTINO_MEDICO_CONVENZIONE': {
        label: 'Listino Medico + Convenzione',
        icon: User,
        color: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    'LISTINO_CONVENZIONE': {
        label: 'Listino Convenzione',
        icon: Building2,
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    'LISTINO_MEDICO': {
        label: 'Listino Medico',
        icon: User,
        color: 'text-indigo-600 dark:text-indigo-400',
        bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    },
    'LISTINO_GENERICO': {
        label: 'Listino Generico',
        icon: Tag,
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-100 dark:bg-gray-700',
    },
    'PREZZO_BASE': {
        label: 'Prezzo Base',
        icon: Euro,
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-100 dark:bg-gray-700',
    },
    'BUNDLE': {
        label: 'Prezzo Bundle',
        icon: Package,
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '€0,00';
    return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR'
    }).format(value);
};

const formatPercent = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '0%';
    return `${value.toFixed(1)}%`;
};

// =====================================================
// SUB-COMPONENTS
// =====================================================

/**
 * FonteBadge - Mostra la fonte del prezzo con icona
 */
const FonteBadge: React.FC<{ fonte: FontePrezzoBase }> = ({ fonte }) => {
    const config = FONTE_CONFIG[fonte] || FONTE_CONFIG['PREZZO_BASE'];
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
            <Icon className="w-3 h-3" />
            {config.label}
        </span>
    );
};

/**
 * PriceRow - Riga singola del breakdown
 */
const PriceRow: React.FC<{
    label: string;
    value: number;
    type?: 'add' | 'subtract' | 'total' | 'neutral';
    highlight?: boolean;
    subtext?: string;
}> = ({ label, value, type = 'neutral', highlight = false, subtext }) => {
    const valueClasses = {
        add: 'text-green-600 dark:text-green-400',
        subtract: 'text-red-600 dark:text-red-400',
        total: 'text-gray-900 dark:text-white font-bold text-lg',
        neutral: 'text-gray-700 dark:text-gray-300',
    };

    return (
        <div className={`flex items-center justify-between py-2 ${highlight ? 'bg-gray-50 dark:bg-gray-700/50 -mx-3 px-3 rounded' : ''}`}>
            <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
                {subtext && (
                    <span className="block text-xs text-gray-400 dark:text-gray-500">{subtext}</span>
                )}
            </div>
            <span className={`font-medium ${valueClasses[type]}`}>
                {type === 'subtract' && value > 0 && '-'}
                {formatCurrency(Math.abs(value))}
            </span>
        </div>
    );
};

// =====================================================
// MAIN COMPONENT
// =====================================================

export const PriceCalculator: React.FC<PriceCalculatorProps> = ({
    prestazioneId,
    medicoId,
    convenzioneId,
    bundleId,
    pazienteId,
    codiceSconto,
    quantity = 1,
    showBreakdown = true,
    showCompensoMedico = true,
    compact = false,
    className = '',
    onPriceCalculated,
}) => {
    const [isExpanded, setIsExpanded] = React.useState(!compact);

    // Query per calcolo prezzo
    const { data: prezzoResult, isLoading, isError, error } = useQuery({
        queryKey: ['prezzo-calcolo', prestazioneId, medicoId, convenzioneId, bundleId, pazienteId, codiceSconto],
        queryFn: () => tariffarioApi.calcolaPrezzo({
            prestazioneId,
            medicoId,
            convenzioneId,
            bundleId,
            pazienteId,
            codiceSconto,
        }),
        enabled: !!prestazioneId,
        staleTime: 30000, // Cache per 30 secondi
    });

    // Notify parent when price is calculated
    React.useEffect(() => {
        if (prezzoResult && onPriceCalculated) {
            onPriceCalculated(prezzoResult);
        }
    }, [prezzoResult, onPriceCalculated]);

    // Calcoli derivati
    const calcoli = useMemo(() => {
        if (!prezzoResult) return null;

        const prezzoOriginale = prezzoResult.prezzoOriginale || 0;
        const scontoApplicato = prezzoResult.scontoApplicato || 0;
        const ivaAliquota = prezzoResult.ivaAliquota || 0;
        const importoIva = prezzoResult.importoIva || 0;
        const prezzoFinale = prezzoResult.prezzoFinale || 0;
        const totaleConIva = prezzoResult.totaleConIva || 0;
        const compensoMedico = prezzoResult.compensoMedico || 0;

        const prezzoTotale = totaleConIva * quantity;
        const compensoTotale = compensoMedico * quantity;
        const margineLordo = prezzoFinale - compensoMedico;
        const percentualeCompenso = prezzoFinale > 0 ? (compensoMedico / prezzoFinale) * 100 : 0;

        return {
            prezzoOriginale,
            scontoApplicato,
            ivaAliquota,
            importoIva,
            prezzoFinale,
            totaleConIva,
            prezzoTotale,
            compensoMedico,
            compensoTotale,
            margineLordo,
            percentualeCompenso,
        };
    }, [prezzoResult, quantity]);

    // Loading state
    if (isLoading) {
        return (
            <div className={`flex items-center justify-center py-6 ${className}`}>
                <Loader2 className="w-5 h-5 animate-spin text-teal-500 mr-2" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Calcolo prezzo...</span>
            </div>
        );
    }

    // Error state
    if (isError) {
        return (
            <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 ${className}`}>
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">
                            Errore nel calcolo del prezzo
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                            {error instanceof Error ? error.message : 'Si è verificato un errore'}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // No result
    if (!prezzoResult || !calcoli) {
        return (
            <div className={`text-center py-6 ${className}`}>
                <Tag className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Nessun prezzo disponibile
                </p>
            </div>
        );
    }

    // Compact view
    if (compact && !isExpanded) {
        return (
            <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${className}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
                            <Euro className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div>
                            <div className="text-xl font-bold text-gray-900 dark:text-white">
                                {formatCurrency(calcoli.prezzoTotale)}
                            </div>
                            <FonteBadge fonte={prezzoResult.fontePrezzoBase} />
                        </div>
                    </div>
                    <button
                        onClick={() => setIsExpanded(true)}
                        className="flex items-center gap-1 text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300"
                    >
                        Dettagli
                        <ChevronDown className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    // Full view
    return (
        <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
                            <Euro className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">Calcolo Prezzo</h3>
                            <FonteBadge fonte={prezzoResult.fontePrezzoBase} />
                        </div>
                    </div>
                    {compact && (
                        <button
                            onClick={() => setIsExpanded(false)}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            <ChevronUp className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Breakdown */}
            {showBreakdown && (
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Dettaglio Prezzo
                    </h4>
                    <div className="space-y-1">
                        <PriceRow
                            label="Prezzo Originale"
                            value={calcoli.prezzoOriginale}
                            type="neutral"
                        />
                        {calcoli.scontoApplicato > 0 && (
                            <PriceRow
                                label="Sconto"
                                value={calcoli.scontoApplicato}
                                type="subtract"
                                subtext={prezzoResult.scontoDescrizione}
                            />
                        )}
                        {calcoli.ivaAliquota > 0 && (
                            <PriceRow
                                label={`IVA (${formatPercent(calcoli.ivaAliquota)})`}
                                value={calcoli.importoIva}
                                type="add"
                            />
                        )}
                        <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
                        <PriceRow
                            label="Totale con IVA"
                            value={calcoli.totaleConIva}
                            type="total"
                            highlight
                        />
                        {quantity > 1 && (
                            <PriceRow
                                label={`Totale (x${quantity})`}
                                value={calcoli.prezzoTotale}
                                type="total"
                                highlight
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Compenso Medico */}
            {showCompensoMedico && calcoli.compensoMedico > 0 && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Compenso Medico
                    </h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Compenso</div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                                {formatCurrency(quantity > 1 ? calcoli.compensoTotale : calcoli.compensoMedico)}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Margine</div>
                            <div className="font-semibold text-green-600 dark:text-green-400">
                                {formatCurrency(calcoli.margineLordo * quantity)}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">% Medico</div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                                {formatPercent(calcoli.percentualeCompenso)}
                            </div>
                        </div>
                    </div>
                    {prezzoResult.compensoMedicoTipo && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <Percent className="w-3 h-3" />
                            <span>
                                Tipo: {prezzoResult.compensoMedicoTipo}
                                {' • '}
                                Fonte: {prezzoResult.compensoMedicoFonte}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Info footer */}
            {prezzoResult.listinoApplicatoId && (
                <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-100 dark:border-blue-800">
                    <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                        <Info className="w-3 h-3" />
                        <span>
                            {prezzoResult.listinoApplicatoNome || `Listino ${prezzoResult.listinoApplicatoId.slice(-8)}`}
                            {' • '}
                            Priorità: {prezzoResult.prioritaApplicata}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PriceCalculator;
