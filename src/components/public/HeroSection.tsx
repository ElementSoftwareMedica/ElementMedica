import React from 'react';
import { ArrowRight } from 'lucide-react';
import { PublicButton } from './PublicButton';
// import { useNavigate } from 'react-router-dom';
import { trackCtaEvent } from '../../services/logs';

interface HeroSectionProps {
  title: string | React.ReactNode;
  subtitle?: string;
  description: string;
  variant?: 'default' | 'medical' | 'formazione';
  primaryButton?: {
    text: string;
    href: string;
    icon?: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'medical';
  };
  secondaryButton?: {
    text: string;
    href: string;
    variant?: 'outline' | 'ghost';
  };
  stats?: Array<{
    value: string;
    label: string;
    icon?: React.ReactNode;
    highlight?: boolean;
    color?: 'default' | 'medical' | 'health';
  }>;
  showContactForm?: boolean;
  showTrustBadges?: boolean;
  backgroundVariant?: 'gradient' | 'solid' | 'image' | 'medical-gradient';
  backgroundPattern?: 'none' | 'diagonal-lines' | 'medical-grid' | 'dots';
  backgroundImage?: string;
  backgroundOverlay?: 'none' | 'light' | 'dark' | 'gradient';
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
  variant = 'default',
  primaryButton,
  secondaryButton,
  stats,
  showContactForm = false,
  showTrustBadges = false,
  backgroundVariant = 'gradient',
  backgroundPattern = 'none',
  backgroundImage,
  backgroundOverlay = 'dark',
  className = ''
}) => {
  // const navigate = useNavigate();

  const getBackgroundClasses = () => {
    // If we have a custom background image, only apply basic classes
    if (backgroundImage) {
      return 'bg-cover bg-center bg-no-repeat';
    }

    // Variant-based backgrounds
    if (variant === 'medical') {
      return 'bg-gradient-medical';
    }

    switch (backgroundVariant) {
      case 'medical-gradient':
        return 'bg-gradient-medical';
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

  const getOverlayClasses = () => {
    if (!backgroundImage) return '';
    switch (backgroundOverlay) {
      case 'light':
        return 'bg-white/30';
      case 'dark':
        return 'bg-gradient-to-br from-blue-900/80 via-indigo-900/70 to-slate-900/80';
      case 'gradient':
        return 'bg-gradient-to-r from-primary-900/90 to-primary-800/70';
      default:
        return '';
    }
  };

  const getPatternClasses = () => {
    switch (backgroundPattern) {
      case 'diagonal-lines':
        return 'bg-pattern-diagonal';
      case 'medical-grid':
        return 'bg-pattern-medical-grid';
      case 'dots':
        return 'bg-pattern-dots';
      default:
        return '';
    }
  };

  const backgroundStyle = backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : {};

  const handleButtonClick = (href: string, label: string, kind: 'primary' | 'secondary') => {
    // Traccia CTA in modo non bloccante
    trackCtaEvent({
      resource: 'public',
      action: 'cta_click',
      details: {
        label,
        href,
        section: 'HeroSection',
        variant: kind,
        pageTitle: title
      }
    });
  };

  return (
    <section
      className={`relative ${getBackgroundClasses()} ${getPatternClasses()} text-white overflow-hidden ${className}`}
      style={backgroundStyle}
    >
      {/* Overlay for background image */}
      {backgroundImage && backgroundOverlay !== 'none' && (
        <div className={`absolute inset-0 ${getOverlayClasses()}`} />
      )}
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className={`grid grid-cols-1 ${showContactForm ? 'lg:grid-cols-2' : ''} gap-12 items-center`}>
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                {title}
                {subtitle && (
                  <span className="block text-white/90 mt-2">{subtitle}</span>
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
                    variant={primaryButton.variant || 'secondary'}
                    size="lg"
                    to={primaryButton.href}
                    onClick={() => handleButtonClick(primaryButton.href, primaryButton.text, 'primary')}
                  >
                    {primaryButton.icon && <span className="mr-2">{primaryButton.icon}</span>}
                    {primaryButton.text}
                    {!primaryButton.icon && <ArrowRight className="ml-2 w-5 h-5" />}
                  </PublicButton>
                )}
                {secondaryButton && (
                  <PublicButton
                    variant={secondaryButton.variant || 'outline'}
                    size="lg"
                    to={secondaryButton.href}
                    onClick={() => handleButtonClick(secondaryButton.href, secondaryButton.text, 'secondary')}
                  >
                    {secondaryButton.text}
                  </PublicButton>
                )}
              </div>
            )}

            {/* Quick Stats */}
            {stats && stats.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-white/20">
                {stats.map((stat, index) => (
                  <div
                    key={index}
                    className={stat.highlight ? 'bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20' : ''}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {stat.icon && <span className="text-xl">{stat.icon}</span>}
                      <div className={`text-3xl font-bold ${stat.color ? `text-${stat.color}` : ''}`}>
                        {stat.value}
                      </div>
                    </div>
                    <div className="text-sm text-white/80">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}

            {showTrustBadges && (
              <div className="flex flex-wrap items-center gap-6 pt-6">
                <div className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-health-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white/90 font-medium">Certificato ISO 9001</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-health-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white/90 font-medium">Accreditato Regione</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-health-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white/90 font-medium">Medici Specializzati</span>
                </div>
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