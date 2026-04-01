/**
 * CMS Section Renderer
 * 
 * Factory component che renderizza le diverse tipologie di sezioni CMS.
 * Ogni tipo di sezione viene mappato al componente pubblico corrispondente.
 */

import React from 'react';
import { sanitizeHtml } from '../../utils/sanitize';
import {
  CMSSection,
  CMSTextSection,
  CMSFeaturesSection,
  CMSCardsSection,
  CMSStatsSection,
  CMSTestimonialsSection,
  CMSCtaSection,
  CMSFaqSection,
  CMSContactInfoSection,
} from '../../types/cms';
import { ServiceCard } from '../public/ServiceCard';
import { PublicButton } from '../public/PublicButton';
import { ContactForm } from '../public/ContactForm';
import {
  CheckCircle,
  Star,
  Shield,
  Award,
  Heart,
  Users,
  Clock,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';

interface CMSSectionRendererProps {
  section: CMSSection;
}

/**
 * Renderizza una sezione Text
 */
const TextSectionRenderer: React.FC<{ section: CMSTextSection }> = ({ section }) => {
  const bgColor = section.backgroundColor || 'bg-white';
  const alignment = section.alignment || 'left';

  return (
    <section className={`py-16 ${bgColor}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {section.title && (
          <h2 className={`text-3xl font-bold text-gray-900 mb-4 text-${alignment}`}>
            {section.title}
          </h2>
        )}
        {section.subtitle && (
          <p className={`text-xl text-gray-600 mb-8 text-${alignment}`}>
            {section.subtitle}
          </p>
        )}
        <div
          className={`prose prose-lg max-w-none text-${alignment}`}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(section.content) }}
        />
      </div>
    </section>
  );
};

/**
 * Renderizza una sezione Features
 */
const FeaturesSectionRenderer: React.FC<{ section: CMSFeaturesSection }> = ({ section }) => {
  const bgColor = section.backgroundColor || 'bg-gray-50';
  const columns = section.columns || 3;
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
  }[columns];

  // Mappa semplice icon name → componente Lucide
  const iconMap: Record<string, React.ElementType> = {
    CheckCircle,
    Star,
    Shield,
    Award,
    Heart,
    Users,
    Clock,
  };

  return (
    <section className={`py-16 ${bgColor}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {section.title && (
          <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
            {section.title}
          </h2>
        )}
        {section.subtitle && (
          <p className="text-xl text-gray-600 mb-12 text-center">
            {section.subtitle}
          </p>
        )}
        <div className={`grid grid-cols-1 ${gridCols} gap-8`}>
          {section.features.map((feature, index) => {
            const IconComponent = feature.icon ? iconMap[feature.icon] : CheckCircle;
            return (
              <div key={index} className="text-center">
                <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  {IconComponent && <IconComponent className="w-8 h-8 text-primary-600" />}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/**
 * Renderizza una sezione Cards
 */
const CardsSectionRenderer: React.FC<{ section: CMSCardsSection }> = ({ section }) => {
  const bgColor = section.backgroundColor || 'bg-white';
  const columns = section.columns || 3;
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
  }[columns];

  return (
    <section className={`py-16 ${bgColor}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {section.title && (
          <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
            {section.title}
          </h2>
        )}
        {section.subtitle && (
          <p className="text-xl text-gray-600 mb-12 text-center">
            {section.subtitle}
          </p>
        )}
        <div className={`grid grid-cols-1 ${gridCols} gap-8`}>
          {section.cards.map((card) => (
            <div key={card.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {card.image && (
                <img
                  src={card.image}
                  alt={card.title}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {card.title}
              </h3>
              <p className="text-gray-600 mb-4">{card.description}</p>
              {card.features && card.features.length > 0 && (
                <ul className="space-y-2 mb-4">
                  {card.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-primary-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              )}
              {card.ctaText && card.ctaHref && (
                <PublicButton href={card.ctaHref} variant="outline" size="sm">
                  {card.ctaText}
                </PublicButton>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/**
 * Renderizza una sezione Stats
 */
const StatsSectionRenderer: React.FC<{ section: CMSStatsSection }> = ({ section }) => {
  const bgColor = section.backgroundColor || 'bg-primary-50';
  const columns = section.columns || 4;
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
  }[columns];

  return (
    <section className={`py-16 ${bgColor}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {section.title && (
          <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
            {section.title}
          </h2>
        )}
        {section.subtitle && (
          <p className="text-xl text-gray-600 mb-12 text-center">
            {section.subtitle}
          </p>
        )}
        <div className={`grid grid-cols-1 ${gridCols} gap-8`}>
          {section.stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">
                {stat.number}
              </div>
              <div className="text-lg font-semibold text-gray-900 mb-1">
                {stat.label}
              </div>
              {stat.description && (
                <p className="text-sm text-gray-600">{stat.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/**
 * Renderizza una sezione Testimonials
 */
const TestimonialsSectionRenderer: React.FC<{ section: CMSTestimonialsSection }> = ({ section }) => {
  const bgColor = section.backgroundColor || 'bg-gray-50';

  return (
    <section className={`py-16 ${bgColor}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {section.title && (
          <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
            {section.title}
          </h2>
        )}
        {section.subtitle && (
          <p className="text-xl text-gray-600 mb-12 text-center">
            {section.subtitle}
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {section.testimonials.map((testimonial) => (
            <div key={testimonial.id} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center mb-4">
                {testimonial.image && (
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full mr-4"
                  />
                )}
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  {testimonial.company && (
                    <div className="text-sm text-gray-600">{testimonial.company}</div>
                  )}
                  {testimonial.role && (
                    <div className="text-sm text-gray-500">{testimonial.role}</div>
                  )}
                </div>
              </div>
              {testimonial.rating && (
                <div className="flex items-center mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
              )}
              <p className="text-gray-700 italic">"{testimonial.text}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/**
 * Renderizza una sezione CTA
 */
const CtaSectionRenderer: React.FC<{ section: CMSCtaSection }> = ({ section }) => {
  const bgColor = section.backgroundColor || 'bg-primary-600';
  const hasBackground = section.backgroundImage;

  return (
    <section
      className={`py-16 ${bgColor} ${hasBackground ? 'bg-cover bg-center' : ''}`}
      style={hasBackground ? { backgroundImage: `url(${section.backgroundImage})` } : undefined}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          {section.title}
        </h2>
        {section.description && (
          <p className="text-xl text-white/90 mb-8">
            {section.description}
          </p>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <PublicButton
            href={section.primaryButton.href}
            variant="primary"
            size="lg"
          >
            {section.primaryButton.text}
          </PublicButton>
          {section.secondaryButton && (
            <PublicButton
              href={section.secondaryButton.href}
              variant="outline"
              size="lg"
            >
              {section.secondaryButton.text}
            </PublicButton>
          )}
        </div>
      </div>
    </section>
  );
};

/**
 * Renderizza una sezione FAQ
 */
const FaqSectionRenderer: React.FC<{ section: CMSFaqSection }> = ({ section }) => {
  const bgColor = section.backgroundColor || 'bg-white';

  return (
    <section className={`py-16 ${bgColor}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {section.title && (
          <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
            {section.title}
          </h2>
        )}
        {section.subtitle && (
          <p className="text-xl text-gray-600 mb-12 text-center">
            {section.subtitle}
          </p>
        )}
        <div className="space-y-6">
          {section.faqs.map((faq) => (
            <div key={faq.id} className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {faq.question}
              </h3>
              <p className="text-gray-700">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/**
 * Renderizza una sezione Contact Info
 */
const ContactInfoSectionRenderer: React.FC<{ section: CMSContactInfoSection }> = ({ section }) => {
  const bgColor = section.backgroundColor || 'bg-white';

  return (
    <section className={`py-16 ${bgColor}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div>
            {section.title && (
              <h2 className="text-3xl font-bold text-gray-900 mb-8">
                {section.title}
              </h2>
            )}
            <div className="space-y-6">
              {section.address && (
                <div className="flex items-start">
                  <div className="bg-gray-100 rounded-lg p-3 mr-4">
                    <MapPin className="w-6 h-6 text-gray-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Indirizzo</h3>
                    <p className="text-gray-600">{section.address}</p>
                  </div>
                </div>
              )}
              {section.phone && (
                <div className="flex items-start">
                  <div className="bg-gray-100 rounded-lg p-3 mr-4">
                    <Phone className="w-6 h-6 text-gray-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Telefono</h3>
                    <p className="text-gray-600">{section.phone}</p>
                  </div>
                </div>
              )}
              {section.email && (
                <div className="flex items-start">
                  <div className="bg-gray-100 rounded-lg p-3 mr-4">
                    <Mail className="w-6 h-6 text-gray-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Email</h3>
                    <p className="text-gray-600">{section.email}</p>
                  </div>
                </div>
              )}
              {section.hours && (
                <div className="flex items-start">
                  <div className="bg-gray-100 rounded-lg p-3 mr-4">
                    <Clock className="w-6 h-6 text-gray-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Orari</h3>
                    <p className="text-gray-600">{section.hours}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contact Form o Mappa */}
          <div>
            {section.showContactForm && <ContactForm />}
            {section.showMap && section.mapEmbedUrl && (
              <iframe
                src={section.mapEmbedUrl}
                width="100%"
                height="450"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                className="rounded-lg"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

/**
 * Type guards per discriminare i tipi di sezione
 */
const isTextSection = (section: CMSSection): section is CMSTextSection => {
  return section.type === 'text' && 'content' in section;
};

const isFeaturesSection = (section: CMSSection): section is CMSFeaturesSection => {
  return section.type === 'features' && 'features' in section;
};

const isCardsSection = (section: CMSSection): section is CMSCardsSection => {
  return section.type === 'cards' && 'cards' in section;
};

const isStatsSection = (section: CMSSection): section is CMSStatsSection => {
  return section.type === 'stats' && 'stats' in section;
};

const isTestimonialsSection = (section: CMSSection): section is CMSTestimonialsSection => {
  return section.type === 'testimonials' && 'testimonials' in section;
};

const isCtaSection = (section: CMSSection): section is CMSCtaSection => {
  return section.type === 'cta' && 'primaryButton' in section;
};

const isFaqSection = (section: CMSSection): section is CMSFaqSection => {
  return section.type === 'faq' && 'faqs' in section;
};

const isContactInfoSection = (section: CMSSection): section is CMSContactInfoSection => {
  return section.type === 'contact-info';
};

/**
 * Factory component principale
 */
const CMSSectionRenderer: React.FC<CMSSectionRendererProps> = ({ section }) => {
  if (isTextSection(section)) {
    return <TextSectionRenderer section={section} />;
  }
  if (isFeaturesSection(section)) {
    return <FeaturesSectionRenderer section={section} />;
  }
  if (isCardsSection(section)) {
    return <CardsSectionRenderer section={section} />;
  }
  if (isStatsSection(section)) {
    return <StatsSectionRenderer section={section} />;
  }
  if (isTestimonialsSection(section)) {
    return <TestimonialsSectionRenderer section={section} />;
  }
  if (isCtaSection(section)) {
    return <CtaSectionRenderer section={section} />;
  }
  if (isFaqSection(section)) {
    return <FaqSectionRenderer section={section} />;
  }
  if (isContactInfoSection(section)) {
    return <ContactInfoSectionRenderer section={section} />;
  }

  // Sezione custom non riconosciuta
  if (import.meta.env.DEV) console.warn('Unknown or custom section type:', (section as any).type);
  return null;
};

export default CMSSectionRenderer;
