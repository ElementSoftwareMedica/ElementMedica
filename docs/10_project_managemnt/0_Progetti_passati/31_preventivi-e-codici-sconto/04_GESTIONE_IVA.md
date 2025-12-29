# Aggiornamento Sistema Preventivi - Gestione IVA

## Data Modifica
8 Novembre 2025

## Obiettivo
Aggiungere la gestione completa dell'IVA ai preventivi, supportando aliquote variabili (4%, 10%, 22%) a seconda del tipo di servizio offerto.

---

## 📋 Modifiche allo Schema Database

### Modello: `Preventivo`

**Campi Aggiunti:**

```prisma
// Calcoli finanziari
quantita       Int     @default(1) // N° partecipanti, visite, mesi, etc.
prezzoUnitario Decimal @db.Decimal(10, 2)
prezzoTotale   Decimal @db.Decimal(10, 2) // prezzoUnitario × quantita
scontoTotale   Decimal @default(0) @db.Decimal(10, 2)
imponibile     Decimal @db.Decimal(10, 2) // prezzoTotale - scontoTotale

// Gestione IVA
aliquotaIva Decimal @default(22.00) @db.Decimal(5, 2) // Aliquota IVA % (4, 10, 22, etc.)
importoIva  Decimal @db.Decimal(10, 2) // Importo IVA calcolato

// Totale finale con IVA
importoFinale Decimal @db.Decimal(10, 2) // imponibile + importoIva
```

**Campi Aggiunti alla Tabella:**
1. **`imponibile`** (DECIMAL(10,2) NOT NULL)
   - Descrizione: Base imponibile = prezzoTotale - scontoTotale
   - Utilizzo: Su questo importo si calcola l'IVA

2. **`aliquotaIva`** (DECIMAL(5,2) NOT NULL DEFAULT 22.00)
   - Descrizione: Percentuale di IVA applicata
   - Valori comuni: 4%, 10%, 22%
   - Default: 22% (IVA ordinaria)

3. **`importoIva`** (DECIMAL(10,2) NOT NULL)
   - Descrizione: Importo IVA calcolato = imponibile × (aliquotaIva / 100)
   - Arrotondamento: 2 decimali

**Modifica Semantica:**
- **`importoFinale`**: Ora rappresenta il **totale con IVA** (prima era l'imponibile)
  - Formula: `importoFinale = imponibile + importoIva`

---

## 🔧 Migration Creata

**File:** `prisma/migrations/20251108175115_add_iva_fields_to_preventivi/migration.sql`

**Strategia di Migrazione:**
1. Aggiunta colonne come **nullable**
2. **Popolamento dati esistenti** con calcoli automatici:
   ```sql
   UPDATE "preventivi" 
   SET 
     "imponibile" = "prezzoTotale" - "scontoTotale",
     "importoIva" = ROUND(("prezzoTotale" - "scontoTotale") * ("aliquotaIva" / 100), 2),
     "importoFinale" = ROUND(("prezzoTotale" - "scontoTotale") * (1 + ("aliquotaIva" / 100)), 2)
   WHERE "imponibile" IS NULL;
   ```
3. Conversione campi a **NOT NULL**

**Gestione Dati Esistenti:**
- Tutti i preventivi esistenti vengono aggiornati con IVA 22% (default)
- I calcoli vengono eseguiti automaticamente sulla base dei dati esistenti
- Nessuna perdita di dati

---

## 📊 Aliquote IVA Supportate

### 🇮🇹 Normativa Italiana

| Aliquota | Applicazione | Esempi nel Sistema |
|----------|--------------|-------------------|
| **22%** (ordinaria) | Servizi standard | Corsi formazione, DVR, RSPP, Consulenze |
| **10%** (ridotta) | Servizi sanitari | Visite mediche, Sorveglianza sanitaria |
| **4%** (minima) | Beni di prima necessità | Materiale didattico specifico |

### Esempi di Utilizzo nel Sistema

#### 1. **Corsi di Formazione** → IVA 22%
```javascript
{
  tipoServizio: 'CORSO',
  prezzoTotale: 1500.00,
  scontoTotale: 225.00,
  imponibile: 1275.00,
  aliquotaIva: 22.00,
  importoIva: 280.50,
  importoFinale: 1555.50
}
```

#### 2. **Visite Mediche** → IVA 10%
```javascript
{
  tipoServizio: 'MEDICO_COMPETENTE',
  prezzoTotale: 1200.00,
  scontoTotale: 240.00,
  imponibile: 960.00,
  aliquotaIva: 10.00,
  importoIva: 96.00,
  importoFinale: 1056.00
}
```

#### 3. **Servizi DVR/RSPP** → IVA 22%
```javascript
{
  tipoServizio: 'DVR',
  prezzoTotale: 1200.00,
  scontoTotale: 144.00,
  imponibile: 1056.00,
  aliquotaIva: 22.00,
  importoIva: 232.32,
  importoFinale: 1288.32
}
```

---

## 🧮 Formule di Calcolo

### Calcolo Manuale
```javascript
const prezzoTotale = prezzoUnitario * quantita;
const imponibile = prezzoTotale - scontoTotale;
const importoIva = Math.round(imponibile * (aliquotaIva / 100) * 100) / 100;
const importoFinale = imponibile + importoIva;
```

### Esempio Pratico
```
Prezzo Unitario: €150
Quantità: 10 partecipanti
──────────────────────────
Prezzo Totale: €1,500.00
Sconto 15%: -€225.00
──────────────────────────
Imponibile: €1,275.00
IVA 22%: +€280.50
──────────────────────────
TOTALE: €1,555.50
```

---

## 📦 Seed Data Aggiornato

**File:** `backend/prisma/seed-preventivi-iva.ts`

### Preventivi di Test Creati

| Numero | Tipo Servizio | Imponibile | IVA | Importo IVA | Totale |
|--------|--------------|-----------|-----|-------------|---------|
| PREV-2025-0001 | CORSO | €1,275.00 | 22% | €280.50 | €1,555.50 |
| PREV-2025-0002 | CORSO | €720.00 | 22% | €158.40 | €878.40 |
| PREV-2025-0003 | DVR | €1,056.00 | 22% | €232.32 | €1,288.32 |
| PREV-2025-0004 | RSPP | €3,600.00 | 22% | €792.00 | €4,392.00 |
| PREV-2025-0005 | MEDICO | €960.00 | **10%** | €96.00 | €1,056.00 |

**Note:**
- ✅ Tutti i calcoli sono corretti e arrotondati a 2 decimali
- ✅ IVA ridotta (10%) applicata ai servizi sanitari
- ✅ Sconti applicati **prima** del calcolo IVA (sull'imponibile)

---

## 🔍 Validazione Database

### Query di Verifica

```sql
-- Verifica calcoli IVA corretti
SELECT 
  numero,
  "tipoServizio",
  "prezzoTotale",
  "scontoTotale",
  imponibile,
  "aliquotaIva",
  "importoIva",
  "importoFinale",
  -- Validazione calcoli
  CASE 
    WHEN imponibile != ("prezzoTotale" - "scontoTotale") THEN '❌ Imponibile errato'
    WHEN "importoIva" != ROUND(imponibile * ("aliquotaIva" / 100), 2) THEN '❌ IVA errata'
    WHEN "importoFinale" != (imponibile + "importoIva") THEN '❌ Totale errato'
    ELSE '✅ OK'
  END as validazione
FROM preventivi
ORDER BY "numeroProgressivo";
```

### Risultati Attesi
- ✅ Tutti i preventivi devono avere `validazione = '✅ OK'`
- ✅ Nessun valore NULL nei campi IVA
- ✅ Aliquote IVA valide (4, 10, 22)
- ✅ Arrotondamenti corretti a 2 decimali

---

## 📝 Prossimi Step

### FASE 1.4: Validazione Database (IN CORSO)
- [ ] Eseguire query di validazione calcoli IVA
- [ ] Verificare constraints e foreign keys
- [ ] Testare performance query con indici
- [ ] Validare integrità referenziale

### FASE 2: Backend API (PROSSIMA)
- [ ] Endpoint CRUD per preventivi con gestione IVA
- [ ] Logica di calcolo automatico IVA lato server
- [ ] Validazione aliquote IVA per tipo servizio
- [ ] API per cambio aliquota IVA su preventivo esistente

---

## 🎯 Impatto sul Sistema

### Vantaggi
✅ **Conformità fiscale**: Gestione corretta IVA secondo normativa italiana  
✅ **Flessibilità**: Supporto aliquote multiple per diversi servizi  
✅ **Trasparenza**: Dettaglio completo importi in preventivo  
✅ **Automazione**: Calcoli IVA automatici, meno errori manuali  

### Considerazioni
⚠️ **Backward Compatibility**: Semantica `importoFinale` modificata (ora include IVA)  
⚠️ **Codice Frontend**: Aggiornare visualizzazione preventivi con campi IVA  
⚠️ **PDF Generazione**: Includere dettaglio IVA nei preventivi PDF  

---

## ✅ Checklist Completamento

- [x] Schema Prisma aggiornato con campi IVA
- [x] Migration creata e testata
- [x] Migration applicata con successo
- [x] Prisma Client rigenerato
- [x] Seed data aggiornato con calcoli IVA
- [x] Seed eseguito con successo (5 preventivi + 5 codici sconto)
- [x] Verifica dati in database
- [x] Documentazione aggiornata
- [ ] API backend aggiornate (FASE 2)
- [ ] Frontend aggiornato con campi IVA (FASE 2)
- [ ] Generazione PDF con IVA (FASE 2)

---

**Stato:** ✅ **COMPLETATO**  
**Data Completamento:** 8 Novembre 2025  
**Responsabile:** Sistema AI - GitHub Copilot
