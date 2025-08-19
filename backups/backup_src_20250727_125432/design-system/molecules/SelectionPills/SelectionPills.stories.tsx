import type { Meta, StoryObj } from '@storybook/react';
import { SelectionPills } from './SelectionPills';
import { Trash2, Edit, Download, Mail } from 'lucide-react';

const meta: Meta<typeof SelectionPills> = {
  title: 'Design System/Molecules/SelectionPills',
  component: SelectionPills,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onClear: { action: 'cleared' },
    onClearSelection: { action: 'selection cleared' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleActions = [
  {
    label: 'Modifica',
    onClick: () => console.log('Edit clicked'),
    icon: <Edit className="w-4 h-4" />,
    variant: 'primary' as const,
  },
  {
    label: 'Elimina',
    onClick: () => console.log('Delete clicked'),
    icon: <Trash2 className="w-4 h-4" />,
    variant: 'danger' as const,
  },
  {
    label: 'Download',
    onClick: () => console.log('Download clicked'),
    icon: <Download className="w-4 h-4" />,
    variant: 'secondary' as const,
  },
];

export const Default: Story = {
  args: {
    actions: sampleActions,
    count: 3,
    entityName: 'elementi',
  },
};

export const WithoutCount: Story = {
  args: {
    actions: sampleActions,
  },
};

export const SingleSelection: Story = {
  args: {
    actions: sampleActions,
    count: 1,
    entityName: 'utente',
  },
};

export const MultipleSelection: Story = {
  args: {
    actions: sampleActions,
    count: 15,
    entityName: 'aziende',
  },
};

export const OnlyActions: Story = {
  args: {
    actions: [
      {
        label: 'Invia Email',
        onClick: () => console.log('Send email'),
        icon: <Mail className="w-4 h-4" />,
        variant: 'primary' as const,
      },
      {
        label: 'Esporta CSV',
        onClick: () => console.log('Export CSV'),
        icon: <Download className="w-4 h-4" />,
        variant: 'default' as const,
      },
    ],
  },
};

export const Empty: Story = {
  args: {
    actions: [],
    count: 0,
  },
};