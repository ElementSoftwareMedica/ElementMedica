# Custom React Hooks

This directory contains custom React hooks that abstract common functionality across the application. Using these hooks helps maintain consistent behavior and reduce code duplication.

## Structure

- `index.ts` - Exports all hooks for easy importing
- `/api` - API-related hooks for data fetching and mutations
- Individual hook files for specific functionality

## Available Hooks

### API Hooks

- `useQueryData` - Generic hook for fetching data using React Query
- `useList` - Hook for fetching a list of items
- `useGetById` - Hook for fetching a single item by ID
- `useCustomQuery` - Hook for making custom queries
- `useCreate` - Hook for creating data
- `useUpdate` - Hook for updating data
- `useDelete` - Hook for deleting data

### Form Hooks

- `useFormValidation` - Hook for form validation with various validation rules

### Error Handling Hooks

- `useErrorHandler` - Hook for centralized error management

### UI Hooks

- `useViewMode` - Hook for toggling between view modes (grid/table)
- `useSelection` - Hook for managing selection state
- `useSelectionActions` - Hook for actions on selected items
- `useSorting` - Hook for table column sorting
- `usePagination` - Hook for pagination functionality

### Entity-Specific Hooks

- `useCompanies` - Hook for managing company data
- `useCourses` - Hook for managing course data
- `useTrainers` - Hook for managing trainer data

### useFetch

A hook for fetching data with loading and error states.

**Location:** `useFetch.ts`

**Usage:**
```tsx
import useFetch from '../hooks/useFetch';

function UsersList() {
  const { 
    data: users,
    loading,
    error,
    refetch
  } = useFetch<User[]>('/api/users');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!users) return <div>No users found</div>;

  return (
    <div>
      <button onClick={refetch}>Refresh Data</button>
      <ul>
        {users.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### useSelection

A hook for managing selection state in lists and tables.

**Location:** `useSelection.ts`

**Usage:**
```tsx
import useSelection from '../hooks/useSelection';

function SelectableList() {
  const users = [/* user data */];
  const userIds = users.map(user => user.id);
  
  const { 
    selectedIds,
    isSelected,
    toggleSelect,
    selectAll,
    deselectAll,
    toggleSelectAll
  } = useSelection<string>();

  return (
    <div>
      <div className="toolbar">
        <button onClick={() => selectAll(userIds)}>Select All</button>
        <button onClick={deselectAll}>Deselect All</button>
        <button onClick={() => toggleSelectAll(userIds)}>Toggle All</button>
        {selectedIds.length > 0 && (
          <button>Delete Selected ({selectedIds.length})</button>
        )}
      </div>
      
      <ul>
        {users.map(user => (
          <li 
            key={user.id}
            className={isSelected(user.id) ? 'selected' : ''}
            onClick={() => toggleSelect(user.id)}
          >
            <input 
              type="checkbox" 
              checked={isSelected(user.id)} 
              onChange={() => toggleSelect(user.id)} 
            />
            {user.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### useFilterSearch

A hook for managing search and filter functionality.

**Location:** `useFilterSearch.ts`

**Usage:**
```tsx
import useFilterSearch from '../hooks/useFilterSearch';

function FilterableList() {
  const allUsers = [/* user data */];
  
  const { 
    searchTerm, 
    setSearchTerm,
    filterActive,
    toggleFilter,
    filterItems,
    resetFilters
  } = useFilterSearch<User>({
    searchKeys: ['name', 'email', 'role'],
    defaultFilterActive: true
  });

  // Apply filters to get filtered list
  const filteredUsers = filterItems(allUsers);

  return (
    <div>
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button 
          onClick={toggleFilter}
          className={filterActive ? 'active' : ''}
        >
          Filter
        </button>
        <button onClick={resetFilters}>Reset</button>
      </div>
      
      <ul>
        {filteredUsers.map(user => (
          <li key={user.id}>{user.name} - {user.email}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Usage

### Importing

Import hooks using the index file:

```typescript
import { useErrorHandler, useFormValidation } from '../hooks';
```

### Form Validation Example

```typescript
import { useFormValidation } from '../hooks';

function MyForm() {
  const validationSchema = {
    name: { required: true, minLength: 3 },
    email: { required: true, email: true },
    age: { min: 18, max: 100 }
  };

  const {
    formData,
    errors,
    handleChange,
    handleBlur,
    validateForm,
    setFieldValue
  } = useFormValidation({ name: '', email: '', age: '' }, validationSchema);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Submit the form
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="name"
        value={formData.name}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      {errors.name && <p>{errors.name}</p>}
      
      {/* More form fields */}
    </form>
  );
}
```

### API Data Fetching Example

```typescript
import { useList, useCreate } from '../hooks';

function CompanyList() {
  const { data: companies, isLoading, error } = useList('companies');
  const createMutation = useCreate('companies');

  const handleAddCompany = async (newCompany) => {
    try {
      await createMutation.mutateAsync(newCompany);
      // Success handling
    } catch (error) {
      // Error handling
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {companies.map(company => (
        <div key={company.id}>{company.name}</div>
      ))}
    </div>
  );
}
```

## Creating New Hooks

When creating a new custom hook:

1. Follow the React hooks naming convention (start with "use").
2. Create a TypeScript file with the hook name (e.g., `useMyHook.ts`).
3. Document the hook with JSDoc comments.
4. Export the hook as the default export.
5. Add documentation to this README.

## Best Practices

1. **Keep hooks focused**: Each hook should have a single responsibility.
2. **Use TypeScript**: Ensure proper typing for better developer experience.
3. **Handle errors gracefully**: All hooks that interact with external resources should handle errors.
4. **Include loading states**: For async operations, include loading state management.
5. **Use callback patterns**: Use useCallback for handlers to prevent unnecessary rerenders.
6. **Cleanup effects**: Remember to clean up side effects in useEffect returns.