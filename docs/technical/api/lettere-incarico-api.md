# Lettere Incarico API Reference

**Version**: 1.0  
**Base Path**: `/api/v1/lettere-incarico`  
**Authentication**: Required (JWT Bearer Token)

## Endpoints

### 1. List Lettere Incarico

```http
GET /api/v1/lettere-incarico
```

**Query Parameters**:
- `scheduleId` (optional): Filter by schedule ID
- `trainerId` (optional): Filter by trainer ID

**Authentication**: Required  
**Permission**: `read:documents`

**Response** (200):
```json
[
  {
    "id": "uuid",
    "scheduledCourseId": "uuid",
    "trainerId": "uuid",
    "nomeFile": "Lettera_Incarico_42_2024.pdf",
    "url": "/uploads/...",
    "dataGenerazione": "2024-01-15T10:30:00Z",
    "numeroProgressivo": 42,
    "annoProgressivo": 2024,
    "templateId": "uuid",
    "templateVersion": 1,
    "markers": { /* marker data */ },
    "scheduledCourse": {
      "id": "uuid",
      "course": { "id": "uuid", "title": "Corso..." },
      "startDate": "2024-02-01",
      "endDate": "2024-02-05"
    },
    "trainer": {
      "id": "uuid",
      "firstName": "Mario",
      "lastName": "Rossi",
      "email": "mario.rossi@example.com"
    },
    "template": {
      "id": "uuid",
      "name": "Lettera Incarico Standard",
      "version": 1
    }
  }
]
```

---

### 2. Get Single Lettera

```http
GET /api/v1/lettere-incarico/:id
```

**Authentication**: Required  
**Permission**: `read:documents`

**Response** (200): Same structure as list item, with full relations populated

**Errors**:
- 404: Lettera not found
- 403: Access denied (different tenant)

---

### 3. Generate Letter

```http
POST /api/v1/lettere-incarico/generate
```

**Authentication**: Required  
**Permission**: `create:documents`

**Body**:
```json
{
  "scheduleId": "uuid",
  "trainerId": "uuid",
  "templateId": "uuid",  // Optional, uses default if omitted
  "sendEmail": true,     // Optional, default false
  "email": "custom@example.com"  // Optional, uses trainer email if omitted
}
```

**Validation Rules**:
- `scheduleId`: Required, must be valid UUID
- `trainerId`: Required, must be valid UUID
- `templateId`: Optional, must be LETTER_OF_ENGAGEMENT type if provided
- `email`: Must be valid email format if sendEmail=true

**Response** (200):
```json
{
  "lettera": {
    "id": "uuid",
    "numeroProgressivo": 42,
    "annoProgressivo": 2024,
    "dataGenerazione": "2024-01-15T10:30:00Z",
    "templateId": "uuid",
    "templateVersion": 1
  },
  "document": {
    "id": "uuid",
    "filename": "Lettera_Incarico_42_2024.pdf",
    "fileUrl": "/uploads/...",
    "status": "GENERATED"
  },
  "downloadUrl": "/uploads/..."
}
```

**Errors**:
- 400: Validation error
- 404: Schedule, trainer, or template not found
- 500: Generation failed

**Business Logic**:
1. Verify schedule exists and belongs to tenant
2. Verify trainer exists and belongs to tenant
3. Get template (default if not specified)
4. Generate document via DocumentService
5. Get next progressive number for year
6. Create or update LetteraIncarico record
7. Send email if requested
8. Return letter and document info

---

### 4. Batch Generation

```http
POST /api/v1/lettere-incarico/generate-batch
```

**Authentication**: Required  
**Permission**: `create:documents`

**Body**:
```json
{
  "scheduleId": "uuid",
  "trainerIds": ["uuid1", "uuid2", "uuid3"],
  "templateId": "uuid",  // Optional
  "sendEmail": false     // Optional
}
```

**Validation Rules**:
- `scheduleId`: Required
- `trainerIds`: Required, array with at least 1 trainer
- `templateId`: Optional
- `sendEmail`: Optional boolean

**Response** (200):
```json
{
  "batchId": "uuid",
  "status": "PROCESSING",
  "total": 3,
  "message": "Batch generation started"
}
```

**Business Logic**:
1. Verify schedule exists
2. Get template (default if not specified)
3. Create batch generation job
4. Process trainers in parallel (up to 5 concurrent)
5. Return batch ID for monitoring

**Note**: Use `/api/v1/documents/batches/:batchId` to monitor progress

---

### 5. Delete Letter

```http
DELETE /api/v1/lettere-incarico/:id
```

**Authentication**: Required  
**Permission**: `delete:documents`

**Response** (200):
```json
{
  "message": "Lettera incarico deleted successfully"
}
```

**Errors**:
- 404: Lettera not found
- 403: Access denied

**Business Logic**:
- Soft delete (sets `deletedAt` timestamp)
- Does not delete physical file
- Letter remains in database for audit

---

### 6. Download Letter

```http
GET /api/v1/lettere-incarico/:id/download
```

**Authentication**: Required  
**Permission**: `read:documents`

**Response**: HTTP 302 redirect to file URL

**Errors**:
- 404: Lettera not found
- 403: Access denied

---

## Security

### Tenant Isolation
All queries automatically filtered by `req.user.tenantId`:
```javascript
where: { tenantId, deletedAt: null }
```

### Permission Checks
- `read:documents` - View and download letters
- `create:documents` - Generate new letters
- `delete:documents` - Delete letters

### Audit Logging
All operations logged with:
- `component`: 'lettere-incarico-routes'
- `action`: 'list' | 'get' | 'generate' | 'delete'
- `personId`: User ID
- Additional context (letteraId, scheduleId, etc.)

---

## Integration with Template System

### Template Selection
1. If `templateId` provided: Use specified template
2. If not provided: Use default LETTER_OF_ENGAGEMENT template
3. Template must be active (`isActive=true`)
4. Template must belong to same tenant

### Marker Resolution
Template markers are resolved with data from:
- **tenant.*** - Tenant information
- **trainer.*** - Trainer (Person) information
- **course.*** - Course details
- **schedule.*** - CourseSchedule details
- **document.*** - Document metadata
- **current.*** - Current date/time

### Progressive Numbering
- Format: `numeroProgressivo/annoProgressivo`
- Example: 42/2024 (42nd letter of 2024)
- Auto-incremented per tenant per year
- Used in document filename

---

## Frontend Integration

### Service Layer
```typescript
import lettereIncaricoService from '@/services/lettereIncaricoService';

// List letters for schedule
const letters = await lettereIncaricoService.list({ 
  scheduleId: 'uuid' 
});

// Generate letter
const result = await lettereIncaricoService.generate({
  scheduleId: 'uuid',
  trainerId: 'uuid',
  templateId: 'uuid',
  sendEmail: true
});

// Delete letter
await lettereIncaricoService.delete('uuid');

// Download letter
await lettereIncaricoService.download('uuid');
```

### UI Components
```tsx
import GenerateLetterDialog from '@/components/schedules/GenerateLetterDialog';
import ScheduleLettersCard from '@/components/schedules/ScheduleLettersCard';

// In schedule details page
<ScheduleLettersCard
  scheduleId={schedule.id}
  trainers={schedule.trainers}
/>
```

---

## Database Schema

```prisma
model LetteraIncarico {
  id                 String    @id @default(uuid())
  scheduledCourseId  String
  trainerId          String
  nomeFile           String
  url                String
  dataGenerazione    DateTime  @default(now())
  numeroProgressivo  Int
  annoProgressivo    Int
  
  // Template integration
  templateId         String?
  templateVersion    Int?
  markers            Json?
  generatedBy        String?
  fileSize           Int?
  
  // Multi-tenant & audit
  tenantId           String
  deletedAt          DateTime?
  
  // Relations
  scheduledCourse    CourseSchedule @relation(...)
  trainer            Person         @relation(...)
  template           TemplateLink?  @relation(...)
  tenant             Tenant         @relation(...)
  
  @@unique([scheduledCourseId, trainerId])
  @@index([templateId])
  @@index([tenantId])
}
```

---

## Error Handling

### Common Error Responses

**400 Bad Request**:
```json
{
  "error": "Validation error",
  "details": [
    {
      "field": "scheduleId",
      "message": "Schedule ID is required"
    }
  ]
}
```

**404 Not Found**:
```json
{
  "error": "Lettera incarico not found"
}
```

**403 Forbidden**:
```json
{
  "error": "Insufficient permissions"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Failed to generate letter of engagement",
  "message": "Detailed error message"
}
```

---

## Testing

### Manual Testing
```bash
# List letters
curl -H "Authorization: Bearer <token>" \
  http://localhost:4003/api/v1/lettere-incarico

# Generate letter
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"scheduleId":"uuid","trainerId":"uuid"}' \
  http://localhost:4003/api/v1/lettere-incarico/generate

# Download letter
curl -H "Authorization: Bearer <token>" \
  http://localhost:4003/api/v1/lettere-incarico/{id}/download
```

### Automated Testing
See `backend/tests/routes/lettere-incarico.test.js` (to be created)

---

## Performance

### Response Times (Expected)
- List: < 200ms
- Get single: < 100ms
- Generate: 2-3 seconds (PDF rendering)
- Batch: Async, use batch monitoring

### Optimization
- Template caching after first load
- Parallel batch processing (max 5 concurrent)
- Database indexes on common query fields

---

## Related Documentation
- [Template System Overview](../TEMPLATE_SYSTEM.md)
- [Document Service](../backend/document-service.md)
- [Phase 5.1 Summary](../../10_project_managemnt/29_template/18_PHASE5.1_SUMMARY.md)
