/**
 * NotificationBell
 * 
 * Componente campanella per header con badge conteggio non lette.
 * Apre un dropdown con le notifiche recenti.
 * Supporta accessibilità WCAG 2.1 AA e animazioni Framer Motion.
 * 
 * PROGETTO 47 - Advanced Notification System - Fase 5, 9
 * 
 * @module components/notifications/NotificationBell
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, CheckCheck, X, ExternalLink, AlertTriangle } from 'lucide-react';
import { useNotifications, Notification as NotificationType } from '@/context/NotificationContext';
import { useNotificationA11y, SrOnly } from '@/hooks/useNotificationA11y';
import {
  AnimatedBadge,
  AnimatedBellIcon,
  AnimatedPopup,
  itemVariants,
  useNotificationAnimation
} from './animations/NotificationAnimations';
import { cn } from '@/design-system/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

// ============================================
// TYPES
// ============================================

interface NotificationBellProps {
  className?: string;
  maxItems?: number;
  showOnlyUnread?: boolean;
}

// ============================================
// NOTIFICATION ITEM
// ============================================

interface NotificationItemProps {
  notification: NotificationType;
  onMarkAsRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onClick: (notification: NotificationType) => void;
  isActive?: boolean;
  ariaProps?: {
    role: string;
    'aria-selected': boolean;
    'aria-posinset': number;
    'aria-setsize': number;
    'aria-describedby'?: string;
    tabIndex: number;
  };
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDismiss,
  onClick,
  isActive = false,
  ariaProps
}) => {
  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'CRITICAL':
        return 'border-l-red-500 bg-red-50 dark:bg-red-950/70';
      case 'ERROR':
        return 'border-l-red-400 bg-red-50 dark:bg-red-950/50';
      case 'WARNING':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/70';
      case 'SUCCESS':
        return 'border-l-green-500 bg-green-50 dark:bg-green-950/70';
      case 'REMINDER':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/70';
      case 'ACTION':
        return 'border-l-purple-500 bg-purple-50 dark:bg-purple-950/70';
      default:
        return 'border-l-gray-300 bg-gray-50 dark:bg-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CRITICAL':
      case 'ERROR':
        return <AlertTriangle className="w-4 h-4 text-red-500" aria-hidden="true" />;
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" aria-hidden="true" />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      whileHover="hover"
      whileTap="tap"
      className={cn(
        'relative p-3 border-l-4 cursor-pointer transition-colors hover:bg-muted/50',
        'focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-inset',
        getTypeStyles(notification.type),
        !notification.isRead && 'font-medium',
        isActive && 'ring-2 ring-teal-500 ring-inset'
      )}
      onClick={() => onClick(notification)}
      {...ariaProps}
    >
      {/* Unread indicator */}
      {!notification.isRead && (
        <>
          <div
            className="absolute top-3 right-3 w-2 h-2 rounded-full bg-blue-500"
            aria-hidden="true"
          />
          <span id={`${notification.id}-unread-indicator`} className="sr-only">
            Non letta
          </span>
        </>
      )}

      {/* Header */}
      <div className="flex items-start gap-2 pr-6">
        {getTypeIcon(notification.type)}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground truncate">
            {notification.title}
          </h4>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {notification.shortBody || notification.body}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.createdAt), {
            addSuffix: true,
            locale: it
          })}
        </span>

        <div className="flex items-center gap-1">
          {!notification.isRead && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(notification.id);
              }}
              title="Segna come letta"
            >
              <Check className="h-3 w-3" />
            </Button>
          )}

          {notification.isDismissable && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(notification.id);
              }}
              title="Chiudi"
            >
              <X className="h-3 w-3" />
            </Button>
          )}

          {notification.actionUrl && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                window.open(notification.actionUrl, '_blank');
              }}
              title="Apri link"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Priority badge */}
      {(notification.priority === 'URGENT' || notification.priority === 'CRITICAL_P') && (
        <Badge
          variant="destructive"
          className="absolute top-2 right-2 text-[10px] px-1.5 py-0"
        >
          {notification.priority === 'CRITICAL_P' ? 'CRITICO' : 'URGENTE'}
        </Badge>
      )}
    </motion.div>
  );
};

// ============================================
// NOTIFICATION BELL
// ============================================

const NotificationBell: React.FC<NotificationBellProps> = ({
  className,
  maxItems = 5,
  showOnlyUnread = false
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    notifications,
    unreadCount,
    isLoading,
    isConnected,
    markAsRead,
    markAllAsRead,
    dismiss,
    fetchNotifications
  } = useNotifications();

  // A11Y hook
  const {
    announce,
    announceNewNotification,
    handleKeyDown,
    getListAriaProps,
    getItemAriaProps
  } = useNotificationA11y({ announceOnNew: true });

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Announce new notifications via screen reader
  useEffect(() => {
    const lastNotification = notifications[0];
    if (lastNotification && !lastNotification.isRead) {
      // Only announce if it's a new notification (created in last 5 seconds)
      const createdAt = new Date(lastNotification.createdAt);
      const now = new Date();
      if (now.getTime() - createdAt.getTime() < 5000) {
        announceNewNotification(lastNotification.title, lastNotification.priority);
      }
    }
  }, [notifications, announceNewNotification]);

  // Reset active index when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setActiveIndex(0);
    }
  }, [isOpen]);

  // Filter notifications
  const displayedNotifications = showOnlyUnread
    ? notifications.filter(n => !n.isRead).slice(0, maxItems)
    : notifications.slice(0, maxItems);

  const handleNotificationClick = useCallback((notification: NotificationType) => {
    // Mark as read
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    // Navigate if actionUrl - use router for internal paths
    if (notification.actionUrl) {
      if (notification.actionUrl.startsWith('http://') || notification.actionUrl.startsWith('https://')) {
        // External URL - open in new tab
        window.open(notification.actionUrl, '_blank', 'noopener,noreferrer');
      } else {
        // Internal path - use router
        navigate(notification.actionUrl);
      }
    }

    setIsOpen(false);
  }, [markAsRead, navigate]);

  const handleViewAll = useCallback(() => {
    setIsOpen(false);
    // Navigate to notifications based on current context
    const isInManagement = location.pathname.startsWith('/management');
    navigate(isInManagement ? '/management/notifiche' : '/notifiche');
  }, [navigate, location.pathname]);

  // Keyboard navigation handler
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    handleKeyDown(e, {
      items: displayedNotifications,
      activeIndex,
      onSelect: setActiveIndex,
      onActivate: () => {
        const notification = displayedNotifications[activeIndex];
        if (notification) {
          handleNotificationClick(notification);
        }
      },
      onClose: () => {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    });
  }, [handleKeyDown, displayedNotifications, activeIndex, handleNotificationClick]);

  // Toggle open
  const toggleOpen = useCallback(() => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    if (newIsOpen && displayedNotifications.length > 0) {
      announce(`${displayedNotifications.length} notifiche. Usa le frecce per navigare.`);
    }
  }, [isOpen, displayedNotifications.length, announce]);

  // Animation hook for bell ring
  const { isRinging, triggerRing } = useNotificationAnimation();

  // Trigger ring on new notification
  useEffect(() => {
    if (unreadCount.total > 0) {
      triggerRing();
    }
  }, [unreadCount.total, triggerRing]);

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* Bell Button */}
      <Button
        ref={buttonRef}
        variant="ghost"
        size="sm"
        className="relative p-2"
        onClick={toggleOpen}
        aria-label={`Notifiche (${unreadCount.total} non lette)`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls="notification-dropdown"
      >
        <AnimatedBellIcon isRinging={isRinging}>
          <Bell className={cn(
            'h-5 w-5',
            unreadCount.critical > 0 && 'text-red-500'
          )} />
        </AnimatedBellIcon>

        {/* Screen reader announcement for critical */}
        {unreadCount.critical > 0 && (
          <SrOnly>
            {unreadCount.critical} notifiche critiche
          </SrOnly>
        )}

        {/* Badge */}
        <AnimatedBadge
          count={unreadCount.total}
          className={unreadCount.critical > 0 ? 'bg-red-500' : 'bg-blue-500'}
        />

        {/* Connection indicator */}
        <span className={cn(
          'absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white',
          isConnected ? 'bg-green-500' : 'bg-gray-400'
        )} />
      </Button>

      {/* Dropdown with animation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="notification-dropdown"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 origin-top-right"
            role="dialog"
            aria-label="Notifiche"
            onKeyDown={onKeyDown}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-t-lg">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100" id="notification-dropdown-title">Notifiche</h3>
                {unreadCount.total > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {unreadCount.total} nuove
                  </Badge>
                )}
              </div>

              {unreadCount.total > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    markAllAsRead();
                    announce('Tutte le notifiche segnate come lette');
                  }}
                  className="text-xs"
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Leggi tutte
                </Button>
              )}
            </div>

            {/* Notifications List */}
            <div
              className="h-[400px] overflow-y-auto bg-white dark:bg-gray-900"
              {...getListAriaProps()}
              aria-labelledby="notification-dropdown-title"
            >
              {isLoading && displayedNotifications.length === 0 ? (
                <div className="flex items-center justify-center py-8" role="status">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  <SrOnly>Caricamento notifiche...</SrOnly>
                </div>
              ) : displayedNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Bell className="h-10 w-10 mb-2 opacity-50" aria-hidden="true" />
                  <p className="text-sm">Nessuna notifica</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700" role="group">
                  {displayedNotifications.map((notification, index) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onDismiss={dismiss}
                      onClick={handleNotificationClick}
                      isActive={index === activeIndex}
                      ariaProps={getItemAriaProps(notification, index, displayedNotifications.length)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <>
                <Separator className="bg-gray-200 dark:bg-gray-700" />
                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-b-lg">
                  <Button
                    variant="ghost"
                    className="w-full text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={handleViewAll}
                  >
                    Vedi tutte le notifiche
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
