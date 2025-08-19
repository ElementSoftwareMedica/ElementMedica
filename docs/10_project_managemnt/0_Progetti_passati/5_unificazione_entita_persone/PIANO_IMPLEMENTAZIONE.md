# Piano di Implementazione: Unificazione Entità Persone

## 🎯 Obiettivo
Unificare le entità `Employee`, `Trainer` e `User` in un'unica entità `Person` con sistema di ruoli avanzato, mantenendo la funzionalità esistente e rispettando le normative GDPR.

## 📋 Fasi del Progetto

### FASE 1: PREPARAZIONE E ANALISI (Giorni 1-2)

#### 1.1 Backup e Sicurezza
```bash
# Backup completo database
pg_dump -h localhost -U username -d database_name > backup_pre_migration.sql

# Backup file di configurazione
cp -r config/ backup_config/
cp -r prisma/ backup_prisma/
```

#### 1.2 Analisi Dipendenze
- [ ] Mappare tutte le relazioni esistenti
- [ ] Identificare query critiche
- [ ] Documentare API endpoints coinvolti
- [ ] Analizzare componenti frontend

#### 1.3 Creazione Branch Dedicato
```bash
git checkout -b feature/unify-person-entities
git push -u origin feature/unify-person-entities
```

### FASE 2: PROGETTAZIONE SCHEMA TARGET (Giorni 3-4)

#### 2.1 Nuovo Schema Person
```prisma
model Person {
  id                    String              @id @default(uuid())
  
  // Campi Base
  firstName             String
  lastName              String
  email                 String              @unique
  phone                 String?
  
  // Campi Anagrafici
  birthDate             DateTime?
  taxCode               String?             @unique // ex codice_fiscale
  vatNumber             String?             // per formatori
  
  // Indirizzo
  residenceAddress      String?
  residenceCity         String?
  postalCode            String?
  province              String?
  
  // Campi Sistema
  username              String?             @unique // solo per utenti sistema
  password              String?             // solo per utenti sistema
  isActive              Boolean             @default(true)
  status                String?             @default("active")
  
  // Campi Professionali
  title                 String?             // titolo/posizione
  hiredDate             DateTime?           // data assunzione dipendenti
  hourlyRate            Float?              // tariffa oraria formatori
  iban                  String?             // per pagamenti formatori
  registerCode          String?             // codice registro formatori
  certifications        String[]            // certificazioni formatori
  specialties           String[]            // specializzazioni formatori
  
  // Campi Sistema Avanzati
  profileImage          String?
  notes                 String?
  lastLogin             DateTime?
  failedAttempts        Int                 @default(0)
  lockedUntil           DateTime?
  globalRole            String?             // ruolo globale sistema
  
  // Multi-tenant
  tenantId              String?
  companyId             String?
  
  // Audit
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt
  deletedAt             DateTime?           // soft delete
  isDeleted             Boolean             @default(false)
  
  // Relazioni
  company               Company?            @relation(fields: [companyId], references: [id])
  tenant                Tenant?             @relation(fields: [tenantId], references: [id])
  
  // Ruoli e Permessi
  personRoles           PersonRole[]
  
  // Relazioni Specifiche (da migrare)
  courseEnrollments     CourseEnrollment[]  // ex Employee
  courseSchedules       CourseSchedule[]    // ex Trainer
  courseSessions        CourseSession[]     // ex Trainer
  attestati             Attestato[]         // ex Employee
  lettereIncarico       LetteraIncarico[]   // ex Trainer
  
  // Relazioni Sistema
  activityLogs          ActivityLog[]       // ex User
  refreshTokens         RefreshToken[]      // ex User
  gdprAuditLogs         GdprAuditLog[]      // ex User
  consentRecords        ConsentRecord[]     // GDPR
  userSessions          UserSession[]       // ex User
  
  @@map("persons")
}
```

#### 2.2 Sistema Ruoli Avanzato
```prisma
model PersonRole {
  id          String    @id @default(uuid())
  personId    String
  roleType    RoleType
  isActive    Boolean   @default(true)
  assignedAt  DateTime  @default(now())
  assignedBy  String?   // chi ha assegnato il ruolo
  validFrom   DateTime  @default(now())
  validUntil  DateTime? // scadenza ruolo
  
  person      Person    @relation(fields: [personId], references: [id], onDelete: Cascade)
  
  @@unique([personId, roleType])
  @@map("person_roles")
}

enum RoleType {
  EMPLOYEE        // Dipendente
  TRAINER         // Formatore
  ADMIN           // Amministratore sistema
  COMPANY_ADMIN   // Amministratore aziendale
  MANAGER         // Manager
  VIEWER          // Solo visualizzazione
}
```

#### 2.3 Tabelle di Migrazione
```prisma
// Tabella temporanea per tracciare migrazione
model MigrationLog {
  id              String    @id @default(uuid())
  entityType      String    // 'employee', 'trainer', 'user'
  oldId           String    // ID originale
  newPersonId     String    // Nuovo ID Person
  migrationDate   DateTime  @default(now())
  status          String    // 'pending', 'completed', 'failed'
  errors          String[]  // eventuali errori
  
  @@map("migration_logs")
}
```

### FASE 3: IMPLEMENTAZIONE BACKEND (Giorni 5-8)

#### 3.1 Aggiornamento Schema Prisma

**Step 3.1.1: Creare nuovo schema**
```bash
# Backup schema attuale
cp prisma/schema.prisma prisma/schema.prisma.backup

# Implementare nuovo schema Person
# Mantenere temporaneamente le vecchie entità per migrazione
```

**Step 3.1.2: Generare migrazione**
```bash
npx prisma migrate dev --name "add-person-entity"
npx prisma generate
```

#### 3.2 Script di Migrazione Dati

**File: `scripts/migrate-to-person.js`**
```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateEmployees() {
  console.log('🔄 Migrating Employees...');
  
  const employees = await prisma.employee.findMany({
    where: { eliminato: false }
  });
  
  for (const emp of employees) {
    try {
      const person = await prisma.person.create({
        data: {
          firstName: emp.first_name,
          lastName: emp.last_name,
          email: emp.email,
          phone: emp.phone,
          birthDate: emp.birth_date,
          taxCode: emp.codice_fiscale,
          residenceAddress: emp.residence_address,
          residenceCity: emp.residence_city,
          postalCode: emp.postal_code,
          province: emp.province,
          title: emp.title,
          hiredDate: emp.hired_date,
          notes: emp.notes,
          profileImage: emp.photo_url,
          status: emp.status || 'active',
          companyId: emp.companyId,
          createdAt: emp.created_at,
          updatedAt: emp.updated_at,
          personRoles: {
            create: {
              roleType: 'EMPLOYEE',
              isActive: true
            }
          }
        }
      });
      
      // Log migrazione
      await prisma.migrationLog.create({
        data: {
          entityType: 'employee',
          oldId: emp.id,
          newPersonId: person.id,
          status: 'completed'
        }
      });
      
      console.log(`✅ Employee ${emp.first_name} ${emp.last_name} migrated`);
    } catch (error) {
      console.error(`❌ Error migrating employee ${emp.id}:`, error);
      
      await prisma.migrationLog.create({
        data: {
          entityType: 'employee',
          oldId: emp.id,
          newPersonId: '',
          status: 'failed',
          errors: [error.message]
        }
      });
    }
  }
}

async function migrateTrainers() {
  console.log('🔄 Migrating Trainers...');
  
  const trainers = await prisma.trainer.findMany({
    where: { eliminato: false }
  });
  
  for (const trainer of trainers) {
    try {
      const person = await prisma.person.create({
        data: {
          firstName: trainer.first_name,
          lastName: trainer.last_name,
          email: trainer.email,
          phone: trainer.phone,
          birthDate: trainer.birth_date,
          taxCode: trainer.tax_code,
          vatNumber: trainer.vat_number,
          residenceAddress: trainer.residence_address,
          residenceCity: trainer.residence_city,
          postalCode: trainer.postal_code,
          province: trainer.province,
          hourlyRate: trainer.tariffa_oraria,
          iban: trainer.iban,
          registerCode: trainer.register_code,
          certifications: trainer.certifications,
          specialties: trainer.specialties,
          notes: trainer.notes,
          status: trainer.status || 'active',
          tenantId: trainer.tenantId,
          createdAt: trainer.created_at,
          updatedAt: trainer.updated_at,
          personRoles: {
            create: {
              roleType: 'TRAINER',
              isActive: true
            }
          }
        }
      });
      
      await prisma.migrationLog.create({
        data: {
          entityType: 'trainer',
          oldId: trainer.id,
          newPersonId: person.id,
          status: 'completed'
        }
      });
      
      console.log(`✅ Trainer ${trainer.first_name} ${trainer.last_name} migrated`);
    } catch (error) {
      console.error(`❌ Error migrating trainer ${trainer.id}:`, error);
      
      await prisma.migrationLog.create({
        data: {
          entityType: 'trainer',
          oldId: trainer.id,
          newPersonId: '',
          status: 'failed',
          errors: [error.message]
        }
      });
    }
  }
}

async function migrateUsers() {
  console.log('🔄 Migrating Users...');
  
  const users = await prisma.user.findMany({
    where: { eliminato: false }
  });
  
  for (const user of users) {
    try {
      // Determina ruolo basato su globalRole
      let roleType = 'VIEWER';
      if (user.globalRole === 'admin') roleType = 'ADMIN';
      else if (user.globalRole === 'company_admin') roleType = 'COMPANY_ADMIN';
      else if (user.globalRole === 'manager') roleType = 'MANAGER';
      
      const person = await prisma.person.create({
        data: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          username: user.username,
          password: user.password,
          isActive: user.isActive,
          profileImage: user.profileImage,
          lastLogin: user.lastLogin,
          failedAttempts: user.failedAttempts,
          lockedUntil: user.lockedUntil,
          globalRole: user.globalRole,
          companyId: user.companyId,
          tenantId: user.tenantId,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          personRoles: {
            create: {
              roleType: roleType,
              isActive: true
            }
          }
        }
      });
      
      await prisma.migrationLog.create({
        data: {
          entityType: 'user',
          oldId: user.id,
          newPersonId: person.id,
          status: 'completed'
        }
      });
      
      console.log(`✅ User ${user.username} migrated`);
    } catch (error) {
      console.error(`❌ Error migrating user ${user.id}:`, error);
      
      await prisma.migrationLog.create({
        data: {
          entityType: 'user',
          oldId: user.id,
          newPersonId: '',
          status: 'failed',
          errors: [error.message]
        }
      });
    }
  }
}

async function main() {
  try {
    console.log('🚀 Starting Person Entity Migration...');
    
    await migrateEmployees();
    await migrateTrainers();
    await migrateUsers();
    
    // Report finale
    const migrationStats = await prisma.migrationLog.groupBy({
      by: ['entityType', 'status'],
      _count: true
    });
    
    console.log('\n📊 Migration Report:');
    migrationStats.forEach(stat => {
      console.log(`${stat.entityType}: ${stat.status} = ${stat._count}`);
    });
    
    console.log('\n✅ Migration completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { migrateEmployees, migrateTrainers, migrateUsers };
```

#### 3.3 Servizi Backend Aggiornati

**File: `services/personService.js`**
```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class PersonService {
  // Ottieni persone per ruolo
  async getPersonsByRole(roleType, filters = {}) {
    const where = {
      isDeleted: false,
      personRoles: {
        some: {
          roleType: roleType,
          isActive: true
        }
      },
      ...filters
    };
    
    return await prisma.person.findMany({
      where,
      include: {
        personRoles: true,
        company: true,
        tenant: true
      },
      orderBy: {
        lastName: 'asc'
      }
    });
  }
  
  // Ottieni dipendenti (backward compatibility)
  async getEmployees(filters = {}) {
    return this.getPersonsByRole('EMPLOYEE', filters);
  }
  
  // Ottieni formatori (backward compatibility)
  async getTrainers(filters = {}) {
    return this.getPersonsByRole('TRAINER', filters);
  }
  
  // Ottieni utenti sistema (backward compatibility)
  async getSystemUsers(filters = {}) {
    return this.getPersonsByRole(['ADMIN', 'COMPANY_ADMIN', 'MANAGER'], filters);
  }
  
  // Crea persona con ruolo
  async createPerson(data, roleType) {
    return await prisma.person.create({
      data: {
        ...data,
        personRoles: {
          create: {
            roleType: roleType,
            isActive: true
          }
        }
      },
      include: {
        personRoles: true
      }
    });
  }
  
  // Aggiorna persona
  async updatePerson(id, data) {
    return await prisma.person.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      },
      include: {
        personRoles: true
      }
    });
  }
  
  // Soft delete
  async deletePerson(id) {
    return await prisma.person.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });
  }
  
  // Gestione ruoli
  async addRole(personId, roleType) {
    return await prisma.personRole.create({
      data: {
        personId,
        roleType,
        isActive: true
      }
    });
  }
  
  async removeRole(personId, roleType) {
    return await prisma.personRole.updateMany({
      where: {
        personId,
        roleType
      },
      data: {
        isActive: false
      }
    });
  }
  
  // Verifica permessi
  async hasRole(personId, roleType) {
    const role = await prisma.personRole.findFirst({
      where: {
        personId,
        roleType,
        isActive: true
      }
    });
    
    return !!role;
  }
  
  // Login (per utenti sistema)
  async findByCredentials(username, email) {
    return await prisma.person.findFirst({
      where: {
        OR: [
          { username: username },
          { email: email }
        ],
        isActive: true,
        isDeleted: false,
        personRoles: {
          some: {
            roleType: {
              in: ['ADMIN', 'COMPANY_ADMIN', 'MANAGER']
            },
            isActive: true
          }
        }
      },
      include: {
        personRoles: true
      }
    });
  }
}

module.exports = new PersonService();
```

### FASE 4: AGGIORNAMENTO API (Giorni 9-10)

#### 4.1 Controller Unificato

**File: `controllers/personController.js`**
```javascript
const personService = require('../services/personService');
const { validationResult } = require('express-validator');

class PersonController {
  // GET /api/persons/employees
  async getEmployees(req, res) {
    try {
      const employees = await personService.getEmployees(req.query);
      res.json(employees);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  // GET /api/persons/trainers
  async getTrainers(req, res) {
    try {
      const trainers = await personService.getTrainers(req.query);
      res.json(trainers);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  // GET /api/persons/users
  async getSystemUsers(req, res) {
    try {
      const users = await personService.getSystemUsers(req.query);
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  // POST /api/persons
  async createPerson(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { roleType, ...personData } = req.body;
      const person = await personService.createPerson(personData, roleType);
      
      res.status(201).json(person);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  // PUT /api/persons/:id
  async updatePerson(req, res) {
    try {
      const { id } = req.params;
      const person = await personService.updatePerson(id, req.body);
      
      res.json(person);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  // DELETE /api/persons/:id
  async deletePerson(req, res) {
    try {
      const { id } = req.params;
      await personService.deletePerson(id);
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  // POST /api/persons/:id/roles
  async addRole(req, res) {
    try {
      const { id } = req.params;
      const { roleType } = req.body;
      
      const role = await personService.addRole(id, roleType);
      res.status(201).json(role);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  // DELETE /api/persons/:id/roles/:roleType
  async removeRole(req, res) {
    try {
      const { id, roleType } = req.params;
      
      await personService.removeRole(id, roleType);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new PersonController();
```

#### 4.2 Route Backward Compatible

**File: `routes/person-routes.js`**
```javascript
const express = require('express');
const router = express.Router();
const personController = require('../controllers/personController');
const { authenticateToken, authorize } = require('../middleware/auth');

// Nuove route unificate
router.get('/persons/employees', authenticateToken, personController.getEmployees);
router.get('/persons/trainers', authenticateToken, personController.getTrainers);
router.get('/persons/users', authenticateToken, authorize(['ADMIN']), personController.getSystemUsers);

router.post('/persons', authenticateToken, personController.createPerson);
router.put('/persons/:id', authenticateToken, personController.updatePerson);
router.delete('/persons/:id', authenticateToken, personController.deletePerson);

router.post('/persons/:id/roles', authenticateToken, authorize(['ADMIN']), personController.addRole);
router.delete('/persons/:id/roles/:roleType', authenticateToken, authorize(['ADMIN']), personController.removeRole);

// Route backward compatible (deprecate gradualmente)
router.get('/employees', authenticateToken, personController.getEmployees);
router.get('/trainers', authenticateToken, personController.getTrainers);
router.get('/users', authenticateToken, authorize(['ADMIN']), personController.getSystemUsers);

module.exports = router;
```

### FASE 5: AGGIORNAMENTO FRONTEND (Giorni 11-14)

#### 5.1 Componenti Unificati

**File: `components/PersonList.tsx`**
```typescript
import React, { useState, useEffect } from 'react';
import { Person, RoleType } from '../types/person';
import { personApi } from '../api/personApi';

interface PersonListProps {
  roleType: RoleType;
  title: string;
  canEdit?: boolean;
  canDelete?: boolean;
}

const PersonList: React.FC<PersonListProps> = ({ 
  roleType, 
  title, 
  canEdit = false, 
  canDelete = false 
}) => {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPersons();
  }, [roleType]);

  const loadPersons = async () => {
    try {
      setLoading(true);
      const data = await personApi.getByRole(roleType);
      setPersons(data);
    } catch (err) {
      setError('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questa persona?')) {
      try {
        await personApi.delete(id);
        await loadPersons();
      } catch (err) {
        setError('Errore nell\'eliminazione');
      }
    }
  };

  if (loading) return <div>Caricamento...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="person-list">
      <h2>{title}</h2>
      
      <table className="table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Cognome</th>
            <th>Email</th>
            <th>Telefono</th>
            <th>Stato</th>
            {(canEdit || canDelete) && <th>Azioni</th>}
          </tr>
        </thead>
        <tbody>
          {persons.map(person => (
            <tr key={person.id}>
              <td>{person.firstName}</td>
              <td>{person.lastName}</td>
              <td>{person.email}</td>
              <td>{person.phone}</td>
              <td>
                <span className={`status ${person.isActive ? 'active' : 'inactive'}`}>
                  {person.isActive ? 'Attivo' : 'Inattivo'}
                </span>
              </td>
              {(canEdit || canDelete) && (
                <td>
                  {canEdit && (
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => window.location.href = `/persons/${person.id}/edit`}
                    >
                      Modifica
                    </button>
                  )}
                  {canDelete && (
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(person.id)}
                    >
                      Elimina
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PersonList;
```

#### 5.2 Pagine Specifiche

**File: `pages/EmployeesPage.tsx`**
```typescript
import React from 'react';
import PersonList from '../components/PersonList';
import { useAuth } from '../hooks/useAuth';

const EmployeesPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  
  return (
    <div className="employees-page">
      <PersonList 
        roleType="EMPLOYEE"
        title="Dipendenti"
        canEdit={hasPermission('EDIT_EMPLOYEES')}
        canDelete={hasPermission('DELETE_EMPLOYEES')}
      />
    </div>
  );
};

export default EmployeesPage;
```

**File: `pages/TrainersPage.tsx`**
```typescript
import React from 'react';
import PersonList from '../components/PersonList';
import { useAuth } from '../hooks/useAuth';

const TrainersPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  
  return (
    <div className="trainers-page">
      <PersonList 
        roleType="TRAINER"
        title="Formatori"
        canEdit={hasPermission('EDIT_TRAINERS')}
        canDelete={hasPermission('DELETE_TRAINERS')}
      />
    </div>
  );
};

export default TrainersPage;
```

### FASE 6: AGGIORNAMENTO AUTENTICAZIONE (Giorni 15-16)

#### 6.1 Middleware Auth Aggiornato

**File: `middleware/auth.js`**
```javascript
const jwt = require('jsonwebtoken');
const personService = require('../services/personService');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token di accesso richiesto' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Carica persona con ruoli
    const person = await personService.findById(decoded.personId);
    if (!person || !person.isActive) {
      return res.status(401).json({ error: 'Utente non valido' });
    }
    
    req.user = person;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token non valido' });
  }
};

const authorize = (requiredRoles) => {
  return (req, res, next) => {
    const userRoles = req.user.personRoles
      .filter(role => role.isActive)
      .map(role => role.roleType);
    
    const hasRequiredRole = requiredRoles.some(role => 
      userRoles.includes(role)
    );
    
    if (!hasRequiredRole) {
      return res.status(403).json({ 
        error: 'Permessi insufficienti',
        required: requiredRoles,
        current: userRoles
      });
    }
    
    next();
  };
};

module.exports = {
  authenticateToken,
  authorize
};
```

#### 6.2 Login Controller Aggiornato

**File: `controllers/authController.js`**
```javascript
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const personService = require('../services/personService');

class AuthController {
  async login(req, res) {
    try {
      const { username, email, password } = req.body;
      
      // Trova persona per credenziali
      const person = await personService.findByCredentials(username, email);
      
      if (!person) {
        return res.status(401).json({ 
          error: 'Credenziali non valide' 
        });
      }
      
      // Verifica password
      const isValidPassword = await bcrypt.compare(password, person.password);
      
      if (!isValidPassword) {
        // Incrementa tentativi falliti
        await personService.incrementFailedAttempts(person.id);
        
        return res.status(401).json({ 
          error: 'Credenziali non valide' 
        });
      }
      
      // Reset tentativi falliti
      await personService.resetFailedAttempts(person.id);
      
      // Aggiorna ultimo login
      await personService.updateLastLogin(person.id);
      
      // Genera token
      const token = jwt.sign(
        { 
          personId: person.id,
          email: person.email,
          roles: person.personRoles.map(r => r.roleType)
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      // Rimuovi password dalla risposta
      const { password: _, ...personData } = person;
      
      res.json({
        token,
        person: personData,
        roles: person.personRoles.filter(r => r.isActive)
      });
      
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  }
  
  async getProfile(req, res) {
    try {
      const { password, ...personData } = req.user;
      
      res.json({
        person: personData,
        roles: req.user.personRoles.filter(r => r.isActive)
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new AuthController();
```

### FASE 7: TESTING E VALIDAZIONE (Giorni 17-18)

#### 7.1 Test di Migrazione

**File: `tests/migration.test.js`**
```javascript
const { PrismaClient } = require('@prisma/client');
const { migrateEmployees, migrateTrainers, migrateUsers } = require('../scripts/migrate-to-person');

describe('Person Migration Tests', () => {
  let prisma;
  
  beforeAll(async () => {
    prisma = new PrismaClient();
  });
  
  afterAll(async () => {
    await prisma.$disconnect();
  });
  
  test('should migrate employees correctly', async () => {
    const employeesBefore = await prisma.employee.count();
    
    await migrateEmployees();
    
    const personsAfter = await prisma.person.count({
      where: {
        personRoles: {
          some: { roleType: 'EMPLOYEE' }
        }
      }
    });
    
    expect(personsAfter).toBe(employeesBefore);
  });
  
  test('should maintain data integrity', async () => {
    const employee = await prisma.employee.findFirst();
    const migratedPerson = await prisma.person.findFirst({
      where: {
        taxCode: employee.codice_fiscale
      }
    });
    
    expect(migratedPerson.firstName).toBe(employee.first_name);
    expect(migratedPerson.lastName).toBe(employee.last_name);
    expect(migratedPerson.email).toBe(employee.email);
  });
});
```

#### 7.2 Test API

**File: `tests/api.test.js`**
```javascript
const request = require('supertest');
const app = require('../app');

describe('Person API Tests', () => {
  let authToken;
  
  beforeAll(async () => {
    // Login per ottenere token
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'password'
      });
    
    authToken = response.body.token;
  });
  
  test('GET /api/persons/employees should return employees', async () => {
    const response = await request(app)
      .get('/api/persons/employees')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
  
  test('POST /api/persons should create new person', async () => {
    const newPerson = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      roleType: 'EMPLOYEE'
    };
    
    const response = await request(app)
      .post('/api/persons')
      .set('Authorization', `Bearer ${authToken}`)
      .send(newPerson);
    
    expect(response.status).toBe(201);
    expect(response.body.firstName).toBe(newPerson.firstName);
  });
});
```

### FASE 8: DEPLOYMENT E CLEANUP (Giorni 19-20)

#### 8.1 Script di Deployment

**File: `scripts/deploy-person-migration.sh`**
```bash
#!/bin/bash

echo "🚀 Starting Person Entity Migration Deployment"

# Backup database
echo "📦 Creating database backup..."
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > "backup_$(date +%Y%m%d_%H%M%S).sql"

# Run migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

# Generate Prisma client
echo "⚙️ Generating Prisma client..."
npx prisma generate

# Run data migration
echo "📊 Migrating data to Person entity..."
node scripts/migrate-to-person.js

# Verify migration
echo "✅ Verifying migration..."
node scripts/verify-migration.js

# Run tests
echo "🧪 Running tests..."
npm test

if [ $? -eq 0 ]; then
    echo "✅ All tests passed!"
    
    # Cleanup old entities (dopo conferma)
    echo "🧹 Ready for cleanup. Run cleanup script manually after verification."
else
    echo "❌ Tests failed! Check logs and rollback if necessary."
    exit 1
fi

echo "🎉 Deployment completed successfully!"
```

#### 8.2 Script di Cleanup

**File: `scripts/cleanup-old-entities.js`**
```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupOldEntities() {
  console.log('🧹 Starting cleanup of old entities...');
  
  try {
    // Verifica che la migrazione sia completata
    const migrationStats = await prisma.migrationLog.groupBy({
      by: ['status'],
      _count: true
    });
    
    const failedMigrations = migrationStats.find(s => s.status === 'failed')?._count || 0;
    
    if (failedMigrations > 0) {
      console.log(`❌ Found ${failedMigrations} failed migrations. Cleanup aborted.`);
      return;
    }
    
    console.log('✅ All migrations completed successfully. Proceeding with cleanup...');
    
    // Backup delle vecchie entità
    console.log('📦 Creating backup of old entities...');
    
    const employees = await prisma.employee.findMany();
    const trainers = await prisma.trainer.findMany();
    const users = await prisma.user.findMany();
    
    // Salva backup
    const fs = require('fs');
    const backupData = {
      employees,
      trainers,
      users,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(
      `backup_old_entities_${Date.now()}.json`,
      JSON.stringify(backupData, null, 2)
    );
    
    console.log('✅ Backup created successfully.');
    
    // Conferma utente
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question('Are you sure you want to delete old entities? (yes/no): ', resolve);
    });
    
    rl.close();
    
    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ Cleanup cancelled by user.');
      return;
    }
    
    // Elimina vecchie entità
    console.log('🗑️ Deleting old entities...');
    
    await prisma.employee.deleteMany();
    await prisma.trainer.deleteMany();
    await prisma.user.deleteMany();
    
    console.log('✅ Old entities deleted successfully.');
    
    // Cleanup migration logs (opzionale)
    console.log('🧹 Cleaning up migration logs...');
    await prisma.migrationLog.deleteMany({
      where: {
        status: 'completed'
      }
    });
    
    console.log('🎉 Cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  cleanupOldEntities();
}

module.exports = { cleanupOldEntities };
```

## 📋 Checklist Finale

### Pre-Deployment
- [ ] Backup completo database
- [ ] Backup file di configurazione
- [ ] Test su ambiente di sviluppo
- [ ] Verifica conformità GDPR
- [ ] Documentazione aggiornata

### Durante Deployment
- [ ] Migrazione schema database
- [ ] Migrazione dati
- [ ] Verifica integrità dati
- [ ] Test funzionalità critiche
- [ ] Test login

### Post-Deployment
- [ ] Verifica tutte le pagine
- [ ] Test permessi e ruoli
- [ ] Monitoraggio performance
- [ ] Cleanup entità obsolete
- [ ] Aggiornamento documentazione

## 🚨 Piano di Rollback

In caso di problemi critici:

1. **Stop immediato** del servizio
2. **Ripristino database** da backup
3. **Rollback codice** al commit precedente
4. **Verifica funzionalità** base
5. **Comunicazione** agli stakeholder

## 📊 Metriche di Successo

- ✅ **Login funzionante**: 100%
- ✅ **Pagine accessibili**: 100%
- ✅ **Dati migrati**: 100%
- ✅ **Performance**: <200ms query time
- ✅ **Zero errori critici**

---

**Durata Stimata**: 20 giorni lavorativi
**Risorse Richieste**: 1 sviluppatore senior
**Rischio Complessivo**: Medio-Alto
**Priorità**: Alta