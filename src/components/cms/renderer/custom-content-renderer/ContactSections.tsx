/**
 * Contact Sections
 * 
 * CMS sections for contact info, maps, and forms
 * 
 * @module components/cms/renderer/custom-content-renderer/ContactSections
 */

import React from 'react';
import { iconMap, Phone, Mail, MapPin, Clock, Car, MessageSquare, Globe } from '../iconMap';
import { ContactForm } from '../../../public/ContactForm';

/**
 * Contact Info Section (Contatti Page)
 */
export const ContactInfoSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.contactInfo) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 via-gray-50 to-primary-50/30">
      <div className="container mx-auto px-4">
        {/* Section Title */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Come Contattarci
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Siamo a tua disposizione per rispondere a ogni domanda e fornirti tutta l'assistenza di cui hai bisogno
          </p>
        </div>

        {/* Contact Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Address Card */}
          {content.contactInfo.address && (
            <div className="bg-gray-50 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mb-6">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {typeof content.contactInfo.address === 'object' ? content.contactInfo.address.label : 'Indirizzo'}
              </h3>
              {typeof content.contactInfo.address === 'object' && content.contactInfo.address.badge && (
                <span className="inline-block px-3 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-full mb-3">
                  {content.contactInfo.address.badge}
                </span>
              )}
              <p className="text-gray-600 text-sm whitespace-pre-line leading-relaxed">
                {typeof content.contactInfo.address === 'object' ? content.contactInfo.address.value : content.contactInfo.address}
              </p>
            </div>
          )}

          {/* Phones Card */}
          {content.contactInfo.phones && Array.isArray(content.contactInfo.phones) && (
            <div className="bg-gray-50 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mb-6">
                <Phone className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Telefono</h3>
              <div className="space-y-3">
                {content.contactInfo.phones.map((phone: any, idx: number) => (
                  <div key={idx}>
                    {phone.badge && (
                      <span className="inline-flex items-center px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full mb-1">
                        {phone.badge}
                      </span>
                    )}
                    <a href={`tel:${phone.number.replace(/\s/g, '')}`} className="text-gray-900 font-semibold text-base hover:text-primary-600 transition-colors block">
                      {phone.number}
                    </a>
                    {phone.contact && <p className="text-gray-600 text-xs mt-1">Rif: {phone.contact}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emails Card */}
          {content.contactInfo.emails && Array.isArray(content.contactInfo.emails) && (
            <div className="bg-gray-50 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mb-6">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Email</h3>
              <div className="space-y-3">
                {content.contactInfo.emails.map((email: any, idx: number) => (
                  <div key={idx}>
                    {email.badge && (
                      <span className="inline-block px-2 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-full mb-1">
                        {email.badge}
                      </span>
                    )}
                    <a href={`mailto:${email.address}`} className="text-gray-900 font-medium text-sm hover:text-primary-600 transition-colors break-all block">
                      {email.address}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hours Card */}
          {content.contactInfo.hours && (
            <div className="bg-gray-50 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mb-6">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Orari</h3>
              <div className="space-y-2 text-sm text-gray-600">
                {content.contactInfo.hours.weekdays && <p className="font-medium">{content.contactInfo.hours.weekdays}</p>}
                {content.contactInfo.hours.saturday && <p>{content.contactInfo.hours.saturday}</p>}
                {content.contactInfo.hours.sunday && <p className="text-gray-500 italic">{content.contactInfo.hours.sunday}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

/**
 * Google Maps Section
 */
export const MapSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.map?.showMap || !content.contactInfo?.address) return null;

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.map.title || 'Come Raggiungerci'}
          </h2>
          {content.map.description && (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {content.map.description}
            </p>
          )}
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="rounded-2xl overflow-hidden shadow-2xl">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2801.045!2d11.7932!3d45.3661!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sVia%20Bracciano%2034%2C%2035030%20Selvazzano%20Dentro%20PD!5e0!3m2!1sen!2sit!4v1700220000000!5m2!1sen!2sit"
              width="100%"
              height="450"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Mappa Google - Element Sicurezza - Via Bracciano 34, Selvazzano Dentro (PD)"
              className="w-full"
            />
          </div>

          {/* Map Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow text-center">
              <div className="w-14 h-14 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 text-lg">Indirizzo Completo</h3>
              <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                {typeof content.contactInfo.address === 'object' ? content.contactInfo.address.value : content.contactInfo.address}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow text-center">
              <div className="w-14 h-14 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 text-lg">Trasporti</h3>
              <p className="text-sm text-gray-600">
                Facilmente raggiungibile con<br />mezzi pubblici e auto
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow text-center">
              <div className="w-14 h-14 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 text-lg">Parcheggio</h3>
              <p className="text-sm text-gray-600">
                Posti auto disponibili<br />nelle vicinanze
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/**
 * Contact Form Section
 */
export const ContactFormSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.contactForm) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 via-primary-50/30 to-accent-50/20 relative overflow-hidden">
      {/* Decorative bubbles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-64 h-64 bg-primary-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-48 h-48 bg-secondary-200/20 rounded-full blur-3xl" />
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <ContactForm
            title={content.contactForm.title || 'Invia un Messaggio'}
            variant="default"
            showCompanyField={content.contactForm.showCompanyField !== false}
            showPhoneField={content.contactForm.showPhoneField !== false}
            showSubjectField={content.contactForm.showSubjectField !== false}
            subjects={content.contactForm.subjects}
          />
        </div>
      </div>
    </section>
  );
};

/**
 * Departments Section (Contatti - Medica)
 */
export const DepartmentsSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.departments?.items) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.departments.title}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {content.departments.items.map((dept: any, index: number) => {
            const IconComponent = iconMap[dept.icon] || Phone;
            return (
              <div key={index} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center">
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900">{dept.name}</h3>
                </div>
                <div className="space-y-2 text-sm">
                  {dept.phone && (
                    <a href={`tel:${dept.phone}`} className="flex items-center gap-2 text-gray-600 hover:text-primary-600">
                      <Phone className="w-4 h-4" />
                      {dept.phone}
                    </a>
                  )}
                  {dept.email && (
                    <a href={`mailto:${dept.email}`} className="flex items-center gap-2 text-gray-600 hover:text-primary-600">
                      <Mail className="w-4 h-4" />
                      {dept.email}
                    </a>
                  )}
                  {dept.hours && (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Clock className="w-4 h-4" />
                      {dept.hours}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/**
 * Opening Hours Section (Contatti - Medica)
 */
export const OpeningHoursSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.openingHours?.schedule) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 via-gray-50 to-primary-50/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.openingHours.title}
          </h2>
        </div>
        <div className="max-w-2xl mx-auto">
          <div className="rounded-2xl p-8" style={{ backgroundImage: 'linear-gradient(to bottom right, var(--color-primary-50), var(--color-accent-50))' }}>
            <div className="space-y-4 mb-8">
              {content.openingHours.schedule.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-primary-100 last:border-0">
                  <span className="font-semibold text-gray-900">{item.days}</span>
                  <div className="text-right">
                    <span className={`font-medium ${item.hours === 'Chiuso' ? 'text-red-500' : 'text-primary-600'}`}>
                      {item.hours}
                    </span>
                    {item.services && <p className="text-xs text-gray-500">{item.services}</p>}
                  </div>
                </div>
              ))}
            </div>
            {content.openingHours.notes && (
              <div className="space-y-3">
                {content.openingHours.notes.map((note: any, index: number) => {
                  const IconComponent = iconMap[note.icon] || Clock;
                  return (
                    <div key={index} className="flex items-center gap-3 text-sm text-gray-600">
                      <IconComponent className="w-4 h-4 text-primary-500" />
                      {note.text}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

/**
 * Location Section (Contatti - Medica)
 */
export const LocationSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.location?.address) return null;

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.location.title}
          </h2>
        </div>
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Indirizzo</h3>
              </div>
              <p className="text-lg text-gray-700">
                {content.location.address.street}<br />
                {content.location.address.cap} {content.location.address.city}<br />
                {content.location.address.region}
              </p>
            </div>
            {content.location.directions && (
              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Come Raggiungerci</h3>
                <div className="space-y-4">
                  {content.location.directions.car && (
                    <div className="flex items-start gap-3">
                      <Car className="w-5 h-5 text-primary-500 flex-shrink-0 mt-1" />
                      <div>
                        <span className="font-medium text-gray-900">Auto</span>
                        <p className="text-sm text-gray-600">{content.location.directions.car}</p>
                      </div>
                    </div>
                  )}
                  {content.location.directions.metro && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-primary-500 flex-shrink-0 mt-1" />
                      <div>
                        <span className="font-medium text-gray-900">Metro</span>
                        <p className="text-sm text-gray-600">{content.location.directions.metro}</p>
                      </div>
                    </div>
                  )}
                  {content.location.directions.bus && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-primary-500 flex-shrink-0 mt-1" />
                      <div>
                        <span className="font-medium text-gray-900">Bus</span>
                        <p className="text-sm text-gray-600">{content.location.directions.bus}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

/**
 * Social Media Section (Contatti)
 */
export const SocialMediaSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.socialMedia?.platforms) return null;

  return (
    <section className="py-16 text-white" style={{ backgroundImage: 'linear-gradient(to right, var(--color-primary-800), var(--color-primary-700), var(--color-primary-800))' }}>
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-2xl font-bold mb-6">{content.socialMedia.title}</h2>
        <div className="flex justify-center gap-6">
          {content.socialMedia.platforms.map((platform: any, index: number) => (
            <a
              key={index}
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 bg-white/10 backdrop-blur rounded-full flex items-center justify-center hover:bg-white/20 transition-colors border border-white/20"
              title={platform.name}
            >
              <Globe className="w-6 h-6" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

/**
 * Alternative Booking Section (Prenota Online)
 */
export const AlternativeBookingSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.alternativeBooking) return null;

  return (
    <section className="py-16 bg-primary-600 text-white">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-2xl font-bold mb-4">{content.alternativeBooking.title}</h2>
        <p className="text-primary-100 mb-6">{content.alternativeBooking.description}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {content.alternativeBooking.phone && (
            <a
              href={`tel:${content.alternativeBooking.phone.number}`}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-primary-700 font-bold rounded-xl hover:bg-primary-50 transition-colors"
            >
              <Phone className="w-5 h-5" />
              {content.alternativeBooking.phone.number}
            </a>
          )}
          {content.alternativeBooking.whatsapp && (
            <a
              href={`https://wa.me/${content.alternativeBooking.whatsapp.number.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
              {content.alternativeBooking.whatsapp.text}
            </a>
          )}
        </div>
      </div>
    </section>
  );
};
