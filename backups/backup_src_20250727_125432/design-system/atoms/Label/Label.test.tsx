/**
 * Design System - Label Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Label } from './Label';

describe('Label', () => {
  it('renders with default props', () => {
    render(<Label>Test Label</Label>);
    const label = screen.getByText('Test Label');
    expect(label).toBeInTheDocument();
    expect(label).toHaveClass('block', 'text-base', 'text-gray-700', 'font-medium');
  });

  it('renders with required asterisk', () => {
    render(<Label required>Required Label</Label>);
    const asterisk = screen.getByLabelText('required');
    expect(asterisk).toBeInTheDocument();
    expect(asterisk).toHaveTextContent('*');
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<Label size="sm">Small Label</Label>);
    expect(screen.getByText('Small Label')).toHaveClass('text-sm');

    rerender(<Label size="lg">Large Label</Label>);
    expect(screen.getByText('Large Label')).toHaveClass('text-lg');
  });

  it('applies variant classes correctly', () => {
    const { rerender } = render(<Label variant="optional">Optional Label</Label>);
    expect(screen.getByText('Optional Label')).toHaveClass('text-gray-600', 'font-normal');

    rerender(<Label variant="required">Required Label</Label>);
    expect(screen.getByText('Required Label')).toHaveClass('text-gray-700', 'font-medium');
  });

  it('applies custom className', () => {
    render(<Label className="custom-class">Custom Label</Label>);
    expect(screen.getByText('Custom Label')).toHaveClass('custom-class');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLLabelElement>();
    render(<Label ref={ref}>Ref Label</Label>);
    expect(ref.current).toBeInstanceOf(HTMLLabelElement);
  });

  it('passes through HTML attributes', () => {
    render(<Label htmlFor="test-input">Label for Input</Label>);
    const label = screen.getByText('Label for Input');
    expect(label).toHaveAttribute('for', 'test-input');
  });
});