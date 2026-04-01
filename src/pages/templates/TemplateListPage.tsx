import React, { useEffect, useState, useCallback } from 'react';
import {
  FileText,
  Download,
  Pencil,
  Trash2,
  Copy,
  Star,
  Search,
  Plus
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import EntityListLayout from '../../components/layouts/EntityListLayout';
import ResizableTable, { ResizableTableColumn } from '../../components/shared/ResizableTable';
import { FilterPanel } from '../../components/shared/filters/FilterPanel';
import { CRUDPrimaryButton } from '../../components/shared/CRUDButton';
import { templateService } from '../../services/templateService';
import { useConfirmDialog } from '../../contexts/ConfirmDialogContext';
import { useTenantFilter } from '../../context/TenantFilterContext';
import { useToast } from '../../hooks/useToast';
import {
  Template,
  TemplateType,
  TemplateFormat,
  TemplateListParams
} from '../../types/templates';

interface DataRow extends Record<string, unknown> {
  id: string;
  nome: string;
  tipo: string;
  formato: string;
  categoria: string;
  versione: string;
  documenti: number;
  stato: string;
  predefinito: string;
  dataModifica: string;
  selected: boolean;
  _original: Template;
}

const TemplateListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { confirm, confirmDelete } = useConfirmDialog();
  const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();

  // State
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [activeSort, setActiveSort] = useState<{ field: string, direction: 'asc' | 'desc' } | undefined>(undefined);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalItems, setTotalItems] = useState(0);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const tenantParams = getTenantFilterParams();
      const params: TemplateListParams = {
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        type: activeFilters.type as TemplateType || undefined,
        category: activeFilters.category || undefined,
        isActive: activeFilters.status === 'active' ? true : activeFilters.status === 'inactive' ? false : undefined,
        isDefault: activeFilters.default === 'true' ? true : undefined,
        ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
        ...(tenantParams.allTenants && { allTenants: true })
      } as TemplateListParams;

      const response = await templateService.list(params);
      setTemplates(response.data);
      setTotalItems(response.pagination.total);
    } catch (error) {
      showToast({ message: 'Errore durante il caricamento dei template', type: 'error' });
      setTemplates([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, activeFilters, getTenantFilterParams, tenantFilterKey]);

  // Load templates
  useEffect(() => {
    if (isReady) {
      fetchTemplates();
    }
  }, [fetchTemplates, isReady]);

  // Handle URL modal opening
  useEffect(() => {
    const openModal = searchParams.get('openModal');
    const templateId = searchParams.get('templateId');

    if (openModal === 'true') {
      if (templateId) {
        navigate(`/templates/${templateId}`);
      } else {
        navigate('/templates/create');
      }
      // Clear URL params
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('openModal');
      newParams.delete('templateId');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, navigate, setSearchParams]);

  // Actions
  const handleDelete = async (id: string) => {
    const shouldDelete = await confirmDelete('template');
    if (!shouldDelete) return;

    try {
      await templateService.delete(id);
      showToast({ message: 'Template eliminato con successo', type: 'success' });
      await fetchTemplates();
    } catch (error) {
      showToast({ message: 'Errore durante l\'eliminazione del template', type: 'error' });
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return;
    const shouldDelete = await confirm({
      title: 'Conferma eliminazione multipla',
      message: `Sei sicuro di voler eliminare ${selectedIds.length} template? L'operazione non può essere annullata.`,
      confirmLabel: `Elimina ${selectedIds.length} template`,
      variant: 'danger'
    });
    if (!shouldDelete) return;

    setLoading(true);
    try {
      await Promise.all(selectedIds.map(id => templateService.delete(id)));
      setSelectedIds([]);
      setSelectionMode(false);
      setSelectAll(false);
      showToast({ message: 'Template eliminati con successo', type: 'success' });
      await fetchTemplates();
    } catch (error) {
      showToast({ message: 'Errore durante l\'eliminazione multipla', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (template: Template) => {
    try {
      const newName = `${template.name} (Copia)`;
      const duplicated = await templateService.duplicate(template.id, newName);
      showToast({ message: 'Template duplicato con successo', type: 'success' });
      await fetchTemplates();
      // Navigate to edit the new template
      navigate(`/templates/${duplicated.id}`);
    } catch (error) {
      showToast({ message: 'Errore durante la duplicazione', type: 'error' });
    }
  };

  const handleSetDefault = async (template: Template) => {
    try {
      await templateService.setAsDefault(template.id);
      showToast({ message: 'Template impostato come predefinito', type: 'success' });
      await fetchTemplates();
    } catch (error) {
      showToast({ message: 'Errore durante l\'impostazione come predefinito', type: 'error' });
    }
  };

  const handleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(templates.map(t => t.id));
    }
    setSelectAll(!selectAll);
  };

  const handleEdit = (id: string) => {
    navigate(`/templates/${id}`);
  };

  const handleCreate = () => {
    navigate('/templates/create');
  };

  // Table configuration
  const columns: ResizableTableColumn<DataRow>[] = [
    {
      key: 'nome',
      label: 'Nome Template',
      minWidth: 200,
      width: 250,
      sortable: true,
      renderCell: (row: DataRow) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-400" />
          <span className="font-medium">{row.nome}</span>
          {row._original.isDefault && (
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          )}
        </div>
      )
    },
    {
      key: 'tipo',
      label: 'Tipo',
      minWidth: 100,
      width: 120,
      sortable: true,
      renderCell: (row: DataRow) => {
        const typeLabels: Record<string, string> = {
          LETTER_OF_ENGAGEMENT: 'Lettera',
          ATTENDANCE_REGISTER: 'Registro',
          CERTIFICATE: 'Attestato',
          INVOICE: 'Fattura',
          COURSE_PROGRAM: 'Programma',
          PREVENTIVO: 'Preventivo',
          SLIDES: 'Slides',
          VISITA_MEDICA: 'Visita Medica',
          CUSTOM: 'Altro'
        };
        return <span>{typeLabels[row.tipo] || row.tipo}</span>;
      }
    },
    {
      key: 'formato',
      label: 'Formato',
      minWidth: 80,
      width: 100,
      sortable: true,
      renderCell: (row: DataRow) => (
        <span className="uppercase text-xs font-semibold text-gray-600">
          {row.formato}
        </span>
      )
    },
    {
      key: 'categoria',
      label: 'Categoria',
      minWidth: 120,
      width: 150,
      sortable: true
    },
    {
      key: 'versione',
      label: 'Versione',
      minWidth: 80,
      width: 100,
      sortable: true,
      renderCell: (row: DataRow) => (
        <span className="text-sm text-gray-600">v{row.versione}</span>
      )
    },
    {
      key: 'documenti',
      label: 'Documenti',
      minWidth: 80,
      width: 100,
      sortable: true,
      renderCell: (row: DataRow) => (
        <span className="text-sm text-gray-600">{row.documenti}</span>
      )
    },
    {
      key: 'stato',
      label: 'Stato',
      minWidth: 80,
      width: 100,
      sortable: true,
      renderCell: (row: DataRow) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${row.stato === 'Attivo'
          ? 'bg-green-100 text-green-800'
          : 'bg-gray-100 text-gray-800'
          }`}>
          {row.stato}
        </span>
      )
    },
    {
      key: 'dataModifica',
      label: 'Ultima Modifica',
      minWidth: 120,
      width: 150,
      sortable: true,
      renderCell: (row: DataRow) => {
        const date = new Date(row.dataModifica);
        return <span className="text-sm text-gray-600">
          {date.toLocaleDateString('it-IT')}
        </span>;
      }
    },
    {
      key: 'actions',
      label: 'Azioni',
      minWidth: 150,
      width: 180,
      sortable: false,
      renderCell: (row: DataRow) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleEdit(row.id)}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            title="Modifica"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDuplicate(row._original)}
            className="p-1 text-gray-600 hover:bg-gray-50 rounded"
            title="Duplica"
          >
            <Copy className="h-4 w-4" />
          </button>
          {!row._original.isDefault && (
            <button
              onClick={() => handleSetDefault(row._original)}
              className="p-1 text-yellow-600 hover:bg-yellow-50 rounded"
              title="Imposta come predefinito"
            >
              <Star className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => handleDelete(row.id)}
            className="p-1 text-red-600 hover:bg-red-50 rounded"
            title="Elimina"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  // Convert templates to table rows
  const dataRows: DataRow[] = templates.map(template => ({
    id: template.id,
    nome: template.name,
    tipo: template.type,
    formato: template.fileFormat || 'HTML',
    categoria: template.category || '-',
    versione: template.version.toString(),
    documenti: template._count?.generatedDocs || 0,
    stato: template.isActive ? 'Attivo' : 'Inattivo',
    predefinito: template.isDefault ? 'Sì' : 'No',
    dataModifica: template.updatedAt,
    selected: selectedIds.includes(template.id),
    _original: template
  }));

  // Filter definitions
  const filters = [
    {
      key: 'type',
      label: 'Tipo',
      type: 'select' as const,
      options: [
        { value: '', label: 'Tutti' },
        { value: 'LETTER_OF_ENGAGEMENT', label: 'Lettera' },
        { value: 'ATTENDANCE_REGISTER', label: 'Registro' },
        { value: 'CERTIFICATE', label: 'Attestato' },
        { value: 'INVOICE', label: 'Fattura' },
        { value: 'COURSE_PROGRAM', label: 'Programma' },
        { value: 'PREVENTIVO', label: 'Preventivo' },
        { value: 'SLIDES', label: 'Slides' },
        { value: 'VISITA_MEDICA', label: 'Visita Medica' },
        { value: 'CUSTOM', label: 'Altro' }
      ]
    },
    {
      key: 'status',
      label: 'Stato',
      type: 'select' as const,
      options: [
        { value: '', label: 'Tutti' },
        { value: 'active', label: 'Attivi' },
        { value: 'inactive', label: 'Inattivi' }
      ]
    },
    {
      key: 'default',
      label: 'Predefinito',
      type: 'select' as const,
      options: [
        { value: '', label: 'Tutti' },
        { value: 'true', label: 'Solo predefiniti' }
      ]
    }
  ];

  return (
    <EntityListLayout
      title="Template Documenti"
      subtitle="Gestione template per la generazione automatica di documenti (lettere, attestati, registri, fatture, preventivi, slides, visite)"
      extraControls={
        <CRUDPrimaryButton operation="create" onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          Nuovo Template
        </CRUDPrimaryButton>
      }
      searchBarContent={
        <div className="flex flex-col gap-4">
          {/* Search bar */}
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca template..."
              className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filters */}
          <FilterPanel
            filters={filters}
            values={activeFilters}
            onChange={setActiveFilters}
          />
        </div>
      }
      loading={loading}
    >

      <div className="space-y-4">
        {/* Selection controls */}
        {selectionMode && (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-md">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">
                  {selectedIds.length} di {templates.length} selezionati
                </span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteSelected}
                disabled={selectedIds.length === 0}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-4 w-4" />
                Elimina selezionati
              </button>
              <button
                onClick={() => {
                  setSelectionMode(false);
                  setSelectedIds([]);
                  setSelectAll(false);
                }}
                className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
              >
                Annulla
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <ResizableTable
          columns={columns}
          data={dataRows}
          onRowClick={(row) => {
            if (row.id) {
              handleEdit(row.id as string);
            }
          }}
          sortKey={activeSort?.field}
          sortDirection={activeSort?.direction || null}
          onSort={(key, direction) => {
            if (direction) {
              setActiveSort({ field: key, direction });
            } else {
              setActiveSort(undefined);
            }
          }}
        />

        {/* Pagination */}
        {totalItems > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-gray-700">
              {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalItems)} di {totalItems} template
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Precedente
              </button>
              <span className="px-3 py-1">
                Pagina {currentPage} di {Math.ceil(totalItems / pageSize)}
              </span>
              <button
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage >= Math.ceil(totalItems / pageSize)}
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Successiva
              </button>
            </div>
          </div>
        )}
      </div>
    </EntityListLayout>
  );
};

export default TemplateListPage;
