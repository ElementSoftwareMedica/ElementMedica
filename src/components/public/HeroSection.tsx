import React from 'react';
import { ArrowRight } from 'lucide-react';
import { PublicButton } from './PublicButton';
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
    variant?: 'outline' | 'outline-light' | 'ghost';
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
  backgroundVariant?: 'gradient' | 'gradient-cta' | 'solid' | 'image' | 'medical-gradient' | 'medical-teal' | 'medical-blue' | 'medical-purple' | 'medical-light';
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

    // Solid variants that don't need gradients
    switch (backgroundVariant) {
      case 'solid':
        return 'bg-primary-700';
      case 'image':
        return 'bg-primary-800 bg-cover bg-center';
      default:
        return '';
    }
  };

  /**
   * Returns inline backgroundImage style for gradient variants.
   * Uses direct CSS linear-gradient() with CSS variables instead of Tailwind
   * from/via/to utilities, which can fail to render with CSS variable colors.
   * 
   * Gradients use PRIMARY brand colors for a calming, branded feel.
   * Avoids dark secondary/navy tones for lighter, more elegant aesthetics.
   */
  const getBackgroundStyle = (): React.CSSProperties => {
    if (backgroundImage) {
      return { backgroundImage: `url(${backgroundImage})` };
    }

    if (variant === 'medical') {
      return { backgroundImage: 'linear-gradient(135deg, var(--color-primary-800) 0%, var(--color-primary-700) 40%, var(--color-primary-600) 100%)' };
    }

    switch (backgroundVariant) {
      case 'medical-gradient':
        return { backgroundImage: 'linear-gradient(135deg, var(--color-primary-800) 0%, var(--color-primary-700) 40%, var(--color-primary-600) 100%)' };
      case 'medical-teal':
        return { backgroundImage: 'linear-gradient(to bottom right, var(--color-primary-700), var(--color-primary-600), var(--color-primary-500))' };
      case 'medical-blue':
        return { backgroundImage: 'linear-gradient(to bottom right, var(--color-secondary-500), var(--color-secondary-400), var(--color-secondary-300))' };
      case 'medical-purple':
        return { backgroundImage: 'linear-gradient(to bottom right, var(--color-secondary-500), var(--color-secondary-400), var(--color-primary-600))' };
      case 'medical-light':
        return { backgroundImage: 'linear-gradient(to bottom right, var(--color-primary-400), var(--color-primary-500), var(--color-primary-600))' };
      case 'gradient':
        return { backgroundImage: 'linear-gradient(135deg, var(--color-primary-800) 0%, var(--color-primary-700) 40%, var(--color-primary-600) 100%)' };
      case 'gradient-cta':
        return { backgroundImage: 'linear-gradient(135deg, var(--color-primary-700) 0%, var(--color-primary-600) 50%, var(--color-primary-500) 100%)' };
      case 'solid':
      case 'image':
        return {};
      default:
        return { backgroundImage: 'linear-gradient(135deg, var(--color-primary-800) 0%, var(--color-primary-700) 40%, var(--color-primary-600) 100%)' };
    }
  };

  const getOverlayClasses = () => {
    if (!backgroundImage) return '';
    switch (backgroundOverlay) {
      case 'light':
        return 'bg-white/30';
      case 'dark':
      case 'gradient':
        return ''; // handled by getOverlayStyle
      default:
        return '';
    }
  };

  const getOverlayStyle = (): React.CSSProperties => {
    if (!backgroundImage) return {};
    switch (backgroundOverlay) {
      case 'dark':
        return { backgroundImage: 'linear-gradient(to bottom right, color-mix(in srgb, var(--color-primary-800) 80%, transparent), color-mix(in srgb, var(--color-primary-700) 70%, transparent), color-mix(in srgb, var(--color-primary-800) 80%, transparent))' };
      case 'gradient':
        return { backgroundImage: 'linear-gradient(to right, color-mix(in srgb, var(--color-primary-700) 85%, transparent), color-mix(in srgb, var(--color-primary-600) 65%, transparent))' };
      default:
        return {};
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

  const backgroundStyle = getBackgroundStyle();

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
        <div className={`absolute inset-0 ${getOverlayClasses()}`} style={getOverlayStyle()} />
      )}

      {/* Floating ambient orbs for depth */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-float pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-white/3 rounded-full blur-3xl animate-float pointer-events-none" style={{ animationDelay: '3s' }} />
      <div className="absolute top-1/2 right-1/4 w-48 h-48 bg-white/5 rounded-full blur-2xl animate-float pointer-events-none" style={{ animationDelay: '6s' }} />

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className={`grid grid-cols-1 ${showContactForm ? 'lg:grid-cols-2' : ''} gap-12 items-center`}>
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight animate-[fadeInUp_0.6s_ease-out_forwards]">
                {title}
                {subtitle && (
                  <span className="block text-white/90 mt-2">{subtitle}</span>
                )}
              </h1>
              <p className="text-xl text-white/90 leading-relaxed animate-[fadeInUp_0.6s_ease-out_0.15s_forwards] opacity-0">
                {description}
              </p>
            </div>

            {(primaryButton || secondaryButton) && (
              <div className="flex flex-col sm:flex-row gap-5 animate-[fadeInUp_0.6s_ease-out_0.3s_forwards] opacity-0">
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
                    variant="outline-light"
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-white/30 animate-[fadeInUp_0.6s_ease-out_0.45s_forwards] opacity-0">
                {stats.map((stat, index) => (
                  <div
                    key={index}
                    className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all duration-300"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {stat.icon && <span className="text-xl">{stat.icon}</span>}
                      <div className={`text-3xl font-bold ${stat.color ? `text-${stat.color}` : ''}`}>
                        {stat.value}
                      </div>
                    </div>
                    <div className="text-sm text-white/90">{stat.label}</div>
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