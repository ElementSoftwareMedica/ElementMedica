/**
 * Test suite for PersonController
 * Tests the unified person management functionality
 */

import { jest } from '@jest/globals';

// Mock the dependencies before importing
const mockPersonService = {
  getEmployees: jest.fn(),
  getTrainers: jest.fn(),
  createPerson: jest.fn(),
  updatePerson: jest.fn(),
  deletePerson: jest.fn(),
  assignRole: jest.fn(),
  removeRole: jest.fn(),
  addRole: jest.fn()
};

const mockLogger = {
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

jest.mock('../services/personService.js', () => ({
  default: mockPersonService
}));

jest.mock('../utils/logger.js', () => ({
  default: mockLogger
}));

// Import after mocking
import personController from '../controllers/personController.js';

describe('PersonController', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset mock objects
    mockReq = {
      user: { id: 1, companyId: 1 },
      params: {},
      body: {},
      query: {}
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
  });
  
  describe('getEmployees', () => {
    it('should return employees successfully', async () => {
      const mockEmployees = [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com'
        }
      ];
      
      mockPersonService.getEmployees.mockResolvedValue({ employees: mockEmployees });
      
      await personController.getEmployees(mockReq, mockRes);
      
      expect(mockPersonService.getEmployees).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({ employees: mockEmployees });
    });
  });
  
  describe('getTrainers', () => {
    it('should return trainers successfully', async () => {
      const mockTrainers = [
        {
          id: 2,
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com'
        }
      ];
      
      mockPersonService.getTrainers.mockResolvedValue({ trainers: mockTrainers });
      
      await personController.getTrainers(mockReq, mockRes);
      
      expect(mockPersonService.getTrainers).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({ trainers: mockTrainers });
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
      mockPersonService.deletePerson.mockResolvedValue({ message: 'Person deleted successfully' });
      
      await personController.deletePerson(mockReq, mockRes);
      
      expect(mockPersonService.deletePerson).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Person deleted successfully' });
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
      mockReq.body = { roleType: 'TRAINER' };
      mockPersonService.addRole.mockResolvedValue(mockRole);
      
      await personController.addRole(mockReq, mockRes);
      
      expect(mockPersonService.addRole).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockRole);
    });
  });
  
  describe('removeRole', () => {
    it('should remove a role successfully', async () => {
      mockReq.params.id = '1';
      mockReq.params.roleType = 'TRAINER';
      mockReq.query = { companyId: '1', tenantId: '1' };
      mockPersonService.removeRole.mockResolvedValue();
      
      await personController.removeRole(mockReq, mockRes);
      
      expect(mockPersonService.removeRole).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
    });
  });
});