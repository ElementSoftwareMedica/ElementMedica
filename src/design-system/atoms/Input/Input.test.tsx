/**
 * Design System - Input Component Tests
 * Week 8 Implementation - Component Library
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Input } from './Input';

describe('Input', () => {
  describe('Basic rendering', () => {
    it('renders with default props', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('renders with placeholder text', () => {
      render(<Input placeholder="Enter your name" />);
      expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
    });

    it('renders with default value', () => {
      render(<Input defaultValue="Default text" />);
      expect(screen.getByDisplayValue('Default text')).toBeInTheDocument();
    });

    it('renders with controlled value', () => {
      render(<Input value="Controlled value" onChange={() => {}} />);
      expect(screen.getByDisplayValue('Controlled value')).toBeInTheDocument();
    });
  });

  describe('Input types', () => {
    it('renders text input by default', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text');
    });

    it('renders email input correctly', () => {
      render(<Input type="email" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
    });

    it('renders password input correctly', () => {
      const { container } = render(<Input type="password" />);
      const input = container.querySelector('input[type="password"]');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'password');
    });

    it('renders number input correctly', () => {
      render(<Input type="number" />);
      expect(screen.getByRole('spinbutton')).toHaveAttribute('type', 'number');
    });

    it('renders search input correctly', () => {
      render(<Input type="search" />);
      expect(screen.getByRole('searchbox')).toHaveAttribute('type', 'search');
    });
  });

  describe('Variants', () => {
    it('renders default variant correctly', () => {
      render(<Input variant="default" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-gray-300');
    });

    it('renders filled variant correctly', () => {
      render(<Input variant="filled" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('bg-gray-50');
    });

    it('renders flushed variant correctly', () => {
      render(<Input variant="flushed" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-0', 'border-b-2');
    });
  });

  describe('Sizes', () => {
    it('applies small size correctly', () => {
      render(<Input size="sm" />);
      expect(screen.getByRole('textbox')).toHaveClass('px-3', 'py-1.5', 'text-sm');
    });

    it('applies medium size as default', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toHaveClass('px-3', 'py-2', 'text-base');
    });

    it('applies large size correctly', () => {
      render(<Input size="lg" />);
      expect(screen.getByRole('textbox')).toHaveClass('px-4', 'py-3', 'text-lg');
    });
  });

  describe('States', () => {
    it('applies error state correctly', () => {
      render(<Input state="error" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-red-500');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('applies success state correctly', () => {
      render(<Input state="success" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-green-500');
    });



    it('applies disabled state correctly', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
      expect(input).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed', '!bg-gray-50', 'text-gray-500', 'cursor-not-allowed');
    });

    it('applies readonly state correctly', () => {
      render(<Input readOnly />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('readonly');
      expect(input).toHaveClass('!bg-gray-50');
    });
  });

  describe('Label and helper text', () => {
    it('renders with label', () => {
      render(<Input label="Username" />);
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
      expect(screen.getByText('Username')).toBeInTheDocument();
    });

    it('renders with helper text', () => {
      render(<Input helperText="Enter your username" />);
      expect(screen.getByText('Enter your username')).toBeInTheDocument();
    });

    it('renders with error message', () => {
      render(<Input errorMessage="Username is required" state="error" />);
      expect(screen.getByText('Username is required')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby');
    });

    it('renders with success message', () => {
      render(<Input successMessage="Username is available" state="success" />);
      expect(screen.getByText('Username is available')).toBeInTheDocument();
    });

    it('prioritizes error message over helper text', () => {
      render(
        <Input
          helperText="Helper text"
          errorMessage="Error message"
          state="error"
        />
      );
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
    });
  });

  describe('Required field', () => {
    it('shows required indicator when required', () => {
      render(<Input label="Username" required />);
      expect(screen.getByText('*')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toHaveAttribute('required');
    });

    it('does not show required indicator by default', () => {
      render(<Input label="Username" />);
      expect(screen.queryByText('*')).not.toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('renders left icon correctly', () => {
      const LeftIcon = () => <span data-testid="left-icon">🔍</span>;
      render(<Input leftIcon={<LeftIcon />} />);
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('adjusts padding when left icon is present', () => {
      const LeftIcon = () => <span data-testid="left-icon">🔍</span>;
      render(<Input leftIcon={<LeftIcon />} />);
      expect(screen.getByRole('textbox')).toHaveClass('pl-10');
    });

    it('renders without left padding when no icon', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).not.toHaveClass('pl-10');
    });
  });

  describe('Event handling', () => {
    it('handles onChange events correctly', () => {
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test input' } });
      
      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ value: 'test input' })
        })
      );
    });

    it('handles onFocus events correctly', () => {
      const handleFocus = vi.fn();
      render(<Input onFocus={handleFocus} />);
      
      fireEvent.focus(screen.getByRole('textbox'));
      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('handles onBlur events correctly', () => {
      const handleBlur = vi.fn();
      render(<Input onBlur={handleBlur} />);
      
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      fireEvent.blur(input);
      
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('handles onKeyDown events correctly', () => {
      const handleKeyDown = vi.fn();
      render(<Input onKeyDown={handleKeyDown} />);
      
      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
      expect(handleKeyDown).toHaveBeenCalledTimes(1);
    });

    it('does not trigger events when disabled', () => {
      const handleChange = vi.fn();
      const handleFocus = vi.fn();
      
      render(<Input disabled onChange={handleChange} onFocus={handleFocus} />);
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test' } });
      fireEvent.focus(input);
      
      expect(handleChange).not.toHaveBeenCalled();
      expect(handleFocus).not.toHaveBeenCalled();
    });
  });

  describe('Focus management', () => {
    it('applies focus styles on focus', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      
      // Verify focus styles are defined in the class list
      expect(input).toHaveClass('focus:ring-2', 'focus:ring-primary-500/20');
      
      // Verify the input can receive focus
      input.focus();
      expect(input).toHaveFocus();
    });

    it('is focusable by default', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      input.focus();
      expect(input).toHaveFocus();
    });

    it('is not focusable when disabled', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });
  });

  describe('Custom classes and styling', () => {
    it('applies custom className correctly', () => {
      render(<Input className="custom-input" />);
      expect(screen.getByRole('textbox')).toHaveClass('custom-input');
    });

    it('merges custom classes with default classes', () => {
      render(<Input variant="filled" size="lg" className="custom-input" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('bg-gray-50', 'px-4', 'py-3', 'custom-input');
    });
  });

  describe('Accessibility', () => {
    it('associates label with input correctly', () => {
      render(<Input label="Username" />);
      const input = screen.getByRole('textbox');
      const label = screen.getByText('Username');
      
      expect(input).toHaveAttribute('id');
      expect(label).toHaveAttribute('for', input.getAttribute('id'));
    });

    it('associates error message with input via aria-describedby', () => {
      render(<Input errorMessage="Error message" state="error" />);
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveAttribute('aria-describedby');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('associates helper text with input via aria-describedby', () => {
      render(<Input helperText="Helper text" />);
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveAttribute('aria-describedby');
    });

    it('supports custom aria attributes', () => {
      render(
        <Input
          aria-label="Custom label"
          aria-required="true"
          aria-describedby="custom-description"
        />
      );
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveAttribute('aria-label', 'Custom label');
      expect(input).toHaveAttribute('aria-required', 'true');
      expect(input).toHaveAttribute('aria-describedby', 'custom-description');
    });
  });

  describe('Form integration', () => {
    it('supports name attribute', () => {
      render(<Input name="username" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('name', 'username');
    });

    it('supports form attribute', () => {
      render(<Input form="my-form" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('form', 'my-form');
    });

    it('supports autocomplete attribute', () => {
      render(<Input autoComplete="username" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('autocomplete', 'username');
    });

    it('supports pattern attribute', () => {
      render(<Input pattern="[0-9]*" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('pattern', '[0-9]*');
    });

    it('supports min and max for number inputs', () => {
      render(<Input type="number" min="0" max="100" />);
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('min', '0');
      expect(input).toHaveAttribute('max', '100');
    });
  });

  describe('Edge cases', () => {
    it('handles empty label gracefully', () => {
      render(<Input label="" />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('handles very long error messages', () => {
      const longMessage = 'This is a very long error message that should wrap properly and not break the layout of the form field component';
      render(<Input errorMessage={longMessage} state="error" />);
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('handles special characters in values', () => {
      const specialValue = 'Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';
      render(<Input value={specialValue} onChange={() => {}} />);
      expect(screen.getByDisplayValue(specialValue)).toBeInTheDocument();
    });

    it('combines multiple states and props correctly', () => {
      const LeftIcon = () => <span data-testid="left-icon">🔍</span>;
      
      render(
        <Input
          label="Search"
          type="search"
          size="lg"
          variant="filled"
          state="success"
          required
          leftIcon={<LeftIcon />}
          successMessage="Valid search term"
          className="custom-search"
        />
      );
      
      const input = screen.getByRole('searchbox');
      expect(input).toHaveClass(
        'bg-gray-50',
        'px-4',
        'py-3',
        'text-lg',
        'border-green-500',
        'pl-10',
        'custom-search'
      );
      expect(input).toHaveAttribute('required');
      expect(screen.getByText('Search')).toBeInTheDocument();
      expect(screen.getByText('*')).toBeInTheDocument();
      expect(screen.getByText('Valid search term')).toBeInTheDocument();
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });
  });

  describe('Controlled vs Uncontrolled', () => {
    it('works as uncontrolled component with defaultValue', () => {
      render(<Input defaultValue="Initial value" />);
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveValue('Initial value');
      
      fireEvent.change(input, { target: { value: 'New value' } });
      expect(input).toHaveValue('New value');
    });

    it('works as controlled component with value and onChange', () => {
      const TestComponent = () => {
        const [value, setValue] = React.useState('Controlled value');
        return (
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        );
      };
      
      render(<TestComponent />);
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveValue('Controlled value');
      
      fireEvent.change(input, { target: { value: 'Updated value' } });
      expect(input).toHaveValue('Updated value');
    });
  });
});