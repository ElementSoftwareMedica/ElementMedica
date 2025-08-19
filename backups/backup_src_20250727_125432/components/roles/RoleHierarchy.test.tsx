import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { RoleHierarchy } from './RoleHierarchy';
import { RolesService } from '../../services/roles';

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
}));

vi.mock('@/services/auth', () => ({
  isAuthenticated: vi.fn(),
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

// Mock dei dati di test
const mockRoles = [
  {
    id: '1',
    name: 'Admin',
    description: 'Amministratore del sistema',
    level: 1,
    permissions: ['read', 'write', 'delete'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: 'Manager',
    description: 'Manager del team',
    level: 2,
    permissions: ['read', 'write'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    name: 'Employee',
    description: 'Dipendente standard',
    level: 3,
    permissions: ['read'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockPermissions = [
  { id: 'read', name: 'Lettura', description: 'Permesso di lettura' },
  { id: 'write', name: 'Scrittura', description: 'Permesso di scrittura' },
  { id: 'delete', name: 'Eliminazione', description: 'Permesso di eliminazione' },
];

describe('RoleHierarchy CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (RolesService.getRoles as any).mockResolvedValue(mockRoles);
    (RolesService.getPermissions as any).mockResolvedValue(mockPermissions);
  });

  it('should render role hierarchy with CRUD buttons', async () => {
    render(<RoleHierarchy />);

    await waitFor(() => {
      expect(screen.getByText('Nuovo Ruolo')).toBeInTheDocument();
    });

    // Verifica che i ruoli siano visualizzati
    expect(screen.getByText('Amministratore')).toBeInTheDocument();
    expect(screen.getByText('Manager')).toBeInTheDocument();
    expect(screen.getByText('Dipendente')).toBeInTheDocument();
  });

  it('should open create role modal when clicking "Nuovo Ruolo"', async () => {
    render(<RoleHierarchy />);

    await waitFor(() => {
      expect(screen.getByText('Nuovo Ruolo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Nuovo Ruolo'));

    // Verifica che il modale si apra
    await waitFor(() => {
      expect(screen.getByText('Crea Nuovo Ruolo')).toBeInTheDocument();
    });
  });

  it('should open edit modal when clicking edit button', async () => {
    render(<RoleHierarchy />);

    await waitFor(() => {
      expect(screen.getByText('Amministratore')).toBeInTheDocument();
    });

    // Trova e clicca il pulsante di modifica
    const editButtons = screen.getAllByTitle('Modifica ruolo');
    fireEvent.click(editButtons[0]);

    // Verifica che il modale di modifica si apra
    await waitFor(() => {
      expect(screen.getByText('Modifica Ruolo')).toBeInTheDocument();
    });
  });

  it('should open delete modal when clicking delete button', async () => {
    render(<RoleHierarchy />);

    await waitFor(() => {
      expect(screen.getByText('Amministratore')).toBeInTheDocument();
    });

    // Trova e clicca il pulsante di eliminazione
    const deleteButtons = screen.getAllByTitle('Elimina ruolo');
    fireEvent.click(deleteButtons[0]);

    // Verifica che il modale di eliminazione si apra
    await waitFor(() => {
      expect(screen.getByText('Conferma Eliminazione')).toBeInTheDocument();
    });
  });

  it('should open move modal when clicking move button', async () => {
    render(<RoleHierarchy />);

    await waitFor(() => {
      expect(screen.getByText('Amministratore')).toBeInTheDocument();
    });

    // Trova e clicca il pulsante di spostamento
    const moveButtons = screen.getAllByTitle('Sposta ruolo');
    fireEvent.click(moveButtons[0]);

    // Verifica che il modale di spostamento si apra
    await waitFor(() => {
      expect(screen.getByText('Sposta Ruolo')).toBeInTheDocument();
    });
  });

  it('should call RolesService.create when creating a new role', async () => {
    const mockCreate = vi.fn().mockResolvedValue({});
    (RolesService.create as any) = mockCreate;

    render(<RoleHierarchy />);

    await waitFor(() => {
      expect(screen.getByText('Nuovo Ruolo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Nuovo Ruolo'));

    await waitFor(() => {
      expect(screen.getByText('Crea Nuovo Ruolo')).toBeInTheDocument();
    });

    // Simula il riempimento del form e l'invio
    const nameInput = screen.getByLabelText('Nome del Ruolo');
    fireEvent.change(nameInput, { target: { value: 'Nuovo Ruolo Test' } });

    const submitButton = screen.getByText('Crea Ruolo');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
    });
  });

  it('should call RolesService.update when editing a role', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({});
    (RolesService.update as any) = mockUpdate;

    render(<RoleHierarchy />);

    await waitFor(() => {
      expect(screen.getByText('Amministratore')).toBeInTheDocument();
    });

    // Clicca il pulsante di modifica
    const editButtons = screen.getAllByTitle('Modifica ruolo');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Modifica Ruolo')).toBeInTheDocument();
    });

    // Simula la modifica e l'invio
    const submitButton = screen.getByText('Aggiorna Ruolo');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  it('should call RolesService.delete when deleting a role', async () => {
    const mockDelete = vi.fn().mockResolvedValue({});
    (RolesService.delete as any) = mockDelete;

    render(<RoleHierarchy />);

    await waitFor(() => {
      expect(screen.getByText('Amministratore')).toBeInTheDocument();
    });

    // Clicca il pulsante di eliminazione
    const deleteButtons = screen.getAllByTitle('Elimina ruolo');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Conferma Eliminazione')).toBeInTheDocument();
    });

    // Conferma l'eliminazione
    const confirmButton = screen.getByText('Elimina');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  it('should switch between list and tree view modes', async () => {
    render(<RoleHierarchy />);

    await waitFor(() => {
      expect(screen.getByText('Vista Albero')).toBeInTheDocument();
      expect(screen.getByText('Vista Lista')).toBeInTheDocument();
    });

    // Verifica che la vista albero sia attiva di default
    expect(screen.getByText('Vista Albero')).toHaveClass('bg-white text-blue-600');

    // Clicca sulla vista lista
    fireEvent.click(screen.getByText('Vista Lista'));

    // Verifica che la vista lista sia ora attiva
    expect(screen.getByText('Vista Lista')).toHaveClass('bg-white text-blue-600');
  });

  it('should filter roles when searching', async () => {
    render(<RoleHierarchy />);

    await waitFor(() => {
      expect(screen.getByText('Vista Lista')).toBeInTheDocument();
    });

    // Passa alla vista lista per vedere la barra di ricerca
    fireEvent.click(screen.getByText('Vista Lista'));

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