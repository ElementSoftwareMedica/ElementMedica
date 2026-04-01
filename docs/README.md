# 📚 Documentazione ElementMedica

**Versione**: 3.0.0  
**Data**: 13 Marzo 2026  
**Stato**: Produzione (~93% Complete)

---

## 🎯 Quick Start

```bash
# Avvio ambiente sviluppo
./start-dev-environment.sh

# Health checks
curl http://localhost:4001/health  # API Server
curl http://localhost:4002/health  # Documents Server

# Test login
curl -X POST http://localhost:4001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"Admin123!"}'
```

---

## 📁 Struttura Documentazione

| Cartella | Contenuto |
|----------|-----------|
| [00-overview](./00-overview/) | Executive Summary, Sintesi Stato, Analisi R33 |
| [01-architecture](./01-architecture/) | Architettura tecnica, multi-tenant, CMS/SSG |
| [02-backend](./02-backend/) | API, GDPR, security audit, roles, billing, timezone |
| [03-frontend](./03-frontend/) | Design system, color system, SEO |
| [04-features](./04-features/) | Moduli: Clinica, Formazione, Management |
| [05-deployment](./05-deployment/) | Deployment Hetzner, server management |
| [06-guides](./06-guides/) | Manuale utente, admin, troubleshooting |
| [07-testing](./07-testing/) | Testing strategy |
| [08-projects](./08-projects/) | Progetti P42-P97, Revisioni R20-R33 |

---

## 🏗️ Architettura Sistema

> **P64**: Proxy server (4003) ELIMINATO - In dev Vite proxy, in prod Nginx routing diretto.

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                 │
│              Port 5173 (dev) / Nginx (prod)                │
└─────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                                   │
    ┌───────▼───────┐                   ┌───────▼───────┐
    │  API SERVER   │                   │   DOCUMENTS   │
    │   Port 4001   │                   │    SERVER     │
    │ Prisma, RBAC  │                   │   Port 4002   │
    │ CORS, Auth    │                   │   PDF, Files  │
    └───────┬───────┘                   └───────────────┘
            │         
    ┌───────▼───────┐   ┌───────────────┐
    │  PostgreSQL   │   │    REDIS      │
    │   (Supabase)  │   │   Port 6379   │
    └───────────────┘   └───────────────┘
```

---

## 🔑 Credenziali Test

| Campo | Valore |
|-------|--------|
| **Email** | admin@example.com |
| **Password** | Admin123! |
| **Ruolo** | ADMIN |

⚠️ **Non modificare** senza autorizzazione esplicita.

---

## 📊 Stato Progetto

| Metrica | Valore |
|---------|--------|
| **Completion** | ~93% |
| **Sicurezza (OWASP)** | 9.2/10 |
| **TypeScript Errors** | 0 |
| **Test Coverage** | 75% |
| **Build Time** | ~10s |

### Branch Implementati

| Branch | Stato | Descrizione |
|--------|-------|-------------|
| **MEDICA** | ✅ 94% | Poliambulatorio, visite, MDL, fatturazione, firma digitale |
| **FORMAZIONE** | ✅ 95% | Corsi, attestati, schedules, credenziali |
| **MANAGEMENT** | ✅ 97% | HR, ruoli, tariffari, dashboard finanziaria |

### Progetti (P42-P97 + R20-R33)

**Completati**: P42-P49, P51-P58, P59 (4 sub), P60, P63-P65, P67-P71, P74, P97, R20-R32  
**In Corso**: P61 (questionari), P66 (MDL workflow), P72 (schema clinico), P75 (public API), R33 (audit)

Per dettagli → [SYNTHESIS-STATUS.md](./00-overview/SYNTHESIS-STATUS.md) | [R33-PROGRESS-ANALYSIS.md](./00-overview/R33-PROGRESS-ANALYSIS.md)

---

## 🔗 Link Rapidi

- [Guida Deployment](./05-deployment/DEPLOYMENT_GUIDE.md)
- [API Reference](./02-backend/API_REFERENCE.md)
- [Manuale Admin](./06-guides/ADMIN_MANUAL.md)
- [Troubleshooting](./06-guides/TROUBLESHOOTING.md)
- [Changelog](./CHANGELOG.md)

---

## 📋 Regole Sviluppo

Vedi [.github/copilot-instructions.md](../.github/copilot-instructions.md) per le regole complete.

### Principi Chiave

1. **Multi-Tenancy**: SEMPRE `tenantId` + `deletedAt: null` in ogni query
2. **GDPR**: Soft delete, audit trail, consent tracking
3. **Security**: CSRF, rate limiting, permission checks
4. **TypeScript Strict**: Zero errori, no `any`
5. **req.person**: MAI `req.user` (obsoleto)

---

*Documentazione aggiornata il 13 Marzo 2026*
