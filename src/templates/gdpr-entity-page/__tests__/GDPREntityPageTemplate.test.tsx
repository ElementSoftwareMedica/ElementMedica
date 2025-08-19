import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import {
  GDPREntityPageTemplate,
  ConfigFactory,
  type GDPREntityPageConfig
} from '../index';

// Mock delle dipendenze
vi.mock('@/components/shared/layout/PageLayout', () => {
  return {
    PageLayout: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="page-layout">{children}</div>
    )
  };
});

vi.mock('@/components/shared/table/DataTable', () => {
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

vi.mock('@/components/shared/forms/FormModal', () => {
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
const mockApiCall = vi.fn();
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data: mockEntities }),
  })
) as any;

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
          sortable: true,
          filterable: false,
          visible: true,
          required: true
        },
        {
          key: 'name',
          label: 'Name',
          sortable: true,
          filterable: true,
          visible: true,
          required: true
        },
        {
          key: 'email',
          label: 'Email',
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
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockEntities, total: mockEntities.length })
    });
  });

  describe('Basic Rendering', () => {
    it('should render the template with basic configuration', async () => {
      const config = createTestConfig();
      
      render(<GDPREntityPageTemplate config={config} />);
      
      // Verifica che il componente si renderizzi senza errori
      expect(document.body).toBeInTheDocument();
    });

  });
 });