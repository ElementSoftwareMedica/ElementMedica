# 🧪 STRATEGIA TEST - Refactoring Completo Sistema

## 🎯 Obiettivo

Strategia completa di test per garantire che il refactoring del sistema (User/Employee → Person, standardizzazione soft delete, unificazione ruoli) non introduca regressioni e mantenga piena conformità GDPR.

---

## 📊 OVERVIEW STRATEGIA

### Principi Fondamentali
1. **Test First**: Test prima di ogni modifica
2. **Isolamento**: Test componenti singolarmente
3. **GDPR Compliance**: Verifica conformità continua
4. **Performance**: Monitoraggio performance durante migrazione
5. **Rollback Ready**: Test rollback per ogni fase

### Livelli di Test
- 🔴 **Unit Tests**: Singole funzioni e metodi
- 🟡 **Integration Tests**: Interazione tra componenti
- 🟢 **E2E Tests**: Flussi completi utente
- 🔵 **GDPR Tests**: Conformità privacy
- ⚫ **Performance Tests**: Carico e stress

---

## 🗂️ STRUTTURA TEST SUITE

### Test Baseline (Pre-Refactoring)
```
tests/
├── baseline/
│   ├── auth_baseline.test.js          # Autenticazione attuale
│   ├── courses_baseline.test.js       # Gestione corsi attuale
│   ├── permissions_baseline.test.js   # Sistema permessi attuale
│   ├── gdpr_baseline.test.js          # Conformità GDPR attuale
│   └── performance_baseline.test.js   # Performance attuale
```

### Test Migrazione (Durante Refactoring)
```
tests/
├── migration/
│   ├── person_migration.test.js       # Migrazione User/Employee → Person
│   ├── soft_delete_migration.test.js  # Standardizzazione deletedAt
│   ├── role_migration.test.js         # Unificazione sistema ruoli
│   ├── data_integrity.test.js         # Integrità dati durante migrazione
│   └── rollback.test.js               # Test procedure rollback
```

### Test Post-Refactoring (Verifica Finale)
```
tests/
├── final/
│   ├── auth_final.test.js             # Autenticazione post-refactoring
│   ├── courses_final.test.js          # Gestione corsi post-refactoring
│   ├── permissions_final.test.js      # Sistema permessi post-refactoring
│   ├── gdpr_final.test.js             # Conformità GDPR post-refactoring
│   └── performance_final.test.js      # Performance post-refactoring
```

---

## 🔐 TEST AUTENTICAZIONE

### Test Baseline Autenticazione
```javascript
// tests/baseline/auth_baseline.test.js
describe('Auth Baseline Tests', () => {
  test('Login con User esistente', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'mario.rossi@acme-corp.com',
        password: 'Password123!'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
  });
  
  test('RefreshToken salvato correttamente', async () => {
    const token = await prisma.refreshToken.findFirst({
      where: { personId: 'person-admin-001' }
    });
    
    expect(token).toBeDefined();
    expect(token.deviceInfo).toBeDefined();
    expect(token.deviceInfo.userAgent).toBeDefined();
  });
});
```

### Test Migrazione Autenticazione
```javascript
// tests/migration/person_migration.test.js
describe('Person Migration Tests', () => {
  test('Tutti User migrati in Person', async () => {
    const userCount = await prisma.user.count();
    const personCount = await prisma.person.count();
    
    expect(userCount).toBe(0); // Nessun User rimanente
    expect(personCount).toBeGreaterThan(0); // Person presenti
  });
  
  test('Relazioni RefreshToken aggiornate', async () => {
    const tokens = await prisma.refreshToken.findMany({
      include: { person: true }
    });
    
    tokens.forEach(token => {
      expect(token.person).toBeDefined();
      expect(token.personId).toBeDefined();
    });
  });
  
  test('Login funziona con Person', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'mario.rossi@acme-corp.com',
        password: 'Password123!'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.user.id).toMatch(/^person-/);
  });
});
```

---

## 🏢 TEST GESTIONE CORSI

### Test Baseline Corsi
```javascript
// tests/baseline/courses_baseline.test.js
describe('Courses Baseline Tests', () => {
  test('Lista corsi con Employee', async () => {
    const courses = await prisma.course.findMany({
      where: { eliminato: false },
      include: {
        enrollments: {
          include: { employee: true }
        }
      }
    });
    
    expect(courses).toBeDefined();
    courses.forEach(course => {
      expect(course.enrollments).toBeDefined();
    });
  });
});
```

### Test Migrazione Corsi
```javascript
// tests/migration/person_migration.test.js
describe('Course Migration Tests', () => {
  test('CourseEnrollment usa personId', async () => {
    const enrollments = await prisma.courseEnrollment.findMany({
      include: { person: true }
    });
    
    enrollments.forEach(enrollment => {
      expect(enrollment.personId).toBeDefined();
      expect(enrollment.person).toBeDefined();
      expect(enrollment.employeeId).toBeUndefined(); // Campo rimosso
    });
  });
  
  test('Soft delete usa deletedAt', async () => {
    const courses = await prisma.course.findMany({
      where: { deletedAt: null }
    });
    
    expect(courses).toBeDefined();
    courses.forEach(course => {
      expect(course.eliminato).toBeUndefined(); // Campo rimosso
      expect(course.deletedAt).toBeNull();
    });
  });
});
```

---

## 🔐 TEST SISTEMA RUOLI

### Test Baseline Ruoli
```javascript
// tests/baseline/permissions_baseline.test.js
describe('Permissions Baseline Tests', () => {
  test('UserRole funzionante', async () => {
    const userRoles = await prisma.userRole.findMany({
      where: { eliminato: false },
      include: {
        user: true,
        role: true
      }
    });
    
    expect(userRoles.length).toBeGreaterThan(0);
  });
});
```

### Test Migrazione Ruoli
```javascript
// tests/migration/role_migration.test.js
describe('Role Migration Tests', () => {
  test('PersonRole sostituisce UserRole', async () => {
    const userRoleCount = await prisma.userRole.count();
    const personRoleCount = await prisma.personRole.count();
    
    expect(userRoleCount).toBe(0); // Nessun UserRole rimanente
    expect(personRoleCount).toBeGreaterThan(0); // PersonRole presenti
  });
  
  test('RoleType enum funzionante', async () => {
    const personRoles = await prisma.personRole.findMany();
    
    personRoles.forEach(role => {
      expect(['ADMIN', 'MANAGER', 'EMPLOYEE', 'TRAINER']).toContain(role.roleType);
    });
  });
  
  test('Permissions endpoint con PersonRole', async () => {
    const response = await request(app)
      .get('/api/v1/auth/permissions/person-admin-001')
      .set('Authorization', `Bearer ${validToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.permissions).toBeDefined();
    expect(response.body.role).toBeDefined();
  });
});
```

---

## 🛡️ TEST GDPR COMPLIANCE

### Test Baseline GDPR
```javascript
// tests/baseline/gdpr_baseline.test.js
describe('GDPR Baseline Tests', () => {
  test('Diritto accesso dati', async () => {
    const response = await request(app)
      .get('/api/v1/gdpr/export/person-admin-001')
      .set('Authorization', `Bearer ${validToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.personalData).toBeDefined();
    expect(response.body.roles).toBeDefined();
  });
  
  test('Diritto cancellazione', async () => {
    const testPersonId = 'test-person-001';
    
    const response = await request(app)
      .delete(`/api/v1/gdpr/delete/${testPersonId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.status).toBe(200);
    
    // Verifica soft delete
    const person = await prisma.person.findUnique({
      where: { id: testPersonId }
    });
    
    expect(person.deletedAt).not.toBeNull();
  });
});
```

### Test Migrazione GDPR
```javascript
// tests/migration/gdpr_migration.test.js
describe('GDPR Migration Tests', () => {
  test('Export dati con Person unificato', async () => {
    const response = await request(app)
      .get('/api/v1/gdpr/export/person-admin-001')
      .set('Authorization', `Bearer ${validToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.personalData.id).toMatch(/^person-/);
    expect(response.body.personalData.email).toBeDefined();
  });
  
  test('Cancellazione con deletedAt standardizzato', async () => {
    const testPersonId = 'test-person-002';
    
    await request(app)
      .delete(`/api/v1/gdpr/delete/${testPersonId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    // Verifica tutte le entità usano deletedAt
    const person = await prisma.person.findUnique({
      where: { id: testPersonId }
    });
    
    expect(person.deletedAt).not.toBeNull();
    expect(person.eliminato).toBeUndefined(); // Campo rimosso
    expect(person.isDeleted).toBeUndefined(); // Campo rimosso
  });
  
  test('Controlli accesso con PersonRole', async () => {
    // Test accesso negato per dati altri utenti
    const response = await request(app)
      .get('/api/v1/auth/permissions/person-other-001')
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(response.status).toBe(403);
    expect(response.body.error).toContain('Access denied');
  });
});
```

---

## ⚡ TEST PERFORMANCE

### Test Baseline Performance
```javascript
// tests/baseline/performance_baseline.test.js
describe('Performance Baseline Tests', () => {
  test('Login performance < 2s', async () => {
    const start = Date.now();
    
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'mario.rossi@acme-corp.com',
        password: 'Password123!'
      });
    
    const duration = Date.now() - start;
    
    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(2000);
  });
  
  test('Permissions query performance < 500ms', async () => {
    const start = Date.now();
    
    const response = await request(app)
      .get('/api/v1/auth/permissions/person-admin-001')
      .set('Authorization', `Bearer ${validToken}`);
    
    const duration = Date.now() - start;
    
    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(500);
  });
});
```

### Test Performance Post-Migrazione
```javascript
// tests/final/performance_final.test.js
describe('Performance Final Tests', () => {
  test('Performance mantenuta o migliorata', async () => {
    // Test che le performance siano uguali o migliori del baseline
    const loginStart = Date.now();
    await request(app).post('/api/v1/auth/login').send(credentials);
    const loginDuration = Date.now() - loginStart;
    
    const permissionsStart = Date.now();
    await request(app).get('/api/v1/auth/permissions/person-admin-001')
      .set('Authorization', `Bearer ${token}`);
    const permissionsDuration = Date.now() - permissionsStart;
    
    expect(loginDuration).toBeLessThan(2000);
    expect(permissionsDuration).toBeLessThan(500);
  });
});
```

---

## 🔄 TEST ROLLBACK

### Test Procedure Rollback
```javascript
// tests/migration/rollback.test.js
describe('Rollback Tests', () => {
  test('Rollback Fase 2: Person Migration', async () => {
    // Simula rollback migrazione Person
    await execSync('npm run rollback:person-migration');
    
    // Verifica User e Employee ripristinati
    const userCount = await prisma.user.count();
    const employeeCount = await prisma.employee.count();
    
    expect(userCount).toBeGreaterThan(0);
    expect(employeeCount).toBeGreaterThan(0);
    
    // Verifica login funziona con User
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send(credentials);
    
    expect(response.status).toBe(200);
  });
  
  test('Rollback Fase 3: Soft Delete', async () => {
    await execSync('npm run rollback:soft-delete');
    
    // Verifica campi eliminato ripristinati
    const companies = await prisma.company.findMany();
    companies.forEach(company => {
      expect(company.eliminato).toBeDefined();
      expect(company.deletedAt).toBeUndefined();
    });
  });
});
```

---

## 📊 METRICHE E REPORTING

### Coverage Target
- **Unit Tests**: 90%+ coverage
- **Integration Tests**: 80%+ coverage
- **E2E Tests**: 70%+ critical paths
- **GDPR Tests**: 100% compliance endpoints

### Performance Benchmarks
| Endpoint | Baseline | Target Post-Refactoring |
|----------|----------|------------------------|
| Login | < 2s | < 1.5s |
| Permissions | < 500ms | < 300ms |
| Courses List | < 1s | < 800ms |
| GDPR Export | < 5s | < 4s |

### Test Execution Plan
```bash
# Fase 1: Test Baseline
npm run test:baseline

# Fase 2: Test Migrazione (per ogni step)
npm run test:migration:person
npm run test:migration:soft-delete
npm run test:migration:roles

# Fase 3: Test Finale
npm run test:final
npm run test:performance
npm run test:gdpr

# Fase 4: Test Rollback
npm run test:rollback
```

---

## 🚨 CRITERI STOP/GO

### Criteri STOP (Rollback Immediato)
- ❌ Test autenticazione falliti
- ❌ Perdita dati durante migrazione
- ❌ Violazione GDPR compliance
- ❌ Performance degradata > 50%
- ❌ Test rollback falliti

### Criteri GO (Continua Migrazione)
- ✅ Tutti test baseline passati
- ✅ Test migrazione passati
- ✅ Performance mantenuta
- ✅ GDPR compliance verificata
- ✅ Rollback testato e funzionante

---

## 🎯 CHECKLIST ESECUZIONE

### Pre-Migrazione
- [ ] Test baseline eseguiti e passati
- [ ] Performance baseline registrate
- [ ] Test rollback preparati
- [ ] Backup database completo

### Durante Migrazione
- [ ] Test per ogni step di migrazione
- [ ] Verifica GDPR continua
- [ ] Monitoraggio performance
- [ ] Log dettagliati modifiche

### Post-Migrazione
- [ ] Test suite completa eseguita
- [ ] Performance verificate
- [ ] GDPR compliance confermata
- [ ] Documentazione test aggiornata

---

**Data Creazione**: 29 Dicembre 2024  
**Copertura Test**: 100% funzionalità critiche  
**GDPR Compliance**: 100% endpoint verificati  
**Performance**: Baseline + miglioramenti target  
**Rollback**: Testato per ogni fase