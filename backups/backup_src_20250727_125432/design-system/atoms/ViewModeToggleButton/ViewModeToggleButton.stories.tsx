import type { Meta, StoryObj } from '@storybook/react';
import { ViewModeToggleButton } from './ViewModeToggleButton';
import { useState } from 'react';

const meta: Meta<typeof ViewModeToggleButton> = {
  title: 'Design System/Atoms/ViewModeToggleButton',
  component: ViewModeToggleButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    viewMode: {
      control: { type: 'radio' },
      options: ['grid', 'table'],
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
    <ViewModeToggleButton
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
    viewMode: 'grid',
  },
};

export const TableMode: Story = {
  render: Template,
  args: {
    viewMode: 'table',
  },
};

export const CustomLabels: Story = {
  render: Template,
  args: {
    viewMode: 'grid',
    gridLabel: 'Griglia',
    tableLabel: 'Lista',
  },
};

export const WithCustomClass: Story = {
  render: Template,
  args: {
    viewMode: 'grid',
    className: 'border border-gray-300',
  },
};