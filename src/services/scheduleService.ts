import { apiGet, apiPost, apiPut, apiDelete } from './api';
import { API_ENDPOINTS } from '../config/api';

// Interfaces for schedule data
interface ScheduleData {
  id?: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  courseId?: string;
  companyId?: string;
  trainerId?: string;
  location?: string;
  maxParticipants?: number;
  status?: string;
}

interface Employee {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  companyId?: string;
  company_id?: string;
  company?: {
    id: string;
    name?: string;
  };
}

/**
 * Schedule service for managing course schedules
 */
const scheduleService = {
  /**
   * Get all schedules
   */
  async getAllSchedules() {
    try {
      const data = await apiGet(`${API_ENDPOINTS.SCHEDULES}`);
      return data;
    } catch (error) {
      console.error('Error fetching schedules:', error);
      throw error;
    }
  },
  
  /**
   * Get schedule by ID
   */
  async getScheduleById(id: string) {
    try {
      const data = await apiGet(`${API_ENDPOINTS.SCHEDULE_BY_ID(id)}`);
      return data;
    } catch (error) {
      console.error(`Error fetching schedule ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Create a new schedule
   */
  async createSchedule(scheduleData: ScheduleData) {
    try {
      const data = await apiPost(`${API_ENDPOINTS.SCHEDULES}`, scheduleData);
      return data;
    } catch (error) {
      console.error('Error creating schedule:', error);
      throw error;
    }
  },
  
  /**
   * Update an existing schedule
   */
  async updateSchedule(id: string, scheduleData: Partial<ScheduleData>) {
    try {
      const data = await apiPut(`${API_ENDPOINTS.SCHEDULE_BY_ID(id)}`, scheduleData);
      return data;
    } catch (error) {
      console.error(`Error updating schedule ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Delete a schedule
   */
  async deleteSchedule(id: string) {
    try {
      const data = await apiDelete(`${API_ENDPOINTS.SCHEDULE_BY_ID(id)}`);
      return data;
    } catch (error) {
      console.error(`Error deleting schedule ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Get employees by company IDs
   */
  async getEmployeesByCompany(companyIds: string[]): Promise<Employee[]> {
    try {
      // Get all employees and filter client-side
      // This is more reliable than using a potentially missing endpoint
      console.log(`Getting all employees and filtering for companies: ${companyIds.join(', ')}`);
      const data = await apiGet<Employee[]>('/employees');
      
      if (!data || !Array.isArray(data)) {
        console.warn('Invalid response from employees endpoint:', data);
        return [];
      }
      
      // Filter employees by company ID
      const filteredEmployees = data.filter(emp => {
        // Convert IDs to string for comparison
        const employeeCompanyId = String(emp.companyId || emp.company_id || (emp.company && emp.company.id) || '');
        return companyIds.some(id => String(id) === employeeCompanyId);
      });
      
      console.log(`Found ${filteredEmployees.length} employees for the selected companies`);
      return filteredEmployees;
    } catch (error) {
      console.error('Error fetching employees:', error);
      return [];
    }
  }
};

export default scheduleService;