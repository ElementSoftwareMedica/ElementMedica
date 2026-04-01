/**
 * DocumentItem Component
 * 
 * Single document item with download/edit/delete actions.
 */

import React from 'react';
import { FileText, Download, Edit, Trash2, PenLine, CheckCircle } from 'lucide-react';

export interface DocumentItemProps {
  id: string;
  name: string;
  numero?: number;
  anno?: number;
  price?: number; // Prezzo per preventivi
  imponibile?: number; // Imponibile (al netto IVA) per preventivi
  iconColor?: string;
  /** Se true, mostra badge "Firmato" con data */
  isSigned?: boolean;
  /** Data firma ISO string */
  signedAt?: string;
  /** Se presente, mostra il pulsante "Firma" */
  onSign?: () => void;
  onDownload: () => void;
  onEdit?: () => void;
  onDelete: () => void;
}

export const DocumentItem: React.FC<DocumentItemProps> = ({
  name,
  numero,
  anno,
  price,
  imponibile,
  iconColor = 'text-blue-600',
  isSigned,
  signedAt,
  onSign,
  onDownload,
  onEdit,
  onDelete
}) => {
  // Convert imponibile from Decimal string to number
  const imponibileNum = imponibile !== undefined && imponibile !== null
    ? (typeof imponibile === 'string' ? parseFloat(imponibile) : imponibile)
    : undefined;

  const signedDateLabel = signedAt
    ? new Date(signedAt).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  return (
    <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <FileText className={`w-4 h-4 ${iconColor} flex-shrink-0`} />
        <span className="truncate dark:text-gray-200">{name}</span>
        {imponibileNum !== undefined && !isNaN(imponibileNum) && (
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
            €{imponibileNum.toFixed(2)}
          </span>
        )}
        {numero && anno && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            #{numero}/{anno}
          </span>
        )}
        {isSigned && (
          <span
            className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full flex-shrink-0"
            title={signedDateLabel ? `Firmato il ${signedDateLabel}` : 'Documento firmato'}
          >
            <CheckCircle className="w-3 h-3" />
            Firmato
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 ml-2">
        {onSign && !isSigned && (
          <button
            onClick={onSign}
            className="p-1 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded"
            title="Firma documento"
          >
            <PenLine className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onDownload}
          className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
          title="Scarica"
        >
          <Download className="w-4 h-4" />
        </button>
        {onEdit && (
          <button
            onClick={onEdit}
            className="p-1 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded"
            title="Modifica"
          >
            <Edit className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onDelete}
          className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
          title="Elimina"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
