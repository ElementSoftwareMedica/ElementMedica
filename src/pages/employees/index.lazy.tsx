import { lazy } from 'react';

// Employee Details/Edit/Create
export const EmployeeDetailsLazy = lazy(() => import('./EmployeeDetails'));
export const EmployeeEditLazy = lazy(() => import('./EmployeeEdit'));
export const EmployeeCreateLazy = lazy(() => import('./EmployeeCreate'));
