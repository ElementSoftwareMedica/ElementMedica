/**
 * Module Switcher Component
 * Cross-domain navigation between different modules (Formazione, Poliambulatorio, Management)
 * 
 * Features:
 * - Navigate between different frontend instances (5173, 5174)
 * - Visual indication of current module
 * - Preserves authentication across domains via shared cookies
 * 
 * @module components/shared/ModuleSwitcher
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  Activity,
  Settings,
  ChevronRight,
  Shield
} from 'lucide-react';
import { useTenantAccess } from '../../hooks/useTenantAccess';
import { useRoleGuard } from '../../hooks/useRoleGuard';

interface Module {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  logoPath?: string; // Round logo image path (overrides icon when set)
  href: string;
  devPort: number;       // Porta per sviluppo locale (0 = stesso dominio)
  prodDomain: string;    // Dominio produzione (vuoto = stesso dominio)
  color: string;
  bgColor: string;
  hoverBgColor: string;
  feature?: string;      // Feature key richiesta per accedere al modulo
}

const modules: Module[] = [
  {
    id: 'formazione',
    label: 'ElementSicurezza',
    shortLabel: 'Sicurezza',
    description: 'Sicurezza e Formazione',
    icon: GraduationCap,
    logoPath: '/assets/logos/element-sicurezza-icon.png',
    href: '/dashboard',
    devPort: 5173,
    prodDomain: 'www.elementsicurezza.com',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    hoverBgColor: 'hover:bg-blue-50',
    feature: 'BRANCH_FORMAZIONE'
  },
  {
    id: 'poliambulatorio',
    label: 'ElementMedica',
    shortLabel: 'Medica',
    description: 'Poliambulatorio',
    icon: Activity,
    logoPath: '/assets/logos/element-medica-icon.png',
    href: '/poliambulatorio',
    devPort: 5174,
    prodDomain: 'www.elementmedica.com',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    hoverBgColor: 'hover:bg-teal-50',
    feature: 'BRANCH_MEDICA'
  },
  {
    id: 'management',
    label: 'Management',
    shortLabel: 'Management',
    description: 'Amministrazione sistema',
    icon: Settings,
    logoPath: '/assets/logos/element-logo-completo.png',
    href: '/management',
    devPort: 0, // Same domain
    prodDomain: '',    // Same domain
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    hoverBgColor: 'hover:bg-purple-50'
  }
];

interface ModuleSwitcherProps {
  currentModule: 'formazione' | 'poliambulatorio' | 'management';
  collapsed?: boolean;
  className?: string;
}

/**
 * Check if running in development (localhost)
 */
const isDev = (): boolean => {
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
};

/**
 * Get the correct URL for cross-domain navigation
 */
const getModuleUrl = (module: Module, currentPort: number): string => {
  if (isDev()) {
    // Dev: port-based navigation
    if (module.devPort === 0 || module.devPort === currentPort) {
      return module.href;
    }
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:${module.devPort}${module.href}`;
  }

  // Produzione: domain-based navigation
  if (!module.prodDomain) {
    return module.href;
  }
  // Se siamo già sul dominio corretto, usa solo href
  if (window.location.hostname === module.prodDomain) {
    return module.href;
  }
  return `https://${module.prodDomain}${module.href}`;
};

/**
 * Check if module is on the same domain/port
 */
const isSameDomainModule = (module: Module, currentPort: number): boolean => {
  if (isDev()) {
    return module.devPort === 0 || module.devPort === currentPort;
  }
  return !module.prodDomain || window.location.hostname === module.prodDomain;
};

/**
 * Get current port from window.location
 */
const getCurrentPort = (): number => {
  return parseInt(window.location.port, 10) || (window.location.protocol === 'https:' ? 443 : 80);
};

/**
 * Module Switcher Component
 * Displays navigation links to switch between different modules
 */
export const ModuleSwitcher: React.FC<ModuleSwitcherProps> = ({
  currentModule,
  collapsed = false,
  className = ''
}) => {
  const location = useLocation();
  const currentPort = getCurrentPort();
  const { hasFeature } = useTenantAccess();
  const { isTrainerOnly, isPazienteOnly, isMedico } = useRoleGuard();

  // Modules not accessible to restricted roles
  const roleRestrictedModules = new Set<string>();
  if (isTrainerOnly) {
    roleRestrictedModules.add('poliambulatorio');
    roleRestrictedModules.add('management');
  }
  if (isPazienteOnly) {
    roleRestrictedModules.add('formazione');
    roleRestrictedModules.add('management');
  }
  if (isMedico) {
    roleRestrictedModules.add('formazione');
    roleRestrictedModules.add('management');
  }

  // Filter out current module, unlocked features, and role-restricted modules
  const availableModules = modules.filter(m =>
    m.id !== currentModule &&
    (!m.feature || hasFeature(m.feature)) &&
    !roleRestrictedModules.has(m.id)
  );

  const handleModuleClick = (module: Module, e: React.MouseEvent) => {
    // For cross-domain navigation, we need to use window.location
    if (!isSameDomainModule(module, currentPort)) {
      e.preventDefault();
      const url = getModuleUrl(module, currentPort);
      window.location.href = url;
    }
    // For same-domain navigation, let the Link handle it
  };

  if (collapsed) {
    return (
      <div className={`space-y-1 ${className}`}>
        {availableModules.map((module) => {
          const Icon = module.icon;
          const sameDomain = isSameDomainModule(module, currentPort);
          const url = getModuleUrl(module, currentPort);
          const logoEl = module.logoPath
            ? <img src={module.logoPath} alt={module.label} className="w-8 h-8 rounded-lg object-contain" />
            : <div className={`w-8 h-8 ${module.bgColor} rounded-lg flex items-center justify-center`}><Icon className={`h-4 w-4 ${module.color}`} /></div>;

          if (sameDomain) {
            return (
              <Link
                key={module.id}
                to={module.href}
                className={`flex items-center justify-center p-2 rounded-lg ${module.hoverBgColor} transition-colors`}
                title={module.label}
              >
                {logoEl}
              </Link>
            );
          }

          return (
            <a
              key={module.id}
              href={url}
              onClick={(e) => handleModuleClick(module, e)}
              className={`flex items-center justify-center p-2 rounded-lg ${module.hoverBgColor} transition-colors`}
              title={module.label}
            >
              {logoEl}
            </a>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {!collapsed && (
        <p className="text-xs text-gray-500 mb-2 px-1">Vai a:</p>
      )}
      {availableModules.map((module) => {
        const Icon = module.icon;
        const sameDomain = isSameDomainModule(module, currentPort);
        const url = getModuleUrl(module, currentPort);
        const logoEl = module.logoPath
          ? <img src={module.logoPath} alt={module.label} className="w-6 h-6 rounded object-contain" />
          : <div className={`w-6 h-6 ${module.bgColor} rounded flex items-center justify-center`}><Icon className={`h-4 w-4 ${module.color}`} /></div>;

        if (sameDomain) {
          return (
            <Link
              key={module.id}
              to={module.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 ${module.hoverBgColor} transition-colors group`}
            >
              {logoEl}
              <span className={`group-hover:${module.color.replace('text-', 'text-')}`}>
                {module.shortLabel}
              </span>
            </Link>
          );
        }

        return (
          <a
            key={module.id}
            href={url}
            onClick={(e) => handleModuleClick(module, e)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 ${module.hoverBgColor} transition-colors group`}
          >
            {logoEl}
            <span>{module.shortLabel}</span>
            <ChevronRight className="h-3 w-3 ml-auto text-gray-400 group-hover:translate-x-0.5 transition-transform" />
          </a>
        );
      })}
    </div>
  );
};

export default ModuleSwitcher;
