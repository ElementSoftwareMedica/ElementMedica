/**
 * Careers Sections
 * 
 * CMS sections for career pages: why work with us, open positions, application process
 * 
 * @module components/cms/renderer/custom-content-renderer/CareersSections
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { iconMap, CheckCircle, ArrowRight, Users, Briefcase, Heart, Star, Award, Clock, MapPin, Banknote, GraduationCap, Target, Zap, Bell, Sparkles } from '../iconMap';
import { PublicButton } from '../../../public/PublicButton';

/**
 * Why Work With Us Section
 */
export const WhyWorkWithUsSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.whyWorkWithUs) return null;

  const benefitColors = [
    { bg: 'bg-gradient-to-br from-blue-500 to-indigo-600', light: 'bg-blue-50', text: 'text-blue-600' },
    { bg: 'bg-gradient-to-br from-emerald-500 to-teal-600', light: 'bg-emerald-50', text: 'text-emerald-600' },
    { bg: 'bg-gradient-to-br from-purple-500 to-violet-600', light: 'bg-purple-50', text: 'text-purple-600' },
    { bg: 'bg-gradient-to-br from-amber-500 to-orange-600', light: 'bg-amber-50', text: 'text-amber-600' },
    { bg: 'bg-gradient-to-br from-rose-500 to-pink-600', light: 'bg-rose-50', text: 'text-rose-600' },
    { bg: 'bg-gradient-to-br from-cyan-500 to-sky-600', light: 'bg-cyan-50', text: 'text-cyan-600' },
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/40 relative overflow-hidden">
      {/* Decorative bubbles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-64 h-64 bg-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-56 h-56 bg-purple-200/30 rounded-full blur-3xl" />
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold mb-4">
            {content.whyWorkWithUs.badge || 'Perché Lavorare con Noi'}
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.whyWorkWithUs.sectionTitle || content.whyWorkWithUs.title || 'Un Ambiente di Lavoro Eccezionale'}
          </h2>
          {(content.whyWorkWithUs.sectionSubtitle || content.whyWorkWithUs.description) && (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {content.whyWorkWithUs.sectionSubtitle || content.whyWorkWithUs.description}
            </p>
          )}
        </div>
        {content.whyWorkWithUs.benefits && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {content.whyWorkWithUs.benefits.map((benefit: any, index: number) => {
              const IconComponent = iconMap[benefit.icon] || Heart;
              const colors = benefitColors[index % benefitColors.length];
              return (
                <div
                  key={index}
                  className={`group bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border border-gray-100`}
                >
                  <div className={`w-16 h-16 ${colors.bg} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.description}</p>
                  {benefit.highlights && (
                    <ul className="mt-4 space-y-2">
                      {benefit.highlights.map((highlight: string, i: number) => (
                        <li key={i} className="flex items-center text-sm text-gray-600">
                          <CheckCircle className={`w-4 h-4 mr-2 flex-shrink-0 ${colors.text}`} />
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {/* Values */}
        {content.whyWorkWithUs.values && (
          <div className="mt-20 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">I Nostri Valori</h3>
            <div className="flex flex-wrap justify-center gap-4">
              {content.whyWorkWithUs.values.map((value: string, index: number) => (
                <span
                  key={index}
                  className="px-6 py-3 bg-white rounded-full shadow-md text-gray-700 font-medium hover:shadow-lg transition-shadow"
                >
                  {value}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

/**
 * Open Positions Section
 */
export const OpenPositionsSection: React.FC<{ content: any }> = ({ content }) => {
  const navigate = useNavigate();

  if (!content.openPositions) return null;

  const getContractBadgeColor = (type: string) => {
    const lower = type?.toLowerCase() || '';
    if (lower.includes('indeterminato')) return 'bg-emerald-100 text-emerald-700';
    if (lower.includes('determinato')) return 'bg-blue-100 text-blue-700';
    if (lower.includes('stage') || lower.includes('tirocinio')) return 'bg-amber-100 text-amber-700';
    if (lower.includes('partita') || lower.includes('freelance')) return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold mb-4">
            {content.openPositions.badge || 'Posizioni Aperte'}
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.openPositions.sectionTitle || content.openPositions.title || 'Unisciti al Nostro Team'}
          </h2>
          {(content.openPositions.sectionSubtitle || content.openPositions.description) && (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {content.openPositions.sectionSubtitle || content.openPositions.description}
            </p>
          )}
        </div>
        {content.openPositions.jobs && content.openPositions.jobs.length > 0 ? (
          <div className="max-w-4xl mx-auto space-y-6">
            {content.openPositions.jobs.map((job: any, index: number) => (
              <div
                key={index}
                className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all cursor-pointer border border-gray-100 hover:border-emerald-200"
                onClick={() => job.href && navigate(job.href)}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className="flex-grow">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">{job.title}</h3>
                      {job.isNew && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full uppercase">Nuovo</span>
                      )}
                      {job.isUrgent && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-600 text-xs font-bold rounded-full uppercase">Urgente</span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-4">{job.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      {job.department && (
                        <span className="flex items-center">
                          <Briefcase className="w-4 h-4 mr-1" />
                          {job.department}
                        </span>
                      )}
                      {job.location && (
                        <span className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {job.location}
                        </span>
                      )}
                      {job.type && (
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {job.type}
                        </span>
                      )}
                      {job.experience && (
                        <span className="flex items-center">
                          <Award className="w-4 h-4 mr-1" />
                          {job.experience}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    {job.contract && (
                      <span className={`px-4 py-1 rounded-full text-sm font-semibold ${getContractBadgeColor(job.contract)}`}>
                        {job.contract}
                    </span>
                    )}
                    {job.salary && (
                      <span className="flex items-center text-gray-600">
                        <Banknote className="w-4 h-4 mr-1" />
                        {job.salary}
                      </span>
                    )}
                    <button className="flex items-center text-emerald-600 font-semibold group-hover:text-emerald-700 transition-colors">
                      Candidati
                      <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
                {job.skills && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                    {job.skills.map((skill: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-xl mx-auto text-center bg-white rounded-2xl p-12 shadow-lg">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Briefcase className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {content.openPositions.emptyTitle || 'Nessuna Posizione Aperta'}
            </h3>
            <p className="text-gray-600 mb-6">
              {content.openPositions.emptyDescription || 'Al momento non abbiamo posizioni aperte, ma puoi inviarci una candidatura spontanea.'}
            </p>
            <PublicButton variant="primary" to={content.openPositions.spontaneousHref || '/contatti'}>
              {content.openPositions.spontaneousText || 'Candidatura Spontanea'}
            </PublicButton>
          </div>
        )}
        {content.openPositions.cta && (
          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">{content.openPositions.cta.description}</p>
            <PublicButton variant="outline" size="lg" to={content.openPositions.cta.href || '/contatti'}>
              {content.openPositions.cta.text || 'Candidatura Spontanea'}
            </PublicButton>
          </div>
        )}
      </div>
    </section>
  );
};

/**
 * Application Process Section
 */
export const ApplicationProcessSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.applicationProcess) return null;

  const processIcons = [Target, GraduationCap, Users, Sparkles];

  return (
    <section className="py-20 bg-gradient-to-br from-white via-cyan-50/30 to-teal-50/40">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-cyan-100 text-cyan-700 rounded-full text-sm font-semibold mb-4">
            {content.applicationProcess.badge || 'Processo di Selezione'}
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.applicationProcess.sectionTitle || content.applicationProcess.title || 'Come Candidarsi'}
          </h2>
          {(content.applicationProcess.sectionSubtitle || content.applicationProcess.description) && (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {content.applicationProcess.sectionSubtitle || content.applicationProcess.description}
            </p>
          )}
        </div>
        {content.applicationProcess.steps && (
          <div className="max-w-5xl mx-auto">
            <div className="relative">
              {/* Vertical line for desktop */}
              <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-200 via-teal-200 to-emerald-200 transform -translate-x-1/2" />

              <div className="space-y-12">
                {content.applicationProcess.steps.map((step: any, index: number) => {
                  const IconComponent = iconMap[step.icon] || processIcons[index % processIcons.length];
                  const isEven = index % 2 === 0;
                  return (
                    <div
                      key={index}
                      className={`relative flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-8`}
                    >
                      {/* Content */}
                      <div className={`flex-1 ${isEven ? 'md:text-right' : 'md:text-left'}`}>
                        <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all inline-block">
                          <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                          <p className="text-gray-600">{step.description}</p>
                          {step.duration && (
                            <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                              <Clock className="w-4 h-4" />
                              {step.duration}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Icon */}
                      <div className="relative z-10 flex-shrink-0">
                        <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <IconComponent className="w-8 h-8 text-white" />
                        </div>
                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-2xl font-bold text-cyan-600">
                          {index + 1}
                        </div>
                      </div>

                      {/* Spacer for alignment */}
                      <div className="flex-1 hidden md:block" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {content.applicationProcess.tips && (
          <div className="mt-16 max-w-3xl mx-auto bg-gradient-to-br from-cyan-50 to-teal-50 rounded-2xl p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6 text-center flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6 text-cyan-600" />
              Consigli per la Candidatura
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {content.applicationProcess.tips.map((tip: string, index: number) => (
                <div key={index} className="flex items-start bg-white rounded-xl p-4">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{tip}</span>
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
 * Team Culture Section
 */
export const TeamCultureSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.teamCulture) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-purple-600 via-indigo-700 to-blue-800 text-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block px-4 py-2 bg-white/20 backdrop-blur rounded-full text-sm font-semibold mb-6">
                {content.teamCulture.badge || 'La Nostra Cultura'}
              </span>
              <h2 className="text-3xl lg:text-4xl font-bold mb-6">
                {content.teamCulture.title || 'Un Team Unito'}
              </h2>
              <p className="text-lg text-white/90 mb-8">
                {content.teamCulture.description}
              </p>
              {content.teamCulture.highlights && (
                <ul className="space-y-4">
                  {content.teamCulture.highlights.map((highlight: any, index: number) => (
                    <li key={index} className="flex items-start">
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{highlight.title}</h3>
                        <p className="text-sm text-white/80">{highlight.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {content.teamCulture.stats && (
              <div className="grid grid-cols-2 gap-6">
                {content.teamCulture.stats.map((stat: any, index: number) => (
                  <div key={index} className="bg-white/10 backdrop-blur rounded-2xl p-6 text-center">
                    <div className="text-4xl font-bold mb-2">{stat.value}</div>
                    <div className="text-sm text-white/80">{stat.label}</div>
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
