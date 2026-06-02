/**
 * System Logs Page - Management Section
 * 
 * Enhanced activity logs viewer with filtering, pagination, and export
 * Displays system events, user actions, and audit trail from database
 * 
 * @module pages/management/system/SystemLogsPage
 * @project 43 - Tenant Roles Management System
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Activity,
    Search,
    RefreshCw,
    Download,
    Filter,
    Calendar,
    User,
    Shield,
    AlertCircle,
    CheckCircle2,
    Info,
    XCircle,
    ChevronLeft,
    ChevronRight,
    Clock,
    Database,
    Loader2,
    X,
    ChevronDown,
    ChevronUp,
    Copy,
    Check
} from 'lucide-react';
import { useAuth } from '../../../hooks/auth/useAuth';
import { apiGet } from '../../../services/api';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { DatePickerElegante } from '../../../components/ui/DatePickerElegante';

// Log types and interfaces
interface LogEntry {
    id: string;
    resource: string | null;
    resourceId?: string | null;
    metadata?: Record<string, unknown> | null;
    action: string;
    category?: string | null;
    success?: boolean;
    userId?: string;
    personId?: string;
    user?: {
        id: string;
        email: string;
        username?: string;
        firstName?: string;
        lastName?: string;
    };
    details?: string;
    ipAddress?: string;
    userAgent?: string;
    timestamp: string;
    level?: 'info' | 'warning' | 'error' | 'success';
    tenantId?: string;
}

interface LogsResponse {
    logs: LogEntry[];
    total: number;
    page: number;
    pageSize: number;
}

// Log level configuration
const LOG_LEVELS = {
    info: { color: 'bg-blue-100 text-blue-800', icon: Info },
    warning: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
    error: { color: 'bg-red-100 text-red-800', icon: XCircle },
    success: { color: 'bg-green-100 text-green-800', icon: CheckCircle2 }
};

// Resource categories for filtering
const RESOURCE_CATEGORIES = [
    { value: '', label: 'Tutte le risorse' },
    { value: 'auth', label: 'Autenticazione' },
    { value: 'users', label: 'Utenti' },
    { value: 'persons', label: 'Persone' },
    { value: 'roles', label: 'Ruoli' },
    { value: 'tenants', label: 'Tenant' },
    { value: 'public', label: 'Pubblico' },
    { value: 'cms', label: 'CMS' },
    { value: 'gdpr', label: 'GDPR' },
    { value: 'system', label: 'Sistema' }
];

// Action types for filtering
const ACTION_TYPES = [
    { value: '', label: 'Tutte le azioni' },
    { value: 'create', label: 'Creazione' },
    { value: 'read', label: 'Lettura' },
    { value: 'update', label: 'Modifica' },
    { value: 'delete', label: 'Eliminazione' },
    { value: 'login', label: 'Login' },
    { value: 'logout', label: 'Logout' },
    { value: 'grant', label: 'Concessione' },
    { value: 'revoke', label: 'Revoca' }
];

// Action descriptions in Italian for better readability
const ACTION_DESCRIPTIONS: Record<string, { label: string; description: string; icon?: string }> = {
    // AUTH
    'AUTH_LOGIN_SUCCESS': { label: 'Login effettuato', description: 'Accesso riuscito al sistema', icon: '🔓' },
    'AUTH_LOGIN_FAILED': { label: 'Login fallito', description: 'Tentativo di accesso non riuscito', icon: '🔒' },
    'AUTH_LOGOUT': { label: 'Logout', description: 'Disconnessione dal sistema', icon: '🚪' },
    'AUTH_TOKEN_REFRESH': { label: 'Token rinnovato', description: 'Sessione rinnovata automaticamente', icon: '🔄' },
    'AUTH_PASSWORD_RESET_REQUEST': { label: 'Reset password richiesto', description: 'Richiesta di reimpostazione password', icon: '📧' },
    'AUTH_PASSWORD_RESET_COMPLETE': { label: 'Password reimpostata', description: 'Password modificata con successo', icon: '✅' },
    'AUTH_SESSION_EXPIRED': { label: 'Sessione scaduta', description: 'Sessione terminata per inattività', icon: '⏰' },
    'AUTH_CONCURRENT_LOGIN': { label: 'Login concorrente', description: 'Accesso da altro dispositivo', icon: '📱' },
    'AUTH_PASSWORD_CHANGE': { label: 'Cambio password', description: 'Password modificata dall\'utente', icon: '🔑' },

    // CRUD
    'ENTITY_CREATE': { label: 'Creazione', description: 'Nuovo elemento creato', icon: '➕' },
    'ENTITY_READ': { label: 'Visualizzazione', description: 'Elemento visualizzato', icon: '👁️' },
    'ENTITY_LIST': { label: 'Lista consultata', description: 'Elenco elementi visualizzato', icon: '📋' },
    'ENTITY_UPDATE': { label: 'Modifica', description: 'Elemento modificato', icon: '✏️' },
    'ENTITY_DELETE': { label: 'Eliminazione', description: 'Elemento eliminato', icon: '🗑️' },
    'ENTITY_RESTORE': { label: 'Ripristino', description: 'Elemento ripristinato', icon: '♻️' },
    'ENTITY_EXPORT': { label: 'Esportazione', description: 'Dati esportati', icon: '📤' },
    'ENTITY_IMPORT': { label: 'Importazione', description: 'Dati importati', icon: '📥' },
    'ENTITY_ARCHIVE': { label: 'Archiviazione', description: 'Elemento archiviato', icon: '📦' },

    // NAVIGATION
    'PAGE_VIEW': { label: 'Pagina visitata', description: 'Navigazione a pagina', icon: '🔗' },
    'SEARCH_PERFORMED': { label: 'Ricerca effettuata', description: 'Ricerca nel sistema', icon: '🔍' },
    'FILTER_APPLIED': { label: 'Filtro applicato', description: 'Filtri di ricerca modificati', icon: '🎯' },
    'MODULE_SWITCH': { label: 'Cambio modulo', description: 'Passaggio tra moduli', icon: '🔀' },

    // DOCUMENT
    'DOCUMENT_GENERATE': { label: 'Documento generato', description: 'Nuovo documento creato', icon: '📄' },
    'DOCUMENT_DOWNLOAD': { label: 'Download documento', description: 'Documento scaricato', icon: '⬇️' },
    'DOCUMENT_SIGN': { label: 'Firma documento', description: 'Documento firmato', icon: '✍️' },
    'DOCUMENT_SHARE': { label: 'Condivisione documento', description: 'Documento condiviso', icon: '📤' },
    'DOCUMENT_VIEW': { label: 'Visualizzazione documento', description: 'Documento aperto', icon: '📖' },
    'DOCUMENT_VOID': { label: 'Annullamento documento', description: 'Documento annullato', icon: '❌' },
    'DOCUMENT_EMAIL': { label: 'Invio email', description: 'Documento inviato via email', icon: '📧' },

    // ADMIN
    'PERMISSION_GRANTED': { label: 'Permesso concesso', description: 'Nuovo permesso assegnato a utente', icon: '✅' },
    'PERMISSION_REVOKED': { label: 'Permesso revocato', description: 'Permesso rimosso da utente', icon: '🚫' },
    'ROLE_ASSIGNED': { label: 'Ruolo assegnato', description: 'Nuovo ruolo assegnato a utente', icon: '👤' },
    'ROLE_REMOVED': { label: 'Ruolo rimosso', description: 'Ruolo rimosso da utente', icon: '👥' },
    'TENANT_SWITCH': { label: 'Cambio tenant', description: 'Passaggio ad altro tenant', icon: '🏢' },
    'SETTINGS_CHANGED': { label: 'Impostazioni modificate', description: 'Configurazione sistema modificata', icon: '⚙️' },
    'USER_INVITED': { label: 'Utente invitato', description: 'Invito inviato a nuovo utente', icon: '✉️' },
    'USER_ACTIVATED': { label: 'Utente attivato', description: 'Account utente attivato', icon: '✅' },
    'USER_DEACTIVATED': { label: 'Utente disattivato', description: 'Account utente disattivato', icon: '⛔' },
    'PROFILE_UPDATED': { label: 'Profilo aggiornato', description: 'Dati profilo modificati', icon: '👤' },

    // CLINICAL
    'VISIT_CREATED': { label: 'Visita creata', description: 'Nuova visita medica registrata', icon: '🏥' },
    'VISIT_UPDATED': { label: 'Visita aggiornata', description: 'Dati visita modificati', icon: '📝' },
    'VISIT_CANCELLED': { label: 'Visita cancellata', description: 'Visita annullata', icon: '❌' },
    'VISIT_COMPLETED': { label: 'Visita completata', description: 'Visita conclusa', icon: '✅' },
    'PRESCRIPTION_CREATED': { label: 'Prescrizione creata', description: 'Nuova prescrizione medica', icon: '💊' },
    'REPORT_CREATED': { label: 'Referto creato', description: 'Nuovo referto medico', icon: '📋' },
    'MEDICAL_RECORD_ACCESS': { label: 'Accesso cartella clinica', description: 'Cartella paziente consultata', icon: '📁' },

    // TRAINING
    'COURSE_ENROLLMENT': { label: 'Iscrizione corso', description: 'Iscrizione a corso formativo', icon: '📚' },
    'COURSE_COMPLETED': { label: 'Corso completato', description: 'Corso terminato con successo', icon: '🎓' },
    'COURSE_DROPPED': { label: 'Corso abbandonato', description: 'Iscrizione corso annullata', icon: '🚪' },
    'TEST_PASSED': { label: 'Test superato', description: 'Esame superato con successo', icon: '✅' },
    'TEST_FAILED': { label: 'Test fallito', description: 'Esame non superato', icon: '❌' },
    'CERTIFICATE_GENERATED': { label: 'Attestato generato', description: 'Nuovo attestato creato', icon: '🏆' },
    'CERTIFICATE_DOWNLOADED': { label: 'Attestato scaricato', description: 'Attestato scaricato', icon: '⬇️' },

    // SYSTEM
    'SYSTEM_ERROR': { label: 'Errore sistema', description: 'Errore tecnico nel sistema', icon: '⚠️' },
    'SYSTEM_MAINTENANCE': { label: 'Manutenzione', description: 'Intervento di manutenzione', icon: '🔧' },
    'SYSTEM_BACKUP': { label: 'Backup eseguito', description: 'Backup dati completato', icon: '💾' },
    'SYSTEM_RESTORE': { label: 'Ripristino eseguito', description: 'Dati ripristinati da backup', icon: '🔄' }
};

// Resource names in Italian
const RESOURCE_NAMES: Record<string, string> = {
    'company': 'Azienda',
    'companies': 'Aziende',
    'person': 'Persona',
    'persons': 'Persone',
    'course': 'Corso',
    'courses': 'Corsi',
    'schedule': 'Programmazione',
    'schedules': 'Programmazioni',
    'document': 'Documento',
    'documents': 'Documenti',
    'template': 'Template',
    'templates': 'Template',
    'visit': 'Visita',
    'visits': 'Visite',
    'prescription': 'Prescrizione',
    'prescriptions': 'Prescrizioni',
    'certificate': 'Attestato',
    'certificates': 'Attestati',
    'tenant': 'Tenant',
    'tenants': 'Tenant',
    'role': 'Ruolo',
    'roles': 'Ruoli',
    'permission': 'Permesso',
    'permissions': 'Permessi',
    'site': 'Sede',
    'sites': 'Sedi',
    'room': 'Stanza',
    'rooms': 'Stanze',
    'preventivo': 'Preventivo',
    'preventivi': 'Preventivi',
    'auth': 'Autenticazione',
    'users': 'Utenti',
    'public': 'Pubblico',
    'cms': 'Contenuti',
    'gdpr': 'Privacy',
    'system': 'Sistema',
    'search': 'Ricerca',
    'logs': 'Log',
    'activity': 'Attività',
    // Normalized names from ActivityTypes.js
    'Company': 'Azienda',
    'Person': 'Persona',
    'Course': 'Corso',
    'Schedule': 'Programmazione',
    'Document': 'Documento',
    'Template': 'Template',
    'Visit': 'Visita',
    'Prescription': 'Prescrizione',
    'Certificate': 'Attestato',
    'Tenant': 'Tenant',
    'Role': 'Ruolo',
    'Permission': 'Permesso',
    'Site': 'Sede',
    'Room': 'Stanza',
    'Preventivo': 'Preventivo',
    'LetteraIncarico': 'Lettera di Incarico',
    'AttendanceRegister': 'Registro Presenze',
    'VisitaSpecialistica': 'Visita Specialistica',
    'MedicalJudgement': 'Giudizio di Idoneità',
    'Report': 'Referto',
    'DVR': 'DVR',
    'Sopralluogo': 'Sopralluogo',
    'Deadline': 'Scadenza',
    'FormTemplate': 'Template Form',
    'Form': 'Form',
    'Submission': 'Risposta Form',
    'Signature': 'Firma',
    'GDPRRequest': 'Richiesta GDPR',
    'PersonTenantProfile': 'Profilo Persona',
    'CourseTest': 'Test Corso',
    'CodiceSconto': 'Codice Sconto',
    'Backup': 'Backup',
    // Legacy: action-split fallback values (old logs)
    'entity': 'Risorsa'
};

// Helper function to infer a display label for the resource when resource is null
// Uses category, action prefix, or metadata fields as fallbacks
const inferResourceLabel = (log: LogEntry, meta: Record<string, unknown>): string => {
    // 1. Use explicit resource field if available
    const explicit = getResourceName(log.resource);
    if (explicit) return explicit;

    // 2. Try to get entity type from metadata
    const metaEntity = (meta.entityType || meta.entity || meta.type) as string | undefined;
    if (metaEntity) {
        const mapped = getResourceName(metaEntity);
        if (mapped) return mapped;
    }

    // 3. Infer from category
    const cat = log.category?.toUpperCase();
    if (cat === 'AUTH') return 'Autenticazione';
    if (cat === 'DOCUMENT') return 'Documenti';
    if (cat === 'TRAINING') return 'Formazione';
    if (cat === 'CLINICAL') return 'Clinica';
    if (cat === 'ADMIN') return 'Amministrazione';
    if (cat === 'NAVIGATION') return 'Navigazione';

    // 4. Infer from action prefix
    const action = log.action?.toUpperCase() || '';
    if (action.startsWith('AUTH_')) return 'Autenticazione';
    if (action.startsWith('DOCUMENT_')) return 'Documenti';
    if (action.startsWith('CERTIFICATE_')) return 'Attestati';
    if (action.startsWith('COURSE_')) return 'Corsi';
    if (action.startsWith('VISIT_')) return 'Visite';
    if (action.startsWith('PERMISSION_') || action.startsWith('ROLE_')) return 'Permessi';
    if (action.startsWith('SYSTEM_')) return 'Sistema';

    return 'Sistema';
};

// Convenience: compute resource display label from a log entry (no meta arg needed)
const getLogResource = (log: LogEntry): string => {
    const meta: Record<string, unknown> = log.metadata || {};
    if (!log.metadata && log.details) {
        try { Object.assign(meta, JSON.parse(log.details)); } catch { /* ignore */ }
    }
    return inferResourceLabel(log, meta);
};

// Helper function to get action info
const getActionInfo = (action: string) => {
    return ACTION_DESCRIPTIONS[action] || {
        label: action.replace(/_/g, ' ').toLowerCase(),
        description: `Azione: ${action}`,
        icon: '📌'
    };
};

// Helper function to get resource name in Italian
const getResourceName = (resource: string | null | undefined) => {
    if (!resource) return null;
    return RESOURCE_NAMES[resource] || RESOURCE_NAMES[resource.toLowerCase()] || resource;
};

// Map resource type → route path for clickable navigation
const RESOURCE_ROUTE_MAP: Record<string, string> = {
    'Company': '/companies',
    'company': '/companies',
    'Person': '/management/persons',
    'person': '/management/persons',
    'Course': '/courses',
    'course': '/courses',
    'Schedule': '/schedules',
    'schedule': '/schedules',
    'Visit': '/clinica/visite',
    'visit': '/clinica/visite',
    'VisitaSpecialistica': '/clinica/visite',
    'Preventivo': '/preventivi',
    'preventivo': '/preventivi',
    'Site': '/management/sites',
    'site': '/management/sites',
    'PersonTenantProfile': '/management/persons',
};

const getResourceUrl = (resource: string | null | undefined, resourceId: string | null | undefined): string | null => {
    if (!resource || !resourceId) return null;
    const basePath = RESOURCE_ROUTE_MAP[resource];
    if (!basePath) return null;
    return `${basePath}/${resourceId}`;
};

// Helper function to build a human-readable description
const buildActivityDescription = (log: LogEntry): string => {
    const actionInfo = getActionInfo(log.action);
    // Metadata from the structured field (preferred) or parsed from details string
    const meta: Record<string, unknown> = log.metadata || {};
    if (!log.metadata && log.details) {
        try {
            Object.assign(meta, JSON.parse(log.details));
        } catch {
            // ignore parse errors
        }
    }
    const resource = inferResourceLabel(log, meta);
    const userName = log.user?.firstName && log.user?.lastName
        ? `${log.user.firstName} ${log.user.lastName}`
        : log.user?.email || 'Sistema';

    // Helper to get entity label with resource + optional resourceId suffix
    const entityLabel = (name?: string): string => {
        const base = name ? `"${name}"` : resource;
        const idPart = log.resourceId ? ` (${log.resourceId.substring(0, 8)}…)` : '';
        return `${base}${idPart}`;
    };

    // Build specific descriptions based on action type
    switch (log.action) {
        case 'AUTH_LOGIN_SUCCESS':
            return `${userName} ha effettuato l'accesso al sistema`;
        case 'AUTH_LOGOUT':
            return `${userName} si è disconnesso dal sistema`;
        case 'AUTH_PASSWORD_RESET_REQUEST':
            return `Richiesta reset password per ${(meta.email as string) || userName}`;
        case 'AUTH_PASSWORD_RESET_COMPLETE':
            return `Password reimpostata con successo per ${userName}`;
        case 'ENTITY_CREATE':
            return `${userName} ha creato ${entityLabel((meta.entityName || meta.name || meta.title) as string | undefined)} in ${resource}`;
        case 'ENTITY_UPDATE':
            return `${userName} ha modificato ${entityLabel((meta.entityName || meta.name || meta.title) as string | undefined)} in ${resource}`;
        case 'ENTITY_DELETE':
            return `${userName} ha eliminato ${entityLabel((meta.entityName || meta.name || meta.title) as string | undefined)} da ${resource}`;
        case 'ENTITY_READ':
            if (['Sistema', 'system', 'System'].includes(resource)) {
                return `${userName} ha aperto una schermata tecnica di sistema`;
            }
            return `${userName} ha visualizzato ${resource}${log.resourceId ? ` (${log.resourceId.substring(0, 8)}…)` : ''}`;
        case 'ENTITY_LIST':
            return `${userName} ha consultato l'elenco di ${resource}`;
        case 'CERTIFICATE_GENERATED':
        case 'DOCUMENT_GENERATE': {
            const docName = (meta.filename || meta.documentName) as string | undefined;
            const docType = (meta.type || meta.templateType || log.resource) as string | undefined;
            const entityRef = log.resourceId ? ` per ${resource} (${log.resourceId.substring(0, 8)}…)` : '';
            return `${userName} ha generato ${docName ? `"${docName}"` : 'un documento'}${docType ? ` [${docType}]` : ''}${entityRef}`;
        }
        case 'DOCUMENT_DOWNLOAD':
            return `${userName} ha scaricato ${(meta.documentName || meta.filename) as string | undefined ? `"${meta.documentName || meta.filename}"` : 'un documento'}`;
        case 'VISIT_CREATED':
            return `${userName} ha creato una visita${log.resourceId ? ` (${log.resourceId.substring(0, 8)}…)` : ''}`;
        case 'VISIT_COMPLETED':
            return `${userName} ha completato una visita${log.resourceId ? ` (${log.resourceId.substring(0, 8)}…)` : ''}`;
        case 'TEST_PASSED':
            return `${userName} ha superato un test${log.resourceId ? ` (${log.resourceId.substring(0, 8)}…)` : ''}`;
        case 'TEST_FAILED':
            return `${userName} non ha superato un test${log.resourceId ? ` (${log.resourceId.substring(0, 8)}…)` : ''}`;
        case 'PERMISSION_GRANTED':
            return `${userName} ha concesso il permesso "${(meta.permission as string) || 'N/A'}" a ${(meta.targetUser as string) || 'un utente'}`;
        case 'PERMISSION_REVOKED':
            return `${userName} ha revocato il permesso "${(meta.permission as string) || 'N/A'}" da ${(meta.targetUser as string) || 'un utente'}`;
        case 'ROLE_ASSIGNED':
            return `${userName} ha assegnato il ruolo "${(meta.role as string) || 'N/A'}" a ${(meta.targetUser as string) || 'un utente'}`;
        case 'SEARCH_PERFORMED':
            return `${userName} ha cercato "${(meta.query as string) || 'N/A'}" in ${resource}`;
        case 'PAGE_VIEW': {
            // meta.path/page or plain string details as fallback
            const pagePath = (meta.path || meta.page || meta.url) as string | undefined;
            const plainPath = !pagePath && log.details && !log.details.startsWith('{') ? log.details.trim() : undefined;
            const display = pagePath || plainPath || resource;
            return `${userName} ha aperto: ${display}`;
        }
        case 'SETTINGS_CHANGED':
            return `${userName} ha modificato le impostazioni di ${(meta.settingKey as string) || 'sistema'}`;
        default:
            return `${userName} - ${actionInfo.label} su ${resource}${log.resourceId ? ` (${log.resourceId.substring(0, 8)}…)` : ''}`;
    }
};

const SystemLogsPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();

    // State
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalLogs, setTotalLogs] = useState(0);

    // Expanded log details state
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    // Filters
    const [search, setSearch] = useState('');
    const [resourceFilter, setResourceFilter] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [personFilter, setPersonFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [includeLowSignal, setIncludeLowSignal] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize] = useState(50);

    // Load logs from API
    const loadLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Build query params
            const params: Record<string, string> = {
                page: page.toString(),
                limit: pageSize.toString()
            };

            if (resourceFilter) params.resource = resourceFilter;
            if (actionFilter) params.action = actionFilter;
            if (personFilter) params.personSearch = personFilter;
            if (dateFrom) params.from = dateFrom;
            if (dateTo) params.to = dateTo;
            if (includeLowSignal) params.includeLowSignal = 'true';

            // Multi-tenant support
            const tenantParams = getTenantFilterParams();
            if (tenantParams.tenantIds) {
                params.tenantIds = tenantParams.tenantIds.join(',');
            }
            if (tenantParams.allTenants) {
                params.allTenants = 'true';
            }

            const response = await apiGet<LogsResponse>('/api/v1/activity-logs', params);

            if (response) {
                setLogs(response.logs || []);
                setTotalLogs(response.total || response.logs?.length || 0);
            }
        } catch (err: unknown) {
            setError('Errore nel caricamento dei log');
            // Try alternative endpoint
            try {
                const altResponse = await apiGet<{ data: LogEntry[] }>('/api/v1/activity-logs');
                if (altResponse?.data) {
                    setLogs(altResponse.data);
                    setTotalLogs(altResponse.data.length);
                }
            } catch {
                // Keep original error
            }
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, resourceFilter, actionFilter, personFilter, dateFrom, dateTo, includeLowSignal, getTenantFilterParams, tenantFilterKey]);

    useEffect(() => {
        if (isReady) {
            loadLogs();
        }
    }, [loadLogs, isReady]);

    // Filter logs by search term
    const filteredLogs = useMemo(() => {
        if (!search) return logs;
        const q = search.toLowerCase();
        return logs.filter(log => {
            const searchFields = [
                log.resource,
                log.action,
                log.user?.email,
                log.user?.username,
                log.user?.firstName,
                log.user?.lastName,
                log.details,
                log.ipAddress
            ].filter(Boolean).join(' ').toLowerCase();
            return searchFields.includes(q);
        });
    }, [logs, search]);

    // Parse log details
    const parseDetails = (details?: string): { message?: string; label?: string;[key: string]: unknown } => {
        if (!details) return {};
        try {
            const parsed = JSON.parse(details);
            return typeof parsed === 'object' && parsed !== null ? parsed : { message: String(details) };
        } catch {
            return { message: String(details) };
        }
    };

    // Toggle expanded log
    const toggleExpandLog = (logId: string) => {
        setExpandedLogId(prev => prev === logId ? null : logId);
    };

    // Copy to clipboard helper
    const copyToClipboard = async (text: string, fieldName: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(fieldName);
            setTimeout(() => setCopiedField(null), 2000);
        } catch (err) {
        }
    };

    // Format JSON for display
    const formatJsonDetails = (details: string | undefined): string => {
        if (!details) return '-';
        try {
            const parsed = JSON.parse(details);
            return JSON.stringify(parsed, null, 2);
        } catch {
            return details;
        }
    };

    // Determine log level from action/resource
    const getLogLevel = (log: LogEntry): 'info' | 'warning' | 'error' | 'success' => {
        if (log.level) return log.level;
        if (log.action.includes('error') || log.action.includes('fail')) return 'error';
        if (log.action.includes('warning')) return 'warning';
        if (log.action.includes('create') || log.action.includes('success')) return 'success';
        return 'info';
    };

    // Export logs as CSV
    const exportLogs = () => {
        const csvContent = [
            ['Timestamp', 'Risorsa', 'Azione', 'Utente', 'IP', 'Dettagli'].join(','),
            ...filteredLogs.map(log => [
                new Date(log.timestamp).toISOString(),
                log.resource,
                log.action,
                log.user?.email || '-',
                log.ipAddress || '-',
                `"${(log.details || '').replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `system-logs-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    // Clear all filters
    const clearFilters = () => {
        setSearch('');
        setResourceFilter('');
        setActionFilter('');
        setPersonFilter('');
        setDateFrom('');
        setDateTo('');
        setIncludeLowSignal(false);
        setPage(1);
    };

    // Pagination
    const totalPages = Math.ceil(totalLogs / pageSize);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Activity className="w-7 h-7 text-purple-600" />
                        Log di Sistema
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Monitoraggio delle attività e degli eventi del sistema
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadLogs}
                        disabled={loading}
                        className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Aggiorna"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-4 py-2 border rounded-lg transition-colors flex items-center gap-2 ${showFilters
                            ? 'bg-purple-50 border-purple-300 text-purple-700'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <Filter className="w-4 h-4" />
                        Filtri
                    </button>
                    <button
                        onClick={exportLogs}
                        disabled={filteredLogs.length === 0}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <Download className="w-4 h-4" />
                        Esporta CSV
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Database className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900">{totalLogs}</div>
                            <div className="text-sm text-gray-500">Log Totali</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900">
                                {logs.filter(l => getLogLevel(l) === 'success').length}
                            </div>
                            <div className="text-sm text-gray-500">Successi</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900">
                                {logs.filter(l => getLogLevel(l) === 'warning').length}
                            </div>
                            <div className="text-sm text-gray-500">Avvisi</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                            <XCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900">
                                {logs.filter(l => getLogLevel(l) === 'error').length}
                            </div>
                            <div className="text-sm text-gray-500">Errori</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-gray-900">Filtri Avanzati</h3>
                        <button
                            onClick={clearFilters}
                            className="text-sm text-purple-600 hover:text-purple-700"
                        >
                            Pulisci filtri
                        </button>
                    </div>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Risorsa
                            </label>
                            <select
                                value={resourceFilter}
                                onChange={(e) => { setResourceFilter(e.target.value); setPage(1); }}
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                            >
                                {RESOURCE_CATEGORIES.map(cat => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Azione
                            </label>
                            <select
                                value={actionFilter}
                                onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                            >
                                {ACTION_TYPES.map(action => (
                                    <option key={action.value} value={action.value}>{action.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Persona
                            </label>
                            <input
                                value={personFilter}
                                onChange={(e) => { setPersonFilter(e.target.value); setPage(1); }}
                                placeholder="Nome, CF o email"
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Da Data
                            </label>
                            <DatePickerElegante
                                value={dateFrom}
                                onChange={(date) => { setDateFrom(date ? date.toISOString().split('T')[0] : ''); setPage(1); }}
                                theme="blue"
                                size="sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                A Data
                            </label>
                            <DatePickerElegante
                                value={dateTo}
                                onChange={(date) => { setDateTo(date ? date.toISOString().split('T')[0] : ''); setPage(1); }}
                                theme="blue"
                                size="sm"
                            />
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                            <label className="flex cursor-pointer items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={includeLowSignal}
                                    onChange={(e) => { setIncludeLowSignal(e.target.checked); setPage(1); }}
                                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                />
                                <span>
                                    <span className="block text-sm font-medium text-gray-800">Mostra log tecnici</span>
                                    <span className="mt-0.5 block text-xs text-gray-500">Include visualizzazioni generiche e log poco descrittivi.</span>
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cerca per utente, azione, risorsa, IP..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-12 text-red-600">
                        <AlertCircle className="w-12 h-12 mb-4" />
                        <p>{error}</p>
                        <button
                            onClick={loadLogs}
                            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                        >
                            Riprova
                        </button>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                        <Activity className="w-12 h-12 mb-4" />
                        <p>Nessun log trovato</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8">
                                        {/* Expand */}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Timestamp
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Livello
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Risorsa / Azione
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Utente
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Dettagli
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        IP
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredLogs.map((log) => {
                                    const level = getLogLevel(log);
                                    const levelConfig = LOG_LEVELS[level];
                                    const LevelIcon = levelConfig.icon;
                                    const details = parseDetails(log.details);
                                    const isExpanded = expandedLogId === log.id;
                                    const actionInfo = getActionInfo(log.action);
                                    const activityDescription = buildActivityDescription(log);

                                    return (
                                        <React.Fragment key={log.id}>
                                            <tr
                                                className={`hover:bg-gray-50 cursor-pointer ${isExpanded ? 'bg-purple-50' : ''}`}
                                                onClick={() => toggleExpandLog(log.id)}
                                            >
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <button className="text-gray-400 hover:text-gray-600">
                                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex items-center gap-2 text-sm text-gray-700">
                                                        <Clock className="w-4 h-4 text-gray-400" />
                                                        {new Date(log.timestamp).toLocaleString('it-IT')}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${levelConfig.color}`}>
                                                        <LevelIcon className="w-3 h-3" />
                                                        {level}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-lg" title={log.action}>{actionInfo.icon}</span>
                                                            <span className="font-medium text-gray-900">{actionInfo.label}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            {(() => {
                                                                const resourceUrl = getResourceUrl(log.resource, log.resourceId);
                                                                const resourceLabel = getLogResource(log);
                                                                if (resourceUrl) {
                                                                    return (
                                                                        <button
                                                                            onClick={() => navigate(resourceUrl)}
                                                                            className="text-xs text-teal-600 hover:text-teal-800 hover:underline cursor-pointer"
                                                                            title={`Vai a ${resourceLabel}`}
                                                                        >
                                                                            {resourceLabel}
                                                                        </button>
                                                                    );
                                                                }
                                                                return <span className="text-xs text-gray-500">{resourceLabel}</span>;
                                                            })()}
                                                            {log.resourceId && (
                                                                <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded" title={log.resourceId}>
                                                                    #{log.resourceId.substring(0, 8)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                                            <User className="w-4 h-4 text-gray-500" />
                                                        </div>
                                                        <div className="text-sm">
                                                            <div className="text-gray-900">
                                                                {log.user?.firstName && log.user?.lastName
                                                                    ? `${log.user.firstName} ${log.user.lastName}`
                                                                    : log.user?.username || 'Sistema'}
                                                            </div>
                                                            <div className="text-gray-500 text-xs">
                                                                {log.user?.email || '-'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 max-w-md">
                                                    <div className="text-sm text-gray-700" title={activityDescription}>
                                                        {activityDescription}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                    {log.ipAddress || '-'}
                                                </td>
                                            </tr>
                                            {/* Expanded Details Row */}
                                            {isExpanded && (
                                                <tr className="bg-gray-50">
                                                    <td colSpan={7} className="px-4 py-4">
                                                        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <h4 className="text-sm font-semibold text-gray-900">Dettagli Completi Log</h4>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        copyToClipboard(JSON.stringify(log, null, 2), 'full-log');
                                                                    }}
                                                                    className="flex items-center gap-1 px-2 py-1 text-xs text-purple-600 hover:bg-purple-50 rounded"
                                                                >
                                                                    {copiedField === 'full-log' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                                                    {copiedField === 'full-log' ? 'Copiato!' : 'Copia JSON'}
                                                                </button>
                                                            </div>

                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                {/* Log ID */}
                                                                <div className="space-y-1">
                                                                    <label className="text-xs font-medium text-gray-500 uppercase">ID Log</label>
                                                                    <div className="flex items-center gap-2">
                                                                        <code className="text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded font-mono">
                                                                            {log.id}
                                                                        </code>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); copyToClipboard(log.id, 'log-id'); }}
                                                                            className="text-gray-400 hover:text-gray-600"
                                                                        >
                                                                            {copiedField === 'log-id' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {/* User ID */}
                                                                <div className="space-y-1">
                                                                    <label className="text-xs font-medium text-gray-500 uppercase">User ID</label>
                                                                    <div className="flex items-center gap-2">
                                                                        <code className="text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded font-mono">
                                                                            {log.userId || log.personId || '-'}
                                                                        </code>
                                                                        {(log.userId || log.personId) && (
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); copyToClipboard(log.userId || log.personId || '', 'user-id'); }}
                                                                                className="text-gray-400 hover:text-gray-600"
                                                                            >
                                                                                {copiedField === 'user-id' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Tenant ID */}
                                                                <div className="space-y-1">
                                                                    <label className="text-xs font-medium text-gray-500 uppercase">Tenant ID</label>
                                                                    <div className="flex items-center gap-2">
                                                                        <code className="text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded font-mono">
                                                                            {log.tenantId || '-'}
                                                                        </code>
                                                                        {log.tenantId && (
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); copyToClipboard(log.tenantId || '', 'tenant-id'); }}
                                                                                className="text-gray-400 hover:text-gray-600"
                                                                            >
                                                                                {copiedField === 'tenant-id' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Timestamp */}
                                                                <div className="space-y-1">
                                                                    <label className="text-xs font-medium text-gray-500 uppercase">Timestamp Preciso</label>
                                                                    <code className="text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded font-mono block">
                                                                        {log.timestamp}
                                                                    </code>
                                                                </div>

                                                                {/* IP Address */}
                                                                <div className="space-y-1">
                                                                    <label className="text-xs font-medium text-gray-500 uppercase">Indirizzo IP</label>
                                                                    <code className="text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded font-mono block">
                                                                        {log.ipAddress || '-'}
                                                                    </code>
                                                                </div>

                                                                {/* Resource + Action */}
                                                                <div className="space-y-1">
                                                                    <label className="text-xs font-medium text-gray-500 uppercase">Azione</label>
                                                                    <div className="text-sm text-gray-900">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-lg">{actionInfo.icon}</span>
                                                                            <span className="font-medium">{actionInfo.label}</span>
                                                                        </div>
                                                                        <div className="text-xs text-gray-500 mt-1">{actionInfo.description}</div>
                                                                    </div>
                                                                </div>

                                                                {/* Resource + ResourceId */}
                                                                {(log.resource || log.resourceId) && (
                                                                    <div className="space-y-1">
                                                                        <label className="text-xs font-medium text-gray-500 uppercase">Entità</label>
                                                                        <div className="text-sm text-gray-900">
                                                                            {(() => {
                                                                                const resourceUrl = getResourceUrl(log.resource, log.resourceId);
                                                                                const resourceLabel = getLogResource(log);
                                                                                if (resourceUrl) {
                                                                                    return (
                                                                                        <button
                                                                                            onClick={() => navigate(resourceUrl)}
                                                                                            className="font-medium text-teal-600 hover:text-teal-800 hover:underline cursor-pointer"
                                                                                        >
                                                                                            {resourceLabel}
                                                                                        </button>
                                                                                    );
                                                                                }
                                                                                return <div className="font-medium">{resourceLabel}</div>;
                                                                            })()}
                                                                            {log.resourceId && (
                                                                                <div className="flex items-center gap-2 mt-1">
                                                                                    <code className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded font-mono">
                                                                                        {log.resourceId}
                                                                                    </code>
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); copyToClipboard(log.resourceId || '', 'resource-id'); }}
                                                                                        className="text-gray-400 hover:text-gray-600"
                                                                                    >
                                                                                        {copiedField === 'resource-id' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Activity Description */}
                                                            <div className="space-y-1 bg-blue-50 p-3 rounded-lg border border-blue-200">
                                                                <label className="text-xs font-medium text-blue-700 uppercase">Cosa è successo</label>
                                                                <p className="text-sm text-blue-900 font-medium">{activityDescription}</p>
                                                            </div>

                                                            {/* User Agent */}
                                                            {log.userAgent && (
                                                                <div className="space-y-1">
                                                                    <label className="text-xs font-medium text-gray-500 uppercase">User Agent</label>
                                                                    <div className="flex items-start gap-2">
                                                                        <code className="text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded font-mono break-all flex-1">
                                                                            {log.userAgent}
                                                                        </code>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); copyToClipboard(log.userAgent || '', 'user-agent'); }}
                                                                            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                                                                        >
                                                                            {copiedField === 'user-agent' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Details JSON */}
                                                            {log.details && (
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center justify-between">
                                                                        <label className="text-xs font-medium text-gray-500 uppercase">Dettagli (JSON)</label>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); copyToClipboard(formatJsonDetails(log.details), 'details'); }}
                                                                            className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700"
                                                                        >
                                                                            {copiedField === 'details' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                                                            Copia
                                                                        </button>
                                                                    </div>
                                                                    <pre className="text-xs text-gray-700 bg-gray-100 p-3 rounded-lg overflow-x-auto font-mono max-h-64 overflow-y-auto">
                                                                        {formatJsonDetails(log.details)}
                                                                    </pre>
                                                                </div>
                                                            )}

                                                            {/* User Info */}
                                                            {log.user && (
                                                                <div className="space-y-1">
                                                                    <label className="text-xs font-medium text-gray-500 uppercase">Informazioni Utente</label>
                                                                    <div className="bg-gray-100 p-3 rounded-lg">
                                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                                            <div>
                                                                                <span className="text-gray-500">Nome:</span>
                                                                                <span className="ml-2 text-gray-900">{log.user.firstName || '-'} {log.user.lastName || ''}</span>
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-gray-500">Email:</span>
                                                                                <span className="ml-2 text-gray-900">{log.user.email || '-'}</span>
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-gray-500">Username:</span>
                                                                                <span className="ml-2 text-gray-900">{log.user.username || '-'}</span>
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-gray-500">ID:</span>
                                                                                <code className="ml-2 text-gray-900 text-xs font-mono">{log.user.id}</code>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3">
                    <div className="text-sm text-gray-500">
                        Pagina {page} di {totalPages} ({totalLogs} log totali)
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-4 py-2 text-sm font-medium text-gray-700">
                            {page}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SystemLogsPage;
