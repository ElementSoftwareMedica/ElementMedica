# API Endpoints - Sistema Template Management

**Data**: 4 Novembre 2025  
**Versione**: 1.0  
**Status**: ✅ API SPECIFICATION COMPLETA

---

## 📋 Indice

1. [API Overview](#api-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Template Management API](#template-management-api)
4. [Document Generation API](#document-generation-api)
5. [Marker Utilities API](#marker-utilities-api)
6. [Lettere Incarico API](#lettere-incarico-api)
7. [Registri Presenze API](#registri-presenze-api)
8. [Attestati API](#attestati-api)
9. [Google Integration API](#google-integration-api)
10. [Error Handling](#error-handling)
11. [Rate Limiting](#rate-limiting)
12. [Webhooks](#webhooks)

---

## 🌐 API Overview

### Base URLs

```
Development:  http://localhost:4001/api
Staging:      https://staging.elementmedica.com/api
Production:   https://api.elementmedica.com/api
```

### API Versioning

```
Current Version: v1 (default)
Version Header: API-Version: 1
```

### Standard Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
Accept: application/json
API-Version: 1
X-Tenant-ID: <tenant_id>  # Auto-extracted from JWT
```

### Standard Response Format

**Success Response**:
```json
{
  "data": { /* response data */ },
  "meta": {
    "timestamp": "2025-11-04T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

**Error Response**:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "name",
        "message": "Name is required"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-11-04T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

---

## 🔐 Authentication & Authorization

### Login

```http
POST /api/auth/login
```

**Request**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response** (200 OK):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "firstName": "Mario",
    "lastName": "Rossi",
    "role": "ADMIN",
    "tenantId": "tenant-uuid"
  }
}
```

### Permission Matrix

| Endpoint | ADMIN | MANAGER | TRAINER | EMPLOYEE |
|----------|-------|---------|---------|----------|
| **Templates** |
| GET /api/templates | ✅ | ✅ | ✅ | ❌ |
| POST /api/templates | ✅ | ❌ | ❌ | ❌ |
| PUT /api/templates/:id | ✅ | ❌ | ❌ | ❌ |
| DELETE /api/templates/:id | ✅ | ❌ | ❌ | ❌ |
| **Documents** |
| POST /api/documents/generate | ✅ | ✅ | ✅ | ❌ |
| GET /api/documents/:id | ✅ | ✅ | ✅ | ✅ (own) |
| DELETE /api/documents/:id | ✅ | ✅ | ❌ | ❌ |
| POST /api/documents/batch | ✅ | ✅ | ❌ | ❌ |
| **Lettere Incarico** |
| POST /api/lettere-incarico/genera | ✅ | ✅ | ❌ | ❌ |
| GET /api/lettere-incarico/:id | ✅ | ✅ | ✅ (own) | ❌ |
| **Registri Presenze** |
| POST /api/registri-presenze/genera | ✅ | ✅ | ✅ | ❌ |
| POST /api/registri-presenze/:id/presenze | ✅ | ✅ | ✅ | ❌ |
| **Attestati** |
| POST /api/attestati/genera | ✅ | ✅ | ✅ | ❌ |
| POST /api/attestati/batch | ✅ | ✅ | ❌ | ❌ |
| GET /api/attestati/:id | ✅ | ✅ | ✅ | ✅ (own) |

---

## 📝 Template Management API

### List Templates

```http
GET /api/templates
```

**Query Parameters**:
- `type` (optional): Filter by template type (`CERTIFICATE`, `LETTER_OF_ENGAGEMENT`, etc.)
- `isActive` (optional): Filter active templates (`true`, `false`)
- `isDefault` (optional): Filter default templates (`true`, `false`)
- `companyId` (optional): Filter by company
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Example**:
```bash
GET /api/templates?type=CERTIFICATE&isActive=true&page=1&limit=10
```

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "tmpl_abc123",
      "name": "Attestato Antincendio",
      "type": "CERTIFICATE",
      "fileFormat": "HTML",
      "version": 3,
      "isActive": true,
      "isDefault": true,
      "description": "Template per attestati antincendio",
      "category": "Sicurezza",
      "tags": ["antincendio", "sicurezza"],
      "createdBy": {
        "id": "user-uuid",
        "fullName": "Mario Rossi"
      },
      "createdAt": "2025-11-01T10:00:00Z",
      "updatedAt": "2025-11-04T10:30:00Z"
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

**Permissions**: `read:templates`

---

### Get Template

```http
GET /api/templates/:id
```

**Path Parameters**:
- `id`: Template UUID

**Response** (200 OK):
```json
{
  "data": {
    "id": "tmpl_abc123",
    "name": "Attestato Antincendio",
    "type": "CERTIFICATE",
    "fileFormat": "HTML",
    "content": "<html>...</html>",
    "header": "<div>Header</div>",
    "footer": "<div>Footer</div>",
    "styles": {
      "fontSize": "12px",
      "fontFamily": "Arial"
    },
    "layout": {
      "pageSize": "A4",
      "orientation": "portrait",
      "margins": { "top": 20, "right": 20, "bottom": 20, "left": 20 }
    },
    "markers": [
      {
        "key": "participant.fullName",
        "label": "Nome Completo",
        "type": "string",
        "description": "Nome e cognome del partecipante"
      }
    ],
    "version": 3,
    "isActive": true,
    "isDefault": true,
    "googleDocsUrl": null,
    "lastSyncedAt": null,
    "syncEnabled": false,
    "creator": {
      "id": "user-uuid",
      "fullName": "Mario Rossi"
    },
    "versions": [
      {
        "version": 3,
        "createdAt": "2025-11-04T10:30:00Z",
        "changesSummary": "Updated header"
      },
      {
        "version": 2,
        "createdAt": "2025-11-03T15:20:00Z",
        "changesSummary": "Added new markers"
      }
    ]
  }
}
```

**Errors**:
- `404`: Template not found
- `403`: No permission to access this template

**Permissions**: `read:templates`

---

### Create Template

```http
POST /api/templates
```

**Request Body**:
```json
{
  "name": "Attestato Primo Soccorso",
  "type": "CERTIFICATE",
  "fileFormat": "HTML",
  "content": "<html><body>...</body></html>",
  "header": "<div>Header</div>",
  "footer": "<div>Footer</div>",
  "styles": {
    "fontSize": "12px",
    "fontFamily": "Arial",
    "lineHeight": "1.5"
  },
  "layout": {
    "pageSize": "A4",
    "orientation": "portrait",
    "margins": { "top": 20, "right": 20, "bottom": 20, "left": 20 }
  },
  "markers": [
    {
      "key": "participant.fullName",
      "label": "Nome Completo",
      "type": "string",
      "description": "Nome e cognome del partecipante"
    },
    {
      "key": "course.title",
      "label": "Titolo Corso",
      "type": "string"
    }
  ],
  "isDefault": false,
  "description": "Template per attestati primo soccorso",
  "category": "Sicurezza",
  "tags": ["primo-soccorso", "sicurezza"],
  "companyId": null
}
```

**Validation Rules**:
- `name`: Required, 3-200 characters
- `type`: Required, must be valid TemplateType enum
- `content`: Optional, valid HTML
- `markers`: Optional, array of marker definitions
- `isDefault`: If true, unsets other default templates of same type

**Response** (201 Created):
```json
{
  "data": {
    "id": "tmpl_new123",
    "name": "Attestato Primo Soccorso",
    "type": "CERTIFICATE",
    "version": 1,
    "isActive": true,
    "createdAt": "2025-11-04T10:35:00Z"
  }
}
```

**Errors**:
- `400`: Validation error
- `409`: Template with same name already exists
- `403`: No permission to create templates

**Permissions**: `create:templates`

---

### Update Template

```http
PUT /api/templates/:id
```

**Request Body**: Same as Create Template

**Response** (200 OK):
```json
{
  "data": {
    "id": "tmpl_abc123",
    "name": "Attestato Antincendio",
    "version": 4,
    "updatedAt": "2025-11-04T10:40:00Z"
  }
}
```

**Notes**:
- Version is automatically incremented
- Previous version is saved in TemplateVersion table
- Changes are tracked in `changesSummary`

**Errors**:
- `404`: Template not found
- `400`: Validation error
- `403`: No permission to update templates

**Permissions**: `update:templates`

---

### Delete Template

```http
DELETE /api/templates/:id
```

**Response** (200 OK):
```json
{
  "message": "Template deleted successfully"
}
```

**Notes**:
- Soft delete (sets `deletedAt` timestamp)
- Template becomes inactive (`isActive = false`)
- Generated documents remain accessible
- Can be restored by unsetting `deletedAt`

**Errors**:
- `404`: Template not found
- `409`: Cannot delete default template (must set another as default first)
- `403`: No permission to delete templates

**Permissions**: `delete:templates`

---

### Validate Template

```http
POST /api/templates/:id/validate
```

**Request Body**:
```json
{
  "mockData": {
    "participant": {
      "fullName": "Mario Rossi",
      "fiscalCode": "RSSMRA80A01H501U"
    },
    "course": {
      "title": "Corso Antincendio"
    }
  }
}
```

**Response** (200 OK):
```json
{
  "data": {
    "valid": true,
    "errors": [],
    "warnings": [],
    "markerCount": 15,
    "markers": [
      {
        "key": "participant.fullName",
        "found": true,
        "value": "Mario Rossi"
      },
      {
        "key": "participant.company.name",
        "found": false,
        "suggestion": ["participant.fullName", "course.company.name"]
      }
    ]
  }
}
```

**Errors**:
- `404`: Template not found
- `422`: Validation failed (markers not found in context)

**Permissions**: `read:templates`

---

### Preview Template

```http
POST /api/templates/:id/preview
```

**Request Body**:
```json
{
  "mockData": {
    "participant": {
      "fullName": "Mario Rossi",
      "fiscalCode": "RSSMRA80A01H501U",
      "birthDate": "1980-01-01",
      "birthPlace": "Roma (RM)"
    },
    "course": {
      "title": "Corso Antincendio Rischio Alto",
      "duration": "16 ore"
    },
    "schedule": {
      "startDate": "2025-11-10",
      "endDate": "2025-11-17",
      "location": "Milano"
    }
  }
}
```

**Response** (200 OK):
```json
{
  "data": {
    "html": "<html><body>...</body></html>",
    "previewUrl": "/api/templates/tmpl_abc123/preview.pdf"
  }
}
```

**Notes**:
- Uses mock data to resolve markers
- Returns rendered HTML
- Optionally generates preview PDF

**Errors**:
- `404`: Template not found
- `422`: Marker resolution failed

**Permissions**: `read:templates`

---

### Get Version History

```http
GET /api/templates/:id/versions
```

**Query Parameters**:
- `limit` (optional): Max versions to return (default: 10)

**Response** (200 OK):
```json
{
  "data": [
    {
      "version": 4,
      "changesSummary": "Updated header and footer",
      "changeDetails": {
        "added": ["{{new.marker}}"],
        "removed": ["{{old.marker}}"],
        "modified": {
          "header": { "from": "...", "to": "..." }
        }
      },
      "createdBy": {
        "id": "user-uuid",
        "fullName": "Mario Rossi"
      },
      "createdAt": "2025-11-04T10:40:00Z"
    },
    {
      "version": 3,
      "changesSummary": "Added participant company name marker",
      "createdAt": "2025-11-04T10:30:00Z"
    }
  ]
}
```

**Permissions**: `read:templates`

---

### Rollback to Version

```http
POST /api/templates/:id/rollback
```

**Request Body**:
```json
{
  "version": 3
}
```

**Response** (200 OK):
```json
{
  "data": {
    "id": "tmpl_abc123",
    "version": 5,
    "rolledBackFrom": 4,
    "rolledBackTo": 3,
    "message": "Template rolled back to version 3"
  }
}
```

**Notes**:
- Creates new version with content from specified version
- Does not delete newer versions
- Increments version number

**Errors**:
- `404`: Template or version not found
- `400`: Invalid version number

**Permissions**: `update:templates`

---

## 📄 Document Generation API

### Generate Single Document

```http
POST /api/documents/generate
```

**Request Body**:
```json
{
  "templateId": "tmpl_abc123",
  "entityType": "schedule",
  "entityId": "schedule-uuid",
  "options": {
    "personId": "person-uuid",
    "includeHeader": true,
    "includeFooter": true,
    "watermark": false,
    "sendEmail": false,
    "emailTo": "participant@example.com"
  }
}
```

**Validation Rules**:
- `templateId`: Required, must exist and be active
- `entityType`: Required, must be "schedule", "person", or "enrollment"
- `entityId`: Required, entity must exist in database
- `options.personId`: Required if entityType is "schedule" (for attestati)

**Response** (200 OK):
```json
{
  "data": {
    "id": "doc_xyz789",
    "templateId": "tmpl_abc123",
    "templateVersion": 4,
    "type": "CERTIFICATE",
    "filename": "attestato-001-2025.pdf",
    "fileUrl": "/uploads/documents/2025/11/attestato-001-2025.pdf",
    "fileSize": 245678,
    "status": "GENERATED",
    "generatedAt": "2025-11-04T10:45:00Z",
    "downloadUrl": "/api/documents/doc_xyz789/download"
  }
}
```

**Processing Time**:
- Average: 2-3 seconds
- Complex documents: up to 5 seconds

**Errors**:
- `404`: Template or entity not found
- `422`: Marker resolution failed
- `500`: PDF generation failed
- `403`: No permission to generate documents

**Permissions**: `generate:documents`

---

### Generate Batch Documents

```http
POST /api/documents/batch
```

**Request Body**:
```json
{
  "templateId": "tmpl_abc123",
  "entityType": "schedule",
  "entityId": "schedule-uuid",
  "personIds": [
    "person-1-uuid",
    "person-2-uuid",
    "person-3-uuid"
  ],
  "options": {
    "sendEmail": false,
    "zipDownload": true,
    "progressiveNumbering": true
  }
}
```

**Validation Rules**:
- `personIds`: Required, max 200 IDs per batch
- `options.zipDownload`: If true, creates ZIP of all PDFs

**Response** (202 Accepted):
```json
{
  "data": {
    "jobId": "job_batch_abc",
    "status": "PENDING",
    "totalDocuments": 50,
    "estimatedTime": "25 seconds",
    "statusUrl": "/api/documents/jobs/job_batch_abc",
    "progressUrl": "/api/documents/jobs/job_batch_abc/progress"
  }
}
```

**Notes**:
- Job is processed asynchronously via Bull queue
- Client should poll `statusUrl` every 2 seconds
- Progress updates available in real-time

**Errors**:
- `400`: Batch size exceeds limit (200)
- `404`: Template or schedule not found
- `403`: No permission for batch generation

**Permissions**: `batch:documents`

---

### Get Job Status

```http
GET /api/documents/jobs/:jobId
```

**Response** (200 OK):
```json
{
  "data": {
    "jobId": "job_batch_abc",
    "status": "PROCESSING",
    "progress": {
      "current": 35,
      "total": 50,
      "percentage": 70
    },
    "documents": [
      {
        "documentId": "doc_1",
        "personId": "person-1-uuid",
        "status": "COMPLETED",
        "filename": "attestato-001-2025.pdf"
      },
      {
        "documentId": "doc_2",
        "personId": "person-2-uuid",
        "status": "PROCESSING"
      }
    ],
    "startedAt": "2025-11-04T10:50:00Z",
    "estimatedCompletion": "2025-11-04T10:51:15Z"
  }
}
```

**Job Statuses**:
- `PENDING`: Job queued, not started yet
- `PROCESSING`: Currently generating documents
- `COMPLETED`: All documents generated successfully
- `FAILED`: Job failed (partial completion possible)
- `CANCELLED`: Job was cancelled by user

**Errors**:
- `404`: Job not found

**Permissions**: `read:documents`

---

### Get Job Progress (SSE)

```http
GET /api/documents/jobs/:jobId/progress
Accept: text/event-stream
```

**Response** (Server-Sent Events):
```
event: progress
data: {"current": 10, "total": 50, "percentage": 20}

event: progress
data: {"current": 20, "total": 50, "percentage": 40}

event: completed
data: {"jobId": "job_batch_abc", "zipUrl": "/downloads/batch_abc.zip"}
```

**Events**:
- `progress`: Progress update
- `document_completed`: Single document completed
- `completed`: All documents completed
- `error`: Error occurred

**Permissions**: `read:documents`

---

### Download Document

```http
GET /api/documents/:id/download
```

**Response** (200 OK):
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="attestato-001-2025.pdf"
Content-Length: 245678

[PDF binary data]
```

**Notes**:
- Increments `downloadCount`
- Updates `lastDownloadAt`
- Creates audit log entry

**Errors**:
- `404`: Document not found
- `403`: No permission to download (not owner)

**Permissions**: `read:documents` (own documents) or `read:all-documents` (all documents)

---

### Delete Document

```http
DELETE /api/documents/:id
```

**Response** (200 OK):
```json
{
  "message": "Document deleted successfully"
}
```

**Notes**:
- Soft delete (sets `deletedAt`)
- File remains on storage (for audit)
- Can be hard-deleted after retention period

**Errors**:
- `404`: Document not found
- `403`: No permission to delete documents

**Permissions**: `delete:documents`

---

### Get Document History

```http
GET /api/documents/history/:entityId
```

**Query Parameters**:
- `entityType` (required): "schedule", "person", etc.
- `type` (optional): Filter by document type
- `limit` (optional): Max results (default: 50)

**Example**:
```bash
GET /api/documents/history/schedule-uuid?entityType=schedule&type=CERTIFICATE&limit=20
```

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "doc_xyz789",
      "type": "CERTIFICATE",
      "filename": "attestato-001-2025.pdf",
      "fileSize": 245678,
      "status": "GENERATED",
      "generatedBy": {
        "id": "user-uuid",
        "fullName": "Mario Rossi"
      },
      "generatedAt": "2025-11-04T10:45:00Z",
      "downloadCount": 3,
      "downloadUrl": "/api/documents/doc_xyz789/download"
    }
  ],
  "meta": {
    "total": 15,
    "entityType": "schedule",
    "entityId": "schedule-uuid"
  }
}
```

**Permissions**: `read:documents`

---

## 🔧 Marker Utilities API

### Get Available Markers

```http
GET /api/markers/available/:type
```

**Path Parameters**:
- `type`: Template type (`CERTIFICATE`, `LETTER_OF_ENGAGEMENT`, etc.)

**Example**:
```bash
GET /api/markers/available/CERTIFICATE
```

**Response** (200 OK):
```json
{
  "data": {
    "type": "CERTIFICATE",
    "categories": {
      "participant": [
        {
          "key": "participant.fullName",
          "label": "Nome Completo",
          "type": "string",
          "description": "Nome e cognome del partecipante",
          "example": "Mario Rossi"
        },
        {
          "key": "participant.fiscalCode",
          "label": "Codice Fiscale",
          "type": "string",
          "example": "RSSMRA80A01H501U"
        }
      ],
      "course": [
        {
          "key": "course.title",
          "label": "Titolo Corso",
          "type": "string",
          "example": "Corso Antincendio Rischio Alto"
        },
        {
          "key": "course.duration",
          "label": "Durata",
          "type": "string",
          "example": "16 ore"
        }
      ],
      "schedule": [
        {
          "key": "schedule.startDate",
          "label": "Data Inizio",
          "type": "date",
          "formatters": ["date:DD/MM/YYYY"],
          "example": "2025-11-10"
        }
      ],
      "system": [
        {
          "key": "system.currentDate",
          "label": "Data Corrente",
          "type": "date",
          "example": "04/11/2025"
        }
      ]
    },
    "totalMarkers": 65
  }
}
```

**Permissions**: Public (no auth required)

---

### Resolve Markers

```http
POST /api/markers/resolve
```

**Request Body**:
```json
{
  "template": "{{participant.fullName}} - {{course.title}}",
  "context": {
    "participant": {
      "fullName": "Mario Rossi"
    },
    "course": {
      "title": "Corso Antincendio"
    }
  }
}
```

**Response** (200 OK):
```json
{
  "data": {
    "resolved": "Mario Rossi - Corso Antincendio",
    "markers": [
      {
        "key": "participant.fullName",
        "value": "Mario Rossi"
      },
      {
        "key": "course.title",
        "value": "Corso Antincendio"
      }
    ]
  }
}
```

**Use Case**: Testing markers before saving template

**Permissions**: `read:templates`

---

### Get Formatters

```http
GET /api/markers/formatters
```

**Response** (200 OK):
```json
{
  "data": [
    {
      "name": "date",
      "description": "Format date",
      "syntax": "{{date|date:DD/MM/YYYY}}",
      "parameters": [
        {
          "name": "pattern",
          "type": "string",
          "default": "DD/MM/YYYY",
          "options": ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]
        }
      ],
      "examples": [
        {
          "input": "2025-11-04",
          "output": "04/11/2025",
          "pattern": "DD/MM/YYYY"
        }
      ]
    },
    {
      "name": "currency",
      "description": "Format currency",
      "syntax": "{{amount|currency:€ 0,0.00}}",
      "examples": [
        {
          "input": 1234.56,
          "output": "€ 1.234,56"
        }
      ]
    },
    {
      "name": "uppercase",
      "description": "Convert to uppercase",
      "syntax": "{{text|uppercase}}",
      "examples": [
        {
          "input": "mario rossi",
          "output": "MARIO ROSSI"
        }
      ]
    }
  ]
}
```

**Permissions**: Public

---

## 📧 Lettere Incarico API

### Generate Lettera Incarico

```http
POST /api/lettere-incarico/genera
```

**Request Body**:
```json
{
  "scheduledCourseId": "schedule-uuid",
  "trainerId": "trainer-uuid",
  "templateId": "tmpl_letter_123",
  "options": {
    "sendEmail": false,
    "emailTo": "trainer@example.com"
  }
}
```

**Validation Rules**:
- `scheduledCourseId`: Required, must exist
- `trainerId`: Required, must be assigned to schedule
- `templateId`: Optional, uses default if not provided
- Unique constraint: One letter per trainer per schedule

**Response** (200 OK):
```json
{
  "data": {
    "id": "letter_abc123",
    "scheduledCourseId": "schedule-uuid",
    "trainerId": "trainer-uuid",
    "nomeFile": "lettera-incarico-001-2025.pdf",
    "url": "/uploads/lettere-incarico/2025/11/lettera-incarico-001-2025.pdf",
    "numeroProgressivo": 1,
    "annoProgressivo": 2025,
    "dataGenerazione": "2025-11-04T11:00:00Z",
    "downloadUrl": "/api/lettere-incarico/letter_abc123/download"
  }
}
```

**Business Logic**:
1. Check if letter already exists (unique constraint)
2. If exists, soft-delete old and create new
3. Load schedule with all relations (course, trainer, sessions)
4. Resolve markers from context
5. Generate PDF
6. Save metadata with progressive number
7. Optionally send email

**Errors**:
- `404`: Schedule or trainer not found
- `400`: Trainer not assigned to this schedule
- `422`: Marker resolution failed

**Permissions**: `generate:lettere-incarico`

---

### Get Lettere for Schedule

```http
GET /api/lettere-incarico/schedule/:scheduleId
```

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "letter_abc123",
      "trainerId": "trainer-uuid",
      "trainer": {
        "fullName": "Prof. Marco Neri"
      },
      "nomeFile": "lettera-incarico-001-2025.pdf",
      "dataGenerazione": "2025-11-04T11:00:00Z",
      "downloadUrl": "/api/lettere-incarico/letter_abc123/download"
    }
  ]
}
```

**Permissions**: `read:lettere-incarico`

---

### Download Lettera Incarico

```http
GET /api/lettere-incarico/:id/download
```

**Response**: PDF file

**Permissions**: `read:lettere-incarico`

---

### Delete Lettera Incarico

```http
DELETE /api/lettere-incarico/:id
```

**Response** (200 OK):
```json
{
  "message": "Lettera incarico deleted successfully"
}
```

**Notes**: Soft delete

**Permissions**: `delete:lettere-incarico`

---

## 📋 Registri Presenze API

### Generate Registro Presenze

```http
POST /api/registri-presenze/genera
```

**Request Body**:
```json
{
  "scheduledCourseId": "schedule-uuid",
  "sessionId": "session-uuid",
  "formatoreId": "trainer-uuid",
  "templateId": "tmpl_register_123"
}
```

**Validation Rules**:
- `sessionId`: Required, must belong to schedule
- Session-specific: One registro per session
- Auto-populates participants from CourseEnrollment with status COMPLETED

**Response** (200 OK):
```json
{
  "data": {
    "id": "registro_xyz789",
    "scheduledCourseId": "schedule-uuid",
    "sessionId": "session-uuid",
    "nomeFile": "registro-presenze-001-2025.pdf",
    "url": "/uploads/registri-presenze/2025/11/registro-presenze-001-2025.pdf",
    "numeroProgressivo": 1,
    "annoProgressivo": 2025,
    "presenti": [
      {
        "id": "pres_1",
        "personId": "person-1-uuid",
        "presente": false,
        "ore": null,
        "note": null
      }
    ],
    "downloadUrl": "/api/registri-presenze/registro_xyz789/download"
  }
}
```

**Business Logic**:
1. Load session with schedule and course
2. Get all enrollments with status COMPLETED
3. Create RegistroPresenze record
4. Create RegistroPresenzePartecipante for each enrollment
5. Generate PDF with participant table
6. Save with progressive number

**Errors**:
- `404`: Schedule or session not found
- `409`: Registro already exists for this session

**Permissions**: `generate:registri-presenze`

---

### Update Presenze

```http
POST /api/registri-presenze/:id/presenze
```

**Request Body**:
```json
{
  "presenze": [
    {
      "personId": "person-1-uuid",
      "presente": true,
      "ore": 8.0,
      "note": "Presente tutta la giornata"
    },
    {
      "personId": "person-2-uuid",
      "presente": false,
      "ore": 0,
      "note": "Assente giustificato"
    }
  ]
}
```

**Response** (200 OK):
```json
{
  "message": "Presenze updated successfully",
  "data": {
    "updated": 2,
    "totalParticipants": 15
  }
}
```

**Use Case**: Trainer updates attendance after session

**Permissions**: `update:registri-presenze`

---

### Get Registro for Session

```http
GET /api/registri-presenze/session/:sessionId
```

**Response** (200 OK):
```json
{
  "data": {
    "id": "registro_xyz789",
    "nomeFile": "registro-presenze-001-2025.pdf",
    "session": {
      "date": "2025-11-10",
      "startTime": "09:00",
      "endTime": "18:00"
    },
    "presenti": [
      {
        "person": {
          "fullName": "Mario Rossi",
          "fiscalCode": "RSSMRA80A01H501U"
        },
        "presente": true,
        "ore": 8.0
      }
    ],
    "downloadUrl": "/api/registri-presenze/registro_xyz789/download"
  }
}
```

**Permissions**: `read:registri-presenze`

---

## 🎓 Attestati API

### Generate Single Attestato

```http
POST /api/attestati/genera
```

**Request Body**:
```json
{
  "scheduledCourseId": "schedule-uuid",
  "personId": "person-uuid",
  "templateId": "tmpl_cert_123",
  "options": {
    "sendEmail": false,
    "emailTo": "participant@example.com",
    "overwrite": false
  }
}
```

**Validation Rules**:
- Check if attestato already exists
- If exists and overwrite=false, return error
- If overwrite=true, soft-delete old and create new

**Response** (200 OK):
```json
{
  "data": {
    "id": "cert_abc123",
    "personId": "person-uuid",
    "scheduledCourseId": "schedule-uuid",
    "fileName": "attestato-001-2025.pdf",
    "fileUrl": "/uploads/attestati/2025/attestato-001-2025.pdf",
    "numeroProgressivo": 1,
    "annoProgressivo": 2025,
    "generatedAt": "2025-11-04T11:10:00Z",
    "downloadUrl": "/api/attestati/cert_abc123/download"
  }
}
```

**Progressive Numbering**:
- Format: `001/2025`, `002/2025`, etc.
- Resets each year
- Unique per tenant

**Permissions**: `generate:attestati`

---

### Generate Batch Attestati

```http
POST /api/attestati/batch
```

**Request Body**:
```json
{
  "scheduledCourseId": "schedule-uuid",
  "personIds": [
    "person-1-uuid",
    "person-2-uuid"
  ],
  "templateId": "tmpl_cert_123",
  "options": {
    "sendEmail": false,
    "zipDownload": true,
    "overwrite": false
  }
}
```

**Response** (202 Accepted):
```json
{
  "data": {
    "jobId": "job_certs_abc",
    "status": "PENDING",
    "totalCertificates": 50,
    "estimatedTime": "30 seconds",
    "statusUrl": "/api/documents/jobs/job_certs_abc"
  }
}
```

**Batch Limit**: Max 200 certificates per batch

**Permissions**: `batch:attestati`

---

### Get Attestati for Schedule

```http
GET /api/attestati/schedule/:scheduleId
```

**Query Parameters**:
- `status` (optional): Filter by generation status
- `page`, `limit`: Pagination

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "cert_abc123",
      "person": {
        "fullName": "Mario Rossi"
      },
      "fileName": "attestato-001-2025.pdf",
      "numeroProgressivo": 1,
      "generatedAt": "2025-11-04T11:10:00Z",
      "downloadUrl": "/api/attestati/cert_abc123/download"
    }
  ],
  "meta": {
    "total": 50,
    "completed": 48,
    "pending": 2
  }
}
```

**Permissions**: `read:attestati`

---

### Check Existing Attestato

```http
GET /api/attestati/check
```

**Query Parameters**:
- `scheduleId`: Schedule UUID
- `personId`: Person UUID

**Response** (200 OK):
```json
{
  "data": {
    "exists": true,
    "attestato": {
      "id": "cert_abc123",
      "fileName": "attestato-001-2025.pdf",
      "generatedAt": "2025-11-04T11:10:00Z"
    }
  }
}
```

**Use Case**: Check before generation to avoid duplicates

**Permissions**: `read:attestati`

---

### Download Attestato

```http
GET /api/attestati/:id/download
```

**Response**: PDF file

**Permissions**: `read:attestati` (own) or `read:all-attestati` (all)

---

### Delete Attestato

```http
DELETE /api/attestati/:id
```

**Response** (200 OK):
```json
{
  "message": "Attestato deleted successfully"
}
```

**Permissions**: `delete:attestati`

---

## 🔗 Google Integration API

### Authorize Google Account

```http
GET /api/google/authorize
```

**Response** (302 Redirect):
```
Location: https://accounts.google.com/o/oauth2/v2/auth?...
```

**Flow**:
1. User clicks "Collega Google Account"
2. Redirects to Google OAuth2
3. User grants permissions
4. Redirects back to callback URL
5. Exchange code for tokens

**Permissions**: `admin` only

---

### OAuth Callback

```http
GET /api/google/callback
```

**Query Parameters**:
- `code`: Authorization code from Google
- `state`: CSRF token

**Response** (302 Redirect):
```
Location: /settings/templates?google_linked=true
```

**Notes**:
- Stores access_token and refresh_token
- Associates with user account

---

### Import from Google Docs

```http
POST /api/templates/import/google
```

**Request Body**:
```json
{
  "googleDocsUrl": "https://docs.google.com/document/d/ABC123/edit",
  "name": "Attestato da Google Docs",
  "type": "CERTIFICATE",
  "syncEnabled": true
}
```

**Response** (201 Created):
```json
{
  "data": {
    "id": "tmpl_google_123",
    "name": "Attestato da Google Docs",
    "type": "CERTIFICATE",
    "fileFormat": "GOOGLE_DOCS",
    "content": "<html>...</html>",
    "googleDocsUrl": "https://docs.google.com/document/d/ABC123/edit",
    "lastSyncedAt": "2025-11-04T11:20:00Z",
    "syncEnabled": true,
    "markers": [
      {
        "key": "detected.marker",
        "label": "Detected Marker"
      }
    ]
  }
}
```

**Import Process**:
1. Fetch document from Google Docs API
2. Convert to HTML (preserving styles)
3. Detect markers in content (`{{...}}`)
4. Extract images and convert to base64
5. Create TemplateLink with GOOGLE_DOCS format
6. Setup auto-sync if enabled

**Errors**:
- `401`: Google account not linked
- `403`: No access to document
- `404`: Document not found
- `422`: Invalid document format

**Permissions**: `import:google`

---

### Sync Template with Google Docs

```http
POST /api/templates/:id/sync
```

**Response** (200 OK):
```json
{
  "data": {
    "id": "tmpl_google_123",
    "version": 5,
    "lastSyncedAt": "2025-11-04T11:25:00Z",
    "changes": {
      "contentChanged": true,
      "markersAdded": ["{{new.marker}}"],
      "markersRemoved": []
    }
  }
}
```

**Notes**:
- Manual sync trigger
- Auto-sync runs every 6 hours if enabled
- Creates new version on content change

**Permissions**: `update:templates`

---

### Disable Auto-Sync

```http
POST /api/templates/:id/disable-sync
```

**Response** (200 OK):
```json
{
  "message": "Auto-sync disabled",
  "data": {
    "syncEnabled": false
  }
}
```

**Permissions**: `update:templates`

---

## ❌ Error Handling

### Error Response Format

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [ /* optional array of error details */ ],
    "field": "fieldName" // optional, for validation errors
  },
  "meta": {
    "timestamp": "2025-11-04T11:30:00Z",
    "requestId": "req_xyz789",
    "path": "/api/templates/invalid-id"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `AUTHENTICATION_REQUIRED` | 401 | No valid JWT token |
| `FORBIDDEN` | 403 | User lacks required permission |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate) |
| `UNPROCESSABLE_ENTITY` | 422 | Business logic validation failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

### Common Error Scenarios

#### Validation Error (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "name",
        "message": "Name is required",
        "value": null
      },
      {
        "field": "type",
        "message": "Must be one of: CERTIFICATE, LETTER_OF_ENGAGEMENT",
        "value": "INVALID_TYPE"
      }
    ]
  }
}
```

#### Not Found (404)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Template not found",
    "resourceType": "TemplateLink",
    "resourceId": "tmpl_invalid"
  }
}
```

#### Forbidden (403)

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Permission denied",
    "requiredPermission": "create:templates",
    "userRole": "TRAINER"
  }
}
```

#### Marker Resolution Error (422)

```json
{
  "error": {
    "code": "MARKER_RESOLUTION_ERROR",
    "message": "Failed to resolve markers",
    "details": [
      {
        "marker": "{{participant.company.name}}",
        "message": "Marker not found in context",
        "suggestion": ["participant.fullName", "course.company.name"]
      }
    ]
  }
}
```

---

## 🚦 Rate Limiting

### Limits per Endpoint

| Endpoint Pattern | Limit | Window |
|-----------------|-------|--------|
| `POST /api/templates` | 20 requests | 1 minute |
| `POST /api/documents/generate` | 100 requests | 1 minute |
| `POST /api/documents/batch` | 10 requests | 5 minutes |
| `GET /api/*` | 1000 requests | 1 minute |
| `POST /api/templates/import/google` | 5 requests | 5 minutes |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699099200
```

### Rate Limit Exceeded Response

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "retryAfter": 60
  }
}
```

**HTTP Status**: 429 Too Many Requests

---

## 🔔 Webhooks

### Configure Webhook

```http
POST /api/webhooks
```

**Request Body**:
```json
{
  "url": "https://your-app.com/webhooks/templates",
  "events": [
    "document.generated",
    "document.sent",
    "batch.completed"
  ],
  "secret": "your_webhook_secret"
}
```

### Webhook Events

#### document.generated

```json
{
  "event": "document.generated",
  "timestamp": "2025-11-04T11:40:00Z",
  "data": {
    "documentId": "doc_xyz789",
    "type": "CERTIFICATE",
    "templateId": "tmpl_abc123",
    "entityType": "schedule",
    "entityId": "schedule-uuid",
    "generatedBy": "user-uuid",
    "fileUrl": "/uploads/documents/attestato-001-2025.pdf"
  }
}
```

#### batch.completed

```json
{
  "event": "batch.completed",
  "timestamp": "2025-11-04T11:45:00Z",
  "data": {
    "jobId": "job_batch_abc",
    "totalDocuments": 50,
    "successful": 50,
    "failed": 0,
    "zipUrl": "/downloads/batch_abc.zip"
  }
}
```

### Webhook Signature

All webhooks include signature in header:

```http
X-Webhook-Signature: sha256=abc123...
```

Verify signature:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const calculatedSignature = 'sha256=' + hmac.digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(calculatedSignature)
  );
}
```

---

## 📊 API Summary

### Endpoint Count by Category

| Category | Endpoints | Methods |
|----------|-----------|---------|
| Templates | 9 | GET (3), POST (3), PUT (1), DELETE (1) |
| Documents | 7 | GET (3), POST (3), DELETE (1) |
| Markers | 3 | GET (2), POST (1) |
| Lettere Incarico | 4 | GET (2), POST (1), DELETE (1) |
| Registri Presenze | 4 | GET (2), POST (2), DELETE (1) |
| Attestati | 6 | GET (3), POST (2), DELETE (1) |
| Google Integration | 4 | GET (2), POST (2) |
| **Total** | **37** | - |

### Authentication Required

All endpoints except:
- `GET /api/markers/available/:type`
- `GET /api/markers/formatters`

### Response Times (Target)

| Endpoint Type | Target | Max |
|--------------|--------|-----|
| GET (list) | < 200ms | 500ms |
| GET (single) | < 100ms | 300ms |
| POST (create) | < 500ms | 1s |
| POST (generate single) | < 3s | 5s |
| POST (generate batch) | < 1s (queued) | - |

---

**Document Owner**: API Team Lead  
**Last Review**: 4 Novembre 2025  
**Status**: ✅ API SPECIFICATION COMPLETA - Ready for Implementation
