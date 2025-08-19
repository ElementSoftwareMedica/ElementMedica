/**
 * Design System - FormField Component Stories
 * Week 8 Implementation - Component Library
 */

import type { Meta, StoryObj } from '@storybook/react';
import { FormField } from './FormField';
import { useState } from 'react';

const meta: Meta<typeof FormField> = {
  title: 'Design System/Molecules/FormField',
  component: FormField,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'A complete form field component with label, input, validation, and help text. Supports various input types and states.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'textarea', 'number', 'email', 'password', 'select', 'checkbox', 'radio', 'date']
    },
    variant: {
      control: 'select',
      options: ['default', 'filled', 'outlined']
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg']
    },
    required: {
      control: 'boolean'
    },
    disabled: {
      control: 'boolean'
    },
    readOnly: {
      control: 'boolean'
    },
    showRequiredAsterisk: {
      control: 'boolean'
    }
  }
};

export default meta;
type Story = StoryObj<typeof FormField>;

// Interactive wrapper for controlled components
const FormFieldWrapper = (args: any) => {
  const [value, setValue] = useState(args.value || '');
  
  return (
    <FormField
      {...args}
      value={value}
      onChange={(e) => {
        if (args.type === 'checkbox') {
          setValue(e.target.checked);
        } else {
          setValue(e.target.value);
        }
        args.onChange?.(e);
      }}
    />
  );
};

// Basic text input
export const Default: Story = {
  render: FormFieldWrapper,
  args: {
    name: 'username',
    label: 'Username',
    type: 'text',
    placeholder: 'Enter your username',
    value: ''
  }
};

// Required field with asterisk
export const Required: Story = {
  render: FormFieldWrapper,
  args: {
    name: 'email',
    label: 'Email Address',
    type: 'email',
    placeholder: 'Enter your email',
    required: true,
    value: ''
  }
};

// Field with error
export const WithError: Story = {
  render: FormFieldWrapper,
  args: {
    name: 'password',
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password',
    required: true,
    error: 'Password must be at least 8 characters long',
    value: '123'
  }
};

// Field with help text
export const WithHelpText: Story = {
  render: FormFieldWrapper,
  args: {
    name: 'phone',
    label: 'Phone Number',
    type: 'text',
    placeholder: '+1 (555) 123-4567',
    helpText: 'Include country code for international numbers',
    value: ''
  }
};

// Textarea
export const Textarea: Story = {
  render: FormFieldWrapper,
  args: {
    name: 'description',
    label: 'Description',
    type: 'textarea',
    placeholder: 'Enter a detailed description...',
    rows: 4,
    value: ''
  }
};

// Select dropdown
export const Select: Story = {
  render: FormFieldWrapper,
  args: {
    name: 'country',
    label: 'Country',
    type: 'select',
    placeholder: 'Select your country',
    options: [
      { value: 'us', label: 'United States' },
      { value: 'ca', label: 'Canada' },
      { value: 'uk', label: 'United Kingdom' },
      { value: 'de', label: 'Germany' },
      { value: 'fr', label: 'France' }
    ],
    value: ''
  }
};

// Checkbox
export const Checkbox: Story = {
  render: FormFieldWrapper,
  args: {
    name: 'terms',
    label: 'I agree to the terms and conditions',
    type: 'checkbox',
    required: true,
    value: false
  }
};

// Radio buttons
export const Radio: Story = {
  render: FormFieldWrapper,
  args: {
    name: 'plan',
    label: 'Choose your plan',
    type: 'radio',
    options: [
      { value: 'basic', label: 'Basic - $9/month' },
      { value: 'pro', label: 'Pro - $19/month' },
      { value: 'enterprise', label: 'Enterprise - $49/month' }
    ],
    value: ''
  }
};

// Number input
export const Number: Story = {
  render: FormFieldWrapper,
  args: {
    name: 'age',
    label: 'Age',
    type: 'number',
    placeholder: 'Enter your age',
    min: 0,
    max: 120,
    value: ''
  }
};

// Date input
export const Date: Story = {
  render: FormFieldWrapper,
  args: {
    name: 'birthdate',
    label: 'Birth Date',
    type: 'date',
    value: ''
  }
};

// Disabled state
export const Disabled: Story = {
  render: FormFieldWrapper,
  args: {
    name: 'disabled',
    label: 'Disabled Field',
    type: 'text',
    placeholder: 'This field is disabled',
    disabled: true,
    value: 'Cannot edit this'
  }
};

// Read-only state
export const ReadOnly: Story = {
  render: FormFieldWrapper,
  args: {
    name: 'readonly',
    label: 'Read-only Field',
    type: 'text',
    readOnly: true,
    value: 'This is read-only content'
  }
};

// Different sizes
export const Sizes: Story = {
  render: () => (
    <div className="space-y-4">
      <FormField
        name="small"
        label="Small Size"
        type="text"
        size="sm"
        placeholder="Small input"
        value=""
        onChange={() => {}}
      />
      <FormField
        name="medium"
        label="Medium Size (Default)"
        type="text"
        size="md"
        placeholder="Medium input"
        value=""
        onChange={() => {}}
      />
      <FormField
        name="large"
        label="Large Size"
        type="text"
        size="lg"
        placeholder="Large input"
        value=""
        onChange={() => {}}
      />
    </div>
  )
};

// Different variants
export const Variants: Story = {
  render: () => (
    <div className="space-y-4">
      <FormField
        name="default"
        label="Default Variant"
        type="text"
        variant="default"
        placeholder="Default styling"
        value=""
        onChange={() => {}}
      />
      <FormField
        name="filled"
        label="Filled Variant"
        type="text"
        variant="filled"
        placeholder="Filled styling"
        value=""
        onChange={() => {}}
      />
      <FormField
        name="outlined"
        label="Outlined Variant"
        type="text"
        variant="outlined"
        placeholder="Outlined styling"
        value=""
        onChange={() => {}}
      />
    </div>
  )
};

// Complex form example
export const ComplexForm: Story = {
  render: () => {
    const [formData, setFormData] = useState({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      country: '',
      bio: '',
      newsletter: false,
      plan: ''
    });

    const handleChange = (field: string) => (e: any) => {
      const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
      <div className="max-w-md space-y-4">
        <h3 className="text-lg font-semibold mb-4">User Registration Form</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            name="firstName"
            label="First Name"
            type="text"
            required
            value={formData.firstName}
            onChange={handleChange('firstName')}
          />
          <FormField
            name="lastName"
            label="Last Name"
            type="text"
            required
            value={formData.lastName}
            onChange={handleChange('lastName')}
          />
        </div>
        
        <FormField
          name="email"
          label="Email Address"
          type="email"
          required
          value={formData.email}
          onChange={handleChange('email')}
          helpText="We'll never share your email with anyone else"
        />
        
        <FormField
          name="phone"
          label="Phone Number"
          type="text"
          value={formData.phone}
          onChange={handleChange('phone')}
          placeholder="+1 (555) 123-4567"
        />
        
        <FormField
          name="country"
          label="Country"
          type="select"
          required
          value={formData.country}
          onChange={handleChange('country')}
          placeholder="Select your country"
          options={[
            { value: 'us', label: 'United States' },
            { value: 'ca', label: 'Canada' },
            { value: 'uk', label: 'United Kingdom' }
          ]}
        />
        
        <FormField
          name="bio"
          label="Bio"
          type="textarea"
          value={formData.bio}
          onChange={handleChange('bio')}
          placeholder="Tell us about yourself..."
          rows={3}
        />
        
        <FormField
          name="plan"
          label="Choose your plan"
          type="radio"
          value={formData.plan}
          onChange={handleChange('plan')}
          options={[
            { value: 'basic', label: 'Basic - Free' },
            { value: 'pro', label: 'Pro - $9/month' },
            { value: 'enterprise', label: 'Enterprise - $29/month' }
          ]}
        />
        
        <FormField
          name="newsletter"
          label="Subscribe to our newsletter"
          type="checkbox"
          value={formData.newsletter}
          onChange={handleChange('newsletter')}
        />
      </div>
    );
  }
};