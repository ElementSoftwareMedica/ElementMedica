import type { Meta, StoryObj } from '@storybook/react';
import { ConsentBanner } from './ConsentBanner';
import { PublicBadge } from './PublicBadge';

const meta: Meta<typeof ConsentBanner> = {
  title: 'Public/ConsentBanner',
  component: ConsentBanner,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
Banner per la gestione dei consensi GDPR-compliant per il frontend pubblico.

## Caratteristiche
- **Design elegante**: Banner poco invasivo posizionato in basso
- **GDPR Compliant**: Gestione completa dei consensi privacy
- **Personalizzabile**: Pannello impostazioni per preferenze granulari
- **Responsive**: Ottimizzato per mobile e desktop
- **Accessibile**: Supporto completo per screen reader

## Funzionalità
- Cookie necessari sempre attivi
- Toggle per analytics e marketing
- Salvataggio preferenze in localStorage
- Inizializzazione servizi basata sui consensi
        `,
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ minHeight: '100vh', position: 'relative', backgroundColor: '#f8fafc' }}>
        <div className="p-8">
          <h1 className="text-3xl font-bold mb-4">Element Formazione</h1>
          <p className="text-gray-600 mb-8">
            Questa è una pagina di esempio per mostrare il banner consensi.
            Il banner appare in basso e non interferisce con il contenuto principale.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 6 }, (_, i) => (
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
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ConsentBanner>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Banner consensi standard con opzioni "Solo necessari" e "Accetta tutti".',
      },
    },
  },
};

export const WithCustomContent: Story = {
  decorators: [
    (Story) => {
      // Simula che non ci sia consenso salvato
      localStorage.removeItem('cookie-consent');
      return (
        <div style={{ minHeight: '100vh', position: 'relative', backgroundColor: '#f8fafc' }}>
          <div className="p-8">
            <h1 className="text-3xl font-bold mb-4">Homepage Element Formazione</h1>
            <div className="bg-blue-600 text-white p-6 rounded-lg mb-8">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold">Sicurezza sul Lavoro</h2>
                <PublicBadge variant="blue" size="sm">Leader</PublicBadge>
              </div>
              <p className="text-blue-100">
                Leader nella formazione professionale e consulenza per la sicurezza
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold mb-2">Corsi di Formazione</h3>
                <p className="text-gray-600">Primo soccorso, antincendio, sicurezza</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold mb-2">Consulenza RSPP</h3>
                <p className="text-gray-600">Servizi di consulenza specializzata</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold mb-2">Medico del Lavoro</h3>
                <p className="text-gray-600">Sorveglianza sanitaria completa</p>
              </div>
            </div>
          </div>
          <Story />
        </div>
      );
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Banner consensi mostrato su una homepage tipica con contenuto aziendale.',
      },
    },
  },
};

export const MobileView: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Vista mobile del banner consensi con layout ottimizzato per schermi piccoli.',
      },
    },
  },
  decorators: [
    (Story) => {
      localStorage.removeItem('cookie-consent');
      return (
        <div style={{ minHeight: '100vh', position: 'relative', backgroundColor: '#f8fafc' }}>
          <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Element Formazione</h1>
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h3 className="font-semibold mb-2">Corsi Sicurezza</h3>
                <p className="text-sm text-gray-600">Formazione professionale</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h3 className="font-semibold mb-2">Consulenza</h3>
                <p className="text-sm text-gray-600">RSPP e DVR</p>
              </div>
            </div>
          </div>
          <Story />
        </div>
      );
    },
  ],
};

export const TabletView: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
    docs: {
      description: {
        story: 'Vista tablet del banner consensi con layout intermedio.',
      },
    },
  },
  decorators: [
    (Story) => {
      localStorage.removeItem('cookie-consent');
      return (
        <div style={{ minHeight: '100vh', position: 'relative', backgroundColor: '#f8fafc' }}>
          <div className="p-6">
            <h1 className="text-3xl font-bold mb-6">Element Formazione</h1>
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="bg-white p-4 rounded-lg shadow-sm">
                  <h3 className="font-semibold mb-2">Servizio {i + 1}</h3>
                  <p className="text-sm text-gray-600">Descrizione del servizio</p>
                </div>
              ))}
            </div>
          </div>
          <Story />
        </div>
      );
    },
  ],
};

export const AlreadyAccepted: Story = {
  decorators: [
    (Story) => {
      // Simula consenso già dato
      localStorage.setItem('cookie-consent', JSON.stringify({
        necessary: true,
        analytics: true,
        marketing: false,
        timestamp: new Date().toISOString()
      }));
      return (
        <div style={{ minHeight: '100vh', position: 'relative', backgroundColor: '#f8fafc' }}>
          <div className="p-8">
            <h1 className="text-3xl font-bold mb-4">Pagina con Consenso Già Dato</h1>
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
              <strong>Info:</strong> Il banner cookie non viene mostrato perché l'utente ha già dato il consenso.
              Controlla localStorage per vedere le preferenze salvate.
            </div>
            <p className="text-gray-600">
              Quando l'utente ha già espresso le sue preferenze sui cookie, 
              il banner non viene più mostrato per non essere invasivo.
            </p>
          </div>
          <Story />
        </div>
      );
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Stato quando l\'utente ha già dato il consenso - il banner non viene mostrato.',
      },
    },
  },
};

export const SettingsPanel: Story = {
  decorators: [
    (Story) => {
      localStorage.removeItem('cookie-consent');
      // Forza la visualizzazione del pannello impostazioni
      return (
        <div style={{ minHeight: '100vh', position: 'relative', backgroundColor: '#f8fafc' }}>
          <div className="p-8">
            <h1 className="text-3xl font-bold mb-4">Pannello Impostazioni Cookie</h1>
            <p className="text-gray-600 mb-8">
              Clicca su "Personalizza le preferenze" nel banner per vedere il pannello dettagliato.
            </p>
            <div className="border border-gray-200 px-4 py-3 rounded bg-gray-50">
              <PublicBadge variant="blue" size="sm" className="mr-2">Tip</PublicBadge>
              Il pannello impostazioni permette di controllare granularmente 
              ogni categoria di cookie.
            </div>
          </div>
          <Story />
        </div>
      );
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Pannello impostazioni dettagliato per la gestione granulare dei cookie.',
      },
    },
  },
};