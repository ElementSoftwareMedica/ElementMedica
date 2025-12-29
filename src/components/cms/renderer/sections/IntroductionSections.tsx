/**
 * CMS Introduction Sections
 * 
 * Sezioni introduttive: Introduction, Mission, Why Choose Us, etc.
 */

import React from 'react';
import { iconMap, getIconComponent } from '../iconMap';
import { CheckCircle, Star } from 'lucide-react';

// Color mapping per badge/cards (condiviso tra sezioni)
export const colorMap: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  cyan: 'bg-cyan-100 text-cyan-700',
  teal: 'bg-teal-100 text-teal-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
  red: 'bg-red-100 text-red-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  gray: 'bg-gray-100 text-gray-700'
};

export const bgColorMap: Record<string, string> = {
  blue: 'bg-blue-600',
  green: 'bg-green-600',
  cyan: 'bg-cyan-600',
  teal: 'bg-teal-600',
  purple: 'bg-purple-600',
  orange: 'bg-orange-600',
  red: 'bg-red-600',
  yellow: 'bg-yellow-500',
  gray: 'bg-gray-600'
};

interface IntroductionSectionProps {
  content: {
    title: string;
    content: string;
    highlights?: Array<{
      icon: string;
      title: string;
      description: string;
    }>;
  };
}

export const IntroductionSection: React.FC<IntroductionSectionProps> = ({ content }) => (
  <section className="py-20 bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30">
    <div className="container mx-auto px-4">
      <div className="max-w-4xl mx-auto text-center mb-12">
        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
          {content.title}
        </h2>
        <p className="text-xl text-gray-600 leading-relaxed">
          {content.content}
        </p>
      </div>
      {content.highlights && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {content.highlights.map((item, index) => {
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

interface MissionSectionProps {
  content: {
    title: string;
    subtitle?: string;
    description: string;
    values?: Array<{
      icon: string;
      title: string;
      description: string;
    }>;
  };
}

export const MissionSection: React.FC<MissionSectionProps> = ({ content }) => (
  <section className="py-20 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
    <div className="container mx-auto px-4">
      <div className="max-w-4xl mx-auto text-center mb-16">
        <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-4">
          La Nostra Missione
        </span>
        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
          {content.title}
        </h2>
        {content.subtitle && (
          <p className="text-xl text-blue-600 font-medium mb-4">{content.subtitle}</p>
        )}
        <p className="text-lg text-gray-600 leading-relaxed">
          {content.description}
        </p>
      </div>
      {content.values && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {content.values.map((value, index) => {
            const IconComponent = iconMap[value.icon] || CheckCircle;
            const colors = [
              { bg: 'from-blue-500 to-blue-600', light: 'bg-blue-50', border: 'border-blue-200' },
              { bg: 'from-emerald-500 to-teal-600', light: 'bg-emerald-50', border: 'border-emerald-200' },
              { bg: 'from-purple-500 to-indigo-600', light: 'bg-purple-50', border: 'border-purple-200' },
              { bg: 'from-orange-500 to-amber-600', light: 'bg-orange-50', border: 'border-orange-200' }
            ];
            const color = colors[index % colors.length];
            return (
              <div key={index} className={`${color.light} rounded-2xl p-8 border ${color.border} hover:shadow-lg transition-all group`}>
                <div className={`w-16 h-16 bg-gradient-to-br ${color.bg} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                  <IconComponent className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{value.title}</h3>
                <p className="text-gray-600">{value.description}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  </section>
);

interface WhyChooseUsSectionProps {
  content: {
    sectionTitle?: string;
    title?: string;
    sectionSubtitle?: string;
    description?: string;
    items?: Array<{
      icon: string;
      title: string;
      description: string;
      highlight?: string;
    }>;
    advantages?: Array<{
      icon: string;
      title: string;
      description: string;
      highlight?: string;
    }>;
    features?: Array<{
      icon: string;
      title: string;
      description: string;
      highlight?: string;
    }>;
  };
  testimonials?: Array<{
    rating?: number;
    text: string;
    name: string;
    role?: string;
    company?: string;
  }>;
}

export const WhyChooseUsSection: React.FC<WhyChooseUsSectionProps> = ({ content, testimonials }) => {
  const items = content.items || content.advantages || content.features;
  
  return (
    <section className="py-20 bg-gradient-to-br from-white via-amber-50/30 to-orange-50/40">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold mb-4">Perché Noi</span>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.sectionTitle || content.title || 'Perché Scegliere Element Formazione'}
          </h2>
          {(content.sectionSubtitle || content.description) && (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {content.sectionSubtitle || content.description}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items?.map((feature, index) => {
            const IconComponent = iconMap[feature.icon] || CheckCircle;
            const colorSets = [
              { bg: 'bg-blue-500', light: 'bg-blue-50', badge: 'bg-blue-100 text-blue-700' },
              { bg: 'bg-purple-500', light: 'bg-purple-50', badge: 'bg-purple-100 text-purple-700' },
              { bg: 'bg-teal-500', light: 'bg-teal-50', badge: 'bg-teal-100 text-teal-700' },
              { bg: 'bg-green-500', light: 'bg-green-50', badge: 'bg-green-100 text-green-700' },
              { bg: 'bg-orange-500', light: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700' },
              { bg: 'bg-indigo-500', light: 'bg-indigo-50', badge: 'bg-indigo-100 text-indigo-700' }
            ];
            const colorSet = colorSets[index % colorSets.length];
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
        {testimonials && testimonials.length > 0 && (
          <div className="mt-20">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full text-sm font-semibold mb-4">Testimonianze</span>
              <h3 className="text-2xl lg:text-3xl font-bold text-gray-900">
                Cosa Dicono i Nostri Clienti
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.slice(0, 3).map((testimonial, index) => (
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

export default {
  IntroductionSection,
  MissionSection,
  WhyChooseUsSection
};
