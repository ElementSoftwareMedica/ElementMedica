import type { Meta, StoryObj } from '@storybook/react';
import { BrowserRouter } from 'react-router-dom';
import { Shield, Award, BookOpen, Phone, Users, FileText } from 'lucide-react';
import { ServiceCard } from './ServiceCard';

const meta: Meta<typeof ServiceCard> = {
  title: 'Public/ServiceCard',
  component: ServiceCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Componente ServiceCard riutilizzabile per mostrare i servizi offerti. Supporta diverse varianti di layout e contenuto.',
      },
    },
  },
  decorators: [
    (Story) => (
      <BrowserRouter>
        <div className="max-w-sm">
          <Story />
        </div>
      </BrowserRouter>
    ),
  ],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'featured', 'compact'],
    },
    icon: {
      control: false,
    },
  },
};

export default meta;
type Story = StoryObj<typeof ServiceCard>;

/**
 * ServiceCard standard con tutte le features
 */
export const Default: Story = {
  args: {
    icon: Shield,
    title: 'Corsi di Formazione',
    description: 'Corsi sulla sicurezza sul lavoro per tutti i settori e livelli di rischio',
    features: [
      'Rischio Alto, Medio, Basso',
      'Aggiornamenti periodici',
      'Certificazioni riconosciute'
    ],
    buttonText: 'Scopri di più',
    buttonHref: '/corsi',
    variant: 'default',
  },
  parameters: {
    docs: {
      description: {
        story: 'ServiceCard standard con icona, titolo, descrizione, lista di features e bottone.',
      },
    },
  },
};

/**
 * ServiceCard in evidenza (featured)
 */
export const Featured: Story = {
  args: {
    icon: Users,
    title: 'Nomina RSPP',
    description: 'Servizio di Responsabile del Servizio di Prevenzione e Protezione',
    features: [
      'Consulenza specializzata',
      'Supporto continuo',
      'Conformità normativa'
    ],
    buttonText: 'Richiedi Consulenza',
    buttonHref: '/contatti',
    variant: 'featured',
  },
  parameters: {
    docs: {
      description: {
        story: 'ServiceCard in evidenza con sfondo blu e testo bianco, ideale per il servizio principale.',
      },
    },
  },
};

/**
 * ServiceCard compatta
 */
export const Compact: Story = {
  args: {
    icon: Award,
    title: 'Medico del Lavoro',
    description: 'Sorveglianza sanitaria e visite mediche per i lavoratori',
    features: [
      'Visite periodiche',
      'Protocolli sanitari'
    ],
    buttonText: 'Info',
    buttonHref: '/servizi/medico-lavoro',
    variant: 'compact',
  },
  parameters: {
    docs: {
      description: {
        story: 'ServiceCard compatta con dimensioni ridotte, ideale per sidebar o sezioni secondarie.',
      },
    },
  },
};

/**
 * ServiceCard senza features
 */
export const WithoutFeatures: Story = {
  args: {
    icon: BookOpen,
    title: 'Consulenza Normativa',
    description: 'Supporto per la conformità alle normative sulla sicurezza sul lavoro',
    buttonText: 'Contattaci',
    buttonHref: '/contatti',
    variant: 'default',
  },
  parameters: {
    docs: {
      description: {
        story: 'ServiceCard senza lista di features, solo con titolo, descrizione e bottone.',
      },
    },
  },
};

/**
 * ServiceCard senza bottone
 */
export const WithoutButton: Story = {
  args: {
    icon: FileText,
    title: 'Documentazione DVR',
    description: 'Redazione e aggiornamento del Documento di Valutazione dei Rischi',
    features: [
      'Analisi dei rischi',
      'Misure preventive',
      'Aggiornamenti periodici'
    ],
    variant: 'default',
  },
  parameters: {
    docs: {
      description: {
        story: 'ServiceCard senza bottone, ideale per sezioni informative.',
      },
    },
  },
};

/**
 * Griglia di ServiceCard
 */
export const Grid: Story = {
  decorators: [
    () => (
      <BrowserRouter>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          <ServiceCard
            icon={Shield}
            title="Corsi di Formazione"
            description="Corsi sulla sicurezza sul lavoro per tutti i settori"
            features={['Rischio Alto, Medio, Basso', 'Certificazioni riconosciute']}
            buttonHref="/corsi"
            variant="default"
          />
          <ServiceCard
            icon={Users}
            title="Nomina RSPP"
            description="Servizio di Responsabile del Servizio di Prevenzione"
            features={['Consulenza specializzata', 'Supporto continuo']}
            buttonHref="/rspp"
            variant="featured"
          />
          <ServiceCard
            icon={Award}
            title="Medico del Lavoro"
            description="Sorveglianza sanitaria e visite mediche"
            features={['Visite periodiche', 'Protocolli sanitari']}
            buttonHref="/medico"
            variant="default"
          />
          <ServiceCard
            icon={FileText}
            title="DVR"
            description="Documento di Valutazione dei Rischi"
            features={['Analisi completa', 'Aggiornamenti']}
            buttonHref="/dvr"
            variant="compact"
          />
          <ServiceCard
            icon={BookOpen}
            title="Consulenza"
            description="Supporto normativo specializzato"
            buttonHref="/consulenza"
            variant="compact"
          />
          <ServiceCard
            icon={Phone}
            title="Supporto 24/7"
            description="Assistenza continua per emergenze"
            features={['Reperibilità', 'Interventi rapidi']}
            buttonHref="/supporto"
            variant="default"
          />
        </div>
      </BrowserRouter>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Esempio di griglia con diverse ServiceCard che mostra le varie combinazioni possibili.',
      },
    },
  },
};