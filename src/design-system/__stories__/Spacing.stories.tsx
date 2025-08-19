import type { Meta, StoryObj } from '@storybook/react';
import { spacing, semanticSpacing, borderRadius, shadows } from '../tokens/spacing';

const meta: Meta = {
  title: 'Design System/Tokens/Spacing',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Sistema di spaziature per Element Formazione. Include spacing, border radius e shadows.',
      },
    },
  },
};

export default meta;

// Componente per visualizzare spacing
const SpacingScale = ({ title, scale }: { title: string; scale: Record<string, string> }) => (
  <div className="mb-8">
    <h3 className="text-lg font-semibold mb-4">{title}</h3>
    <div className="space-y-2">
      {Object.entries(scale).map(([key, value]) => (
        <div key={key} className="flex items-center gap-4">
          <div className="w-16 text-sm font-mono text-gray-600">{key}</div>
          <div className="w-20 text-sm font-mono text-gray-500">{value}</div>
          <div
            className="bg-blue-500 h-4"
            style={{ width: value }}
          />
        </div>
      ))}
    </div>
  </div>
);

// Componente per visualizzare border radius
const BorderRadiusScale = ({ title, scale }: { title: string; scale: Record<string, string> }) => (
  <div className="mb-8">
    <h3 className="text-lg font-semibold mb-4">{title}</h3>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Object.entries(scale).map(([key, value]) => (
        <div key={key} className="text-center">
          <div
            className="w-16 h-16 bg-blue-500 mx-auto mb-2"
            style={{ borderRadius: value }}
          />
          <div className="text-xs font-mono text-gray-600">{key}</div>
          <div className="text-xs font-mono text-gray-500">{value}</div>
        </div>
      ))}
    </div>
  </div>
);

// Componente per visualizzare shadows
const ShadowScale = ({ title, scale }: { title: string; scale: Record<string, string> }) => (
  <div className="mb-8">
    <h3 className="text-lg font-semibold mb-4">{title}</h3>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {Object.entries(scale).map(([key, value]) => (
        <div key={key} className="text-center">
          <div
            className="w-16 h-16 bg-white mx-auto mb-2"
            style={{ boxShadow: value }}
          />
          <div className="text-xs font-mono text-gray-600">{key}</div>
          <div className="text-xs font-mono text-gray-500 break-all">{value}</div>
        </div>
      ))}
    </div>
  </div>
);

export const BaseSpacing: StoryObj = {
  render: () => <SpacingScale title="Spacing Base" scale={spacing} />,
};

export const ComponentSpacing: StoryObj = {
  render: () => <SpacingScale title="Component Spacing" scale={semanticSpacing.component} />,
};

export const LayoutSpacing: StoryObj = {
  render: () => <SpacingScale title="Layout Spacing" scale={semanticSpacing.layout} />,
};

export const BorderRadius: StoryObj = {
  render: () => <BorderRadiusScale title="Border Radius" scale={borderRadius} />,
};

export const Shadows: StoryObj = {
  render: () => <ShadowScale title="Shadows" scale={shadows} />,
};

export const AllSpacing: StoryObj = {
  render: () => (
    <div>
      <SpacingScale title="Spacing Base (primi 12)" scale={
        Object.fromEntries(Object.entries(spacing).slice(0, 12))
      } />
      <SpacingScale title="Component Spacing" scale={semanticSpacing.component} />
      <SpacingScale title="Layout Spacing" scale={semanticSpacing.layout} />
      <BorderRadiusScale title="Border Radius" scale={borderRadius} />
      <ShadowScale title="Shadows" scale={shadows} />
    </div>
  ),
};