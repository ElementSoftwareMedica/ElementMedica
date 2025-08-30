import type { Meta, StoryObj } from '@storybook/react';
import { BrowserRouter } from 'react-router-dom';
import { HeroSection } from './HeroSection';

const meta: Meta<typeof HeroSection> = {
  title: 'Public/HeroSection',
  component: HeroSection,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Componente Hero Section riutilizzabile per le pagine pubbliche. Supporta diverse varianti di layout, bottoni, statistiche e form di contatto.',
      },
    },
  },
  decorators: [
    (Story) => (
      <BrowserRouter>
        <Story />
      </BrowserRouter>
    ),
  ],
  argTypes: {
    backgroundVariant: {
      control: { type: 'select' },
      options: ['gradient', 'solid', 'image'],
    },
    showContactForm: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof HeroSection>;

/**
 * Hero Section completa della homepage con form di contatto e statistiche
 */
export const Homepage: Story = {
  args: {
    title: 'Sicurezza sul Lavoro',
    subtitle: 'Senza Compromessi',
    description: 'Leader nella formazione sulla sicurezza e consulenza aziendale. Offriamo soluzioni complete per la conformità normativa e la protezione dei lavoratori.',
    primaryButton: {
      text: 'Scopri i Corsi',
      href: '/corsi',
    },
    secondaryButton: {
      text: 'Richiedi Preventivo',
      href: '/contatti',
    },
    stats: [
      { number: '500+', label: 'Aziende Clienti' },
      { number: '10.000+', label: 'Lavoratori Formati' },
      { number: '15+', label: 'Anni di Esperienza' },
      { number: '98%', label: 'Soddisfazione Cliente' }
    ],
    showContactForm: true,
    backgroundVariant: 'gradient',
  },
  parameters: {
    docs: {
      description: {
        story: 'Hero Section completa della homepage con form di contatto, statistiche e due bottoni CTA.',
      },
    },
  },
};

/**
 * Hero Section semplice per pagine interne
 */
export const Simple: Story = {
  args: {
    title: 'I Nostri Corsi',
    description: 'Formazione professionale sulla sicurezza sul lavoro per tutti i settori e livelli di rischio.',
    primaryButton: {
      text: 'Visualizza Corsi',
      href: '/corsi',
    },
    backgroundVariant: 'solid',
    showContactForm: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Hero Section semplice per pagine interne, senza form di contatto e con un solo bottone.',
      },
    },
  },
};

/**
 * Hero Section con statistiche ma senza form
 */
export const WithStats: Story = {
  args: {
    title: 'Chi Siamo',
    subtitle: 'Element Formazione',
    description: 'Da oltre 15 anni al servizio delle aziende per garantire la massima sicurezza sul lavoro.',
    stats: [
      { number: '500+', label: 'Aziende Clienti' },
      { number: '10.000+', label: 'Lavoratori Formati' },
      { number: '15+', label: 'Anni di Esperienza' },
      { number: '98%', label: 'Soddisfazione Cliente' }
    ],
    primaryButton: {
      text: 'Scopri di più',
      href: '/chi-siamo',
    },
    backgroundVariant: 'gradient',
    showContactForm: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Hero Section con statistiche ma senza form di contatto, ideale per pagine informative.',
      },
    },
  },
};

/**
 * Hero Section per pagina contatti
 */
export const Contact: Story = {
  args: {
    title: 'Contattaci',
    description: 'Hai bisogno di una consulenza? Il nostro team è pronto ad aiutarti a trovare la soluzione migliore per la tua azienda.',
    showContactForm: true,
    backgroundVariant: 'solid',
  },
  parameters: {
    docs: {
      description: {
        story: 'Hero Section per la pagina contatti con form di contatto prominente.',
      },
    },
  },
};

/**
 * Hero Section minimale
 */
export const Minimal: Story = {
  args: {
    title: 'Lavora con Noi',
    description: 'Unisciti al nostro team di professionisti della sicurezza sul lavoro.',
    backgroundVariant: 'gradient',
    showContactForm: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Hero Section minimale senza bottoni, statistiche o form, solo titolo e descrizione.',
      },
    },
  },
};