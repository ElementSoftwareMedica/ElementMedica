/**
 * Design System - FormField Component Tests
 * Week 8 Implementation - Component Library
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FormField } from './FormField';

describe('FormField', () => {
  describe('Basic rendering', () => {
    it('renders with default props', () => {
      render(<FormField name="test" />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('renders with label', () => {
      render(<FormField name="username" label="Username" />);
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
      expect(screen.getByText('Username')).toBeInTheDocument();
    });

    it('renders with placeholder', () => {
      render(<FormField name="email" placeholder="Enter your email" />);
      expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
    });

    it('renders with default value', () => {
      render(<FormField name="name" defaultValue="John Doe" />);
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    });
  });

  describe('Input types', () => {
    it('renders text input by default', () => {
      render(<FormField name="text" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text');
    });

    it('renders email input correctly', () => {
      render(<FormField name="email" type="email" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
    });

    it('renders password input correctly', () => {
      render(<FormField name="password" type="password" />);
      const input = screen.getByLabelText('', { selector: 'input' });
      expect(input).toHaveAttribute('type', 'password');
    });

    it('renders number input correctly', () => {
      render(<FormField name="age" type="number" />);
      expect(screen.getByRole('spinbutton')).toHaveAttribute('type', 'number');
    });

    it('renders textarea correctly', () => {
      render(<FormField name="description" type="textarea" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('rows');
    });

    it('renders select correctly', () => {
      const options = [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' }
      ];
      render(<FormField name="select" type="select" options={options} />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
    });

    it('renders checkbox correctly', () => {
      render(<FormField name="agree" type="checkbox" label="I agree" />);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
      expect(screen.getByLabelText('I agree')).toBeInTheDocument();
    });

    it('renders radio group correctly', () => {
      const options = [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' }
      ];
      render(<FormField name="choice" type="radio" options={options} />);
      expect(screen.getByRole('radio', { name: 'Yes' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'No' })).toBeInTheDocument();
    });

    it('renders date input correctly', () => {
      render(<FormField name="birthdate" type="date" />);
      const input = screen.getByLabelText('', { selector: 'input' });
      expect(input).toHaveAttribute('type', 'date');
    });
  });

  describe('Sizes', () => {
    it('applies small size correctly', () => {
      render(<FormField name="test" size="sm" />);
      expect(screen.getByRole('textbox')).toHaveClass('text-sm');
    });

    it('applies medium size as default', () => {
      render(<FormField name="test" />);
      expect(screen.getByRole('textbox')).toHaveClass('text-base');
    });

    it('applies large size correctly', () => {
      render(<FormField name="test" size="lg" />);
      expect(screen.getByRole('textbox')).toHaveClass('text-lg');
    });
  });

  describe('Variants', () => {
    it('renders default variant correctly', () => {
      render(<FormField name="test" variant="default" />);
      expect(screen.getByRole('textbox')).toHaveClass('border-gray-300');
    });

    it('renders filled variant correctly', () => {
      render(<FormField name="test" variant="filled" />);
      expect(screen.getByRole('textbox')).toHaveClass('bg-gray-50');
    });

    it('renders flushed variant correctly', () => {
      render(<FormField name="test" variant="flushed" />);
      expect(screen.getByRole('textbox')).toHaveClass('border-0', 'border-b-2');
    });
  });

  describe('Error handling', () => {
    it('displays error message', () => {
      render(<FormField name="test" error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toHaveClass('border-red-500');
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('associates error message with input', () => {
      render(<FormField name="test" error="Error message" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby');
    });

    it('prioritizes error over help text', () => {
      render(
        <FormField
          name="test"
          helpText="Help text"
          error="Error message"
        />
      );
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.queryByText('Help text')).not.toBeInTheDocument();
    });
  });

  describe('Help text', () => {
    it('displays help text', () => {
      render(<FormField name="test" helpText="This is help text" />);
      expect(screen.getByText('This is help text')).toBeInTheDocument();
    });

    it('associates help text with input', () => {
      render(<FormField name="test" helpText="Help text" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby');
    });
  });

  describe('Required field', () => {
    it('shows required indicator', () => {
      render(<FormField name="test" label="Username" required />);
      expect(screen.getByText('*')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toHaveAttribute('required');
    });

    it('does not show required indicator by default', () => {
      render(<FormField name="test" label="Username" />);
      expect(screen.queryByText('*')).not.toBeInTheDocument();
    });
  });

  describe('Disabled state', () => {
    it('applies disabled state correctly', () => {
      render(<FormField name="test" disabled />);
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
      expect(input).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    it('disables select correctly', () => {
      const options = [{ value: 'option1', label: 'Option 1' }];
      render(<FormField name="test" type="select" options={options} disabled />);
      expect(screen.getByRole('combobox')).toBeDisabled();
    });

    it('disables checkbox correctly', () => {
      render(<FormField name="test" type="checkbox" disabled />);
      expect(screen.getByRole('checkbox')).toBeDisabled();
    });
  });

  describe('Read-only state', () => {
    it('applies read-only state correctly', () => {
      render(<FormField name="test" readOnly />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('readonly');
      expect(input).toHaveClass('bg-gray-50');
    });
  });

  describe('Event handling', () => {
    it('handles onChange events for text input', () => {
      const handleChange = vi.fn();
      render(<FormField name="test" onChange={handleChange} />);
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'new value' } });
      
      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ value: 'new value' })
        })
      );
    });

    it('handles onChange events for select', () => {
      const handleChange = vi.fn();
      const options = [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' }
      ];
      render(
        <FormField
          name="test"
          type="select"
          options={options}
          onChange={handleChange}
        />
      );
      
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'option2' } });
      
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('handles onChange events for checkbox', () => {
      const handleChange = vi.fn();
      render(<FormField name="test" type="checkbox" onChange={handleChange} />);
      
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('handles onFocus events', () => {
      const handleFocus = vi.fn();
      render(<FormField name="test" onFocus={handleFocus} />);
      
      fireEvent.focus(screen.getByRole('textbox'));
      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('handles onBlur events', () => {
      const handleBlur = vi.fn();
      render(<FormField name="test" onBlur={handleBlur} />);
      
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      fireEvent.blur(input);
      
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });
  });

  describe('Select options', () => {
    it('renders select with string options', () => {
      const options = ['Option 1', 'Option 2', 'Option 3'];
      render(<FormField name="test" type="select" options={options} />);
      
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
      expect(screen.getByText('Option 3')).toBeInTheDocument();
    });

    it('renders select with object options', () => {
      const options = [
        { value: 'val1', label: 'Label 1' },
        { value: 'val2', label: 'Label 2' }
      ];
      render(<FormField name="test" type="select" options={options} />);
      
      expect(screen.getByText('Label 1')).toBeInTheDocument();
      expect(screen.getByText('Label 2')).toBeInTheDocument();
    });

    it('renders select with placeholder option', () => {
      const options = ['Option 1', 'Option 2'];
      render(
        <FormField
          name="test"
          type="select"
          options={options}
          placeholder="Choose an option"
        />
      );
      
      expect(screen.getByText('Choose an option')).toBeInTheDocument();
    });
  });

  describe('Radio options', () => {
    it('renders radio group with string options', () => {
      const options = ['Yes', 'No', 'Maybe'];
      render(<FormField name="test" type="radio" options={options} />);
      
      expect(screen.getByRole('radio', { name: 'Yes' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'No' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Maybe' })).toBeInTheDocument();
    });

    it('renders radio group with object options', () => {
      const options = [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' }
      ];
      render(<FormField name="test" type="radio" options={options} />);
      
      expect(screen.getByRole('radio', { name: 'Yes' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'No' })).toBeInTheDocument();
    });

    it('handles radio selection', () => {
      const handleChange = vi.fn();
      const options = ['Yes', 'No'];
      render(
        <FormField
          name="test"
          type="radio"
          options={options}
          onChange={handleChange}
        />
      );
      
      fireEvent.click(screen.getByRole('radio', { name: 'Yes' }));
      expect(handleChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('Textarea specific', () => {
    it('renders textarea with custom rows', () => {
      render(<FormField name="test" type="textarea" rows={5} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('rows', '5');
    });

    it('renders textarea with default rows', () => {
      render(<FormField name="test" type="textarea" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('rows', '3');
    });
  });

  describe('Accessibility', () => {
    it('associates label with input correctly', () => {
      render(<FormField name="username" label="Username" />);
      const input = screen.getByRole('textbox');
      const label = screen.getByText('Username');
      
      expect(input).toHaveAttribute('id');
      expect(label).toHaveAttribute('for', input.getAttribute('id'));
    });

    it('generates unique IDs for multiple fields', () => {
      render(
        <div>
          <FormField name="field1" label="Field 1" />
          <FormField name="field2" label="Field 2" />
        </div>
      );
      
      const input1 = screen.getByLabelText('Field 1');
      const input2 = screen.getByLabelText('Field 2');
      
      expect(input1.getAttribute('id')).not.toBe(input2.getAttribute('id'));
    });

    it('supports custom aria attributes', () => {
      render(
        <FormField
          name="test"
          aria-label="Custom label"
          aria-required="true"
        />
      );
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveAttribute('aria-label', 'Custom label');
      expect(input).toHaveAttribute('aria-required', 'true');
    });
  });

  describe('Custom classes and styling', () => {
    it('applies custom className to wrapper', () => {
      render(<FormField name="test" className="custom-field" />);
      // The className should be applied to the wrapper div
      expect(document.querySelector('.custom-field')).toBeInTheDocument();
    });

    it('applies custom inputClassName to input', () => {
      render(<FormField name="test" inputClassName="custom-input" />);
      expect(screen.getByRole('textbox')).toHaveClass('custom-input');
    });
  });

  describe('Form integration', () => {
    it('supports name attribute', () => {
      render(<FormField name="username" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('name', 'username');
    });

    it('supports form attribute', () => {
      render(<FormField name="test" form="my-form" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('form', 'my-form');
    });

    it('supports autoComplete attribute', () => {
      render(<FormField name="email" autoComplete="email" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('autocomplete', 'email');
    });
  });

  describe('Edge cases', () => {
    it('handles empty options array for select', () => {
      render(<FormField name="test" type="select" options={[]} />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('handles undefined options for select', () => {
      render(<FormField name="test" type="select" />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('handles very long error messages', () => {
      const longError = 'This is a very long error message that should wrap properly and not break the layout of the form field component';
      render(<FormField name="test" error={longError} />);
      expect(screen.getByText(longError)).toBeInTheDocument();
    });

    it('handles special characters in values', () => {
      const specialValue = 'Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';
      render(<FormField name="test" value={specialValue} onChange={() => {}} />);
      expect(screen.getByDisplayValue(specialValue)).toBeInTheDocument();
    });

    it('combines multiple props correctly', () => {
      const handleChange = vi.fn();
      render(
        <FormField
          name="complex"
          label="Complex Field"
          type="email"
          size="lg"
          variant="filled"
          required
          error="Error message"
          helpText="Help text"
          placeholder="Enter email"
          disabled
          className="custom-field"
          inputClassName="custom-input"
          onChange={handleChange}
        />
      );
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('bg-gray-50', 'text-lg', 'border-red-500', 'custom-input');
      expect(input).toHaveAttribute('type', 'email');
      expect(input).toHaveAttribute('required');
      expect(input).toBeDisabled();
      expect(screen.getByText('Complex Field')).toBeInTheDocument();
      expect(screen.getByText('*')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.queryByText('Help text')).not.toBeInTheDocument(); // Hidden by error
    });
  });

  describe('Controlled vs Uncontrolled', () => {
    it('works as uncontrolled component with defaultValue', () => {
      render(<FormField name="test" defaultValue="Initial value" />);
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveValue('Initial value');
      
      fireEvent.change(input, { target: { value: 'New value' } });
      expect(input).toHaveValue('New value');
    });

    it('works as controlled component with value and onChange', () => {
      const TestComponent = () => {
        const [value, setValue] = React.useState('Controlled value');
        return (
          <FormField
            name="test"
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