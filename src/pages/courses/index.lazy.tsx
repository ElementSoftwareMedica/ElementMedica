import { lazy } from 'react';

// Course Details/Edit/Create
export const CourseDetailsLazy = lazy(() => import('./CourseDetails'));
export const CourseEditLazy = lazy(() => import('./CourseEdit'));
export const CourseCreateLazy = lazy(() => import('./CourseCreate'));
