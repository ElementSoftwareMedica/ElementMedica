# Template Management API - Developer Guide

**Version**: 1.0  
**Base URL**: `/api/v1`  
**Authentication**: JWT Bearer Token  
**Last Updated**: 4 Novembre 2025

---

## 🔐 Authentication

All endpoints require authentication via JWT Bearer token:

```http
Authorization: Bearer <your_jwt_token>
```

The token must include:
- Valid person ID
- Tenant ID
- Required permissions

---

## 📋 Template Endpoints

### Get Templates Statistics

Get aggregate statistics for templates and documents.

```http
GET /api/v1/templates/statistics
Authorization: Bearer <token>
```

**Permissions**: `read:templates`

**Response**: `200 OK`
```json
{
  "templates": {
    "total": 15,
    "active": 12,
    "inactive": 3
  },
  "documents": {
    "total": 247,
    "byType": {
      "CERTIFICATE": 150,
      "LETTER_OF_ENGAGEMENT": 45,
      "ATTENDANCE_REGISTER": 52
    },
    "byStatus": {
      "GENERATED": 200,
      "SENT": 40,
      "ARCHIVED": 7
    }
  },
  "topTemplates": [
    {
      "id": "tpl_123",
      "name": "Attestato Standard",
      "type": "CERTIFICATE",
      "documentsGenerated": 150
    }
  ]
}
```

---

### List Templates

Get paginated list of templates with optional filters.

```http
GET /api/v1/templates?page=1&limit=50&type=CERTIFICATE&isActive=true&search=attestato
Authorization: Bearer <token>
```

**Permissions**: `read:templates`

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `type` (optional): Filter by template type
- `isActive` (optional): Filter by active status (`true`/`false`)
- `isDefault` (optional): Filter by default status (`true`/`false`)
- `category` (optional): Filter by category
- `search` (optional): Search in name and description

**Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "tpl_abc123",
      "name": "Attestato Partecipazione",
      "type": "CERTIFICATE",
      "version": 3,
      "isActive": true,
      "isDefault": true,
      "category": "Formazione",
      "creator": {
        "id": "usr_123",
        "firstName": "Mario",
        "lastName": "Rossi"
      },
      "_count": {
        "generatedDocs": 45,
        "versions": 3
      },
      "createdAt": "2025-10-01T10:00:00Z",
      "updatedAt": "2025-11-01T15:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 15,
    "totalPages": 1
  }
}
```

---

### Get Single Template

Get detailed template information including versions.

```http
GET /api/v1/templates/:id
Authorization: Bearer <token>
```

**Permissions**: `read:templates`

**Response**: `200 OK`
```json
{
  "id": "tpl_abc123",
  "name": "Attestato Partecipazione",
  "type": "CERTIFICATE",
  "content": "<html>{{person.fullName}}</html>",
  "header": "<div>{{company.name}}</div>",
  "footer": "<small>Pagina {{page}}</small>",
  "styles": {
    "fontSize": "14pt",
    "fontFamily": "Arial"
  },
  "layout": {
    "pageSize": "A4",
    "orientation": "portrait",
    "margins": { "top": "20mm", "bottom": "20mm" }
  },
  "markers": ["person.fullName", "person.fiscalCode", "course.name"],
  "version": 3,
  "isActive": true,
  "isDefault": true,
  "category": "Formazione",
  "tags": ["attestato", "certificato", "corso"],
  "versions": [
    {
      "id": "ver_001",
      "version": 3,
      "changesSummary": "Updated: content, styles",
      "createdAt": "2025-11-01T15:30:00Z",
      "creator": { "firstName": "Mario", "lastName": "Rossi" }
    }
  ],
  "_count": { "generatedDocs": 45 },
  "createdAt": "2025-10-01T10:00:00Z",
  "updatedAt": "2025-11-01T15:30:00Z"
}
```

---

### Create Template

Create a new template.

```http
POST /api/v1/templates
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Attestato Sicurezza",
  "type": "CERTIFICATE",
  "content": "<html><body><h1>{{course.name}}</h1><p>{{person.fullName}}</p></body></html>",
  "header": "<div>{{company.name}}</div>",
  "footer": "<small>{{current.date|date:DD/MM/YYYY}}</small>",
  "styles": {
    "fontSize": "14pt",
    "fontFamily": "Arial, sans-serif"
  },
  "layout": {
    "pageSize": "A4",
    "orientation": "portrait",
    "margins": { "top": "20mm", "right": "20mm", "bottom": "20mm", "left": "20mm" }
  },
  "markers": ["person.fullName", "person.fiscalCode", "course.name"],
  "markerSchema": {
    "person": { "fullName": "string", "fiscalCode": "string" },
    "course": { "name": "string" }
  },
  "isDefault": true,
  "category": "Sicurezza",
  "tags": ["attestato", "sicurezza", "corso"],
  "description": "Template per attestati di partecipazione corsi sicurezza"
}
```

**Permissions**: `create:templates`

**Validation**:
- `name` (required): Template name
- `type` (required): One of `CERTIFICATE`, `LETTER_OF_ENGAGEMENT`, `ATTENDANCE_REGISTER`, `INVOICE`, `COURSE_PROGRAM`, `CUSTOM`
- `content` (optional): HTML template content
- `header` (optional): HTML header
- `footer` (optional): HTML footer
- `styles` (optional): CSS styles object
- `layout` (optional): PDF layout settings
- `markers` (optional): Array of marker keys
- `markerSchema` (optional): JSON schema for validation

**Response**: `201 Created`
```json
{
  "id": "tpl_new123",
  "name": "Attestato Sicurezza",
  "type": "CERTIFICATE",
  "version": 1,
  "isActive": true,
  "createdAt": "2025-11-04T18:00:00Z"
}
```

---

### Update Template

Update an existing template (creates new version automatically).

```http
PUT /api/v1/templates/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Attestato Sicurezza Aggiornato",
  "content": "<html><body><h1>NUOVO {{course.name}}</h1></body></html>",
  "isActive": true
}
```

**Permissions**: `update:templates`

**Response**: `200 OK`
```json
{
  "id": "tpl_abc123",
  "name": "Attestato Sicurezza Aggiornato",
  "version": 4,
  "updatedAt": "2025-11-04T18:10:00Z"
}
```

---

### Delete Template

Soft delete a template (sets `deletedAt` timestamp).

```http
DELETE /api/v1/templates/:id
Authorization: Bearer <token>
```

**Permissions**: `delete:templates`

**Response**: `200 OK`
```json
{
  "message": "Template deleted successfully",
  "id": "tpl_abc123"
}
```

---

### Validate Template

Validate markers in template content against context.

```http
POST /api/v1/templates/:id/validate
Authorization: Bearer <token>
Content-Type: application/json

{
  "mockData": {
    "person": { "fullName": "Mario Rossi", "fiscalCode": "RSSMRA80A01H501Z" },
    "course": { "name": "Corso Sicurezza sul Lavoro" }
  }
}
```

**Permissions**: `read:templates`

**Response**: `200 OK`
```json
{
  "valid": true,
  "errors": [],
  "warnings": [
    {
      "marker": "{{person.address}}",
      "message": "Nesting depth 3 exceeds recommended maximum 3"
    }
  ],
  "markerCount": 5
}
```

**Error Example**:
```json
{
  "valid": false,
  "errors": [
    {
      "marker": "{{preson.fullName}}",
      "message": "Marker not found in context: preson.fullName",
      "suggestion": ["person.fullName", "person.firstName", "person.lastName"]
    },
    {
      "marker": "{{course.name|unknownFormat}}",
      "message": "Unknown formatter: unknownFormat",
      "availableFormatters": ["date", "currency", "uppercase", "lowercase"]
    }
  ],
  "warnings": [],
  "markerCount": 5
}
```

---

### Preview Template

Generate HTML preview with mock data.

```http
POST /api/v1/templates/:id/preview
Authorization: Bearer <token>
Content-Type: application/json

{
  "mockData": {
    "person": { "fullName": "Mario Rossi", "fiscalCode": "RSSMRA80A01H501Z" },
    "course": { "name": "Corso Sicurezza", "hours": 8 },
    "company": { "name": "Acme Corp" },
    "current": { "date": "2025-11-04", "year": "2025" }
  }
}
```

**Permissions**: `read:templates`

**Response**: `200 OK`
```json
{
  "html": "<div>Acme Corp</div><html><body><h1>Corso Sicurezza</h1><p>Mario Rossi</p></body></html><small>04/11/2025</small>",
  "markers": [
    { "raw": "{{company.name}}", "path": "company.name", "formatter": null, "type": "simple" },
    { "raw": "{{person.fullName}}", "path": "person.fullName", "formatter": null, "type": "simple" },
    { "raw": "{{current.date|date:DD/MM/YYYY}}", "path": "current.date", "formatter": "date:DD/MM/YYYY", "type": "simple" }
  ]
}
```

---

### Get Version History

Get all versions of a template.

```http
GET /api/v1/templates/:id/versions
Authorization: Bearer <token>
```

**Permissions**: `read:templates`

**Response**: `200 OK`
```json
[
  {
    "id": "ver_003",
    "templateId": "tpl_abc123",
    "version": 3,
    "content": "<html>Version 3 content</html>",
    "changesSummary": "Updated: content, styles",
    "changeDetails": {
      "action": "updated",
      "changes": ["content", "styles"],
      "timestamp": "2025-11-01T15:30:00Z"
    },
    "creator": { "id": "usr_123", "firstName": "Mario", "lastName": "Rossi" },
    "createdAt": "2025-11-01T15:30:00Z"
  }
]
```

---

### Rollback to Version

Restore template to a previous version (creates new version).

```http
POST /api/v1/templates/:id/versions/:version/rollback
Authorization: Bearer <token>
```

**Permissions**: `update:templates`

**Response**: `200 OK`
```json
{
  "message": "Template rolled back to version 2",
  "template": {
    "id": "tpl_abc123",
    "version": 4,
    "updatedAt": "2025-11-04T18:20:00Z"
  },
  "rolledBackFrom": 3,
  "rolledBackTo": 2,
  "newVersion": 4
}
```

---

### Generate Document

Generate a single document from template.

```http
POST /api/v1/templates/:id/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "entityType": "schedule",
  "entityId": "sch_xyz789",
  "options": {
    "sendEmail": false
  }
}
```

**Permissions**: `generate:documents`

**Validation**:
- `entityType` (required): Type of entity (`schedule`, `enrollment`, `company`, etc.)
- `entityId` (required): ID of entity to generate document for
- `options` (optional): Generation options

**Response**: `201 Created`
```json
{
  "id": "doc_def456",
  "templateId": "tpl_abc123",
  "templateVersion": 3,
  "type": "CERTIFICATE",
  "entityType": "schedule",
  "entityId": "sch_xyz789",
  "filename": "CERTIFICATE_sch_xyz789_20251104.pdf",
  "filepath": "documents/2025/11/CERTIFICATE_sch_xyz789_20251104.pdf",
  "fileUrl": "/uploads/documents/2025/11/CERTIFICATE_sch_xyz789_20251104.pdf",
  "fileSize": 45678,
  "fileHash": "sha256:abc123...",
  "status": "GENERATED",
  "markers": { "person": {...}, "course": {...} },
  "generatedAt": "2025-11-04T18:25:00Z"
}
```

---

### Generate Batch Documents

Queue batch document generation (asynchronous).

```http
POST /api/v1/templates/:id/generate-batch
Authorization: Bearer <token>
Content-Type: application/json

{
  "entityType": "enrollment",
  "entityIds": ["enr_001", "enr_002", "enr_003", "enr_004"],
  "options": {
    "sendEmail": true
  }
}
```

**Permissions**: `generate:documents`

**Validation**:
- `entityType` (required): Type of entities
- `entityIds` (required): Array of entity IDs (at least 1)
- `options` (optional): Generation options

**Response**: `202 Accepted`
```json
{
  "batchId": "batch_20251104_abc123",
  "status": "PENDING",
  "totalDocuments": 4
}
```

---

## 📄 Document Endpoints

### Get Documents Statistics

Get aggregate statistics for generated documents.

```http
GET /api/v1/documents/statistics
Authorization: Bearer <token>
```

**Permissions**: `read:documents`

**Response**: `200 OK`
```json
{
  "total": 247,
  "byType": {
    "CERTIFICATE": 150,
    "LETTER_OF_ENGAGEMENT": 45,
    "ATTENDANCE_REGISTER": 52
  },
  "byStatus": {
    "GENERATED": 200,
    "SENT": 40,
    "ARCHIVED": 7
  },
  "totalSize": 12500000,
  "averageSize": 50607
}
```

---

### List Documents

Get paginated list of generated documents with filters.

```http
GET /api/v1/documents?page=1&limit=50&templateId=tpl_abc123&status=GENERATED
Authorization: Bearer <token>
```

**Permissions**: `read:documents`

**Query Parameters**:
- `page`, `limit`: Pagination
- `templateId`: Filter by template
- `type`: Filter by document type
- `status`: Filter by status (`DRAFT`, `GENERATED`, `SENT`, `ARCHIVED`)
- `entityType`, `entityId`: Filter by entity
- `batchId`: Filter by batch
- `startDate`, `endDate`: Filter by date range

**Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "doc_def456",
      "templateId": "tpl_abc123",
      "template": { "name": "Attestato Standard", "type": "CERTIFICATE" },
      "filename": "CERTIFICATE_sch_xyz789_20251104.pdf",
      "fileSize": 45678,
      "status": "GENERATED",
      "downloadCount": 3,
      "lastDownloadAt": "2025-11-04T18:30:00Z",
      "generatedAt": "2025-11-04T18:25:00Z",
      "generator": { "firstName": "Mario", "lastName": "Rossi" }
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 247, "totalPages": 5 }
}
```

---

### Get Document Metadata

Get detailed document information.

```http
GET /api/v1/documents/:id
Authorization: Bearer <token>
```

**Permissions**: `read:documents`

**Response**: `200 OK`
```json
{
  "id": "doc_def456",
  "templateId": "tpl_abc123",
  "templateVersion": 3,
  "type": "CERTIFICATE",
  "entityType": "schedule",
  "entityId": "sch_xyz789",
  "filename": "CERTIFICATE_sch_xyz789_20251104.pdf",
  "filepath": "documents/2025/11/CERTIFICATE_sch_xyz789_20251104.pdf",
  "fileUrl": "/uploads/documents/2025/11/CERTIFICATE_sch_xyz789_20251104.pdf",
  "fileSize": 45678,
  "fileHash": "sha256:abc123...",
  "markers": { "person": {...}, "course": {...} },
  "metadata": { "progressive": "2025/123" },
  "status": "GENERATED",
  "downloadCount": 3,
  "lastDownloadAt": "2025-11-04T18:30:00Z",
  "generatedAt": "2025-11-04T18:25:00Z",
  "template": { "name": "Attestato Standard" },
  "generator": { "firstName": "Mario", "lastName": "Rossi", "email": "mario@example.com" }
}
```

---

### Download Document

Download document file (increments download counter).

```http
GET /api/v1/documents/:id/download
Authorization: Bearer <token>
```

**Permissions**: `read:documents`

**Response**: `200 OK`
- For local storage: File download with `Content-Disposition: attachment`
- For S3 storage: Redirect to signed URL

---

### Get Batch Status

Get progress of batch document generation.

```http
GET /api/v1/documents/batch/:batchId/status
Authorization: Bearer <token>
```

**Permissions**: `read:documents`

**Response**: `200 OK`
```json
{
  "batchId": "batch_20251104_abc123",
  "total": 4,
  "completed": 3,
  "failed": 0,
  "inProgress": 1,
  "percentage": 75,
  "documents": [
    { "id": "doc_001", "status": "GENERATED" },
    { "id": "doc_002", "status": "GENERATED" },
    { "id": "doc_003", "status": "GENERATED" },
    { "id": "doc_004", "status": "IN_PROGRESS" }
  ]
}
```

---

### Delete Document

Soft delete a document (sets `deletedAt` timestamp).

```http
DELETE /api/v1/documents/:id
Authorization: Bearer <token>
```

**Permissions**: `delete:documents`

**Response**: `200 OK`
```json
{
  "message": "Document deleted successfully",
  "id": "doc_def456"
}
```

---

### Resend Document

Queue document for email delivery.

```http
POST /api/v1/documents/:id/resend
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "recipient@example.com",
  "subject": "Your Certificate",
  "message": "Please find your certificate attached."
}
```

**Permissions**: `send:documents`

**Response**: `200 OK`
```json
{
  "message": "Document will be sent via email",
  "documentId": "doc_def456",
  "sentTo": "recipient@example.com"
}
```

---

## 🔑 Permission Reference

| Permission | Description |
|------------|-------------|
| `read:templates` | View templates, validate, preview, list versions |
| `create:templates` | Create new templates |
| `update:templates` | Update templates, rollback versions |
| `delete:templates` | Soft delete templates |
| `generate:documents` | Generate documents (single/batch) |
| `read:documents` | View documents, download, batch status |
| `delete:documents` | Soft delete documents |
| `send:documents` | Resend documents via email |

---

## ❌ Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error",
  "details": [
    { "field": "name", "message": "Name is required" },
    { "field": "type", "message": "Invalid template type" }
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Template not found",
  "message": "Template with ID tpl_abc123 does not exist or has been deleted"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Failed to fetch templates"
}
```

---

## 📝 Notes

- All timestamps are in ISO 8601 format (UTC)
- File paths are relative to upload directory
- S3 URLs are pre-signed with 1-hour expiration
- Soft deletes preserve data with `deletedAt` timestamp
- Version numbers increment automatically on updates
- Batch operations return `202 Accepted` and process asynchronously
- Download operations increment `downloadCount` and update `lastDownloadAt`

---

**Last Updated**: 4 Novembre 2025, 18:15
