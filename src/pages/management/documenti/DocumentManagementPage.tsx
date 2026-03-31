/**
 * Document Management Page
 * Gestionale documenti interni (procedure, moduli, materiale marketing)
 * con cartelle gerarchiche e versionamento.
 *
 * Route: /management/documenti
 * @project P74 - Document Management & Email Templates
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Folder,
    FolderOpen,
    FolderPlus,
    FileText,
    Upload,
    Trash2,
    Edit,
    ChevronRight,
    ChevronDown,
    Search,
    Filter,
    Plus,
    RefreshCw,
    Download,
    History,
    Tag,
    Megaphone,
    BookOpen,
    FileStack,
    X,
    AlertCircle,
    Check,
    Loader2,
    Eye,
    ExternalLink,
    Globe
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import { useTenantFilter } from '@/context/TenantFilterContext';
import { CRUDButton, CRUDPrimaryButton } from '@/components/shared/CRUDButton';
import { ActionButton } from '@/components/ui';
import type { DropdownAction } from '@/design-system/molecules/Dropdown/Dropdown';
import {
    docFolderApi,
    internalDocumentApi,
    type DocFolder,
    type InternalDocument,
    type DocFolderTipo,
    type InternalDocumentTipo
} from '../../../services/managementDocsApi';

// ============================================================
// CONSTANTS
// ============================================================

const TIPO_LABELS: Record<InternalDocumentTipo, string> = {
    PROCEDURA: 'Procedura',
    MODULO: 'Modulo',
    MARKETING: 'Marketing',
    ALTRO: 'Altro'
};

const TIPO_COLORS: Record<InternalDocumentTipo, string> = {
    PROCEDURA: 'bg-blue-100 text-blue-800',
    MODULO: 'bg-teal-100 text-teal-800',
    MARKETING: 'bg-orange-100 text-orange-800',
    ALTRO: 'bg-gray-100 text-gray-700'
};

const FOLDER_TIPO_ICONS: Record<DocFolderTipo, React.ElementType> = {
    GENERICO: Folder,
    INTERNO: BookOpen,
    MARKETING: Megaphone
};

function formatBytes(bytes?: number | null): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============================================================
// FOLDER TREE COMPONENT
// ============================================================

interface FolderNodeProps {
    folder: DocFolder;
    selectedFolderId: string | null;
    onSelect: (id: string | null) => void;
    depth?: number;
}

const FolderNode: React.FC<FolderNodeProps> = ({ folder, selectedFolderId, onSelect, depth = 0 }) => {
    const [expanded, setExpanded] = useState(depth === 0);
    const hasChildren = folder.children && folder.children.length > 0;
    const isSelected = selectedFolderId === folder.id;
    const FolderIcon = FOLDER_TIPO_ICONS[folder.tipo] || Folder;

    return (
        <div>
            <button
                onClick={() => {
                    onSelect(folder.id);
                    if (hasChildren) setExpanded(!expanded);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left
                    ${isSelected ? 'bg-violet-100 text-violet-800 font-medium' : 'text-gray-700 hover:bg-gray-100'}`}
                style={{ paddingLeft: `${12 + depth * 16}px` }}
            >
                {hasChildren ? (
                    expanded ? <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
                ) : (
                    <span className="h-3.5 w-3.5 flex-shrink-0" />
                )}
                {isSelected ? <FolderOpen className="h-4 w-4 flex-shrink-0 text-violet-600" /> : <FolderIcon className="h-4 w-4 flex-shrink-0 text-gray-500" />}
                <span className="truncate flex-1">{folder.nome}</span>
                {(folder._count?.documents ?? 0) > 0 && (
                    <span className="text-xs text-gray-400 ml-1">{folder._count?.documents}</span>
                )}
            </button>
            {expanded && hasChildren && folder.children!.map(child => (
                <FolderNode
                    key={child.id}
                    folder={child}
                    selectedFolderId={selectedFolderId}
                    onSelect={onSelect}
                    depth={depth + 1}
                />
            ))}
        </div>
    );
};

// ============================================================
// CREATE FOLDER MODAL
// ============================================================

interface CreateFolderModalProps {
    onClose: () => void;
    onSuccess: () => void;
    parentId?: string | null;
}

const CreateFolderModal: React.FC<CreateFolderModalProps> = ({ onClose, onSuccess, parentId }) => {
    const { showToast } = useToast();
    const [nome, setNome] = useState('');
    const [tipo, setTipo] = useState<DocFolderTipo>('GENERICO');
    const [descrizione, setDescrizione] = useState('');

    const mutation = useMutation({
        mutationFn: () => docFolderApi.create({ nome: nome.trim(), tipo, descrizione: descrizione || undefined, parentId: parentId || undefined }),
        onSuccess: () => {
            showToast({ message: 'Cartella creata', type: 'success' });
            onSuccess();
            onClose();
        },
        onError: () => showToast({ message: 'Errore nella creazione della cartella', type: 'error' })
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl">
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <h2 className="text-lg font-semibold text-gray-900">Nuova cartella</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                        <input
                            type="text"
                            value={nome}
                            onChange={e => setNome(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            placeholder="es. Procedure ISO"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                        <select
                            value={tipo}
                            onChange={e => setTipo(e.target.value as DocFolderTipo)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                        >
                            <option value="GENERICO">Generico</option>
                            <option value="INTERNO">Procedure Interne</option>
                            <option value="MARKETING">Materiale Marketing</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                        <textarea
                            value={descrizione}
                            onChange={e => setDescrizione(e.target.value)}
                            rows={2}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                            placeholder="Descrizione opzionale"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-3 border-t px-6 py-4">
                    <CRUDButton onClick={onClose} variant="secondary">Annulla</CRUDButton>
                    <CRUDPrimaryButton
                        onClick={() => mutation.mutate()}
                        disabled={!nome.trim() || mutation.isPending}
                    >
                        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Crea cartella
                    </CRUDPrimaryButton>
                </div>
            </div>
        </div>
    );
};

// ============================================================
// UPLOAD DOCUMENT MODAL
// ============================================================

interface UploadDocumentModalProps {
    folderId?: string | null;
    existingDoc?: InternalDocument | null; // per nuova revisione
    onClose: () => void;
    onSuccess: () => void;
}

const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({ folderId, existingDoc, onClose, onSuccess }) => {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const isRevision = !!existingDoc;

    const [nome, setNome] = useState(existingDoc?.nome || '');
    const [tipo, setTipo] = useState<InternalDocumentTipo>(existingDoc?.tipo || 'PROCEDURA');
    const [descrizione, setDescrizione] = useState(existingDoc?.descrizione || '');
    const [versione, setVersione] = useState(isRevision ? '' : '1.0');
    const [revisionNote, setRevisionNote] = useState('');
    const [tags, setTags] = useState<string>(existingDoc?.tags.join(', ') || '');
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleSubmit = async () => {
        if (!file) {
            showToast({ message: 'Seleziona un file da caricare', type: 'error' });
            return;
        }
        if (!isRevision && !nome.trim()) {
            showToast({ message: 'Il nome è obbligatorio', type: 'error' });
            return;
        }

        setIsUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);

            if (isRevision) {
                if (versione) fd.append('versione', versione);
                if (revisionNote) fd.append('revisionNote', revisionNote);
                await internalDocumentApi.createRevision(existingDoc!.id, fd);
                showToast({ message: 'Revisione caricata', type: 'success' });
            } else {
                fd.append('nome', nome.trim());
                fd.append('tipo', tipo);
                if (descrizione) fd.append('descrizione', descrizione);
                if (folderId) fd.append('folderId', folderId);
                fd.append('versione', versione || '1.0');
                const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
                if (tagList.length > 0) fd.append('tags', JSON.stringify(tagList));
                await internalDocumentApi.create(fd);
                showToast({ message: 'Documento caricato', type: 'success' });
            }

            queryClient.invalidateQueries({ queryKey: ['internal-documents'] });
            queryClient.invalidateQueries({ queryKey: ['doc-folders'] });
            onSuccess();
            onClose();
        } catch (err: unknown) {
            showToast({ message: 'Errore nel caricamento del documento', type: 'error' });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl">
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {isRevision ? `Nuova revisione — ${existingDoc?.nome}` : 'Carica documento'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                </div>
                <div className="p-6 space-y-4">
                    {!isRevision && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome documento *</label>
                                <input
                                    type="text"
                                    value={nome}
                                    onChange={e => setNome(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                                    placeholder="es. Procedura gestione rifiuti"
                                    autoFocus
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                                    <select
                                        value={tipo}
                                        onChange={e => setTipo(e.target.value as InternalDocumentTipo)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                                    >
                                        <option value="PROCEDURA">Procedura</option>
                                        <option value="MODULO">Modulo</option>
                                        <option value="MARKETING">Marketing</option>
                                        <option value="ALTRO">Altro</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Versione</label>
                                    <input
                                        type="text"
                                        value={versione}
                                        onChange={e => setVersione(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                                        placeholder="1.0"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tag (separati da virgola)</label>
                                <input
                                    type="text"
                                    value={tags}
                                    onChange={e => setTags(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                                    placeholder="es. sicurezza, HACCP, ISO9001"
                                />
                            </div>
                        </>
                    )}
                    {isRevision && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nuova versione</label>
                                <input
                                    type="text"
                                    value={versione}
                                    onChange={e => setVersione(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                                    placeholder="auto"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Note revisione</label>
                                <input
                                    type="text"
                                    value={revisionNote}
                                    onChange={e => setRevisionNote(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                                    placeholder="es. Aggiornamento capitolo 3"
                                />
                            </div>
                        </div>
                    )}
                    {/* Drop zone file */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">File *</label>
                        <label
                            className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors
                                ${file ? 'border-violet-400 bg-violet-50' : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'}`}
                        >
                            <input
                                type="file"
                                className="hidden"
                                onChange={e => setFile(e.target.files?.[0] || null)}
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.txt"
                            />
                            {file ? (
                                <>
                                    <Check className="h-8 w-8 text-violet-600" />
                                    <p className="text-sm font-medium text-violet-700">{file.name}</p>
                                    <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
                                </>
                            ) : (
                                <>
                                    <Upload className="h-8 w-8 text-gray-400" />
                                    <p className="text-sm text-gray-600">Trascina il file qui o clicca per selezionare</p>
                                    <p className="text-xs text-gray-400">PDF, Word, Excel, PowerPoint, immagini (max 50 MB)</p>
                                </>
                            )}
                        </label>
                    </div>
                </div>
                <div className="flex justify-end gap-3 border-t px-6 py-4">
                    <CRUDButton onClick={onClose} variant="secondary" disabled={isUploading}>Annulla</CRUDButton>
                    <CRUDPrimaryButton onClick={handleSubmit} disabled={!file || isUploading}>
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {isRevision ? 'Carica revisione' : 'Carica documento'}
                    </CRUDPrimaryButton>
                </div>
            </div>
        </div>
    );
};

// ============================================================
// PREVIEW MODAL
// ============================================================

interface PreviewModalProps {
    doc: InternalDocument;
    onClose: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ doc, onClose }) => {
    const isPdf = doc.mimeType === 'application/pdf';
    const isImage = doc.mimeType?.startsWith('image/');
    const isText = doc.mimeType?.startsWith('text/');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-4xl max-h-[90vh] overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-5 w-5 text-violet-600 flex-shrink-0" />
                        <div className="min-w-0">
                            <h3 className="text-base font-semibold text-gray-900 truncate">{doc.nome}</h3>
                            <p className="text-xs text-gray-500">
                                v{doc.versione} · {formatBytes(doc.fileSize)} · {doc.mimeType || 'file'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Apri in nuova scheda
                        </a>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Preview area */}
                <div className="flex-1 overflow-hidden bg-gray-100">
                    {isPdf ? (
                        <iframe
                            src={doc.fileUrl}
                            className="w-full h-full min-h-[60vh]"
                            title={doc.nome}
                        />
                    ) : isImage ? (
                        <div className="flex items-center justify-center h-full min-h-[60vh] p-8">
                            <img
                                src={doc.fileUrl}
                                alt={doc.nome}
                                className="max-w-full max-h-full object-contain rounded-lg shadow"
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full min-h-[30vh] gap-4 p-8">
                            <FileText className="h-20 w-20 text-gray-300" />
                            <p className="text-gray-500 text-sm font-medium">Anteprima non disponibile per questo tipo di file</p>
                            <a
                                href={doc.fileUrl}
                                download={doc.fileName}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
                            >
                                <Download className="h-4 w-4" />
                                Scarica il file
                            </a>
                        </div>
                    )}
                </div>

                {/* Metadata footer */}
                {doc.descrizione && (
                    <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex-shrink-0">
                        <p className="text-xs text-gray-600">{doc.descrizione}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================================
// EDIT DOCUMENT MODAL
// ============================================================

interface EditDocumentModalProps {
    doc: InternalDocument;
    folderTree: DocFolder[];
    onClose: () => void;
    onSuccess: () => void;
}

const EditDocumentModal: React.FC<EditDocumentModalProps> = ({ doc, folderTree, onClose, onSuccess }) => {
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const [nome, setNome] = useState(doc.nome);
    const [descrizione, setDescrizione] = useState(doc.descrizione || '');
    const [tipo, setTipo] = useState<InternalDocumentTipo>(doc.tipo);
    const [folderId, setFolderId] = useState<string>(doc.folderId || '');
    const [tags, setTags] = useState(doc.tags.join(', '));
    const [isPublic, setIsPublic] = useState(doc.isPublic);

    // Flatten folder tree for select
    const flatFolders = useMemo(() => {
        const flat: Array<{ id: string; label: string }> = [];
        const traverse = (folders: DocFolder[], depth = 0) => {
            for (const f of folders) {
                flat.push({ id: f.id, label: `${'  '.repeat(depth)}${f.nome}` });
                if (f.children?.length) traverse(f.children, depth + 1);
            }
        };
        traverse(folderTree);
        return flat;
    }, [folderTree]);

    const mutation = useMutation({
        mutationFn: () => internalDocumentApi.update(doc.id, {
            nome: nome.trim(),
            descrizione: descrizione.trim() || undefined,
            tipo,
            folderId: folderId || null,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
            isPublic
        } as Parameters<typeof internalDocumentApi.update>[1]),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['internal-documents'] });
            showToast({ message: 'Documento aggiornato', type: 'success' });
            onSuccess();
            onClose();
        },
        onError: () => showToast({ message: 'Errore nell\'aggiornamento del documento', type: 'error' })
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between border-b px-6 py-4 flex-shrink-0">
                    <h2 className="text-lg font-semibold text-gray-900">Modifica documento</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Nome */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome documento *</label>
                        <input
                            type="text"
                            value={nome}
                            onChange={e => setNome(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            autoFocus
                        />
                    </div>

                    {/* Tipo */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo documento</label>
                        <select
                            value={tipo}
                            onChange={e => setTipo(e.target.value as InternalDocumentTipo)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                        >
                            <option value="PROCEDURA">Procedura</option>
                            <option value="MODULO">Modulo</option>
                            <option value="MARKETING">Marketing</option>
                            <option value="ALTRO">Altro</option>
                        </select>
                    </div>

                    {/* Descrizione */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                        <textarea
                            value={descrizione}
                            onChange={e => setDescrizione(e.target.value)}
                            rows={3}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 resize-y"
                            placeholder="Descrizione opzionale del documento"
                        />
                    </div>

                    {/* Cartella */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cartella</label>
                        <select
                            value={folderId}
                            onChange={e => setFolderId(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                        >
                            <option value="">— Senza cartella —</option>
                            {flatFolders.map(f => (
                                <option key={f.id} value={f.id}>{f.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Tag */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tag (separati da virgola)</label>
                        <input
                            type="text"
                            value={tags}
                            onChange={e => setTags(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                            placeholder="es. sicurezza, HACCP, ISO9001"
                        />
                        {tags.split(',').filter(t => t.trim()).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                                    <span key={tag} className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">{tag}</span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Visibilità pubblica */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setIsPublic(!isPublic)}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200
                                ${isPublic ? 'bg-violet-600' : 'bg-gray-200'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${isPublic ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                        <div>
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                <Globe className="h-3.5 w-3.5 text-gray-400" />
                                Documento pubblico
                            </label>
                            <p className="text-xs text-gray-500">Se attivo, sarà accessibile senza autenticazione</p>
                        </div>
                    </div>

                    {/* Info versione (sola lettura) */}
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                        <p className="text-xs text-blue-700">
                            <strong>Versione corrente:</strong> {doc.versione}
                            {doc.revisionNote && <span className="ml-2 text-blue-500">— {doc.revisionNote}</span>}
                        </p>
                        <p className="text-xs text-blue-500 mt-0.5">Per caricare una nuova versione usa "Nuova revisione" dall'elenco.</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 border-t px-6 py-4 flex-shrink-0">
                    <CRUDButton onClick={onClose} variant="secondary" disabled={mutation.isPending}>Annulla</CRUDButton>
                    <CRUDPrimaryButton onClick={() => mutation.mutate()} disabled={!nome.trim() || mutation.isPending}>
                        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Aggiorna documento
                    </CRUDPrimaryButton>
                </div>
            </div>
        </div>
    );
};

// ============================================================
// MAIN PAGE
// ============================================================

const DocumentManagementPage: React.FC = () => {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const { confirmDelete } = useConfirmDialog();
    const { tenantFilterKey, isReady } = useTenantFilter();

    // Selection state
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [tipoFilter, setTipoFilter] = useState<InternalDocumentTipo | ''>('');
    const [page, setPage] = useState(1);

    // Modal state
    const [createFolderModal, setCreateFolderModal] = useState<{ open: boolean; parentId?: string | null }>({ open: false });
    const [uploadModal, setUploadModal] = useState<{ open: boolean; doc?: InternalDocument | null }>({ open: false });
    const [previewModal, setPreviewModal] = useState<{ open: boolean; doc?: InternalDocument | null }>({ open: false });
    const [editModal, setEditModal] = useState<{ open: boolean; doc?: InternalDocument | null }>({ open: false });

    // ---- Queries ----
    const { data: folderTree, isLoading: foldersLoading, refetch: refetchFolders } = useQuery({
        queryKey: ['doc-folders', 'tree', tenantFilterKey],
        queryFn: () => docFolderApi.getTree(),
        enabled: isReady
    });

    const { data: docsResult, isLoading: docsLoading } = useQuery({
        queryKey: ['internal-documents', selectedFolderId, search, tipoFilter, page, tenantFilterKey],
        queryFn: () => internalDocumentApi.getAll({
            folderId: selectedFolderId,
            search: search || undefined,
            tipo: tipoFilter || undefined,
            page,
            limit: 20
        })
    });

    const documents = docsResult?.data || [];
    const totalDocs = docsResult?.total || 0;
    const totalPages = docsResult?.pages || 1;

    // ---- Mutations ----
    const deleteFolderMutation = useMutation({
        mutationFn: docFolderApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['doc-folders'] });
            setSelectedFolderId(null);
            showToast({ message: 'Cartella eliminata', type: 'success' });
        },
        onError: (err: unknown) => {
            const msg = (err as any)?.response?.data?.error || 'Errore nell\'eliminazione della cartella';
            showToast({ message: msg, type: 'error' });
        }
    });

    const deleteDocMutation = useMutation({
        mutationFn: internalDocumentApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['internal-documents'] });
            queryClient.invalidateQueries({ queryKey: ['doc-folders'] });
            showToast({ message: 'Documento eliminato', type: 'success' });
        },
        onError: () => showToast({ message: 'Errore nell\'eliminazione del documento', type: 'error' })
    });

    const handleDeleteFolder = useCallback(async (folder: DocFolder) => {
        if (await confirmDelete(folder.nome)) {
            deleteFolderMutation.mutate(folder.id);
        }
    }, [deleteFolderMutation, confirmDelete]);

    const handleDeleteDoc = useCallback(async (doc: InternalDocument) => {
        if (await confirmDelete(doc.nome)) {
            deleteDocMutation.mutate(doc.id);
        }
    }, [deleteDocMutation, confirmDelete]);

    const handleDownload = useCallback((doc: InternalDocument) => {
        window.open(doc.fileUrl, '_blank');
    }, []);

    const handlePreview = useCallback((doc: InternalDocument) => {
        setPreviewModal({ open: true, doc });
    }, []);

    const handleEdit = useCallback((doc: InternalDocument) => {
        setEditModal({ open: true, doc });
    }, []);

    const selectedFolder = useMemo(() => {
        if (!selectedFolderId || !folderTree) return null;
        const findFolder = (folders: DocFolder[]): DocFolder | null => {
            for (const f of folders) {
                if (f.id === selectedFolderId) return f;
                if (f.children) {
                    const found = findFolder(f.children);
                    if (found) return found;
                }
            }
            return null;
        };
        return findFolder(folderTree);
    }, [selectedFolderId, folderTree]);

    return (
        <div className="flex h-full min-h-0 bg-gray-50">
            {/* ─── LEFT: Folder Tree ─── */}
            <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
                <div className="px-4 py-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-gray-800">Cartelle</h2>
                        <button
                            onClick={() => setCreateFolderModal({ open: true })}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                            title="Nuova cartella"
                        >
                            <FolderPlus className="h-4 w-4" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
                    {/* "Tutti i documenti" shortcut */}
                    <button
                        onClick={() => setSelectedFolderId(null)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left
                            ${selectedFolderId === null ? 'bg-violet-100 text-violet-800 font-medium' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                        <FileStack className="h-4 w-4 text-gray-400" />
                        Tutti i documenti
                    </button>

                    {foldersLoading ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        (folderTree || []).map(folder => (
                            <FolderNode
                                key={folder.id}
                                folder={folder}
                                selectedFolderId={selectedFolderId}
                                onSelect={setSelectedFolderId}
                            />
                        ))
                    )}
                </div>

                {/* Folder actions */}
                {selectedFolder && (
                    <div className="border-t border-gray-100 px-4 py-3">
                        <p className="text-xs font-medium text-gray-500 mb-2 truncate">{selectedFolder.nome}</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCreateFolderModal({ open: true, parentId: selectedFolder.id })}
                                className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-violet-600 px-2 py-1 rounded hover:bg-violet-50 transition-colors"
                            >
                                <FolderPlus className="h-3.5 w-3.5" />
                                Sotto-cartella
                            </button>
                            <button
                                onClick={() => handleDeleteFolder(selectedFolder)}
                                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors ml-auto"
                                disabled={deleteFolderMutation.isPending}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </aside>

            {/* ─── RIGHT: Documents ─── */}
            <main className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">
                                {selectedFolder ? selectedFolder.nome : 'Documenti interni'}
                            </h1>
                            <p className="text-sm text-gray-500 mt-0.5">
                                {selectedFolder?.descrizione || 'Procedure, moduli e materiale marketing aziendale'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    queryClient.invalidateQueries({ queryKey: ['internal-documents'] });
                                    queryClient.invalidateQueries({ queryKey: ['doc-folders'] });
                                }}
                                className="p-2 text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                                title="Aggiorna"
                            >
                                <RefreshCw className="h-4 w-4" />
                            </button>
                            <CRUDPrimaryButton
                                onClick={() => setUploadModal({ open: true })}
                            >
                                <Upload className="h-4 w-4" />
                                Carica documento
                            </CRUDPrimaryButton>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-3 mt-4">
                        <div className="relative flex-1 max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                                placeholder="Cerca documento..."
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            />
                        </div>
                        <select
                            value={tipoFilter}
                            onChange={e => { setTipoFilter(e.target.value as InternalDocumentTipo | ''); setPage(1); }}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                        >
                            <option value="">Tutti i tipi</option>
                            <option value="PROCEDURA">Procedure</option>
                            <option value="MODULO">Moduli</option>
                            <option value="MARKETING">Marketing</option>
                            <option value="ALTRO">Altro</option>
                        </select>
                    </div>
                </div>

                {/* Document List */}
                <div className="flex-1 overflow-y-auto p-6">
                    {docsLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <FileText className="h-16 w-16 mb-4 opacity-30" />
                            <p className="text-lg font-medium text-gray-500">Nessun documento</p>
                            <p className="text-sm mt-1">
                                {search || tipoFilter ? 'Modifica i filtri di ricerca' : 'Carica il primo documento usando il pulsante in alto a destra'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {documents.map(doc => (
                                <DocumentRow
                                    key={doc.id}
                                    doc={doc}
                                    onDownload={handleDownload}
                                    onRevision={() => setUploadModal({ open: true, doc })}
                                    onDelete={handleDeleteDoc}
                                    onPreview={handlePreview}
                                    onEdit={handleEdit}
                                />
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6">
                            <p className="text-sm text-gray-500">{totalDocs} documenti totali</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Precedente
                                </button>
                                <span className="px-3 py-1.5 text-sm text-gray-600">{page} / {totalPages}</span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Successiva
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* ─── Modals ─── */}
            {createFolderModal.open && (
                <CreateFolderModal
                    parentId={createFolderModal.parentId}
                    onClose={() => setCreateFolderModal({ open: false })}
                    onSuccess={() => {
                        refetchFolders();
                        queryClient.invalidateQueries({ queryKey: ['doc-folders'] });
                    }}
                />
            )}
            {uploadModal.open && (
                <UploadDocumentModal
                    folderId={selectedFolderId}
                    existingDoc={uploadModal.doc}
                    onClose={() => setUploadModal({ open: false })}
                    onSuccess={() => { }}
                />)}
            {previewModal.open && previewModal.doc && (
                <PreviewModal
                    doc={previewModal.doc}
                    onClose={() => setPreviewModal({ open: false })}
                />
            )}
            {editModal.open && editModal.doc && (
                <EditDocumentModal
                    doc={editModal.doc}
                    folderTree={folderTree || []}
                    onClose={() => setEditModal({ open: false })}
                    onSuccess={() => { }}
                />
            )}
        </div>
    );
};

// ============================================================
// DOCUMENT ROW
// ============================================================

interface DocumentRowProps {
    doc: InternalDocument;
    onDownload: (doc: InternalDocument) => void;
    onRevision: (doc: InternalDocument) => void;
    onDelete: (doc: InternalDocument) => void;
    onPreview: (doc: InternalDocument) => void;
    onEdit: (doc: InternalDocument) => void;
}

const DocumentRow: React.FC<DocumentRowProps> = ({ doc, onDownload, onRevision, onDelete, onPreview, onEdit }) => {
    const isImage = doc.mimeType?.startsWith('image/');
    const isPdf = doc.mimeType === 'application/pdf';

    const actions: DropdownAction[] = [
        { label: 'Anteprima', icon: <Eye className="h-4 w-4" />, onClick: () => onPreview(doc) },
        { label: 'Modifica', icon: <Edit className="h-4 w-4" />, onClick: () => onEdit(doc) },
        { label: 'Scarica', icon: <Download className="h-4 w-4" />, onClick: () => onDownload(doc) },
        { label: 'Nuova revisione', icon: <History className="h-4 w-4" />, onClick: () => onRevision(doc) },
        { label: 'Elimina', icon: <Trash2 className="h-4 w-4" />, onClick: () => onDelete(doc), variant: 'danger' }
    ];

    return (
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-4 hover:border-gray-300 transition-colors">
            {/* File icon */}
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isPdf ? 'bg-red-50' : isImage ? 'bg-blue-50' : 'bg-gray-50'}`}>
                <FileText className={`h-5 w-5 ${isPdf ? 'text-red-500' : isImage ? 'text-blue-500' : 'text-gray-500'}`} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.nome}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${TIPO_COLORS[doc.tipo]}`}>
                        {TIPO_LABELS[doc.tipo]}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0">v{doc.versione}</span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                    {doc.descrizione && <p className="text-xs text-gray-500 truncate">{doc.descrizione}</p>}
                    {doc.fileSize && <p className="text-xs text-gray-400 flex-shrink-0">{formatBytes(doc.fileSize)}</p>}
                    {doc.folder && <p className="text-xs text-gray-400 flex-shrink-0">📁 {doc.folder.nome}</p>}
                    {doc.tags.length > 0 && (
                        <div className="flex gap-1">
                            {doc.tags.slice(0, 3).map(tag => (
                                <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{tag}</span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                <ActionButton actions={actions} theme="violet" />
            </div>
        </div>
    );
};

export default DocumentManagementPage;
