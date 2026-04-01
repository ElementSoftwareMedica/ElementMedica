# 📡 API Reference - ElementMedica

**Versione**: 2.5.0  
**Data**: 22 Gennaio 2026  
**Base URL**: `http://localhost:4001/api/v1`

> **P64**: Proxy server eliminato - API chiamate dirette a porta 4001

---

## 🔐 Authentication

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "identifier": "admin@example.com",
  "password": "Admin123!"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbG...",
    "refreshToken": "abc123...",
    "person": {
      "id": "uuid",
      "email": "admin@example.com",
      "firstName": "Admin",
      "lastName": "User"
    }
  }
}
```

### Refresh Token

```http
POST /api/v1/auth/refresh
Authorization: Bearer <refreshToken>
```

### Logout

```http
POST /api/v1/auth/logout
Authorization: Bearer <token>
```

---

## 👥 Persons

### List Persons

```http
GET /api/v1/persons?page=1&limit=10&search=mario
Authorization: Bearer <token>
```

**Query Params**:
- `page` (number) - Pagina
- `limit` (number) - Items per pagina
- `search` (string) - Ricerca testo
- `status` (string) - ACTIVE, INACTIVE
- `roleType` (string) - ADMIN, MANAGER, etc.

### Get Person

```http
GET /api/v1/persons/:id
Authorization: Bearer <token>
```

### Create Person

```http
POST /api/v1/persons
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Mario",
  "lastName": "Rossi",
  "email": "mario@example.com",
  "taxCode": "RSSMRA80A01H501Z",
  "roleType": "EMPLOYEE"
}
```

### Update Person

```http
PUT /api/v1/persons/:id
Authorization: Bearer <token>
```

### Delete Person (Soft)

```http
DELETE /api/v1/persons/:id
Authorization: Bearer <token>
```

### Check Existing (Cross-Tenant)

```http
GET /api/v1/persons/check-existing?taxCode=RSSMRA80A01H501Z
Authorization: Bearer <token>
```

### Import Cross-Tenant

```http
POST /api/v1/persons/import-cross-tenant
Authorization: Bearer <token>
Content-Type: application/json

{
  "personId": "uuid",
  "roleType": "EMPLOYEE"
}
```

---

## 🏢 Companies

### List Companies

```http
GET /api/v1/companies?page=1&limit=10
Authorization: Bearer <token>
```

### Get Company

```http
GET /api/v1/companies/:id
Authorization: Bearer <token>
```

### Create Company

```http
POST /api/v1/companies
Authorization: Bearer <token>
Content-Type: application/json

{
  "ragioneSociale": "Azienda SRL",
  "piva": "12345678901",
  "codiceFiscale": "12345678901",
  "sedeLegaleIndirizzo": "Via Roma 1",
  "sedeLegaleCitta": "Milano"
}
```

### Check Existing (Cross-Tenant)

```http
GET /api/v1/companies/check-existing?piva=12345678901
Authorization: Bearer <token>
```

---

## 🏥 Clinica - Appuntamenti

### List Appuntamenti

```http
GET /api/v1/clinica/appuntamenti?date=2026-01-22&ambulatorioId=uuid
Authorization: Bearer <token>
```

### Create Appuntamento

```http
POST /api/v1/clinica/appuntamenti
Authorization: Bearer <token>
Content-Type: application/json

{
  "pazienteId": "uuid",
  "medicoId": "uuid",
  "ambulatorioId": "uuid",
  "prestazioneId": "uuid",
  "dataOra": "2026-01-22T10:00:00Z",
  "durata": 30
}
```

### Accetta Paziente

```http
POST /api/v1/clinica/appuntamenti/:id/accetta
Authorization: Bearer <token>
```

### Chiama Paziente

```http
POST /api/v1/clinica/appuntamenti/:id/chiama
Authorization: Bearer <token>
```

---

## 🏥 Clinica - Visite

### List Visite

```http
GET /api/v1/clinica/visite?medicoId=uuid&date=2026-01-22
Authorization: Bearer <token>
```

### Create Visita

```http
POST /api/v1/clinica/visite
Authorization: Bearer <token>
```

### Start Visita

```http
POST /api/v1/clinica/visite/:id/start
Authorization: Bearer <token>
```

### Complete Visita

```http
POST /api/v1/clinica/visite/:id/complete
Authorization: Bearer <token>
```

---

## 🏥 Clinica - MDL (Medicina del Lavoro)

### Mansioni

```http
GET    /api/v1/clinica/mansioni
POST   /api/v1/clinica/mansioni
GET    /api/v1/clinica/mansioni/:id
PUT    /api/v1/clinica/mansioni/:id
DELETE /api/v1/clinica/mansioni/:id
POST   /api/v1/clinica/mansioni/:id/duplicate
POST   /api/v1/clinica/mansioni/:id/assign
```

### Giudizi Idoneità

```http
GET    /api/v1/clinica/giudizi-idoneita
POST   /api/v1/clinica/giudizi-idoneita
GET    /api/v1/clinica/giudizi-idoneita/:id
GET    /api/v1/clinica/giudizi-idoneita/expiring
POST   /api/v1/clinica/giudizi-idoneita/:id/notify-worker
POST   /api/v1/clinica/giudizi-idoneita/:id/notify-employer
```

### Rischio-Prestazioni

```http
GET    /api/v1/clinica/rischio-prestazioni/catalogo
GET    /api/v1/clinica/rischio-prestazioni/default-mapping
POST   /api/v1/clinica/rischio-prestazioni/seed-defaults
GET    /api/v1/clinica/rischio-prestazioni
POST   /api/v1/clinica/rischio-prestazioni
```

---

## 📚 Courses

### List Courses

```http
GET /api/v1/courses?page=1&limit=10
Authorization: Bearer <token>
```

### Get Course

```http
GET /api/v1/courses/:id
Authorization: Bearer <token>
```

### Create Course

```http
POST /api/v1/courses
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Corso Sicurezza",
  "code": "SIC001",
  "duration": 8,
  "price": 150.00
}
```

---

## 📄 Schedules

### List Schedules

```http
GET /api/v1/schedules?courseId=uuid&status=ACTIVE
Authorization: Bearer <token>
```

### Create Schedule

```http
POST /api/v1/schedules
Authorization: Bearer <token>
```

---

## 🔧 Headers Comuni

### Authentication
```
Authorization: Bearer <jwt_token>
```

### Tenant Mode (Admin)
```
X-Operate-Tenant-Id: <tenant_uuid>
```

### Brand Detection
```
X-Frontend-Id: element-medica | element-sicurezza
```

---

## 📊 Response Format

### Success

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Campo obbligatorio mancante",
    "details": [...]
  }
}
```

---

## 🔒 HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

## 🌐 Public API Endpoints

> **Base URL**: `http://localhost:4001/api/public`
> Nessuna autenticazione richiesta. Tenant risolto tramite `publicContentMiddleware` (header `X-Frontend-Id` o dominio).

### Prenotazioni Online

```http
GET /api/public/booking/slots
```
Slot disponibili per prenotazione pubblica. Filtra per medico, data, prestazione.

```http
GET /api/public/booking/slots/:slotId/times
```
Orari disponibili per uno slot specifico.

```http
POST /api/public/booking/validate
Content-Type: application/json
```
Valida dati paziente prima della prenotazione.

```http
GET /api/public/booking/prestazioni
```
Lista prestazioni prenotabili online.

```http
GET /api/public/booking/medici
```
Lista medici con slot pubblici disponibili.

### Medici (Profili Pubblici)

```http
GET /api/public/doctors
```
Lista medici con profilo pubblico (almeno uno slot `visibilePubblico: true`).

| Query Param | Tipo | Descrizione |
|-------------|------|-------------|
| `specialty` | string | Filtra per specializzazione |
| `search` | string | Ricerca per nome |
| `limit` | int | Max risultati (default: 50, max: 100) |

```http
GET /api/public/doctors/:id
```
Profilo completo di un singolo medico.

### Corsi (Formazione)

```http
GET /api/public/courses
```
Lista corsi pubblicati.

```http
GET /api/public/courses/:slug
```
Dettaglio corso per slug.

```http
GET /api/public/schedules
```
Calendario edizioni corsi pubbliche.

### CMS

```http
GET /api/public/cms/pages/:slug
```
Contenuto pagina CMS per slug.

### Contatti

```http
POST /api/public/contact-submissions
Content-Type: application/json
```
Invio richiesta contatto / preventivo.

### Analytics (Tracking)

```http
POST /api/public/analytics/track
Content-Type: application/json

{
  "path": "/corsi/sicurezza-generale",
  "pageType": "course_detail",
  "sessionId": "uuid-sessione",
  "duration": 45,
  "metadata": {}
}
```
Traccia visualizzazione pagina pubblica. Rate limit: 30 req/min per IP.

**`pageType` validi**: `homepage`, `course`, `course-detail`, `course-unified`, `doctor`, `doctor-detail`, `booking`, `schedule`, `service`, `group-services`, `contact`, `form`, `legal`, `other`.

### Analytics (Dashboard) — Autenticato

```http
GET /api/v1/analytics/public/overview
Authorization: Bearer <token>
```
Overview analytics: totalViews, uniqueSessions, avgDuration, byPageType, byDevice, dailyViews.

```http
GET /api/v1/analytics/public/pages
Authorization: Bearer <token>
```
Top pagine visitate con durata media. Richiede permesso `cms:read`.

### Sitemap & Robots

```http
GET /sitemap.xml
```
Sitemap XML dinamico. Include pagine CMS, corsi, profili medici, pagine statiche. Brand-aware tramite dominio.

```http
GET /robots.txt
```
Robots.txt dinamico per brand.
