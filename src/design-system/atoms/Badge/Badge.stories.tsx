import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Design System/Atoms/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Badge component per mostrare status, conteggi o etichette. Supporta diverse varianti e dimensioni.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'outline', 'destructive'],
      description: 'Variante del badge',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Dimensione del badge',
    },
    children: {
      control: 'text',
      description: 'Contenuto del badge',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    children: 'Badge',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondario',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline',
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Errore',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Piccolo',
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
    children: 'Medio',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Grande',
  },
};

export const WithNumbers: Story = {
  args: {
    children: '42',
    variant: 'default',
  },
};

export const StatusBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Badge variant="default">Attivo</Badge>
      <Badge variant="secondary">In Attesa</Badge>
      <Badge variant="outline">Bozza</Badge>
      <Badge variant="destructive">Scaduto</Badge>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Esempi di badge per diversi stati',
      },
    },
  },
};

export const CountBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Badge size="sm">3</Badge>
      <Badge size="md">12</Badge>
      <Badge size="lg">99+</Badge>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Badge per conteggi in diverse dimensioni',
      },
    },
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">Varianti</h3>
        <div className="flex flex-wrap gap-3">
          <Badge variant="default">Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-3">Dimensioni</h3>
        <div className="flex flex-wrap items-center gap-3">
          <Badge size="sm">Small</Badge>
          <Badge size="md">Medium</Badge>
          <Badge size="lg">Large</Badge>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-3">Esempi Pratici</h3>
        <div className="flex flex-wrap gap-3">
          <Badge variant="default">Nuovo</Badge>
          <Badge variant="secondary">In Corso</Badge>
          <Badge variant="outline">Completato</Badge>
          <Badge variant="destructive">Scaduto</Badge>
          <Badge size="sm">5</Badge>
          <Badge variant="secondary" size="lg">Premium</Badge>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Panoramica completa di tutte le varianti e dimensioni del Badge',
      },
    },
  },
};