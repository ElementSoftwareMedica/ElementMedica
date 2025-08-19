import type { Meta, StoryObj } from '@storybook/react';
import { InputFilter } from './InputFilter';
import { Search, Filter, User, Mail } from 'lucide-react';
import { useState } from 'react';

const meta: Meta<typeof InputFilter> = {
  title: 'Design System/Molecules/InputFilter',
  component: InputFilter,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onChange: { action: 'changed' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Template per gestire lo stato
const Template = (args: any) => {
  const [value, setValue] = useState(args.value || '');
  
  return (
    <InputFilter
      {...args}
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        args.onChange(e);
      }}
    />
  );
};

export const Default: Story = {
  render: Template,
  args: {
    name: 'search',
    placeholder: 'Cerca...',
  },
};

export const WithSearchIcon: Story = {
  render: Template,
  args: {
    name: 'search',
    placeholder: 'Cerca elementi...',
    icon: <Search className="w-4 h-4 text-gray-400" />,
  },
};

export const WithFilterIcon: Story = {
  render: Template,
  args: {
    name: 'filter',
    placeholder: 'Filtra per nome...',
    icon: <Filter className="w-4 h-4 text-gray-400" />,
  },
};

export const WithUserIcon: Story = {
  render: Template,
  args: {
    name: 'user',
    placeholder: 'Cerca utenti...',
    icon: <User className="w-4 h-4 text-gray-400" />,
  },
};

export const WithEmailIcon: Story = {
  render: Template,
  args: {
    name: 'email',
    placeholder: 'Inserisci email...',
    icon: <Mail className="w-4 h-4 text-gray-400" />,
  },
};

export const WithValue: Story = {
  render: Template,
  args: {
    name: 'search',
    value: 'Testo di esempio',
    placeholder: 'Cerca...',
    icon: <Search className="w-4 h-4 text-gray-400" />,
  },
};

export const WithCustomClass: Story = {
  render: Template,
  args: {
    name: 'search',
    placeholder: 'Cerca...',
    icon: <Search className="w-4 h-4 text-gray-400" />,
    className: 'border-2 border-blue-200',
  },
};