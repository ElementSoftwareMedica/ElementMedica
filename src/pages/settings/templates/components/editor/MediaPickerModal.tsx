/**
 * MediaPickerModal Component
 * Modal per selezionare immagini dalla Media Library per Logo, Firma, etc.
 */

import React, { useState, useEffect } from 'react';
import { X, Upload, Search, Image as ImageIcon, Check, Loader2, FolderOpen, AlertCircle } from 'lucide-react';
import { useMediaList, useUploadMedia } from '../../../../../hooks/cms/useMediaLibrary';
import { useToast } from '../../../../../hooks/useToast';

interface MediaPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (url: string, alt?: string) => void;
    title?: string;
    allowedTypes?: string[];
}

const MediaPickerModal: React.FC<MediaPickerModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    title = 'Seleziona Immagine',
    allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
}) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
    const { showToast } = useToast();

    // Filter for images only
    const { data: mediaList, isLoading, error, refetch } = useMediaList({
        mimeType: 'image',
        search: search || undefined,
        limit: 50
    });

    const uploadMutation = useUploadMedia();

    // Reset selection when modal opens
    useEffect(() => {
        if (isOpen) {
            setFailedImages(new Set()); // Clear failed images tracking
            setSelectedId(null);
            setSearch('');
        }
    }, [isOpen]);

    // Handle file upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        if (!allowedTypes.some(type => file.type.startsWith(type.split('/')[0]))) {
            showToast({ message: 'Tipo file non supportato. Usa immagini PNG, JPEG, GIF, WebP o SVG.', type: 'error' });
            return;
        }

        try {
            await uploadMutation.mutateAsync({
                files: [file],
                options: { folderId: undefined }  // Will go to root folder
            });
        } catch (err) {
        }
    };

    // Handle selection confirm
    const handleConfirm = () => {
        const selected = mediaList?.media?.find((m: any) => m.id === selectedId);
        if (selected) {
            onSelect(selected.url, selected.alt || selected.filename);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Search and Upload Bar */}
                <div className="px-6 py-4 border-b border-gray-100 flex gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cerca immagini..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Upload Button */}
                    <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                        {uploadMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Upload className="w-4 h-4" />
                        )}
                        <span>Carica Nuova</span>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                            disabled={uploadMutation.isPending}
                        />
                    </label>
                </div>

                {/* Media Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                            <FolderOpen className="w-12 h-12 mb-2 text-gray-300" />
                            <p>Errore nel caricamento delle immagini</p>
                        </div>
                    ) : !mediaList?.media?.length ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                            <ImageIcon className="w-12 h-12 mb-2 text-gray-300" />
                            <p>Nessuna immagine trovata</p>
                            <p className="text-sm mt-1">Carica una nuova immagine per iniziare</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4">
                            {mediaList.media.map((media: any) => (
                                <button
                                    key={media.id}
                                    onClick={() => setSelectedId(media.id)}
                                    className={`group relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${selectedId === media.id
                                            ? 'border-blue-500 ring-2 ring-blue-200'
                                            : 'border-gray-200 hover:border-blue-300'
                                        }`}
                                >
                                    {/* Image with fallback placeholder */}
                                    {failedImages.has(media.id) ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400">
                                            <AlertCircle className="w-8 h-8 mb-1" />
                                            <span className="text-xs">Errore</span>
                                        </div>
                                    ) : (
                                        <img
                                            src={media.url}
                                            alt={media.alt || media.originalName || media.filename}
                                            className="w-full h-full object-cover"
                                            onError={() => {
                                                setFailedImages(prev => new Set(prev).add(media.id));
                                            }}
                                        />
                                    )}

                                    {/* Selection Indicator */}
                                    {selectedId === media.id && (
                                        <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                            <div className="bg-blue-600 rounded-full p-1">
                                                <Check className="w-4 h-4 text-white" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Filename on Hover */}
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-xs text-white truncate">{media.filename}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        {selectedId ? 'Immagine selezionata' : 'Seleziona un\'immagine dalla libreria'}
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Annulla
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!selectedId}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Inserisci
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MediaPickerModal;
