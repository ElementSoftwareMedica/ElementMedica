/**
 * Introduction & Services Sections
 * 
 * CMS sections for introduction and services content
 * 
 * @module components/cms/renderer/custom-content-renderer/IntroductionSections
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { iconMap, CheckCircle, Shield, Clock, ArrowRight } from '../iconMap';
import type { CMSSectionProps } from './types';
import { serviceColorSchemes } from './types';

/**
 * Introduction Section (Medicina del Lavoro)
 */
export const IntroductionSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.introduction) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
            {content.introduction.title}
          </h2>
          <p className="text-xl text-gray-600 leading-relaxed">
            {content.introduction.content}
          </p>
        </div>
        {content.introduction.highlights && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {content.introduction.highlights.map((item: any, index: number) => {
              const IconComponent = iconMap[item.icon] || CheckCircle;
              return (
                <div key={index} className="bg-gray-50 rounded-2xl p-6 text-center">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <IconComponent className="w-8 h-8 text-primary-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
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
 * Services Section with Items (Medicina del Lavoro)
 */
export const ServicesItemsSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.services?.items) return null;

  const colors: Record<string, { bg: string; border: string; iconBg: string }> = {
    teal: { bg: 'from-teal-50 to-white', border: 'border-teal-500', iconBg: 'bg-teal-600' },
    blue: { bg: 'from-blue-50 to-white', border: 'border-blue-500', iconBg: 'bg-blue-600' },
    purple: { bg: 'from-purple-50 to-white', border: 'border-purple-500', iconBg: 'bg-purple-600' },
    orange: { bg: 'from-orange-50 to-white', border: 'border-orange-500', iconBg: 'bg-orange-600' }
  };

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.services.sectionTitle || 'I Nostri Servizi'}
          </h2>
          {content.services.sectionSubtitle && (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {content.services.sectionSubtitle}
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {content.services.items.map((service: any, index: number) => {
            const IconComponent = iconMap[service.icon] || Shield;
            const colorSet = colors[service.color] || colors.teal;
            return (
              <div key={index} className={`bg-gradient-to-br ${colorSet.bg} rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border-l-4 ${colorSet.border}`}>
                <div className="flex items-start gap-4 mb-6">
                  <div className={`w-14 h-14 ${colorSet.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <IconComponent className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{service.title}</h3>
                    <p className="text-gray-600">{service.description}</p>
                  </div>
                </div>
                {service.details && (
                  <div className="space-y-3">
                    {service.details.map((detail: any, detailIndex: number) => (
                      <div key={detailIndex} className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-medium text-gray-900">{detail.label}</span>
                          {detail.desc && <span className="text-gray-600 text-sm ml-2">- {detail.desc}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/**
 * Services Section - Premium with varied colors
 */
export const ServicesArraySection: React.FC<{ content: any }> = ({ content }) => {
  const navigate = useNavigate();

  if (!content.services || !Array.isArray(content.services)) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-4">I Nostri Servizi</span>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.services.sectionTitle || 'Soluzioni Complete per la Sicurezza'}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {content.services.sectionSubtitle || 'Servizi professionali per ogni esigenza aziendale'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {content.services.map((service: any, index: number) => {
            const IconComponent = iconMap[service.icon] || Shield;
            const colors = serviceColorSchemes[service.color] || serviceColorSchemes.blue;
            return (
              <div
                key={index}
                className={`bg-gradient-to-br ${colors.gradient} rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-t-4 ${colors.border} group`}
              >
                {service.badge && (
                  <span className={`inline-block px-3 py-1 ${colors.badge} text-xs font-semibold rounded-full mb-4`}>
                    {service.badge}
                  </span>
                )}
                <div className={`w-16 h-16 ${colors.iconBg} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                  <IconComponent className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{service.title}</h3>
                {service.price && (
                  <div className="text-2xl font-bold text-gray-900 mb-2">{service.price}</div>
                )}
                {service.duration && (
                  <div className="text-sm text-gray-500 mb-4">{service.duration}</div>
                )}
                <p className="text-gray-600 mb-6">{service.description}</p>
                {service.features && (
                  <ul className="space-y-2 mb-6">
                    {service.features.slice(0, 5).map((feature: string, featureIndex: number) => (
                      <li key={featureIndex} className="flex items-start text-sm text-gray-700">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}
                {service.href && (
                  <button
                    onClick={() => navigate(service.href)}
                    className={`w-full py-3 px-4 ${colors.iconBg} text-white rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2`}
                  >
                    Scopri di più
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/**
 * Service Includes Section (RSPP/Medicina Page)
 */
export const ServiceIncludesSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.serviceIncludes) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-white via-teal-50/30 to-cyan-50/40">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.serviceIncludes.title || 'Il Servizio Include'}
          </h2>
          {content.serviceIncludes.description && (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {content.serviceIncludes.description}
            </p>
          )}
        </div>
        {content.serviceIncludes.items && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {content.serviceIncludes.items.map((item: string, index: number) => (
              <div key={index} className="flex items-center space-x-3 bg-gray-50 rounded-lg p-4">
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                <span className="text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
