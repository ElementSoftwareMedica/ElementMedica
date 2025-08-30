/**
 * @deprecated Questo file è deprecato. Utilizzare src/services/persons.ts
 * Questo file mantiene la compatibilità con il codice esistente
 * ma sarà rimosso in una versione futura.
 */

// Re-export dal nuovo servizio persons.ts
export type {
  Person,
  CreatePersonDTO,
  UpdatePersonDTO,
  PersonsFilters,
  PersonsResponse
} from './persons';

export {
  PersonsService,
  getPersons,
  getPersonById,
  createPerson,
  updatePerson,
  deletePerson,
  togglePersonStatus,
  resetPersonPassword,
  resetPassword,
  deleteMultiplePersons,
  getPersonStats,
  checkUsernameAvailability,
  checkEmailAvailability,
  exportPersons,
  importPersons
} from './persons';

// Alias per compatibilità con il codice esistente
export type UsersFilters = import('./persons').PersonsFilters;
export type UsersResponse = {
  users: import('./persons').Person[];
  total: number;
  page: number;
  totalPages: number;
};

// Alias della classe per compatibilità
export { PersonsService as UsersService } from './persons';

// Alias delle funzioni con nomenclatura legacy per compatibilità
export { getPersons as getUsers } from './persons';
export { getPersonById as getUserById } from './persons';
export { createPerson as createUser } from './persons';
export { updatePerson as updateUser } from './persons';
export { deletePerson as deleteUser } from './persons';
export { togglePersonStatus as toggleUserStatus } from './persons';
export { resetPersonPassword as resetUserPassword } from './persons';
export { deleteMultiplePersons as deleteMultipleUsers } from './persons';
export { getPersonStats as getUserStats } from './persons';
export { exportPersons as exportUsers } from './persons';
export { importPersons as importUsers } from './persons';

// Default export per compatibilità
export { default } from './persons';