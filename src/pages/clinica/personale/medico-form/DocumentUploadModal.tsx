/**
 * MedicoForm - Document Upload Modal
 * 
 * Modal for uploading documents for a medico.
 */

import React, { useRef } from 'react';
import { FileText, Upload, Loader2 } from 'lucide-react';
import Modal from '../../../../design-system/molecules/Modal/Modal';
import { DOCUMENT_TYPES, type DocumentFormState } from './types';
import type { TipoDocumentoPersonale } from '../../../../services/clinicaApi';
import { DatePickerElegante } from '../../../../components/ui/DatePickerElegante';

interface DocumentUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentForm: DocumentFormState;
    setDocumentForm: React.Dispatch<React.SetStateAction<DocumentFormState>>;
    onUpload: () => void;
    isUploading: boolean;
}

const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
    isOpen,
    onClose,
    documentForm,
    setDocumentForm,
    onUpload,
    isUploading
}) => {
    const documentInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setDocumentForm(prev => ({
                ...prev,
                file,
                titolo: prev.titolo || file.name.replace(/\.[^/.]+$/, '') // Use filename as default title
            }));
        }
    };

    const handleClose = () => {
        onClose();
        setDocumentForm({
            tipo: 'CONTRATTO',
            titolo: '',
            descrizione: '',
            dataScadenza: '',
            file: null
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Carica Documento"
        >
            <div className="p-6 space-y-4">
                {/* File Input */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        File <span className="text-red-500">*</span>
                    </label>
                    <input
                        ref={documentInputRef}
                        type="file"
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        className="hidden"
                    />
                    <div
                        onClick={() => documentInputRef.current?.click()}
                        className={`w-full p-4 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${documentForm.file
                            ? 'border-teal-500 bg-teal-50'
                            : 'border-gray-300 hover:border-teal-400'
                            }`}
                    >
                        {documentForm.file ? (
                            <div className="flex items-center justify-center gap-2">
                                <FileText className="h-5 w-5 text-teal-600" />
                                <span className="text-teal-700 font-medium">{documentForm.file.name}</span>
                                <span className="text-gray-500 text-sm">
                                    ({(documentForm.file.size / 1024).toFixed(1)} KB)
                                </span>
                            </div>
                        ) : (
                            <div className="text-gray-500">
                                <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                <p>Clicca per selezionare un file</p>
                                <p className="text-xs mt-1">PDF, DOC, DOCX, JPG, PNG</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Document Type */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo Documento <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={documentForm.tipo}
                        onChange={(e) => setDocumentForm(prev => ({
                            ...prev,
                            tipo: e.target.value as TipoDocumentoPersonale
                        }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                        {DOCUMENT_TYPES.map(dt => (
                            <option key={dt.value} value={dt.value}>
                                {dt.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Title */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Titolo <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={documentForm.titolo}
                        onChange={(e) => setDocumentForm(prev => ({ ...prev, titolo: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        placeholder="Es: Polizza RC 2024"
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descrizione
                    </label>
                    <textarea
                        value={documentForm.descrizione}
                        onChange={(e) => setDocumentForm(prev => ({ ...prev, descrizione: e.target.value }))}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                        placeholder="Note aggiuntive (opzionale)"
                    />
                </div>

                {/* Expiry Date (if applicable) */}
                {DOCUMENT_TYPES.find(dt => dt.value === documentForm.tipo)?.hasExpiry && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Data Scadenza
                        </label>
                        <DatePickerElegante
                            value={documentForm.dataScadenza}
                            onChange={(date) => setDocumentForm(prev => ({ ...prev, dataScadenza: date ? date.toISOString().split('T')[0] : '' }))}
                            theme="teal"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Riceverai una notifica quando il documento sta per scadere
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Annulla
                    </button>
                    <button
                        type="button"
                        onClick={onUpload}
                        disabled={isUploading || !documentForm.file || !documentForm.titolo}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Caricamento...
                            </>
                        ) : (
                            <>
                                <Upload className="h-4 w-4" />
                                Carica
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default DocumentUploadModal;
