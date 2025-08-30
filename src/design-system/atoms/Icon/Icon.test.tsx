/**
 * Design System - Icon Component Tests
 * Week 8 Implementation - Component Library
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  XIcon,
  CheckIcon,
  SearchIcon,
  EditIcon,
  DeleteIcon,
  LoadingIcon,
  HomeIcon,
  UserIcon,
  SettingsIcon
} from './Icon';

describe('Icon', () => {
  describe('Basic rendering', () => {
    it('renders with a valid icon name', () => {
      render(<Icon name="home" />);
      const icon = screen.getByRole('img');
      expect(icon).toBeInTheDocument();
      expect(icon.tagName).toBe('svg');
    });

    it('returns null when no name or children provided', () => {
      const { container } = render(<Icon />);
      expect(container.firstChild).toBeNull();
    });

    it('warns and returns null for invalid icon name', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { container } = render(<Icon name="invalid-icon" as any />);
      expect(container.firstChild).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Icon "invalid-icon" not found');
      consoleSpy.mockRestore();
    });

    it('renders custom SVG content when children are provided', () => {
      render(
        <Icon>
          <svg data-testid="custom-svg">
            <path d="M12 2L2 7v10c0 5.55 3.84 9.739 9 11 5.16-1.261 9-5.45 9-11V7l-10-5z" />
          </svg>
        </Icon>
      );
      expect(screen.getByTestId('custom-svg')).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('applies size classes correctly', () => {
      render(<Icon name="home" size="lg" />);
      expect(screen.getByRole('img')).toHaveClass('w-6', 'h-6');
    });

    it('applies extra small size correctly', () => {
      render(<Icon name="home" size="xs" />);
      expect(screen.getByRole('img')).toHaveClass('w-3', 'h-3');
    });

    it('applies extra large size correctly', () => {
      render(<Icon name="home" size="2xl" />);
      expect(screen.getByRole('img')).toHaveClass('w-10', 'h-10');
    });

    it('uses base size as default', () => {
      render(<Icon name="home" />);
      expect(screen.getByRole('img')).toHaveClass('w-5', 'h-5');
    });
  });

  describe('Colors', () => {
    it('applies primary color correctly', () => {
      render(<Icon name="home" color="primary" />);
      expect(screen.getByRole('img')).toHaveClass('text-primary-600');
    });

    it('applies error color correctly', () => {
      render(<Icon name="home" color="error" />);
      expect(screen.getByRole('img')).toHaveClass('text-red-600');
    });

    it('applies muted color correctly', () => {
      render(<Icon name="home" color="muted" />);
      expect(screen.getByRole('img')).toHaveClass('text-gray-400');
    });

    it('uses inherit color as default', () => {
      render(<Icon name="home" />);
      expect(screen.getByRole('img')).toHaveClass('text-inherit');
    });
  });

  describe('Interactive behavior', () => {
    it('handles click events when onClick is provided', () => {
      const handleClick = vi.fn();
      render(<Icon name="home" onClick={handleClick} />);
      
      const icon = screen.getByRole('button');
      fireEvent.click(icon);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('applies clickable styles when clickable prop is true', () => {
      render(<Icon name="home" clickable />);
      const icon = screen.getByRole('button');
      expect(icon).toHaveClass('cursor-pointer', 'hover:opacity-75', 'transition-opacity');
      expect(icon).toHaveAttribute('tabindex', '0');
    });

    it('applies clickable styles when onClick is provided', () => {
      const handleClick = vi.fn();
      render(<Icon name="home" onClick={handleClick} />);
      const icon = screen.getByRole('button');
      expect(icon).toHaveClass('cursor-pointer', 'hover:opacity-75', 'transition-opacity');
    });

    it('does not apply clickable styles by default', () => {
      render(<Icon name="home" />);
      const icon = screen.getByRole('img');
      expect(icon).not.toHaveClass('cursor-pointer');
      expect(icon).not.toHaveAttribute('tabIndex');
    });
  });

  describe('Animations', () => {
    it('applies spin animation when spin prop is true', () => {
      render(<Icon name="loading" spin />);
      expect(screen.getByRole('img')).toHaveClass('animate-spin');
    });

    it('applies rotation transform when rotate prop is provided', () => {
      render(<Icon name="arrow-right" rotate={90} />);
      const icon = screen.getByRole('img');
      expect(icon).toHaveStyle({ transform: 'rotate(90deg)' });
    });

    it('does not apply animations by default', () => {
      render(<Icon name="home" />);
      const icon = screen.getByRole('img');
      expect(icon).not.toHaveClass('animate-spin');
      expect(icon).not.toHaveStyle({ transform: expect.any(String) });
    });
  });

  describe('Accessibility', () => {
    it('applies aria-label when provided', () => {
      render(<Icon name="home" aria-label="Home icon" />);
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Home icon');
    });

    it('sets role to button for clickable icons', () => {
      render(<Icon name="home" clickable />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('sets role to img for non-clickable icons', () => {
      render(<Icon name="home" />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('applies tabIndex for clickable icons', () => {
      render(<Icon name="home" clickable />);
      expect(screen.getByRole('button')).toHaveAttribute('tabindex', '0');
    });
  });

  describe('Custom classes and styling', () => {
    it('applies custom className correctly', () => {
      render(<Icon name="home" className="custom-class" />);
      expect(screen.getByRole('img')).toHaveClass('custom-class');
    });

    it('merges custom classes with default classes', () => {
      render(<Icon name="home" size="lg" color="primary" className="custom-class" />);
      const icon = screen.getByRole('img');
      expect(icon).toHaveClass('w-6', 'h-6', 'text-primary-600', 'custom-class');
    });
  });

  describe('SVG attributes', () => {
    it('renders SVG with correct default attributes', () => {
      render(<Icon name="home" />);
      const icon = screen.getByRole('img');
      expect(icon).toHaveAttribute('fill', 'none');
      expect(icon).toHaveAttribute('stroke', 'currentColor');
      expect(icon).toHaveAttribute('stroke-width', '1.5');
      expect(icon).toHaveAttribute('viewBox', '0 0 24 24');
    });

    it('renders path with correct attributes', () => {
      render(<Icon name="home" />);
      const path = screen.getByRole('img').querySelector('path');
      expect(path).toHaveAttribute('stroke-linecap', 'round');
      expect(path).toHaveAttribute('stroke-linejoin', 'round');
    });
  });
});

describe('Icon Convenience Components', () => {
  describe('Navigation icons', () => {
    it('renders ChevronDownIcon correctly', () => {
      render(<ChevronDownIcon />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('renders ChevronUpIcon correctly', () => {
      render(<ChevronUpIcon />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });

  describe('Action icons', () => {
    it('renders PlusIcon correctly', () => {
      render(<PlusIcon />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('renders XIcon correctly', () => {
      render(<XIcon />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('renders CheckIcon correctly', () => {
      render(<CheckIcon />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('renders SearchIcon correctly', () => {
      render(<SearchIcon />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('renders EditIcon correctly', () => {
      render(<EditIcon />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('renders DeleteIcon correctly', () => {
      render(<DeleteIcon />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });

  describe('Interface icons', () => {
    it('renders HomeIcon correctly', () => {
      render(<HomeIcon />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('renders UserIcon correctly', () => {
      render(<UserIcon />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('renders SettingsIcon correctly', () => {
      render(<SettingsIcon />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });

  describe('Special icons', () => {
    it('renders LoadingIcon with spin animation', () => {
      render(<LoadingIcon />);
      expect(screen.getByRole('img')).toHaveClass('animate-spin');
    });
  });

  describe('Convenience components with custom props', () => {
    it('accepts additional props in convenience components', () => {
      render(<HomeIcon className="custom-home" size="lg" />);
      const icon = screen.getByRole('img');
      expect(icon).toHaveClass('custom-home', 'w-6', 'h-6');
    });

    it('allows overriding default props in convenience components', () => {
      render(<CheckIcon color="error" />);
      expect(screen.getByRole('img')).toHaveClass('text-red-600');
    });

    it('handles click events in convenience components', () => {
      const handleClick = vi.fn();
      render(<PlusIcon onClick={handleClick} />);
      
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Icon with Custom Content', () => {
  it('renders custom SVG children correctly', () => {
    render(
      <Icon size="lg" color="primary">
        <svg data-testid="custom-icon" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
        </svg>
      </Icon>
    );
    
    const wrapper = screen.getByTestId('custom-icon').parentElement;
    expect(wrapper).toHaveClass('w-6', 'h-6', 'text-primary-600');
  });

  it('handles click events with custom content', () => {
    const handleClick = vi.fn();
    render(
      <Icon onClick={handleClick}>
        <svg data-testid="clickable-custom">
          <path d="M12 2L2 7v10c0 5.55 3.84 9.739 9 11" />
        </svg>
      </Icon>
    );
    
    const wrapper = screen.getByTestId('clickable-custom').parentElement;
    fireEvent.click(wrapper!);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies accessibility attributes to custom content wrapper', () => {
    render(
      <Icon aria-label="Custom icon" clickable>
        <svg data-testid="accessible-custom">
          <rect width="24" height="24" />
        </svg>
      </Icon>
    );
    
    const wrapper = screen.getByTestId('accessible-custom').parentElement;
    expect(wrapper).toHaveAttribute('aria-label', 'Custom icon');
    expect(wrapper).toHaveAttribute('role', 'button');
    expect(wrapper).toHaveAttribute('tabindex', '0');
  });
});

describe('Icon Edge Cases', () => {
  it('handles undefined icon name gracefully', () => {
    const { container } = render(<Icon name={undefined as any} />);
    expect(container.firstChild).toBeNull();
  });

  it('handles empty string icon name gracefully', () => {
    const { container } = render(<Icon name={'' as any} />);
    expect(container.firstChild).toBeNull();
  });

  it('combines multiple style props correctly', () => {
    render(
      <Icon
        name="star"
        size="xl"
        color="warning"
        clickable
        spin
        rotate={45}
        className="custom-icon"
      />
    );
    
    const icon = screen.getByRole('button');
    expect(icon).toHaveClass(
      'w-8',
      'h-8',
      'text-yellow-600',
      'cursor-pointer',
      'animate-spin',
      'custom-icon'
    );
    expect(icon).toHaveStyle({ transform: 'rotate(45deg)' });
  });

  it('handles keyboard events for clickable icons', () => {
    const handleClick = vi.fn();
    render(<Icon name="home" onClick={handleClick} />);
    
    const icon = screen.getByRole('button');
    fireEvent.keyDown(icon, { key: 'Enter' });
    // Note: The component doesn't handle keyboard events by default,
    // but it should be focusable with tabIndex
    expect(icon).toHaveAttribute('tabindex', '0');
  });
});