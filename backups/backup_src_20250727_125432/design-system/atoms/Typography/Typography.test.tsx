/**
 * Design System - Typography Component Tests
 * Week 8 Implementation - Component Library
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  Typography,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Subtitle1,
  Subtitle2,
  Body1,
  Body2,
  Caption,
  Overline
} from './Typography';

describe('Typography', () => {
  describe('Basic rendering', () => {
    it('renders with default props', () => {
      render(<Typography>Test content</Typography>);
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('renders with custom text content', () => {
      const testText = 'Custom typography text';
      render(<Typography>{testText}</Typography>);
      expect(screen.getByText(testText)).toBeInTheDocument();
    });

    it('renders as default element (p) when no variant is specified', () => {
      render(<Typography>Test content</Typography>);
      expect(screen.getByText('Test content').tagName).toBe('P');
    });
  });

  describe('Variants', () => {
    it('renders h1 variant correctly', () => {
      render(<Typography variant="h1">Heading 1</Typography>);
      const element = screen.getByText('Heading 1');
      expect(element.tagName).toBe('H1');
      expect(element).toHaveClass('text-4xl', 'font-bold');
    });

    it('renders h2 variant correctly', () => {
      render(<Typography variant="h2">Heading 2</Typography>);
      const element = screen.getByText('Heading 2');
      expect(element.tagName).toBe('H2');
      expect(element).toHaveClass('text-3xl', 'font-bold');
    });

    it('renders body1 variant correctly', () => {
      render(<Typography variant="body1">Body text</Typography>);
      const element = screen.getByText('Body text');
      expect(element.tagName).toBe('P');
      expect(element).toHaveClass('text-base');
    });

    it('renders caption variant correctly', () => {
      render(<Typography variant="caption">Caption text</Typography>);
      const element = screen.getByText('Caption text');
      expect(element.tagName).toBe('P');
      expect(element).toHaveClass('text-xs');
    });
  });

  describe('Sizes', () => {
    it('applies size classes correctly', () => {
      render(<Typography size="lg">Large text</Typography>);
      expect(screen.getByText('Large text')).toHaveClass('text-lg');
    });

    it('applies extra large size correctly', () => {
      render(<Typography size="2xl">Extra large text</Typography>);
      expect(screen.getByText('Extra large text')).toHaveClass('text-2xl');
    });
  });

  describe('Weights', () => {
    it('applies font weight classes correctly', () => {
      render(<Typography weight="bold">Bold text</Typography>);
      expect(screen.getByText('Bold text')).toHaveClass('font-bold');
    });

    it('applies light weight correctly', () => {
      render(<Typography weight="light">Light text</Typography>);
      expect(screen.getByText('Light text')).toHaveClass('font-light');
    });
  });

  describe('Colors', () => {
    it('applies primary color correctly', () => {
      render(<Typography color="primary">Primary text</Typography>);
      expect(screen.getByText('Primary text')).toHaveClass('text-gray-900');
    });

    it('applies error color correctly', () => {
      render(<Typography color="error">Error text</Typography>);
      expect(screen.getByText('Error text')).toHaveClass('text-red-600');
    });

    it('applies muted color correctly', () => {
      render(<Typography color="muted">Muted text</Typography>);
      expect(screen.getByText('Muted text')).toHaveClass('text-gray-500');
    });
  });

  describe('Alignment', () => {
    it('applies text alignment correctly', () => {
      render(<Typography align="center">Centered text</Typography>);
      expect(screen.getByText('Centered text')).toHaveClass('text-center');
    });

    it('applies right alignment correctly', () => {
      render(<Typography align="right">Right aligned text</Typography>);
      expect(screen.getByText('Right aligned text')).toHaveClass('text-right');
    });
  });

  describe('Truncation', () => {
    it('applies truncation classes when truncate is true', () => {
      render(<Typography truncate>Long text that should be truncated</Typography>);
      expect(screen.getByText('Long text that should be truncated')).toHaveClass(
        'truncate'
      );
    });

    it('applies line clamp classes correctly', () => {
      render(<Typography lineClamp={3}>Multi-line text content</Typography>);
      const element = screen.getByText('Multi-line text content');
      expect(element).toHaveClass('line-clamp-3');
    });
  });

  describe('Custom HTML elements', () => {
    it('renders as custom element when "as" prop is provided', () => {
      render(<Typography as="span">Span text</Typography>);
      expect(screen.getByText('Span text').tagName).toBe('SPAN');
    });

    it('renders h2 styling as h1 element', () => {
      render(<Typography variant="h2" as="h1">Custom heading</Typography>);
      const element = screen.getByText('Custom heading');
      expect(element.tagName).toBe('H1');
      expect(element).toHaveClass('text-3xl', 'font-bold');
    });
  });

  describe('Custom classes', () => {
    it('applies custom className correctly', () => {
      render(<Typography className="custom-class">Custom styled text</Typography>);
      expect(screen.getByText('Custom styled text')).toHaveClass('custom-class');
    });

    it('merges custom classes with default classes', () => {
      render(
        <Typography variant="h1" className="custom-class">
          Heading with custom class
        </Typography>
      );
      const element = screen.getByText('Heading with custom class');
      expect(element).toHaveClass('text-4xl', 'font-bold', 'custom-class');
    });
  });

  describe('Accessibility', () => {
    it('preserves accessibility attributes', () => {
      render(
        <Typography aria-label="Accessible text" role="heading">
          Accessible content
        </Typography>
      );
      const element = screen.getByText('Accessible content');
      expect(element).toHaveAttribute('aria-label', 'Accessible text');
      expect(element).toHaveAttribute('role', 'heading');
    });
  });
});

describe('Typography Convenience Components', () => {
  describe('Heading components', () => {
    it('renders Heading1 correctly', () => {
      render(<Heading1>Main heading</Heading1>);
      const element = screen.getByText('Main heading');
      expect(element.tagName).toBe('H1');
      expect(element).toHaveClass('text-4xl', 'font-bold');
    });

    it('renders Heading2 correctly', () => {
      render(<Heading2>Section heading</Heading2>);
      const element = screen.getByText('Section heading');
      expect(element.tagName).toBe('H2');
      expect(element).toHaveClass('text-3xl', 'font-bold');
    });

    it('renders Heading3 correctly', () => {
      render(<Heading3>Subsection heading</Heading3>);
      const element = screen.getByText('Subsection heading');
      expect(element.tagName).toBe('H3');
      expect(element).toHaveClass('text-2xl', 'font-semibold');
    });

    it('renders Heading4 correctly', () => {
      render(<Heading4>Component heading</Heading4>);
      const element = screen.getByText('Component heading');
      expect(element.tagName).toBe('H4');
      expect(element).toHaveClass('text-xl', 'font-semibold');
    });

    it('renders Heading5 correctly', () => {
      render(<Heading5>Small heading</Heading5>);
      const element = screen.getByText('Small heading');
      expect(element.tagName).toBe('H5');
      expect(element).toHaveClass('text-lg', 'font-medium');
    });

    it('renders Heading6 correctly', () => {
      render(<Heading6>Smallest heading</Heading6>);
      const element = screen.getByText('Smallest heading');
      expect(element.tagName).toBe('H6');
      expect(element).toHaveClass('text-base', 'font-medium');
    });
  });

  describe('Subtitle components', () => {
    it('renders Subtitle1 correctly', () => {
      render(<Subtitle1>Large subtitle</Subtitle1>);
      const element = screen.getByText('Large subtitle');
      expect(element.tagName).toBe('P');
      expect(element).toHaveClass('text-lg', 'font-medium');
    });

    it('renders Subtitle2 correctly', () => {
      render(<Subtitle2>Regular subtitle</Subtitle2>);
      const element = screen.getByText('Regular subtitle');
      expect(element.tagName).toBe('P');
      expect(element).toHaveClass('text-base', 'font-medium');
    });
  });

  describe('Body components', () => {
    it('renders Body1 correctly', () => {
      render(<Body1>Primary body text</Body1>);
      const element = screen.getByText('Primary body text');
      expect(element.tagName).toBe('P');
      expect(element).toHaveClass('text-base');
    });

    it('renders Body2 correctly', () => {
      render(<Body2>Secondary body text</Body2>);
      const element = screen.getByText('Secondary body text');
      expect(element.tagName).toBe('P');
      expect(element).toHaveClass('text-sm');
    });
  });

  describe('Utility components', () => {
    it('renders Caption correctly', () => {
      render(<Caption>Caption text</Caption>);
      const element = screen.getByText('Caption text');
      expect(element.tagName).toBe('P');
      expect(element).toHaveClass('text-xs');
    });

    it('renders Overline correctly', () => {
      render(<Overline>Overline text</Overline>);
      const element = screen.getByText('Overline text');
      expect(element.tagName).toBe('P');
      expect(element).toHaveClass('text-xs', 'uppercase', 'tracking-wide');
    });
  });

  describe('Convenience components with custom props', () => {
    it('accepts additional props in convenience components', () => {
      render(<Heading1 className="custom-heading">Custom heading</Heading1>);
      expect(screen.getByText('Custom heading')).toHaveClass('custom-heading');
    });

    it('allows overriding default props in convenience components', () => {
      render(<Body1 color="error">Error body text</Body1>);
      expect(screen.getByText('Error body text')).toHaveClass('text-red-600');
    });
  });
});

describe('Typography Edge Cases', () => {
  it('handles empty content gracefully', () => {
    render(<Typography></Typography>);
    // Should not throw an error
  });

  it('handles numeric children', () => {
    render(<Typography>{42}</Typography>);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('handles complex children with nested elements', () => {
    render(
      <Typography>
        Text with <strong>bold</strong> and <em>italic</em> parts
      </Typography>
    );
    expect(screen.getByText(/Text with/)).toBeInTheDocument();
    expect(screen.getByText('bold')).toBeInTheDocument();
    expect(screen.getByText('italic')).toBeInTheDocument();
  });

  it('combines multiple style props correctly', () => {
    render(
      <Typography
        variant="h2"
        size="lg"
        weight="light"
        color="error"
        align="center"
        truncate
      >
        Complex styled text
      </Typography>
    );
    const element = screen.getByText('Complex styled text');
    expect(element).toHaveClass(
      'text-lg',
      'font-light',
      'text-red-600',
      'text-center',
      'truncate'
    );
  });
});