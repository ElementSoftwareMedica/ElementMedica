/**
 * Media Library Component
 * Gestione completa media con upload, grid view, folders, filtri
 * 
 * Features:
 * - Drag & drop upload
 * - Grid view responsive con thumbnails
 * - Folders navigation
 * - Filtri (type, tags, search)
 * - Modal dettaglio con edit
 * - Delete confirmation
 */

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  FolderPlus,
  Image as ImageIcon,
  FileText,
  Trash2,
  Edit2,
  Search,
  Filter,
  Grid3x3,
  List,
  ChevronRight,
  X,
} from 'lucide-react';
import { useMediaLibrary, MediaListFilters } from '../../hooks/cms/useMediaLibrary';
import cmsMediaService, { MediaFile } from '../../services/cmsMediaService';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Badge } from '../../components/ui/badge';

export const MediaLibrary: React.FC = () => {
  // State
  const [filters, setFilters] = useState<MediaListFilters>({
    page: 1,
    limit: 24,
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [mediaToDelete, setMediaToDelete] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Hooks
  const {
    media,
    pagination,
    folders,
    isLoading,
    isUploading,
    upload,
    update,
    delete: deleteMedia,
    createFolder,
  } = useMediaLibrary(filters);

  // Dropzone
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const { valid, invalid } = cmsMediaService.validateFiles(acceptedFiles);

      if (invalid.length > 0) {
        invalid.forEach(({ file, error }) => {
          console.error(`${file.name}: ${error}`);
        });
      }

      if (valid.length > 0) {
        upload({
          files: valid,
          options: {
            folderId: filters.folderId,
          },
        });
      }
    },
    [upload, filters.folderId]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
  });

  // Handlers
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters((prev) => ({ ...prev, search: query, page: 1 }));
  };

  const handleFolderSelect = (folderId: string | undefined) => {
    setFilters((prev) => ({ ...prev, folderId, page: 1 }));
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      createFolder({
        name: newFolderName.trim(),
        parentId: filters.folderId,
      });
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };

  const handleDeleteMedia = () => {
    if (mediaToDelete) {
      deleteMedia(mediaToDelete);
      setMediaToDelete(null);
      setSelectedMedia(null);
    }
  };

  const handleUpdateMedia = (data: any) => {
    if (selectedMedia) {
      update({
        id: selectedMedia.id,
        data,
      });
    }
  };

  // Render helpers
  const renderThumbnail = (media: MediaFile) => {
    const thumbnailUrl = cmsMediaService.getOptimalUrl(media, 'thumbnail');

    if (media.mimeType.startsWith('image/')) {
      return (
        <img
          src={thumbnailUrl}
          alt={media.alt || media.originalName}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      );
    }

    if (media.mimeType === 'application/pdf') {
      return (
        <div className="flex items-center justify-center h-full bg-red-50">
          <FileText className="w-12 h-12 text-red-500" />
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <ImageIcon className="w-12 h-12 text-gray-400" />
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Folders */}
      <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Cartelle</h2>
        </div>

        <div className="p-4">
          <Button
            onClick={() => setIsCreatingFolder(true)}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            Nuova Cartella
          </Button>
        </div>

        <div className="py-2">
          <button
            onClick={() => handleFolderSelect(undefined)}
            className={`w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors ${
              !filters.folderId ? 'bg-gray-100 font-medium' : ''
            }`}
          >
            Tutti i media
          </button>

          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => handleFolderSelect(folder.id)}
              className={`w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors flex items-center justify-between ${
                filters.folderId === folder.id ? 'bg-gray-100 font-medium' : ''
              }`}
            >
              <span className="truncate">{folder.name}</span>
              {folder._count && folder._count.media > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {folder._count.media}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>

                        <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Cerca media..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filtri
            </Button>
          </div>
        </div>

        {/* Upload Area */}
        <div
          {...getRootProps()}
          className={`mx-6 mt-4 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-2">
            {isDragActive
              ? 'Rilascia i file qui...'
              : 'Trascina file qui o clicca per selezionare'}
          </p>
          <p className="text-sm text-gray-500">
            Formati supportati: immagini (JPG, PNG, GIF, WebP, SVG) e PDF (max
            10MB)
          </p>
          {isUploading && (
            <div className="mt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-sm text-gray-600 mt-2">Caricamento in corso...</p>
            </div>
          )}
        </div>

        {/* Media Grid/List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-lg bg-gray-200 animate-pulse" />
              ))}
            </div>
          ) : media.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Nessun media trovato</p>
              {filters.search && (
                <p className="text-sm mt-2">
                  Prova a modificare i filtri di ricerca
                </p>
              )}
            </div>
          ) : (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4'
                  : 'space-y-2'
              }
            >
              {media.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedMedia(item)}
                  className={`group relative border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer ${
                    viewMode === 'grid' ? 'aspect-square' : 'flex items-center p-3'
                  }`}
                >
                  {/* Thumbnail */}
                  <div
                    className={
                      viewMode === 'grid'
                        ? 'w-full h-full bg-gray-100'
                        : 'w-16 h-16 bg-gray-100 rounded flex-shrink-0'
                    }
                  >
                    {renderThumbnail(item)}
                  </div>

                  {/* Info */}
                  <div
                    className={
                      viewMode === 'grid'
                        ? 'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3'
                        : 'flex-1 ml-3'
                    }
                  >
                    <p
                      className={`truncate ${
                        viewMode === 'grid' ? 'text-white text-sm' : 'font-medium'
                      }`}
                      title={item.title || item.originalName}
                    >
                      {item.title || item.originalName}
                    </p>
                    {viewMode === 'list' && (
                      <p className="text-sm text-gray-500">
                        {cmsMediaService.formatFileSize(item.size)}
                      </p>
                    )}
                  </div>

                  {/* Actions Overlay */}
                  {viewMode === 'grid' && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMedia(item);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMediaToDelete(item.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: pagination.page - 1 }))
                }
              >
                Precedente
              </Button>
              <span className="text-sm text-gray-600">
                Pagina {pagination.page} di {pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.pages}
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: pagination.page + 1 }))
                }
              >
                Successiva
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Media Detail Modal */}
      <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
        <DialogContent className="max-w-2xl">
          {selectedMedia && (
            <>
              <DialogHeader>
                <DialogTitle>Dettagli Media</DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-6">
                {/* Preview */}
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                  {selectedMedia.mimeType.startsWith('image/') ? (
                    <img
                      src={cmsMediaService.getOptimalUrl(selectedMedia, 'large')}
                      alt={selectedMedia.alt || selectedMedia.originalName}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <FileText className="w-24 h-24 text-gray-400" />
                  )}
                </div>

                {/* Info & Edit */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Titolo
                    </label>
                    <Input
                      type="text"
                      defaultValue={selectedMedia.title || ''}
                      onBlur={(e) =>
                        handleUpdateMedia({ title: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Testo alternativo (ALT)
                    </label>
                    <Input
                      type="text"
                      defaultValue={selectedMedia.alt || ''}
                      onBlur={(e) => handleUpdateMedia({ alt: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome file
                    </label>
                    <p className="text-sm text-gray-600">
                      {selectedMedia.originalName}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dimensione
                    </label>
                    <p className="text-sm text-gray-600">
                      {cmsMediaService.formatFileSize(selectedMedia.size)}
                    </p>
                  </div>

                  {selectedMedia.metadata && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dimensioni immagine
                      </label>
                      <p className="text-sm text-gray-600">
                        {selectedMedia.metadata.width} x{' '}
                        {selectedMedia.metadata.height} px
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL
                    </label>
                    <code className="block text-xs bg-gray-100 p-2 rounded">
                      {selectedMedia.url}
                    </code>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={() => setMediaToDelete(selectedMedia.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Elimina
                </Button>
                <Button onClick={() => setSelectedMedia(null)}>Chiudi</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!mediaToDelete}
        onOpenChange={() => setMediaToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questo media? Questa azione può essere
              annullata successivamente tramite il ripristino dal cestino.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMedia}>
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Folder Dialog */}
      <Dialog open={isCreatingFolder} onOpenChange={setIsCreatingFolder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuova Cartella</DialogTitle>
          </DialogHeader>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome cartella
            </label>
            <Input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Es: Immagini prodotti"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateFolder();
                }
              }}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatingFolder(false)}>
              Annulla
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Crea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MediaLibrary;
