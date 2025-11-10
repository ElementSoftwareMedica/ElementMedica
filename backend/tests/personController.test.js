/**
 * Test suite for PersonController
 * Tests the unified person management functionality
 */

import { jest } from '@jest/globals';

// Mock the dependencies using unstable_mockModule
jest.unstable_mockModule('../services/personService.js', () => ({
  default: {
    getEmployees: jest.fn(),
    getTrainers: jest.fn(),
    createPerson: jest.fn(),
    updatePerson: jest.fn(),
    deletePerson: jest.fn(),
    assignRole: jest.fn(),
    removeRole: jest.fn(),
    addRole: jest.fn(),
    searchPersons: jest.fn(),
    getSystemUsers: jest.fn(),
    getPersonById: jest.fn(),
    exportPersonsToCSV: jest.fn(),
    exportPersonsToJSON: jest.fn()
  }
}));

jest.unstable_mockModule('../utils/logger.js', () => ({
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

jest.unstable_mockModule('../config/prisma-optimization.js', () => ({
  default: {
    person: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    tenant: {
      findFirst: jest.fn()
    }
  }
}));

jest.unstable_mockModule('../services/enhancedRoleService.js', () => ({
  default: {
    filterDataByPermissions: jest.fn()
  }
}));

// Stable singleton for AdvancedPermissionService to avoid issues with mock.instances reset
const apsSingleton = {
  checkPermission: jest.fn(),
  getDefaultFieldsForRole: jest.fn(),
  filterAllowedFields: jest.fn(),
  getPersonById: jest.fn()
};

// Mock AdvancedPermissionService class to always return our singleton
jest.unstable_mockModule('../services/advanced-permission.js', () => ({
  default: jest.fn().mockImplementation(() => apsSingleton)
}));

// Import after mocking
const { default: personController } = await import('../controllers/personController.js');
const { default: mockPersonService } = await import('../services/personService.js');
const { default: mockPrisma } = await import('../config/prisma-optimization.js');
const { default: mockEnhancedRoleService } = await import('../services/enhancedRoleService.js');

describe('PersonController', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Reset mock objects
    mockReq = {
      user: { id: '1', companyId: '1' },
      person: { id: '1', companyId: '1', tenantId: '1' },
      params: {},
      body: {},
      query: {},
      tenantId: '1'
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
    
    // Setup default prisma mocks
    mockPrisma.person.findMany.mockResolvedValue([]);
    mockPrisma.person.findFirst.mockResolvedValue(null);
    mockPrisma.person.findUnique.mockResolvedValue(null);
    mockPrisma.tenant.findFirst.mockResolvedValue({ id: 1, name: 'Default Tenant', isActive: true });
    
    // Setup default enhancedRoleService mocks
    mockEnhancedRoleService.filterDataByPermissions.mockResolvedValue([]);

    // Default APS behavior
    apsSingleton.checkPermission.mockResolvedValue({ allowed: true, allowedFields: ['*'] });
    apsSingleton.getDefaultFieldsForRole.mockReturnValue(['*']);
    apsSingleton.filterAllowedFields.mockImplementation((requested, allowed) => requested ?? allowed);
    apsSingleton.getPersonById.mockResolvedValue({ id: 'target-1', companyId: '1' });
  });
  
  describe('getEmployees', () => {
    it('should return employees successfully', async () => {
      mockReq.query = { companyId: '1', tenantId: '1' };
      const employees = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', status: 'ACTIVE' },
        { id: 2, firstName: 'Alice', lastName: 'Roe', email: 'alice@example.com', status: 'ACTIVE' }
      ];
      mockPrisma.person.findMany.mockResolvedValueOnce(employees);
      // I dati tornano filtrati in base ai permessi
      mockEnhancedRoleService.filterDataByPermissions.mockResolvedValueOnce(employees);

      await personController.getEmployees(mockReq, mockRes);

      expect(mockPrisma.person.findMany).toHaveBeenCalled();
      expect(mockEnhancedRoleService.filterDataByPermissions).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: employees, total: employees.length });
    });
  });
  
  describe('getTrainers', () => {
    it('should return transformed trainers with permissions applied', async () => {
      const mockTrainers = [
        {
          id: 2,
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          phone: '333',
          taxCode: 'TAX123',
          birthDate: '1990-01-01',
          residenceAddress: 'Via Roma 1',
          residenceCity: 'Roma',
          postalCode: '00100',
          province: 'RM',
          hourlyRate: 50,
          iban: 'IT00X123',
          registerCode: 'REG123',
          certifications: [],
          specialties: [],
          vatNumber: 'IT12345678901',
          status: 'ACTIVE',
          createdAt: '2024-01-01',
          updatedAt: '2024-02-01'
        }
      ];
      
      mockReq.person = { id: '1' };
      mockReq.tenantId = '1';
      mockReq.query = { companyId: '1' };
      
      mockPersonService.getTrainers.mockResolvedValue(mockTrainers);
      mockEnhancedRoleService.filterDataByPermissions.mockResolvedValue(mockTrainers);
      
      await personController.getTrainers(mockReq, mockRes);
      
      expect(mockPersonService.getTrainers).toHaveBeenCalled();
      expect(mockEnhancedRoleService.filterDataByPermissions).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith([
        expect.objectContaining({
          id: mockTrainers[0].id,
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane@example.com',
          codice_fiscale: 'TAX123',
          is_active: true
        })
      ]);
    });
  });
  
  describe('createPerson', () => {
    it('should create a person successfully', async () => {
      const mockPersonData = {
        firstName: 'Anna',
        lastName: 'Bianchi',
        email: 'anna@example.com'
      };
      
      const mockCreatedPerson = {
        id: 3,
        ...mockPersonData
      };
      
      mockReq.body = mockPersonData;
      mockPersonService.createPerson.mockResolvedValue(mockCreatedPerson);
      
      await personController.createPerson(mockReq, mockRes);
      
      expect(mockPersonService.createPerson).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockCreatedPerson);
    });
  });
  
  describe('updatePerson', () => {
    it('should update a person successfully', async () => {
      const mockPersonData = {
        firstName: 'Mario Updated'
      };
      
      const mockUpdatedPerson = {
        id: 1,
        firstName: 'Mario Updated',
        lastName: 'Rossi'
      };
      
      mockReq.params.id = '1';
      mockReq.body = mockPersonData;
      mockPersonService.updatePerson.mockResolvedValue(mockUpdatedPerson);
      
      await personController.updatePerson(mockReq, mockRes);
      
      expect(mockPersonService.updatePerson).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(mockUpdatedPerson);
    });
  });
  
  describe('deletePerson', () => {
    it('should delete a person successfully', async () => {
      mockReq.params.id = '1';
      mockPersonService.deletePerson.mockResolvedValue();
      
      await personController.deletePerson(mockReq, mockRes);
      
      expect(mockPersonService.deletePerson).toHaveBeenCalledWith('1');
      expect(mockRes.json).toHaveBeenCalledWith({ 
        success: true
      });
    });
  });
  
  describe('addRole', () => {
    it('should add a role successfully', async () => {
      const mockRole = {
        id: 1,
        personId: 1,
        roleType: 'TRAINER'
      };
      
      mockReq.params.id = '1';
      mockReq.body = { roleType: 'TRAINER', companyId: '1', tenantId: '1' };
      mockPersonService.addRole.mockResolvedValue(mockRole);
      
      await personController.addRole(mockReq, mockRes);
      
      expect(mockPersonService.addRole).toHaveBeenCalledWith('1', 'TRAINER');
      expect(mockRes.json).toHaveBeenCalledWith(mockRole);
    });
  });
  
  describe('removeRole', () => {
    it('should remove a role successfully', async () => {
      mockReq.params.id = '1';
      mockReq.params.roleType = 'TRAINER';
      mockReq.query = { companyId: '1', tenantId: '1' };
      const result = { success: true };
      mockPersonService.removeRole.mockResolvedValue(result);
      
      await personController.removeRole(mockReq, mockRes);
      
      expect(mockPersonService.removeRole).toHaveBeenCalledWith('1', 'TRAINER');
      expect(mockRes.json).toHaveBeenCalledWith(result);
    });
  });

  describe('getPersonFieldsVisibility', () => {
    it('should compute visibleFields based on requested and defaults when allowedFields is *', async () => {
      mockReq.params.id = '123';
      mockReq.query = { view: 'employee', fields: 'firstName,lastName' };

      // Configure APS responses
      apsSingleton.getPersonById.mockResolvedValueOnce({ id: '123', companyId: '1' });
      // Prima chiamata: read
      apsSingleton.checkPermission
        .mockResolvedValueOnce({ allowed: true, allowedFields: ['*'], scope: 'COMPANY' })
        // Seconda chiamata: update
        .mockResolvedValueOnce({ allowed: true, allowedFields: ['*'], scope: 'COMPANY' });
      apsSingleton.getDefaultFieldsForRole.mockReturnValueOnce(['firstName','lastName','email']);

      // Current user role for defaults
      mockPrisma.person.findUnique.mockResolvedValueOnce({ globalRole: 'ADMIN', personRoles: [] });

      await personController.getPersonFieldsVisibility(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        personId: '123',
        resource: 'employees',
        view: 'employee',
        allowed: true,
        visibleFields: ['firstName','lastName'],
        editableFields: ['firstName','lastName'],
        fields: expect.objectContaining({
          firstName: expect.objectContaining({ visible: expect.any(Boolean), editable: expect.any(Boolean) }),
          lastName: expect.objectContaining({ visible: expect.any(Boolean), editable: expect.any(Boolean) })
        }),
        defaults: ['firstName','lastName','email']
      }));
    });
  });

  describe('getPersonById', () => {
    it('should include _visibility meta with filtered visibleFields and editableFields', async () => {
      mockReq.params.id = '123';
      mockReq.query = { view: 'trainer' };

      const person = { id: '123', firstName: 'Mario', lastName: 'Rossi' };
      mockPersonService.getPersonById.mockResolvedValueOnce(person);

      // read permission
      apsSingleton.checkPermission.mockResolvedValueOnce({ allowed: true, allowedFields: ['firstName','email'], scope: 'COMPANY' });
      apsSingleton.filterAllowedFields.mockReturnValueOnce(['firstName']);
      mockPrisma.person.findUnique.mockResolvedValueOnce({ globalRole: null, personRoles: [{ roleType: 'ADMIN', isActive: true }] });
      apsSingleton.getDefaultFieldsForRole.mockReturnValueOnce(['firstName','lastName']);
      // update permission
      apsSingleton.checkPermission.mockResolvedValueOnce({ allowed: true, allowedFields: ['firstName'], scope: 'COMPANY' });

      await personController.getPersonById(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        id: '123',
        _visibility: expect.objectContaining({
          resource: 'trainers',
          view: 'trainer',
          visibleFields: ['firstName'],
          editableFields: expect.arrayContaining(['firstName']),
          defaults: ['firstName','lastName']
        })
      }));
    });
  });

  describe('exportPersons', () => {
    it('should export CSV using requested fields when allowedFields is *', async () => {
      mockReq.query = { format: 'csv', view: 'employee', fields: 'firstName,lastName,email', companyId: '1' };

      apsSingleton.checkPermission.mockResolvedValueOnce({ allowed: true, allowedFields: ['*'] });
      mockPrisma.person.findUnique.mockResolvedValueOnce({ globalRole: 'ADMIN', personRoles: [] });
      apsSingleton.getDefaultFieldsForRole.mockReturnValueOnce([]);

      const csvContent = 'id,firstName,lastName,email\n1,John,Doe,john@example.com';
      mockPersonService.exportPersonsToCSV.mockResolvedValueOnce(csvContent);

      await personController.exportPersons(mockReq, mockRes);

      expect(mockPersonService.exportPersonsToCSV).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: '1' }),
        { view: 'employee', allowedFields: ['firstName','lastName','email'] }
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('_employee.csv'));
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith(csvContent);
    });

    it('should export JSON and set proper content-type', async () => {
      mockReq.query = { format: 'json', view: 'trainer', fields: 'firstName', companyId: '1' };

      apsSingleton.checkPermission.mockResolvedValueOnce({ allowed: true, allowedFields: ['*'] });
      mockPrisma.person.findUnique.mockResolvedValueOnce({ globalRole: 'ADMIN', personRoles: [] });
      apsSingleton.getDefaultFieldsForRole.mockReturnValueOnce([]);

      const jsonData = { items: [], total: 0 };
      mockPersonService.exportPersonsToJSON.mockResolvedValueOnce(jsonData);

      await personController.exportPersons(mockReq, mockRes);

      expect(mockPersonService.exportPersonsToJSON).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: '1' }),
        { view: 'trainer', allowedFields: ['firstName'] }
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(jsonData);
    });
  });
});