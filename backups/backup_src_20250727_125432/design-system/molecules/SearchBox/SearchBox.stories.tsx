/**
 * Design System - SearchBox Stories
 * Week 8 Implementation - Component Library
 */

import type { Meta, StoryObj } from '@storybook/react';
import { SearchBox } from './SearchBox';
import { useState } from 'react';

const meta: Meta<typeof SearchBox> = {
  title: 'Design System/Molecules/SearchBox',
  component: SearchBox,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'SearchBox component per la ricerca con icone e funzionalità di clear. Supporta diversi size e stati.',
      },
    },
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Dimensione del search box',
    },
    clearable: {
      control: 'boolean',
      description: 'Mostra il pulsante per cancellare il testo',
    },
    loading: {
      control: 'boolean',
      description: 'Stato di caricamento',
    },
    disabled: {
      control: 'boolean',
      description: 'Stato disabilitato',
    },
    placeholder: {
      control: 'text',
      description: 'Testo placeholder',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SearchBox>;

// Default story
export const Default: Story = {
  args: {
    placeholder: 'Cerca...',
    size: 'md',
    clearable: true,
  },
};

// Size variants
export const Sizes: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Small</label>
        <SearchBox size="sm" placeholder="Cerca (small)" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Medium</label>
        <SearchBox size="md" placeholder="Cerca (medium)" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Large</label>
        <SearchBox size="lg" placeholder="Cerca (large)" />
      </div>
    </div>
  ),
};

// States
export const States: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Default</label>
        <SearchBox placeholder="Stato normale" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">With Value</label>
        <SearchBox defaultValue="Testo di ricerca" placeholder="Con valore" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Loading</label>
        <SearchBox loading placeholder="Caricamento..." />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Disabled</label>
        <SearchBox disabled placeholder="Disabilitato" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Not Clearable</label>
        <SearchBox clearable={false} defaultValue="Non cancellabile" />
      </div>
    </div>
  ),
};

// Interactive example
export const Interactive: Story = {
  render: () => {
    const [value, setValue] = useState('');
    const [results, setResults] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (searchValue: string) => {
      if (!searchValue.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      
      // Simulate API call
      setTimeout(() => {
        const mockResults = [
          `Risultato 1 per "${searchValue}"`,
          `Risultato 2 per "${searchValue}"`,
          `Risultato 3 per "${searchValue}"`,
        ];
        setResults(mockResults);
        setLoading(false);
      }, 1000);
    };

    const handleClear = () => {
      setValue('');
      setResults([]);
    };

    return (
      <div className="w-80">
        <SearchBox
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onSearch={handleSearch}
          onClear={handleClear}
          loading={loading}
          placeholder="Cerca e premi Invio..."
        />
        
        {results.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Risultati:</h4>
            <ul className="space-y-1">
              {results.map((result, index) => (
                <li key={index} className="text-sm text-gray-600">
                  {result}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  },
};

// Full width
export const FullWidth: Story = {
  render: () => (
    <div className="w-full max-w-2xl">
      <SearchBox 
        placeholder="Search box a larghezza completa" 
        containerClassName="w-full"
      />
    </div>
  ),
};