# 📁 SPEC_13: File Storage e Documenti

**Versione**: 1.0  
**Ultimo aggiornamento**: 2025-12-11  
**Collegato a**: [SPEC_09_VISITE.md](./SPEC_09_VISITE.md), [SPEC_14_SICUREZZA.md](./SPEC_14_SICUREZZA.md)

---

## 1. OVERVIEW

Sistema di storage documenti clinici con:
- Storage cloud (S3/GCS/MinIO)
- URL firmati temporanei
- Virus scanning
- Versioning documenti
- Audit accessi

### 1.1 Tipi Documenti Supportati

| Categoria | Formati | Max Size |
|-----------|---------|----------|
| Documenti | PDF, DOC, DOCX | 20 MB |
| Immagini | JPG, PNG, TIFF | 15 MB |
| Diagnostica | DICOM, DCM | 100 MB |
| Referti Lab | PDF, HL7 | 10 MB |

---

## 2. ARCHITETTURA STORAGE

### 2.1 Struttura Chiavi S3

```
bucket: elementmedica-clinical-documents
├── {tenantId}/
│   ├── pazienti/
│   │   └── {pazienteId}/
│   │       ├── documenti/
│   │       │   └── {docId}.pdf
│   │       └── immagini/
│   │           └── {imgId}.jpg
│   ├── visite/
│   │   └── {visitaId}/
│   │       └── allegati/
│   │           └── {allegatoId}.pdf
│   ├── referti/
│   │   └── {refertoId}/
│   │       ├── pdf/
│   │       │   └── referto_{version}.pdf
│   │       └── allegati/
│   └── consensi/
│       └── {consensoId}.pdf
```

### 2.2 Configurazione Multi-Provider

```javascript
// backend/config/storage.js

export const storageConfig = {
  provider: process.env.STORAGE_PROVIDER || 'minio', // 's3', 'gcs', 'minio'
  
  s3: {
    bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION || 'eu-west-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },
  
  gcs: {
    bucket: process.env.GCS_BUCKET,
    projectId: process.env.GCS_PROJECT_ID,
    keyFilename: process.env.GCS_KEY_FILE
  },
  
  minio: {
    bucket: process.env.MINIO_BUCKET || 'clinical-docs',
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY
  },
  
  // Impostazioni comuni
  signedUrlExpiry: 3600,      // 1 ora
  maxFileSizeMB: 100,
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'application/dicom',
    'text/plain'
  ]
};
```

---

## 3. SERVIZIO STORAGE

### 3.1 Storage Service

```javascript
// backend/services/storageService.js

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { storageConfig } from '../config/storage.js';

class StorageService {
  constructor() {
    this.client = this.initClient();
    this.bucket = this.getBucket();
  }
  
  initClient() {
    const config = storageConfig[storageConfig.provider];
    
    if (storageConfig.provider === 'minio') {
      return new S3Client({
        endpoint: `http${config.useSSL ? 's' : ''}://${config.endpoint}:${config.port}`,
        region: 'us-east-1',
        credentials: {
          accessKeyId: config.accessKey,
          secretAccessKey: config.secretKey
        },
        forcePathStyle: true
      });
    }
    
    // S3 standard
    return new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });
  }
  
  /**
   * Upload file
   */
  async upload(file, key, metadata = {}) {
    // Virus scan (se abilitato)
    if (process.env.VIRUS_SCAN_ENABLED === 'true') {
      await this.scanFile(file.buffer);
    }
    
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        originalName: file.originalname,
        uploadedBy: metadata.uploadedBy,
        tenantId: metadata.tenantId,
        ...metadata
      }
    });
    
    await this.client.send(command);
    
    return {
      key,
      bucket: this.bucket,
      size: file.size,
      mimeType: file.mimetype
    };
  }
  
  /**
   * Genera URL firmato per download
   */
  async getSignedUrl(key, expiresIn = storageConfig.signedUrlExpiry) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key
    });
    
    return await getSignedUrl(this.client, command, { expiresIn });
  }
  
  /**
   * Genera URL firmato per upload diretto
   */
  async getUploadSignedUrl(key, contentType, expiresIn = 3600) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType
    });
    
    return await getSignedUrl(this.client, command, { expiresIn });
  }
  
  /**
   * Elimina file
   */
  async delete(key) {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key
    });
    
    await this.client.send(command);
  }
  
  /**
   * Virus scan con ClamAV
   */
  async scanFile(buffer) {
    const clam = require('clamscan');
    const scanner = await new clam().init({
      clamdscan: {
        socket: process.env.CLAMAV_SOCKET || '/var/run/clamav/clamd.ctl'
      }
    });
    
    const { isInfected, viruses } = await scanner.scanBuffer(buffer);
    
    if (isInfected) {
      throw new Error(`File infetto rilevato: ${viruses.join(', ')}`);
    }
  }
}

export const storageService = new StorageService();
```

---

## 4. MODELLI DATABASE

### 4.1 Documento Clinico

```prisma
model DocumentoClinico {
  id                    String   @id @default(uuid())
  
  // Proprietà
  pazienteId            String?
  paziente              Person?  @relation(fields: [pazienteId], references: [id])
  
  visitaId              String?
  refertoId             String?
  
  // File info
  nome                  String
  descrizione           String?
  tipo                  TipoDocumentoClinico
  categoria             String?              // Categoria custom
  
  // Storage
  storageKey            String               // Chiave S3
  bucket                String
  mimeType              String
  dimensioneBytes       Int
  
  // Versioning
  versione              Int      @default(1)
  versionePrecedenteId  String?
  
  // Metadata
  hashFile              String?              // SHA-256 per integrità
  virusScanStatus       String?              // "CLEAN", "INFECTED", "PENDING"
  virusScanAt           DateTime?
  
  // Accesso
  isConfidenziale       Boolean  @default(false)
  accessoLimitato       String[] @default([])  // PersonId con accesso
  
  // Upload info
  caricatoDaId          String
  caricatoDa            Person   @relation("UploaderDocumenti", fields: [caricatoDaId], references: [id])
  
  // Multi-tenancy
  tenantId              String
  tenant                Tenant   @relation(fields: [tenantId], references: [id])
  
  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  deletedAt             DateTime?
  
  @@index([tenantId])
  @@index([pazienteId])
  @@index([tipo])
}

enum TipoDocumentoClinico {
  REFERTO_ESTERNO       // Referti da altre strutture
  ESAME_LABORATORIO     // Esami sangue, etc.
  IMAGING               // Radiografie, TAC, RMN
  CONSENSO_INFORMATO    // Consensi firmati
  IMPEGNATIVA           // Impegnative SSN
  CERTIFICATO           // Certificati medici
  LETTERA_DIMISSIONE    // Lettere dimissione ospedale
  ALTRO
}
```

---

## 5. API ENDPOINTS

```
# Upload
POST   /api/v1/clinica/documenti/upload                # Upload file
POST   /api/v1/clinica/documenti/upload-url            # Get upload URL (presigned)

# CRUD
GET    /api/v1/clinica/documenti                       # Lista (filtri)
GET    /api/v1/clinica/documenti/:id                   # Dettaglio (senza file)
DELETE /api/v1/clinica/documenti/:id                   # Soft delete

# Download
GET    /api/v1/clinica/documenti/:id/download          # Get download URL
GET    /api/v1/clinica/documenti/:id/preview           # Preview (se supportato)

# Paziente
GET    /api/v1/clinica/pazienti/:id/documenti          # Documenti paziente
POST   /api/v1/clinica/pazienti/:id/documenti          # Upload per paziente

# Visita
GET    /api/v1/clinica/visite/:id/allegati             # Allegati visita
POST   /api/v1/clinica/visite/:id/allegati             # Upload allegato
```

---

## 6. UI COMPONENTS

### 6.1 Upload
- `FileUploader.tsx` - Drag&drop upload
- `UploadProgress.tsx` - Barra progresso
- `FileTypeIcon.tsx` - Icona per tipo file

### 6.2 Visualizzazione
- `DocumentiList.tsx` - Lista documenti
- `DocumentoPreview.tsx` - Preview inline
- `PDFViewer.tsx` - Visualizzatore PDF
- `ImageViewer.tsx` - Galleria immagini

---

## 7. SICUREZZA

| Misura | Implementazione |
|--------|-----------------|
| Encryption at rest | S3 SSE-S3 o KMS |
| Encryption in transit | HTTPS/TLS 1.3 |
| URL firmati | Scadenza 1 ora |
| Virus scan | ClamAV su upload |
| Access control | Verifica owner/permessi |

---

## 8. COLLEGAMENTI

- **Precedente**: [SPEC_12_AUDIT_GDPR.md](./SPEC_12_AUDIT_GDPR.md)
- **Prossimo**: [SPEC_14_SICUREZZA.md](./SPEC_14_SICUREZZA.md)
