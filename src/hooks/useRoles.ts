import { useState, useCallback, useRef } from 'react';
import { getRoles, getRolePermissions, getRoleHierarchy } from '../services/roles';
import { apiDelete } from '../services/api';

export interface Role {
  type: string;
  name: string;
  description?: string;
  userCount?: number;
  persons?: Person[];
  permissions?: string[];
  level?: number;
  isSystemRole?: boolean;
}

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

// Cache per evitare richieste duplicate
let rolesCache: { data: Role[]; timestamp: number } | null = null;
const CACHE_DURATION = 30000; // 30 secondi

export const useRoles = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const loadRoles = useCallback(async (forceRefresh = false) => {
    // Evita richieste multiple simultanee
    if (loadingRef.current && !forceRefresh) {
      console.log('🔄 useRoles: Request already in progress, skipping');
      return;
    }

    // Controlla cache se non è un refresh forzato
    if (!forceRefresh && rolesCache && Date.now() - rolesCache.timestamp < CACHE_DURATION) {
      console.log('📦 useRoles: Using cached data');
      setRoles(rolesCache.data);
      return;
    }

    // Debouncing per evitare troppe richieste
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      try {
        loadingRef.current = true;
        setLoading(true);
        setError(null);
        
        console.log('🔄 useRoles: Loading roles and hierarchy...');
        
        // Carica prima la gerarchia (più leggera) poi i ruoli
        const hierarchyResponse = await getRoleHierarchy();
        const rolesResponse = await getRoles();
        
        // Gestisce il formato del response dei ruoli base
        const rolesArray = rolesResponse.roles || [];
        
        // Integra i ruoli con le informazioni dalla gerarchia
        const enrichedRoles = rolesArray.map(role => {
          const hierarchyInfo = hierarchyResponse[role.type];
          return {
            ...role,
            // Usa le informazioni dalla gerarchia se disponibili
            name: hierarchyInfo?.name || role.name,
            description: hierarchyInfo?.description || role.description,
            level: hierarchyInfo?.level,
            isSystemRole: true, // Per ora consideriamo tutti i ruoli come di sistema
            permissions: hierarchyInfo?.permissions || role.permissions || []
          };
        });
        
        // Aggiungi ruoli dalla gerarchia che non sono nei ruoli base (custom roles)
        Object.entries(hierarchyResponse).forEach(([roleType, hierarchyRole]: [string, { name: string; description: string; level: number; permissions?: string[] }]) => {
          if (!enrichedRoles.find(r => r.type === roleType)) {
            enrichedRoles.push({
              type: roleType,
              name: hierarchyRole.name,
              description: hierarchyRole.description,
              level: hierarchyRole.level,
              isSystemRole: false,
              userCount: 0,
              permissions: hierarchyRole.permissions || []
            });
          }
        });
        
        // Ordina per livello gerarchico
        enrichedRoles.sort((a, b) => (a.level || 999) - (b.level || 999));
        
        // Aggiorna cache
        rolesCache = {
          data: enrichedRoles,
          timestamp: Date.now()
        };
        
        setRoles(enrichedRoles);
        console.log('✅ useRoles: Roles loaded successfully', { count: enrichedRoles.length });
      } catch (err: unknown) {
        console.error('❌ useRoles: Error loading roles:', err);
        
        // Gestione errori specifica per ERR_INSUFFICIENT_RESOURCES
        const error = err as { code?: string; message?: string };
        if (error.code === 'ERR_INSUFFICIENT_RESOURCES' || error.message?.includes('ERR_INSUFFICIENT_RESOURCES')) {
          setError('Troppe richieste simultanee. Riprova tra qualche secondo.');
        } else if (error.code === 'ERR_NETWORK') {
          setError('Errore di rete. Controlla la connessione.');
        } else {
          setError('Errore nel caricamento dei ruoli');
        }
        
        // Usa cache se disponibile in caso di errore
        if (rolesCache && Date.now() - rolesCache.timestamp < CACHE_DURATION * 2) {
          console.log('📦 useRoles: Using cached data due to error');
          setRoles(rolesCache.data);
        } else {
          setRoles([]);
        }
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    }, 100); // Debounce di 100ms
  }, []);

  const loadRolePermissions = useCallback(async (roleType: string) => {
    try {
      const permissions = await getRolePermissions(roleType);
      setSelectedRole(prev => prev ? { ...prev, permissions } : null);
    } catch (err) {
      console.error('Error loading role permissions:', err);
    }
  }, []);

  const selectRole = useCallback(async (role: Role) => {
    setSelectedRole(role);
    // Carica i permessi del ruolo selezionato
    try {
      const permissions = await getRolePermissions(role.type);
      setSelectedRole({ ...role, permissions });
    } catch (err) {
      console.error('Error loading role permissions:', err);
      setSelectedRole(role);
    }
  }, []);

  const handleSelectRole = useCallback(async (role: Role) => {
    setSelectedRole(role);
    // Carica i permessi del ruolo selezionato
    try {
      const permissions = await getRolePermissions(role.type);
      setSelectedRole({ ...role, permissions });
    } catch (err) {
      console.error('Error loading role permissions:', err);
      setSelectedRole(role);
    }
  }, []);

  const deleteRole = useCallback(async (roleType: string) => {
    try {
      await apiDelete(`/api/roles/${roleType}`);
      await loadRoles();
      if (selectedRole?.type === roleType) {
        setSelectedRole(null);
      }
    } catch (err) {
      console.error('Error deleting role:', err);
      throw err;
    }
  }, [selectedRole, loadRoles]);

  const handleDeleteRole = useCallback(async (roleType: string) => {
    try {
      await apiDelete(`/api/roles/${roleType}`);
      await loadRoles();
      if (selectedRole?.type === roleType) {
        setSelectedRole(null);
      }
    } catch (err) {
      console.error('Error deleting role:', err);
      throw err;
    }
  }, [selectedRole, loadRoles]);

  return {
    roles,
    selectedRole,
    loading,
    error,
    rolesLoading: loading,
    rolesError: error,
    loadRoles,
    loadRolePermissions,
    selectRole,
    deleteRole,
    handleSelectRole,
    handleDeleteRole,
    setSelectedRole
  };
};