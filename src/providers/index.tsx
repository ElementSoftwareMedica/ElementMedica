import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryProvider } from './QueryProvider';
import { AuthProvider } from '../context/AuthContext';
import { TenantProvider } from '../context/TenantContext';
import { TenantFilterProvider } from '../context/TenantFilterContext';
import { AppStateProvider } from '../context/AppStateContext';
import { ToastProvider } from '../context/ToastContext';
import { PreferencesProvider } from '../context/PreferencesContext';
import { AreaThemeProvider } from '../design-system/themes/AreaThemeProvider';
import { ScrollToTop } from '../components/shared/ScrollToTop';
import { ConfirmDialogProvider } from '../contexts/ConfirmDialogContext';

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
      <ScrollToTop />
      <HelmetProvider>
        <AreaThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <TenantProvider>
                <TenantFilterProvider>
                  <AppStateProvider>
                    <PreferencesProvider>
                      <ToastProvider>
                        <ConfirmDialogProvider>
                          {children}
                        </ConfirmDialogProvider>
                      </ToastProvider>
                    </PreferencesProvider>
                  </AppStateProvider>
                </TenantFilterProvider>
              </TenantProvider>
            </AuthProvider>
          </QueryProvider>
        </AreaThemeProvider>
      </HelmetProvider>
    </BrowserRouter>
  );
};

/**
 * Provider per i test che esclude BrowserRouter
 */
export const TestProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <AreaThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <TenantProvider>
            <TenantFilterProvider>
              <AppStateProvider>
                <PreferencesProvider>
                  <ToastProvider>
                    <ConfirmDialogProvider>
                      {children}
                    </ConfirmDialogProvider>
                  </ToastProvider>
                </PreferencesProvider>
              </AppStateProvider>
            </TenantFilterProvider>
          </TenantProvider>
        </AuthProvider>
      </QueryProvider>
    </AreaThemeProvider>
  );
};

// Export individuali per flessibilità
export { QueryProvider } from './QueryProvider';
export { AuthProvider } from '../context/AuthContext';
export { AppStateProvider } from '../context/AppStateContext';
export { ToastProvider } from '../context/ToastContext';
export { PreferencesProvider } from '../context/PreferencesContext';

export default AppProviders;