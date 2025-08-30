/**
 * Design System - Input Stories
 * Week 8 Implementation - Component Library
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';
import { MagnifyingGlassIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const meta = {
  title: 'Design System/Atoms/Input',
  component: Input,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Input component seguendo i principi dell\'Atomic Design. Supporta diverse varianti, dimensioni, stati e icone.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'filled', 'outline'],
      description: 'Variante dell\'input',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Dimensione dell\'input',
    },
    state: {
      control: 'select',
      options: ['default', 'error', 'success', 'disabled'],
      description: 'Stato dell\'input',
    },
    label: {
      control: 'text',
      description: 'Etichetta dell\'input',
    },
    placeholder: {
      control: 'text',
      description: 'Testo placeholder',
    },
    helperText: {
      control: 'text',
      description: 'Testo di aiuto',
    },
    errorMessage: {
      control: 'text',
      description: 'Messaggio di errore',
    },
    successMessage: {
      control: 'text',
      description: 'Messaggio di successo',
    },
    disabled: {
      control: 'boolean',
      description: 'Stato disabilitato',
    },
    required: {
      control: 'boolean',
      description: 'Campo obbligatorio',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Larghezza piena',
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default story
export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
};

// With Label
export const WithLabel: Story = {
  args: {
    label: 'Email Address',
    placeholder: 'Enter your email',
    type: 'email',
  },
};

// Required Field
export const Required: Story = {
  args: {
    label: 'Full Name',
    placeholder: 'Enter your full name',
    required: true,
  },
};

// Variants
export const DefaultVariant: Story = {
  args: {
    variant: 'default',
    label: 'Default Input',
    placeholder: 'Default variant',
  },
};

export const FilledVariant: Story = {
  args: {
    variant: 'filled',
    label: 'Filled Input',
    placeholder: 'Filled variant',
  },
};

export const OutlineVariant: Story = {
  args: {
    variant: 'outline',
    label: 'Outline Input',
    placeholder: 'Outline variant',
  },
};

// Sizes
export const Small: Story = {
  args: {
    size: 'sm',
    label: 'Small Input',
    placeholder: 'Small size',
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
    label: 'Medium Input',
    placeholder: 'Medium size',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    label: 'Large Input',
    placeholder: 'Large size',
  },
};

// States
export const WithHelperText: Story = {
  args: {
    label: 'Username',
    placeholder: 'Enter username',
    helperText: 'Username must be at least 3 characters long',
  },
};

export const ErrorState: Story = {
  args: {
    label: 'Email',
    placeholder: 'Enter email',
    value: 'invalid-email',
    errorMessage: 'Please enter a valid email address',
  },
};

export const SuccessState: Story = {
  args: {
    label: 'Email',
    placeholder: 'Enter email',
    value: 'user@example.com',
    successMessage: 'Email is valid',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled Input',
    placeholder: 'This input is disabled',
    disabled: true,
    value: 'Disabled value',
  },
};

// With Icons
export const WithLeftIcon: Story = {
  args: {
    label: 'Search',
    placeholder: 'Search...',
    leftIcon: <MagnifyingGlassIcon className="h-4 w-4" />,
  },
};

export const WithRightIcon: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter password',
    rightIcon: <EyeIcon className="h-4 w-4" />,
  },
};

export const WithBothIcons: Story = {
  args: {
    label: 'Search with Filter',
    placeholder: 'Search and filter...',
    leftIcon: <MagnifyingGlassIcon className="h-4 w-4" />,
    rightIcon: <EyeIcon className="h-4 w-4" />,
  },
};

// Input Types
export const EmailInput: Story = {
  args: {
    label: 'Email Address',
    type: 'email',
    placeholder: 'user@example.com',
    helperText: 'We\'ll never share your email',
  },
};

export const PasswordInput: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password',
    rightIcon: <EyeSlashIcon className="h-4 w-4" />,
  },
};

export const NumberInput: Story = {
  args: {
    label: 'Age',
    type: 'number',
    placeholder: '25',
    min: 0,
    max: 120,
  },
};

// All Variants Showcase
export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <Input variant="default" label="Default" placeholder="Default variant" />
      <Input variant="filled" label="Filled" placeholder="Filled variant" />
      <Input variant="outline" label="Outline" placeholder="Outline variant" />
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

// All Sizes Showcase
export const AllSizes: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <Input size="sm" label="Small" placeholder="Small input" />
      <Input size="md" label="Medium" placeholder="Medium input" />
      <Input size="lg" label="Large" placeholder="Large input" />
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

// All States Showcase
export const AllStates: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <Input label="Default" placeholder="Default state" />
      <Input 
        label="Error" 
        placeholder="Error state" 
        value="invalid input"
        errorMessage="This field has an error" 
      />
      <Input 
        label="Success" 
        placeholder="Success state" 
        value="valid input"
        successMessage="This field is valid" 
      />
      <Input 
        label="Disabled" 
        placeholder="Disabled state" 
        disabled 
        value="Disabled input"
      />
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

// Interactive Password Toggle
export const InteractivePassword: Story = {
  render: () => {
    const [showPassword, setShowPassword] = React.useState(false);
    
    return (
      <div className="w-80">
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Enter your password"
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="pointer-events-auto"
            >
              {showPassword ? (
                <EyeSlashIcon className="h-4 w-4" />
              ) : (
                <EyeIcon className="h-4 w-4" />
              )}
            </button>
          }
        />
      </div>
    );
  },
  parameters: {
    layout: 'padded',
  },
};