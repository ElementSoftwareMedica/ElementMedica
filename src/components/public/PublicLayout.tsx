import React from 'react';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';
import { ConsentBanner } from './ConsentBanner';

interface PublicLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Layout per le pagine pubbliche di Element Formazione
 * Include header con menu sempre visibile e footer aziendale
 */
export const PublicLayout: React.FC<PublicLayoutProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header sempre visibile */}
      <PublicHeader />
      
      {/* Contenuto principale */}
      <main className={`flex-1 ${className}`}>
        {children}
      </main>
      
      {/* Footer aziendale */}
      <PublicFooter />
      
      {/* Consent Banner */}
      <ConsentBanner />
    </div>
  );
};

export default PublicLayout;