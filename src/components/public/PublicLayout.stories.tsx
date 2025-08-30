import type { Meta, StoryObj } from '@storybook/react';
import { BrowserRouter } from 'react-router-dom';
import { PublicLayout } from './PublicLayout';
import { PublicButton } from './PublicButton';

const meta: Meta<typeof PublicLayout> = {
  title: 'Public/PublicLayout',
  component: PublicLayout,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Layout principale per le pagine pubbliche di Element Formazione. Include header fisso, area contenuto e footer.',
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
    className: {
      control: 'text',
      description: 'Classi CSS aggiuntive per il contenuto principale',
    },
    children: {
      control: false,
      description: 'Contenuto da visualizzare nel layout',
    },
  },
};

export default meta;
type Story = StoryObj<typeof PublicLayout>;

/**
 * Layout con contenuto homepage tipico
 */
export const Homepage: Story = {
  args: {
    children: (
      <div className="space-y-16">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Element Formazione
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
              Leader nella formazione sulla sicurezza sul lavoro e servizi di consulenza
            </p>
            <PublicButton size="lg" className="mr-4">
              Scopri i Corsi
            </PublicButton>
            <PublicButton variant="outline" size="lg">
              Richiedi Preventivo
            </PublicButton>
          </div>
        </section>

        {/* Services Section */}
        <section className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">I Nostri Servizi</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              'Corsi di Formazione',
              'Nomina RSPP',
              'Medico del Lavoro',
              'DVR',
              'Consulenza Sicurezza',
              'Audit e Verifiche'
            ].map((service, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">{service}</h3>
                <p className="text-gray-600 mb-4">
                  Descrizione del servizio offerto da Element Formazione.
                </p>
                <PublicButton variant="outline" size="sm">
                  Scopri di più
                </PublicButton>
              </div>
            ))}
          </div>
        </section>
      </div>
    ),
  },
};

/**
 * Layout con contenuto minimo
 */
export const MinimalContent: Story = {
  args: {
    children: (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-6">Pagina Semplice</h1>
        <p className="text-gray-600 mb-8">
          Contenuto minimo per testare il layout base.
        </p>
        <PublicButton>Azione Principale</PublicButton>
      </div>
    ),
  },
};

/**
 * Layout con contenuto lungo per test scroll
 */
export const LongContent: Story = {
  args: {
    children: (
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold mb-8">Pagina con Contenuto Lungo</h1>
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Sezione {i + 1}</h2>
            <p className="text-gray-600 mb-4">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod 
              tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, 
              quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>
            <p className="text-gray-600 mb-4">
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore 
              eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, 
              sunt in culpa qui officia deserunt mollit anim id est laborum.
            </p>
            {i % 3 === 0 && (
              <PublicButton variant="outline" className="mt-4">
                Azione Sezione {i + 1}
              </PublicButton>
            )}
          </div>
        ))}
      </div>
    ),
  },
};

/**
 * Layout con form di contatto
 */
export const ContactForm: Story = {
  args: {
    children: (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8">Contattaci</h1>
          <div className="bg-white p-8 rounded-lg shadow-md">
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Il tuo nome"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cognome
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Il tuo cognome"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="la-tua-email@esempio.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Messaggio
                </label>
                <textarea
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Il tuo messaggio..."
                />
              </div>
              <div className="text-center">
                <PublicButton size="lg" className="w-full md:w-auto">
                  Invia Messaggio
                </PublicButton>
              </div>
            </form>
          </div>
        </div>
      </div>
    ),
  },
};

/**
 * Layout su dispositivo mobile
 */
export const Mobile: Story = {
  ...Homepage,
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

/**
 * Layout su tablet
 */
export const Tablet: Story = {
  ...Homepage,
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
};

/**
 * Layout con classe CSS personalizzata
 */
export const CustomClassName: Story = {
  args: {
    className: 'bg-gradient-to-b from-blue-50 to-white',
    children: (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-6">Layout con Sfondo Personalizzato</h1>
        <p className="text-gray-600 mb-8">
          Questo layout ha una classe CSS personalizzata applicata al contenuto principale.
        </p>
        <PublicButton>Azione Principale</PublicButton>
      </div>
    ),
  },
};

/**
 * Layout per pagina di errore
 */
export const ErrorPage: Story = {
  args: {
    children: (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-md mx-auto">
          <div className="text-6xl mb-8">🔍</div>
          <h1 className="text-4xl font-bold mb-6">404</h1>
          <h2 className="text-2xl font-semibold mb-4">Pagina non trovata</h2>
          <p className="text-gray-600 mb-8">
            La pagina che stai cercando non esiste o è stata spostata.
          </p>
          <PublicButton size="lg">
            Torna alla Homepage
          </PublicButton>
        </div>
      </div>
    ),
  },
};