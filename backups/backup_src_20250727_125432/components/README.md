# Component Structure

This directory contains all the React components used in the application, organized by feature and type.

## Structure

- `index.ts` - Exports main components for easy importing
- `ui/` - Basic UI components with no business logic (Button, Input, etc.)
- `shared/` - Shared components used across multiple features
  - `ui/` - Extended UI components with more functionality
  - `form/` - Form-related components
  - `tables/` - Table-related components
- Feature-specific directories (companies/, courses/, etc.)
- Layout components (Layout.tsx, Header.tsx, Sidebar.tsx)

## Component Guidelines

### Naming Conventions

- Use PascalCase for component names
- Use descriptive names that indicate the component's purpose
- Suffix form components with "Form" (e.g., `CourseForm`)
- Suffix list components with "List" (e.g., `EmployeeList`)

### Component Organization

We follow a functional organization approach:

1. Import statements
2. Interface/type definitions
3. Component function (with proper parameter destructuring)
4. Helper functions/hooks within the component
5. Return statement with JSX

### Example Component

```tsx
import React, { useState } from 'react';
import { Button } from '../ui';

interface UserProfileProps {
  user: {
    id: string;
    name: string;
    email: string;
  };
  onEdit: (id: string) => void;
}

export function UserProfile({ user, onEdit }: UserProfileProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(prev => !prev);
  };

  return (
    <div className="user-profile">
      <h2>{user.name}</h2>
      {isExpanded && <p>{user.email}</p>}
      <Button onClick={toggleExpand}>
        {isExpanded ? 'Show Less' : 'Show More'}
      </Button>
      <Button onClick={() => onEdit(user.id)}>Edit</Button>
    </div>
  );
}
```

## Component Types

### UI Components

- Basic, reusable UI elements
- No business logic or data fetching
- Located in `ui/` and `shared/ui/`

### Feature Components

- Components specific to a feature (e.g., CourseForm, EmployeeList)
- May include business logic and data manipulation
- Located in feature-specific directories

### Layout Components

- Define the overall structure of the application
- Include navigation, headers, sidebars, etc.
- Located at the root of the components directory

### Page Components

- Top-level components that represent a route or page
- Typically compose multiple feature components
- Located in the `pages/` directory

## Importing Components

```tsx
// Import from index for main components
import { Layout, Header, Sidebar } from '../components';

// Import UI components from design system
import { Button } from '../design-system/atoms/Button';
import { Input } from '../design-system/atoms/Input';
import { Pagination } from '../design-system/molecules/Pagination';

// Import business-specific shared components
import { ActionButton, AddEntityDropdown } from '../components/shared/ui';

// Import feature-specific components
import { CourseForm } from '../components/courses';
```

## When to Create a New Component

- When a piece of UI is reused in multiple places
- When a component becomes too large or complex
- When you need to encapsulate a specific behavior
- When you want to separate concerns for better testability

## Shared Components

### Layouts

#### PageHeader

PageHeader is a standardized header component for pages, providing a consistent UI across the application.

```jsx
import { PageHeader } from '../../components/shared';

<PageHeader
  title="Page Title"
  subtitle="Page description or subtitle"
  viewMode="table"
  onViewModeChange={(mode) => setViewMode(mode)}
  selectionMode={selectionMode}
  onToggleSelectionMode={() => setSelectionMode(!selectionMode)}
  searchValue={searchTerm}
  onSearchChange={setSearchTerm}
  primaryActionText="Add Item"
  primaryActionIcon={<Plus className="h-5 w-5" />}
  onPrimaryAction={handleAddItem}
  // Or use a dropdown for multiple actions:
  primaryActionDropdownOptions={[
    {
      label: "Add Item",
      icon: <Plus className="h-4 w-4" />,
      onClick: handleAddItem
    },
    {
      label: "Import CSV",
      icon: <Upload className="h-4 w-4" />,
      onClick: handleImport
    }
  ]}
  filtersActive={filtersActive}
  // Include SelectionToolbar when in selection mode
  selectionToolbar={
    <SelectionToolbar
      selectedCount={selectedIds.length}
      totalCount={items.length}
      onSelectAll={handleSelectAll}
      onDeselectAll={handleDeselectAll}
      onDeleteSelected={handleDeleteSelected}
    />
  }
/>
```

#### SelectionToolbar

SelectionToolbar provides consistent actions for selection mode across the application.

```jsx
import { SelectionToolbar } from '../../components/shared';

<SelectionToolbar
  selectedCount={selectedIds.length}
  totalCount={items.length}
  onSelectAll={handleSelectAll}
  onDeselectAll={handleDeselectAll}
  onDeleteSelected={handleDeleteSelected}
  // Optional extra actions
  extraActions={
    <button className="pill-button">
      Export Selected
    </button>
  }
/>
```