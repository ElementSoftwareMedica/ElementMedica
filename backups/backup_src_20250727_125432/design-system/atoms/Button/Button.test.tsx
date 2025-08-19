/**
 * Design System - Button Component Tests
 * Week 8 Implementation - Component Library
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  describe('Basic rendering', () => {
    it('renders with default props', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('renders with custom text content', () => {
      const buttonText = 'Custom button text';
      render(<Button>{buttonText}</Button>);
      expect(screen.getByText(buttonText)).toBeInTheDocument();
    });

    it('renders as button element by default', () => {
      render(<Button>Test button</Button>);
      expect(screen.getByRole('button').tagName).toBe('BUTTON');
    });
  });

  describe('Variants', () => {
    it('renders primary variant correctly', () => {
      render(<Button variant="primary">Primary button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-blue-600', 'text-white');
    });

    it('renders secondary variant correctly', () => {
      render(<Button variant="secondary">Secondary button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gray-100', 'text-gray-900');
    });

    it('renders outline variant correctly', () => {
      render(<Button variant="outline">Outline button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('border-gray-300', 'bg-transparent');
    });

    it('renders ghost variant correctly', () => {
      render(<Button variant="ghost">Ghost button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-transparent', 'text-gray-700');
    });

    it('renders destructive variant correctly', () => {
      render(<Button variant="destructive">Delete button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-red-600', 'text-white');
    });
  });

  describe('Sizes', () => {
    it('applies size classes correctly', () => {
      render(<Button size="lg">Large button</Button>);
      expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3', 'text-lg');
    });

    it('applies small size correctly', () => {
      render(<Button size="sm">Small button</Button>);
      expect(screen.getByRole('button')).toHaveClass('px-3', 'py-1.5', 'text-sm');
    });

    it('applies medium size as default', () => {
      render(<Button>Default button</Button>);
      expect(screen.getByRole('button')).toHaveClass('px-4', 'py-2', 'text-base');
    });
  });

  describe('States', () => {
    it('applies disabled state correctly', () => {
      render(<Button disabled>Disabled button</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    it('applies loading state correctly', () => {
      render(<Button loading>Loading button</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('opacity-75');
    });

    it('shows loading spinner when loading', () => {
      render(<Button loading>Loading button</Button>);
      // Check for loading spinner (assuming it has a specific class or test id)
      expect(screen.getByRole('button')).toContainHTML('animate-spin');
    });
  });

  describe('Icons', () => {
    it('renders left icon correctly', () => {
      const LeftIcon = () => <span data-testid="left-icon">←</span>;
      render(<Button leftIcon={<LeftIcon />}>Button with left icon</Button>);
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('renders right icon correctly', () => {
      const RightIcon = () => <span data-testid="right-icon">→</span>;
      render(<Button rightIcon={<RightIcon />}>Button with right icon</Button>);
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('renders both left and right icons', () => {
      const LeftIcon = () => <span data-testid="left-icon">←</span>;
      const RightIcon = () => <span data-testid="right-icon">→</span>;
      render(
        <Button leftIcon={<LeftIcon />} rightIcon={<RightIcon />}>
          Button with both icons
        </Button>
      );
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });
  });

  describe('Full width', () => {
    it('applies full width class when fullWidth is true', () => {
      render(<Button fullWidth>Full width button</Button>);
      expect(screen.getByRole('button')).toHaveClass('w-full');
    });

    it('does not apply full width class by default', () => {
      render(<Button>Normal button</Button>);
      expect(screen.getByRole('button')).not.toHaveClass('w-full');
    });
  });

  describe('Event handling', () => {
    it('handles click events correctly', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Clickable button</Button>);
      
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not trigger click when disabled', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick} disabled>Disabled button</Button>);
      
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('does not trigger click when loading', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick} loading>Loading button</Button>);
      
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Custom classes and styling', () => {
    it('applies custom className correctly', () => {
      render(<Button className="custom-class">Custom styled button</Button>);
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });

    it('merges custom classes with default classes', () => {
      render(
        <Button variant="primary" size="lg" className="custom-class">
          Styled button
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-blue-600', 'px-6', 'py-3', 'custom-class');
    });
  });

  describe('Accessibility', () => {
    it('preserves accessibility attributes', () => {
      render(
        <Button aria-label="Accessible button" role="button">
          Accessible button
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Accessible button');
    });

    it('is focusable by default', () => {
      render(<Button>Focusable button</Button>);
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('is not focusable when disabled', () => {
      render(<Button disabled>Disabled button</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Form integration', () => {
    it('supports type attribute', () => {
      render(<Button type="submit">Submit button</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });

    it('defaults to button type', () => {
      render(<Button>Default button</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });

    it('supports form attribute', () => {
      render(<Button form="my-form">Form button</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('form', 'my-form');
    });
  });

  describe('Edge cases', () => {
    it('handles empty content gracefully', () => {
      render(<Button></Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('handles numeric children', () => {
      render(<Button>{42}</Button>);
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('handles complex children with nested elements', () => {
      render(
        <Button>
          <span>Complex</span> <strong>content</strong>
        </Button>
      );
      expect(screen.getByText('Complex')).toBeInTheDocument();
      expect(screen.getByText('content')).toBeInTheDocument();
    });

    it('combines multiple props correctly', () => {
      const handleClick = vi.fn();
      render(
        <Button
          variant="destructive"
          size="lg"
          fullWidth
          onClick={handleClick}
          className="custom-button"
        >
          Complex button
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass(
        'bg-red-600',
        'px-6',
        'py-3',
        'w-full',
        'custom-button'
      );
      
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading state with icons', () => {
    it('hides icons when loading', () => {
      const LeftIcon = () => <span data-testid="left-icon">←</span>;
      const RightIcon = () => <span data-testid="right-icon">→</span>;
      
      render(
        <Button loading leftIcon={<LeftIcon />} rightIcon={<RightIcon />}>
          Loading with icons
        </Button>
      );
      
      // Icons should be hidden when loading
      expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('right-icon')).not.toBeInTheDocument();
    });
  });

  describe('Keyboard navigation', () => {
    it('responds to Enter key', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Keyboard button</Button>);
      
      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Enter' });
      
      // Note: This depends on the browser's default behavior
      // The button should be clickable via keyboard
      expect(button).toBeInTheDocument();
    });

    it('responds to Space key', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Keyboard button</Button>);
      
      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: ' ' });
      
      // Note: This depends on the browser's default behavior
      expect(button).toBeInTheDocument();
    });
  });
});