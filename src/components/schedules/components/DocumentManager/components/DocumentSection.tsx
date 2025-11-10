/**
 * DocumentSection Component
 * 
 * Reusable section for document generation with header, button, and list.
 */

import React from 'react';
import { Download, Loader2, LucideIcon } from 'lucide-react';
import { DocumentList } from './DocumentList';

export interface DocumentSectionProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: 'blue' | 'purple' | 'green' | 'orange';
  count: number;
  canGenerate: boolean;
  loading: boolean;
  warningMessage?: string;
  details?: React.ReactNode;
  onGenerate: () => void;
  documents: any[];
  showZipDownload?: boolean;
  onDownload: (id: string) => void;
  onEdit?: (doc: any) => void;
  onDelete: (id: string) => void;
  onDownloadZip?: () => void;
  getDocumentName: (doc: any) => string;
  buttonText?: string;
}

const colorMap = {
  blue: {
    gradient: 'from-blue-50',
    icon: 'text-blue-600',
    button: 'bg-blue-600 hover:bg-blue-700',
    badge: 'bg-blue-100 text-blue-700'
  },
  purple: {
    gradient: 'from-purple-50',
    icon: 'text-purple-600',
    button: 'bg-purple-600 hover:bg-purple-700',
    badge: 'bg-purple-100 text-purple-700'
  },
  green: {
    gradient: 'from-green-50',
    icon: 'text-green-600',
    button: 'bg-green-600 hover:bg-green-700',
    badge: 'bg-green-100 text-green-700'
  },
  orange: {
    gradient: 'from-orange-50',
    icon: 'text-orange-600',
    button: 'bg-orange-600 hover:bg-orange-700',
    badge: 'bg-orange-100 text-orange-700'
  }
};

export const DocumentSection: React.FC<DocumentSectionProps> = ({
  title,
  description,
  icon: Icon,
  color,
  count,
  canGenerate,
  loading,
  warningMessage,
  details,
  onGenerate,
  documents,
  showZipDownload = false,
  onDownload,
  onEdit,
  onDelete,
  onDownloadZip,
  getDocumentName,
  buttonText
}) => {
  const colors = colorMap[color];

  return (
    <div className={`border rounded-lg p-4 bg-gradient-to-r ${colors.gradient} to-white`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Icon className={`w-5 h-5 ${colors.icon}`} />
            <h5 className="font-semibold text-gray-800">{title}</h5>
            {count > 0 && (
              <span className={`ml-2 px-2 py-0.5 text-xs ${colors.badge} rounded-full`}>
                {count} generat{count === 1 ? 'o' : 'i'}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-3">{description}</p>
          {details && (
            <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded border mb-3">
              {details}
            </div>
          )}
        </div>
        <button
          onClick={onGenerate}
          disabled={!canGenerate || loading}
          className={`px-4 py-2 ${colors.button} text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center gap-2 min-w-[140px] justify-center`}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generazione...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              {buttonText || `Genera ${title}`}
            </>
          )}
        </button>
      </div>
      
      {warningMessage && (
        <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border mb-2">
          {warningMessage}
        </div>
      )}

      <DocumentList
        documents={documents}
        iconColor={colors.icon}
        showZipDownload={showZipDownload}
        onDownload={onDownload}
        onEdit={onEdit}
        onDelete={onDelete}
        onDownloadZip={onDownloadZip}
        getDocumentName={getDocumentName}
      />
    </div>
  );
};
