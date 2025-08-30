import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { PublicButton } from './PublicButton';

const meta = {
  title: 'Public/Atoms/PublicButton',
  component: PublicButton,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Pulsante pubblico con design a pillola full-rounded per il frontend Element Formazione.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'outline', 'ghost'],
      description: 'Variante del pulsante',
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
      description: 'Dimensione del pulsante',
    },
    disabled: {
      control: 'boolean',
      description: 'Stato disabilitato',
    },
    children: {
      control: 'text',
      description: 'Contenuto del pulsante',
    },
  },
  args: { onClick: fn() },
} satisfies Meta<typeof PublicButton>;

export default meta;
type Story = StoryObj<typeof meta>;

// Story principale
export const Default: Story = {
  args: {
    children: 'Richiedi Preventivo',
  },
};

// Varianti
export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Iscriviti al Corso',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Scopri di Più',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Contattaci',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Annulla',
  },
};

// Dimensioni
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

// Stati
export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabilitato',
  },
};

export const Loading: Story = {
  args: {
    disabled: true,
    children: 'Caricamento...',
  },
};

// Esempi d'uso
export const CallToAction: Story = {
  args: {
    variant: 'primary',
    size: 'lg',
    children: 'Richiedi Preventivo Gratuito',
  },
  parameters: {
    docs: {
      description: {
        story: 'Pulsante principale per call-to-action importanti.',
      },
    },
  },
};

export const NavigationButton: Story = {
  args: {
    variant: 'outline',
    size: 'md',
    children: 'Visualizza Tutti i Corsi',
  },
  parameters: {
    docs: {
      description: {
        story: 'Pulsante per navigazione secondaria.',
      },
    },
  },
};

// Gruppo di pulsanti
export const ButtonGroup: Story = {
  args: {
    children: 'Button Group',
  },
  render: () => (
    <div className="flex gap-4 flex-wrap">
      <PublicButton variant="primary" size="lg">
        Iscriviti Ora
      </PublicButton>
      <PublicButton variant="outline" size="lg">
        Maggiori Info
      </PublicButton>
      <PublicButton variant="ghost" size="lg">
        Annulla
      </PublicButton>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Esempio di gruppo di pulsanti con diverse varianti.',
      },
    },
  },
};