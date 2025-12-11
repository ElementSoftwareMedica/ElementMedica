import { lazy } from 'react';

export const FormSubmissionsViewLazy = lazy(() =>
  import('./FormSubmissionsView')
);

export default FormSubmissionsViewLazy;
