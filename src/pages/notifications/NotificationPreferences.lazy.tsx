/**
 * NotificationPreferences.lazy
 * 
 * Lazy-loaded version for code splitting.
 * 
 * PROGETTO 47 - Advanced Notification System - Fase 5
 */

import { lazy } from 'react';

export const NotificationPreferencesLazy = lazy(() =>
  import('./NotificationPreferences').then(module => ({ default: module.NotificationPreferences }))
);

export default NotificationPreferencesLazy;
