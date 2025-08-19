import {
  Eye, Edit, Trash2, Globe, Building, Database, Shield, MapPin, Briefcase, ClipboardCheck, BookOpen,
  Plus, User, Users, Settings, FileText
} from 'lucide-react';

// Definizioni delle azioni CRUD
export const PERMISSION_ACTIONS = [
  {
    id: 'read',
    name: 'read',
    displayName: 'Visualizza',
    icon: Eye,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  {
    id: 'create',
    name: 'create',
    displayName: 'Crea',
    icon: Plus,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  {
    id: 'update',
    name: 'update',
    displayName: 'Modifica',
    icon: Edit,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  },
  {
    id: 'delete',
    name: 'delete',
    displayName: 'Elimina',
    icon: Trash2,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  }
] as const;

// Definizioni degli scope
export const PERMISSION_SCOPES = [
  {
    id: 'all',
    name: 'all',
    displayName: 'Tutti',
    description: 'Accesso completo a tutti i record',
    icon: Globe,
    color: 'text-purple-600'
  },
  {
    id: 'tenant',
    name: 'tenant',
    displayName: 'Tenant',
    description: 'Solo record del proprio tenant',
    icon: Building,
    color: 'text-blue-600'
  },
  {
    id: 'own',
    name: 'own',
    displayName: 'Propri',
    description: 'Solo i propri record',
    icon: User,
    color: 'text-green-600'
  }
] as const;

// Mappa delle icone per entità
export const ENTITY_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  persons: Users,
  companies: Building,
  courses: BookOpen,
  roles: Shield,
  hierarchy: Settings,
  sites: MapPin,
  reparti: Briefcase,
  dvr: FileText,
  sopralluoghi: ClipboardCheck,
  default: Database
};

// Funzione per ottenere l'icona dell'entità
export const getEntityIcon = (entityName: string) => {
  return ENTITY_ICON_MAP[entityName] || ENTITY_ICON_MAP.default;
};

// Tipi per TypeScript
export type PermissionAction = typeof PERMISSION_ACTIONS[number];
export type PermissionScope = typeof PERMISSION_SCOPES[number];
export type PermissionActionName = PermissionAction['name'];
export type PermissionScopeName = PermissionScope['name'];