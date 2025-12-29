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

interface Module {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  port: number;
  color: string;
  bgColor: string;
  hoverBgColor: string;
}

const modules: Module[] = [
  {
    id: 'formazione',
    label: 'ElementSicurezza',
    shortLabel: 'Sicurezza',
    description: 'Sicurezza e Formazione',
    icon: GraduationCap,
    href: '/dashboard',
    port: 5173,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    hoverBgColor: 'hover:bg-blue-50'
  },
  {
    id: 'poliambulatorio',
    label: 'ElementMedica',
    shortLabel: 'Medica',
    description: 'Poliambulatorio',
    icon: Activity,
    href: '/poliambulatorio',
    port: 5174,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
    hoverBgColor: 'hover:bg-teal-50'
  },
  {
    id: 'management',
    label: 'Management',
    shortLabel: 'Management',
    description: 'Amministrazione sistema',
    icon: Settings,
    href: '/management',
    port: 0, // Same domain
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    hoverBgColor: 'hover:bg-purple-50'
  }
];

interface ModuleSwitcherProps {
  currentModule: 'formazione' | 'poliambulatorio' | 'management';
  collapsed?: boolean;
  className?: string;
}

/**
 * Get the correct URL for cross-domain navigation
 */
const getModuleUrl = (module: Module, currentPort: number): string => {
  // If same domain (port 0) or same port, just return the href
  if (module.port === 0 || module.port === currentPort) {
    return module.href;
  }

  // Cross-domain navigation
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:${module.port}${module.href}`;
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

  // Filter out the current module from the list
  const availableModules = modules.filter(m => m.id !== currentModule);

  const handleModuleClick = (module: Module, e: React.MouseEvent) => {
    // For cross-domain navigation, we need to use window.location
    if (module.port !== 0 && module.port !== currentPort) {
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
          const isSameDomain = module.port === 0 || module.port === currentPort;
          const url = getModuleUrl(module, currentPort);

          if (isSameDomain) {
            return (
              <Link
                key={module.id}
                to={module.href}
                className={`flex items-center justify-center p-2 rounded-lg ${module.hoverBgColor} transition-colors`}
                title={module.label}
              >
                <div className={`w-8 h-8 ${module.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`h-4 w-4 ${module.color}`} />
                </div>
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
              <div className={`w-8 h-8 ${module.bgColor} rounded-lg flex items-center justify-center`}>
                <Icon className={`h-4 w-4 ${module.color}`} />
              </div>
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
        const isSameDomain = module.port === 0 || module.port === currentPort;
        const url = getModuleUrl(module, currentPort);

        if (isSameDomain) {
          return (
            <Link
              key={module.id}
              to={module.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 ${module.hoverBgColor} transition-colors group`}
            >
              <div className={`w-6 h-6 ${module.bgColor} rounded flex items-center justify-center`}>
                <Icon className={`h-4 w-4 ${module.color}`} />
              </div>
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
            <div className={`w-6 h-6 ${module.bgColor} rounded flex items-center justify-center`}>
              <Icon className={`h-4 w-4 ${module.color}`} />
            </div>
            <span>{module.shortLabel}</span>
            <ChevronRight className="h-3 w-3 ml-auto text-gray-400 group-hover:translate-x-0.5 transition-transform" />
          </a>
        );
      })}
    </div>
  );
};

export default ModuleSwitcher;
