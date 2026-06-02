/**
 * NotificationContext
 * 
 * Context per la gestione delle notifiche persistenti.
 * Gestisce connessione WebSocket, fetch notifiche e stato globale.
 * 
 * PROGETTO 47 - Advanced Notification System
 * 
 * NOTA: Questo è DIVERSO da ToastContext:
 * - Toast = feedback locale, temporaneo
 * - Notification = persistente in DB, tracciabile
 * 
 * @module context/NotificationContext
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode
} from 'react';
import type { Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/auth/useAuth';
import authService from '@/services/auth';
import { apiGet, apiPut } from '@/services/api';

// ============================================
// TYPES
// ============================================

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'CRITICAL' | 'REMINDER' | 'ACTION';
export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'CRITICAL_P';
export type NotificationCategory = 'SYSTEM' | 'APPOINTMENT' | 'VISIT' | 'DOCUMENT' | 'INVOICE' | 'TRAINING' | 'GDPR' | 'SECURITY' | 'MARKETING' | 'CUSTOM';

export interface Notification {
  id: string;
  title: string;
  body: string;
  shortBody?: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  icon?: string;
  iconColor?: string;
  bgColor?: string;
  actionUrl?: string;
  actionLabel?: string;
  entityType?: string;
  entityId?: string;
  isDismissable: boolean;
  requiresConfirmation: boolean;
  forcePopup: boolean;
  isRead: boolean;
  isDismissed?: boolean;
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
}

export interface UnreadCount {
  total: number;
  direct: number;
  broadcast: number;
  critical: number;
}

export interface NotificationFilters {
  status?: 'ALL' | 'UNREAD' | 'READ';
  type?: NotificationType;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  since?: string;
  until?: string;
}

interface NotificationContextValue {
  // State
  notifications: Notification[];
  unreadCount: UnreadCount;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  popupQueue: Notification[];

  // Actions
  fetchNotifications: (filters?: NotificationFilters, page?: number) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismiss: (notificationId: string) => Promise<void>;
  confirmReceipt: (notificationId: string) => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  removeFromPopupQueue: (notificationId: string) => void;
  clearPopupQueue: () => void;
}

// ============================================
// CONTEXT
// ============================================

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

interface NotificationProviderProps {
  children: ReactNode;
}

const API_BASE = '/api/v1/notifications/advanced';
// Production: connect to same origin (nginx proxies /ws/)
// Development: connect directly to API server on :4001
const WS_URL = import.meta.env.VITE_WS_URL || (import.meta.env.DEV ? 'http://localhost:4001' : window.location.origin);

const decrementUnreadCount = (prev: UnreadCount, notification?: Notification): UnreadCount => ({
  ...prev,
  total: Math.max(0, prev.total - 1),
  direct: Math.max(0, prev.direct - 1),
  critical: notification?.priority === 'CRITICAL_P' || notification?.type === 'CRITICAL'
    ? Math.max(0, prev.critical - 1)
    : prev.critical
});

const incrementUnreadCount = (prev: UnreadCount, notification: Notification): UnreadCount => ({
  ...prev,
  total: prev.total + 1,
  direct: prev.direct + 1,
  critical: notification.priority === 'CRITICAL_P' || notification.type === 'CRITICAL'
    ? prev.critical + 1
    : prev.critical
});

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  // Get token from authService
  const getToken = useCallback(() => authService.getToken(), []);

  // State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<UnreadCount>({ total: 0, direct: 0, broadcast: 0, critical: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [popupQueue, setPopupQueue] = useState<Notification[]>([]);

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ==========================================
  // WEBSOCKET CONNECTION
  // ==========================================

  useEffect(() => {
    const token = getToken();
    if (!isAuthenticated || !token) {
      // Disconnect if not authenticated
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    let isMounted = true;

    // Dynamic import: socket.io-client only loads when user is authenticated
    // This keeps engine.io-client out of the main bundle → faster public page LCP
    import('socket.io-client').then(({ io }) => {
      if (!isMounted) return;

      const socket = io(WS_URL, {
        path: '/ws/notifications',
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
      });

      socketRef.current = socket;

      // Connection events
      socket.on('connect', () => {
        setIsConnected(true);
        setError(null);
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
      });

      socket.on('connect_error', () => {
        setError('Errore di connessione');
        setIsConnected(false);
      });

      // Notification events
      socket.on('notification:new', (notification: Notification) => {
        setNotifications(prev => [notification, ...prev]);
        if (!notification.isRead && !notification.isDismissed) {
          setUnreadCount(prev => incrementUnreadCount(prev, notification));
        }
        if (notification.forcePopup ||
          notification.priority === 'URGENT' ||
          notification.priority === 'CRITICAL_P') {
          setPopupQueue(prev => [...prev, notification]);
        }
      });

      socket.on('notification:unread-count', (count: UnreadCount) => {
        setUnreadCount(count);
      });

      socket.on('notification:critical', (criticals: Notification[]) => {
        setPopupQueue(prev => [...prev, ...criticals]);
      });

      socket.on('notification:read:ack', ({ notificationId, success }: { notificationId: string; success: boolean }) => {
        if (success) {
          setNotifications(prev =>
            prev.map(n => n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)
          );
          void refreshUnreadCount();
        }
      });

      socket.on('notification:dismiss:ack', ({ notificationId, success }: { notificationId: string; success: boolean }) => {
        if (success) {
          setNotifications(prev =>
            prev.map(n => n.id === notificationId ? { ...n, isDismissed: true } : n)
          );
          setPopupQueue(prev => prev.filter(n => n.id !== notificationId));
          void refreshUnreadCount();
        }
      });
    });

    // Cleanup
    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, getToken]);

  // ==========================================
  // API CALLS
  // ==========================================

  const fetchNotifications = useCallback(async (
    filters: NotificationFilters = {},
    page: number = 1
  ) => {
    const token = getToken();
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: '20'
      };

      if (filters.status && filters.status !== 'ALL') {
        params.unreadOnly = filters.status === 'UNREAD' ? 'true' : 'false';
      }
      if (filters.type) params.type = filters.type;
      if (filters.category) params.category = filters.category;
      if (filters.priority) params.priority = filters.priority;
      if (filters.since) params.since = filters.since;
      if (filters.until) params.until = filters.until;

      const data = await apiGet<{ data: Notification[] }>(API_BASE, params);

      if (page === 1) {
        setNotifications(data.data || []);
      } else {
        setNotifications(prev => [...prev, ...(data.data || [])]);
      }

    } catch (err) {
      setError('Impossibile caricare le notifiche');
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  const refreshUnreadCount = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const data = await apiGet<{ data: UnreadCount }>(`${API_BASE}/unread-count`);
      setUnreadCount(data.data || { total: 0, direct: 0, broadcast: 0, critical: 0 });
    } catch (err) {
    }
  }, [getToken]);

  const markAsRead = useCallback(async (notificationId: string) => {
    const token = getToken();
    if (!token) return;

    // Optimistic update
    let unreadTarget: Notification | undefined;
    setNotifications(prev => {
      unreadTarget = prev.find(n => n.id === notificationId && !n.isRead && !n.isDismissed);
      return prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n);
    });
    if (unreadTarget) {
      setUnreadCount(prev => decrementUnreadCount(prev, unreadTarget));
    }

    // Use WebSocket if connected
    if (socketRef.current?.connected) {
      socketRef.current.emit('notification:read', { notificationId });
      return;
    }

    // Fallback to REST API
    try {
      await apiPut(`${API_BASE}/${notificationId}/read`);
      await refreshUnreadCount();
    } catch (err) {
      // Revert optimistic update
      await fetchNotifications();
      await refreshUnreadCount();
    }
  }, [getToken, fetchNotifications, refreshUnreadCount]);

  const markAllAsRead = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount({ total: 0, direct: 0, broadcast: 0, critical: 0 });

    try {
      await apiPut(`${API_BASE}/read-all`);
    } catch (err) {
      // Revert
      await fetchNotifications();
      await refreshUnreadCount();
    }
  }, [getToken, fetchNotifications, refreshUnreadCount]);

  const dismiss = useCallback(async (notificationId: string) => {
    const token = getToken();
    if (!token) return;

    // Optimistic update
    let unreadTarget: Notification | undefined;
    setNotifications(prev => {
      unreadTarget = prev.find(n => n.id === notificationId && !n.isRead && !n.isDismissed);
      return prev.map(n => n.id === notificationId ? { ...n, isDismissed: true } : n);
    });
    if (unreadTarget) {
      setUnreadCount(prev => decrementUnreadCount(prev, unreadTarget));
    }
    setPopupQueue(prev => prev.filter(n => n.id !== notificationId));

    // Use WebSocket if connected
    if (socketRef.current?.connected) {
      socketRef.current.emit('notification:dismiss', { notificationId });
      return;
    }

    // Fallback to REST API
    try {
      await apiPut(`${API_BASE}/${notificationId}/dismiss`);
      await refreshUnreadCount();
    } catch (err) {
      await fetchNotifications();
      await refreshUnreadCount();
    }
  }, [getToken, fetchNotifications, refreshUnreadCount]);

  const confirmReceipt = useCallback(async (notificationId: string) => {
    const token = getToken();
    if (!token) return;

    // Use WebSocket if connected
    if (socketRef.current?.connected) {
      socketRef.current.emit('notification:confirm', { notificationId });
      return;
    }

    // Fallback to REST API
    try {
      await apiPut(`${API_BASE}/${notificationId}/confirm`);
    } catch (err) {
    }
  }, [getToken]);

  const removeFromPopupQueue = useCallback((notificationId: string) => {
    setPopupQueue(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const clearPopupQueue = useCallback(() => {
    setPopupQueue([]);
  }, []);

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    const token = getToken();
    if (isAuthenticated && token) {
      fetchNotifications();
      refreshUnreadCount();
    }
  }, [isAuthenticated, getToken, fetchNotifications, refreshUnreadCount]);

  // ==========================================
  // CONTEXT VALUE
  // ==========================================

  const value: NotificationContextValue = {
    notifications,
    unreadCount,
    isLoading,
    error,
    isConnected,
    popupQueue,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    dismiss,
    confirmReceipt,
    refreshUnreadCount,
    removeFromPopupQueue,
    clearPopupQueue
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// ============================================
// HOOK
// ============================================

export const useNotifications = (): NotificationContextValue => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
