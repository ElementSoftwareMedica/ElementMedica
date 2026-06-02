/**
 * Management Module Index
 * @project 43 - Tenant Roles Management System
 */

// Main page - Uses ManagementRouter for all routes
export { ManagementLazy } from './Management.lazy';

// Components
export { default as TenantAccessManager } from './components/TenantAccessManager';

// API
export { managementApi } from './api';

// Types
export * from './types';
