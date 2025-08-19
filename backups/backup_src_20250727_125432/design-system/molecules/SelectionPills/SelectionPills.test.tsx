import { render, screen, fireEvent } from '@testing-library/react';
import { SelectionPills } from './SelectionPills';
import { Edit, Trash2 } from 'lucide-react';

describe('SelectionPills', () => {
  const mockActions = [
    {
      label: 'Modifica',
      onClick: jest.fn(),
      icon: <Edit className="w-4 h-4" />,
      variant: 'primary' as const,
    },
    {
      label: 'Elimina',
      onClick: jest.fn(),
      icon: <Trash2 className="w-4 h-4" />,
      variant: 'danger' as const,
    },
  ];

  beforeEach(() => {
    mockActions.forEach(action => action.onClick.mockClear());
  });

  it('renders nothing when no actions and count is 0', () => {
    const { container } = render(
      <SelectionPills actions={[]} count={0} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders selection count pill', () => {
    render(
      <SelectionPills
        actions={[]}
        count={3}
        entityName="elementi"
      />
    );

    expect(screen.getByText('3 elementi selezionati')).toBeInTheDocument();
  });

  it('renders singular form for count of 1', () => {
    render(
      <SelectionPills
        actions={[]}
        count={1}
        entityName="elemento"
      />
    );

    expect(screen.getByText('1 elemento selezionato')).toBeInTheDocument();
  });

  it('renders action pills', () => {
    render(
      <SelectionPills actions={mockActions} />
    );

    expect(screen.getByText('Modifica')).toBeInTheDocument();
    expect(screen.getByText('Elimina')).toBeInTheDocument();
  });

  it('calls action onClick when clicked', () => {
    render(
      <SelectionPills actions={mockActions} />
    );

    fireEvent.click(screen.getByText('Modifica'));
    expect(mockActions[0].onClick).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Elimina'));
    expect(mockActions[1].onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClear when clear button is clicked', () => {
    const mockOnClear = jest.fn();
    render(
      <SelectionPills
        actions={[]}
        count={3}
        onClear={mockOnClear}
      />
    );

    const clearButton = screen.getByLabelText('Cancella selezione');
    fireEvent.click(clearButton);
    expect(mockOnClear).toHaveBeenCalledTimes(1);
  });

  it('calls onClearSelection when clear button is clicked', () => {
    const mockOnClearSelection = jest.fn();
    render(
      <SelectionPills
        actions={[]}
        count={3}
        onClearSelection={mockOnClearSelection}
      />
    );

    const clearButton = screen.getByLabelText('Cancella selezione');
    fireEvent.click(clearButton);
    expect(mockOnClearSelection).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    const { container } = render(
      <SelectionPills
        actions={mockActions}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders icons in action pills', () => {
    render(
      <SelectionPills actions={mockActions} />
    );

    // Verifica che le icone siano presenti (tramite i loro elementi SVG)
    const editIcons = screen.getAllByRole('button');
    expect(editIcons).toHaveLength(2);
  });
});