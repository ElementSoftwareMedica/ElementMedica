/**
 * Common UI Sections
 * 
 * CMS sections for testimonials, FAQ, CTA, pricing, why choose us
 * 
 * @module components/cms/renderer/custom-content-renderer/CommonSections
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { iconMap, CheckCircle, Star, Award, ArrowRight, Sparkles } from '../iconMap';
import { FAQItem } from '../FAQItem';
import { PublicButton } from '../../../public/PublicButton';
import { whyChooseUsColors, stepColors, certColors } from './types';

/**
 * Why Choose Us Section
 */
export const WhyChooseUsSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.whyChooseUs) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-white via-amber-50/30 to-orange-50/40">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold mb-4">Perché Noi</span>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.whyChooseUs.sectionTitle || content.whyChooseUs.title || 'Perché Scegliere Element Formazione'}
          </h2>
          {(content.whyChooseUs.sectionSubtitle || content.whyChooseUs.description) && (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {content.whyChooseUs.sectionSubtitle || content.whyChooseUs.description}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {(content.whyChooseUs.items || content.whyChooseUs.advantages || content.whyChooseUs.features)?.map((feature: any, index: number) => {
            const IconComponent = iconMap[feature.icon] || CheckCircle;
            const colorSet = whyChooseUsColors[index % whyChooseUsColors.length];
            return (
              <div key={index} className={`${colorSet.light} rounded-2xl p-8 hover:shadow-xl transition-all group`}>
                <div className={`w-14 h-14 ${colorSet.bg} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                  <IconComponent className="w-7 h-7 text-white" />
                </div>
                {feature.highlight && (
                  <div className={`inline-block px-3 py-1 ${colorSet.badge} rounded-full text-xs font-bold mb-3`}>
                    {feature.highlight}
                  </div>
                )}
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* Testimonials inline if present */}
        {content.testimonials && content.testimonials.length > 0 && (
          <div className="mt-20">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full text-sm font-semibold mb-4">Testimonianze</span>
              <h3 className="text-2xl lg:text-3xl font-bold text-gray-900">
                Cosa Dicono i Nostri Clienti
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {content.testimonials.slice(0, 3).map((testimonial: any, index: number) => (
                <div key={index} className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 shadow-lg border border-gray-100">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating || 5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-6 italic">"{testimonial.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      {testimonial.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{testimonial.name}</div>
                      <div className="text-sm text-gray-500">{testimonial.role} - {testimonial.company}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

/**
 * Testimonials Section (standalone)
 */
export const TestimonialsSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.testimonials || !Array.isArray(content.testimonials) || content.testimonials.length === 0) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-48 h-48 bg-yellow-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-orange-200/20 rounded-full blur-3xl" />
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full text-sm font-semibold mb-4">
            Testimonianze
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Cosa Dicono i Nostri Pazienti
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Leggi le esperienze di chi ha scelto i nostri servizi
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {content.testimonials.map((testimonial: any, index: number) => (
            <div key={index} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100 group">
              <div className="flex items-center mb-4">
                {[...Array(testimonial.rating || 5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 mb-6 italic text-sm leading-relaxed">"{testimonial.text}"</p>
              <div className="border-t pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {testimonial.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    {testimonial.specialty && (
                      <div className="text-xs text-teal-600 font-medium">{testimonial.specialty}</div>
                    )}
                    {testimonial.role && <div className="text-xs text-gray-500">{testimonial.role}</div>}
                  </div>
                </div>
                {testimonial.date && (
                  <div className="text-xs text-gray-400 mt-2">{testimonial.date}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/**
 * FAQ Section (Homepage)
 */
export const FAQSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.faq) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 relative overflow-hidden">
      {/* Decorative bubbles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-blue-200/30 rounded-full blur-3xl" />
        <div className="absolute top-40 right-20 w-48 h-48 bg-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-1/4 w-56 h-56 bg-purple-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-40 right-10 w-40 h-40 bg-teal-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-cyan-200/20 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2" />
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-4">
            FAQ
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.faq.title || 'Domande Frequenti'}
          </h2>
          {content.faq.description && (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {content.faq.description}
            </p>
          )}
        </div>
        {content.faq.items && (
          <div className="max-w-4xl mx-auto space-y-4">
            {content.faq.items.map((item: { question: string; answer: string }, index: number) => (
              <FAQItem key={index} question={item.question} answer={item.answer} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

/**
 * CTA Section - Final Call to Action
 */
export const CTASection: React.FC<{ content: any }> = ({ content }) => {
  const navigate = useNavigate();

  if (!content.cta) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>
      <div className="container mx-auto px-4 text-center relative z-10">
        <span className="inline-block px-4 py-2 bg-gradient-to-r from-blue-500/20 to-teal-500/20 backdrop-blur border border-white/10 rounded-full text-sm font-semibold mb-6">
          {content.cta.badge || 'Inizia Ora'}
        </span>
        <h2 className="text-3xl lg:text-5xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-teal-100 bg-clip-text text-transparent">
          {content.cta.title}
        </h2>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          {content.cta.description}
        </p>
        {content.cta.badges && (
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {content.cta.badges.map((badge: string, index: number) => (
              <span key={index} className="px-4 py-2 bg-white/5 backdrop-blur border border-white/10 rounded-full text-sm text-gray-300">
                {badge}
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {content.cta.primaryButton && (
            <button
              onClick={() => navigate(content.cta.primaryButton.href)}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-teal-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-teal-600 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 group"
            >
              {content.cta.primaryButton.text}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
          {content.cta.secondaryButton && (
            <button
              onClick={() => navigate(content.cta.secondaryButton.href)}
              className="px-8 py-4 bg-white/5 border border-white/20 text-white font-bold rounded-xl hover:bg-white/10 hover:border-white/30 transition-all flex items-center justify-center gap-2"
            >
              {content.cta.secondaryButton.text}
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

/**
 * Our Process Section (Homepage)
 */
export const OurProcessSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.ourProcess) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold mb-4">Il Nostro Metodo</span>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.ourProcess.title || 'Come Lavoriamo'}
          </h2>
          {content.ourProcess.description && (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {content.ourProcess.description}
            </p>
          )}
        </div>
        {content.ourProcess.steps && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {content.ourProcess.steps.map((step: any, index: number) => {
              const IconComponent = iconMap[step.icon] || CheckCircle;
              const colors = stepColors[index % stepColors.length];
              return (
                <div key={index} className="relative group">
                  <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all text-center">
                    <div className={`inline-flex items-center justify-center w-16 h-16 ${colors.bg} rounded-2xl mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <div className={`text-4xl font-bold ${colors.text} mb-2`}>{step.number}</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
                  {index < content.ourProcess.steps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-gray-300 to-gray-200" />
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
 * Company Numbers Section (Homepage)
 */
export const CompanyNumbersSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.companyNumbers) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 text-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-white/20 backdrop-blur rounded-full text-sm font-semibold mb-4">I Nostri Numeri</span>
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            {content.companyNumbers.title || 'Esperienza che Conta'}
          </h2>
          {content.companyNumbers.description && (
            <p className="text-xl text-white/90 max-w-3xl mx-auto">
              {content.companyNumbers.description}
            </p>
          )}
        </div>
        {content.companyNumbers.stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {content.companyNumbers.stats.map((stat: any, index: number) => {
              const IconComponent = iconMap[stat.icon] || Award;
              return (
                <div key={index} className="text-center group">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-white/30 transition-colors">
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-4xl lg:text-5xl font-bold mb-2">{stat.number}</div>
                  <div className="text-lg font-semibold mb-1">{stat.label}</div>
                  {stat.description && (
                    <div className="text-sm text-white/80">{stat.description}</div>
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
 * Certifications Section (Homepage)
 */
export const CertificationsSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.certifications) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold mb-4">Qualità Certificata</span>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.certifications.title || content.certifications.sectionTitle || 'Certificazioni e Riconoscimenti'}
          </h2>
          {(content.certifications.description || content.certifications.sectionSubtitle) && (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {content.certifications.description || content.certifications.sectionSubtitle}
            </p>
          )}
        </div>
        {content.certifications.items && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {content.certifications.items.map((item: any, index: number) => {
              const IconComponent = iconMap[item.icon] || Award;
              const colors = certColors[index % certColors.length];
              return (
                <div key={index} className={`${colors.light} rounded-2xl p-8 text-center hover:shadow-xl transition-all group border ${colors.border}`}>
                  <div className={`w-16 h-16 ${colors.bg} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{item.name}</h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
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
 * Pricing Section
 */
export const PricingSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.pricing) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.pricing.title}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {content.pricing.description}
          </p>
          {content.pricing.disclaimer && (
            <p className="text-sm text-gray-500 mt-4 italic">{content.pricing.disclaimer}</p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-12">
          {content.pricing.packages?.map((pkg: any, index: number) => (
            <div
              key={index}
              className={`bg-white rounded-2xl p-8 shadow-xl ${pkg.recommended ? 'ring-2 ring-primary-500 transform scale-105' : 'border border-gray-200'}`}
            >
              {pkg.badge && (
                <span className="inline-block px-3 py-1 bg-primary-600 text-white text-xs font-semibold rounded-full mb-4">
                  {pkg.badge}
                </span>
              )}
              <h3 className="font-bold text-xl text-gray-900 mb-2">{pkg.name}</h3>
              {pkg.subtitle && <p className="text-sm text-gray-500 mb-2">{pkg.subtitle}</p>}
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-bold text-primary-600">{pkg.price}</span>
                {pkg.unit && <span className="text-gray-500">/{pkg.unit}</span>}
              </div>
              <p className="text-sm text-gray-600 mb-6">{pkg.description}</p>
              <ul className="space-y-3 mb-6">
                {pkg.features?.map((feature: string, featureIndex: number) => (
                  <li key={featureIndex} className="flex items-start text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              {pkg.setup && (
                <p className="text-xs text-gray-500 mb-4">Setup iniziale: {pkg.setup}</p>
              )}
              <PublicButton
                variant={pkg.recommended ? 'primary' : 'outline'}
                size="lg"
                className="w-full"
                to="/contatti"
              >
                Richiedi Preventivo
              </PublicButton>
            </div>
          ))}
        </div>
        {content.pricing.additionalServices && (
          <div className="max-w-4xl mx-auto bg-gray-50 rounded-xl p-8">
            <h4 className="font-semibold text-gray-900 mb-4">{content.pricing.additionalServices.title}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {content.pricing.additionalServices.items?.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center bg-white rounded-lg p-4">
                  <div>
                    <span className="font-medium text-gray-900">{item.service}</span>
                    {item.note && <p className="text-xs text-gray-500">{item.note}</p>}
                  </div>
                  <span className="text-primary-600 font-semibold">{item.price}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {content.pricing.cta && (
          <div className="text-center mt-12">
            <h4 className="font-semibold text-gray-900 mb-2">{content.pricing.cta.title}</h4>
            <p className="text-gray-600 mb-4">{content.pricing.cta.description}</p>
            <PublicButton variant="primary" size="lg" to={content.pricing.cta.button?.href || '/contatti'}>
              {content.pricing.cta.button?.text || 'Richiedi Preventivo'}
            </PublicButton>
          </div>
        )}
      </div>
    </section>
  );
};
