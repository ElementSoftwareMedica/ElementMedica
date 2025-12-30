/**
 * Specialty Sections
 * 
 * CMS sections for medical specialties, diagnostics, technology, checkup packages
 * 
 * @module components/cms/renderer/custom-content-renderer/SpecialtySections
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { iconMap, ArrowRight, CheckCircle, Stethoscope, Heart, Activity, Clock, Calendar, Award, Shield } from '../iconMap';
import { PublicButton } from '../../../public/PublicButton';
import { specialtyColors, checkupColors, examCategoryColors, categoryColors, packageColors } from './types';

/**
 * Specialties Section (Poliambulatorio)
 */
export const SpecialtiesSection: React.FC<{ content: any }> = ({ content }) => {
  const navigate = useNavigate();
  
  if (!content.specialties) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-white via-teal-50/30 to-cyan-50/40 relative overflow-hidden">
      {/* Decorative bubbles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-64 h-64 bg-teal-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-56 h-56 bg-cyan-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-emerald-200/20 rounded-full blur-3xl" />
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-teal-100 text-teal-700 rounded-full text-sm font-semibold mb-4">
            {content.specialties.badge || 'Le Nostre Specialità'}
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.specialties.sectionTitle || content.specialties.title || 'Specialità Mediche'}
          </h2>
          {(content.specialties.sectionSubtitle || content.specialties.description) && (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {content.specialties.sectionSubtitle || content.specialties.description}
            </p>
          )}
        </div>
        {content.specialties.items && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {content.specialties.items.map((specialty: any, index: number) => {
              const IconComponent = iconMap[specialty.icon] || Stethoscope;
              const colors = specialtyColors[index % specialtyColors.length];
              return (
                <div
                  key={index}
                  className={`group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border ${colors.border} hover:border-transparent cursor-pointer`}
                  onClick={() => specialty.href && navigate(specialty.href)}
                >
                  <div className={`${colors.light} p-8 relative overflow-hidden`}>
                    {/* Decorative circle */}
                    <div className={`absolute -top-10 -right-10 w-32 h-32 ${colors.bg} opacity-20 rounded-full`} />
                    <div className={`w-16 h-16 ${colors.bg} rounded-2xl flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform relative z-10`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-teal-700 transition-colors">{specialty.name}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{specialty.description}</p>
                  </div>
                  <div className="p-6 bg-white">
                    {specialty.doctors && (
                      <div className="flex items-center text-sm text-gray-500 mb-3">
                        <Stethoscope className="w-4 h-4 mr-2 text-teal-500" />
                        {specialty.doctors.length} specialisti
                      </div>
                    )}
                    {specialty.exams && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {specialty.exams.slice(0, 3).map((exam: string, i: number) => (
                          <span key={i} className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            {exam}
                          </span>
                        ))}
                        {specialty.exams.length > 3 && (
                          <span className="px-3 py-1 bg-teal-100 text-teal-700 text-xs rounded-full font-medium">
                            +{specialty.exams.length - 3} altri
                          </span>
                        )}
                      </div>
                    )}
                    {specialty.href && (
                      <div className="flex items-center text-teal-600 font-semibold text-sm group-hover:text-teal-700 transition-colors">
                        Scopri di più
                        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {content.specialties.cta && (
          <div className="text-center mt-12">
            <PublicButton variant="primary" size="lg" to={content.specialties.cta.href || '/prenota-visita'}>
              {content.specialties.cta.text || 'Prenota una Visita'}
            </PublicButton>
          </div>
        )}
      </div>
    </section>
  );
};

/**
 * Checkup Packages Section (Poliambulatorio)
 */
export const CheckupPackagesSection: React.FC<{ content: any }> = ({ content }) => {
  const navigate = useNavigate();

  if (!content.checkupPackages) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-20 w-48 h-48 bg-blue-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-20 w-64 h-64 bg-indigo-200/30 rounded-full blur-3xl" />
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold mb-4">
            {content.checkupPackages.badge || 'Check-up Completi'}
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.checkupPackages.sectionTitle || content.checkupPackages.title || 'Pacchetti Check-up'}
          </h2>
          {(content.checkupPackages.sectionSubtitle || content.checkupPackages.description) && (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {content.checkupPackages.sectionSubtitle || content.checkupPackages.description}
            </p>
          )}
        </div>
        {content.checkupPackages.items && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {content.checkupPackages.items.map((pkg: any, index: number) => {
              const IconComponent = iconMap[pkg.icon] || Heart;
              const colors = checkupColors[index % checkupColors.length];
              const isHighlighted = pkg.highlighted || pkg.popular;
              return (
                <div
                  key={index}
                  className={`group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border-2 ${isHighlighted ? 'border-indigo-500 ring-4 ring-indigo-100' : colors.border} relative`}
                >
                  {isHighlighted && (
                    <div className="absolute -top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <span className="px-4 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-full shadow-lg">
                        {pkg.highlightLabel || 'PIÙ POPOLARE'}
                      </span>
                    </div>
                  )}
                  <div className={`${colors.light} p-8 relative overflow-hidden`}>
                    <div className={`absolute -top-10 -right-10 w-32 h-32 ${colors.bg} opacity-20 rounded-full`} />
                    <div className={`w-16 h-16 ${colors.bg} rounded-2xl flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform relative z-10`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">{pkg.description}</p>
                    {pkg.price && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-gray-900">{pkg.price}</span>
                        {pkg.originalPrice && (
                          <span className="text-lg text-gray-400 line-through">{pkg.originalPrice}</span>
                        )}
                      </div>
                    )}
                    {pkg.duration && (
                      <div className="flex items-center text-sm text-gray-500 mt-2">
                        <Clock className="w-4 h-4 mr-1" />
                        {pkg.duration}
                      </div>
                    )}
                  </div>
                  <div className="p-6 bg-white">
                    {pkg.includes && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Include:</h4>
                        <ul className="space-y-2">
                          {pkg.includes.slice(0, 5).map((item: string, i: number) => (
                            <li key={i} className="flex items-start text-sm text-gray-600">
                              <CheckCircle className={`w-4 h-4 mr-2 mt-0.5 flex-shrink-0 ${colors.text}`} />
                              {item}
                            </li>
                          ))}
                          {pkg.includes.length > 5 && (
                            <li className={`text-sm font-medium ${colors.text}`}>
                              +{pkg.includes.length - 5} altri esami
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                    <button
                      onClick={() => navigate(pkg.href || '/prenota-visita')}
                      className={`w-full py-3 rounded-xl font-semibold transition-all ${isHighlighted
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg'
                        : `${colors.bg} text-white hover:opacity-90`
                        }`}
                    >
                      Prenota Ora
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {content.checkupPackages.note && (
          <div className="text-center mt-8">
            <p className="text-sm text-gray-500 italic">{content.checkupPackages.note}</p>
          </div>
        )}
      </div>
    </section>
  );
};

/**
 * Exam Categories Section (Poliambulatorio)
 */
export const ExamCategoriesSection: React.FC<{ content: any }> = ({ content }) => {
  const navigate = useNavigate();

  if (!content.examCategories) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/40 relative overflow-hidden">
      {/* Decorative bubbles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-emerald-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-20 w-56 h-56 bg-teal-200/30 rounded-full blur-3xl" />
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold mb-4">
            {content.examCategories.badge || 'Esami e Analisi'}
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.examCategories.sectionTitle || content.examCategories.title || 'Categorie Esami'}
          </h2>
          {(content.examCategories.sectionSubtitle || content.examCategories.description) && (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {content.examCategories.sectionSubtitle || content.examCategories.description}
            </p>
          )}
        </div>
        {content.examCategories.items && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {content.examCategories.items.map((category: any, index: number) => {
              const IconComponent = iconMap[category.icon] || Activity;
              const colors = examCategoryColors[index % examCategoryColors.length];
              return (
                <div
                  key={index}
                  className={`group bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer border ${colors.border} hover:border-transparent`}
                  onClick={() => category.href && navigate(category.href)}
                >
                  <div className={`w-14 h-14 ${colors.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                    <IconComponent className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-emerald-700 transition-colors">{category.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                  {category.count && (
                    <div className={`text-sm font-semibold ${colors.text}`}>
                      {category.count} esami disponibili
                    </div>
                  )}
                  {category.items && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex flex-wrap gap-1">
                        {category.items.slice(0, 3).map((item: string, i: number) => (
                          <span key={i} className="text-xs text-gray-500">
                            {item}{i < 2 && i < category.items.length - 1 ? ',' : ''}
                          </span>
                        ))}
                        {category.items.length > 3 && (
                          <span className={`text-xs font-medium ${colors.text}`}>+{category.items.length - 3}</span>
                        )}
                      </div>
                    </div>
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
 * Technology Section (Poliambulatorio)
 */
export const TechnologySection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.technology) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900 text-white relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-blue-500/20 backdrop-blur border border-blue-400/30 rounded-full text-sm font-semibold mb-4">
            {content.technology.badge || 'Tecnologia Avanzata'}
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold mb-4 bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent">
            {content.technology.sectionTitle || content.technology.title || 'Apparecchiature all\'Avanguardia'}
          </h2>
          {(content.technology.sectionSubtitle || content.technology.description) && (
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              {content.technology.sectionSubtitle || content.technology.description}
            </p>
          )}
        </div>
        {content.technology.items && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {content.technology.items.map((tech: any, index: number) => {
              const IconComponent = iconMap[tech.icon] || Award;
              return (
                <div key={index} className="group bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/25">
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{tech.name}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-4">{tech.description}</p>
                  {tech.features && (
                    <ul className="space-y-2">
                      {tech.features.map((feature: string, i: number) => (
                        <li key={i} className="flex items-center text-sm text-gray-300">
                          <CheckCircle className="w-4 h-4 text-cyan-400 mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {content.technology.stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto mt-16 pt-16 border-t border-white/10">
            {content.technology.stats.map((stat: any, index: number) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

/**
 * Diagnostics Categories Section (Poliambulatorio homepage)
 */
export const DiagnosticsCategoriesSection: React.FC<{ content: any }> = ({ content }) => {
  const navigate = useNavigate();

  if (!content.categories) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-white via-teal-50/30 to-cyan-50/40 relative overflow-hidden">
      {/* Decorative bubbles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-64 h-64 bg-teal-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-56 h-56 bg-cyan-200/30 rounded-full blur-3xl" />
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-teal-100 text-teal-700 rounded-full text-sm font-semibold mb-4">
            {content.categories.badge || 'I Nostri Servizi'}
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.categories.sectionTitle || content.categories.title || 'Categorie Diagnostiche'}
          </h2>
          {(content.categories.sectionSubtitle || content.categories.description) && (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {content.categories.sectionSubtitle || content.categories.description}
            </p>
          )}
        </div>
        {content.categories.items && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {content.categories.items.map((category: any, index: number) => {
              const IconComponent = iconMap[category.icon] || Stethoscope;
              const colors = categoryColors[index % categoryColors.length];
              return (
                <div
                  key={index}
                  className={`group bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer border ${colors.border} hover:border-transparent`}
                  onClick={() => category.href && navigate(category.href)}
                >
                  <div className={`w-14 h-14 ${colors.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                    <IconComponent className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-teal-700 transition-colors">{category.name}</h3>
                  <p className="text-sm text-gray-600">{category.description}</p>
                  {category.items && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-1">
                      {category.items.slice(0, 3).map((item: string, i: number) => (
                        <div key={i} className="flex items-center text-sm text-gray-500">
                          <CheckCircle className="w-3 h-3 text-teal-500 mr-2" />
                          {item}
                        </div>
                      ))}
                      {category.items.length > 3 && (
                        <div className="text-sm font-medium text-teal-600">
                          +{category.items.length - 3} altri servizi
                        </div>
                      )}
                    </div>
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
 * Packages Section (Generic packages display)
 */
export const PackagesSection: React.FC<{ content: any }> = ({ content }) => {
  const navigate = useNavigate();

  if (!content.packages) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-4">
            {content.packages.badge || 'I Nostri Pacchetti'}
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.packages.sectionTitle || content.packages.title || 'Pacchetti Disponibili'}
          </h2>
          {(content.packages.sectionSubtitle || content.packages.description) && (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {content.packages.sectionSubtitle || content.packages.description}
            </p>
          )}
        </div>
        {content.packages.items && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {content.packages.items.map((pkg: any, index: number) => {
              const IconComponent = iconMap[pkg.icon] || Shield;
              const colors = packageColors[index % packageColors.length];
              return (
                <div
                  key={index}
                  className={`bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all ${pkg.featured ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className={`${colors.light} p-8`}>
                    <div className={`w-16 h-16 ${colors.bg} rounded-2xl flex items-center justify-center mb-4 shadow-lg`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
                    <p className="text-gray-600 text-sm">{pkg.description}</p>
                    {pkg.price && (
                      <div className="mt-4">
                        <span className="text-3xl font-bold text-gray-900">{pkg.price}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    {pkg.features && (
                      <ul className="space-y-3 mb-6">
                        {pkg.features.map((feature: string, i: number) => (
                          <li key={i} className="flex items-start text-sm text-gray-700">
                            <CheckCircle className={`w-4 h-4 mr-2 mt-0.5 flex-shrink-0 ${colors.text}`} />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    )}
                    <PublicButton
                      variant={pkg.featured ? 'primary' : 'outline'}
                      size="lg"
                      className="w-full"
                      to={pkg.href || '/contatti'}
                    >
                      {pkg.ctaText || 'Scopri di più'}
                    </PublicButton>
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
