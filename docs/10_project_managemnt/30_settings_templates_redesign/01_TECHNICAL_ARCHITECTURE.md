# Architettura Tecnica - Settings Templates Redesign

**Data**: 5 Novembre 2025  
**Versione**: 1.0  
**Status**: Design Specification

---

## 🏗️ Component Architecture

### Struttura Directory

```
src/pages/settings/templates/
├── index.ts                           # Export pubblici
├── TemplatesPage.tsx                  # Main page (lista template)
├── TemplateEditor.tsx                 # Editor completo
│
├── components/
│   ├── list/
│   │   ├── TemplateList.tsx          # Lista con virtualization
│   │   ├── TemplateCard.tsx          # Card singolo template
│   │   ├── TemplateFilters.tsx       # Filtri (tipo, categoria, stato)
│   │   ├── TemplateSearch.tsx        # Ricerca full-text
│   │   └── TemplatePagination.tsx    # Paginazione
│   │
│   ├── editor/
│   │   ├── TiptapEditor.tsx          # Editor WYSIWYG principale
│   │   ├── EditorToolbar.tsx         # Toolbar formattazione
│   │   ├── EditorSidebar.tsx         # Sidebar con tabs (layout, stili, marker)
│   │   ├── HeaderFooterEditor.tsx    # Editor header/footer separato
│   │   ├── LayoutConfigPanel.tsx     # Config layout pagina
│   │   ├── StylesConfigPanel.tsx     # Config stili CSS
│   │   ├── MarkerPanel.tsx           # Panel marker con search
│   │   ├── MarkerPicker.tsx          # Modal picker marker
│   │   ├── MarkerAutocomplete.tsx    # Autocomplete inline
│   │   ├── LogoUploader.tsx          # Upload logo con crop
│   │   └── PageConfigModal.tsx       # Modal config margini/dimensioni
│   │
│   ├── preview/
│   │   ├── PreviewPanel.tsx          # Panel preview PDF live
│   │   ├── PreviewToolbar.tsx        # Toolbar (zoom, pagina, refresh)
│   │   ├── PreviewLoading.tsx        # Loading skeleton
│   │   ├── MockDataSelector.tsx      # Selector dati mock per preview
│   │   └── PDFViewer.tsx             # Viewer PDF embedded
│   │
│   ├── google/
│   │   ├── GoogleImportModal.tsx     # Modal import Google
│   │   ├── GoogleAuthButton.tsx      # Button OAuth2
│   │   ├── GoogleDocsImporter.tsx    # Import da Docs
│   │   ├── GoogleSlidesImporter.tsx  # Import da Slides
│   │   ├── GoogleDocPicker.tsx       # Picker documento Google Drive
│   │   └── GoogleSyncStatus.tsx      # Status sync automatico
│   │
│   ├── version/
│   │   ├── VersionHistory.tsx        # Lista versioni
│   │   ├── VersionHistoryItem.tsx    # Item singola versione
│   │   ├── VersionCompare.tsx        # Confronto versioni (basic)
│   │   └── RestoreVersionModal.tsx   # Modal conferma restore
│   │
│   └── shared/
│       ├── TemplateTypeIcon.tsx      # Icon per tipo template
│       ├── TemplateStatusBadge.tsx   # Badge stato (attivo, bozza)
│       ├── MarkerTag.tsx             # Tag marker con tooltip
│       ├── LoadingSpinner.tsx        # Spinner generico
│       └── ErrorBoundary.tsx         # Error boundary per editor
│
├── hooks/
│   ├── useTemplateEditor.ts          # Hook state editor
│   ├── useTemplateList.ts            # Hook lista con filtri/paginazione
│   ├── useMarkerValidation.ts        # Hook validazione marker real-time
│   ├── useMarkerAutocomplete.ts      # Hook autocomplete marker
│   ├── useGoogleImport.ts            # Hook import Google Workspace
│   ├── useGoogleAuth.ts              # Hook OAuth2 flow
│   ├── useTemplatePreview.ts         # Hook preview PDF
│   ├── useTemplateVersioning.ts      # Hook versionamento
│   ├── useLayoutConfig.ts            # Hook config layout
│   ├── useStylesConfig.ts            # Hook config stili
│   └── useAutoSave.ts                # Hook auto-save draft
│
├── utils/
│   ├── markerUtils.ts                # Utilities marker (parse, validate, format)
│   ├── templateUtils.ts              # Utilities template (clone, export, import)
│   ├── pdfUtils.ts                   # Utilities PDF (generate, download)
│   ├── googleUtils.ts                # Utilities Google (convert HTML, auth)
│   ├── validationSchemas.ts          # Schemi Zod per validazione
│   └── constants.ts                  # Costanti (marker, formati, tipi)
│
└── types/
    ├── template.types.ts             # Types template
    ├── marker.types.ts               # Types marker
    ├── layout.types.ts               # Types layout
    ├── google.types.ts               # Types Google integration
    └── editor.types.ts               # Types editor state
```

---

## 🔌 Backend Architecture

### API Routes

```javascript
// backend/routes/template-routes.js

import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import * as templateController from '../controllers/template-controller.js';
import * as googleController from '../controllers/google-integration-controller.js';
import * as markerController from '../controllers/marker-controller.js';

const router = express.Router();

// ========================================
// TEMPLATE CRUD
// ========================================

// Lista template con filtri
router.get(
  '/',
  authenticate,
  authorize('templates', 'read'),
  templateController.listTemplates
);

// Dettaglio template
router.get(
  '/:id',
  authenticate,
  authorize('templates', 'read'),
  templateController.getTemplate
);

// Crea template
router.post(
  '/',
  authenticate,
  authorize('templates', 'create'),
  validateRequest('createTemplate'),
  templateController.createTemplate
);

// Aggiorna template (crea nuova versione)
router.put(
  '/:id',
  authenticate,
  authorize('templates', 'update'),
  validateRequest('updateTemplate'),
  templateController.updateTemplate
);

// Elimina template (soft delete)
router.delete(
  '/:id',
  authenticate,
  authorize('templates', 'delete'),
  templateController.deleteTemplate
);

// Duplica template
router.post(
  '/:id/duplicate',
  authenticate,
  authorize('templates', 'create'),
  templateController.duplicateTemplate
);

// ========================================
// VERSIONING
// ========================================

// Storico versioni
router.get(
  '/:id/versions',
  authenticate,
  authorize('templates', 'read'),
  templateController.getVersionHistory
);

// Ripristina versione
router.post(
  '/:id/restore/:versionId',
  authenticate,
  authorize('templates', 'update'),
  templateController.restoreVersion
);

// ========================================
// PREVIEW & VALIDATION
// ========================================

// Preview PDF con dati mock
router.post(
  '/:id/preview',
  authenticate,
  authorize('templates', 'read'),
  templateController.previewTemplate
);

// Validazione marker
router.post(
  '/:id/validate',
  authenticate,
  authorize('templates', 'read'),
  templateController.validateMarkers
);

// Test generation con dati reali
router.post(
  '/:id/test-generate',
  authenticate,
  authorize('templates', 'read'),
  templateController.testGenerate
);

// ========================================
// GOOGLE INTEGRATION
// ========================================

// OAuth2 authorization URL
router.get(
  '/google/auth-url',
  authenticate,
  googleController.getAuthUrl
);

// OAuth2 callback
router.get(
  '/google/callback',
  googleController.handleCallback
);

// Import da Google Docs
router.post(
  '/import/google-docs',
  authenticate,
  authorize('templates', 'create'),
  validateRequest('importGoogleDocs'),
  googleController.importFromGoogleDocs
);

// Import da Google Slides
router.post(
  '/import/google-slides',
  authenticate,
  authorize('templates', 'create'),
  validateRequest('importGoogleSlides'),
  googleController.importFromGoogleSlides
);

// Sync template da Google
router.post(
  '/:id/sync-google',
  authenticate,
  authorize('templates', 'update'),
  googleController.syncFromGoogle
);

// ========================================
// MARKER UTILITIES
// ========================================

// Lista marker disponibili
router.get(
  '/markers/available',
  authenticate,
  markerController.getAvailableMarkers
);

// Mock data per preview
router.get(
  '/markers/mock-data',
  authenticate,
  markerController.getMockData
);

// Valida sintassi marker
router.post(
  '/markers/validate',
  authenticate,
  markerController.validateMarkerSyntax
);

export default router;
```

### Controllers

```javascript
// backend/controllers/template-controller.js

import { prisma } from '../config/database.js';
import { TemplateService } from '../services/template-service.js';
import { MarkerResolverService } from '../services/marker-resolver-service.js';
import { PDFGeneratorService } from '../services/pdf-generator-service.js';

export async function listTemplates(req, res) {
  try {
    const { type, isActive, isDefault, category, search, page = 1, limit = 20 } = req.query;
    const { tenantId } = req.user;

    const where = {
      tenantId,
      deletedAt: null,
      ...(type && { type }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...(isDefault !== undefined && { isDefault: isDefault === 'true' }),
      ...(category && { category }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { tags: { has: search } }
        ]
      })
    };

    const [templates, total] = await Promise.all([
      prisma.templateLink.findMany({
        where,
        include: {
          creator: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { generatedDocs: true, versions: true } }
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit)
      }),
      prisma.templateLink.count({ where })
    ]);

    res.json({
      data: templates,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[Templates] Error listing:', error);
    res.status(500).json({ error: 'Failed to list templates' });
  }
}

export async function createTemplate(req, res) {
  try {
    const { tenantId, personId } = req.user;
    const templateData = req.body;

    // Crea template
    const template = await prisma.templateLink.create({
      data: {
        ...templateData,
        tenantId,
        createdBy: personId,
        version: 1
      }
    });

    // Crea prima versione
    await prisma.templateVersion.create({
      data: {
        templateId: template.id,
        version: 1,
        content: template.content,
        header: template.header,
        footer: template.footer,
        styles: template.styles,
        layout: template.layout,
        logoImage: template.logoImage,
        changesSummary: 'Initial version',
        tenantId,
        createdBy: personId
      }
    });

    res.status(201).json({ data: template });
  } catch (error) {
    console.error('[Templates] Error creating:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
}

export async function updateTemplate(req, res) {
  try {
    const { id } = req.params;
    const { tenantId, personId } = req.user;
    const updates = req.body;

    // Verifica ownership
    const existing = await prisma.templateLink.findFirst({
      where: { id, tenantId, deletedAt: null }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Incrementa versione
    const newVersion = existing.version + 1;

    // Aggiorna template
    const updated = await prisma.templateLink.update({
      where: { id },
      data: {
        ...updates,
        version: newVersion,
        updatedAt: new Date()
      }
    });

    // Crea nuova versione
    await prisma.templateVersion.create({
      data: {
        templateId: id,
        version: newVersion,
        content: updated.content,
        header: updated.header,
        footer: updated.footer,
        styles: updated.styles,
        layout: updated.layout,
        logoImage: updated.logoImage,
        changesSummary: updates.changesSummary || 'Updated',
        changedFields: Object.keys(updates),
        tenantId,
        createdBy: personId
      }
    });

    res.json({ data: updated });
  } catch (error) {
    console.error('[Templates] Error updating:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
}

export async function previewTemplate(req, res) {
  try {
    const { id } = req.params;
    const { mockData } = req.body;
    const { tenantId } = req.user;

    const template = await prisma.templateLink.findFirst({
      where: { id, tenantId, deletedAt: null }
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Resolve marker con mock data
    const markerResolver = new MarkerResolverService();
    const resolvedContent = markerResolver.resolve(template.content, mockData);
    const resolvedHeader = markerResolver.resolve(template.header, mockData);
    const resolvedFooter = markerResolver.resolve(template.footer, mockData);

    // Genera PDF
    const pdfGenerator = new PDFGeneratorService();
    const pdf = await pdfGenerator.generate({
      content: resolvedContent,
      header: resolvedHeader,
      footer: resolvedFooter,
      styles: template.styles,
      layout: template.layout
    });

    res.contentType('application/pdf');
    res.send(pdf);
  } catch (error) {
    console.error('[Templates] Error previewing:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
}

// ... altri controller
```

---

## 🎨 Frontend State Management

### Editor State Hook

```typescript
// hooks/useTemplateEditor.ts

import { useState, useCallback, useEffect } from 'react';
import { useAutoSave } from './useAutoSave';
import type { Template, LayoutConfig, StylesConfig } from '../types';

interface EditorState {
  template: Template | null;
  content: string;
  header: string;
  footer: string;
  layout: LayoutConfig;
  styles: StylesConfig;
  isDirty: boolean;
  isSaving: boolean;
  error: string | null;
}

export function useTemplateEditor(templateId?: string) {
  const [state, setState] = useState<EditorState>({
    template: null,
    content: '',
    header: '',
    footer: '',
    layout: {
      pageSize: 'A4',
      orientation: 'portrait',
      margins: { top: 20, right: 20, bottom: 20, left: 20 }
    },
    styles: {
      fontSize: '12pt',
      fontFamily: 'Arial, sans-serif',
      lineHeight: 1.5,
      color: '#000000'
    },
    isDirty: false,
    isSaving: false,
    error: null
  });

  // Load template
  useEffect(() => {
    if (templateId) {
      loadTemplate(templateId);
    }
  }, [templateId]);

  const loadTemplate = async (id: string) => {
    try {
      const response = await fetch(`/api/v1/templates/${id}`);
      const { data } = await response.json();
      
      setState(prev => ({
        ...prev,
        template: data,
        content: data.content || '',
        header: data.header || '',
        footer: data.footer || '',
        layout: data.layout || prev.layout,
        styles: data.styles || prev.styles
      }));
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Failed to load template' }));
    }
  };

  const updateContent = useCallback((newContent: string) => {
    setState(prev => ({ ...prev, content: newContent, isDirty: true }));
  }, []);

  const updateHeader = useCallback((newHeader: string) => {
    setState(prev => ({ ...prev, header: newHeader, isDirty: true }));
  }, []);

  const updateFooter = useCallback((newFooter: string) => {
    setState(prev => ({ ...prev, footer: newFooter, isDirty: true }));
  }, []);

  const updateLayout = useCallback((updates: Partial<LayoutConfig>) => {
    setState(prev => ({
      ...prev,
      layout: { ...prev.layout, ...updates },
      isDirty: true
    }));
  }, []);

  const updateStyles = useCallback((updates: Partial<StylesConfig>) => {
    setState(prev => ({
      ...prev,
      styles: { ...prev.styles, ...updates },
      isDirty: true
    }));
  }, []);

  const saveTemplate = useCallback(async () => {
    setState(prev => ({ ...prev, isSaving: true, error: null }));
    
    try {
      const method = state.template ? 'PUT' : 'POST';
      const url = state.template 
        ? `/api/v1/templates/${state.template.id}`
        : '/api/v1/templates';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: state.content,
          header: state.header,
          footer: state.footer,
          layout: state.layout,
          styles: state.styles
        })
      });

      if (!response.ok) throw new Error('Save failed');

      const { data } = await response.json();
      setState(prev => ({
        ...prev,
        template: data,
        isDirty: false,
        isSaving: false
      }));

      return data;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to save template',
        isSaving: false
      }));
      throw error;
    }
  }, [state]);

  // Auto-save ogni 30 secondi se dirty
  useAutoSave(saveTemplate, { enabled: state.isDirty, interval: 30000 });

  return {
    ...state,
    updateContent,
    updateHeader,
    updateFooter,
    updateLayout,
    updateStyles,
    saveTemplate,
    reload: () => templateId && loadTemplate(templateId)
  };
}
```

---

## 🔧 Services Architecture

### Marker Resolver Service

```javascript
// backend/services/marker-resolver-service.js

export class MarkerResolverService {
  constructor() {
    this.markerRegex = /\{\{([^}]+)\}\}/g;
  }

  /**
   * Resolve tutti i marker in un template
   */
  resolve(template, data) {
    return template.replace(this.markerRegex, (match, marker) => {
      return this.resolveMarker(marker.trim(), data);
    });
  }

  /**
   * Resolve un singolo marker
   * Supporta: {{person.fullName}}, {{course.title|uppercase}}
   */
  resolveMarker(marker, data) {
    const [path, formatter] = marker.split('|').map(s => s.trim());
    const value = this.getValueByPath(path, data);

    if (value === undefined || value === null) {
      return `{{${marker}}}`; // Mantieni marker se non risolto
    }

    return formatter ? this.applyFormatter(value, formatter) : value;
  }

  /**
   * Estrai valore da path nidificato
   * Es: "person.address.city" -> data.person.address.city
   */
  getValueByPath(path, data) {
    const keys = path.split('.');
    let value = data;

    for (const key of keys) {
      if (value === undefined || value === null) return undefined;
      value = value[key];
    }

    return value;
  }

  /**
   * Applica formatter al valore
   */
  applyFormatter(value, formatter) {
    const [name, ...args] = formatter.split(':');

    switch (name.toLowerCase()) {
      case 'uppercase':
        return String(value).toUpperCase();
      
      case 'lowercase':
        return String(value).toLowerCase();
      
      case 'date':
        const format = args[0] || 'DD/MM/YYYY';
        return this.formatDate(value, format);
      
      case 'currency':
        const currency = args[0] || '€';
        return `${currency} ${parseFloat(value).toFixed(2)}`;
      
      case 'truncate':
        const length = parseInt(args[0]) || 100;
        return String(value).substring(0, length) + (value.length > length ? '...' : '');
      
      default:
        return value;
    }
  }

  /**
   * Formatta data
   */
  formatDate(date, format) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return format
      .replace('DD', day)
      .replace('MM', month)
      .replace('YYYY', year)
      .replace('YY', String(year).slice(-2));
  }

  /**
   * Valida marker in template
   */
  validate(template, availableMarkers) {
    const errors = [];
    const matches = template.matchAll(this.markerRegex);

    for (const match of matches) {
      const marker = match[1].trim();
      const [path] = marker.split('|');

      if (!availableMarkers.includes(path)) {
        errors.push({
          marker: match[0],
          error: `Unknown marker: ${path}`,
          position: match.index
        });
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
```

---

## 🚀 Performance Optimizations

### React Query Cache

```typescript
// config/reactQuery.ts

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache template list per 5 minuti
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      
      // Retry failed requests 2 volte
      retry: 2,
      
      // Refetch on window focus
      refetchOnWindowFocus: false
    }
  }
});

// Query keys
export const templateKeys = {
  all: ['templates'] as const,
  lists: () => [...templateKeys.all, 'list'] as const,
  list: (filters: object) => [...templateKeys.lists(), filters] as const,
  details: () => [...templateKeys.all, 'detail'] as const,
  detail: (id: string) => [...templateKeys.details(), id] as const,
  versions: (id: string) => [...templateKeys.detail(id), 'versions'] as const
};
```

### Lazy Loading

```typescript
// TemplatesPage.tsx - Lazy load editor

import { lazy, Suspense } from 'react';
import { LoadingSpinner } from './components/shared';

const TemplateEditor = lazy(() => import('./TemplateEditor'));

export function TemplatesPage() {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (editingId) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <TemplateEditor templateId={editingId} onClose={() => setEditingId(null)} />
      </Suspense>
    );
  }

  return <TemplateList onEdit={setEditingId} />;
}
```

---

## 🔐 Security Measures

### XSS Prevention

```typescript
// utils/sanitization.ts

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content prima del salvataggio
 */
export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
      'div', 'span', 'img'
    ],
    ALLOWED_ATTR: ['style', 'class', 'src', 'alt', 'href', 'target'],
    ALLOW_DATA_ATTR: false
  });
}
```

### Rate Limiting

```javascript
// backend/middleware/rateLimiter.js

import rateLimit from 'express-rate-limit';

export const templateRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 100, // max 100 richieste
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

export const previewRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 10, // max 10 preview per minuto
  message: 'Too many preview requests'
});
```

---

**Documento aggiornato**: 5 Novembre 2025  
**Status**: ✅ TECHNICAL SPECIFICATION COMPLETE
