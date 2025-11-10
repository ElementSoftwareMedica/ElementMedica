# Piano di Implementazione - Sistema Template Management

**Data**: 4 Novembre 2025  
**Versione**: 1.0  
**Status**: ✅ PIANO ESECUTIVO

---

## 📋 Indice

1. [Overview Timeline](#overview-timeline)
2. [Phase 0: Setup & Infrastructure](#phase-0-setup--infrastructure)
3. [Phase 1: Database & Core Services](#phase-1-database--core-services)
4. [Phase 2: Template Management](#phase-2-template-management)
5. [Phase 3: Lettere Incarico](#phase-3-lettere-incarico)
6. [Phase 4: Registri Presenze](#phase-4-registri-presenze)
7. [Phase 5: Attestati Enhancement](#phase-5-attestati-enhancement)
8. [Phase 6: Google Integration](#phase-6-google-integration)
9. [Phase 7: Testing & Optimization](#phase-7-testing--optimization)
10. [Dependencies & Critical Path](#dependencies--critical-path)
11. [Risk Management](#risk-management)
12. [Rollback Strategy](#rollback-strategy)

---

## 📅 Overview Timeline

### Gantt Chart Visuale

```
Settimana 1: Setup & Database
├─ Giorni 1-2: [████████] Setup infrastruttura
├─ Giorni 3-4: [████████] Database migration
└─ Giorno 5:   [████████] Core services

Settimana 2: Template Management
├─ Giorni 1-2: [████████] Backend API templates
├─ Giorni 3-4: [████████] Frontend editor
└─ Giorno 5:   [████████] Testing & refinement

Settimana 3: Lettere Incarico
├─ Giorni 1-2: [████████] Backend implementation
├─ Giorni 3-4: [████████] Frontend integration
└─ Giorno 5:   [████████] Testing

Settimana 4: Registri Presenze
├─ Giorni 1-2: [████████] Backend implementation
├─ Giorni 3-4: [████████] Frontend integration
└─ Giorno 5:   [████████] Testing

Settimana 5: Attestati Enhancement
├─ Giorni 1-2: [████████] Migration to new system
├─ Giorni 3-4: [████████] Batch optimization
└─ Giorno 5:   [████████] Testing

Settimana 6: Google Integration
├─ Giorni 1-2: [████████] OAuth2 setup
├─ Giorni 3-4: [████████] Import/sync features
└─ Giorno 5:   [████████] Testing

Settimana 7: Final Testing & Polish
├─ Giorni 1-2: [████████] Integration testing
├─ Giorni 3-4: [████████] Performance optimization
└─ Giorno 5:   [████████] Documentation & training
```

### Milestones Principali

| Milestone | Data Target | Deliverables |
|-----------|-------------|--------------|
| **M0: Infrastructure Ready** | Giorno 2 | Redis, Queue, File storage setup |
| **M1: Database Migrated** | Giorno 4 | New schema deployed, data migrated |
| **M2: Core Services Ready** | Giorno 5 | MarkerResolver, PDFGenerator operativi |
| **M3: Template CRUD Complete** | Giorno 10 | Template management fully functional |
| **M4: Lettere Incarico Live** | Giorno 15 | First document type in production |
| **M5: Registri Presenze Live** | Giorno 20 | Second document type in production |
| **M6: Attestati Migrated** | Giorno 25 | Existing attestati moved to new system |
| **M7: Google Integration** | Giorno 30 | Import from Google Docs working |
| **M8: System Complete** | Giorno 35 | All features tested and documented |

---

## 🔧 Phase 0: Setup & Infrastructure

**Durata**: 2 giorni (Giorno 1-2)  
**Team**: 1 Backend Developer, 1 DevOps Engineer

### Obiettivi
- Setup Redis per queue e cache
- Configurazione Bull queue system
- Setup file storage (local + S3 optional)
- Puppeteer configuration e browser pool

### Tasks Dettagliate

#### Day 1 - Morning: Redis Setup

```bash
# 1. Install Redis
brew install redis  # macOS
# oppure
sudo apt-get install redis-server  # Linux

# 2. Configure Redis
cat > /etc/redis/redis.conf << EOF
bind 127.0.0.1
port 6379
maxmemory 512mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
EOF

# 3. Start Redis
redis-server /etc/redis/redis.conf

# 4. Test connection
redis-cli ping
# Expected: PONG
```

**File**: `backend/config/redis.js`
```javascript
import Redis from 'ioredis';

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

export const redis = new Redis(redisConfig);

// Test connection
redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

export default redis;
```

#### Day 1 - Afternoon: Bull Queue Setup

**File**: `backend/services/queueService.js`
```javascript
import Queue from 'bull';
import redis from '../config/redis.js';

// Document generation queue
export const documentQueue = new Queue('document-generation', {
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

// Email queue
export const emailQueue = new Queue('email-sending', {
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

// Queue event handlers
documentQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed:`, result);
});

documentQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});

documentQueue.on('progress', (job, progress) => {
  console.log(`Job ${job.id} progress: ${progress}%`);
});

export default { documentQueue, emailQueue };
```

#### Day 2 - Morning: File Storage Setup

**File**: `backend/config/storage.js`
```javascript
import fs from 'fs';
import path from 'path';
import { S3Client } from '@aws-sdk/client-s3';

const STORAGE_MODE = process.env.STORAGE_MODE || 'local'; // 'local' or 's3'

// Local storage configuration
const LOCAL_STORAGE_PATH = process.env.UPLOAD_PATH || path.join(process.cwd(), 'uploads');

// Ensure upload directory exists
if (STORAGE_MODE === 'local') {
  ['documents', 'templates', 'temp'].forEach(subdir => {
    const dirPath = path.join(LOCAL_STORAGE_PATH, subdir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ Created directory: ${dirPath}`);
    }
  });
}

// S3 configuration (optional)
const s3Client = STORAGE_MODE === 's3' ? new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
}) : null;

export const storageConfig = {
  mode: STORAGE_MODE,
  localPath: LOCAL_STORAGE_PATH,
  s3Client,
  s3Bucket: process.env.AWS_S3_BUCKET,
};

export default storageConfig;
```

**File**: `backend/services/storageService.js`
```javascript
import fs from 'fs/promises';
import path from 'path';
import { storageConfig } from '../config/storage.js';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

class StorageService {
  /**
   * Save file to storage
   */
  async saveFile(buffer, filename, directory = 'documents') {
    if (storageConfig.mode === 'local') {
      return await this.saveFileLocal(buffer, filename, directory);
    } else {
      return await this.saveFileS3(buffer, filename, directory);
    }
  }

  /**
   * Save file locally
   */
  async saveFileLocal(buffer, filename, directory) {
    const dirPath = path.join(storageConfig.localPath, directory);
    const filePath = path.join(dirPath, filename);
    
    await fs.writeFile(filePath, buffer);
    
    return {
      filepath: path.join(directory, filename),
      fileUrl: `/uploads/${directory}/${filename}`,
      storage: 'local',
    };
  }

  /**
   * Save file to S3
   */
  async saveFileS3(buffer, filename, directory) {
    const key = `${directory}/${filename}`;
    
    await storageConfig.s3Client.send(
      new PutObjectCommand({
        Bucket: storageConfig.s3Bucket,
        Key: key,
        Body: buffer,
        ContentType: 'application/pdf',
      })
    );
    
    // Generate signed URL
    const url = await getSignedUrl(
      storageConfig.s3Client,
      new GetObjectCommand({
        Bucket: storageConfig.s3Bucket,
        Key: key,
      }),
      { expiresIn: 3600 } // 1 hour
    );
    
    return {
      filepath: key,
      fileUrl: url,
      storage: 's3',
    };
  }

  /**
   * Delete file
   */
  async deleteFile(filepath) {
    if (storageConfig.mode === 'local') {
      const fullPath = path.join(storageConfig.localPath, filepath);
      await fs.unlink(fullPath);
    } else {
      // S3 delete implementation
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      await storageConfig.s3Client.send(
        new DeleteObjectCommand({
          Bucket: storageConfig.s3Bucket,
          Key: filepath,
        })
      );
    }
  }
}

export default new StorageService();
```

#### Day 2 - Afternoon: Puppeteer Setup

**File**: `backend/config/puppeteer.js`
```javascript
import puppeteer from 'puppeteer';
import genericPool from 'generic-pool';

// Browser pool configuration
const browserPool = genericPool.createPool(
  {
    create: async () => {
      console.log('🚀 Creating new browser instance...');
      return await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
      });
    },
    destroy: async (browser) => {
      console.log('🔻 Destroying browser instance...');
      await browser.close();
    },
  },
  {
    min: 2,                    // Minimum 2 instances
    max: 10,                   // Maximum 10 instances
    idleTimeoutMillis: 30000,  // Close idle after 30s
    acquireTimeoutMillis: 10000, // Timeout acquiring browser
  }
);

export default browserPool;
```

**File**: `backend/services/pdfService.js`
```javascript
import browserPool from '../config/puppeteer.js';

class PDFService {
  /**
   * Generate PDF from HTML
   */
  async generatePDF(html, options = {}) {
    const browser = await browserPool.acquire();
    
    try {
      const page = await browser.newPage();
      
      // Set viewport
      await page.setViewport({
        width: 1200,
        height: 1600,
      });
      
      // Load HTML
      await page.setContent(html, {
        waitUntil: 'networkidle0',
      });
      
      // Generate PDF
      const pdf = await page.pdf({
        format: options.format || 'A4',
        orientation: options.orientation || 'portrait',
        printBackground: true,
        margin: options.margin || {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
        displayHeaderFooter: options.displayHeaderFooter || false,
        headerTemplate: options.headerTemplate || '',
        footerTemplate: options.footerTemplate || '',
      });
      
      await page.close();
      
      return pdf;
    } finally {
      await browserPool.release(browser);
    }
  }
}

export default new PDFService();
```

### Testing Phase 0

**File**: `backend/tests/setup.test.js`
```javascript
import { describe, test, expect } from '@jest/globals';
import redis from '../config/redis.js';
import { documentQueue } from '../services/queueService.js';
import storageService from '../services/storageService.js';
import pdfService from '../services/pdfService.js';

describe('Infrastructure Setup', () => {
  test('Redis connection', async () => {
    const result = await redis.ping();
    expect(result).toBe('PONG');
  });

  test('Queue system', async () => {
    const job = await documentQueue.add('test-job', { test: true });
    expect(job.id).toBeDefined();
    await job.remove();
  });

  test('File storage', async () => {
    const testBuffer = Buffer.from('test content');
    const result = await storageService.saveFile(testBuffer, 'test.txt', 'temp');
    expect(result.filepath).toBeDefined();
    await storageService.deleteFile(result.filepath);
  });

  test('PDF generation', async () => {
    const html = '<html><body><h1>Test PDF</h1></body></html>';
    const pdf = await pdfService.generatePDF(html);
    expect(pdf).toBeInstanceOf(Buffer);
    expect(pdf.length).toBeGreaterThan(0);
  });
});
```

### Deliverables Phase 0

- ✅ Redis operativo e testato
- ✅ Bull queue configurato con 2 code (documents, emails)
- ✅ File storage funzionante (local + S3 optional)
- ✅ Puppeteer pool operativo con 2-10 istanze
- ✅ Tests infrastruttura passati
- ✅ Documentazione setup completata

---

## 🗄️ Phase 1: Database & Core Services

**Durata**: 3 giorni (Giorno 3-5)  
**Team**: 1 Backend Developer, 1 Database Engineer

### Obiettivi
- Creare e applicare migration Prisma
- Implementare MarkerResolver service
- Implementare TemplateValidator service
- Setup audit logging
- Data migration esistente

### Day 3: Database Migration

#### Task 1.1: Create Enums

**File**: `backend/prisma/migrations/YYYYMMDDHHMMSS_add_template_enums/migration.sql`
```sql
-- Create TemplateType enum
CREATE TYPE "TemplateType" AS ENUM (
  'LETTER_OF_ENGAGEMENT',
  'ATTENDANCE_REGISTER',
  'CERTIFICATE',
  'INVOICE',
  'COURSE_PROGRAM',
  'CUSTOM'
);

-- Create TemplateFormat enum
CREATE TYPE "TemplateFormat" AS ENUM (
  'HTML',
  'DOCX',
  'GOOGLE_DOCS',
  'GOOGLE_SLIDES'
);

-- Create DocumentStatus enum
CREATE TYPE "DocumentStatus" AS ENUM (
  'DRAFT',
  'GENERATED',
  'SENT',
  'ARCHIVED'
);
```

#### Task 1.2: Enhance TemplateLink

**File**: `backend/prisma/schema.prisma` (update)
```prisma
model TemplateLink {
  id                String              @id @default(uuid())
  name              String
  type              TemplateType        // Changed from String to enum
  fileFormat        TemplateFormat?     // Changed from String to enum
  
  // Content fields (existing)
  content           String?             @db.Text
  header            String?             @db.Text
  footer            String?             @db.Text
  
  // NEW: Layout & Styling
  styles            Json?
  layout            Json?
  logoImage         String?
  logoPosition      String?
  
  // NEW: Marker configuration
  markers           Json?
  markerSchema      Json?
  
  // NEW: Versioning
  version           Int                 @default(1)
  isActive          Boolean             @default(true)
  isDefault         Boolean             @default(false)
  
  // NEW: Google Integration
  googleDocsUrl     String?
  lastSyncedAt      DateTime?
  syncEnabled       Boolean             @default(false)
  
  // NEW: Metadata
  description       String?
  category          String?
  tags              String[]            @default([])
  
  // Multi-tenant & Audit (existing)
  companyId         String?
  tenantId          String
  createdBy         String?
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  deletedAt         DateTime?
  
  // Relations (existing)
  company           Company?            @relation(fields: [companyId], references: [id])
  tenant            Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  creator           Person?             @relation("TemplateCreator", fields: [createdBy], references: [id])
  
  // NEW: Relations
  versions          TemplateVersion[]
  generatedDocs     GeneratedDocument[]
  
  @@index([tenantId])
  @@index([tenantId, type])
  @@index([tenantId, type, isActive])
  @@index([companyId])
  @@index([isDefault, type])
  @@index([deletedAt])
}
```

#### Task 1.3: Create TemplateVersion Model

```prisma
model TemplateVersion {
  id              String        @id @default(uuid())
  templateId      String
  version         Int
  
  // Snapshot of content
  content         String        @db.Text
  header          String?       @db.Text
  footer          String?       @db.Text
  styles          Json?
  layout          Json?
  markers         Json?
  
  // Change tracking
  changesSummary  String?
  changeDetails   Json?
  
  // Metadata
  createdBy       String
  createdAt       DateTime      @default(now())
  tenantId        String
  
  // Relations
  template        TemplateLink  @relation(fields: [templateId], references: [id], onDelete: Cascade)
  creator         Person        @relation("VersionCreator", fields: [createdBy], references: [id])
  tenant          Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@unique([templateId, version])
  @@index([templateId, createdAt])
  @@index([tenantId])
}
```

#### Task 1.4: Create GeneratedDocument Model

```prisma
model GeneratedDocument {
  id              String          @id @default(uuid())
  
  // Template reference
  templateId      String
  templateVersion Int
  type            TemplateType
  
  // Entity reference
  entityType      String
  entityId        String
  
  // File info
  filename        String
  filepath        String
  fileUrl         String
  fileSize        Int
  fileHash        String?
  mimeType        String          @default("application/pdf")
  
  // Generation context
  markers         Json
  metadata        Json?
  status          DocumentStatus  @default(GENERATED)
  
  // Batch reference
  batchId         String?
  batchSize       Int?
  batchIndex      Int?
  
  // Delivery
  sentAt          DateTime?
  sentTo          String?
  downloadCount   Int             @default(0)
  lastDownloadAt  DateTime?
  
  // Audit
  generatedBy     String
  generatedAt     DateTime        @default(now())
  tenantId        String
  deletedAt       DateTime?
  
  // Relations
  template        TemplateLink    @relation(fields: [templateId], references: [id])
  generator       Person          @relation("DocumentGenerator", fields: [generatedBy], references: [id])
  tenant          Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@index([templateId])
  @@index([entityType, entityId])
  @@index([tenantId, generatedAt])
  @@index([generatedBy])
  @@index([batchId])
  @@index([status])
  @@index([type, status])
}
```

#### Task 1.5: Enhance Existing Models

```prisma
// Attestato - add template reference
model Attestato {
  // ... existing fields ...
  
  // NEW fields
  templateId      String?
  templateVersion Int?
  markers         Json?
  generatedBy     String?
  fileSize        Int?
  
  // NEW relation
  template        TemplateLink?  @relation(fields: [templateId], references: [id])
  
  @@index([templateId])
}

// LetteraIncarico - add template reference
model LetteraIncarico {
  // ... existing fields ...
  
  // NEW fields
  templateId      String?
  templateVersion Int?
  markers         Json?
  generatedBy     String?
  fileSize        Int?
  
  // NEW relation
  template        TemplateLink?  @relation(fields: [templateId], references: [id])
  
  @@index([templateId])
}

// RegistroPresenze - add template reference
model RegistroPresenze {
  // ... existing fields ...
  
  // NEW fields
  templateId      String?
  templateVersion Int?
  markers         Json?
  generatedBy     String?
  fileSize        Int?
  
  // NEW relation
  template        TemplateLink?  @relation(fields: [templateId], references: [id])
  
  @@index([templateId])
}
```

#### Apply Migration

```bash
# Generate migration
npx prisma migrate dev --name add_template_system

# Apply migration
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### Day 4: MarkerResolver Implementation

**File**: `backend/services/markerResolver.js`
```javascript
/**
 * MarkerResolver Service
 * 
 * Core service for parsing and resolving template markers
 */
class MarkerResolver {
  constructor(context, options = {}) {
    this.context = new MarkerContext(context);
    this.formatters = new FormatterRegistry();
    this.options = {
      strict: options.strict ?? true,
      escapeHtml: options.escapeHtml ?? true,
      maxDepth: options.maxDepth ?? 3,
      cacheResults: options.cacheResults ?? true,
    };
    this.cache = new Map();
  }

  /**
   * Resolve all markers in template
   */
  resolve(template) {
    if (!template || typeof template !== 'string') {
      throw new Error('Template must be a non-empty string');
    }

    const markers = this.parseMarkers(template);
    let result = template;

    for (const marker of markers) {
      const value = this.resolveMarker(marker);
      result = result.replace(marker.raw, value);
    }

    return result;
  }

  /**
   * Parse markers from template
   */
  parseMarkers(template) {
    const markers = [];
    const markerRegex = /\{\{([^}]+)\}\}/g;
    
    let match;
    while ((match = markerRegex.exec(template)) !== null) {
      const raw = match[0];
      const content = match[1].trim();
      const [path, formatterStr] = content.split('|').map(s => s.trim());
      
      markers.push({
        raw,
        path,
        formatter: formatterStr || null,
        type: this.detectMarkerType(path),
      });
    }
    
    return markers;
  }

  /**
   * Resolve single marker
   */
  resolveMarker(marker) {
    if (this.options.cacheResults && this.cache.has(marker.raw)) {
      return this.cache.get(marker.raw);
    }

    let value = this.context.get(marker.path);
    
    if (value === undefined || value === null) {
      if (this.options.strict) {
        throw new MarkerResolutionError(`Marker not found: ${marker.path}`);
      }
      value = '';
    }

    if (marker.formatter) {
      value = this.applyFormatter(value, marker.formatter);
    }

    if (this.options.escapeHtml && typeof value === 'string') {
      value = this.escapeHtml(value);
    }

    const result = String(value);

    if (this.options.cacheResults) {
      this.cache.set(marker.raw, result);
    }

    return result;
  }

  /**
   * Apply formatter to value
   */
  applyFormatter(value, formatterStr) {
    const [name, ...args] = formatterStr.split(':').map(s => s.trim());
    
    const formatter = this.formatters.get(name);
    if (!formatter) {
      throw new Error(`Formatter not found: ${name}`);
    }

    return formatter(value, ...args);
  }

  /**
   * Validate template markers
   */
  validate(template) {
    const markers = this.parseMarkers(template);
    const errors = [];
    const warnings = [];

    for (const marker of markers) {
      if (!this.context.has(marker.path)) {
        errors.push({
          marker: marker.raw,
          message: `Marker not found in context: ${marker.path}`,
          suggestion: this.suggestCorrection(marker.path),
        });
      }

      if (marker.formatter) {
        const [name] = marker.formatter.split(':');
        if (!this.formatters.has(name)) {
          errors.push({
            marker: marker.raw,
            message: `Unknown formatter: ${name}`,
            availableFormatters: this.formatters.list(),
          });
        }
      }

      const depth = marker.path.split('.').length;
      if (depth > this.options.maxDepth) {
        warnings.push({
          marker: marker.raw,
          message: `Nesting depth ${depth} exceeds recommended maximum ${this.options.maxDepth}`,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      markerCount: markers.length,
    };
  }

  /**
   * Escape HTML
   */
  escapeHtml(str) {
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return str.replace(/[&<>"']/g, char => escapeMap[char]);
  }

  /**
   * Detect marker type
   */
  detectMarkerType(path) {
    if (path.startsWith('#if ')) return 'conditional';
    if (path.startsWith('#each ')) return 'loop';
    return 'simple';
  }

  /**
   * Suggest correction for typo
   */
  suggestCorrection(path) {
    const availablePaths = this.context.getAllPaths();
    const suggestions = availablePaths
      .map(availPath => ({
        path: availPath,
        distance: this.levenshteinDistance(path, availPath),
      }))
      .filter(s => s.distance <= 3)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)
      .map(s => s.path);

    return suggestions.length > 0 ? suggestions : null;
  }

  /**
   * Levenshtein distance
   */
  levenshteinDistance(a, b) {
    const matrix = [];
    
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
  }
}

/**
 * Marker Context
 */
class MarkerContext {
  constructor(data) {
    this.data = data;
  }

  get(path) {
    const parts = path.split('.');
    let value = this.data;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[part];
    }

    return value;
  }

  has(path) {
    return this.get(path) !== undefined;
  }

  set(path, value) {
    const parts = path.split('.');
    const last = parts.pop();
    let target = this.data;

    for (const part of parts) {
      if (!target[part]) {
        target[part] = {};
      }
      target = target[part];
    }

    target[last] = value;
  }

  getAllPaths(obj = this.data, prefix = '') {
    const paths = [];

    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      paths.push(path);

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        paths.push(...this.getAllPaths(value, path));
      }
    }

    return paths;
  }
}

/**
 * Formatter Registry
 */
class FormatterRegistry {
  constructor() {
    this.formatters = new Map();
    this.registerDefaultFormatters();
  }

  registerDefaultFormatters() {
    // Date formatter
    this.register('date', (value, pattern = 'DD/MM/YYYY') => {
      const date = new Date(value);
      if (isNaN(date)) return value;

      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();

      return pattern
        .replace('DD', day)
        .replace('MM', month)
        .replace('YYYY', year);
    });

    // Currency formatter
    this.register('currency', (value, format = '€ 0,0.00') => {
      const num = parseFloat(value);
      if (isNaN(num)) return value;

      return format.replace('0,0.00', num.toLocaleString('it-IT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }));
    });

    // Number formatter
    this.register('number', (value, format = '0,0') => {
      const num = parseFloat(value);
      if (isNaN(num)) return value;

      const decimals = (format.match(/\.0+/) || [''])[0].length - 1;
      return num.toLocaleString('it-IT', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    });

    // String formatters
    this.register('uppercase', value => String(value).toUpperCase());
    this.register('lowercase', value => String(value).toLowerCase());
    this.register('capitalize', value => {
      const str = String(value);
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    });
  }

  register(name, fn) {
    if (typeof fn !== 'function') {
      throw new Error('Formatter must be a function');
    }
    this.formatters.set(name, fn);
  }

  get(name) {
    return this.formatters.get(name);
  }

  has(name) {
    return this.formatters.has(name);
  }

  list() {
    return Array.from(this.formatters.keys());
  }
}

/**
 * Custom error
 */
class MarkerResolutionError extends Error {
  constructor(message, marker = null) {
    super(message);
    this.name = 'MarkerResolutionError';
    this.marker = marker;
  }
}

export { MarkerResolver, MarkerContext, FormatterRegistry, MarkerResolutionError };
```

### Day 5: Core Services Integration

**File**: `backend/services/documentService.js`
```javascript
import { PrismaClient } from '@prisma/client';
import { MarkerResolver } from './markerResolver.js';
import pdfService from './pdfService.js';
import storageService from './storageService.js';
import { documentQueue } from './queueService.js';
import crypto from 'crypto';

const prisma = new PrismaClient();

class DocumentService {
  /**
   * Generate single document
   */
  async generateDocument({
    templateId,
    entityType,
    entityId,
    userId,
    tenantId,
    options = {},
  }) {
    // Load template
    const template = await prisma.templateLink.findUnique({
      where: { id: templateId },
    });

    if (!template || template.deletedAt) {
      throw new Error('Template not found');
    }

    // Load entity data
    const entityData = await this.loadEntityData(entityType, entityId, tenantId);

    // Build context
    const context = this.buildContext(entityData, options);

    // Resolve markers
    const resolver = new MarkerResolver(context);
    const validation = resolver.validate(template.content);

    if (!validation.valid) {
      throw new Error(`Template validation failed: ${JSON.stringify(validation.errors)}`);
    }

    const html = resolver.resolve(template.content);

    // Generate PDF
    const pdf = await pdfService.generatePDF(html, {
      format: 'A4',
      margin: template.layout?.margins,
    });

    // Save file
    const filename = this.generateFilename(template.type, entityId);
    const fileResult = await storageService.saveFile(pdf, filename, 'documents');

    // Calculate file hash
    const fileHash = crypto.createHash('sha256').update(pdf).digest('hex');

    // Save metadata
    const document = await prisma.generatedDocument.create({
      data: {
        templateId,
        templateVersion: template.version,
        type: template.type,
        entityType,
        entityId,
        filename,
        filepath: fileResult.filepath,
        fileUrl: fileResult.fileUrl,
        fileSize: pdf.length,
        fileHash,
        markers: context,
        generatedBy: userId,
        tenantId,
      },
    });

    return document;
  }

  /**
   * Generate batch documents (queue)
   */
  async generateBatch({
    templateId,
    entityType,
    entityIds,
    userId,
    tenantId,
    options = {},
  }) {
    const job = await documentQueue.add('batch-generation', {
      templateId,
      entityType,
      entityIds,
      userId,
      tenantId,
      options,
    });

    return {
      jobId: job.id,
      status: 'PENDING',
      totalDocuments: entityIds.length,
    };
  }

  /**
   * Load entity data from database
   */
  async loadEntityData(entityType, entityId, tenantId) {
    switch (entityType) {
      case 'schedule':
        return await prisma.courseSchedule.findUnique({
          where: { id: entityId, tenantId },
          include: {
            course: true,
            trainer: {
              include: { company: true },
            },
            company: true,
            sessions: {
              where: { deletedAt: null },
              orderBy: { startTime: 'asc' },
            },
            enrollments: {
              where: { status: 'COMPLETED', deletedAt: null },
              include: {
                person: {
                  include: { company: true },
                },
              },
            },
          },
        });

      case 'person':
        return await prisma.person.findUnique({
          where: { id: entityId, tenantId },
          include: {
            company: true,
          },
        });

      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }

  /**
   * Build marker context
   */
  buildContext(entityData, options) {
    const context = {
      ...entityData,
      system: {
        currentDate: new Date().toLocaleDateString('it-IT'),
        currentYear: new Date().getFullYear().toString(),
      },
    };

    if (options.personId && entityData.enrollments) {
      const enrollment = entityData.enrollments.find(e => e.personId === options.personId);
      if (enrollment) {
        context.participant = enrollment.person;
      }
    }

    return context;
  }

  /**
   * Generate filename
   */
  generateFilename(type, entityId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `${type.toLowerCase()}-${entityId.substring(0, 8)}-${timestamp}-${random}.pdf`;
  }
}

export default new DocumentService();
```

### Testing Phase 1

```javascript
describe('Core Services', () => {
  test('MarkerResolver - simple markers', () => {
    const resolver = new MarkerResolver({
      person: { firstName: 'Mario', lastName: 'Rossi' },
    });

    const result = resolver.resolve('{{person.firstName}} {{person.lastName}}');
    expect(result).toBe('Mario Rossi');
  });

  test('MarkerResolver - with formatter', () => {
    const resolver = new MarkerResolver({
      date: '2025-11-04',
    });

    const result = resolver.resolve('{{date|date:DD/MM/YYYY}}');
    expect(result).toBe('04/11/2025');
  });

  test('Document generation', async () => {
    const document = await documentService.generateDocument({
      templateId: 'template-uuid',
      entityType: 'schedule',
      entityId: 'schedule-uuid',
      userId: 'user-uuid',
      tenantId: 'tenant-uuid',
    });

    expect(document.id).toBeDefined();
    expect(document.fileUrl).toBeDefined();
  });
});
```

### Deliverables Phase 1

- ✅ Database schema migrated con nuovi modelli
- ✅ MarkerResolver service operativo con 60+ markers
- ✅ PDF generation service con browser pool
- ✅ Storage service (local + S3)
- ✅ Document service per generation completa
- ✅ Tests unitari passati
- ✅ Data migration script per dati esistenti

---

## 📝 Phase 2: Template Management

**Durata**: 5 giorni (Giorno 6-10)  
**Team**: 1 Backend Developer, 1 Frontend Developer

### Obiettivi
- API completa per template CRUD
- Frontend editor con Tiptap
- Marker picker con autocomplete
- Preview in tempo reale
- Validation sistema

### Day 6-7: Backend API Templates

**File**: `backend/routes/template-routes.js`
```javascript
import express from 'express';
import { PrismaClient } from '@prisma/client';
import middleware from '../auth/middleware.js';
import { body, validationResult } from 'express-validator';
import { MarkerResolver } from '../services/markerResolver.js';

const router = express.Router();
const prisma = new PrismaClient();
const { authenticate: authenticateToken, authorize: requirePermission } = middleware;

// Validation
const validateTemplate = [
  body('name').notEmpty().withMessage('Name is required'),
  body('type').isIn(['LETTER_OF_ENGAGEMENT', 'ATTENDANCE_REGISTER', 'CERTIFICATE', 'INVOICE', 'COURSE_PROGRAM', 'CUSTOM']),
  body('content').optional().isString(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation error', details: errors.array() });
    }
    next();
  }
];

// GET /api/templates - List all templates
router.get('/', authenticateToken(), requirePermission('read:templates'), async (req, res) => {
  try {
    const { type, isActive, isDefault } = req.query;
    const tenantId = req.user.tenantId;

    const templates = await prisma.templateLink.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(type && { type }),
        ...(isActive !== undefined && { isActive: isActive === 'true' }),
        ...(isDefault !== undefined && { isDefault: isDefault === 'true' }),
      },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true },
        },
        company: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// GET /api/templates/:id - Get single template
router.get('/:id', authenticateToken(), requirePermission('read:templates'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const template = await prisma.templateLink.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        creator: true,
        company: true,
        versions: {
          orderBy: { version: 'desc' },
          take: 5,
        },
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// POST /api/templates - Create template
router.post('/', authenticateToken(), requirePermission('create:templates'), validateTemplate, async (req, res) => {
  try {
    const { name, type, content, header, footer, styles, layout, markers, isDefault, companyId } = req.body;
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.templateLink.updateMany({
        where: { tenantId, type, isDefault: true },
        data: { isDefault: false },
      });
    }

    const template = await prisma.templateLink.create({
      data: {
        name,
        type,
        content,
        header,
        footer,
        styles,
        layout,
        markers,
        isDefault: isDefault || false,
        companyId,
        tenantId,
        createdBy: userId,
        version: 1,
      },
    });

    // Create initial version
    await prisma.templateVersion.create({
      data: {
        templateId: template.id,
        version: 1,
        content: content || '',
        header,
        footer,
        styles,
        layout,
        markers,
        changesSummary: 'Initial version',
        createdBy: userId,
        tenantId,
      },
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// PUT /api/templates/:id - Update template
router.put('/:id', authenticateToken(), requirePermission('update:templates'), validateTemplate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, content, header, footer, styles, layout, markers, isDefault } = req.body;
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    const existing = await prisma.templateLink.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Increment version
    const newVersion = existing.version + 1;

    // Update template
    const updated = await prisma.templateLink.update({
      where: { id },
      data: {
        name,
        content,
        header,
        footer,
        styles,
        layout,
        markers,
        isDefault,
        version: newVersion,
      },
    });

    // Create version snapshot
    await prisma.templateVersion.create({
      data: {
        templateId: id,
        version: newVersion,
        content: content || '',
        header,
        footer,
        styles,
        layout,
        markers,
        changesSummary: `Updated to version ${newVersion}`,
        createdBy: userId,
        tenantId,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// DELETE /api/templates/:id - Soft delete template
router.delete('/:id', authenticateToken(), requirePermission('delete:templates'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    await prisma.templateLink.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// POST /api/templates/:id/validate - Validate markers
router.post('/:id/validate', authenticateToken(), async (req, res) => {
  try {
    const { id } = req.params;
    const { mockData } = req.body;
    const tenantId = req.user.tenantId;

    const template = await prisma.templateLink.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const resolver = new MarkerResolver(mockData || {});
    const validation = resolver.validate(template.content);

    res.json(validation);
  } catch (error) {
    console.error('Error validating template:', error);
    res.status(500).json({ error: 'Failed to validate template' });
  }
});

// POST /api/templates/:id/preview - Preview with mock data
router.post('/:id/preview', authenticateToken(), async (req, res) => {
  try {
    const { id } = req.params;
    const { mockData } = req.body;
    const tenantId = req.user.tenantId;

    const template = await prisma.templateLink.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const resolver = new MarkerResolver(mockData || {});
    const html = resolver.resolve(template.content);

    res.json({ html });
  } catch (error) {
    console.error('Error previewing template:', error);
    res.status(500).json({ error: 'Failed to preview template' });
  }
});

// GET /api/templates/:id/versions - Version history
router.get('/:id/versions', authenticateToken(), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const versions = await prisma.templateVersion.findMany({
      where: { templateId: id, tenantId },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { version: 'desc' },
    });

    res.json(versions);
  } catch (error) {
    console.error('Error fetching versions:', error);
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
});

export default router;
```

### Day 8-9: Frontend Template Editor

**File**: `src/services/templateService.ts`
```typescript
import { apiGet, apiPost, apiPut, apiDelete } from './api';

export interface Template {
  id: string;
  name: string;
  type: TemplateType;
  content?: string;
  header?: string;
  footer?: string;
  styles?: any;
  layout?: any;
  markers?: MarkerDefinition[];
  version: number;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TemplateType =
  | 'LETTER_OF_ENGAGEMENT'
  | 'ATTENDANCE_REGISTER'
  | 'CERTIFICATE'
  | 'INVOICE'
  | 'COURSE_PROGRAM'
  | 'CUSTOM';

export interface MarkerDefinition {
  key: string;
  label: string;
  type: string;
  description?: string;
}

class TemplateService {
  async getTemplates(filters?: { type?: string; isActive?: boolean }): Promise<Template[]> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
    
    return apiGet(`/api/templates?${params.toString()}`);
  }

  async getTemplate(id: string): Promise<Template> {
    return apiGet(`/api/templates/${id}`);
  }

  async createTemplate(data: Partial<Template>): Promise<Template> {
    return apiPost('/api/templates', data);
  }

  async updateTemplate(id: string, data: Partial<Template>): Promise<Template> {
    return apiPut(`/api/templates/${id}`, data);
  }

  async deleteTemplate(id: string): Promise<void> {
    return apiDelete(`/api/templates/${id}`);
  }

  async validateTemplate(id: string, mockData?: any): Promise<ValidationResult> {
    return apiPost(`/api/templates/${id}/validate`, { mockData });
  }

  async previewTemplate(id: string, mockData?: any): Promise<{ html: string }> {
    return apiPost(`/api/templates/${id}/preview`, { mockData });
  }

  async getVersions(id: string): Promise<TemplateVersion[]> {
    return apiGet(`/api/templates/${id}/versions`);
  }
}

export default new TemplateService();
```

**File**: `src/components/templates/TemplateEditor.tsx`
```typescript
import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { Template, TemplateType } from '../../services/templateService';
import templateService from '../../services/templateService';
import MarkerPicker from './MarkerPicker';
import PreviewPane from './PreviewPane';

interface TemplateEditorProps {
  templateId?: string;
  onSave?: (template: Template) => void;
}

export default function TemplateEditor({ templateId, onSave }: TemplateEditorProps) {
  const [template, setTemplate] = useState<Partial<Template>>({
    name: '',
    type: 'CERTIFICATE',
    content: '',
    isDefault: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<any[]>([]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: template.content || '',
    onUpdate: ({ editor }) => {
      setTemplate(prev => ({ ...prev, content: editor.getHTML() }));
    },
  });

  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId]);

  const loadTemplate = async () => {
    try {
      const data = await templateService.getTemplate(templateId!);
      setTemplate(data);
      editor?.commands.setContent(data.content || '');
    } catch (error) {
      console.error('Failed to load template:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Validate first
      const validation = await templateService.validateTemplate(
        templateId || 'new',
        {} // Mock data
      );

      if (!validation.valid) {
        setErrors(validation.errors);
        return;
      }

      let saved: Template;
      if (templateId) {
        saved = await templateService.updateTemplate(templateId, template);
      } else {
        saved = await templateService.createTemplate(template);
      }

      onSave?.(saved);
    } catch (error) {
      console.error('Failed to save template:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const insertMarker = (marker: string) => {
    editor?.commands.insertContent(`{{${marker}}}`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={template.name}
            onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Nome template"
            className="text-xl font-semibold border-0 focus:outline-none"
          />
          <select
            value={template.type}
            onChange={(e) => setTemplate(prev => ({ ...prev, type: e.target.value as TemplateType }))}
            className="border rounded px-3 py-1"
          >
            <option value="CERTIFICATE">Attestato</option>
            <option value="LETTER_OF_ENGAGEMENT">Lettera Incarico</option>
            <option value="ATTENDANCE_REGISTER">Registro Presenze</option>
            <option value="COURSE_PROGRAM">Programma Corso</option>
            <option value="INVOICE">Fattura</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            {showPreview ? 'Nascondi' : 'Mostra'} Preview
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <h3 className="font-semibold text-red-800">Errori di validazione:</h3>
          <ul className="mt-2 space-y-1">
            {errors.map((error, i) => (
              <li key={i} className="text-sm text-red-700">
                <code className="bg-red-100 px-1">{error.marker}</code> - {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <div className={`flex-1 flex flex-col ${showPreview ? 'w-1/2' : 'w-full'}`}>
          <div className="border-b p-2 flex items-center gap-2 bg-gray-50">
            <button
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className={`px-3 py-1 rounded ${editor?.isActive('bold') ? 'bg-gray-200' : ''}`}
            >
              <strong>B</strong>
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={`px-3 py-1 rounded ${editor?.isActive('italic') ? 'bg-gray-200' : ''}`}
            >
              <em>I</em>
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`px-3 py-1 rounded ${editor?.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''}`}
            >
              H1
            </button>
            <button
              onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3 }).run()}
              className="px-3 py-1 rounded"
            >
              Tabella
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <EditorContent editor={editor} className="prose max-w-none" />
          </div>
        </div>

        {/* Marker Picker Sidebar */}
        <div className="w-64 border-l overflow-auto">
          <MarkerPicker
            templateType={template.type!}
            onInsert={insertMarker}
          />
        </div>

        {/* Preview Pane */}
        {showPreview && (
          <div className="w-1/2 border-l">
            <PreviewPane
              templateId={templateId}
              content={template.content}
            />
          </div>
        )}
      </div>
    </div>
  );
}
```

### Deliverables Phase 2

- ✅ API template CRUD completa con validation
- ✅ Frontend editor con Tiptap operativo
- ✅ Marker picker con autocomplete
- ✅ Preview in tempo reale
- ✅ Version history UI
- ✅ Tests E2E passati

---

## 📧 Phase 3: Lettere Incarico

**Durata**: 5 giorni (Giorno 11-15)  
**Team**: 1 Backend Developer, 1 Frontend Developer

### Obiettivi
- Endpoint generation lettere incarico
- Integration con CourseSchedule
- UI generation da pagina schedules
- Default template creation
- Progressive numbering

### Implementation Overview

**Backend**: `backend/routes/lettere-incarico-routes.js`
**Frontend**: `src/components/schedules/GenerateLetteraModal.tsx`
**Service**: `src/services/lettereIncaricoService.ts`

### Key Features
- Generation singola per trainer
- Preview before generation
- Auto-population data from schedule
- PDF download immediato
- Audit logging

### Deliverables Phase 3
- ✅ Lettere Incarico fully functional
- ✅ Integration con schedules page
- ✅ Default template creato
- ✅ Tests E2E passati

---

## 📋 Phase 4: Registri Presenze

**Durata**: 5 giorni (Giorno 16-20)  
**Team**: 1 Backend Developer, 1 Frontend Developer

### Obiettivi
- Endpoint generation registri presenze
- Integration con CourseSession
- UI per attendance tracking
- Landscape layout PDF
- Auto-population participants

### Key Features
- Session-specific generation
- Participant list from enrollments
- Attendance checkboxes
- Hours tracking
- Notes field

### Deliverables Phase 4
- ✅ Registri Presenze fully functional
- ✅ Integration con sessions
- ✅ Attendance tracking UI
- ✅ Tests E2E passati

---

## 🎓 Phase 5: Attestati Enhancement

**Durata**: 5 giorni (Giorno 21-25)  
**Team**: 1 Backend Developer, 1 Frontend Developer

### Obiettivi
- Migrate existing attestati to new system
- Batch optimization
- ZIP download for batches
- Email sending integration
- Progressive numbering fix

### Migration Strategy

```typescript
// Data migration script
async function migrateExistingAttestati() {
  const attestati = await prisma.attestato.findMany({
    where: { templateId: null },
  });

  // Get default certificate template
  const defaultTemplate = await prisma.templateLink.findFirst({
    where: {
      type: 'CERTIFICATE',
      isDefault: true,
    },
  });

  for (const attestato of attestati) {
    await prisma.attestato.update({
      where: { id: attestato.id },
      data: {
        templateId: defaultTemplate.id,
        templateVersion: defaultTemplate.version,
      },
    });
  }
}
```

### Deliverables Phase 5
- ✅ Existing attestati migrated
- ✅ Batch generation optimized
- ✅ ZIP download working
- ✅ Email integration done
- ✅ Tests passati

---

## 🔗 Phase 6: Google Integration

**Durata**: 5 giorni (Giorno 26-30)  
**Team**: 1 Backend Developer

### Obiettivi
- OAuth2 Google setup
- Import from Google Docs
- Sync functionality
- Marker detection in imported docs
- HTML conversion

### OAuth2 Setup

```javascript
// backend/config/google.js
import { google } from 'googleapis';

export const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Get authorization URL
export function getAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/documents.readonly',
      'https://www.googleapis.com/auth/drive.readonly',
    ],
  });
}
```

### Deliverables Phase 6
- ✅ OAuth2 working
- ✅ Import from Google Docs
- ✅ Auto-sync enabled
- ✅ Marker detection
- ✅ Tests passati

---

## 🧪 Phase 7: Testing & Optimization

**Durata**: 5 giorni (Giorno 31-35)  
**Team**: 1 QA Engineer, 1 Backend Developer

### Obiettivi
- Integration testing completo
- Performance testing
- Load testing (batch 100)
- Security audit
- Documentation finale

### Test Coverage Goals

| Component | Target Coverage |
|-----------|----------------|
| Backend Services | 80% |
| API Routes | 90% |
| Frontend Components | 70% |
| E2E Tests | Critical paths 100% |

### Performance Tests

```javascript
// Load test: batch generation 100 documents
test('Batch generation 100 documents', async () => {
  const startTime = Date.now();
  
  const job = await documentService.generateBatch({
    templateId: 'template-uuid',
    entityType: 'schedule',
    entityIds: generateMockIds(100),
    userId: 'user-uuid',
    tenantId: 'tenant-uuid',
  });

  // Wait for completion
  await waitForJob(job.jobId, 60000); // 60s timeout

  const duration = Date.now() - startTime;
  
  expect(duration).toBeLessThan(60000); // < 60s for 100 docs
});
```

### Deliverables Phase 7
- ✅ All tests passing
- ✅ Performance targets met
- ✅ Security audit passed
- ✅ Documentation complete
- ✅ Training materials ready

---

## 🔗 Dependencies & Critical Path

### Dependency Graph

```
Phase 0 (Setup)
    ↓
Phase 1 (Database)
    ↓
Phase 2 (Templates) ─────┐
    ↓                     ↓
Phase 3 (Lettere) ────→ Phase 5 (Attestati)
    ↓                     ↓
Phase 4 (Registri) ───────┘
    ↓
Phase 6 (Google)
    ↓
Phase 7 (Testing)
```

### Critical Path

1. **Setup → Database → Templates** (Giorni 1-10)
   - Blocca tutte le altre fasi
   - **Priorità MASSIMA**

2. **Templates → Document Types** (Giorni 11-25)
   - Può essere parallelizzato parzialmente
   - Lettere e Registri indipendenti

3. **Google Integration** (Giorni 26-30)
   - Dipende solo da Templates
   - Può essere ritardato senza bloccare il resto

4. **Testing** (Giorni 31-35)
   - Dipende da tutto
   - Non può iniziare prima

---

## ⚠️ Risk Management

### High-Risk Items

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Puppeteer performance issues** | Medium | High | Browser pool, caching, fallback to libreoffice |
| **Database migration failures** | Low | High | Backup before migration, rollback script ready |
| **Google API rate limits** | Medium | Medium | Caching, queue system, retry logic |
| **Marker resolution bugs** | Medium | High | Extensive unit tests, validation before generation |
| **Browser compatibility (frontend)** | Low | Medium | Polyfills, progressive enhancement |

### Mitigation Strategies

**Puppeteer Issues**:
```javascript
// Fallback to libreoffice-convert
if (puppeteerFails) {
  return await libreofficeConvert(docx);
}
```

**Database Migration**:
```bash
# Backup before migration
pg_dump elementmedica_db > backup_$(date +%Y%m%d).sql

# Apply migration
npx prisma migrate deploy

# Rollback if needed
psql elementmedica_db < backup_YYYYMMDD.sql
```

---

## 🔄 Rollback Strategy

### Phase Rollback Procedures

#### Phase 1: Database Rollback

```bash
# 1. Stop application
pm2 stop all

# 2. Restore database
psql elementmedica_db < backup_before_migration.sql

# 3. Revert Prisma schema
git checkout HEAD~1 -- prisma/schema.prisma
npx prisma generate

# 4. Restart application
pm2 start all
```

#### Phase 2-5: Feature Rollback

```bash
# 1. Disable feature flag
redis-cli SET feature:templates false

# 2. Revert frontend build
git checkout stable -- src/
npm run build

# 3. Revert backend routes
git checkout stable -- backend/routes/template-routes.js

# 4. Restart services
pm2 restart api-server
```

#### Emergency Rollback (Complete)

```bash
# 1. Switch to stable branch
git checkout stable

# 2. Restore database
psql elementmedica_db < backup_before_project.sql

# 3. Rebuild
npm install
npm run build
npx prisma generate

# 4. Restart all
pm2 restart all
```

### Rollback Decision Matrix

| Issue Severity | Action | Timeline |
|---------------|--------|----------|
| **Critical** (Data loss, system down) | Immediate complete rollback | < 15 min |
| **High** (Feature broken, affecting users) | Disable feature, fix forward | < 1 hour |
| **Medium** (Minor bugs, workarounds exist) | Fix forward in next sprint | < 1 day |
| **Low** (Cosmetic, no user impact) | Fix in regular development | < 1 week |

---

## 📊 Success Metrics

### Phase Completion Criteria

Each phase is considered complete when:

1. ✅ All planned features implemented
2. ✅ Unit tests passing (>80% coverage)
3. ✅ Integration tests passing
4. ✅ Code review approved
5. ✅ Documentation updated
6. ✅ Performance benchmarks met
7. ✅ Security review passed (if applicable)
8. ✅ Deployed to staging environment
9. ✅ Smoke tests passed
10. ✅ Stakeholder sign-off received

### Project Completion Criteria

Project is complete when:

1. ✅ All 7 phases completed
2. ✅ All 3 document types working (Lettere, Registri, Attestati)
3. ✅ Template management fully operational
4. ✅ Google integration working
5. ✅ Performance targets met:
   - Single doc < 3s
   - Batch 50 docs < 30s
   - Template load < 1s
6. ✅ Security audit passed
7. ✅ User acceptance testing passed
8. ✅ Training completed
9. ✅ Documentation delivered
10. ✅ Production deployment successful

---

## 📚 Resources Required

### Team Allocation

| Role | Phase 0-1 | Phase 2-5 | Phase 6-7 | Total Days |
|------|-----------|-----------|-----------|-----------|
| **Backend Developer** | 5 days | 15 days | 10 days | 30 days |
| **Frontend Developer** | - | 15 days | - | 15 days |
| **DevOps Engineer** | 2 days | 2 days | 2 days | 6 days |
| **QA Engineer** | - | 5 days | 5 days | 10 days |
| **Project Manager** | Ongoing | Ongoing | Ongoing | 35 days |

### Infrastructure

- Redis server (16GB RAM)
- PostgreSQL database (existing)
- File storage: 500GB (S3 or local)
- Puppeteer servers: 2-10 instances
- Build server for CI/CD

### External Dependencies

- Google Cloud Platform account (for OAuth2)
- SendGrid/AWS SES (for email)
- Sentry (for error tracking)
- GitHub Actions (for CI/CD)

---

**Document Owner**: Project Manager  
**Last Review**: 4 Novembre 2025  
**Status**: ✅ PIANO ESECUTIVO COMPLETO - Ready for Execution
