/**
 * NotificationCenter
 * 
 * Pagina principale per visualizzare tutte le notifiche.
 * Supporta filtri, ricerca, paginazione e azioni batch.
 * 
 * PROGETTO 47 - Advanced Notification System - Fase 5
 * 
 * @module pages/notifications/NotificationCenter
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Settings,
  Search,
  RefreshCw,
  X,
  SlidersHorizontal,
  Inbox,
  Archive,
  AlertCircle
} from 'lucide-react';
import {
  useNotifications,
  NotificationFilters,
  NotificationType,
  NotificationCategory,
  NotificationPriority
} from '@/context/NotificationContext';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/design-system/utils';

// ============================================
// TYPES
// ============================================

type StatusFilter = 'ALL' | 'UNREAD' | 'READ';

interface FilterState {
  status: StatusFilter;
  type?: NotificationType;
  category?: NotificationCategory;
  priority?: NotificationPriority;
}

// ============================================
// CONSTANTS
// ============================================

const TYPE_OPTIONS: { value: NotificationType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tutti i tipi' },
  { value: 'INFO', label: 'Informazioni' },
  { value: 'SUCCESS', label: 'Successo' },
  { value: 'WARNING', label: 'Avvisi' },
  { value: 'ERROR', label: 'Errori' },
  { value: 'CRITICAL', label: 'Critiche' },
  { value: 'REMINDER', label: 'Promemoria' },
  { value: 'ACTION', label: 'Azioni richieste' }
];

const CATEGORY_OPTIONS: { value: NotificationCategory | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tutte le categorie' },
  { value: 'APPOINTMENT', label: 'Appuntamenti' },
  { value: 'BILLING', label: 'Fatturazione' },
  { value: 'DOCUMENT', label: 'Documenti' },
  { value: 'CLINICAL', label: 'Clinica' },
  { value: 'TRAINING', label: 'Formazione' },
  { value: 'SAFETY', label: 'Sicurezza' },
  { value: 'SYSTEM', label: 'Sistema' },
  { value: 'REMINDER', label: 'Promemoria' },
  { value: 'MARKETING', label: 'Marketing' }
];

const PRIORITY_OPTIONS: { value: NotificationPriority | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tutte le priorità' },
  { value: 'CRITICAL_P', label: 'Critica' },
  { value: 'URGENT', label: 'Urgente' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'NORMAL', label: 'Normale' },
  { value: 'LOW', label: 'Bassa' }
];

// ============================================
// COMPONENT
// ============================================

export const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  // Determine base path based on current context
  const basePath = location.pathname.startsWith('/management')
    ? '/management/notifiche'
    : '/notifiche';

  // Context
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    dismiss,
    refreshUnreadCount
  } = useNotifications();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({ status: 'ALL' });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  // Fetch on mount and filter change
  useEffect(() => {
    const apiFilters: NotificationFilters = {};
    if (filters.status !== 'ALL') {
      apiFilters.status = filters.status;
    }
    if (filters.type) {
      apiFilters.type = filters.type;
    }
    if (filters.category) {
      apiFilters.category = filters.category;
    }
    if (filters.priority) {
      apiFilters.priority = filters.priority;
    }

    fetchNotifications(apiFilters, page);
  }, [fetchNotifications, filters, page]);

  // Filter notifications locally (for search)
  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(query) ||
        n.body.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [notifications, searchQuery]);

  // Stats
  const stats = useMemo(() => ({
    total: filteredNotifications.length,
    unread: filteredNotifications.filter(n => !n.isRead).length
  }), [filteredNotifications]);

  // Handlers
  const handleRefresh = useCallback(() => {
    fetchNotifications({}, 1);
    refreshUnreadCount();
  }, [fetchNotifications, refreshUnreadCount]);

  const handleMarkAsRead = useCallback(async (id: string) => {
    try {
      await markAsRead(id);
    } catch {
      showToast({
        message: 'Errore nel segnare come letta',
        type: 'error'
      });
    }
  }, [markAsRead, showToast]);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllAsRead();
      showToast({
        message: 'Tutte le notifiche segnate come lette',
        type: 'success'
      });
    } catch {
      showToast({
        message: 'Errore nel segnare tutte come lette',
        type: 'error'
      });
    }
  }, [markAllAsRead, showToast]);

  const handleDismiss = useCallback(async (id: string) => {
    try {
      await dismiss(id);
    } catch {
      showToast({
        message: 'Errore nella rimozione',
        type: 'error'
      });
    }
  }, [dismiss, showToast]);

  const handleFilterChange = useCallback((key: keyof FilterState, value: string) => {
    setPage(1);
    if (value === 'ALL') {
      setFilters(prev => {
        const newFilters = { ...prev };
        delete newFilters[key as keyof Omit<FilterState, 'status'>];
        if (key === 'status') newFilters.status = 'ALL';
        return newFilters;
      });
    } else {
      setFilters(prev => ({
        ...prev,
        [key]: value
      }));
    }
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({ status: 'ALL' });
    setSearchQuery('');
    setPage(1);
  }, []);

  const hasActiveFilters = filters.status !== 'ALL' ||
    filters.type ||
    filters.category ||
    filters.priority ||
    searchQuery;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
            <Bell className="w-6 h-6 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Centro Notifiche
            </h1>
            <p className="text-sm text-muted-foreground">
              Gestisci tutte le tue notifiche
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
            Aggiorna
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={unreadCount.total === 0}
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            Segna tutte
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`${basePath}/preferenze`)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Preferenze
          </Button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-4 mb-6">
        {/* Search and Toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cerca notifiche..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={filters.status === 'ALL' ? 'secondary' : 'ghost'}
              size="sm"
              className="gap-1"
              onClick={() => handleFilterChange('status', 'ALL')}
            >
              <Inbox className="w-4 h-4" />
              Tutte
            </Button>
            <Button
              variant={filters.status === 'UNREAD' ? 'secondary' : 'ghost'}
              size="sm"
              className="gap-1"
              onClick={() => handleFilterChange('status', 'UNREAD')}
            >
              <AlertCircle className="w-4 h-4" />
              Non lette
              {unreadCount.total > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {unreadCount.total}
                </Badge>
              )}
            </Button>
            <Button
              variant={filters.status === 'READ' ? 'secondary' : 'ghost'}
              size="sm"
              className="gap-1"
              onClick={() => handleFilterChange('status', 'READ')}
            >
              <Archive className="w-4 h-4" />
              Lette
            </Button>
          </div>

          {/* Filter Toggle */}
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Filtri
            {hasActiveFilters && (
              <Badge variant="default" className="ml-2 text-xs">
                Attivi
              </Badge>
            )}
          </Button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <>
            <Separator className="my-4" />
            <div className="flex flex-wrap items-center gap-3">
              {/* Type Filter */}
              <Select
                value={filters.type || 'ALL'}
                onValueChange={(value) => handleFilterChange('type', value)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Category Filter */}
              <Select
                value={filters.category || 'ALL'}
                onValueChange={(value) => handleFilterChange('category', value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Priority Filter */}
              <Select
                value={filters.priority || 'ALL'}
                onValueChange={(value) => handleFilterChange('priority', value)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Priorità" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="text-muted-foreground"
                >
                  <X className="w-4 h-4 mr-2" />
                  Pulisci filtri
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Stats Bar */}
      <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
        <span>
          {stats.total} notifiche
          {stats.unread > 0 && ` (${stats.unread} non lette)`}
        </span>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Notification List */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        {isLoading && notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Caricamento notifiche...</p>
          </div>
        ) : filteredNotifications.length > 0 ? (
          <div className="divide-y divide-border">
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                variant="full"
                onMarkAsRead={handleMarkAsRead}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Bell className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">Nessuna notifica</p>
            <p className="text-sm mt-1">
              {hasActiveFilters
                ? 'Nessuna notifica corrisponde ai filtri selezionati'
                : 'Le nuove notifiche appariranno qui'
              }
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={handleClearFilters}
              >
                Rimuovi filtri
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Load More */}
      {filteredNotifications.length >= 20 && (
        <div className="flex justify-center mt-6">
          <Button
            variant="outline"
            onClick={() => setPage(p => p + 1)}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Caricamento...
              </>
            ) : (
              'Carica altre'
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
