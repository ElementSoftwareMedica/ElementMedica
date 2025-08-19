import { VirtualEntityName, PermissionAction } from './types';

/**
 * Servizio per la gestione delle entità virtuali (EMPLOYEES, TRAINERS)
 * Queste entità sono basate su Person ma con filtri specifici
 */
export class VirtualEntityService {
  private getAuthHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    };
  }

  /**
   * Assegna permessi entità virtuali a un ruolo
   */
  async assignVirtualEntityPermissions(
    roleId: string, 
    virtualEntityName: VirtualEntityName, 
    permissions: string[]
  ): Promise<void> {
    try {
      const response = await fetch('/api/virtual-entities/permissions/assign', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          roleId,
          virtualEntityName,
          permissions
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Errore nell\'assegnazione dei permessi');
      }
    } catch (error) {
      console.error('Errore nell\'assegnazione permessi entità virtuali:', error);
      throw error;
    }
  }

  /**
   * Rimuove permessi entità virtuali da un ruolo
   */
  async revokeVirtualEntityPermissions(
    roleId: string, 
    virtualEntityName: VirtualEntityName, 
    permissions: string[]
  ): Promise<void> {
    try {
      const response = await fetch('/api/virtual-entities/permissions/revoke', {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          roleId,
          virtualEntityName,
          permissions
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Errore nella rimozione dei permessi');
      }
    } catch (error) {
      console.error('Errore nella rimozione permessi entità virtuali:', error);
      throw error;
    }
  }

  /**
   * Ottiene i permessi entità virtuali di un ruolo
   */
  async getRoleVirtualEntityPermissions(roleId: string): Promise<any[]> {
    try {
      const response = await fetch(`/api/virtual-entities/permissions/role/${roleId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Errore nel recupero dei permessi del ruolo');
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Errore nel recupero permessi ruolo entità virtuali:', error);
      throw error;
    }
  }

  /**
   * Verifica se l'utente corrente ha un permesso specifico su un'entità virtuale
   */
  async checkVirtualEntityPermission(
    virtualEntityName: VirtualEntityName, 
    action: PermissionAction
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/virtual-entities/permissions/check', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          virtualEntityName,
          action
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Errore nella verifica del permesso');
      }

      const result = await response.json();
      return result.data?.hasPermission || false;
    } catch (error) {
      console.error('Errore nella verifica permesso entità virtuale:', error);
      return false;
    }
  }

  /**
   * Ottiene i permessi delle entità virtuali per l'utente corrente
   */
  async getVirtualEntityPermissions(): Promise<any> {
    try {
      const response = await fetch('/api/virtual-entities/permissions', {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Errore nel recupero dei permessi delle entità virtuali');
      }

      const result = await response.json();
      return result.data || {};
    } catch (error) {
      console.error('Errore nel recupero permessi entità virtuali:', error);
      return {};
    }
  }

  /**
   * Verifica se un'entità è virtuale (basata su Person)
   */
  isVirtualEntity(entityName: string): boolean {
    return ['employees', 'trainers'].includes(entityName.toLowerCase());
  }

  /**
   * Ottiene il nome dell'entità virtuale nel formato backend
   */
  getVirtualEntityBackendName(entityName: string): VirtualEntityName | null {
    const mapping: Record<string, VirtualEntityName> = {
      'employees': 'EMPLOYEES',
      'trainers': 'TRAINERS'
    };
    return mapping[entityName.toLowerCase()] || null;
  }

  /**
   * Ottiene tutte le entità virtuali disponibili
   */
  getAvailableVirtualEntities(): Array<{ name: string; displayName: string; backendName: VirtualEntityName }> {
    return [
      {
        name: 'employees',
        displayName: 'Dipendenti',
        backendName: 'EMPLOYEES'
      },
      {
        name: 'trainers',
        displayName: 'Formatori',
        backendName: 'TRAINERS'
      }
    ];
  }

  /**
   * Ottiene le azioni disponibili per le entità virtuali
   */
  getAvailableActions(): Array<{ action: PermissionAction; displayName: string }> {
    return [
      { action: 'VIEW', displayName: 'Visualizzare' },
      { action: 'CREATE', displayName: 'Creare' },
      { action: 'EDIT', displayName: 'Modificare' },
      { action: 'DELETE', displayName: 'Eliminare' }
    ];
  }
}

export const virtualEntityService = new VirtualEntityService();