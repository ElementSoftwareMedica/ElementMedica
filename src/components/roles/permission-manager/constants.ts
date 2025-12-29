import {
  Eye, Edit, Trash2, Globe, Building, Database, Shield, MapPin, Briefcase, ClipboardCheck, BookOpen,
  Plus, User, Users, Settings, FileText, Link2, GraduationCap, UserCog, AlertTriangle, FileCheck,
  Wrench, Bell, BarChart3, Lock, Key, Calendar, Receipt, CreditCard, Percent, Layout, Image, Navigation,
  Search, FileType, ClipboardList, RefreshCw, FolderArchive, Plug, GitBranch, ShieldCheck
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
    id: 'none',
    name: 'none',
    displayName: 'Nessuno',
    description: 'Accesso disabilitato: l\'utente non può eseguire questa azione',
    icon: Lock,
    color: 'text-gray-500'
  },
  {
    id: 'all',
    name: 'all',
    displayName: 'Tutti',
    description: 'Accesso globale a tutti i record di tutti i tenant (solo SUPER_ADMIN)',
    icon: Globe,
    color: 'text-purple-600'
  },
  {
    id: 'tenant',
    name: 'tenant',
    displayName: 'Tenant',
    description: 'Accesso ai record del/dei tenant a cui l\'utente appartiene. Es: un Admin di "Element Medica" vede solo i dati di quel tenant',
    icon: Building,
    color: 'text-blue-600'
  },
  {
    id: 'own',
    name: 'own',
    displayName: 'Propri',
    description: 'Accesso solo ai record creati dall\'utente stesso. Es: un dipendente vede solo le sue richieste ferie',
    icon: User,
    color: 'text-green-600'
  },
  {
    id: 'relational',
    name: 'relational',
    displayName: 'Relazionale',
    description: 'Accesso a record correlati tramite relazione. Es: un medico vede solo i suoi pazienti assegnati',
    icon: Link2,
    color: 'text-orange-600'
  }
] as const;

// Definizioni dei tipi di relazione per scope "relational"
export const RELATION_TYPES = [
  {
    id: 'TRAINER_COURSES',
    name: 'TRAINER_COURSES',
    displayName: 'Formatore - Corsi',
    description: 'Partecipanti e aziende dei corsi dove sei formatore',
    applicableTo: ['persons', 'companies', 'enrollments']
  },
  {
    id: 'COMPANY_MANAGER',
    name: 'COMPANY_MANAGER',
    displayName: 'Manager Aziendale',
    description: 'Dipendenti della tua azienda',
    applicableTo: ['persons', 'employees']
  },
  {
    id: 'DEPARTMENT_HEAD',
    name: 'DEPARTMENT_HEAD',
    displayName: 'Capo Reparto',
    description: 'Dipendenti del tuo reparto',
    applicableTo: ['persons', 'employees']
  },
  {
    id: 'SITE_MANAGER',
    name: 'SITE_MANAGER',
    displayName: 'Responsabile Sito',
    description: 'Dipendenti del tuo sito aziendale',
    applicableTo: ['persons', 'employees']
  },
  {
    id: 'MEDICO_COMPETENTE',
    name: 'MEDICO_COMPETENTE',
    displayName: 'Medico Competente',
    description: 'Dipendenti dei siti dove sei medico competente',
    applicableTo: ['persons', 'employees']
  },
  {
    id: 'RSPP',
    name: 'RSPP',
    displayName: 'RSPP',
    description: 'Dipendenti e DVR dei siti dove sei RSPP',
    applicableTo: ['persons', 'employees', 'dvr']
  },
  {
    id: 'CONSULTANT',
    name: 'CONSULTANT',
    displayName: 'Consulente',
    description: 'Dati delle aziende clienti assegnate',
    applicableTo: ['companies', 'persons', 'documents']
  },
  {
    id: 'AUDITOR',
    name: 'AUDITOR',
    displayName: 'Auditor',
    description: 'Report e dati delle aziende da auditare',
    applicableTo: ['companies', 'reports']
  }
] as const;

// Mappa delle icone per entità
export const ENTITY_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  // Entità principali
  persons: Users,
  users: UserCog,
  companies: Building,
  courses: BookOpen,
  roles: Shield,
  hierarchy: GitBranch,

  // Entità virtuali basate su Person
  employees: Users,
  trainers: GraduationCap,
  dipendenti: Users,
  formatori: GraduationCap,

  // Sicurezza e compliance
  sites: MapPin,
  reparti: Briefcase,
  dvr: FileCheck,
  sopralluoghi: ClipboardCheck,
  gdpr: ShieldCheck,

  // Gestione organizzazione
  documents: FileText,
  certificates: FileCheck,
  equipment: Wrench,
  incidents: AlertTriangle,
  audits: ClipboardList,
  audit_logs: ClipboardList,
  policies: FileText,
  procedures: FileType,

  // Scheduling e pianificazione
  trainings: Calendar,
  schedules: Calendar,

  // Business
  quotes: Receipt,
  invoices: CreditCard,
  preventivi: Receipt,
  codici_sconto: Percent,

  // Risk management
  risks: AlertTriangle,
  controls: ShieldCheck,
  assessments: ClipboardCheck,

  // Sistema
  notifications: Bell,
  reports: BarChart3,
  analytics: BarChart3,
  settings: Settings,
  logs: FileText,
  backups: FolderArchive,
  integrations: Plug,
  workflows: RefreshCw,
  api_keys: Key,

  // CMS e Form
  form_templates: FileType,
  form_submissions: ClipboardList,
  public_cms: Layout,
  cms: Layout,
  cms_pages: Layout,
  cms_media: Image,
  cms_navigation: Navigation,
  seo: Search,
  templates: FileType,

  // Tenant e administration
  tenants: Building,
  administration: Lock,

  // Default
  default: Database
};

// Funzione per ottenere l'icona dell'entità
export const getEntityIcon = (entityName: string) => {
  return ENTITY_ICON_MAP[entityName] || ENTITY_ICON_MAP.default;
};

// Funzione per ottenere i tipi di relazione applicabili a un'entità
export const getApplicableRelationTypes = (entityName: string) => {
  return RELATION_TYPES.filter(rt => (rt.applicableTo as readonly string[]).includes(entityName));
};

// Tipi per TypeScript
export type PermissionAction = typeof PERMISSION_ACTIONS[number];
export type PermissionScope = typeof PERMISSION_SCOPES[number];
export type RelationType = typeof RELATION_TYPES[number];
export type PermissionActionName = PermissionAction['name'];
export type PermissionScopeName = PermissionScope['name'];
export type RelationTypeName = RelationType['name'];