import type { Meta, StoryObj } from '@storybook/react';
import { colors } from '../tokens/colors';

const meta: Meta = {
  title: 'Design System/Tokens/Colors',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Sistema di colori per Element Formazione. Include colori primari, secondari, semantici e neutrali con tutte le sfumature.',
      },
    },
  },
};

export default meta;

// Componente per visualizzare una palette di colori
const ColorPalette = ({ title, palette }: { title: string; palette: Record<string, string> }) => (
  <div className="mb-8">
    <h3 className="text-lg font-semibold mb-4">{title}</h3>
    <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-4">
      {Object.entries(palette).map(([key, value]) => (
        <div key={key} className="text-center">
          <div
            className="w-16 h-16 rounded-lg border border-gray-200 mb-2 mx-auto"
            style={{ backgroundColor: value }}
          />
          <div className="text-xs font-mono text-gray-600">{key}</div>
          <div className="text-xs font-mono text-gray-500">{value}</div>
        </div>
      ))}
    </div>
  </div>
);

export const Primary: StoryObj = {
  render: () => <ColorPalette title="Colori Primari" palette={colors.primary} />,
};

export const Secondary: StoryObj = {
  render: () => <ColorPalette title="Colori Secondari" palette={colors.secondary} />,
};

export const Success: StoryObj = {
  render: () => <ColorPalette title="Colori Success" palette={colors.semantic.success} />,
};

export const Warning: StoryObj = {
  render: () => <ColorPalette title="Colori Warning" palette={colors.semantic.warning} />,
};

export const Error: StoryObj = {
  render: () => <ColorPalette title="Colori Error" palette={colors.semantic.error} />,
};

export const Neutral: StoryObj = {
  render: () => <ColorPalette title="Colori Neutrali" palette={colors.neutral} />,
};

export const AllColors: StoryObj = {
  render: () => (
    <div>
      <ColorPalette title="Colori Primari" palette={colors.primary} />
      <ColorPalette title="Colori Secondari" palette={colors.secondary} />
      <ColorPalette title="Success" palette={colors.semantic.success} />
      <ColorPalette title="Warning" palette={colors.semantic.warning} />
      <ColorPalette title="Error" palette={colors.semantic.error} />
      <ColorPalette title="Info" palette={colors.semantic.info} />
      <ColorPalette title="Neutrali" palette={colors.neutral} />
    </div>
  ),
};