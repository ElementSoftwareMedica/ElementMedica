/**
 * Booking Sections
 * 
 * CMS sections for booking categories, popular bookings, booking steps, guarantees
 * 
 * @module components/cms/renderer/custom-content-renderer/BookingSections
 */

import React, { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { iconMap, CheckCircle, ArrowRight, Calendar, Clock, Shield, Star, Phone, Mail, Award, Heart, Users, FileText, Zap } from '../iconMap';
import { PublicButton } from '../../../public/PublicButton';
import { bookingCategoryColors, popularBookingColors } from './types';

// Lazy-load BookingCalendarIsland (Island Architecture - dynamic widget)
const BookingCalendarIsland = lazy(() => import('../../../public/BookingCalendarIsland'));

/**
 * Booking Categories Section (Poliambulatorio homepage)
 */
export const BookingCategoriesSection: React.FC<{ content: any }> = ({ content }) => {
  const navigate = useNavigate();

  if (!content.bookingCategories) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-white via-primary-50/30 to-accent-50/40 relative overflow-hidden">
      {/* Decorative bubbles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-64 h-64 bg-primary-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-56 h-56 bg-accent-200/30 rounded-full blur-3xl" />
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold mb-4">
            {content.bookingCategories.badge || 'Prenota Online'}
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.bookingCategories.sectionTitle || content.bookingCategories.title || 'Prenota la Tua Visita'}
          </h2>
          {(content.bookingCategories.sectionSubtitle || content.bookingCategories.description) && (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {content.bookingCategories.sectionSubtitle || content.bookingCategories.description}
            </p>
          )}
        </div>
        {content.bookingCategories.items && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {content.bookingCategories.items.map((category: any, index: number) => {
              const IconComponent = iconMap[category.icon] || Calendar;
              const colors = bookingCategoryColors[index % bookingCategoryColors.length];
              return (
                <div
                  key={index}
                  className={`group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border ${colors.border} hover:border-transparent cursor-pointer`}
                  onClick={() => category.href && navigate(category.href)}
                >
                  <div className={`${colors.light} p-8 relative overflow-hidden`}>
                    <div className={`absolute -top-10 -right-10 w-32 h-32 ${colors.bg} opacity-20 rounded-full`} />
                    <div className={`w-16 h-16 ${colors.bg} rounded-2xl flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform relative z-10`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-700 transition-colors">{category.name}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{category.description}</p>
                  </div>
                  <div className="p-6 bg-white">
                    {category.availableSlots && (
                      <div className="flex items-center text-sm text-green-600 mb-3">
                        <Clock className="w-4 h-4 mr-2" />
                        {category.availableSlots} disponibili questa settimana
                      </div>
                    )}
                    {category.nextAvailable && (
                      <div className="flex items-center text-sm text-gray-500 mb-3">
                        <Calendar className="w-4 h-4 mr-2" />
                        Prossimo: {category.nextAvailable}
                      </div>
                    )}
                    {category.services && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {category.services.slice(0, 3).map((service: string, i: number) => (
                          <span key={i} className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            {service}
                          </span>
                        ))}
                        {category.services.length > 3 && (
                          <span className={`px-3 py-1 ${colors.badgeBg} ${colors.text} text-xs rounded-full font-medium`}>
                            +{category.services.length - 3} altri
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center text-primary-600 font-semibold text-sm group-hover:text-primary-700 transition-colors">
                      Prenota Ora
                      <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

/**
 * Popular Bookings Section (Quick booking options)
 */
export const PopularBookingsSection: React.FC<{ content: any }> = ({ content }) => {
  const navigate = useNavigate();

  if (!content.popularBookings) return null;

  return (
    <section className="py-16 bg-gradient-to-br from-slate-50 via-primary-50/30 to-accent-50/30 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold mb-4">
            {content.popularBookings.badge || 'Più Richiesti'}
          </span>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
            {content.popularBookings.sectionTitle || content.popularBookings.title || 'Prenotazioni Rapide'}
          </h2>
        </div>
        {content.popularBookings.items && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-6xl mx-auto">
            {content.popularBookings.items.map((item: any, index: number) => {
              const IconComponent = iconMap[item.icon] || Heart;
              const colors = popularBookingColors[index % popularBookingColors.length];
              return (
                <button
                  key={index}
                  onClick={() => item.href && navigate(item.href)}
                  className={`group ${colors.light} rounded-xl p-4 text-center hover:shadow-lg transition-all border ${colors.border} hover:border-transparent`}
                >
                  <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-md`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">{item.name}</h3>
                  {item.waitTime && (
                    <div className="text-xs text-gray-500 mt-1">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {item.waitTime}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

/**
 * Booking Steps Section (How to book)
 */
export const BookingStepsSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.bookingSteps) return null;

  const stepIcons = [Calendar, FileText, CheckCircle, Award];

  return (
    <section className="py-20 bg-gradient-to-br from-white via-primary-50/30 to-accent-50/40">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold mb-4">
            {content.bookingSteps.badge || 'Come Prenotare'}
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.bookingSteps.sectionTitle || content.bookingSteps.title || 'Prenota in 4 Semplici Passi'}
          </h2>
          {(content.bookingSteps.sectionSubtitle || content.bookingSteps.description) && (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {content.bookingSteps.sectionSubtitle || content.bookingSteps.description}
            </p>
          )}
        </div>
        {content.bookingSteps.steps && (
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
              {/* Connection line */}
              <div className="hidden lg:block absolute top-16 left-1/4 right-1/4 h-0.5" style={{ backgroundImage: 'linear-gradient(to right, var(--color-primary-200), var(--color-accent-200), var(--color-primary-200))' }} />

              {content.bookingSteps.steps.map((step: any, index: number) => {
                const IconComponent = iconMap[step.icon] || stepIcons[index % stepIcons.length];
                return (
                  <div key={index} className="relative group text-center">
                    <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all relative z-10">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg" style={{ backgroundImage: 'linear-gradient(to bottom right, var(--color-primary-500), var(--color-accent-600))' }}>
                        <IconComponent className="w-8 h-8 text-white" />
                      </div>
                      <div className="text-3xl font-bold text-primary-600 mb-2">{step.number || index + 1}</div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                      <p className="text-sm text-gray-600">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {content.bookingSteps.cta && (
          <div className="text-center mt-12">
            <PublicButton variant="primary" size="lg" to={content.bookingSteps.cta.href || '/prenota#booking'}>
              {content.bookingSteps.cta.text || 'Prenota Ora'}
            </PublicButton>
          </div>
        )}
      </div>
    </section>
  );
};

/**
 * Guarantees Section (Service guarantees)
 */
export const GuaranteesSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.guarantees) return null;

  const guaranteeIcons = [Shield, Award, Clock, Star, CheckCircle, Heart];

  return (
    <section className="py-16 text-white relative overflow-hidden" style={{ backgroundImage: 'linear-gradient(to bottom right, var(--color-primary-700), var(--color-primary-600), var(--color-accent-700))' }}>
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-2 bg-white/20 backdrop-blur rounded-full text-sm font-semibold mb-4">
            {content.guarantees.badge || 'Le Nostre Garanzie'}
          </span>
          <h2 className="text-2xl lg:text-3xl font-bold mb-4">
            {content.guarantees.sectionTitle || content.guarantees.title || 'Qualità Garantita'}
          </h2>
        </div>
        {content.guarantees.items && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 max-w-6xl mx-auto">
            {content.guarantees.items.map((guarantee: any, index: number) => {
              const IconComponent = iconMap[guarantee.icon] || guaranteeIcons[index % guaranteeIcons.length];
              return (
                <div key={index} className="text-center group">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-white/30 transition-colors">
                    <IconComponent className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold">{guarantee.title}</h3>
                  {guarantee.description && (
                    <p className="text-xs text-white/80 mt-1">{guarantee.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

/**
 * Quality Assurance Section
 */
export const QualityAssuranceSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.qualityAssurance) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold mb-4">
                {content.qualityAssurance.badge || 'Qualità e Sicurezza'}
              </span>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                {content.qualityAssurance.title || 'Standard di Eccellenza'}
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                {content.qualityAssurance.description}
              </p>
              {content.qualityAssurance.features && (
                <ul className="space-y-4">
                  {content.qualityAssurance.features.map((feature: any, index: number) => (
                    <li key={index} className="flex items-start">
                      <div className="w-8 h-8 bg-secondary-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-secondary-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                        <p className="text-sm text-gray-600">{feature.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {content.qualityAssurance.certifications && (
              <div className="grid grid-cols-2 gap-4">
                {content.qualityAssurance.certifications.map((cert: any, index: number) => (
                  <div key={index} className="bg-white rounded-2xl p-6 shadow-lg text-center">
                    <Award className="w-12 h-12 text-primary-600 mx-auto mb-3" />
                    <h3 className="font-semibold text-gray-900">{cert.name}</h3>
                    {cert.year && <p className="text-sm text-gray-500">{cert.year}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

/**
 * Result Delivery Section
 */
export const ResultDeliverySection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.resultDelivery) return null;

  return (
    <section className="py-16" style={{ backgroundImage: 'linear-gradient(to bottom right, var(--color-primary-50), color-mix(in srgb, var(--color-secondary-50) 30%, transparent), var(--color-accent-50))' }}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold mb-4">
            {content.resultDelivery.badge || 'Consegna Referti'}
          </span>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
            {content.resultDelivery.title || 'Ricevi i Tuoi Referti'}
          </h2>
          {content.resultDelivery.description && (
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {content.resultDelivery.description}
            </p>
          )}
        </div>
        {content.resultDelivery.methods && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {content.resultDelivery.methods.map((method: any, index: number) => {
              const IconComponent = iconMap[method.icon] || FileText;
              return (
                <div key={index} className="bg-white rounded-2xl p-8 shadow-lg text-center hover:shadow-xl transition-all">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg" style={{ backgroundImage: 'linear-gradient(to bottom right, var(--color-primary-500), var(--color-primary-700))' }}>
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{method.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{method.description}</p>
                  {method.time && (
                    <span className="inline-block px-3 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-full">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {method.time}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

/**
 * Important Info Section
 */
export const ImportantInfoSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.importantInfo) return null;

  return (
    <section className="py-16 bg-amber-50 border-y border-amber-200">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {content.importantInfo.title || 'Informazioni Importanti'}
              </h2>
              {content.importantInfo.items && (
                <ul className="space-y-3">
                  {content.importantInfo.items.map((item: any, index: number) => {
                    // Handle both string items and object items {icon, title, content}
                    if (typeof item === 'string') {
                      return (
                        <li key={index} className="flex items-start text-gray-700">
                          <CheckCircle className="w-5 h-5 text-amber-500 mr-3 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      );
                    }
                    const IconComponent = iconMap[item.icon] || CheckCircle;
                    return (
                      <li key={index} className="flex items-start text-gray-700">
                        <IconComponent className="w-5 h-5 text-amber-500 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                          {item.title && <span className="font-semibold text-gray-900">{item.title}: </span>}
                          {item.content}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {content.importantInfo.note && (
                <p className="mt-4 text-sm text-gray-600 italic">{content.importantInfo.note}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/**
 * Emergency Section
 */
export const EmergencySection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.emergency) return null;

  return (
    <section className="py-16" style={{ backgroundImage: 'linear-gradient(to bottom right, var(--color-accent-50), #ffffff, color-mix(in srgb, var(--color-primary-50) 30%, transparent))' }}>
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-secondary-800 mb-4">
            {content.emergency.title || 'Contatto Rapido'}
          </h2>
          {content.emergency.description && (
            <p className="text-lg text-gray-600 mb-8">
              {content.emergency.description}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {content.emergency.phone && (
              <a
                href={`tel:${content.emergency.phone}`}
                className="inline-flex items-center justify-center px-8 py-4 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20"
              >
                <Phone className="w-6 h-6 mr-2" />
                {content.emergency.phone}
              </a>
            )}
            {content.emergency.email && (
              <a
                href={`mailto:${content.emergency.email}`}
                className="inline-flex items-center justify-center px-8 py-4 bg-primary-700 text-white font-bold rounded-xl hover:bg-primary-800 transition-colors shadow-lg shadow-primary-500/20"
              >
                <Mail className="w-5 h-5 mr-2" />
                {content.emergency.email}
              </a>
            )}
          </div>
          {content.emergency.hours && (
            <p className="mt-6 text-sm text-gray-500">
              <Clock className="w-4 h-4 inline mr-1" />
              {content.emergency.hours}
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

/**
 * Live Booking Section - Dynamic Island
 * 
 * Renders the BookingCalendarIsland widget (real-time availability).
 * This is the bridge between static CMS content and the dynamic booking flow.
 * Activated when CMS content has `liveBooking` or `bookingWidget` key.
 */
export const LiveBookingSection: React.FC<{ content: any }> = ({ content }) => {
  // Render if content explicitly requests the booking widget OR on prenota pages
  const showWidget = content.liveBooking || content.bookingWidget || content.bookingCategories;
  if (!showWidget) return null;

  const widgetConfig = content.liveBooking || content.bookingWidget || {};

  return (
    <section id="prenota-online" className="py-20" style={{ backgroundImage: 'linear-gradient(to bottom right, var(--color-accent-50), #ffffff, color-mix(in srgb, var(--color-primary-50) 30%, transparent))' }}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold mb-4">
            {widgetConfig.badge || 'Prenota Online'}
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {widgetConfig.title || 'Prenota la Tua Visita'}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {widgetConfig.description || 'Seleziona la prestazione, scegli il medico e prenota il tuo appuntamento online.'}
          </p>
        </div>
        <div className="max-w-4xl mx-auto">
          <Suspense fallback={
            <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto" />
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
                <div className="grid grid-cols-3 gap-4 mt-8">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-gray-100 rounded-xl" />
                  ))}
                </div>
              </div>
              <p className="text-gray-500 mt-6">Caricamento disponibilità...</p>
            </div>
          }>
            <BookingCalendarIsland
              initialPrestazioneId={widgetConfig.prestazioneId}
              initialMedicoId={widgetConfig.medicoId}
            />
          </Suspense>
        </div>
      </div>
    </section>
  );
};
