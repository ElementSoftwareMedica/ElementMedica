import React from 'react';
import { ArrowRight } from 'lucide-react';
import { PublicButton } from './PublicButton';

interface HeroSectionProps {
  title: string;
  subtitle?: string;
  description: string;
  primaryButton?: {
    text: string;
    href: string;
    icon?: React.ReactNode;
  };
  secondaryButton?: {
    text: string;
    href: string;
  };
  stats?: Array<{
    number: string;
    label: string;
  }>;
  showContactForm?: boolean;
  backgroundVariant?: 'gradient' | 'solid' | 'image';
  className?: string;
}

/**
 * Componente Hero Section riutilizzabile per le pagine pubbliche
 * Supporta diverse varianti di layout e contenuto
 */
export const HeroSection: React.FC<HeroSectionProps> = ({
  title,
  subtitle,
  description,
  primaryButton,
  secondaryButton,
  stats,
  showContactForm = false,
  backgroundVariant = 'gradient',
  className = ''
}) => {
  const getBackgroundClasses = () => {
    switch (backgroundVariant) {
      case 'gradient':
        return 'bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800';
      case 'solid':
        return 'bg-primary-600';
      case 'image':
        return 'bg-primary-600 bg-cover bg-center';
      default:
        return 'bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800';
    }
  };

  const handleButtonClick = (href: string) => {
    window.location.href = href;
  };

  return (
    <section className={`${getBackgroundClasses()} text-white ${className}`}>
      <div className="container mx-auto px-4 py-20">
        <div className={`grid grid-cols-1 ${showContactForm ? 'lg:grid-cols-2' : ''} gap-12 items-center`}>
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                {title}
                {subtitle && (
                  <span className="block text-primary-100">{subtitle}</span>
                )}
              </h1>
              <p className="text-xl text-white/90 leading-relaxed">
                {description}
              </p>
            </div>
            
            {(primaryButton || secondaryButton) && (
              <div className="flex flex-col sm:flex-row gap-4">
                {primaryButton && (
                  <PublicButton 
                    variant="secondary" 
                    size="lg"
                    onClick={() => handleButtonClick(primaryButton.href)}
                  >
                    {primaryButton.text}
                    {primaryButton.icon || <ArrowRight className="ml-2 w-5 h-5" />}
                  </PublicButton>
                )}
                {secondaryButton && (
                  <PublicButton 
                    variant="outline" 
                    size="lg"
                    onClick={() => handleButtonClick(secondaryButton.href)}
                  >
                    {secondaryButton.text}
                  </PublicButton>
                )}
              </div>
            )}

            {/* Quick Stats */}
            {stats && stats.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-8">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-2xl lg:text-3xl font-bold text-white">
                      {stat.number}
                    </div>
                    <div className="text-sm text-white/80">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contact Form */}
          {showContactForm && (
            <div className="relative">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <div className="space-y-6">
                  <h3 className="text-2xl font-semibold">Richiedi una Consulenza Gratuita</h3>
                  <form className="space-y-4">
                    <input
                      type="text"
                      placeholder="Nome e Cognome"
                      className="w-full px-4 py-3 rounded-full bg-white/20 border border-white/30 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      className="w-full px-4 py-3 rounded-full bg-white/20 border border-white/30 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/30"
                    />
                    <input
                        type="text"
                        placeholder="Nome"
                        className="w-full px-4 py-3 rounded-full bg-white/20 border border-white/30 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/30"
                      />
                    <PublicButton variant="secondary" size="lg" className="w-full">
                      Richiedi Consulenza
                    </PublicButton>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};