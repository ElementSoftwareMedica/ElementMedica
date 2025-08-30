/**
 * Design System - Card Stories
 * Week 8 Implementation - Component Library
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';
import { Button } from '../../atoms/Button';
import { HeartIcon, ShareIcon, BookmarkIcon } from '@heroicons/react/24/outline';

const meta = {
  title: 'Design System/Molecules/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Card component seguendo i principi dell\'Atomic Design. Supporta diverse varianti, dimensioni e contenuti.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outlined', 'elevated', 'filled'],
      description: 'Variante della card',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Dimensione della card',
    },
    title: {
      control: 'text',
      description: 'Titolo della card',
    },
    subtitle: {
      control: 'text',
      description: 'Sottotitolo della card',
    },
    clickable: {
      control: 'boolean',
      description: 'Card cliccabile',
    },
    loading: {
      control: 'boolean',
      description: 'Stato di caricamento',
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default story
export const Default: Story = {
  args: {
    children: (
      <p className="text-gray-600">
        This is a basic card with some content. Cards are flexible containers that can hold various types of content.
      </p>
    ),
  },
};

// With Title and Subtitle
export const WithTitleAndSubtitle: Story = {
  args: {
    title: 'Card Title',
    subtitle: 'This is a subtitle',
    children: (
      <p className="text-gray-600">
        This card has both a title and subtitle in the header section.
      </p>
    ),
  },
};

// Variants
export const DefaultVariant: Story = {
  args: {
    variant: 'default',
    title: 'Default Card',
    children: <p className="text-gray-600">Default variant with border and subtle shadow on hover.</p>,
  },
};

export const OutlinedVariant: Story = {
  args: {
    variant: 'outlined',
    title: 'Outlined Card',
    children: <p className="text-gray-600">Outlined variant with thicker border.</p>,
  },
};

export const ElevatedVariant: Story = {
  args: {
    variant: 'elevated',
    title: 'Elevated Card',
    children: <p className="text-gray-600">Elevated variant with shadow and no border.</p>,
  },
};

export const FilledVariant: Story = {
  args: {
    variant: 'filled',
    title: 'Filled Card',
    children: <p className="text-gray-600">Filled variant with background color.</p>,
  },
};

// Sizes
export const Small: Story = {
  args: {
    size: 'sm',
    title: 'Small Card',
    children: <p className="text-gray-600">Small card with reduced padding.</p>,
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
    title: 'Medium Card',
    children: <p className="text-gray-600">Medium card with standard padding.</p>,
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    title: 'Large Card',
    children: <p className="text-gray-600">Large card with increased padding.</p>,
  },
};

// With Image
export const WithImage: Story = {
  args: {
    title: 'Beautiful Landscape',
    subtitle: 'Nature Photography',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=225&fit=crop',
    imageAlt: 'Beautiful mountain landscape',
    children: (
      <p className="text-gray-600">
        This stunning landscape captures the beauty of nature with its dramatic mountain peaks and serene atmosphere.
      </p>
    ),
  },
};

// With Actions
export const WithActions: Story = {
  args: {
    title: 'Course: React Fundamentals',
    subtitle: 'Frontend Development',
    children: (
      <div className="space-y-2">
        <p className="text-gray-600">
          Learn the fundamentals of React including components, state, and props.
        </p>
        <div className="flex items-center text-sm text-gray-500">
          <span>Duration: 4 hours</span>
          <span className="mx-2">•</span>
          <span>Beginner Level</span>
        </div>
      </div>
    ),
    actions: (
      <>
        <Button variant="outline" size="sm">
          Preview
        </Button>
        <Button size="sm">
          Enroll Now
        </Button>
      </>
    ),
  },
};

// With Header and Footer
export const WithHeaderAndFooter: Story = {
  args: {
    header: (
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Custom Header</h3>
          <p className="text-sm text-gray-500">With custom content</p>
        </div>
        <BookmarkIcon className="h-5 w-5 text-gray-400" />
      </div>
    ),
    children: (
      <p className="text-gray-600">
        This card demonstrates custom header and footer content with flexible layouts.
      </p>
    ),
    footer: (
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Published 2 days ago</span>
        <div className="flex items-center space-x-4">
          <button className="flex items-center space-x-1 hover:text-red-500">
            <HeartIcon className="h-4 w-4" />
            <span>24</span>
          </button>
          <button className="flex items-center space-x-1 hover:text-blue-500">
            <ShareIcon className="h-4 w-4" />
            <span>Share</span>
          </button>
        </div>
      </div>
    ),
  },
};

// Clickable Card
export const Clickable: Story = {
  args: {
    clickable: true,
    title: 'Clickable Card',
    subtitle: 'Click me!',
    children: (
      <p className="text-gray-600">
        This card is clickable and will scale slightly on hover. Perfect for navigation cards.
      </p>
    ),
    onClick: () => alert('Card clicked!'),
  },
};

// Loading State
export const Loading: Story = {
  args: {
    loading: true,
    title: 'This title won\'t show',
    children: 'This content won\'t show either',
  },
};

// Product Card Example
export const ProductCard: Story = {
  args: {
    variant: 'elevated',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=225&fit=crop',
    imageAlt: 'Red sneakers',
    title: 'Nike Air Max 270',
    subtitle: '$150.00',
    children: (
      <div className="space-y-3">
        <p className="text-gray-600 text-sm">
          Comfortable and stylish sneakers perfect for everyday wear.
        </p>
        <div className="flex items-center space-x-2">
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
            In Stock
          </span>
          <span className="text-xs text-gray-500">Free Shipping</span>
        </div>
      </div>
    ),
    actions: (
      <>
        <Button variant="outline" size="sm">
          Add to Wishlist
        </Button>
        <Button size="sm">
          Add to Cart
        </Button>
      </>
    ),
  },
};

// Article Card Example
export const ArticleCard: Story = {
  args: {
    variant: 'default',
    clickable: true,
    image: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400&h=225&fit=crop',
    imageAlt: 'Person working on laptop',
    title: 'Getting Started with Design Systems',
    subtitle: 'Design • 5 min read',
    children: (
      <p className="text-gray-600">
        Learn how to build and maintain a design system that scales with your team and product.
      </p>
    ),
    footer: (
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center space-x-2">
          <img
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face"
            alt="Author"
            className="w-6 h-6 rounded-full"
          />
          <span>John Doe</span>
        </div>
        <span>Dec 15, 2023</span>
      </div>
    ),
  },
};

// All Variants Showcase
export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 w-full max-w-4xl">
      <Card variant="default" title="Default" size="sm">
        <p className="text-gray-600 text-sm">Default variant</p>
      </Card>
      <Card variant="outlined" title="Outlined" size="sm">
        <p className="text-gray-600 text-sm">Outlined variant</p>
      </Card>
      <Card variant="elevated" title="Elevated" size="sm">
        <p className="text-gray-600 text-sm">Elevated variant</p>
      </Card>
      <Card variant="filled" title="Filled" size="sm">
        <p className="text-gray-600 text-sm">Filled variant</p>
      </Card>
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};