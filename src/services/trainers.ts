import { apiGet, apiDelete, apiPost, apiPut } from './api';
import { Person, CreatePersonDTO, UpdatePersonDTO, PersonsFilters, PersonsResponse } from './persons';

// Tipo per opzioni API con headers multi-tenant
type ApiOptions = Record<string, unknown> & { headers?: Record<string, string> };

// Interfaccia estesa per Person con campi trainer opzionali
interface PersonWithTrainerFields extends Person {
  specialties?: string[];
  certifications?: string[];
}

export interface Trainer extends Person {
  specialties: string[];
  certifications: string[];
  status: 'ACTIVE' | 'INACTIVE';
  specialization?: string;
}

export interface CreateTrainerDTO extends Omit<CreatePersonDTO, 'roleType'> {
  specialties?: string[];
  certifications?: string[];
  specialization?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateTrainerDTO extends Omit<UpdatePersonDTO, 'roleType'> {
  specialties?: string[];
  certifications?: string[];
  specialization?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface TrainersFilters extends Omit<PersonsFilters, 'roleType'> {
  specialization?: string;
  specialty?: string;
  certification?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface TrainersResponse extends Omit<PersonsResponse, 'persons'> {
  trainers: Trainer[];
}

export class TrainersService {
  /**
   * Ottiene la lista dei formatori con filtri e paginazione
   */
  static async getTrainers(filters: TrainersFilters = {}): Promise<Trainer[]> {
    const params = new URLSearchParams();

    // Imposta ordinamento di default per nome
    const sortBy = filters.sortBy || 'firstName';
    const sortOrder = filters.sortOrder || 'asc';

    params.append('sortBy', sortBy);
    params.append('sortOrder', sortOrder);

    params.set('isActive', typeof filters.isActive === 'boolean' ? String(filters.isActive) : 'true');
    if (filters.companyId) params.append('companyId', filters.companyId.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.specialization) params.append('specialization', filters.specialization);
    if (filters.status) params.append('status', filters.status);

    // Endpoint unificato persons con filtro roleType=TRAINER
    const resp = await apiGet<any>(`/api/v1/persons?roleType=TRAINER&${params.toString()}`);
    const persons: Person[] = Array.isArray(resp?.data)
      ? resp.data
      : (Array.isArray(resp?.persons) ? resp.persons : (Array.isArray(resp) ? resp : []));

    // 🔍 DEBUG: Verifica struttura dati backend
    if (process.env.NODE_ENV === 'development' && persons.length > 0) {
      const sample = persons[0] as any;
    }

    const trainers: Trainer[] = persons.map((person: any) => {
      // Gestisci certifications come stringa CSV o array
      let certs: string[] = [];
      if (Array.isArray(person?.certifications)) {
        certs = person.certifications;
      } else if (typeof person?.certifications === 'string' && person.certifications.trim()) {
        certs = person.certifications.split(',').map((c: string) => c.trim()).filter(Boolean);
      }

      // Gestisci specialties come stringa CSV o array
      let specs: string[] = [];
      if (Array.isArray(person?.specialties)) {
        specs = person.specialties;
      } else if (typeof person?.specialties === 'string' && person.specialties.trim()) {
        specs = person.specialties.split(',').map((s: string) => s.trim()).filter(Boolean);
      }

      // 🔍 DEBUG: Verifica mapping finale
      if (process.env.NODE_ENV === 'development') {
        const trainer = {
          ...person,
          certifications: certs,
          specialties: specs,
          status: person.isActive ? 'ACTIVE' : 'INACTIVE' as 'ACTIVE' | 'INACTIVE'
        };

        // Log solo per il primo trainer per debug
        if (person.id === persons[0].id) {
        }

        return trainer;
      }

      return {
        ...person,
        certifications: certs,
        specialties: specs,
        status: person.isActive ? 'ACTIVE' : 'INACTIVE' as 'ACTIVE' | 'INACTIVE'
      };
    });

    return trainers;
  }

  /**
   * Ottiene un formatore specifico per ID
   */
  static async getTrainerById(id: string): Promise<Trainer> {
    const resp = await apiGet<any>(`/api/v1/persons/${id}`);
    const response: any = resp?.data ?? resp;
    return {
      ...response,
      specialties: Array.isArray(response?.specialties) ? response.specialties : [],
      certifications: Array.isArray(response?.certifications) ? response.certifications : [],
      status: response.isActive ? 'ACTIVE' : 'INACTIVE'
    };
  }

  /**
   * Crea un nuovo formatore
   */
  static async createTrainer(trainerData: CreateTrainerDTO, options?: ApiOptions): Promise<Trainer> {
    try {
      const { status, ...rest } = trainerData as any;

      // Pulisci i dati rimuovendo campi vuoti che potrebbero causare problemi
      const cleanedData: any = {};
      Object.keys(rest).forEach(key => {
        const value = rest[key];
        // Mantieni solo valori non vuoti, eccetto per array e boolean
        if (value !== '' && value !== null && value !== undefined) {
          cleanedData[key] = value;
        } else if (Array.isArray(value)) {
          cleanedData[key] = value; // Mantieni array vuoti
        } else if (typeof value === 'boolean') {
          cleanedData[key] = value; // Mantieni boolean
        }
      });

      // Converti date da stringa a ISO string per Prisma
      if (cleanedData.birthDate && typeof cleanedData.birthDate === 'string') {
        try {
          const dateStr = cleanedData.birthDate.trim();
          if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // Formato YYYY-MM-DD: converti a ISO string
            cleanedData.birthDate = new Date(dateStr + 'T00:00:00.000Z').toISOString();
          } else {
            // Altri formati: usa costruttore Date standard
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              cleanedData.birthDate = date.toISOString();
            } else {
              delete cleanedData.birthDate; // Rimuovi se non valida
            }
          }
        } catch (error) {
          delete cleanedData.birthDate; // Rimuovi se errore
        }
      }

      if (cleanedData.hiredDate && typeof cleanedData.hiredDate === 'string') {
        try {
          const dateStr = cleanedData.hiredDate.trim();
          if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            cleanedData.hiredDate = new Date(dateStr + 'T00:00:00.000Z').toISOString();
          } else {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              cleanedData.hiredDate = date.toISOString();
            } else {
              delete cleanedData.hiredDate;
            }
          }
        } catch (error) {
          delete cleanedData.hiredDate;
        }
      }

      const personData: any = {
        ...cleanedData,
        roleType: 'TRAINER',
        isActive: status === 'ACTIVE'
      };

      // Assicurati che firstName e lastName siano presenti
      if (!personData.firstName || !personData.lastName) {
        throw new Error('Nome e cognome sono obbligatori per creare un formatore');
      }

      // P59: Pulisci campi vuoti per evitare errori di validazione backend
      Object.keys(personData).forEach(key => {
        if (personData[key] === '' || personData[key] === undefined) {
          // Mantieni firstName, lastName e roleType anche se vuoti
          if (!['firstName', 'lastName', 'roleType'].includes(key)) {
            delete personData[key];
          }
        }
      });

      const resp = await apiPost<any>('/api/v1/persons', personData, options);
      const response: any = resp?.data ?? resp;
      return {
        ...response,
        specialties: Array.isArray(response?.specialties) ? response.specialties : [],
        certifications: Array.isArray(response?.certifications) ? response.certifications : [],
        status: response.isActive ? 'ACTIVE' : 'INACTIVE'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Aggiorna un formatore esistente
   */
  static async updateTrainer(id: string, trainerData: UpdateTrainerDTO, options?: ApiOptions): Promise<Trainer> {
    const { status, ...rest } = trainerData as any;
    const personData: any = {
      ...rest,
      isActive: status === 'ACTIVE'
    };

    // P59: Pulisci campi vuoti per evitare errori di validazione
    // - email vuota "" fallisce isEmail() validation
    // - phone vuota può causare problemi
    Object.keys(personData).forEach(key => {
      if (personData[key] === '' || personData[key] === undefined) {
        delete personData[key];
      }
    });

    const resp = await apiPut<any>(`/api/v1/persons/${id}`, personData, options);
    const response: any = resp?.data ?? resp;
    return {
      ...response,
      specialties: Array.isArray(response?.specialties) ? response.specialties : [],
      certifications: Array.isArray(response?.certifications) ? response.certifications : [],
      status: response.isActive ? 'ACTIVE' : 'INACTIVE'
    };
  }

  /**
   * Elimina un formatore
   */
  static async deleteTrainer(id: string, options?: ApiOptions): Promise<void> {
    await apiDelete(`/api/v1/persons/${id}`, options);
  }

  /**
   * Attiva/disattiva un formatore
   */
  static async toggleTrainerStatus(id: string, isActive: boolean, options?: ApiOptions): Promise<Trainer> {
    const response = await apiPut(`/api/v1/persons/${id}/status`, { isActive }, options) as PersonWithTrainerFields;
    return {
      ...response,
      specialties: response.specialties || [],
      certifications: response.certifications || [],
      status: response.isActive ? 'ACTIVE' : 'INACTIVE'
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
    const response = await apiGet('/api/v1/persons/stats?roleType=TRAINER') as {
      total: number;
      active: number;
      inactive: number;
      bySpecialization: Record<string, number>;
      bySpecialty: Record<string, number>;
    };
    return response;
  }

  /**
   * Esporta la lista dei formatori in formato CSV
   */
  static async exportTrainers(filters: TrainersFilters = {}): Promise<Blob> {
    const params = new URLSearchParams();

    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters.companyId) params.append('companyId', filters.companyId.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.specialization) params.append('specialization', filters.specialization);
    if (filters.status) params.append('status', filters.status);

    const response = await apiGet(`/api/v1/persons/export?view=trainer&${params.toString()}`, {
      responseType: 'blob'
    }) as Blob;
    return response;
  }

  /**
   * Importa formatori da file CSV
   */
  static async importTrainers(file: File, options?: ApiOptions): Promise<{
    imported: number;
    errors: Array<{ row: number; error: string }>;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('roleType', 'TRAINER');

    // Merge headers: Content-Type + optional multi-tenant headers
    const mergedHeaders = {
      'Content-Type': 'multipart/form-data',
      ...(options?.headers || {})
    };

    const response = await apiPost('/api/v1/persons/import', formData, {
      ...options,
      headers: mergedHeaders
    }) as { imported: number; errors: Array<{ row: number; error: string }> };
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