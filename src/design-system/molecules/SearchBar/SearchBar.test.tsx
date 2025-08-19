import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { SearchBar } from './SearchBar';

describe('SearchBar', () => {
  const user = userEvent.setup();

  it('renders with default props', () => {
    render(<SearchBar />);
    
    const input = screen.getByPlaceholderText('Cerca...');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('renders with custom placeholder', () => {
    render(<SearchBar placeholder="Cerca prodotti..." />);
    
    expect(screen.getByPlaceholderText('Cerca prodotti...')).toBeInTheDocument();
  });

  it('shows search button by default', () => {
    render(<SearchBar />);
    
    const searchButton = screen.getByRole('button');
    expect(searchButton).toBeInTheDocument();
  });

  it('hides search button when showButton is false', () => {
    render(<SearchBar showButton={false} />);
    
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onSearch when search button is clicked', async () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    
    const input = screen.getByPlaceholderText('Cerca...');
    const searchButton = screen.getByTestId('search-bar-search-button');
    
    await user.type(input, 'test query');
    await user.click(searchButton);
    
    expect(onSearch).toHaveBeenCalledWith('test query');
  });

  it('calls onSearch when Enter key is pressed', async () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    
    const input = screen.getByPlaceholderText('Cerca...');
    
    await user.type(input, 'test query');
    await user.keyboard('{Enter}');
    
    expect(onSearch).toHaveBeenCalledWith('test query');
  });

  it('trims whitespace when searching', async () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    
    const input = screen.getByPlaceholderText('Cerca...');
    
    fireEvent.change(input, { target: { value: '  test query  ' } });
    input.focus();
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    expect(onSearch).toHaveBeenCalledWith('test query');
  });

  it('does not call onSearch with empty or whitespace-only input', async () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    
    const input = screen.getByPlaceholderText('Cerca...');
    const searchButton = screen.getByTestId('search-bar-search-button');
    
    // Test empty input
    await user.click(searchButton);
    expect(onSearch).not.toHaveBeenCalled();
    
    // Test whitespace-only input
    await user.type(input, '   ');
    await user.click(searchButton);
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('calls onChange when input value changes', async () => {
    const onChange = vi.fn();
    render(<SearchBar onChange={onChange} />);
    
    const input = screen.getByPlaceholderText('Cerca...');
    
    await user.type(input, 'test');
    
    expect(onChange).toHaveBeenCalledTimes(4); // One call per character
    expect(onChange).toHaveBeenLastCalledWith('test');
  });

  it('works as controlled component', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <SearchBar value="initial" onChange={onChange} />
    );
    
    const input = screen.getByDisplayValue('initial');
    expect(input).toHaveValue('initial');
    
    await user.type(input, 'x');
    expect(onChange).toHaveBeenCalledWith('initialx');
    
    // Simulate parent component updating the value
    rerender(<SearchBar value="updated" onChange={onChange} />);
    expect(input).toHaveValue('updated');
  });

  it('shows clear button when there is text', async () => {
    render(<SearchBar />);
    
    const input = screen.getByPlaceholderText('Cerca...');
    
    // Initially no clear button
    expect(screen.queryByTestId('search-bar-clear-button')).not.toBeInTheDocument();
    
    await user.type(input, 'test');
    
    // Clear button should appear
    const clearButton = screen.getByTestId('search-bar-clear-button');
    expect(clearButton).toBeInTheDocument();
  });

  it('clears input when clear button is clicked', async () => {
    const onChange = vi.fn();
    render(<SearchBar onChange={onChange} />);
    
    const input = screen.getByPlaceholderText('Cerca...');
    
    await user.type(input, 'test');
    
    const clearButton = screen.getByTestId('search-bar-clear-button');
    
    await user.click(clearButton);
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  it('hides clear button when showClearButton is false', async () => {
    render(<SearchBar showClearButton={false} value="test" />);
    
    // Only search button should be present
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1); // Only search button
  });

  it('disables input and buttons when disabled', () => {
    render(<SearchBar disabled value="test" />);
    
    const input = screen.getByPlaceholderText('Cerca...');
    const searchButton = screen.getByTestId('search-bar-search-button');
    
    expect(input).toBeDisabled();
    expect(searchButton).toBeDisabled();
  });

  it('searches on type when searchOnType is true', async () => {
    const onSearch = vi.fn();
    render(
      <SearchBar 
        searchOnType 
        onSearch={onSearch} 
        debounceMs={100}
      />
    );
    
    const input = screen.getByPlaceholderText('Cerca...');
    
    await user.type(input, 'test');
    
    // Wait for debounce
    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith('test');
    }, { timeout: 200 });
  });

  it('debounces search on type', async () => {
    const onSearch = vi.fn();
    render(
      <SearchBar 
        searchOnType 
        onSearch={onSearch} 
        debounceMs={100}
      />
    );
    
    const input = screen.getByPlaceholderText('Cerca...');
    
    // Type multiple characters quickly
    await user.type(input, 'test', { delay: 10 });
    
    // Should not have called onSearch yet
    expect(onSearch).not.toHaveBeenCalled();
    
    // Wait for debounce
    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledTimes(1);
      expect(onSearch).toHaveBeenCalledWith('test');
    }, { timeout: 200 });
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<SearchBar size="sm" />);
    
    let container = screen.getByTestId('search-bar-container');
    expect(container).toHaveClass('h-8');
    
    rerender(<SearchBar size="md" />);
    container = screen.getByTestId('search-bar-container');
    expect(container).toHaveClass('h-10');
    
    rerender(<SearchBar size="lg" />);
    container = screen.getByTestId('search-bar-container');
    expect(container).toHaveClass('h-12');
  });

  it('applies custom className', () => {
    render(<SearchBar className="custom-class" />);
    
    const container = screen.getByTestId('search-bar-container');
    expect(container).toHaveClass('custom-class');
  });

  it('disables search button when input is empty', () => {
    render(<SearchBar />);
    
    const searchButton = screen.getByTestId('search-bar-search-button');
    expect(searchButton).toBeDisabled();
  });

  it('enables search button when input has text', async () => {
    render(<SearchBar />);
    
    const input = screen.getByPlaceholderText('Cerca...');
    const searchButton = screen.getByTestId('search-bar-search-button');
    
    await user.type(input, 'test');
    
    expect(searchButton).not.toBeDisabled();
  });
});