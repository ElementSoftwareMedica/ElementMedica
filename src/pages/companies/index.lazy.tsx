import { lazy } from 'react';

// Company Details/Edit/Create
export const CompanyDetailsLazy = lazy(() => import('./CompanyDetails'));
export const CompanyEditLazy = lazy(() => import('./CompanyEdit'));
export const CompanyCreateLazy = lazy(() => import('./CompanyCreate'));
