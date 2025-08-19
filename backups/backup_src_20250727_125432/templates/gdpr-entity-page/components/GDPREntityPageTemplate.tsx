/**
 * GDPR Entity Page Template - Componente principale
 * 
 * Template di pagina GDPR-compliant che replica la struttura
 * della pagina Courses con componenti riutilizzabili.
 * 
 * @version 1.0
 * @date 30 Dicembre 2024
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { BaseEntity } from '../types/entity.types';
import { GDPREntityPageConfig, GDPREntityPageContext as GDPREntityPageContextType } from '../types/template.types';
import { useGDPREntityPage } from '../hooks/useGDPREntityPage';
import { useGDPRConsent } from '../hooks/useGDPRConsent';
import { useGDPRAudit } from '../hooks/useGDPRAudit';
import { useAuth } from '../../../context/AuthContext';

// Context per condividere stato del template
export const GDPREntityPageContextProvider = React.createContext<GDPREntityPageContextType | null>(null);

// Import componenti esistenti (da adattare ai path reali)
import EntityListLayout from '../../../components/layouts/EntityListLayout';
import { SearchBar, FilterPanel, Button, Card } from '../../../design-system';
import DataTable, { DataTableColumn } from '../../../components/shared/tables/DataTable';
// Note: Badge, Separator, Alert components need to be replaced with simple HTML or alternative components

// Import componenti GDPR specifici
import { GDPREntityHeader } from './GDPREntityHeader';
import { GDPRConsentModal } from './GDPRConsentModal';
import { GDPRAuditPanel } from './GDPRAuditPanel';
import { GDPRComplianceIndicator } from './GDPRComplianceIndicator';
import { GDPRDataExportModal } from './GDPRDataExportModal';
import { GDPRDeletionRequestModal } from './GDPRDeletionRequestModal';

/**
 * Props del template principale
 */
export interface GDPREntityPageTemplateProps<T extends BaseEntity = BaseEntity> {
  /** Configurazione del template */
  config: GDPREntityPageConfig<T>;
  
  /** Dati iniziali (opzionale) */
  initialData?: T[];
  
  /** Callback personalizzate */
  onEntityCreate?: (entity: Omit<T, 'id'>) => Promise<T>;
  onEntityUpdate?: (id: string, entity: Partial<T>) => Promise<T>;
  onEntityDelete?: (id: string) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
  onDataExport?: (format: string, filters?: any) => Promise<Blob>;
  onDataImport?: (file: File) => Promise<void>;
  
  /** Componenti personalizzati */
  customComponents?: {
    header?: React.ComponentType<any>;
    toolbar?: React.ComponentType<any>;
    table?: React.ComponentType<any>;
    sidebar?: React.ComponentType<any>;
  };
  
  /** Classi CSS personalizzate */
  className?: string;
  
  /** Stili inline personalizzati */
  style?: React.CSSProperties;
}

/**
 * Template principale per pagine entità GDPR-compliant
 */
export function GDPREntityPageTemplate<T extends BaseEntity = BaseEntity>({
  config,
  initialData,
  onEntityCreate,
  onEntityUpdate,
  onEntityDelete,
  onBulkDelete,
  onDataExport,
  onDataImport,
  customComponents,
  className,
  style
}: GDPREntityPageTemplateProps<T>) {
  // Hook per autenticazione e autorizzazione con gestione sicura
  let authData;
  let hasPermissionFunc;
  
  try {
    authData = useAuth();
    hasPermissionFunc = authData.hasPermission;
  } catch (error) {
    console.warn('⚠️ GDPREntityPageTemplate: AuthContext not yet initialized:', error.message);
    return (
      <div className="h-64 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  const { isAuthenticated, isLoading: authLoading, user } = authData;
  
  // Verifica autorizzazione
  if (authLoading) {
    return (
      <div className="h-64 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Verifica permessi specifici per la risorsa
  const resourceName = config.entity.name.toLowerCase();
  
  // Debug logging per troubleshooting
  console.log('🔍 GDPREntityPageTemplate - Debug permessi:', {
    resourceName,
    entityName: config.entity.name,
    user: user ? { id: user.id, email: user.email, roles: user.roles } : null,
    isAuthenticated,
    authLoading
  });
  
  const hasReadPermission = hasPermissionFunc(resourceName, 'read');
  console.log('🔍 hasPermission result:', {
    resource: resourceName,
    action: 'read',
    result: hasReadPermission
  });
  
  if (!hasReadPermission) {
    console.log('❌ Accesso negato per:', resourceName);
    return (
      <div className="h-64 flex flex-col justify-center items-center text-center px-4">
        <h1 className="text-2xl font-bold mb-4">Accesso negato</h1>
        <p className="text-gray-600 mb-6">
          Non hai i permessi necessari per accedere a questa sezione.
        </p>
        <p className="text-sm text-gray-500">
          Risorsa richiesta: {resourceName} (lettura)
        </p>
        <div className="mt-4 text-xs text-gray-400">
          <p>Debug info:</p>
          <p>User: {user?.email || 'N/A'}</p>
          <p>Roles: {user?.roles?.join(', ') || 'N/A'}</p>
          <p>Resource: {resourceName}</p>
        </div>
      </div>
    );
  }
  
  console.log('✅ Accesso consentito per:', resourceName);
  
  // Hooks principali
  const {
    state,
    actions,
    loading,
    error
  } = useGDPREntityPage<T>({
    config,
    initialData,
    onEntityCreate,
    onEntityUpdate,
    onEntityDelete,
    onBulkDelete
  });
  
  const {
    consents,
    requestConsent,
    revokeConsent,
    checkConsent
  } = useGDPRConsent({
    config: config.gdpr.consentConfig,
    personId: user?.id || 'anonymous'
  });
  
  const {
    auditLog,
    logAction,
    getAuditHistory
  } = useGDPRAudit({
    config: config.gdpr.auditConfig,
    entityType: config.entity.name
  });
  
  // Stati locali
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [selectedEntities, setSelectedEntities] = useState<T[]>([]);
  const [showGDPRConsent, setShowGDPRConsent] = useState(false);
  const [showAuditPanel, setShowAuditPanel] = useState(false);
  const [showDataExport, setShowDataExport] = useState(false);
  const [showDeletionRequest, setShowDeletionRequest] = useState(false);
  
  // Verifica consensi GDPR all'avvio
  useEffect(() => {
    if (config.gdpr.requiresConsent) {
      checkRequiredConsents();
    }
  }, [config.gdpr.requiresConsent]);
  
  // Funzione per verificare consensi richiesti
  const checkRequiredConsents = useCallback(async () => {
    if (!config.gdpr.consentConfig) return;
    
    const verification = await checkConsent(config.gdpr.consentConfig.requiredConsents);
    
    if (!verification.hasConsent && verification.missingConsents.length > 0) {
      setShowGDPRConsent(true);
    }
  }, [config.gdpr.consentConfig, checkConsent]);
  
  // Dati filtrati e ordinati
  const filteredEntities = useMemo(() => {
    let filtered = state.entities;
    
    // Applica ricerca
    if (searchQuery) {
      filtered = filtered.filter(entity => {
        return config.entity.columns.some(column => {
          const value = entity[column.key as keyof T];
          return value?.toString().toLowerCase().includes(searchQuery.toLowerCase());
        });
      });
    }
    
    // Applica filtri
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        filtered = filtered.filter(entity => {
          const entityValue = entity[key as keyof T];
          return entityValue === value;
        });
      }
    });
    
    return filtered;
  }, [state.entities, searchQuery, activeFilters, config.entity.columns]);
  
  // Handlers per azioni entità
  const handleEntityCreate = useCallback(async (entityData: Omit<T, 'id'>) => {
    await logAction('CREATE', undefined, entityData);
    await actions.createEntity(entityData);
  }, [actions, logAction]);
  
  const handleEntityUpdate = useCallback(async (id: string, entityData: Partial<T>) => {
    await logAction('UPDATE', id, entityData);
    await actions.updateEntity(id, entityData);
  }, [actions, logAction]);
  
  const handleEntityDelete = useCallback(async (id: string) => {
    await logAction('DELETE', id);
    await actions.deleteEntity(id);
  }, [actions, logAction]);
  
  const handleBulkDelete = useCallback(async (ids: string[]) => {
    await logAction('BULK_DELETE', undefined, { ids });
    await actions.bulkDelete(ids);
    setSelectedEntities([]);
  }, [actions, logAction]);
  
  // Handler per export dati
  const handleDataExport = useCallback(async (format: string) => {
    await logAction('EXPORT', undefined, { format, filters: activeFilters });
    
    if (onDataExport) {
      const blob = await onDataExport(format, activeFilters);
      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${config.entity.namePlural}-export.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    
    setShowDataExport(false);
  }, [onDataExport, activeFilters, config.entity.namePlural, logAction]);
  
  // Configurazione colonne tabella con GDPR
  const tableColumns = useMemo(() => {
    return config.entity.columns.map(column => ({
      ...column,
      // Applica mascheramento per campi sensibili se necessario
      render: (value: any, entity: T) => {
        if (config.gdpr.sensitiveFields.includes(column.key)) {
          // Verifica permessi per visualizzare dati sensibili
          const userRole = user?.role || 'EMPLOYEE';
          const canViewSensitive = config.gdpr.dataMinimizationConfig?.sensitiveDataRoles.includes(userRole);
          
          if (!canViewSensitive) {
            const maskingConfig = config.gdpr.dataMinimizationConfig?.fieldMaskingConfig[column.key];
            if (maskingConfig) {
              return maskValue(value, maskingConfig);
            }
            return '***';
          }
        }
        
        return column.render ? column.render(value, entity) : value;
      }
    }));
  }, [config.entity.columns, config.gdpr.sensitiveFields, config.gdpr.dataMinimizationConfig, user]);
  
  // Funzione per mascherare valori
  const maskValue = (value: any, maskingConfig: any) => {
    if (!value) return value;
    
    const str = value.toString();
    const { pattern, showFirst = 0, showLast = 0, replacement = '*' } = maskingConfig;
    
    if (pattern) {
      return str.replace(new RegExp(pattern, 'g'), replacement);
    }
    
    if (showFirst || showLast) {
      const start = str.substring(0, showFirst);
      const end = str.substring(str.length - showLast);
      const middle = replacement.repeat(Math.max(0, str.length - showFirst - showLast));
      return start + middle + end;
    }
    
    return replacement.repeat(str.length);
  };
  
  // Render del template
  return (
    <GDPREntityPageContextProvider.Provider value={{
      config,
      state,
      actions,
      gdpr: {
        consents,
        auditLog,
        dataRetention: {
          daysRemaining: config.gdpr.dataRetentionDays,
          nextCleanup: new Date(Date.now() + config.gdpr.dataRetentionDays * 24 * 60 * 60 * 1000)
        },
        compliance: {
          score: 85, // Da calcolare dinamicamente
          issues: [],
          recommendations: []
        }
      }
    }}>
      <div className={`gdpr-entity-page ${className || ''}`} style={style}>
        {/* Alert errori */}
        {error && (
          <div className="mb-4 p-4 border border-red-300 bg-red-50 rounded-md">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}
        
        {/* Header della pagina */}
        {customComponents?.header ? (
          <customComponents.header
            config={config}
            entityCount={filteredEntities.length}
            selectedCount={selectedEntities.length}
          />
        ) : (
          <GDPREntityHeader
            title={config.ui.header.title}
            subtitle={config.ui.header.subtitle}
            entityCount={filteredEntities.length}
            selectedCount={selectedEntities.length}
            showGDPRIndicators={config.ui.header.showGDPRIndicators}
            breadcrumb={config.ui.header.breadcrumb}
            customActions={config.ui.header.customActions}
            onAuditClick={() => setShowAuditPanel(true)}
            onExportClick={() => setShowDataExport(true)}
            onConsentClick={() => setShowGDPRConsent(true)}
          />
        )}
        
        <hr className="my-4 border-gray-200" />
        
        {/* Layout principale */}
        <EntityListLayout
          sidebar={config.ui.layout.showSidebar ? (
            customComponents?.sidebar ? (
              <customComponents.sidebar config={config} />
            ) : (
              <Card className="p-4">
                <GDPRComplianceIndicator
                  score={85}
                  issues={[]}
                  recommendations={[]}
                />
                
                {config.ui.header.showGDPRIndicators && (
                  <div className="mt-4 space-y-2">
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded border border-green-200">GDPR Compliant</span>
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded border border-gray-200">Audit Enabled</span>
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded border border-blue-200">Consent Managed</span>
                  </div>
                )}
              </Card>
            )
          ) : undefined}
          sidebarWidth={config.ui.layout.sidebar?.width}
          sidebarCollapsed={state.ui.sidebarCollapsed}
          onSidebarToggle={() => actions.toggleSidebar?.()}
        >
          {/* Toolbar */}
          {customComponents?.toolbar ? (
            <customComponents.toolbar
              config={config}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filters={activeFilters}
              onFiltersChange={setActiveFilters}
              selectedEntities={selectedEntities}
              onBulkDelete={() => handleBulkDelete(selectedEntities.map(e => e.id))}
            />
          ) : (
            <div className="flex flex-col gap-4 mb-6">
              {/* Barra di ricerca e azioni principali */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex-1 max-w-md">
                  {config.ui.toolbar.showSearch && (
                    <SearchBar
                      value={searchQuery}
                      onChange={setSearchQuery}
                      placeholder={config.ui.toolbar.searchPlaceholder || `Cerca ${config.entity.namePlural.toLowerCase()}...`}
                    />
                  )}
                </div>
                
                <div className="flex gap-2">
                  {/* Pulsante Crea */}
                  <Button
                    onClick={() => actions.openModal('create')}
                    disabled={loading}
                  >
                    Crea {config.entity.name}
                  </Button>
                  
                  {/* Azioni personalizzate toolbar */}
                  {config.ui.toolbar.customActions?.map(action => (
                    <Button
                      key={action.id}
                      variant={action.variant || 'outline'}
                      onClick={action.onClick}
                      disabled={action.disabled || loading}
                      title={action.tooltip}
                    >
                      {action.icon && <span className="mr-2">{action.icon}</span>}
                      {action.label}
                    </Button>
                  ))}
                  
                  {/* Azioni bulk se ci sono selezioni */}
                  {selectedEntities.length > 0 && (
                    <>
                      <Button
                        variant="destructive"
                        onClick={() => handleBulkDelete(selectedEntities.map(e => e.id))}
                        disabled={loading}
                      >
                        Elimina Selezionati ({selectedEntities.length})
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => setShowDeletionRequest(true)}
                        disabled={loading}
                      >
                        Richiesta Cancellazione GDPR
                      </Button>
                    </>
                  )}
                </div>
              </div>
              
              {/* Pannello filtri */}
              {config.ui.toolbar.showFilters && config.entity.filters.length > 0 && (
                <FilterPanel
                  filters={config.entity.filters}
                  values={activeFilters}
                  onChange={setActiveFilters}
                />
              )}
            </div>
          )}
          
          {/* Tabella dati */}
          {customComponents?.table ? (
            <customComponents.table
              config={config}
              data={filteredEntities}
              columns={tableColumns}
              loading={loading}
              selectedEntities={selectedEntities}
              onSelectionChange={setSelectedEntities}
              onEntityEdit={(entity) => actions.openModal('edit', entity)}
              onEntityDelete={handleEntityDelete}
            />
          ) : (
            <DataTable
              data={filteredEntities}
              columns={tableColumns}
              loading={loading}
              pagination={{
                page: state.pagination.page,
                pageSize: state.pagination.pageSize,
                total: state.pagination.total,
                onPageChange: actions.setPage,
                onPageSizeChange: actions.setPageSize
              }}
              sorting={{
                field: state.sorting?.field,
                direction: state.sorting?.direction,
                onSortChange: actions.setSorting
              }}
              selection={{
                selectedItems: selectedEntities,
                onSelectionChange: setSelectedEntities,
                showCheckboxes: config.ui.table.showSelectionCheckboxes
              }}
              density={state.ui.density}
              onDensityChange={actions.setDensity}
              enableColumnResizing={config.ui.table.enableColumnResizing}
              enableColumnReordering={config.ui.table.enableColumnReordering}
              showRowNumbers={config.ui.table.showRowNumbers}
              virtualization={config.ui.table.virtualization}
            />
          )}
        </EntityListLayout>
        
        {/* Modali GDPR */}
        <GDPRConsentModal
          open={showGDPRConsent}
          onClose={() => setShowGDPRConsent(false)}
          config={config.gdpr.consentConfig}
          currentConsents={consents}
          onConsentChange={requestConsent}
          onConsentRevoke={revokeConsent}
        />
        
        {showAuditPanel && (
          <GDPRAuditPanel
            entityId="current-entity"
            entityType={config.entity.name}
            auditLogs={auditLog}
            onExport={() => handleDataExport('audit-log')}
            loading={loading}
          />
        )}
        
        <GDPRDataExportModal
          open={showDataExport}
          onClose={() => setShowDataExport(false)}
          config={config.gdpr.dataPortabilityConfig}
          onExport={handleDataExport}
          entityType={config.entity.name}
        />
        
        <GDPRDeletionRequestModal
          open={showDeletionRequest}
          onClose={() => setShowDeletionRequest(false)}
          selectedEntities={selectedEntities}
          config={config.gdpr.rightToBeForgottenConfig}
          onSubmitRequest={(reason) => {
            // Implementa logica richiesta cancellazione
            console.log('Richiesta cancellazione GDPR:', { entities: selectedEntities, reason });
            setShowDeletionRequest(false);
          }}
        />
      </div>
    </GDPREntityPageContextProvider.Provider>
  );
}

// Hook per utilizzare il context
export const useGDPREntityPageContext = () => {
  const context = React.useContext(GDPREntityPageContextProvider);
  if (!context) {
    throw new Error('useGDPREntityPageContext must be used within GDPREntityPageTemplate');
  }
  return context;
};

export default GDPREntityPageTemplate;