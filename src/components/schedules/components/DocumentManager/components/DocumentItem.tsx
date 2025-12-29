/**
 * DocumentItem Component
 * 
 * Single document item with download/edit/delete actions.
 */

import React from 'react';
import { FileText, Download, Edit, Trash2 } from 'lucide-react';

export interface DocumentItemProps {
  id: string;
  name: string;
  numero?: number;
  anno?: number;
  price?: number; // Prezzo per preventivi
  imponibile?: number; // Imponibile (al netto IVA) per preventivi
  iconColor?: string;
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
  onDownload,
  onEdit,
  onDelete
}) => {
  // Convert imponibile from Decimal string to number
  const imponibileNum = imponibile !== undefined && imponibile !== null 
    ? (typeof imponibile === 'string' ? parseFloat(imponibile) : imponibile)
    : undefined;
  
  return (
    <div className="flex items-center justify-between p-2 bg-white rounded border text-sm hover:bg-gray-50">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <FileText className={`w-4 h-4 ${iconColor} flex-shrink-0`} />
        <span className="truncate">{name}</span>
        {imponibileNum !== undefined && !isNaN(imponibileNum) && (
          <span className="text-xs font-semibold text-blue-600">
            €{imponibileNum.toFixed(2)}
          </span>
        )}
        {numero && anno && (
          <span className="text-xs text-gray-400">
            #{numero}/{anno}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 ml-2">
        <button
          onClick={onDownload}
          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
          title="Scarica"
        >
          <Download className="w-4 h-4" />
        </button>
        {onEdit && (
          <button
            onClick={onEdit}
            className="p-1 text-orange-600 hover:bg-orange-50 rounded"
            title="Modifica"
          >
            <Edit className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onDelete}
          className="p-1 text-red-600 hover:bg-red-50 rounded"
          title="Elimina"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
