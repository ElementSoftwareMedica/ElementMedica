import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { InputFilter } from './InputFilter';
import { Search } from 'lucide-react';

describe('InputFilter', () => {
  const defaultProps = {
    name: 'test-input',
    value: '',
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with basic props', () => {
    render(<InputFilter {...defaultProps} />);
    
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('name', 'test-input');
    expect(input).toHaveValue('');
  });

  it('displays placeholder text', () => {
    render(
      <InputFilter
        {...defaultProps}
        placeholder="Cerca elementi..."
      />
    );
    
    expect(screen.getByPlaceholderText('Cerca elementi...')).toBeInTheDocument();
  });

  it('displays the provided value', () => {
    render(
      <InputFilter
        {...defaultProps}
        value="test value"
      />
    );
    
    expect(screen.getByDisplayValue('test value')).toBeInTheDocument();
  });

  it('calls onChange when input value changes', () => {
    const mockOnChange = vi.fn();
    render(
      <InputFilter
        {...defaultProps}
        onChange={mockOnChange}
      />
    );
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'new value' } });
    
    expect(mockOnChange).toHaveBeenCalledTimes(1);
    // Verifica che onChange sia stato chiamato con un evento
    expect(mockOnChange).toHaveBeenCalledWith(expect.any(Object));
  });

  it('renders with icon when provided', () => {
    render(
      <InputFilter
        {...defaultProps}
        icon={<Search data-testid="search-icon" />}
      />
    );
    
    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <InputFilter
        {...defaultProps}
        className="custom-class"
      />
    );
    
    const container = screen.getByRole('textbox').parentElement;
    expect(container).toHaveClass('custom-class');
  });

  it('applies default styling classes', () => {
    render(<InputFilter {...defaultProps} />);
    
    const container = screen.getByRole('textbox').parentElement;
    expect(container).toHaveClass(
      'flex',
      'items-center',
      'gap-2',
      'bg-white',
      'rounded-full',
      'shadow',
      'px-4',
      'py-2'
    );
  });

  it('input has correct styling classes', () => {
    render(<InputFilter {...defaultProps} />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass(
      'flex-1',
      'border-0',
      'focus:ring-0',
      'text-gray-700',
      'bg-transparent'
    );
  });

  it('has correct input type', () => {
    render(<InputFilter {...defaultProps} />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'text');
  });
});