# Styles Guidelines

This directory contains global styles and theme definitions for the application.

## Overview

We use TailwindCSS as our primary styling solution, providing utility-first CSS that enables rapid UI development.

## Structure

```
styles/
├── globals.css      # Global CSS styles and Tailwind imports
└── theme.ts         # Theme variables and configuration
```

## Guidelines

### Using TailwindCSS

We follow these principles for styling components:

1. **Utility-First Approach**: Use Tailwind utility classes directly in components rather than custom CSS when possible.

2. **Component Organization**: Group related utility classes for readability:
   ```jsx
   <button 
     className={`
       // Layout
       flex items-center gap-2 px-4 py-2
       // Typography
       font-medium text-sm
       // Appearance
       bg-blue-600 text-white rounded-md 
       // States
       hover:bg-blue-700 focus:outline-none focus:ring-2
     `}
   >
     Submit
   </button>
   ```

3. **Custom Classes**: When utility classes become repetitive, use the `@apply` directive in a component-specific CSS module or extract a component.

4. **Responsive Design**: Use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`) consistently.

5. **Dark Mode**: Use the `dark:` variant for dark mode styles.

### Custom CSS

When Tailwind utilities aren't sufficient:

1. **CSS Modules**: Use CSS Modules for component-specific styles that can't be achieved with utilities.
   ```tsx
   // Button.module.css
   .customButton {
     @apply bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded;
     text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
   }
   
   // Button.tsx
   import styles from './Button.module.css';
   
   export const Button = ({ children }) => (
     <button className={styles.customButton}>{children}</button>
   );
   ```

2. **Global Styles**: Add global styles in `globals.css` using the `@layer` directive:
   ```css
   @layer base {
     h1 {
       @apply text-2xl font-bold mb-4;
     }
   }
   ```

### Theme Customization

Use the `theme.ts` file for custom theme configuration:

```typescript
// Example theme configuration
const theme = {
  colors: {
    primary: {
      light: '#3b82f6',
      DEFAULT: '#2563eb',
      dark: '#1d4ed8',
    },
    // ...other colors
  },
  // ...other theme values
};

export default theme;
```

## Best Practices

1. **Consistency**: Maintain consistent spacing, colors, and typography using Tailwind's design system.

2. **Reusability**: Extract common patterns into reusable components instead of duplicating styles.

3. **Performance**: Avoid large CSS-in-JS objects that can impact runtime performance.

4. **Accessibility**: Ensure sufficient color contrast and usable focus states.

5. **Organization**: Keep related styles together and use comments to separate logical sections.

## TailwindCSS Configuration

The project's TailwindCSS configuration is in `tailwind.config.js` at the root of the project. Any extensions to the default theme should be added there. 