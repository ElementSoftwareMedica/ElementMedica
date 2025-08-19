import type { Meta, StoryObj } from '@storybook/react';
import { BrowserRouter } from 'react-router-dom';
import { PublicFooter } from './PublicFooter';

const meta: Meta<typeof PublicFooter> = {
  title: 'Public/PublicFooter',
  component: PublicFooter,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Footer pubblico per Element Formazione con informazioni aziendali, contatti e link utili.',
      },
    },
  },
  decorators: [
    (Story) => (
      <BrowserRouter>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, backgroundColor: '#f3f4f6', padding: '2rem' }}>
            <h1 style={{ textAlign: 'center', color: '#374151' }}>
              Contenuto della pagina
            </h1>
            <p style={{ textAlign: 'center', color: '#6b7280' }}>
              Il footer apparirà in fondo alla pagina
            </p>
          </div>
          <Story />
        </div>
      </BrowserRouter>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PublicFooter>;

/**
 * Footer standard con tutte le sezioni
 */
export const Default: Story = {};

/**
 * Footer in una pagina con contenuto minimo
 */
export const WithMinimalContent: Story = {
  decorators: [
    (Story) => (
      <BrowserRouter>
        <div style={{ minHeight: '50vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, backgroundColor: '#f9fafb', padding: '1rem' }}>
            <h2 style={{ textAlign: 'center', color: '#374151', margin: 0 }}>
              Pagina con poco contenuto
            </h2>
          </div>
          <Story />
        </div>
      </BrowserRouter>
    ),
  ],
};

/**
 * Footer in una pagina con molto contenuto
 */
export const WithLongContent: Story = {
  decorators: [
    (Story) => (
      <BrowserRouter>
        <div>
          <div style={{ backgroundColor: '#f3f4f6', padding: '2rem' }}>
            <h1 style={{ textAlign: 'center', color: '#374151' }}>
              Pagina con contenuto lungo
            </h1>
            {Array.from({ length: 20 }, (_, i) => (
              <p key={i} style={{ color: '#6b7280', margin: '1rem 0' }}>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod 
                tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, 
                quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
            ))}
          </div>
          <Story />
        </div>
      </BrowserRouter>
    ),
  ],
};

/**
 * Footer su dispositivo mobile
 */
export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

/**
 * Footer su tablet
 */
export const Tablet: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
};

/**
 * Footer con focus sui link per test accessibilità
 */
export const AccessibilityFocus: Story = {
  decorators: [
    (Story) => (
      <BrowserRouter>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, backgroundColor: '#f3f4f6', padding: '2rem' }}>
            <h1 style={{ textAlign: 'center', color: '#374151' }}>
              Test Accessibilità Footer
            </h1>
            <p style={{ textAlign: 'center', color: '#6b7280' }}>
              Usa Tab per navigare tra i link del footer
            </p>
          </div>
          <Story />
        </div>
      </BrowserRouter>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Testa la navigazione tramite tastiera e l\'accessibilità dei link.',
      },
    },
  },
};

/**
 * Footer isolato per design review
 */
export const DesignReview: Story = {
  decorators: [
    (Story) => (
      <BrowserRouter>
        <div style={{ backgroundColor: '#e5e7eb', padding: '2rem' }}>
          <Story />
        </div>
      </BrowserRouter>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Footer isolato per review del design e dei colori.',
      },
    },
  },
};

/**
 * Footer con tema scuro per contrasto
 */
export const DarkThemeContrast: Story = {
  decorators: [
    (Story) => (
      <BrowserRouter>
        <div style={{ backgroundColor: '#111827', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, padding: '2rem' }}>
            <h1 style={{ textAlign: 'center', color: '#f9fafb' }}>
              Pagina con tema scuro
            </h1>
            <p style={{ textAlign: 'center', color: '#d1d5db' }}>
              Test del contrasto del footer su sfondo scuro
            </p>
          </div>
          <Story />
        </div>
      </BrowserRouter>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Testa il contrasto del footer su una pagina con tema scuro.',
      },
    },
  },
};