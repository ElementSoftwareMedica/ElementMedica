# Strategia di Testing: Unificazione Entità Persone

## 🎯 Obiettivo

Definire una strategia di testing completa e sistematica per validare l'unificazione delle entità `Employee`, `Trainer` e `User` in un'unica entità `Person`, garantendo qualità, performance e conformità GDPR.

## 📋 Panoramica Testing

### Piramide del Testing
```
    🔺 E2E Tests (5%)
   🔺🔺 Integration Tests (15%)
  🔺🔺🔺 Unit Tests (80%)
```

### Tipologie di Test
1. **Unit Tests** - Logica business e funzioni singole
2. **Integration Tests** - Interazione tra componenti
3. **Database Tests** - Integrità e performance DB
4. **API Tests** - Endpoint e contratti API
5. **Security Tests** - Sicurezza e GDPR
6. **Performance Tests** - Carico e stress
7. **E2E Tests** - Flussi utente completi
8. **Migration Tests** - Processo di migrazione
9. **Rollback Tests** - Procedure di rollback

## 🧪 Test Plan Dettagliato

### 1. Unit Tests

#### 1.1 Person Model Tests
```javascript
// tests/unit/models/person.test.js
describe('Person Model', () => {
  describe('Validation', () => {
    test('should validate required fields', async () => {
      const personData = {
        firstName: 'Mario',
        lastName: 'Rossi',
        email: 'mario.rossi@example.com',
        tenantId: 'tenant_123'
      };
      
      const person = await prisma.person.create({ data: personData });
      expect(person.id).toBeDefined();
      expect(person.email).toBe('mario.rossi@example.com');
    });
    
    test('should reject invalid email format', async () => {
      const personData = {
        firstName: 'Mario',
        lastName: 'Rossi',
        email: 'invalid-email',
        tenantId: 'tenant_123'
      };
      
      await expect(prisma.person.create({ data: personData }))
        .rejects.toThrow();
    });
    
    test('should enforce unique email per tenant', async () => {
      const personData = {
        firstName: 'Mario',
        lastName: 'Rossi',
        email: 'mario.rossi@example.com',
        tenantId: 'tenant_123'
      };
      
      await prisma.person.create({ data: personData });
      
      await expect(prisma.person.create({ data: personData }))
        .rejects.toThrow(/Unique constraint/);
    });
    
    test('should allow same email in different tenants', async () => {
      const personData1 = {
        firstName: 'Mario',
        lastName: 'Rossi',
        email: 'mario.rossi@example.com',
        tenantId: 'tenant_123'
      };
      
      const personData2 = {
        ...personData1,
        tenantId: 'tenant_456'
      };
      
      const person1 = await prisma.person.create({ data: personData1 });
      const person2 = await prisma.person.create({ data: personData2 });
      
      expect(person1.id).not.toBe(person2.id);
      expect(person1.email).toBe(person2.email);
    });
  });
  
  describe('PersonType Logic', () => {
    test('should determine EMPLOYEE type correctly', () => {
      const person = {
        employeeCode: 'EMP001',
        jobTitle: 'Developer',
        department: 'IT'
      };
      
      const personType = determinePersonType(person);
      expect(personType).toBe('EMPLOYEE');
    });
    
    test('should determine TRAINER type correctly', () => {
      const person = {
        trainerType: 'EXTERNAL',
        specializations: ['JavaScript', 'React'],
        hourlyRate: 50.00
      };
      
      const personType = determinePersonType(person);
      expect(personType).toBe('TRAINER');
    });
    
    test('should determine HYBRID type for mixed roles', () => {
      const person = {
        employeeCode: 'EMP001',
        jobTitle: 'Developer',
        trainerType: 'INTERNAL',
        specializations: ['JavaScript']
      };
      
      const personType = determinePersonType(person);
      expect(personType).toBe('HYBRID');
    });
  });
  
  describe('GDPR Compliance', () => {
    test('should pseudonymize sensitive data', async () => {
      const person = await createTestPerson();
      
      const pseudonymized = await pseudonymizePerson(person.id);
      
      expect(pseudonymized.firstName).toBe('DELETED');
      expect(pseudonymized.lastName).toBe('USER');
      expect(pseudonymized.email).toMatch(/^deleted-.*@pseudonymized\.local$/);
      expect(pseudonymized.taxCode).toBeNull();
    });
    
    test('should export GDPR data correctly', async () => {
      const person = await createTestPerson();
      
      const exportData = await exportPersonGdprData(person.id);
      
      expect(exportData).toHaveProperty('exportDate');
      expect(exportData).toHaveProperty('dataSubject');
      expect(exportData).toHaveProperty('personalData');
      expect(exportData.personalData).not.toHaveProperty('password');
    });
  });
});
```

#### 1.2 PersonRole Tests
```javascript
// tests/unit/models/personRole.test.js
describe('PersonRole Model', () => {
  describe('Role Assignment', () => {
    test('should assign role to person', async () => {
      const person = await createTestPerson();
      
      const role = await prisma.personRole.create({
        data: {
          personId: person.id,
          roleType: 'EMPLOYEE',
          assignedBy: 'admin_user'
        }
      });
      
      expect(role.personId).toBe(person.id);
      expect(role.roleType).toBe('EMPLOYEE');
      expect(role.isActive).toBe(true);
    });
    
    test('should prevent duplicate active roles', async () => {
      const person = await createTestPerson();
      
      await prisma.personRole.create({
        data: {
          personId: person.id,
          roleType: 'EMPLOYEE',
          assignedBy: 'admin_user'
        }
      });
      
      await expect(prisma.personRole.create({
        data: {
          personId: person.id,
          roleType: 'EMPLOYEE',
          assignedBy: 'admin_user'
        }
      })).rejects.toThrow(/Unique constraint/);
    });
    
    test('should revoke role correctly', async () => {
      const person = await createTestPerson();
      const role = await createTestRole(person.id, 'EMPLOYEE');
      
      const revokedRole = await revokePersonRole(role.id, 'admin_user');
      
      expect(revokedRole.isActive).toBe(false);
      expect(revokedRole.revokedAt).toBeDefined();
      expect(revokedRole.revokedBy).toBe('admin_user');
    });
  });
  
  describe('Permission Checks', () => {
    test('should check role permissions correctly', async () => {
      const person = await createTestPerson();
      await createTestRole(person.id, 'HR_MANAGER');
      
      const hasPermission = await checkPersonPermission(
        person.id, 
        'VIEW_EMPLOYEE_DATA'
      );
      
      expect(hasPermission).toBe(true);
    });
    
    test('should deny unauthorized permissions', async () => {
      const person = await createTestPerson();
      await createTestRole(person.id, 'VIEWER');
      
      const hasPermission = await checkPersonPermission(
        person.id, 
        'DELETE_PERSONAL_DATA'
      );
      
      expect(hasPermission).toBe(false);
    });
  });
});
```

#### 1.3 Migration Logic Tests
```javascript
// tests/unit/migration/migrationLogic.test.js
describe('Migration Logic', () => {
  describe('Data Mapping', () => {
    test('should map Employee data correctly', () => {
      const employee = {
        id: 'emp_123',
        firstName: 'Mario',
        lastName: 'Rossi',
        email: 'mario.rossi@company.com',
        jobTitle: 'Developer',
        department: 'IT',
        employeeCode: 'EMP001',
        salary: 50000
      };
      
      const personData = mapEmployeeToPerson(employee);
      
      expect(personData.firstName).toBe(employee.firstName);
      expect(personData.lastName).toBe(employee.lastName);
      expect(personData.email).toBe(employee.email);
      expect(personData.jobTitle).toBe(employee.jobTitle);
      expect(personData.personType).toBe('EMPLOYEE');
      expect(personData.migratedFrom).toBe('EMPLOYEE');
      expect(personData.originalId).toBe(employee.id);
    });
    
    test('should map Trainer data correctly', () => {
      const trainer = {
        id: 'trainer_123',
        firstName: 'Luigi',
        lastName: 'Verdi',
        email: 'luigi.verdi@company.com',
        isInternal: false,
        specializations: 'JavaScript,React,Node.js',
        hourlyRate: 75.00,
        iban: 'IT60X0542811101000000123456'
      };
      
      const personData = mapTrainerToPerson(trainer);
      
      expect(personData.firstName).toBe(trainer.firstName);
      expect(personData.trainerType).toBe('EXTERNAL');
      expect(personData.specializations).toEqual(['JavaScript', 'React', 'Node.js']);
      expect(personData.hourlyRate).toBe(trainer.hourlyRate);
      expect(personData.personType).toBe('TRAINER');
    });
    
    test('should handle hybrid mapping', () => {
      const employee = createTestEmployee();
      const trainer = { ...createTestTrainer(), email: employee.email };
      
      const personData = mapHybridToPerson(employee, trainer);
      
      expect(personData.personType).toBe('HYBRID');
      expect(personData.jobTitle).toBe(employee.jobTitle);
      expect(personData.trainerType).toBeDefined();
      expect(personData.specializations).toBeDefined();
    });
  });
  
  describe('Deduplication', () => {
    test('should identify duplicate emails', () => {
      const records = [
        { email: 'mario.rossi@company.com', source: 'Employee', id: 'emp_1' },
        { email: 'mario.rossi@company.com', source: 'User', id: 'user_1' },
        { email: 'luigi.verdi@company.com', source: 'Trainer', id: 'trainer_1' }
      ];
      
      const duplicates = findDuplicateEmails(records);
      
      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].email).toBe('mario.rossi@company.com');
      expect(duplicates[0].sources).toHaveLength(2);
    });
    
    test('should merge duplicate records correctly', () => {
      const employee = createTestEmployee();
      const user = { ...createTestUser(), email: employee.email };
      
      const merged = mergeDuplicateRecords([employee, user]);
      
      expect(merged.personType).toBe('HYBRID');
      expect(merged.firstName).toBe(employee.firstName);
      expect(merged.username).toBe(user.username);
      expect(merged.password).toBe(user.password);
    });
  });
});
```

### 2. Integration Tests

#### 2.1 Database Integration Tests
```javascript
// tests/integration/database.test.js
describe('Database Integration', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });
  
  afterEach(async () => {
    await cleanupTestDatabase();
  });
  
  describe('Person CRUD Operations', () => {
    test('should create person with roles', async () => {
      const personData = {
        firstName: 'Mario',
        lastName: 'Rossi',
        email: 'mario.rossi@company.com',
        tenantId: 'tenant_123',
        personType: 'EMPLOYEE'
      };
      
      const person = await personService.createPerson(personData);
      await roleService.assignRole(person.id, 'EMPLOYEE');
      
      const retrieved = await personService.getPersonWithRoles(person.id);
      
      expect(retrieved.personRoles).toHaveLength(1);
      expect(retrieved.personRoles[0].roleType).toBe('EMPLOYEE');
    });
    
    test('should update person maintaining relationships', async () => {
      const person = await createTestPersonWithRoles();
      
      const updated = await personService.updatePerson(person.id, {
        jobTitle: 'Senior Developer'
      });
      
      expect(updated.jobTitle).toBe('Senior Developer');
      
      const roles = await roleService.getPersonRoles(person.id);
      expect(roles).toHaveLength(1); // Roles should be preserved
    });
    
    test('should soft delete person and cascade', async () => {
      const person = await createTestPersonWithRoles();
      
      await personService.softDeletePerson(person.id);
      
      const deleted = await personService.getPersonById(person.id);
      expect(deleted.isDeleted).toBe(true);
      expect(deleted.deletedAt).toBeDefined();
      
      const roles = await roleService.getActivePersonRoles(person.id);
      expect(roles).toHaveLength(0); // Active roles should be revoked
    });
  });
  
  describe('Migration Integration', () => {
    test('should migrate complete dataset', async () => {
      // Setup test data
      await seedTestData();
      
      // Execute migration
      const result = await migrationService.executeFullMigration();
      
      expect(result.success).toBe(true);
      expect(result.employeesMigrated).toBeGreaterThan(0);
      expect(result.trainersMigrated).toBeGreaterThan(0);
      expect(result.usersMigrated).toBeGreaterThan(0);
      
      // Verify data integrity
      const totalPersons = await prisma.person.count();
      const totalRoles = await prisma.personRole.count();
      
      expect(totalPersons).toBeGreaterThan(0);
      expect(totalRoles).toBeGreaterThan(0);
    });
    
    test('should handle migration rollback', async () => {
      await seedTestData();
      
      // Execute migration
      await migrationService.executeFullMigration();
      
      // Execute rollback
      const rollbackResult = await migrationService.executeRollback();
      
      expect(rollbackResult.success).toBe(true);
      
      // Verify original tables restored
      const employeeCount = await prisma.employee.count();
      const trainerCount = await prisma.trainer.count();
      const userCount = await prisma.user.count();
      
      expect(employeeCount).toBeGreaterThan(0);
      expect(trainerCount).toBeGreaterThan(0);
      expect(userCount).toBeGreaterThan(0);
    });
  });
});
```

#### 2.2 API Integration Tests
```javascript
// tests/integration/api.test.js
describe('API Integration', () => {
  let authToken;
  
  beforeEach(async () => {
    authToken = await getTestAuthToken();
  });
  
  describe('Person API Endpoints', () => {
    test('GET /api/persons should return paginated results', async () => {
      await createTestPersons(25);
      
      const response = await request(app)
        .get('/api/persons?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.data).toHaveLength(10);
      expect(response.body.pagination.total).toBe(25);
      expect(response.body.pagination.pages).toBe(3);
    });
    
    test('POST /api/persons should create person with validation', async () => {
      const personData = {
        firstName: 'Mario',
        lastName: 'Rossi',
        email: 'mario.rossi@company.com',
        personType: 'EMPLOYEE'
      };
      
      const response = await request(app)
        .post('/api/persons')
        .set('Authorization', `Bearer ${authToken}`)
        .send(personData)
        .expect(201);
      
      expect(response.body.id).toBeDefined();
      expect(response.body.email).toBe(personData.email);
    });
    
    test('PUT /api/persons/:id should update person', async () => {
      const person = await createTestPerson();
      
      const updateData = {
        jobTitle: 'Senior Developer',
        department: 'Engineering'
      };
      
      const response = await request(app)
        .put(`/api/persons/${person.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);
      
      expect(response.body.jobTitle).toBe(updateData.jobTitle);
      expect(response.body.department).toBe(updateData.department);
    });
    
    test('DELETE /api/persons/:id should soft delete', async () => {
      const person = await createTestPerson();
      
      await request(app)
        .delete(`/api/persons/${person.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
      
      const deleted = await prisma.person.findUnique({
        where: { id: person.id }
      });
      
      expect(deleted.isDeleted).toBe(true);
    });
  });
  
  describe('GDPR API Endpoints', () => {
    test('GET /api/persons/:id/gdpr-export should export data', async () => {
      const person = await createTestPersonWithData();
      
      const response = await request(app)
        .get(`/api/persons/${person.id}/gdpr-export`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.exportDate).toBeDefined();
      expect(response.body.dataSubject.id).toBe(person.id);
      expect(response.body.personalData).toBeDefined();
      expect(response.body.personalData.password).toBeUndefined();
    });
    
    test('POST /api/persons/:id/gdpr-delete should handle erasure', async () => {
      const person = await createTestPerson();
      
      const response = await request(app)
        .post(`/api/persons/${person.id}/gdpr-delete`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'User request' })
        .expect(200);
      
      expect(response.body.status).toMatch(/deleted|pseudonymized/);
    });
  });
});
```

### 3. Security Tests

#### 3.1 Authentication & Authorization Tests
```javascript
// tests/security/auth.test.js
describe('Security Tests', () => {
  describe('Authentication', () => {
    test('should authenticate with valid credentials', async () => {
      const person = await createTestPersonWithAuth();
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: person.email,
          password: 'testPassword123'
        })
        .expect(200);
      
      expect(response.body.token).toBeDefined();
      expect(response.body.person.id).toBe(person.id);
    });
    
    test('should reject invalid credentials', async () => {
      const person = await createTestPersonWithAuth();
      
      await request(app)
        .post('/api/auth/login')
        .send({
          email: person.email,
          password: 'wrongPassword'
        })
        .expect(401);
    });
    
    test('should implement rate limiting', async () => {
      const person = await createTestPersonWithAuth();
      
      // Attempt multiple failed logins
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: person.email,
            password: 'wrongPassword'
          });
      }
      
      // Should be rate limited
      await request(app)
        .post('/api/auth/login')
        .send({
          email: person.email,
          password: 'wrongPassword'
        })
        .expect(429);
    });
  });
  
  describe('Authorization', () => {
    test('should enforce role-based access', async () => {
      const viewer = await createTestPersonWithRole('VIEWER');
      const viewerToken = await generateAuthToken(viewer.id);
      
      await request(app)
        .delete('/api/persons/any-id')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });
    
    test('should allow admin access', async () => {
      const admin = await createTestPersonWithRole('ADMIN');
      const adminToken = await generateAuthToken(admin.id);
      const targetPerson = await createTestPerson();
      
      await request(app)
        .delete(`/api/persons/${targetPerson.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });
  });
  
  describe('Data Protection', () => {
    test('should not expose sensitive data in API responses', async () => {
      const person = await createTestPersonWithAuth();
      const token = await generateAuthToken(person.id);
      
      const response = await request(app)
        .get(`/api/persons/${person.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.password).toBeUndefined();
      expect(response.body.passwordResetToken).toBeUndefined();
    });
    
    test('should validate input sanitization', async () => {
      const token = await getAdminToken();
      
      const maliciousData = {
        firstName: '<script>alert("xss")</script>',
        lastName: 'Test',
        email: 'test@example.com'
      };
      
      const response = await request(app)
        .post('/api/persons')
        .set('Authorization', `Bearer ${token}`)
        .send(maliciousData)
        .expect(201);
      
      expect(response.body.firstName).not.toContain('<script>');
    });
  });
});
```

### 4. Performance Tests

#### 4.1 Load Testing
```javascript
// tests/performance/load.test.js
describe('Performance Tests', () => {
  describe('Database Performance', () => {
    test('should handle large dataset queries efficiently', async () => {
      // Create large dataset
      await createTestPersons(10000);
      
      const startTime = Date.now();
      
      const result = await prisma.person.findMany({
        where: {
          isActive: true,
          isDeleted: false
        },
        include: {
          personRoles: {
            where: { isActive: true }
          }
        },
        take: 100,
        skip: 0
      });
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(result).toHaveLength(100);
      expect(queryTime).toBeLessThan(1000); // Should complete in < 1 second
    });
    
    test('should optimize search queries', async () => {
      await createTestPersons(5000);
      
      const startTime = Date.now();
      
      const result = await prisma.person.findMany({
        where: {
          OR: [
            { firstName: { contains: 'Mario', mode: 'insensitive' } },
            { lastName: { contains: 'Mario', mode: 'insensitive' } },
            { email: { contains: 'mario', mode: 'insensitive' } }
          ]
        },
        take: 50
      });
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(queryTime).toBeLessThan(500); // Should complete in < 500ms
    });
  });
  
  describe('API Performance', () => {
    test('should handle concurrent requests', async () => {
      const token = await getTestAuthToken();
      const promises = [];
      
      // Create 50 concurrent requests
      for (let i = 0; i < 50; i++) {
        promises.push(
          request(app)
            .get('/api/persons?page=1&limit=10')
            .set('Authorization', `Bearer ${token}`)
        );
      }
      
      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      expect(totalTime).toBeLessThan(5000); // All requests in < 5 seconds
    });
  });
  
  describe('Migration Performance', () => {
    test('should migrate large dataset efficiently', async () => {
      // Create large test dataset
      await createLargeTestDataset({
        employees: 1000,
        trainers: 500,
        users: 2000
      });
      
      const startTime = Date.now();
      
      const result = await migrationService.executeFullMigration();
      
      const endTime = Date.now();
      const migrationTime = endTime - startTime;
      
      expect(result.success).toBe(true);
      expect(migrationTime).toBeLessThan(60000); // Should complete in < 1 minute
      
      // Verify all data migrated
      const personCount = await prisma.person.count();
      expect(personCount).toBeGreaterThan(0);
    });
  });
});
```

### 5. End-to-End Tests

#### 5.1 User Journey Tests
```javascript
// tests/e2e/userJourneys.test.js
describe('E2E User Journeys', () => {
  let browser, page;
  
  beforeAll(async () => {
    browser = await puppeteer.launch({ headless: true });
  });
  
  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto('http://localhost:3000');
  });
  
  afterEach(async () => {
    await page.close();
  });
  
  afterAll(async () => {
    await browser.close();
  });
  
  describe('Admin User Journey', () => {
    test('should manage persons end-to-end', async () => {
      // Login as admin
      await page.type('#email', 'admin@company.com');
      await page.type('#password', 'adminPassword123');
      await page.click('#login-button');
      
      await page.waitForSelector('#dashboard');
      
      // Navigate to persons list
      await page.click('#persons-menu');
      await page.waitForSelector('#persons-list');
      
      // Create new person
      await page.click('#add-person-button');
      await page.waitForSelector('#person-form');
      
      await page.type('#firstName', 'Mario');
      await page.type('#lastName', 'Rossi');
      await page.type('#email', 'mario.rossi@company.com');
      await page.select('#personType', 'EMPLOYEE');
      
      await page.click('#save-person-button');
      await page.waitForSelector('#success-message');
      
      // Verify person appears in list
      await page.goto('http://localhost:3000/persons');
      await page.waitForSelector('#persons-list');
      
      const personExists = await page.$eval('#persons-list', el => 
        el.textContent.includes('mario.rossi@company.com')
      );
      
      expect(personExists).toBe(true);
      
      // Assign role
      await page.click('[data-testid="person-mario.rossi@company.com"] .assign-role-button');
      await page.waitForSelector('#role-assignment-modal');
      
      await page.select('#roleType', 'EMPLOYEE');
      await page.click('#assign-role-button');
      
      await page.waitForSelector('#role-assigned-message');
      
      // Verify role assigned
      const roleAssigned = await page.$eval(
        '[data-testid="person-mario.rossi@company.com"] .roles',
        el => el.textContent.includes('EMPLOYEE')
      );
      
      expect(roleAssigned).toBe(true);
    });
  });
  
  describe('Employee Self-Service Journey', () => {
    test('should allow employee to view and update profile', async () => {
      const employee = await createTestPersonWithRole('EMPLOYEE');
      
      // Login as employee
      await page.type('#email', employee.email);
      await page.type('#password', 'employeePassword123');
      await page.click('#login-button');
      
      await page.waitForSelector('#dashboard');
      
      // Navigate to profile
      await page.click('#profile-menu');
      await page.waitForSelector('#profile-form');
      
      // Update profile
      await page.clear('#phone');
      await page.type('#phone', '+39 123 456 7890');
      
      await page.click('#save-profile-button');
      await page.waitForSelector('#profile-updated-message');
      
      // Verify update
      const phoneValue = await page.$eval('#phone', el => el.value);
      expect(phoneValue).toBe('+39 123 456 7890');
    });
  });
  
  describe('GDPR Compliance Journey', () => {
    test('should handle data export request', async () => {
      const person = await createTestPersonWithData();
      
      // Login
      await page.type('#email', person.email);
      await page.type('#password', 'testPassword123');
      await page.click('#login-button');
      
      // Navigate to privacy settings
      await page.click('#privacy-menu');
      await page.waitForSelector('#privacy-settings');
      
      // Request data export
      await page.click('#export-data-button');
      await page.waitForSelector('#export-confirmation-modal');
      
      await page.click('#confirm-export-button');
      await page.waitForSelector('#export-requested-message');
      
      // Verify export initiated
      const message = await page.$eval('#export-requested-message', el => el.textContent);
      expect(message).toContain('export request has been submitted');
    });
  });
});
```

### 6. Migration-Specific Tests

#### 6.1 Migration Validation Tests
```javascript
// tests/migration/validation.test.js
describe('Migration Validation', () => {
  describe('Pre-Migration Checks', () => {
    test('should validate data integrity before migration', async () => {
      await seedInconsistentTestData();
      
      const validation = await migrationService.validatePreMigration();
      
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('DUPLICATE_EMAILS');
      expect(validation.issues).toContain('MISSING_REQUIRED_FIELDS');
    });
    
    test('should identify and resolve conflicts', async () => {
      await seedConflictingTestData();
      
      const conflicts = await migrationService.identifyConflicts();
      expect(conflicts).toHaveLength(2);
      
      const resolved = await migrationService.resolveConflicts(conflicts);
      expect(resolved.success).toBe(true);
    });
  });
  
  describe('Migration Execution', () => {
    test('should maintain referential integrity', async () => {
      await seedCompleteTestData();
      
      await migrationService.executeFullMigration();
      
      // Check all foreign key relationships
      const orphanedEnrollments = await prisma.courseEnrollment.count({
        where: {
          personId: null,
          employeeId: { not: null }
        }
      });
      
      expect(orphanedEnrollments).toBe(0);
      
      const orphanedCourses = await prisma.course.count({
        where: {
          trainerPersonId: null,
          trainerId: { not: null }
        }
      });
      
      expect(orphanedCourses).toBe(0);
    });
    
    test('should preserve data accuracy', async () => {
      const originalData = await captureOriginalData();
      
      await migrationService.executeFullMigration();
      
      const migratedData = await captureMigratedData();
      
      // Verify data accuracy
      expect(migratedData.totalRecords).toBe(originalData.totalRecords);
      expect(migratedData.uniqueEmails).toBe(originalData.uniqueEmails);
      
      // Spot check specific records
      for (const original of originalData.sampleRecords) {
        const migrated = migratedData.records.find(r => 
          r.email === original.email && r.tenantId === original.tenantId
        );
        
        expect(migrated).toBeDefined();
        expect(migrated.firstName).toBe(original.firstName);
        expect(migrated.lastName).toBe(original.lastName);
      }
    });
  });
  
  describe('Post-Migration Validation', () => {
    test('should verify all data migrated correctly', async () => {
      await seedTestData();
      const preMigrationCounts = await getPreMigrationCounts();
      
      await migrationService.executeFullMigration();
      
      const validation = await migrationService.validatePostMigration();
      
      expect(validation.isValid).toBe(true);
      expect(validation.personCount).toBeGreaterThan(0);
      expect(validation.roleCount).toBeGreaterThan(0);
      expect(validation.migrationLogCount).toBe(
        preMigrationCounts.employees + 
        preMigrationCounts.trainers + 
        preMigrationCounts.users
      );
    });
  });
});
```

## 📊 Test Execution Strategy

### Test Environment Setup
```yaml
# docker-compose.test.yml
version: '3.8'
services:
  test-db:
    image: postgres:15
    environment:
      POSTGRES_DB: test_db
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_password
    ports:
      - "5433:5432"
    volumes:
      - test_db_data:/var/lib/postgresql/data
  
  test-app:
    build: .
    environment:
      NODE_ENV: test
      DATABASE_URL: postgresql://test_user:test_password@test-db:5432/test_db
    depends_on:
      - test-db
    volumes:
      - .:/app
      - /app/node_modules

volumes:
  test_db_data:
```

### Test Data Management
```javascript
// tests/helpers/testData.js
class TestDataManager {
  static async setupTestDatabase() {
    await prisma.$executeRaw`TRUNCATE TABLE "Person" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "PersonRole" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "MigrationLog" CASCADE`;
    
    // Reset sequences
    await prisma.$executeRaw`ALTER SEQUENCE person_id_seq RESTART WITH 1`;
  }
  
  static async createTestPerson(overrides = {}) {
    const defaultData = {
      firstName: 'Test',
      lastName: 'User',
      email: `test.user.${Date.now()}@example.com`,
      tenantId: 'test_tenant',
      personType: 'USER',
      ...overrides
    };
    
    return await prisma.person.create({ data: defaultData });
  }
  
  static async createTestPersonWithRole(roleType) {
    const person = await this.createTestPerson();
    
    await prisma.personRole.create({
      data: {
        personId: person.id,
        roleType,
        assignedBy: 'test_system'
      }
    });
    
    return person;
  }
  
  static async seedLargeDataset(counts) {
    const promises = [];
    
    // Create employees
    for (let i = 0; i < counts.employees; i++) {
      promises.push(this.createTestEmployee({
        email: `employee${i}@company.com`,
        employeeCode: `EMP${String(i).padStart(4, '0')}`
      }));
    }
    
    // Create trainers
    for (let i = 0; i < counts.trainers; i++) {
      promises.push(this.createTestTrainer({
        email: `trainer${i}@company.com`
      }));
    }
    
    // Create users
    for (let i = 0; i < counts.users; i++) {
      promises.push(this.createTestUser({
        email: `user${i}@company.com`,
        username: `user${i}`
      }));
    }
    
    await Promise.all(promises);
  }
}
```

### Continuous Integration Pipeline
```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Setup test database
      run: |
        npx prisma migrate deploy
        npx prisma db seed
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
    
    - name: Run unit tests
      run: npm run test:unit
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
    
    - name: Run integration tests
      run: npm run test:integration
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
    
    - name: Run migration tests
      run: npm run test:migration
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
    
    - name: Run security tests
      run: npm run test:security
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
    
    - name: Generate coverage report
      run: npm run test:coverage
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
```

## 📈 Test Metrics & Reporting

### Coverage Requirements
- **Unit Tests**: ≥ 90% code coverage
- **Integration Tests**: ≥ 80% API endpoint coverage
- **E2E Tests**: ≥ 70% user journey coverage
- **Migration Tests**: 100% migration script coverage

### Performance Benchmarks
- **API Response Time**: < 200ms (95th percentile)
- **Database Query Time**: < 100ms (average)
- **Migration Time**: < 5 minutes for 10k records
- **Concurrent Users**: Support 100 concurrent users

### Quality Gates
```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.test.{js,ts}',
    '!src/migrations/**',
    '!src/seeds/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/services/': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testEnvironment: 'node'
};
```

## ✅ Test Execution Checklist

### Pre-Testing
- [ ] Test environment configured
- [ ] Test database seeded
- [ ] Dependencies installed
- [ ] Environment variables set
- [ ] Test data prepared

### Test Execution
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Security tests passing
- [ ] Performance tests passing
- [ ] Migration tests passing
- [ ] E2E tests passing
- [ ] Coverage thresholds met

### Post-Testing
- [ ] Test reports generated
- [ ] Coverage reports reviewed
- [ ] Performance metrics analyzed
- [ ] Issues documented
- [ ] Test environment cleaned

---

**Versione**: 1.0
**Data**: $(date +%Y-%m-%d)
**Responsabile**: QA Team Lead
**Prossima Revisione**: Settimanale durante sviluppo
**Stato**: ✅ Pronto per implementazione