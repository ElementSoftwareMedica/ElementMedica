# Integrazione Google Workspace - Specifiche Tecniche

**Data**: 5 Novembre 2025  
**Versione**: 1.0  
**Status**: Design Specification

---

## 🎯 Obiettivi Integrazione

### Primary Goals
1. **Import Google Docs** - Convertire documenti Google Docs in template HTML
2. **Import Google Slides** - Estrarre layout da presentazioni Google Slides
3. **OAuth2 Flow** - Autenticazione sicura utente Google
4. **Sync Automatico** - Aggiornamento template quando documento cambia (opzionale)

### Use Cases
- ✅ Utente importa documento Google Docs esistente come template
- ✅ Utente importa slide Google come layout attestato
- ✅ Utente abilita sync automatico per template collaborativi
- ✅ Sistema converte formattazione Google in HTML equivalente

---

## 🔐 OAuth2 Configuration

### Google Cloud Console Setup

#### Step 1: Crea Progetto Google Cloud
```bash
1. Vai su https://console.cloud.google.com/
2. Crea nuovo progetto: "ElementMedica Templates"
3. Abilita APIs:
   - Google Docs API
   - Google Slides API
   - Google Drive API v3
```

#### Step 2: Crea OAuth2 Credentials
```
OAuth consent screen:
- User Type: Internal (solo tenant) o External (pubblico)
- App name: ElementMedica Template Manager
- User support email: support@elementmedica.com
- Scopes:
  * .../auth/documents.readonly
  * .../auth/presentations.readonly
  * .../auth/drive.readonly

OAuth 2.0 Client ID:
- Application type: Web application
- Authorized JavaScript origins:
  * http://localhost:5173 (development)
  * https://app.elementmedica.com (production)
- Authorized redirect URIs:
  * http://localhost:5173/settings/templates/google-callback
  * https://app.elementmedica.com/settings/templates/google-callback
```

#### Step 3: Environment Variables
```bash
# .env
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=http://localhost:5173/settings/templates/google-callback

# Service Account (per server-side operations)
GOOGLE_SERVICE_ACCOUNT_KEY=./config/google-service-account.json
```

---

## 🏗️ Backend Architecture

### Service Structure

```javascript
// backend/services/google-integration-service.js

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { logger } from '../utils/logger.js';
import { prisma } from '../config/database.js';

export class GoogleIntegrationService {
  constructor() {
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Scopes necessari
    this.scopes = [
      'https://www.googleapis.com/auth/documents.readonly',
      'https://www.googleapis.com/auth/presentations.readonly',
      'https://www.googleapis.com/auth/drive.readonly'
    ];
  }

  /**
   * Genera URL di autorizzazione OAuth2
   */
  getAuthorizationUrl(userId, tenantId) {
    const state = Buffer.from(JSON.stringify({ userId, tenantId })).toString('base64');

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // Per refresh token
      scope: this.scopes,
      state,
      prompt: 'consent' // Forza consent screen per refresh token
    });

    return authUrl;
  }

  /**
   * Gestisce callback OAuth2
   */
  async handleCallback(code, state) {
    try {
      // Decodifica state
      const { userId, tenantId } = JSON.parse(Buffer.from(state, 'base64').toString());

      // Scambia code per tokens
      const { tokens } = await this.oauth2Client.getToken(code);
      
      // Salva tokens criptati (usa encryption library)
      await this.saveUserTokens(userId, tenantId, tokens);

      logger.info('[Google] OAuth2 callback success', { userId, tenantId });
      
      return { success: true, userId, tenantId };
    } catch (error) {
      logger.error('[Google] OAuth2 callback failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Salva tokens utente (criptati)
   */
  async saveUserTokens(userId, tenantId, tokens) {
    // TODO: Implementa encryption dei tokens
    const encrypted = {
      accessToken: this.encrypt(tokens.access_token),
      refreshToken: tokens.refresh_token ? this.encrypt(tokens.refresh_token) : null,
      expiryDate: tokens.expiry_date
    };

    await prisma.googleTokens.upsert({
      where: { userId_tenantId: { userId, tenantId } },
      update: encrypted,
      create: {
        userId,
        tenantId,
        ...encrypted
      }
    });
  }

  /**
   * Recupera tokens utente e refresh se necessario
   */
  async getUserTokens(userId, tenantId) {
    const record = await prisma.googleTokens.findUnique({
      where: { userId_tenantId: { userId, tenantId } }
    });

    if (!record) {
      throw new Error('Google tokens not found. Please authorize first.');
    }

    // Decrypt tokens
    const tokens = {
      access_token: this.decrypt(record.accessToken),
      refresh_token: record.refreshToken ? this.decrypt(record.refreshToken) : null,
      expiry_date: record.expiryDate
    };

    // Check se expired e refresh
    if (Date.now() >= tokens.expiry_date) {
      logger.info('[Google] Access token expired, refreshing...', { userId });
      
      this.oauth2Client.setCredentials(tokens);
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      await this.saveUserTokens(userId, tenantId, credentials);
      return credentials;
    }

    return tokens;
  }

  /**
   * Import documento da Google Docs
   */
  async importFromGoogleDocs(documentUrl, userId, tenantId) {
    try {
      // Estrai document ID da URL
      const documentId = this.extractDocumentId(documentUrl);
      
      // Recupera tokens utente
      const tokens = await this.getUserTokens(userId, tenantId);
      this.oauth2Client.setCredentials(tokens);

      // Inizializza Google Docs API
      const docs = google.docs({ version: 'v1', auth: this.oauth2Client });

      // Fetch documento
      const response = await docs.documents.get({ documentId });
      const document = response.data;

      // Converti in HTML
      const html = this.convertDocsToHTML(document);
      
      // Estrai metadata
      const metadata = {
        title: document.title,
        googleDocsId: documentId,
        googleDocsUrl: documentUrl,
        lastModifiedTime: document.revisionId
      };

      logger.info('[Google] Docs imported successfully', { documentId, userId });

      return { html, metadata };
    } catch (error) {
      logger.error('[Google] Import Docs failed', { error: error.message, documentUrl });
      throw error;
    }
  }

  /**
   * Import presentazione da Google Slides
   */
  async importFromGoogleSlides(presentationUrl, userId, tenantId) {
    try {
      const presentationId = this.extractPresentationId(presentationUrl);
      
      const tokens = await this.getUserTokens(userId, tenantId);
      this.oauth2Client.setCredentials(tokens);

      const slides = google.slides({ version: 'v1', auth: this.oauth2Client });

      // Fetch presentazione (solo prima slide per layout)
      const response = await slides.presentations.get({ presentationId });
      const presentation = response.data;

      // Estrai layout prima slide
      const firstSlide = presentation.slides[0];
      const html = this.convertSlideToHTML(firstSlide, presentation.pageSize);

      const metadata = {
        title: presentation.title,
        googleSlidesId: presentationId,
        googleSlidesUrl: presentationUrl
      };

      logger.info('[Google] Slides imported successfully', { presentationId, userId });

      return { html, metadata };
    } catch (error) {
      logger.error('[Google] Import Slides failed', { error: error.message, presentationUrl });
      throw error;
    }
  }

  /**
   * Converti Google Docs structure in HTML
   */
  convertDocsToHTML(document) {
    let html = '<div class="google-docs-import">\n';

    for (const element of document.body.content) {
      if (element.paragraph) {
        html += this.convertParagraph(element.paragraph);
      } else if (element.table) {
        html += this.convertTable(element.table);
      }
    }

    html += '</div>';
    return html;
  }

  /**
   * Converti paragrafo Google Docs in HTML
   */
  convertParagraph(paragraph) {
    let text = '';
    let styles = [];

    for (const element of paragraph.elements) {
      if (element.textRun) {
        let content = element.textRun.content;
        const textStyle = element.textRun.textStyle || {};

        // Applica formattazione
        if (textStyle.bold) content = `<strong>${content}</strong>`;
        if (textStyle.italic) content = `<em>${content}</em>`;
        if (textStyle.underline) content = `<u>${content}</u>`;
        
        text += content;

        // Collect styles
        if (textStyle.fontSize) {
          styles.push(`font-size: ${textStyle.fontSize.magnitude}pt`);
        }
        if (textStyle.foregroundColor) {
          const color = this.rgbToHex(textStyle.foregroundColor.color.rgbColor);
          styles.push(`color: ${color}`);
        }
      }
    }

    // Determina tag in base a named style
    const namedStyle = paragraph.paragraphStyle?.namedStyleType || 'NORMAL_TEXT';
    let tag = 'p';
    
    if (namedStyle.startsWith('HEADING_')) {
      const level = namedStyle.replace('HEADING_', '');
      tag = `h${level}`;
    }

    const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
    return `<${tag}${styleAttr}>${text}</${tag}>\n`;
  }

  /**
   * Converti tabella Google Docs in HTML
   */
  convertTable(table) {
    let html = '<table border="1" style="border-collapse: collapse;">\n';

    for (const row of table.tableRows) {
      html += '  <tr>\n';
      for (const cell of row.tableCells) {
        const cellContent = cell.content
          .map(el => el.paragraph ? this.convertParagraph(el.paragraph) : '')
          .join('');
        html += `    <td>${cellContent}</td>\n`;
      }
      html += '  </tr>\n';
    }

    html += '</table>\n';
    return html;
  }

  /**
   * Converti Slide in HTML
   */
  convertSlideToHTML(slide, pageSize) {
    const width = pageSize.width.magnitude;
    const height = pageSize.height.magnitude;

    let html = `<div class="google-slide" style="width: ${width}px; height: ${height}px; position: relative;">\n`;

    for (const element of slide.pageElements) {
      if (element.shape) {
        html += this.convertShape(element.shape, element.transform);
      } else if (element.image) {
        html += this.convertImage(element.image, element.transform);
      }
    }

    html += '</div>';
    return html;
  }

  /**
   * Converti Shape (text box) in HTML
   */
  convertShape(shape, transform) {
    const { translateX, translateY, scaleX, scaleY } = transform;
    const text = shape.text?.textElements
      ?.map(el => el.textRun?.content || '')
      .join('');

    return `<div style="position: absolute; left: ${translateX}px; top: ${translateY}px; width: ${scaleX}px; height: ${scaleY}px;">${text || ''}</div>\n`;
  }

  /**
   * Converti immagine in HTML
   */
  convertImage(image, transform) {
    const { translateX, translateY, scaleX, scaleY } = transform;
    const imageUrl = image.sourceUrl;

    return `<img src="${imageUrl}" style="position: absolute; left: ${translateX}px; top: ${translateY}px; width: ${scaleX}px; height: ${scaleY}px;" />\n`;
  }

  /**
   * Extract document ID da URL
   */
  extractDocumentId(url) {
    const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) throw new Error('Invalid Google Docs URL');
    return match[1];
  }

  /**
   * Extract presentation ID da URL
   */
  extractPresentationId(url) {
    const match = url.match(/\/presentation\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) throw new Error('Invalid Google Slides URL');
    return match[1];
  }

  /**
   * Converti RGB in HEX
   */
  rgbToHex(rgb) {
    const r = Math.round((rgb.red || 0) * 255);
    const g = Math.round((rgb.green || 0) * 255);
    const b = Math.round((rgb.blue || 0) * 255);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  /**
   * Placeholder encryption (usa crypto library)
   */
  encrypt(text) {
    // TODO: Implementa encryption con crypto
    return Buffer.from(text).toString('base64');
  }

  decrypt(encrypted) {
    // TODO: Implementa decryption
    return Buffer.from(encrypted, 'base64').toString();
  }
}

export default new GoogleIntegrationService();
```

---

## 🎨 Frontend Components

### Google Auth Button

```typescript
// components/google/GoogleAuthButton.tsx

import React, { useState } from 'react';
import { Button } from '../../../design-system/components';
import { apiGet } from '../../../services/api';

interface GoogleAuthButtonProps {
  onAuthSuccess?: () => void;
  onAuthError?: (error: string) => void;
}

export function GoogleAuthButton({ onAuthSuccess, onAuthError }: GoogleAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async () => {
    setIsLoading(true);

    try {
      // Request auth URL from backend
      const { authUrl } = await apiGet<{ authUrl: string }>('/templates/google/auth-url');

      // Open popup window
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl,
        'Google Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Listen for callback message
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'google-auth-success') {
          popup?.close();
          onAuthSuccess?.();
          window.removeEventListener('message', handleMessage);
        } else if (event.data.type === 'google-auth-error') {
          popup?.close();
          onAuthError?.(event.data.error);
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);
    } catch (error) {
      onAuthError?.('Failed to start Google authorization');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleAuth}
      disabled={isLoading}
      variant="outline"
      className="flex items-center gap-2"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        {/* Google logo SVG */}
      </svg>
      {isLoading ? 'Autorizzazione...' : 'Connetti Google Account'}
    </Button>
  );
}
```

### Google Docs Importer

```typescript
// components/google/GoogleDocsImporter.tsx

import React, { useState } from 'react';
import { Input, Button, Alert } from '../../../design-system/components';
import { apiPost } from '../../../services/api';
import type { Template } from '../../types';

interface GoogleDocsImporterProps {
  onImportSuccess: (template: Template) => void;
  onCancel: () => void;
}

export function GoogleDocsImporter({ onImportSuccess, onCancel }: GoogleDocsImporterProps) {
  const [documentUrl, setDocumentUrl] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleImport = async () => {
    setError(null);
    setIsImporting(true);

    try {
      const response = await apiPost<{ template: Template; preview: string }>(
        '/templates/import/google-docs',
        {
          documentUrl,
          name: templateName,
          type: 'CUSTOM' // Default type, user can change later
        }
      );

      setPreview(response.preview);
      
      // Mostra preview per conferma
      setTimeout(() => {
        onImportSuccess(response.template);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Importa da Google Docs</h3>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="space-y-3">
        <Input
          label="URL Documento Google Docs"
          value={documentUrl}
          onChange={(e) => setDocumentUrl(e.target.value)}
          placeholder="https://docs.google.com/document/d/..."
          disabled={isImporting}
        />

        <Input
          label="Nome Template"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder="Es: Lettera di Incarico Standard"
          disabled={isImporting}
        />
      </div>

      {preview && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <h4 className="text-sm font-medium mb-2">Anteprima Import</h4>
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: preview }}
          />
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel} disabled={isImporting}>
          Annulla
        </Button>
        <Button
          onClick={handleImport}
          disabled={!documentUrl || !templateName || isImporting}
        >
          {isImporting ? 'Importazione...' : 'Importa Template'}
        </Button>
      </div>
    </div>
  );
}
```

### Google Callback Page

```typescript
// pages/settings/templates/GoogleCallback.tsx

import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiGet } from '../../../services/api';

export function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        // Comunica errore al parent
        window.opener?.postMessage(
          { type: 'google-auth-error', error },
          window.location.origin
        );
        return;
      }

      if (!code || !state) {
        window.opener?.postMessage(
          { type: 'google-auth-error', error: 'Missing parameters' },
          window.location.origin
        );
        return;
      }

      try {
        // Invia code e state al backend
        await apiGet(`/templates/google/callback?code=${code}&state=${state}`);

        // Comunica successo al parent
        window.opener?.postMessage(
          { type: 'google-auth-success' },
          window.location.origin
        );

        // Chiudi popup dopo 1 secondo
        setTimeout(() => window.close(), 1000);
      } catch (err) {
        window.opener?.postMessage(
          { type: 'google-auth-error', error: 'Authorization failed' },
          window.location.origin
        );
      }
    };

    handleCallback();
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
        <p className="mt-4 text-gray-600">Completamento autorizzazione...</p>
      </div>
    </div>
  );
}
```

---

## 📊 Database Schema Extension

```prisma
// schema.prisma

model GoogleTokens {
  id            String    @id @default(uuid())
  userId        String
  tenantId      String
  
  // Tokens criptati
  accessToken   String    @db.Text
  refreshToken  String?   @db.Text
  expiryDate    BigInt    // Unix timestamp
  
  // Metadata
  scope         String[]  @default([])
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // Relations
  user          Person    @relation(fields: [userId], references: [id])
  tenant        Tenant    @relation(fields: [tenantId], references: [id])
  
  @@unique([userId, tenantId])
  @@index([userId])
  @@index([expiryDate])
}

// Estensione TemplateLink per Google
model TemplateLink {
  // ... campi esistenti ...
  
  // Google Integration
  googleDocsUrl     String?   // URL documento originale
  googleDocsId      String?   // ID documento Google
  googleSlidesUrl   String?   // URL presentazione Google
  googleSlidesId    String?   // ID presentazione Google
  lastSyncAt        DateTime? // Ultima sincronizzazione
  autoSync          Boolean   @default(false) // Sync automatico
  googleRevisionId  String?   // Revision ID per tracking changes
  
  @@index([googleDocsId])
  @@index([googleSlidesId])
}
```

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
// __tests__/google-integration.test.ts

import { GoogleIntegrationService } from '../services/google-integration-service';

describe('GoogleIntegrationService', () => {
  const service = new GoogleIntegrationService();

  describe('extractDocumentId', () => {
    it('should extract document ID from valid URL', () => {
      const url = 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit';
      const id = service.extractDocumentId(url);
      expect(id).toBe('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
    });

    it('should throw error for invalid URL', () => {
      expect(() => service.extractDocumentId('invalid-url')).toThrow();
    });
  });

  describe('convertDocsToHTML', () => {
    it('should convert simple paragraph', () => {
      const doc = {
        body: {
          content: [
            {
              paragraph: {
                elements: [
                  {
                    textRun: {
                      content: 'Hello World',
                      textStyle: { bold: true }
                    }
                  }
                ]
              }
            }
          ]
        }
      };

      const html = service.convertDocsToHTML(doc);
      expect(html).toContain('<strong>Hello World</strong>');
    });
  });
});
```

### Integration Tests

```typescript
// __tests__/google-import.e2e.test.ts

describe('Google Import E2E', () => {
  it('should import Google Docs successfully', async () => {
    // Mock OAuth tokens
    await saveTestTokens(testUserId, testTenantId);

    const response = await request(app)
      .post('/api/v1/templates/import/google-docs')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        documentUrl: testGoogleDocsUrl,
        name: 'Test Template'
      });

    expect(response.status).toBe(200);
    expect(response.body.html).toBeDefined();
    expect(response.body.metadata.googleDocsId).toBeDefined();
  });
});
```

---

## 🔄 Sync Strategy

### Auto-Sync Implementation

```javascript
// backend/jobs/google-sync-job.js

import cron from 'node-cron';
import { prisma } from '../config/database.js';
import googleIntegration from '../services/google-integration-service.js';

/**
 * Job che sincronizza template con Google Docs ogni ora
 */
export function startGoogleSyncJob() {
  // Esegui ogni ora
  cron.schedule('0 * * * *', async () => {
    console.log('[GoogleSync] Starting sync job...');

    try {
      // Trova template con autoSync abilitato
      const templates = await prisma.templateLink.findMany({
        where: {
          autoSync: true,
          googleDocsId: { not: null },
          deletedAt: null
        },
        include: { creator: true }
      });

      console.log(`[GoogleSync] Found ${templates.length} templates to sync`);

      for (const template of templates) {
        try {
          // Import nuovo contenuto
          const { html, metadata } = await googleIntegration.importFromGoogleDocs(
            template.googleDocsUrl,
            template.createdBy,
            template.tenantId
          );

          // Verifica se cambiato (confronta revision ID)
          if (metadata.lastModifiedTime !== template.googleRevisionId) {
            console.log(`[GoogleSync] Changes detected for template ${template.id}`);

            // Crea nuova versione
            const newVersion = template.version + 1;

            await prisma.templateLink.update({
              where: { id: template.id },
              data: {
                content: html,
                version: newVersion,
                googleRevisionId: metadata.lastModifiedTime,
                lastSyncAt: new Date()
              }
            });

            await prisma.templateVersion.create({
              data: {
                templateId: template.id,
                version: newVersion,
                content: html,
                changesSummary: 'Auto-synced from Google Docs',
                tenantId: template.tenantId,
                createdBy: template.createdBy
              }
            });

            console.log(`[GoogleSync] Template ${template.id} synced successfully`);
          } else {
            console.log(`[GoogleSync] No changes for template ${template.id}`);
          }
        } catch (error) {
          console.error(`[GoogleSync] Failed to sync template ${template.id}:`, error);
        }
      }
    } catch (error) {
      console.error('[GoogleSync] Job failed:', error);
    }
  });
}
```

---

## 📋 User Permissions

### Permission Matrix

| Azione | Admin | Manager | User |
|--------|-------|---------|------|
| Autorizza Google Account | ✅ | ✅ | ✅ |
| Import da Google Docs | ✅ | ✅ | ❌ |
| Import da Google Slides | ✅ | ✅ | ❌ |
| Abilita Auto-Sync | ✅ | ❌ | ❌ |
| Revoca autorizzazione | ✅ | ✅ (propria) | ✅ (propria) |

---

## 🚨 Error Handling

### Common Errors

```typescript
// utils/googleErrors.ts

export class GoogleAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoogleAuthError';
  }
}

export class GoogleImportError extends Error {
  constructor(message: string, public documentUrl: string) {
    super(message);
    this.name = 'GoogleImportError';
  }
}

export const GOOGLE_ERROR_MESSAGES = {
  AUTH_REQUIRED: 'Google authorization required. Please connect your account.',
  INVALID_URL: 'Invalid Google Docs/Slides URL',
  PERMISSION_DENIED: 'Permission denied. Make sure the document is accessible.',
  DOCUMENT_NOT_FOUND: 'Document not found',
  QUOTA_EXCEEDED: 'Google API quota exceeded. Please try again later.',
  TOKEN_EXPIRED: 'Authorization expired. Please reconnect your account.'
};
```

---

**Documento aggiornato**: 5 Novembre 2025  
**Status**: ✅ GOOGLE INTEGRATION SPECIFICATION COMPLETE
