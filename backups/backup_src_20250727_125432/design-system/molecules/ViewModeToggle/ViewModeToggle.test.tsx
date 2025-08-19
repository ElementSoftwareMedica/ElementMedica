import { render, screen, fireEvent } from '@testing-library/react';
import { ViewModeToggle } from './ViewModeToggle';

describe('ViewModeToggle', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders with table mode selected by default', () => {
    render(
      <ViewModeToggle
        viewMode="table"
        onChange={mockOnChange}
      />
    );

    const tableButton = screen.getByRole('button', { pressed: true });
    expect(tableButton).toBeInTheDocument();
    expect(tableButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders with grid mode selected', () => {
    render(
      <ViewModeToggle
        viewMode="grid"
        onChange={mockOnChange}
      />
    );

    const gridButton = screen.getByRole('button', { pressed: true });
    expect(gridButton).toBeInTheDocument();
    expect(gridButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onChange when table button is clicked', () => {
    render(
      <ViewModeToggle
        viewMode="grid"
        onChange={mockOnChange}
      />
    );

    const tableButton = screen.getByRole('button', { pressed: false });
    fireEvent.click(tableButton);

    expect(mockOnChange).toHaveBeenCalledWith('table');
  });

  it('calls onChange when grid button is clicked', () => {
    render(
      <ViewModeToggle
        viewMode="table"
        onChange={mockOnChange}
      />
    );

    const gridButton = screen.getByRole('button', { pressed: false });
    fireEvent.click(gridButton);

    expect(mockOnChange).toHaveBeenCalledWith('grid');
  });

  it('renders custom labels', () => {
    render(
      <ViewModeToggle
        viewMode="table"
        onChange={mockOnChange}
        tableLabel="Lista"
        gridLabel="Griglia"
      />
    );

    expect(screen.getByText('Lista')).toBeInTheDocument();
    expect(screen.getByText('Griglia')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ViewModeToggle
        viewMode="table"
        onChange={mockOnChange}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});