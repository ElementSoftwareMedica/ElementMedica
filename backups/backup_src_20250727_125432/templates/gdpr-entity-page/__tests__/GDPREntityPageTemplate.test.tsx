import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import {
  GDPREntityPageTemplate,
  ConfigFactory,
  type GDPREntityPageConfig
} from '../index';

// Mock delle dipendenze
jest.mock('@/components/shared/layout/PageLayout', () => {
  return {
    PageLayout: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="page-layout">{children}</div>
    )
  };
});

jest.mock('@/components/shared/table/DataTable', () => {
  return {
    DataTable: ({ data, columns, onRowClick }: any) => (
      <div data-testid="data-table">
        <div data-testid="table-columns">{columns.length} columns</div>
        <div data-testid="table-rows">{data.length} rows</div>
        {data.map((row: any, index: number) => (
          <div
            key={index}
            data-testid={`table-row-${index}`}
            onClick={() => onRowClick?.(row)}
          >
            {row.name || row.title || `Row ${index}`}
          </div>
        ))}
      </div>
    )
  };
});

jest.mock('@/components/shared/forms/FormModal', () => {
  return {
    FormModal: ({ open, onClose, onSubmit, title, children }: any) => (
      open ? (
        <div data-testid="form-modal">
          <div data-testid="modal-title">{title}</div>
          <div data-testid="modal-content">{children}</div>
          <button data-testid="modal-submit" onClick={() => onSubmit?.({})}>Submit</button>
          <button data-testid="modal-close" onClick={onClose}>Close</button>
        </div>
      ) : null
    )
  };
});

// Mock delle API
const mockApiCall = jest.fn();
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data: [], total: 0 })
  })
) as jest.Mock;

// Configurazione di test base
const createTestConfig = (overrides: Partial<GDPREntityPageConfig> = {}): GDPREntityPageConfig => {
  const baseConfig = ConfigFactory.createBaseConfig('test-entities', 'Test Entities');
  
  return {
    ...baseConfig,
    entity: {
      ...baseConfig.entity,
      columns: [
        {
          key: 'id',
          label: 'ID',
          type: 'number',
          sortable: true,
          filterable: false,
          visible: true,
          required: true
        },
        {
          key: 'name',
          label: 'Name',
          type: 'string',
          sortable: true,
          filterable: true,
          visible: true,
          required: true
        },
        {
          key: 'email',
          label: 'Email',
          type: 'email',
          sortable: true,
          filterable: true,
          visible: true,
          required: true
        }
      ]
    },
    api: {
      ...baseConfig.api,
      endpoints: {
        list: '/api/test-entities',
        create: '/api/test-entities',
        read: '/api/test-entities',
        update: '/api/test-entities',
        delete: '/api/test-entities'
      }
    },
    ...overrides
  };
};

// Test data
const mockEntities = [
  { id: 1, name: 'Test Entity 1', email: 'test1@example.com' },
  { id: 2, name: 'Test Entity 2', email: 'test2@example.com' },
  { id: 3, name: 'Test Entity 3', email: 'test3@example.com' }
];

describe('GDPREntityPageTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockEntities, total: mockEntities.length })
    });
  });

  describe('Rendering', () => {
    it('should render the template with basic configuration', async () => {
      const config = createTestConfig();
      
      render(<GDPREntityPageTemplate config={config} />);
      
      expect(screen.getByTestId('page-layout')).toBeInTheDocument();
      expect(screen.getByTestId('gdpr-entity-header')).toBeInTheDocument();
      expect(screen.getByTestId('data-table')).toBeInTheDocument();
    });

    it('should display the correct title and subtitle', () => {
      const config = createTestConfig({
        entity: {
          ...createTestConfig().entity,
          displayName: 'Custom Entities',
          description: 'Custom description'
        }
      });
      
      render(<GDPREntityPageTemplate config={config} />);
      
      expect(screen.getByText('Custom Entities')).toBeInTheDocument();
      expect(screen.getByText('Custom description')).toBeInTheDocument();
    });

    it('should render GDPR indicators when GDPR is enabled', () => {
      const config = createTestConfig({
        gdpr: {
          consent: { enabled: true },
          audit: { enabled: true },
          dataMinimization: { enabled: true }
        }
      });
      
      render(<GDPREntityPageTemplate config={config} />);
      
      expect(screen.getByTestId('gdpr-consent-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('gdpr-audit-indicator')).toBeInTheDocument();
    });
  });

  describe('Data Loading', () => {
    it('should load entities on mount', async () => {
      const config = createTestConfig();
      
      render(<GDPREntityPageTemplate config={config} />);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/test-entities'),
          expect.any(Object)
        );
      });
      
      expect(screen.getByTestId('table-rows')).toHaveTextContent('3 rows');
    });

    it('should handle loading state', () => {
      const config = createTestConfig();
      
      render(<GDPREntityPageTemplate config={config} />);
      
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    });

    it('should handle error state', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));
      
      const config = createTestConfig();
      const onError = jest.fn();
      
      render(<GDPREntityPageTemplate config={config} onError={onError} />);
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
      });
    });
  });

  describe('CRUD Operations', () => {
    it('should handle entity creation', async () => {
      const config = createTestConfig();
      const onCreate = jest.fn().mockResolvedValue({ success: true });
      
      render(
        <GDPREntityPageTemplate 
          config={config} 
          onEntityCreate={onCreate}
        />
      );
      
      // Click create button
      fireEvent.click(screen.getByTestId('create-entity-button'));
      
      // Modal should open
      expect(screen.getByTestId('form-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Nuovo Test Entity');
      
      // Submit form
      fireEvent.click(screen.getByTestId('modal-submit'));
      
      await waitFor(() => {
        expect(onCreate).toHaveBeenCalled();
      });
    });

    it('should handle entity update', async () => {
      const config = createTestConfig();
      const onUpdate = jest.fn().mockResolvedValue({ success: true });
      
      render(
        <GDPREntityPageTemplate 
          config={config} 
          onEntityUpdate={onUpdate}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('table-row-0')).toBeInTheDocument();
      });
      
      // Click on first row to edit
      fireEvent.click(screen.getByTestId('table-row-0'));
      
      // Edit modal should open
      expect(screen.getByTestId('form-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Modifica Test Entity');
      
      // Submit form
      fireEvent.click(screen.getByTestId('modal-submit'));
      
      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith(1, expect.any(Object));
      });
    });

    it('should handle entity deletion', async () => {
      const config = createTestConfig();
      const onDelete = jest.fn().mockResolvedValue({ success: true });
      
      render(
        <GDPREntityPageTemplate 
          config={config} 
          onEntityDelete={onDelete}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('delete-entity-1')).toBeInTheDocument();
      });
      
      // Click delete button
      fireEvent.click(screen.getByTestId('delete-entity-1'));
      
      // Confirmation modal should open
      expect(screen.getByTestId('delete-confirmation-modal')).toBeInTheDocument();
      
      // Confirm deletion
      fireEvent.click(screen.getByTestId('confirm-delete'));
      
      await waitFor(() => {
        expect(onDelete).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('GDPR Features', () => {
    it('should handle consent management', async () => {
      const config = createTestConfig({
        gdpr: {
          consent: {
            enabled: true,
            requiredConsents: ['data_processing'],
            optionalConsents: ['marketing']
          }
        }
      });
      
      const onGDPRAction = jest.fn();
      
      render(
        <GDPREntityPageTemplate 
          config={config} 
          onGDPRAction={onGDPRAction}
        />
      );
      
      // Click consent management button
      fireEvent.click(screen.getByTestId('gdpr-consent-button'));
      
      // Consent modal should open
      expect(screen.getByTestId('gdpr-consent-modal')).toBeInTheDocument();
      
      // Toggle consent
      fireEvent.click(screen.getByTestId('consent-toggle-marketing'));
      
      // Save consents
      fireEvent.click(screen.getByTestId('save-consents'));
      
      await waitFor(() => {
        expect(onGDPRAction).toHaveBeenCalledWith(
          'consent_updated',
          expect.any(Object)
        );
      });
    });

    it('should handle data export (data portability)', async () => {
      const config = createTestConfig({
        gdpr: {
          dataPortability: {
            enabled: true,
            supportedFormats: ['json', 'csv']
          }
        }
      });
      
      const onGDPRAction = jest.fn();
      
      render(
        <GDPREntityPageTemplate 
          config={config} 
          onGDPRAction={onGDPRAction}
        />
      );
      
      // Click export button
      fireEvent.click(screen.getByTestId('gdpr-export-button'));
      
      // Export modal should open
      expect(screen.getByTestId('gdpr-export-modal')).toBeInTheDocument();
      
      // Select format
      fireEvent.click(screen.getByTestId('export-format-json'));
      
      // Start export
      fireEvent.click(screen.getByTestId('start-export'));
      
      await waitFor(() => {
        expect(onGDPRAction).toHaveBeenCalledWith(
          'data_exported',
          expect.objectContaining({ format: 'json' })
        );
      });
    });

    it('should handle right to be forgotten', async () => {
      const config = createTestConfig({
        gdpr: {
          rightToBeForgotten: {
            enabled: true,
            autoProcessing: false
          }
        }
      });
      
      const onGDPRAction = jest.fn();
      
      render(
        <GDPREntityPageTemplate 
          config={config} 
          onGDPRAction={onGDPRAction}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('gdpr-forget-1')).toBeInTheDocument();
      });
      
      // Click forget button for entity 1
      fireEvent.click(screen.getByTestId('gdpr-forget-1'));
      
      // Confirmation modal should open
      expect(screen.getByTestId('gdpr-forget-confirmation')).toBeInTheDocument();
      
      // Confirm deletion
      fireEvent.click(screen.getByTestId('confirm-forget'));
      
      await waitFor(() => {
        expect(onGDPRAction).toHaveBeenCalledWith(
          'data_deleted',
          expect.objectContaining({ entityId: 1, reason: 'right_to_be_forgotten' })
        );
      });
    });
  });

  describe('Audit Logging', () => {
    it('should log actions when audit is enabled', async () => {
      const config = createTestConfig({
        gdpr: {
          audit: {
            enabled: true,
            level: 'comprehensive'
          }
        }
      });
      
      const onGDPRAction = jest.fn();
      
      render(
        <GDPREntityPageTemplate 
          config={config} 
          onGDPRAction={onGDPRAction}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('table-row-0')).toBeInTheDocument();
      });
      
      // Click on entity (read action)
      fireEvent.click(screen.getByTestId('table-row-0'));
      
      await waitFor(() => {
        expect(onGDPRAction).toHaveBeenCalledWith(
          'audit_logged',
          expect.objectContaining({
            action: 'read',
            entityId: 1,
            entityType: 'test-entities'
          })
        );
      });
    });

    it('should display audit log when requested', async () => {
      const config = createTestConfig({
        gdpr: {
          audit: { enabled: true }
        }
      });
      
      render(<GDPREntityPageTemplate config={config} />);
      
      // Click audit log button
      fireEvent.click(screen.getByTestId('gdpr-audit-button'));
      
      // Audit log modal should open
      expect(screen.getByTestId('gdpr-audit-modal')).toBeInTheDocument();
      expect(screen.getByText('Audit Log')).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('should validate required fields', async () => {
      const config = createTestConfig();
      
      render(<GDPREntityPageTemplate config={config} />);
      
      // Open create modal
      fireEvent.click(screen.getByTestId('create-entity-button'));
      
      // Try to submit without required fields
      fireEvent.click(screen.getByTestId('modal-submit'));
      
      // Validation errors should be displayed
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });

    it('should validate email format', async () => {
      const config = createTestConfig();
      
      render(<GDPREntityPageTemplate config={config} />);
      
      // Open create modal
      fireEvent.click(screen.getByTestId('create-entity-button'));
      
      // Enter invalid email
      fireEvent.change(screen.getByTestId('email-input'), {
        target: { value: 'invalid-email' }
      });
      
      fireEvent.blur(screen.getByTestId('email-input'));
      
      // Email validation error should be displayed
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  describe('Permissions', () => {
    it('should hide create button when create permission is false', () => {
      const config = createTestConfig({
        permissions: {
          required: {
            create: false,
            read: true,
            update: true,
            delete: true
          }
        }
      });
      
      render(<GDPREntityPageTemplate config={config} />);
      
      expect(screen.queryByTestId('create-entity-button')).not.toBeInTheDocument();
    });

    it('should hide delete buttons when delete permission is false', async () => {
      const config = createTestConfig({
        permissions: {
          required: {
            create: true,
            read: true,
            update: true,
            delete: false
          }
        }
      });
      
      render(<GDPREntityPageTemplate config={config} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('table-rows')).toHaveTextContent('3 rows');
      });
      
      expect(screen.queryByTestId('delete-entity-1')).not.toBeInTheDocument();
    });
  });

  describe('Configuration Factory', () => {
    it('should create base configuration correctly', () => {
      const config = ConfigFactory.createBaseConfig('test', 'Test');
      
      expect(config.entity.name).toBe('test');
      expect(config.entity.displayName).toBe('Test');
      expect(config.gdpr.consent.enabled).toBe(true);
      expect(config.gdpr.audit.enabled).toBe(true);
    });

    it('should create simple configuration with minimal GDPR', () => {
      const config = ConfigFactory.createSimpleConfig('test', 'Test');
      
      expect(config.gdpr.consent.enabled).toBe(true);
      expect(config.gdpr.audit.enabled).toBe(true);
      expect(config.gdpr.dataMinimization.enabled).toBe(false);
    });

    it('should create sensitive data configuration with enhanced GDPR', () => {
      const config = ConfigFactory.createSensitiveDataConfig('test', 'Test');
      
      expect(config.gdpr.consent.enabled).toBe(true);
      expect(config.gdpr.audit.enabled).toBe(true);
      expect(config.gdpr.dataMinimization.enabled).toBe(true);
      expect(config.gdpr.rightToBeForgotten.enabled).toBe(true);
      expect(config.gdpr.dataPortability.enabled).toBe(true);
    });

    it('should create read-only configuration', () => {
      const config = ConfigFactory.createReadOnlyConfig('test', 'Test');
      
      expect(config.permissions.required.create).toBe(false);
      expect(config.permissions.required.update).toBe(false);
      expect(config.permissions.required.delete).toBe(false);
      expect(config.permissions.required.read).toBe(true);
    });
  });
});