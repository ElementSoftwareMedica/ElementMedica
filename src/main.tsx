/* Cache-Buster: 1739836800000 - Global brand theme init - 2025-02-18 */
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { AppProviders } from './providers'
import './index.css'
import './styles/brand-themes.css'
import './styles/notifications.css'
import './styles/scrollbar.css'

// Set data-brand attribute globally so CSS variables from brand-themes.css
// apply everywhere (public pages, clinica pages, etc.)
const brandId = import.meta.env.VITE_BRAND_ID || 'element-sicurezza';
document.documentElement.setAttribute('data-brand', brandId);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
