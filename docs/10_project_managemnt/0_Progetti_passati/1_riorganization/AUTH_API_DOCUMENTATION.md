# Authentication API Documentation

## Overview

This document describes the Authentication API endpoints for the training management system. The API provides comprehensive user authentication, authorization, and management capabilities with RBAC (Role-Based Access Control) and GDPR compliance.

## Base URL

```
http://localhost:3001/api
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Tokens are provided in two ways:
- **HTTP-only cookies** (recommended for web clients)
- **Authorization header** (for API clients)

### Token Types

1. **Access Token**: Short-lived (15 minutes), used for API requests
2. **Refresh Token**: Long-lived (7 days), used to obtain new access tokens
3. **Session Token**: Used for session management and tracking

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": ["Additional error details"]
}
```

## Authentication Endpoints

### POST /auth/login

Authenticate user and obtain tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "userpassword",
  "rememberMe": false
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "companyId": "uuid",
    "company": {
      "id": "uuid",
      "nome": "Company Name"
    },
    "roles": ["employee"],
    "permissions": ["courses.view", "enrollments.view"],
    "isVerified": true,
    "lastLoginAt": "2024-01-15T10:30:00Z"
  },
  "tokens": {
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token",
    "expiresIn": 900,
    "tokenType": "Bearer"
  }
}
```

**Error Codes:**
- `AUTH_INVALID_CREDENTIALS`: Invalid email or password
- `AUTH_ACCOUNT_DEACTIVATED`: User account is deactivated
- `AUTH_ACCOUNT_LOCKED`: Account temporarily locked due to failed attempts
- `VALIDATION_ERROR`: Invalid request data

### POST /auth/logout

Logout current user and invalidate session.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### POST /auth/logout-all

Logout from all devices and invalidate all user sessions.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out from all devices"
}
```

### POST /auth/refresh

Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "refresh-token"
}
```

**Response (200):**
```json
{
  "success": true,
  "tokens": {
    "accessToken": "new-jwt-token",
    "expiresIn": 900,
    "tokenType": "Bearer"
  }
}
```

**Error Codes:**
- `AUTH_REFRESH_TOKEN_MISSING`: No refresh token provided
- `AUTH_REFRESH_FAILED`: Invalid or expired refresh token

### POST /auth/register

Register new user (admin only).

**Headers:**
```
Authorization: Bearer <access-token>
```

**Required Permissions:** `users.create`

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "securepassword",
  "firstName": "Jane",
  "lastName": "Smith",
  "companyId": "uuid",
  "employeeId": "uuid",
  "roles": ["employee"]
}
```

**Response (201):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "newuser@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "companyId": "uuid",
    "roles": ["employee"]
  }
}
```

### GET /auth/me

Get current user information.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+39 123 456 7890",
    "language": "it",
    "timezone": "Europe/Rome",
    "companyId": "uuid",
    "employeeId": "uuid",
    "company": {
      "id": "uuid",
      "nome": "Company Name"
    },
    "employee": {
      "id": "uuid",
      "nome": "John",
      "cognome": "Doe"
    },
    "roles": ["employee"],
    "permissions": ["courses.view", "enrollments.view"],
    "isActive": true,
    "isVerified": true,
    "lastLoginAt": "2024-01-15T10:30:00Z",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### PUT /auth/me

Update current user profile.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+39 123 456 7890",
  "language": "it",
  "timezone": "Europe/Rome"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+39 123 456 7890",
    "language": "it",
    "timezone": "Europe/Rome"
  }
}
```

### POST /auth/change-password

Change user password.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newsecurepassword"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Codes:**
- `AUTH_INVALID_CURRENT_PASSWORD`: Current password is incorrect
- `AUTH_WEAK_PASSWORD`: New password doesn't meet requirements

### GET /auth/sessions

Get user's active sessions.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200):**
```json
{
  "success": true,
  "sessions": [
    {
      "id": "uuid",
      "device_info": {
        "platform": "web",
        "userAgent": "Mozilla/5.0..."
      },
      "ip_address": "192.168.1.1",
      "last_activity": "2024-01-15T10:30:00Z",
      "created_at": "2024-01-15T09:00:00Z",
      "isCurrent": true
    }
  ]
}
```

### DELETE /auth/sessions/:sessionId

Revoke a specific session.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Session revoked successfully"
}
```

## User Management Endpoints

### GET /users

Get paginated list of users.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Required Permissions:** `users.view`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `search`: Search term for name/email
- `companyId`: Filter by company (global admin only)
- `role`: Filter by role
- `isActive`: Filter by active status
- `sortBy`: Sort field (default: created_at)
- `sortOrder`: Sort order (asc/desc, default: desc)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+39 123 456 7890",
      "companyId": "uuid",
      "employeeId": "uuid",
      "company": {
        "id": "uuid",
        "nome": "Company Name"
      },
      "employee": {
        "id": "uuid",
        "nome": "John",
        "cognome": "Doe"
      },
      "roles": [
        {
          "id": "uuid",
          "name": "employee",
          "display_name": "Employee"
        }
      ],
      "isActive": true,
      "isVerified": true,
      "lastLoginAt": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### GET /users/:id

Get user by ID.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Required Permissions:** `users.view`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+39 123 456 7890",
    "language": "it",
    "timezone": "Europe/Rome",
    "companyId": "uuid",
    "employeeId": "uuid",
    "company": {
      "id": "uuid",
      "nome": "Company Name"
    },
    "employee": {
      "id": "uuid",
      "nome": "John",
      "cognome": "Doe"
    },
    "roles": [
      {
        "id": "uuid",
        "name": "employee",
        "display_name": "Employee",
        "permissions": ["courses.view", "enrollments.view"]
      }
    ],
    "permissions": ["courses.view", "enrollments.view"],
    "preferences": {
      "notifications": true,
      "theme": "light"
    },
    "isActive": true,
    "isVerified": true,
    "lastLoginAt": "2024-01-15T10:30:00Z",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### POST /users

Create new user.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Required Permissions:** `users.create`

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "securepassword",
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+39 123 456 7890",
  "language": "it",
  "companyId": "uuid",
  "employeeId": "uuid",
  "roles": ["employee"]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "newuser@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "phone": "+39 123 456 7890",
    "language": "it",
    "companyId": "uuid",
    "employeeId": "uuid",
    "roles": [
      {
        "id": "uuid",
        "name": "employee",
        "display_name": "Employee"
      }
    ],
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### PUT /users/:id

Update user.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Required Permissions:** `users.update`

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+39 123 456 7890",
  "language": "en",
  "timezone": "Europe/London",
  "employeeId": "uuid",
  "isActive": true
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+39 123 456 7890",
    "language": "en",
    "timezone": "Europe/London",
    "companyId": "uuid",
    "employeeId": "uuid",
    "isActive": true,
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### DELETE /users/:id

Delete user (soft delete).

**Headers:**
```
Authorization: Bearer <access-token>
```

**Required Permissions:** `users.delete`

**Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

### POST /users/:id/roles

Assign role to user.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Required Permissions:** `users.manage_roles`

**Request Body:**
```json
{
  "roleId": "uuid",
  "companyId": "uuid"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "role": {
      "id": "uuid",
      "name": "manager",
      "display_name": "Manager"
    },
    "companyId": "uuid",
    "assignedAt": "2024-01-15T10:30:00Z"
  }
}
```

### DELETE /users/:id/roles/:roleId

Remove role from user.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Required Permissions:** `users.manage_roles`

**Response (200):**
```json
{
  "success": true,
  "message": "Role removed successfully"
}
```

### GET /users/:id/roles

Get user's roles.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Required Permissions:** `users.view`, `roles.view`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "role": {
        "id": "uuid",
        "name": "employee",
        "display_name": "Employee",
        "description": "Standard employee role",
        "permissions": ["courses.view", "enrollments.view"],
        "is_system_role": true
      },
      "companyId": "uuid",
      "assignedAt": "2024-01-01T00:00:00Z",
      "assignedBy": "uuid"
    }
  ]
}
```

### POST /users/:id/reset-password

Reset user password (admin only).

**Headers:**
```
Authorization: Bearer <access-token>
```

**Required Permissions:** `users.update`

**Request Body:**
```json
{
  "newPassword": "newsecurepassword",
  "forceChange": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

## Role Management Endpoints

### GET /roles

Get all roles.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Required Permissions:** `roles.view`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)
- `search`: Search term
- `companyId`: Filter by company (global admin only)
- `isSystemRole`: Filter by system role status
- `sortBy`: Sort field (default: name)
- `sortOrder`: Sort order (asc/desc, default: asc)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "employee",
      "displayName": "Employee",
      "description": "Standard employee role",
      "permissions": ["courses.view", "enrollments.view"],
      "isSystemRole": true,
      "companyId": null,
      "company": null,
      "userCount": 25,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 10,
    "pages": 1
  }
}
```

### GET /roles/:id

Get role by ID.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Required Permissions:** `roles.view`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "employee",
    "displayName": "Employee",
    "description": "Standard employee role",
    "permissions": ["courses.view", "enrollments.view"],
    "isSystemRole": true,
    "companyId": null,
    "company": null,
    "users": [
      {
        "id": "uuid",
        "email": "user@example.com",
        "first_name": "John",
        "last_name": "Doe"
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### POST /roles

Create new role.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Required Permissions:** `roles.create`

**Request Body:**
```json
{
  "name": "custom_manager",
  "displayName": "Custom Manager",
  "description": "Custom manager role for specific company",
  "permissions": ["courses.view", "courses.create", "users.view"],
  "companyId": "uuid"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "custom_manager",
    "displayName": "Custom Manager",
    "description": "Custom manager role for specific company",
    "permissions": ["courses.view", "courses.create", "users.view"],
    "isSystemRole": false,
    "companyId": "uuid",
    "company": {
      "id": "uuid",
      "nome": "Company Name"
    },
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### PUT /roles/:id

Update role.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Required Permissions:** `roles.update`

**Request Body:**
```json
{
  "displayName": "Updated Manager",
  "description": "Updated description",
  "permissions": ["courses.view", "courses.create", "courses.update", "users.view"]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "custom_manager",
    "displayName": "Updated Manager",
    "description": "Updated description",
    "permissions": ["courses.view", "courses.create", "courses.update", "users.view"],
    "isSystemRole": false,
    "companyId": "uuid",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### DELETE /roles/:id

Delete role.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Required Permissions:** `roles.delete`

**Response (200):**
```json
{
  "success": true,
  "message": "Role deleted successfully"
}
```

### POST /roles/:id/clone

Clone existing role.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Required Permissions:** `roles.create`

**Request Body:**
```json
{
  "name": "cloned_role",
  "displayName": "Cloned Role",
  "companyId": "uuid"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "cloned_role",
    "displayName": "Cloned Role",
    "description": "Cloned from Employee",
    "permissions": ["courses.view", "enrollments.view"],
    "isSystemRole": false,
    "companyId": "uuid",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### GET /permissions

Get available permissions.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Required Permissions:** `roles.view`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "byResource": {
      "users": [
        "users.view",
        "users.create",
        "users.update",
        "users.delete",
        "users.manage_roles"
      ],
      "roles": [
        "roles.view",
        "roles.create",
        "roles.update",
        "roles.delete"
      ],
      "courses": [
        "courses.view",
        "courses.create",
        "courses.update",
        "courses.delete",
        "courses.manage_schedules"
      ]
    },
    "all": [
      {
        "name": "users.view",
        "resource": "users",
        "action": "view",
        "description": "Visualizzare utenti"
      },
      {
        "name": "users.create",
        "resource": "users",
        "action": "create",
        "description": "Creare nuovi utenti"
      }
    ]
  }
}
```

## Security Features

### Rate Limiting

- **Global**: 100 requests per 15 minutes per IP
- **Login**: 5 attempts per 15 minutes per IP
- **Registration**: 10 registrations per hour per IP
- **Password Change**: 5 attempts per hour per user

### Account Security

- **Failed Login Attempts**: Account locked after 5 failed attempts for 30 minutes
- **Password Requirements**: Minimum 8 characters, validated for strength
- **Session Management**: Automatic cleanup of expired sessions
- **Multi-device Support**: Track and manage sessions across devices

### GDPR Compliance

- **Audit Logging**: All user actions are logged with timestamps
- **Data Export**: Users can request data export (future feature)
- **Consent Management**: Track user consents (future feature)
- **Data Retention**: Configurable retention periods for different data types

### Company Isolation

- **Data Segregation**: Users can only access data from their company
- **Role Scoping**: Roles can be company-specific or system-wide
- **Permission Inheritance**: System roles available to all companies

## Error Codes Reference

### Authentication Errors
- `AUTH_INVALID_CREDENTIALS`: Invalid email or password
- `AUTH_ACCOUNT_DEACTIVATED`: User account is deactivated
- `AUTH_ACCOUNT_LOCKED`: Account temporarily locked
- `AUTH_REFRESH_TOKEN_MISSING`: No refresh token provided
- `AUTH_REFRESH_FAILED`: Invalid or expired refresh token
- `AUTH_WEAK_PASSWORD`: Password doesn't meet requirements
- `AUTH_INVALID_CURRENT_PASSWORD`: Current password is incorrect

### User Management Errors
- `USER_NOT_FOUND`: User not found or not accessible
- `USER_EXISTS`: User with email already exists
- `USER_GET_FAILED`: Failed to retrieve user(s)
- `USER_CREATE_FAILED`: Failed to create user
- `USER_UPDATE_FAILED`: Failed to update user
- `USER_DELETE_FAILED`: Failed to delete user
- `SELF_DELETE_FORBIDDEN`: Cannot delete own account
- `EMPLOYEE_NOT_FOUND`: Employee not found in company

### Role Management Errors
- `ROLE_NOT_FOUND`: Role not found or not accessible
- `ROLE_NAME_EXISTS`: Role name already exists
- `ROLE_GET_FAILED`: Failed to retrieve role(s)
- `ROLE_CREATE_FAILED`: Failed to create role
- `ROLE_UPDATE_FAILED`: Failed to update role
- `ROLE_DELETE_FAILED`: Failed to delete role
- `ROLE_CLONE_FAILED`: Failed to clone role
- `SYSTEM_ROLE_EDIT_FORBIDDEN`: Cannot edit system roles
- `SYSTEM_ROLE_DELETE_FORBIDDEN`: Cannot delete system roles
- `ROLE_HAS_ACTIVE_USERS`: Cannot delete role with active users
- `ROLE_ALREADY_ASSIGNED`: User already has this role
- `USER_ROLE_NOT_FOUND`: User role assignment not found
- `INVALID_PERMISSION_FORMAT`: Invalid permission format

### General Errors
- `VALIDATION_ERROR`: Request validation failed
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Endpoint not found
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Internal server error

## Usage Examples

### Login Flow

```javascript
// 1. Login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    rememberMe: true
  }),
  credentials: 'include' // Include cookies
});

const { user, tokens } = await loginResponse.json();

// 2. Use access token for API requests
const usersResponse = await fetch('/api/users', {
  headers: {
    'Authorization': `Bearer ${tokens.accessToken}`
  },
  credentials: 'include'
});

// 3. Refresh token when needed
const refreshResponse = await fetch('/api/auth/refresh', {
  method: 'POST',
  credentials: 'include' // Refresh token in cookie
});

const { tokens: newTokens } = await refreshResponse.json();
```

### User Management

```javascript
// Create user
const createUserResponse = await fetch('/api/users', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'newuser@example.com',
    password: 'securepassword',
    firstName: 'Jane',
    lastName: 'Smith',
    roles: ['employee']
  })
});

// Assign role
const assignRoleResponse = await fetch(`/api/users/${userId}/roles`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    roleId: 'manager-role-id'
  })
});
```

### Role Management

```javascript
// Create custom role
const createRoleResponse = await fetch('/api/roles', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'custom_trainer',
    displayName: 'Custom Trainer',
    description: 'Trainer with additional permissions',
    permissions: [
      'courses.view',
      'courses.create',
      'courses.update',
      'sessions.view',
      'sessions.create',
      'sessions.manage_attendance'
    ]
  })
});

// Clone existing role
const cloneRoleResponse = await fetch(`/api/roles/${existingRoleId}/clone`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'cloned_manager',
    displayName: 'Cloned Manager'
  })
});
```

This documentation provides a comprehensive guide to using the Authentication API. For additional support or questions, please refer to the development team.