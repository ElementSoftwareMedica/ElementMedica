/**
 * Design System - Modal Component Tests
 * Week 8 Implementation - Component Library
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Modal, ConfirmModal } from './Modal';

// Mock portal for testing
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: vi.fn((element) => element)
  };
});

// Mock functions
const mockOnClose = vi.fn();

describe('Modal', () => {
  beforeEach(() => {
    mockOnClose.mockClear();
  });

  afterEach(() => {
    // Clean up any open modals
    document.body.innerHTML = '';
  });

  describe('Basic rendering', () => {
    it('renders when open is true', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Modal content</div>
        </Modal>
      );
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      render(
        <Modal isOpen={false} onClose={mockOnClose}>
          <div>Modal content</div>
        </Modal>
      );
      expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
    });

    it('renders with title', () => {
      render(
        <Modal isOpen={true} title="Test Modal" onClose={mockOnClose}>
          <div>Modal content</div>
        </Modal>
      );
      
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
    });

    it('renders with footer', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} footer={<button>Footer Button</button>}>
          <div>Modal content</div>
        </Modal>
      );
      
      expect(screen.getByText('Footer Button')).toBeInTheDocument();
    });

    it('renders with small size', () => {
      render(
        <Modal isOpen={true} size="sm" onClose={mockOnClose}>
          <div>Modal content</div>
        </Modal>
      );
      
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('renders with medium size (default)', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Modal content</div>
        </Modal>
      );
      
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('renders with large size', () => {
      render(
        <Modal isOpen={true} size="lg" onClose={mockOnClose}>
          <div>Modal content</div>
        </Modal>
      );
      
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('renders with extra large size', () => {
      render(
        <Modal isOpen={true} size="xl" onClose={mockOnClose}>
          <div>Modal content</div>
        </Modal>
      );
      
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('renders with full size', () => {
      render(
        <Modal isOpen={true} size="full" onClose={mockOnClose}>
          <div>Modal content</div>
        </Modal>
      );
      
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    describe('variants', () => {
      it('renders with default variant', () => {
        render(
          <Modal isOpen={true} variant="default" onClose={mockOnClose}>
            <div>Modal content</div>
          </Modal>
        );
        
        expect(screen.getByText('Modal content')).toBeInTheDocument();
      });

      it('renders with centered variant', () => {
        render(
          <Modal isOpen={true} variant="centered" onClose={mockOnClose}>
            <div>Modal content</div>
          </Modal>
        );
        
        expect(screen.getByText('Modal content')).toBeInTheDocument();
      });

      it('renders with drawer variant', () => {
        render(
          <Modal isOpen={true} variant="drawer" onClose={mockOnClose}>
            <div>Modal content</div>
          </Modal>
        );
        
        expect(screen.getByText('Modal content')).toBeInTheDocument();
      });
    });

    describe('interactions', () => {
      it('calls onClose when close button is clicked', () => {
        render(
          <Modal isOpen={true} title="Test Modal" onClose={mockOnClose}>
            <div>Modal content</div>
          </Modal>
        );
        
        const closeButton = screen.getByRole('button', { name: /close/i });
        fireEvent.click(closeButton);
        
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });

      it('does not render close button when showCloseButton is false', () => {
        render(
          <Modal isOpen={true} title="Test Modal" showCloseButton={false} onClose={mockOnClose}>
            <div>Modal content</div>
          </Modal>
        );
        
        expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Sizes', () => {
    it('applies small size correctly', () => {
      render(
        <Modal open size="sm" onClose={() => {}}>
          <div>Small modal</div>
        </Modal>
      );
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('max-w-md');
    });

    it('applies medium size as default', () => {
      render(
        <Modal open onClose={() => {}}>
          <div>Default modal</div>
        </Modal>
      );
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('max-w-lg');
    });

    it('applies large size correctly', () => {
      render(
        <Modal open size="lg" onClose={() => {}}>
          <div>Large modal</div>
        </Modal>
      );
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('max-w-2xl');
    });

    it('applies extra large size correctly', () => {
      render(
        <Modal open size="xl" onClose={() => {}}>
          <div>Extra large modal</div>
        </Modal>
      );
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('max-w-4xl');
    });

    it('applies full size correctly', () => {
      render(
        <Modal open size="full" onClose={() => {}}>
          <div>Full modal</div>
        </Modal>
      );
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('max-w-full', 'h-full');
    });
  });

  describe('Variants', () => {
    it('renders default variant correctly', () => {
      render(
        <Modal open variant="default" onClose={() => {}}>
          <div>Default modal</div>
        </Modal>
      );
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('bg-white');
    });

    it('renders centered variant correctly', () => {
      render(
        <Modal open variant="centered" onClose={() => {}}>
          <div>Centered modal</div>
        </Modal>
      );
      const overlay = screen.getByRole('dialog').parentElement;
      expect(overlay).toHaveClass('items-center');
    });

    it('renders drawer variant correctly', () => {
      render(
        <Modal open variant="drawer" onClose={() => {}}>
          <div>Drawer modal</div>
        </Modal>
      );
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('h-full', 'max-w-md');
    });
  });

  describe('Close functionality', () => {
    it('calls onClose when close button is clicked', () => {
      const handleClose = vi.fn();
      render(
        <Modal open title="Modal" onClose={handleClose}>
          <div>Modal content</div>
        </Modal>
      );
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('does not render close button when showCloseButton is false', () => {
      render(
        <Modal open title="Modal" showCloseButton={false} onClose={() => {}}>
          <div>Modal content</div>
        </Modal>
      );
      
      expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
    });

    it('calls onClose when overlay is clicked and closeOnOverlayClick is true', () => {
      const handleClose = vi.fn();
      render(
        <Modal open closeOnOverlayClick onClose={handleClose}>
          <div>Modal content</div>
        </Modal>
      );
      
      const overlay = screen.getByRole('dialog').parentElement;
      fireEvent.click(overlay);
      
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when modal content is clicked', () => {
      const handleClose = vi.fn();
      render(
        <Modal open closeOnOverlayClick onClose={handleClose}>
          <div>Modal content</div>
        </Modal>
      );
      
      fireEvent.click(screen.getByText('Modal content'));
      
      expect(handleClose).not.toHaveBeenCalled();
    });

    it('calls onClose when Escape key is pressed and closeOnEscape is true', () => {
      const handleClose = vi.fn();
      render(
        <Modal open closeOnEscape onClose={handleClose}>
          <div>Modal content</div>
        </Modal>
      );
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when other keys are pressed', () => {
      const handleClose = vi.fn();
      render(
        <Modal open closeOnEscape onClose={handleClose}>
          <div>Modal content</div>
        </Modal>
      );
      
      fireEvent.keyDown(document, { key: 'Enter' });
      fireEvent.keyDown(document, { key: 'Tab' });
      
      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe('Footer', () => {
    it('renders footer when provided', () => {
      const footer = (
        <div>
          <button>Cancel</button>
          <button>Save</button>
        </div>
      );
      
      render(
        <Modal open footer={footer} onClose={() => {}}>
          <div>Modal content</div>
        </Modal>
      );
      
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('does not render footer section when footer is not provided', () => {
      render(
        <Modal open onClose={() => {}}>
          <div>Modal content</div>
        </Modal>
      );
      
      // Check that there's no footer section
      const modal = screen.getByRole('dialog');
      expect(modal.querySelector('[class*="border-t"]')).not.toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('shows loading overlay when loading is true', () => {
      render(
        <Modal open loading onClose={() => {}}>
          <div>Modal content</div>
        </Modal>
      );
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toHaveClass('pointer-events-none');
    });

    it('does not show loading overlay by default', () => {
      render(
        <Modal open onClose={() => {}}>
          <div>Modal content</div>
        </Modal>
      );
      
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('disables close functionality when loading', () => {
      const handleClose = vi.fn();
      render(
        <Modal open loading closeOnEscape closeOnOverlayClick onClose={handleClose}>
          <div>Modal content</div>
        </Modal>
      );
      
      fireEvent.keyDown(document, { key: 'Escape' });
      const overlay = screen.getByRole('dialog').parentElement;
      fireEvent.click(overlay);
      
      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(
        <Modal open title="Modal Title" onClose={() => {}}>
          <div>Modal content</div>
        </Modal>
      );
      
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby');
    });

    it('supports custom aria-label when no title is provided', () => {
      render(
        <Modal open aria-label="Custom modal" onClose={() => {}}>
          <div>Modal content</div>
        </Modal>
      );
      
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-label', 'Custom modal');
    });

    it('traps focus within modal', async () => {
      render(
        <Modal open title="Modal" onClose={() => {}}>
          <div>
            <button>First button</button>
            <button>Second button</button>
          </div>
        </Modal>
      );
      
      const firstButton = screen.getByText('First button');
      const secondButton = screen.getByText('Second button');
      const closeButton = screen.getByRole('button', { name: /close/i });
      
      // Focus should start on the first focusable element
      await waitFor(() => {
        expect(firstButton).toHaveFocus();
      });
      
      // Tab should move to next focusable element
      fireEvent.keyDown(firstButton, { key: 'Tab' });
      expect(secondButton).toHaveFocus();
      
      // Tab should move to close button
      fireEvent.keyDown(secondButton, { key: 'Tab' });
      expect(closeButton).toHaveFocus();
      
      // Tab from last element should wrap to first
      fireEvent.keyDown(closeButton, { key: 'Tab' });
      expect(firstButton).toHaveFocus();
    });

    it('restores focus when modal closes', async () => {
      const TestComponent = () => {
        const [open, setOpen] = React.useState(false);
        return (
          <div>
            <button onClick={() => setOpen(true)}>Open Modal</button>
            <Modal open={open} onClose={() => setOpen(false)}>
              <div>Modal content</div>
            </Modal>
          </div>
        );
      };
      
      render(<TestComponent />);
      
      const openButton = screen.getByText('Open Modal');
      fireEvent.click(openButton);
      
      // Modal should be open
      expect(screen.getByText('Modal content')).toBeInTheDocument();
      
      // Close modal
      fireEvent.keyDown(document, { key: 'Escape' });
      
      // Focus should return to the open button
      await waitFor(() => {
        expect(openButton).toHaveFocus();
      });
    });
  });

  describe('Custom classes and styling', () => {
    it('applies custom className to modal', () => {
      render(
        <Modal open className="custom-modal" onClose={() => {}}>
          <div>Modal content</div>
        </Modal>
      );
      
      expect(screen.getByRole('dialog')).toHaveClass('custom-modal');
    });

    it('applies custom overlayClassName to overlay', () => {
      render(
        <Modal open overlayClassName="custom-overlay" onClose={() => {}}>
          <div>Modal content</div>
        </Modal>
      );
      
      const overlay = screen.getByRole('dialog').parentElement;
      expect(overlay).toHaveClass('custom-overlay');
    });
  });

  describe('Animation and transitions', () => {
    it('applies animation classes', () => {
      render(
        <Modal open onClose={() => {}}>
          <div>Modal content</div>
        </Modal>
      );
      
      const overlay = screen.getByRole('dialog').parentElement;
      const modal = screen.getByRole('dialog');
      
      expect(overlay).toHaveClass('animate-in', 'fade-in');
      expect(modal).toHaveClass('animate-in', 'zoom-in-95');
    });
  });

  describe('Portal rendering', () => {
    it('renders modal in portal', () => {
      render(
        <Modal open onClose={() => {}}>
          <div>Modal content</div>
        </Modal>
      );
      
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('handles empty content gracefully', () => {
      render(
        <Modal open onClose={() => {}}>
          {null}
        </Modal>
      );
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('handles complex nested content', () => {
      render(
        <Modal open title="Complex Modal" onClose={() => {}}>
          <div>
            <h2>Nested Title</h2>
            <form>
              <input type="text" placeholder="Input field" />
              <button type="submit">Submit</button>
            </form>
          </div>
        </Modal>
      );
      
      expect(screen.getByText('Nested Title')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Input field')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    });

    it('combines all props correctly', () => {
      const handleClose = vi.fn();
      const footer = <button>Footer Button</button>;
      
      render(
        <Modal
          open
          title="Complex Modal"
          size="lg"
          variant="centered"
          loading
          showCloseButton={false}
          closeOnOverlayClick
          closeOnEscape
          footer={footer}
          className="custom-modal"
          overlayClassName="custom-overlay"
          onClose={handleClose}
        >
          <div>Complex content</div>
        </Modal>
      );
      
      const modal = screen.getByRole('dialog');
      const overlay = modal.parentElement;
      
      expect(modal).toHaveClass('max-w-2xl', 'custom-modal', 'pointer-events-none');
      expect(overlay).toHaveClass('items-center', 'custom-overlay');
      expect(screen.getByText('Complex Modal')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
      expect(screen.getByText('Footer Button')).toBeInTheDocument();
    });
  });
});

describe('ConfirmModal', () => {
  describe('Basic rendering', () => {
    it('renders with required props', () => {
      render(
        <ConfirmModal
          open
          title="Confirm Action"
          message="Are you sure?"
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );
      
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
      expect(screen.getByText('Are you sure?')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });

    it('renders with custom button labels', () => {
      render(
        <ConfirmModal
          open
          title="Delete Item"
          message="This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Keep"
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );
      
      expect(screen.getByText('Delete')).toBeInTheDocument();
      expect(screen.getByText('Keep')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('renders danger variant correctly', () => {
      render(
        <ConfirmModal
          open
          title="Delete Item"
          message="This will permanently delete the item."
          variant="danger"
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );
      
      const confirmButton = screen.getByText('Confirm');
      expect(confirmButton).toHaveClass('bg-red-600');
    });

    it('renders warning variant correctly', () => {
      render(
        <ConfirmModal
          open
          title="Warning"
          message="This action may have consequences."
          variant="warning"
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );
      
      const confirmButton = screen.getByText('Confirm');
      expect(confirmButton).toHaveClass('bg-yellow-600');
    });

    it('renders info variant correctly', () => {
      render(
        <ConfirmModal
          open
          title="Information"
          message="Please confirm this action."
          variant="info"
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );
      
      const confirmButton = screen.getByText('Confirm');
      expect(confirmButton).toHaveClass('bg-blue-600');
    });
  });

  describe('Event handling', () => {
    it('calls onConfirm when confirm button is clicked', () => {
      const handleConfirm = vi.fn();
      render(
        <ConfirmModal
          open
          title="Confirm"
          message="Are you sure?"
          onConfirm={handleConfirm}
          onCancel={() => {}}
        />
      );
      
      fireEvent.click(screen.getByText('Confirm'));
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when cancel button is clicked', () => {
      const handleCancel = vi.fn();
      render(
        <ConfirmModal
          open
          title="Confirm"
          message="Are you sure?"
          onConfirm={() => {}}
          onCancel={handleCancel}
        />
      );
      
      fireEvent.click(screen.getByText('Cancel'));
      expect(handleCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when modal is closed via overlay', () => {
      const handleCancel = vi.fn();
      render(
        <ConfirmModal
          open
          title="Confirm"
          message="Are you sure?"
          onConfirm={() => {}}
          onCancel={handleCancel}
        />
      );
      
      const overlay = screen.getByRole('dialog').parentElement;
      fireEvent.click(overlay);
      expect(handleCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when Escape key is pressed', () => {
      const handleCancel = vi.fn();
      render(
        <ConfirmModal
          open
          title="Confirm"
          message="Are you sure?"
          onConfirm={() => {}}
          onCancel={handleCancel}
        />
      );
      
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(handleCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading state', () => {
    it('disables buttons when loading', () => {
      render(
        <ConfirmModal
          open
          title="Confirm"
          message="Are you sure?"
          loading
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );
      
      expect(screen.getByText('Cancel')).toBeDisabled();
      expect(screen.getByText('Confirm')).toBeDisabled();
    });

    it('shows loading state on confirm button', () => {
      render(
        <ConfirmModal
          open
          title="Confirm"
          message="Are you sure?"
          loading
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );
      
      const confirmButton = screen.getByText('Confirm');
      expect(confirmButton).toHaveClass('opacity-75');
    });
  });

  describe('Accessibility', () => {
    it('focuses confirm button by default', async () => {
      render(
        <ConfirmModal
          open
          title="Confirm"
          message="Are you sure?"
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('Confirm')).toHaveFocus();
      });
    });

    it('has proper ARIA attributes', () => {
      render(
        <ConfirmModal
          open
          title="Confirm Action"
          message="This action cannot be undone."
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );
      
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby');
    });
  });

  describe('Edge cases', () => {
    it('handles very long messages', () => {
      const longMessage = 'This is a very long confirmation message that should wrap properly and not break the layout of the modal component. It contains multiple sentences and should be displayed correctly.';
      
      render(
        <ConfirmModal
          open
          title="Long Message"
          message={longMessage}
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );
      
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('combines all props correctly', () => {
      const handleConfirm = vi.fn();
      const handleCancel = vi.fn();
      
      render(
        <ConfirmModal
          open
          title="Complex Confirm"
          message="Complex confirmation message"
          variant="danger"
          confirmLabel="Delete Forever"
          cancelLabel="Keep Safe"
          loading
          size="lg"
          className="custom-confirm"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      );
      
      expect(screen.getByText('Complex Confirm')).toBeInTheDocument();
      expect(screen.getByText('Complex confirmation message')).toBeInTheDocument();
      expect(screen.getByText('Delete Forever')).toBeInTheDocument();
      expect(screen.getByText('Keep Safe')).toBeInTheDocument();
      
      const confirmButton = screen.getByText('Delete Forever');
      expect(confirmButton).toHaveClass('bg-red-600');
      expect(confirmButton).toBeDisabled();
      
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('max-w-2xl', 'custom-confirm');
    });
  });
});