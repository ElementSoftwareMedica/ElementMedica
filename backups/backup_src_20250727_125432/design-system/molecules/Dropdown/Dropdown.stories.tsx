import type { Meta, StoryObj } from '@storybook/react';
import { Dropdown } from './Dropdown';
import { Edit, Trash2, Eye, Download } from 'lucide-react';

const meta: Meta<typeof Dropdown> = {
  title: 'Design System/Molecules/Dropdown',
  component: Dropdown,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'danger'],
    },
    pill: {
      control: 'boolean',
    },
    showArrow: {
      control: 'boolean',
    },
    customStyle: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Basic dropdown
export const Default: Story = {
  args: {
    label: 'Azioni',
    variant: 'outline',
    actions: [
      {
        label: 'Visualizza',
        onClick: () => console.log('Visualizza clicked'),
        icon: <Eye className="h-4 w-4" />,
      },
      {
        label: 'Modifica',
        onClick: () => console.log('Modifica clicked'),
        icon: <Edit className="h-4 w-4" />,
      },
      {
        label: 'Scarica',
        onClick: () => console.log('Scarica clicked'),
        icon: <Download className="h-4 w-4" />,
      },
      {
        label: 'Elimina',
        onClick: () => console.log('Elimina clicked'),
        icon: <Trash2 className="h-4 w-4" />,
        variant: 'danger',
      },
    ],
  },
};

// Primary variant
export const Primary: Story = {
  args: {
    ...Default.args,
    variant: 'primary',
    label: 'Azioni Primarie',
  },
};

// Secondary variant
export const Secondary: Story = {
  args: {
    ...Default.args,
    variant: 'secondary',
    label: 'Azioni Secondarie',
  },
};

// Ghost variant
export const Ghost: Story = {
  args: {
    ...Default.args,
    variant: 'ghost',
    label: 'Azioni Ghost',
  },
};

// Danger variant
export const Danger: Story = {
  args: {
    ...Default.args,
    variant: 'danger',
    label: 'Azioni Pericolose',
  },
};

// Without pill shape
export const NoPill: Story = {
  args: {
    ...Default.args,
    pill: false,
    label: 'Azioni Rettangolari',
  },
};

// Without arrow
export const NoArrow: Story = {
  args: {
    ...Default.args,
    showArrow: false,
    label: 'Senza Freccia',
  },
};

// With disabled actions
export const WithDisabledActions: Story = {
  args: {
    label: 'Azioni Miste',
    variant: 'outline',
    actions: [
      {
        label: 'Visualizza',
        onClick: () => console.log('Visualizza clicked'),
        icon: <Eye className="h-4 w-4" />,
      },
      {
        label: 'Modifica (Disabilitata)',
        onClick: () => console.log('Modifica clicked'),
        icon: <Edit className="h-4 w-4" />,
        disabled: true,
      },
      {
        label: 'Elimina',
        onClick: () => console.log('Elimina clicked'),
        icon: <Trash2 className="h-4 w-4" />,
        variant: 'danger',
      },
    ],
  },
};

// With custom icon
export const WithCustomIcon: Story = {
  args: {
    ...Default.args,
    icon: <Download className="h-4 w-4" />,
    label: 'Download',
  },
};

// Only icon, no label
export const IconOnly: Story = {
  args: {
    ...Default.args,
    label: '',
    icon: <Edit className="h-4 w-4" />,
    variant: 'ghost',
  },
};