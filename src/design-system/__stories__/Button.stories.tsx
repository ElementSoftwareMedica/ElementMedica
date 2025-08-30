import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Button } from '../atoms/Button/Button';
import { 
  ArrowRight,
  Download,
  Plus,
  Trash2
} from 'lucide-react';

const meta: Meta<typeof Button> = {
  title: 'Design System/Atoms/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Componente Button del Design System Element Formazione. Supporta diverse varianti, dimensioni e stati.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'outline', 'ghost', 'destructive'],
      description: 'Variante visiva del button',
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
      description: 'Dimensione del button',
    },
    loading: {
      control: { type: 'boolean' },
      description: 'Stato di caricamento',
    },
    disabled: {
      control: { type: 'boolean' },
      description: 'Stato disabilitato',
    },
    fullWidth: {
      control: { type: 'boolean' },
      description: 'Button a larghezza piena',
    },
  },
  args: {
    onClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Storie base per varianti
export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Button Primario',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Button Secondario',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Button Outline',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Button Ghost',
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Elimina',
  },
};

// Storie per dimensioni
export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Button Piccolo',
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
    children: 'Button Medio',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Button Grande',
  },
};

// Storie per stati
export const Loading: Story = {
  args: {
    loading: true,
    children: 'Caricamento...',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Button Disabilitato',
  },
};

export const FullWidth: Story = {
  args: {
    fullWidth: true,
    children: 'Button Larghezza Piena',
  },
  parameters: {
    layout: 'padded',
  },
};

// Storie con icone
export const WithLeftIcon: Story = {
  args: {
    leftIcon: <Plus size={16} />,
    children: 'Aggiungi Nuovo',
  },
};

export const WithRightIcon: Story = {
  args: {
    rightIcon: <ArrowRight size={16} />,
    children: 'Continua',
  },
};

export const IconOnly: Story = {
  args: {
    leftIcon: <Download size={16} />,
    'aria-label': 'Scarica file',
  },
};

// Showcase completo
export const AllVariants: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Varianti</h3>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary">Primario</Button>
          <Button variant="secondary">Secondario</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Dimensioni</h3>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="sm">Piccolo</Button>
          <Button size="md">Medio</Button>
          <Button size="lg">Grande</Button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Con Icone</h3>
        <div className="flex flex-wrap gap-4">
          <Button leftIcon={<Plus size={16} />}>Aggiungi</Button>
          <Button rightIcon={<ArrowRight size={16} />}>Continua</Button>
          <Button leftIcon={<Download size={16} />} variant="outline">Scarica</Button>
          <Button leftIcon={<Trash2 size={16} />} variant="destructive">Elimina</Button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Stati</h3>
        <div className="flex flex-wrap gap-4">
          <Button loading>Caricamento...</Button>
          <Button disabled>Disabilitato</Button>
          <Button loading disabled>Loading Disabled</Button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Esempi Pratici</h3>
        <div className="space-y-4 max-w-md">
          <Button fullWidth variant="primary" leftIcon={<Plus size={16} />}>
            Crea Nuovo Corso
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1">Annulla</Button>
            <Button variant="primary" className="flex-1">Salva</Button>
          </div>
          <Button fullWidth variant="destructive" leftIcon={<Trash2 size={16} />}>
            Elimina Definitivamente
          </Button>
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};