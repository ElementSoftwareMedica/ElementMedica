import { apiGet, apiPost, apiPut, apiDelete } from './api';
import { Person, CreatePersonDTO, UpdatePersonDTO, UsersFilters, UsersResponse } from './users';

export interface Trainer extends Person {
  specialties: string[];
  certifications: string[];
  status: 'Active' | 'Inactive';
  specialization?: string;
}

export interface CreateTrainerDTO extends Omit<CreatePersonDTO, 'roleType'> {
  specialties?: string[];
  certifications?: string[];
  specialization?: string;
  status?: 'Active' | 'Inactive';
}

export interface UpdateTrainerDTO extends Omit<UpdatePersonDTO, 'roleType'> {
  specialties?: string[];
  certifications?: string[];
  specialization?: string;
  status?: 'Active' | 'Inactive';
}

export interface TrainersFilters extends Omit<UsersFilters, 'roleType'> {
  specialization?: string;
  specialty?: string;
  certification?: string;
  status?: 'Active' | 'Inactive';
}

export interface TrainersResponse extends Omit<UsersResponse, 'users'> {
  users: Trainer[];
}

export class TrainersService {
  /**
   * Ottiene la lista dei formatori con filtri e paginazione
   */
  static async getTrainers(filters: TrainersFilters = {}): Promise<Trainer[]> {
    const params = new URLSearchParams();
    
    // Forza il roleType a TRAINER
    params.append('roleType', 'TRAINER');
    
    // Imposta ordinamento di default per nome
    const sortBy = filters.sortBy || 'firstName';
    const sortOrder = filters.sortOrder || 'asc';
    
    params.append('sortBy', sortBy);
    params.append('sortOrder', sortOrder);
    
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters.companyId) params.append('companyId', filters.companyId.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.specialization) params.append('specialization', filters.specialization);
    if (filters.specialty) params.append('specialty', filters.specialty);
    if (filters.certification) params.append('certification', filters.certification);
    if (filters.status) params.append('status', filters.status);
    
    const response = await apiGet(`/api/v1/persons?${params.toString()}`);
    
    // Trasforma i dati per includere i campi specifici dei trainer
    const trainers = response.users.map((person: Person) => ({
      ...person,
      specialties: person.specialties || [],
      certifications: person.certifications || [],
      status: person.isActive ? 'Active' : 'Inactive' as 'Active' | 'Inactive'
    }));
    
    return trainers;
  }

  /**
   * Ottiene un formatore specifico per ID
   */
  static async getTrainerById(id: string): Promise<Trainer> {
    const response = await apiGet(`/api/v1/persons/${id}`);
    return {
      ...response,
      specialties: response.specialties || [],
      certifications: response.certifications || [],
      status: response.isActive ? 'Active' : 'Inactive'
    };
  }

  /**
   * Crea un nuovo formatore
   */
  static async createTrainer(trainerData: CreateTrainerDTO): Promise<Trainer> {
    const personData = {
      ...trainerData,
      roleType: 'TRAINER',
      isActive: trainerData.status === 'Active'
    };
    
    const response = await apiPost('/api/v1/persons', personData);
    return {
      ...response,
      specialties: response.specialties || [],
      certifications: response.certifications || [],
      status: response.isActive ? 'Active' : 'Inactive'
    };
  }

  /**
   * Aggiorna un formatore esistente
   */
  static async updateTrainer(id: string, trainerData: UpdateTrainerDTO): Promise<Trainer> {
    const personData = {
      ...trainerData,
      isActive: trainerData.status === 'Active'
    };
    
    const response = await apiPut(`/api/v1/persons/${id}`, personData);
    return {
      ...response,
      specialties: response.specialties || [],
      certifications: response.certifications || [],
      status: response.isActive ? 'Active' : 'Inactive'
    };
  }

  /**
   * Elimina un formatore
   */
  static async deleteTrainer(id: string): Promise<void> {
    await apiDelete(`/api/v1/persons/${id}`);
  }

  /**
   * Attiva/disattiva un formatore
   */
  static async toggleTrainerStatus(id: string, isActive: boolean): Promise<Trainer> {
    const response = await apiPut(`/api/v1/persons/${id}/status`, { isActive });
    return {
      ...response,
      specialties: response.specialties || [],
      certifications: response.certifications || [],
      status: response.isActive ? 'Active' : 'Inactive'
    };
  }

  /**
   * Ottiene le statistiche dei formatori
   */
  static async getTrainerStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    bySpecialization: Record<string, number>;
    bySpecialty: Record<string, number>;
  }> {
    const response = await apiGet('/api/v1/persons/stats?roleType=TRAINER');
    return response;
  }

  /**
   * Esporta la lista dei formatori in formato CSV
   */
  static async exportTrainers(filters: TrainersFilters = {}): Promise<Blob> {
    const params = new URLSearchParams();
    
    params.append('roleType', 'TRAINER');
    
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters.companyId) params.append('companyId', filters.companyId.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.specialization) params.append('specialization', filters.specialization);
    if (filters.specialty) params.append('specialty', filters.specialty);
    if (filters.certification) params.append('certification', filters.certification);
    if (filters.status) params.append('status', filters.status);
    
    const response = await apiGet(`/api/v1/persons/export?${params.toString()}`, {
      responseType: 'blob'
    });
    return response;
  }

  /**
   * Importa formatori da file CSV
   */
  static async importTrainers(file: File): Promise<{
    imported: number;
    errors: Array<{ row: number; error: string }>;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('roleType', 'TRAINER');
    
    const response = await apiPost('/api/v1/persons/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response;
  }
}

// Funzioni di utilità per compatibilità con il codice esistente
export const getTrainers = TrainersService.getTrainers;
export const getTrainerById = TrainersService.getTrainerById;
export const createTrainer = TrainersService.createTrainer;
export const updateTrainer = TrainersService.updateTrainer;
export const deleteTrainer = TrainersService.deleteTrainer;
export const toggleTrainerStatus = TrainersService.toggleTrainerStatus;
export const getTrainerStats = TrainersService.getTrainerStats;
export const exportTrainers = TrainersService.exportTrainers;
export const importTrainers = TrainersService.importTrainers;

export default TrainersService;