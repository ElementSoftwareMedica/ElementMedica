/**
 * Custom Content Renderer
 * 
 * Componente per il rendering di contenuti custom dal CMS.
 * Gestisce tutte le sezioni speciali: services, whyChooseUs, testimonials, cta, etc.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { iconMap, getIconComponent, CheckCircle, Star, Phone, Mail, MapPin, Clock, 
  Scale, AlertCircle, AlertTriangle, GraduationCap, RefreshCw, Monitor, ArrowRight,
  Calendar, Car, Activity, MessageSquare, Stethoscope, BookOpen, Shield, Users, Award, Sparkles,
  Globe } from './iconMap';
import { FAQItem } from './FAQItem';
import { PublicButton } from '../../public/PublicButton';
import { ContactForm } from '../../public/ContactForm';
import { CourseCalendarSection } from '../../public/CourseCalendarSection';
import { getCurrentBrand } from '../../../config/brands.config';

const CustomContentRenderer: React.FC<{ content: any; slug: string }> = ({ content, slug }) => {
  const navigate = useNavigate();

  // Color mapping per badge/cards
  const colorMap: Record<string, string> = {
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

  const bgColorMap: Record<string, string> = {
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

  return (
    <>
      {/* Introduction Section (Medicina del Lavoro) */}
      {content.introduction && (
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
      )}

      {/* Services Section with Items (Medicina del Lavoro) */}
      {content.services?.items && (
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
                const colors: Record<string, { bg: string; border: string; iconBg: string }> = {
                  teal: { bg: 'from-teal-50 to-white', border: 'border-teal-500', iconBg: 'bg-teal-600' },
                  blue: { bg: 'from-blue-50 to-white', border: 'border-blue-500', iconBg: 'bg-blue-600' },
                  purple: { bg: 'from-purple-50 to-white', border: 'border-purple-500', iconBg: 'bg-purple-600' },
                  orange: { bg: 'from-orange-50 to-white', border: 'border-orange-500', iconBg: 'bg-orange-600' }
                };
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
      )}

      {/* When Required Section (Medicina del Lavoro) */}
      {content.whenRequired && (
        <section className="py-20 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.whenRequired.sectionTitle}
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                {content.whenRequired.description}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {content.whenRequired.risks?.map((risk: any, index: number) => {
                const IconComponent = iconMap[risk.icon] || AlertTriangle;
                return (
                  <div key={index} className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all group">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-orange-200 transition-colors">
                      <IconComponent className="w-6 h-6 text-orange-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{risk.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{risk.description}</p>
                    {risk.threshold && (
                      <div className="bg-orange-50 rounded-lg px-3 py-2">
                        <span className="text-xs font-medium text-orange-700">Soglia: {risk.threshold}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Medical Exam Judgments Section */}
      {content.medicalExam && (
        <section className="py-20 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/40">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.medicalExam.sectionTitle}
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                {content.medicalExam.description}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              {content.medicalExam.judgments?.map((judgment: any, index: number) => {
                const IconComponent = iconMap[judgment.icon] || CheckCircle;
                const colorClasses: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
                  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', iconBg: 'bg-green-500' },
                  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', iconBg: 'bg-yellow-500' },
                  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', iconBg: 'bg-orange-500' },
                  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', iconBg: 'bg-red-500' },
                  gray: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-800', iconBg: 'bg-gray-500' }
                };
                const colors = colorClasses[judgment.color] || colorClasses.gray;
                return (
                  <div key={index} className={`${colors.bg} ${colors.border} border-2 rounded-xl p-5 text-center`}>
                    <div className={`w-12 h-12 ${colors.iconBg} rounded-full flex items-center justify-center mx-auto mb-3`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <h3 className={`font-bold ${colors.text} mb-2 text-sm`}>{judgment.type}</h3>
                    <p className="text-xs text-gray-600">{judgment.description}</p>
                  </div>
                );
              })}
            </div>
            {content.medicalExam.note && (
              <div className="max-w-3xl mx-auto bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                <AlertCircle className="w-5 h-5 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-blue-800">{content.medicalExam.note}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Process Steps Section (Medicina del Lavoro) */}
      {content.process?.steps && (
        <section className="py-20 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.process.sectionTitle}
              </h2>
            </div>
            <div className="max-w-5xl mx-auto">
              <div className="relative">
                {/* Vertical line connector */}
                <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-300 via-indigo-400 to-purple-500 transform -translate-x-1/2" />

                {content.process.steps.map((step: any, index: number) => {
                  const IconComponent = iconMap[step.icon] || CheckCircle;
                  const isLeft = index % 2 === 0;
                  return (
                    <div key={index} className={`flex items-center gap-8 mb-12 ${isLeft ? 'lg:flex-row' : 'lg:flex-row-reverse'}`}>
                      <div className={`flex-1 ${isLeft ? 'lg:text-right' : 'lg:text-left'}`}>
                        <div className={`bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow ${isLeft ? 'lg:mr-8' : 'lg:ml-8'}`}>
                          <div className="flex items-center gap-4 mb-3">
                            <span className="px-3 py-1 bg-indigo-600 text-white font-bold rounded-lg text-sm">{step.number}</span>
                            <h3 className="text-xl font-bold text-gray-900">{step.title}</h3>
                          </div>
                          <p className="text-gray-600 mb-2">{step.description}</p>
                          {step.duration && (
                            <span className="inline-flex items-center text-sm text-indigo-600">
                              <Clock className="w-4 h-4 mr-1" />
                              {step.duration}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="hidden lg:flex w-16 h-16 bg-white rounded-full shadow-lg items-center justify-center z-10 border-4 border-indigo-200">
                        <IconComponent className="w-8 h-8 text-indigo-600" />
                      </div>
                      <div className="flex-1 hidden lg:block" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Advantages Section (Medicina del Lavoro) */}
      {content.advantages && (
        <section className="py-20 bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/40">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.advantages.sectionTitle}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {content.advantages.items?.map((item: any, index: number) => {
                const IconComponent = iconMap[item.icon] || Sparkles;
                const colors = ['bg-blue-500', 'bg-teal-500', 'bg-purple-500', 'bg-orange-500', 'bg-green-500', 'bg-indigo-500'];
                return (
                  <div key={index} className="group bg-gray-50 rounded-2xl p-8 hover:bg-white hover:shadow-xl transition-all">
                    <div className={`w-14 h-14 ${colors[index % colors.length]} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                      <IconComponent className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                    <p className="text-gray-600">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Normativa Section (Medicina del Lavoro) */}
      {content.normativa && (
        <section className="py-20 bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.normativa.sectionTitle}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {content.normativa.articles?.map((article: any, index: number) => (
                <div key={index} className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border-t-4 border-slate-600">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
                    <Scale className="w-6 h-6 text-slate-600" />
                  </div>
                  <span className="inline-block px-2 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded mb-3">{article.code}</span>
                  <h3 className="font-semibold text-gray-900 mb-2">{article.title}</h3>
                  <p className="text-sm text-gray-600">{article.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* What Is RSPP Section */}
      {content.whatIsRSPP && (
        <section className="py-20 bg-gradient-to-br from-white via-blue-50/30 to-slate-50/40">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                {content.whatIsRSPP.title}
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                {content.whatIsRSPP.description}
              </p>
            </div>
            {content.whatIsRSPP.highlights && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {content.whatIsRSPP.highlights.map((item: any, index: number) => {
                  const IconComponent = iconMap[item.icon] || CheckCircle;
                  const bgColor = bgColorMap[item.color] || 'bg-primary-600';
                  return (
                    <div key={index} className="bg-gray-50 rounded-2xl p-6 border-t-4 border-primary-600">
                      <div className={`w-14 h-14 ${bgColor} rounded-full flex items-center justify-center mb-4`}>
                        <IconComponent className="w-7 h-7 text-white" />
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
      )}

      {/* RSPP Comparison Section */}
      {content.rsppComparison && (
        <section className="py-20 bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.rsppComparison.title}
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                {content.rsppComparison.description}
              </p>
            </div>
            <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-primary-600 text-white">
                    <tr>
                      <th className="px-6 py-4 text-left font-semibold">Caratteristica</th>
                      <th className="px-6 py-4 text-left font-semibold">RSPP Interno</th>
                      <th className="px-6 py-4 text-left font-semibold">RSPP Esterno</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {content.rsppComparison.comparison?.map((row: any, index: number) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 font-medium text-gray-900">{row.feature}</td>
                        <td className="px-6 py-4 text-gray-600">
                          <span className={row.winner === 'interno' ? 'text-green-600 font-semibold' : ''}>
                            {row.interno}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          <span className={row.winner === 'esterno' ? 'text-green-600 font-semibold' : ''}>
                            {row.esterno}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {content.rsppComparison.conclusion && (
                <div className="p-6 bg-primary-50 border-t border-primary-100">
                  <h4 className="font-semibold text-primary-900 mb-3">{content.rsppComparison.conclusion.title}</h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p><strong>PMI:</strong> {content.rsppComparison.conclusion.small}</p>
                    <p><strong>Medie aziende:</strong> {content.rsppComparison.conclusion.medium}</p>
                    <p><strong>Grandi aziende:</strong> {content.rsppComparison.conclusion.large}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Services Section - Premium with varied colors */}
      {content.services && Array.isArray(content.services) && (
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
                const colorSchemes: Record<string, { gradient: string; iconBg: string; border: string; badge: string }> = {
                  blue: { gradient: 'from-blue-50 to-white', iconBg: 'bg-blue-600', border: 'border-blue-500', badge: 'bg-blue-100 text-blue-700' },
                  purple: { gradient: 'from-purple-50 to-white', iconBg: 'bg-purple-600', border: 'border-purple-500', badge: 'bg-purple-100 text-purple-700' },
                  teal: { gradient: 'from-teal-50 to-white', iconBg: 'bg-teal-600', border: 'border-teal-500', badge: 'bg-teal-100 text-teal-700' },
                  green: { gradient: 'from-green-50 to-white', iconBg: 'bg-green-600', border: 'border-green-500', badge: 'bg-green-100 text-green-700' },
                  orange: { gradient: 'from-orange-50 to-white', iconBg: 'bg-orange-600', border: 'border-orange-500', badge: 'bg-orange-100 text-orange-700' }
                };
                const colors = colorSchemes[service.color] || colorSchemes.blue;
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
      )}

      {/* Why Choose Us Section - Improved with colors */}
      {content.whyChooseUs && (
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
      )}

      {/* Mission Section (Chi Siamo) */}
      {content.mission && (
        <section className="py-20 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center mb-16">
              <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-4">
                La Nostra Missione
              </span>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                {content.mission.title}
              </h2>
              {content.mission.subtitle && (
                <p className="text-xl text-blue-600 font-medium mb-4">{content.mission.subtitle}</p>
              )}
              <p className="text-lg text-gray-600 leading-relaxed">
                {content.mission.description}
              </p>
            </div>
            {content.mission.values && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {content.mission.values.map((value: any, index: number) => {
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
      )}

      {/* Storia/Timeline Section (Chi Siamo) */}
      {content.storia && (
        <section className="py-20 bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-2 bg-white/10 text-white rounded-full text-sm font-semibold mb-4 backdrop-blur">
                Il Nostro Percorso
              </span>
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">{content.storia.title}</h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">{content.storia.subtitle}</p>
            </div>
            <div className="max-w-5xl mx-auto">
              <div className="relative">
                {/* Vertical line */}
                <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 via-purple-500 to-teal-500 transform -translate-x-1/2 rounded-full" />
                {content.storia.timeline?.map((item: any, index: number) => {
                  const isLeft = index % 2 === 0;
                  const colors: Record<string, string> = {
                    blue: 'from-blue-500 to-blue-600',
                    green: 'from-emerald-500 to-teal-600',
                    purple: 'from-purple-500 to-indigo-600',
                    orange: 'from-orange-500 to-amber-600',
                    teal: 'from-teal-500 to-cyan-600',
                    indigo: 'from-indigo-500 to-blue-600'
                  };
                  const gradient = colors[item.color] || colors.blue;
                  return (
                    <div key={index} className={`relative flex items-center mb-12 ${isLeft ? 'lg:flex-row' : 'lg:flex-row-reverse'}`}>
                      <div className={`w-full lg:w-1/2 ${isLeft ? 'lg:pr-12 lg:text-right' : 'lg:pl-12'}`}>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all">
                          <span className={`inline-block px-3 py-1 bg-gradient-to-r ${gradient} rounded-full text-sm font-bold mb-3`}>
                            {item.year}
                          </span>
                          <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                          <p className="text-gray-300">{item.description}</p>
                        </div>
                      </div>
                      {/* Center dot */}
                      <div className={`hidden lg:flex absolute left-1/2 transform -translate-x-1/2 w-6 h-6 bg-gradient-to-br ${gradient} rounded-full border-4 border-gray-900 shadow-lg`} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Team Section (Chi Siamo) */}
      {content.team && (
        <section className="py-20 bg-gradient-to-br from-white via-slate-50 to-blue-50/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold mb-4">
                Il Nostro Team
              </span>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">{content.team.sectionTitle || content.team.title}</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">{content.team.sectionSubtitle || content.team.description}</p>
            </div>

            {/* Team Stats */}
            {content.team.stats && (
              <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto mb-16">
                {content.team.stats.map((stat: any, index: number) => {
                  const IconComponent = iconMap[stat.icon] || Users;
                  return (
                    <div key={index} className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <IconComponent className="w-8 h-8 text-white" />
                      </div>
                      <div className="text-3xl font-bold text-gray-900">{stat.number}</div>
                      <div className="text-gray-600">{stat.label}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Team Members (simple) */}
            {content.team.members && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {content.team.members.map((member: any, index: number) => (
                  <div key={index} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all text-center group">
                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-3xl font-bold group-hover:scale-105 transition-transform">
                      {member.name?.charAt(0) || 'U'}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{member.name}</h3>
                    <p className="text-indigo-600 font-medium text-sm mb-2">{member.role}</p>
                    <p className="text-gray-500 text-sm">{member.expertise}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Team Doctors (detailed for medical pages) */}
            {content.team.doctors && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {content.team.doctors.map((doctor: any, index: number) => (
                  <div key={index} className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all group">
                    {/* Doctor Photo/Avatar */}
                    <div className="h-48 bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                      <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white text-4xl font-bold border-4 border-white/30">
                        {doctor.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="inline-block px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-semibold mb-3">
                        {doctor.specialty}
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{doctor.name}</h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">{doctor.description}</p>
                      {doctor.education && (
                        <p className="text-xs text-gray-500 mb-2 flex items-center">
                          <GraduationCap className="w-3 h-3 mr-1" />
                          {doctor.education}
                        </p>
                      )}
                      {doctor.languages && doctor.languages.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {doctor.languages.map((lang: string, langIdx: number) => (
                            <span key={langIdx} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              {lang}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Approach/Metodologia Section (Chi Siamo) */}
      {content.approach && (
        <section className="py-20 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-2 bg-teal-100 text-teal-700 rounded-full text-sm font-semibold mb-4">
                Metodologia
              </span>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">{content.approach.title}</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">{content.approach.subtitle}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {content.approach.steps?.map((step: any, index: number) => {
                const IconComponent = iconMap[step.icon] || CheckCircle;
                const colors: Record<string, { bg: string; text: string; icon: string }> = {
                  blue: { bg: 'bg-blue-500', text: 'text-blue-600', icon: 'from-blue-500 to-blue-600' },
                  green: { bg: 'bg-emerald-500', text: 'text-emerald-600', icon: 'from-emerald-500 to-teal-600' },
                  purple: { bg: 'bg-purple-500', text: 'text-purple-600', icon: 'from-purple-500 to-indigo-600' },
                  orange: { bg: 'bg-orange-500', text: 'text-orange-600', icon: 'from-orange-500 to-amber-600' }
                };
                const color = colors[step.color] || colors.blue;
                return (
                  <div key={index} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all group relative overflow-hidden">
                    {/* Step number background */}
                    <div className="absolute -top-4 -right-4 text-8xl font-black text-gray-100 select-none">
                      {step.number}
                    </div>
                    <div className="relative z-10">
                      <div className={`w-14 h-14 bg-gradient-to-br ${color.icon} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                        <IconComponent className="w-7 h-7 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                      <p className="text-gray-600">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Numbers/Stats Section (Chi Siamo) - Elegant Navy */}
      {content.numbers && (
        <section className="py-20 bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white relative overflow-hidden">
          {/* Subtle decorative elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
          </div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">{content.numbers.title}</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
              {content.numbers.items?.map((item: any, index: number) => {
                const IconComponent = iconMap[item.icon] || Star;
                const colors = ['from-blue-500/20 to-blue-600/20', 'from-teal-500/20 to-teal-600/20', 'from-emerald-500/20 to-emerald-600/20', 'from-cyan-500/20 to-cyan-600/20'];
                return (
                  <div key={index} className="text-center group">
                    <div className={`w-20 h-20 bg-gradient-to-br ${colors[index % colors.length]} backdrop-blur border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-all`}>
                      <IconComponent className="w-10 h-10 text-white" />
                    </div>
                    <div className="text-4xl lg:text-5xl font-black mb-2 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">{item.value}</div>
                    <div className="text-gray-400 font-medium">{item.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Contact Info Section (Contatti Page) */}
      {content.contactInfo && (
        <section className="py-20 bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/30">
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

            {/* Contact Cards Grid - Matching site style */}
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
                          <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full mb-1">
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
                          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full mb-1">
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
      )}

      {/* Google Maps Section - Moved up */}
      {content.map && content.map.showMap && content.contactInfo?.address && (
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
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2801.045!2d11.8772!3d45.4061!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x477eda5a22b7c9ad%3A0x7e5f8c5e8c5e8c5e!2sVia%20Lanari%2C%2014%2C%2035129%20Padova%20PD%2C%20Italy!5e0!3m2!1sen!2sit!4v1700220000000!5m2!1sen!2sit"
                  width="100%"
                  height="450"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Mappa Google - Element Formazione - Via Lanari 14, Padova"
                  className="w-full"
                />
              </div>

              {/* Map Info Cards - Matching site style */}
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
      )}

      {/* Contact Form Section - Using Real ContactForm Component */}
      {content.contactForm && (
        <section className="py-20 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 relative overflow-hidden">
          {/* Decorative bubbles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 right-10 w-64 h-64 bg-blue-200/20 rounded-full blur-3xl" />
            <div className="absolute bottom-20 left-10 w-48 h-48 bg-indigo-200/20 rounded-full blur-3xl" />
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
      )}

      {/* Service Includes Section (RSPP/Medicina Page) */}
      {content.serviceIncludes && (
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
      )}

      {/* Why Work With Us Section (Careers Page) */}
      {content.whyWorkWithUs && (
        <section className="py-20 bg-gradient-to-br from-white via-rose-50/30 to-pink-50/40">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-12 text-center">
              {content.whyWorkWithUs.title || 'Perché Lavorare con Noi'}
            </h2>
            {content.whyWorkWithUs.description && (
              <p className="text-xl text-gray-600 text-center max-w-3xl mx-auto mb-12">
                {content.whyWorkWithUs.description}
              </p>
            )}
            {content.whyWorkWithUs.benefits && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {content.whyWorkWithUs.benefits.map((benefit: any, index: number) => (
                  <div key={index} className="bg-gray-50 rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
                    <div className="text-4xl mb-4">
                      {benefit.icon || '✨'}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                    <p className="text-gray-600 text-sm">{benefit.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Open Positions Section (Careers Page) */}
      {content.openPositions && Array.isArray(content.openPositions) && content.openPositions.length > 0 && (
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-12 text-center">
              Posizioni Aperte
            </h2>
            <div className="max-w-4xl mx-auto space-y-6">
              {content.openPositions.map((position: any, index: number) => (
                <div key={index} className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2 md:mb-0">
                      {position.title}
                    </h3>
                    <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-primary-100 text-primary-800 self-start md:self-center">
                      {position.location}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-4">{position.description}</p>
                  {position.requirements && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Requisiti:</h4>
                      <ul className="space-y-1">
                        {position.requirements.map((req: string, reqIndex: number) => (
                          <li key={reqIndex} className="flex items-start text-gray-700 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <PublicButton variant="primary" size="sm" to="/contatti">
                    Candidati
                  </PublicButton>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Application Process Section (Careers Page) */}
      {content.applicationProcess && (
        <section className="py-20 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold mb-4">Processo</span>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.applicationProcess.title}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
              {content.applicationProcess.steps?.map((step: any, index: number) => {
                const colors = ['bg-blue-600', 'bg-purple-600', 'bg-teal-600', 'bg-green-600'];
                return (
                  <div key={index} className="relative">
                    <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
                      <div className={`w-12 h-12 ${colors[index % colors.length]} rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg`}>
                        {step.number}
                      </div>
                      <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                      <p className="text-sm text-gray-600">{step.description}</p>
                    </div>
                    {index < content.applicationProcess.steps.length - 1 && (
                      <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gray-300" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Our Process Section (Homepage) - Improved with varied colors */}
      {content.ourProcess && (
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
                  const stepColors = [
                    { bg: 'bg-blue-600', light: 'bg-blue-100', text: 'text-blue-600' },
                    { bg: 'bg-purple-600', light: 'bg-purple-100', text: 'text-purple-600' },
                    { bg: 'bg-teal-600', light: 'bg-teal-100', text: 'text-teal-600' },
                    { bg: 'bg-green-600', light: 'bg-green-100', text: 'text-green-600' }
                  ];
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
      )}

      {/* Company Numbers Section (Homepage) - Improved gradient */}
      {content.companyNumbers && (
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
      )}

      {/* Certifications Section (Homepage) - Improved */}
      {content.certifications && (
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
                  const certColors = [
                    { bg: 'bg-blue-600', light: 'bg-blue-50', border: 'border-blue-200' },
                    { bg: 'bg-green-600', light: 'bg-green-50', border: 'border-green-200' },
                    { bg: 'bg-purple-600', light: 'bg-purple-50', border: 'border-purple-200' },
                    { bg: 'bg-teal-600', light: 'bg-teal-50', border: 'border-teal-200' }
                  ];
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
      )}

      {/* Specialties Overview Section (Element Medica Homepage) */}
      {content.specialtiesOverview?.items && (
        <section className="py-20 bg-gradient-to-br from-white via-teal-50/30 to-cyan-50/40">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-2 bg-teal-100 text-teal-700 rounded-full text-sm font-semibold mb-4">
                <Stethoscope className="w-4 h-4 inline mr-2" />
                Specialità Mediche
              </span>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.specialtiesOverview.sectionTitle}
              </h2>
              {content.specialtiesOverview.sectionSubtitle && (
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  {content.specialtiesOverview.sectionSubtitle}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {content.specialtiesOverview.items.map((item: any, index: number) => {
                const IconComponent = iconMap[item.icon] || Stethoscope;
                const colorMap: Record<string, { bg: string; iconBg: string; text: string }> = {
                  red: { bg: 'bg-red-50', iconBg: 'bg-red-500', text: 'text-red-700' },
                  purple: { bg: 'bg-purple-50', iconBg: 'bg-purple-500', text: 'text-purple-700' },
                  blue: { bg: 'bg-blue-50', iconBg: 'bg-blue-500', text: 'text-blue-700' },
                  green: { bg: 'bg-green-50', iconBg: 'bg-green-500', text: 'text-green-700' },
                  orange: { bg: 'bg-orange-50', iconBg: 'bg-orange-500', text: 'text-orange-700' },
                  pink: { bg: 'bg-pink-50', iconBg: 'bg-pink-500', text: 'text-pink-700' },
                  teal: { bg: 'bg-teal-50', iconBg: 'bg-teal-500', text: 'text-teal-700' },
                  indigo: { bg: 'bg-indigo-50', iconBg: 'bg-indigo-500', text: 'text-indigo-700' }
                };
                const colors = colorMap[item.color] || colorMap.teal;
                return (
                  <div key={index} className={`${colors.bg} rounded-2xl p-6 text-center hover:shadow-lg transition-all group cursor-pointer`}>
                    <div className={`w-14 h-14 ${colors.iconBg} rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-md`}>
                      <IconComponent className="w-7 h-7 text-white" />
                    </div>
                    <h3 className={`font-semibold ${colors.text}`}>{item.name}</h3>
                  </div>
                );
              })}
            </div>
            {content.specialtiesOverview.ctaText && (
              <div className="text-center mt-10">
                <button
                  onClick={() => navigate(content.specialtiesOverview.ctaHref || '/visite-specialistiche')}
                  className="inline-flex items-center px-6 py-3 bg-teal-600 text-white rounded-full font-semibold hover:bg-teal-700 transition-colors"
                >
                  {content.specialtiesOverview.ctaText}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Emergency Contact Section (Element Medica) */}
      {content.emergency && (
        <section className="py-12 bg-gradient-to-r from-teal-600 to-cyan-600">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <h3 className="text-2xl font-bold text-white mb-2">{content.emergency.title}</h3>
                <p className="text-teal-100">{content.emergency.subtitle}</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-6">
                {content.emergency.phone && (
                  <a href={`tel:${content.emergency.phone.replace(/\s/g, '')}`} className="flex items-center gap-2 text-white hover:text-teal-200 transition-colors">
                    <Phone className="w-5 h-5" />
                    <span className="font-semibold">{content.emergency.phone}</span>
                  </a>
                )}
                {content.emergency.email && (
                  <a href={`mailto:${content.emergency.email}`} className="flex items-center gap-2 text-white hover:text-teal-200 transition-colors">
                    <Mail className="w-5 h-5" />
                    <span>{content.emergency.email}</span>
                  </a>
                )}
                {content.emergency.hours && (
                  <span className="flex items-center gap-2 text-teal-100">
                    <Clock className="w-5 h-5" />
                    {content.emergency.hours}
                  </span>
                )}
              </div>
              {content.emergency.ctaText && (
                <button
                  onClick={() => navigate(content.emergency.ctaHref || '/prenota')}
                  className="px-6 py-3 bg-white text-teal-600 rounded-full font-semibold hover:bg-teal-50 transition-colors flex items-center gap-2"
                >
                  {content.emergency.ctaText}
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Macrosettori ATECO Section (RSPP) */}
      {content.macrosettori && (
        <section className="py-20 bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.macrosettori.title}
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                {content.macrosettori.description}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {content.macrosettori.sectors?.map((sector: any, index: number) => (
                <div key={index} className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-primary-600 text-white font-bold rounded-lg text-sm">{sector.code}</span>
                    <h3 className="font-semibold text-gray-900">{sector.name}</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">ATECO: {sector.ateco}</p>
                  <p className="text-sm text-gray-600 mb-3">{sector.examples}</p>
                  <div className="bg-orange-50 rounded-lg p-3 mb-3">
                    <p className="text-xs text-orange-700"><strong>Rischi specifici:</strong> {sector.specificRisks}</p>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{sector.companies} aziende servite</span>
                    <span>{sector.duration}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Course Categories Section (Corsi Page) */}
      {content.courseCategories && (
        <section className="py-20 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/40">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-4">Catalogo Corsi</span>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.courseCategories.sectionTitle}
              </h2>
              {content.courseCategories.description && (
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  {content.courseCategories.description}
                </p>
              )}
            </div>
            <div className="space-y-12">
              {content.courseCategories.categories?.map((category: any, catIndex: number) => {
                const IconComponent = iconMap[category.icon] || BookOpen;
                const colorSchemes: Record<string, { bg: string; border: string; iconBg: string; light: string }> = {
                  blue: { bg: 'bg-blue-600', border: 'border-blue-500', iconBg: 'bg-blue-100', light: 'bg-blue-50' },
                  purple: { bg: 'bg-purple-600', border: 'border-purple-500', iconBg: 'bg-purple-100', light: 'bg-purple-50' },
                  indigo: { bg: 'bg-indigo-600', border: 'border-indigo-500', iconBg: 'bg-indigo-100', light: 'bg-indigo-50' },
                  teal: { bg: 'bg-teal-600', border: 'border-teal-500', iconBg: 'bg-teal-100', light: 'bg-teal-50' },
                  green: { bg: 'bg-green-600', border: 'border-green-500', iconBg: 'bg-green-100', light: 'bg-green-50' },
                  red: { bg: 'bg-red-600', border: 'border-red-500', iconBg: 'bg-red-100', light: 'bg-red-50' },
                  orange: { bg: 'bg-orange-600', border: 'border-orange-500', iconBg: 'bg-orange-100', light: 'bg-orange-50' },
                  yellow: { bg: 'bg-yellow-600', border: 'border-yellow-500', iconBg: 'bg-yellow-100', light: 'bg-yellow-50' }
                };
                const colors = colorSchemes[category.color] || colorSchemes.blue;
                return (
                  <div key={catIndex} className={`${colors.light} rounded-3xl p-8 border-l-4 ${colors.border}`}>
                    <div className="flex items-center gap-4 mb-6">
                      <div className={`w-14 h-14 ${colors.bg} rounded-2xl flex items-center justify-center shadow-lg`}>
                        <IconComponent className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">{category.title}</h3>
                        <p className="text-gray-600">{category.description}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {category.courses?.map((course: any, courseIndex: number) => (
                        <div key={courseIndex} className="bg-white rounded-xl p-5 shadow-sm hover:shadow-lg transition-all">
                          <h4 className="font-semibold text-gray-900 mb-3">{course.name}</h4>
                          <div className="flex flex-wrap gap-2 mb-3">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {course.duration}
                            </span>
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                              <RefreshCw className="w-3 h-3" /> {course.validity}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-gray-900">{course.price}</span>
                            <span className="text-xs text-gray-500">{course.mode}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Delivery Modes Section (Corsi Page) */}
      {content.deliveryModes && (
        <section className="py-20 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-4">Modalità</span>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.deliveryModes.sectionTitle}
              </h2>
              {content.deliveryModes.description && (
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  {content.deliveryModes.description}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {content.deliveryModes.modes?.map((mode: any, index: number) => {
                const IconComponent = iconMap[mode.icon] || Monitor;
                const colorSchemes: Record<string, { bg: string; light: string; border: string }> = {
                  blue: { bg: 'bg-blue-600', light: 'bg-blue-50', border: 'border-blue-200' },
                  indigo: { bg: 'bg-indigo-600', light: 'bg-indigo-50', border: 'border-indigo-200' },
                  teal: { bg: 'bg-teal-600', light: 'bg-teal-50', border: 'border-teal-200' }
                };
                const colors = colorSchemes[mode.color] || colorSchemes.blue;
                return (
                  <div key={index} className={`bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all relative ${mode.recommended ? 'ring-2 ring-green-400' : ''}`}>
                    {mode.recommended && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                        Più Richiesto
                      </span>
                    )}
                    <div className={`w-16 h-16 ${colors.bg} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{mode.title}</h3>
                    <p className="text-gray-600 mb-6">{mode.description}</p>
                    {mode.features && (
                      <ul className="space-y-3">
                        {mode.features.map((feature: string, featureIndex: number) => (
                          <li key={featureIndex} className="flex items-center text-sm text-gray-700">
                            <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Calendario Corsi Pubblici - Elegante sezione calendario */}
      {(slug === 'corsi' || slug === 'homepage') && (
        <section className="py-20 bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-10 left-10 w-32 h-32 bg-blue-400/10 rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-20 w-48 h-48 bg-indigo-400/10 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-cyan-400/10 rounded-full blur-2xl" />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 text-cyan-300 rounded-full text-sm font-semibold mb-4">
                <Calendar className="w-4 h-4 inline mr-2" />
                Prossime Date
              </span>
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                Calendario Corsi in Programmazione
              </h2>
              <p className="text-xl text-blue-200 max-w-3xl mx-auto">
                Consulta le prossime date dei nostri corsi e prenota il tuo posto. Formazione di qualità con attestati validi a norma di legge.
              </p>
            </div>

            {/* Course Calendar Component */}
            <CourseCalendarSection tenantId={getCurrentBrand().backend.tenantId} />
          </div>
        </section>
      )}

      {/* Training Courses Section (RSPP) */}
      {content.trainingCourses && (
        <section className="py-20 bg-gradient-to-br from-white via-purple-50/30 to-violet-50/40">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.trainingCourses.title}
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                {content.trainingCourses.description}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
              {content.trainingCourses.courses?.map((course: any, index: number) => (
                <div key={index} className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold text-gray-900 text-lg">{course.title}</h3>
                    <span className="text-primary-600 font-bold">{course.price}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">{course.duration}</span>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">{course.validity}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{course.audience}</p>
                  {course.topics && (
                    <ul className="space-y-1">
                      {course.topics.slice(0, 4).map((topic: string, topicIndex: number) => (
                        <li key={topicIndex} className="flex items-center text-xs text-gray-600">
                          <CheckCircle className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                          {topic}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Case Studies Section */}
      {content.caseStudies && (
        <section className="py-20 bg-gradient-to-br from-primary-50 to-primary-100">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.caseStudies.title}
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                {content.caseStudies.description}
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {content.caseStudies.cases?.map((caseStudy: any, index: number) => (
                <div key={index} className="bg-white rounded-2xl shadow-xl overflow-hidden">
                  <div className="bg-primary-600 text-white p-6">
                    <h3 className="font-bold text-lg mb-2">{caseStudy.company}</h3>
                    <span className="text-primary-200 text-sm">{caseStudy.sector}</span>
                  </div>
                  <div className="p-6">
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-900 text-sm mb-2">Sfida</h4>
                      <p className="text-sm text-gray-600">{caseStudy.challenge}</p>
                    </div>
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-900 text-sm mb-2">Soluzione</h4>
                      <p className="text-sm text-gray-600">{caseStudy.solution}</p>
                    </div>
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-900 text-sm mb-2">Risultati</h4>
                      <ul className="space-y-1">
                        {caseStudy.results?.slice(0, 4).map((result: string, resultIndex: number) => (
                          <li key={resultIndex} className="flex items-start text-xs text-gray-600">
                            <CheckCircle className="w-3 h-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                            {result}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {caseStudy.investment && (
                      <div className="border-t pt-4 mt-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Investimento:</span>
                          <span className="font-semibold text-gray-900">{caseStudy.investment}</span>
                        </div>
                        {caseStudy.roi && (
                          <div className="flex justify-between text-sm mt-1">
                            <span className="text-gray-600">ROI:</span>
                            <span className="font-semibold text-green-600">{caseStudy.roi}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Workflow Process Section (RSPP) */}
      {content.workflowProcess && (
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.workflowProcess.title}
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                {content.workflowProcess.description}
              </p>
            </div>
            <div className="max-w-5xl mx-auto">
              {content.workflowProcess.steps?.map((step: any, index: number) => {
                const IconComponent = iconMap[step.icon] || CheckCircle;
                return (
                  <div key={index} className="flex gap-6 mb-8">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                        {step.number}
                      </div>
                    </div>
                    <div className="flex-grow bg-white rounded-xl p-6 shadow-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <IconComponent className="w-6 h-6 text-primary-600" />
                        <h3 className="font-semibold text-gray-900 text-lg">{step.title}</h3>
                        {step.duration && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full ml-auto">
                            {step.duration}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 mb-3">{step.description}</p>
                      {step.deliverables && (
                        <div className="flex flex-wrap gap-2">
                          {step.deliverables.map((deliverable: string, delIndex: number) => (
                            <span key={delIndex} className="px-3 py-1 bg-green-50 text-green-700 text-xs rounded-full">
                              ✓ {deliverable}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Pricing Section */}
      {content.pricing && (
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
      )}

      {/* Normativa Section (Medicina del Lavoro) */}
      {content.normativa && (
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.normativa.sectionTitle || content.normativa.title || 'Riferimenti Normativi'}
              </h2>
              {content.normativa.description && (
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">{content.normativa.description}</p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {content.normativa.articles?.map((article: any, index: number) => (
                <div key={index} className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="inline-block px-3 py-1 bg-primary-100 text-primary-700 font-bold rounded-lg text-sm mb-3">
                    {article.code}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{article.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{article.description}</p>
                  {article.details && (
                    <p className="text-xs text-gray-500 border-t pt-3">{article.details}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* When Required Section (Medicina del Lavoro) */}
      {content.whenRequired && (
        <section className="py-20 bg-gradient-to-br from-amber-50/50 via-yellow-50/40 to-orange-50/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.whenRequired.sectionTitle}
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                {content.whenRequired.description}
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {content.whenRequired.risks?.map((risk: any, index: number) => {
                const IconComponent = iconMap[risk.icon] || AlertCircle;
                return (
                  <div key={index} className="bg-gray-50 rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
                    <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <IconComponent className="w-7 h-7 text-orange-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{risk.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{risk.description}</p>
                    <span className="text-xs text-orange-600 font-medium">{risk.threshold}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Medical Exam Section (Medicina del Lavoro) */}
      {content.medicalExam && (
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.medicalExam.sectionTitle}
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                {content.medicalExam.description}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 max-w-6xl mx-auto">
              {content.medicalExam.judgments?.map((judgment: any, index: number) => {
                const IconComponent = iconMap[judgment.icon] || CheckCircle;
                const bgColors: Record<string, string> = {
                  green: 'bg-green-100 border-green-500',
                  yellow: 'bg-yellow-100 border-yellow-500',
                  orange: 'bg-orange-100 border-orange-500',
                  red: 'bg-red-100 border-red-500',
                  gray: 'bg-gray-100 border-gray-500'
                };
                const textColors: Record<string, string> = {
                  green: 'text-green-700',
                  yellow: 'text-yellow-700',
                  orange: 'text-orange-700',
                  red: 'text-red-700',
                  gray: 'text-gray-700'
                };
                return (
                  <div key={index} className={`rounded-xl p-4 border-t-4 ${bgColors[judgment.color] || 'bg-gray-100 border-gray-500'}`}>
                    <IconComponent className={`w-8 h-8 ${textColors[judgment.color] || 'text-gray-700'} mb-2`} />
                    <h3 className={`font-semibold text-sm mb-1 ${textColors[judgment.color] || 'text-gray-700'}`}>
                      {judgment.type}
                    </h3>
                    <p className="text-xs text-gray-600">{judgment.description}</p>
                  </div>
                );
              })}
            </div>
            {content.medicalExam.note && (
              <p className="text-center text-sm text-gray-500 mt-6 max-w-2xl mx-auto">
                {content.medicalExam.note}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Advantages Section (Medicina del Lavoro) */}
      {content.advantages && (
        <section className="py-20 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/40">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.advantages.sectionTitle}
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 max-w-6xl mx-auto">
              {content.advantages.items?.map((item: any, index: number) => {
                const IconComponent = iconMap[item.icon] || CheckCircle;
                return (
                  <div key={index} className="text-center">
                    <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <IconComponent className="w-7 h-7 text-primary-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">{item.title}</h3>
                    <p className="text-xs text-gray-600">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Process Section (Medicina del Lavoro) */}
      {content.process && (
        <section className="py-20 bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.process.sectionTitle}
              </h2>
            </div>
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {content.process.steps?.map((step: any, index: number) => {
                  const IconComponent = iconMap[step.icon] || CheckCircle;
                  return (
                    <div key={index} className="relative text-center">
                      <div className="bg-white rounded-xl p-4 shadow-lg">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-md">
                          <IconComponent className="w-7 h-7 text-white" />
                        </div>
                        <h3 className="font-semibold text-gray-900 text-sm mb-1">{step.title}</h3>
                        <p className="text-xs text-gray-600">{step.description}</p>
                        {step.duration && (
                          <span className="text-xs text-primary-600 mt-2 inline-block">{step.duration}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Testimonials Section (standalone - shown when not inside whyChooseUs or as separate section) */}
      {content.testimonials && Array.isArray(content.testimonials) && content.testimonials.length > 0 && (
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
      )}

      {/* FAQ Section (Homepage) */}
      {content.faq && (
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
      )}

      {/* CTA Section - Final Call to Action - Elegant Navy */}
      {content.cta && (
        <section className="py-20 bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white relative overflow-hidden">
          {/* Decorative background - subtle elegant pattern */}
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
      )}

      {/* Specialties Section (Visite Specialistiche - Element Medica) */}
      {content.specialties?.categories && (
        <section className="py-20 bg-gradient-to-br from-gray-50 via-white to-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.specialties.sectionTitle || content.specialties.title}
              </h2>
              {(content.specialties.sectionSubtitle || content.specialties.subtitle) && (
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  {content.specialties.sectionSubtitle || content.specialties.subtitle}
                </p>
              )}
            </div>
            <div className="space-y-12">
              {content.specialties.categories.map((category: any, catIndex: number) => {
                const IconComponent = iconMap[category.icon] || Stethoscope;
                const colors: Record<string, { bg: string; border: string; iconBg: string }> = {
                  red: { bg: 'from-red-50 to-white', border: 'border-red-400', iconBg: 'bg-red-500' },
                  rose: { bg: 'from-rose-50 to-white', border: 'border-rose-400', iconBg: 'bg-rose-500' },
                  amber: { bg: 'from-amber-50 to-white', border: 'border-amber-400', iconBg: 'bg-amber-500' },
                  orange: { bg: 'from-orange-50 to-white', border: 'border-orange-400', iconBg: 'bg-orange-500' },
                  blue: { bg: 'from-blue-50 to-white', border: 'border-blue-400', iconBg: 'bg-blue-500' },
                  purple: { bg: 'from-purple-50 to-white', border: 'border-purple-400', iconBg: 'bg-purple-500' },
                  teal: { bg: 'from-teal-50 to-white', border: 'border-teal-400', iconBg: 'bg-teal-500' },
                  green: { bg: 'from-green-50 to-white', border: 'border-green-400', iconBg: 'bg-green-500' }
                };
                const colorSet = colors[category.color] || colors.teal;
                return (
                  <div key={catIndex} className={`bg-gradient-to-br ${colorSet.bg} rounded-2xl p-8 border-l-4 ${colorSet.border}`}>
                    <div className="flex items-center gap-4 mb-6">
                      <div className={`w-14 h-14 ${colorSet.iconBg} rounded-xl flex items-center justify-center`}>
                        <IconComponent className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">{category.title || category.name}</h3>
                        <p className="text-gray-600">{category.description}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(category.specialists || category.specialties)?.map((spec: any, specIndex: number) => (
                        <div key={specIndex} className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                          <h4 className="font-semibold text-gray-900 mb-2">{spec.name}</h4>
                          <p className="text-sm text-gray-600 mb-3">{spec.description}</p>
                          {spec.doctor && <p className="text-sm text-gray-500">{spec.doctor}</p>}
                          {spec.price && <p className="text-sm font-medium text-teal-600 mt-2">{spec.price}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Check-Up Packages Section (Visite Specialistiche) */}
      {content.checkupPackages?.packages && (
        <section className="py-20 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/40">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.checkupPackages.sectionTitle || content.checkupPackages.title}
              </h2>
              {(content.checkupPackages.sectionSubtitle || content.checkupPackages.subtitle) && (
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  {content.checkupPackages.sectionSubtitle || content.checkupPackages.subtitle}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {content.checkupPackages.packages.map((pkg: any, index: number) => {
                const colors: Record<string, { bg: string; border: string; badge: string }> = {
                  teal: { bg: 'bg-teal-50', border: 'border-teal-200', badge: 'bg-teal-500' },
                  rose: { bg: 'bg-rose-50', border: 'border-rose-200', badge: 'bg-rose-500' },
                  pink: { bg: 'bg-pink-50', border: 'border-pink-200', badge: 'bg-pink-500' },
                  cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', badge: 'bg-cyan-500' }
                };
                const colorSet = colors[pkg.color] || colors.teal;
                return (
                  <div key={index} className={`${pkg.highlighted ? 'ring-2 ring-rose-400 scale-105' : ''} ${colorSet.bg} ${colorSet.border} border-2 rounded-2xl p-6 relative`}>
                    {pkg.highlighted && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-rose-500 text-white text-sm font-semibold rounded-full">
                        Più Richiesto
                      </span>
                    )}
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
                    <p className="text-gray-600 text-sm mb-4">{pkg.description}</p>
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-gray-900">{pkg.price}</span>
                      {pkg.originalPrice && (
                        <span className="text-sm text-gray-400 line-through ml-2">{pkg.originalPrice}</span>
                      )}
                    </div>
                    <ul className="space-y-2 mb-6">
                      {pkg.includes?.map((item: string, itemIndex: number) => (
                        <li key={itemIndex} className="flex items-start gap-2 text-sm text-gray-600">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <button className={`w-full py-3 ${colorSet.badge} text-white font-semibold rounded-lg hover:opacity-90 transition-opacity`}>
                      Prenota
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Exam Categories Section (Diagnostica) */}
      {content.examCategories?.categories && (
        <section className="py-20 bg-gradient-to-br from-gray-50 via-white to-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.examCategories.title}
              </h2>
              {content.examCategories.subtitle && (
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  {content.examCategories.subtitle}
                </p>
              )}
            </div>
            <div className="space-y-8">
              {content.examCategories.categories.map((category: any, catIndex: number) => {
                const IconComponent = iconMap[category.icon] || Activity;
                const colors: Record<string, { bg: string; iconBg: string; border: string }> = {
                  teal: { bg: 'from-teal-50', iconBg: 'bg-teal-500', border: 'border-teal-400' },
                  rose: { bg: 'from-rose-50', iconBg: 'bg-rose-500', border: 'border-rose-400' },
                  blue: { bg: 'from-blue-50', iconBg: 'bg-blue-500', border: 'border-blue-400' },
                  cyan: { bg: 'from-cyan-50', iconBg: 'bg-cyan-500', border: 'border-cyan-400' },
                  emerald: { bg: 'from-emerald-50', iconBg: 'bg-emerald-500', border: 'border-emerald-400' }
                };
                const colorSet = colors[category.color] || colors.teal;
                return (
                  <div key={catIndex} className={`bg-gradient-to-br ${colorSet.bg} to-white rounded-2xl p-8 border-l-4 ${colorSet.border}`}>
                    <div className="flex items-center gap-4 mb-6">
                      <div className={`w-14 h-14 ${colorSet.iconBg} rounded-xl flex items-center justify-center`}>
                        <IconComponent className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">{category.name}</h3>
                        <p className="text-gray-600">{category.description}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {category.exams?.map((exam: any, examIndex: number) => (
                        <div key={examIndex} className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                          <h4 className="font-semibold text-gray-900 mb-2">{exam.name}</h4>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-teal-600 font-medium">{exam.price}</span>
                            {exam.duration && <span className="text-gray-500">{exam.duration}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Technology Section (Diagnostica) */}
      {content.technology?.equipment && (
        <section className="py-20 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.technology.title}
              </h2>
              {content.technology.subtitle && (
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  {content.technology.subtitle}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {content.technology.equipment.map((item: any, index: number) => {
                const IconComponent = iconMap[item.icon] || Activity;
                return (
                  <div key={index} className="bg-gradient-to-br from-cyan-50 to-teal-50 rounded-2xl p-6 text-center hover:shadow-lg transition-shadow">
                    <div className="w-16 h-16 bg-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">{item.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                    {item.brand && (
                      <span className="text-xs text-cyan-600 font-medium">{item.brand}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Exams Offered Section (Medicina del Lavoro - Medica) */}
      {content.examsOffered?.categories && (
        <section className="py-20 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.examsOffered.title}
              </h2>
              {content.examsOffered.subtitle && (
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  {content.examsOffered.subtitle}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {content.examsOffered.categories.map((category: any, index: number) => {
                const IconComponent = iconMap[category.icon] || Activity;
                return (
                  <div key={index} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                    <div className="w-14 h-14 bg-teal-500 rounded-xl flex items-center justify-center mb-4">
                      <IconComponent className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-4">{category.name}</h3>
                    <ul className="space-y-2">
                      {category.items?.map((item: string, itemIndex: number) => (
                        <li key={itemIndex} className="flex items-center gap-2 text-sm text-gray-600">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Risk Types Section (Medicina del Lavoro - Medica) */}
      {content.riskTypes?.items && (
        <section className="py-20 bg-gradient-to-br from-amber-50/50 via-orange-50/40 to-yellow-50/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.riskTypes.title}
              </h2>
              {content.riskTypes.subtitle && (
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  {content.riskTypes.subtitle}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {content.riskTypes.items.map((risk: any, index: number) => {
                const IconComponent = iconMap[risk.icon] || AlertTriangle;
                return (
                  <div key={index} className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border-l-4 border-amber-400 hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-bold text-gray-900">{risk.title}</h3>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">{risk.description}</p>
                    {risk.exams && (
                      <div className="flex flex-wrap gap-2">
                        {risk.exams.map((exam: string, examIndex: number) => (
                          <span key={examIndex} className="px-3 py-1 bg-white rounded-full text-xs text-amber-700 font-medium">
                            {exam}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Booking Categories Section (Prenota Online) */}
      {content.bookingCategories?.categories && (
        <section className="py-20 bg-gradient-to-br from-gray-50 via-white to-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.bookingCategories.title}
              </h2>
              {content.bookingCategories.subtitle && (
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  {content.bookingCategories.subtitle}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {content.bookingCategories.categories.map((category: any, index: number) => {
                const IconComponent = iconMap[category.icon] || Calendar;
                const colors: Record<string, { bg: string; iconBg: string; border: string }> = {
                  teal: { bg: 'from-teal-50 to-white', iconBg: 'bg-teal-500', border: 'border-teal-200' },
                  cyan: { bg: 'from-cyan-50 to-white', iconBg: 'bg-cyan-500', border: 'border-cyan-200' },
                  emerald: { bg: 'from-emerald-50 to-white', iconBg: 'bg-emerald-500', border: 'border-emerald-200' },
                  purple: { bg: 'from-purple-50 to-white', iconBg: 'bg-purple-500', border: 'border-purple-200' }
                };
                const colorSet = colors[category.color] || colors.teal;
                return (
                  <div
                    key={index}
                    onClick={() => category.href && navigate(category.href)}
                    className={`bg-gradient-to-br ${colorSet.bg} rounded-2xl p-6 border ${colorSet.border} cursor-pointer hover:shadow-xl transition-all transform hover:-translate-y-1`}
                  >
                    <div className={`w-14 h-14 ${colorSet.iconBg} rounded-xl flex items-center justify-center mb-4`}>
                      <IconComponent className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{category.title}</h3>
                    <p className="text-gray-600 text-sm mb-4">{category.description}</p>
                    {category.popular && (
                      <div className="flex flex-wrap gap-2">
                        {category.popular.map((item: string, itemIndex: number) => (
                          <span key={itemIndex} className="px-2 py-1 bg-white rounded-full text-xs text-gray-600">
                            {item}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Popular Bookings Section (Prenota Online) */}
      {content.popularBookings?.items && (
        <section className="py-20 bg-gradient-to-br from-white via-teal-50/30 to-cyan-50/40">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.popularBookings.title}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {content.popularBookings.items.map((booking: any, index: number) => {
                const IconComponent = iconMap[booking.icon] || Calendar;
                const colors: Record<string, { iconBg: string; badge: string }> = {
                  rose: { iconBg: 'bg-rose-500', badge: 'bg-rose-100 text-rose-700' },
                  teal: { iconBg: 'bg-teal-500', badge: 'bg-teal-100 text-teal-700' },
                  amber: { iconBg: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700' },
                  red: { iconBg: 'bg-red-500', badge: 'bg-red-100 text-red-700' },
                  orange: { iconBg: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700' },
                  purple: { iconBg: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700' }
                };
                const colorSet = colors[booking.color] || colors.teal;
                return (
                  <div key={index} className="bg-gray-50 rounded-2xl p-6 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 ${colorSet.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{booking.name}</h3>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${colorSet.badge} mb-2`}>
                          {booking.category}
                        </span>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-gray-900">{booking.price}</span>
                          <span className="text-xs text-green-600">{booking.availability}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Booking Steps Section (Prenota Online) */}
      {content.bookingSteps?.steps && (
        <section className="py-20 bg-gradient-to-br from-teal-50 via-cyan-50 to-emerald-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.bookingSteps.title}
              </h2>
              {content.bookingSteps.subtitle && (
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  {content.bookingSteps.subtitle}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {content.bookingSteps.steps.map((step: any, index: number) => {
                const IconComponent = iconMap[step.icon] || CheckCircle;
                return (
                  <div key={index} className="text-center">
                    <div className="relative inline-block mb-6">
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
                        <IconComponent className="w-10 h-10 text-teal-600" />
                      </div>
                      <span className="absolute -top-2 -right-2 w-8 h-8 bg-teal-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {step.number}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Departments Section (Contatti - Medica) */}
      {content.departments?.items && (
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
                      <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center">
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-bold text-gray-900">{dept.name}</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                      {dept.phone && (
                        <a href={`tel:${dept.phone}`} className="flex items-center gap-2 text-gray-600 hover:text-teal-600">
                          <Phone className="w-4 h-4" />
                          {dept.phone}
                        </a>
                      )}
                      {dept.email && (
                        <a href={`mailto:${dept.email}`} className="flex items-center gap-2 text-gray-600 hover:text-teal-600">
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
      )}

      {/* Opening Hours Section (Contatti - Medica) */}
      {content.openingHours?.schedule && (
        <section className="py-20 bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.openingHours.title}
              </h2>
            </div>
            <div className="max-w-2xl mx-auto">
              <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-8">
                <div className="space-y-4 mb-8">
                  {content.openingHours.schedule.map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between py-3 border-b border-teal-100 last:border-0">
                      <span className="font-semibold text-gray-900">{item.days}</span>
                      <div className="text-right">
                        <span className={`font-medium ${item.hours === 'Chiuso' ? 'text-red-500' : 'text-teal-600'}`}>
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
                          <IconComponent className="w-4 h-4 text-teal-500" />
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
      )}

      {/* Location Section (Contatti - Medica) */}
      {content.location?.address && (
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
                    <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center">
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
                          <Car className="w-5 h-5 text-teal-500 flex-shrink-0 mt-1" />
                          <div>
                            <span className="font-medium text-gray-900">Auto</span>
                            <p className="text-sm text-gray-600">{content.location.directions.car}</p>
                          </div>
                        </div>
                      )}
                      {content.location.directions.metro && (
                        <div className="flex items-start gap-3">
                          <Activity className="w-5 h-5 text-teal-500 flex-shrink-0 mt-1" />
                          <div>
                            <span className="font-medium text-gray-900">Metro</span>
                            <p className="text-sm text-gray-600">{content.location.directions.metro}</p>
                          </div>
                        </div>
                      )}
                      {content.location.directions.bus && (
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-teal-500 flex-shrink-0 mt-1" />
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
      )}

      {/* Guarantees Section (Prenota Online) */}
      {content.guarantees?.items && (
        <section className="py-20 bg-gradient-to-br from-emerald-50/40 via-green-50/30 to-teal-50/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.guarantees.title}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {content.guarantees.items.map((item: any, index: number) => {
                const IconComponent = iconMap[item.icon] || Shield;
                return (
                  <div key={index} className="text-center p-6">
                    <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <IconComponent className="w-8 h-8 text-teal-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Packages Section (Diagnostica) */}
      {content.packages?.items && (
        <section className="py-20 bg-gradient-to-br from-gray-50 via-white to-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.packages.title}
              </h2>
              {content.packages.subtitle && (
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  {content.packages.subtitle}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {content.packages.items.map((pkg: any, index: number) => {
                const colors: Record<string, { bg: string; border: string; badge: string }> = {
                  teal: { bg: 'bg-teal-50', border: 'border-teal-200', badge: 'bg-teal-500' },
                  rose: { bg: 'bg-rose-50', border: 'border-rose-200', badge: 'bg-rose-500' },
                  pink: { bg: 'bg-pink-50', border: 'border-pink-200', badge: 'bg-pink-500' }
                };
                const colorSet = colors[pkg.color] || colors.teal;
                return (
                  <div key={index} className={`${pkg.highlighted ? 'ring-2 ring-rose-400 scale-105' : ''} ${colorSet.bg} ${colorSet.border} border-2 rounded-2xl p-8 relative`}>
                    {pkg.highlighted && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-rose-500 text-white text-sm font-semibold rounded-full">
                        Consigliato
                      </span>
                    )}
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
                    <p className="text-gray-600 mb-4">{pkg.description}</p>
                    <div className="mb-6">
                      <span className="text-4xl font-bold text-gray-900">{pkg.price}</span>
                      {pkg.originalPrice && (
                        <div className="inline-block ml-3">
                          <span className="text-lg text-gray-400 line-through">{pkg.originalPrice}</span>
                          {pkg.saving && (
                            <span className="ml-2 text-sm text-green-600 font-medium">-{pkg.saving}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <ul className="space-y-3 mb-8">
                      {pkg.includes?.map((item: string, itemIndex: number) => (
                        <li key={itemIndex} className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{item}</span>
                        </li>
                      ))}
                    </ul>
                    <button className={`w-full py-4 ${colorSet.badge} text-white font-bold rounded-xl hover:opacity-90 transition-opacity`}>
                      Prenota Ora
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Alternative Booking Section (Prenota Online) */}
      {content.alternativeBooking && (
        <section className="py-16 bg-teal-600 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold mb-4">{content.alternativeBooking.title}</h2>
            <p className="text-teal-100 mb-6">{content.alternativeBooking.description}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {content.alternativeBooking.phone && (
                <a
                  href={`tel:${content.alternativeBooking.phone.number}`}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-teal-700 font-bold rounded-xl hover:bg-teal-50 transition-colors"
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
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-colors"
                >
                  <MessageSquare className="w-5 h-5" />
                  {content.alternativeBooking.whatsapp.text}
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Quality Assurance Section (Diagnostica) */}
      {content.qualityAssurance?.features && (
        <section className="py-20 bg-gradient-to-br from-cyan-50 via-teal-50 to-emerald-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.qualityAssurance.title}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {content.qualityAssurance.features.map((feature: any, index: number) => {
                const IconComponent = iconMap[feature.icon] || Shield;
                return (
                  <div key={index} className="bg-white rounded-2xl p-6 text-center shadow-lg hover:shadow-xl transition-shadow">
                    <div className="w-14 h-14 bg-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <IconComponent className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Important Info Section (Prenota Online) */}
      {content.importantInfo?.items && (
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.importantInfo.title}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {content.importantInfo.items.map((item: any, index: number) => {
                const IconComponent = iconMap[item.icon] || Clock;
                return (
                  <div key={index} className="bg-white rounded-2xl p-6 shadow-lg">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
                      <IconComponent className="w-6 h-6 text-amber-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-600">{item.content}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Result Delivery Section (Diagnostica) */}
      {content.resultDelivery?.methods && (
        <section className="py-20 bg-gradient-to-br from-white via-cyan-50/30 to-blue-50/40">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {content.resultDelivery.title}
              </h2>
              {content.resultDelivery.subtitle && (
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  {content.resultDelivery.subtitle}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {content.resultDelivery.methods.map((method: any, index: number) => {
                const IconComponent = iconMap[method.icon] || Mail;
                return (
                  <div key={index} className="bg-gradient-to-br from-cyan-50 to-teal-50 rounded-2xl p-6 text-center">
                    <div className="w-14 h-14 bg-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <IconComponent className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">{method.method}</h3>
                    <p className="text-sm text-gray-600 mb-2">{method.description}</p>
                    <span className="text-cyan-600 font-medium text-sm">{method.timing}</span>
                    {method.extra && (
                      <span className="block text-xs text-amber-600 mt-1">{method.extra}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Social Media Section (Contatti) */}
      {content.socialMedia?.platforms && (
        <section className="py-16 bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-900 text-white">
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
      )}
    </>
  );
};

export { CustomContentRenderer };
export default CustomContentRenderer;
