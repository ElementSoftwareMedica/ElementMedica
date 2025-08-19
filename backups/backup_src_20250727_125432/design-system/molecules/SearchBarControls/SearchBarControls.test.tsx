import { render, screen } from '@testing-library/react';
import { SearchBarControls } from './SearchBarControls';

describe('SearchBarControls', () => {
  const defaultProps = {
    placeholder: 'Cerca...',
    searchValue: '',
    onSearch: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with basic props', () => {
    render(<SearchBarControls {...defaultProps} />);
    
    expect(screen.getByPlaceholderText('Cerca...')).toBeInTheDocument();
  });

  it('applies default width and height classes', () => {
    render(<SearchBarControls {...defaultProps} />);
    
    const container = screen.getByRole('textbox').closest('div');
    expect(container).toHaveClass('w-64', 'h-10');
  });

  it('applies custom className while preserving defaults', () => {
    render(
      <SearchBarControls
        {...defaultProps}
        className="custom-class"
      />
    );
    
    const container = screen.getByRole('textbox').closest('div');
    expect(container).toHaveClass('w-64', 'h-10', 'custom-class');
  });

  it('passes through all SearchBar props', () => {
    const mockOnSearch = jest.fn();
    const mockOnFilterChange = jest.fn();
    const mockOnSortChange = jest.fn();
    
    const filterOptions = [
      {
        key: 'status',
        label: 'Stato',
        options: [
          { value: 'active', label: 'Attivo' },
          { value: 'inactive', label: 'Inattivo' },
        ],
      },
    ];
    
    const sortOptions = [
      { value: 'name', label: 'Nome' },
      { value: 'date', label: 'Data' },
    ];
    
    render(
      <SearchBarControls
        placeholder="Test placeholder"
        searchValue="test value"
        onSearch={mockOnSearch}
        filterOptions={filterOptions}
        onFilterChange={mockOnFilterChange}
        sortOptions={sortOptions}
        onSortChange={mockOnSortChange}
        activeFilters={{ status: 'active' }}
        activeSort={{ field: 'name', direction: 'asc' }}
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
        searchValue=""
        onSearch={jest.fn()}
      />
    );
    
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});