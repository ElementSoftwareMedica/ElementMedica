/**
 * MedicoForm - Documents List
 * 
 * Component to display and manage medico documents.
 */

import React from 'react';
import { FileText, Upload, Clock, ExternalLink, Trash2 } from 'lucide-react';
import type { PersonDocument } from '../../../../services/clinicaApi';
import { getDocumentTypeLabel } from './types';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';

interface DocumentsListProps {
    documents: PersonDocument[];
    onAddDocument: () => void;
    onDeleteDocument: (docId: string) => void;
    isDeleting?: boolean;
}

/**
 * Check if document is expiring soon (within 30 days)
 */
const isExpiringSoon = (doc: PersonDocument): boolean => {
    if (!doc.dataScadenza) return false;
    const daysUntilExpiry = Math.ceil(
        (new Date(doc.dataScadenza).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
};

const DocumentsList: React.FC<DocumentsListProps> = ({
    documents,
    onAddDocument,
    onDeleteDocument
}) => {
    const { confirmDelete } = useConfirmDialog();

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-teal-600" />
                    Documenti Personali
                </h2>
                <button
                    type="button"
                    onClick={onAddDocument}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
                >
                    <Upload className="h-4 w-4" />
                    Carica Documento
                </button>
            </div>

            {documents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Nessun documento caricato</p>
                    <p className="text-xs mt-1">Carica contratti, assicurazioni, certificati e altri documenti</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {documents.map((doc) => (
                        <div
                            key={doc.id}
                            className={`flex items-center justify-between p-4 rounded-lg border ${doc.isExpired
                                ? 'bg-red-50 border-red-200'
                                : isExpiringSoon(doc)
                                    ? 'bg-amber-50 border-amber-200'
                                    : 'bg-gray-50 border-gray-200'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${doc.isExpired
                                    ? 'bg-red-100'
                                    : isExpiringSoon(doc)
                                        ? 'bg-amber-100'
                                        : 'bg-gray-100'
                                    }`}>
                                    <FileText className={`h-5 w-5 ${doc.isExpired
                                        ? 'text-red-600'
                                        : isExpiringSoon(doc)
                                            ? 'text-amber-600'
                                            : 'text-gray-600'
                                        }`} />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">{doc.titolo}</p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span className="px-2 py-0.5 bg-white border border-gray-200 rounded">
                                            {getDocumentTypeLabel(doc.tipo)}
                                        </span>
                                        {doc.version > 1 && (
                                            <span className="text-blue-600">v{doc.version}</span>
                                        )}
                                        {doc.dataScadenza && (
                                            <span className={`flex items-center gap-1 ${doc.isExpired
                                                ? 'text-red-600 font-medium'
                                                : isExpiringSoon(doc)
                                                    ? 'text-amber-600'
                                                    : ''
                                                }`}>
                                                <Clock className="h-3 w-3" />
                                                {doc.isExpired
                                                    ? 'Scaduto'
                                                    : `Scade: ${new Date(doc.dataScadenza).toLocaleDateString('it-IT')}`
                                                }
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={doc.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                    title="Visualizza"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (await confirmDelete('questo documento')) {
                                            onDeleteDocument(doc.id);
                                        }
                                    }}
                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Elimina"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DocumentsList;
