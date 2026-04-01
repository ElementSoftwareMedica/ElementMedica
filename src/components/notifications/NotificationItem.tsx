/**
 * NotificationItem
 * 
 * Componente riusabile per visualizzare una singola notifica.
 * Supporta varie modalità: compact (dropdown), full (center), popup.
 * 
 * PROGETTO 47 - Advanced Notification System - Fase 5
 * 
 * @module components/notifications/NotificationItem
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  X,
  ExternalLink,
  Check,
  AlertTriangle,
  Info,
  CheckCircle,
  Bell,
  Zap,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/design-system/utils';
import type {
  Notification,
  NotificationType,
  NotificationPriority
} from '@/context/NotificationContext';

// ============================================
// TYPES
// ============================================

export interface NotificationItemProps {
  notification: Notification;
  variant?: 'compact' | 'full' | 'popup';
  onMarkAsRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onConfirm?: (id: string) => void;
  onClick?: () => void;
  showActions?: boolean;
  className?: string;
}

// ============================================
// STYLE MAPPINGS
// ============================================

const typeStyles: Record<NotificationType, {
  icon: React.ReactNode;
  bg: string;
  border: string;
  text: string;
  iconBg: string;
}> = {
  INFO: {
    icon: <Info className="w-4 h-4" />,
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-l-blue-500',
    text: 'text-blue-700 dark:text-blue-300',
    iconBg: 'bg-blue-100 dark:bg-blue-800/50'
  },
  SUCCESS: {
    icon: <CheckCircle className="w-4 h-4" />,
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-l-green-500',
    text: 'text-green-700 dark:text-green-300',
    iconBg: 'bg-green-100 dark:bg-green-800/50'
  },
  WARNING: {
    icon: <AlertTriangle className="w-4 h-4" />,
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-l-yellow-500',
    text: 'text-yellow-700 dark:text-yellow-300',
    iconBg: 'bg-yellow-100 dark:bg-yellow-800/50'
  },
  ERROR: {
    icon: <AlertTriangle className="w-4 h-4" />,
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-l-red-400',
    text: 'text-red-700 dark:text-red-300',
    iconBg: 'bg-red-100 dark:bg-red-800/50'
  },
  CRITICAL: {
    icon: <Zap className="w-4 h-4" />,
    bg: 'bg-red-100 dark:bg-red-900/30',
    border: 'border-l-red-600',
    text: 'text-red-800 dark:text-red-200',
    iconBg: 'bg-red-200 dark:bg-red-700/50'
  },
  REMINDER: {
    icon: <Bell className="w-4 h-4" />,
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-l-purple-500',
    text: 'text-purple-700 dark:text-purple-300',
    iconBg: 'bg-purple-100 dark:bg-purple-800/50'
  },
  ACTION: {
    icon: <FileText className="w-4 h-4" />,
    bg: 'bg-teal-50 dark:bg-teal-900/20',
    border: 'border-l-teal-500',
    text: 'text-teal-700 dark:text-teal-300',
    iconBg: 'bg-teal-100 dark:bg-teal-800/50'
  }
};

const priorityBadges: Partial<Record<NotificationPriority, {
  label: string;
  className: string;
}>> = {
  CRITICAL_P: {
    label: 'Critico',
    className: 'bg-red-600 text-white border-red-600'
  },
  URGENT: {
    label: 'Urgente',
    className: 'bg-orange-500 text-white border-orange-500'
  },
  HIGH: {
    label: 'Alta',
    className: 'bg-yellow-500 text-white border-yellow-500'
  }
};

// ============================================
// COMPONENT
// ============================================

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  variant = 'full',
  onMarkAsRead,
  onDismiss,
  onConfirm,
  onClick,
  showActions = true,
  className
}) => {
  const style = typeStyles[notification.type] || typeStyles.INFO;
  const priorityBadge = priorityBadges[notification.priority];
  const isCompact = variant === 'compact';
  const isPopup = variant === 'popup';

  // Format time ago
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
    locale: it
  });

  // Handlers
  const handleClick = () => {
    if (!notification.isRead && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
    onClick?.();
  };

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkAsRead?.(notification.id);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notification.isDismissable) {
      onDismiss?.(notification.id);
    }
  };

  const handleConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConfirm?.(notification.id);
  };

  // Build content
  const content = (
    <div
      className={cn(
        'relative group transition-colors cursor-pointer',
        'border-l-4',
        style.border,
        !notification.isRead && 'bg-teal-50/50 dark:bg-teal-900/10',
        'hover:bg-gray-50 dark:hover:bg-gray-800/50',
        isCompact && 'px-3 py-2',
        !isCompact && 'px-4 py-3',
        isPopup && 'rounded-lg shadow-lg',
        className
      )}
      onClick={handleClick}
    >
      {/* Unread indicator */}
      {!notification.isRead && (
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-teal-500" />
      )}

      <div className={cn('flex items-start gap-3', !notification.isRead && 'ml-2')}>
        {/* Icon */}
        <div className={cn(
          'flex-shrink-0 rounded-full flex items-center justify-center',
          style.iconBg,
          style.text,
          isCompact ? 'w-8 h-8' : 'w-10 h-10'
        )}>
          {notification.icon ? (
            <span className="text-lg">{notification.icon}</span>
          ) : (
            style.icon
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header with title and priority badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={cn(
                'font-medium text-foreground',
                isCompact ? 'text-sm' : 'text-base',
                !notification.isRead && 'font-semibold'
              )}>
                {notification.title}
              </h4>
              {priorityBadge && (
                <Badge
                  variant="outline"
                  className={cn('text-xs px-1.5 py-0', priorityBadge.className)}
                >
                  {priorityBadge.label}
                </Badge>
              )}
            </div>

            {/* Actions - visible on hover */}
            {showActions && (
              <div className={cn(
                'flex items-center gap-1',
                !isPopup && 'opacity-0 group-hover:opacity-100 transition-opacity'
              )}>
                {notification.requiresConfirmation && !notification.isRead && onConfirm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-green-100 hover:text-green-600"
                    onClick={handleConfirm}
                    title="Conferma lettura"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                )}
                {!notification.isRead && onMarkAsRead && !notification.requiresConfirmation && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-blue-100 hover:text-blue-600"
                    onClick={handleMarkAsRead}
                    title="Segna come letta"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                )}
                {notification.isDismissable && onDismiss && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                    onClick={handleDismiss}
                    title="Rimuovi"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Body */}
          <p className={cn(
            'text-muted-foreground mt-1',
            isCompact ? 'text-xs line-clamp-1' : 'text-sm line-clamp-2'
          )}>
            {notification.shortBody || notification.body}
          </p>

          {/* Footer with time and action link */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {timeAgo}
            </span>

            {notification.actionUrl && (
              <span className="text-xs text-teal-600 dark:text-teal-400 flex items-center gap-1">
                {notification.actionLabel || 'Visualizza'}
                <ExternalLink className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Wrap in Link if actionUrl is present
  if (notification.actionUrl) {
    // Internal link
    if (notification.actionUrl.startsWith('/')) {
      return (
        <Link to={notification.actionUrl} className="block">
          {content}
        </Link>
      );
    }
    // External link
    return (
      <a href={notification.actionUrl} target="_blank" rel="noopener noreferrer" className="block">
        {content}
      </a>
    );
  }

  return content;
};

export default NotificationItem;
