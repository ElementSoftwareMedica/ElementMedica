import type { Meta, StoryObj } from '@storybook/react';
import { ViewModeToggle } from './ViewModeToggle';
import { useState } from 'react';

const meta: Meta<typeof ViewModeToggle> = {
  title: 'Design System/Molecules/ViewModeToggle',
  component: ViewModeToggle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    viewMode: {
      control: { type: 'radio' },
      options: ['table', 'grid'],
    },
    onChange: { action: 'changed' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Template per gestire lo stato
const Template = (args: any) => {
  const [viewMode, setViewMode] = useState(args.viewMode);
  
  return (
    <ViewModeToggle
      {...args}
      viewMode={viewMode}
      onChange={(mode) => {
        setViewMode(mode);
        args.onChange(mode);
      }}
    />
  );
};

export const Default: Story = {
  render: Template,
  args: {
    viewMode: 'table',
  },
};

export const GridMode: Story = {
  render: Template,
  args: {
    viewMode: 'grid',
  },
};

export const CustomLabels: Story = {
  render: Template,
  args: {
    viewMode: 'table',
    tableLabel: 'Lista',
    gridLabel: 'Griglia',
  },
};

export const WithCustomClass: Story = {
  render: Template,
  args: {
    viewMode: 'table',
    className: 'border border-gray-300 rounded-lg p-2',
  },
};