import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryProvider } from './QueryProvider';
import { AuthProvider } from '../context/AuthContext';
import { TenantProvider } from '../context/TenantContext';
import { AppStateProvider } from '../context/AppStateContext';
import { ToastProvider } from '../context/ToastContext';
import { PreferencesProvider } from '../context/PreferencesContext';

/**
 * Provider principale che combina tutti i provider necessari
 * Ordine importante: QueryProvider deve essere prima dei provider che usano query
 */
interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <BrowserRouter>
      <QueryProvider>
        <AuthProvider>
          <TenantProvider>
            <AppStateProvider>
              <PreferencesProvider>
                <ToastProvider>
                  {children}
                </ToastProvider>
              </PreferencesProvider>
            </AppStateProvider>
          </TenantProvider>
        </AuthProvider>
      </QueryProvider>
    </BrowserRouter>
  );
};

/**
 * Provider per i test che esclude BrowserRouter
 */
export const TestProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <QueryProvider>
      <AuthProvider>
        <TenantProvider>
          <AppStateProvider>
            <PreferencesProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </PreferencesProvider>
          </AppStateProvider>
        </TenantProvider>
      </AuthProvider>
    </QueryProvider>
  );
};

// Export individuali per flessibilità
export { QueryProvider } from './QueryProvider';
export { AuthProvider } from '../context/AuthContext';
export { AppStateProvider } from '../context/AppStateContext';
export { ToastProvider } from '../context/ToastContext';
export { PreferencesProvider } from '../context/PreferencesContext';

export default AppProviders;