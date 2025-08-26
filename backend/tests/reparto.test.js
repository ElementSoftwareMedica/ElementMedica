/**
 * Test di integrazione per il modello Reparto
 * Verifica che il modello sia stato creato correttamente e che le API siano funzionali
 */

import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';

// Mock Prisma
const mockPrisma = {
  reparto: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  companySite: {
    findUnique: jest.fn()
  },
  person: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  }
};

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

// Mock middleware functions
const mockAuthMiddleware = (req, res, next) => {
  req.user = {
    id: '1',
    globalRole: 'ADMIN',
    companyId: '1',
    tenantId: '1'
  };
  req.person = {
    id: '1',
    nome: 'Test',
    cognome: 'User',
    email: 'test@example.com',
    globalRole: 'ADMIN',
    companyId: '1',
    tenantId: '1'
  };
  next();
};

const mockPermissionMiddleware = (req, res, next) => next();
const mockFilterMiddleware = (req, res, next) => next();

// Apply mocks before imports
jest.unstable_mockModule('../config/prisma-optimization.js', () => ({
  default: mockPrisma
}));

jest.unstable_mockModule('../utils/logger.js', () => ({
  default: mockLogger
}));

jest.unstable_mockModule('../auth/middleware.js', () => ({
  default: {
    authenticate: () => mockAuthMiddleware
  }
}));

jest.unstable_mockModule('../middleware/advanced-permissions.js', () => ({
  checkAdvancedPermission: () => mockPermissionMiddleware,
  filterDataByPermissions: () => mockFilterMiddleware
}));

// Import routes after mocking
const { default: repartoRoutes } = await import('../routes/reparto-routes.js');

describe('Reparto API Tests', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/reparto', repartoRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/reparto/:id', () => {
    test('should get reparto by id', async () => {
      const mockReparto = { 
        id: '1', 
        nome: 'Reparto 1', 
        descrizione: 'Desc 1', 
        siteId: '1',
        site: {
          id: '1',
          siteName: 'Test Site',
          companyId: 1,
          company: { id: 1, name: 'Test Company' }
        },
        responsabile: null,
        dipendenti: []
      };
      
      mockPrisma.reparto.findUnique.mockResolvedValue(mockReparto);
      
      const response = await request(app)
        .get('/api/reparto/1')
        .expect(200);
      
      expect(response.body).toEqual(mockReparto);
      expect(mockPrisma.reparto.findUnique).toHaveBeenCalledWith({
        where: { id: '1', deletedAt: null },
        include: {
          site: {
            include: {
              company: true
            }
          },
          responsabile: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          dipendenti: {
            where: { deletedAt: null },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              title: true
            }
          }
        }
      });
    });

    test('should return 404 for non-existent reparto', async () => {
      mockPrisma.reparto.findUnique.mockResolvedValue(null);
      
      const response = await request(app)
        .get('/api/reparto/999')
        .expect(404);
      
      expect(response.body.error).toBe('Department not found');
    });
  });

  describe('POST /api/reparto', () => {
    test('should create new reparto', async () => {
      const newReparto = { 
        siteId: '1', 
        nome: 'Nuovo Reparto', 
        descrizione: 'Nuova Desc' 
      };
      const createdReparto = { 
        id: '1', 
        ...newReparto,
        tenantId: '1',
        site: {
          id: '1',
          siteName: 'Test Site',
          company: { id: '1', name: 'Test Company' }
        },
        responsabile: null
      };
      
      mockPrisma.companySite.findUnique.mockResolvedValue({ 
        id: '1', 
        siteName: 'Test Site',
        companyId: '1',
        company: { id: '1', name: 'Test Company' }
      });
      mockPrisma.reparto.findFirst.mockResolvedValue(null); // No existing reparto
      mockPrisma.reparto.create.mockResolvedValue(createdReparto);
      
      const response = await request(app)
        .post('/api/reparto')
        .send(newReparto)
        .expect(201);
      
      expect(response.body).toEqual(createdReparto);
      expect(mockPrisma.reparto.create).toHaveBeenCalledWith({
        data: {
          ...newReparto,
          tenantId: '1'
        },
        include: {
          site: {
            select: {
              id: true,
              siteName: true,
              company: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          responsabile: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });
    });

    test('should validate required fields', async () => {
      const invalidReparto = { descrizione: 'Desc senza nome' };
      
      const response = await request(app)
        .post('/api/reparto')
        .send(invalidReparto)
        .expect(400);
      
      expect(response.body.error).toBe('Validation error');
      expect(response.body.message).toBe('siteId and nome are required');
    });

    test('should validate siteId exists', async () => {
      const newReparto = { siteId: '999', nome: 'Nuovo Reparto', descrizione: 'Desc' };
      
      mockPrisma.companySite.findUnique.mockResolvedValue(null);
      
      const response = await request(app)
        .post('/api/reparto')
        .send(newReparto)
        .expect(404);
      
      expect(response.body.error).toBe('Site not found');
    });
  });

  describe('PUT /api/reparto/:id', () => {
    test('should update reparto', async () => {
      const updateData = { nome: 'Reparto Aggiornato', descrizione: 'Desc Aggiornata' };
      const existingReparto = { 
        id: '1', 
        nome: 'Old Name', 
        siteId: '1',
        site: {
          id: '1',
          companyId: '1',
          company: { id: '1', name: 'Test Company' }
        }
      };
      const updatedReparto = { 
        ...existingReparto, 
        ...updateData,
        site: {
          id: '1',
          siteName: 'Test Site',
          company: { id: '1', name: 'Test Company' }
        },
        responsabile: null,
        dipendenti: []
      };
      
      // Mock per la verifica dell'esistenza del reparto
      mockPrisma.reparto.findUnique.mockResolvedValue(existingReparto);
      // Mock per la verifica di duplicati (nessun duplicato)
      mockPrisma.reparto.findFirst.mockResolvedValue(null);
      // Mock per l'update
      mockPrisma.reparto.update.mockResolvedValue(updatedReparto);
      
      const response = await request(app)
        .put('/api/reparto/1')
        .send(updateData)
        .expect(200);
      
      expect(response.body).toEqual(updatedReparto);
      expect(mockPrisma.reparto.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          nome: 'Reparto Aggiornato',
          descrizione: 'Desc Aggiornata'
        },
        include: {
          site: {
            select: {
              id: true,
              siteName: true,
              company: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          responsabile: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          dipendenti: {
            where: { deletedAt: null },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });
    });

    test('should return 404 for non-existent reparto', async () => {
      mockPrisma.reparto.findUnique.mockResolvedValue(null);
      
      const response = await request(app)
        .put('/api/reparto/999')
        .send({ nome: 'Test' })
        .expect(404);
      
      expect(response.body.error).toBe('Department not found');
    });
  });

  describe('DELETE /api/reparto/:id', () => {
    test('should delete reparto', async () => {
      const existingReparto = { 
        id: '1', 
        nome: 'Test Reparto',
        site: {
          id: '1',
          companyId: '1',
          company: { id: '1', name: 'Test Company' }
        },
        dipendenti: [] // Nessun dipendente assegnato
      };
      
      // Mock per la verifica dell'esistenza del reparto
      mockPrisma.reparto.findUnique.mockResolvedValue(existingReparto);
      // Mock per il soft delete
      mockPrisma.reparto.update.mockResolvedValue({ ...existingReparto, deletedAt: new Date() });
      
      await request(app)
        .delete('/api/reparto/1')
        .expect(204);
      
      expect(mockPrisma.reparto.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { deletedAt: expect.any(Date) }
      });
    });

    test('should not delete reparto with assigned employees', async () => {
      const existingReparto = { 
        id: '1', 
        nome: 'Test Reparto',
        site: {
          id: '1',
          companyId: '1',
          company: { id: '1', name: 'Test Company' }
        },
        dipendenti: [{ id: '1', firstName: 'John', lastName: 'Doe' }] // Ha dipendenti assegnati
      };
      
      mockPrisma.reparto.findUnique.mockResolvedValue(existingReparto);
      
      const response = await request(app)
        .delete('/api/reparto/1')
        .expect(409);
      
      expect(response.body).toEqual({
        error: 'Conflict',
        message: 'Cannot delete department with assigned employees. Please reassign employees first.'
      });
    });

    test('should return 404 for non-existent reparto', async () => {
      mockPrisma.reparto.findUnique.mockResolvedValue(null);
      
      const response = await request(app)
        .delete('/api/reparto/999')
        .expect(404);
      
      expect(response.body.error).toBe('Department not found');
    });
  });

  describe('POST /api/reparto/:id/assign-employee', () => {
    test('should assign employee to reparto', async () => {
      const mockReparto = { 
        id: '1', 
        nome: 'Test Reparto',
        site: {
          id: '1',
          companyId: '1',
          company: { id: '1', name: 'Test Company' }
        }
      };
      const mockEmployee = { 
        id: '1', 
        firstName: 'Test', 
        lastName: 'Employee',
        repartoId: null,
        companyId: '1'
      };
      
      mockPrisma.reparto.findUnique.mockResolvedValue(mockReparto);
      mockPrisma.person.findUnique.mockResolvedValue(mockEmployee);
      mockPrisma.person.update.mockResolvedValue({ ...mockEmployee, repartoId: '1' });
      
      const response = await request(app)
        .post('/api/reparto/1/assign-employee')
        .send({ personId: '1' })
        .expect(200);
      
      expect(response.body.message).toBe('Employee assigned to department successfully');
      expect(mockPrisma.person.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { repartoId: '1' }
      });
    });

    test('should return 404 for non-existent reparto', async () => {
      mockPrisma.reparto.findUnique.mockResolvedValue(null);
      
      const response = await request(app)
        .post('/api/reparto/999/assign-employee')
        .send({ personId: '1' })
        .expect(404);
      
      expect(response.body.error).toBe('Department not found');
    });

    test('should return 404 for non-existent employee', async () => {
      const mockReparto = { 
        id: '1',
        site: {
          id: '1',
          companyId: 1,
          company: { id: 1, name: 'Test Company' }
        }
      };
      
      mockPrisma.reparto.findUnique.mockResolvedValue(mockReparto);
      mockPrisma.person.findUnique.mockResolvedValue(null);
      
      const response = await request(app)
        .post('/api/reparto/1/assign-employee')
        .send({ personId: '999' })
        .expect(404);
      
      expect(response.body.error).toBe('Employee not found');
    });

    test('should validate required personId', async () => {
      const response = await request(app)
        .post('/api/reparto/1/assign-employee')
        .send({})
        .expect(400);
      
      expect(response.body.error).toBe('Validation error');
      expect(response.body.message).toBe('personId is required');
    });
  });

  describe('POST /api/reparto/:id/remove-employee', () => {
    test('should remove employee from reparto', async () => {
      const mockReparto = { 
        id: '1', 
        nome: 'Test Reparto',
        site: {
          id: '1',
          companyId: 1,
          company: { id: 1, name: 'Test Company' }
        }
      };
      const mockEmployee = { 
        id: '1', 
        firstName: 'Test', 
        lastName: 'Employee',
        repartoId: '1',
        companyId: 1
      };
      
      mockPrisma.reparto.findUnique.mockResolvedValue(mockReparto);
      mockPrisma.person.findUnique.mockResolvedValue(mockEmployee);
      mockPrisma.person.update.mockResolvedValue({ ...mockEmployee, repartoId: null });
      
      const response = await request(app)
        .post('/api/reparto/1/remove-employee')
        .send({ personId: '1' })
        .expect(200);
      
      expect(response.body.message).toBe('Employee removed from department successfully');
      expect(mockPrisma.person.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { repartoId: null }
      });
    });

    test('should return 400 for non-existent reparto', async () => {
      mockPrisma.reparto.findUnique.mockResolvedValue(null);
      
      const response = await request(app)
        .post('/api/reparto/999/remove-employee')
        .send({ personId: '1' })
        .expect(404);
      
      expect(response.body.error).toBe('Department not found');
    });

    test('should return 400 for non-existent employee', async () => {
      const mockReparto = { 
        id: '1',
        site: {
          id: '1',
          companyId: 1,
          company: { id: 1, name: 'Test Company' }
        }
      };
      
      mockPrisma.reparto.findUnique.mockResolvedValue(mockReparto);
      mockPrisma.person.findUnique.mockResolvedValue(null);
      
      const response = await request(app)
        .post('/api/reparto/1/remove-employee')
        .send({ personId: '999' })
        .expect(404);
      
      expect(response.body.error).toBe('Employee not found');
    });

    test('should validate employee is assigned to department', async () => {
      const mockReparto = { 
        id: '1',
        site: {
          id: '1',
          companyId: 1,
          company: { id: 1, name: 'Test Company' }
        }
      };
      const mockEmployee = { 
        id: '1', 
        firstName: 'Test', 
        lastName: 'Employee',
        repartoId: '2', // Different department
        companyId: 1
      };
      
      mockPrisma.reparto.findUnique.mockResolvedValue(mockReparto);
      mockPrisma.person.findUnique.mockResolvedValue(mockEmployee);
      
      const response = await request(app)
        .post('/api/reparto/1/remove-employee')
        .send({ personId: '1' })
        .expect(400);
      
      expect(response.body.error).toBe('Validation error');
      expect(response.body.message).toBe('Employee is not assigned to this department');
    });

    test('should validate required personId', async () => {
      const response = await request(app)
        .post('/api/reparto/1/remove-employee')
        .send({})
        .expect(400);
      
      expect(response.body.error).toBe('Validation error');
      expect(response.body.message).toBe('personId is required');
    });
  });
});