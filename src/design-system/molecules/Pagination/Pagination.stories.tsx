import type { Meta, StoryObj } from '@storybook/react';
import { Pagination } from './Pagination';
import { fn } from '@storybook/test';

const meta: Meta<typeof Pagination> = {
  title: 'Design System/Molecules/Pagination',
  component: Pagination,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
Componente Pagination per navigare tra pagine di contenuto.

## Caratteristiche
- Navigazione con numeri di pagina
- Pulsanti precedente/successivo
- Ellipsis per pagine non adiacenti
- Selettore dimensione pagina opzionale
- Informazioni sul totale elementi
- Responsive design

## Utilizzo
Utilizza questo componente quando hai contenuto paginato da navigare.
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    currentPage: {
      control: { type: 'number', min: 1 },
      description: 'Pagina corrente (1-based)',
    },
    totalPages: {
      control: { type: 'number', min: 1 },
      description: 'Numero totale di pagine',
    },
    siblingCount: {
      control: { type: 'number', min: 0, max: 3 },
      description: 'Numero di pagine adiacenti da mostrare',
    },
    pageSize: {
      control: { type: 'number', min: 1 },
      description: 'Dimensione della pagina corrente',
    },
    totalItems: {
      control: { type: 'number', min: 0 },
      description: 'Numero totale di elementi',
    },
    showInfo: {
      control: 'boolean',
      description: 'Se mostrare le informazioni sul totale',
    },
    showPageSizeSelector: {
      control: 'boolean',
      description: 'Se mostrare il selettore dimensione pagina',
    },
  },
  args: {
    onPageChange: fn(),
    onPageSizeChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Storia base
export const Default: Story = {
  args: {
    currentPage: 1,
    totalPages: 10,
  },
};

// Con molte pagine
export const ManyPages: Story = {
  args: {
    currentPage: 15,
    totalPages: 50,
    siblingCount: 1,
  },
};

// Con informazioni complete
export const WithInfo: Story = {
  args: {
    currentPage: 3,
    totalPages: 20,
    pageSize: 25,
    totalItems: 487,
    showInfo: true,
    showPageSizeSelector: true,
    pageSizeOptions: [10, 25, 50, 100],
  },
};

// Poche pagine
export const FewPages: Story = {
  args: {
    currentPage: 2,
    totalPages: 5,
  },
};

// Prima pagina
export const FirstPage: Story = {
  args: {
    currentPage: 1,
    totalPages: 10,
    pageSize: 20,
    totalItems: 200,
    showInfo: true,
  },
};

// Ultima pagina
export const LastPage: Story = {
  args: {
    currentPage: 10,
    totalPages: 10,
    pageSize: 20,
    totalItems: 200,
    showInfo: true,
  },
};

// Pagina singola
export const SinglePage: Story = {
  args: {
    currentPage: 1,
    totalPages: 1,
    pageSize: 50,
    totalItems: 25,
    showInfo: true,
  },
};

// Con selettore dimensione pagina
export const WithPageSizeSelector: Story = {
  args: {
    currentPage: 5,
    totalPages: 25,
    pageSize: 25,
    totalItems: 612,
    showInfo: true,
    showPageSizeSelector: true,
    pageSizeOptions: [10, 25, 50, 100],
  },
};

// Molti siblings
export const ManySiblings: Story = {
  args: {
    currentPage: 10,
    totalPages: 30,
    siblingCount: 3,
  },
};

// Responsive (mobile)
export const Mobile: Story = {
  args: {
    currentPage: 5,
    totalPages: 15,
    pageSize: 10,
    totalItems: 147,
    showInfo: true,
    showPageSizeSelector: true,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};