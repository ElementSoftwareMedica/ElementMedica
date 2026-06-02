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

// Global fallback for broken CMS/uploads images — silently swap to transparent placeholder
// so the browser never shows a broken-image icon. Handles orphaned DB references.
document.addEventListener('error', (e) => {
  const target = e.target as Element
  if (
    target instanceof HTMLImageElement &&
    (target.src.includes('/uploads/cms/') || target.src.includes('/uploads/')) &&
    !target.dataset.fallbackApplied
  ) {
    target.dataset.fallbackApplied = '1'
    // 1×1 transparent GIF — works without any additional asset
    target.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    target.style.opacity = '0'
  }
}, true)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
