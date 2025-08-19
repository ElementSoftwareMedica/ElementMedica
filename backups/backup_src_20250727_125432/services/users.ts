import { apiGet, apiPost, apiPut, apiDelete } from './api';

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phone?: string;
  address?: string;
  position?: string;
  department?: string;
  companyId?: number;
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
  address?: string;
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
  address?: string;
  position?: string;
  department?: string;
  companyId?: number;
  roleType?: string;
  isActive?: boolean;
}

export interface UsersFilters {
  roleType?: string;
  isActive?: boolean;
  companyId?: number;
  search?: string;
  sortBy?: 'lastLogin' | 'firstName' | 'lastName' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface UsersResponse {
  users: Person[];
  total: number;
  page: number;
  totalPages: number;
}

export class UsersService {
  /**
   * Ottiene la lista degli utenti con filtri e paginazione
   */
  static async getUsers(filters: UsersFilters = {}): Promise<UsersResponse> {
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
    
    const response = await apiGet(`/api/v1/persons?${params.toString()}`);
    return response;
  }

  /**
   * Ottiene un utente specifico per ID
   */
  static async getUserById(id: string): Promise<Person> {
    const response = await apiGet(`/api/v1/persons/${id}`);
    return response;
  }

  /**
   * Crea un nuovo utente
   * Il backend genererà automaticamente username e password di default
   */
  static async createUser(userData: CreatePersonDTO): Promise<Person> {
    const response = await apiPost('/api/v1/persons', userData);
    return response;
  }

  /**
   * Aggiorna un utente esistente
   */
  static async updateUser(id: string, userData: UpdatePersonDTO): Promise<Person> {
    const response = await apiPut(`/api/v1/persons/${id}`, userData);
    return response;
  }

  /**
   * Elimina un utente
   */
  static async deleteUser(id: string): Promise<void> {
    await apiDelete(`/api/v1/persons/${id}`);
  }

  /**
   * Attiva/disattiva un utente
   */
  static async toggleUserStatus(id: string, isActive: boolean): Promise<Person> {
    const response = await apiPut(`/api/v1/persons/${id}/status`, { isActive });
    return response;
  }

  /**
   * Resetta la password di un utente alla password di default
   */
  static async resetUserPassword(id: string): Promise<{ temporaryPassword: string }> {
    const response = await apiPost(`/api/v1/persons/${id}/reset-password`);
    return response;
  }

  /**
   * Ottiene le statistiche degli utenti
   */
  static async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byRole: Record<string, number>;
    recentLogins: number;
  }> {
    const response = await apiGet('/api/v1/persons/stats');
    return response;
  }

  /**
   * Verifica se un username è disponibile
   */
  static async checkUsernameAvailability(username: string): Promise<{ available: boolean }> {
    const response = await apiGet(`/api/v1/persons/check-username?username=${encodeURIComponent(username)}`);
    return response;
  }

  /**
   * Verifica se un email è disponibile
   */
  static async checkEmailAvailability(email: string, excludeUserId?: string): Promise<{ available: boolean }> {
    const params = new URLSearchParams({ email });
    if (excludeUserId) {
      params.append('excludeUserId', excludeUserId);
    }
    const response = await apiGet(`/api/v1/persons/check-email?${params.toString()}`);
    return response;
  }

  /**
   * Esporta la lista degli utenti in formato CSV
   */
  static async exportUsers(filters: UsersFilters = {}): Promise<Blob> {
    const params = new URLSearchParams();
    
    if (filters.roleType) params.append('roleType', filters.roleType);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters.companyId) params.append('companyId', filters.companyId.toString());
    if (filters.search) params.append('search', filters.search);
    
    const response = await apiGet(`/api/v1/persons/export?${params.toString()}`, {
      responseType: 'blob'
    });
    return response;
  }

  /**
   * Importa utenti da file CSV
   */
  static async importUsers(file: File): Promise<{
    imported: number;
    errors: Array<{ row: number; error: string }>;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiPost('/api/v1/persons/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response;
  }

  /**
   * Elimina più utenti contemporaneamente
   */
  static async deleteMultipleUsers(userIds: string[]): Promise<void> {
    await apiDelete('/api/v1/persons/bulk', { userIds });
  }

  /**
   * Alias per resetUserPassword per compatibilità
   */
  static async resetPassword(id: string): Promise<string> {
    const response = await UsersService.resetUserPassword(id);
    return response.temporaryPassword;
  }
}

// Funzioni di utilità per compatibilità con il codice esistente
export const getUsers = UsersService.getUsers;
export const getUserById = UsersService.getUserById;
export const createUser = UsersService.createUser;
export const updateUser = UsersService.updateUser;
export const deleteUser = UsersService.deleteUser;
export const toggleUserStatus = UsersService.toggleUserStatus;
export const resetUserPassword = UsersService.resetUserPassword;
export const resetPassword = UsersService.resetPassword;
export const deleteMultipleUsers = UsersService.deleteMultipleUsers;
export const getUserStats = UsersService.getUserStats;
export const checkUsernameAvailability = UsersService.checkUsernameAvailability;
export const checkEmailAvailability = UsersService.checkEmailAvailability;
export const exportUsers = UsersService.exportUsers;
export const importUsers = UsersService.importUsers;

export default UsersService;