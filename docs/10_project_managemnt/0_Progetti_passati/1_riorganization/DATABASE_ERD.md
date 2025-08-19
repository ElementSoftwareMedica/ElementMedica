# Database ERD - Project 2.0

**Data Creazione:** $(date +%Y-%m-%d)  
**Status:** 📋 Documentazione  
**Fase:** 1 - Analisi e Pianificazione Dettagliata

---

## 📊 Current Database Schema Analysis

### Core Business Entities

```mermaid
erDiagram
    Company {
        string id PK
        string ragione_sociale
        string codice_fiscale
        string piva
        string mail
        string telefono
        string sede_azienda
        boolean eliminato
        datetime created_at
        datetime updated_at
    }
    
    Employee {
        string id PK
        string first_name
        string last_name
        string email
        string codice_fiscale UK
        string companyId FK
        boolean eliminato
        datetime created_at
        datetime updated_at
    }
    
    Course {
        string id PK
        string title
        string category
        string description
        string code UK
        float pricePerPerson
        int maxPeople
        boolean eliminato
        datetime created_at
        datetime updated_at
    }
    
    CourseSchedule {
        string id PK
        string courseId FK
        string companyId FK
        string trainerId FK
        datetime start_date
        datetime end_date
        string location
        int max_participants
        boolean eliminato
        datetime created_at
        datetime updated_at
    }
    
    Trainer {
        string id PK
        string first_name
        string last_name
        string email
        string[] specialties
        float tariffa_oraria
        boolean eliminato
        datetime created_at
        datetime updated_at
    }
    
    CourseEnrollment {
        string id PK
        string scheduleId FK
        string employeeId FK
        string status
        boolean eliminato
        datetime created_at
        datetime updated_at
    }
    
    Company ||--o{ Employee : "has employees"
    Company ||--o{ CourseSchedule : "schedules courses"
    Course ||--o{ CourseSchedule : "scheduled as"
    Trainer ||--o{ CourseSchedule : "teaches"
    CourseSchedule ||--o{ CourseEnrollment : "has enrollments"
    Employee ||--o{ CourseEnrollment : "enrolled in"
```

### Document Management Entities

```mermaid
erDiagram
    Attestato {
        string id PK
        string scheduledCourseId FK
        string partecipanteId FK
        string nomeFile
        string url
        int numeroProgressivo
        int annoProgressivo
        datetime dataGenerazione
        boolean eliminato
    }
    
    LetteraIncarico {
        string id PK
        string scheduledCourseId FK
        string trainerId FK
        string nomeFile
        string url
        int numeroProgressivo
        int annoProgressivo
        datetime dataGenerazione
        boolean eliminato
    }
    
    Preventivo {
        string id PK
        string scheduledCourseId FK
        string nomeFile
        string url
        int numeroProgressivo
        int annoProgressivo
        datetime dataGenerazione
        boolean eliminato
    }
    
    Fattura {
        string id PK
        string scheduledCourseId FK
        string nomeFile
        string url
        int numeroProgressivo
        int annoProgressivo
        datetime dataGenerazione
        boolean eliminato
    }
    
    TestDocument {
        string id PK
        string scheduledCourseId FK
        string trainerId FK
        string nomeFile
        string url
        string stato
        float punteggio
        datetime dataTest
        boolean eliminato
    }
    
    CourseSchedule ||--o{ Attestato : "generates certificates"
    CourseSchedule ||--o{ LetteraIncarico : "generates assignments"
    CourseSchedule ||--o{ Preventivo : "generates quotes"
    CourseSchedule ||--o{ Fattura : "generates invoices"
    CourseSchedule ||--o{ TestDocument : "has tests"
    Employee ||--o{ Attestato : "receives certificates"
    Trainer ||--o{ LetteraIncarico : "receives assignments"
    Trainer ||--o{ TestDocument : "manages tests"
```

### Current User Management (Basic)

```mermaid
erDiagram
    User {
        string id PK
        string username UK
        string email UK
        string password
        string roleId FK
        boolean isActive
        datetime lastLogin
        boolean eliminato
        datetime createdAt
        datetime updatedAt
    }
    
    Role {
        string id PK
        string name UK
        string description
        boolean eliminato
        datetime createdAt
        datetime updatedAt
    }
    
    Permission {
        string id PK
        string name UK
        string resource
        string action
        boolean eliminato
        datetime createdAt
        datetime updatedAt
    }
    
    ActivityLog {
        string id PK
        string userId FK
        string action
        string resource
        string resourceId
        datetime timestamp
        boolean eliminato
    }
    
    User }|--|| Role : "has role"
    Role }|--o{ Permission : "has permissions"
    User ||--o{ ActivityLog : "generates logs"
```

---

## 🚨 Current Schema Issues

### 1. Naming Inconsistencies
- **Mixed Languages:** `ragione_sociale` (IT) vs `first_name` (EN)
- **Inconsistent Patterns:** `created_at` vs `createdAt`
- **Field Naming:** `eliminato` vs `isActive`

### 2. Performance Issues
- **Missing Indexes:** No indexes on frequently queried fields
- **No Full-Text Search:** Search queries are inefficient
- **Large Table Scans:** No optimization for common queries

### 3. GDPR Compliance Gaps
- **No Audit Trail:** Limited activity logging
- **No Consent Management:** Missing consent tracking
- **No Data Export:** No mechanism for data portability
- **Soft Delete Issues:** `eliminato` field inconsistent

### 4. Security Limitations
- **Basic RBAC:** Simple role-permission model
- **No Company Isolation:** Users can access all companies
- **No Session Management:** No refresh token strategy
- **Password Security:** Basic password handling

---

## 🎯 Proposed New Architecture

### Enhanced User Management

```mermaid
erDiagram
    users {
        uuid id PK
        string email UK
        string password_hash
        string first_name
        string last_name
        string phone
        user_status status
        boolean email_verified
        timestamp last_login
        timestamp password_changed_at
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }
    
    roles {
        uuid id PK
        string name UK
        text description
        jsonb permissions
        boolean is_system_role
        timestamp created_at
        timestamp updated_at
    }
    
    user_roles {
        uuid id PK
        uuid user_id FK
        uuid role_id FK
        uuid company_id FK
        uuid granted_by FK
        timestamp granted_at
        timestamp expires_at
        boolean is_active
    }
    
    user_sessions {
        uuid id PK
        uuid user_id FK
        string session_token
        string refresh_token
        timestamp expires_at
        timestamp last_activity
        string ip_address
        text user_agent
        boolean is_active
    }
    
    users ||--o{ user_roles : "has roles"
    roles ||--o{ user_roles : "assigned to users"
    companies ||--o{ user_roles : "scoped to company"
    users ||--o{ user_sessions : "has sessions"
    users ||--o{ user_roles : "granted by"
```

### GDPR Compliance Tables

```mermaid
erDiagram
    user_consents {
        uuid id PK
        uuid user_id FK
        consent_type_enum consent_type
        text purpose
        timestamp given_at
        timestamp withdrawn_at
        string legal_basis
        text[] data_categories
        interval retention_period
        boolean is_active
    }
    
    audit_logs {
        uuid id PK
        uuid user_id FK
        string action
        string resource_type
        uuid resource_id
        jsonb old_values
        jsonb new_values
        inet ip_address
        text user_agent
        timestamp timestamp
        uuid company_id FK
    }
    
    data_export_requests {
        uuid id PK
        uuid user_id FK
        export_type_enum request_type
        request_status_enum status
        timestamp requested_at
        timestamp completed_at
        text file_path
        timestamp expires_at
        text notes
    }
    
    users ||--o{ user_consents : "gives consent"
    users ||--o{ audit_logs : "generates logs"
    users ||--o{ data_export_requests : "requests data"
    companies ||--o{ audit_logs : "scoped to company"
```

### User Preferences & Settings

```mermaid
erDiagram
    user_preferences {
        uuid id PK
        uuid user_id FK
        string theme
        string language
        string timezone
        string date_format
        jsonb notifications
        jsonb dashboard_layout
        timestamp created_at
        timestamp updated_at
    }
    
    company_settings {
        uuid id PK
        uuid company_id FK
        string setting_key
        jsonb setting_value
        boolean is_encrypted
        timestamp created_at
        timestamp updated_at
    }
    
    users ||--|| user_preferences : "has preferences"
    companies ||--o{ company_settings : "has settings"
```

---

## 📈 Performance Optimization Strategy

### 1. Indexing Strategy
```sql
-- User Management Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_roles_active ON user_roles(user_id, company_id) WHERE is_active = true;

-- Audit & Compliance Indexes
CREATE INDEX idx_audit_logs_user_time ON audit_logs(user_id, timestamp DESC);
CREATE INDEX idx_audit_logs_company_time ON audit_logs(company_id, timestamp DESC);

-- Business Logic Indexes
CREATE INDEX idx_employees_company ON employees(company_id) WHERE eliminato = false;
CREATE INDEX idx_courses_status ON courses(status) WHERE eliminato = false;
CREATE INDEX idx_schedules_dates ON course_schedules(start_date, end_date) WHERE eliminato = false;

-- Full-Text Search Indexes
CREATE INDEX idx_companies_search ON companies USING gin(to_tsvector('italian', ragione_sociale));
CREATE INDEX idx_employees_search ON employees USING gin(to_tsvector('italian', first_name || ' ' || last_name));
CREATE INDEX idx_courses_search ON courses USING gin(to_tsvector('italian', title || ' ' || description));
```

### 2. Query Optimization
- **Materialized Views:** For complex reporting queries
- **Partitioning:** For large audit_logs table by date
- **Connection Pooling:** Optimize database connections
- **Query Caching:** Redis for frequently accessed data

---

## 🔄 Migration Strategy

### Phase 1: Foundation (Week 3)
1. **Create New Tables**
   - Add user management tables
   - Add GDPR compliance tables
   - Add preference tables

2. **Data Migration**
   - Migrate existing users to new structure
   - Create default roles and permissions
   - Set up audit logging

### Phase 2: Integration (Week 4)
1. **Update Application Code**
   - Implement new authentication flow
   - Add RBAC middleware
   - Update API endpoints

2. **Testing & Validation**
   - Test data integrity
   - Validate performance improvements
   - Security testing

### Phase 3: Cleanup (Week 5)
1. **Remove Old Columns**
   - Drop deprecated user fields
   - Clean up old authentication logic
   - Optimize final schema

2. **Performance Tuning**
   - Add final indexes
   - Optimize queries
   - Monitor performance

---

## 📊 Expected Improvements

### Security
- ✅ **GDPR Compliant:** Full audit trail and consent management
- ✅ **RBAC:** Granular role-based access control
- ✅ **Company Isolation:** Users scoped to specific companies
- ✅ **Session Management:** Secure JWT with refresh tokens

### Performance
- ✅ **Query Speed:** 80% improvement with proper indexing
- ✅ **Search Performance:** Full-text search capabilities
- ✅ **Scalability:** Optimized for growth
- ✅ **Caching:** Redis integration for frequent queries

### Maintainability
- ✅ **Consistent Naming:** English naming convention
- ✅ **Clear Structure:** Logical table organization
- ✅ **Documentation:** Comprehensive schema documentation
- ✅ **Type Safety:** Proper enum types and constraints

---

## 🎯 Next Steps

### Immediate (Week 2)
1. ✅ Complete ERD documentation
2. 🔄 Review with team
3. ⏳ Finalize migration scripts

### Week 3
1. ⏳ Implement database migration
2. ⏳ Create new Prisma schema
3. ⏳ Test data migration

### Week 4
1. ⏳ Update application code
2. ⏳ Implement new authentication
3. ⏳ Add RBAC middleware

---

**Status:** 📋 Documentazione Completa  
**Next Review:** End of Week 2  
**Dependencies:** WEEK2_ARCHITECTURE_DESIGN.md