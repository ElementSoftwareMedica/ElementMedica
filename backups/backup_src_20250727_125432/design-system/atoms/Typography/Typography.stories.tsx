/**
 * Design System - Typography Component Stories
 * Week 8 Implementation - Component Library
 */

import type { Meta, StoryObj } from '@storybook/react';
import {
  Typography,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Subtitle1,
  Subtitle2,
  Body1,
  Body2,
  Caption,
  Overline
} from './Typography';

const meta: Meta<typeof Typography> = {
  title: 'Design System/Atoms/Typography',
  component: Typography,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Typography component for consistent text styling across the application. Supports various variants, sizes, weights, and colors.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'subtitle1', 'subtitle2', 'body1', 'body2', 'caption', 'overline']
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl']
    },
    weight: {
      control: 'select',
      options: ['light', 'normal', 'medium', 'semibold', 'bold']
    },
    align: {
      control: 'select',
      options: ['left', 'center', 'right', 'justify']
    },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'muted', 'error', 'warning', 'success', 'inherit']
    },
    as: {
      control: 'select',
      options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'div']
    },
    truncate: {
      control: 'boolean'
    },
    lineClamp: {
      control: 'number',
      min: 1,
      max: 6
    }
  }
};

export default meta;
type Story = StoryObj<typeof Typography>;

// Default story
export const Default: Story = {
  args: {
    variant: 'body1',
    children: 'This is the default typography component with body1 variant.'
  }
};

// All heading variants
export const Headings: Story = {
  render: () => (
    <div className="space-y-4">
      <Heading1>Heading 1 - Main page title</Heading1>
      <Heading2>Heading 2 - Section title</Heading2>
      <Heading3>Heading 3 - Subsection title</Heading3>
      <Heading4>Heading 4 - Component title</Heading4>
      <Heading5>Heading 5 - Small section title</Heading5>
      <Heading6>Heading 6 - Smallest heading</Heading6>
    </div>
  )
};

// Body text variants
export const BodyText: Story = {
  render: () => (
    <div className="space-y-4">
      <Subtitle1>Subtitle 1 - Large subtitle text</Subtitle1>
      <Subtitle2>Subtitle 2 - Regular subtitle text</Subtitle2>
      <Body1>
        Body 1 - This is the primary body text used for most content. It has good readability 
        and is suitable for longer paragraphs of text.
      </Body1>
      <Body2>
        Body 2 - This is smaller body text, often used for secondary information or in 
        constrained spaces where you need more compact text.
      </Body2>
      <Caption>Caption - Small text for image captions, footnotes, or metadata</Caption>
      <Overline>Overline - Small uppercase text for labels and categories</Overline>
    </div>
  )
};

// Different sizes
export const Sizes: Story = {
  render: () => (
    <div className="space-y-2">
      <Typography size="xs">Extra small text (xs)</Typography>
      <Typography size="sm">Small text (sm)</Typography>
      <Typography size="base">Base text (base)</Typography>
      <Typography size="lg">Large text (lg)</Typography>
      <Typography size="xl">Extra large text (xl)</Typography>
      <Typography size="2xl">2X large text (2xl)</Typography>
      <Typography size="3xl">3X large text (3xl)</Typography>
      <Typography size="4xl">4X large text (4xl)</Typography>
    </div>
  )
};

// Different weights
export const Weights: Story = {
  render: () => (
    <div className="space-y-2">
      <Typography weight="light">Light weight text</Typography>
      <Typography weight="normal">Normal weight text</Typography>
      <Typography weight="medium">Medium weight text</Typography>
      <Typography weight="semibold">Semibold weight text</Typography>
      <Typography weight="bold">Bold weight text</Typography>
    </div>
  )
};

// Different colors
export const Colors: Story = {
  render: () => (
    <div className="space-y-2">
      <Typography color="primary">Primary color text (default)</Typography>
      <Typography color="secondary">Secondary color text</Typography>
      <Typography color="muted">Muted color text</Typography>
      <Typography color="error">Error color text</Typography>
      <Typography color="warning">Warning color text</Typography>
      <Typography color="success">Success color text</Typography>
      <div className="bg-blue-600 p-4 rounded">
        <Typography color="inherit" className="text-white">
          Inherit color text (inherits from parent)
        </Typography>
      </div>
    </div>
  )
};

// Text alignment
export const Alignment: Story = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <Typography align="left">
        Left aligned text - This text is aligned to the left side of its container.
      </Typography>
      <Typography align="center">
        Center aligned text - This text is centered within its container.
      </Typography>
      <Typography align="right">
        Right aligned text - This text is aligned to the right side of its container.
      </Typography>
      <Typography align="justify">
        Justified text - This text is justified, meaning it stretches to fill the full width 
        of its container with even spacing between words.
      </Typography>
    </div>
  )
};

// Truncation
export const Truncation: Story = {
  render: () => (
    <div className="space-y-4 max-w-xs">
      <div>
        <Typography variant="caption" color="muted">Normal text (no truncation):</Typography>
        <Typography>
          This is a very long text that will wrap to multiple lines when it exceeds the container width.
        </Typography>
      </div>
      
      <div>
        <Typography variant="caption" color="muted">Truncated text:</Typography>
        <Typography truncate>
          This is a very long text that will be truncated with an ellipsis when it exceeds the container width.
        </Typography>
      </div>
    </div>
  )
};

// Line clamping
export const LineClamping: Story = {
  render: () => (
    <div className="space-y-6 max-w-md">
      <div>
        <Typography variant="caption" color="muted">Normal text (no line clamp):</Typography>
        <Typography>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
          incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud 
          exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </Typography>
      </div>
      
      <div>
        <Typography variant="caption" color="muted">Line clamp 2:</Typography>
        <Typography lineClamp={2}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
          incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud 
          exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </Typography>
      </div>
      
      <div>
        <Typography variant="caption" color="muted">Line clamp 3:</Typography>
        <Typography lineClamp={3}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
          incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud 
          exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute 
          irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
        </Typography>
      </div>
    </div>
  )
};

// Custom HTML elements
export const CustomElements: Story = {
  render: () => (
    <div className="space-y-4">
      <Typography variant="h2" as="h1">
        H2 styling but rendered as H1 element
      </Typography>
      <Typography variant="body1" as="div">
        Body text styling but rendered as div element
      </Typography>
      <Typography variant="caption" as="span">
        Caption styling but rendered as span element
      </Typography>
    </div>
  )
};

// Typography scale showcase
export const TypographyScale: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <Typography variant="h3" className="mb-4">Typography Scale</Typography>
        <div className="space-y-3">
          <div className="flex items-baseline gap-4">
            <Typography variant="caption" color="muted" className="w-16 flex-shrink-0">H1</Typography>
            <Heading1>The quick brown fox jumps</Heading1>
          </div>
          <div className="flex items-baseline gap-4">
            <Typography variant="caption" color="muted" className="w-16 flex-shrink-0">H2</Typography>
            <Heading2>The quick brown fox jumps</Heading2>
          </div>
          <div className="flex items-baseline gap-4">
            <Typography variant="caption" color="muted" className="w-16 flex-shrink-0">H3</Typography>
            <Heading3>The quick brown fox jumps</Heading3>
          </div>
          <div className="flex items-baseline gap-4">
            <Typography variant="caption" color="muted" className="w-16 flex-shrink-0">H4</Typography>
            <Heading4>The quick brown fox jumps</Heading4>
          </div>
          <div className="flex items-baseline gap-4">
            <Typography variant="caption" color="muted" className="w-16 flex-shrink-0">H5</Typography>
            <Heading5>The quick brown fox jumps</Heading5>
          </div>
          <div className="flex items-baseline gap-4">
            <Typography variant="caption" color="muted" className="w-16 flex-shrink-0">H6</Typography>
            <Heading6>The quick brown fox jumps</Heading6>
          </div>
          <div className="flex items-baseline gap-4">
            <Typography variant="caption" color="muted" className="w-16 flex-shrink-0">Sub1</Typography>
            <Subtitle1>The quick brown fox jumps</Subtitle1>
          </div>
          <div className="flex items-baseline gap-4">
            <Typography variant="caption" color="muted" className="w-16 flex-shrink-0">Sub2</Typography>
            <Subtitle2>The quick brown fox jumps</Subtitle2>
          </div>
          <div className="flex items-baseline gap-4">
            <Typography variant="caption" color="muted" className="w-16 flex-shrink-0">Body1</Typography>
            <Body1>The quick brown fox jumps</Body1>
          </div>
          <div className="flex items-baseline gap-4">
            <Typography variant="caption" color="muted" className="w-16 flex-shrink-0">Body2</Typography>
            <Body2>The quick brown fox jumps</Body2>
          </div>
          <div className="flex items-baseline gap-4">
            <Typography variant="caption" color="muted" className="w-16 flex-shrink-0">Caption</Typography>
            <Caption>The quick brown fox jumps</Caption>
          </div>
          <div className="flex items-baseline gap-4">
            <Typography variant="caption" color="muted" className="w-16 flex-shrink-0">Overline</Typography>
            <Overline>The quick brown fox jumps</Overline>
          </div>
        </div>
      </div>
    </div>
  )
};

// Real-world example
export const RealWorldExample: Story = {
  render: () => (
    <div className="max-w-2xl space-y-6">
      <div>
        <Overline color="muted">Blog Post</Overline>
        <Heading1 className="mt-2">The Future of Web Development</Heading1>
        <Subtitle1 color="secondary" className="mt-2">
          Exploring the latest trends and technologies shaping the web
        </Subtitle1>
      </div>
      
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <Caption>By John Doe</Caption>
        <Caption>•</Caption>
        <Caption>March 15, 2024</Caption>
        <Caption>•</Caption>
        <Caption>5 min read</Caption>
      </div>
      
      <div className="space-y-4">
        <Body1>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
          incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud 
          exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </Body1>
        
        <Heading3>Key Takeaways</Heading3>
        
        <Body1>
          Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu 
          fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in 
          culpa qui officia deserunt mollit anim id est laborum.
        </Body1>
        
        <Body2 color="muted">
          This article was originally published on our company blog and has been updated 
          with the latest information.
        </Body2>
      </div>
    </div>
  )
};