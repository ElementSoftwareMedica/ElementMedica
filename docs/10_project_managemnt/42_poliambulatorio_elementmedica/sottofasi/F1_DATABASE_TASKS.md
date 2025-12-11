# 🗃️ FASE 1: DATABASE - Sottofasi Dettagliate

## F1.1 Struttura Core (3 giorni)
| Task | Descrizione | File | Ore |
|------|-------------|------|-----|
| F1.1.1 | Modello Poliambulatorio | schema.prisma | 4 |
| F1.1.2 | Modello Sede + Indirizzo | schema.prisma | 4 |
| F1.1.3 | Migration + seed base | migration.sql | 4 |
| F1.1.4 | Test CRUD base | tests/ | 4 |

## F1.2 Ambulatori (2 giorni)
| Task | Descrizione | File | Ore |
|------|-------------|------|-----|
| F1.2.1 | Modello Ambulatorio | schema.prisma | 3 |
| F1.2.2 | Modello OrarioAmbulatorio | schema.prisma | 3 |
| F1.2.3 | Migration + seed | migration.sql | 3 |
| F1.2.4 | Test isolamento tenant | tests/ | 3 |

## F1.3 Strumentario (2 giorni)
| Task | Descrizione | File | Ore |
|------|-------------|------|-----|
| F1.3.1 | Modello Strumento | schema.prisma | 3 |
| F1.3.2 | Modello ManutenzioneStrumento | schema.prisma | 3 |
| F1.3.3 | Migration + seed | migration.sql | 3 |
| F1.3.4 | Test relazioni | tests/ | 3 |

## F1.4 Catalogo Prestazioni (2 giorni)
| Task | Descrizione | File | Ore |
|------|-------------|------|-----|
| F1.4.1 | Modello Prestazione | schema.prisma | 4 |
| F1.4.2 | Modello TemplateCampoVisita | schema.prisma | 4 |
| F1.4.3 | Migration + seed | migration.sql | 2 |
| F1.4.4 | Test associazioni | tests/ | 2 |

## F1.5 Listini e Convenzioni (2 giorni)
| Task | Descrizione | File | Ore |
|------|-------------|------|-----|
| F1.5.1 | Modello Listino + ListinoPrestazione | schema.prisma | 3 |
| F1.5.2 | Modello Convenzione + ConvenzioneListino | schema.prisma | 3 |
| F1.5.3 | Modello CodiceSconto | schema.prisma | 3 |
| F1.5.4 | Migration + seed | migration.sql | 3 |

## F1.6 Agenda (3 giorni)
| Task | Descrizione | File | Ore |
|------|-------------|------|-----|
| F1.6.1 | Modello SlotDisponibilita | schema.prisma | 4 |
| F1.6.2 | Modello Appuntamento (base) | schema.prisma | 4 |
| F1.6.3 | Modello NumeroChiamata | schema.prisma | 2 |
| F1.6.4 | Migration + seed | migration.sql | 4 |
| F1.6.5 | Test slot conflicts | tests/ | 4 |

## F1.7 Clinica (3 giorni)
| Task | Descrizione | File | Ore |
|------|-------------|------|-----|
| F1.7.1 | Modello Visita | schema.prisma | 4 |
| F1.7.2 | Modello ValoreCampoVisita | schema.prisma | 2 |
| F1.7.3 | Modello Referto + VersioneReferto | schema.prisma | 4 |
| F1.7.4 | Modello FirmaDigitale | schema.prisma | 2 |
| F1.7.5 | Migration + seed | migration.sql | 4 |

## F1.8 Audit e Sicurezza (1 giorno)
| Task | Descrizione | File | Ore |
|------|-------------|------|-----|
| F1.8.1 | Modello AuditLogClinico | schema.prisma | 3 |
| F1.8.2 | Trigger audit automatici | triggers.sql | 2 |
| F1.8.3 | Indexes ottimizzati | migration.sql | 3 |

---
**TOTALE FASE 1**: 14 giorni, 28 task, ~100 ore
