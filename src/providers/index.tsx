import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryProvider } from './QueryProvider';
import { AuthProvider } from '../context/AuthContext';
import { TenantProvider } from '../context/TenantContext';
import { TenantModeProvider } from '../contexts/TenantModeContext';
import { TenantFilterProvider } from '../context/TenantFilterContext';
import { AppStateProvider } from '../context/AppStateContext';
import { ToastProvider } from '../context/ToastContext';
import { PreferencesProvider } from '../context/PreferencesContext';
import { AreaThemeProvider } from '../design-system/themes/AreaThemeProvider';
import { ThemeProvider } from '../context/ThemeContext';
import { ScrollToTop } from '../components/shared/ScrollToTop';
import { ConfirmDialogProvider } from '../contexts/ConfirmDialogContext';
import { NotificationProvider } from '../context/NotificationContext';

/**
 * Provider principale che combina tutti i provider necessari
 * Ordine importante: 
 * 1. QueryProvider deve essere prima dei provider che usano query
 * 2. TenantModeProvider deve essere prima di TenantFilterProvider (per sincronizzazione)
 */
interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <HelmetProvider>
        <ThemeProvider>
          <AreaThemeProvider>
            <QueryProvider>
              <AuthProvider>
                <TenantProvider>
                  <TenantModeProvider>
                    <TenantFilterProvider>
                      <AppStateProvider>
                        <PreferencesProvider>
                          <ToastProvider>
                            <ConfirmDialogProvider>
                              <NotificationProvider>
                                {children}
                              </NotificationProvider>
                            </ConfirmDialogProvider>
                          </ToastProvider>
                        </PreferencesProvider>
                      </AppStateProvider>
                    </TenantFilterProvider>
                  </TenantModeProvider>
                </TenantProvider>
              </AuthProvider>
            </QueryProvider>
          </AreaThemeProvider>
        </ThemeProvider>
      </HelmetProvider>
    </BrowserRouter>
  );
};

/**
 * Provider per i test che esclude BrowserRouter
 */
export const TestProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <ThemeProvider>
      <AreaThemeProvider>
        <QueryProvider>
          <AuthProvider>
            <TenantProvider>
              <TenantModeProvider>
                <TenantFilterProvider>
                  <AppStateProvider>
                    <PreferencesProvider>
                      <ToastProvider>
                        <ConfirmDialogProvider>
                          <NotificationProvider>
                            {children}
                          </NotificationProvider>
                        </ConfirmDialogProvider>
                      </ToastProvider>
                    </PreferencesProvider>
                  </AppStateProvider>
                </TenantFilterProvider>
              </TenantModeProvider>
            </TenantProvider>
          </AuthProvider>
        </QueryProvider>
      </AreaThemeProvider>
    </ThemeProvider>
  );
};

// Export individuali per flessibilità
export { QueryProvider } from './QueryProvider';
export { AuthProvider } from '../context/AuthContext';
export { AppStateProvider } from '../context/AppStateContext';
export { ToastProvider } from '../context/ToastContext';
export { PreferencesProvider } from '../context/PreferencesContext';

export default AppProviders;