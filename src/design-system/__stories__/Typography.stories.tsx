import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = {
  title: 'Design System/Tokens/Typography',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Sistema tipografico per Element Formazione. Include font families, sizes, weights e line heights.',
      },
    },
  },
};

export default meta;

// Componente per visualizzare scale tipografiche
const TypographyScale = ({ title, samples }: { title: string; samples: Array<{ name: string; className: string; description: string }> }) => (
  <div className="mb-8">
    <h3 className="text-lg font-semibold mb-4">{title}</h3>
    <div className="space-y-4">
      {samples.map((sample) => (
        <div key={sample.name} className="border-b border-gray-200 pb-4">
          <div className="flex items-baseline gap-4 mb-2">
            <span className="text-sm font-mono text-gray-600 w-20">{sample.name}</span>
            <span className="text-xs text-gray-500">{sample.description}</span>
          </div>
          <div className={sample.className}>
            The quick brown fox jumps over the lazy dog
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const Headings: StoryObj = {
  render: () => (
    <TypographyScale
      title="Headings"
      samples={[
        { name: 'H1', className: 'text-4xl font-bold', description: '36px / Bold' },
        { name: 'H2', className: 'text-3xl font-bold', description: '30px / Bold' },
        { name: 'H3', className: 'text-2xl font-semibold', description: '24px / Semibold' },
        { name: 'H4', className: 'text-xl font-semibold', description: '20px / Semibold' },
        { name: 'H5', className: 'text-lg font-medium', description: '18px / Medium' },
        { name: 'H6', className: 'text-base font-medium', description: '16px / Medium' },
      ]}
    />
  ),
};

export const BodyText: StoryObj = {
  render: () => (
    <TypographyScale
      title="Body Text"
      samples={[
        { name: 'Large', className: 'text-lg', description: '18px / Regular' },
        { name: 'Base', className: 'text-base', description: '16px / Regular' },
        { name: 'Small', className: 'text-sm', description: '14px / Regular' },
        { name: 'XSmall', className: 'text-xs', description: '12px / Regular' },
      ]}
    />
  ),
};

export const FontWeights: StoryObj = {
  render: () => (
    <TypographyScale
      title="Font Weights"
      samples={[
        { name: 'Light', className: 'text-lg font-light', description: '300' },
        { name: 'Regular', className: 'text-lg font-normal', description: '400' },
        { name: 'Medium', className: 'text-lg font-medium', description: '500' },
        { name: 'Semibold', className: 'text-lg font-semibold', description: '600' },
        { name: 'Bold', className: 'text-lg font-bold', description: '700' },
      ]}
    />
  ),
};

export const SpecialText: StoryObj = {
  render: () => (
    <TypographyScale
      title="Special Text"
      samples={[
        { name: 'Code', className: 'font-mono text-sm bg-gray-100 px-2 py-1 rounded', description: 'Monospace / 14px' },
        { name: 'Caption', className: 'text-xs text-gray-500 uppercase tracking-wide', description: 'Uppercase / 12px / Tracking' },
        { name: 'Link', className: 'text-blue-600 underline hover:text-blue-800', description: 'Blue / Underline' },
        { name: 'Muted', className: 'text-gray-500', description: 'Gray 500' },
      ]}
    />
  ),
};

export const AllTypography: StoryObj = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-6">Sistema Tipografico Element Formazione</h2>
        <p className="text-gray-600 mb-8">
          Questo sistema tipografico garantisce coerenza e leggibilità in tutto il frontend pubblico.
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-semibold mb-4">Headings</h3>
          <h1 className="text-4xl font-bold mb-2">Heading 1</h1>
          <h2 className="text-3xl font-bold mb-2">Heading 2</h2>
          <h3 className="text-2xl font-semibold mb-2">Heading 3</h3>
          <h4 className="text-xl font-semibold mb-2">Heading 4</h4>
          <h5 className="text-lg font-medium mb-2">Heading 5</h5>
          <h6 className="text-base font-medium">Heading 6</h6>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-4">Body Text</h3>
          <p className="text-lg mb-2">Large body text per introduzioni</p>
          <p className="text-base mb-2">Base body text per contenuto principale</p>
          <p className="text-sm mb-2">Small text per dettagli secondari</p>
          <p className="text-xs">Extra small per note e disclaimer</p>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-4">Esempi Pratici</h3>
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Corso di Sicurezza sui Luoghi di Lavoro</h2>
          <p className="text-sm text-gray-500 mb-4">Pubblicato il 15 Gennaio 2025</p>
          <p className="text-base text-gray-700 mb-4">
            Questo corso fornisce le competenze necessarie per garantire la sicurezza nei luoghi di lavoro,
            in conformità con le normative vigenti.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-blue-600">Durata: 8 ore</span>
            <span className="text-sm text-gray-500">•</span>
            <span className="text-sm font-medium text-green-600">Disponibile</span>
          </div>
        </div>
      </div>
    </div>
  ),
};