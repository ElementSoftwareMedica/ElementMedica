import { apiGet, apiPost, apiPut } from '../api';
import { EntityPermission, EntityDefinition, PermissionsSummary } from './types';
import { ALL_ENTITY_DEFINITIONS, CRITICAL_ENTITIES } from './entityDefinitions';
import { convertFromBackendFormat, convertToBackendFormat } from './conversionUtils';
import { getPermissionsSummary, validatePermission, groupPermissionsByEntity } from './permissionUtils';
import { virtualEntityService } from './virtualEntityService';
import { getRoleTypeFromDisplayName } from '../roleHierarchyService';

/**
 * Servizio principale per la gestione dei permessi avanzati
 * Refactorizzato per essere più modulare e manutenibile
 */
export class AdvancedPermissionsService {
  private baseUrl = '/api/advanced-permissions';

  /**
   * Ottiene le definizioni delle entità del sistema
   * Include sia le entità standard che quelle virtuali (employees, trainers)
   */
  async getEntityDefinitions(): Promise<EntityDefinition[]> {
    try {
      console.log('[AdvancedPermissions] Caricamento entità dal backend...');
      const response = await apiGet<{ success: boolean; entities: EntityDefinition[] }>(`${this.baseUrl}/entities`);
      
      if (response.success && response.entities) {
        console.log('[AdvancedPermissions] Entità caricate dal backend:', response.entities.length);
        console.log('[AdvancedPermissions] Entità dal backend:', response.entities.map(e => e.name));
        
        // Verifica se le entità critiche sono presenti
        const missingEntities = CRITICAL_ENTITIES.filter(entity => 
          !response.entities.some(e => e.name === entity)
        );
        
        if (missingEntities.length > 0) {
          console.warn('[AdvancedPermissions] Entità mancanti dal backend:', missingEntities);
          console.log('[AdvancedPermissions] Uso fallback statico per avere tutte le entità');
          return this.getStaticEntityDefinitionsWithVirtual();
        }
        
        // Aggiungi le entità virtuali alla lista delle entità dal backend
        return this.mergeWithVirtualEntities(response.entities);
      } else {
        console.warn('[AdvancedPermissions] Risposta backend non valida, uso fallback');
        return this.getStaticEntityDefinitionsWithVirtual();
      }
    } catch (error) {
      console.error('[AdvancedPermissions] Errore nel caricamento entità dal backend:', error);
      console.log('[AdvancedPermissions] Uso definizioni statiche come fallback');
      
      const staticEntities = this.getStaticEntityDefinitionsWithVirtual();
      console.log('[AdvancedPermissions] Entità statiche caricate:', staticEntities.length);
      console.log('[AdvancedPermissions] Entità statiche:', staticEntities.map(e => e.name));
      return staticEntities;
    }
  }

  /**
   * Ottiene i permessi di un ruolo specifico
   */
  async getRolePermissions(roleIdentifier: string): Promise<EntityPermission[]> {
    try {
      // Converte il nome visualizzato in roleType se necessario
      const roleType = getRoleTypeFromDisplayName(roleIdentifier);
      
      console.log(`🔍 [AdvancedPermissions] Getting permissions for role: ${roleIdentifier} -> ${roleType}`);
      
      // Usa l'endpoint corretto per ottenere i permessi del ruolo
      const response = await apiGet<{
        success: boolean;
        data: {
          roleType: string;
          permissions: any[];
          isCustomRole: boolean;
          tenantId: string;
        };
      }>(`/api/roles/${roleType}/permissions`);
      
      // Usa la struttura corretta della risposta
      const allPermissions = response.data?.permissions || [];
      
      // Converte i permessi dal formato backend al formato frontend
      return convertFromBackendFormat(allPermissions);
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      return [];
    }
  }

  /**
   * Aggiorna i permessi di un ruolo
   */
  async updateRolePermissions(roleIdentifier: string, permissions: EntityPermission[]): Promise<boolean> {
    try {
      // Converte il nome visualizzato in roleType se necessario
      const roleType = getRoleTypeFromDisplayName(roleIdentifier);
      
      console.log(`🔄 [AdvancedPermissions] Updating permissions for role: ${roleIdentifier} -> ${roleType}`);
      
      // Converte i permessi dal formato frontend al formato backend
      const backendPermissions = convertToBackendFormat(permissions);
      
      const response = await apiPut<{
        success: boolean;
        message: string;
      }>(`/api/roles/${roleType}/permissions`, {
        permissions: backendPermissions
      });
      
      return response.success;
    } catch (error) {
      console.error('Error updating role permissions:', error);
      return false;
    }
  }

  /**
   * Verifica se un ruolo ha un permesso specifico
   */
  async checkPermission(
    roleType: string, 
    entity: string, 
    action: string, 
    scope?: string, 
    field?: string
  ): Promise<boolean> {
    try {
      const response = await apiPost<{ hasPermission: boolean }>(`${this.baseUrl}/check`, {
        roleType,
        entity,
        action,
        scope,
        field
      });
      return response.hasPermission;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Ottiene tutti i permessi disponibili per un'entità
   */
  async getAvailablePermissions(entity: string): Promise<string[]> {
    try {
      const response = await apiGet<{ permissions: string[] }>(`${this.baseUrl}/entities/${entity}/permissions`);
      return response.permissions;
    } catch (error) {
      console.error('Error fetching available permissions:', error);
      return ['create', 'read', 'update', 'delete'];
    }
  }

  /**
   * Ottiene le definizioni statiche delle entità (fallback)
   */
  private getStaticEntityDefinitions(): EntityDefinition[] {
    return ALL_ENTITY_DEFINITIONS;
  }

  /**
   * Ottiene le definizioni statiche delle entità includendo quelle virtuali
   */
  private getStaticEntityDefinitionsWithVirtual(): EntityDefinition[] {
    const allEntities = [...ALL_ENTITY_DEFINITIONS];
    
    // Assicurati che le entità virtuali siano incluse
    const hasEmployees = allEntities.some(e => e.name === 'employees');
    const hasTrainers = allEntities.some(e => e.name === 'trainers');
    
    if (!hasEmployees || !hasTrainers) {
      console.log('[AdvancedPermissions] Aggiunta entità virtuali mancanti');
    }
    
    return allEntities;
  }

  /**
   * Unisce le entità dal backend con quelle virtuali
   */
  private mergeWithVirtualEntities(backendEntities: EntityDefinition[]): EntityDefinition[] {
    const allEntities = [...backendEntities];
    
    // Trova le entità virtuali dalle definizioni statiche
    const virtualEntities = ALL_ENTITY_DEFINITIONS.filter(entity => 
      ['employees', 'trainers'].includes(entity.name)
    );
    
    // Aggiungi le entità virtuali se non sono già presenti
    virtualEntities.forEach(virtualEntity => {
      const exists = allEntities.some(e => e.name === virtualEntity.name);
      if (!exists) {
        console.log(`[AdvancedPermissions] Aggiunta entità virtuale: ${virtualEntity.name}`);
        allEntities.push(virtualEntity);
      }
    });
    
    console.log('[AdvancedPermissions] Entità totali (con virtuali):', allEntities.length);
    console.log('[AdvancedPermissions] Entità finali:', allEntities.map((e: EntityDefinition) => e.name));
    
    return allEntities;
  }

  // Metodi di utility delegati ai moduli specifici
  
  /**
   * Valida un permesso
   */
  validatePermission(permission: EntityPermission): boolean {
    return validatePermission(permission);
  }

  /**
   * Raggruppa i permessi per entità
   */
  groupPermissionsByEntity(permissions: EntityPermission[]): Record<string, EntityPermission[]> {
    return groupPermissionsByEntity(permissions);
  }

  /**
   * Ottiene un riassunto dei permessi per un ruolo
   */
  getPermissionsSummary(permissions: EntityPermission[]): PermissionsSummary {
    return getPermissionsSummary(permissions);
  }

  /**
   * Converte i permessi dal formato backend al formato frontend
   */
  convertFromBackendFormat(backendPermissions: any[]): EntityPermission[] {
    return convertFromBackendFormat(backendPermissions);
  }

  /**
   * Converte i permessi dal formato frontend al formato backend
   */
  convertToBackendFormat(frontendPermissions: EntityPermission[]): any[] {
    return convertToBackendFormat(frontendPermissions);
  }

  // Metodi per entità virtuali delegati al VirtualEntityService

  /**
   * Assegna permessi entità virtuali a un ruolo
   */
  async assignVirtualEntityPermissions(
    roleId: string, 
    virtualEntityName: 'EMPLOYEES' | 'TRAINERS', 
    permissions: string[]
  ): Promise<void> {
    return virtualEntityService.assignVirtualEntityPermissions(roleId, virtualEntityName, permissions);
  }

  /**
   * Rimuove permessi entità virtuali da un ruolo
   */
  async revokeVirtualEntityPermissions(
    roleId: string, 
    virtualEntityName: 'EMPLOYEES' | 'TRAINERS', 
    permissions: string[]
  ): Promise<void> {
    return virtualEntityService.revokeVirtualEntityPermissions(roleId, virtualEntityName, permissions);
  }

  /**
   * Ottiene i permessi entità virtuali di un ruolo
   */
  async getRoleVirtualEntityPermissions(roleId: string): Promise<any[]> {
    return virtualEntityService.getRoleVirtualEntityPermissions(roleId);
  }

  /**
   * Verifica se l'utente corrente ha un permesso specifico su un'entità virtuale
   */
  async checkVirtualEntityPermission(
    virtualEntityName: 'EMPLOYEES' | 'TRAINERS', 
    action: 'VIEW' | 'CREATE' | 'EDIT' | 'DELETE'
  ): Promise<boolean> {
    return virtualEntityService.checkVirtualEntityPermission(virtualEntityName, action);
  }

  /**
   * Ottiene i permessi delle entità virtuali per l'utente corrente
   */
  async getVirtualEntityPermissions(): Promise<any> {
    return virtualEntityService.getVirtualEntityPermissions();
  }

  /**
   * Verifica se un'entità è virtuale (basata su Person)
   */
  isVirtualEntity(entityName: string): boolean {
    return virtualEntityService.isVirtualEntity(entityName);
  }

  /**
   * Ottiene il nome dell'entità virtuale nel formato backend
   */
  getVirtualEntityBackendName(entityName: string): 'EMPLOYEES' | 'TRAINERS' | null {
    return virtualEntityService.getVirtualEntityBackendName(entityName);
  }
}