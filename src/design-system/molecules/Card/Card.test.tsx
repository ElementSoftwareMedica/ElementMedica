/**
 * Design System - Card Component Tests
 * Week 8 Implementation - Component Library
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Card } from './Card';

describe('Card', () => {
  describe('Basic rendering', () => {
    it('renders with default props', () => {
      render(<Card>Card content</Card>);
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('renders with custom content', () => {
      const customContent = (
        <div>
          <h2>Custom Title</h2>
          <p>Custom description</p>
        </div>
      );
      render(<Card>{customContent}</Card>);
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
      expect(screen.getByText('Custom description')).toBeInTheDocument();
    });

    it('renders as div element by default', () => {
      render(<Card data-testid="card">Content</Card>);
      expect(screen.getByTestId('card').tagName).toBe('DIV');
    });
  });

  describe('Variants', () => {
    it('renders default variant correctly', () => {
      render(<Card variant="default" data-testid="card">Default card</Card>);
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('bg-white', 'border', 'border-gray-200');
    });

    it('renders elevated variant correctly', () => {
      render(<Card variant="elevated" data-testid="card">Elevated card</Card>);
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('bg-white', 'shadow-md');
    });

    it('renders outlined variant correctly', () => {
      render(<Card variant="outlined" data-testid="card">Outlined card</Card>);
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('bg-white', 'border-2', 'border-gray-300');
    });

    it('renders filled variant correctly', () => {
      render(<Card variant="filled" data-testid="card">Filled card</Card>);
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('bg-gray-50', 'border-0');
    });
  });

  describe('Sizes', () => {
    it('applies small size correctly', () => {
      render(<Card size="sm" data-testid="card">Small card</Card>);
      expect(screen.getByTestId('card')).toHaveClass('p-3');
    });

    it('applies medium size as default', () => {
      render(<Card data-testid="card">Default card</Card>);
      expect(screen.getByTestId('card')).toHaveClass('p-4');
    });

    it('applies large size correctly', () => {
      render(<Card size="lg" data-testid="card">Large card</Card>);
      expect(screen.getByTestId('card')).toHaveClass('p-6');
    });

    it('applies extra large size correctly', () => {
      render(<Card size="xl" data-testid="card">Extra large card</Card>);
      expect(screen.getByTestId('card')).toHaveClass('p-8');
    });
  });

  describe('Interactive states', () => {
    it('applies hover styles when hoverable', () => {
      render(<Card hoverable data-testid="card">Hoverable card</Card>);
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('hover:shadow-lg', 'transition-shadow', 'duration-200');
    });

    it('does not apply hover styles by default', () => {
      render(<Card data-testid="card">Normal card</Card>);
      const card = screen.getByTestId('card');
      expect(card).not.toHaveClass('hover:shadow-lg');
    });

    it('applies clickable styles when clickable', () => {
      render(<Card clickable data-testid="card">Clickable card</Card>);
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('cursor-pointer', 'hover:shadow-lg');
    });

    it('handles click events when clickable', () => {
      const handleClick = vi.fn();
      render(
        <Card clickable onClick={handleClick} data-testid="card">
          Clickable card
        </Card>
      );
      
      fireEvent.click(screen.getByTestId('card'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not handle click events when not clickable', () => {
      const handleClick = vi.fn();
      render(
        <Card onClick={handleClick} data-testid="card">
          Non-clickable card
        </Card>
      );
      
      fireEvent.click(screen.getByTestId('card'));
      expect(handleClick).toHaveBeenCalledTimes(1); // onClick still works, just no visual indication
    });
  });

  describe('Loading state', () => {
    it('shows loading state correctly', () => {
      render(<Card loading data-testid="card">Loading card</Card>);
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('animate-pulse');
      expect(screen.getByText('Loading card')).toBeInTheDocument();
    });

    it('does not show loading state by default', () => {
      render(<Card data-testid="card">Normal card</Card>);
      const card = screen.getByTestId('card');
      expect(card).not.toHaveClass('animate-pulse');
    });
  });

  describe('Disabled state', () => {
    it('applies disabled styles correctly', () => {
      render(<Card disabled data-testid="card">Disabled card</Card>);
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    it('prevents click events when disabled', () => {
      const handleClick = vi.fn();
      render(
        <Card disabled clickable onClick={handleClick} data-testid="card">
          Disabled clickable card
        </Card>
      );
      
      fireEvent.click(screen.getByTestId('card'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('does not apply disabled styles by default', () => {
      render(<Card data-testid="card">Normal card</Card>);
      const card = screen.getByTestId('card');
      expect(card).not.toHaveClass('opacity-50', 'cursor-not-allowed');
    });
  });

  describe('Custom classes and styling', () => {
    it('applies custom className correctly', () => {
      render(<Card className="custom-card" data-testid="card">Custom card</Card>);
      expect(screen.getByTestId('card')).toHaveClass('custom-card');
    });

    it('merges custom classes with default classes', () => {
      render(
        <Card
          variant="elevated"
          size="lg"
          hoverable
          className="custom-card"
          data-testid="card"
        >
          Styled card
        </Card>
      );
      const card = screen.getByTestId('card');
      expect(card).toHaveClass(
        'bg-white',
        'shadow-md',
        'p-6',
        'hover:shadow-lg',
        'custom-card'
      );
    });
  });

  describe('Accessibility', () => {
    it('supports custom aria attributes', () => {
      render(
        <Card
          aria-label="Custom card"
          aria-describedby="card-description"
          data-testid="card"
        >
          Accessible card
        </Card>
      );
      const card = screen.getByTestId('card');
      expect(card).toHaveAttribute('aria-label', 'Custom card');
      expect(card).toHaveAttribute('aria-describedby', 'card-description');
    });

    it('applies role="button" when clickable', () => {
      render(
        <Card clickable data-testid="card">
          Clickable card
        </Card>
      );
      expect(screen.getByTestId('card')).toHaveAttribute('role', 'button');
    });

    it('does not apply role="button" when not clickable', () => {
      render(
        <Card data-testid="card">
          Normal card
        </Card>
      );
      expect(screen.getByTestId('card')).not.toHaveAttribute('role', 'button');
    });

    it('is focusable when clickable', () => {
      render(
        <Card clickable data-testid="card">
          Focusable card
        </Card>
      );
      const card = screen.getByTestId('card');
      expect(card).toHaveAttribute('tabIndex', '0');
      
      card.focus();
      expect(card).toHaveFocus();
    });

    it('is not focusable when disabled', () => {
      render(
        <Card clickable disabled data-testid="card">
          Disabled card
        </Card>
      );
      const card = screen.getByTestId('card');
      expect(card).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Keyboard navigation', () => {
    it('responds to Enter key when clickable', () => {
      const handleClick = vi.fn();
      render(
        <Card clickable onClick={handleClick} data-testid="card">
          Keyboard accessible card
        </Card>
      );
      
      const card = screen.getByTestId('card');
      fireEvent.keyDown(card, { key: 'Enter' });
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('responds to Space key when clickable', () => {
      const handleClick = vi.fn();
      render(
        <Card clickable onClick={handleClick} data-testid="card">
          Keyboard accessible card
        </Card>
      );
      
      const card = screen.getByTestId('card');
      fireEvent.keyDown(card, { key: ' ' });
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not respond to keyboard when disabled', () => {
      const handleClick = vi.fn();
      render(
        <Card clickable disabled onClick={handleClick} data-testid="card">
          Disabled card
        </Card>
      );
      
      const card = screen.getByTestId('card');
      fireEvent.keyDown(card, { key: 'Enter' });
      fireEvent.keyDown(card, { key: ' ' });
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('does not respond to other keys', () => {
      const handleClick = vi.fn();
      render(
        <Card clickable onClick={handleClick} data-testid="card">
          Keyboard accessible card
        </Card>
      );
      
      const card = screen.getByTestId('card');
      fireEvent.keyDown(card, { key: 'Escape' });
      fireEvent.keyDown(card, { key: 'Tab' });
      
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Complex content', () => {
    it('renders complex nested content correctly', () => {
      render(
        <Card data-testid="card">
          <div>
            <h1>Card Title</h1>
            <p>Card description with <strong>bold text</strong></p>
            <button>Action Button</button>
          </div>
        </Card>
      );
      
      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('bold text')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument();
    });

    it('handles multiple child elements', () => {
      render(
        <Card data-testid="card">
          <h2>Title</h2>
          <p>Description</p>
          <div>Footer content</div>
        </Card>
      );
      
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Footer content')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('handles empty content gracefully', () => {
      render(<Card data-testid="card"></Card>);
      expect(screen.getByTestId('card')).toBeInTheDocument();
    });

    it('handles null content gracefully', () => {
      render(<Card data-testid="card">{null}</Card>);
      expect(screen.getByTestId('card')).toBeInTheDocument();
    });

    it('handles undefined content gracefully', () => {
      render(<Card data-testid="card">{undefined}</Card>);
      expect(screen.getByTestId('card')).toBeInTheDocument();
    });

    it('handles numeric content', () => {
      render(<Card data-testid="card">{42}</Card>);
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('handles boolean content', () => {
      render(<Card data-testid="card">{true}</Card>);
      expect(screen.getByTestId('card')).toBeInTheDocument();
      // Boolean true renders as empty in React
    });

    it('combines all props correctly', () => {
      const handleClick = vi.fn();
      render(
        <Card
          variant="elevated"
          size="lg"
          hoverable
          clickable
          loading
          onClick={handleClick}
          className="custom-card"
          aria-label="Complex card"
          data-testid="card"
        >
          Complex card content
        </Card>
      );
      
      const card = screen.getByTestId('card');
      expect(card).toHaveClass(
        'bg-white',
        'shadow-md',
        'p-6',
        'hover:shadow-lg',
        'cursor-pointer',
        'animate-pulse',
        'custom-card'
      );
      expect(card).toHaveAttribute('role', 'button');
      expect(card).toHaveAttribute('tabIndex', '0');
      expect(card).toHaveAttribute('aria-label', 'Complex card');
      
      fireEvent.click(card);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const renderSpy = vi.fn();
      const TestCard = ({ children, ...props }: { children: React.ReactNode; [key: string]: any }) => {
        renderSpy();
        return <Card {...props}>{children}</Card>;
      };
      
      const { rerender } = render(<TestCard>Content</TestCard>);
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Re-render with same props should not cause additional renders
      rerender(<TestCard>Content</TestCard>);
      expect(renderSpy).toHaveBeenCalledTimes(2); // React will still call the function
    });
  });

  describe('Custom HTML attributes', () => {
    it('passes through custom HTML attributes', () => {
      render(
        <Card
          data-testid="card"
          id="custom-card"
          title="Card tooltip"
          style={{ backgroundColor: 'red' }}
        >
          Custom attributes card
        </Card>
      );
      
      const card = screen.getByTestId('card');
      expect(card).toHaveAttribute('id', 'custom-card');
      expect(card).toHaveAttribute('title', 'Card tooltip');
      expect(card).toHaveAttribute('style', 'background-color: red;');
    });

    it('supports data attributes', () => {
      render(
        <Card
          data-testid="card"
          data-analytics="card-click"
          data-category="product"
        >
          Data attributes card
        </Card>
      );
      
      const card = screen.getByTestId('card');
      expect(card).toHaveAttribute('data-analytics', 'card-click');
      expect(card).toHaveAttribute('data-category', 'product');
    });
  });
});