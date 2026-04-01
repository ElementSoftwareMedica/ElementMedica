import { apiGet, apiDelete, apiPost, apiPut } from './api';

// Tipo per opzioni API con headers multi-tenant
type ApiOptions = Record<string, unknown> & { headers?: Record<string, string> };

interface ServiceMethods<T, C, U> {
  getAll: () => Promise<T[]>;
  getById: (id: string) => Promise<T>;
  create: (data: C, options?: ApiOptions) => Promise<T>;
  update: (id: string, data: U, options?: ApiOptions) => Promise<T>;
  delete: (id: string, options?: ApiOptions) => Promise<void>;
  deleteMultiple: (ids: string[], options?: ApiOptions) => Promise<void>;
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

    create: async (data: C, options?: ApiOptions): Promise<T> => {
      return await apiPost<T>(basePath, data, options);
    },

    update: async (id: string, data: U, options?: ApiOptions): Promise<T> => {
      return await apiPut<T>(`${basePath}/${id}`, data, options);
    },

    delete: async (id: string, options?: ApiOptions): Promise<void> => {
      return await apiDelete(`${basePath}/${id}`, options);
    },

    deleteMultiple: async (ids: string[], options?: ApiOptions): Promise<void> => {
      const deletePromises = ids.map(id => {
        return apiDelete(`${basePath}/${id}`, options);
      });

      await Promise.all(deletePromises);
    },

    extend: function <E>(methods: E): ServiceMethods<T, C, U> & E {
      return { ...this, ...methods };
    }
  };

  return baseService;
};