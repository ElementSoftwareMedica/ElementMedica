import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './Tabs';

describe('Tabs', () => {

  const TabsExample = ({ value = 'tab1', onValueChange = vi.fn(), ...props }) => (
    <Tabs value={value} onValueChange={onValueChange} {...props}>
      <TabsList>
        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        <TabsTrigger value="tab3" disabled>Tab 3</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">Content 1</TabsContent>
      <TabsContent value="tab2">Content 2</TabsContent>
      <TabsContent value="tab3">Content 3</TabsContent>
    </Tabs>
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tabs Container', () => {
    it('renders correctly', () => {
      render(<TabsExample />);
      
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Tab 2' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Tab 3' })).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <TabsExample className="custom-tabs" />
      );
      
      expect(container.firstChild).toHaveClass('custom-tabs');
    });

    it('sets data-orientation attribute', () => {
      const { container } = render(
        <TabsExample orientation="vertical" />
      );
      
      expect(container.firstChild).toHaveAttribute('data-orientation', 'vertical');
    });
  });

  describe('TabsList', () => {
    it('renders with correct role', () => {
      render(<TabsExample />);
      
      const tablist = screen.getByRole('tablist');
      expect(tablist).toBeInTheDocument();
      expect(tablist).toHaveClass('inline-flex', 'h-10', 'items-center');
    });

    it('applies custom className', () => {
      render(
        <Tabs value="tab1" onValueChange={vi.fn()}>
          <TabsList className="custom-tablist">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content</TabsContent>
        </Tabs>
      );
      
      expect(screen.getByRole('tablist')).toHaveClass('custom-tablist');
    });
  });

  describe('TabsTrigger', () => {
    it('renders with correct attributes', () => {
      render(<TabsExample />);
      
      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      expect(tab1).toHaveAttribute('aria-selected', 'true');
      expect(tab1).toHaveAttribute('aria-controls', 'tabpanel-tab1');
      expect(tab1).toHaveAttribute('tabindex', '0');
      
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      expect(tab2).toHaveAttribute('aria-selected', 'false');
      expect(tab2).toHaveAttribute('tabindex', '-1');
    });

    it('calls onValueChange when clicked', () => {
      const onValueChange = vi.fn();
      render(<TabsExample onValueChange={onValueChange} />);
      
      fireEvent.click(screen.getByRole('tab', { name: 'Tab 2' }));
      expect(onValueChange).toHaveBeenCalledWith('tab2');
    });

    it('handles keyboard navigation', () => {
      const onValueChange = vi.fn();
      render(<TabsExample onValueChange={onValueChange} />);
      
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      
      // Enter key
      fireEvent.keyDown(tab2, { key: 'Enter' });
      expect(onValueChange).toHaveBeenCalledWith('tab2');
      
      // Space key
      fireEvent.keyDown(tab2, { key: ' ' });
      expect(onValueChange).toHaveBeenCalledTimes(2);
    });

    it('does not call onValueChange when disabled', () => {
      const onValueChange = vi.fn();
      render(<TabsExample onValueChange={onValueChange} />);
      
      const disabledTab = screen.getByRole('tab', { name: 'Tab 3' });
      expect(disabledTab).toBeDisabled();
      
      fireEvent.click(disabledTab);
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('does not call onValueChange when already selected', () => {
      const onValueChange = vi.fn();
      render(<TabsExample value="tab1" onValueChange={onValueChange} />);
      
      const selectedTab = screen.getByRole('tab', { name: 'Tab 1' });
      fireEvent.click(selectedTab);
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('applies correct styling for selected state', () => {
      render(<TabsExample value="tab1" />);
      
      const selectedTab = screen.getByRole('tab', { name: 'Tab 1' });
      const unselectedTab = screen.getByRole('tab', { name: 'Tab 2' });
      
      expect(selectedTab).toHaveClass('bg-white', 'text-gray-950', 'shadow-sm');
      expect(unselectedTab).toHaveClass('text-gray-600');
    });

    it('applies custom className', () => {
      render(
        <Tabs value="tab1" onValueChange={vi.fn()}>
          <TabsList>
            <TabsTrigger value="tab1" className="custom-trigger">
              Tab 1
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content</TabsContent>
        </Tabs>
      );
      
      expect(screen.getByRole('tab', { name: 'Tab 1' })).toHaveClass('custom-trigger');
    });
  });

  describe('TabsContent', () => {
    it('shows content for selected tab only', () => {
      render(<TabsExample value="tab1" />);
      
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Content 3')).not.toBeInTheDocument();
    });

    it('renders with correct attributes', () => {
      render(<TabsExample value="tab1" />);
      
      const content = screen.getByRole('tabpanel');
      expect(content).toHaveAttribute('id', 'tabpanel-tab1');
      expect(content).toHaveAttribute('aria-labelledby', 'tab-tab1');
      expect(content).toHaveAttribute('tabindex', '0');
    });

    it('switches content when tab changes', () => {
      const onValueChange = vi.fn();
      const { rerender } = render(<TabsExample value="tab1" onValueChange={onValueChange} />);
      
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
      
      rerender(<TabsExample value="tab2" onValueChange={onValueChange} />);
      
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <Tabs value="tab1" onValueChange={vi.fn()}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" className="custom-content">
            Content
          </TabsContent>
        </Tabs>
      );
      
      expect(screen.getByRole('tabpanel')).toHaveClass('custom-content');
    });
  });

  describe('Context', () => {
    it('throws error when TabsTrigger is used outside Tabs', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<TabsTrigger value="tab1">Tab 1</TabsTrigger>);
      }).toThrow('Tabs compound components cannot be rendered outside the Tabs component');
      
      consoleSpy.mockRestore();
    });

    it('throws error when TabsContent is used outside Tabs', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<TabsContent value="tab1">Content</TabsContent>);
      }).toThrow('Tabs compound components cannot be rendered outside the Tabs component');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Compound Component Pattern', () => {
    it('supports compound component syntax', () => {
      render(
        <Tabs value="tab1" onValueChange={vi.fn()}>
          <Tabs.List>
            <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
            <Tabs.Trigger value="tab2">Tab 2</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="tab1">Content 1</Tabs.Content>
          <Tabs.Content value="tab2">Content 2</Tabs.Content>
        </Tabs>
      );
      
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeInTheDocument();
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<TabsExample />);
      
      const tablist = screen.getByRole('tablist');
      const tabs = screen.getAllByRole('tab');
      const tabpanel = screen.getByRole('tabpanel');
      
      expect(tablist).toBeInTheDocument();
      expect(tabs).toHaveLength(3);
      expect(tabpanel).toBeInTheDocument();
      
      // Check selected tab
      expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
      expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
      expect(tabs[2]).toHaveAttribute('aria-selected', 'false');
    });

    it('manages focus correctly', () => {
      render(<TabsExample />);
      
      const selectedTab = screen.getByRole('tab', { name: 'Tab 1' });
      const unselectedTab = screen.getByRole('tab', { name: 'Tab 2' });
      
      expect(selectedTab).toHaveAttribute('tabindex', '0');
      expect(unselectedTab).toHaveAttribute('tabindex', '-1');
    });
  });
});