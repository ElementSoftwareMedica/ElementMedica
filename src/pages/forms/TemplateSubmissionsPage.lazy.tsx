import React, { Suspense } from 'react';

const TemplateSubmissionsPage = React.lazy(() => import('./TemplateSubmissionsPage'));

export const TemplateSubmissionsPageLazy: React.FC = () => {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-gray-600">Caricamento...</p>
      </div>
    }>
      <TemplateSubmissionsPage />
    </Suspense>
  );
};

export default TemplateSubmissionsPageLazy;
