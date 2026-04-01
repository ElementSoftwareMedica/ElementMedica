/**
 * DocumentList Component
 * 
 * Displays a list of generated documents with optional batch download.
 */

import React from 'react';
import { Download, PenLine } from 'lucide-react';
import { DocumentItem } from './DocumentItem';

export interface DocumentListProps {
  documents: any[];
  iconColor: string;
  showZipDownload?: boolean;
  onDownload: (id: string) => void;
  onEdit?: (doc: any) => void;
  onDelete: (id: string) => void;
  onDownloadZip?: () => void;
  getDocumentName: (doc: any) => string;
  /** Optional: callback to sign a single document */
  onSign?: (id: string) => void;
  /** Optional: callback to sign all documents - shown as a "Firma tutti" button */
  onSignAll?: () => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  iconColor,
  showZipDownload = false,
  onDownload,
  onEdit,
  onDelete,
  onDownloadZip,
  getDocumentName,
  onSign,
  onSignAll
}) => {
  // Defensive check: ensure documents is an array
  const safeDocuments = Array.isArray(documents) ? documents : [];

  if (safeDocuments.length === 0) return null;

  const unsignedDocs = safeDocuments.filter(d => !d.signedAt && !d.firmaFormatore);

  return (
    <div className="mt-3 pt-3 border-t dark:border-gray-700 space-y-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Documenti generati:</div>
        <div className="flex items-center gap-3">
          {onSignAll && unsignedDocs.length > 1 && (
            <button
              onClick={onSignAll}
              className="text-xs flex items-center gap-1 text-teal-600 dark:text-teal-400 hover:opacity-80 font-medium"
            >
              <PenLine className="w-3 h-3" />
              Firma tutti
            </button>
          )}
          {showZipDownload && safeDocuments.length > 1 && onDownloadZip && (
            <button
              onClick={onDownloadZip}
              className={`text-xs flex items-center gap-1 ${iconColor} hover:opacity-80 font-medium`}
            >
              <Download className="w-3 h-3" />
              Scarica tutto (ZIP)
            </button>
          )}
        </div>
      </div>
      {safeDocuments.map(doc => (
        <DocumentItem
          key={doc.id}
          id={doc.id}
          name={getDocumentName(doc)}
          numero={doc.numeroProgressivo}
          anno={doc.annoProgressivo}
          price={doc.importoFinale}
          imponibile={doc.imponibile}
          iconColor={iconColor}
          isSigned={Boolean(doc.signedAt || doc.firmaFormatore)}
          signedAt={doc.signedAt ?? doc.firmaFormatoreAt ?? undefined}
          onSign={onSign ? () => onSign(doc.id) : undefined}
          onDownload={() => onDownload(doc.id)}
          onEdit={onEdit ? () => onEdit(doc) : undefined}
          onDelete={() => onDelete(doc.id)}
        />
      ))}
    </div>
  );
};
