/**
 * Design System - Label Component Stories
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Label } from './Label';

const meta: Meta<typeof Label> = {
  title: 'Design System/Atoms/Label',
  component: Label,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A flexible label component for form fields with consistent styling and accessibility features.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the label'
    },
    variant: {
      control: 'select',
      options: ['default', 'required', 'optional'],
      description: 'Visual variant of the label'
    },
    required: {
      control: 'boolean',
      description: 'Show required asterisk'
    },
    children: {
      control: 'text',
      description: 'Label text content'
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Default Label'
  }
};

export const Required: Story = {
  args: {
    children: 'Required Field',
    required: true
  }
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-4">
      <Label size="sm">Small Label</Label>
      <Label size="md">Medium Label</Label>
      <Label size="lg">Large Label</Label>
    </div>
  )
};

export const Variants: Story = {
  render: () => (
    <div className="space-y-4">
      <Label variant="default">Default Label</Label>
      <Label variant="required" required>Required Label</Label>
      <Label variant="optional">Optional Label</Label>
    </div>
  )
};

export const WithFormField: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="email" required>Email Address</Label>
      <input
        id="email"
        type="email"
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Enter your email"
      />
    </div>
  )
};

export const AllSizesRequired: Story = {
  render: () => (
    <div className="space-y-4">
      <Label size="sm" required>Small Required Label</Label>
      <Label size="md" required>Medium Required Label</Label>
      <Label size="lg" required>Large Required Label</Label>
    </div>
  )
};