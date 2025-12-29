# 📋 MATRICE REQUISITI-TASK - Poliambulatorio ElementMedica

**Versione**: 1.0  
**Data**: 2025-12-11  
**Scopo**: Tracciabilità completa tra requisiti, specifiche, task e test

---

## 1. LEGENDA

| Simbolo | Significato |
|---------|-------------|
| ✅ | Completato |
| 🔄 | In corso |
| ⏳ | Pianificato |
| ❌ | Bloccato |
| 🔗 | Dipendenza |

---

## 2. MATRICE REQUISITI → SPECIFICHE → TASK

### 2.1 STRUTTURA FISICA

| Requisito | Specifica | Task DB | Task API | Task UI | Test |
|-----------|-----------|---------|----------|---------|------|
| REQ-STR-001 Poliambulatorio | SPEC_01 | F1.1.1 ✅ | F2.2.1 ⏳ | F4.1.1 ⏳ | T1.1 |
| REQ-STR-002 Sede | SPEC_01 | F1.1.2 ✅ | F2.2.2 ⏳ | F4.2.1 ⏳ | T1.2 |
| REQ-STR-003 Ambulatorio | SPEC_02 | F1.2.1 ✅ | F2.2.3 ⏳ | F4.3.1 ⏳ | T1.3 |
| REQ-STR-004 Orario Amb. | SPEC_02 | F1.2.2 ✅ | F2.2.4 ⏳ | F4.3.3 ⏳ | T1.4 |

### 2.2 STRUMENTARIO

| Requisito | Specifica | Task DB | Task API | Task UI | Test |
|-----------|-----------|---------|----------|---------|------|
| REQ-STR-005 Strumento | SPEC_04 | F1.3.1 ✅ | F2.3.1 ⏳ | F4.4.1 ⏳ | T2.1 |
| REQ-STR-006 Manutenzione | SPEC_04 | F1.3.2 ✅ | F2.3.2 ⏳ | F4.4.3 ⏳ | T2.2 |
| REQ-STR-007 ROI Calcolo | SPEC_04 | - | F2.3.3 ⏳ | F4.4.2 ⏳ | T2.3 |

### 2.3 CATALOGO PRESTAZIONI

| Requisito | Specifica | Task DB | Task API | Task UI | Test |
|-----------|-----------|---------|----------|---------|------|
| REQ-CAT-001 Prestazione | SPEC_03 | F1.4.1 ✅ | F2.4.1 ⏳ | F5.1.1 ⏳ | T3.1 |
| REQ-CAT-002 Prest-Medico | SPEC_03 | F1.4.1 ✅ | F2.4.4 ⏳ | F5.1.4 ⏳ | T3.2 |
| REQ-CAT-003 Prest-Strumento | SPEC_03 | F1.4.1 ✅ | F2.4.3 ⏳ | F5.1.3 ⏳ | T3.3 |
| REQ-CAT-004 Pacchetti | SPEC_03 | F1.4.1 ✅ | F2.4.1 ⏳ | F5.1.2 ⏳ | T3.4 |

### 2.4 TEMPLATE VISITA

| Requisito | Specifica | Task DB | Task API | Task UI | Test |
|-----------|-----------|---------|----------|---------|------|
| REQ-VIS-001 Template Campo | SPEC_03, SPEC_09 | F1.4.2 ✅ | F2.4.2 ⏳ | F5.2.1 ⏳ | T4.1 |
| REQ-VIS-002 Campi Statici | SPEC_09 | F1.7.2 ✅ | F2.9.4 ⏳ | F7.2.3 ⏳ | T4.2 |

### 2.5 LISTINI E PRICING

| Requisito | Specifica | Task DB | Task API | Task UI | Test |
|-----------|-----------|---------|----------|---------|------|
| REQ-PRC-001 Listino | SPEC_06 | F1.5.1 ✅ | F2.5.1 ⏳ | F5.3.1 ⏳ | T5.1 |
| REQ-PRC-002 Prezzo | SPEC_06 | F1.5.1 ✅ | F2.5.2 ⏳ | F5.3.2 ⏳ | T5.2 |
| REQ-PRC-003 Convenzione | SPEC_06 | F1.5.2 ✅ | F2.6.1 ⏳ | F5.4.1 ⏳ | T5.3 |
| REQ-PRC-004 Codice Sconto | SPEC_06 | F1.5.3 ✅ | F2.5.3 ⏳ | F5.3.4 ⏳ | T5.4 |

### 2.6 AGENDA E BOOKING

| Requisito | Specifica | Task DB | Task API | Task UI | Test |
|-----------|-----------|---------|----------|---------|------|
| REQ-AGN-001 Disponibilità | SPEC_05 | F1.6.1 ✅ | F2.7.1 ⏳ | F6.2.1 ⏳ | T6.1 |
| REQ-AGN-002 Ferie/Assenze | SPEC_05 | F1.6.1 ✅ | F2.7.3 ⏳ | F6.2.2 ⏳ | T6.2 |
| REQ-AGN-003 Slot Calcolo | SPEC_05 | - | F2.7.2 ⏳ | F6.1.2 ⏳ | T6.3 |

### 2.7 APPUNTAMENTI

| Requisito | Specifica | Task DB | Task API | Task UI | Test |
|-----------|-----------|---------|----------|---------|------|
| REQ-APP-001 Appuntamento | SPEC_07 | F1.6.2 ✅ | F2.8.1-5 ⏳ | F6.3.1-5 ⏳ | T7.1 |
| REQ-APP-002 Metriche | SPEC_07 | - | F2.8.6 ⏳ | F6.4.4 ⏳ | T7.2 |

### 2.8 NUMERO CHIAMATA

| Requisito | Specifica | Task DB | Task API | Task UI | Test |
|-----------|-----------|---------|----------|---------|------|
| REQ-COD-001 Sistema Coda | SPEC_08 | F1.6.3 ✅ | F2.8.5 ⏳ | F6.6.1-4 ⏳ | T8.1 |

### 2.9 VISITA CLINICA

| Requisito | Specifica | Task DB | Task API | Task UI | Test |
|-----------|-----------|---------|----------|---------|------|
| REQ-VIS-010 Visita | SPEC_09 | F1.7.1 ✅ | F2.9.1-5 ⏳ | F7.2.1-5 ⏳ | T9.1 |
| REQ-VIS-011 Campi Statici | SPEC_09 | F1.7.2 ✅ | F2.9.4 ⏳ | F7.6.5 ⏳ | T9.2 |
| REQ-VIS-012 Auto-Save | SPEC_09 | - | F2.9.3 ⏳ | F7.3.4 ⏳ | T9.3 |

### 2.10 REFERTAZIONE

| Requisito | Specifica | Task DB | Task API | Task UI | Test |
|-----------|-----------|---------|----------|---------|------|
| REQ-REF-001 Referto | SPEC_10 | F1.7.3 ✅ | F2.10.1 ⏳ | F7.3.1-5 ⏳ | T10.1 |
| REQ-REF-002 Versioning | SPEC_10 | F1.7.3 ✅ | F2.10.2 ⏳ | F7.5.1-4 ⏳ | T10.2 |
| REQ-REF-003 Firma Digitale | SPEC_10 | F1.7.4 ✅ | F2.10.3 ⏳ | F7.4.1-4 ⏳ | T10.3 |

### 2.11 RUOLI E PERMESSI

| Requisito | Specifica | Task DB | Task API | Task UI | Test |
|-----------|-----------|---------|----------|---------|------|
| REQ-ROL-001 Ruoli Clinici | SPEC_11 | F1.1.1 ✅ | F2.1.1 ⏳ | F3.6.3 ⏳ | T11.1 |
| REQ-ROL-002 Permessi | SPEC_11 | F1.1.2 ✅ | F2.1.1 ⏳ | F3.6.2 ⏳ | T11.2 |

### 2.12 AUDIT E GDPR

| Requisito | Specifica | Task DB | Task API | Task UI | Test |
|-----------|-----------|---------|----------|---------|------|
| REQ-AUD-001 Audit Log | SPEC_12 | F1.8.1 ✅ | F2.1.2 ⏳ | F10.1.1-4 ⏳ | T12.1 |
| REQ-AUD-002 GDPR | SPEC_12 | F1.8.1 ✅ | F2.1.2 ⏳ | F10.2.1-4 ⏳ | T12.2 |

### 2.13 FILE STORAGE

| Requisito | Specifica | Task DB | Task API | Task UI | Test |
|-----------|-----------|---------|----------|---------|------|
| REQ-FIL-001 Documenti | SPEC_13 | F1.7.3 ✅ | F2.11.1-4 ⏳ | F7.6.4 ⏳ | T13.1 |

### 2.14 SICUREZZA

| Requisito | Specifica | Task DB | Task API | Task UI | Test |
|-----------|-----------|---------|----------|---------|------|
| REQ-SEC-001 Auth | SPEC_14 | - | F2.1.1 ⏳ | F3.6.1 ⏳ | T14.1 |
| REQ-SEC-002 Cifratura | SPEC_14 | F1.8.1 ✅ | F2.1.2 ⏳ | - | T14.2 |
| REQ-SEC-003 Accesso PHI | SPEC_14 | F1.8.1 ✅ | F2.1.2 ⏳ | F10.1.1 ⏳ | T14.3 |

### 2.15 RICERCA

| Requisito | Specifica | Task DB | Task API | Task UI | Test |
|-----------|-----------|---------|----------|---------|------|
| REQ-SRC-001 Full-Text | SPEC_15 | F1.8.3 ✅ | F2.12.1 ⏳ | F3.3.5 ⏳ | T15.1 |

### 2.16 INTEGRAZIONI

| Requisito | Specifica | Task DB | Task API | Task UI | Test |
|-----------|-----------|---------|----------|---------|------|
| REQ-INT-001 Comunicazioni | SPEC_16 | - | F9.1-2 ⏳ | - | T16.1 |
| REQ-INT-002 Fatturazione | SPEC_16 | F1.7.5 ✅ | F8.1-3 ⏳ | F8.1-3 ⏳ | T16.2 |
| REQ-INT-003 Job Asincroni | SPEC_16 | - | F2.13 ⏳ | - | T16.3 |

### 2.17 COMUNICAZIONI MULTI-CANALE

| Requisito | Specifica | Task DB | Task API | Task UI | Test |
|-----------|-----------|---------|----------|---------|------|
| REQ-COM-001 Email | SPEC_17 | F1.9.1 ⏳ | F2.14.1-3 ⏳ | F9.1.1-2 ⏳ | T17.1 |
| REQ-COM-002 SMS | SPEC_17 | F1.9.1 ⏳ | F2.14.4-5 ⏳ | - | T17.2 |
| REQ-COM-003 WhatsApp | SPEC_17 | F1.9.1 ⏳ | F2.14.6-8 ⏳ | - | T17.3 |
| REQ-COM-004 Push | SPEC_17 | F1.9.2 ⏳ | F2.14.9-10 ⏳ | F9.1.3 ⏳ | T17.4 |
| REQ-COM-005 Recall Auto | SPEC_17 | F1.9.3 ⏳ | F2.14.11-12 ⏳ | F9.1.4 ⏳ | T17.5 |

### 2.18 PORTALE PAZIENTE

| Requisito | Specifica | Task DB | Task API | Task UI | Test |
|-----------|-----------|---------|----------|---------|------|
| REQ-POR-001 Booking Online | SPEC_18 | F1.9.4 ⏳ | F2.15.1-4 ⏳ | F9.4.1-5 ⏳ | T18.1 |
| REQ-POR-002 Area Riservata | SPEC_18 | F1.9.5 ⏳ | F2.15.5-8 ⏳ | F9.5.1-6 ⏳ | T18.2 |
| REQ-POR-003 Download Referti | SPEC_18 | - | F2.15.9-10 ⏳ | F9.5.7-8 ⏳ | T18.3 |
| REQ-POR-004 Pagamento Online | SPEC_18 | F1.9.6 ⏳ | F2.15.11-12 ⏳ | F9.5.9 ⏳ | T18.4 |

### 2.19 TELECONSULTO

| Requisito | Specifica | Task DB | Task API | Task UI | Test |
|-----------|-----------|---------|----------|---------|------|
| REQ-TEL-001 Sessione Video | SPEC_19 | F1.10.1 ⏳ | F2.16.1-5 ⏳ | F9.7.1-4 ⏳ | T19.1 |
| REQ-TEL-002 Waiting Room | SPEC_19 | F1.10.2 ⏳ | F2.16.6-7 ⏳ | F9.7.5-6 ⏳ | T19.2 |
| REQ-TEL-003 Condivisione Doc | SPEC_19 | F1.10.3 ⏳ | F2.16.8-9 ⏳ | F9.8.1-2 ⏳ | T19.3 |
| REQ-TEL-004 Chat Real-time | SPEC_19 | F1.10.4 ⏳ | F2.16.10 ⏳ | F9.8.3-4 ⏳ | T19.4 |
| REQ-TEL-005 Recording (opt) | SPEC_19 | F1.10.5 ⏳ | F2.16.11-12 ⏳ | F9.9.1 ⏳ | T19.5 |

---

## 3. MATRICE SPECIFICHE → WORKFLOW

| Specifica | WF_01 | WF_02 | WF_03 | WF_04 | WF_05 | WF_06 |
|-----------|-------|-------|-------|-------|-------|-------|
| SPEC_01 Poliambulatorio | 🔗 | | | | | |
| SPEC_02 Ambulatori | 🔗 | 🔗 | 🔗 | | | |
| SPEC_03 Prestazioni | 🔗 | | 🔗 | | | |
| SPEC_04 Strumentario | | | 🔗 | | | |
| SPEC_05 Agenda | 🔗 | | | | | |
| SPEC_06 Listini | 🔗 | | | | 🔗 | |
| SPEC_07 Appuntamenti | 🔗 | 🔗 | | | 🔗 | 🔗 |
| SPEC_08 Numero Chiamata | | 🔗 | | | | |
| SPEC_09 Visite | | | 🔗 | | | |
| SPEC_10 Referti | | | | 🔗 | | 🔗 |
| SPEC_11 Ruoli | 🔗 | 🔗 | 🔗 | 🔗 | 🔗 | 🔗 |
| SPEC_12 Audit GDPR | 🔗 | 🔗 | 🔗 | 🔗 | 🔗 | 🔗 |
| SPEC_13 File Storage | | | | 🔗 | | 🔗 |
| SPEC_14 Sicurezza | 🔗 | 🔗 | 🔗 | 🔗 | 🔗 | 🔗 |
| SPEC_15 Ricerca | 🔗 | | | | | |
| SPEC_16 Async Jobs | 🔗 | 🔗 | | 🔗 | | |
| SPEC_17 Comunicazioni | 🔗 | 🔗 | | 🔗 | | 🔗 |
| SPEC_18 Portale Paziente | 🔗 | | | | | |
| SPEC_19 Teleconsulto | | | | 🔗 | | 🔗 |

---

## 4. MATRICE TEST COVERAGE

### 4.1 Unit Tests

| Area | Test Cases | Coverage Target | Status |
|------|------------|-----------------|--------|
| Services Clinici | 45 | 80% | ⏳ |
| Validators | 30 | 90% | ⏳ |
| Hooks | 25 | 75% | ⏳ |
| Utils | 20 | 90% | ⏳ |
| **Totale** | **120** | **80%** | ⏳ |

### 4.2 Integration Tests

| Endpoint | Test Cases | Status |
|----------|------------|--------|
| /clinica/poliambulatori | 8 | ⏳ |
| /clinica/ambulatori | 10 | ⏳ |
| /clinica/prestazioni | 12 | ⏳ |
| /clinica/strumenti | 8 | ⏳ |
| /clinica/agenda | 15 | ⏳ |
| /clinica/appuntamenti | 20 | ⏳ |
| /clinica/visite | 18 | ⏳ |
| /clinica/referti | 15 | ⏳ |
| /clinica/listini | 10 | ⏳ |
| /clinica/fatture | 12 | ⏳ |
| /comunicazioni/* | 15 | ⏳ |
| /portal/* | 18 | ⏳ |
| /teleconsulto/* | 20 | ⏳ |
| **Totale** | **181** | ⏳ |

### 4.3 E2E Tests (Playwright)

| Workflow | Test Cases | Priorità | Status |
|----------|------------|----------|--------|
| WF_01 Prenotazione | 8 | 🔴 Alta | ⏳ |
| WF_02 Accettazione | 6 | 🔴 Alta | ⏳ |
| WF_03 Visita | 10 | 🔴 Alta | ⏳ |
| WF_04 Referto | 8 | 🔴 Alta | ⏳ |
| WF_05 Fatturazione | 6 | 🟡 Media | ⏳ |
| WF_06 Teleconsulto | 10 | 🟡 Media | ⏳ |
| **Totale** | **48** | - | ⏳ |

---

## 5. STATO COMPLESSIVO

### 5.1 Per Layer

| Layer | Task Totali | Completati | In Corso | Pianificati | % |
|-------|-------------|------------|----------|-------------|---|
| Database | 28 | 28 | 0 | 0 | 100% ✅ |
| Backend API | 44 | 4 | 0 | 40 | 9% |
| Frontend | 90 | 0 | 0 | 90 | 0% |
| Testing | 35 | 0 | 0 | 35 | 0% |
| Infra/Deploy | 40 | 0 | 0 | 40 | 0% |
| **TOTALE** | **237** | **32** | **0** | **205** | **13%** |

### 5.2 Per Milestone

| Milestone | Target | Task Richiesti | Completati | Status |
|-----------|--------|----------------|------------|--------|
| M1 Infra Ready | S2 | 9 | 0 | ⏳ |
| M2 Schema Complete | S5 | 28 | 28 | ✅ |
| M3 API Complete | S9 | 44 | 4 | 🔄 |
| M4 Frontend MVP | S13 | 60 | 0 | ⏳ |
| M5 Clinical Ready | S17 | 48 | 0 | ⏳ |
| M6 Beta Ready | S19 | 35 | 0 | ⏳ |
| M7 Go-Live | S20 | 13 | 0 | ⏳ |

---

## 6. DIPENDENZE CRITICHE NON RISOLTE

| ID | Dipendenza | Blocking | Action Required |
|----|------------|----------|-----------------|
| DEP-001 | F0.1 → F0.2 | F0.2 | DNS configuration |
| DEP-002 | F2.1 → F2.2-11 | All API | Setup router clinica |
| DEP-003 | F3.1 → F4-7 | All UI | Entry point medica |
| DEP-004 | F6.6 → F7.1 | Dashboard medico | WebSocket setup |
| DEP-005 | F7.4 → F11.x | Testing firma | Implementare firma |

---

## 7. RISCHI APERTI

| ID | Rischio | Probabilità | Impatto | Mitigazione | Owner |
|----|---------|-------------|---------|-------------|-------|
| R-001 | Schema migration fail | Bassa | Alta | Backup + rollback | Backend Lead |
| R-002 | FullCalendar customization | Media | Media | Spike tecnico | Frontend Lead |
| R-003 | PDF generation performance | Media | Media | Browser pool | DevOps |
| R-004 | WhatsApp API approval | Alta | Bassa | Fallback SMS | PM |
| R-005 | GDPR compliance | Bassa | Alta | Legal review | PM |

---

**Documento tracciabilità completo**: ✅
**Ultimo aggiornamento**: 2025-12-11
