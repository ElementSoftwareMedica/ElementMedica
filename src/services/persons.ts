import { apiGet, apiDelete, apiPost, apiPut, apiDeleteWithPayload } from './api';

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phone?: string;
  residenceAddress?: string;
  position?: string;
  department?: string;
  companyId?: string | number; // ✅ FIX: Supporta sia UUID (string) che ID numerico
  birthDate?: string;
  roleType: string;
  isActive: boolean;
  isOnline?: boolean; // Stato online/offline basato su sessioni attive
  lastLogin?: string;
  lastActivityAt?: string; // Ultima attività dell'utente
  createdAt: string;
  updatedAt: string;
}

export interface CreatePersonDTO {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  residenceAddress?: string;
  position?: string;
  department?: string;
  companyId?: number;
  roleType: string;
}

export interface UpdatePersonDTO {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  residenceAddress?: string;
  position?: string;
  department?: string;
  companyId?: number;
  roleType?: string;
  isActive?: boolean;
}

export interface PersonsFilters {
  roleType?: string;
  isActive?: boolean;
  companyId?: number;
  search?: string;
  sortBy?: 'lastLogin' | 'firstName' | 'lastName' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PersonsResponse {
  persons: Person[];
  total: number;
  page: number;
  totalPages: number;
}

export class PersonsService {
  /**
   * Ottiene la lista delle persone con filtri e paginazione
   */
  static async getPersons(filters: PersonsFilters = {}): Promise<PersonsResponse> {
    const params = new URLSearchParams();
    
    // Imposta ordinamento di default per ultimo login (più recente prima)
    const sortBy = filters.sortBy || 'lastLogin';
    const sortOrder = filters.sortOrder || 'desc';
    
    params.append('sortBy', sortBy);
    params.append('sortOrder', sortOrder);
    
    if (filters.roleType) params.append('roleType', filters.roleType);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters.companyId) params.append('companyId', filters.companyId.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    
    const raw = await apiGet(`/api/v1/persons?${params.toString()}`) as any;

    // Development logging for debugging
    if (process.env.NODE_ENV === 'development' && raw) {
      const samplePerson = raw?.persons?.[0] || raw?.data?.persons?.[0] || raw?.data?.[0] || raw?.[0];
      if (samplePerson) {
        console.debug('[PersonsService] Sample person:', {
          id: samplePerson.id,
          companyId: samplePerson.companyId,
          hasCompanyId: !!samplePerson.companyId
        });
      }
    }

    // Estrai array persone da possibili shape
    const rawPersons: any[] = Array.isArray(raw?.persons)
      ? raw.persons
      : Array.isArray(raw?.data?.persons)
        ? raw.data.persons
        : Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw?.items)
            ? raw.items
            : Array.isArray(raw)
              ? raw
              : [];

    const mapIsActive = (p: any): boolean => {
      if (typeof p?.isActive === 'boolean') return p.isActive;
      if (p?.deletedAt) return false;
      if (typeof p?.status === 'string') return p.status.toUpperCase() === 'ACTIVE';
      return true; // default attivo se non specificato
    };
    const toNumberSafe = (v: any): number | undefined => {
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };

    const persons: Person[] = rawPersons.map((p: any) => {
      // ✅ FIX: Supporta sia UUID (string) che ID numerico, senza conversione forzata
      const companyId = p?.companyId ?? p?.company_id ?? p?.company?.id;
      const finalCompanyId = companyId ? (typeof companyId === 'number' ? companyId : String(companyId)) : undefined;
      
      return {
        id: String(p.id),
        firstName: p.firstName ?? p.first_name ?? '',
        lastName: p.lastName ?? p.last_name ?? '',
        email: p.email ?? '',
        username: p.username ?? p.email ?? '',
        phone: p.phone,
        residenceAddress: p.residenceAddress ?? p.address ?? p.residence_address,
        position: p.position,
        department: p.department,
        companyId: finalCompanyId, // ✅ Mantieni il tipo originale (string o number)
        roleType: p.roleType ?? p.role_type ?? p.role ?? 'USER',
        isActive: mapIsActive(p),
        isOnline: p.isOnline,
        lastLogin: p.lastLogin ?? p.last_login,
        lastActivityAt: p.lastActivityAt ?? p.last_activity_at,
        createdAt: p.createdAt ?? p.created_at ?? '',
        updatedAt: p.updatedAt ?? p.updated_at ?? ''
      };
    });

    // Metadati di paginazione con fallback
    const total: number = typeof raw?.total === 'number' ? raw.total
      : typeof raw?.data?.total === 'number' ? raw.data.total
      : typeof raw?.count === 'number' ? raw.count
      : persons.length;
    const page: number = typeof raw?.page === 'number' ? raw.page
      : typeof raw?.data?.page === 'number' ? raw.data.page
      : 1;
    const limit: number | undefined = typeof filters.limit === 'number' ? filters.limit : undefined;
    const totalPages: number = typeof raw?.totalPages === 'number' ? raw.totalPages
      : typeof raw?.data?.totalPages === 'number' ? raw.data.totalPages
      : limit ? Math.max(1, Math.ceil(total / limit)) : 1;

    return { persons, total, page, totalPages } as PersonsResponse;
  }

  /**
   * Ottiene una persona specifica per ID
   */
  static async getPersonById(id: string): Promise<Person> {
    const response = await apiGet(`/api/v1/persons/${id}`) as Person;
    return response;
  }

  /**
   * Crea una nuova persona
   * Il backend genererà automaticamente username e password di default
   */
  static async createPerson(personData: CreatePersonDTO): Promise<Person> {
    const response = await apiPost('/api/v1/persons', personData) as Person;
    return response;
  }

  /**
   * Aggiorna una persona esistente
   */
  static async updatePerson(id: string, personData: UpdatePersonDTO): Promise<Person> {
    const response = await apiPut(`/api/v1/persons/${id}`, personData) as Person;
    return response;
  }

  /**
   * Elimina una persona
   */
  static async deletePerson(id: string): Promise<void> {
    await apiDelete(`/api/v1/persons/${id}`);
  }

  /**
   * Attiva/disattiva una persona
   */
  static async togglePersonStatus(id: string, isActive: boolean): Promise<Person> {
    const response = await apiPut(`/api/v1/persons/${id}/status`, { isActive }) as Person;
    return response;
  }

  /**
   * Resetta la password di una persona alla password di default
   */
  static async resetPersonPassword(id: string): Promise<{ temporaryPassword: string }> {
    const response = await apiPost(`/api/v1/persons/${id}/reset-password`) as { temporaryPassword: string };
    return response;
  }

  /**
   * Ottiene le statistiche delle persone
   */
  static async getPersonStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byRole: Record<string, number>;
    recentLogins: number;
  }> {
    const response = await apiGet('/api/v1/persons/stats') as {
      total: number;
      active: number;
      inactive: number;
      byRole: Record<string, number>;
      recentLogins: number;
    };
    return response;
  }

  /**
   * Verifica se un username è disponibile
   */
  static async checkUsernameAvailability(username: string): Promise<{ available: boolean }> {
    const response = await apiGet(`/api/v1/persons/check-username?username=${encodeURIComponent(username)}`) as { available: boolean };
    return response;
  }

  /**
   * Verifica se un email è disponibile
   */
  static async checkEmailAvailability(email: string, excludePersonId?: string): Promise<{ available: boolean }> {
    const params = new URLSearchParams({ email });
    if (excludePersonId) {
      params.append('excludeUserId', excludePersonId); // Manteniamo il nome del parametro per compatibilità backend
    }
    const response = await apiGet(`/api/v1/persons/check-email?${params.toString()}`) as { available: boolean };
    return response;
  }

  /**
   * Esporta la lista delle persone in formato CSV
   */
  static async exportPersons(filters: PersonsFilters = {}): Promise<Blob> {
    const params = new URLSearchParams();
    
    if (filters.roleType) params.append('roleType', filters.roleType);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters.companyId) params.append('companyId', filters.companyId.toString());
    if (filters.search) params.append('search', filters.search);
    
    const response = await apiGet(`/api/v1/persons/export?${params.toString()}`, {
      responseType: 'blob'
    }) as Blob;
    return response;
  }

  /**
   * Importa persone da file CSV
   */
  static async importPersons(file: File): Promise<{
    imported: number;
    errors: Array<{ row: number; error: string }>;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiPost('/api/v1/persons/import', formData) as {
      imported: number;
      errors: Array<{ row: number; error: string }>;
    };
    return response;
  }

  /**
   * Elimina più persone contemporaneamente
   */
  static async deleteMultiplePersons(personIds: string[]): Promise<void> {
    await apiDeleteWithPayload('/api/v1/persons/bulk', { personIds });
  }

  /**
   * Alias per resetPersonPassword per compatibilità
   */
  static async resetPassword(id: string): Promise<string> {
    const response = await PersonsService.resetPersonPassword(id);
    return response.temporaryPassword;
  }
}

// Funzioni di utilità per compatibilità con il codice esistente
export const getPersons = PersonsService.getPersons;
export const getPersonById = PersonsService.getPersonById;
export const createPerson = PersonsService.createPerson;
export const updatePerson = PersonsService.updatePerson;
export const deletePerson = PersonsService.deletePerson;
export const togglePersonStatus = PersonsService.togglePersonStatus;
export const resetPersonPassword = PersonsService.resetPersonPassword;
export const resetPassword = PersonsService.resetPassword;
export const deleteMultiplePersons = PersonsService.deleteMultiplePersons;
export const getPersonStats = PersonsService.getPersonStats;
export const checkUsernameAvailability = PersonsService.checkUsernameAvailability;
export const checkEmailAvailability = PersonsService.checkEmailAvailability;
export const exportPersons = PersonsService.exportPersons;
export const importPersons = PersonsService.importPersons;

export default PersonsService;