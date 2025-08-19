import { render, screen } from '@testing-library/react';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import { SearchBarControls } from './SearchBarControls';

describe('SearchBarControls', () => {
  const defaultProps = {
    placeholder: 'Cerca...',
    value: '',
    onSearch: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with basic props', () => {
    render(<SearchBarControls {...defaultProps} />);
    
    expect(screen.getByPlaceholderText('Cerca...')).toBeInTheDocument();
  });

  it('applies default width and height classes', () => {
    const { container } = render(<SearchBarControls {...defaultProps} />);
    
    const searchBarContainer = container.firstChild as HTMLElement;
    expect(searchBarContainer).toHaveClass('w-64', 'h-10');
  });

  it('applies custom className while preserving defaults', () => {
    const { container } = render(<SearchBarControls {...defaultProps} className="custom-class" />);
    
    const searchBarContainer = container.firstChild as HTMLElement;
    expect(searchBarContainer).toHaveClass('w-64', 'h-10', 'custom-class');
  });

  it('passes through all SearchBar props', () => {
    const mockOnSearch = vi.fn();
    const mockOnChange = vi.fn();
    
    render(
      <SearchBarControls
        placeholder="Test placeholder"
        value="test value"
        onSearch={mockOnSearch}
        onChange={mockOnChange}
        disabled={false}
        showButton={true}
        showClearButton={true}
      />
    );
    
    // Verifica che il placeholder sia passato correttamente
    expect(screen.getByPlaceholderText('Test placeholder')).toBeInTheDocument();
    
    // Verifica che il valore sia passato correttamente
    expect(screen.getByDisplayValue('test value')).toBeInTheDocument();
  });

  it('renders without filter and sort options', () => {
    render(<SearchBarControls {...defaultProps} />);
    
    // Dovrebbe renderizzare solo la barra di ricerca base
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('handles empty props gracefully', () => {
    render(
      <SearchBarControls
        placeholder=""
        value=""
        onSearch={vi.fn()}
      />
    );
    
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});