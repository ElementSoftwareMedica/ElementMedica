# P65 - Firma Digitale Avanzata

> **Progetto**: P65 FSE Integration Predisposition  
> **Fase**: 1 - Consolidamento  
> **Status**: 🟢 In sviluppo  
> **Ultimo aggiornamento**: 2026-02-03

---

## Panoramica

Il sistema di **Firma Digitale Avanzata** di ElementMedica supporta quattro tipologie di firma conformi alla normativa italiana ed europea, predisponendo l'integrazione con il Fascicolo Sanitario Elettronico (FSE 2.0).

### Tipi di Firma Supportati

| Tipo | Codice | Descrizione | Valore Legale |
|------|--------|-------------|---------------|
| **Firma Semplice** | `SEMPLICE` | Firma base con hash SHA-256 | Basso (riconoscimento) |
| **Firma Grafometrica** | `GRAFOMETRICA` | Firma su pad con dati biometrici | Medio-Alto (FEA) |
| **Firma Elettronica Qualificata** | `FEQ` | Firma con certificato qualificato | Alto (validità giuridica) |
| **Firma Elettronica Avanzata** | `FEA` | Firma avanzata senza certificato qualificato | Medio |
| **Firma Remota** | `REMOTA` | Firma qualificata cloud-based | Alto |

---

## Architettura

### Modelli Prisma

```prisma
// Tipi di firma
enum TipoFirmaDigitale {
  SEMPLICE
  GRAFOMETRICA
  FEQ
  FEA
  REMOTA
}

// Documenti firmabili
enum TipoDocumentoFirmato {
  REFERTO
  CONSENSO
  QUESTIONARIO
  CERTIFICATO
  GIUDIZIO_IDONEITA
  ALLEGATO_3B
  ALTRO
}

// Ruoli firmatari
enum TipoFirmatario {
  MEDICO
  PAZIENTE
  OPERATORE
  RAPPRESENTANTE_LEGALE
}

// Stati firma
enum StatoFirma {
  IN_ATTESA
  FIRMATO
  RIFIUTATO
  SCADUTO
  VERIFICATO
  ANNULLATO
}
```

### Servizi

```
backend/services/signature/
├── index.js                  # Export modulo
├── FirmaDigitaleService.js   # Gestione firme
└── FirmaVaultService.js      # Vault dati biometrici
```

### Tabelle Database

| Tabella | Scopo |
|---------|-------|
| `firme_digitali` | Registro firme con metadati |
| `firma_vault` | Dati biometrici criptati (AES-256-GCM) |

---

## API FirmaDigitaleService

### createSignatureRequest()

Crea una richiesta di firma per un documento.

```javascript
import { FirmaDigitaleService } from '../services/signature/index.js';

const firma = await FirmaDigitaleService.createSignatureRequest({
    tenantId: req.person.tenantId,      // Obbligatorio
    firmatarioId: medicoId,              // Person ID
    documentType: 'REFERTO',             // TipoDocumentoFirmato
    refertoId: 'ref-123',                // FK documento
    firmatarioRole: 'MEDICO',            // TipoFirmatario
    tipoFirma: 'SEMPLICE',               // TipoFirmaDigitale
    documentContent: pdfContent,         // Per hash
    metadata: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
    }
});
// Ritorna: { id, stato: 'IN_ATTESA', hashDocumento, ... }
```

### applySimpleSignature()

Applica firma semplice a una richiesta esistente.

```javascript
const firmata = await FirmaDigitaleService.applySimpleSignature({
    firmaId: 'firma-123',
    tenantId: req.person.tenantId,
    signerId: req.person.id,             // Deve corrispondere a firmatarioId
    firmaImageUrl: 'https://...',        // Opzionale: immagine firma salvata
    metadata: { ipAddress: req.ip }
});
// Ritorna: { id, stato: 'FIRMATO', hashFirma, ... }
```

### applyGraphometricSignature()

Applica firma grafometrica con dati biometrici.

```javascript
const firmata = await FirmaDigitaleService.applyGraphometricSignature({
    firmaId: 'firma-123',
    tenantId: req.person.tenantId,
    signerId: medicoId,
    firmaImageBase64: 'iVBORw0...',      // Immagine firma (obbligatoria)
    biometricData: {                      // Dati da pad (opzionali)
        pressure: [0.5, 0.7, ...],
        velocity: [10, 15, ...],
        timing: [...]
    },
    dispositivo: 'WACOM-PAD-001',        // ID dispositivo
    metadata: { ipAddress: req.ip }
});
// Dati biometrici salvati in FirmaVault (criptati AES-256-GCM)
```

### verifySignature()

Verifica integrità di una firma.

```javascript
const result = await FirmaDigitaleService.verifySignature(
    'firma-123',
    tenantId,
    currentDocumentContent  // Per confronto hash
);

// Risultato:
{
    valid: true,
    firma: { id, tipo, stato, firmatario, dataFirma },
    verification: {
        documentIntegrity: true,    // Hash documento OK
        hashMatch: true,            // Hash corrisponde
        isExpired: false,           // Non scaduto
        hasVault: true              // Ha dati biometrici
    }
}
```

### cancelSignature()

Annulla firma (soft delete con motivo GDPR).

```javascript
const annullata = await FirmaDigitaleService.cancelSignature(
    'firma-123',
    tenantId,
    adminPersonId,
    'Documento errato - richiesta paziente'  // Min 10 caratteri
);
// stato: ANNULLATO, deletedAt: Date
```

### getSignaturesByDocument()

Lista firme per documento.

```javascript
const firme = await FirmaDigitaleService.getSignaturesByDocument({
    tenantId: req.person.tenantId,
    refertoId: 'ref-123',          // O documentoId
    firmatarioId: medicoId,        // Opzionale
    stato: 'FIRMATO'               // Opzionale
});
```

### getSavedSignatureImage()

Recupera firma salvata per ri-uso.

```javascript
const saved = await FirmaDigitaleService.getSavedSignatureImage(
    medicoId,
    tenantId
);
// { firmaId, imageUrl, tipo, lastUsed }
```

---

## API FirmaVaultService

### Crittografia

I dati biometrici sono protetti con:
- **Algoritmo**: AES-256-GCM
- **IV**: 12 bytes random per ogni entry
- **Auth Tag**: 16 bytes per integrità
- **Key Rotation**: Supportata via `keyVersion`

### encryptAndStore()

```javascript
import { FirmaVaultService } from '../services/signature/index.js';

const vault = await FirmaVaultService.encryptAndStore({
    data: JSON.stringify(biometricData),
    dataType: 'BIOMETRICO_FULL',  // IMMAGINE | BIOMETRICO_BASE | BIOMETRICO_FULL
    retentionDays: 3650           // Default: 10 anni
});
// Ritorna: { id, dataType, keyVersion, expiresAt }
// NON ritorna dati criptati
```

### decrypt()

```javascript
const data = await FirmaVaultService.decrypt(
    vaultId,
    'Verifica firma per audit'  // Motivo accesso (logging)
);
// Incrementa accessCount, registra lastAccessAt
```

### verifyIntegrity()

```javascript
const integrity = await FirmaVaultService.verifyIntegrity(vaultId);
// { valid, integrityOk, isExpired, hasValidStructure, accessCount }
```

### cleanupExpired()

Job schedulato per pulizia entry scadute.

```javascript
// Da eseguire in cron job
const result = await FirmaVaultService.cleanupExpired();
// { deleted: 5, entries: [...] }
```

---

## Configurazione

### Variabili d'Ambiente

```env
# Chiave crittografia vault (32 bytes hex)
# IMPORTANTE: In produzione usare KMS (AWS KMS, HashiCorp Vault)
FIRMA_VAULT_KEY=your-256-bit-hex-key

# Configurazione provider FEQ (Fase 3)
FEQ_PROVIDER=ARUBA
FEQ_API_URL=https://api.provider.it
FEQ_API_KEY=xxx
```

### Provider Firma Qualificata

Preparazione per integrazione con:

| Provider | Tipo | Note |
|----------|------|------|
| Aruba | FEQ/Remota | API REST |
| InfoCert | FEQ/Remota | PKCS#11 |
| Namirial | FEQ | WebService |
| Poste Italiane | FEQ/Remota | API REST |
| Intesi Group | FEQ | PKCS#11 |

---

## GDPR Compliance

### Soft Delete
- Tutte le firme usano `deletedAt` (mai hard delete)
- Annullamento richiede `motivoAnnullamento` (min 10 chars)
- Audit log automatico

### Data Retention
- Default: 10 anni (documenti medici)
- `expiresAt` su ogni vault entry
- Cleanup automatizzato per entry scadute

### Access Logging
- Ogni decrypt incrementa `accessCount`
- `lastAccessAt` tracciato
- Motivo accesso loggato

### Crittografia
- Dati biometrici mai in chiaro
- AES-256-GCM (encryption + authentication)
- Key rotation supportata

---

## Test

### Eseguire i Test

```bash
cd backend
npm test -- --testPathPattern=signature
```

### Copertura Test

| Service | Copertura Target |
|---------|-----------------|
| FirmaDigitaleService | 80% |
| FirmaVaultService | 80% |

### Test Files

- [FirmaDigitale.test.js](../../backend/tests/signature/FirmaDigitale.test.js)
- [FirmaVault.test.js](../../backend/tests/signature/FirmaVault.test.js)

---

## Roadmap P65

### Fase 1 - Consolidamento ✅
- [x] Schema FirmaDigitale esteso
- [x] FirmaVault per dati biometrici
- [x] FirmaDigitaleService base
- [x] Unit test

### Fase 2 - Grafometrica ✅
- [x] SignaturePad component (Canvas HTML5)
- [x] SignatureModal con consensi GDPR
- [x] useSignature React hook
- [x] API REST endpoints
- [x] Integrazione RefertoEditor
- [x] Test E2E

### Fase 3 - FEQ Integration (Q3 2026)
- [ ] Integrazione provider (Aruba/InfoCert)
- [ ] Gestione certificati X.509
- [ ] Timestamp Authority (TSA)
- [ ] PKCS#7 signing

### Fase 4 - FSE Ready (Q4 2026)
- [ ] Formato firma conforme FSE 2.0
- [ ] Metadati HL7 FHIR
- [ ] Test interoperabilità
- [ ] Certificazione

---

## API REST

### Endpoints

| Metodo | Path | Permission | Descrizione |
|--------|------|------------|-------------|
| POST | `/api/v1/signatures/request` | `signatures:write` | Crea richiesta firma |
| POST | `/api/v1/signatures/:id/sign-simple` | `signatures:write` | Applica firma semplice |
| POST | `/api/v1/signatures/:id/sign-graphometric` | `signatures:write` | Applica firma grafometrica |
| POST | `/api/v1/signatures/:id/verify` | `signatures:read` | Verifica firma |
| GET | `/api/v1/signatures/saved/:firmatarioId` | `signatures:read` | Ottieni firma salvata |
| GET | `/api/v1/signatures` | `signatures:read` | Lista firme |
| POST | `/api/v1/signatures/:id/cancel` | `signatures:delete` | Annulla firma |
| POST | `/api/v1/signatures/:id/validate` | `signatures:validate` | Valida/rifiuta firma |

### Esempio: Firma Grafometrica

```bash
# 1. Crea richiesta firma
curl -X POST http://localhost:4001/api/v1/signatures/request \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "documentType": "REFERTO",
    "refertoId": "abc-123",
    "firmatarioId": "medico-456",
    "firmatarioRole": "MEDICO",
    "tipoFirma": "GRAFOMETRICA",
    "documentContent": "<html>...</html>"
  }'

# 2. Applica firma grafometrica
curl -X POST http://localhost:4001/api/v1/signatures/{firmaId}/sign-graphometric \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "signerId": "medico-456",
    "firmaImageBase64": "data:image/png;base64,iVBOR...",
    "biometricData": {
      "points": [...],
      "totalTime": 2500,
      "averagePressure": 0.65,
      "velocityProfile": [...]
    },
    "dispositivo": "TABLET"
  }'
```

---

## Frontend Components

### SignaturePad

Canvas HTML5 per raccolta firma grafometrica.

```tsx
import { SignaturePad, SignaturePadRef } from '@/components/signature';

const ref = useRef<SignaturePadRef>(null);

<SignaturePad
    ref={ref}
    width="100%"
    height={200}
    penColor="#1a1a2e"
    penWidth={2.5}
    enableBiometric={true}
    savedSignatureUrl={savedUrl}
    showControls={true}
    onChange={(isEmpty) => console.log('Empty:', isEmpty)}
/>

// Ottenere dati firma
const data = ref.current?.getSignatureData('png');
// { imageBase64, imageFormat, width, height, biometricData, isEmpty, timestamp }
```

### SignatureModal

Modal completo con consensi GDPR.

```tsx
import { SignatureModal, SignatureResult } from '@/components/signature';

<SignatureModal
    isOpen={showModal}
    onClose={() => setShowModal(false)}
    onSign={(result: SignatureResult) => {
        // result.signatureData: immagine + biometria
        // result.consent: { gdprAccepted, dataProcessingAccepted, timestamp }
    }}
    title="Firma Referto"
    documentDescription="Referto per Mario Rossi"
    signerName="Dr. Bianchi"
    signerRole="MEDICO"
    enableBiometric={true}
    savedSignatureUrl={savedSignature?.imageUrl}
    isLoading={isSigning}
/>
```

### useSignature Hook

Hook React per integrazione API.

```tsx
import { useSignature } from '@/hooks/signature';

const {
    createRequest,
    applySignature,
    verifySignature,
    cancelSignature,
    savedSignature,
    isCreating,
    isSigning,
    isVerifying
} = useSignature({
    autoFetchSaved: true,
    firmatarioId: medicoId
});

// Flusso completo
const firma = await createRequest({
    documentType: 'REFERTO',
    refertoId,
    firmatarioId: medicoId,
    firmatarioRole: 'MEDICO',
    tipoFirma: 'GRAFOMETRICA',
    documentContent: contenutoReferto
});

await applySignature({
    firmaId: firma.id,
    signatureData: result.signatureData,
    consent: result.consent
});
```

---

## Test Frontend

### Files

- `src/components/signature/__tests__/SignaturePad.test.tsx`
- `src/components/signature/__tests__/SignatureModal.test.tsx`
- `src/hooks/signature/__tests__/useSignature.test.tsx`

### Esecuzione

```bash
npm test -- --testPathPattern=signature
```

---

## Riferimenti

- [P65 Planning Document](../../docs/08-projects/P65-fse-integration-predisposition.md)
- [Data Models](../../docs/02-backend/data-models.md)
- [GDPR Compliance](../../docs/04-features/gdpr-compliance.md)
- [eIDAS Regulation](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32014R0910)
- [CAD - Codice Amministrazione Digitale](https://www.agid.gov.it/it/agenzia/strategia-e-governance/codice-amministrazione-digitale)
