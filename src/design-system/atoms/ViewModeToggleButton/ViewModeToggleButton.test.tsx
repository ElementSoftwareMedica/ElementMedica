import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import { ViewModeToggleButton } from './ViewModeToggleButton';

describe('ViewModeToggleButton', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders with grid mode selected', () => {
    render(
      <ViewModeToggleButton
        viewMode="grid"
        onChange={mockOnChange}
      />
    );

    const gridButton = screen.getByRole('button', { name: /card/i });
    const tableButton = screen.getByRole('button', { name: /table/i });
    
    expect(gridButton).toHaveClass('text-primary-700');
    expect(tableButton).toHaveClass('text-gray-500');
  });

  it('renders with table mode selected', () => {
    render(
      <ViewModeToggleButton
        viewMode="table"
        onChange={mockOnChange}
      />
    );

    const gridButton = screen.getByRole('button', { name: /card/i });
    const tableButton = screen.getByRole('button', { name: /table/i });
    
    expect(gridButton).toHaveClass('text-gray-500');
    expect(tableButton).toHaveClass('text-primary-700');
  });

  it('calls onChange when grid button is clicked', () => {
    render(
      <ViewModeToggleButton
        viewMode="table"
        onChange={mockOnChange}
      />
    );

    const gridButton = screen.getByRole('button', { name: /card/i });
    fireEvent.click(gridButton);

    expect(mockOnChange).toHaveBeenCalledWith('grid');
  });

  it('calls onChange when table button is clicked', () => {
    render(
      <ViewModeToggleButton
        viewMode="grid"
        onChange={mockOnChange}
      />
    );

    const tableButton = screen.getByRole('button', { name: /table/i });
    fireEvent.click(tableButton);

    expect(mockOnChange).toHaveBeenCalledWith('table');
  });

  it('renders custom labels', () => {
    render(
      <ViewModeToggleButton
        viewMode="grid"
        onChange={mockOnChange}
        gridLabel="Griglia"
        tableLabel="Lista"
      />
    );

    expect(screen.getByText('Griglia')).toBeInTheDocument();
    expect(screen.getByText('Lista')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ViewModeToggleButton
        viewMode="grid"
        onChange={mockOnChange}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('has correct slider position for grid mode', () => {
    const { container } = render(
      <ViewModeToggleButton
        viewMode="grid"
        onChange={mockOnChange}
      />
    );

    const slider = container.querySelector('span[class*="translate-x-0"]');
    expect(slider).toBeInTheDocument();
  });

  it('has correct slider position for table mode', () => {
    const { container } = render(
      <ViewModeToggleButton
        viewMode="table"
        onChange={mockOnChange}
      />
    );

    const slider = container.querySelector('span[class*="translate-x-full"]');
    expect(slider).toBeInTheDocument();
  });
});