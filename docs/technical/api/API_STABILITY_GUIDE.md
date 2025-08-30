# API Stability Guide

This guide documents critical architectural patterns in our application that must be preserved to maintain system stability.

## Critical Components

### 1. API Error Handling Strategy

The application implements a robust error handling strategy for API calls that ensures the application remains functional even when backend API calls fail. This strategy has several key components that **MUST NOT BE MODIFIED**:

#### Backend Error Handling (Mock Data Fallbacks)

- Both API servers (main and legacy) include mock data fallbacks for critical endpoints:
  - `/schedules` - Returns course schedule data
  - `/attestati` - Returns certificate data
  - Other important data endpoints

- These mock data patterns ensure that even if database connections fail, the API will still return valid data structures that the frontend can use.

- The fallback response format exactly matches what the real API would return, ensuring type safety and consistency.

#### Frontend Error Handling (`useFetch` Hook)

- The `useFetch` hook in `src/services/useFetch.ts` implements critical error handling logic:
  - Catches API errors and logs them
  - Falls back to mock data when an endpoint fails
  - Normalizes data fields between snake_case and camelCase to ensure compatibility

- **DO NOT MODIFY** the error handling or data normalization logic in this hook without comprehensive testing.

### 2. Database Schema Compatibility

Our application needs to handle both snake_case (database/API) and camelCase (frontend) field naming:

- Prisma schema in `prisma/schema.prisma` defines models with snake_case field names
- Frontend components expect camelCase properties
- The `useFetch` hook normalizes between these formats

If you modify any of the following files, ensure you maintain this compatibility:

- `prisma/schema.prisma`
- `backend/proxy-server.js`
- `backend/standalone-api.js`
- `backend/src/index.js`
- `src/services/useFetch.ts`

### 3. Server Architecture

Our application uses a multi-server architecture that must be preserved:

- **Main API** (port 4001): Primary API server with direct database access
- **Legacy API** (port 4000): Compatibility layer that proxies requests to the main API
- **Frontend** (port 5173): Vite-based frontend that connects to Legacy API

This setup allows for backward compatibility during the transition period. The frontend should continue to use port 4000 (Legacy API) for all requests to ensure proper error handling.

## Critical Field Naming Conventions

When adding new endpoints or modifying existing ones, observe these critical naming rules:

### Backend (API & Database)

- Use `snake_case` for all database fields and API response properties
- Example: `scheduled_course_id`, `partecipante_id`, `nome_file`, etc.

### Frontend

- Use `camelCase` for all component props and state variables
- Example: `scheduledCourseId`, `partecipanteId`, `nomeFile`, etc.

The `normalizeResponseData` function in `useFetch.ts` handles the conversion between these naming conventions, but adding new fields should follow these patterns consistently.

## Testing Before Deployment

Before deploying changes to any of the critical components mentioned above:

1. Test API endpoints with both successful and failed database connections
2. Verify frontend components handle both real and mock data correctly
3. Check that data normalization works for all field types

Remember: The application must remain functional even when the database or API servers experience errors.