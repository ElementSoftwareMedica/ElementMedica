# 📊 GANTT TIMELINE - Poliambulatorio ElementMedica

**Versione**: 2.0  
**Data**: 2025-12-11  
**Durata Totale**: 20 settimane (~5 mesi)

---

## 1. TIMELINE VISUALE

```
SETTIMANA       1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20
                ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤

FASE 0          ████████                                                                        
Infrastruttura  │  2 sett │                                                                     

FASE 1              ████████████                                                                
Database            │   3 sett   │                                                              

FASE 2                  ████████████████                                                        
Backend                 │     4 sett     │                                                      

FASE 3                              ████████████                                                
Frontend Base                       │   3 sett   │                                              

FASE 4                                      ████████                                            
Struttura                                   │ 2 sett│                                           

FASE 5                                          ████████                                        
Catalogo                                        │ 2 sett│                                       

FASE 6                                              ████████████                                
Agenda                                              │   3 sett   │                              

FASE 7                                                      ████████████████                    
Clinica                                                     │     4 sett     │                  

FASE 8                                                                  ████████                
Fatturazione                                                            │ 2 sett│               

FASE 9                                                                      ████████            
Integrazioni                                                                │ 2 sett│           

FASE 10                                                                         ██████          
Sicurezza                                                                       │1.5se│         

FASE 11                                                                            ████████     
Testing                                                                            │ 2 sett│    

FASE 12                                                                                ████████ 
Deploy                                                                                 │ 2 sett│

                ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
MILESTONE       M1      M2          M3              M4              M5          M6          M7
```

---

## 2. MILESTONE PRINCIPALI

| ID | Milestone | Settimana | Deliverable |
|----|-----------|-----------|-------------|
| M1 | Infra Ready | 2 | Multi-domain funzionante |
| M2 | Schema Complete | 5 | Database migrato e funzionante |
| M3 | API Complete | 9 | Tutti gli endpoint clinici |
| M4 | Frontend MVP | 13 | UI base navigabile |
| M5 | Clinical Ready | 17 | Workflow visita E2E |
| M6 | Beta Ready | 19 | Testing completato |
| M7 | Go-Live | 20 | Produzione |

---

## 3. DETTAGLIO PER FASE

### FASE 0: INFRASTRUTTURA (Settimane 1-2)

| Sottofase | S1 | S2 | Dipendenze | Output |
|-----------|----|----|------------|--------|
| F0.1 Multi-Domain | ██ | | - | DNS, SSL |
| F0.2 Frontend Split | ██ | ██ | F0.1 | Vite config |
| F0.3 Auth Multi | | ██ | F0.2 | JWT domain-aware |

**Risorse**: 1 DevOps, 1 Frontend Dev
**Rischio**: DNS propagation delays

---

### FASE 1: DATABASE (Settimane 2-4)

| Sottofase | S2 | S3 | S4 | Dipendenze | Output |
|-----------|----|----|----|----|--------|
| F1.1 Core | ██ | | | F0.3 | Poliambulatorio, Sede |
| F1.2 Ambulatori | ██ | ██ | | F1.1 | Ambulatorio, Orari |
| F1.3 Strumenti | | ██ | | F1.2 | Strumento, Manutenz. |
| F1.4 Prestazioni | | ██ | ██ | F1.2 | Prestazione, Template |
| F1.5 Listini | | | ██ | F1.4 | Listino, Convenzione |
| F1.6 Agenda | | ██ | ██ | F1.4 | Disponibilità, App. |
| F1.7 Clinica | | | ██ | F1.6 | Visita, Referto |
| F1.8 Audit | | | ██ | F1.7 | AuditLog |

**Risorse**: 1 Backend Dev (Prisma expert)
**Rischio**: Schema complexity, migration issues

---

### FASE 2: BACKEND (Settimane 4-7)

| Sottofase | S4 | S5 | S6 | S7 | Output |
|-----------|----|----|----|----|--------|
| F2.1 Setup | ██ | | | | Router base |
| F2.2 Struttura | ██ | ██ | | | API Poli/Amb |
| F2.3 Strumenti | | ██ | | | API Strumenti |
| F2.4 Catalogo | | ██ | ██ | | API Prestazioni |
| F2.5-6 Pricing | | | ██ | | API Listini |
| F2.7-8 Agenda | | | ██ | ██ | API Appuntamenti |
| F2.9 Visite | | | | ██ | API Visite |
| F2.10-11 Referti | | | | ██ | API Referti + Doc |

**Risorse**: 2 Backend Devs
**Rischio**: Complexity visite/referti

---

### FASE 3: FRONTEND BASE (Settimane 7-9)

| Sottofase | S7 | S8 | S9 | Output |
|-----------|----|----|-----|--------|
| F3.1 Setup | ██ | | | Entry medica |
| F3.2 Theme | ██ | | | Colori, typography |
| F3.3 Components | ██ | ██ | | PatientCard, etc. |
| F3.4 Services | | ██ | | clinicaApi |
| F3.5 Hooks | | ██ | ██ | useAppuntamenti |
| F3.6 Auth | | | ██ | Login medica |

**Risorse**: 2 Frontend Devs
**Rischio**: Component library alignment

---

### FASE 4-5: STRUTTURA + CATALOGO (Settimane 9-12)

| Sottofase | S9 | S10 | S11 | S12 | Output |
|-----------|----|----|-----|-----|--------|
| F4.1-2 Struttura | ██ | ██ | | | Dashboard, Sedi |
| F4.3-4 Ambulatori | | ██ | ██ | | CRUD Ambulatori |
| F5.1-2 Prestazioni | | | ██ | ██ | Form Builder |
| F5.3-4 Listini | | | | ██ | Pricing UI |

**Risorse**: 2 Frontend Devs
**Rischio**: Form builder complexity

---

### FASE 6: AGENDA (Settimane 12-14)

| Sottofase | S12 | S13 | S14 | Output |
|-----------|-----|-----|-----|--------|
| F6.1 Calendario | ██ | ██ | | FullCalendar setup |
| F6.2 Disponibilità | | ██ | | Slot management |
| F6.3 Booking | | ██ | ██ | Wizard prenotazione |
| F6.4 Workflow | | | ██ | Stati appuntamento |
| F6.5-6 Accettazione | | | ██ | Check-in, Chiamate |

**Risorse**: 2 Frontend + 1 Backend
**Rischio**: FullCalendar customization, WebSocket

---

### FASE 7: CLINICA (Settimane 14-17)

| Sottofase | S14 | S15 | S16 | S17 | Output |
|-----------|-----|-----|-----|-----|--------|
| F7.1 Dashboard | ██ | | | | Dashboard medico |
| F7.2 Flusso Visita | ██ | ██ | | | Timer, form dinamico |
| F7.3 Editor Referti | | ██ | ██ | | TipTap + templates |
| F7.4 Firma | | | ██ | | Firma digitale |
| F7.5 Versioning | | | ██ | ██ | Event sourcing UI |
| F7.6 Cartella | | | | ██ | Vista paziente |

**Risorse**: 2 Frontend + 2 Backend
**Rischio**: Editor WYSIWYG, PDF generation

---

### FASE 8-9: FATTURAZIONE + INTEGRAZIONI (Settimane 16-19)

| Sottofase | S16 | S17 | S18 | S19 | Output |
|-----------|-----|-----|-----|-----|--------|
| F8.1-2 Fatture | ██ | ██ | | | Fatturazione base |
| F8.3 Report | | ██ | | | Dashboard incassi |
| F9.1 Email | | | ██ | | Template email |
| F9.2 WhatsApp | | | ██ | ██ | Twilio + WA |
| F9.3 Calendar | | | | ██ | ICS export |

**Risorse**: 1 Backend + 1 Integration
**Rischio**: WhatsApp Business API approval

---

### FASE 10: SICUREZZA (Settimane 18-19)

| Sottofase | S18 | S19 | Output |
|-----------|-----|-----|--------|
| F10.1 Audit UI | ██ | | Visualizzazione |
| F10.2 GDPR | ██ | ██ | Export, consensi |
| F10.3 Hardening | | ██ | Rate limit, session |

**Risorse**: 1 Security specialist
**Rischio**: Compliance review

---

### FASE 11: TESTING (Settimane 19-20)

| Sottofase | S19 | S20 | Output |
|-----------|-----|-----|--------|
| F11.1 Unit | ██ | | 75%+ coverage |
| F11.2 Integration | ██ | ██ | API tests |
| F11.3 E2E | | ██ | Playwright |

**Risorse**: 2 QA Engineers
**Rischio**: Test coverage gaps

---

### FASE 12: DEPLOY (Settimana 20)

| Sottofase | S20 | Output |
|-----------|-----|--------|
| F12.1 Staging | ██ | UAT environment |
| F12.2 Production | ██ | Live system |
| F12.3 Support | ██ | Training, docs |

**Risorse**: 1 DevOps + Team
**Rischio**: Data migration

---

## 4. DIPENDENZE CRITICHE

```
F0.1 ──► F0.2 ──► F0.3 ──► F1.1
                              │
                              ▼
         F1.2 ──► F1.4 ──► F1.6 ──► F1.7
           │        │        │        │
           ▼        ▼        ▼        ▼
         F2.2     F2.4     F2.7     F2.9
           │        │        │        │
           └────────┴────────┴────────┘
                        │
                        ▼
                      F3.1 ──► F3.3 ──► F4.x ──► F6.x ──► F7.x
                                                            │
                                                            ▼
                                                         F8.x ──► F11.x ──► F12.x
```

---

## 5. RISORSE PER FASE

| Fase | Backend | Frontend | DevOps | QA | Totale |
|------|---------|----------|--------|----|----|
| F0 | 0.5 | 0.5 | 1 | 0 | 2 |
| F1 | 1.5 | 0 | 0.5 | 0 | 2 |
| F2 | 2 | 0 | 0 | 0.5 | 2.5 |
| F3 | 0.5 | 2 | 0 | 0 | 2.5 |
| F4-5 | 0.5 | 2 | 0 | 0 | 2.5 |
| F6 | 1 | 2 | 0 | 0 | 3 |
| F7 | 2 | 2 | 0 | 0 | 4 |
| F8-9 | 1.5 | 1 | 0 | 0.5 | 3 |
| F10 | 1 | 0.5 | 0.5 | 0 | 2 |
| F11 | 0.5 | 0.5 | 0 | 2 | 3 |
| F12 | 0.5 | 0.5 | 1 | 0.5 | 2.5 |
| **Peak** | **2** | **2** | **1** | **2** | **5** |

---

## 6. BUFFER E CONTINGENZE

| Tipo | Allocazione | Note |
|------|-------------|------|
| Technical buffer | 15% | Per feature complexity |
| Integration buffer | 10% | Testing integrazioni |
| Scope buffer | 10% | Change requests |
| **Totale** | **35%** | ~7 settimane extra |

**Timeline con buffer**: 20 settimane + 7 buffer = **27 settimane (~6.5 mesi)**

---

## 7. CRITICAL PATH

Il percorso critico che determina la durata minima del progetto:

```
F0.1 → F0.2 → F0.3 → F1.1 → F1.4 → F1.6 → F1.7 → 
F2.7 → F2.9 → F3.1 → F6.1 → F6.3 → F7.2 → F7.3 → 
F7.4 → F11.2 → F12.2
```

**Durata critica**: ~18 settimane (senza parallelismo)
**Con parallelismo ottimale**: 20 settimane

---

## 8. GO/NO-GO CHECKPOINTS

| Checkpoint | Settimana | Criteri |
|------------|-----------|---------|
| Infra GO | 2 | SSL funzionante, auth multi-domain |
| DB GO | 5 | Schema migrato, seed funzionante |
| API GO | 9 | 80% endpoint implementati |
| MVP GO | 14 | Booking E2E funzionante |
| Beta GO | 18 | 0 critical bugs, 75% test coverage |
| Release GO | 20 | UAT approvato, backup verificato |

---

**Documento timeline completo**: ✅
