import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ContactForm } from './ContactForm';

const meta = {
  title: 'Public/Organisms/ContactForm',
  component: ContactForm,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Form di contatto riutilizzabile per Element Formazione. Supporta diverse varianti di layout e campi configurabili.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'compact', 'inline'],
      description: 'Variante di layout del form',
    },
    title: {
      control: 'text',
      description: 'Titolo del form',
    },
    showCompanyField: {
      control: 'boolean',
      description: 'Mostra il campo azienda',
    },
    showPhoneField: {
      control: 'boolean',
      description: 'Mostra il campo telefono',
    },
    showSubjectField: {
      control: 'boolean',
      description: 'Mostra il campo oggetto',
    },
    onSubmit: {
      action: 'submitted',
      description: 'Callback chiamata al submit del form',
    },
  },
  args: {
    onSubmit: fn(),
  },
} satisfies Meta<typeof ContactForm>;

export default meta;
type Story = StoryObj<typeof meta>;

// Varianti principali
export const Default: Story = {
  args: {
    title: 'Invia un Messaggio',
    variant: 'default',
    showCompanyField: true,
    showPhoneField: true,
    showSubjectField: true,
  },
};

export const Compact: Story = {
  args: {
    title: 'Contattaci',
    variant: 'compact',
    showCompanyField: true,
    showPhoneField: false,
    showSubjectField: true,
  },
};

export const Inline: Story = {
  args: {
    variant: 'inline',
    showCompanyField: true,
    showPhoneField: false,
    showSubjectField: false,
  },
  parameters: {
    backgrounds: {
      default: 'blue',
      values: [
        { name: 'blue', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
      ],
    },
  },
};

// Configurazioni specifiche
export const MinimalForm: Story = {
  args: {
    title: 'Richiesta Rapida',
    variant: 'compact',
    showCompanyField: false,
    showPhoneField: false,
    showSubjectField: false,
  },
};

export const CompleteForm: Story = {
  args: {
    title: 'Richiesta Dettagliata',
    variant: 'default',
    showCompanyField: true,
    showPhoneField: true,
    showSubjectField: true,
    subjects: [
      { value: 'corso-sicurezza', label: 'Corso Sicurezza sul Lavoro' },
      { value: 'rspp-esterno', label: 'Servizio RSPP Esterno' },
      { value: 'medico-competente', label: 'Medico Competente' },
      { value: 'dvr', label: 'Documento Valutazione Rischi' },
      { value: 'formazione-specifica', label: 'Formazione Specifica' },
      { value: 'consulenza', label: 'Consulenza Generale' },
    ],
  },
};

export const NewsletterSignup: Story = {
  args: {
    title: 'Iscriviti alla Newsletter',
    variant: 'compact',
    showCompanyField: false,
    showPhoneField: false,
    showSubjectField: false,
    subjects: [],
  },
};

// Casi d'uso specifici
export const QuoteRequest: Story = {
  args: {
    title: 'Richiedi un Preventivo',
    variant: 'default',
    showCompanyField: true,
    showPhoneField: true,
    showSubjectField: true,
    subjects: [
      { value: 'preventivo-corso', label: 'Preventivo Corso Formazione' },
      { value: 'preventivo-rspp', label: 'Preventivo Servizio RSPP' },
      { value: 'preventivo-medico', label: 'Preventivo Medico del Lavoro' },
      { value: 'preventivo-dvr', label: 'Preventivo DVR' },
      { value: 'preventivo-pacchetto', label: 'Preventivo Pacchetto Completo' },
    ],
  },
};

export const SupportRequest: Story = {
  args: {
    title: 'Richiesta Supporto',
    variant: 'compact',
    showCompanyField: true,
    showPhoneField: true,
    showSubjectField: true,
    subjects: [
      { value: 'supporto-tecnico', label: 'Supporto Tecnico' },
      { value: 'problema-corso', label: 'Problema con un Corso' },
      { value: 'modifica-prenotazione', label: 'Modifica Prenotazione' },
      { value: 'certificato', label: 'Richiesta Certificato' },
      { value: 'altro-supporto', label: 'Altro' },
    ],
  },
};

// Varianti di stile
export const WithCustomStyling: Story = {
  args: {
    title: 'Form Personalizzato',
    variant: 'default',
    showCompanyField: true,
    showPhoneField: true,
    showSubjectField: true,
    className: 'bg-gray-50 p-8 rounded-2xl shadow-lg',
  },
};

export const InlineHeroForm: Story = {
  args: {
    variant: 'inline',
    showCompanyField: false,
    showPhoneField: false,
    showSubjectField: false,
    className: 'max-w-md',
  },
  parameters: {
    backgrounds: {
      default: 'gradient',
      values: [
        { 
          name: 'gradient', 
          value: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #06b6d4 100%)' 
        },
      ],
    },
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">
            Inizia il Tuo Percorso di Sicurezza
          </h1>
          <p className="text-xl text-blue-100 mb-8">
            Richiedi una consulenza gratuita per la tua azienda
          </p>
          <Story />
        </div>
      </div>
    ),
  ],
};