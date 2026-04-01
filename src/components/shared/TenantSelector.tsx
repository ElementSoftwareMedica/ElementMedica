/**
 * TenantSelector Component
 * 
 * Dropdown per selezionare e switchare tra tenant accessibili.
 * Mostra il tenant corrente e permette di cambiarlo.
 * 
 * @module components/shared/TenantSelector
 * @project 43 - Tenant Roles Management System
 */

import React, { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Check, Shield, Star, Loader2 } from 'lucide-react';
import { useTenantAccess, AccessibleTenant } from '../../hooks/useTenantAccess';

interface TenantSelectorProps {
  className?: string;
  onTenantChange?: (tenant: AccessibleTenant) => void;
  showFeatures?: boolean;
  compact?: boolean;
}

/**
 * Badge per indicare il tipo di accesso
 */
const AccessBadge: React.FC<{ tenant: AccessibleTenant }> = ({ tenant }) => {
  if (tenant.isAdminAccess) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
        <Shield className="w-3 h-3 mr-0.5" />
        Admin
      </span>
    );
  }

  if (tenant.isPrimary) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
        <Star className="w-3 h-3 mr-0.5" />
        Primario
      </span>
    );
  }

  return null;
};

/**
 * Feature tags per mostrare le funzionalità abilitate
 */
const FeatureTags: React.FC<{ features: string[] }> = ({ features }) => {
  const maxShow = 3;
  const shown = features.slice(0, maxShow);
  const remaining = features.length - maxShow;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {shown.map(feature => (
        <span
          key={feature}
          className="inline-block px-1.5 py-0.5 text-xs rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
        >
          {feature}
        </span>
      ))}
      {remaining > 0 && (
        <span className="inline-block px-1.5 py-0.5 text-xs rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
          +{remaining}
        </span>
      )}
    </div>
  );
};

/**
 * TenantSelector - Componente principale
 */
export const TenantSelector: React.FC<TenantSelectorProps> = ({
  className = '',
  onTenantChange,
  showFeatures = false,
  compact = false,
}) => {
  const {
    accessibleTenants,
    currentTenant,
    switching,
    loading,
    hasMultipleTenants,
    switchTenant,
  } = useTenantAccess();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Chiudi dropdown quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Non mostrare se non ci sono tenant o solo uno (e non è admin)
  if (loading) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 text-sm text-gray-500 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Caricamento...</span>
      </div>
    );
  }

  if (!hasMultipleTenants || !currentTenant) {
    // Mostra tenant singolo senza dropdown
    if (currentTenant) {
      return (
        <div className={`flex items-center gap-2 px-3 py-2 text-sm ${className}`}>
          <Building2 className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-gray-700 dark:text-gray-300">{currentTenant.name}</span>
        </div>
      );
    }
    return null;
  }

  const handleTenantSelect = async (tenant: AccessibleTenant) => {
    if (tenant.id === currentTenant?.id) {
      setIsOpen(false);
      return;
    }

    const success = await switchTenant(tenant.id);
    if (success) {
      setIsOpen(false);
      onTenantChange?.(tenant);
    }
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg
          bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
          hover:bg-gray-50 dark:hover:bg-gray-700
          focus:outline-none focus:ring-2 focus:ring-blue-500
          transition-colors duration-150
          ${switching ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${compact ? 'text-sm' : ''}
        `}
      >
        {switching ? (
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
        ) : (
          <Building2 className="w-4 h-4 text-gray-400" />
        )}
        <span className="font-medium text-gray-700 dark:text-gray-300 max-w-[150px] truncate">
          {currentTenant.name}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-72 rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Seleziona Tenant
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {accessibleTenants.map((tenant) => {
              const isSelected = tenant.id === currentTenant?.id;

              return (
                <button
                  key={tenant.id}
                  onClick={() => handleTenantSelect(tenant)}
                  disabled={switching}
                  className={`
                    w-full px-3 py-2 flex items-start gap-3 text-left
                    hover:bg-gray-50 dark:hover:bg-gray-700
                    ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                    ${switching ? 'opacity-50' : ''}
                    transition-colors duration-150
                  `}
                >
                  <div className="flex-shrink-0 pt-0.5">
                    {isSelected ? (
                      <Check className="w-4 h-4 text-blue-600" />
                    ) : (
                      <div className="w-4 h-4" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium truncate ${isSelected ? 'text-blue-600' : 'text-gray-700 dark:text-gray-300'}`}>
                        {tenant.name}
                      </span>
                      <AccessBadge tenant={tenant} />
                    </div>

                    {tenant.slug && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {tenant.slug}
                      </span>
                    )}

                    {showFeatures && tenant.enabledFeatures.length > 0 && (
                      <FeatureTags features={tenant.enabledFeatures} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {accessibleTenants.length === 0 && (
            <div className="px-3 py-4 text-center text-sm text-gray-500">
              Nessun tenant disponibile
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TenantSelector;
