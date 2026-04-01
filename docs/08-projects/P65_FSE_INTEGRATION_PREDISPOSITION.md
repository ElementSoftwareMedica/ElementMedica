# P65 - Predisposizione Integrazione FSE (Fascicolo Sanitario Elettronico)

**Stato**: ✅ Completato (Fase 1-4.7)  
**Data**: 3 Febbraio 2026  
**Ultimo Aggiornamento**: 4 Febbraio 2026 (Fase 4.7 Template System Consolidation)  
**Versione**: v1.5  
**Complessità**: 🔴 ALTA (400-600 ore stimate)  
**Dipendenze**: P52, P55, P56, P57, P58, P61

**Progress**: ████████████████ 100% (Tutte le fasi completate + HL7 Template Integration)

---

## 📋 Obiettivo

Preparare l'infrastruttura di ElementMedica per la futura integrazione con il **Fascicolo Sanitario Elettronico (FSE 2.0)** italiano, implementando:

1. **Strutturazione dati HL7** - Mappatura dati clinici su standard HL7 CDA R2
2. **Sistema Firma Digitale** - Firma elettronica qualificata (FEQ) e grafometrica
3. **Gestione Consensi GDPR** - Sistema consensi avanzato conforme FSE
4. **Export CDA** - Generazione documenti in formato Clinical Document Architecture

---

## 📊 Analisi Stato di Fatto

### ✅ Già Implementato

| Componente | Stato | Riferimento |
|------------|-------|-------------|
| Schema Referto | ✅ Completo | `Referto` con firma base, hash |
| Schema FirmaDigitale | ⚠️ Solo schema | Nessun service/controller |
| ConsentRecord | ✅ Funzionante | GDPR consent tracking |
| PersonDataShareConsent | ✅ Completo | Cross-tenant consent P48/P57 |
| GdprAuditLog | ✅ Completo | Audit trail completo |
| DocumentoTemplate | ✅ Completo | Sistema modulistica P53 |
| QuestionarioMedicoConfig | 🚧 In sviluppo | P61 questionari |
| PDF Generation | ✅ Completo | documents-server.js (Puppeteer) |

### ❌ Da Implementare

| Componente | Priorità | Complessità |
|------------|----------|-------------|
| HL7 CDA Formatter | 🔴 Alta | Media |
| FirmaDigitaleService | 🔴 Alta | Alta |
| Firma Grafometrica | 🔴 Alta | Alta |
| Vault Firma Sicuro | 🔴 Alta | Alta |
| Consent FSE Specifici | 🟡 Media | Bassa |
| CDA Export Service | 🟡 Media | Media |
| FHIR Resource Mapper | 🟢 Bassa | Alta |

### ⚠️ Codice Legacy da Rimuovere

> **Nota**: La maggior parte del codice legacy è stata consolidata durante Fase 1-4.5. I rimanenti non sono bloccanti per FSE.

| File | Linee | Descrizione | Azione |
|------|-------|-------------|--------|
| messaging-routes.js | 215-230 | SMTP legacy config | Migrare tenant → rimuovere |
| messaging-routes.js | 577-590 | WhatsApp legacy config | Migrare tenant → rimuovere |
| personController.js | 70 | `companyId` alias | ✅ Mantenuto per compatibilità |
| formSchemas.js | 182-220 | Legacy submission | Verificare form pubblici |
| CourseParticipantService.js | 260-280 | Metodo non usato | ✅ Verificato: metodo in uso |

**Nota**: Il sistema firma è stato completamente consolidato in:
- `backend/services/signature/` - Services centralizzati
- `backend/routes/signature-routes.js` - API unificate
- `src/components/signature/` - Components frontend P65

---

## 🏗️ Architettura Proposta

### Stack Tecnico

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React/Vite)                            │
│  SignaturePad │ ConsentForms │ CDAADocViewer │ FirmaQualificataWidget   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ REST API (HTTPS)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      API SERVER (4001) - Express                        │
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │ FirmaDigitale   │  │ CDAExport       │  │ ConsentFSE      │         │
│  │ Controller      │  │ Controller      │  │ Controller      │         │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘         │
│           │                    │                    │                   │
│  ┌────────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐         │
│  │ FirmaDigitale   │  │ HL7CDA          │  │ ConsentFSE      │         │
│  │ Service         │  │ Service         │  │ Service         │         │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘         │
│           │                    │                    │                   │
└───────────┼────────────────────┼────────────────────┼───────────────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           DATABASE (PostgreSQL)                          │
│                                                                          │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                │
│  │ FirmaDigitale │  │ CDADocument   │  │ ConsentFSE    │                │
│  │ FirmaVault    │  │ HL7Mapping    │  │ ConsentRecord │                │
│  │ Certificato   │  │ Referto       │  │ GdprAuditLog  │                │
│  └───────────────┘  └───────────────┘  └───────────────┘                │
└─────────────────────────────────────────────────────────────────────────┘
            │
            │ External Integrations (Fase 2)
            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              EXTERNAL SYSTEMS (Future Integration)                       │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                │
│  │ Aruba Sign    │  │ InfoCert      │  │ INI Gateway   │                │
│  │ (FEQ)         │  │ (FEQ)         │  │ (FSE 2.0)     │                │
│  └───────────────┘  └───────────────┘  └───────────────┘                │
└─────────────────────────────────────────────────────────────────────────┘
```

### Flusso Firma Digitale

```
┌──────────────────────────────────────────────────────────────────────┐
│                    FLUSSO FIRMA REFERTO                              │
│                                                                      │
│  1. Creazione Referto                                                │
│     └─► Referto.stato = BOZZA                                        │
│                                                                      │
│  2. Completamento Referto                                            │
│     └─► Referto.stato = DA_FIRMARE                                   │
│     └─► Hash SHA-256 del contenuto                                   │
│                                                                      │
│  3. Firma Medico (scelta tipo firma)                                 │
│     ┌─────────────────────────────────────────────────────────┐      │
│     │  A) Firma Grafometrica (tablet/pad)                     │      │
│     │     └─► Canvas signature → PNG/SVG                      │      │
│     │     └─► Metadati biometrici (opzionale)                 │      │
│     │     └─► Crittografia AES-256                            │      │
│     │     └─► Store in FirmaVault                             │      │
│     │                                                         │      │
│     │  B) Firma Elettronica Qualificata (FEQ)                 │      │
│     │     └─► Redirect a provider (Aruba/InfoCert)            │      │
│     │     └─► Callback con certificato PKCS#7                 │      │
│     │     └─► Validazione timestamp TSA                       │      │
│     │     └─► Store certificato e timestamp                   │      │
│     │                                                         │      │
│     │  C) Firma Semplice (username/password)                  │      │
│     │     └─► Solo per documenti interni non FSE              │      │
│     └─────────────────────────────────────────────────────────┘      │
│                                                                      │
│  4. Post-Firma                                                       │
│     └─► Referto.stato = FIRMATO                                      │
│     └─► FirmaDigitale record creato                                  │
│     └─► GdprAuditLog con dataAccessed                                │
│     └─► Opzionale: Export CDA                                        │
│                                                                      │
│  5. Consegna                                                         │
│     └─► Referto.stato = CONSEGNATO                                   │
│     └─► Notifica paziente (email/SMS/WhatsApp)                       │
│     └─► Opzionale: Upload FSE (Fase 2)                               │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 📐 Schema Database - Nuovi Modelli

### Sprint 1: Sistema Firma Consolidato

```prisma
// ============================================
// P65 - FIRMA DIGITALE E VAULT SICURO
// ============================================

/// Estensione FirmaDigitale esistente
/// Aggiunge campi per firma grafometrica e FEQ
model FirmaDigitale {
  id            String     @id @default(uuid())
  
  // === DOCUMENTO FIRMATO ===
  refertoId     String?    // FK a Referto (opzionale)
  documentoId   String?    // FK a DocumentoCompilato/PersonDocument
  documentType  TipoDocumentoFirmato
  
  // === FIRMATARIO ===
  firmatarioId  String     // FK a Person
  firmatarioRole TipoFirmatario  // MEDICO, PAZIENTE, OPERATORE
  
  // === STATO E TIPO ===
  stato         StatoFirma @default(IN_ATTESA)
  tipoFirma     TipoFirmaDigitale @default(SEMPLICE)
  
  // === HASH E INTEGRITÀ ===
  hashDocumento String     // SHA-256 pre-firma
  hashFirma     String?    // SHA-256 post-firma
  algoritmo     String     @default("SHA-256")
  
  // === FIRMA GRAFOMETRICA (P65) ===
  firmaVaultId  String?    @unique  // FK a FirmaVault (dati biometrici criptati)
  firmaImageUrl String?    // URL immagine firma (solo visuale, no biometrico)
  
  // === FEQ - Firma Elettronica Qualificata ===
  certificato   String?    // Certificato X.509 o riferimento
  provider      ProviderFirma?  // ARUBA, INFOCERT, NAMIRIAL, etc.
  timestampTSA  DateTime?  // Timestamp authority
  pkcs7Data     String?    @db.Text // Firma PKCS#7 encoded
  serialNumber  String?    // Serial number certificato
  
  // === VALIDAZIONE ===
  validatoDa    String?    // PersonId che ha validato
  validatoAt    DateTime?
  motivoRifiuto String?
  
  // === METADATA ===
  ipAddress     String?
  userAgent     String?
  dispositivo   String?    // Identificativo tablet/pad per grafometrica
  
  // === AUDIT ===
  tenantId      String
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
  deletedAt     DateTime?

  // Relazioni
  firmatario    Person     @relation("FirmeFirmatario", fields: [firmatarioId], references: [id])
  firmaVault    FirmaVault? @relation(fields: [firmaVaultId], references: [id])
  tenant        Tenant     @relation(fields: [tenantId], references: [id])
  
  @@index([tenantId])
  @@index([firmatarioId])
  @@index([refertoId])
  @@index([documentoId])
  @@index([stato])
  @@index([tipoFirma])
  @@index([tenantId, stato])
  @@map("firme_digitali")
}

/// Vault sicuro per dati biometrici firma grafometrica
/// I dati sono criptati AES-256 e non reversibili senza chiave
model FirmaVault {
  id            String   @id @default(uuid())
  
  // === DATI CRIPTATI (AES-256-GCM) ===
  encryptedData String   @db.Text  // Dati biometrici criptati
  iv            String   // Initialization vector
  authTag       String   // Authentication tag GCM
  keyVersion    Int      @default(1)  // Versione chiave di crittografia
  
  // === METADATA NON SENSIBILI ===
  dataType      TipoDatiBiometrici @default(IMMAGINE)
  createdAt     DateTime @default(now())
  expiresAt     DateTime?  // GDPR: data retention
  
  // === ACCESSO ===
  accessCount   Int      @default(0)
  lastAccessAt  DateTime?
  
  // Relazione inversa
  firma         FirmaDigitale?
  
  @@index([expiresAt])
  @@map("firma_vault")
}

enum TipoDocumentoFirmato {
  REFERTO
  CONSENSO
  QUESTIONARIO
  CERTIFICATO
  GIUDIZIO_IDONEITA
  ALLEGATO_3B
  ALTRO
  
  @@map("tipo_documento_firmato")
}

enum TipoFirmatario {
  MEDICO
  PAZIENTE
  OPERATORE
  RAPPRESENTANTE_LEGALE
  
  @@map("tipo_firmatario")
}

enum TipoFirmaDigitale {
  SEMPLICE           // Username/password (solo interni)
  GRAFOMETRICA       // Firma su tablet/pad
  FEQ                // Firma Elettronica Qualificata
  FEA                // Firma Elettronica Avanzata
  REMOTA             // Firma remota (OTP + certificato cloud)
  
  @@map("tipo_firma_digitale")
}

enum ProviderFirma {
  ARUBA
  INFOCERT
  NAMIRIAL
  POSTE_ITALIANE
  INTESI_GROUP
  INTERNAL           // Solo per test/sviluppo
  
  @@map("provider_firma")
}

enum TipoDatiBiometrici {
  IMMAGINE           // Solo PNG/SVG firma (non biometrico)
  BIOMETRICO_BASE    // + pressione, velocità
  BIOMETRICO_FULL    // + accelerazione, inclinazione
  
  @@map("tipo_dati_biometrici")
}
```

### Sprint 2: Consensi FSE

```prisma
// ============================================
// P65 - CONSENSI SPECIFICI FSE
// ============================================

/// Consensi specifici per FSE (Art. 12 D.L. 179/2012)
/// Estende ConsentRecord con campi FSE-specific
model ConsentFSE {
  id            String   @id @default(uuid())
  
  // === PAZIENTE ===
  personId      String   // FK a Person (paziente)
  
  // === TIPO CONSENSO FSE ===
  tipoConsenso  TipoConsensoFSE
  
  // === STATO ===
  consentGiven  Boolean  @default(false)
  revokedAt     DateTime?
  revokedReason String?
  
  // === MODALITÀ RACCOLTA ===
  modalitaRaccolta ModalitaRaccoltaConsenso
  documentoRiferimento String?  // ID documento consenso firmato
  
  // === VALIDITÀ ===
  validFrom     DateTime @default(now())
  validUntil    DateTime?
  
  // === OSCURAMENTO DATI (Art. 5) ===
  oscuramentoAttivo Boolean @default(false)
  tipiDatiOscurati  TipoDatoClinico[]  // Tipi dati da oscurare
  
  // === DELEGHE (Art. 12) ===
  delegatoId    String?  // FK a Person (delegato/tutore)
  tipoDelega    TipoDelega?
  documentoDelega String?
  
  // === AUDIT ===
  tenantId      String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?
  createdBy     String?
  
  // Relazioni
  person        Person   @relation("ConsentiFSE", fields: [personId], references: [id])
  delegato      Person?  @relation("DelegatoConsensoFSE", fields: [delegatoId], references: [id])
  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  
  @@unique([personId, tipoConsenso, tenantId])
  @@index([tenantId])
  @@index([personId])
  @@index([tipoConsenso])
  @@index([consentGiven])
  @@map("consent_fse")
}

enum TipoConsensoFSE {
  // Consensi base FSE
  ALIMENTAZIONE           // Consenso alimentazione FSE
  CONSULTAZIONE          // Consenso consultazione da parte MMG/PLS
  
  // Consensi specifici
  CONSULTAZIONE_EMERGENZA // Pronto soccorso senza consenso esplicito
  PREGRESSO              // Inclusione referti pregressi
  DOSSIER_FARMACEUTICO   // Accesso dossier farmaceutico
  
  // P65: Consensi clinica MDL
  CONDIVISIONE_MC        // Condivisione dati con Medico Competente
  CONDIVISIONE_RSPP      // Condivisione con RSPP (solo idoneità)
  CONDIVISIONE_DL        // Condivisione con Datore di Lavoro (solo idoneità)
  
  @@map("tipo_consenso_fse")
}

enum ModalitaRaccoltaConsenso {
  CARTACEO_FIRMA_AUTOGRAFA
  DIGITALE_FIRMA_GRAFOMETRICA
  DIGITALE_FEQ
  DIGITALE_SPID
  DIGITALE_CIE
  VERBALE_CON_TESTIMONE
  
  @@map("modalita_raccolta_consenso")
}

enum TipoDatoClinico {
  REFERTI_LABORATORIO
  REFERTI_RADIOLOGIA
  REFERTI_SPECIALISTICA
  PRESCRIZIONI_FARMACI
  VACCINAZIONI
  DIAGNOSI_SENSIBILI      // HIV, psichiatria, etc.
  CERTIFICATI_IDONEITA
  GIUDIZI_MDL
  
  @@map("tipo_dato_clinico")
}

enum TipoDelega {
  TUTORE_LEGALE
  GENITORE_MINORE
  AMMINISTRATORE_SOSTEGNO
  DELEGA_VOLONTARIA
  
  @@map("tipo_delega")
}
```

### Sprint 3: HL7/CDA Export

```prisma
// ============================================
// P65 - DOCUMENTI CDA E MAPPING HL7
// ============================================

/// Documento CDA generato (cache per performance)
model CDADocument {
  id            String   @id @default(uuid())
  
  // === SORGENTE ===
  sourceType    CDASourceType
  sourceId      String   // ID del documento sorgente
  
  // === CDA CONTENT ===
  cdaXml        String   @db.Text  // XML CDA completo
  cdaVersion    String   @default("R2")  // HL7 CDA Release 2
  templateId    String?  // OID template usato
  
  // === HASHING ===
  hashXml       String   // SHA-256 del XML
  
  // === STATO INVIO FSE ===
  statoInvio    StatoInvioCDA @default(NON_INVIATO)
  inviatoAt     DateTime?
  esitoInvio    String?
  erroreInvio   String?
  
  // === METADATA ===
  tenantId      String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  
  @@unique([sourceType, sourceId])
  @@index([tenantId])
  @@index([statoInvio])
  @@index([sourceType, sourceId])
  @@map("cda_documents")
}

/// Mapping campi interni → codici HL7
model HL7Mapping {
  id            String   @id @default(uuid())
  
  // === CAMPO INTERNO ===
  entityType    String   // Es: "Referto", "Visita", "Prestazione"
  fieldPath     String   // Es: "diagnosiPrincipale", "prestazione.codice"
  
  // === CODIFICA HL7 ===
  hl7CodeSystem String   // Es: "2.16.840.1.113883.6.1" (LOINC)
  hl7Code       String   // Es: "29299-5" (LOINC code)
  hl7DisplayName String?
  
  // === MAPPING ALTERNATIVO ===
  icd9Code      String?  // Codice ICD-9-CM (diagnosi)
  icd10Code     String?  // Codice ICD-10 (diagnosi)
  atecoCode     String?  // Codice ATECO (settore lavoro)
  
  // === VALIDITÀ ===
  attivo        Boolean  @default(true)
  validoDa      DateTime @default(now())
  validoA       DateTime?
  
  tenantId      String?  // null = mapping globale
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([entityType, fieldPath, hl7CodeSystem, tenantId])
  @@index([entityType])
  @@index([hl7CodeSystem])
  @@index([tenantId])
  @@map("hl7_mappings")
}

enum CDASourceType {
  REFERTO
  GIUDIZIO_IDONEITA
  CERTIFICATO
  LETTERA_DIMISSIONE
  PRESCRIZIONE
  
  @@map("cda_source_type")
}

enum StatoInvioCDA {
  NON_INVIATO
  IN_CODA
  INVIATO
  ACCETTATO
  RIFIUTATO
  ERRORE
  
  @@map("stato_invio_cda")
}
```

---

## 📦 Componenti Backend

### 1. FirmaDigitaleService

```javascript
// backend/services/signature/FirmaDigitaleService.js

/**
 * Servizio gestione firme digitali
 * Supporta: Semplice, Grafometrica, FEQ
 */
export class FirmaDigitaleService {
  
  /**
   * Crea richiesta firma per documento
   * @param {Object} data - { documentType, documentId, firmatarioId, tipoFirma }
   * @returns {Promise<FirmaDigitale>}
   */
  static async createSignatureRequest(data) {}
  
  /**
   * Applica firma grafometrica
   * @param {string} firmaId 
   * @param {Object} signatureData - { imageBase64, biometricData?, dispositivo }
   * @returns {Promise<FirmaDigitale>}
   */
  static async applyGraphometricSignature(firmaId, signatureData) {}
  
  /**
   * Inizia flusso FEQ con provider esterno
   * @param {string} firmaId 
   * @param {string} provider - ARUBA | INFOCERT | ...
   * @returns {Promise<{ redirectUrl: string }>}
   */
  static async initiateFEQFlow(firmaId, provider) {}
  
  /**
   * Callback da provider FEQ
   * @param {string} firmaId 
   * @param {Object} callbackData - { pkcs7, certificate, timestamp }
   * @returns {Promise<FirmaDigitale>}
   */
  static async completeFEQFlow(firmaId, callbackData) {}
  
  /**
   * Verifica integrità firma
   * @param {string} firmaId 
   * @returns {Promise<{ valid: boolean, details: Object }>}
   */
  static async verifySignature(firmaId) {}
  
  /**
   * Ottieni firma salvata per riutilizzo (GDPR: solo se autorizzato)
   * @param {string} personId 
   * @param {string} tenantId 
   * @returns {Promise<string>} URL immagine firma
   */
  static async getSavedSignatureImage(personId, tenantId) {}
}
```

### 2. FirmaVaultService

```javascript
// backend/services/signature/FirmaVaultService.js

/**
 * Servizio vault sicuro per dati biometrici
 * Crittografia AES-256-GCM con key rotation
 */
export class FirmaVaultService {
  
  /**
   * Cripta e salva dati biometrici
   * @param {Buffer} biometricData 
   * @param {TipoDatiBiometrici} dataType 
   * @returns {Promise<string>} vaultId
   */
  static async encryptAndStore(biometricData, dataType) {}
  
  /**
   * Decripta dati (solo per verifica legale)
   * @param {string} vaultId 
   * @param {string} reason - Motivazione accesso
   * @returns {Promise<Buffer>}
   */
  static async decryptForVerification(vaultId, reason) {}
  
  /**
   * Ruota chiavi di crittografia (manutenzione)
   * @returns {Promise<{ rotated: number }>}
   */
  static async rotateEncryptionKeys() {}
  
  /**
   * Elimina dati scaduti (GDPR retention)
   * @returns {Promise<{ deleted: number }>}
   */
  static async purgeExpiredData() {}
}
```

### 3. HL7CDAService

```javascript
// backend/services/fse/HL7CDAService.js

/**
 * Servizio generazione documenti CDA HL7
 */
export class HL7CDAService {
  
  /**
   * Genera CDA da Referto
   * @param {string} refertoId 
   * @param {string} tenantId 
   * @returns {Promise<{ xml: string, hash: string }>}
   */
  static async generateFromReferto(refertoId, tenantId) {}
  
  /**
   * Genera CDA da GiudizioIdoneita
   * @param {string} giudizioId 
   * @param {string} tenantId 
   * @returns {Promise<{ xml: string, hash: string }>}
   */
  static async generateFromGiudizio(giudizioId, tenantId) {}
  
  /**
   * Valida XML CDA contro schematron
   * @param {string} cdaXml 
   * @returns {Promise<{ valid: boolean, errors: string[] }>}
   */
  static async validateCDA(cdaXml) {}
  
  /**
   * Ottieni mapping HL7 per campo
   * @param {string} entityType 
   * @param {string} fieldPath 
   * @returns {Promise<HL7Mapping>}
   */
  static async getHL7Mapping(entityType, fieldPath) {}
}
```

### 4. ConsentFSEService

```javascript
// backend/services/fse/ConsentFSEService.js

/**
 * Servizio gestione consensi FSE
 */
export class ConsentFSEService {
  
  /**
   * Registra consenso alimentazione FSE
   * @param {Object} data - { personId, tipoConsenso, modalitaRaccolta, documentoRiferimento }
   * @returns {Promise<ConsentFSE>}
   */
  static async grantConsent(data) {}
  
  /**
   * Revoca consenso
   * @param {string} consentId 
   * @param {string} reason 
   * @returns {Promise<ConsentFSE>}
   */
  static async revokeConsent(consentId, reason) {}
  
  /**
   * Verifica se paziente ha consenso attivo
   * @param {string} personId 
   * @param {TipoConsensoFSE} tipoConsenso 
   * @returns {Promise<boolean>}
   */
  static async hasActiveConsent(personId, tipoConsenso) {}
  
  /**
   * Attiva/disattiva oscuramento dati
   * @param {string} consentId 
   * @param {TipoDatoClinico[]} tipiDati 
   * @returns {Promise<ConsentFSE>}
   */
  static async toggleDataObscuration(consentId, tipiDati) {}
  
  /**
   * Registra delega
   * @param {Object} data - { personId, delegatoId, tipoDelega, documentoDelega }
   * @returns {Promise<ConsentFSE>}
   */
  static async registerDelegation(data) {}
}
```

---

## 🎨 Componenti Frontend

### 1. SignaturePad Component

```tsx
// src/components/signature/SignaturePad.tsx

interface SignaturePadProps {
  onSign: (signatureData: SignatureData) => void;
  onCancel: () => void;
  mode: 'grafometrica' | 'semplice';
  savedSignatureUrl?: string;  // Per riutilizzo
  showBiometricOption?: boolean;
}

interface SignatureData {
  imageBase64: string;
  imageFormat: 'png' | 'svg';
  biometricEnabled?: boolean;
  timestamp: Date;
}

/**
 * Componente firma su canvas
 * - Supporta mouse, touch, stylus
 * - Opzione salvataggio per riutilizzo
 * - Opzione dati biometrici (pressione, velocità)
 */
```

### 2. FEQWidget Component

```tsx
// src/components/signature/FEQWidget.tsx

interface FEQWidgetProps {
  firmaId: string;
  provider: 'ARUBA' | 'INFOCERT' | 'NAMIRIAL';
  onComplete: (result: FEQResult) => void;
  onError: (error: Error) => void;
}

/**
 * Widget integrazione provider FEQ
 * - Redirect a pagina provider
 * - Callback gestione esito
 * - Visualizzazione certificato
 */
```

### 3. ConsentFSEForm Component

```tsx
// src/components/consent/ConsentFSEForm.tsx

interface ConsentFSEFormProps {
  personId: string;
  onSubmit: (consents: ConsentFSEInput[]) => void;
  existingConsents?: ConsentFSE[];
}

/**
 * Form raccolta consensi FSE
 * - Checkbox per ogni tipo consenso
 * - Informativa GDPR integrata
 * - Gestione oscuramento dati
 * - Firma digitale consenso
 */
```

### 4. CDAViewer Component

```tsx
// src/components/documents/CDAViewer.tsx

interface CDAViewerProps {
  cdaXml: string;
  showRawXml?: boolean;
  downloadEnabled?: boolean;
}

/**
 * Visualizzatore documenti CDA
 * - Rendering human-readable
 * - Validazione struttura
 * - Export PDF/XML
 */
```

---

## 📅 Planning Dettagliato

### Fase 1: Consolidamento (2 settimane) ✅ COMPLETATA

| Sprint | Task | Ore | Output | Stato |
|--------|------|-----|--------|-------|
| 1.1 | Rimuovere codice legacy identificato | 8 | Codebase pulita | ✅ |
| 1.2 | Aggiornare schema FirmaDigitale esistente | 16 | Schema consolidato | ✅ |
| 1.3 | Creare FirmaDigitaleService base | 24 | Service funzionante | ✅ |
| 1.4 | Unit test firma semplice | 8 | Test coverage 80% | ✅ |

**Deliverable**: Sistema firma semplice funzionante ✅

### Fase 2: Firma Grafometrica (3 settimane) ✅ COMPLETATA

| Sprint | Task | Ore | Output | Stato |
|--------|------|-----|--------|-------|
| 2.1 | Schema FirmaVault + migration | 8 | DB aggiornato | ✅ |
| 2.2 | FirmaVaultService con AES-256 | 24 | Vault sicuro | ✅ |
| 2.3 | SignaturePad frontend component | 32 | UI firma tablet | ✅ |
| 2.4 | Integrazione firma in Referto | 16 | Flusso completo | ✅ |
| 2.5 | Riutilizzo firma salvata | 16 | UX migliorata | ✅ |
| 2.6 | Test E2E firma grafometrica | 8 | Test coverage 80% | ✅ |

**Deliverable**: Firma grafometrica completa per referti ✅

**Componenti implementati:**
- `SignaturePad` - Canvas HTML5 con supporto touch/mouse
- `SignatureModal` - Modal per acquisizione firma
- `useSignature` hook - State management firma
- `FirmaVaultService` - Gestione vault crittografato
- Routes `/api/v1/firma-digitale/*` - API complete

### Fase 3: Consensi FSE (2 settimane) ✅ COMPLETATA

| Sprint | Task | Ore | Output | Stato |
|--------|------|-----|--------|-------|
| 3.1 | Schema ConsentFSE + migration | 8 | DB aggiornato | ✅ |
| 3.2 | ConsentFSEService | 24 | Service completo | ✅ |
| 3.3 | ConsentFSEForm frontend | 24 | Form consensi | ✅ |
| 3.4 | Integrazione in anagrafica paziente | 16 | UX integrata | ✅ |
| 3.5 | Oscuramento dati | 8 | Privacy compliance | ✅ |

**Deliverable**: Sistema consensi FSE completo ✅

**Componenti implementati:**
- Schema `ConsentFSE` con enums `TipoConsensoFSE`, `ModalitaRaccoltaConsenso`, `TipoDatoClinico`, `TipoDelega`
- `ConsentFSEService` - Service backend con CRUD, revoca, oscuramento
- `ConsentFSEForm` - Form frontend con checkboxes per tipo consenso
- `ConsentFSESummary` - Card riepilogativa con progress bar
- `useConsentFSE` hook - React Query integration
- Routes `/api/v1/consent-fse/*` - API complete
- `data-obscuration.js` - Utility per filtraggio dati sensibili
- Integrazione in `CartellaPaziente.tsx` (tab Consensi FSE + summary)

### Fase 4: HL7/CDA Export (4 settimane) ✅ COMPLETATA

| Sprint | Task | Ore | Output | Stato |
|--------|------|-----|--------|-------|
| 4.1 | Schema CDADocument + HL7Mapping | 8 | DB aggiornato | ✅ |
| 4.2 | Mapping campi Referto → LOINC | 24 | Mappature complete | ✅ |
| 4.3 | HL7CDAService generazione XML | 40 | Generator CDA | ✅ |
| 4.4 | Template CDA per Referto | 16 | Template XML | ✅ |
| 4.5 | Template CDA per GiudizioIdoneita | 16 | Template XML | ✅ |
| 4.6 | CDAViewer frontend | 24 | Visualizzatore | ✅ |
| 4.7 | Validazione Schematron | 16 | Validatore | ✅ |
| 4.8 | Test E2E CDA | 8 | Test coverage 80% | ✅ |

**Deliverable**: Export CDA per referti e giudizi ✅

**Componenti implementati:**
- Schema `CDADocument` con enums `CDASourceType`, `StatoInvioCDA`, `TipoCodiceCDA`
- Schema `HL7Mapping` per mappatura campi → codici LOINC/ICD/SNOMED
- `HL7CDAService` - Service backend con:
  - `OID_REGISTRY` per codici OID italiani (Ministero Salute, CF, Regioni)
  - `LOINC_SECTIONS` per sezioni cliniche standard
  - Generazione CDA da Referto e GiudizioIdoneita
  - Validazione struttura XML
  - Hash SHA-256 per integrità documento
- `CDAViewer` - Componente visualizzazione CDA human-readable con:
  - Tab Strutturato/XML
  - Parsing sezioni LOINC
  - Badge validazione e stato invio
  - Download XML
- `CDAActions` - Bottoni azioni (Genera/Visualizza/Valida/Download)
- `useCDA` hook - React Query integration con toast notifications
- Routes `/api/v1/cda/*` - API complete:
  - `GET /config` - Configurazione OID e LOINC
  - `POST /referto/:id` - Genera CDA da referto
  - `POST /giudizio/:id` - Genera CDA da giudizio
  - `GET /:sourceType/:sourceId` - Ottieni documento CDA
  - `GET /:sourceType/:sourceId/xml` - Download XML raw
  - `POST /:id/validate` - Valida documento
  - `GET /patient/:pazienteId` - Lista CDA paziente
- Migration `20260204_p65_fase4_cda_hl7` con seed LOINC
- Test backend e frontend completi

### Fase 4.5: Espansione Tipi Firma (1 settimana) ✅ COMPLETATA

> **Aggiornamento 4 Febbraio 2026**: Estensione sistema firma per copertura completa MDL.

| Sprint | Task | Ore | Output | Stato |
|--------|------|-----|--------|-------|
| 4.5.1 | Schema TipoDocumentoFirmato +7 tipi | 4 | SOPRALLUOGO, DVR, PREVENTIVO, REGISTRO_PRESENZE, QUESTIONARIO_RISPOSTA, VERBALE_RIUNIONE, NOMINA | ✅ |
| 4.5.2 | Schema TipoFirmatario +5 ruoli | 4 | RSPP, MEDICO_COMPETENTE, RLS, PREPOSTO, PARTECIPANTE | ✅ |
| 4.5.3 | Campi firma su DVR (4 set) | 4 | RSPP/MC/Datore/RLS con firma/At/Id/Ip | ✅ |
| 4.5.4 | Campi firma su Sopralluogo (3 set) | 4 | MC/RSPP/Datore | ✅ |
| 4.5.5 | Campi firma su Preventivo (2 set) | 2 | Operatore/Cliente | ✅ |
| 4.5.6 | Campi firma su RegistroPresenze (1 set) | 2 | Formatore | ✅ |
| 4.5.7 | Migration e Prisma generate | 2 | `20260204_p65_phase2_signature_expansion` | ✅ |
| 4.5.8 | MarkerResolver ~110 nuovi placeholder | 4 | RSPP_*/MC_*/RLS_*/OPERATORE_*/CLIENTE_*/PARTECIPANTE_* | ✅ |
| 4.5.9 | SignaturePlaceholderService enrichment | 4 | enrichContextFromDVR/Sopralluogo/Preventivo/RegistroPresenze | ✅ |
| 4.5.10 | Frontend MarkerPicker +7 marker firma | 2 | Categoria Firme Digitali estesa | ✅ |
| 4.5.11 | Frontend DocumentSignatureCollector | 2 | +7 SignatoryRole con colori | ✅ |

**Deliverable**: Firma digitale estesa a tutti i documenti MDL ✅

**Modelli aggiornati:**
- `DVR` - 4 set firma (RSPP, MC, Datore, RLS) con 16 nuovi campi + 4 relazioni Person
- `Sopralluogo` - 3 set firma (MC, RSPP, Datore) con 12 nuovi campi + 3 relazioni Person
- `Preventivo` - 2 set firma (Operatore, Cliente) con 8 nuovi campi + 2 relazioni Person
- `RegistroPresenze` - 1 set firma (Formatore) con 4 nuovi campi + 1 relazione Person
- `Person` - 11 nuove relazioni inverse per firme

**Nuovi placeholder per template:**
```
{{RSPP_FIRMA}}, {{RSPP_NOME_COMPLETO}}, {{RSPP_CF}}, {{RSPP_QUALIFICA}}
{{MC_FIRMA}}, {{MC_NOME_COMPLETO}}, {{MC_CF}}, {{MC_ALBO}}, {{MC_SPECIALIZZAZIONE}}
{{RLS_FIRMA}}, {{RLS_NOME_COMPLETO}}, {{RLS_CF}}
{{OPERATORE_FIRMA}}, {{OPERATORE_NOME}}, {{OPERATORE_EMAIL}}, {{OPERATORE_TELEFONO}}
{{CLIENTE_FIRMA}}, {{CLIENTE_NOME_COMPLETO}}, {{CLIENTE_CF}}, {{CLIENTE_EMAIL}}
{{PARTECIPANTE_FIRMA}}, {{PARTECIPANTE_NOME_COMPLETO}}, {{PARTECIPANTE_CF}}
```

**Files modificati:**
- `backend/prisma/schema.prisma` - Estesi TipoDocumentoFirmato, TipoFirmatario + modelli
- `backend/prisma/migrations/20260204_p65_phase2_signature_expansion/migration.sql`
- `backend/services/markerResolver.js` - ~110 nuovi placeholder
- `backend/services/signature/SignaturePlaceholderService.js` - 6 nuovi enrichment + mappature
- `src/components/templates/MarkerPicker.tsx` - Categoria Firme estesa
- `src/components/signature/DocumentSignatureCollector.tsx` - 7 nuovi SignatoryRole

### Fase 4.6: HL7 Template Integration (1 settimana) ✅ COMPLETATA

> **Aggiornamento 4 Febbraio 2026**: Sistema flessibile per mapping HL7/LOINC nei template visita.

**Problema risolto**: I medici possono personalizzare i loro template con campi custom, ma per l'export FSE/CDA i dati devono essere mappati a codici LOINC standard. Questa fase implementa un sistema di tagging HL7 per ogni campo del template.

| Sprint | Task | Ore | Output | Stato |
|--------|------|-----|--------|-------|
| 4.6.1 | Estensione VisitField interface con hl7 config | 2 | `VisitFieldHL7Config` type | ✅ |
| 4.6.2 | Catalogo LOINC per Medicina del Lavoro | 4 | `src/constants/loincCatalog.ts` con 60+ codici | ✅ |
| 4.6.3 | Componente HL7FieldConfig con suggerimenti intelligenti | 8 | UI elegante con ricerca, suggerimenti automatici | ✅ |
| 4.6.4 | Integrazione in TemplateEditorModal | 4 | Sezione HL7/FSE per ogni campo | ✅ |
| 4.6.5 | Refactoring HL7CDAService per datiStrutturati | 8 | Legge da visita.datiStrutturati + HL7 tags | ✅ |
| 4.6.6 | Cleanup legacy ValoreCampoVisita | 2 | Rimosso modello mai usato | ✅ |
| 4.6.7 | Migration cleanup | 1 | `20260204_p65_cleanup_legacy_valori_campi` | ✅ |

**Deliverable**: Export CDA dinamico basato su template personalizzati ✅

**Architettura HL7 Template System:**
```
VisitTemplate.fields → Medico configura campi con hl7 config opzionale
                    ↓
                    {
                      name: "anamnesiPatPross",
                      label: "Anamnesi Patologica Prossima",
                      type: "TEXTAREA",
                      hl7: {
                        code: "10164-2",
                        codeSystem: "LOINC",
                        section: "ANAMNESI",
                        displayName: "History of Present Illness",
                        includeInCDA: true
                      }
                    }
                    ↓
Visita.datiStrutturati → Dati clinici salvati come JSON
                    ↓
HL7CDAService._extractHL7DataFromVisita() → Legge fields + datiStrutturati
                    ↓
_buildDynamicSections() → Genera sezioni CDA con codici LOINC corretti
```

**Nuovi componenti:**
- `VisitFieldHL7Config` interface - Configurazione HL7 opzionale per campo
- `src/constants/loincCatalog.ts` - Catalogo codici LOINC con 60+ voci:
  - Anamnesi (prossima, remota, familiare, lavorativa, esposizioni)
  - Esame Obiettivo (generale, cardiologico, toracico, neurologico, etc.)
  - Parametri Vitali (altezza, peso, BMI, PA, FC, SpO2, temperatura)
  - Diagnosi, Terapia, Prescrizioni, Allergie
  - MDL specifici (giudizio idoneità, prescrizioni, limitazioni)
  - Esami strumentali (ECG, spirometria, audiometria, visiotest)
- `HL7FieldConfig.tsx` - Componente UI con:
  - Suggerimenti intelligenti basati su label e tipo campo
  - Ricerca nel catalogo LOINC
  - Raggruppamento per sezione CDA
  - Badge compatto per visualizzazione rapida
- `HL7CDAService` refactored:
  - `_extractHL7DataFromVisita()` - Estrae dati da datiStrutturati usando HL7 tags
  - `_buildDynamicSections()` - Genera sezioni CDA dinamiche
  - Supporto multi-codeSystem (LOINC, ICD10, SNOMED_CT)

**Files modificati/creati:**
- `src/services/clinicaApi.ts` - Aggiunto `VisitFieldHL7Config`, esteso `VisitField`
- `src/constants/loincCatalog.ts` - Nuovo catalogo LOINC
- `src/pages/clinica/impostazioni/visit-templates/components/HL7FieldConfig.tsx` - Nuovo componente
- `src/pages/clinica/impostazioni/visit-templates/components/TemplateEditorModal.tsx` - Integrato HL7 config
- `backend/services/cda/HL7CDAService.js` - Refactored per usare datiStrutturati + HL7 tags
- `backend/prisma/schema.prisma` - Rimosso `ValoreCampoVisita` (legacy non usato)
- `backend/prisma/migrations/20260204_p65_cleanup_legacy_valori_campi/migration.sql`

**Benefici:**
- ✅ Medici liberi di creare template personalizzati
- ✅ Compatibilità HL7/FSE garantita tramite tagging opzionale
- ✅ Suggerimenti intelligenti riducono errori di mapping
- ✅ Export CDA dinamico basato su campi effettivamente compilati
- ✅ Nessun codice legacy ridondante

### Fase 4.7: Template System Consolidation (4 Feb 2026) ✅ COMPLETATA

> **Aggiornamento 4 Febbraio 2026**: Consolidamento sistema template e rimozione codice legacy.

**Problema risolto**: Il sistema aveva due modelli separati per i campi template:
1. `TemplateCampoVisita` - Campi catalogo per prestazione (company-level)
2. `VisitTemplate` con `fields[]` - Template personalizzati medico (P52)

Questa duplicazione causava confusione e codice ridondante. La soluzione è stata estendere `VisitTemplate` con scope `CATALOGO`.

| Sprint | Task | Ore | Output | Stato |
|--------|------|-----|--------|-------|
| 4.7.1 | Aggiunta `CATALOGO` a `TemplateScope` enum | 1 | Schema aggiornato | ✅ |
| 4.7.2 | Aggiunta `defaultScadenzaMesi` a `VisitTemplate` | 1 | Scadenza default visita | ✅ |
| 4.7.3 | Aggiunta campi `prezzoPrimaVisita`/`prezzoControllo` a `Prestazione` | 1 | Gestione pricing differenziato | ✅ |
| 4.7.4 | Aggiunta `isPrimaVisita` a `Visita` | 1 | Flag prima visita vs controllo | ✅ |
| 4.7.5 | Migration dati `TemplateCampoVisita` → `VisitTemplate` | 2 | Dati migrati in-place | ✅ |
| 4.7.6 | Rimozione `TemplateCampoVisita` model | 1 | Modello eliminato | ✅ |
| 4.7.7 | Rimozione service e routes legacy | 1 | `TemplateCampoVisitaService.js`, `template-campi.routes.js` | ✅ |
| 4.7.8 | Aggiornamento `TemplateCampiBuilder.tsx` | 4 | Usa `visitTemplatesApi` con `scope=CATALOGO` | ✅ |
| 4.7.9 | Estensione backend per filtro `scope` | 1 | `VisitTemplateService.getAll()` supporta `scope` | ✅ |
| 4.7.10 | Cleanup TypeScript frontend | 2 | Rimossi tipi e API legacy | ✅ |

**Deliverable**: Sistema template unificato con scope gerarchico ✅

**Nuovo sistema scope:**
```
TemplateScope:
├── PERSONAL   - Template personale del medico (priorità massima)
├── PRESTAZIONE - Template per prestazione specifica
├── GLOBAL     - Template globale tenant
└── CATALOGO   - Template catalogo prestazioni (campi default per prestazione)
```

**Risoluzione template per visita (priorità):**
1. PERSONAL (medico + prestazione specifica)
2. PRESTAZIONE (prestazione specifica, qualsiasi medico)
3. CATALOGO (campi default prestazione)
4. GLOBAL (template globale tenant)
5. SYSTEM_DEFAULT (campi default sistema)

**Nuove feature:**

1. **Scadenza default visita**:
   - `VisitTemplate.defaultScadenzaMesi` - Mesi fino prossimo controllo
   - Opzioni: 1, 3, 6, 12, 18, 24, 36, 60 mesi
   - Suggerita automaticamente al completamento visita

2. **Pricing prima visita vs controllo**:
   - `Prestazione.prezzoPrimaVisita` - Prezzo prima visita
   - `Prestazione.prezzoControllo` - Prezzo visita di controllo
   - `Visita.isPrimaVisita` - Flag per determinare quale prezzo applicare

**Files modificati/creati:**
- `backend/prisma/schema.prisma`:
  - `TemplateScope.CATALOGO` aggiunto
  - `VisitTemplate.defaultScadenzaMesi Int?`
  - `Prestazione.prezzoPrimaVisita Decimal?`
  - `Prestazione.prezzoControllo Decimal?`
  - `Prestazione.scadenzaDefaultMesi Int?`
  - `Visita.isPrimaVisita Boolean @default(true)`
  - `TemplateCampoVisita` RIMOSSO
- `backend/prisma/migrations/20260204_p65_consolidate_template_system/migration.sql`
- `backend/services/clinical/VisitTemplateService.js` - Supporto filtro `scope`
- `backend/routes/clinica/visit-templates.routes.js` - Parametro `scope` in query
- `backend/routes/clinica/index.js` - Rimosso mount `/template-campi`
- `src/services/clinicaApi.ts`:
  - `TemplateScope` con `CATALOGO`
  - `VisitField` con `id?`, `helpText?`
  - `VisitFieldValidation` con `minLength?`, `maxLength?`
  - `visitTemplatesApi.getAll()` con parametro `scope`
  - Rimosso `TemplateCampoVisita` interface
  - Rimosso `prestazioniApi.getCampi()` e metodi correlati
- `src/pages/clinica/catalogo/TemplateCampiBuilder.tsx` - RISCRITTO:
  - Usa `visitTemplatesApi` con `scope: 'CATALOGO'`
  - Salvataggio locale (isDirty) + batch save
  - Campo scadenza default integrato
  - Supporto HL7 config per ogni campo

**Files eliminati:**
- `backend/services/clinical/TemplateCampoVisitaService.js`
- `backend/routes/clinica/template-campi.routes.js`

**Files aggiornati (cleanup legacy references):**
- `backend/services/clinical/index.js` - Rimosso export `TemplateCampoVisitaService`
- `backend/utils/branchHelper.js` - Rimosso mapping `templateCampoVisita`, aggiunto `visitTemplate`
- `backend/scripts/migrate-branch-types.js` - Rimosso `templateCampoVisita`, aggiunto `visitTemplate`
- `backend/tests/unit/clinical-services.test.js` - Rimosso mock e import `TemplateCampoVisitaService`

**API Changes:**
```
REMOVED:
- GET    /api/v1/clinica/template-campi
- GET    /api/v1/clinica/template-campi/prestazione/:id
- POST   /api/v1/clinica/template-campi
- PUT    /api/v1/clinica/template-campi/:id
- DELETE /api/v1/clinica/template-campi/:id
- POST   /api/v1/clinica/template-campi/reorder

USE INSTEAD:
- GET    /api/v1/clinica/visit-templates?scope=CATALOGO&prestazioneId=xxx
- POST   /api/v1/clinica/visit-templates (con scope: 'CATALOGO')
- PUT    /api/v1/clinica/visit-templates/:id
- DELETE /api/v1/clinica/visit-templates/:id
```

**Flusso E2E Verificato:**
1. **Template Editor** (`TemplateEditorModal.tsx`) → Salva `field.hl7` config via `HL7FieldConfig`
2. **Visit Form** (`useVisitaForm.ts`) → Salva in `visita.datiStrutturati` con `field.name` come chiave
3. **HL7 CDA Export** (`HL7CDAService._extractHL7DataFromVisita()`) → Legge `field.hl7.code` e `datiStrutturati[field.name]`
4. **PDF Generation** (`MarkerResolver._generateVisitaDatiStrutturatiHtml()`) → Genera HTML da template.fields + datiStrutturati

**Benefici:**
- ✅ Un solo modello `VisitTemplate` per tutti gli scope
- ✅ Gerarchia di risoluzione chiara e prevedibile
- ✅ Nessuna duplicazione dati
- ✅ Supporto scadenza default per visite
- ✅ Pricing differenziato prima visita / controllo
- ✅ Codebase pulita senza legacy
- ✅ Flusso template → visita → HL7 → PDF completamente funzionante

### Fase 5: FEQ Integration (3 settimane) - OPZIONALE

| Sprint | Task | Ore | Output |
|--------|------|-----|--------|
| 5.1 | Integrazione SDK Aruba | 40 | Provider Aruba |
| 5.2 | Integrazione SDK InfoCert | 40 | Provider InfoCert |
| 5.3 | FEQWidget frontend | 24 | Widget FEQ |
| 5.4 | Test E2E FEQ | 16 | Test completi |

**Deliverable**: Firma FEQ con provider esterni

---

## ⏱️ Timeline Riepilogativa

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    TIMELINE PROGETTO P65                                │
│                                                                         │
│  Settimana  1  2  3  4  5  6  7  8  9  10 11 12 13 14                 │
│            ├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤                │
│  Fase 1    ████                                                        │
│  Fase 2       ████████                                                 │
│  Fase 3             ██████                                             │
│  Fase 4                   ██████████████                               │
│  Fase 5*                              ██████████ (opzionale)           │
│                                                                         │
│  * Fase 5 richiede contratto con provider FEQ                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 💰 Stima Costi

### Sviluppo Interno

| Fase | Ore | Costo (€80/h) |
|------|-----|---------------|
| Fase 1 | 56 | €4.480 |
| Fase 2 | 104 | €8.320 |
| Fase 3 | 80 | €6.400 |
| Fase 4 | 152 | €12.160 |
| Fase 5 | 120 | €9.600 |
| **Totale** | **512** | **€40.960** |

### Costi Esterni (Fase 5)

| Voce | Costo Stimato |
|------|---------------|
| Licenza SDK Aruba | €2.000/anno |
| Licenza SDK InfoCert | €2.500/anno |
| Certificato firma (per medico) | €50-100/anno |
| **Totale primo anno** | **~€5.000 + certificati** |

---

## 💎 Commercializzazione Feature Firma

> **Aggiornamento 4 Febbraio 2026**: Implementata struttura commerciale per feature firma premium.

### Modello di Pricing per Tipo Firma

| Tipo Firma | Piano | Feature Key | Descrizione |
|------------|-------|-------------|-------------|
| **SEMPLICE** | Base (Free) | - | Firma base inclusa in tutti i piani |
| **GRAFOMETRICA** | Pro | `FIRMA_GRAFOMETRICA` | Firma con rilevamento biometrico |
| **FEA** | Pro | `FIRMA_FEA` | Firma Elettronica Avanzata EIDAS |
| **FEQ** | Enterprise | `FIRMA_FEQ` | Firma Elettronica Qualificata |
| **REMOTA** | Enterprise | `FIRMA_REMOTA` | Firma qualificata HSM remoto |

### Feature Keys Aggiunti (Prisma Schema)

```prisma
enum FeatureKey {
  // ... altre feature ...
  
  // P65: Firma Digitale Premium Features
  FIRMA_GRAFOMETRICA    // Piano Pro
  FIRMA_FEQ             // Piano Enterprise  
  FIRMA_FEA             // Piano Pro
  FIRMA_REMOTA          // Piano Enterprise
  FIRMA_BIOMETRICA      // Addon opzionale
  
  // P65: FSE Export Premium
  FSE_EXPORT_CDA        // Piano Pro
  FSE_CONSENSI_AVANZATI // Piano Pro
}
```

### Configurazione Tenant

Le feature vengono abilitate per tenant tramite la tabella `TenantFeature`:

```javascript
// Esempio: Abilitare firma grafometrica per tenant
await prisma.tenantFeature.create({
  data: {
    tenantId: 'tenant-uuid',
    featureKey: 'FIRMA_GRAFOMETRICA',
    isEnabled: true,
    tier: 'PRO',
    usageLimit: 1000, // Firme mensili
    usageCount: 0
  }
});
```

### API Endpoint per Gestione Feature

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/v1/signatures/types/available` | GET | Tipi firma disponibili per tenant |
| `/api/v1/signatures/types/check` | POST | Verifica se tipo firma è abilitato |
| `/api/v1/signatures/preferences/me` | GET | Preferenza firma del medico corrente |
| `/api/v1/signatures/preferences/me` | PUT | Aggiorna preferenza firma |

### UI Configurazione Medico

Il componente `SignaturePreferencesConfig` è stato integrato nelle **Impostazioni Utente** (tab "Firma") e permette ai medici di:

1. **Visualizzare** i tipi di firma disponibili per il proprio piano
2. **Selezionare** il tipo preferito da usare automaticamente nei referti
3. **Vedere** quali upgrade sono necessari per firme premium

**Screenshot UI Features:**
- Card eleganti con icone distintive per ogni tipo firma
- Badge piano (Base/Pro/Enterprise) con colori brand
- Indicazione tipo bloccato se non incluso nel piano
- CTA upgrade per feature premium

### FirmaDigitaleService - Metodi Feature

```javascript
// Verifica se un tipo firma è disponibile
FirmaDigitaleService.checkSignatureFeature(tenantId, tipoFirma)
// → { enabled: boolean, feature: string | null, tier: string }

// Ottieni tipi disponibili
FirmaDigitaleService.getAvailableSignatureTypes(tenantId)
// → [{ type: 'SEMPLICE', enabled: true, ... }, ...]

// Gestione preferenze medico
FirmaDigitaleService.getMedicoSignaturePreference(medicoId, tenantId)
FirmaDigitaleService.setMedicoSignaturePreference(medicoId, tenantId, tipoFirma)

// Incrementa contatore usage per feature metered
FirmaDigitaleService.incrementSignatureUsage(tenantId, featureKey)
```

### Upgrade Path Suggerito

1. **Base → Pro**: Sblocca firma grafometrica, FEA, export CDA
2. **Pro → Enterprise**: Sblocca FEQ, firma remota, integrazioni provider esterni

---

## 🔗 Dipendenze

### Interne

- **P52**: Sistema visite (Visita, Referto)
- **P55**: Multi-prestazioni
- **P56**: MDL completo (GiudizioIdoneita)
- **P57**: Cross-tenant consent
- **P61**: Questionari medici (firma paziente)

### Esterne (Future)

- Provider FEQ (Aruba, InfoCert)
- INI Gateway (FSE 2.0)
- Timestamp Authority (TSA)

---

## 📚 Riferimenti Normativi

- **D.L. 179/2012** - Fascicolo Sanitario Elettronico
- **DPCM 178/2015** - Regolamento FSE
- **D.Lgs 82/2005** (CAD) - Firme elettroniche
- **Regolamento eIDAS** - Firma qualificata EU
- **GDPR** - Protezione dati personali
- **D.Lgs 81/08** - Medicina del Lavoro

---

## ✅ Criteri di Accettazione

### Fase 1-4 (MVP) ✅ COMPLETATA

- [x] Firma grafometrica funzionante su referti
- [x] Vault firma criptato AES-256
- [x] Riutilizzo firma salvata per stesso paziente
- [x] Consensi FSE registrabili per paziente
- [x] Export CDA valido per Referto
- [x] Export CDA valido per GiudizioIdoneita
- [x] Test coverage ≥ 80%
- [x] Zero breaking changes API esistenti

### Commercializzazione Feature Firma ✅ COMPLETATA (4 Feb 2026)

- [x] Feature keys premium nel schema Prisma
- [x] Controllo feature in FirmaDigitaleService
- [x] API preferenze firma medico
- [x] Componente SignaturePreferencesConfig
- [x] Integrazione in Settings → tab Firma (solo medici)
- [x] UI elegante con indicazione piano/upgrade

### Fase 5 (Integrazione Completa) - OPZIONALE

- [ ] Firma FEQ con almeno 1 provider
- [ ] Validazione certificato X.509
- [ ] Timestamp TSA verificabile

---

## 🚀 Quick Start (Post-Approvazione)

```bash
# 1. Applicare migration schema
cd backend
npx prisma migrate dev --name p65_fse_predisposition

# 2. Generare types
npx prisma generate

# 3. Creare servizi base
mkdir -p services/signature services/fse

# 4. Eseguire test
npm test -- --grep "FirmaDigitale"
```

---

**Autore**: Copilot  
**Approvato da**: [In attesa]  
**Data approvazione**: [In attesa]
