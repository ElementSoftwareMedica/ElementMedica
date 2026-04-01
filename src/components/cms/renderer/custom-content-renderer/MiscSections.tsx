/**
 * Miscellaneous Sections
 * 
 * CMS sections for case studies, workflow, macrosettori, and other specialized sections
 * 
 * @module components/cms/renderer/custom-content-renderer/MiscSections
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { iconMap, CheckCircle, ArrowRight, Briefcase, FileText, Target, TrendingUp, Award, Users, Building2, Shield, Clock, Settings, AlertTriangle, HardHat, Microscope, FlaskConical, Cpu, Database, Wifi, Globe, Zap, Car } from '../iconMap';
import { PublicButton } from '../../../public/PublicButton';

/**
 * Case Studies Section
 */
export const CaseStudiesSection: React.FC<{ content: any }> = ({ content }) => {
  const navigate = useNavigate();

  if (!content.caseStudies) return null;

  const caseColors = [
    { style: { backgroundImage: 'linear-gradient(to bottom right, var(--color-primary-400), var(--color-primary-500))' } as React.CSSProperties, light: 'bg-primary-50' },
    { style: { backgroundImage: 'linear-gradient(to bottom right, var(--color-primary-500), var(--color-primary-600))' } as React.CSSProperties, light: 'bg-secondary-50' },
    { style: { backgroundImage: 'linear-gradient(to bottom right, var(--color-primary-600), var(--color-primary-700))' } as React.CSSProperties, light: 'bg-secondary-50' },
    { style: { backgroundImage: 'linear-gradient(to bottom right, #c084fc, #a855f7)' } as React.CSSProperties, light: 'bg-purple-50' },
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold mb-4">
            {content.caseStudies.badge || 'Case Studies'}
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.caseStudies.sectionTitle || content.caseStudies.title || 'I Nostri Successi'}
          </h2>
          {(content.caseStudies.sectionSubtitle || content.caseStudies.description) && (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {content.caseStudies.sectionSubtitle || content.caseStudies.description}
            </p>
          )}
        </div>
        {content.caseStudies.items && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {content.caseStudies.items.map((caseStudy: any, index: number) => {
              const colors = caseColors[index % caseColors.length];
              return (
                <div
                  key={index}
                  className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all cursor-pointer"
                  onClick={() => caseStudy.href && navigate(caseStudy.href)}
                >
                  <div className="p-8 text-white relative overflow-hidden" style={colors.style}>
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full" />
                    <div className="relative z-10">
                      <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur rounded-full text-sm font-medium mb-4">
                        {caseStudy.industry || caseStudy.category}
                      </span>
                      <h3 className="text-2xl font-bold mb-2">{caseStudy.title}</h3>
                      <p className="text-white/90">{caseStudy.client}</p>
                    </div>
                  </div>
                  <div className="p-8">
                    <p className="text-gray-600 mb-6">{caseStudy.challenge || caseStudy.description}</p>
                    {caseStudy.results && (
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        {caseStudy.results.map((result: any, i: number) => (
                          <div key={i} className="text-center">
                            <div className="text-2xl font-bold text-gray-900">{result.value}</div>
                            <div className="text-xs text-gray-500">{result.label}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {caseStudy.testimonial && (
                      <blockquote className="border-l-4 border-primary-500 pl-4 italic text-gray-600 mb-4">
                        "{caseStudy.testimonial.text}"
                        <div className="mt-2 text-sm font-medium text-gray-900">
                          — {caseStudy.testimonial.author}
                        </div>
                      </blockquote>
                    )}
                    <div className="flex items-center text-primary-600 font-semibold group-hover:text-primary-700 transition-colors">
                      Leggi il Case Study
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
 * Workflow Process Section
 */
export const WorkflowProcessSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.workflowProcess) return null;

  const processIcons = [Target, Settings, Settings, TrendingUp, Award];

  return (
    <section className="py-20 bg-gradient-to-br from-white via-slate-50/50 to-gray-50/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-slate-100 text-slate-700 rounded-full text-sm font-semibold mb-4">
            {content.workflowProcess.badge || 'Il Nostro Processo'}
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.workflowProcess.sectionTitle || content.workflowProcess.title || 'Come Lavoriamo'}
          </h2>
          {(content.workflowProcess.sectionSubtitle || content.workflowProcess.description) && (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {content.workflowProcess.sectionSubtitle || content.workflowProcess.description}
            </p>
          )}
        </div>
        {content.workflowProcess.steps && (
          <div className="max-w-5xl mx-auto">
            <div className="relative">
              {/* Connection line */}
              <div className="hidden lg:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-slate-200 via-primary-200 to-slate-200" />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
                {content.workflowProcess.steps.map((step: any, index: number) => {
                  const IconComponent = iconMap[step.icon] || processIcons[index % processIcons.length];
                  return (
                    <div key={index} className="relative text-center group">
                      <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all relative z-10">
                        <div className="w-14 h-14 bg-gradient-to-br from-slate-600 to-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
                          <IconComponent className="w-7 h-7 text-white" />
                        </div>
                        <div className="text-3xl font-bold text-slate-600 mb-2">{step.number || index + 1}</div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                        <p className="text-sm text-gray-600">{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {content.workflowProcess.cta && (
          <div className="text-center mt-12">
            <PublicButton variant="primary" size="lg" to={content.workflowProcess.cta.href || '/contatti'}>
              {content.workflowProcess.cta.text || 'Inizia Ora'}
            </PublicButton>
          </div>
        )}
      </div>
    </section>
  );
};

/**
 * Macrosettori Section (Sicurezza sul lavoro)
 */
export const MacrosettoriSection: React.FC<{ content: any }> = ({ content }) => {
  const navigate = useNavigate();

  if (!content.macrosettori) return null;

  const sectorIcons: Record<string, any> = {
    'industria': Building2,
    'edilizia': HardHat,
    'trasporti': Car,
    'logistica': Database,
    'chimico': FlaskConical,
    'farmaceutico': Microscope,
    'alimentare': FlaskConical,
    'metalmeccanico': Settings,
    'elettrico': Zap,
    'informatico': Cpu,
    'servizi': Briefcase,
    'commercio': Building2,
  };

  const riskColors: Record<string, { bg: string; text: string; badge: string }> = {
    'basso': { bg: 'bg-emerald-500', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
    'medio': { bg: 'bg-amber-500', text: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' },
    'alto': { bg: 'bg-red-500', text: 'text-red-600', badge: 'bg-red-100 text-red-700' },
  };

  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold mb-4">
            {content.macrosettori.badge || 'Settori ATECO'}
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.macrosettori.sectionTitle || content.macrosettori.title || 'Macrosettori di Rischio'}
          </h2>
          {(content.macrosettori.sectionSubtitle || content.macrosettori.description) && (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {content.macrosettori.sectionSubtitle || content.macrosettori.description}
            </p>
          )}
        </div>
        {content.macrosettori.items && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {content.macrosettori.items.map((sector: any, index: number) => {
              const IconComponent = iconMap[sector.icon] || sectorIcons[sector.type?.toLowerCase()] || Building2;
              const riskLevel = sector.riskLevel?.toLowerCase() || 'medio';
              const colors = riskColors[riskLevel] || riskColors.medio;
              return (
                <div
                  key={index}
                  className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all cursor-pointer"
                  onClick={() => sector.href && navigate(sector.href)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-14 h-14 ${colors.bg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}>
                        <IconComponent className="w-7 h-7 text-white" />
                      </div>
                      <span className={`px-3 py-1 ${colors.badge} text-xs font-bold rounded-full uppercase`}>
                        Rischio {sector.riskLevel || 'Medio'}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-orange-700 transition-colors">{sector.name}</h3>
                    {sector.code && (
                      <p className="text-sm text-gray-500 font-mono mb-2">Codice ATECO: {sector.code}</p>
                    )}
                    <p className="text-sm text-gray-600 mb-4">{sector.description}</p>
                    {sector.hours && (
                      <div className="flex items-center text-sm text-gray-500 mb-4">
                        <Clock className="w-4 h-4 mr-2" />
                        Formazione: {sector.hours}
                      </div>
                    )}
                    {sector.examples && (
                      <div className="border-t border-gray-100 pt-4">
                        <p className="text-xs text-gray-500 mb-2">Esempi di attività:</p>
                        <div className="flex flex-wrap gap-1">
                          {sector.examples.slice(0, 3).map((example: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                              {example}
                            </span>
                          ))}
                          {sector.examples.length > 3 && (
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded font-medium">
                              +{sector.examples.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {content.macrosettori.note && (
          <div className="mt-12 max-w-3xl mx-auto bg-amber-50 border border-amber-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Nota Importante</h4>
                <p className="text-sm text-gray-700">{content.macrosettori.note}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

/**
 * Partners Section
 */
export const PartnersSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.partners) return null;

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold mb-4">
            {content.partners.badge || 'I Nostri Partner'}
          </span>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
            {content.partners.sectionTitle || content.partners.title || 'Collaborazioni'}
          </h2>
        </div>
        {content.partners.items && (
          <div className="flex flex-wrap justify-center items-center gap-8 max-w-5xl mx-auto">
            {content.partners.items.map((partner: any, index: number) => (
              <div
                key={index}
                className="w-32 h-20 bg-gray-50 rounded-xl flex items-center justify-center grayscale hover:grayscale-0 transition-all p-4"
              >
                {partner.logo ? (
                  <img src={partner.logo} alt={partner.name} className="max-w-full max-h-full object-contain" />
                ) : (
                  <span className="text-sm font-semibold text-gray-500 text-center">{partner.name}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

/**
 * Features Grid Section (Generic feature display)
 */
export const FeaturesGridSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.featuresGrid) return null;

  const featureColors = [
    { style: { backgroundImage: 'linear-gradient(to bottom right, var(--color-primary-400), var(--color-primary-500))' } as React.CSSProperties, light: 'bg-primary-50', text: 'text-primary-600' },
    { style: { backgroundImage: 'linear-gradient(to bottom right, var(--color-primary-500), var(--color-primary-600))' } as React.CSSProperties, light: 'bg-secondary-50', text: 'text-secondary-600' },
    { style: { backgroundImage: 'linear-gradient(to bottom right, var(--color-primary-600), var(--color-primary-700))' } as React.CSSProperties, light: 'bg-secondary-50', text: 'text-secondary-600' },
    { style: { backgroundImage: 'linear-gradient(to bottom right, #c084fc, #a855f7)' } as React.CSSProperties, light: 'bg-purple-50', text: 'text-purple-600' },
    { style: { backgroundImage: 'linear-gradient(to bottom right, #34d399, #10b981)' } as React.CSSProperties, light: 'bg-emerald-50', text: 'text-emerald-600' },
    { style: { backgroundImage: 'linear-gradient(to bottom right, #38bdf8, #0ea5e9)' } as React.CSSProperties, light: 'bg-sky-50', text: 'text-sky-600' },
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-white via-gray-50/50 to-slate-50/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          {content.featuresGrid.badge && (
            <span className="inline-block px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold mb-4">
              {content.featuresGrid.badge}
            </span>
          )}
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.featuresGrid.sectionTitle || content.featuresGrid.title}
          </h2>
          {(content.featuresGrid.sectionSubtitle || content.featuresGrid.description) && (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {content.featuresGrid.sectionSubtitle || content.featuresGrid.description}
            </p>
          )}
        </div>
        {content.featuresGrid.items && (
          <div className={`grid grid-cols-1 md:grid-cols-2 ${content.featuresGrid.columns === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-8 max-w-6xl mx-auto`}>
            {content.featuresGrid.items.map((feature: any, index: number) => {
              const IconComponent = iconMap[feature.icon] || CheckCircle;
              const colors = featureColors[index % featureColors.length];
              return (
                <div key={index} className={`group ${colors.light} rounded-2xl p-8 hover:shadow-xl transition-all`}>
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg" style={colors.style}>
                    <IconComponent className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
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
 * Statistics Section (Standalone stats display)
 */
export const StatisticsSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.statistics) return null;

  return (
    <section className="py-16 text-white" style={{ backgroundImage: 'linear-gradient(135deg, var(--color-primary-800), var(--color-primary-700), var(--color-primary-600))' }}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          {content.statistics.title && (
            <h2 className="text-2xl lg:text-3xl font-bold mb-4">{content.statistics.title}</h2>
          )}
          {content.statistics.description && (
            <p className="text-lg text-white/90 max-w-2xl mx-auto">{content.statistics.description}</p>
          )}
        </div>
        {content.statistics.items && (
          <div className={`grid grid-cols-2 md:grid-cols-${Math.min(content.statistics.items.length, 4)} gap-8 max-w-5xl mx-auto`}>
            {content.statistics.items.map((stat: any, index: number) => {
              const IconComponent = iconMap[stat.icon] || TrendingUp;
              return (
                <div key={index} className="text-center group">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-white/30 transition-colors">
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-4xl lg:text-5xl font-bold mb-2">{stat.value}</div>
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
 * Resources Section (Downloads, documents)
 */
export const ResourcesSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.resources) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold mb-4">
            {content.resources.badge || 'Risorse'}
          </span>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
            {content.resources.sectionTitle || content.resources.title || 'Risorse Utili'}
          </h2>
        </div>
        {content.resources.items && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {content.resources.items.map((resource: any, index: number) => {
              const IconComponent = iconMap[resource.icon] || FileText;
              return (
                <a
                  key={index}
                  href={resource.href || resource.url}
                  target={resource.external ? '_blank' : undefined}
                  rel={resource.external ? 'noopener noreferrer' : undefined}
                  className="group bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                    <IconComponent className="w-6 h-6 text-gray-600 group-hover:text-primary-600 transition-colors" />
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">{resource.title}</h3>
                    {resource.description && (
                      <p className="text-sm text-gray-500">{resource.description}</p>
                    )}
                    {resource.fileSize && (
                      <span className="text-xs text-gray-400">{resource.fileSize}</span>
                    )}
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
                </a>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
