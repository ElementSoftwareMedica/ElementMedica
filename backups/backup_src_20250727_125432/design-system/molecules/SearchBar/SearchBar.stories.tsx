import type { Meta, StoryObj } from '@storybook/react';
import { SearchBar } from './SearchBar';
import { useState } from 'react';

const meta: Meta<typeof SearchBar> = {
  title: 'Design System/Molecules/SearchBar',
  component: SearchBar,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A search input component with optional search button and clear functionality.',
      },
    },
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    onSearch: { action: 'searched' },
    onChange: { action: 'changed' },
  },
};

export default meta;
type Story = StoryObj<typeof SearchBar>;

export const Default: Story = {
  args: {
    placeholder: 'Cerca...',
  },
};

export const WithButton: Story = {
  args: {
    placeholder: 'Cerca prodotti...',
    showButton: true,
  },
};

export const WithoutButton: Story = {
  args: {
    placeholder: 'Cerca...',
    showButton: false,
  },
};

export const SearchOnType: Story = {
  args: {
    placeholder: 'Cerca in tempo reale...',
    searchOnType: true,
    showButton: false,
    debounceMs: 500,
  },
};

export const Small: Story = {
  args: {
    placeholder: 'Cerca...',
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    placeholder: 'Cerca...',
    size: 'lg',
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'Cerca...',
    disabled: true,
    value: 'Testo disabilitato',
  },
};

export const WithoutClearButton: Story = {
  args: {
    placeholder: 'Cerca...',
    showClearButton: false,
    value: 'Testo senza clear',
  },
};

export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState('Valore controllato');
    
    return (
      <div className="space-y-4">
        <SearchBar
          {...args}
          value={value}
          onChange={setValue}
          onSearch={(searchValue) => {
            console.log('Searching for:', searchValue);
          }}
        />
        <p className="text-sm text-gray-600">
          Valore corrente: <code>{value}</code>
        </p>
      </div>
    );
  },
  args: {
    placeholder: 'Componente controllato...',
  },
};

export const WithCustomStyling: Story = {
  args: {
    placeholder: 'Cerca con stile personalizzato...',
    className: 'max-w-md border-2 border-blue-300 rounded-lg',
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Small</h3>
        <SearchBar size="sm" placeholder="Piccola..." />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Medium (Default)</h3>
        <SearchBar size="md" placeholder="Media..." />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Large</h3>
        <SearchBar size="lg" placeholder="Grande..." />
      </div>
    </div>
  ),
};

export const InteractiveExample: Story = {
  render: () => {
    const [searchResults, setSearchResults] = useState<string[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    
    const mockData = [
      'Apple iPhone 14',
      'Samsung Galaxy S23',
      'Google Pixel 7',
      'OnePlus 11',
      'Xiaomi Mi 13',
      'Huawei P50',
    ];
    
    const handleSearch = (query: string) => {
      setIsSearching(true);
      
      // Simulate API call
      setTimeout(() => {
        const results = mockData.filter(item => 
          item.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(results);
        setIsSearching(false);
      }, 500);
    };
    
    return (
      <div className="w-96 space-y-4">
        <SearchBar
          placeholder="Cerca smartphone..."
          onSearch={handleSearch}
          searchOnType
          debounceMs={300}
        />
        
        {isSearching && (
          <div className="text-sm text-gray-500">Ricerca in corso...</div>
        )}
        
        {searchResults.length > 0 && (
          <div className="border rounded-lg p-3">
            <h4 className="font-medium mb-2">Risultati ({searchResults.length}):</h4>
            <ul className="space-y-1">
              {searchResults.map((result, index) => (
                <li key={index} className="text-sm text-gray-700">
                  {result}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {!isSearching && searchResults.length === 0 && (
          <div className="text-sm text-gray-500">
            Nessun risultato trovato
          </div>
        )}
      </div>
    );
  },
};