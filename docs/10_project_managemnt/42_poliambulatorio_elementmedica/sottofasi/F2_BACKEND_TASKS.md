# 🔌 FASE 2: BACKEND API - Sottofasi Dettagliate

## F2.1 Setup API Clinica (1 giorno)
| Task | Descrizione | Ore |
|------|-------------|-----|
| F2.1.1 | Router `/api/v1/clinica` setup | 2 |
| F2.1.2 | Middleware auditClinico | 3 |
| F2.1.3 | Validazione schemas Joi | 3 |

## F2.2 API Struttura (3 giorni)
| Task | Descrizione | Ore |
|------|-------------|-----|
| F2.2.1 | CRUD Poliambulatorio | 4 |
| F2.2.2 | CRUD Sedi | 4 |
| F2.2.3 | CRUD Ambulatori | 4 |
| F2.2.4 | CRUD Orari Ambulatori | 4 |
| F2.2.5 | Test endpoints struttura | 4 |

## F2.3 API Strumentario (2 giorni)
| Task | Descrizione | Ore |
|------|-------------|-----|
| F2.3.1 | CRUD Strumenti | 4 |
| F2.3.2 | CRUD Manutenzioni | 4 |
| F2.3.3 | Report ROI strumenti | 3 |
| F2.3.4 | Test endpoints | 3 |

## F2.4 API Catalogo (3 giorni)
| Task | Descrizione | Ore |
|------|-------------|-----|
| F2.4.1 | CRUD Prestazioni | 4 |
| F2.4.2 | CRUD Template Campi Visita | 4 |
| F2.4.3 | API associazione prestazione-ambulatorio | 3 |
| F2.4.4 | API associazione prestazione-medico | 3 |
| F2.4.5 | Test endpoints catalogo | 4 |

## F2.5 API Listini (2 giorni)
| Task | Descrizione | Ore |
|------|-------------|-----|
| F2.5.1 | CRUD Listini | 4 |
| F2.5.2 | CRUD Prezzi per listino | 4 |
| F2.5.3 | API applicazione sconti | 3 |
| F2.5.4 | Test calcolo prezzi | 3 |

## F2.6 API Convenzioni (2 giorni)
| Task | Descrizione | Ore |
|------|-------------|-----|
| F2.6.1 | CRUD Convenzioni | 4 |
| F2.6.2 | API listini convenzionati | 4 |
| F2.6.3 | Verifica validità convenzione | 3 |
| F2.6.4 | Test endpoints | 3 |

## F2.7 API Agenda Base (3 giorni)
| Task | Descrizione | Ore |
|------|-------------|-----|
| F2.7.1 | CRUD Slot Disponibilità | 4 |
| F2.7.2 | API calcolo disponibilità | 5 |
| F2.7.3 | API verifica conflitti | 4 |
| F2.7.4 | Test slot liberi | 4 |

## F2.8 API Appuntamenti (4 giorni)
| Task | Descrizione | Ore |
|------|-------------|-----|
| F2.8.1 | CRUD Appuntamenti | 4 |
| F2.8.2 | API prenotazione con validazione | 4 |
| F2.8.3 | API cambio stato (workflow) | 4 |
| F2.8.4 | API accettazione paziente | 3 |
| F2.8.5 | API chiamata paziente | 3 |
| F2.8.6 | Test workflow completo | 6 |

## F2.9 API Visite (3 giorni)
| Task | Descrizione | Ore |
|------|-------------|-----|
| F2.9.1 | CRUD Visite | 4 |
| F2.9.2 | API inizio/fine visita | 3 |
| F2.9.3 | API salvataggio campi | 4 |
| F2.9.4 | API template campi dinamici | 4 |
| F2.9.5 | Test flusso visita | 4 |

## F2.10 API Referti (3 giorni)
| Task | Descrizione | Ore |
|------|-------------|-----|
| F2.10.1 | CRUD Referti | 4 |
| F2.10.2 | API versioning (event sourcing) | 5 |
| F2.10.3 | API firma digitale | 4 |
| F2.10.4 | API generazione PDF | 4 |
| F2.10.5 | Test immutabilità firmato | 4 |

## F2.11 API Documenti (2 giorni)
| Task | Descrizione | Ore |
|------|-------------|-----|
| F2.11.1 | Upload documenti clinici | 4 |
| F2.11.2 | Download con audit | 3 |
| F2.11.3 | Storage S3/GCS integration | 4 |
| F2.11.4 | Test upload/download | 3 |

---
**TOTALE FASE 2**: 24 giorni, 44 task, ~160 ore
