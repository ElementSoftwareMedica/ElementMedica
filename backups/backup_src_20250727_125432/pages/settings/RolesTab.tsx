import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, Trash2, Save, X, Check, AlertCircle,
  Settings, Users, Building, Eye, EyeOff,
  Target, Globe, User, Building2,
  FileText, Database, UserCheck, Info,
  Plus, Edit, Layers
} from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../services/api';
import { 
  getRoles, 
  getPermissions, 
  assignRoleWithHierarchy, 
  assignPermissionsWithHierarchy 
} from '../../services/roles';
import { useAuth } from '../../context/AuthContext';
import PermissionAssignment from '../../components/roles/PermissionAssignment';
import '../../styles/scrollbar.css';

interface Role {
  type: string;
  name: string;
  description: string;
  userCount: number;
  isActive?: boolean; // Opzionale per compatibilità con il servizio
  persons?: Person[];
  permissions?: string[];
}

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  entity?: string; // Opzionale per compatibilità con il servizio
  action?: string; // Opzionale per compatibilità con il servizio
  resource?: string;
  scope?: 'all' | 'own';
}

interface Tenant {
  id: number;
  name: string;
  type: string;
  isActive: boolean;
}

interface RolePermission {
  permissionId: string;
  granted: boolean;
  scope: 'all' | 'own' | 'tenant' | 'hierarchy';
  tenantIds?: number[];
  fieldRestrictions?: string[];
  maxRoleLevel?: number;
  conditions?: {
    maxRoleLevel?: number;
  };
}

// Funzione helper per convertire entity e action nel formato del backend
const getPermissionKey = (entity: string, action: string) => {
  // Protezione per valori undefined o null
  if (!entity || !action) {
    console.warn('getPermissionKey called with undefined values:', { entity, action });
    return 'UNKNOWN_PERMISSION';
  }
  
  console.log('🔑 PERMISSION KEY DEBUG - Input:', { entity, action });
  
  // Caso speciale per i ruoli: genera chiavi specifiche per ogni azione
  // per evitare duplicazioni di chiavi React
  if (entity === 'roles') {
    const actionMapping: Record<string, string> = {
      'view': 'ROLE_MANAGEMENT',
      'read': 'ROLE_MANAGEMENT', 
      'create': 'ROLE_CREATE',
      'edit': 'ROLE_EDIT',
      'update': 'ROLE_EDIT',
      'delete': 'ROLE_DELETE'
    };
    const actionLower = action ? action.toLowerCase() : '';
    // Protezione per toUpperCase()
    let actionUpper = 'UNKNOWN';
    try {
      actionUpper = action && typeof action === 'string' ? action.toUpperCase() : 'UNKNOWN';
    } catch (error) {
      console.warn('Error in toUpperCase() for action:', action, error);
    }
    const result = actionMapping[actionLower] || `ROLE_${actionUpper}`;
    return result;
  }
  
  // Caso speciale per administration: usa ADMIN_PANEL per view
  if (entity === 'administration' && action && action.toLowerCase() === 'view') {
    return 'ADMIN_PANEL';
  }
  
  // Converte entity e action nel formato ACTION_ENTITY richiesto dal backend
  // Mappa le actions del frontend con i permessi del database
  const actionMapping: Record<string, string> = {
    'read': 'VIEW',
    'view': 'VIEW',
    'create': 'CREATE', 
    'update': 'EDIT',
    'edit': 'EDIT',
    'delete': 'DELETE'
  };
  
  const actionLower = action ? action.toLowerCase() : '';
  
  // Protezione per toUpperCase()
  let actionUpper = 'UNKNOWN';
  let entityUpper = 'UNKNOWN';
  
  try {
    actionUpper = action && typeof action === 'string' ? action.toUpperCase() : 'UNKNOWN';
  } catch (error) {
    console.warn('Error in toUpperCase() for action:', action, error);
  }
  
  try {
    entityUpper = entity && typeof entity === 'string' ? entity.toUpperCase() : 'UNKNOWN';
  } catch (error) {
    console.warn('Error in toUpperCase() for entity:', entity, error);
  }
  
  const mappedAction = actionMapping[actionLower] || actionUpper;
  const result = `${mappedAction}_${entityUpper}`;
  
  return result;
};

const RolesTab: React.FC = () => {
  const { user, isLoading: authLoading, hasPermission } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, RolePermission>>({});
  const [activeEntity, setActiveEntity] = useState<string>('users');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  
  // Ref per lo scroll automatico
  const permissionsContentRef = useRef<HTMLDivElement>(null);
  
  // Stati per assegnazione permessi
  const [showPermissionAssignment, setShowPermissionAssignment] = useState(false);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<any>(null);
  const [currentUserLevel, setCurrentUserLevel] = useState(5); // Default: livello più basso

  // Definizione delle entità e azioni per permessi granulari
  const entities = [
    { key: 'companies', label: 'Aziende', icon: Building },
    { key: 'employees', label: 'Dipendenti', icon: Users },
    { key: 'trainers', label: 'Formatori', icon: Users },
    { key: 'users', label: 'Utenti', icon: Users },
    { key: 'courses', label: 'Corsi', icon: Settings },
    { key: 'documents', label: 'Documenti', icon: Settings },
    { key: 'tenants', label: 'Tenant', icon: Building },
    { key: 'roles', label: 'Ruoli', icon: Shield },
    { key: 'administration', label: 'Amministrazione', icon: Shield },
    { key: 'gdpr', label: 'GDPR', icon: Shield },
    { key: 'reports', label: 'Report', icon: Settings }
  ];
  
  const actions = [
    { key: 'view', label: 'Visualizzare', color: 'blue' },
    { key: 'create', label: 'Creare', color: 'green' },
    { key: 'edit', label: 'Modificare', color: 'yellow' },
    { key: 'delete', label: 'Eliminare', color: 'red' }
  ];

  // Permessi a livello di campo per ogni entità (aggiornati con campi reali del database)
  const fieldPermissions: Record<string, { key: string; label: string; }[]> = {
    companies: [
      { key: 'name', label: 'Nome' },
      { key: 'address', label: 'Indirizzo' },
      { key: 'phone', label: 'Telefono' },
      { key: 'email', label: 'Email' },
      { key: 'vatNumber', label: 'P.IVA' },
      { key: 'fiscalCode', label: 'Codice Fiscale' },
      { key: 'website', label: 'Sito Web' },
      { key: 'description', label: 'Descrizione' }
    ],
    tenants: [
      { key: 'name', label: 'Nome' },
      { key: 'type', label: 'Tipo' },
      { key: 'isActive', label: 'Attivo' },
      { key: 'settings', label: 'Impostazioni' }
    ],
    roles: [
      { key: 'name', label: 'Nome' },
      { key: 'description', label: 'Descrizione' },
      { key: 'type', label: 'Tipo' },
      { key: 'permissions', label: 'Permessi' }
    ],
    employees: [
      { key: 'firstName', label: 'Nome' },
      { key: 'lastName', label: 'Cognome' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Telefono' },
      { key: 'birthDate', label: 'Data di Nascita' },
      { key: 'taxCode', label: 'Codice Fiscale' },
      { key: 'vatNumber', label: 'Partita IVA' },
      { key: 'residenceAddress', label: 'Indirizzo di Residenza' },
      { key: 'residenceCity', label: 'Città di Residenza' },
      { key: 'postalCode', label: 'CAP' },
      { key: 'province', label: 'Provincia' },
      { key: 'title', label: 'Titolo' },
      { key: 'hiredDate', label: 'Data di Assunzione' },
      { key: 'hourlyRate', label: 'Tariffa Oraria' },
      { key: 'iban', label: 'IBAN' },
      { key: 'registerCode', label: 'Codice Registro' },
      { key: 'certifications', label: 'Certificazioni' },
      { key: 'specialties', label: 'Specializzazioni' },
      { key: 'profileImage', label: 'Immagine Profilo' },
      { key: 'notes', label: 'Note' },
      { key: 'lastLogin', label: 'Ultimo Accesso' },
      { key: 'globalRole', label: 'Ruolo Globale' },
      { key: 'preferences', label: 'Preferenze' }
    ],
    courses: [
      { key: 'title', label: 'Titolo' },
      { key: 'description', label: 'Descrizione' },
      { key: 'duration', label: 'Durata' },
      { key: 'category', label: 'Categoria' },
      { key: 'status', label: 'Stato' },
      { key: 'price', label: 'Prezzo' },
      { key: 'maxParticipants', label: 'Max Partecipanti' },
      { key: 'minParticipants', label: 'Min Partecipanti' }
    ],
    trainers: [
      { key: 'firstName', label: 'Nome' },
      { key: 'lastName', label: 'Cognome' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Telefono' },
      { key: 'specialties', label: 'Specializzazioni' },
      { key: 'certifications', label: 'Certificazioni' },
      { key: 'hourlyRate', label: 'Tariffa Oraria' },
      { key: 'profileImage', label: 'Immagine Profilo' },
      { key: 'notes', label: 'Note' }
    ],
    users: [
      { key: 'firstName', label: 'Nome' },
      { key: 'lastName', label: 'Cognome' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Telefono' },
      { key: 'lastLogin', label: 'Ultimo Accesso' },
      { key: 'globalRole', label: 'Ruolo Globale' },
      { key: 'preferences', label: 'Preferenze' }
    ],
    documents: [
      { key: 'title', label: 'Titolo' },
      { key: 'description', label: 'Descrizione' },
      { key: 'type', label: 'Tipo' },
      { key: 'status', label: 'Stato' },
      { key: 'createdAt', label: 'Data Creazione' },
      { key: 'updatedAt', label: 'Data Modifica' }
    ],
    administration: [
      { key: 'settings', label: 'Impostazioni' },
      { key: 'logs', label: 'Log' },
      { key: 'backups', label: 'Backup' }
    ],
    gdpr: [
      { key: 'consents', label: 'Consensi' },
      { key: 'auditLogs', label: 'Log Audit' },
      { key: 'dataExports', label: 'Esportazioni Dati' }
    ],
    reports: [
      { key: 'title', label: 'Titolo' },
      { key: 'type', label: 'Tipo' },
      { key: 'data', label: 'Dati' },
      { key: 'createdAt', label: 'Data Creazione' }
    ]
  };

  useEffect(() => {
    let isMounted = true;
    
    const loadInitialData = async () => {
      // Non caricare dati se l'autenticazione è in corso o l'utente non è loggato
      if (authLoading || !user) {
        console.log('🔍 RolesTab: Skipping data load - authLoading:', authLoading, 'user:', !!user);
        return;
      }
      
      if (isMounted) {
        console.log('🔍 RolesTab: Loading initial data for authenticated user');
        await loadRoles();
        await loadPermissions();
        // Carica i tenant solo se necessario per i permessi
        await loadTenants();
      }
    };
    
    loadInitialData();
    
    return () => {
      isMounted = false;
    };
  }, [authLoading, user]); // Aggiungo dipendenze per authLoading e user

  useEffect(() => {
    if (selectedRole) {
      console.log('🔍 Role selected:', selectedRole.type);
      loadRolePermissions(selectedRole.type);
      
      // Imposta automaticamente la prima entità come attiva
      if (entities.length > 0 && !activeEntity) {
        console.log('🔍 Setting default active entity:', entities[0].key);
        setActiveEntity(entities[0].key);
      }
    } else {
      console.log('🔍 No role selected, clearing permissions');
      setRolePermissions({});
      setActiveEntity('');
    }
  }, [selectedRole]);

  // Scroll automatico quando cambia l'entità attiva
  useEffect(() => {
    // Non serve più scroll automatico, usiamo solo l'Intersection Observer
  }, [activeEntity]);

  // Intersection Observer per la navigazione automatica
  useEffect(() => {
    if (!permissionsContentRef.current || !selectedRole) {
      console.log('🔍 Observer: Missing requirements - container:', !!permissionsContentRef.current, 'role:', !!selectedRole);
      return;
    }

    console.log('🔍 Observer: Setting up for role:', selectedRole.type);

    const observer = new IntersectionObserver(
      (entries) => {
        console.log('🔍 Observer: Processing', entries.length, 'entries');
        
        // Trova l'entità più visibile
        let mostVisibleEntity = null;
        let maxVisibleRatio = 0;

        entries.forEach((entry) => {
          const entityKey = entry.target.id.replace('entity-', '');
          const ratio = entry.intersectionRatio;
          
          console.log('🔍 Observer: Entity', entityKey, 'intersecting:', entry.isIntersecting, 'ratio:', ratio.toFixed(3));
          
          if (entry.isIntersecting && ratio > maxVisibleRatio) {
            maxVisibleRatio = ratio;
            mostVisibleEntity = entityKey;
          }
        });

        // Aggiorna solo se abbiamo trovato un'entità visibile e diversa da quella attuale
        if (mostVisibleEntity && mostVisibleEntity !== activeEntity && maxVisibleRatio > 0.2) {
          console.log('🔄 Observer: Updating active entity from', activeEntity, 'to', mostVisibleEntity, 'ratio:', maxVisibleRatio.toFixed(3));
          setActiveEntity(mostVisibleEntity);
        } else if (mostVisibleEntity) {
          console.log('🔍 Observer: No update needed - entity:', mostVisibleEntity, 'current:', activeEntity, 'ratio:', maxVisibleRatio.toFixed(3));
        }
      },
      {
        root: permissionsContentRef.current,
        rootMargin: '-5% 0px -50% 0px', // Margine ottimizzato per migliore rilevamento
        threshold: [0, 0.1, 0.2, 0.3, 0.5, 0.7, 1.0]
      }
    );

    // Aspetta che il DOM sia renderizzato prima di osservare
    const timeoutId = setTimeout(() => {
      const entityElements = permissionsContentRef.current?.querySelectorAll('[id^="entity-"]');
      console.log('🔍 Observer: Found', entityElements?.length, 'entity elements to observe');
      
      entityElements?.forEach((element) => {
        observer.observe(element);
        console.log('👀 Observer: Now observing', element.id);
      });
    }, 500); // Aumentato timeout per assicurare rendering completo

    return () => {
      console.log('🔍 Observer: Cleaning up');
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [selectedRole]); // Rimossa dipendenza da activeEntity per evitare loop

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  const scrollToEntity = (entityKey: string, retryCount = 0) => {
    console.log('🔄 Scrolling to entity:', entityKey, 'retry:', retryCount);
    const element = document.getElementById(`entity-${entityKey}`);
    
    if (element && permissionsContentRef.current) {
      const container = permissionsContentRef.current;
      const elementTop = element.offsetTop - container.offsetTop;
      
      // Scroll con offset per non coprire il titolo
      container.scrollTo({
        top: Math.max(0, elementTop - 80), // Offset maggiore per evitare sovrapposizioni
        behavior: 'smooth'
      });
      
      console.log('✅ Scrolled to entity:', entityKey, 'at position:', elementTop);
    } else if (retryCount < 3) {
      // Retry dopo un breve delay se l'elemento non è ancora renderizzato
      console.log('⏳ Element not found, retrying in 200ms...', entityKey);
      setTimeout(() => scrollToEntity(entityKey, retryCount + 1), 200);
    } else {
      console.warn('❌ Element not found after retries:', entityKey);
    }
  };

  const loadRoles = async () => {
    try {
      setLoading(true);
      const response = await getRoles();
      // getRoles() restituisce già { roles: [...], totalRoles: number, totalUsers: number }
      setRoles(response.roles || []);
    } catch (err) {
      showError('Errore nel caricamento dei ruoli');
      console.error('Error loading roles:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const permissionsArray = await getPermissions();
      // Assicuriamoci che permissions sia sempre un array
      setPermissions(Array.isArray(permissionsArray) ? permissionsArray : []);
    } catch (err) {
      console.error('Error loading permissions:', err);
      setPermissions([]); // Imposta array vuoto in caso di errore
    }
  };

  const loadTenants = async () => {
    if (tenantsLoading) {
      console.log('Tenants already loading, skipping duplicate request');
      return;
    }
    
    try {
      setTenantsLoading(true);
      const response = await apiGet('/api/tenants');
      setTenants(response?.data || response || []);
    } catch (err: any) {
      console.error('Error loading tenants:', err);
      // Se l'errore è 403, 404 o 500, probabilmente l'utente non ha i permessi SUPER_ADMIN
      // In questo caso, impostiamo un tenant di default per evitare errori
      if (err.response?.status === 403 || err.response?.status === 404 || err.response?.status === 500 || err.response?.status === 429) {
        // Impostiamo un tenant di default per evitare errori nell'interfaccia
        setTenants([{
          id: 1,
          name: 'Tenant Corrente',
          type: 'default',
          isActive: true
        }]);
      } else {
        setTenants([]);
      }
    } finally {
      setTenantsLoading(false);
    }
  };

  const loadRolePermissions = async (roleType: string) => {
    try {
      console.log('🔍 LOAD DEBUG - Loading permissions for role:', roleType);
      
      // 1. Carica i permessi del ruolo dal backend
      const response = await apiGet(`/api/roles/${roleType}/permissions`);
      const data = response?.data || response;
      const backendPermissions = data?.permissions || [];
      
      console.log('🔍 LOAD DEBUG - Backend response:', data);
      console.log('🔍 LOAD DEBUG - Backend permissions:', backendPermissions);
      
      // 2. Genera automaticamente TUTTI i permessi per TUTTE le entità
      const permissionsMap: Record<string, RolePermission> = {};
      
      // Genera permessi per ogni entità definita
      entities.forEach(entity => {
        const entityPermissions = getPermissionsByEntity(entity.key);
        entityPermissions.forEach(permission => {
          if (permission.entity && permission.action) {
            const permissionKey = getPermissionKey(permission.entity, permission.action);
            if (permissionKey !== 'UNKNOWN_PERMISSION') {
              permissionsMap[permissionKey] = {
                permissionId: permissionKey,
                granted: false,
                scope: 'all',
                tenantIds: [],
                fieldRestrictions: []
              };
            }
          }
        });
      });
      
      console.log('🔍 LOAD DEBUG - Generated permissions map keys:', Object.keys(permissionsMap));
      console.log('🔍 LOAD DEBUG - Generated permissions map size:', Object.keys(permissionsMap).length);
      
      // 3. Aggiorna con i permessi effettivi dal backend
      if (Array.isArray(backendPermissions)) {
        console.log('🔍 LOAD DEBUG - Processing array format');
        backendPermissions.forEach((perm: any) => {
          const permissionId = perm.permissionId;
          console.log('🔍 LOAD DEBUG - Processing permission:', permissionId, 'granted:', perm.granted);
          if (permissionId && permissionsMap[permissionId]) {
            permissionsMap[permissionId] = {
              permissionId,
              granted: Boolean(perm.granted),
              scope: perm.scope || 'all',
              tenantIds: perm.tenantIds || [],
              fieldRestrictions: perm.fieldRestrictions || [],
              maxRoleLevel: perm.maxRoleLevel
            };
            console.log('✅ LOAD DEBUG - Updated permission:', permissionId);
          } else {
            console.log('❌ LOAD DEBUG - Permission not found in map:', permissionId);
          }
        });
      } else if (typeof backendPermissions === 'object') {
        console.log('🔍 LOAD DEBUG - Processing object format (legacy)');
        // Gestisce il formato legacy (oggetto con chiavi)
        Object.entries(backendPermissions).forEach(([permissionId, granted]: [string, any]) => {
          console.log('🔍 LOAD DEBUG - Processing legacy permission:', permissionId, 'granted:', granted);
          if (permissionsMap[permissionId]) {
            permissionsMap[permissionId] = {
              permissionId,
              granted: Boolean(granted),
              scope: 'all',
              tenantIds: [],
              fieldRestrictions: []
            };
            console.log('✅ LOAD DEBUG - Updated legacy permission:', permissionId);
          } else {
            console.log('❌ LOAD DEBUG - Legacy permission not found in map:', permissionId);
          }
        });
      }
      
      const grantedCount = Object.values(permissionsMap).filter(p => p.granted).length;
      console.log('🔍 LOAD DEBUG - Final permissions map size:', Object.keys(permissionsMap).length);
      console.log('🔍 LOAD DEBUG - Final granted permissions:', grantedCount);
      console.log('🔍 LOAD DEBUG - Final permissions map:', permissionsMap);
      
      setRolePermissions(permissionsMap);
    } catch (err) {
      console.error('Error loading role permissions:', err);
      showError('Errore nel caricamento dei permessi del ruolo');
    }
  };

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role);
  };

  const handleDeleteRole = async (roleType: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questo ruolo?')) {
      try {
        await apiDelete(`/api/roles/${roleType}`);
        showSuccess('Ruolo eliminato con successo');
        await loadRoles();
        if (selectedRole?.type === roleType) {
          setSelectedRole(null);
        }
      } catch (err: any) {
        showError(err.response?.data?.error || 'Errore durante l\'eliminazione del ruolo');
      }
    }
  };

  const handlePermissionChange = (permissionId: string, granted: boolean, scope?: string) => {
    setRolePermissions(prev => ({
      ...prev,
      [permissionId]: {
        permissionId,
        granted,
        scope: scope || prev[permissionId]?.scope || 'all',
        tenantIds: prev[permissionId]?.tenantIds || [],
        fieldRestrictions: prev[permissionId]?.fieldRestrictions || []
      }
    }));
  };

  const handleTenantChange = (permissionId: string, tenantId: number, selected: boolean) => {
    setRolePermissions(prev => {
      const current = prev[permissionId] || { permissionId, granted: true, scope: 'tenant', tenantIds: [], fieldRestrictions: [] };
      const tenantIds = selected
        ? [...(current.tenantIds || []), tenantId]
        : (current.tenantIds || []).filter(id => id !== tenantId);
      
      return {
        ...prev,
        [permissionId]: {
          ...current,
          tenantIds
        }
      };
    });
  };

  const handleFieldRestrictionChange = (permissionId: string, field: string, restricted: boolean) => {
    setRolePermissions(prev => {
      const current = prev[permissionId] || { permissionId, granted: true, scope: 'all', tenantIds: [], fieldRestrictions: [] };
      const fieldRestrictions = restricted
        ? [...(current.fieldRestrictions || []), field]
        : (current.fieldRestrictions || []).filter(f => f !== field);
      
      return {
        ...prev,
        [permissionId]: {
          ...current,
          fieldRestrictions
        }
      };
    });
  };



  const saveRolePermissions = async () => {
    console.log('🚀 SAVE DEBUG - saveRolePermissions called');
    
    if (!selectedRole) {
      console.warn('⚠️ SAVE DEBUG - No selected role');
      return;
    }
    
    try {
      // Invia TUTTI i permessi (sia granted che non granted)
      // Il backend ha bisogno di sapere quali permessi disabilitare
      const permissionsToSave = Object.values(rolePermissions);
      
      console.log('🔍 SAVE DEBUG - Role:', selectedRole.type);
      console.log('🔍 SAVE DEBUG - Total permissions in state:', Object.keys(rolePermissions).length);
      console.log('🔍 SAVE DEBUG - Granted permissions:', permissionsToSave.filter(p => p.granted).length);
      console.log('🔍 SAVE DEBUG - Permissions to save:', permissionsToSave);
      
      // Verifica che ci siano permessi da salvare
      if (permissionsToSave.length === 0) {
        console.warn('⚠️ No permissions to save');
        showError('Nessun permesso da salvare');
        return;
      }
      
      const payload = { permissions: permissionsToSave };
      console.log('🔍 SAVE DEBUG - Payload:', JSON.stringify(payload, null, 2));
      
      const response = await apiPut(`/api/roles/${selectedRole.type}/permissions`, payload);
      console.log('🔍 SAVE DEBUG - Response:', response);
      
      showSuccess('Permessi aggiornati con successo');
      
      // Ricarica i permessi per verificare che siano stati salvati
      setTimeout(() => {
        console.log('🔄 Reloading permissions to verify save...');
        loadRolePermissions(selectedRole.type);
      }, 1000);
      
    } catch (err: any) {
      console.error('🚨 SAVE ERROR:', err);
      console.error('🚨 SAVE ERROR Response:', err.response?.data);
      showError(err.response?.data?.error || 'Errore durante l\'aggiornamento dei permessi');
    }
  };

  const handlePermissionAssignment = async (userId: string, permissions: string[]) => {
    try {
      // Implementa la logica per assegnare i permessi all'utente
      await apiPut(`/api/users/${userId}/permissions`, { permissions });
      showSuccess('Permessi assegnati con successo');
      setShowPermissionAssignment(false);
      setSelectedUserForPermissions(null);
    } catch (err: any) {
      showError('Errore durante l\'assegnazione dei permessi');
    }
  };

  const openPermissionAssignment = (user: any) => {
    setSelectedUserForPermissions(user);
    setShowPermissionAssignment(true);
  };

  const getPermissionsByEntity = (entity: string) => {
    // Genera automaticamente tutti i permessi CRUD per ogni entità
    // Usa lo stesso formato di getPermissionKey: ACTION_ENTITY
    const crudActions = ['view', 'create', 'edit', 'delete'];
    const generatedPermissions = crudActions.map(action => {
      const permissionKey = getPermissionKey(entity, action);
      return {
        id: permissionKey,
        name: permissionKey,
        description: `${translatePermissionAction(action)} ${entity}`,
        category: entity,
        entity: entity,
        action: action
      };
    });
    
    return generatedPermissions;
  };

  // Traduzione dei nomi dei permessi in italiano
  const translatePermissionAction = (action: string) => {
    const translations: Record<string, string> = {
      'view': 'Visualizzare',
      'read': 'Visualizzare',
      'create': 'Creare',
      'edit': 'Modificare',
      'update': 'Modificare',
      'delete': 'Eliminare',
      'manage': 'Gestire',
      'admin': 'Amministrare'
    };
    return translations[action.toLowerCase()] || action;
  };

  // Mostra loading se l'autenticazione è in corso
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Verifica autenticazione...</p>
        </div>
      </div>
    );
  }

  // Mostra messaggio se l'utente non è autenticato
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-500">Accesso richiesto per visualizzare i ruoli</p>
        </div>
      </div>
    );
  }

  // Controllo dei permessi per la gestione dei ruoli
  const hasRoleAccess = hasPermission('roles', 'read') || hasPermission('ROLE_MANAGEMENT', '');
  if (!hasRoleAccess) {
    return (
      <div className="text-center py-8">
        <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Accesso Negato</h3>
        <p className="text-gray-600">Non hai i permessi necessari per gestire i ruoli.</p>
        <p className="text-sm text-gray-500 mt-2">Richiedi l'accesso al tuo amministratore di sistema.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-4 flex justify-center">Caricamento...</div>;
  }

  return (
    <div className="h-full bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      {/* Header principale con gradiente moderno */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestione Ruoli e Permessi</h1>
              <p className="text-sm text-gray-600 mt-1">Configura ruoli, permessi e accessi per gli utenti</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messaggi di stato con design moderno */}
      {error && (
        <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl shadow-sm">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
            <span className="text-red-800 font-medium">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow-sm">
          <div className="flex items-center">
            <Check className="w-5 h-5 text-green-600 mr-3" />
            <span className="text-green-800 font-medium">{success}</span>
          </div>
        </div>
      )}

      {/* Layout principale con card moderne */}
      <div className="flex gap-6 h-[calc(100vh-200px)]">
        {/* Left side - Roles management - FISSO A 1/3 */}
        <div className="w-1/3 min-w-0 flex flex-col space-y-4">
          
          {/* Roles list - COMPATTA */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 flex-1 overflow-hidden backdrop-blur-sm bg-white/90">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-blue-600" />
                  Ruoli Esistenti
                </h3>
              </div>
            </div>
            <div className="overflow-y-auto h-full p-4">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Caricamento ruoli...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {roles.map((role) => (
                    <div
                      key={role.type}
                      className={`group p-4 rounded-xl border cursor-pointer transition-all duration-300 transform hover:scale-102 ${
                        selectedRole?.type === role.type
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 shadow-md ring-2 ring-blue-200'
                          : 'bg-white border-gray-200 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 hover:border-blue-200 hover:shadow-md'
                      }`}
                      onClick={() => handleSelectRole(role)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm truncate flex items-center">
                            <div className={`w-3 h-3 rounded-full mr-2 ${
                              role.isActive ? 'bg-green-500' : 'bg-gray-400'
                            }`}></div>
                            {role.name}
                          </h4>
                          {role.description && (
                            <p className="text-xs text-gray-600 mt-2 line-clamp-2">{role.description}</p>
                          )}
                          <div className="flex items-center mt-2 text-xs text-gray-500">
                            <Users className="w-3 h-3 mr-1" />
                            <span>{role.userCount || 0} utenti</span>
                          </div>
                        </div>
                        
                        {/* Azioni con design moderno */}
                        <div className="flex gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRole(role.type);
                            }}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200"
                            title="Elimina"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right side - Permissions - FISSO A 2/3 */}
        <div className="w-2/3 min-w-0 flex flex-col">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 h-full flex flex-col overflow-hidden backdrop-blur-sm bg-white/90">
            {/* Header con titolo e pulsante salvataggio - SEMPRE VISIBILE */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <UserCheck className="w-5 h-5 mr-2 text-blue-600" />
                  Gestione Permessi e Tenant
                  {selectedRole && (
                    <span className="ml-3 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      {selectedRole.name}
                    </span>
                  )}
                </h3>
                {selectedRole && (
                  <button
                    onClick={saveRolePermissions}
                    className="px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-full hover:from-green-700 hover:to-emerald-700 transition-all duration-300 text-xs font-medium shadow-md hover:shadow-lg flex items-center space-x-1.5 transform hover:scale-105"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Salva Permessi</span>
                  </button>
                )}
              </div>
            </div>

            {selectedRole ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Entity navigation - POSIZIONATA CORRETTAMENTE SOTTO L'HEADER */}
                <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div 
                    className="flex gap-2 overflow-x-auto scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {entities.map((entity) => (
                      <button
                        key={entity.key}
                        onClick={() => {
                          setActiveEntity(entity.key);
                          scrollToEntity(entity.key);
                        }}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 transform hover:scale-105 flex items-center space-x-2 ${
                          activeEntity === entity.key
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md ring-2 ring-blue-300'
                            : 'bg-white text-gray-700 hover:bg-gradient-to-r hover:from-blue-100 hover:to-indigo-100 border border-blue-200 hover:border-blue-300 shadow-sm hover:shadow-md'
                        }`}
                      >
                        <entity.icon className="w-4 h-4" />
                        <span>{entity.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Permissions content - SCROLLABILE */}
                <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-gray-50 to-blue-50" ref={permissionsContentRef}>
                  <div className="space-y-6">
                    {entities.map((entity) => {
                      const entityPermissions = getPermissionsByEntity(entity.key);
                      
                      return (
                        <div
                          key={entity.key}
                          id={`entity-${entity.key}`}
                          className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 backdrop-blur-sm bg-white/95"
                        >
                          <h4 className="text-base font-semibold text-gray-900 capitalize mb-6 pb-3 border-b border-gray-200 flex items-center">
                            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-md mr-3">
                              <entity.icon className="w-4 h-4 text-white" />
                            </div>
                            <span>{entity.label}</span>
                          </h4>
                            
                            {/* LAYOUT CRUD 2x2 - OTTIMIZZATO */}
                            <div className="grid grid-cols-2 gap-4">
                              {entityPermissions.map((permission) => {
                                if (!permission.entity || !permission.action) {
                                  return null;
                                }
                                
                                const permissionKey = getPermissionKey(permission.entity, permission.action);
                                const rolePermission = rolePermissions[permissionKey];
                                const isGranted = rolePermission?.granted || false;
                                const scope = rolePermission?.scope || 'all';
                                const tenantIds = rolePermission?.tenantIds || [];
                                const fieldRestrictions = rolePermission?.fieldRestrictions || [];

                                // Icone moderne per le azioni CRUD con colori
                                const actionIcons: Record<string, JSX.Element> = {
                                  view: <Eye className="w-4 h-4 text-blue-600" />,
                                  create: <Plus className="w-4 h-4 text-green-600" />,
                                  edit: <Edit className="w-4 h-4 text-amber-600" />,
                                  delete: <Trash2 className="w-4 h-4 text-red-600" />
                                };

                                const actionColors: Record<string, string> = {
                                  view: 'bg-blue-50 border-blue-200',
                                  create: 'bg-green-50 border-green-200',
                                  edit: 'bg-amber-50 border-amber-200',
                                  delete: 'bg-red-50 border-red-200'
                                };

                                const ringColors: Record<string, string> = {
                                  view: 'ring-blue-300',
                                  create: 'ring-green-300',
                                  edit: 'ring-amber-300',
                                  delete: 'ring-red-300'
                                };

                                const colorClass = actionColors[permission.action] || 'bg-gray-50 border-gray-200';
                                const ringClass = ringColors[permission.action] || 'ring-gray-300';

                                return (
                                  <div 
                                    key={permissionKey} 
                                    className={`${colorClass} rounded-xl p-4 border hover:shadow-md transition-all duration-300 ${
                                      isGranted ? `ring-2 ring-opacity-50 ${ringClass}` : ''
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-4">
                                      <div className="flex items-center space-x-3">
                                        <input
                                          type="checkbox"
                                          checked={isGranted}
                                          onChange={(e) => handlePermissionChange(permissionKey, e.target.checked)}
                                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-all duration-200"
                                        />
                                        <div className="flex items-center space-x-2">
                                          <div className="p-1.5 bg-white rounded-lg shadow-sm">
                                            {actionIcons[permission.action] || <FileText className="w-4 h-4 text-gray-600" />}
                                          </div>
                                          <span className="font-medium text-gray-900 text-sm">
                                            {translatePermissionAction(permission.action)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {isGranted && (
                                      <div className="space-y-3 ml-6">
                                        {/* Scope selection - DROPDOWN A PILLOLA OTTIMIZZATO */}
                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center">
                                            <Target className="w-3 h-3 mr-1 text-blue-600" />
                                            Ambito di applicazione
                                          </label>
                                          <div className="relative">
                                            <select
                                              value={scope}
                                              onChange={(e) => handlePermissionChange(permissionKey, true, e.target.value)}
                                              className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none cursor-pointer hover:border-gray-400 transition-colors"
                                              style={{
                                                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                                                backgroundPosition: 'right 0.5rem center',
                                                backgroundRepeat: 'no-repeat',
                                                backgroundSize: '1.2em 1.2em',
                                                paddingRight: '2rem'
                                              }}
                                            >
                                              <option value="all">🌐 Tutti i record</option>
                                              <option value="own">👤 Solo i propri record</option>
                                              <option value="tenant">🏢 Per tenant specifici</option>
                                            </select>
                                          </div>
                                        </div>

                                        {/* Tenant selection */}
                                        {scope === 'tenant' && (
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center">
                                              <Building2 className="w-3 h-3 mr-1 text-blue-600" />
                                              Tenant autorizzati
                                            </label>
                                            {tenantsLoading ? (
                                              <div className="text-xs text-gray-500 p-2 flex items-center">
                                                <Layers className="w-3 h-3 mr-1 animate-spin" />
                                                Caricamento tenant...
                                              </div>
                                            ) : (
                                              <div className="space-y-1.5 max-h-24 overflow-y-auto bg-white border border-gray-200 rounded-lg p-2">
                                                {tenants.map((tenant) => (
                                                  <label key={tenant.id} className="flex items-center hover:bg-gray-50 p-1 rounded cursor-pointer">
                                                    <input
                                                      type="checkbox"
                                                      checked={tenantIds.includes(tenant.id)}
                                                      onChange={(e) => handleTenantChange(permissionKey, tenant.id, e.target.checked)}
                                                      className="mr-2 h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                    />
                                                    <span className="text-xs text-gray-700">{tenant.name}</span>
                                                  </label>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {/* Field restrictions */}
                                        {fieldPermissions[entity.key] && (
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center">
                                              <Eye className="w-3 h-3 mr-1 text-blue-600" />
                                              Campi visibili
                                            </label>
                                            <div className="space-y-1.5 max-h-24 overflow-y-auto bg-white border border-gray-200 rounded-lg p-2">
                                              {fieldPermissions[entity.key].map((field) => (
                                                <label key={field.key} className="flex items-center hover:bg-gray-50 p-1 rounded cursor-pointer">
                                                  <input
                                                    type="checkbox"
                                                    checked={!fieldRestrictions.includes(field.key)}
                                                    onChange={(e) => handleFieldRestrictionChange(permissionKey, field.key, !e.target.checked)}
                                                    className="mr-2 h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                  />
                                                  <span className="text-xs text-gray-700">{field.label}</span>
                                                </label>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-blue-50">
                  <div className="text-center p-8">
                    <div className="p-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-lg mb-6 inline-block">
                      <Shield className="w-16 h-16 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Seleziona un ruolo</h3>
                    <p className="text-gray-600 text-base mb-4">Gestisci permessi e accessi per gli utenti</p>
                    <p className="text-gray-500 text-sm">Scegli un ruolo dalla lista a sinistra per iniziare</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {showPermissionAssignment && selectedUserForPermissions && (
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
              <PermissionAssignment
                targetUserId={selectedUserForPermissions.id}
                targetUserName={selectedUserForPermissions.name || selectedUserForPermissions.email}
                targetUserRole={selectedUserForPermissions.currentRole || 'EMPLOYEE'}
                onClose={() => {
                  setShowPermissionAssignment(false);
                  setSelectedUserForPermissions(null);
                }}
                onSuccess={() => {
                  showSuccess('Permessi assegnati con successo');
                  // Ricarica i dati se necessario
                }}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

export default RolesTab;