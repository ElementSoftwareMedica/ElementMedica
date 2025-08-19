import { apiGet, apiPost, apiPut, apiDelete } from './api';
import { Person, CreatePersonDTO, UpdatePersonDTO, UsersFilters, UsersResponse } from './users';

export interface Employee extends Person {
  position?: string;
  department?: string;
  hiredDate?: string;
  status: 'Active' | 'Inactive';
}

export interface CreateEmployeeDTO extends Omit<CreatePersonDTO, 'roleType'> {
  hiredDate?: string;
  status?: 'Active' | 'Inactive';
}

export interface UpdateEmployeeDTO extends Omit<UpdatePersonDTO, 'roleType'> {
  hiredDate?: string;
  status?: 'Active' | 'Inactive';
}

export interface EmployeesFilters extends Omit<UsersFilters, 'roleType'> {
  department?: string;
  position?: string;
  status?: 'Active' | 'Inactive';
}

export interface EmployeesResponse extends Omit<UsersResponse, 'users'> {
  users: Employee[];
}

export class EmployeesService {
  /**
   * Ottiene la lista dei dipendenti con filtri e paginazione
   */
  static async getEmployees(filters: EmployeesFilters = {}): Promise<Employee[]> {
    const params = new URLSearchParams();
    
    // Forza il roleType a EMPLOYEE
    params.append('roleType', 'EMPLOYEE');
    
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
    if (filters.department) params.append('department', filters.department);
    if (filters.position) params.append('position', filters.position);
    if (filters.status) params.append('status', filters.status);
    
    const response = await apiGet(`/api/v1/persons?${params.toString()}`);
    
    // Trasforma i dati per includere i campi specifici degli employee
    const employees = response.users.map((person: Person) => ({
      ...person,
      status: person.isActive ? 'Active' : 'Inactive' as 'Active' | 'Inactive'
    }));
    
    return employees;
  }

  /**
   * Ottiene un dipendente specifico per ID
   */
  static async getEmployeeById(id: string): Promise<Employee> {
    const response = await apiGet(`/api/v1/persons/${id}`);
    return {
      ...response,
      status: response.isActive ? 'Active' : 'Inactive'
    };
  }

  /**
   * Crea un nuovo dipendente
   */
  static async createEmployee(employeeData: CreateEmployeeDTO): Promise<Employee> {
    const personData = {
      ...employeeData,
      roleType: 'EMPLOYEE',
      isActive: employeeData.status === 'Active'
    };
    
    const response = await apiPost('/api/v1/persons', personData);
    return {
      ...response,
      status: response.isActive ? 'Active' : 'Inactive'
    };
  }

  /**
   * Aggiorna un dipendente esistente
   */
  static async updateEmployee(id: string, employeeData: UpdateEmployeeDTO): Promise<Employee> {
    const personData = {
      ...employeeData,
      isActive: employeeData.status === 'Active'
    };
    
    const response = await apiPut(`/api/v1/persons/${id}`, personData);
    return {
      ...response,
      status: response.isActive ? 'Active' : 'Inactive'
    };
  }

  /**
   * Elimina un dipendente
   */
  static async deleteEmployee(id: string): Promise<void> {
    await apiDelete(`/api/v1/persons/${id}`);
  }

  /**
   * Attiva/disattiva un dipendente
   */
  static async toggleEmployeeStatus(id: string, isActive: boolean): Promise<Employee> {
    const response = await apiPut(`/api/v1/persons/${id}/status`, { isActive });
    return {
      ...response,
      status: response.isActive ? 'Active' : 'Inactive'
    };
  }

  /**
   * Ottiene le statistiche dei dipendenti
   */
  static async getEmployeeStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byDepartment: Record<string, number>;
    byPosition: Record<string, number>;
  }> {
    const response = await apiGet('/api/v1/persons/stats?roleType=EMPLOYEE');
    return response;
  }

  /**
   * Esporta la lista dei dipendenti in formato CSV
   */
  static async exportEmployees(filters: EmployeesFilters = {}): Promise<Blob> {
    const params = new URLSearchParams();
    
    params.append('roleType', 'EMPLOYEE');
    
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters.companyId) params.append('companyId', filters.companyId.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.department) params.append('department', filters.department);
    if (filters.position) params.append('position', filters.position);
    if (filters.status) params.append('status', filters.status);
    
    const response = await apiGet(`/api/v1/persons/export?${params.toString()}`, {
      responseType: 'blob'
    });
    return response;
  }

  /**
   * Importa dipendenti da file CSV
   */
  static async importEmployees(file: File): Promise<{
    imported: number;
    errors: Array<{ row: number; error: string }>;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('roleType', 'EMPLOYEE');
    
    const response = await apiPost('/api/v1/persons/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response;
  }
}

// Funzioni di utilità per compatibilità con il codice esistente
export const getEmployees = EmployeesService.getEmployees;
export const getEmployeeById = EmployeesService.getEmployeeById;
export const createEmployee = EmployeesService.createEmployee;
export const updateEmployee = EmployeesService.updateEmployee;
export const deleteEmployee = EmployeesService.deleteEmployee;
export const toggleEmployeeStatus = EmployeesService.toggleEmployeeStatus;
export const getEmployeeStats = EmployeesService.getEmployeeStats;
export const exportEmployees = EmployeesService.exportEmployees;
export const importEmployees = EmployeesService.importEmployees;

export default EmployeesService;