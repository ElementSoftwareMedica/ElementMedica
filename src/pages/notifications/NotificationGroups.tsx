/**
 * NotificationGroups - Gestione Gruppi Destinatari
 * 
 * Pagina per gestire gruppi di destinatari per notifiche.
 * Supporta gruppi statici, dinamici, role-based e segmenti.
 * 
 * PROGETTO 47 - Advanced Notification System - Fase 6
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Users, Settings, Eye, Trash2, Edit,
  RefreshCw, Play, Filter, Database, UserCheck, Tags
} from 'lucide-react';
import { apiGet, apiPost, apiDelete } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { useTenantMode } from '@/contexts/TenantModeContext';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import { useTenantFilter } from '@/context/TenantFilterContext';
import ResizableTable, { type ResizableTableColumn } from '@/components/shared/ResizableTable';
import { Button } from '@/components/ui/button';
import { CRUDButton, CRUDPrimaryButton } from '@/components/shared/CRUDButton';
import { ActionButton } from '@/components/ui/ActionButton';
import type { DropdownAction } from '@/design-system/molecules/Dropdown';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import GroupFormModal from './GroupFormModal';
import GroupPreviewModal from './GroupPreviewModal';
import SendToGroupModal from './SendToGroupModal';

// API Base
const API_BASE = '/api/v1/notifications/advanced';

// Types
interface NotificationGroup {
  id: string;
  name: string;
  description: string | null;
  type: 'STATIC' | 'DYNAMIC' | 'ROLE_BASED' | 'SEGMENT';
  dynamicQuery: Record<string, unknown> | null;
  isActive: boolean;
  memberCount: number;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GroupsResponse {
  success: boolean;
  data: NotificationGroup[];
}

// Group type labels
const GROUP_TYPE_LABELS: Record<string, string> = {
  STATIC: 'Statico',
  DYNAMIC: 'Dinamico',
  ROLE_BASED: 'Per Ruolo',
  SEGMENT: 'Segmento'
};

// Group type icons
const GROUP_TYPE_ICONS: Record<string, React.ReactNode> = {
  STATIC: <Users className="w-4 h-4" />,
  DYNAMIC: <Database className="w-4 h-4" />,
  ROLE_BASED: <UserCheck className="w-4 h-4" />,
  SEGMENT: <Tags className="w-4 h-4" />
};

// Group type colors
const GROUP_TYPE_COLORS: Record<string, string> = {
  STATIC: 'bg-blue-100 text-blue-800',
  DYNAMIC: 'bg-purple-100 text-purple-800',
  ROLE_BASED: 'bg-green-100 text-green-800',
  SEGMENT: 'bg-orange-100 text-orange-800'
};

export default function NotificationGroups() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { canPerformCRUD } = useTenantMode();
  const { confirmDelete } = useConfirmDialog();
  const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();

  // State
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<NotificationGroup | null>(null);
  const [previewGroup, setPreviewGroup] = useState<NotificationGroup | null>(null);
  const [sendGroup, setSendGroup] = useState<NotificationGroup | null>(null);

  // Query params
  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (typeFilter) params.type = typeFilter;
    if (statusFilter) params.isActive = statusFilter;
    return params;
  }, [search, typeFilter, statusFilter]);

  // Fetch groups
  const { data: groupsData, isLoading, refetch } = useQuery<GroupsResponse>({
    queryKey: ['notification-groups', queryParams, tenantFilterKey],
    queryFn: async () => {
      const queryString = new URLSearchParams(queryParams).toString();
      const url = queryString ? `${API_BASE}/groups?${queryString}` : `${API_BASE}/groups`;
      return apiGet<GroupsResponse>(url);
    },
    enabled: isReady
  });

  const groups = groupsData?.data || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiDelete(`${API_BASE}/groups/${id}`);
    },
    onSuccess: () => {
      showToast({ message: 'Gruppo eliminato con successo', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['notification-groups'] });
    },
    onError: () => {
      showToast({ message: 'Errore eliminazione gruppo', type: 'error' });
    }
  });

  // Toggle mutation
  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiPost(`${API_BASE}/groups/${id}/toggle`, {});
    },
    onSuccess: () => {
      showToast({ message: 'Stato gruppo aggiornato', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['notification-groups'] });
    },
    onError: () => {
      showToast({ message: 'Errore aggiornamento stato', type: 'error' });
    }
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiPost<{ success: boolean; data: { memberCount?: number } }>(`${API_BASE}/groups/${id}/sync`, {});
    },
    onSuccess: (data) => {
      showToast({ message: `Gruppo sincronizzato: ${data.data?.memberCount || 0} membri`, type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['notification-groups'] });
    },
    onError: () => {
      showToast({ message: 'Errore sincronizzazione gruppo', type: 'error' });
    }
  });

  // Handlers
  const handleDelete = useCallback(async (group: NotificationGroup) => {
    if (await confirmDelete(group.name)) {
      deleteMutation.mutate(group.id);
    }
  }, [deleteMutation, confirmDelete]);

  const handleToggle = useCallback((group: NotificationGroup) => {
    toggleMutation.mutate(group.id);
  }, [toggleMutation]);

  const handleSync = useCallback((group: NotificationGroup) => {
    if (group.type === 'STATIC') {
      showToast({ message: 'I gruppi statici non richiedono sincronizzazione', type: 'info' });
      return;
    }
    syncMutation.mutate(group.id);
  }, [syncMutation, showToast]);

  const handleModalSuccess = useCallback(() => {
    setCreateModalOpen(false);
    setEditGroup(null);
    queryClient.invalidateQueries({ queryKey: ['notification-groups'] });
  }, [queryClient]);

  // Table columns
  const columns = useMemo(() => [
    {
      key: 'name',
      label: 'Nome Gruppo',
      renderCell: (row: NotificationGroup) => (
        <div>
          <div className="font-medium">{row.name}</div>
          {row.description && (
            <div className="text-sm text-muted-foreground line-clamp-1">
              {row.description}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'type',
      label: 'Tipo',
      renderCell: (row: NotificationGroup) => (
        <Badge className={GROUP_TYPE_COLORS[row.type]}>
          <span className="mr-1">{GROUP_TYPE_ICONS[row.type]}</span>
          {GROUP_TYPE_LABELS[row.type]}
        </Badge>
      )
    },
    {
      key: 'memberCount',
      label: 'Membri',
      renderCell: (row: NotificationGroup) => (
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span>{row.memberCount || 0}</span>
        </div>
      )
    },
    {
      key: 'isActive',
      label: 'Stato',
      renderCell: (row: NotificationGroup) => (
        <Badge variant={row.isActive ? 'success' : 'secondary'}>
          {row.isActive ? 'Attivo' : 'Disattivo'}
        </Badge>
      )
    },
    {
      key: 'lastSyncAt',
      label: 'Ultima Sync',
      renderCell: (row: NotificationGroup) => {
        if (row.type === 'STATIC') {
          return <span className="text-muted-foreground">-</span>;
        }
        if (!row.lastSyncAt) {
          return <span className="text-muted-foreground">Mai</span>;
        }
        return new Date(row.lastSyncAt).toLocaleString('it-IT', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    },
    {
      key: 'actions',
      label: 'Azioni',
      renderCell: (row: NotificationGroup) => {
        const group = row;
        const actions: DropdownAction[] = [
          {
            label: 'Anteprima',
            icon: <Eye className="w-4 h-4" />,
            onClick: () => setPreviewGroup(group)
          },
          {
            label: 'Invia Notifica',
            icon: <Play className="w-4 h-4" />,
            onClick: () => setSendGroup(group)
          },
          {
            label: 'Modifica',
            icon: <Edit className="w-4 h-4" />,
            onClick: () => setEditGroup(group)
          },
          {
            label: group.isActive ? 'Disattiva' : 'Attiva',
            icon: <Settings className="w-4 h-4" />,
            onClick: () => handleToggle(group)
          }
        ];

        // Sync solo per gruppi dinamici
        if (group.type !== 'STATIC') {
          actions.push({
            label: 'Sincronizza',
            icon: <RefreshCw className="w-4 h-4" />,
            onClick: () => handleSync(group)
          });
        }

        // Elimina sempre ultimo
        actions.push({
          label: 'Elimina',
          icon: <Trash2 className="w-4 h-4" />,
          onClick: () => handleDelete(group),
          variant: 'danger'
        });

        return <ActionButton theme="teal" actions={actions} />;
      }
    }
  ], [handleDelete, handleToggle, handleSync]);

  // Stats
  const stats = useMemo(() => {
    const total = groups.length;
    const active = groups.filter(g => g.isActive).length;
    const static_ = groups.filter(g => g.type === 'STATIC').length;
    const dynamic = groups.filter(g => g.type !== 'STATIC').length;
    return { total, active, static: static_, dynamic };
  }, [groups]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gruppi Destinatari</h1>
          <p className="text-muted-foreground">
            Gestisci gruppi per invio notifiche mirate
          </p>
        </div>
        <CRUDPrimaryButton onClick={() => setCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuovo Gruppo
        </CRUDPrimaryButton>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Totale Gruppi</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Gruppi Attivi</div>
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Gruppi Statici</div>
          <div className="text-2xl font-bold text-blue-600">{stats.static}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Gruppi Dinamici</div>
          <div className="text-2xl font-bold text-purple-600">{stats.dynamic}</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cerca gruppi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo gruppo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tutti i tipi</SelectItem>
            <SelectItem value="STATIC">Statico</SelectItem>
            <SelectItem value="DYNAMIC">Dinamico</SelectItem>
            <SelectItem value="ROLE_BASED">Per Ruolo</SelectItem>
            <SelectItem value="SEGMENT">Segmento</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tutti</SelectItem>
            <SelectItem value="true">Attivi</SelectItem>
            <SelectItem value="false">Disattivi</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Aggiorna
        </Button>
      </div>

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mb-3 opacity-50" />
            <p>Nessun gruppo trovato</p>
          </div>
        ) : (
          <ResizableTable
            columns={columns}
            data={groups}
            onRowClick={(row: NotificationGroup) => setPreviewGroup(row)}
          />
        )}
      </Card>

      {/* Modals */}
      {createModalOpen && (
        <GroupFormModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={handleModalSuccess}
        />
      )}

      {editGroup && (
        <GroupFormModal
          open={!!editGroup}
          group={editGroup}
          onClose={() => setEditGroup(null)}
          onSuccess={handleModalSuccess}
        />
      )}

      {previewGroup && (
        <GroupPreviewModal
          open={!!previewGroup}
          group={previewGroup}
          onClose={() => setPreviewGroup(null)}
        />
      )}

      {sendGroup && (
        <SendToGroupModal
          open={!!sendGroup}
          group={sendGroup}
          onClose={() => setSendGroup(null)}
        />
      )}
    </div>
  );
}
