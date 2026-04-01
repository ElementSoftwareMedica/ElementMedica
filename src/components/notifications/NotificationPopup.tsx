/**
 * NotificationPopup
 * 
 * Popup che appare in alto a destra per nuove notifiche.
 * Auto-dismiss configurabile, supporto per azioni.
 * 
 * PROGETTO 47 - Advanced Notification System
 * 
 * NOTA: Questo è DIVERSO dai Toast:
 * - Popup = per notifiche persistenti, con azioni complete
 * - Toast = per feedback locale temporaneo
 * 
 * @module components/notifications/NotificationPopup
 */

import React, { useEffect, useState, useCallback } from 'react';
import { X, Bell, ExternalLink, Check, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { useNotifications, Notification } from '@/context/NotificationContext';
import { cn } from '@/design-system/utils';
import { Button } from '@/components/ui/button';

// ============================================
// TYPES
// ============================================

interface NotificationPopupProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  autoDismissDelay?: number;
  maxVisible?: number;
  showProgressBar?: boolean;
  playSound?: boolean;
}

interface PopupItemProps {
  notification: Notification;
  onDismiss: () => void;
  onAction: () => void;
  onMarkAsRead: () => void;
  autoDismissDelay: number;
  showProgressBar: boolean;
}

// ============================================
// POPUP ITEM
// ============================================

const PopupItem: React.FC<PopupItemProps> = ({
  notification,
  onDismiss,
  onAction,
  onMarkAsRead,
  autoDismissDelay,
  showProgressBar
}) => {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-dismiss timer
  useEffect(() => {
    if (isPaused || autoDismissDelay <= 0) return;

    const startTime = Date.now();
    const endTime = startTime + autoDismissDelay;

    const timer = setInterval(() => {
      const now = Date.now();
      const remaining = endTime - now;
      const newProgress = (remaining / autoDismissDelay) * 100;

      if (newProgress <= 0) {
        clearInterval(timer);
        onDismiss();
      } else {
        setProgress(newProgress);
      }
    }, 50);

    return () => clearInterval(timer);
  }, [autoDismissDelay, isPaused, onDismiss]);

  const getTypeStyles = () => {
    switch (notification.type) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
          icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
          progress: 'bg-red-500'
        };
      case 'ERROR':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
          icon: <AlertTriangle className="h-5 w-5 text-red-400" />,
          progress: 'bg-red-400'
        };
      case 'WARNING':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
          icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
          progress: 'bg-yellow-500'
        };
      case 'SUCCESS':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          progress: 'bg-green-500'
        };
      case 'REMINDER':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
          icon: <Bell className="h-5 w-5 text-blue-500" />,
          progress: 'bg-blue-500'
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
          icon: <Info className="h-5 w-5 text-gray-500" />,
          progress: 'bg-gray-500'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div
      className={cn(
        'relative w-80 sm:w-96 rounded-lg border shadow-lg overflow-hidden',
        'transform transition-all duration-300',
        styles.bg
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Progress bar */}
      {showProgressBar && autoDismissDelay > 0 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700">
          <div
            className={cn('h-full transition-all', styles.progress)}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {styles.icon}
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-foreground">
              {notification.title}
            </h4>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {notification.shortBody || notification.body}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              {notification.actionUrl && (
                <Button
                  size="sm"
                  variant="primary"
                  className="h-7 text-xs"
                  onClick={onAction}
                >
                  {notification.actionLabel || 'Apri'}
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={onMarkAsRead}
              >
                <Check className="h-3 w-3 mr-1" />
                Letto
              </Button>
            </div>
          </div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 -mt-1 -mr-1"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Requires confirmation indicator */}
      {notification.requiresConfirmation && (
        <div className="px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs">
          ⚠️ Questa notifica richiede conferma
        </div>
      )}
    </div>
  );
};

// ============================================
// NOTIFICATION POPUP CONTAINER
// ============================================

const NotificationPopup: React.FC<NotificationPopupProps> = ({
  position = 'top-right',
  autoDismissDelay = 5000,
  maxVisible = 3,
  showProgressBar = true,
  playSound = true
}) => {
  const {
    popupQueue,
    removeFromPopupQueue,
    markAsRead,
    dismiss
  } = useNotifications();

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (!playSound) return;

    try {
      // Use Web Audio API for simple notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.1;

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      // Audio not supported or user hasn't interacted
    }
  }, [playSound]);

  // Play sound when new notification arrives
  useEffect(() => {
    if (popupQueue.length > 0) {
      playNotificationSound();
    }
  }, [popupQueue.length, playNotificationSound]);

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      default:
        return 'top-4 right-4';
    }
  };

  const visiblePopups = popupQueue.slice(0, maxVisible);

  const handleDismiss = (notification: Notification) => {
    removeFromPopupQueue(notification.id);
    if (notification.isDismissable) {
      dismiss(notification.id);
    }
  };

  const handleAction = (notification: Notification) => {
    removeFromPopupQueue(notification.id);
    markAsRead(notification.id);
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  const handleMarkAsRead = (notification: Notification) => {
    removeFromPopupQueue(notification.id);
    markAsRead(notification.id);
  };

  if (visiblePopups.length === 0) return null;

  return (
    <div className={cn(
      'fixed z-[100] flex flex-col gap-2',
      getPositionClasses()
    )}>
      {/* Notification popups container */}
      <div className="flex flex-col gap-2">
        {visiblePopups.map((notification) => (
          <PopupItem
            key={notification.id}
            notification={notification}
            onDismiss={() => handleDismiss(notification)}
            onAction={() => handleAction(notification)}
            onMarkAsRead={() => handleMarkAsRead(notification)}
            autoDismissDelay={
              notification.requiresConfirmation ? 0 : // No auto-dismiss for confirmable
                notification.priority === 'CRITICAL_P' ? 0 : // No auto-dismiss for critical
                  autoDismissDelay
            }
            showProgressBar={showProgressBar}
          />
        ))}
      </div>

      {/* More notifications indicator */}
      {popupQueue.length > maxVisible && (
        <div
          className="text-center text-xs text-muted-foreground bg-background/80 backdrop-blur-sm rounded-full px-3 py-1 animate-in fade-in duration-200"
        >
          +{popupQueue.length - maxVisible} altre notifiche
        </div>
      )}
    </div>
  );
};

export default NotificationPopup;
