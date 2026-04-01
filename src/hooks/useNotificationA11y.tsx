/**
 * useNotificationA11y
 * 
 * Hook per accessibilità notifiche.
 * Gestisce:
 * - Screen reader announcements
 * - Keyboard navigation
 * - Focus management
 * - ARIA live regions
 * 
 * PROGETTO 47 - Advanced Notification System - Fase 9: A11Y
 * 
 * @module hooks/useNotificationA11y
 */

import React, { useCallback, useEffect, useRef } from 'react';

// ============================================
// TYPES
// ============================================

interface UseNotificationA11yOptions {
  announceOnNew?: boolean;
  trapFocus?: boolean;
}

interface UseNotificationA11yReturn {
  // Screen reader
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  announceNewNotification: (title: string, priority?: string) => void;
  
  // Keyboard navigation
  handleKeyDown: (
    e: React.KeyboardEvent,
    options: {
      items: { id: string }[];
      activeIndex: number;
      onSelect: (index: number) => void;
      onActivate?: () => void;
      onClose?: () => void;
    }
  ) => void;
  
  // Focus management
  focusTrap: {
    firstFocusableRef: React.RefObject<HTMLElement | null>;
    lastFocusableRef: React.RefObject<HTMLElement | null>;
    onTabKey: (e: React.KeyboardEvent) => void;
  };
  
  // ARIA helpers
  getItemAriaProps: (item: { id: string; isRead?: boolean }, index: number, total: number) => {
    role: string;
    'aria-selected': boolean;
    'aria-posinset': number;
    'aria-setsize': number;
    'aria-describedby'?: string;
    tabIndex: number;
  };
  
  getListAriaProps: () => {
    role: string;
    'aria-label': string;
  };
  
  getLiveRegionProps: (priority?: 'polite' | 'assertive') => {
    'aria-live': 'polite' | 'assertive';
    'aria-atomic': boolean;
    className: string;
  };
}

// ============================================
// SCREEN READER LIVE REGION
// ============================================

let liveRegion: HTMLDivElement | null = null;

const ensureLiveRegion = (): HTMLDivElement => {
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'notification-a11y-live-region';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    document.body.appendChild(liveRegion);
  }
  return liveRegion;
};

// ============================================
// HOOK
// ============================================

export function useNotificationA11y(
  options: UseNotificationA11yOptions = {}
): UseNotificationA11yReturn {
  const { announceOnNew = true, trapFocus = true } = options;
  
  const firstFocusableRef = useRef<HTMLElement | null>(null);
  const lastFocusableRef = useRef<HTMLElement | null>(null);
  const announcementTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Announce message to screen readers
   */
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const region = ensureLiveRegion();
    region.setAttribute('aria-live', priority);
    
    // Clear previous announcement
    region.textContent = '';
    
    // Small delay to ensure announcement is picked up
    announcementTimeoutRef.current = setTimeout(() => {
      region.textContent = message;
    }, 100);
  }, []);

  /**
   * Announce new notification arrival
   */
  const announceNewNotification = useCallback((title: string, priority?: string) => {
    if (!announceOnNew) return;
    
    const priorityText = priority === 'CRITICAL_P' || priority === 'CRITICAL' 
      ? 'Notifica critica: ' 
      : priority === 'URGENT' 
        ? 'Notifica urgente: ' 
        : 'Nuova notifica: ';
    
    announce(priorityText + title, priority === 'CRITICAL_P' || priority === 'CRITICAL' ? 'assertive' : 'polite');
  }, [announce, announceOnNew]);

  /**
   * Handle keyboard navigation in notification list
   */
  const handleKeyDown = useCallback((
    e: React.KeyboardEvent,
    options: {
      items: { id: string }[];
      activeIndex: number;
      onSelect: (index: number) => void;
      onActivate?: () => void;
      onClose?: () => void;
    }
  ) => {
    const { items, activeIndex, onSelect, onActivate, onClose } = options;
    const maxIndex = items.length - 1;

    switch (e.key) {
      case 'ArrowDown':
      case 'j': // Vim-like navigation
        e.preventDefault();
        if (activeIndex < maxIndex) {
          onSelect(activeIndex + 1);
        } else {
          onSelect(0); // Wrap to start
        }
        break;

      case 'ArrowUp':
      case 'k': // Vim-like navigation
        e.preventDefault();
        if (activeIndex > 0) {
          onSelect(activeIndex - 1);
        } else {
          onSelect(maxIndex); // Wrap to end
        }
        break;

      case 'Home':
        e.preventDefault();
        onSelect(0);
        break;

      case 'End':
        e.preventDefault();
        onSelect(maxIndex);
        break;

      case 'Enter':
      case ' ': // Space
        e.preventDefault();
        if (onActivate) {
          onActivate();
        }
        break;

      case 'Escape':
        e.preventDefault();
        if (onClose) {
          onClose();
        }
        break;

      default:
        // Type-ahead search: jump to first item starting with pressed key
        if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
          const searchChar = e.key.toLowerCase();
          const startIndex = (activeIndex + 1) % items.length;
          
          for (let i = 0; i < items.length; i++) {
            const checkIndex = (startIndex + i) % items.length;
            const item = items[checkIndex];
            // This assumes items have a title property for type-ahead
            if ((item as unknown as { title?: string }).title?.toLowerCase().startsWith(searchChar)) {
              onSelect(checkIndex);
              break;
            }
          }
        }
    }
  }, []);

  /**
   * Handle Tab key for focus trap
   */
  const onTabKey = useCallback((e: React.KeyboardEvent) => {
    if (!trapFocus) return;
    
    const firstFocusable = firstFocusableRef.current;
    const lastFocusable = lastFocusableRef.current;
    
    if (!firstFocusable || !lastFocusable) return;

    if (e.shiftKey) {
      // Shift + Tab: if on first element, wrap to last
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      // Tab: if on last element, wrap to first
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  }, [trapFocus]);

  /**
   * Get ARIA props for notification item
   */
  const getItemAriaProps = useCallback((
    item: { id: string; isRead?: boolean }, 
    index: number, 
    total: number
  ) => {
    return {
      role: 'option',
      'aria-selected': !item.isRead,
      'aria-posinset': index + 1,
      'aria-setsize': total,
      'aria-describedby': item.isRead ? undefined : `${item.id}-unread-indicator`,
      tabIndex: index === 0 ? 0 : -1
    };
  }, []);

  /**
   * Get ARIA props for notification list
   */
  const getListAriaProps = useCallback(() => {
    return {
      role: 'listbox',
      'aria-label': 'Elenco notifiche'
    };
  }, []);

  /**
   * Get props for live region
   */
  const getLiveRegionProps = useCallback((priority: 'polite' | 'assertive' = 'polite') => {
    return {
      'aria-live': priority,
      'aria-atomic': true,
      className: 'sr-only'
    };
  }, []);

  return {
    announce,
    announceNewNotification,
    handleKeyDown,
    focusTrap: {
      firstFocusableRef,
      lastFocusableRef,
      onTabKey
    },
    getItemAriaProps,
    getListAriaProps,
    getLiveRegionProps
  };
}

// ============================================
// UTILITY COMPONENTS
// ============================================

/**
 * Screen reader only text
 */
export const SrOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span 
    className="sr-only"
    style={{
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: 0,
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: 0
    }}
  >
    {children}
  </span>
);

/**
 * Live region for screen reader announcements
 */
export const LiveRegion: React.FC<{ 
  children: React.ReactNode; 
  priority?: 'polite' | 'assertive';
}> = ({ children, priority = 'polite' }) => (
  <div
    aria-live={priority}
    aria-atomic="true"
    className="sr-only"
    style={{
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: 0,
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: 0
    }}
  >
    {children}
  </div>
);

export default useNotificationA11y;
