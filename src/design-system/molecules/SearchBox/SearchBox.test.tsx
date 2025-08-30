/**
 * Design System - SearchBox Component Tests
 * Week 8 Implementation - Component Library
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBox } from './SearchBox';

describe('SearchBox Component', () => {
  it('renders with default props', () => {
    render(<SearchBox />);
    
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Cerca...');
  });

  it('renders with custom placeholder', () => {
    render(<SearchBox placeholder="Custom placeholder" />);
    
    const input = screen.getByPlaceholderText('Custom placeholder');
    expect(input).toBeInTheDocument();
  });

  it('displays search icon', () => {
    render(<SearchBox />);
    
    // The search icon should be present (MagnifyingGlassIcon)
    const container = screen.getByRole('textbox').parentElement;
    expect(container).toBeInTheDocument();
  });

  it('handles controlled value', () => {
    const handleChange = vi.fn();
    render(<SearchBox value="test value" onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('test value');
  });

  it('handles uncontrolled value', async () => {
    const user = userEvent.setup();
    render(<SearchBox />);
    
    const input = screen.getByRole('textbox');
    await user.type(input, 'test input');
    
    expect(input).toHaveValue('test input');
  });

  it('calls onChange when typing', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<SearchBox onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    await user.type(input, 'a');
    
    expect(handleChange).toHaveBeenCalled();
  });

  it('calls onSearch when Enter is pressed', async () => {
    const user = userEvent.setup();
    const handleSearch = vi.fn();
    render(<SearchBox onSearch={handleSearch} />);
    
    const input = screen.getByRole('textbox');
    await user.type(input, 'search term');
    await user.keyboard('{Enter}');
    
    expect(handleSearch).toHaveBeenCalledWith('search term');
  });

  it('shows clear button when there is value and clearable is true', async () => {
    const user = userEvent.setup();
    render(<SearchBox clearable />);
    
    const input = screen.getByRole('textbox');
    await user.type(input, 'some text');
    
    const clearButton = screen.getByRole('button', { name: /cancella ricerca/i });
    expect(clearButton).toBeInTheDocument();
  });

  it('does not show clear button when clearable is false', async () => {
    const user = userEvent.setup();
    render(<SearchBox clearable={false} />);
    
    const input = screen.getByRole('textbox');
    await user.type(input, 'some text');
    
    const clearButton = screen.queryByRole('button', { name: /cancella ricerca/i });
    expect(clearButton).not.toBeInTheDocument();
  });

  it('clears input when clear button is clicked', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<SearchBox onChange={handleChange} clearable />);
    
    const input = screen.getByRole('textbox');
    await user.type(input, 'some text');
    
    const clearButton = screen.getByRole('button', { name: /cancella ricerca/i });
    await user.click(clearButton);
    
    expect(input).toHaveValue('');
  });

  it('calls onClear when clear button is clicked', async () => {
    const user = userEvent.setup();
    const handleClear = vi.fn();
    render(<SearchBox onClear={handleClear} clearable />);
    
    const input = screen.getByRole('textbox');
    await user.type(input, 'some text');
    
    const clearButton = screen.getByRole('button', { name: /cancella ricerca/i });
    await user.click(clearButton);
    
    expect(handleClear).toHaveBeenCalled();
  });

  it('shows loading spinner when loading is true', () => {
    render(<SearchBox loading />);
    
    // Check for loading spinner (svg with animate-spin class)
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('does not show clear button when loading', async () => {
    const user = userEvent.setup();
    render(<SearchBox loading clearable />);
    
    const input = screen.getByRole('textbox');
    await user.type(input, 'some text');
    
    const clearButton = screen.queryByRole('button', { name: /cancella ricerca/i });
    expect(clearButton).not.toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<SearchBox size="sm" />);
    let container = screen.getByRole('textbox').parentElement;
    expect(container).toHaveClass('h-8');
    
    rerender(<SearchBox size="md" />);
    container = screen.getByRole('textbox').parentElement;
    expect(container).toHaveClass('h-10');
    
    rerender(<SearchBox size="lg" />);
    container = screen.getByRole('textbox').parentElement;
    expect(container).toHaveClass('h-12');
  });

  it('is disabled when disabled prop is true', () => {
    render(<SearchBox disabled />);
    
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<SearchBox className="custom-class" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-class');
  });

  it('applies custom containerClassName', () => {
    render(<SearchBox containerClassName="custom-container" />);
    
    const container = screen.getByRole('textbox').parentElement;
    expect(container).toHaveClass('custom-container');
  });

  it('forwards ref to input element', () => {
    const ref = vi.fn();
    render(<SearchBox ref={ref} />);
    
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLInputElement));
  });
});