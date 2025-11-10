# 🎨 UI/UX Design - Sistema Preventivi e Codici Sconto

**Progetto**: Interface Design & User Experience  
**Data**: 8 Novembre 2025  
**Versione**: 1.0  
**Design System**: Element Medica Design System v2.0

---

## 📋 Indice

1. [Design Principles](#design-principles)
2. [Wireframes Admin Panel](#wireframes-admin-panel)
3. [Wireframes Step 4 Integration](#wireframes-step-4-integration)
4. [Component Library](#component-library)
5. [User Flows](#user-flows)
6. [Responsive Design](#responsive-design)
7. [Accessibility](#accessibility)
8. [Visual Design](#visual-design)

---

## 🎯 Design Principles

### Core Principles
1. **Semplicità**: Interfacce intuitive che non richiedono training
2. **Efficienza**: Ridurre i click per completare task comuni
3. **Feedback**: Sempre chiaro cosa sta succedendo
4. **Consistency**: Utilizzare pattern UI già presenti nell'app
5. **Accessibility**: WCAG 2.1 AA compliant

### User Personas

#### Persona 1: Amministratore Formazione
- **Nome**: Maria, 42 anni
- **Ruolo**: Responsabile formazione aziendale
- **Obiettivi**: Creare e gestire codici sconto velocemente
- **Pain Points**: Troppi form complicati, validazioni poco chiare
- **Needs**: Vista rapida stato codici, bulk actions

#### Persona 2: Commerciale
- **Nome**: Luca, 35 anni
- **Ruolo**: Sales manager
- **Obiettivi**: Generare preventivi professionali in pochi minuti
- **Pain Points**: PDF poco personalizzabili, calcoli manuali
- **Needs**: Template elegante, applicazione automatica sconti, preview immediato

---

## 🖼️ Wireframes Admin Panel

### 1. Pagina Lista Codici Sconto

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Torna al Dashboard        CODICI SCONTO        [+ Nuovo Codice]│
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  🔍 Cerca per codice o nome...     [Stato: Tutti ▼]  [Tipo ▼]    │
│                                                                    │
├──────────────────────────────────────────────────────────────────┤
│  Risultati: 23 codici                        Mostra: [20 ▼]       │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Codice       Nome              Sconto    Validità      Utilizzi  │
│  ─────────────────────────────────────────────────────────────── │
│  PROMO2025    Promo Capodanno   10%       01/01-31/01   45/100   │
│               [Attivo 🟢]                                          │
│               Tutti | Tutti i corsi                    [📝] [🗑️]  │
│  ───────────────────────────────────────────────────────────────  │
│  VIP50        Sconto VIP        €50       01/01-31/12   12/100   │
│               [Attivo 🟢]                                          │
│               Solo aziende | Min €200                  [📝] [🗑️]  │
│  ───────────────────────────────────────────────────────────────  │
│  PRIMO15      Primo Ordine      15%       01/01-31/12   8/∞      │
│               [Attivo 🟢]                                          │
│               Tutti | Max 1 per utente                 [📝] [🗑️]  │
│  ───────────────────────────────────────────────────────────────  │
│  ESTATE2024   Sconto Estate     20%       [Scaduto 🔴]  150/150  │
│               [Non attivo]                                         │
│               Tutti | Tutti i corsi                    [📝] [🗑️]  │
│                                                                    │
├──────────────────────────────────────────────────────────────────┤
│                « Precedente    1  2  3    Successiva »            │
└──────────────────────────────────────────────────────────────────┘

Interazioni:
- Hover su riga: Background azzurro chiaro
- Click su riga: Espande dettagli in-line
- Click [📝]: Apre modal modifica
- Click [🗑️]: Conferma eliminazione
- Click [+ Nuovo Codice]: Apre modal creazione
```

### 2. Modal Creazione/Modifica Codice Sconto

```
┌────────────────────────────────────────────────────────────────────┐
│  Nuovo Codice Sconto                                         [✕]   │
├────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [Generali] [Validità] [Restrizioni] [Corsi Applicabili]          │
│  ──────────────────────────────────────────────────────────────   │
│                                                                      │
│  TAB 1: GENERALI                                                    │
│  ──────────────────────────────────────────────────────────────   │
│                                                                      │
│  Codice *                                                           │
│  ┌──────────────────────────────────────────┐  [Genera Casuale]   │
│  │ PROMO2025                                 │                     │
│  └──────────────────────────────────────────┘                      │
│  Solo lettere maiuscole e numeri                                   │
│                                                                      │
│  Nome Descrittivo *                                                 │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ Promozione Capodanno 2025                                     │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Descrizione                                                        │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ Sconto 10% su tutti i corsi attivato per il mese di gennaio  │ │
│  │ 2025. Valido per nuovi e vecchi clienti.                     │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Tipo Sconto *                                                      │
│  ⚪ Percentuale    ⚫ Valore Assoluto                               │
│                                                                      │
│  Valore *                                                           │
│  ┌──────────────────┐                                              │
│  │ € 50.00          │                                              │
│  └──────────────────┘                                              │
│                                                                      │
│  [ ] Attivo                                                         │
│                                                                      │
│                              [Annulla]  [Avanti: Validità →]       │
└────────────────────────────────────────────────────────────────────┘
```

```
┌────────────────────────────────────────────────────────────────────┐
│  Nuovo Codice Sconto                                         [✕]   │
├────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [Generali] [Validità] [Restrizioni] [Corsi Applicabili]          │
│          ──────────────────────────────────────────────────────   │
│                                                                      │
│  TAB 2: VALIDITÀ                                                    │
│  ──────────────────────────────────────────────────────────────   │
│                                                                      │
│  Periodo di Validità *                                              │
│  Data Inizio                    Data Fine                           │
│  ┌──────────────┐               ┌──────────────┐                  │
│  │ 01/01/2025  📅│               │ 31/12/2025  📅│                  │
│  └──────────────┘               └──────────────┘                  │
│                                                                      │
│  Limitazioni Utilizzo                                               │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ ☑ Utilizzo massimo globale                                   │ │
│  │   ┌──────────┐  utilizzi totali                              │ │
│  │   │ 100      │                                                │ │
│  │   └──────────┘                                                │ │
│  │                                                                │ │
│  │ ☑ Utilizzo massimo per utente                                │ │
│  │   ┌──────────┐  utilizzi per persona                         │ │
│  │   │ 2        │                                                │ │
│  │   └──────────┘                                                │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Statistiche Utilizzo (se modifica)                                │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  📊 Utilizzi correnti: 12 / 100                               │ │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━        │ │
│  │      12%                                                       │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                      │
│                    [← Indietro]  [Annulla]  [Avanti: Restrizioni →]│
└────────────────────────────────────────────────────────────────────┘
```

```
┌────────────────────────────────────────────────────────────────────┐
│  Nuovo Codice Sconto                                         [✕]   │
├────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [Generali] [Validità] [Restrizioni] [Corsi Applicabili]          │
│                     ──────────────────────────────────────────   │
│                                                                      │
│  TAB 3: RESTRIZIONI                                                 │
│  ──────────────────────────────────────────────────────────────   │
│                                                                      │
│  Cumulabilità                                                       │
│  [✓] Cumulabile con altri sconti                                   │
│                                                                      │
│  Importo Minimo e Massimo                                           │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ ☑ Importo minimo richiesto                                   │ │
│  │   ┌──────────┐  €                                            │ │
│  │   │ 200.00   │                                                │ │
│  │   └──────────┘                                                │ │
│  │                                                                │ │
│  │ ☐ Sconto massimo applicabile (cap)                           │ │
│  │   ┌──────────┐  €                                            │ │
│  │   │          │                                                │ │
│  │   └──────────┘                                                │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Applicabilità                                                      │
│  Chi può usare questo codice?                                       │
│  ⚪ Tutti (aziende e persone)                                       │
│  ⚪ Solo aziende                                                    │
│  ⚪ Solo persone fisiche                                            │
│  ⚫ Aziende/Persone specifiche                                      │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ Aziende Autorizzate (3 selezionate)                          │ │
│  │ ┌──────────────────────────────────────────────────────────┐│ │
│  │ │ 🔍 Cerca azienda...                                       ││ │
│  │ └──────────────────────────────────────────────────────────┘│ │
│  │                                                               │ │
│  │ • Acme Corp S.r.l.                                      [✕]  │ │
│  │ • Beta Industries S.p.A.                                [✕]  │ │
│  │ • Gamma Solutions                                       [✕]  │ │
│  │                                                               │ │
│  │ [+ Aggiungi azienda]                                         │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                      │
│                    [← Indietro]  [Annulla]  [Avanti: Corsi →]      │
└────────────────────────────────────────────────────────────────────┘
```

```
┌────────────────────────────────────────────────────────────────────┐
│  Nuovo Codice Sconto                                         [✕]   │
├────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [Generali] [Validità] [Restrizioni] [Corsi Applicabili]          │
│                                     ──────────────────────────   │
│                                                                      │
│  TAB 4: CORSI APPLICABILI                                           │
│  ──────────────────────────────────────────────────────────────   │
│                                                                      │
│  Applicabilità Corsi                                                │
│  ⚫ Tutti i corsi                                                   │
│  ⚪ Solo corsi specifici                                            │
│                                                                      │
│  Categorie Corsi (opzionale)                                        │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ ☐ Sicurezza sul lavoro                                       │ │
│  │ ☐ Primo soccorso                                             │ │
│  │ ☐ Antincendio                                                │ │
│  │ ☐ HACCP                                                       │ │
│  │ ☑ Formazione obbligatoria                                    │ │
│  │ ☐ Aggiornamenti                                              │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ℹ️  Se nessuna categoria selezionata, si applica a tutte          │
│                                                                      │
│  Riepilogo                                                          │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ Codice: VIP50                                                 │ │
│  │ Sconto: €50 (valore assoluto)                                │ │
│  │ Validità: 01/01/2025 - 31/12/2025                            │ │
│  │ Utilizzi: Max 100 totali, max 2 per utente                   │ │
│  │ Applicabile a: 3 aziende specifiche                          │ │
│  │ Corsi: Formazione obbligatoria                               │ │
│  │ Restrizioni: Min €200, non cumulabile                        │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                      │
│                    [← Indietro]  [Annulla]  [Salva Codice Sconto]  │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🔗 Wireframes Step 4 Integration

### Step 4: Preventivo (in ScheduleEventModal)

```
┌────────────────────────────────────────────────────────────────────┐
│  Gestione Corso: Sicurezza Base (8h)                         [✕]   │
├────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [1 Dettagli] [2 Partecipanti] [3 Presenze] [4 Documenti] [5 Preventivo]│
│                                                             ─────────│
│                                                                      │
│  ╔════════════════════════════════════════════════════════════════╗│
│  ║  RIEPILOGO CORSO                                               ║│
│  ╠════════════════════════════════════════════════════════════════╣│
│  ║  📚 Corso: Sicurezza Base                                      ║│
│  ║  📅 Data: 15/01/2025 - 20/01/2025                             ║│
│  ║  ⏱️  Durata: 8 ore                                             ║│
│  ║  📍 Modalità: Presenza - Sede Acme Corp                        ║│
│  ║  👥 Partecipanti: 12 persone                                   ║│
│  ║  🏢 Cliente: Acme Corp S.r.l. (P.IVA: 12345678901)           ║│
│  ╚════════════════════════════════════════════════════════════════╝│
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  CONFIGURAZIONE PREZZI                                        │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │                                                                │ │
│  │  Tipo di Servizio *                                            │ │
│  │  ⚫ Corso di Formazione                                        │ │
│  │  ⚪ Valutazione Rischi (DVR)                                   │ │
│  │  ⚪ Nomina RSPP                                                │ │
│  │  ⚪ Nomina Medico Competente                                   │ │
│  │  ⚪ Altro Servizio                                             │ │
│  │                                                                │ │
│  │  Prezzo per Partecipante *                                     │ │
│  │  ┌──────────────┐                                             │ │
│  │  │ € 120.00     │  × 12 partecipanti                          │ │
│  │  └──────────────┘                                             │ │
│  │                                                                │ │
│  │  ℹ️  Prezzo suggerito dal listino: €120.00                    │ │
│  │                                                                │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  CODICI SCONTO                                                │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │                                                                │ │
│  │  Codice Sconto (opzionale)                                     │ │
│  │  ┌────────────────────────────┐  [Applica]                    │ │
│  │  │ PROMO2025                   │                               │ │
│  │  └────────────────────────────┘                               │ │
│  │                                                                │ │
│  │  Sconti Applicati (2):                                         │ │
│  │  ┌────────────────────────────────────────────────────────┐  │ │
│  │  │ 🎟️  PROMO2025 - Promo Capodanno              -€144.00 [✕]│ │
│  │  │    Sconto 10% applicato                                  │ │
│  │  ├────────────────────────────────────────────────────────┤  │ │
│  │  │ 🎟️  VIP50 - Sconto VIP                        -€50.00 [✕]│ │
│  │  │    Sconto valore assoluto                                │ │
│  │  └────────────────────────────────────────────────────────┘  │ │
│  │                                                                │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  RIEPILOGO TOTALI                                             │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │                                                                │ │
│  │  Prezzo Base (12 × €120.00)              €   1,440.00        │ │
│  │  Sconti Applicati                         -€     194.00       │ │
│  │  ────────────────────────────────────────────────────────────│ │
│  │  TOTALE                                   €   1,246.00        │ │
│  │                                                                │ │
│  │  IVA (22%)                                €     274.12        │ │
│  │  ────────────────────────────────────────────────────────────│ │
│  │  TOTALE IVA INCLUSA                       €   1,520.12        │ │
│  │                                                                │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  OPZIONI PREVENTIVO                                           │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │                                                                │ │
│  │  Validità Preventivo                                           │ │
│  │  ┌──────────────┐  (30 giorni da oggi)                        │ │
│  │  │ 15/02/2025  📅│                                             │ │
│  │  └──────────────┘                                             │ │
│  │                                                                │ │
│  │  Condizioni di Pagamento                                       │ │
│  │  ┌────────────────────────────────────────────────────────┐  │ │
│  │  │ 50% anticipo alla conferma, saldo a fine corso         │  │ │
│  │  └────────────────────────────────────────────────────────┘  │ │
│  │                                                                │ │
│  │  Note Aggiuntive (opzionale)                                   │ │
│  │  ┌────────────────────────────────────────────────────────┐  │ │
│  │  │                                                          │  │ │
│  │  └────────────────────────────────────────────────────────┘  │ │
│  │                                                                │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  [📄 Anteprima PDF]  [💾 Salva Bozza]  [📧 Genera e Invia]  │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                      │
│                      [← Indietro: Documenti]     [Chiudi]           │
└────────────────────────────────────────────────────────────────────┘

Interazioni:
- Click [Applica]: Valida codice e applica sconto
- Click [✕] su sconto: Rimuove sconto e ricalcola
- Cambio prezzo: Ricalcola automaticamente totali
- [Anteprima PDF]: Apre modal con viewer PDF
- [Salva Bozza]: Salva preventivo stato BOZZA
- [Genera e Invia]: Genera PDF e apre dialog invio email
```

### Modal Anteprima PDF

```
┌────────────────────────────────────────────────────────────────────┐
│  Anteprima Preventivo                                        [✕]   │
├────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │  [PDF Viewer Embed - Rendering del template HTML]           │   │
│  │                                                              │   │
│  │  ▼ ▼ ▼ Scroll per vedere tutto il documento ▼ ▼ ▼          │   │
│  │                                                              │   │
│  │  (Mostra il PDF generato con logo, dati, tabelle, totali)   │   │
│  │                                                              │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Azioni:                                                             │
│  [⬇️ Scarica PDF]  [📧 Invia per Email]  [✏️ Modifica]  [Chiudi]  │
│                                                                      │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🧩 Component Library

### Componenti Principali

#### 1. DiscountBadge
```typescript
interface DiscountBadgeProps {
  codice: CodiceSconto;
  variant?: 'compact' | 'detailed';
  showStatus?: boolean;
}

// Rendering:
┌───────────────────────────┐
│ PROMO2025  [Attivo 🟢]   │
│ -10% • Tutti • Cumulabile │
└───────────────────────────┘
```

#### 2. PriceCalculator
```typescript
interface PriceCalculatorProps {
  basePrice: number;
  quantity: number;
  discounts: CodiceSconto[];
  onChange: (totals: Totals) => void;
}

// Rendering:
┌─────────────────────────────────┐
│ Base: €1,440.00                 │
│ Sconti: -€194.00                │
│ ─────────────────────────────── │
│ Totale: €1,246.00              │
│ IVA (22%): €274.12              │
│ ─────────────────────────────── │
│ TOTALE IVA INCL: €1,520.12     │
└─────────────────────────────────┘
```

#### 3. DiscountInput
```typescript
interface DiscountInputProps {
  onApply: (codice: string) => Promise<ValidazioneResult>;
  disabled?: boolean;
  placeholder?: string;
}

// Rendering:
┌──────────────────────────────┐
│ Codice Sconto                │
│ ┌──────────────┐  [Applica] │
│ │ PROMO2025    │             │
│ └──────────────┘             │
│ ✓ Sconto 10% applicato       │
└──────────────────────────────┘
```

#### 4. AppliedDiscountsList
```typescript
interface AppliedDiscountsListProps {
  discounts: AppliedDiscount[];
  onRemove: (id: string) => void;
  readonly?: boolean;
}

// Rendering:
┌────────────────────────────────┐
│ Sconti Applicati (2)           │
│ ┌──────────────────────────┐  │
│ │ 🎟️  PROMO2025   -€144 [✕]│  │
│ │    10% applicato          │  │
│ ├──────────────────────────┤  │
│ │ 🎟️  VIP50       -€50  [✕]│  │
│ │    Valore assoluto        │  │
│ └──────────────────────────┘  │
└────────────────────────────────┘
```

#### 5. ServiceTypeSelector
```typescript
interface ServiceTypeSelectorProps {
  value: TipoServizio;
  onChange: (tipo: TipoServizio) => void;
  pricingInfo?: PricingInfo;
}

enum TipoServizio {
  CORSO = 'CORSO',
  DVR = 'DVR',
  RSPP = 'RSPP',
  MEDICO_COMPETENTE = 'MEDICO_COMPETENTE',
  CONSULENZA = 'CONSULENZA',
  ALTRO = 'ALTRO'
}

// Rendering:
┌─────────────────────────────────────┐
│ Tipo di Servizio *                  │
│ ⚫ Corso di Formazione               │
│ ⚪ Valutazione Rischi (DVR)          │
│ ⚪ Nomina RSPP                       │
│ ⚪ Nomina Medico Competente          │
│ ⚪ Consulenza                        │
│ ⚪ Altro Servizio                    │
│                                      │
│ ℹ️ Prezzo suggerito: €120/persona   │
└─────────────────────────────────────┘
```

#### 6. QuoteSummaryCard
```typescript
interface QuoteSummaryCardProps {
  preventivo: Preventivo;
  variant?: 'compact' | 'detailed';
  actions?: ReactNode;
}

// Rendering (detailed):
┌──────────────────────────────────────┐
│ PREV-2025-0042                       │
│ ───────────────────────────────────  │
│ 📚 Sicurezza Base                    │
│ 🏢 Acme Corp S.r.l.                 │
│ 👥 12 partecipanti                   │
│ 📅 Emesso: 08/11/2025               │
│ ⏰ Scadenza: 08/12/2025             │
│ 💰 Totale: €1,520.12                │
│                                      │
│ Stato: [INVIATO 🟡]                 │
│                                      │
│ [📄 Scarica] [📧 Reinvia] [✓ Accetta]│
└──────────────────────────────────────┘
```

---

## 🔄 User Flows

### Flow 1: Creazione Codice Sconto

```
[Admin accede pagina] 
    ↓
[Click "+ Nuovo Codice"]
    ↓
[Modal si apre - Tab "Generali"]
    ↓
[Compila: codice, nome, tipo, valore]
    ↓
[Click "Avanti: Validità"]
    ↓
[Tab "Validità" - Imposta date e limiti]
    ↓
[Click "Avanti: Restrizioni"]
    ↓
[Tab "Restrizioni" - Configura applicabilità]
    ↓
[Click "Avanti: Corsi"]
    ↓
[Tab "Corsi" - Seleziona categorie]
    ↓
[Rivedi riepilogo]
    ↓
[Click "Salva Codice Sconto"]
    ↓
[Validazione backend]
    ↓
[Toast success: "Codice creato con successo"]
    ↓
[Modal si chiude]
    ↓
[Lista aggiornata con nuovo codice]
    ↓
[END]

Alternative Paths:
- Click "Annulla" in qualsiasi tab → Conferma → Modal si chiude senza salvare
- Validazione fallita → Mostra errori inline → Rimane su tab corrente
- Click "Indietro" → Torna al tab precedente mantenendo dati
```

### Flow 2: Generazione Preventivo con Sconti

```
[User apre ScheduleEventModal]
    ↓
[Compila Step 0-3 (dettagli, partecipanti, presenze, documenti)]
    ↓
[Click "Avanti" → Step 4: Preventivo]
    ↓
[Vede riepilogo corso auto-popolato]
    ↓
[Seleziona tipo servizio (default: Corso)]
    ↓
[Imposta prezzo unitario (suggerito da DB)]
    ↓
[Sistema calcola prezzo base automaticamente]
    ↓
[User inserisce codice sconto "PROMO2025"]
    ↓
[Click "Applica"]
    ↓
[Loading spinner 1-2s]
    ↓
[Validazione backend]
    ├─ VALIDO
    │   ↓
    │   [Sconto aggiunto alla lista]
    │   ↓
    │   [Totali ricalcolati automaticamente]
    │   ↓
    │   [Toast success: "Sconto 10% applicato"]
    │
    └─ NON VALIDO
        ↓
        [Toast error: "Codice non valido: motivo specifico"]
        ↓
        [Input rimane attivo per retry]
    ↓
[User può aggiungere altri codici (se cumulabili)]
    ↓
[Imposta validità e condizioni pagamento]
    ↓
[Click "Anteprima PDF"]
    ↓
[Modal anteprima con PDF generato]
    ↓
[User rivede documento]
    ├─ [Click "Modifica"] → Torna a Step 4
    │
    └─ [Click "Invia per Email"]
        ↓
        [Dialog email con destinatario pre-popolato]
        ↓
        [Conferma invio]
        ↓
        [PDF generato + salvato su server]
        ↓
        [Email inviata]
        ↓
        [Preventivo stato → INVIATO]
        ↓
        [Toast success: "Preventivo inviato con successo"]
        ↓
        [Modal si chiude]
        ↓
        [END]

Alternative Paths:
- Click "Salva Bozza" → Salva stato BOZZA → Può essere ripreso dopo
- Click [✕] su sconto → Rimuove sconto → Ricalcola totali
- Validazione fallita → Mostra errori → User corregge
```

### Flow 3: Cliente Accetta Preventivo

```
[Cliente riceve email con link]
    ↓
[Click link → Apre pagina pubblica preventivo]
    ↓
[Vede dettagli completi]
    ↓
[Click "Scarica PDF"]
    ↓
[PDF scaricato]
    ↓
[Cliente rivede offline]
    ↓
[Torna su pagina]
    ↓
[Click "Accetta Preventivo"]
    ↓
[Modal conferma: "Sicuro di voler accettare?"]
    ↓
[Click "Conferma"]
    ↓
[Backend aggiorna stato → ACCETTATO]
    ↓
[Email notifica ad admin]
    ↓
[Pagina mostra: "Preventivo accettato ✓"]
    ↓
[END]

Alternative Paths:
- Click "Rifiuta" → Modal con campo "motivo" → Conferma → Stato RIFIUTATO
- Link scaduto → Mostra messaggio "Preventivo scaduto"
- Preventivo già accettato/rifiutato → Mostra stato attuale
```

---

## 📱 Responsive Design

### Breakpoints
```scss
$breakpoint-xs: 320px;   // Mobile small
$breakpoint-sm: 640px;   // Mobile
$breakpoint-md: 768px;   // Tablet
$breakpoint-lg: 1024px;  // Desktop
$breakpoint-xl: 1280px;  // Desktop large
$breakpoint-2xl: 1536px; // Desktop XL
```

### Layout Adaptations

#### Desktop (≥1024px)
- Tabella codici: 7 colonne visibili
- Modal: 800px width, centrato
- Step 4: Layout a 2 colonne (riepilogo + form)

#### Tablet (768px-1023px)
- Tabella codici: 5 colonne + dettagli espandibili
- Modal: 90% width
- Step 4: Layout single column con card collapsibili

#### Mobile (≤767px)
- Tabella → Lista di card verticali
- Modal: Fullscreen con header sticky
- Step 4: Stack verticale, bottoni fissi in basso
- Tabs → Dropdown selector

### Mobile-Specific UI

```
Mobile - Lista Codici (< 768px)
┌─────────────────────────────────┐
│ ← CODICI SCONTO          [+]    │
├─────────────────────────────────┤
│ 🔍 Cerca...                     │
│ [Filtri ▼]                      │
├─────────────────────────────────┤
│ ┌───────────────────────────┐  │
│ │ PROMO2025     [Attivo 🟢] │  │
│ │ Promo Capodanno           │  │
│ │ 10% • 01/01-31/01         │  │
│ │ Utilizzi: 45/100          │  │
│ │                           │  │
│ │ [Modifica] [Elimina]      │  │
│ └───────────────────────────┘  │
│                                 │
│ ┌───────────────────────────┐  │
│ │ VIP50         [Attivo 🟢] │  │
│ │ Sconto VIP                │  │
│ │ €50 • 01/01-31/12         │  │
│ │ Utilizzi: 12/100          │  │
│ │                           │  │
│ │ [Modifica] [Elimina]      │  │
│ └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

---

## ♿ Accessibility

### WCAG 2.1 AA Compliance

#### Keyboard Navigation
- ✅ Tab order logico in tutti i form
- ✅ Focus visible su tutti gli elementi interattivi
- ✅ Escape key chiude modal
- ✅ Enter/Space attivano bottoni
- ✅ Arrow keys per navigare tabs

#### Screen Readers
```html
<!-- Esempio annotazioni ARIA -->
<button aria-label="Applica codice sconto PROMO2025">
  Applica
</button>

<div role="alert" aria-live="polite">
  Sconto 10% applicato con successo
</div>

<table aria-label="Lista codici sconto">
  <thead>
    <tr>
      <th scope="col">Codice</th>
      <th scope="col">Nome</th>
      <!-- ... -->
    </tr>
  </thead>
</table>
```

#### Color Contrast
- Ratio minimo: **4.5:1** per testo normale
- Ratio minimo: **3:1** per testo large
- Testato con: Chrome DevTools Lighthouse

#### Focus Management
- Focus trap nei modal
- Focus ritorna all'elemento trigger dopo chiusura modal
- Skip links per navigazione rapida

#### Error Messages
- Chiare e specifiche
- Associate ai campi tramite `aria-describedby`
- Non basate solo sul colore

---

## 🎨 Visual Design

### Color Palette

```scss
// Primary Colors
$primary-50:  #EFF6FF;  // Background light
$primary-100: #DBEAFE;
$primary-500: #3B82F6;  // Main primary
$primary-600: #2563EB;  // Primary dark
$primary-700: #1D4ED8;  // Primary darker

// Success (Discount Applied)
$success-50:  #F0FDF4;
$success-500: #22C55E;
$success-700: #15803D;

// Warning (Expiring Soon)
$warning-50:  #FFFBEB;
$warning-500: #F59E0B;
$warning-700: #B45309;

// Error (Invalid/Expired)
$error-50:  #FEF2F2;
$error-500: #EF4444;
$error-700: #B91C1C;

// Neutral (Text/Backgrounds)
$neutral-50:  #F9FAFB;
$neutral-100: #F3F4F6;
$neutral-500: #6B7280;
$neutral-700: #374151;
$neutral-900: #111827;
```

### Typography

```scss
// Font Family
$font-primary: 'Inter', system-ui, sans-serif;
$font-mono: 'JetBrains Mono', monospace; // Per codici sconto

// Font Sizes
$text-xs:   0.75rem;   // 12px
$text-sm:   0.875rem;  // 14px
$text-base: 1rem;      // 16px
$text-lg:   1.125rem;  // 18px
$text-xl:   1.25rem;   // 20px
$text-2xl:  1.5rem;    // 24px
$text-3xl:  1.875rem;  // 30px

// Font Weights
$font-normal:  400;
$font-medium:  500;
$font-semibold: 600;
$font-bold:    700;
```

### Spacing System

```scss
$space-0: 0;
$space-1: 0.25rem;  // 4px
$space-2: 0.5rem;   // 8px
$space-3: 0.75rem;  // 12px
$space-4: 1rem;     // 16px
$space-5: 1.25rem;  // 20px
$space-6: 1.5rem;   // 24px
$space-8: 2rem;     // 32px
$space-10: 2.5rem;  // 40px
$space-12: 3rem;    // 48px
```

### Shadows

```scss
$shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
$shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
$shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
$shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
```

### Border Radius

```scss
$radius-sm: 0.25rem;  // 4px
$radius-md: 0.375rem; // 6px
$radius-lg: 0.5rem;   // 8px
$radius-xl: 0.75rem;  // 12px
$radius-full: 9999px; // Pills/Badges
```

### Animation

```scss
// Durations
$duration-fast: 150ms;
$duration-base: 200ms;
$duration-slow: 300ms;

// Easings
$ease-in: cubic-bezier(0.4, 0, 1, 1);
$ease-out: cubic-bezier(0, 0, 0.2, 1);
$ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);

// Examples
.button {
  transition: all $duration-base $ease-in-out;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: $shadow-md;
  }
}

.modal-enter {
  opacity: 0;
  transform: scale(0.95);
}

.modal-enter-active {
  opacity: 1;
  transform: scale(1);
  transition: opacity $duration-base $ease-out,
              transform $duration-base $ease-out;
}
```

### Icons

```tsx
// Libreria: lucide-react
import { 
  Tag,           // Codici sconto
  Receipt,       // Preventivi
  Check,         // Applicato
  X,             // Rimuovi
  AlertCircle,   // Errore
  Info,          // Info
  Calendar,      // Date
  Users,         // Partecipanti
  TrendingDown,  // Sconto
  FileText,      // Documento
  Mail,          // Invio email
  Download,      // Download
  Eye            // Anteprima
} from 'lucide-react';
```

---

## 📐 Design Tokens (CSS Variables)

```css
:root {
  /* Colors */
  --color-primary: #3B82F6;
  --color-primary-hover: #2563EB;
  --color-success: #22C55E;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
  
  /* Typography */
  --font-family-base: 'Inter', system-ui, sans-serif;
  --font-size-base: 1rem;
  --line-height-base: 1.5;
  
  /* Spacing */
  --spacing-unit: 0.25rem;
  --spacing-xs: calc(var(--spacing-unit) * 1);  /* 4px */
  --spacing-sm: calc(var(--spacing-unit) * 2);  /* 8px */
  --spacing-md: calc(var(--spacing-unit) * 4);  /* 16px */
  --spacing-lg: calc(var(--spacing-unit) * 6);  /* 24px */
  --spacing-xl: calc(var(--spacing-unit) * 8);  /* 32px */
  
  /* Borders */
  --border-width: 1px;
  --border-radius: 0.375rem;
  --border-color: #E5E7EB;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  
  /* Transitions */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## ✅ Design Checklist

### Pre-Development
- [x] Wireframes approvati da stakeholders
- [x] User flows documentati
- [x] Component library definita
- [x] Design tokens stabiliti
- [ ] Mockup high-fidelity (Figma)
- [ ] Prototype interattivo (opzionale)

### During Development
- [ ] Design system consistency check
- [ ] Responsive testing su 3+ dispositivi
- [ ] Accessibilità keyboard navigation
- [ ] Screen reader testing
- [ ] Color contrast validation
- [ ] Performance (Lighthouse score > 90)

### Pre-Launch
- [ ] UAT con utenti reali
- [ ] A/B testing key flows (opzionale)
- [ ] Analytics setup (heatmaps, click tracking)
- [ ] Feedback mechanism integrato
- [ ] Onboarding tooltips/guide

---

**Status**: ✅ UI/UX DESIGN COMPLETO  
**Pronto per**: Frontend implementation  
**Deliverables**: Wireframes, component specs, design tokens, user flows

---

**Prossimo documento**: `06_TESTING_PLAN.md`
