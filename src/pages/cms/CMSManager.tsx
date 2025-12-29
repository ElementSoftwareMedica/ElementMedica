/**
 * CMS Pages Manager
 * 
 * Features:
 * - Lista pagine con filtri (status, search)
 * - Crea nuova pagina
 * - Modifica pagina
 * - Pubblica/Unpublish
 * - Elimina pagina
 * - Duplica pagina
 */

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Search,
  Filter,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { useConfirmDialog } from '../../contexts/ConfirmDialogContext';
import {
  useCMSPages,
  useDeleteCMSPage,
  usePublishCMSPage,
  useUnpublishCMSPage,
  useDuplicateCMSPage,
} from '../../hooks/cms/useCMSPages';
import cmsPagesService, { CMSPage, CMSPageListFilters } from '../../services/cmsPagesService';
import CMSPageEditor from './CMSPageEditor';
import { getAllBrands, type BrandConfig } from '../../config/brands.config';
import { ActionButton } from '../../components/ui/ActionButton';
import type { DropdownAction } from '../../design-system/molecules/Dropdown';

interface CMSManagerProps {
  className?: string;
}

const CMSManager: React.FC<CMSManagerProps> = ({ className = '' }) => {
  const { confirmDelete } = useConfirmDialog();

  // State
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [filters, setFilters] = useState<CMSPageListFilters>({
    status: undefined,
    search: '',
    page: 1,
    limit: 20,
  });
  const [selectedPage, setSelectedPage] = useState<CMSPage | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Brands
  const brands = getAllBrands();

  // Calcola il tenantId basato sul brand selezionato
  const selectedTenantId = useMemo(() => {
    if (selectedBrand === 'all') return undefined;
    const brand = brands.find(b => b.id === selectedBrand);
    return brand?.backend.tenantId;
  }, [selectedBrand, brands]);

  // Combina i filtri con il tenantId del brand
  const combinedFilters = useMemo<CMSPageListFilters>(() => ({
    ...filters,
    tenantId: selectedTenantId,
  }), [filters, selectedTenantId]);

  // Queries - usa combinedFilters invece di filters
  const { data, isLoading, error, refetch } = useCMSPages(combinedFilters);
  const deleteMutation = useDeleteCMSPage();
  const publishMutation = usePublishCMSPage();
  const unpublishMutation = useUnpublishCMSPage();
  const duplicateMutation = useDuplicateCMSPage();

  // Handlers
  const handleCreate = () => {
    setSelectedPage(null);
    setIsCreating(true);
    setIsEditorOpen(true);
  };

  const handleEdit = async (page: CMSPage) => {
    try {
      // Fetch full page data including content
      const fullPage = await cmsPagesService.getPage(page.id);
      setSelectedPage(fullPage);
      setIsCreating(false);
      setIsEditorOpen(true);
    } catch (error) {
      console.error('Error fetching full page:', error);
      alert('Errore nel caricamento della pagina');
    }
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setSelectedPage(null);
    setIsCreating(false);
  };

  const handleDelete = async (page: CMSPage) => {
    const shouldDelete = await confirmDelete(`la pagina "${page.title}"`);
    if (!shouldDelete) return;

    try {
      await deleteMutation.mutateAsync(page.id);
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleTogglePublish = async (page: CMSPage) => {
    try {
      if (page.isPublished) {
        await unpublishMutation.mutateAsync(page.id);
      } else {
        await publishMutation.mutateAsync(page.id);
      }
    } catch (error) {
      console.error('Toggle publish error:', error);
    }
  };

  const handleDuplicate = async (page: CMSPage) => {
    try {
      await duplicateMutation.mutateAsync(page.id);
    } catch (error) {
      console.error('Duplicate error:', error);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({
      ...prev,
      status: value ? (value as 'draft' | 'published' | 'scheduled') : undefined,
      page: 1,
    }));
  };

  // Computed
  const pages = data?.pages || [];
  const pagination = data?.pagination;

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'published':
        return 'Pubblicato';
      case 'draft':
        return 'Bozza';
      case 'scheduled':
        return 'Programmato';
      default:
        return status;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Genera le azioni per il dropdown di una pagina
  const getPageActions = (page: CMSPage): DropdownAction[] => [
    {
      label: 'Modifica',
      icon: <Edit className="w-4 h-4" />,
      onClick: () => handleEdit(page),
    },
    {
      label: page.isPublished ? 'Rimuovi pubblicazione' : 'Pubblica',
      icon: page.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />,
      onClick: () => handleTogglePublish(page),
    },
    {
      label: 'Duplica',
      icon: <Copy className="w-4 h-4" />,
      onClick: () => handleDuplicate(page),
    },
    {
      label: 'Elimina',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: () => handleDelete(page),
      variant: 'danger',
    },
  ];

  // Render
  if (isEditorOpen) {
    return (
      <CMSPageEditor
        page={selectedPage}
        isCreating={isCreating}
        onClose={handleCloseEditor}
        onSave={() => {
          handleCloseEditor();
          refetch();
        }}
      />
    );
  }

  return (
    <div className={`cms-manager ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Gestione Pagine CMS
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {pagination?.total || 0} pagine totali
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nuova Pagina
          </button>
        </div>

        {/* Brand Selector */}
        <div className="bg-gradient-to-r from-medical-50 to-health-50 rounded-lg shadow-sm border border-medical-200 p-4 mb-4">
          <div className="flex items-center gap-4">
            <Building2 className="w-5 h-5 text-medical-600" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gestione Multi-Brand
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full px-4 py-2 border border-medical-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-transparent bg-white"
              >
                <option value="all">🌐 Tutti i Brand</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.displayName}
                  </option>
                ))}
              </select>
            </div>
            {selectedBrand !== 'all' && (
              <a
                href={brands.find(b => b.id === selectedBrand)?.contacts.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-medical-600 text-white rounded-lg hover:bg-medical-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Anteprima
              </a>
            )}
          </div>
          {selectedBrand !== 'all' && (
            <div className="mt-3 pt-3 border-t border-medical-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {(() => {
                  const brand = brands.find(b => b.id === selectedBrand);
                  if (!brand) return null;
                  return (
                    <>
                      <div>
                        <span className="text-gray-600">Tema:</span>
                        <span className="ml-2 font-medium capitalize">{brand.theme}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Tenant ID:</span>
                        <span className="ml-2 font-mono text-xs">{brand.backend.tenantId}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Frontend ID:</span>
                        <span className="ml-2 font-mono text-xs">{brand.backend.frontendId}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Servizi:</span>
                        <span className="ml-2 font-medium">
                          {[
                            brand.features.medicinaLavoro && 'Medicina',
                            brand.features.corsiFormazione && 'Corsi',
                            brand.features.poliambulatorio && 'Poliambulatorio'
                          ].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={filters.search || ''}
              onChange={handleSearchChange}
              placeholder="Cerca per titolo o slug..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filters.status || ''}
              onChange={handleStatusChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="">Tutti gli stati</option>
              <option value="draft">Bozza</option>
              <option value="published">Pubblicato</option>
              <option value="scheduled">Programmato</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-2">Caricamento pagine...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6">
          <p className="font-semibold">Errore nel caricamento delle pagine</p>
          <p className="text-sm mt-1">{error.message}</p>
        </div>
      )}

      {/* Pages Table */}
      {!isLoading && !error && pages.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">
                    Azioni
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Titolo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Slug
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Stato
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Layout
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Ultimo Aggiornamento
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pages.map((page) => (
                  <tr
                    key={page.id}
                    className="hover:bg-blue-50/50 transition-colors group"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <ActionButton actions={getPageActions(page)} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center mr-3">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                            {page.title}
                          </div>
                          {page.seoTitle && (
                            <div className="text-xs text-gray-500 max-w-xs truncate">{page.seoTitle}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <code className="text-sm text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md font-mono">
                        /{page.slug}
                      </code>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border shadow-sm ${statusBadgeClass(
                          page.status
                        )}`}
                      >
                        {page.isPublished && <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>}
                        {statusLabel(page.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-sm capitalize">
                        {page.layout}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(page.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Pagina {pagination.page} di {pagination.pages} ({pagination.total} risultati)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page! - 1) }))
                  }
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Precedente
                </button>
                <button
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      page: Math.min(pagination.pages, prev.page! + 1),
                    }))
                  }
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Successiva
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && pages.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 py-12 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nessuna pagina trovata</h3>
          <p className="text-gray-600 mb-6">
            {filters.search || filters.status
              ? 'Prova a modificare i filtri di ricerca'
              : 'Inizia creando la tua prima pagina CMS'}
          </p>
          {!filters.search && !filters.status && (
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Crea Prima Pagina
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CMSManager;
