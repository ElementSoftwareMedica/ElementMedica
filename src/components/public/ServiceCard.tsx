import React from 'react';
import { CheckCircle, LucideIcon } from 'lucide-react';
import { PublicButton } from './PublicButton';
import { useNavigate } from 'react-router-dom';
import { trackCtaEvent } from '../../services/logs';

interface ServiceCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  features?: string[];
  buttonText?: string;
  buttonHref?: string;
  variant?: 'default' | 'featured' | 'compact';
  className?: string;
}

/**
 * Componente ServiceCard riutilizzabile per mostrare i servizi
 * Supporta diverse varianti di layout e contenuto
 */
export const ServiceCard: React.FC<ServiceCardProps> = ({
  icon: IconComponent,
  title,
  description,
  features = [],
  buttonText = 'Scopri di più',
  buttonHref,
  variant = 'default',
  className = ''
}) => {
  const navigate = useNavigate();

  const getCardClasses = () => {
    const baseClasses = 'rounded-2xl transition-all duration-300';
    
    switch (variant) {
      case 'featured':
        return `${baseClasses} bg-gradient-to-br from-blue-600 to-blue-700 text-white p-8 hover:shadow-2xl hover:scale-105`;
      case 'compact':
        return `${baseClasses} bg-white border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300`;
      default:
        return `${baseClasses} bg-gray-50 p-8 hover:shadow-lg hover:bg-white`;
    }
  };

  const getIconClasses = () => {
    switch (variant) {
      case 'featured':
        return 'w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-6';
      case 'compact':
        return 'w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mb-4';
      default:
        return 'w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mb-6';
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'featured':
        return 'text-white';
      default:
        return 'text-white';
    }
  };

  const getTitleClasses = () => {
    switch (variant) {
      case 'featured':
        return 'text-xl font-semibold mb-4';
      case 'compact':
        return 'text-lg font-semibold text-gray-900 mb-3';
      default:
        return 'text-xl font-semibold text-gray-900 mb-4';
    }
  };

  const getDescriptionClasses = () => {
    switch (variant) {
      case 'featured':
        return 'text-white/90 mb-6';
      case 'compact':
        return 'text-gray-600 mb-4 text-sm';
      default:
        return 'text-gray-600 mb-6';
    }
  };

  const getFeatureClasses = () => {
    switch (variant) {
      case 'featured':
        return 'flex items-center text-sm text-white/80';
      case 'compact':
        return 'flex items-center text-xs text-gray-700';
      default:
        return 'flex items-center text-sm text-gray-700';
    }
  };

  const getCheckIconColor = () => {
    switch (variant) {
      case 'featured':
        return 'text-green-300';
      default:
        return 'text-green-500';
    }
  };

  return (
    <div className={`${getCardClasses()} ${className}`}>
      <div className={getIconClasses()}>
        <IconComponent className={`w-8 h-8 ${getIconColor()}`} />
      </div>
      
      <h3 className={getTitleClasses()}>
        {title}
      </h3>
      
      <p className={getDescriptionClasses()}>
        {description}
      </p>
      
      {features.length > 0 && (
        <ul className={`space-y-2 ${variant === 'compact' ? 'mb-4' : 'mb-6'}`}>
          {features.map((feature, index) => (
            <li key={index} className={getFeatureClasses()}>
              <CheckCircle className={`w-4 h-4 ${getCheckIconColor()} mr-2 flex-shrink-0`} />
              {feature}
            </li>
          ))}
        </ul>
      )}
      
      {buttonHref && (
        <PublicButton 
          variant={variant === 'featured' ? 'secondary' : 'outline'} 
          size={variant === 'compact' ? 'sm' : 'sm'} 
          className="w-full"
          to={buttonHref}
          onClick={() =>
            trackCtaEvent({
              resource: 'public',
              action: 'cta_click',
              details: { label: buttonText, href: buttonHref, section: 'ServiceCard', title }
            })
          }
        >
          {buttonText}
        </PublicButton>
      )}
    </div>
  );
};