import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { sanitizeErrorMessage } from '../utils/errorUtils';
import { toast } from 'react-hot-toast';

// Configurazione del QueryClient ottimizzata
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache per 5 minuti
      staleTime: 5 * 60 * 1000,
      // Mantieni in cache per 10 minuti
      gcTime: 10 * 60 * 1000,
      // Retry automatico per errori di rete
      retry: (failureCount, error: any) => {
        // Non fare retry per errori 4xx (client errors)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        // Retry massimo 3 volte per altri errori
        return failureCount < 3;
      },
      // Delay progressivo per i retry
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch automatico quando la finestra torna in focus
      refetchOnWindowFocus: true,
      // Refetch quando si riconnette
      refetchOnReconnect: true,
      // Non refetch automaticamente al mount se i dati sono fresh
      refetchOnMount: 'always',
    },
    mutations: {
      // Retry per le mutazioni solo in caso di errori di rete
      retry: (failureCount, error: any) => {
        // Non fare retry per errori 4xx
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        // Retry massimo 2 volte per errori di rete
        return failureCount < 2;
      },
      // Delay per i retry delle mutazioni
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
});

// Error handler globale per le query
queryClient.setMutationDefaults(['create', 'update', 'delete'], {
  onError: (error: any) => {
    console.error('Mutation error:', error);
    // Mostra un toast con errore sanitizzato per le mutazioni fallite
    const userMessage = sanitizeErrorMessage(error, 'Operazione fallita');
    toast.error(userMessage);
  },
});

// Query invalidation patterns
export const invalidationPatterns = {
  // Invalida tutte le query di una risorsa
  invalidateResource: (resource: string) => {
    queryClient.invalidateQueries({ queryKey: [resource] });
  },
  
  // Invalida query specifiche
  invalidateSpecific: (queryKey: string[]) => {
    queryClient.invalidateQueries({ queryKey });
  },
  
  // Invalida tutto
  invalidateAll: () => {
    queryClient.invalidateQueries();
  },
  
  // Remove query dalla cache
  removeQuery: (queryKey: string[]) => {
    queryClient.removeQueries({ queryKey });
  },
  
  // Reset query client
  reset: () => {
    queryClient.clear();
  },
};

// Prefetch utilities
export const prefetchUtils = {
  // Prefetch lista di una risorsa
  prefetchList: async (resource: string, params?: any) => {
    await queryClient.prefetchQuery({
      queryKey: [resource, 'list', params],
      queryFn: () => {
        // Qui dovresti implementare la logica di fetch
        // Per ora ritorna una promise vuota
        return Promise.resolve([]);
      },
    });
  },
  
  // Prefetch dettaglio di una risorsa
  prefetchDetail: async (resource: string, id: string) => {
    await queryClient.prefetchQuery({
      queryKey: [resource, 'detail', id],
      queryFn: () => {
        // Qui dovresti implementare la logica di fetch
        return Promise.resolve(null);
      },
    });
  },
};

interface QueryProviderProps {
  children: React.ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools disabilitati per evitare riferimenti a "TanStack" nell'UI */}
      {/* {import.meta.env.DEV && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          position="bottom-right"
        />
      )} */}
    </QueryClientProvider>
  );
};

// Export del client per uso diretto
export { queryClient };
export default QueryProvider;