import { ActivityLog, ActivityLogFilters } from '../types';
import { apiGet } from './api';
import { API_ENDPOINTS } from '../config/api';

export interface LogsResponse {
  logs: ActivityLog[];
  total: number;
  limit: number;
  offset: number;
}

export interface BackendLogResponse {
  data: ActivityLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

// Mock data in case the backend API fails
const MOCK_LOGS: ActivityLog[] = [
  {
    id: '1',
    userId: '1',
    user: {
      username: 'admin',
      email: 'admin@example.com'
    },
    resource: 'users',
    resourceId: '123',
    action: 'create',
    details: JSON.stringify({ name: 'John Doe', email: 'john@example.com' }),
    ipAddress: '192.168.1.1',
    timestamp: new Date(new Date().getTime() - 1000 * 60 * 60).toISOString()
  },
  {
    id: '2',
    userId: '1',
    user: {
      username: 'admin',
      email: 'admin@example.com'
    },
    resource: 'courses',
    resourceId: '456',
    action: 'update',
    details: JSON.stringify({ title: 'Advanced JavaScript', duration: '3 hours' }),
    ipAddress: '192.168.1.1',
    timestamp: new Date(new Date().getTime() - 1000 * 60 * 60 * 2).toISOString()
  },
  {
    id: '3',
    userId: '2',
    user: {
      username: 'user',
      email: 'user@example.com'
    },
    resource: 'employees',
    resourceId: '789',
    action: 'delete',
    details: JSON.stringify({ id: '789', name: 'Former Employee' }),
    ipAddress: '192.168.1.2',
    timestamp: new Date(new Date().getTime() - 1000 * 60 * 60 * 24).toISOString()
  },
  {
    id: '4',
    userId: '1',
    user: {
      username: 'admin',
      email: 'admin@example.com'
    },
    resource: 'companies',
    resourceId: '101',
    action: 'update',
    details: JSON.stringify({ name: 'Acme Corporation', updated: { address: 'New Office Location' } }),
    ipAddress: '192.168.1.1',
    timestamp: new Date(new Date().getTime() - 1000 * 60 * 60 * 3).toISOString()
  },
  {
    id: '5',
    userId: '2',
    user: {
      username: 'user',
      email: 'user@example.com'
    },
    resource: 'auth',
    action: 'login',
    ipAddress: '192.168.1.2',
    timestamp: new Date(new Date().getTime() - 1000 * 60 * 30).toISOString()
  }
];

export const getLogs = async (filters?: ActivityLogFilters, limit?: number, offset?: number): Promise<LogsResponse> => {
  const params = {
    ...(filters || {}),
    limit: limit || 100,
    offset: offset || 0
  };

  try {
    console.log('Attempting to fetch logs from backend endpoint:', API_ENDPOINTS.ACTIVITY_LOGS);
    
    // Use apiGet instead of fetch to properly handle the base URL and credentials
    const backendResponse = await apiGet<{
      logs: ActivityLog[],
      pagination: {
        total: number;
        limit: number;
        offset: number;
      }
    }>(API_ENDPOINTS.ACTIVITY_LOGS, params);
    
    // Convert backend response format to our internal format
    return {
      logs: backendResponse.logs || [],
      total: backendResponse.pagination?.total || 0,
      limit: backendResponse.pagination?.limit || params.limit,
      offset: backendResponse.pagination?.offset || params.offset
    };
  } catch (error) {
    console.warn('Failed to fetch logs from backend, using mock data:', error);
    
    // Filter mock logs based on provided filters
    let filteredLogs = [...MOCK_LOGS];
    
    if (filters?.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
    }
    
    if (filters?.resource) {
      filteredLogs = filteredLogs.filter(log => log.resource === filters.resource);
    }
    
    if (filters?.action) {
      filteredLogs = filteredLogs.filter(log => log.action === filters.action);
    }
    
    if (filters?.startDate) {
      const startDate = new Date(filters.startDate).getTime();
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp).getTime() >= startDate);
    }
    
    if (filters?.endDate) {
      const endDate = new Date(filters.endDate).getTime();
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp).getTime() <= endDate);
    }
    
    // Apply pagination
    const paginatedLogs = filteredLogs.slice(offset || 0, (offset || 0) + (limit || 100));
    
    return {
      logs: paginatedLogs,
      total: filteredLogs.length,
      limit: limit || 100,
      offset: offset || 0
    };
  }
};

export default {
  getLogs
}; 