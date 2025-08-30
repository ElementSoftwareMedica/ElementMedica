/**
 * Design System - Select Component Stories
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Select } from './Select';

const mockOptions = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'date', label: 'Date', disabled: true },
  { value: 'elderberry', label: 'Elderberry' }
];

const meta: Meta<typeof Select> = {
  title: 'Design System/Atoms/Select',
  component: Select,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A flexible select dropdown component with consistent styling and accessibility features.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the select'
    },
    variant: {
      control: 'select',
      options: ['default', 'outlined', 'filled'],
      description: 'Visual variant of the select'
    },
    error: {
      control: 'boolean',
      description: 'Error state styling'
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state'
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text'
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    options: mockOptions,
    placeholder: 'Choose a fruit'
  }
};

export const WithoutPlaceholder: Story = {
  args: {
    options: mockOptions
  }
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-4 w-64">
      <Select size="sm" options={mockOptions} placeholder="Small select" />
      <Select size="md" options={mockOptions} placeholder="Medium select" />
      <Select size="lg" options={mockOptions} placeholder="Large select" />
    </div>
  )
};

export const Variants: Story = {
  render: () => (
    <div className="space-y-4 w-64">
      <Select variant="default" options={mockOptions} placeholder="Default variant" />
      <Select variant="outlined" options={mockOptions} placeholder="Outlined variant" />
      <Select variant="filled" options={mockOptions} placeholder="Filled variant" />
    </div>
  )
};

export const States: Story = {
  render: () => (
    <div className="space-y-4 w-64">
      <Select options={mockOptions} placeholder="Normal state" />
      <Select options={mockOptions} placeholder="Error state" error />
      <Select options={mockOptions} placeholder="Disabled state" disabled />
    </div>
  )
};

export const WithCustomOptions: Story = {
  render: () => (
    <div className="w-64">
      <Select placeholder="Select a country">
        <option value="us">United States</option>
        <option value="ca">Canada</option>
        <option value="uk">United Kingdom</option>
        <option value="de">Germany</option>
        <option value="fr">France</option>
      </Select>
    </div>
  )
};

export const FormExample: Story = {
  render: () => (
    <div className="space-y-2 w-64">
      <label htmlFor="fruit-select" className="block text-sm font-medium text-gray-700">
        Favorite Fruit *
      </label>
      <Select
        id="fruit-select"
        options={mockOptions}
        placeholder="Choose your favorite fruit"
        required
      />
      <p className="text-sm text-gray-500">Please select your preferred fruit from the list.</p>
    </div>
  )
};

export const ErrorState: Story = {
  render: () => (
    <div className="space-y-2 w-64">
      <label htmlFor="error-select" className="block text-sm font-medium text-gray-700">
        Required Field
      </label>
      <Select
        id="error-select"
        options={mockOptions}
        placeholder="This field has an error"
        error
      />
      <p className="text-sm text-red-600">Please select a valid option.</p>
    </div>
  )
};