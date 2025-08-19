import { jest } from '@jest/globals';

// Mock del personService usando unstable_mockModule
jest.unstable_mockModule('../services/personService.js', () => ({
  default: {
    deletePerson: jest.fn()
  }
}));

// Mock di logger e prisma
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
    }
  }
}));

// Import del controller e del service mockato dopo i mock
const { default: personController } = await import('../controllers/personController.js');
const { default: mockPersonService } = await import('../services/personService.js');

describe('Debug Mock Test', () => {
  it('should call personService.deletePerson', async () => {
    const mockReq = {
      params: { id: '1' }
    };
    
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    mockPersonService.deletePerson.mockResolvedValue();
    
    await personController.deletePerson(mockReq, mockRes);
    
    console.log('Mock calls:', mockPersonService.deletePerson.mock.calls);
    console.log('Response calls:', mockRes.json.mock.calls);
    
    expect(mockPersonService.deletePerson).toHaveBeenCalledWith('1');
  });
});