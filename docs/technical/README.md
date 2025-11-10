# 📚 Documentazione Tecnica - Project 2.0

**Versione**: 2.0 Post-Refactoring  
**Data**: 25 Gennaio 2025  
**Sistema**: Architettura Tre Server GDPR-Compliant

## 🎯 Panoramica

Questa sezione contiene la documentazione tecnica completa del sistema unificato Person, progettato per garantire compliance GDPR, scalabilità e manutenibilità attraverso un'architettura a tre server.

## 🏗️ Architettura Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    SISTEMA UNIFICATO PERSON                │
├─────────────────┬─────────────────┬─────────────────────────┤
│   API Server    │ Documents Server│    Proxy Server         │
│   (Porto 4001)  │   (Porto 4002)  │    (Porto 4003)         │
│                 │                 │                         │
│ • Person CRUD   │ • PDF Generator │ • Load Balancer         │
│ • GDPR Endpoints│ • File Storage  │ • SSL Termination       │
│ • Auth System   │ • Templates     │ • Request Routing       │
│ • Audit Logging │ • Document API  │ • Rate Limiting         │
└─────────────────┴─────────────────┴─────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │   Database      │
                    │                 │
                    │ • Person Entity │
                    │ • PersonRole    │
                    │ • GDPR Audit    │
                    │ • Consent Mgmt  │
                    └─────────────────┘
```

## 📁 Struttura Documentazione

### 🔧 [API Documentation](./api/)
Documentazione completa delle API REST del sistema:
- **Endpoints Person**: CRUD operations con GDPR compliance
- **Authentication**: Sistema PKCE con JWT e refresh tokens
- **GDPR Endpoints**: Export, deletion, consent management
- **Error Handling**: Gestione errori standardizzata

### 🏛️ [Architecture](./architecture/)
Documentazione dell'architettura del sistema:
- **System Design**: Architettura a tre server
- **Database Schema**: Modello dati unificato Person
- **Security Model**: Autenticazione, autorizzazione, GDPR
- **Integration Patterns**: Comunicazione tra servizi

### 🗄️ [Database](./database/)
Documentazione del database e modello dati:
- **Schema Design**: Entità Person unificata
- **Migrations**: Gestione versioning database
- **GDPR Compliance**: Audit trails, soft delete, consent
- **Performance**: Indexing, query optimization

### 🚀 [Deployment](./deployment/)
Documentazione per deployment e operations:
- **Environment Setup**: Configurazione ambienti
- **Server Management**: Gestione processi PM2
- **Monitoring**: Health checks e metriche
- **Backup/Restore**: Procedure di backup e disaster recovery

### 💻 [Implementation](./implementation/)
Guide implementative e best practices:
- **GDPR Implementation**: Implementazione compliance
- **System Summary**: Riepilogo architetturale
- **Code Standards**: Convenzioni e patterns
- **Security Guidelines**: Linee guida sicurezza

### 🧪 [Testing](./testing/)
Documentazione testing e quality assurance:
- **Test Strategy**: Strategia di testing
- **Unit Tests**: Test unitari
- **Integration Tests**: Test di integrazione
- **GDPR Testing**: Test compliance GDPR

## 🔑 Caratteristiche Principali

### ✅ Sistema Unificato
- **Entità Person**: Unica entità per tutti i tipi di utenti
- **Role System**: Sistema ruoli flessibile con `PersonRole`
- **Soft Delete**: Eliminazione logica con `deletedAt`
- **Audit Trail**: Tracciamento completo modifiche

### 🔒 GDPR Compliance
- **Consent Management**: Gestione consensi granulare
- **Data Export**: Export dati in formato machine-readable
- **Right to Erasure**: Cancellazione sicura dati
- **Audit Logging**: Log completo per compliance
- **Data Minimization**: Raccolta dati essenziali

### 🛡️ Security
- **PKCE Authentication**: Autenticazione sicura
- **JWT Tokens**: Token stateless con refresh
- **Role-based Access**: Controllo accessi granulare
- **Input Validation**: Validazione rigorosa input
- **SQL Injection Protection**: Protezione database

### ⚡ Performance
- **Three-Server Architecture**: Separazione responsabilità
- **Database Optimization**: Query ottimizzate e indexing
- **Caching Strategy**: Cache intelligente
- **Load Balancing**: Distribuzione carico

## 🚀 Quick Start

### Prerequisiti
```bash
# Node.js 18+
node --version

# PostgreSQL 14+
psql --version

# PM2 per process management
npm install -g pm2
```

### Setup Rapido
```bash
# 1. Clone repository
git clone <repository-url>
cd project-2.0

# 2. Install dependencies
npm install

# 3. Setup database
cp .env.example .env
# Configurare DATABASE_URL in .env

# 4. Run migrations
npx prisma migrate deploy
npx prisma db seed

# 5. Start services
pm2 start ecosystem.config.js

# 6. Verify health
curl http://localhost:4003/health
curl http://localhost:4001/health
curl http://localhost:4002/health
```

### Test Credentials
```
Email: admin@example.com
Password: Admin123!
```

## 📖 Guide Specifiche

### Per Sviluppatori
1. **[AI Assistant Guide](./AI_ASSISTANT_GUIDE.md)** - Guida per AI Assistant
2. **[Template System](./TEMPLATE_SYSTEM.md)** - Sistema template unificato
3. **[API Reference](./api/)** - Documentazione API completa
4. **[Database Schema](./database/)** - Modello dati e migrations

### Per DevOps
1. **[Deployment Guide](../deployment/deployment-guide.md)** - Guida deployment completa
2. **[Server Management](../deployment/server-management.md)** - Gestione server e processi
3. **[Monitoring](../deployment/monitoring.md)** - Monitoraggio e health checks
4. **[Backup/Restore](../deployment/backup-restore.md)** - Procedure backup
5. **[Disaster Recovery](../deployment/disaster-recovery.md)** - Procedure emergenza

### Per Security/Compliance
1. **[GDPR Implementation](./implementation/gdpr-implementation.md)** - Implementazione GDPR
2. **[Security Architecture](./architecture/)** - Architettura sicurezza
3. **[Audit Procedures](./testing/)** - Procedure audit e testing

## 🔧 Strumenti di Sviluppo

### Database
```bash
# Prisma Studio (GUI database)
npx prisma studio

# Generate Prisma Client
npx prisma generate

# Reset database (ATTENZIONE: solo in development)
npx prisma migrate reset
```

### Monitoring
```bash
# PM2 monitoring
pm2 monit

# Logs in tempo reale
pm2 logs

# Status servizi
pm2 status
```

### Testing
```bash
# Run all tests
npm test

# Run specific test suite
npm run test:unit
npm run test:integration
npm run test:gdpr

# Coverage report
npm run test:coverage
```

## 🚨 Regole Critiche

### ⛔ Assolutamente Vietato
- **Server Restart**: Mai riavviare server senza autorizzazione
- **Database Direct Access**: Usare sempre l'API
- **Production Data**: Mai usare dati reali in development
- **Credentials Hardcoding**: Mai hardcodare credenziali
- **GDPR Violations**: Rispettare sempre compliance GDPR

### ✅ Obbligatorio
- **Test Credentials**: Usare sempre `admin@example.com` / `Admin123!`
- **Audit Logging**: Loggare tutte le operazioni sensibili
- **Input Validation**: Validare sempre input utente
- **Error Handling**: Gestire sempre gli errori
- **Documentation**: Documentare modifiche significative

## 📞 Supporto

### Contatti Tecnici
- **Project Owner**: [CONFIGURARE]
- **Tech Lead**: [CONFIGURARE]
- **DevOps**: [CONFIGURARE]

### Escalation
- **L1 Issues**: Consultare documentazione
- **L2 Issues**: Contattare Tech Lead
- **L3 Issues**: Escalation completa team

### Risorse Utili
- **Repository**: [CONFIGURARE]
- **Issue Tracker**: [CONFIGURARE]
- **CI/CD Pipeline**: [CONFIGURARE]
- **Monitoring Dashboard**: [CONFIGURARE]

## 🔄 Aggiornamenti

### Changelog
- **v2.0** (25 Gen 2025): Sistema unificato Person, architettura tre server
- **v1.x**: Sistema legacy (deprecato)

### Roadmap
- **Q1 2025**: Ottimizzazioni performance
- **Q2 2025**: Nuove funzionalità GDPR
- **Q3 2025**: Scalabilità avanzata

---

**📝 Nota**: Questa documentazione è in continuo aggiornamento. Per modifiche o suggerimenti, aprire una issue nel repository del progetto.

**🔒 Security**: Tutte le informazioni sensibili sono state rimosse da questa documentazione pubblica. Per accesso a credenziali e configurazioni sensibili, contattare il team di sicurezza.