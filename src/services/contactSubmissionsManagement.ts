/**
 * Contact Submissions Management Service
 * Gestisce le contact submissions per l'area privata
 */

import apiClient from './apiClient';

export interface ContactSubmission {
  id: string;
  type: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject: string;
  message: string;
  status: 'NEW' | 'READ' | 'IN_PROGRESS' | 'RESOLVED' | 'ARCHIVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  source: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  readAt?: string;
  resolvedAt?: string;
  tenantId: string;
}

export interface ContactSubmissionFilters {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ContactSubmissionStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  recentCount: number;
  avgResponseTime?: number;
}

class ContactSubmissionsManagementService {
  // Get contact submissions list
  async getContactSubmissions(filters?: ContactSubmissionFilters): Promise<{
    submissions: ContactSubmission[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await apiClient.get<{
      submissions: ContactSubmission[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(`/api/v1/submissions?${params.toString()}`);
    return response.data;
  }

  // Get single contact submission
  async getContactSubmission(id: string): Promise<ContactSubmission> {
    const response = await apiClient.get<ContactSubmission>(`/api/v1/submissions/${id}`);
    return response.data;
  }

  // Update submission status
  async updateSubmissionStatus(id: string, status: ContactSubmission['status'], notes?: string): Promise<ContactSubmission> {
    const response = await apiClient.put<ContactSubmission>(`/api/v1/submissions/${id}/status`, { 
      status, 
      notes 
    });
    return response.data;
  }

  // Delete submission
  async deleteContactSubmission(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/submissions/${id}`);
  }

  // Get submission statistics
  async getSubmissionStats(): Promise<ContactSubmissionStats> {
    const response = await apiClient.get<ContactSubmissionStats>('/api/v1/submissions/stats');
    return response.data;
  }

  // Assign submission to user
  async assignSubmission(id: string, assignedToId: string): Promise<ContactSubmission> {
    const response = await apiClient.put<ContactSubmission>(`/api/v1/submissions/${id}/assign`, {
      assignedToId
    });
    return response.data;
  }

  // Export submissions
  async exportSubmissions(filters?: ContactSubmissionFilters, format: 'csv' | 'excel' = 'csv'): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    params.append('format', format);
    
    const response = await apiClient.get<Blob>(`/api/v1/submissions/export?${params.toString()}`, {
      responseType: 'blob'
    });
    return response.data;
  }
}

export const contactSubmissionsManagementService = new ContactSubmissionsManagementService();

// Export individual functions for convenience
export const getContactSubmissions = (filters?: ContactSubmissionFilters) => 
  contactSubmissionsManagementService.getContactSubmissions(filters);

export const getContactSubmission = (id: string) => 
  contactSubmissionsManagementService.getContactSubmission(id);

export const updateContactSubmissionStatus = (id: string, status: ContactSubmission['status'], notes?: string) => 
  contactSubmissionsManagementService.updateSubmissionStatus(id, status, notes);

export const deleteContactSubmission = (id: string) => 
  contactSubmissionsManagementService.deleteContactSubmission(id);

export const getContactSubmissionStats = () => 
  contactSubmissionsManagementService.getSubmissionStats();

export const assignContactSubmission = (id: string, assignedToId: string) => 
  contactSubmissionsManagementService.assignSubmission(id, assignedToId);

export const exportContactSubmissions = (filters?: ContactSubmissionFilters, format: 'csv' | 'excel' = 'csv') => 
  contactSubmissionsManagementService.exportSubmissions(filters, format);