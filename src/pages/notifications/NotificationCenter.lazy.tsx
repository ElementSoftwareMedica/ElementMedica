/**
 * NotificationCenter.lazy
 * 
 * Lazy-loaded version for code splitting.
 * 
 * PROGETTO 47 - Advanced Notification System - Fase 5
 */

import { lazy } from 'react';

export const NotificationCenterLazy = lazy(() =>
  import('./NotificationCenter').then(module => ({ default: module.NotificationCenter }))
);

export default NotificationCenterLazy;
