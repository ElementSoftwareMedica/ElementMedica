# Week 2: New Architecture Design

**Data Inizio:** 2024-01-08  
**Status:** ✅ COMPLETATO  
**Fase:** 1 - Analisi e Pianificazione Dettagliata

## 📋 Obiettivi Week 2
- [ ] **Design sistema modulare**
  - Definizione layer architetturali
  - Pattern di comunicazione server
  - Struttura componenti riutilizzabili
  - Sistema di routing ottimizzato

- [ ] **Progettazione sistema utenti**
  - Schema ruoli e permessi
  - Flusso autenticazione/autorizzazione
  - Gestione sessioni
  - GDPR compliance design

- [ ] **Pianificazione database**
  - Ottimizzazione schema esistente
  - Nuove tabelle per funzionalità
  - Indici e performance
  - Migration strategy

---

## 🏗️ New System Architecture

### Target Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer / CDN                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                    API Gateway                              │
│  - Authentication                                           │
│  - Rate Limiting                                           │
│  - Request Routing                                         │
│  - Monitoring                                              │
└─────────┬─────────────┬─────────────┬─────────────┬─────────┘
          │             │             │             │
┌─────────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
│   Frontend    │ │Auth Service│ │API Service│ │Doc Service│
│   (React)     │ │  (Node.js) │ │ (Node.js) │ │ (Node.js) │
│               │ │            │ │           │ │           │
│ - React 18    │ │ - JWT      │ │ - REST    │ │ - PDF Gen │
│ - Vite 5      │ │ - RBAC     │ │ - GraphQL │ │ - Templates│
│ - Zustand     │ │ - Sessions │ │ - Prisma  │ │ - Storage │
│ - React Query │ │ - GDPR     │ │ - Redis   │ │ - Convert │
└───────────────┘ └───────────┘ └───────────┘ └───────────┘
                                      │             │
                              ┌───────▼─────┐ ┌─────▼─────┐
                              │    Cache    │ │File Store │
                              │   (Redis)   │ │(AWS S3/   │
                              │             │ │ MinIO)    │
                              └─────────────┘ └───────────┘
                                      │
                              ┌───────▼─────┐
                              │  Database   │
                              │(PostgreSQL) │
                              │             │
                              └─────────────┘
```

### Architecture Principles

#### 1. Microservices Approach
- **Separation of Concerns:** Ogni servizio ha una responsabilità specifica
- **Independent Deployment:** Servizi deployabili indipendentemente
- **Technology Flexibility:** Possibilità di usare tech stack diversi
- **Scalability:** Scaling orizzontale per singoli servizi

#### 2. API-First Design
- **Consistent Interface:** API standardizzate tra servizi
- **Documentation:** OpenAPI/Swagger per tutte le API
- **Versioning:** Supporto per multiple versioni API
- **Testing:** API testing automatizzato

#### 3. Security by Design
- **Zero Trust:** Nessuna fiducia implicita tra servizi
- **Authentication:** JWT-based con refresh tokens
- **Authorization:** RBAC granulare
- **Encryption:** TLS everywhere, data encryption at rest

---

## 🔐 Authentication & Authorization System

### User Roles Hierarchy

```
Global Admin
├── Company Admin
│   ├── HR Manager
│   │   ├── Employee
│   │   └── Trainer (External)
│   └── Training Manager
│       ├── Trainer (Internal)
│       └── Course Coordinator
└── System Operator
    ├── Support Agent
    └── Data Analyst
```

### Role Definitions

#### 1. Global Admin
- **Permissions:** Full system access
- **Capabilities:**
  - Manage all companies
  - System configuration
  - User management across companies
  - Audit logs access
  - GDPR data management

#### 2. Company Admin
- **Permissions:** Full company access
- **Capabilities:**
  - Manage company employees
  - Company settings
  - Training programs management
  - Reports and analytics
  - GDPR compliance for company

#### 3. HR Manager
- **Permissions:** Employee management
- **Capabilities:**
  - Add/edit/remove employees
  - Assign training programs
  - View employee progress
  - Generate HR reports

#### 4. Training Manager
- **Permissions:** Training management
- **Capabilities:**
  - Create/edit courses
  - Manage trainers
  - Schedule training sessions
  - Track training progress
  - Generate training reports

#### 5. Trainer
- **Permissions:** Training delivery
- **Capabilities:**
  - View assigned courses
  - Mark attendance
  - Upload training materials
  - Generate certificates
  - View trainee progress

#### 6. Employee
- **Permissions:** Self-service
- **Capabilities:**
  - View assigned training
  - Complete training modules
  - Download certificates
  - Update personal info
  - GDPR data requests

### Authentication Flow

```
1. User Login Request
   ↓
2. Auth Service Validation
   ↓
3. JWT Token Generation
   ├── Access Token (15 min)
   └── Refresh Token (7 days)
   ↓
4. Token Storage
   ├── Client: Secure HTTP-only cookie
   └── Server: Redis cache
   ↓
5. API Request with Token
   ↓
6. Token Validation
   ├── Signature verification
   ├── Expiration check
   └── Permission validation
   ↓
7. Resource Access Granted/Denied
```

### Authorization Matrix

| Resource | Global Admin | Company Admin | HR Manager | Training Manager | Trainer | Employee |
|----------|--------------|---------------|------------|------------------|---------|----------|
| Companies | CRUD | R (own) | R (own) | R (own) | R (own) | R (own) |
| Employees | CRUD | CRUD (company) | CRUD (company) | R (company) | R (assigned) | R (self) |
| Courses | CRUD | CRUD (company) | R (company) | CRUD (company) | R (assigned) | R (assigned) |
| Schedules | CRUD | CRUD (company) | R (company) | CRUD (company) | RU (assigned) | R (assigned) |
| Certificates | CRUD | R (company) | R (company) | R (company) | CRU (assigned) | R (self) |
| Reports | CRUD | R (company) | R (hr) | R (training) | R (own) | R (self) |
| System Config | CRUD | - | - | - | - | - |
| Audit Logs | R | R (company) | - | - | - | - |
| GDPR Data | CRUD | CRUD (company) | CRUD (company) | R (company) | R (assigned) | R (self) |

*Legend: C=Create, R=Read, U=Update, D=Delete*

---

## 🗄️ Database Architecture Evolution

### Current Schema Issues
1. **Naming Inconsistency:** Mix italiano/inglese
2. **Missing Indexes:** Performance bottlenecks
3. **No Audit Trail:** GDPR compliance gap
4. **Limited User Management:** No role-based structure

### New Database Schema

#### 1. User Management Tables

```sql
-- Users table (replaces current auth logic)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  status user_status DEFAULT 'active',
  email_verified BOOLEAN DEFAULT false,
  last_login TIMESTAMP,
  password_changed_at TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  deleted_at TIMESTAMP -- Soft delete
);

-- Roles table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL,
  is_system_role BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- User roles assignment
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMP DEFAULT now(),
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, role_id, company_id)
);
```

#### 2. GDPR Compliance Tables

```sql
-- Data processing consent
CREATE TABLE user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  consent_type consent_type_enum NOT NULL,
  purpose TEXT NOT NULL,
  given_at TIMESTAMP DEFAULT now(),
  withdrawn_at TIMESTAMP,
  legal_basis VARCHAR(100),
  data_categories TEXT[],
  retention_period INTERVAL,
  is_active BOOLEAN DEFAULT true
);

-- Audit trail for GDPR
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT now(),
  company_id UUID REFERENCES companies(id)
);

-- Data export requests
CREATE TABLE data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  request_type export_type_enum DEFAULT 'personal_data',
  status request_status_enum DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP,
  file_path TEXT,
  expires_at TIMESTAMP,
  notes TEXT
);
```

#### 3. User Preferences & Settings

```sql
-- User preferences
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  theme VARCHAR(20) DEFAULT 'light',
  language VARCHAR(10) DEFAULT 'it',
  timezone VARCHAR(50) DEFAULT 'Europe/Rome',
  date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  notifications JSONB DEFAULT '{}',
  dashboard_layout JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Company settings
CREATE TABLE company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  setting_key VARCHAR(100) NOT NULL,
  setting_value JSONB NOT NULL,
  is_encrypted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(company_id, setting_key)
);
```

### Database Optimization Strategy

#### 1. Indexing Strategy
```sql
-- Performance indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_roles_active ON user_roles(user_id, company_id) WHERE is_active = true;
CREATE INDEX idx_audit_logs_user_time ON audit_logs(user_id, timestamp DESC);
CREATE INDEX idx_audit_logs_company_time ON audit_logs(company_id, timestamp DESC);
CREATE INDEX idx_employees_company ON employees(company_id) WHERE eliminato = false;
CREATE INDEX idx_courses_status ON courses(status) WHERE eliminato = false;
CREATE INDEX idx_schedules_dates ON course_schedules(start_date, end_date) WHERE eliminato = false;

-- Full-text search indexes
CREATE INDEX idx_companies_search ON companies USING gin(to_tsvector('italian', ragione_sociale));
CREATE INDEX idx_employees_search ON employees USING gin(to_tsvector('italian', first_name || ' ' || last_name));
CREATE INDEX idx_courses_search ON courses USING gin(to_tsvector('italian', title || ' ' || description));
```

#### 2. Migration Strategy
```sql
-- Migration phases
-- Phase 1: Add new tables (non-breaking)
-- Phase 2: Migrate existing data
-- Phase 3: Update application code
-- Phase 4: Remove old columns (breaking)
-- Phase 5: Optimize and cleanup
```

---

## 🎯 Implementation Roadmap

### Phase 1: Foundation (Week 3-4)
1. **Database Migration**
   - Create new user management tables
   - Migrate existing data
   - Add indexes and constraints

2. **Auth Service Development**
   - JWT implementation
   - Role-based middleware
   - Session management

### Phase 2: Security (Week 5-6)
1. **RBAC Implementation**
   - Permission system
   - Role assignment
   - Access control middleware

2. **GDPR Compliance**
   - Consent management
   - Audit logging
   - Data export functionality

### Phase 3: Frontend Integration (Week 7-8)
1. **Authentication UI**
   - Login/logout flows
   - Role-based navigation
   - Permission-based components

2. **User Management**
   - User creation/editing
   - Role assignment UI
   - Preference management

---

## 📊 Success Metrics

### Security Metrics
- **Authentication:** 100% endpoints protected
- **Authorization:** Role-based access implemented
- **Audit Coverage:** 100% user actions logged
- **GDPR Compliance:** All requirements met

### Performance Metrics
- **Database Queries:** <100ms average response
- **Authentication:** <50ms token validation
- **Authorization:** <10ms permission check
- **Audit Logging:** <5ms overhead

### User Experience Metrics
- **Login Time:** <2 seconds
- **Role Switching:** <1 second
- **Permission Feedback:** Immediate
- **Data Export:** <30 seconds for standard request

---

## 🎯 Next Steps

### Immediate (Next 2 days)
1. Complete architecture design review
2. Start database schema implementation
3. Begin auth service development

### Week 3 Goals
1. Database migration complete
2. Basic auth service functional
3. RBAC foundation implemented

---

**Status:** ✅ COMPLETATO  
**Completed:** 19 Dicembre 2024  
**Dependencies:** Week 1 audit findings - COMPLETATE