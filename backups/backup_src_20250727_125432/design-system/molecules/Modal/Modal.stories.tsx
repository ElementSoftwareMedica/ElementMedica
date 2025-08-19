/**
 * Design System - Modal Component Stories
 * Week 8 Implementation - Component Library
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Modal, ConfirmModal } from './Modal';
import { Button } from '../../atoms/Button';
import { FormField } from '../FormField';
import { useState } from 'react';

const meta: Meta<typeof Modal> = {
  title: 'Design System/Molecules/Modal',
  component: Modal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A flexible modal dialog component with overlay, focus management, and accessibility features.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', 'full']
    },
    variant: {
      control: 'select',
      options: ['default', 'centered', 'drawer']
    },
    showCloseButton: {
      control: 'boolean'
    },
    closeOnOverlayClick: {
      control: 'boolean'
    },
    closeOnEscape: {
      control: 'boolean'
    },
    loading: {
      control: 'boolean'
    },
    preventBodyScroll: {
      control: 'boolean'
    }
  }
};

export default meta;
type Story = StoryObj<typeof Modal>;

// Modal wrapper for stories
const ModalWrapper = (args: any) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="p-4">
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      <Modal
        {...args}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      >
        {args.children}
      </Modal>
    </div>
  );
};

// Basic modal
export const Default: Story = {
  render: ModalWrapper,
  args: {
    title: 'Modal Title',
    children: (
      <div>
        <p className="text-gray-600 mb-4">
          This is a basic modal with some content. You can put any React components here.
        </p>
        <p className="text-gray-600">
          Click the X button, press Escape, or click outside to close.
        </p>
      </div>
    )
  }
};

// Modal with footer
export const WithFooter: Story = {
  render: ModalWrapper,
  args: {
    title: 'Confirm Action',
    children: (
      <p className="text-gray-600">
        Are you sure you want to perform this action? This cannot be undone.
      </p>
    ),
    footer: (
      <>
        <Button variant="ghost">Cancel</Button>
        <Button variant="primary">Confirm</Button>
      </>
    )
  }
};

// Different sizes
export const Sizes: Story = {
  render: () => {
    const [openModal, setOpenModal] = useState<string | null>(null);
    
    const sizes = [
      { key: 'sm', label: 'Small' },
      { key: 'md', label: 'Medium' },
      { key: 'lg', label: 'Large' },
      { key: 'xl', label: 'Extra Large' },
      { key: 'full', label: 'Full Width' }
    ];
    
    return (
      <div className="p-4 space-x-2">
        {sizes.map(({ key, label }) => (
          <Button key={key} onClick={() => setOpenModal(key)}>
            {label} Modal
          </Button>
        ))}
        
        {sizes.map(({ key, label }) => (
          <Modal
            key={key}
            isOpen={openModal === key}
            onClose={() => setOpenModal(null)}
            title={`${label} Modal`}
            size={key as any}
          >
            <p className="text-gray-600">
              This is a {label.toLowerCase()} modal. The content area adjusts based on the size prop.
            </p>
          </Modal>
        ))}
      </div>
    );
  }
};

// Different variants
export const Variants: Story = {
  render: () => {
    const [openModal, setOpenModal] = useState<string | null>(null);
    
    const variants = [
      { key: 'default', label: 'Default (Top)' },
      { key: 'centered', label: 'Centered' },
      { key: 'drawer', label: 'Drawer (Bottom)' }
    ];
    
    return (
      <div className="p-4 space-x-2">
        {variants.map(({ key, label }) => (
          <Button key={key} onClick={() => setOpenModal(key)}>
            {label}
          </Button>
        ))}
        
        {variants.map(({ key, label }) => (
          <Modal
            key={key}
            isOpen={openModal === key}
            onClose={() => setOpenModal(null)}
            title={label}
            variant={key as any}
          >
            <p className="text-gray-600">
              This modal uses the {key} variant positioning.
            </p>
          </Modal>
        ))}
      </div>
    );
  }
};

// Loading state
export const Loading: Story = {
  render: ModalWrapper,
  args: {
    title: 'Loading Modal',
    loading: true,
    children: <div>This content is hidden while loading</div>
  }
};

// No close button
export const NoCloseButton: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
      <div className="p-4">
        <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Modal without close button"
          showCloseButton={false}
          closeOnOverlayClick={false}
          closeOnEscape={false}
          footer={
            <Button onClick={() => setIsOpen(false)}>Close</Button>
          }
        >
          <p className="text-gray-600">
            This modal can only be closed using the button in the footer.
          </p>
        </Modal>
      </div>
    );
  }
};

// Form modal
export const FormModal: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    const [formData, setFormData] = useState({
      name: '',
      email: '',
      message: ''
    });
    
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      console.log('Form submitted:', formData);
      setIsOpen(false);
    };
    
    const handleChange = (field: string) => (e: any) => {
      setFormData(prev => ({ ...prev, [field]: e.target.value }));
    };
    
    return (
      <div className="p-4">
        <Button onClick={() => setIsOpen(true)}>Open Form Modal</Button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Contact Form"
          size="lg"
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" form="contact-form">
                Send Message
              </Button>
            </>
          }
        >
          <form id="contact-form" onSubmit={handleSubmit} className="space-y-4">
            <FormField
              name="name"
              label="Full Name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange('name')}
              placeholder="Enter your full name"
            />
            
            <FormField
              name="email"
              label="Email Address"
              type="email"
              required
              value={formData.email}
              onChange={handleChange('email')}
              placeholder="Enter your email address"
            />
            
            <FormField
              name="message"
              label="Message"
              type="textarea"
              required
              value={formData.message}
              onChange={handleChange('message')}
              placeholder="Enter your message..."
              rows={4}
            />
          </form>
        </Modal>
      </div>
    );
  }
};

// Confirm modal
export const ConfirmModalStory: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    const [variant, setVariant] = useState<'danger' | 'warning' | 'info'>('info');
    
    const handleConfirm = () => {
      console.log('Confirmed!');
      setIsOpen(false);
    };
    
    return (
      <div className="p-4 space-x-2">
        <Button 
          onClick={() => { setVariant('info'); setIsOpen(true); }}
        >
          Info Confirm
        </Button>
        <Button 
          variant="outline"
          onClick={() => { setVariant('warning'); setIsOpen(true); }}
        >
          Warning Confirm
        </Button>
        <Button 
          variant="destructive"
          onClick={() => { setVariant('danger'); setIsOpen(true); }}
        >
          Danger Confirm
        </Button>
        
        <ConfirmModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onConfirm={handleConfirm}
          title={`${variant.charAt(0).toUpperCase() + variant.slice(1)} Confirmation`}
          message={`This is a ${variant} confirmation dialog. Are you sure you want to proceed?`}
          variant={variant}
          confirmText="Yes, proceed"
          cancelText="Cancel"
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'A convenience component for confirmation dialogs with different variants.'
      }
    }
  }
};

// Nested modals
export const NestedModals: Story = {
  render: () => {
    const [firstModal, setFirstModal] = useState(false);
    const [secondModal, setSecondModal] = useState(false);
    
    return (
      <div className="p-4">
        <Button onClick={() => setFirstModal(true)}>Open First Modal</Button>
        
        <Modal
          isOpen={firstModal}
          onClose={() => setFirstModal(false)}
          title="First Modal"
          zIndex={1040}
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              This is the first modal. You can open another modal from here.
            </p>
            <Button onClick={() => setSecondModal(true)}>
              Open Second Modal
            </Button>
          </div>
        </Modal>
        
        <Modal
          isOpen={secondModal}
          onClose={() => setSecondModal(false)}
          title="Second Modal"
          size="sm"
          variant="centered"
          zIndex={1050}
        >
          <p className="text-gray-600">
            This is the second modal, opened on top of the first one.
          </p>
        </Modal>
      </div>
    );
  }
};