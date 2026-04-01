import { lazy } from 'react';

const EmployeesPageLazy = lazy(() => import('./EmployeesPage'));

export default EmployeesPageLazy;