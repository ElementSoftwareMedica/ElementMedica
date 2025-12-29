/**
 * Management Router
 * 
 * Handles routing for all management pages within ManagementLayout
 * This replaces the old tab-based Management page
 * 
 * @project 43 - Tenant Roles Management System
 */

import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Lazy load all management pages
const ManagementDashboard = lazy(() => import('./ManagementDashboard'));
const TenantAccessManager = lazy(() => import('./components/TenantAccessManager'));
const TenantUsersPage = lazy(() => import('./components/TenantUsersPage'));
// Use original UsersManagement with proper layout
const UsersManagement = lazy(() => import('./users/UsersManagement'));
// PersonDetails page for /persons/:id route - using folder index
const PersonDetails = lazy(() => import('./persons'));
const TenantsManagement = lazy(() => import('./tenants/TenantsManagement'));
const RolesManagement = lazy(() => import('./roles/RolesManagement'));
const RoleHierarchyPage = lazy(() => import('./roles/RoleHierarchyPage'));
const RoleDetailPage = lazy(() => import('./roles/RoleDetailPage'));

// CMS & GDPR - Import existing components
const CMSHub = lazy(() => import('../cms/CMSHub'));
const CMSManager = lazy(() => import('../cms/CMSManager'));
const MediaLibrary = lazy(() => import('../cms/MediaLibrary'));
const GDPRDashboard = lazy(() => import('../GDPRDashboard').then(m => ({ default: m.GDPRDashboard })));

// Permission components
const PermissionMatrixPage = lazy(() => import('./permissions/PermissionMatrixPage'));
const AdvancedPermissionsPage = lazy(() => import('./permissions/AdvancedPermissionsPage'));

// System pages - Fully implemented
const SystemLogsPage = lazy(() => import('./system/SystemLogsPage'));
const BackupRestorePage = lazy(() => import('./system/BackupRestorePage'));
const SystemConfigPage = lazy(() => import('./system/SystemConfigPage'));
const SystemReportsPage = lazy(() => import('./system/SystemReportsPage'));
const UserDetailPage = lazy(() => import('./system/UserDetailPage'));
const TenantAccessPage = lazy(() => import('./system/TenantAccessPage'));

// Templates & Discount Codes - from settings (now in management)
const TemplatesPage = lazy(() => import('../settings/Templates'));
const DiscountCodesPage = lazy(() => import('../settings/DiscountCodes'));
const DiscountCodeForm = lazy(() => import('../settings/DiscountCodeForm'));
const DiscountCodeDetail = lazy(() => import('../settings/DiscountCodeDetail'));

// Tariffari Aziende - Medicina del Lavoro
const TariffariAziendePage = lazy(() => import('./tariffari-aziende/TariffariAziendePage'));
const TariffarioAziendaleForm = lazy(() => import('./tariffari-aziende/TariffarioAziendaleForm'));
const CloneTariffarioPage = lazy(() => import('./tariffari-aziende/CloneTariffarioPage'));

// Loading component
const PageLoader = () => (
    <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
    </div>
);

/**
 * ManagementRouter Component
 * Handles all /management/* routes
 */
const ManagementRouter: React.FC = () => {
    return (
        <Suspense fallback={<PageLoader />}>
            <Routes>
                {/* Dashboard */}
                <Route index element={<ManagementDashboard />} />

                {/* Tenant & Access Management */}
                <Route path="my-tenants" element={<TenantAccessManager />} />
                <Route path="tenants" element={<TenantsManagement />} />
                <Route path="tenant-access" element={<TenantAccessPage />} />
                <Route path="tenant-users" element={<TenantUsersPage />} />

                {/* Persons Management */}
                <Route path="persons" element={<UsersManagement />} />
                <Route path="persons/new" element={<UserDetailPage />} />
                <Route path="persons/:id" element={<PersonDetails />} />

                {/* Roles & Permissions */}
                <Route path="roles" element={<RolesManagement />} />
                <Route path="roles/:id" element={<RoleDetailPage />} />
                <Route path="roles/new" element={<RoleDetailPage />} />
                <Route path="role-hierarchy" element={<RoleHierarchyPage />} />
                <Route path="permissions" element={<PermissionMatrixPage />} />
                <Route path="permissions/advanced" element={<AdvancedPermissionsPage />} />
                {/* permission-matrix removed - use /permissions instead */}

                {/* CMS Module - Complete */}
                <Route path="cms" element={<CMSHub />} />
                <Route path="cms/pages" element={<CMSManager />} />
                <Route path="cms/media" element={<MediaLibrary />} />
                <Route path="cms/*" element={<CMSHub />} />

                {/* GDPR - Use existing GDPRDashboard */}
                <Route path="gdpr" element={<GDPRDashboard />} />
                <Route path="gdpr/audit" element={<GDPRDashboard />} />
                <Route path="gdpr/export" element={<GDPRDashboard />} />
                <Route path="gdpr/consent" element={<GDPRDashboard />} />

                {/* System */}
                <Route path="logs" element={<SystemLogsPage />} />
                <Route path="backup" element={<BackupRestorePage />} />
                <Route path="config" element={<SystemConfigPage />} />
                <Route path="reports" element={<SystemReportsPage />} />

                {/* Templates & Discount Codes */}
                <Route path="templates" element={<TemplatesPage />} />
                <Route path="discount-codes" element={<DiscountCodesPage />} />
                {/* Codici Sconto - Italian routing (alias + CRUD) */}
                <Route path="codici-sconto" element={<DiscountCodesPage />} />
                <Route path="codici-sconto/nuovo" element={<DiscountCodeForm />} />
                <Route path="codici-sconto/:id" element={<DiscountCodeDetail />} />
                <Route path="codici-sconto/:id/modifica" element={<DiscountCodeForm />} />

                {/* Tariffari Aziende - Medicina del Lavoro */}
                <Route path="tariffari-aziende" element={<TariffariAziendePage />} />
                <Route path="tariffari-aziende/nuovo" element={<TariffarioAziendaleForm />} />
                <Route path="tariffari-aziende/:id" element={<TariffarioAziendaleForm />} />
                <Route path="tariffari-aziende/:id/clone" element={<CloneTariffarioPage />} />

                {/* Fallback - redirect to dashboard */}
                <Route path="*" element={<Navigate to="/management" replace />} />
            </Routes>
        </Suspense>
    );
};

export default ManagementRouter;
