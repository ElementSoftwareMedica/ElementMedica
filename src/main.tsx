/* Cache-Buster: 1736520200000 - ABSOLUTE FINAL browser refresh after 400 error fix - RESOLVED 2025-01-10 */
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { AppProviders } from './providers'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
