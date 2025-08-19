/**
 * Design System - Button Stories
 * Week 8 Implementation - Component Library
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import { ChevronRightIconIcon } from '@heroicons/react/24/outline';

const meta = {
  title: 'Design System/Atoms/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Button component seguendo i principi dell\'Atomic Design. Supporta diverse varianti, dimensioni e stati.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'destructive'],
      description: 'Variante del button',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Dimensione del button',
    },
    loading: {
      control: 'boolean',
      description: 'Stato di caricamento',
    },
    disabled: {
      control: 'boolean',
      description: 'Stato disabilitato',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Button a larghezza piena',
    },
    children: {
      control: 'text',
      description: 'Contenuto del button',
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default story
export const Default: Story = {
  args: {
    children: 'Button',
  },
};

// Variants
export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline Button',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost Button',
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Destructive Button',
  },
};

// Sizes
export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small Button',
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
    children: 'Medium Button',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large Button',
  },
};

// States
export const Loading: Story = {
  args: {
    loading: true,
    children: 'Loading Button',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled Button',
  },
};

// With Icons
export const WithLeftIcon: Story = {
  args: {
    leftIcon: <PlusIcon className="h-4 w-4" />,
    children: 'Add Item',
  },
};

export const WithRightIcon: Story = {
  args: {
    rightIcon: <ChevronRightIcon className="h-4 w-4" />,
    children: 'Continue',
  },
};

export const WithBothIcons: Story = {
  args: {
    leftIcon: <PlusIcon className="h-4 w-4" />,
    rightIcon: <ChevronRightIcon className="h-4 w-4" />,
    children: 'Add and Continue',
  },
};

// Full Width
export const FullWidth: Story = {
  args: {
    fullWidth: true,
    children: 'Full Width Button',
  },
  parameters: {
    layout: 'padded',
  },
};

// All Variants Showcase
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 flex-wrap">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Button variant="primary" disabled>Primary Disabled</Button>
        <Button variant="secondary" disabled>Secondary Disabled</Button>
        <Button variant="outline" disabled>Outline Disabled</Button>
        <Button variant="ghost" disabled>Ghost Disabled</Button>
        <Button variant="destructive" disabled>Destructive Disabled</Button>
      </div>
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

// All Sizes Showcase
export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};

// Interactive Example
export const Interactive: Story = {
  render: () => {
    const [loading, setLoading] = React.useState(false);
    
    const handleClick = () => {
      setLoading(true);
      setTimeout(() => setLoading(false), 2000);
    };
    
    return (
      <Button 
        loading={loading} 
        onClick={handleClick}
        leftIcon={!loading ? <PlusIcon className="h-4 w-4" /> : undefined}
      >
        {loading ? 'Processing...' : 'Click me'}
      </Button>
    );
  },
};