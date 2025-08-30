import { VirtualEntityName, PermissionAction } from './types';
import { apiService } from '../api';

/**
 * Servizio per la gestione delle entità virtuali (EMPLOYEES, TRAINERS)
 * Queste entità sono basate su Person ma con filtri specifici
 */
export class VirtualEntityService {
  /**
   * Assegna permessi entità virtuali a un ruolo
   */
  async assignVirtualEntityPermissions(
    roleId: string, 
    virtualEntityName: VirtualEntityName, 
    permissions: string[]
  ): Promise<void> {
    try {
      await apiService.post('/virtual-entities/permissions/assign', {
        roleId,
        virtualEntityName,
        permissions
      });
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Errore nell\'assegnazione dei permessi';
      console.error('Errore nell\'assegnazione permessi entità virtuali:', message);
      throw new Error(message);
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
      await apiService.deleteWithPayload('/virtual-entities/permissions/revoke', {
        roleId,
        virtualEntityName,
        permissions
      });
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Errore nella rimozione dei permessi';
      console.error('Errore nella rimozione permessi entità virtuali:', message);
      throw new Error(message);
    }
  }

  /**
   * Ottiene i permessi entità virtuali di un ruolo
   */
  async getRoleVirtualEntityPermissions(roleId: string): Promise<any[]> {
    try {
      const result = await apiService.get<any>(`/virtual-entities/permissions/role/${roleId}`);
      return result?.data || result || [];
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Errore nel recupero dei permessi del ruolo';
      console.error('Errore nel recupero permessi ruolo entità virtuali:', message);
      throw new Error(message);
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
      const result = await apiService.post<any>('/virtual-entities/permissions/check', {
        virtualEntityName,
        action
      });

      return result?.data?.hasPermission ?? result?.hasPermission ?? false;
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
      const result = await apiService.get<any>('/virtual-entities/permissions');
      return result?.data || result || {};
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Errore nel recupero dei permessi delle entità virtuali';
      console.error('Errore nel recupero permessi entità virtuali:', message);
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