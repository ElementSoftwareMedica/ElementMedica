import { apiGet, apiDelete, apiPost, apiPut } from './api';

interface ServiceMethods<T, C, U> {
  getAll: () => Promise<T[]>;
  getById: (id: string) => Promise<T>;
  create: (data: C) => Promise<T>;
  update: (id: string, data: U) => Promise<T>;
  delete: (id: string) => Promise<void>;
  deleteMultiple: (ids: string[]) => Promise<void>;
  extend: <E>(methods: E) => ServiceMethods<T, C, U> & E;
}

/**
 * Factory per creare servizi REST standard
 * @param basePath - Path base dell'API (es. '/users')
 * @returns Un oggetto con i metodi CRUD standard
 */
export const createService = <
  T,
  C extends Record<string, unknown> = Record<string, unknown>,
  U extends Record<string, unknown> = Record<string, unknown>
>(basePath: string): ServiceMethods<T, C, U> => {
  const baseService = {
    getAll: async (): Promise<T[]> => {
      return await apiGet<T[]>(basePath);
    },

    getById: async (id: string): Promise<T> => {
      return await apiGet<T>(`${basePath}/${id}`);
    },

    create: async (data: C): Promise<T> => {
      return await apiPost<T>(basePath, data);
    },

    update: async (id: string, data: U): Promise<T> => {
      return await apiPut<T>(`${basePath}/${id}`, data);
    },

    delete: async (id: string): Promise<void> => {
      return await apiDelete(`${basePath}/${id}`);
    },

    deleteMultiple: async (ids: string[]): Promise<void> => {
      const deletePromises = ids.map(id => {
        return apiDelete(`${basePath}/${id}`);
      });
      
      await Promise.all(deletePromises);
    },

    extend: function <E>(methods: E): ServiceMethods<T, C, U> & E {
      return { ...this, ...methods };
    }
  };

  return baseService;
};