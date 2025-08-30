import type { Meta, StoryObj } from '@storybook/react';
import { BrowserRouter } from 'react-router-dom';
import { PublicHeader } from './PublicHeader';

const meta = {
  title: 'Public/Organisms/PublicHeader',
  component: PublicHeader,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Header pubblico per Element Formazione con menu sempre visibile e navigazione responsive.',
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
  tags: ['autodocs'],
} satisfies Meta<typeof PublicHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

// Story principale
export const Default: Story = {};

// Con contenuto sotto per mostrare il comportamento sticky
export const WithContent: Story = {
  render: () => (
    <BrowserRouter>
      <div>
        <PublicHeader />
        <div className="h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Contenuto della Pagina
            </h2>
            <p className="text-gray-600 mb-4">
              Questo contenuto dimostra come l'header rimane fisso in alto (sticky) 
              durante lo scroll della pagina.
            </p>
            <div className="space-y-4">
              {Array.from({ length: 20 }, (_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow-sm">
                  <h3 className="text-xl font-semibold mb-2">Sezione {i + 1}</h3>
                  <p className="text-gray-600">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
                    Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </BrowserRouter>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Header con contenuto per dimostrare il comportamento sticky durante lo scroll.',
      },
    },
  },
};

// Simulazione mobile (viewport ridotto)
export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Visualizzazione mobile con menu hamburger.',
      },
    },
  },
};

// Simulazione tablet
export const Tablet: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
    docs: {
      description: {
        story: 'Visualizzazione tablet con layout intermedio.',
      },
    },
  },
};

// Con diverse pagine attive (simulazione)
export const HomePage: Story = {
  decorators: [
    (Story) => (
      <BrowserRouter>
        <div style={{ '--initial-pathname': '/' } as React.CSSProperties}>
          <Story />
        </div>
      </BrowserRouter>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Header nella homepage con link "Home" attivo.',
      },
    },
  },
};

export const CoursesPage: Story = {
  decorators: [
    (Story) => (
      <BrowserRouter>
        <div>
          <Story />
          <div className="p-4 bg-blue-50">
            <p className="text-sm text-blue-600">
              💡 In una vera implementazione, il link "Corsi" sarebbe evidenziato 
              quando ci si trova nella pagina /corsi
            </p>
          </div>
        </div>
      </BrowserRouter>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Header nella pagina corsi.',
      },
    },
  },
};

// Variante con logo personalizzato
export const CustomLogo: Story = {
  render: () => (
    <BrowserRouter>
      <div>
        <header className="bg-white shadow-md sticky top-0 z-50">
          {/* Top bar con contatti */}
          <div className="bg-blue-600 text-white py-2">
            <div className="container mx-auto px-4">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <span>📞 +39 123 456 7890</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>✉️ info@elementformazione.it</span>
                  </div>
                </div>
                <div className="hidden md:block">
                  <span className="hover:text-blue-200 transition-colors cursor-pointer">
                    Area Riservata
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main header con logo personalizzato */}
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-xl">EF</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Element Formazione
                  </h1>
                  <p className="text-sm text-gray-600">
                    Sicurezza e Formazione Professionale
                  </p>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                Esempio con logo personalizzato
              </div>
            </div>
          </div>
        </header>
      </div>
    </BrowserRouter>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Variante con logo personalizzato e styling alternativo.',
      },
    },
  },
};

// Stato di caricamento/placeholder
export const Loading: Story = {
  render: () => (
    <BrowserRouter>
      <div>
        <header className="bg-white shadow-md sticky top-0 z-50">
          <div className="bg-gray-200 animate-pulse py-2">
            <div className="container mx-auto px-4">
              <div className="flex justify-between items-center">
                <div className="flex space-x-4">
                  <div className="h-4 bg-gray-300 rounded w-32"></div>
                  <div className="h-4 bg-gray-300 rounded w-40"></div>
                </div>
                <div className="h-4 bg-gray-300 rounded w-24"></div>
              </div>
            </div>
          </div>
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-300 rounded-full animate-pulse"></div>
                <div>
                  <div className="h-5 bg-gray-300 rounded w-40 mb-1"></div>
                  <div className="h-3 bg-gray-300 rounded w-48"></div>
                </div>
              </div>
              <div className="hidden lg:flex space-x-8">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="h-4 bg-gray-300 rounded w-16"></div>
                ))}
              </div>
              <div className="h-10 bg-gray-300 rounded-full w-32"></div>
            </div>
          </div>
        </header>
      </div>
    </BrowserRouter>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Stato di caricamento con skeleton loading.',
      },
    },
  },
};