import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SearchBar } from '../SearchBar';

// Mock the search API
const mockSearchResults = [
  { id: 1, title: 'Document 1', content: 'Content 1' },
  { id: 2, title: 'Document 2', content: 'Content 2' }
];

vi.mock('@/lib/api', () => ({
  searchDocuments: vi.fn().mockResolvedValue(mockSearchResults)
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('SearchBar Component', () => {
  const user = userEvent.setup();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input and button', () => {
    render(<SearchBar />, { wrapper: createWrapper() });
    
    expect(screen.getByPlaceholderText(/cerca documenti/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cerca/i })).toBeInTheDocument();
  });

  it('updates input value when typing', async () => {
    render(<SearchBar />, { wrapper: createWrapper() });
    
    const input = screen.getByPlaceholderText(/cerca documenti/i);
    await user.type(input, 'test query');
    
    expect(input).toHaveValue('test query');
  });

  it('triggers search on form submission', async () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />, { wrapper: createWrapper() });
    
    const input = screen.getByPlaceholderText(/cerca documenti/i);
    const button = screen.getByRole('button', { name: /cerca/i });
    
    await user.type(input, 'test query');
    await user.click(button);
    
    expect(onSearch).toHaveBeenCalledWith('test query');
  });

  it('triggers search on Enter key press', async () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />, { wrapper: createWrapper() });
    
    const input = screen.getByPlaceholderText(/cerca documenti/i);
    
    await user.type(input, 'test query');
    await user.keyboard('{Enter}');
    
    expect(onSearch).toHaveBeenCalledWith('test query');
  });

  it('shows loading state during search', async () => {
    render(<SearchBar />, { wrapper: createWrapper() });
    
    const input = screen.getByPlaceholderText(/cerca documenti/i);
    const button = screen.getByRole('button', { name: /cerca/i });
    
    await user.type(input, 'test query');
    fireEvent.click(button);
    
    expect(screen.getByTestId('search-loading')).toBeInTheDocument();
  });

  it('displays search results', async () => {
    render(<SearchBar showResults />, { wrapper: createWrapper() });
    
    const input = screen.getByPlaceholderText(/cerca documenti/i);
    const button = screen.getByRole('button', { name: /cerca/i });
    
    await user.type(input, 'test query');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Document 1')).toBeInTheDocument();
      expect(screen.getByText('Document 2')).toBeInTheDocument();
    });
  });

  it('handles empty search results', async () => {
    const { searchDocuments } = await import('@/lib/api');
    vi.mocked(searchDocuments).mockResolvedValueOnce([]);
    
    render(<SearchBar showResults />, { wrapper: createWrapper() });
    
    const input = screen.getByPlaceholderText(/cerca documenti/i);
    const button = screen.getByRole('button', { name: /cerca/i });
    
    await user.type(input, 'no results');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/nessun risultato trovato/i)).toBeInTheDocument();
    });
  });

  it('handles search errors', async () => {
    const { searchDocuments } = await import('@/lib/api');
    vi.mocked(searchDocuments).mockRejectedValueOnce(new Error('Search failed'));
    
    render(<SearchBar showResults />, { wrapper: createWrapper() });
    
    const input = screen.getByPlaceholderText(/cerca documenti/i);
    const button = screen.getByRole('button', { name: /cerca/i });
    
    await user.type(input, 'error query');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/errore durante la ricerca/i)).toBeInTheDocument();
    });
  });

  it('clears search results when input is cleared', async () => {
    render(<SearchBar showResults />, { wrapper: createWrapper() });
    
    const input = screen.getByPlaceholderText(/cerca documenti/i);
    const button = screen.getByRole('button', { name: /cerca/i });
    
    // Perform search
    await user.type(input, 'test query');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Document 1')).toBeInTheDocument();
    });
    
    // Clear input
    await user.clear(input);
    
    expect(screen.queryByText('Document 1')).not.toBeInTheDocument();
  });

  it('supports advanced search filters', async () => {
    const onAdvancedSearch = vi.fn();
    render(
      <SearchBar 
        showAdvanced 
        onAdvancedSearch={onAdvancedSearch} 
      />, 
      { wrapper: createWrapper() }
    );
    
    // Open advanced search
    await user.click(screen.getByText(/ricerca avanzata/i));
    
    // Fill advanced filters
    await user.selectOptions(screen.getByLabelText(/categoria/i), 'contracts');
    await user.type(screen.getByLabelText(/autore/i), 'John Doe');
    
    // Submit advanced search
    await user.click(screen.getByRole('button', { name: /cerca avanzata/i }));
    
    expect(onAdvancedSearch).toHaveBeenCalledWith({
      query: '',
      category: 'contracts',
      author: 'John Doe'
    });
  });
});