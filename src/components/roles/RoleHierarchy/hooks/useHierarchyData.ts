/**
 * Hook: useHierarchyData
 * 
 * Manages hierarchy data loading and authentication state.
 * Handles API calls to fetch role hierarchy and current user context.
 */

import { useState, useEffect } from 'react';
import { getRoleHierarchy, getCurrentUserRoleHierarchy, UserRoleHierarchy } from '../../../../services/roles';
import { isAuthenticated } from '../../../../services/auth';
import type { RoleHierarchyType, HierarchyState } from '../types';

export const useHierarchyData = () => {
  const [hierarchy, setHierarchy] = useState<RoleHierarchyType>({});
  const [currentUserHierarchy, setCurrentUserHierarchy] = useState<UserRoleHierarchy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHierarchyData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Verifica autenticazione
      const authenticated = await isAuthenticated();
      if (!authenticated) {
        setError('Accesso non autorizzato. Effettua il login per continuare.');
        setLoading(false);
        return;
      }

      // Carica gerarchia e contesto utente in parallelo
      const [hierarchyData, userHierarchyData] = await Promise.all([
        getRoleHierarchy(),
        getCurrentUserRoleHierarchy()
      ]);

      setHierarchy(hierarchyData);
      setCurrentUserHierarchy(userHierarchyData);
    } catch (err: unknown) {

      // Gestione errori specifici
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response: { status: number } }).response;

        if (response.status === 401) {
          setError('Accesso non autorizzato. Effettua il login per continuare.');
        } else if (response.status === 403) {
          setError('Non hai i permessi necessari per visualizzare la gerarchia dei ruoli.');
        } else if (response.status === 404) {
          setError('Gerarchia dei ruoli non trovata. Contatta l\'amministratore.');
        } else {
          setError('Si è verificato un errore durante il caricamento della gerarchia.');
        }
      } else {
        setError('Si è verificato un errore imprevisto. Riprova più tardi.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Carica i dati al mount del componente
  useEffect(() => {
    loadHierarchyData();
  }, []);

  return {
    hierarchy,
    currentUserHierarchy,
    loading,
    error,
    loadHierarchyData
  };
};
