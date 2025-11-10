# API Import Corsi (JSON)

Endpoint: `POST /courses/bulk-import`

- Modalità: JSON bulk import via proxy server
- Autenticazione: Bearer token (cookie HttpOnly supportato) e permesso `courses:create`
- Tenant: usa header `X-Tenant-ID` automatico dagli interceptor frontend

## JSON Payload
```json
{
  "courses": [
    {
      "title": "Corso di Sicurezza",
      "description": "Descrizione del corso",
      "category": "Sicurezza",
      "duration": "8 ore",
      "certifications": "Attestato di partecipazione",
      "code": "SEC001",
      "contents": "Contenuti del corso",
      "maxPeople": 20,
      "pricePerPerson": 150.00,
      "regulation": "D.Lgs. 81/08",
      "validityYears": 3,
      "practicalHours": 4,
      "riskLevel": "ALTO",
      "courseType": "PRIMO_CORSO",
      "isPublic": true,
      "seoTitle": "Corso Sicurezza SEO",
      "seoDescription": "Descrizione SEO",
      "shortDescription": "Breve descrizione",
      "fullDescription": "Descrizione completa",
      "image1Url": "https://example.com/image1.jpg",
      "image2Url": "https://example.com/image2.jpg",
      "subcategory": "Formazione generale",
      "slug": "corso-sicurezza-2024"
    }
  ],
  "overwriteIds": []
}
```

## Campi Supportati

### Obbligatori
- `title` (string): Titolo del corso

### Opzionali
- `description` (string): Descrizione del corso
- `category` (string): Categoria del corso
- `duration` (string): Durata (es. "8 ore")
- `certifications` (string): Certificazioni rilasciate
- `code` (string): Codice univoco del corso (auto-uppercase)
- `contents` (string): Contenuti del corso
- `maxPeople` (integer): Numero massimo partecipanti
- `pricePerPerson` (float): Prezzo per persona
- `regulation` (string): Normativa di riferimento
- `validityYears` (integer): Anni di validità
- `practicalHours` (integer): Ore pratiche
- `riskLevel` (enum): `ALTO`, `MEDIO`, `BASSO` (normalizzazione automatica da A/B/C, HIGH/MEDIUM/LOW)
- `courseType` (enum): `PRIMO_CORSO`, `AGGIORNAMENTO` (normalizzazione automatica)
- `isPublic` (boolean): Visibilità pubblica
- `seoTitle` (string): Titolo SEO
- `seoDescription` (string): Descrizione SEO
- `shortDescription` (string): Descrizione breve
- `fullDescription` (string): Descrizione completa
- `image1Url` (string): URL prima immagine
- `image2Url` (string): URL seconda immagine
- `subcategory` (string): Sottocategoria
- `slug` (string): Slug per URL

## Risposta
```json
{
  "message": "Bulk import completed",
  "totalSubmitted": 5,
  "validCourses": 5,
  "created": 3,
  "restored": 1,
  "skipped": 1,
  "report": {
    "totalSubmitted": 5,
    "validCourses": 5,
    "duplicates": {
      "inPayload": [],
      "inDatabase": []
    },
    "overwriteIds": []
  }
}
```

## Gestione Duplicati
- **Codice corso**: Se presente, deve essere univoco nel tenant
- **Soft-deleted**: Corsi eliminati con stesso codice vengono ripristinati e aggiornati
- **Skip duplicates**: Attivo per evitare errori su constraint unique

## Normalizzazioni Automatiche
- `code`: Convertito in maiuscolo
- `riskLevel`: `A/HIGH/ALTO` → `ALTO`, `B/MEDIUM/MEDIO` → `MEDIO`, `C/LOW/BASSO` → `BASSO`
- `courseType`: `PRIMO/BASE/INIZIALE` → `PRIMO_CORSO`, `AGG/REFRESH/UPDATE` → `AGGIORNAMENTO`
- Campi numerici: Conversione sicura con fallback a `null`
- Boolean: Conversione da stringhe (`true/1/yes/si` → `true`)

## Note Implementazione
- Endpoint implementato nel proxy server (`/backend/proxy/routes/localRoutes.js`)
- Validazione: solo `title` obbligatorio
- Tenant isolation: automatico via `tenantId` dalla sessione
- Transazioni: Ripristino soft-deleted in batch sicuro
- Logging: Completo per audit e debugging

## GDPR
- Nessun dato sensibile in log
- Audit trail via middleware proxy
- Tenant isolation rigoroso

## Errori Comuni
- **500 "Unknown argument"**: Campo non esistente nel modello Prisma (es. `renewalDuration` rimosso)
- **400 "Invalid courses data"**: Array `courses` mancante o vuoto
- **403 "Missing tenant context"**: Header `X-Tenant-ID` mancante
- **403 "Permission denied"**: Permesso `courses:create` mancante