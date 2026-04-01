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
  /** Sign a single document by id */
  onSign?: (id: string) => void;
  /** Sign all unsigned documents in this section */
  onSignAll?: () => void;
}

const colorMap = {
  blue: {
    gradient: 'from-blue-50 dark:from-blue-900/20',
    icon: 'text-blue-600 dark:text-blue-400',
    button: 'bg-blue-600 hover:bg-blue-700',
    badge: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
  },
  purple: {
    gradient: 'from-purple-50 dark:from-purple-900/20',
    icon: 'text-purple-600 dark:text-purple-400',
    button: 'bg-purple-600 hover:bg-purple-700',
    badge: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
  },
  green: {
    gradient: 'from-green-50 dark:from-green-900/20',
    icon: 'text-green-600 dark:text-green-400',
    button: 'bg-green-600 hover:bg-green-700',
    badge: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
  },
  orange: {
    gradient: 'from-orange-50 dark:from-orange-900/20',
    icon: 'text-orange-600 dark:text-orange-400',
    button: 'bg-orange-600 hover:bg-orange-700',
    badge: 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300'
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
  buttonText,
  onSign,
  onSignAll
}) => {
  const colors = colorMap[color];

  return (
    <div className={`border dark:border-gray-700 rounded-lg p-4 bg-gradient-to-r ${colors.gradient} to-white dark:to-gray-800`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Icon className={`w-5 h-5 ${colors.icon}`} />
            <h5 className="font-semibold text-gray-800 dark:text-gray-100">{title}</h5>
            {count > 0 && (
              <span className={`ml-2 px-2 py-0.5 text-xs ${colors.badge} rounded-full`}>
                {count} generat{count === 1 ? 'o' : 'i'}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{description}</p>
          {details && (
            <div className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-1 rounded border dark:border-gray-600 mb-3">
              {details}
            </div>
          )}
        </div>
        <button
          onClick={onGenerate}
          disabled={!canGenerate || loading}
          className={`px-4 py-2 ${colors.button} text-white rounded-full disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center gap-2 min-w-[140px] justify-center`}
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
        <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded border dark:border-amber-800 mb-2">
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
        onSign={onSign}
        onSignAll={onSignAll}
      />
    </div>
  );
};
