/**
 * Design System - Select Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Select } from './Select';

const mockOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3', disabled: true }
];

describe('Select', () => {
  it('renders with default props', () => {
    render(<Select options={mockOptions} />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select).toHaveClass('w-full', 'rounded-md', 'border');
  });

  it('renders options correctly', () => {
    render(<Select options={mockOptions} />);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent('Option 1');
    expect(options[1]).toHaveTextContent('Option 2');
    expect(options[2]).toHaveTextContent('Option 3');
    expect(options[2]).toBeDisabled();
  });

  it('renders placeholder when provided', () => {
    render(<Select options={mockOptions} placeholder="Choose an option" />);
    const placeholder = screen.getByRole('option', { name: 'Choose an option' });
    expect(placeholder).toBeInTheDocument();
    expect(placeholder).toBeDisabled();
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<Select options={mockOptions} size="sm" />);
    expect(screen.getByRole('combobox')).toHaveClass('h-8', 'px-2', 'text-sm');

    rerender(<Select options={mockOptions} size="lg" />);
    expect(screen.getByRole('combobox')).toHaveClass('h-12', 'px-4', 'text-lg');
  });

  it('applies variant classes correctly', () => {
    const { rerender } = render(<Select options={mockOptions} variant="outlined" />);
    expect(screen.getByRole('combobox')).toHaveClass('border-2');

    rerender(<Select options={mockOptions} variant="filled" />);
    expect(screen.getByRole('combobox')).toHaveClass('bg-gray-50');
  });

  it('applies error styles when error prop is true', () => {
    render(<Select options={mockOptions} error />);
    expect(screen.getByRole('combobox')).toHaveClass('border-red-300');
  });

  it('handles onChange events', () => {
    const handleChange = jest.fn();
    render(<Select options={mockOptions} onChange={handleChange} />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'option1' } });
    
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    render(<Select options={mockOptions} className="custom-class" />);
    expect(screen.getByRole('combobox')).toHaveClass('custom-class');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLSelectElement>();
    render(<Select options={mockOptions} ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
  });

  it('renders children when provided', () => {
    render(
      <Select>
        <option value="custom">Custom Option</option>
      </Select>
    );
    expect(screen.getByRole('option', { name: 'Custom Option' })).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Select options={mockOptions} disabled />);
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.getByRole('combobox')).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
  });
});