# 📦 Deployment Documentation

**Versione**: 3.0 - ElementMedica Production  
**Data**: Dicembre 2024  
**Dominio**: elementmedica.com  
**Stato**: Sistema Pronto per Production Deployment

## 🎯 Panoramica

Questa cartella contiene la documentazione per il deployment in produzione di ElementMedica.
Tutta la documentazione è stata consolidata in un'unica guida completa.

## 📁 Struttura Documentazione

| File | Descrizione |
|------|-------------|
| **[DEPLOYMENT_GUIDE_UNIFIED.md](./DEPLOYMENT_GUIDE_UNIFIED.md)** | ✅ **GUIDA PRINCIPALE** - Documentazione completa e consolidata |
| `archive/` | 📦 Documenti storici (obsoleti, mantenuti per riferimento) |

## 🚀 Quick Start

**Per il deployment, consultare esclusivamente:**

→ **[DEPLOYMENT_GUIDE_UNIFIED.md](./DEPLOYMENT_GUIDE_UNIFIED.md)**

Questa guida include:
- ✅ Credenziali complete (Hetzner, Supabase, GitHub, S3)
- ✅ Architettura 3 server (API:4001, Documents:4002, Proxy:4003)
- ✅ Setup Hetzner VPS step-by-step
- ✅ Configurazione Nginx con SSL
- ✅ Configurazione PM2
- ✅ Setup database Supabase
- ✅ DNS e dominio elementmedica.com
- ✅ Monitoring e health checks
- ✅ Backup e disaster recovery
- ✅ Troubleshooting completo

## 🏗️ Architettura Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                        INTERNET                              │
│                     elementmedica.com                        │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS (443)
┌───────────────────────────▼─────────────────────────────────┐
│                      NGINX PROXY                             │
│                   (SSL Termination)                          │
└───────┬───────────────────┬─────────────────────┬───────────┘
        │                   │                     │
        ▼                   ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  Frontend     │   │  Proxy Server │   │  Direct API   │
│  (Static)     │   │  :4003        │   │  :4001/:4002  │
└───────────────┘   └───────┬───────┘   └───────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
    ┌───────────────┐               ┌───────────────┐
    │  API Server   │               │  Documents    │
    │  :4001        │               │  Server :4002 │
    └───────┬───────┘               └───────────────┘
            │
            ▼
    ┌───────────────────────────────────────────────┐
    │           SUPABASE POSTGRESQL                  │
    │     (aws-1-eu-central-1.pooler.supabase.com)  │
    └───────────────────────────────────────────────┘
```

## 📦 Archive

La cartella `archive/` contiene i documenti storici che sono stati consolidati:
- `backup-restore.md` - Procedure backup (→ consolidato)
- `database.md` - Configurazione DB (→ consolidato)
- `deployment-guide.md` - Vecchia guida (→ consolidato)
- `disaster-recovery.md` - DR procedures (→ consolidato)
- `DOCKER_CONTAINERIZATION_GUIDE.md` - Docker setup (→ consolidato)
- `environment-setup.md` - Ambiente (→ consolidato)
- `monitoring.md` - Monitoring (→ consolidato)
- `optimization-summary.md` - Ottimizzazioni (→ consolidato)
- `phase7-deployment-notes.md` - Note fase 7 (→ consolidato)
- `PREVENTIVI_DEPLOYMENT.md` - Preventivi (→ consolidato)
- `prisma-migrations.md` - Migrazioni (→ consolidato)
- `server-management.md` - Gestione server (→ consolidato)
- `template-management-phase0-setup.md` - Template setup (→ consolidato)

## ⚠️ Regole Critiche

1. **NON modificare credenziali** senza autorizzazione
2. **NON riavviare server** senza autorizzazione
3. **SEMPRE fare backup** prima di modifiche
4. **SEMPRE testare** in staging prima di production

---

**📌 Riferimento principale: [DEPLOYMENT_GUIDE_UNIFIED.md](./DEPLOYMENT_GUIDE_UNIFIED.md)**