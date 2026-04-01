import React from 'react';
import { Calculator } from 'lucide-react';
import type { CompanyTotals, CompanyConfig, ScontoApplicato } from '../types';

interface PriceBreakdownProps {
  totals: CompanyTotals;
  config: CompanyConfig;
  scontoApplicato: ScontoApplicato | null;
}

/**
 * Price breakdown preview component
 * 
 * Displays detailed calculation breakdown with IVA and final total
 */
export function PriceBreakdown({ totals, config, scontoApplicato }: PriceBreakdownProps) {
  return (
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30 p-5 rounded-lg border-2 border-orange-200 dark:border-orange-800">
      <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
        <Calculator className="w-5 h-5 text-orange-600 dark:text-orange-400" />
        Anteprima Calcolo
      </h4>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">
            Prezzo base ({config.numPartecipanti} partecipanti):
          </span>
          <span className="font-medium dark:text-gray-200">
            €{totals.prezzoBase.toFixed(2)}
          </span>
        </div>
        {totals.totaleSpese > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Spese accessorie:</span>
            <span className="font-medium dark:text-gray-200">
              €{totals.totaleSpese.toFixed(2)}
            </span>
          </div>
        )}
        {totals.importoSconto > 0 && (
          <>
            <div className="flex justify-between pt-2 border-t dark:border-gray-600">
              <span className="text-gray-600 dark:text-gray-400">Subtotale:</span>
              <span className="font-medium dark:text-gray-200">
                €{totals.subtotale.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <span>Sconto ({scontoApplicato?.percentuale}%):</span>
              <span className="font-medium">
                -€{totals.importoSconto.toFixed(2)}
              </span>
            </div>
          </>
        )}
        <div className="flex justify-between pt-2 border-t dark:border-gray-600">
          <span className="text-gray-700 dark:text-gray-300 font-medium">Imponibile:</span>
          <span className="font-semibold dark:text-gray-200">
            €{totals.imponibile.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">
            IVA ({totals.percentualeIva}%):
          </span>
          <span className="font-medium dark:text-gray-200">
            €{totals.importoIva.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between pt-3 border-t-2 border-orange-300 dark:border-orange-600">
          <span className="text-gray-800 dark:text-gray-100 font-bold text-base">
            TOTALE FINALE:
          </span>
          <span className="font-bold text-orange-600 dark:text-orange-400 text-lg">
            €{totals.importoFinale.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
