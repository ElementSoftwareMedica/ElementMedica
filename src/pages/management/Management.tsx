/**
 * Management Page
 * 
 * Dashboard di gestione cross-funzionale per amministratori
 * Include gestione tenant, ruoli, utenti e impostazioni di sistema
 * 
 * @project 43 - Tenant Roles Management System
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useLocation, useNavigate, useParams, Routes, Route } from 'react-router-dom';
import {
  Settings2,
  Building2,
  Users,
  Shield,
  FileText,
  Activity,
  Database,
  Globe,
  Tag,
  MessageCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { TabNavigation } from '../../components/shared';
import TenantAccessManager from './components/TenantAccessManager';
import UsersWithTenantAccess from './components/UsersWithTenantAccess';
import type { Tenant } from './types';

// Lazy import for DiscountCodes
const DiscountCodesLazy = lazy(() => import('../settings/DiscountCodes'));
const DiscountCodeFormLazy = lazy(() => import('../settings/DiscountCodeForm'));
const DiscountCodeDetailLazy = lazy(() => import('../settings/DiscountCodeDetail'));

// Lazy import for Messaging
const MessagingConfigPageLazy = lazy(() => import('../settings/MessagingConfigPage'));

// Lazy import for Public Brand Settings
const PublicBrandSettingsPageLazy = lazy(() => import('./PublicBrandSettingsPage'));

/**
 * Definizione dei tab disponibili
 */
const MANAGEMENT_TABS = [
  {
    id: 'my-tenants',
    label: 'I Miei Tenant',
    icon: <Building2 className="h-4 w-4" />,
    description: 'Gestisci i tenant a cui hai accesso'
  },
  {
    id: 'tenant-users',
    label: 'Utenti Tenant',
    icon: <Users className="h-4 w-4" />,
    permission: 'USER_MANAGEMENT',
    description: 'Gestisci gli utenti di un tenant specifico'
  },
  {
    id: 'users',
    label: 'Gestione Utenti',
    icon: <Users className="h-4 w-4" />,
    permission: 'USER_MANAGEMENT',
    description: 'Gestisci tutti gli utenti del sistema'
  },
  {
    id: 'roles',
    label: 'Ruoli & Permessi',
    icon: <Shield className="h-4 w-4" />,
    permission: 'ROLE_MANAGEMENT',
    description: 'Configura ruoli e permessi'
  },
  {
    id: 'cms',
    label: 'CMS',
    icon: <Globe className="h-4 w-4" />,
    permission: 'CMS',
    description: 'Gestisci contenuti pubblici'
  },
  {
    id: 'gdpr',
    label: 'GDPR',
    icon: <FileText className="h-4 w-4" />,
    permission: 'GDPR',
    description: 'Privacy e conformità GDPR'
  },
  {
    id: 'logs',
    label: 'Activity Logs',
    icon: <Activity className="h-4 w-4" />,
    permission: 'logs',
    description: 'Visualizza log di sistema'
  },
  {
    id: 'backup',
    label: 'Backup',
    icon: <Database className="h-4 w-4" />,
    permission: 'settings',
    adminOnly: true,
    description: 'Backup e ripristino dati'
  },
  {
    id: 'codici-sconto',
    label: 'Codici Sconto',
    icon: <Tag className="h-4 w-4" />,
    permission: 'roles', // Uses roles:read permission check
    description: 'Gestisci codici promozionali e sconti'
  },
  {
    id: 'messaging',
    label: 'Messaggistica',
    icon: <MessageCircle className="h-4 w-4" />,
    permission: 'settings',
    description: 'Configura email SMTP, WhatsApp e PEC per invio comunicazioni'
  },
  {
    id: 'public-brand',
    label: 'Widget Pubblici',
    icon: <Globe className="h-4 w-4" />,
    permission: 'settings',
    adminOnly: true,
    description: 'Configura il tenant per i widget del frontend pubblico (medici, corsi, disponibilità)'
  },
];

const Management: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();

  // Stato per tenant selezionato (per tab "tenant-users")
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  // Verifica admin - controllo più robusto per debug
  const isAdmin = user?.role === 'Admin' ||
    user?.role === 'Administrator' ||
    (Array.isArray(user?.roles) && (user.roles.includes('ADMIN') || user.roles.includes('SUPER_ADMIN')));

  // Determina tab attivo dalla URL
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/users')) return 'users';
    if (path.includes('/roles')) return 'roles';
    if (path.includes('/cms')) return 'cms';
    if (path.includes('/gdpr')) return 'gdpr';
    if (path.includes('/logs')) return 'logs';
    if (path.includes('/backup')) return 'backup';
    if (path.includes('/tenant-users')) return 'tenant-users';
    if (path.includes('/codici-sconto')) return 'codici-sconto';
    if (path.includes('/messaging')) return 'messaging';
    if (path.includes('/public-brand')) return 'public-brand';
    return 'my-tenants';
  };

  // Check if we're on a sub-route (detail, nuovo, modifica)
  const isSubRoute = () => {
    const path = location.pathname;
    return path.includes('/nuovo') ||
      path.includes('/modifica') ||
      /\/codici-sconto\/[^/]+$/.test(path);
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());

  // Aggiorna tab quando cambia URL
  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location.pathname]);

  // Redirect a my-tenants se path è solo /management
  useEffect(() => {
    if (location.pathname === '/management' || location.pathname === '/management/') {
      navigate('/management/my-tenants', { replace: true });
    }
  }, [location.pathname, navigate]);

  // Cambia tab
  const changeTab = (tabId: string) => {
    setActiveTab(tabId);
    navigate(`/management/${tabId}`);
  };

  // Filtra tab in base ai permessi
  const availableTabs = MANAGEMENT_TABS.filter(tab => {
    // Tab sempre visibili (senza permesso specifico)
    if (!tab.permission && !tab.adminOnly) return true;

    // Tab solo admin
    if (tab.adminOnly && !isAdmin) return false;

    // Tab con permesso specifico
    if (tab.permission) {
      const hasPerms = hasPermission(tab.permission, 'read') || isAdmin;
      return hasPerms;
    }

    return true;
  });

  // Quando un tenant viene selezionato, vai alla vista utenti di quel tenant
  const handleTenantSelect = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setActiveTab('tenant-users');
    navigate('/management/tenant-users');
  };

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'my-tenants':
        return <TenantAccessManager onTenantSelect={handleTenantSelect} />;

      case 'tenant-users':
        return selectedTenant ? (
          <UsersWithTenantAccess
            tenantId={selectedTenant.id}
            tenantName={selectedTenant.name}
          />
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Seleziona un tenant</h3>
            <p className="mt-1 text-sm text-gray-500">
              Vai alla tab "I Miei Tenant" e seleziona un tenant per vedere gli utenti
            </p>
            <button
              onClick={() => changeTab('my-tenants')}
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Vai ai Tenant
            </button>
          </div>
        );

      case 'users':
        // TODO: Migrare UsersTab da settings
        return (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Gestione Utenti</h3>
            <p className="mt-1 text-sm text-gray-500">
              Questa funzionalità sarà disponibile a breve.
              Per ora, usa Impostazioni → Utenti
            </p>
          </div>
        );

      case 'roles':
        // TODO: Migrare RolesTab da settings
        return (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Ruoli & Permessi</h3>
            <p className="mt-1 text-sm text-gray-500">
              Questa funzionalità sarà disponibile a breve.
              Per ora, usa Impostazioni → Ruoli
            </p>
          </div>
        );

      case 'cms':
        return (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Globe className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">CMS</h3>
            <p className="mt-1 text-sm text-gray-500">
              Gestione contenuti pubblici in arrivo
            </p>
          </div>
        );

      case 'gdpr':
        return (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">GDPR Dashboard</h3>
            <p className="mt-1 text-sm text-gray-500">
              Privacy e conformità in arrivo
            </p>
          </div>
        );

      case 'logs':
        // TODO: Integrare ActivityLogsTab
        return (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Activity className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Log Attività</h3>
            <p className="mt-1 text-sm text-gray-500">
              Visualizzazione log in arrivo
            </p>
          </div>
        );

      case 'backup':
        // TODO: Integrare BackupRestoreTab
        return (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Database className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Backup e Ripristino</h3>
            <p className="mt-1 text-sm text-gray-500">
              Backup e ripristino in arrivo
            </p>
          </div>
        );

      case 'codici-sconto':
        // Check for sub-routes
        const codiciPath = location.pathname;
        const Fallback = (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        );

        if (codiciPath.includes('/nuovo')) {
          return (
            <Suspense fallback={Fallback}>
              <DiscountCodeFormLazy />
            </Suspense>
          );
        }

        if (codiciPath.includes('/modifica')) {
          return (
            <Suspense fallback={Fallback}>
              <DiscountCodeFormLazy />
            </Suspense>
          );
        }

        // Check for detail view: /codici-sconto/:id (but not /codici-sconto)
        const detailMatch = codiciPath.match(/\/codici-sconto\/([a-f0-9-]+)$/i);
        if (detailMatch) {
          return (
            <Suspense fallback={Fallback}>
              <DiscountCodeDetailLazy />
            </Suspense>
          );
        }

        // Default: list view
        return (
          <Suspense fallback={Fallback}>
            <DiscountCodesLazy />
          </Suspense>
        );

      case 'messaging':
        return (
          <Suspense fallback={
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          }>
            <MessagingConfigPageLazy />
          </Suspense>
        );

      case 'public-brand':
        return (
          <Suspense fallback={
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
            </div>
          }>
            <PublicBrandSettingsPageLazy />
          </Suspense>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container px-4 mx-auto py-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center text-gray-900">
          <Settings2 className="mr-3 h-7 w-7 text-blue-600" />
          Management
        </h1>
        <p className="text-gray-500 mt-1">
          Gestione centralizzata di tenant, utenti, ruoli e sistema
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 p-4">
          <TabNavigation
            tabs={availableTabs.map(tab => ({
              id: tab.id,
              label: tab.label,
              icon: tab.icon,
            }))}
            activeTabId={activeTab}
            onTabChange={changeTab}
          />
        </div>

        {/* Tab Description */}
        {activeTab && (
          <div className="px-6 pt-4 pb-2 border-b border-gray-100 bg-gray-50">
            <p className="text-sm text-gray-600">
              {MANAGEMENT_TABS.find(t => t.id === activeTab)?.description}
            </p>
          </div>
        )}

        {/* Tab Content */}
        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Management;
