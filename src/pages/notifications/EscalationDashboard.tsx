/**
 * EscalationDashboard - Dashboard Gestione Escalation
 * 
 * Pagina per visualizzare e gestire le escalation delle notifiche.
 * Mostra statistiche, escalation attive, e permette risoluzione manuale.
 * 
 * PROGETTO 47 - Advanced Notification System - Fase 7
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, Clock, CheckCircle, TrendingUp, RefreshCw,
  Filter, AlertCircle, Users, Settings, Eye, Check
} from 'lucide-react';
import { apiGet, apiPut, apiPost } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { useTenantMode } from '@/contexts/TenantModeContext';
import { useTenantFilter } from '@/context/TenantFilterContext';
import ResizableTable, { type ResizableTableColumn } from '@/components/shared/ResizableTable';
import { Button } from '@/components/ui/button';
import { CRUDPrimaryButton } from '@/components/shared/CRUDButton';
import { ActionButton } from '@/components/ui/ActionButton';
import type { DropdownAction } from '@/design-system/molecules/Dropdown';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import EscalationConfigPanel from './EscalationConfigPanel';

// API Base
const API_BASE = '/api/v1/notifications/advanced';

// Types
interface Escalation {
  id: string;
  tenantId: string;
  notificationId: string;
  fromLevel: number;
  toLevel: number;
  reason: string;
  escalatedToPersonIds: string[];
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
  notification?: {
    id: string;
    title: string;
    body: string;
    type: string;
    priority: string;
    recipientId: string;
    createdAt: string;
    recipient?: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
}

interface EscalationStats {
  total: number;
  resolved: number;
  unresolved: number;
  avgResolutionTimeMinutes: number;
  resolutionRate: number;
  byLevel: {
    level1: number;
    level2: number;
    level3: number;
  };
  daily: Array<{
    date: string;
    total: number;
    resolved: number;
  }>;
  period: {
    from: string;
    to: string;
  };
}

interface EscalationCount {
  level1: number;
  level2: number;
  level3: number;
  total: number;
}

// Fetch functions
const fetchEscalations = async (params: Record<string, string | undefined>) => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) queryParams.append(key, value);
  });
  const result = await apiGet(`${API_BASE}/escalations?${queryParams.toString()}`);
  return result;
};

const fetchActiveEscalations = async () => {
  const result = await apiGet(`${API_BASE}/escalations/active`);
  return result as { escalations: Escalation[] };
};

const fetchStats = async (from?: string, to?: string) => {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  const result = await apiGet(`${API_BASE}/escalations/stats?${params.toString()}`);
  return result as { stats: EscalationStats };
};

const fetchCounts = async () => {
  const result = await apiGet(`${API_BASE}/escalations/count`);
  return result as { counts: EscalationCount };
};

export default function EscalationDashboard() {
  const { showToast } = useToast();
  const { canPerformCRUD } = useTenantMode();
  const { tenantFilterKey, isReady } = useTenantFilter();
  const queryClient = useQueryClient();

  // State
  const [activeTab, setActiveTab] = useState<'active' | 'all' | 'config'>('active');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Queries
  const { data: statsData, isLoading: loadingStats } = useQuery({
    queryKey: ['escalation-stats', tenantFilterKey],
    queryFn: () => fetchStats(),
    enabled: isReady
  });

  const { data: countsData } = useQuery({
    queryKey: ['escalation-counts', tenantFilterKey],
    queryFn: fetchCounts,
    enabled: isReady
  });

  const { data: activeData, isLoading: loadingActive } = useQuery({
    queryKey: ['escalation-active', tenantFilterKey],
    queryFn: fetchActiveEscalations,
    enabled: isReady && activeTab === 'active',
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: allData, isLoading: loadingAll } = useQuery({
    queryKey: ['escalation-all', statusFilter, levelFilter, page, tenantFilterKey],
    queryFn: () => fetchEscalations({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      level: levelFilter !== 'all' ? levelFilter : undefined,
      page: page.toString(),
      limit: limit.toString()
    }),
    enabled: isReady && activeTab === 'all'
  });

  // Mutations
  const resolveMutation = useMutation({
    mutationFn: (escalationId: string) =>
      apiPut(`${API_BASE}/escalations/${escalationId}/resolve`),
    onSuccess: () => {
      showToast({ message: 'Escalation risolta con successo', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['escalation'] });
    },
    onError: (error: Error) => {
      showToast({ message: 'Errore', type: 'error' });
    }
  });

  const triggerProcessingMutation = useMutation({
    mutationFn: async () => {
      const result = await apiPost<{ success: boolean; processed: number; errors: number; message: string }>(`${API_BASE}/escalations/process`);
      return result;
    },
    onSuccess: (data) => {
      if (data.success) {
        showToast({
          message: `Processamento completato: ${data.processed} elaborate, ${data.errors} errori`,
          type: data.errors > 0 ? 'warning' : 'success'
        });
      } else {
        showToast({ message: 'Errore durante il processamento delle escalation', type: 'error' });
      }
      queryClient.invalidateQueries({ queryKey: ['escalation'] });
    },
    onError: (error: Error) => {
      showToast({ message: 'Errore', type: 'error' });
    }
  });

  // Handlers
  const handleResolve = useCallback((escalation: Escalation) => {
    if (!canPerformCRUD) {
      showToast({ message: 'Seleziona un tenant per questa operazione', type: 'warning' });
      return;
    }
    resolveMutation.mutate(escalation.id);
  }, [canPerformCRUD, resolveMutation, showToast]);

  const handleTriggerProcessing = useCallback(() => {
    if (!canPerformCRUD) {
      showToast({ message: 'Seleziona un tenant per questa operazione', type: 'warning' });
      return;
    }
    triggerProcessingMutation.mutate();
  }, [canPerformCRUD, triggerProcessingMutation, showToast]);

  // Helpers
  const getLevelBadge = (level: number) => {
    switch (level) {
      case 1:
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Livello 1</Badge>;
      case 2:
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Livello 2</Badge>;
      case 3:
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Livello 3</Badge>;
      default:
        return <Badge variant="outline">Livello {level}</Badge>;
    }
  };

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case 'TIMEOUT':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Timeout</Badge>;
      case 'MANUAL':
        return <Badge variant="secondary"><Users className="w-3 h-3 mr-1" />Manuale</Badge>;
      case 'THRESHOLD':
        return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" />Threshold</Badge>;
      default:
        return <Badge variant="secondary">{reason}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Table columns
  const columns: ResizableTableColumn<Escalation>[] = [
    {
      key: 'notification',
      label: 'Notifica',
      width: 250,
      renderCell: (row: Escalation) => (
        <div className="flex flex-col">
          <span className="font-medium text-sm truncate">{row.notification?.title || 'N/A'}</span>
          <span className="text-xs text-gray-500 truncate">{row.notification?.body?.substring(0, 50)}...</span>
        </div>
      )
    },
    {
      key: 'level',
      label: 'Livello',
      width: 120,
      renderCell: (row: Escalation) => (
        <div className="flex items-center gap-2">
          {getLevelBadge(row.toLevel)}
        </div>
      )
    },
    {
      key: 'reason',
      label: 'Motivo',
      width: 120,
      renderCell: (row: Escalation) => getReasonBadge(row.reason)
    },
    {
      key: 'recipient',
      label: 'Destinatario',
      width: 150,
      renderCell: (row: Escalation) => (
        <span className="text-sm">
          {row.notification?.recipient
            ? `${row.notification.recipient.firstName} ${row.notification.recipient.lastName}`
            : 'N/A'}
        </span>
      )
    },
    {
      key: 'escalatedTo',
      label: 'Escalato a',
      width: 100,
      renderCell: (row: Escalation) => (
        <Badge variant="outline">
          {row.escalatedToPersonIds?.length || 0} persone
        </Badge>
      )
    },
    {
      key: 'status',
      label: 'Stato',
      width: 100,
      renderCell: (row: Escalation) => (
        row.resolvedAt ? (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Risolto
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Attivo
          </Badge>
        )
      )
    },
    {
      key: 'createdAt',
      label: 'Data',
      width: 150,
      renderCell: (row: Escalation) => (
        <span className="text-sm text-gray-600">
          {formatDate(row.createdAt)}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Azioni',
      width: 80,
      renderCell: (row: Escalation) => {
        const actions: DropdownAction[] = [
          {
            label: 'Visualizza',
            icon: <Eye className="w-4 h-4" />,
            onClick: () => {
              // TODO: Open detail modal
              showToast({ message: 'Funzione in arrivo', type: 'info' });
            }
          }
        ];

        if (!row.resolvedAt) {
          actions.push({
            label: 'Risolvi',
            icon: <Check className="w-4 h-4" />,
            onClick: () => handleResolve(row)
          });
        }

        return (
          <ActionButton
            theme="teal"
            actions={actions}
          />
        );
      }
    }
  ];

  const stats = statsData?.stats;
  const counts = countsData?.counts;
  const activeEscalations = activeData?.escalations || [];
  const allEscalationsData = allData as { escalations?: Escalation[]; pagination?: { total: number; page: number; limit: number; totalPages: number } } | undefined;
  const allEscalations = allEscalationsData?.escalations || [];
  const pagination = allEscalationsData?.pagination;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Escalation</h1>
          <p className="text-gray-500 mt-1">Gestisci le escalation delle notifiche critiche</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['escalation'] })}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Aggiorna
          </Button>
          <CRUDPrimaryButton
            onClick={handleTriggerProcessing}
            disabled={triggerProcessingMutation.isPending}
          >
            {triggerProcessingMutation.isPending ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <AlertTriangle className="w-4 h-4 mr-2" />
            )}
            Processa Escalation
          </CRUDPrimaryButton>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Escalation Attive</p>
                <p className="text-2xl font-bold text-red-600">{counts?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Risolte (30gg)</p>
                <p className="text-2xl font-bold text-green-600">{stats?.resolved || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Tempo Medio Risoluzione</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats?.avgResolutionTimeMinutes || 0} min
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Livello 3 Raggiunti</p>
                <p className="text-2xl font-bold text-purple-600">{stats?.byLevel?.level3 || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Level Breakdown */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-sm font-medium">Livello 1</span>
              </div>
              <span className="text-xl font-bold">{counts?.level1 || 0}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Supervisori</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-sm font-medium">Livello 2</span>
              </div>
              <span className="text-xl font-bold">{counts?.level2 || 0}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Manager</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm font-medium">Livello 3</span>
              </div>
              <span className="text-xl font-bold">{counts?.level3 || 0}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Admin</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Attive ({counts?.total || 0})
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Tutte
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configurazione
          </TabsTrigger>
        </TabsList>

        {/* Active Escalations Tab */}
        <TabsContent value="active" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Escalation Attive
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingActive ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : activeEscalations.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">Nessuna escalation attiva</h3>
                  <p className="text-gray-500 mt-1">Tutte le notifiche critiche sono state gestite</p>
                </div>
              ) : (
                <ResizableTable<Escalation>
                  columns={columns}
                  data={activeEscalations}
                  tableName="escalation-active-table"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Escalations Tab */}
        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Storico Escalation</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Stato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti</SelectItem>
                      <SelectItem value="open">Attive</SelectItem>
                      <SelectItem value="resolved">Risolte</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={levelFilter} onValueChange={setLevelFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Livello" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti</SelectItem>
                      <SelectItem value="1">Livello 1</SelectItem>
                      <SelectItem value="2">Livello 2</SelectItem>
                      <SelectItem value="3">Livello 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingAll ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : allEscalations.length === 0 ? (
                <div className="text-center py-12">
                  <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">Nessuna escalation trovata</h3>
                  <p className="text-gray-500 mt-1">Prova a modificare i filtri</p>
                </div>
              ) : (
                <>
                  <ResizableTable<Escalation>
                    columns={columns}
                    data={allEscalations}
                    tableName="escalation-all-table"
                  />
                  {pagination && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <span className="text-sm text-gray-500">
                        Pagina {pagination.page} di {pagination.totalPages} ({pagination.total} totali)
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page === 1}
                          onClick={() => setPage(p => p - 1)}
                        >
                          Precedente
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page >= pagination.totalPages}
                          onClick={() => setPage(p => p + 1)}
                        >
                          Successiva
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config" className="mt-4">
          <EscalationConfigPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
