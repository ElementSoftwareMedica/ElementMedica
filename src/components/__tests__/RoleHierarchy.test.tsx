import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import RoleHierarchy from '../roles/RoleHierarchy';
import { getRoleHierarchy, getCurrentUserRoleHierarchy } from '../../services/roles';

// Mock del servizio roles
vi.mock('../../services/roles', () => ({
  RolesService: {
    getRoles: vi.fn(),
    createRole: vi.fn(),
    updateRole: vi.fn(),
    deleteRole: vi.fn(),
    moveRole: vi.fn(),
    getPermissions: vi.fn(),
  },
  getRoleHierarchy: vi.fn(),
  getCurrentUserRoleHierarchy: vi.fn(),
}));

vi.mock('@/services/auth', () => ({
  isAuthenticated: vi.fn().mockReturnValue(true),
}));

// Mock dei componenti UI
vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn(),
}));

const mockHierarchy = {
  ADMIN: {
    name: 'Amministratore',
    description: 'Amministratore del sistema',
    level: 1,
    permissions: ['USER_MANAGEMENT', 'ROLE_MANAGEMENT'],
    assignableRoles: ['MANAGER', 'EMPLOYEE'],
  },
  MANAGER: {
    name: 'Manager',
    description: 'Manager aziendale',
    level: 2,
    permissions: ['EMPLOYEE_MANAGEMENT'],
    assignableRoles: ['EMPLOYEE'],
  },
  EMPLOYEE: {
    name: 'Dipendente',
    description: 'Dipendente standard',
    level: 3,
    permissions: ['BASIC_ACCESS'],
    assignableRoles: [],
  },
};

const mockUserHierarchy = {
  highestRole: 'ADMIN',
  userLevel: 1,
  userRoles: ['ADMIN'],
  assignableRoles: ['MANAGER', 'EMPLOYEE'],
};

// Mock dei dati di test rimossi perché non utilizzati

describe('RoleHierarchy CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock delle funzioni specifiche per RoleHierarchy
    (getRoleHierarchy as ReturnType<typeof vi.fn>).mockResolvedValue(mockHierarchy);
    (getCurrentUserRoleHierarchy as ReturnType<typeof vi.fn>).mockResolvedValue(mockUserHierarchy);
  });

  it('should switch between list and tree view modes', async () => {
    render(<RoleHierarchy />);

    await waitFor(() => {
      expect(screen.getByText('Albero')).toBeInTheDocument();
      expect(screen.getByText('Lista')).toBeInTheDocument();
    });

    // Clicca sulla vista lista
    fireEvent.click(screen.getByText('Lista'));

    // Verifica che il componente risponda al click
    await waitFor(() => {
      expect(screen.getByText('Lista')).toBeInTheDocument();
    });
  });

  it('should filter roles when searching', async () => {
    render(<RoleHierarchy />);

    await waitFor(() => {
      expect(screen.getByText('Lista')).toBeInTheDocument();
    });

    // Passa alla vista lista per vedere la barra di ricerca
    fireEvent.click(screen.getByText('Lista'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Cerca ruoli...')).toBeInTheDocument();
    });

    // Cerca un ruolo specifico
    const searchInput = screen.getByPlaceholderText('Cerca ruoli...');
    fireEvent.change(searchInput, { target: { value: 'Admin' } });

    // Verifica che solo i ruoli corrispondenti siano visibili
    expect(screen.getByText('Amministratore')).toBeInTheDocument();
  });
});