# 💳 WF_05: Workflow Fatturazione

**Versione**: 1.0  
**Ultimo aggiornamento**: 2025-12-11  
**Specifiche correlate**: [SPEC_06](../specs/SPEC_06_LISTINI.md), [SPEC_07](../specs/SPEC_07_APPUNTAMENTI.md)

---

## 1. DIAGRAMMA FLUSSO

```
┌─────────────────────────────────────────────────────────────────────┐
│                    WORKFLOW FATTURAZIONE                            │
└─────────────────────────────────────────────────────────────────────┘

      Paziente          Segreteria           Sistema         Contabilità
          │                  │                   │                │
          │                  │                   │                │
          │                  │◄─── Visita ───────│                │
          │                  │     Completata    │                │
          │                  │                   │                │
          │                  │──── Genera ──────►│                │
          │                  │     Fattura       │                │
          │                  │                   │                │
          │                  │◄─── Bozza ────────│                │
          │                  │     Fattura       │                │
          │                  │                   │                │
          │                  ├───────────────────┼────────────────┤
          │                  │  VERIFICA IMPORTI │                │
          │                  ├───────────────────┼────────────────┤
          │                  │                   │                │
          │                  │──── Conferma ────►│                │
          │                  │                   │                │
          │                  │◄─── Fattura ──────│                │
          │                  │     Numero        │                │
          │                  │                   │                │
          │                  │                   │                │
          │◄─── Quanto? ─────│                   │                │
          │                  │                   │                │
          │──── €85.00 ─────►│                   │                │
          │                  │                   │                │
          │                  ├───────────────────┼────────────────┤
          │                  │     PAGAMENTO     │                │
          │                  ├───────────────────┼────────────────┤
          │                  │                   │                │
          │──── Paga ───────►│                   │                │
          │    (carta/cont)  │                   │                │
          │                  │──── Registra ────►│                │
          │                  │     Pagamento     │                │
          │                  │                   │                │
          │                  │◄─── Ricevuta ─────│                │
          │                  │                   │                │
          │◄─── Ricevuta ────│                   │                │
          │                  │                   │                │
          │                  │                   │───── Sync ────►│
          │                  │                   │    Contabilità │
          │                  │                   │                │
```

---

## 2. STEP DETTAGLIATI

### STEP 1: Generazione Fattura

**Trigger**: Visita completata OPPURE richiesta manuale

**Calcolo Importo**:
```javascript
async function calcolaImportoFattura(visitaId) {
  const visita = await getVisitaWithDetails(visitaId);
  const appuntamento = visita.appuntamento;
  
  let importo = appuntamento.prezzoCalcolato;
  
  // Aggiungi prestazioni aggiuntive
  for (const prestAggiuntiva of visita.prestazioniAggiuntive) {
    importo += await calcolaPrezzo(
      prestAggiuntiva.prestazioneId,
      appuntamento.pazienteId,
      null // no sconto su aggiuntive
    );
  }
  
  // Applica convenzione se diretta
  if (appuntamento.convenzione?.modalitaFatturazione === 'DIRETTA_ENTE') {
    const quotaConvenzione = importo * (appuntamento.convenzione.percentualeRimborso / 100);
    return {
      totale: importo,
      quotaPaziente: importo - quotaConvenzione,
      quotaConvenzione,
      convenzione: appuntamento.convenzione
    };
  }
  
  return {
    totale: importo,
    quotaPaziente: importo,
    quotaConvenzione: 0
  };
}
```

---

### STEP 2: Verifica e Conferma

**Dati Fattura**:
- Dati paziente (anagrafica fiscale)
- Prestazioni erogate
- Listino applicato
- Eventuali sconti
- Totale IVA inclusa

**Modifica Possibili**:
- Correzione dati fiscali paziente
- Aggiunta sconto manuale (con autorizzazione)
- Modifica metodo pagamento

---

### STEP 3: Pagamento

**Metodi Supportati**:
| Metodo | Tipo | Note |
|--------|------|------|
| Contanti | CASH | Limite €1000 (normativa) |
| Carta | POS | Collegamento terminale |
| Bonifico | TRANSFER | Per importi elevati |
| Convenzione | CONVENTION | Fattura a ente |
| Assegno | CHECK | Raro |

**API Pagamento**:
```javascript
POST /api/v1/clinica/fatture/:id/pagamento
{
  metodo: "CARTA",
  importo: 85.00,
  riferimentoPagamento: "POS-2024-001234"  // ID transazione
}
```

---

### STEP 4: Emissione Ricevuta

**Output**:
- PDF fattura/ricevuta
- Invio email (opzionale)
- Scontrino fiscale (se integrato)

---

## 3. MODELLO DATABASE

### Fattura Sanitaria

```prisma
model FatturaSanitaria {
  id                    String   @id @default(uuid())
  
  // Numerazione
  numero                String               // "FS-2024-00123"
  anno                  Int
  progressivo           Int
  
  // Riferimenti
  visitaId              String   @unique
  visita                Visita   @relation(fields: [visitaId], references: [id])
  
  pazienteId            String
  paziente              Person   @relation(fields: [pazienteId], references: [id])
  
  // Importi
  imponibile            Decimal  @db.Decimal(10,2)
  aliquotaIva           Decimal  @db.Decimal(4,2)
  importoIva            Decimal  @db.Decimal(10,2)
  totale                Decimal  @db.Decimal(10,2)
  
  // Sconti
  scontoApplicato       Decimal? @db.Decimal(10,2)
  motivoSconto          String?
  
  // Convenzione
  convenzioneId         String?
  quotaPaziente         Decimal? @db.Decimal(10,2)
  quotaConvenzione      Decimal? @db.Decimal(10,2)
  
  // Dati fiscali paziente (snapshot)
  pazienteCf            String
  pazienteIndirizzo     String?
  
  // Stato
  stato                 StatoFattura         @default(BOZZA)
  
  // Pagamenti
  pagamenti             PagamentoFattura[]
  importoPagato         Decimal  @default(0) @db.Decimal(10,2)
  
  // PDF
  pdfUrl                String?
  
  // Multi-tenancy
  tenantId              String
  tenant                Tenant   @relation(fields: [tenantId], references: [id])
  
  // Timestamps
  dataEmissione         DateTime?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  deletedAt             DateTime?
  
  @@unique([tenantId, anno, progressivo])
  @@index([tenantId])
  @@index([pazienteId])
  @@index([stato])
}

enum StatoFattura {
  BOZZA
  EMESSA
  PAGATA
  PARZIALMENTE_PAGATA
  ANNULLATA
  STORNATA
}

model PagamentoFattura {
  id                    String   @id @default(uuid())
  
  fatturaId             String
  fattura               FatturaSanitaria @relation(fields: [fatturaId], references: [id])
  
  // Dettagli pagamento
  metodo                MetodoPagamento
  importo               Decimal  @db.Decimal(10,2)
  dataPagamento         DateTime
  
  // Riferimenti esterni
  riferimentoPOS        String?
  riferimentoBonifico   String?
  
  // Ricevuta
  ricevutaUrl           String?
  
  // Registrato da
  registratoDaId        String
  registratoDa          Person   @relation(fields: [registratoDaId], references: [id])
  
  // Multi-tenancy
  tenantId              String
  
  @@index([fatturaId])
  @@index([tenantId])
}

enum MetodoPagamento {
  CONTANTI
  CARTA
  BONIFICO
  CONVENZIONE
  ASSEGNO
}
```

---

## 4. API ENDPOINTS

```
# Fatture
GET    /api/v1/clinica/fatture                         # Lista (filtri)
GET    /api/v1/clinica/fatture/:id                     # Dettaglio
POST   /api/v1/clinica/fatture                         # Crea da visita
PUT    /api/v1/clinica/fatture/:id                     # Modifica (se bozza)
POST   /api/v1/clinica/fatture/:id/emetti              # Emetti (genera numero)
POST   /api/v1/clinica/fatture/:id/annulla             # Annulla
POST   /api/v1/clinica/fatture/:id/storna              # Nota credito

# Pagamenti
POST   /api/v1/clinica/fatture/:id/pagamento           # Registra pagamento
GET    /api/v1/clinica/fatture/:id/pagamenti           # Lista pagamenti

# PDF
GET    /api/v1/clinica/fatture/:id/pdf                 # Download PDF

# Report
GET    /api/v1/clinica/fatture/report/giornaliero      # Incassi giorno
GET    /api/v1/clinica/fatture/report/mensile          # Riepilogo mese
GET    /api/v1/clinica/fatture/report/export           # Export contabilità
```

---

## 5. UI COMPONENTS

### Cassa / Pagamenti

```tsx
// src/features/fatturazione/CassaView.tsx

export function CassaView() {
  const { fattureDaPagare } = useFattureDaPagare();
  const [selectedFattura, setSelectedFattura] = useState(null);
  
  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Lista fatture da pagare */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Da Pagare Oggi</CardTitle>
        </CardHeader>
        <CardContent>
          <FattureTable 
            fatture={fattureDaPagare}
            onSelect={setSelectedFattura}
          />
        </CardContent>
      </Card>
      
      {/* Pannello pagamento */}
      <Card>
        <CardHeader>
          <CardTitle>Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedFattura ? (
            <PagamentoForm 
              fattura={selectedFattura}
              onComplete={() => setSelectedFattura(null)}
            />
          ) : (
            <p className="text-gray-500">Seleziona una fattura</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### Form Pagamento

```tsx
export function PagamentoForm({ fattura, onComplete }) {
  const [metodo, setMetodo] = useState<MetodoPagamento>('CARTA');
  const [importo, setImporto] = useState(fattura.quotaPaziente);
  
  const handlePagamento = async () => {
    await registraPagamento(fattura.id, { metodo, importo });
    onComplete();
  };
  
  return (
    <div className="space-y-4">
      <div>
        <Label>Paziente</Label>
        <p className="font-medium">{fattura.paziente.nome}</p>
      </div>
      
      <div>
        <Label>Totale da pagare</Label>
        <p className="text-2xl font-bold">€{fattura.quotaPaziente.toFixed(2)}</p>
      </div>
      
      <div>
        <Label>Metodo pagamento</Label>
        <RadioGroup value={metodo} onValueChange={setMetodo}>
          <RadioGroupItem value="CARTA" label="💳 Carta" />
          <RadioGroupItem value="CONTANTI" label="💵 Contanti" />
          <RadioGroupItem value="BONIFICO" label="🏦 Bonifico" />
        </RadioGroup>
      </div>
      
      <div>
        <Label>Importo</Label>
        <Input 
          type="number" 
          value={importo}
          onChange={(e) => setImporto(parseFloat(e.target.value))}
        />
      </div>
      
      <Button className="w-full" onClick={handlePagamento}>
        Conferma Pagamento
      </Button>
    </div>
  );
}
```

---

## 6. REPORT E STATISTICHE

### Dashboard Incassi

| Metrica | Calcolo |
|---------|---------|
| Incasso giornaliero | Σ pagamenti oggi |
| Fatture in attesa | Σ fatture EMESSA non pagate |
| Media per visita | Incasso / N. visite |
| Top prestazioni | Group by prestazione, Σ importo |

---

## 7. COLLEGAMENTI

- **Workflow precedente**: [WF_04_REFERTO.md](./WF_04_REFERTO.md)
- **Specifiche**: [SPEC_06](../specs/SPEC_06_LISTINI.md)
