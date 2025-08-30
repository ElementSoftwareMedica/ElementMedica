# API Migration Guide

## Overview

This document outlines the steps taken to fix API connection issues and implement a migration path from the old frontend configuration (hardcoded URLs) to the new centralized API configuration.

## Problem

The frontend was experiencing two different types of errors:

1. `ERR_CONNECTION_REFUSED` errors for endpoints on port 4000
2. `500 Internal Server Error` for some endpoints on port 4001

## Solution

### 1. Fixed Model Name Mismatches

We discovered that our Prisma schema was using different model names than what was being referenced in our API endpoints:

- Fixed in `proxy-server.js`:
  - Updated all references from `scheduledCourse` to `courseSchedule`
  - Updated field name references to match the Prisma schema (e.g., `dataGenerazione` vs `data_generazione`)

### 2. Added Legacy Compatibility Layer 

To maintain backward compatibility with frontend components still using hardcoded URLs to port 4000:

- Created a compatibility server that forwards requests from port 4000 to port 4001
- This allows the frontend to continue working while we gradually update components to use the centralized API config

### 3. Centralized API Configuration

- Updated frontend components to use the centralized API_ENDPOINTS from `src/config/api.ts`
- Created an automated script (`scripts/update-api-urls.js`) to update hardcoded URLs in frontend files

## Running the Servers

The application now runs with two servers:

1. **Main API Server (Port 4001)**: `cd backend && node proxy-server.js`
2. **Legacy Compatibility Server (Port 4000)**: `node scripts/start-legacy-server.js`

## Long-term Migration Plan

1. Continue updating all frontend components to use the API_ENDPOINTS configuration
2. Once all components are updated, remove the legacy compatibility server
3. Update the Prisma schema to use consistent naming conventions for all models and fields

## Troubleshooting

If you encounter API errors, check:

1. Ensure both servers are running (ports 4000 and 4001)
2. Check the Prisma schema for any field name inconsistencies
3. Use the debug endpoint `/api/debug/models` to see available Prisma models