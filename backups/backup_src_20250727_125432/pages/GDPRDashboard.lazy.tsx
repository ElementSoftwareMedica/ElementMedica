/**
 * Lazy-loaded GDPR Dashboard Component
 * Implements code splitting for better performance
 */

import { lazy } from 'react';
import { LazyRoute } from '../router/LazyRoute';

const GDPRDashboard = lazy(() => import('./GDPRDashboard'));

const GDPRDashboardLazy = () => (
  <LazyRoute>
    <GDPRDashboard />
  </LazyRoute>
);

export default GDPRDashboardLazy;