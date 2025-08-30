import React, { useState } from 'react';
import { PublicButton } from './PublicButton';

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  subject: string;
  message: string;
  privacyAccepted: boolean;
  marketingAccepted: boolean;
}

interface ContactFormProps {
  title?: string;
  variant?: 'default' | 'compact' | 'inline';
  showCompanyField?: boolean;
  showPhoneField?: boolean;
  showSubjectField?: boolean;
  subjects?: Array<{ value: string; label: string }>;
  onSubmit?: (data: ContactFormData) => void;
  className?: string;
}

/**
 * Componente ContactForm riutilizzabile per i form di contatto
 * Supporta diverse varianti di layout e campi configurabili
 */
export const ContactForm: React.FC<ContactFormProps> = ({
  title = 'Invia un Messaggio',
  variant = 'default',
  showCompanyField = true,
  showPhoneField = true,
  showSubjectField = true,
  subjects = [
    { value: 'informazioni-corsi', label: 'Informazioni sui corsi' },
    { value: 'preventivo', label: 'Richiesta preventivo' },
    { value: 'consulenza', label: 'Consulenza sicurezza' },
    { value: 'rspp', label: 'Servizio RSPP' },
    { value: 'medico-lavoro', label: 'Medico del lavoro' },
    { value: 'altro', label: 'Altro' }
  ],
  onSubmit,
  className = ''
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    subject: '',
    message: '',
    privacyAccepted: false,
    marketingAccepted: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (onSubmit) {
        await onSubmit(formData);
      } else {
        // Default behavior - use backend service
        const { submitContactForm } = await import('../../services/contactSubmissions');
        await submitContactForm(formData);
        alert('Grazie per il tuo messaggio! Ti contatteremo presto.');
      }
      
      // Reset form after successful submission
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        subject: '',
        message: '',
        privacyAccepted: false,
        marketingAccepted: false
      });
    } catch (error) {
      console.error('Errore nell\'invio del form:', error);
      alert('Si è verificato un errore nell\'invio del messaggio. Riprova più tardi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFormClasses = () => {
    switch (variant) {
      case 'compact':
        return 'space-y-4';
      case 'inline':
        return 'space-y-3';
      default:
        return 'space-y-6';
    }
  };

  const getInputClasses = () => {
    const baseClasses = 'w-full border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200';
    
    switch (variant) {
      case 'compact':
        return `${baseClasses} px-3 py-2 rounded-lg text-sm`;
      case 'inline':
        return `${baseClasses} px-4 py-3 rounded-full bg-white/20 backdrop-blur-sm border-white/30 text-white placeholder-white/70 focus:ring-white/50`;
      default:
        return `${baseClasses} px-4 py-3 rounded-lg`;
    }
  };

  const getLabelClasses = () => {
    switch (variant) {
      case 'compact':
        return 'block text-xs font-medium text-gray-700 mb-1';
      case 'inline':
        return 'sr-only';
      default:
        return 'block text-sm font-medium text-gray-700 mb-2';
    }
  };

  const getGridClasses = () => {
    switch (variant) {
      case 'compact':
        return 'grid grid-cols-1 gap-4';
      case 'inline':
        return 'space-y-3';
      default:
        return 'grid grid-cols-1 sm:grid-cols-2 gap-6';
    }
  };

  return (
    <div className={className}>
      {title && variant !== 'inline' && (
        <h2 className={`font-bold text-gray-900 mb-8 ${variant === 'compact' ? 'text-xl' : 'text-3xl'}`}>
          {title}
        </h2>
      )}
      
      <form onSubmit={handleSubmit} className={getFormClasses()}>
        <div className={getGridClasses()}>
          <div>
            <label htmlFor="name" className={getLabelClasses()}>
              Nome e Cognome *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleInputChange}
              className={getInputClasses()}
              placeholder={variant === 'inline' ? 'Nome e Cognome' : 'Il tuo nome completo'}
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <label htmlFor="email" className={getLabelClasses()}>
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              value={formData.email}
              onChange={handleInputChange}
              className={getInputClasses()}
              placeholder={variant === 'inline' ? 'Email' : 'la-tua-email@esempio.com'}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {(showPhoneField || showCompanyField) && variant !== 'inline' && (
          <div className={getGridClasses()}>
            {showPhoneField && (
              <div>
                <label htmlFor="phone" className={getLabelClasses()}>
                  Telefono
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={getInputClasses()}
                  placeholder="+39 123 456 7890"
                  disabled={isSubmitting}
                />
              </div>
            )}
            
            {showCompanyField && (
              <div>
                <label htmlFor="company" className={getLabelClasses()}>
                  Azienda
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  className={getInputClasses()}
                  placeholder={variant === 'inline' ? 'Azienda' : 'Nome della tua azienda'}
                  disabled={isSubmitting}
                />
              </div>
            )}
          </div>
        )}

        {showCompanyField && variant === 'inline' && (
          <div>
            <label htmlFor="company" className={getLabelClasses()}>
              Azienda
            </label>
            <input
              type="text"
              id="company"
              name="company"
              value={formData.company}
              onChange={handleInputChange}
              className={getInputClasses()}
              placeholder="Azienda"
              disabled={isSubmitting}
            />
          </div>
        )}

        {showSubjectField && (
          <div>
            <label htmlFor="subject" className={getLabelClasses()}>
              Oggetto *
            </label>
            <select
              id="subject"
              name="subject"
              required
              value={formData.subject}
              onChange={handleInputChange}
              className={getInputClasses()}
              disabled={isSubmitting}
            >
              <option value="">Seleziona un oggetto</option>
              {subjects.map((subject) => (
                <option key={subject.value} value={subject.value}>
                  {subject.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="message" className={getLabelClasses()}>
            Messaggio *
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={variant === 'compact' ? 4 : 6}
            value={formData.message}
            onChange={handleInputChange}
            className={getInputClasses()}
            placeholder={variant === 'inline' ? 'Il tuo messaggio...' : 'Descrivi la tua richiesta o le informazioni di cui hai bisogno...'}
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-start">
            <input
              type="checkbox"
              id="privacyAccepted"
              name="privacyAccepted"
              required
              checked={formData.privacyAccepted}
              onChange={handleInputChange}
              className="mt-1 mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              disabled={isSubmitting}
            />
            <label htmlFor="privacyAccepted" className={`text-sm ${variant === 'inline' ? 'text-white/90' : 'text-gray-600'}`}>
              Accetto la{' '}
              <a href="#" className={`${variant === 'inline' ? 'text-white hover:text-white/80' : 'text-primary-600 hover:text-primary-700'} hover:underline`}>
                Privacy Policy
              </a>{' '}
              *
            </label>
          </div>
          
          <div className="flex items-start">
            <input
              type="checkbox"
              id="marketingAccepted"
              name="marketingAccepted"
              checked={formData.marketingAccepted}
              onChange={handleInputChange}
              className="mt-1 mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              disabled={isSubmitting}
            />
            <label htmlFor="marketingAccepted" className={`text-sm ${variant === 'inline' ? 'text-white/90' : 'text-gray-600'}`}>
              Accetto di ricevere comunicazioni commerciali e newsletter (opzionale)
            </label>
          </div>
        </div>

        <PublicButton 
          type="submit" 
          size={variant === 'compact' ? 'sm' : 'lg'} 
          className="w-full"
          variant={variant === 'inline' ? 'outline' : 'primary'}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Invio in corso...' : (variant === 'inline' ? 'Richiedi Consulenza' : 'Invia Messaggio')}
        </PublicButton>
      </form>
    </div>
  );
};