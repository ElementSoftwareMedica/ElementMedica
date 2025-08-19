/**
 * Design System - Icon Component Stories
 * Week 8 Implementation - Component Library
 */

import type { Meta, StoryObj } from '@storybook/react';
import {
  Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  XIcon,
  CheckIcon,
  SearchIcon,
  EditIcon,
  DeleteIcon,
  LoadingIcon,
  HomeIcon,
  UserIcon,
  SettingsIcon
} from './Icon';

const meta: Meta<typeof Icon> = {
  title: 'Design System/Atoms/Icon',
  component: Icon,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Icon component for displaying SVG icons with consistent styling. Supports various sizes, colors, and interactive states.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    name: {
      control: 'select',
      options: [
        'chevron-down', 'chevron-up', 'chevron-left', 'chevron-right',
        'arrow-down', 'arrow-up', 'arrow-left', 'arrow-right',
        'plus', 'minus', 'x', 'check',
        'search', 'filter', 'edit', 'delete', 'trash',
        'eye', 'eye-off', 'heart', 'star', 'bookmark',
        'share', 'download', 'upload', 'copy', 'external-link',
        'home', 'user', 'users', 'settings', 'bell', 'mail', 'phone',
        'calendar', 'clock', 'map-pin', 'globe',
        'lock', 'unlock', 'key', 'shield',
        'alert-circle', 'alert-triangle', 'info', 'help-circle', 'question-mark',
        'loading', 'refresh'
      ]
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'base', 'lg', 'xl', '2xl']
    },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'muted', 'error', 'warning', 'success', 'info', 'inherit']
    },
    clickable: {
      control: 'boolean'
    },
    spin: {
      control: 'boolean'
    },
    rotate: {
      control: 'number',
      min: 0,
      max: 360,
      step: 45
    }
  }
};

export default meta;
type Story = StoryObj<typeof Icon>;

// Default story
export const Default: Story = {
  args: {
    name: 'home',
    size: 'base',
    color: 'inherit'
  }
};

// All sizes
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <div className="text-center">
        <Icon name="star" size="xs" />
        <div className="text-xs mt-1">xs</div>
      </div>
      <div className="text-center">
        <Icon name="star" size="sm" />
        <div className="text-xs mt-1">sm</div>
      </div>
      <div className="text-center">
        <Icon name="star" size="base" />
        <div className="text-xs mt-1">base</div>
      </div>
      <div className="text-center">
        <Icon name="star" size="lg" />
        <div className="text-xs mt-1">lg</div>
      </div>
      <div className="text-center">
        <Icon name="star" size="xl" />
        <div className="text-xs mt-1">xl</div>
      </div>
      <div className="text-center">
        <Icon name="star" size="2xl" />
        <div className="text-xs mt-1">2xl</div>
      </div>
    </div>
  )
};

// All colors
export const Colors: Story = {
  render: () => (
    <div className="grid grid-cols-4 gap-4">
      <div className="text-center">
        <Icon name="heart" color="primary" size="lg" />
        <div className="text-xs mt-1">primary</div>
      </div>
      <div className="text-center">
        <Icon name="heart" color="secondary" size="lg" />
        <div className="text-xs mt-1">secondary</div>
      </div>
      <div className="text-center">
        <Icon name="heart" color="muted" size="lg" />
        <div className="text-xs mt-1">muted</div>
      </div>
      <div className="text-center">
        <Icon name="heart" color="error" size="lg" />
        <div className="text-xs mt-1">error</div>
      </div>
      <div className="text-center">
        <Icon name="heart" color="warning" size="lg" />
        <div className="text-xs mt-1">warning</div>
      </div>
      <div className="text-center">
        <Icon name="heart" color="success" size="lg" />
        <div className="text-xs mt-1">success</div>
      </div>
      <div className="text-center">
        <Icon name="heart" color="info" size="lg" />
        <div className="text-xs mt-1">info</div>
      </div>
      <div className="text-center bg-blue-600 p-2 rounded">
        <Icon name="heart" color="inherit" size="lg" className="text-white" />
        <div className="text-xs mt-1 text-white">inherit</div>
      </div>
    </div>
  )
};

// Navigation icons
export const NavigationIcons: Story = {
  render: () => (
    <div className="grid grid-cols-8 gap-4">
      <div className="text-center">
        <Icon name="chevron-up" size="lg" />
        <div className="text-xs mt-1">chevron-up</div>
      </div>
      <div className="text-center">
        <Icon name="chevron-down" size="lg" />
        <div className="text-xs mt-1">chevron-down</div>
      </div>
      <div className="text-center">
        <Icon name="chevron-left" size="lg" />
        <div className="text-xs mt-1">chevron-left</div>
      </div>
      <div className="text-center">
        <Icon name="chevron-right" size="lg" />
        <div className="text-xs mt-1">chevron-right</div>
      </div>
      <div className="text-center">
        <Icon name="arrow-up" size="lg" />
        <div className="text-xs mt-1">arrow-up</div>
      </div>
      <div className="text-center">
        <Icon name="arrow-down" size="lg" />
        <div className="text-xs mt-1">arrow-down</div>
      </div>
      <div className="text-center">
        <Icon name="arrow-left" size="lg" />
        <div className="text-xs mt-1">arrow-left</div>
      </div>
      <div className="text-center">
        <Icon name="arrow-right" size="lg" />
        <div className="text-xs mt-1">arrow-right</div>
      </div>
    </div>
  )
};

// Action icons
export const ActionIcons: Story = {
  render: () => (
    <div className="grid grid-cols-8 gap-4">
      <div className="text-center">
        <Icon name="plus" size="lg" />
        <div className="text-xs mt-1">plus</div>
      </div>
      <div className="text-center">
        <Icon name="minus" size="lg" />
        <div className="text-xs mt-1">minus</div>
      </div>
      <div className="text-center">
        <Icon name="x" size="lg" />
        <div className="text-xs mt-1">x</div>
      </div>
      <div className="text-center">
        <Icon name="check" size="lg" color="success" />
        <div className="text-xs mt-1">check</div>
      </div>
      <div className="text-center">
        <Icon name="edit" size="lg" />
        <div className="text-xs mt-1">edit</div>
      </div>
      <div className="text-center">
        <Icon name="delete" size="lg" color="error" />
        <div className="text-xs mt-1">delete</div>
      </div>
      <div className="text-center">
        <Icon name="search" size="lg" />
        <div className="text-xs mt-1">search</div>
      </div>
      <div className="text-center">
        <Icon name="filter" size="lg" />
        <div className="text-xs mt-1">filter</div>
      </div>
    </div>
  )
};

// Interface icons
export const InterfaceIcons: Story = {
  render: () => (
    <div className="grid grid-cols-8 gap-4">
      <div className="text-center">
        <Icon name="home" size="lg" />
        <div className="text-xs mt-1">home</div>
      </div>
      <div className="text-center">
        <Icon name="user" size="lg" />
        <div className="text-xs mt-1">user</div>
      </div>
      <div className="text-center">
        <Icon name="users" size="lg" />
        <div className="text-xs mt-1">users</div>
      </div>
      <div className="text-center">
        <Icon name="settings" size="lg" />
        <div className="text-xs mt-1">settings</div>
      </div>
      <div className="text-center">
        <Icon name="bell" size="lg" />
        <div className="text-xs mt-1">bell</div>
      </div>
      <div className="text-center">
        <Icon name="mail" size="lg" />
        <div className="text-xs mt-1">mail</div>
      </div>
      <div className="text-center">
        <Icon name="calendar" size="lg" />
        <div className="text-xs mt-1">calendar</div>
      </div>
      <div className="text-center">
        <Icon name="clock" size="lg" />
        <div className="text-xs mt-1">clock</div>
      </div>
    </div>
  )
};

// Status icons
export const StatusIcons: Story = {
  render: () => (
    <div className="grid grid-cols-6 gap-4">
      <div className="text-center">
        <Icon name="alert-circle" size="lg" color="error" />
        <div className="text-xs mt-1">alert-circle</div>
      </div>
      <div className="text-center">
        <Icon name="alert-triangle" size="lg" color="warning" />
        <div className="text-xs mt-1">alert-triangle</div>
      </div>
      <div className="text-center">
        <Icon name="info" size="lg" color="info" />
        <div className="text-xs mt-1">info</div>
      </div>
      <div className="text-center">
        <Icon name="help-circle" size="lg" color="secondary" />
        <div className="text-xs mt-1">help-circle</div>
      </div>
      <div className="text-center">
        <Icon name="check" size="lg" color="success" />
        <div className="text-xs mt-1">success</div>
      </div>
      <div className="text-center">
        <Icon name="loading" size="lg" spin />
        <div className="text-xs mt-1">loading</div>
      </div>
    </div>
  )
};

// Interactive icons
export const InteractiveIcons: Story = {
  render: () => (
    <div className="flex gap-4">
      <div className="text-center">
        <Icon 
          name="heart" 
          size="lg" 
          clickable 
          onClick={() => alert('Heart clicked!')} 
        />
        <div className="text-xs mt-1">clickable</div>
      </div>
      <div className="text-center">
        <Icon name="star" size="lg" color="warning" />
        <div className="text-xs mt-1">static</div>
      </div>
      <div className="text-center">
        <Icon 
          name="settings" 
          size="lg" 
          clickable 
          onClick={() => alert('Settings clicked!')} 
        />
        <div className="text-xs mt-1">clickable</div>
      </div>
    </div>
  )
};

// Spinning and rotating icons
export const AnimatedIcons: Story = {
  render: () => (
    <div className="flex gap-8">
      <div className="text-center">
        <Icon name="loading" size="lg" spin />
        <div className="text-xs mt-1">spinning</div>
      </div>
      <div className="text-center">
        <Icon name="refresh" size="lg" spin />
        <div className="text-xs mt-1">spinning refresh</div>
      </div>
      <div className="text-center">
        <Icon name="arrow-right" size="lg" rotate={45} />
        <div className="text-xs mt-1">rotated 45°</div>
      </div>
      <div className="text-center">
        <Icon name="arrow-right" size="lg" rotate={90} />
        <div className="text-xs mt-1">rotated 90°</div>
      </div>
      <div className="text-center">
        <Icon name="arrow-right" size="lg" rotate={180} />
        <div className="text-xs mt-1">rotated 180°</div>
      </div>
    </div>
  )
};

// Convenience components
export const ConvenienceComponents: Story = {
  render: () => (
    <div className="grid grid-cols-6 gap-4">
      <div className="text-center">
        <ChevronDownIcon size="lg" />
        <div className="text-xs mt-1">ChevronDownIcon</div>
      </div>
      <div className="text-center">
        <ChevronUpIcon size="lg" />
        <div className="text-xs mt-1">ChevronUpIcon</div>
      </div>
      <div className="text-center">
        <PlusIcon size="lg" color="success" />
        <div className="text-xs mt-1">PlusIcon</div>
      </div>
      <div className="text-center">
        <XIcon size="lg" color="error" />
        <div className="text-xs mt-1">XIcon</div>
      </div>
      <div className="text-center">
        <CheckIcon size="lg" color="success" />
        <div className="text-xs mt-1">CheckIcon</div>
      </div>
      <div className="text-center">
        <SearchIcon size="lg" />
        <div className="text-xs mt-1">SearchIcon</div>
      </div>
      <div className="text-center">
        <EditIcon size="lg" />
        <div className="text-xs mt-1">EditIcon</div>
      </div>
      <div className="text-center">
        <DeleteIcon size="lg" color="error" />
        <div className="text-xs mt-1">DeleteIcon</div>
      </div>
      <div className="text-center">
        <LoadingIcon size="lg" />
        <div className="text-xs mt-1">LoadingIcon</div>
      </div>
      <div className="text-center">
        <HomeIcon size="lg" />
        <div className="text-xs mt-1">HomeIcon</div>
      </div>
      <div className="text-center">
        <UserIcon size="lg" />
        <div className="text-xs mt-1">UserIcon</div>
      </div>
      <div className="text-center">
        <SettingsIcon size="lg" />
        <div className="text-xs mt-1">SettingsIcon</div>
      </div>
    </div>
  )
};

// Custom SVG content
export const CustomSVG: Story = {
  render: () => (
    <div className="flex gap-4">
      <div className="text-center">
        <Icon size="lg" color="primary">
          <svg fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7v10c0 5.55 3.84 9.739 9 11 5.16-1.261 9-5.45 9-11V7l-10-5z" />
          </svg>
        </Icon>
        <div className="text-xs mt-1">custom shield</div>
      </div>
      <div className="text-center">
        <Icon size="lg" color="warning">
          <svg fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </Icon>
        <div className="text-xs mt-1">custom star</div>
      </div>
    </div>
  )
};

// Real-world usage examples
export const RealWorldExamples: Story = {
  render: () => (
    <div className="space-y-6">
      {/* Button with icon */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Buttons with icons</h3>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            <PlusIcon size="sm" />
            Add Item
          </button>
          <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded hover:bg-gray-50">
            <EditIcon size="sm" />
            Edit
          </button>
          <button className="flex items-center gap-2 px-3 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50">
            <DeleteIcon size="sm" color="error" />
            Delete
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Navigation</h3>
        <div className="flex items-center gap-1">
          <HomeIcon size="sm" color="muted" />
          <ChevronRightIcon size="xs" color="muted" />
          <span className="text-sm text-gray-600">Products</span>
          <ChevronRightIcon size="xs" color="muted" />
          <span className="text-sm font-medium">Laptop</span>
        </div>
      </div>

      {/* Status indicators */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Status indicators</h3>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CheckIcon size="sm" color="success" />
            <span className="text-sm">Task completed successfully</span>
          </div>
          <div className="flex items-center gap-2">
            <Icon name="alert-triangle" size="sm" color="warning" />
            <span className="text-sm">Warning: Check your settings</span>
          </div>
          <div className="flex items-center gap-2">
            <Icon name="alert-circle" size="sm" color="error" />
            <span className="text-sm">Error: Something went wrong</span>
          </div>
          <div className="flex items-center gap-2">
            <LoadingIcon size="sm" />
            <span className="text-sm">Loading...</span>
          </div>
        </div>
      </div>

      {/* Input with icon */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Search input</h3>
        <div className="relative">
          <SearchIcon size="sm" color="muted" className="absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  )
};