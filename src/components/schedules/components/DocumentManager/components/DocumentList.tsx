/**
 * DocumentList Component
 * 
 * Displays a list of generated documents with optional batch download.
 */

import React from 'react';
import { Download } from 'lucide-react';
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
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  iconColor,
  showZipDownload = false,
  onDownload,
  onEdit,
  onDelete,
  onDownloadZip,
  getDocumentName
}) => {
  if (documents.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t space-y-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-medium text-gray-600">Documenti generati:</div>
        {showZipDownload && documents.length > 1 && onDownloadZip && (
          <button
            onClick={onDownloadZip}
            className={`text-xs flex items-center gap-1 ${iconColor.replace('text-', 'text-')} hover:opacity-80 font-medium`}
          >
            <Download className="w-3 h-3" />
            Scarica tutto (ZIP)
          </button>
        )}
      </div>
      {documents.map(doc => (
        <DocumentItem
          key={doc.id}
          id={doc.id}
          name={getDocumentName(doc)}
          numero={doc.numeroProgressivo}
          anno={doc.annoProgressivo}
          iconColor={iconColor}
          onDownload={() => onDownload(doc.id)}
          onEdit={onEdit ? () => onEdit(doc) : undefined}
          onDelete={() => onDelete(doc.id)}
        />
      ))}
    </div>
  );
};
