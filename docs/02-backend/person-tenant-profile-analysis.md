# Analisi: Person vs PersonTenantProfile

> Documento generato — Sessione #65 Fase 4, Task 7

## Architettura (P48/P49)

```
Person (identità fisica globale) → PersonTenantProfile (dati business per-tenant)
```

---

## Person — Campi Globali (Corretti ✅)

### Identità & Dati Biometrici
| Campo | Tipo | Motivazione |
|-------|------|-------------|
| `firstName`, `lastName` | String | Nome legale della persona fisica |
| `birthDate`, `birthPlace`, `birthProvince` | DateTime/String | Dati di nascita immutabili |
| `gender` | Gender | Genere biologico/legale |
| `taxCode` | String (unique) | Codice Fiscale — identificatore nazionale unico |
| `vatNumber` | String (unique) | P.IVA — identificatore nazionale unico |
| `numeroCartaIdentita` | String | Documento d'identità governativo |
| `profileImage` | String | Foto della persona fisica |

### Autenticazione
| Campo | Tipo | Motivazione |
|-------|------|-------------|
| `username` | String | Credenziale login — un login per persona cross-tenant |
| `password` | String | Credenziale auth |
| `mustChangePassword` | Boolean | Stato auth |
| `lastLogin` | DateTime | Stato auth |
| `failedAttempts`, `lockedUntil` | Int/DateTime | Protezione brute-force — deve essere globale |
| `pushSubscription` | Json | Token push del dispositivo — livello device |

### GDPR/Legale
| Campo | Tipo | Motivazione |
|-------|------|-------------|
| `gdprConsentDate`, `gdprConsentVersion` | DateTime/String | Consenso a livello piattaforma |
| `dataRetentionUntil` | DateTime | Ciclo vita dati piattaforma |

### Audit
| Campo | Tipo | Motivazione |
|-------|------|-------------|
| `createdAt`, `updatedAt`, `deletedAt` | DateTime | Timestamp audit |

---

## PersonTenantProfile — Campi Per-Tenant (Corretti ✅)

### Strutturali
| Campo | Tipo | Motivazione |
|-------|------|-------------|
| `id` | String (PK) | Chiave primaria |
| `personId` | String (FK → Person) | Riferimento alla persona fisica |
| `tenantId` | String (FK → Tenant) | Tenant di appartenenza |
| `createdAt`, `updatedAt`, `deletedAt` | DateTime | Timestamp audit |

### Contatti & Status
| Campo | Tipo | Motivazione |
|-------|------|-------------|
| `email`, `phone`, `pec` | String | Info contatto diverse per clinica/tenant |
| `status` (PersonStatus) | Enum | Una persona può essere ACTIVE in tenant A, PENDING in tenant B |
| `residenceAddress`, `residenceCity`, `postalCode`, `province` | String | Indirizzo registrato per contesto tenant |
| `notes` | String | Note specifiche per tenant |
| `isActive`, `isPrimary` | Boolean | Stato attivazione per-tenant |

### Lavoro/Business
| Campo | Tipo | Motivazione |
|-------|------|-------------|
| `title` | String | Qualifica lavorativa per tenant |
| `hiredDate`, `endDate` | DateTime | Date assunzione per azienda/tenant |
| `hourlyRate`, `monthlyRate`, `iban` | Decimal/String | Compenso per tenant |
| `tipoContratto` | TipoContratto (enum) | Tipo contratto per tenant |
| `tipoCollaboratore` | TipoCollaboratore (enum) | Tipo collaborazione per tenant |
| `oreSettimanali` | Int | Ore settimanali per tenant |
| `registerCode`, `registerCode2` | String | Codici registri per tenant |
| `specialties`, `certifications` | String[] | Specializzazioni esercitate in questo tenant |
| `shortDescription`, `fullDescription` | String | Bio/descrizione per tenant |
| `preferences` | Json | Preferenze UI/workflow per tenant |
| `dataShareConsent` | Boolean | Consenso condivisione dati per tenant |
| `disagioPsicologico` | Boolean | Flag clinico per tenant |

### Relazioni Per-Tenant
| Relazione | Verso | Motivazione |
|-----------|-------|-------------|
| `companyTenantProfileId` | CompanyTenantProfile | Datore di lavoro nel tenant |
| `siteId` | CompanySite | Sede assegnata |
| `repartoId` | Reparto | Reparto assegnato |
| `protocolloSanitarioId` | ProtocolloSanitario | Protocollo di sorveglianza |
| `profiloHR` | ProfiloHR | Profilo HR per-tenant |
| `queueSessions` | QueueSessionMedico[] | Sessioni coda per-tenant |

---

## Verifica Duplicazioni

| Aspetto | Risultato |
|---------|-----------|
| **email/phone** | ✅ Solo in PersonTenantProfile — non duplicato |
| **status** | ✅ Solo in PersonTenantProfile — non duplicato |
| **address** | ✅ Solo in PersonTenantProfile — corretto |
| **ruoli medici** | ✅ Modellati via relazioni (`MedicoAbilitato`, `sitesAsMedicoCompetente`), non campi scalari su Person |
| **specializzazioni** | ✅ In PersonTenantProfile.specialties (per-tenant) |

---

## Conclusione

**Il modello è già ben strutturato. Nessuna migrazione necessaria.**

- **Person** = identità fisica + credenziali auth + GDPR = **globale**
- **PersonTenantProfile** = contatti + impiego + status + dati business = **per-tenant**
- La competenza medica è modellata via relazioni, non campi scalari

### Note Minori (Non Bloccanti)

| Osservazione | Impatto |
|-------------|---------|
| `residenceAddress` in PersonTenantProfile — la residenza legale è globale, ma in contesto multi-clinica diverse registrazioni possono usare indirizzi diversi | Mantenere così — pragmatico |
| `profileImage` su Person — se un medico vuole foto diverse per clinica | Bassa priorità — tenere globale |
| Le relazioni su Person (es. `visiteComeMedico`, `giudiziEmessi`) includono `tenantId` sull'entità correlata, quindi il filtro tenant avviene a query time | Pattern corretto |
