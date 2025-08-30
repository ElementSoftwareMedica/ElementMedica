import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../atoms/Button/Button';
import { colors } from '../tokens/colors';
import { spacing, borderRadius, shadows } from '../tokens/spacing';
import { 
  Plus,
  Settings,
  User
} from 'lucide-react';

const meta: Meta = {
  title: 'Design System/Overview',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Panoramica completa del Design System Element Formazione. Mostra tutti i componenti, tokens e pattern disponibili.',
      },
    },
  },
};

export default meta;

// Componente per mostrare una sezione del design system
const DesignSystemSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-12">
    <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">{title}</h2>
    {children}
  </div>
);

// Componente per mostrare una palette di colori compatta
const ColorShowcase = ({ title, palette, maxColors = 5 }: { title: string; palette: Record<string, string>; maxColors?: number }) => (
  <div className="mb-6">
    <h4 className="text-sm font-semibold text-gray-700 mb-3">{title}</h4>
    <div className="flex gap-2">
      {Object.entries(palette).slice(0, maxColors).map(([key, value]) => (
        <div key={key} className="text-center">
          <div
            className="w-12 h-12 rounded-lg border border-gray-200"
            style={{ backgroundColor: value }}
            title={`${key}: ${value}`}
          />
          <div className="text-xs text-gray-500 mt-1">{key}</div>
        </div>
      ))}
    </div>
  </div>
);

export const DesignSystemOverview: StoryObj = {
  render: () => (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Design System Element Formazione</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Sistema di design completo per garantire coerenza visiva e funzionale in tutto il frontend pubblico.
          Include tokens, componenti atomici, molecole e organismi.
        </p>
      </div>

      {/* Design Tokens */}
      <DesignSystemSection title="🎨 Design Tokens">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Colori</h3>
            <ColorShowcase title="Primari" palette={colors.primary} />
            <ColorShowcase title="Semantici - Success" palette={colors.semantic.success} />
            <ColorShowcase title="Semantici - Error" palette={colors.semantic.error} />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Spaziature</h3>
            <div className="space-y-2">
              {Object.entries(spacing).slice(0, 8).map(([key, value]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs font-mono w-8">{key}</span>
                  <div className="bg-blue-500 h-2" style={{ width: value }} />
                  <span className="text-xs text-gray-500">{value}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Border Radius & Shadows</h3>
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Border Radius</h4>
                <div className="flex gap-2">
                  {Object.entries(borderRadius).slice(0, 5).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <div
                        className="w-8 h-8 bg-blue-500"
                        style={{ borderRadius: value }}
                      />
                      <div className="text-xs text-gray-500 mt-1">{key}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Shadows</h4>
                <div className="flex gap-2">
                  {Object.entries(shadows).slice(1, 5).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <div
                        className="w-8 h-8 bg-white"
                        style={{ boxShadow: value }}
                      />
                      <div className="text-xs text-gray-500 mt-1">{key}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DesignSystemSection>

      {/* Tipografia */}
      <DesignSystemSection title="📝 Tipografia">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Headings</h3>
            <div className="space-y-2">
              <h1 className="text-4xl font-bold">Heading 1</h1>
              <h2 className="text-3xl font-bold">Heading 2</h2>
              <h3 className="text-2xl font-semibold">Heading 3</h3>
              <h4 className="text-xl font-semibold">Heading 4</h4>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Body Text</h3>
            <div className="space-y-2">
              <p className="text-lg">Large body text per introduzioni importanti</p>
              <p className="text-base">Base body text per contenuto principale</p>
              <p className="text-sm">Small text per dettagli secondari</p>
              <p className="text-xs text-gray-500">Extra small per note e disclaimer</p>
            </div>
          </div>
        </div>
      </DesignSystemSection>

      {/* Componenti Atomici */}
      <DesignSystemSection title="⚛️ Componenti Atomici">
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Buttons</h3>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <Button variant="primary">Primario</Button>
                <Button variant="secondary">Secondario</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
              
              <div className="flex flex-wrap items-center gap-4">
                <Button size="sm">Piccolo</Button>
                <Button size="md">Medio</Button>
                <Button size="lg">Grande</Button>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <Button leftIcon={<Plus size={16} />}>Con Icona</Button>
                <Button loading>Loading</Button>
                <Button disabled>Disabilitato</Button>
              </div>
            </div>
          </div>
        </div>
      </DesignSystemSection>

      {/* Esempi Pratici */}
      <DesignSystemSection title="🎯 Esempi Pratici">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Card Corso</h3>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                Sicurezza sui Luoghi di Lavoro
              </h4>
              <p className="text-sm text-gray-500 mb-3">Corso base • 8 ore</p>
              <p className="text-gray-700 mb-4">
                Corso fondamentale per la sicurezza nei luoghi di lavoro secondo le normative vigenti.
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">Dettagli</Button>
                <Button size="sm">Iscriviti</Button>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Form di Contatto</h3>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h4 className="text-xl font-semibold text-gray-900 mb-4">Richiedi Informazioni</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Il tuo nome"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input 
                    type="email" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="la-tua-email@esempio.com"
                  />
                </div>
                <Button fullWidth leftIcon={<User size={16} />}>
                  Invia Richiesta
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DesignSystemSection>

      {/* Footer */}
      <div className="text-center py-8 border-t border-gray-200">
        <p className="text-gray-600">
          Design System Element Formazione • Versione 1.0 • 
          <Button variant="ghost" size="sm" leftIcon={<Settings size={14} />} className="ml-2">
            Configurazioni
          </Button>
        </p>
      </div>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};