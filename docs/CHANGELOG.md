# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.0] - 2025-01-XX - Project 46 Optimization

### 🔒 Security - CRITICAL FIXES

#### Advanced Permissions Bypass FIX
- **CRITICAL**: Fixed complete bypass in `advanced-permissions.js` that allowed ALL requests without checking permissions
- 25 route files were affected by this bypass
- Now properly uses `RBACService.hasPermission()` with `resource:action` format
- All permission checks now use the standardized format

#### Auth Pattern Standardization
- Removed ALL `req.person || req.user` backward compatibility patterns (31+ instances)
- Standardized to `req.person` only across all middleware and routes
- Files updated:
  - `middleware/advanced-permissions.js` (3 instances)
  - `middleware/virtualEntityMiddleware.js` (1 instance)
  - `middleware/auth.js` (1 instance)
  - `routes/companies-routes.js` (4 instances)
  - `routes/company-sites-routes.js` (5 instances)
  - `routes/reparto-routes.js` (7 instances)
  - `routes/attestati-routes.js` (1 instance)
  - `routes/dashboard-routes.js` (3 instances)
  - `routes/courses-routes.js` (1 instance)
  - `routes/sopralluogo-routes.js` (5 instances)
  - `routes/dvr-routes.js` (5 instances)
  - `routes/schedules-routes.js` (2 instances)
  - `routes/employees-routes.js` (5 instances)

### 🧹 Code Quality

#### Console.log Cleanup
- Removed 24 `console.log` and 10 `console.error` debug statements from `schedules-routes.js`
- Removed debug logging from `virtualEntityMiddleware.js`
- Production code now uses proper `logger` utility only
- Scripts and test files still use console.log (appropriate for CLI output)

#### Frontend Notification Standardization
- Migrated 10 `alert()` calls to `showToast()` pattern
- Files updated:
  - `src/pages/documents/DocumentListPage.tsx`
  - `src/pages/documents/LettereIncarico.tsx`
  - `src/pages/documents/Attestati.tsx`
  - `src/pages/DocumentsCorsi.tsx`
  - `src/pages/finance/Invoices.tsx`
- Consistent toast notifications with proper type (error/success/warning)

### Added
- Additional project documentation 
- Enhanced type organization with separate files for different entities
- Context exports through a central index file
- Improved structure for internationalization
- Style guidelines and utils
- Templates for CSV imports
- Setup script for new developers

### Changed
- Organized all related exports through index files
- Standardized import patterns across the codebase
- Improved folder structure and code organization

### Fixed
- Fixed duplication issues with UI components
- Resolved import inconsistencies
- Improved type safety throughout the application
- Enhanced error handling patterns

## [1.0.0] - 2023-06-15

### Added
- Initial release of the Course Management System
- Core features: course management, employee tracking, company profiles
- API integration with centralized client
- Component library and UI framework
- Internationalization support (Italian and English)
- Authentication and authorization
- Form validation and error handling
- Data export functionality 

## API and Login Fixes

### Fixed Endpoints
- Added `/schedules` endpoint to prevent 500 errors in Dashboard and ScheduledCoursesPage
- Added `/activity-logs` endpoint to prevent 404 errors
- Added more required endpoints:
  - `/courses` - Course listing 
  - `/trainers` - Trainer information
  - `/companies` - Company data
  - `/employees` - Employee records

### Authentication Improvements
- Enhanced login support for multiple credential formats:
  - Added support for `test@admin.com` / `admin123` login
  - Maintained compatibility with `admin@example.com` / `password`
- Updated token verification to work with both credential sets
- Added detailed login error logging to aid debugging
- Added comprehensive permissions for admin accounts (including test@admin.com)
  - Full access to users, roles, courses, schedules, trainers, companies, employees
  - Read access to activity logs
  - Create, read, and download access for attestati and lettere
- Added wildcard permissions support:
  - Universal permissions with `all:*` format
  - Resource-wide permissions with `resource:all` format
  - Enhanced permission checking for broader access
- Fixed role property handling to ensure proper Admin recognition

### Testing and Documentation
- Updated `login-test.html` tool:
  - Added user dropdown selector for quick credential testing
  - Maintained original login flow and token verification
- Enhanced documentation in `LOGIN_INSTRUCTIONS.md`:
  - Added information about new endpoints
  - Added troubleshooting steps
  - Added detailed usage instructions

### Startup Script
- Created `start-app.sh` to simplify application startup:
  - Automatically kills existing processes
  - Starts API server on port 4001
  - Starts frontend with proper backend connection

### Error Handling
- Improved API response status codes
- Added comprehensive error logging
- Improved error handling in frontend components

### Data Consistency
- Ensured consistent field names and structure across endpoints
- Added proper mock data for all application features

## Future Improvements
- Add additional endpoints for:
  - Student registration
  - Course completion tracking
  - Certificate generation
- Implement proper pagination for lists
- Add search functionality to API endpoints
- Add WebSocket support for real-time updates