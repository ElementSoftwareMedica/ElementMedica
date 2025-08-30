# Contributing to Course Management System

Thank you for your interest in contributing to our Course Management System. This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## How Can I Contribute?

### Reporting Bugs

This section guides you through submitting a bug report. Following these guidelines helps maintainers and the community understand your report, reproduce the behavior, and find related reports.

- **Use the GitHub issue tracker** to report bugs.
- **Use a clear and descriptive title** for the issue to identify the problem.
- **Describe the exact steps which reproduce the problem** in as much detail as possible.
- **Provide specific examples** to demonstrate the steps.
- **Describe the behavior you observed after following the steps** and point out what exactly is the problem with that behavior.
- **Explain which behavior you expected to see instead and why.**
- **Include screenshots or animated GIFs** which show you following the described steps and clearly demonstrate the problem.
- **If the problem is related to performance or memory**, include a CPU profile capture with your report.
- **If the problem wasn't triggered by a specific action**, describe what you were doing before the problem happened.

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion, including completely new features and minor improvements to existing functionality.

- **Use the GitHub issue tracker** to suggest enhancements.
- **Use a clear and descriptive title** for the issue to identify the suggestion.
- **Provide a step-by-step description of the suggested enhancement** in as much detail as possible.
- **Provide specific examples to demonstrate the steps**.
- **Describe the current behavior** and **explain which behavior you expected to see instead** and why.
- **Include screenshots or animated GIFs** which help you demonstrate the steps or point out the part of the application the suggestion is related to.
- **Explain why this enhancement would be useful** to most users.
- **List some other applications where this enhancement exists**, if applicable.

### Pull Requests

- Fill in the required template
- Follow the style guides
- Document new code based on the documentation style guide
- End all files with a newline
- Avoid platform-dependent code

## Development Workflow

### Setting Up Development Environment

1. Fork the repository
2. Clone your fork
   ```bash
   git clone https://github.com/your-username/course-management.git
   cd course-management
   ```

3. Install dependencies
   ```bash
   npm install
   ```

4. Create a branch for your changes
   ```bash
   git checkout -b feature/your-feature-name
   ```

5. Make your changes following the coding standards

6. Run tests to ensure your changes don't break existing functionality
   ```bash
   npm test
   ```

7. Push your changes to your fork
   ```bash
   git push origin feature/your-feature-name
   ```

8. Create a Pull Request to the main repository

### Branch Naming Convention

- `feature/` - New features or enhancements
- `bugfix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring without functionality changes
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks, dependency updates, etc.

Example: `feature/add-course-filter`

### Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools and libraries

Example: `feat: add course filtering by category`

## Style Guides

### JavaScript/TypeScript Style Guide

We use ESLint and Prettier to enforce code style:

- 2 spaces for indentation
- Single quotes for strings
- Semicolons are required
- Trailing commas in multi-line objects and arrays
- Maximum line length of 100 characters

### CSS Style Guide

We use TailwindCSS and follow these additional guidelines:

- Use the utility-first approach
- Avoid custom CSS when possible
- When custom CSS is needed, use CSS modules or styled components
- Follow BEM naming convention for custom CSS classes

### Documentation Style Guide

- Use [JSDoc](https://jsdoc.app/) for code documentation
- Document all public functions, components, and types
- Keep documentation concise but complete
- Include examples for complex or non-obvious functionality

## Project Structure

Please follow the established project structure when adding new files:

```
src/
├── api/            # API-specific code
├── app/            # App-specific configurations
├── components/     # UI components
├── constants/      # Application constants
├── context/        # React context
├── hooks/          # Custom React hooks
├── pages/          # Page components
├── services/       # API services
├── styles/         # Global styles
├── types/          # TypeScript type definitions
└── utils/          # Utility functions
```

## Adding New Features

When adding new features, follow these steps:

1. Create types in the appropriate file within the `types/` directory
2. Add any API services in the `services/` directory
3. Create custom hooks in the `hooks/` directory
4. Implement UI components in the `components/` directory
5. Update or create pages in the `pages/` directory
6. Add tests for all new functionality

## Testing

- Write unit tests for all new functionality
- Ensure all existing tests pass before submitting a PR
- Follow the testing guidelines in `src/tests/README.md`

## Documentation

Always update documentation to reflect your changes:

- Update README.md if needed
- Update or add JSDoc comments for all public functions and components
- Create or update specific documentation files in the `docs/` directory

## Review Process

All submissions require review. We use GitHub pull requests for this purpose.

1. A core team member will review your PR
2. They may request changes or ask for clarification
3. Once approved, a team member will merge your PR
4. Your contribution will be part of the next release

## Recognition

All contributors will be acknowledged in the project's CONTRIBUTORS.md file.