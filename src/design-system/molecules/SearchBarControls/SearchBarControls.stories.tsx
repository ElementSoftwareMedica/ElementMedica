import type { Meta, StoryObj } from '@storybook/react';
import { SearchBarControls } from './SearchBarControls';
import { useState } from 'react';

const meta: Meta<typeof SearchBarControls> = {
  title: 'Design System/Molecules/SearchBarControls',
  component: SearchBarControls,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onSearch: { action: 'searched' },
    onFilterChange: { action: 'filter changed' },
    onSortChange: { action: 'sort changed' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Template per gestire lo stato
const Template = (args: any) => {
  const [searchValue, setSearchValue] = useState(args.searchValue || '');
  const [activeFilters, setActiveFilters] = useState(args.activeFilters || {});
  const [activeSort, setActiveSort] = useState(args.activeSort || null);
  
  return (
    <SearchBarControls
      {...args}
      searchValue={searchValue}
      onSearch={(value) => {
        setSearchValue(value);
        args.onSearch(value);
      }}
      activeFilters={activeFilters}
      onFilterChange={(filters) => {
        setActiveFilters(filters);
        args.onFilterChange(filters);
      }}
      activeSort={activeSort}
      onSortChange={(sort) => {
        setActiveSort(sort);
        args.onSortChange(sort);
      }}
    />
  );
};

export const Default: Story = {
  render: Template,
  args: {
    placeholder: 'Cerca...',
  },
};

export const WithFilters: Story = {
  render: Template,
  args: {
    placeholder: 'Cerca corsi...',
    filterOptions: [
      {
        key: 'status',
        label: 'Stato',
        options: [
          { value: 'active', label: 'Attivo' },
          { value: 'inactive', label: 'Inattivo' },
          { value: 'draft', label: 'Bozza' },
        ],
      },
      {
        key: 'category',
        label: 'Categoria',
        options: [
          { value: 'tech', label: 'Tecnologia' },
          { value: 'business', label: 'Business' },
          { value: 'design', label: 'Design' },
        ],
      },
    ],
  },
};

export const WithSort: Story = {
  render: Template,
  args: {
    placeholder: 'Cerca elementi...',
    sortOptions: [
      { value: 'name', label: 'Nome' },
      { value: 'date', label: 'Data' },
      { value: 'status', label: 'Stato' },
    ],
  },
};

export const WithFiltersAndSort: Story = {
  render: Template,
  args: {
    placeholder: 'Cerca elementi...',
    filterOptions: [
      {
        key: 'status',
        label: 'Stato',
        options: [
          { value: 'active', label: 'Attivo' },
          { value: 'inactive', label: 'Inattivo' },
        ],
      },
    ],
    sortOptions: [
      { value: 'name', label: 'Nome' },
      { value: 'date', label: 'Data' },
    ],
  },
};

export const WithActiveFilters: Story = {
  render: Template,
  args: {
    placeholder: 'Cerca elementi...',
    filterOptions: [
      {
        key: 'status',
        label: 'Stato',
        options: [
          { value: 'active', label: 'Attivo' },
          { value: 'inactive', label: 'Inattivo' },
        ],
      },
    ],
    activeFilters: {
      status: 'active',
    },
  },
};

export const WithCustomClass: Story = {
  render: Template,
  args: {
    placeholder: 'Cerca...',
    className: 'w-96 border-2 border-blue-200',
  },
};