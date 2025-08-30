import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 10,
    onPageChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with basic props', () => {
    render(<Pagination {...defaultProps} />);
    
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument();
  });

  it('disables previous button on first page', () => {
    render(<Pagination {...defaultProps} currentPage={1} />);
    
    const prevButton = screen.getByRole('button', { name: /previous page/i });
    expect(prevButton).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(<Pagination {...defaultProps} currentPage={10} totalPages={10} />);
    
    const nextButton = screen.getByRole('button', { name: /next page/i });
    expect(nextButton).toBeDisabled();
  });

  it('calls onPageChange when clicking page number', () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaultProps} onPageChange={onPageChange} />);
    
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('calls onPageChange when clicking previous button', () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaultProps} currentPage={5} onPageChange={onPageChange} />);
    
    fireEvent.click(screen.getByRole('button', { name: /previous page/i }));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('calls onPageChange when clicking next button', () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaultProps} currentPage={5} onPageChange={onPageChange} />);
    
    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(onPageChange).toHaveBeenCalledWith(6);
  });

  it('shows ellipsis for many pages', () => {
    render(<Pagination {...defaultProps} currentPage={15} totalPages={50} />);
    
    // L'ellipsis è rappresentato dall'icona MoreHorizontal, non dal testo
    const ellipsisIcons = document.querySelectorAll('.lucide-more-horizontal');
    expect(ellipsisIcons.length).toBeGreaterThan(0);
  });

  it('shows all pages when total pages <= 7', () => {
    render(<Pagination {...defaultProps} totalPages={5} />);
    
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByRole('button', { name: i.toString() })).toBeInTheDocument();
    }
  });

  it('highlights current page', () => {
    render(<Pagination {...defaultProps} currentPage={3} />);
    
    const currentPageButton = screen.getByRole('button', { name: '3' });
    expect(currentPageButton).toHaveClass('bg-primary-600'); // Primary variant styling
  });

  it('shows info text when enabled', () => {
    render(
      <Pagination
        {...defaultProps}
        currentPage={2}
        pageSize={25}
        totalItems={100}
        showInfo
      />
    );
    
    expect(screen.getByText('Mostrando 26-50 di 100 elementi')).toBeInTheDocument();
  });

  it('shows page size selector when enabled', () => {
    const onPageSizeChange = vi.fn();
    render(
      <Pagination
        {...defaultProps}
        pageSize={25}
        onPageSizeChange={onPageSizeChange}
        showPageSizeSelector
        pageSizeOptions={[10, 25, 50]}
      />
    );
    
    expect(screen.getByText('Elementi per pagina:')).toBeInTheDocument();
    expect(screen.getByDisplayValue('25')).toBeInTheDocument();
  });

  it('calls onPageSizeChange when changing page size', () => {
    const onPageSizeChange = vi.fn();
    render(
      <Pagination
        {...defaultProps}
        pageSize={25}
        onPageSizeChange={onPageSizeChange}
        showPageSizeSelector
        pageSizeOptions={[10, 25, 50]}
      />
    );
    
    const select = screen.getByDisplayValue('25');
    fireEvent.change(select, { target: { value: '50' } });
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it('calculates info text correctly for last page', () => {
    render(
      <Pagination
        {...defaultProps}
        currentPage={5}
        totalPages={5}
        pageSize={25}
        totalItems={110}
        showInfo
      />
    );
    
    expect(screen.getByText('Mostrando 101-110 di 110 elementi')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <Pagination {...defaultProps} className="custom-pagination" />
    );
    
    expect(container.firstChild).toHaveClass('custom-pagination');
  });

  it('respects siblingCount prop', () => {
    render(
      <Pagination
        {...defaultProps}
        currentPage={10}
        totalPages={20}
        siblingCount={2}
      />
    );
    
    // With siblingCount=2, should show pages 8, 9, 10, 11, 12
    expect(screen.getByRole('button', { name: '8' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '9' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '11' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '12' })).toBeInTheDocument();
  });

  it('handles single page correctly', () => {
    render(<Pagination {...defaultProps} totalPages={1} />);
    
    const prevButton = screen.getByRole('button', { name: /previous page/i });
    const nextButton = screen.getByRole('button', { name: /next page/i });
    
    expect(prevButton).toBeDisabled();
    expect(nextButton).toBeDisabled();
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
  });
});