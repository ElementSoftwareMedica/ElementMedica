/**
 * BackupRestoreTab - Gestione Backup e Restore Database
 * 
 * Funzionalità:
 * - Export selettivo entità database
 * - Download backup compresso (ZIP)
 * - Upload e restore backup
 * - Preview contenuto prima del restore
 * - Storico backup
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    Database,
    Download,
    Upload,
    Trash2,
    CheckCircle,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    FileArchive,
    Building2,
    FileText,
    FileCode,
    Settings,
    ClipboardList,
    Link,
    FolderOpen,
    AlertCircle,
    Info,
    X,
    Check
} from 'lucide-react';
import { useConfirmDialog } from '../../contexts/ConfirmDialogContext';
import backupService, {
    EntitiesResponse,
    CategoryInfo,
    EntityInfo,
    BackupInfo,
    PreviewResult,
    RestoreResult,
    UploadResult,
    DependencyValidation,
    DependencyWarning
} from '../../services/backupService';

// Mappa icone per categorie
const CATEGORY_ICONS: Record<string, React.ElementType> = {
    core: Building2,
    cms: FileText,
    templates: FileCode,
    config: Settings,
    audit: ClipboardList,
    relations: Link
};

// Componente per gruppo entità collassabile
interface EntityGroupProps {
    categoryKey: string;
    category: CategoryInfo;
    selectedEntities: Set<string>;
    onToggleEntity: (name: string) => void;
    onToggleCategory: (entities: string[], select: boolean) => void;
}

const EntityGroup: React.FC<EntityGroupProps> = ({
    categoryKey,
    category,
    selectedEntities,
    onToggleEntity,
    onToggleCategory
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const Icon = CATEGORY_ICONS[categoryKey] || Database;

    const allSelected = category.entities.every(e => selectedEntities.has(e.name));
    const someSelected = category.entities.some(e => selectedEntities.has(e.name));
    const totalCount = category.entities.reduce((sum, e) => sum + e.count, 0);
    const entityNames = category.entities.map(e => e.name);

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div
                className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        checked={allSelected}
                        ref={input => {
                            if (input) input.indeterminate = someSelected && !allSelected;
                        }}
                        onChange={(e) => {
                            e.stopPropagation();
                            onToggleCategory(entityNames, e.target.checked);
                        }}
                        className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <Icon className="h-5 w-5 text-gray-600" />
                    <span className="font-medium text-gray-900">{category.label}</span>
                    <span className="text-sm text-gray-500">
                        ({category.entities.length} entità, {backupService.formatCount(totalCount)} record)
                    </span>
                </div>
                {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
            </div>

            {isExpanded && (
                <div className="p-3 space-y-2 bg-white">
                    {category.entities.map((entity) => (
                        <label
                            key={entity.name}
                            className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer"
                        >
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={selectedEntities.has(entity.name)}
                                    onChange={() => onToggleEntity(entity.name)}
                                    className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                                />
                                <span className="text-gray-700">{entity.label}</span>
                                {entity.large && (
                                    <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                                        ⚠️ Large
                                    </span>
                                )}
                            </div>
                            <span className="text-sm text-gray-500">
                                {backupService.formatCount(entity.count)}
                            </span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};

// Componente per upload con drag & drop
interface UploadDropzoneProps {
    onUpload: (file: File) => void;
    isUploading: boolean;
}

const UploadDropzone: React.FC<UploadDropzoneProps> = ({ onUpload, isUploading }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDragIn = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragOut = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0 && files[0].name.endsWith('.zip')) {
            onUpload(files[0]);
        }
    }, [onUpload]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            onUpload(files[0]);
        }
    };

    return (
        <div
            className={`
        border-2 border-dashed rounded-xl p-8 text-center transition-colors
        ${isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'}
        ${isUploading ? 'opacity-50 pointer-events-none' : ''}
      `}
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="h-12 w-12 text-primary-500 animate-spin" />
                    <p className="text-gray-600">Caricamento in corso...</p>
                </div>
            ) : (
                <>
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-2">
                        Trascina qui il file di backup
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                        oppure
                    </p>
                    <label className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer transition-colors">
                        <FolderOpen className="h-4 w-4 mr-2" />
                        Seleziona file
                        <input
                            type="file"
                            accept=".zip"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </label>
                    <p className="text-xs text-gray-400 mt-4">
                        Formati supportati: .zip (max 500MB)
                    </p>
                </>
            )}
        </div>
    );
};

// Componente principale
const BackupRestoreTab: React.FC = () => {
    const { confirmDelete } = useConfirmDialog();
    // State per backup
    const [entities, setEntities] = useState<EntitiesResponse | null>(null);
    const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set());
    const [includeMedia, setIncludeMedia] = useState(false);
    const [isCreatingBackup, setIsCreatingBackup] = useState(false);
    const [backupProgress, setBackupProgress] = useState<string>('');
    const [dependencyWarnings, setDependencyWarnings] = useState<DependencyWarning[]>([]);
    const [suggestedEntities, setSuggestedEntities] = useState<string[]>([]);

    // State per restore
    const [uploadedFile, setUploadedFile] = useState<UploadResult | null>(null);
    const [preview, setPreview] = useState<PreviewResult | null>(null);
    const [selectedRestoreEntities, setSelectedRestoreEntities] = useState<Set<string>>(new Set());
    const [overwriteExisting, setOverwriteExisting] = useState(false);
    const [useCurrentTenant, setUseCurrentTenant] = useState(true); // Default: importa sul tenant corrente
    const [isRestoring, setIsRestoring] = useState(false);
    const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // State per storico
    const [backupHistory, setBackupHistory] = useState<BackupInfo[]>([]);

    // State UI
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Carica entità all'avvio
    useEffect(() => {
        loadEntities();
        loadHistory();
    }, []);

    const loadEntities = async () => {
        try {
            setIsLoading(true);
            const data = await backupService.getEntities();
            setEntities(data);

            // Seleziona entità di default (escludi large e defaultOff)
            const defaultSelected = new Set<string>();
            Object.values(data.categories).forEach(category => {
                category.entities.forEach(entity => {
                    if (!entity.large && !entity.defaultOff) {
                        defaultSelected.add(entity.name);
                    }
                });
            });
            setSelectedEntities(defaultSelected);
        } catch (err) {
            setError('Errore nel caricamento delle entità');
        } finally {
            setIsLoading(false);
        }
    };

    const loadHistory = async () => {
        try {
            const history = await backupService.getHistory();
            setBackupHistory(history);
        } catch (err) {
        }
    };

    // Valida dipendenze quando cambia la selezione
    useEffect(() => {
        const validateDeps = async () => {
            if (selectedEntities.size === 0) {
                setDependencyWarnings([]);
                setSuggestedEntities([]);
                return;
            }

            try {
                const validation = await backupService.validateDependencies(Array.from(selectedEntities));
                setDependencyWarnings(validation.warnings);
                setSuggestedEntities(validation.suggestions);
            } catch (err) {
            }
        };

        // Debounce per evitare troppe chiamate
        const timeoutId = setTimeout(validateDeps, 300);
        return () => clearTimeout(timeoutId);
    }, [selectedEntities]);

    // Aggiungi entità suggerite
    const addSuggestedEntities = () => {
        setSelectedEntities(prev => {
            const next = new Set(prev);
            suggestedEntities.forEach(name => next.add(name));
            return next;
        });
    };

    // Toggle singola entità
    const toggleEntity = (name: string) => {
        setSelectedEntities(prev => {
            const next = new Set(prev);
            if (next.has(name)) {
                next.delete(name);
            } else {
                next.add(name);
            }
            return next;
        });
    };

    // Toggle categoria intera
    const toggleCategory = (entityNames: string[], select: boolean) => {
        setSelectedEntities(prev => {
            const next = new Set(prev);
            entityNames.forEach(name => {
                if (select) {
                    next.add(name);
                } else {
                    next.delete(name);
                }
            });
            return next;
        });
    };

    // Seleziona/deseleziona tutto
    const toggleAll = (select: boolean) => {
        if (!entities) return;

        const all = new Set<string>();
        if (select) {
            Object.values(entities.categories).forEach(category => {
                category.entities.forEach(entity => {
                    all.add(entity.name);
                });
            });
        }
        setSelectedEntities(all);
    };

    // Crea backup
    const handleCreateBackup = async () => {
        if (selectedEntities.size === 0) {
            setError('Seleziona almeno un\'entità da esportare');
            return;
        }

        try {
            setIsCreatingBackup(true);
            setError(null);
            setBackupProgress('Creazione backup in corso...');

            const result = await backupService.createBackup(
                Array.from(selectedEntities),
                includeMedia
            );

            setBackupProgress('Download in corso...');
            await backupService.downloadBackup(result.id);

            setSuccess(`Backup creato con successo! (${backupService.formatSize(result.size)}, ${result.records} record)`);
            loadHistory();
        } catch (err: unknown) {
            setError('Errore nella creazione del backup');
        } finally {
            setIsCreatingBackup(false);
            setBackupProgress('');
        }
    };

    // Upload backup
    const handleUpload = async (file: File) => {
        try {
            setIsUploading(true);
            setError(null);
            setUploadedFile(null);
            setPreview(null);
            setRestoreResult(null);

            const result = await backupService.uploadBackup(file);
            setUploadedFile(result);

            // Ottieni preview
            const previewData = await backupService.previewBackup(result.tempPath);
            setPreview(previewData);

            // Seleziona tutte le entità di default per restore
            const allEntities = new Set(previewData.entities.map(e => e.name));
            setSelectedRestoreEntities(allEntities);

            if (!previewData.valid) {
                setError('Attenzione: il backup presenta errori di validazione');
            }
        } catch (err: unknown) {
            setError('Errore nel caricamento del file');
        } finally {
            setIsUploading(false);
        }
    };

    // Esegui restore
    const handleRestore = async () => {
        if (!uploadedFile || selectedRestoreEntities.size === 0) return;

        try {
            setIsRestoring(true);
            setError(null);

            const result = await backupService.restoreBackup(
                uploadedFile.tempPath,
                Array.from(selectedRestoreEntities),
                overwriteExisting,
                useCurrentTenant
            );

            setRestoreResult(result);
            setSuccess('Restore completato con successo!');

            // Ricarica entità per aggiornare conteggi
            loadEntities();
        } catch (err: unknown) {
            setError('Errore nel ripristino del backup');
        } finally {
            setIsRestoring(false);
        }
    };

    // Elimina backup dallo storico
    const handleDeleteBackup = async (id: string) => {
        const shouldDelete = await confirmDelete('questo backup');
        if (!shouldDelete) return;

        try {
            await backupService.deleteBackup(id);
            setSuccess('Backup eliminato');
            loadHistory();
        } catch (err: unknown) {
            setError('Errore nell\'eliminazione del backup');
        }
    };

    // Scarica backup dallo storico
    const handleDownloadFromHistory = async (id: string) => {
        try {
            await backupService.downloadBackup(id);
        } catch (err: unknown) {
            setError('Errore nel download del backup');
        }
    };

    // Calcola statistiche selezionate
    const getSelectedStats = () => {
        if (!entities) return { entities: 0, records: 0 };

        let totalRecords = 0;
        Object.values(entities.categories).forEach(category => {
            category.entities.forEach(entity => {
                if (selectedEntities.has(entity.name)) {
                    totalRecords += entity.count;
                }
            });
        });

        return {
            entities: selectedEntities.size,
            records: totalRecords
        };
    };

    const stats = getSelectedStats();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 text-primary-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Notifiche */}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <p>{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {success && (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                    <CheckCircle className="h-5 w-5 flex-shrink-0" />
                    <p>{success}</p>
                    <button onClick={() => setSuccess(null)} className="ml-auto">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Sezione Backup */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-100 rounded-lg">
                            <Database className="h-6 w-6 text-primary-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Backup Database</h2>
                            <p className="text-sm text-gray-500">Seleziona le entità da includere nel backup</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Controlli selezione */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => toggleAll(true)}
                            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                            ☑️ Seleziona tutto
                        </button>
                        <button
                            onClick={() => toggleAll(false)}
                            className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                        >
                            ☐ Deseleziona tutto
                        </button>
                    </div>

                    {/* Lista categorie */}
                    {entities && (
                        <div className="space-y-3">
                            {Object.entries(entities.categories).map(([key, category]) => (
                                <EntityGroup
                                    key={key}
                                    categoryKey={key}
                                    category={category}
                                    selectedEntities={selectedEntities}
                                    onToggleEntity={toggleEntity}
                                    onToggleCategory={toggleCategory}
                                />
                            ))}
                        </div>
                    )}

                    {/* Warning dipendenze mancanti */}
                    {dependencyWarnings.length > 0 && (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <h4 className="font-medium text-amber-800 mb-2">
                                        ⚠️ Dipendenze mancanti
                                    </h4>
                                    <ul className="space-y-1 text-sm text-amber-700">
                                        {dependencyWarnings.map((warning, idx) => (
                                            <li key={idx}>
                                                <strong>{warning.label}</strong> richiede: {warning.missingDeps.join(', ')}
                                            </li>
                                        ))}
                                    </ul>
                                    {suggestedEntities.length > 0 && (
                                        <button
                                            onClick={addSuggestedEntities}
                                            className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors text-sm font-medium"
                                        >
                                            <Check className="h-4 w-4" />
                                            Aggiungi dipendenze mancanti ({suggestedEntities.length})
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Opzione media */}
                    <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                        <input
                            type="checkbox"
                            checked={includeMedia}
                            onChange={(e) => setIncludeMedia(e.target.checked)}
                            className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                        />
                        <FolderOpen className="h-5 w-5 text-gray-600" />
                        <div>
                            <span className="font-medium text-gray-900">Includi Media Files</span>
                            <p className="text-sm text-gray-500">Esporta anche i file caricati (/uploads)</p>
                        </div>
                    </label>

                    {/* Statistiche e bottone */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div className="text-sm text-gray-600">
                            <span className="font-medium">{stats.entities}</span> entità selezionate •
                            <span className="font-medium ml-1">{backupService.formatCount(stats.records)}</span> record totali
                        </div>
                        <button
                            onClick={handleCreateBackup}
                            disabled={isCreatingBackup || selectedEntities.size === 0}
                            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isCreatingBackup ? (
                                <>
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    {backupProgress || 'Creazione...'}
                                </>
                            ) : (
                                <>
                                    <Download className="h-4 w-4" />
                                    Scarica Backup
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Sezione Restore */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <Upload className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Restore Database</h2>
                            <p className="text-sm text-gray-500">Carica un file di backup per ripristinare i dati</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {!preview ? (
                        <>
                            <UploadDropzone onUpload={handleUpload} isUploading={isUploading} />

                            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-amber-800">
                                    <p className="font-medium">Attenzione</p>
                                    <p>Il restore può sovrascrivere dati esistenti. Assicurati di avere un backup recente prima di procedere.</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-6">
                            {/* Preview info */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-500">Data backup</p>
                                    <p className="font-medium">{new Date(preview.createdAt).toLocaleString('it-IT')}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-500">Entità</p>
                                    <p className="font-medium">{preview.entities.length}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-500">Record totali</p>
                                    <p className="font-medium">{backupService.formatCount(preview.totalRecords)}</p>
                                </div>
                            </div>

                            {/* Validazione */}
                            {preview.errors.length > 0 && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="font-medium text-red-800 mb-2">Errori di validazione:</p>
                                    <ul className="text-sm text-red-700 list-disc list-inside">
                                        {preview.errors.map((err, i) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {preview.warnings.length > 0 && (
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                    <p className="font-medium text-amber-800 mb-2">Avvisi:</p>
                                    <ul className="text-sm text-amber-700 list-disc list-inside">
                                        {preview.warnings.map((warn, i) => (
                                            <li key={i}>{warn}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Selezione entità restore */}
                            <div className="border border-gray-200 rounded-lg">
                                <div className="p-3 bg-gray-50 border-b border-gray-200 font-medium">
                                    Seleziona entità da ripristinare
                                </div>
                                <div className="p-4 max-h-64 overflow-y-auto space-y-2">
                                    {preview.entities.map((entity) => (
                                        <label
                                            key={entity.name}
                                            className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRestoreEntities.has(entity.name)}
                                                    onChange={() => {
                                                        setSelectedRestoreEntities(prev => {
                                                            const next = new Set(prev);
                                                            if (next.has(entity.name)) {
                                                                next.delete(entity.name);
                                                            } else {
                                                                next.add(entity.name);
                                                            }
                                                            return next;
                                                        });
                                                    }}
                                                    className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                                                />
                                                <span className="text-gray-700">{entity.name}</span>
                                            </div>
                                            <span className="text-sm text-gray-500">{entity.count} record</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Opzioni restore */}
                            <label className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={overwriteExisting}
                                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                                    className="h-4 w-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                                />
                                <div>
                                    <span className="font-medium text-amber-900">Sovrascrivi dati esistenti</span>
                                    <p className="text-sm text-amber-700">Se deselezionato, i record esistenti verranno saltati</p>
                                </div>
                            </label>

                            {/* Opzione tenant selection */}
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                                <p className="font-medium text-blue-900">Destinazione tenant:</p>
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="tenantMode"
                                        checked={useCurrentTenant}
                                        onChange={() => setUseCurrentTenant(true)}
                                        className="mt-1 h-4 w-4 text-blue-600 border-blue-300 focus:ring-blue-500"
                                    />
                                    <div>
                                        <span className="font-medium text-blue-900">Importa sul tenant corrente</span>
                                        <p className="text-sm text-blue-700">Tutti i dati verranno associati al tuo tenant attuale</p>
                                    </div>
                                </label>
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="tenantMode"
                                        checked={!useCurrentTenant}
                                        onChange={() => setUseCurrentTenant(false)}
                                        className="mt-1 h-4 w-4 text-blue-600 border-blue-300 focus:ring-blue-500"
                                    />
                                    <div>
                                        <span className="font-medium text-blue-900">Mantieni tenant originali</span>
                                        <p className="text-sm text-blue-700">I dati manterranno il tenant originale del backup (richiede i tenant già esistenti)</p>
                                    </div>
                                </label>
                            </div>

                            {/* Risultato restore */}
                            {restoreResult && (
                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="font-medium text-green-800 mb-3">Restore completato!</p>
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <p className="text-green-600">Importati</p>
                                            <p className="font-medium text-green-800">
                                                {restoreResult.success.reduce((sum, s) => sum + s.imported, 0)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-blue-600">Aggiornati</p>
                                            <p className="font-medium text-blue-800">
                                                {restoreResult.success.reduce((sum, s) => sum + s.updated, 0)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">Saltati</p>
                                            <p className="font-medium text-gray-800">
                                                {restoreResult.success.reduce((sum, s) => sum + s.skipped, 0)}
                                            </p>
                                        </div>
                                    </div>
                                    {restoreResult.errors.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-green-200">
                                            <p className="text-red-600 text-sm">
                                                {restoreResult.errors.length} errori durante il restore
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Bottoni */}
                            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                                <button
                                    onClick={() => {
                                        setPreview(null);
                                        setUploadedFile(null);
                                        setRestoreResult(null);
                                    }}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={handleRestore}
                                    disabled={isRestoring || selectedRestoreEntities.size === 0 || !preview.valid}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isRestoring ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                            Ripristino in corso...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-4 w-4" />
                                            Ripristina {selectedRestoreEntities.size} entità
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Storico Backup */}
            {backupHistory.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 rounded-lg">
                                <FileArchive className="h-6 w-6 text-gray-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Storico Backup</h2>
                                <p className="text-sm text-gray-500">Backup salvati sul server</p>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dimensione</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entità</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Record</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Azioni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {backupHistory.map((backup) => (
                                    <tr key={backup.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {new Date(backup.createdAt).toLocaleString('it-IT')}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {backupService.formatSize(backup.size)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {backup.entities}
                                            {backup.corrupted && (
                                                <span className="ml-2 text-red-500">⚠️</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {backupService.formatCount(backup.records)}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button
                                                onClick={() => handleDownloadFromHistory(backup.id)}
                                                className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                title="Scarica"
                                            >
                                                <Download className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteBackup(backup.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Elimina"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BackupRestoreTab;
