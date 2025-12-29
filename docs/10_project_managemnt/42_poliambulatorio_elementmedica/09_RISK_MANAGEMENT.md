# 🚨 RISK MANAGEMENT - Poliambulatorio ElementMedica

**Versione**: 1.0  
**Data**: 2025-01-14  
**Documento**: 09_RISK_MANAGEMENT.md

---

## 📋 INDICE

1. [Metodologia](#metodologia)
2. [Risk Register](#risk-register)
3. [Rischi Tecnici](#rischi-tecnici)
4. [Rischi di Business](#rischi-di-business)
5. [Rischi Compliance](#rischi-compliance)
6. [Rischi Operativi](#rischi-operativi)
7. [Matrice Probabilità/Impatto](#matrice-probabilitàimpatto)
8. [Piani di Mitigazione](#piani-di-mitigazione)
9. [Contingency Plans](#contingency-plans)
10. [Monitoraggio e Revisione](#monitoraggio-e-revisione)

---

## 1. METODOLOGIA

### 1.1 Framework di Gestione Rischi

```
┌─────────────────────────────────────────────────────────────┐
│                    RISK MANAGEMENT CYCLE                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│    ┌──────────┐    ┌──────────┐    ┌──────────┐            │
│    │IDENTIFY  │───▶│ ASSESS   │───▶│PRIORITIZE│            │
│    └──────────┘    └──────────┘    └──────────┘            │
│         ▲                                │                   │
│         │                                ▼                   │
│    ┌──────────┐    ┌──────────┐    ┌──────────┐            │
│    │ MONITOR  │◀───│ CONTROL  │◀───│ MITIGATE │            │
│    └──────────┘    └──────────┘    └──────────┘            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Scala di Valutazione

**Probabilità (P)**:
| Livello | Score | Descrizione |
|---------|-------|-------------|
| Raro | 1 | < 10% probabilità |
| Improbabile | 2 | 10-30% probabilità |
| Possibile | 3 | 30-50% probabilità |
| Probabile | 4 | 50-70% probabilità |
| Quasi certo | 5 | > 70% probabilità |

**Impatto (I)**:
| Livello | Score | Tempo | Costo | Qualità |
|---------|-------|-------|-------|---------|
| Trascurabile | 1 | < 1 giorno | < €500 | Minimo |
| Minore | 2 | 1-3 giorni | €500-2K | Lieve |
| Moderato | 3 | 3-7 giorni | €2K-10K | Medio |
| Significativo | 4 | 1-3 settimane | €10K-50K | Alto |
| Critico | 5 | > 3 settimane | > €50K | Grave |

**Risk Score = P × I**

---

## 2. RISK REGISTER

### 2.1 Summary Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│                    RISK DASHBOARD                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  TOTALE RISCHI IDENTIFICATI: 28                             │
│                                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ CRITICO │  │  ALTO   │  │ MEDIO   │  │ BASSO   │        │
│  │    3    │  │    7    │  │   12    │  │    6    │        │
│  │  🔴🔴🔴  │  │ 🟠🟠🟠  │  │ 🟡🟡🟡  │  │ 🟢🟢🟢  │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
│                                                              │
│  PER CATEGORIA:                                              │
│  ├── Tecnici: 10 rischi                                     │
│  ├── Business: 6 rischi                                     │
│  ├── Compliance: 7 rischi                                   │
│  └── Operativi: 5 rischi                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. RISCHI TECNICI

### RISK-T01: Complessità Schema Database
| Campo | Valore |
|-------|--------|
| **ID** | RISK-T01 |
| **Categoria** | Tecnico |
| **Descrizione** | Lo schema Prisma con 25+ modelli interconnessi potrebbe generare query N+1, performance issues e complessità di manutenzione |
| **Probabilità** | 4 - Probabile |
| **Impatto** | 4 - Significativo |
| **Risk Score** | 16 - 🔴 CRITICO |
| **Owner** | Tech Lead |
| **Trigger** | Response time API > 500ms, CPU DB > 80% |
| **Mitigazione** | - Indici composti su FK<br>- Query optimization<br>- Caching layer (Redis)<br>- DB monitoring |
| **Contingency** | Read replicas, query splitting, denormalizzazione selettiva |
| **Status** | 🟡 In Monitoraggio |

### RISK-T02: Integrazione Multi-tenant
| Campo | Valore |
|-------|--------|
| **ID** | RISK-T02 |
| **Categoria** | Tecnico |
| **Descrizione** | Isolamento dati tra tenant potrebbe fallire, causando data leak tra poliambulatori diversi |
| **Probabilità** | 2 - Improbabile |
| **Impatto** | 5 - Critico |
| **Risk Score** | 10 - 🟠 ALTO |
| **Owner** | Security Lead |
| **Trigger** | Qualsiasi query cross-tenant in logs |
| **Mitigazione** | - tenantId obbligatorio in OGNI query<br>- Middleware validazione<br>- Test automatici isolation<br>- Code review obbligatoria |
| **Contingency** | Database separati per tenant critici |
| **Status** | ✅ Mitigato (test 7/7 passing) |

### RISK-T03: Performance Agenda Real-time
| Campo | Valore |
|-------|--------|
| **ID** | RISK-T03 |
| **Categoria** | Tecnico |
| **Descrizione** | Sistema agenda con slot 5 min, multi-ambulatorio potrebbe non scalare con molti utenti concorrenti |
| **Probabilità** | 3 - Possibile |
| **Impatto** | 4 - Significativo |
| **Risk Score** | 12 - 🟠 ALTO |
| **Owner** | Backend Lead |
| **Trigger** | Booking conflicts, response time > 2s |
| **Mitigazione** | - Optimistic locking<br>- Redis cache slots<br>- WebSocket per real-time<br>- Rate limiting |
| **Contingency** | Pessimistic locking, queue booking requests |
| **Status** | 🟡 Da implementare |

### RISK-T04: PDF Generation Bottleneck
| Campo | Valore |
|-------|--------|
| **ID** | RISK-T04 |
| **Categoria** | Tecnico |
| **Descrizione** | Generazione PDF referti con Puppeteer potrebbe creare colli di bottiglia con molte richieste |
| **Probabilità** | 4 - Probabile |
| **Impatto** | 3 - Moderato |
| **Risk Score** | 12 - 🟠 ALTO |
| **Owner** | Backend Lead |
| **Trigger** | Queue PDF > 50, wait time > 30s |
| **Mitigazione** | - Browser pool (5 istanze)<br>- Async job queue (BullMQ)<br>- Caching PDF generati<br>- Priorità documenti |
| **Contingency** | Servizio PDF esterno (Gotenberg), scaling orizzontale |
| **Status** | ✅ Parzialmente mitigato |

### RISK-T05: Full-text Search Performance
| Campo | Valore |
|-------|--------|
| **ID** | RISK-T05 |
| **Categoria** | Tecnico |
| **Descrizione** | Ricerca full-text su referti/anamnesi potrebbe degradare con volumi elevati |
| **Probabilità** | 3 - Possibile |
| **Impatto** | 3 - Moderato |
| **Risk Score** | 9 - 🟡 MEDIO |
| **Owner** | Backend Lead |
| **Trigger** | Search response > 1s, index size > 10GB |
| **Mitigazione** | - PostgreSQL FTS ottimizzato<br>- GIN indexes<br>- Pagination obbligatoria<br>- Search caching |
| **Contingency** | Elasticsearch/OpenSearch dedicato |
| **Status** | 🟡 Da implementare |

### RISK-T06: WebSocket Scalabilità
| Campo | Valore |
|-------|--------|
| **ID** | RISK-T06 |
| **Categoria** | Tecnico |
| **Descrizione** | Connessioni WebSocket per numero chiamata e agenda potrebbero non scalare |
| **Probabilità** | 3 - Possibile |
| **Impatto** | 3 - Moderato |
| **Risk Score** | 9 - 🟡 MEDIO |
| **Owner** | Backend Lead |
| **Trigger** | Disconnessioni frequenti, latency > 500ms |
| **Mitigazione** | - Socket.IO con Redis adapter<br>- Heartbeat monitoring<br>- Reconnection logic<br>- Fallback polling |
| **Contingency** | Servizio WebSocket dedicato (Pusher, Ably) |
| **Status** | 🟡 Da implementare |

### RISK-T07: File Storage Sicurezza
| Campo | Valore |
|-------|--------|
| **ID** | RISK-T07 |
| **Categoria** | Tecnico |
| **Descrizione** | Documenti clinici su S3 potrebbero essere esposti se signed URLs mal configurate |
| **Probabilità** | 2 - Improbabile |
| **Impatto** | 5 - Critico |
| **Risk Score** | 10 - 🟠 ALTO |
| **Owner** | Security Lead |
| **Trigger** | URL accessibili senza auth, expiry > 1h |
| **Mitigazione** | - Signed URLs 15 min expiry<br>- Bucket policy restrictive<br>- Server-side encryption<br>- Access logging |
| **Contingency** | Proxy download through backend |
| **Status** | 🟡 Da implementare |

### RISK-T08: Migration Database
| Campo | Valore |
|-------|--------|
| **ID** | RISK-T08 |
| **Categoria** | Tecnico |
| **Descrizione** | Migrazioni schema potrebbero causare downtime o data loss |
| **Probabilità** | 2 - Improbabile |
| **Impatto** | 5 - Critico |
| **Risk Score** | 10 - 🟠 ALTO |
| **Owner** | DBA |
| **Trigger** | Migration failure, rollback necessario |
| **Mitigazione** | - Solo migrazioni additive<br>- Backup pre-migration<br>- Test in staging<br>- Rollback scripts pronti |
| **Contingency** | Point-in-time recovery, restore da backup |
| **Status** | ✅ Policy definita |

### RISK-T09: API Rate Limiting
| Campo | Valore |
|-------|--------|
| **ID** | RISK-T09 |
| **Categoria** | Tecnico |
| **Descrizione** | Assenza o misconfiguration rate limiting potrebbe causare DoS |
| **Probabilità** | 3 - Possibile |
| **Impatto** | 3 - Moderato |
| **Risk Score** | 9 - 🟡 MEDIO |
| **Owner** | Backend Lead |
| **Trigger** | Request rate > 1000/min per IP |
| **Mitigazione** | - Rate limiting per endpoint<br>- Auth: 5/15min<br>- Forms: 5/5min<br>- API: 100/min |
| **Contingency** | WAF, IP blocking, CAPTCHA |
| **Status** | ✅ Implementato |

### RISK-T10: Session Management
| Campo | Valore |
|-------|--------|
| **ID** | RISK-T10 |
| **Categoria** | Tecnico |
| **Descrizione** | Gestione sessioni JWT potrebbe avere vulnerabilità |
| **Probabilità** | 2 - Improbabile |
| **Impatto** | 4 - Significativo |
| **Risk Score** | 8 - 🟡 MEDIO |
| **Owner** | Security Lead |
| **Trigger** | Token theft, session hijacking |
| **Mitigazione** | - JWT short-lived (15min)<br>- Refresh token rotation<br>- HttpOnly cookies<br>- Device fingerprinting |
| **Contingency** | Force logout all sessions, token blacklist |
| **Status** | ✅ Implementato |

---

## 4. RISCHI DI BUSINESS

### RISK-B01: Scope Creep
| Campo | Valore |
|-------|--------|
| **ID** | RISK-B01 |
| **Categoria** | Business |
| **Descrizione** | Richieste aggiuntive durante sviluppo potrebbero espandere scope oltre budget/timeline |
| **Probabilità** | 4 - Probabile |
| **Impatto** | 3 - Moderato |
| **Risk Score** | 12 - 🟠 ALTO |
| **Owner** | Project Manager |
| **Trigger** | Change requests > 3/sprint, delay > 20% |
| **Mitigazione** | - Requirements freezati per sprint<br>- Change control board<br>- Impact assessment obbligatorio<br>- Backlog prioritization |
| **Contingency** | Phase 2 per nuove features |
| **Status** | 🟡 In monitoraggio |

### RISK-B02: User Adoption
| Campo | Valore |
|-------|--------|
| **ID** | RISK-B02 |
| **Categoria** | Business |
| **Descrizione** | Staff medico potrebbe resistere al nuovo sistema per complessità |
| **Probabilità** | 3 - Possibile |
| **Impatto** | 4 - Significativo |
| **Risk Score** | 12 - 🟠 ALTO |
| **Owner** | Product Owner |
| **Trigger** | Training feedback negativo, utilizzo < 50% |
| **Mitigazione** | - UX intuitiva<br>- Training progressivo<br>- Champion users<br>- Supporto on-site |
| **Contingency** | Rollout graduale, feature toggles |
| **Status** | 🟡 Da monitorare |

### RISK-B03: Integrazione Legacy
| Campo | Valore |
|-------|--------|
| **ID** | RISK-B03 |
| **Categoria** | Business |
| **Descrizione** | Integrazione con sistemi esistenti (contabilità, lab) potrebbe essere complessa |
| **Probabilità** | 3 - Possibile |
| **Impatto** | 3 - Moderato |
| **Risk Score** | 9 - 🟡 MEDIO |
| **Owner** | Tech Lead |
| **Trigger** | API incompatibili, data mapping issues |
| **Mitigazione** | - API well-documented<br>- Integration layer<br>- Data transformation<br>- Test end-to-end |
| **Contingency** | Manual export/import, middleware |
| **Status** | 🟡 Da valutare |

### RISK-B04: Competitor Features
| Campo | Valore |
|-------|--------|
| **ID** | RISK-B04 |
| **Categoria** | Business |
| **Descrizione** | Competitor potrebbero rilasciare features simili prima |
| **Probabilità** | 2 - Improbabile |
| **Impatto** | 2 - Minore |
| **Risk Score** | 4 - 🟢 BASSO |
| **Owner** | Product Owner |
| **Trigger** | Market analysis negativa |
| **Mitigazione** | - Focus su differenziazione<br>- Velocità delivery<br>- Feedback clienti<br>- Roadmap agile |
| **Contingency** | Pivot features prioritarie |
| **Status** | 🟢 Accettato |

### RISK-B05: Budget Overrun
| Campo | Valore |
|-------|--------|
| **ID** | RISK-B05 |
| **Categoria** | Business |
| **Descrizione** | Costi sviluppo potrebbero superare budget previsto |
| **Probabilità** | 3 - Possibile |
| **Impatto** | 3 - Moderato |
| **Risk Score** | 9 - 🟡 MEDIO |
| **Owner** | Project Manager |
| **Trigger** | Burn rate > 120% planned |
| **Mitigazione** | - Budget buffer 20%<br>- Weekly tracking<br>- Early warning system<br>- Scope prioritization |
| **Contingency** | Feature reduction, timeline extension |
| **Status** | 🟡 In monitoraggio |

### RISK-B06: Key Resource Turnover
| Campo | Valore |
|-------|--------|
| **ID** | RISK-B06 |
| **Categoria** | Business |
| **Descrizione** | Perdita sviluppatori chiave potrebbe ritardare progetto |
| **Probabilità** | 2 - Improbabile |
| **Impatto** | 4 - Significativo |
| **Risk Score** | 8 - 🟡 MEDIO |
| **Owner** | Project Manager |
| **Trigger** | Resignation notice |
| **Mitigazione** | - Knowledge sharing<br>- Documentazione completa<br>- Code reviews<br>- Team cross-training |
| **Contingency** | Contractor backup, accelerated hiring |
| **Status** | 🟡 Preventivo |

---

## 5. RISCHI COMPLIANCE

### RISK-C01: GDPR Violation
| Campo | Valore |
|-------|--------|
| **ID** | RISK-C01 |
| **Categoria** | Compliance |
| **Descrizione** | Non conformità GDPR potrebbe causare sanzioni fino a 4% fatturato |
| **Probabilità** | 2 - Improbabile |
| **Impatto** | 5 - Critico |
| **Risk Score** | 10 - 🟠 ALTO |
| **Owner** | DPO |
| **Trigger** | Data breach, complaint autorità |
| **Mitigazione** | - Soft delete obbligatorio<br>- Audit log completo<br>- Consent management<br>- Data encryption<br>- Right to erasure |
| **Contingency** | Incident response plan, legal counsel |
| **Status** | ✅ Framework implementato |

### RISK-C02: Data Breach PHI
| Campo | Valore |
|-------|--------|
| **ID** | RISK-C02 |
| **Categoria** | Compliance |
| **Descrizione** | Esposizione dati sanitari protetti (PHI) |
| **Probabilità** | 2 - Improbabile |
| **Impatto** | 5 - Critico |
| **Risk Score** | 10 - 🟠 ALTO |
| **Owner** | Security Lead |
| **Trigger** | Unauthorized access, data exfiltration |
| **Mitigazione** | - Encryption at rest/transit<br>- Access control RBAC<br>- Audit logging<br>- Penetration testing<br>- Security training |
| **Contingency** | Breach notification procedure, forensics |
| **Status** | 🟡 In implementazione |

### RISK-C03: Consent Management
| Campo | Valore |
|-------|--------|
| **ID** | RISK-C03 |
| **Categoria** | Compliance |
| **Descrizione** | Mancanza tracciamento consensi potrebbe invalidare trattamento dati |
| **Probabilità** | 3 - Possibile |
| **Impatto** | 4 - Significativo |
| **Risk Score** | 12 - 🟠 ALTO |
| **Owner** | DPO |
| **Trigger** | Consent record mancante per operazione |
| **Mitigazione** | - ConsentRecord per ogni PII<br>- Version tracking<br>- Expiry management<br>- Proof of consent |
| **Contingency** | Re-consent campaign |
| **Status** | 🟡 Da completare |

### RISK-C04: Audit Trail Incompletezza
| Campo | Valore |
|-------|--------|
| **ID** | RISK-C04 |
| **Categoria** | Compliance |
| **Descrizione** | Audit trail incompleto potrebbe non soddisfare requisiti normativi |
| **Probabilità** | 2 - Improbabile |
| **Impatto** | 4 - Significativo |
| **Risk Score** | 8 - 🟡 MEDIO |
| **Owner** | Tech Lead |
| **Trigger** | Audit finding, gap analysis |
| **Mitigazione** | - GdprAuditLog automatico<br>- Before/after snapshots<br>- User tracking<br>- IP logging |
| **Contingency** | Manual audit completion |
| **Status** | ✅ Implementato |

### RISK-C05: Data Retention Violation
| Campo | Valore |
|-------|--------|
| **ID** | RISK-C05 |
| **Categoria** | Compliance |
| **Descrizione** | Dati mantenuti oltre periodo legale o cancellati troppo presto |
| **Probabilità** | 3 - Possibile |
| **Impatto** | 3 - Moderato |
| **Risk Score** | 9 - 🟡 MEDIO |
| **Owner** | DPO |
| **Trigger** | Retention policy violation |
| **Mitigazione** | - Retention policy per data type<br>- Automated cleanup jobs<br>- Legal hold capability<br>- Compliance dashboard |
| **Contingency** | Manual review, legal consultation |
| **Status** | 🟡 Da implementare |

### RISK-C06: Access Control Bypass
| Campo | Valore |
|-------|--------|
| **ID** | RISK-C06 |
| **Categoria** | Compliance |
| **Descrizione** | Bypass controlli accesso potrebbe esporre dati non autorizzati |
| **Probabilità** | 2 - Improbabile |
| **Impatto** | 5 - Critico |
| **Risk Score** | 10 - 🟠 ALTO |
| **Owner** | Security Lead |
| **Trigger** | Unauthorized access in logs |
| **Mitigazione** | - RBAC con 55+ permissions<br>- Middleware obbligatorio<br>- Principle of least privilege<br>- Regular access review |
| **Contingency** | Immediate access revocation, investigation |
| **Status** | ✅ Framework attivo |

### RISK-C07: Third-party Compliance
| Campo | Valore |
|-------|--------|
| **ID** | RISK-C07 |
| **Categoria** | Compliance |
| **Descrizione** | Vendor/servizi terzi potrebbero non essere GDPR compliant |
| **Probabilità** | 2 - Improbabile |
| **Impatto** | 4 - Significativo |
| **Risk Score** | 8 - 🟡 MEDIO |
| **Owner** | DPO |
| **Trigger** | Vendor audit failure |
| **Mitigazione** | - DPA con tutti i vendor<br>- Vendor assessment<br>- EU-based services preference<br>- Regular review |
| **Contingency** | Vendor replacement plan |
| **Status** | 🟡 Da verificare |

---

## 6. RISCHI OPERATIVI

### RISK-O01: System Downtime
| Campo | Valore |
|-------|--------|
| **ID** | RISK-O01 |
| **Categoria** | Operativo |
| **Descrizione** | Downtime sistema durante orari operativi poliambulatorio |
| **Probabilità** | 2 - Improbabile |
| **Impatto** | 5 - Critico |
| **Risk Score** | 10 - 🟠 ALTO |
| **Owner** | DevOps Lead |
| **Trigger** | Service unavailable > 5 min |
| **Mitigazione** | - 99.9% SLA target<br>- Multi-AZ deployment<br>- Health checks<br>- Auto-scaling<br>- Runbooks |
| **Contingency** | Failover automatico, DR site |
| **Status** | 🟡 Da implementare |

### RISK-O02: Backup Failure
| Campo | Valore |
|-------|--------|
| **ID** | RISK-O02 |
| **Categoria** | Operativo |
| **Descrizione** | Backup non funzionanti potrebbero causare data loss |
| **Probabilità** | 2 - Improbabile |
| **Impatto** | 5 - Critico |
| **Risk Score** | 10 - 🟠 ALTO |
| **Owner** | DevOps Lead |
| **Trigger** | Backup job failure, restore test failure |
| **Mitigazione** | - Daily automated backups<br>- Cross-region replication<br>- Monthly restore tests<br>- Backup monitoring alerts |
| **Contingency** | Point-in-time recovery, manual restore |
| **Status** | 🟡 Da implementare |

### RISK-O03: Deployment Failure
| Campo | Valore |
|-------|--------|
| **ID** | RISK-O03 |
| **Categoria** | Operativo |
| **Descrizione** | Deployment in production potrebbe fallire o causare regressioni |
| **Probabilità** | 3 - Possibile |
| **Impatto** | 3 - Moderato |
| **Risk Score** | 9 - 🟡 MEDIO |
| **Owner** | DevOps Lead |
| **Trigger** | Deployment failure, post-deploy errors |
| **Mitigazione** | - CI/CD pipeline completa<br>- Staging environment<br>- Canary deployments<br>- Rollback automatico |
| **Contingency** | Immediate rollback, hotfix process |
| **Status** | 🟡 In configurazione |

### RISK-O04: Monitoring Blind Spots
| Campo | Valore |
|-------|--------|
| **ID** | RISK-O04 |
| **Categoria** | Operativo |
| **Descrizione** | Mancanza monitoring potrebbe nascondere problemi |
| **Probabilità** | 3 - Possibile |
| **Impatto** | 3 - Moderato |
| **Risk Score** | 9 - 🟡 MEDIO |
| **Owner** | DevOps Lead |
| **Trigger** | Issue scoperto da utente, non da monitoring |
| **Mitigazione** | - APM (Application Performance Monitoring)<br>- Log aggregation<br>- Alerting rules<br>- Synthetic monitoring |
| **Contingency** | Manual investigation, user feedback |
| **Status** | 🟡 Da implementare |

### RISK-O05: Incident Response
| Campo | Valore |
|-------|--------|
| **ID** | RISK-O05 |
| **Categoria** | Operativo |
| **Descrizione** | Risposta lenta a incidenti potrebbe estendere impatto |
| **Probabilità** | 2 - Improbabile |
| **Impatto** | 4 - Significativo |
| **Risk Score** | 8 - 🟡 MEDIO |
| **Owner** | DevOps Lead |
| **Trigger** | MTTR > 1h |
| **Mitigazione** | - Runbooks documentati<br>- On-call rotation<br>- Escalation matrix<br>- Post-mortem process |
| **Contingency** | External support, vendor escalation |
| **Status** | 🟡 Da definire |

---

## 7. MATRICE PROBABILITÀ/IMPATTO

```
                           I M P A T T O
                    1      2      3      4      5
               ┌──────┬──────┬──────┬──────┬──────┐
             5 │      │      │      │      │      │
  P            ├──────┼──────┼──────┼──────┼──────┤
  R          4 │      │      │ T04  │ T01  │      │
  O            ├──────┼──────┼──────┼──────┼──────┤
  B          3 │      │      │T05,6 │ T03  │      │
  A            │      │      │T09,B3│ B01  │      │
  B            │      │      │B5,C5 │ B02  │      │
  I            │      │      │O3,O4 │ C03  │      │
  L            ├──────┼──────┼──────┼──────┼──────┤
  I          2 │      │ B04  │      │T10,B6│T02,T07│
  T            │      │      │      │C4,C7 │T08,C01│
  À            │      │      │      │ O05  │C02,C06│
               │      │      │      │      │O01,O02│
               ├──────┼──────┼──────┼──────┼──────┤
             1 │      │      │      │      │      │
               └──────┴──────┴──────┴──────┴──────┘

LEGENDA:
┌──────────────┬────────────────────┐
│ Score 1-4    │ 🟢 BASSO - Accept  │
│ Score 5-9    │ 🟡 MEDIO - Monitor │
│ Score 10-14  │ 🟠 ALTO - Mitigate │
│ Score 15-25  │ 🔴 CRITICO - Act   │
└──────────────┴────────────────────┘
```

---

## 8. PIANI DI MITIGAZIONE

### 8.1 Top 10 Risk Mitigation Actions

| Priority | Risk ID | Action | Owner | Deadline | Status |
|----------|---------|--------|-------|----------|--------|
| 1 | T01 | Implementare caching Redis per query frequenti | Backend | Sprint 4 | 🟡 Planned |
| 2 | C01 | Completare framework GDPR (consent, retention) | DPO | Sprint 3 | 🟡 In corso |
| 3 | T03 | Implementare optimistic locking agenda | Backend | Sprint 5 | ⬜ Todo |
| 4 | C02 | Security audit e penetration testing | Security | Sprint 8 | ⬜ Todo |
| 5 | O01 | Configurare multi-AZ e failover | DevOps | Sprint 7 | ⬜ Todo |
| 6 | T07 | Implementare signed URLs con expiry breve | Backend | Sprint 6 | ⬜ Todo |
| 7 | B01 | Definire change control process | PM | Sprint 1 | ✅ Done |
| 8 | O02 | Configurare backup cross-region | DevOps | Sprint 2 | 🟡 In corso |
| 9 | T04 | Ottimizzare PDF generation con pool | Backend | Sprint 4 | ✅ Done |
| 10 | C03 | Completare consent management UI | Frontend | Sprint 5 | ⬜ Todo |

### 8.2 Technical Mitigations Detail

#### Database Performance (T01)
```typescript
// Mitigation: Query optimization con include selettivi
const appointments = await prisma.appointment.findMany({
  where: { 
    tenantId, 
    deletedAt: null,
    date: { gte: startDate, lte: endDate }
  },
  include: {
    patient: { select: { id: true, firstName: true, lastName: true } },
    doctor: { select: { id: true, firstName: true, lastName: true } },
    service: { select: { id: true, name: true, duration: true } }
  },
  // Index: @@index([tenantId, deletedAt, date])
});

// Mitigation: Redis caching per slot disponibili
const cacheKey = `slots:${tenantId}:${ambulatorioId}:${date}`;
let slots = await redis.get(cacheKey);
if (!slots) {
  slots = await calculateAvailableSlots(...);
  await redis.setex(cacheKey, 300, JSON.stringify(slots)); // 5 min TTL
}
```

#### Multi-tenant Isolation (T02)
```typescript
// Mitigation: Middleware obbligatorio
const tenantIsolation = async (req, res, next) => {
  const { tenantId } = req.user;
  if (!tenantId) {
    return res.status(403).json({ error: 'Tenant required' });
  }
  
  // Inject tenant filter in all queries
  req.tenantFilter = { tenantId, deletedAt: null };
  next();
};

// Test automatico isolation (7/7 passing)
describe('Tenant Isolation', () => {
  it('should not access other tenant data', async () => {
    const response = await request(app)
      .get('/api/v1/patients')
      .set('Authorization', `Bearer ${tenant2Token}`);
    
    expect(response.body.every(p => p.tenantId === tenant2Id)).toBe(true);
  });
});
```

---

## 9. CONTINGENCY PLANS

### 9.1 System Outage Contingency

```
┌─────────────────────────────────────────────────────────────┐
│              SYSTEM OUTAGE RESPONSE PLAN                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  T+0min   ┌─────────────────────┐                           │
│     ───▶  │ Alert Triggered     │                           │
│           └──────────┬──────────┘                           │
│                      ▼                                       │
│  T+5min   ┌─────────────────────┐                           │
│     ───▶  │ On-call Notified    │                           │
│           └──────────┬──────────┘                           │
│                      ▼                                       │
│  T+15min  ┌─────────────────────┐                           │
│     ───▶  │ Initial Assessment  │                           │
│           │ - Scope of impact   │                           │
│           │ - Root cause hypo   │                           │
│           └──────────┬──────────┘                           │
│                      ▼                                       │
│  T+30min  ┌─────────────────────┐    ┌──────────────────┐   │
│     ───▶  │ Decision Point      │───▶│ Rollback?        │   │
│           └──────────┬──────────┘    │ Failover?        │   │
│                      │               │ Hotfix?          │   │
│                      ▼               └──────────────────┘   │
│  T+60min  ┌─────────────────────┐                           │
│     ───▶  │ Resolution          │                           │
│           │ Target MTTR: <1h    │                           │
│           └──────────┬──────────┘                           │
│                      ▼                                       │
│  T+24h    ┌─────────────────────┐                           │
│     ───▶  │ Post-mortem         │                           │
│           └─────────────────────┘                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Data Breach Contingency

| Phase | Timeline | Actions |
|-------|----------|---------|
| **Detection** | T+0 | Alert triggered, security team notified |
| **Containment** | T+1h | Isolate affected systems, revoke compromised credentials |
| **Assessment** | T+4h | Determine scope, affected data, root cause |
| **Notification** | T+24h | Notify DPO, prepare GDPR notification (72h requirement) |
| **Regulatory** | T+72h | Submit breach notification to authority |
| **User Notification** | T+7d | Notify affected users if required |
| **Remediation** | T+14d | Implement fixes, security improvements |
| **Review** | T+30d | Post-incident review, update procedures |

### 9.3 Rollback Procedures

```bash
# Database Rollback
# Step 1: Stop application
pm2 stop all

# Step 2: Verify backup
aws s3 ls s3://backups/db/ | tail -5

# Step 3: Restore from backup
pg_restore -h $DB_HOST -d elementmedica backup_YYYYMMDD.dump

# Step 4: Rollback migration if needed
npx prisma migrate resolve --rolled-back "migration_name"

# Step 5: Deploy previous version
git checkout v1.x.x
npm run build
pm2 restart all

# Step 6: Verify
curl http://localhost:4001/health
```

---

## 10. MONITORAGGIO E REVISIONE

### 10.1 Risk Review Schedule

| Frequenza | Attività | Partecipanti |
|-----------|----------|--------------|
| **Daily** | Check critical alerts | DevOps |
| **Weekly** | Risk status update | Tech Lead |
| **Bi-weekly** | Sprint risk review | Full team |
| **Monthly** | Risk register update | PM + Leads |
| **Quarterly** | Full risk assessment | Stakeholders |

### 10.2 Key Risk Indicators (KRIs)

| Indicator | Threshold | Current | Trend |
|-----------|-----------|---------|-------|
| Open critical risks | ≤ 3 | 3 | → Stable |
| Open high risks | ≤ 7 | 7 | → Stable |
| Mitigation completion | ≥ 70% | 45% | ↑ Improving |
| Security incidents | 0 | 0 | ✅ Green |
| SLA breaches | ≤ 1/month | 0 | ✅ Green |
| Failed deployments | ≤ 5% | 2% | ✅ Green |
| Test coverage | ≥ 75% | 75% | → Stable |

### 10.3 Risk Reporting Template

```markdown
## Weekly Risk Report - Week XX

### Executive Summary
- Total Risks: 28
- Critical: 3 (0 new, 0 closed)
- High: 7 (1 new, 0 closed)

### Top Risks This Week
1. [RISK-T01] Database complexity - Mitigation in progress
2. [RISK-C03] Consent management - Sprint 5 target

### New Risks Identified
- [RISK-XX] Description

### Risks Closed
- None

### Upcoming Milestones
- Sprint 4: Redis caching implementation
- Sprint 5: Consent management completion

### Blockers/Escalations
- None
```

---

## 📎 ALLEGATI

### A. Risk Assessment Checklist

- [ ] Tutti i requisiti REQ-* hanno rischi identificati?
- [ ] Tutti i componenti architetturali hanno rischi tecnici?
- [ ] GDPR/Compliance risks completamente mappati?
- [ ] Operational risks per ogni ambiente?
- [ ] Mitigation plan per ogni rischio ALTO/CRITICO?
- [ ] Contingency plan per rischi CRITICI?
- [ ] Owner assegnato a ogni rischio?
- [ ] Timeline mitigation realistica?

### B. Riferimenti

| Documento | Link |
|-----------|------|
| SPEC_14_SICUREZZA | `./specs/SPEC_14_SICUREZZA.md` |
| SPEC_12_AUDIT_GDPR | `./specs/SPEC_12_AUDIT_GDPR.md` |
| 06_ARCHITETTURA_TECNICA | `./06_ARCHITETTURA_TECNICA.md` |
| 08_MATRICE_TRACCIABILITA | `./08_MATRICE_TRACCIABILITA.md` |

---

*Documento soggetto a revisione mensile*  
*Prossima revisione: 2025-02-14*
