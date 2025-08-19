# 📦 Deployment Documentation

**Versione**: 2.0 Post-Refactoring  
**Data**: 25 Gennaio 2025  
**Stato**: Sistema Completamente Refactorizzato e GDPR-Compliant

## 🎯 Panoramica

Questa cartella contiene tutta la documentazione relativa al deployment del sistema unificato Person con GDPR compliance. Il sistema è basato su un'architettura a tre server che garantisce separazione dei concern e scalabilità.

## 📁 Struttura Documentazione

- **[deployment-guide.md](./deployment-guide.md)** - Guida completa al deployment
- **[environment-setup.md](./environment-setup.md)** - Configurazione ambiente
- **[server-management.md](./server-management.md)** - Gestione server e processi
- **[monitoring.md](./monitoring.md)** - Monitoraggio e health checks
- **[backup-restore.md](./backup-restore.md)** - Procedure backup e restore
- **[security.md](./security.md)** - Configurazioni di sicurezza

## 🏗️ Architettura Sistema

### Tre Server Obbligatori

#### 1. API Server (Porta 4001)
- **Responsabilità**: Business logic, autenticazione, database
- **Tecnologie**: Node.js, Express, Prisma, PostgreSQL
- **Endpoint**: `/api/*`

#### 2. Documents Server (Porta 4002)
- **Responsabilità**: Generazione PDF, template management
- **Tecnologie**: Node.js, PDF generation libraries
- **Endpoint**: `/generate/*`, `/templates/*`

#### 3. Proxy Server (Porta 4003)
- **Responsabilità**: Routing, CORS, rate limiting
- **Tecnologie**: Node.js, Express
- **Endpoint**: Entry point per tutte le richieste

## 🚫 Regole Critiche Deployment

### ⚠️ DIVIETO ASSOLUTO GESTIONE SERVER
- **🚫 NON riavviare** server senza autorizzazione
- **🚫 NON killare** processi server
- **🚫 NON modificare** configurazioni di processo
- **✅ RICHIEDERE** autorizzazione al proprietario per interventi

### 🔑 Credenziali Test Standard
- **Email**: `admin@example.com`
- **Password**: `Admin123!`
- **Utilizzo**: SOLO per testing e sviluppo

### 🛡️ Protezione Sistema Login
- **Massima attenzione** su modifiche autenticazione
- **Testing obbligatorio** prima di ogni modifica
- **Backup automatico** prima di modifiche critiche

## 🚀 Quick Start

1. **Prerequisiti**: Node.js 18+, PostgreSQL 14+, PM2
2. **Configurazione**: Seguire [environment-setup.md](./environment-setup.md)
3. **Deployment**: Seguire [deployment-guide.md](./deployment-guide.md)
4. **Monitoraggio**: Configurare [monitoring.md](./monitoring.md)

## 📞 Supporto

Per problemi di deployment:
1. Consultare [troubleshooting](../troubleshooting/)
2. Verificare logs dei server
3. Contattare il proprietario del sistema per interventi sui server

---

**⚠️ Importante**: Rispettare sempre le regole di gestione server. Ogni intervento non autorizzato può compromettere la stabilità del sistema.