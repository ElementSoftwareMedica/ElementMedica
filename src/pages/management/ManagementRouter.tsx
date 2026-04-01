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
import ProtectedRoute from '../../components/shared/ProtectedRoute';

// Lazy load all management pages
const ManagementDashboard = lazy(() => import('./ManagementDashboard'));
const TenantAccessManager = lazy(() => import('./components/TenantAccessManager'));
// P68: TenantUsersPage RIMOSSO - ora usa redirect a /persons
// Use original UsersManagement with proper layout
const UsersManagement = lazy(() => import('./users/UsersManagement'));
// PersonDetails page for /persons/:id route - using folder index
const PersonDetails = lazy(() => import('./persons'));
const TenantsManagement = lazy(() => import('./tenants/TenantsManagement'));
// P68: RolesManagement RIMOSSO - ora usa RoleHierarchyPage
const RoleHierarchyPage = lazy(() => import('./roles/RoleHierarchyPage'));
const RoleDetailPage = lazy(() => import('./roles/RoleDetailPage'));

// CMS & GDPR - Import existing components
const CMSHub = lazy(() => import('../cms/CMSHub'));
const CMSManager = lazy(() => import('../cms/CMSManager'));
const MediaLibrary = lazy(() => import('../cms/MediaLibrary'));
const GDPRDashboard = lazy(() => import('../GDPRDashboard').then(m => ({ default: m.GDPRDashboard })));

// CMS Form Templates - detail/edit routes (inside Management context)
const FormTemplateView = lazy(() => import('../forms/FormTemplateView'));
const FormTemplateEdit = lazy(() => import('../forms/FormTemplateEdit'));
const FormTemplateCreate = lazy(() => import('../forms/form-template-create'));
const TemplateSubmissionsPage = lazy(() => import('../forms/TemplateSubmissionsPage'));

// Permission components - P69: Consolidated into single tabbed page
const PermissionsPage = lazy(() => import('./permissions/PermissionsPage'));

// System pages - Fully implemented
const SystemLogsPage = lazy(() => import('./system/SystemLogsPage'));
const BackupRestorePage = lazy(() => import('./system/BackupRestorePage'));
const SystemConfigPage = lazy(() => import('./system/SystemConfigPage'));
const SystemReportsPage = lazy(() => import('./system/SystemReportsPage'));
const UserDetailPage = lazy(() => import('./system/UserDetailPage'));
const TenantAccessPage = lazy(() => import('./system/TenantAccessPage'));

// Templates & Discount Codes - from settings (now in management)
const TemplatesPage = lazy(() => import('../settings/Templates'));
const TemplateEditor = lazy(() => import('../settings/TemplateEditor')); // Full editor with orientation, slide mode
const DiscountCodesPage = lazy(() => import('../settings/DiscountCodes'));
const DiscountCodeForm = lazy(() => import('../settings/DiscountCodeForm'));
const DiscountCodeDetail = lazy(() => import('../settings/DiscountCodeDetail'));

// Movimenti Contabili - P59 Sistema unificato movimenti finanziari
const MovimentiContabiliPage = lazy(() => import('./movimenti-contabili/MovimentiContabiliPage'));
const MovimentiContabiliDashboard = lazy(() => import('./movimenti-contabili/MovimentiContabiliDashboard'));
const MovimentoContabileForm = lazy(() => import('./movimenti-contabili/MovimentoContabileForm'));
const MovimentoContabileDetails = lazy(() => import('./movimenti-contabili/MovimentoContabileDetails'));
const AgingReportPage = lazy(() => import('./movimenti-contabili/AgingReportPage'));

// Cross-Tenant Approvals - P58 Feature Completion
const CrossTenantApprovalsPage = lazy(() => import('./cross-tenant/CrossTenantApprovalsPage'));

// Management Config Hub - Hub tabbed con Messaggistica, Widget Pubblici, Preferenze, Config Sistema
const ManagementConfigHub = lazy(() => import('./system/ManagementConfigHub'));

// P75 - Public API Keys & Embed System
const PublicApiSettingsPage = lazy(() => import('./PublicApiSettingsPage'));

// Notifications - Advanced Notification System (Project 47)
const NotificationCenter = lazy(() => import('../notifications/NotificationCenter'));
const NotificationPreferences = lazy(() => import('../notifications/NotificationPreferences'));
const NotificationGroups = lazy(() => import('../notifications/NotificationGroups'));
const EscalationDashboard = lazy(() => import('../notifications/EscalationDashboard'));
const AnalyticsDashboard = lazy(() => import('../notifications/AnalyticsDashboard'));

// P68 - HR Personnel Management
const HRDashboard = lazy(() => import('./hr/HRDashboard'));
const ProfiliHRPage = lazy(() => import('./hr/ProfiliHRPage'));
const ProfiloHRFormPage = lazy(() => import('./hr/ProfiloHRFormPage'));
const MansioniInternePage = lazy(() => import('./hr/MansioniInternePage'));
const MansioneInternaDetailPage = lazy(() => import('./hr/MansioneInternaDetailPage'));
const DisponibilitaPage = lazy(() => import('./hr/DisponibilitaPage'));
const TurniPage = lazy(() => import('./hr/TurniPage'));
const TimbraturaPage = lazy(() => import('./hr/TimbraturaPage'));
const AssenzePage = lazy(() => import('./hr/AssenzePage'));
const CartelliniPage = lazy(() => import('./hr/CartelliniPage'));

// P97 - Fatturazione Elettronica & SistemaTS
const FatturazioneElettronicaPage = lazy(() => import('../finance/billing/FatturazioneElettronicaPage'));
const EntiEmittentiPage = lazy(() => import('../finance/billing/EntiEmittentiPage'));
const SistemaTSPage = lazy(() => import('../finance/billing/SistemaTSPage'));
const BillingIntegrationStatusPage = lazy(() => import('../finance/billing/BillingIntegrationStatusPage'));
const SpeseRicevutePage = lazy(() => import('../finance/billing/SpeseRicevutePage'));

// P74 - Document Management
const DocumentManagementPage = lazy(() => import('./documenti/DocumentManagementPage'));

// User Preferences - Personal settings for Management users
const ManagementPreferencesPage = lazy(() => import('./ManagementPreferencesPage'));

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
                {/* P69: tenant-users e persons ora redirect a HR profili */}
                <Route path="tenant-users" element={<Navigate to="/management/hr/profili" replace />} />

                {/* P69: Persons rimosso dalla sidebar - redirect a HR profili */}
                <Route path="persons" element={<Navigate to="/management/hr/profili" replace />} />
                <Route path="persons/new" element={<Navigate to="/management/hr/profili/nuovo" replace />} />
                <Route path="persons/:id" element={<PersonDetails />} />

                {/* Roles & Permissions - Riorganizzato P68 */}
                {/* /roles ora fa redirect a /role-hierarchy */}
                <Route path="roles" element={<Navigate to="/management/role-hierarchy" replace />} />
                <Route path="roles/:id" element={<RoleDetailPage />} />
                <Route path="roles/new" element={<RoleDetailPage />} />
                {/* Role Hierarchy - Pagina principale per gestione ruoli */}
                <Route path="role-hierarchy" element={<RoleHierarchyPage />} />
                {/* P69: Permissions - Consolidated tabbed page */}
                <Route path="permissions" element={<PermissionsPage />} />
                {/* Legacy routes redirect to consolidated page */}
                <Route path="permissions/advanced" element={<Navigate to="/management/permissions" replace />} />
                <Route path="permissions/matrix" element={<Navigate to="/management/permissions?tab=matrix" replace />} />

                {/* CMS Module - Complete */}
                <Route path="cms" element={<CMSHub />} />
                <Route path="cms/pages" element={<CMSManager />} />
                <Route path="cms/media" element={<MediaLibrary />} />
                {/* CMS Form Templates - specifiche PRIMA del catch-all cms/* */}
                <Route path="cms/forms/templates/create" element={<FormTemplateCreate />} />
                <Route path="cms/forms/templates/:templateId/submissions" element={<TemplateSubmissionsPage />} />
                <Route path="cms/forms/templates/:id/edit" element={<FormTemplateEdit />} />
                <Route path="cms/forms/templates/:id" element={<FormTemplateView />} />
                <Route path="cms/*" element={<CMSHub />} />

                {/* GDPR - Use existing GDPRDashboard */}
                <Route path="gdpr" element={<GDPRDashboard />} />
                <Route path="gdpr/audit" element={<GDPRDashboard />} />
                <Route path="gdpr/export" element={<GDPRDashboard />} />
                <Route path="gdpr/consent" element={<GDPRDashboard />} />

                {/* System */}
                <Route path="logs" element={<SystemLogsPage />} />
                <Route path="backup" element={<BackupRestorePage />} />
                {/* Config Hub - Messaggistica + Widget Pubblici + Preferenze + Config Sistema */}
                <Route path="config" element={<ManagementConfigHub />} />
                <Route path="config/*" element={<ManagementConfigHub />} />
                {/* P75 - API Pubbliche / Embed Widget */}
                <Route path="api-pubbliche" element={<PublicApiSettingsPage />} />
                {/* P74 - Document Management */}
                <Route path="documenti" element={<DocumentManagementPage />} />
                <Route path="documenti/*" element={<DocumentManagementPage />} />
                <Route path="reports" element={<SystemReportsPage />} />

                {/* Templates & Discount Codes */}
                <Route path="templates" element={<TemplatesPage />} />
                <Route path="templates/create" element={<TemplateEditor />} />
                <Route path="templates/:id" element={<TemplateEditor />} />
                <Route path="discount-codes" element={<DiscountCodesPage />} />
                {/* Codici Sconto - Italian routing (alias + CRUD) */}
                <Route path="codici-sconto" element={<DiscountCodesPage />} />
                <Route path="codici-sconto/nuovo" element={<DiscountCodeForm />} />
                <Route path="codici-sconto/:id" element={<DiscountCodeDetail />} />
                <Route path="codici-sconto/:id/modifica" element={<DiscountCodeForm />} />

                {/* Movimenti Contabili - P59 Sistema unificato movimenti finanziari */}
                <Route path="movimenti-contabili" element={<MovimentiContabiliPage />} />
                <Route path="movimenti-contabili/dashboard" element={<MovimentiContabiliDashboard />} />
                <Route path="movimenti-contabili/nuovo" element={<MovimentoContabileForm />} />
                <Route path="movimenti-contabili/aging" element={<AgingReportPage />} />
                <Route path="movimenti-contabili/:id" element={<MovimentoContabileDetails />} />
                <Route path="movimenti-contabili/:id/modifica" element={<MovimentoContabileForm />} />

                {/* Cross-Tenant Approvals - P58 Feature Completion */}
                <Route path="cross-tenant-approvals" element={<CrossTenantApprovalsPage />} />

                {/* P97 - Fatturazione Elettronica & SistemaTS */}
                <Route path="billing" element={<ProtectedRoute requiredFeature="billing"><BillingIntegrationStatusPage /></ProtectedRoute>} />
                <Route path="billing/status" element={<ProtectedRoute requiredFeature="billing"><BillingIntegrationStatusPage /></ProtectedRoute>} />
                <Route path="billing/integrazioni" element={<ProtectedRoute requiredFeature="billing"><BillingIntegrationStatusPage /></ProtectedRoute>} />
                <Route path="billing/fatture" element={<ProtectedRoute requiredFeature="billing"><FatturazioneElettronicaPage /></ProtectedRoute>} />
                <Route path="billing/enti-emittenti" element={<ProtectedRoute requiredFeature="billing"><EntiEmittentiPage /></ProtectedRoute>} />
                <Route path="billing/sistema-ts" element={<ProtectedRoute requiredFeature="billing"><SistemaTSPage /></ProtectedRoute>} />
                <Route path="billing/spese" element={<ProtectedRoute requiredFeature="billing"><SpeseRicevutePage /></ProtectedRoute>} />

                {/* Messaging Configuration - redirect al Config Hub */}
                <Route path="messaging" element={<Navigate to="/management/config#messaging" replace />} />

                {/* Notifications - Advanced Notification System (Project 47) */}
                <Route path="notifiche" element={<NotificationCenter />} />
                <Route path="notifiche/preferenze" element={<NotificationPreferences />} />
                <Route path="notifiche/gruppi" element={<NotificationGroups />} />
                <Route path="notifiche/escalation" element={<EscalationDashboard />} />
                <Route path="notifiche/analytics" element={<AnalyticsDashboard />} />

                {/* P68 - HR Personnel Management */}
                <Route path="hr" element={<HRDashboard />} />
                <Route path="hr/profili" element={<ProfiliHRPage />} />
                <Route path="hr/profili/nuovo" element={<ProfiloHRFormPage />} />
                <Route path="hr/profili/:id" element={<ProfiloHRFormPage />} />
                <Route path="hr/mansioni" element={<MansioniInternePage />} />
                <Route path="hr/mansioni/:id" element={<MansioneInternaDetailPage />} />
                <Route path="hr/disponibilita" element={<DisponibilitaPage />} />
                <Route path="hr/turni" element={<TurniPage />} />
                <Route path="hr/timbrature" element={<TimbraturaPage />} />
                <Route path="hr/assenze" element={<AssenzePage />} />
                <Route path="hr/cartellini" element={<CartelliniPage />} />

                {/* Personal Preferences - redirect al Config Hub */}
                <Route path="preferenze" element={<Navigate to="/management/config#preferenze" replace />} />

                {/* Fallback - redirect to dashboard */}
                <Route path="*" element={<Navigate to="/management" replace />} />
            </Routes>
        </Suspense>
    );
};

export default ManagementRouter;
