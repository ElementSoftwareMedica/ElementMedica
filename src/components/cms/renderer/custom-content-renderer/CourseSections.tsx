/**
 * Course Sections
 * 
 * CMS sections for training courses, course categories, delivery modes, calendar
 * 
 * @module components/cms/renderer/custom-content-renderer/CourseSections
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { iconMap, CheckCircle, ArrowRight, BookOpen, Users, Clock, Calendar, Award, MapPin, Monitor, Play, FileText } from '../iconMap';
import { PublicButton } from '../../../public/PublicButton';
import { courseCategoryColors, deliveryModeColors } from './types';

/**
 * Course Categories Section (Formazione homepage)
 */
export const CourseCategoriesSection: React.FC<{ content: any }> = ({ content }) => {
  const navigate = useNavigate();

  if (!content.courseCategories) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-white via-amber-50/30 to-orange-50/40 relative overflow-hidden">
      {/* Decorative bubbles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-64 h-64 bg-amber-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-56 h-56 bg-orange-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-yellow-200/20 rounded-full blur-3xl" />
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold mb-4">
            {content.courseCategories.badge || 'Aree Formative'}
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.courseCategories.sectionTitle || content.courseCategories.title || 'Categorie Corsi'}
          </h2>
          {(content.courseCategories.sectionSubtitle || content.courseCategories.description) && (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {content.courseCategories.sectionSubtitle || content.courseCategories.description}
            </p>
          )}
        </div>
        {content.courseCategories.items && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {content.courseCategories.items.map((category: any, index: number) => {
              const IconComponent = iconMap[category.icon] || BookOpen;
              const colors = courseCategoryColors[index % courseCategoryColors.length];
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
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-amber-700 transition-colors">{category.name}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{category.description}</p>
                  </div>
                  <div className="p-6 bg-white">
                    {category.courseCount && (
                      <div className="flex items-center text-sm text-gray-500 mb-3">
                        <BookOpen className="w-4 h-4 mr-2 text-amber-500" />
                        {category.courseCount} corsi disponibili
                      </div>
                    )}
                    {category.courses && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {category.courses.slice(0, 3).map((course: string, i: number) => (
                          <span key={i} className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            {course}
                          </span>
                        ))}
                        {category.courses.length > 3 && (
                          <span className={`px-3 py-1 ${colors.badgeBg} ${colors.text} text-xs rounded-full font-medium`}>
                            +{category.courses.length - 3} altri
                          </span>
                        )}
                      </div>
                    )}
                    {category.href && (
                      <div className="flex items-center text-amber-600 font-semibold text-sm group-hover:text-amber-700 transition-colors">
                        Vedi tutti i corsi
                        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {content.courseCategories.cta && (
          <div className="text-center mt-12">
            <PublicButton variant="primary" size="lg" to={content.courseCategories.cta.href || '/catalogo-corsi'}>
              {content.courseCategories.cta.text || 'Catalogo Completo'}
            </PublicButton>
          </div>
        )}
      </div>
    </section>
  );
};

/**
 * Delivery Modes Section (Formazione homepage)
 */
export const DeliveryModesSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.deliveryModes) return null;

  const modeIcons: Record<string, any> = {
    aula: Users,
    elearning: Monitor,
    blended: Play,
    online: Monitor,
    videoconferenza: Play,
  };

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
            {content.deliveryModes.badge || 'Modalità di Erogazione'}
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.deliveryModes.sectionTitle || content.deliveryModes.title || 'Come Formiamo'}
          </h2>
          {(content.deliveryModes.sectionSubtitle || content.deliveryModes.description) && (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {content.deliveryModes.sectionSubtitle || content.deliveryModes.description}
            </p>
          )}
        </div>
        {content.deliveryModes.items && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {content.deliveryModes.items.map((mode: any, index: number) => {
              const IconComponent = iconMap[mode.icon] || modeIcons[mode.type?.toLowerCase()] || Monitor;
              const colors = deliveryModeColors[index % deliveryModeColors.length];
              return (
                <div
                  key={index}
                  className={`group bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all text-center border ${colors.border} hover:border-transparent`}
                >
                  <div className={`w-16 h-16 ${colors.bg} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{mode.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{mode.description}</p>
                  {mode.features && (
                    <ul className="space-y-2 text-left">
                      {mode.features.map((feature: string, i: number) => (
                        <li key={i} className="flex items-start text-sm text-gray-600">
                          <CheckCircle className={`w-4 h-4 mr-2 mt-0.5 flex-shrink-0 ${colors.text}`} />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}
                  {mode.badge && (
                    <div className={`inline-block px-3 py-1 ${colors.badgeBg} ${colors.text} text-xs font-semibold rounded-full mt-4`}>
                      {mode.badge}
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
 * Training Courses Section (Featured courses grid)
 */
export const TrainingCoursesSection: React.FC<{ content: any }> = ({ content }) => {
  const navigate = useNavigate();

  if (!content.trainingCourses) return null;

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
            {content.trainingCourses.badge || 'Corsi in Evidenza'}
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.trainingCourses.sectionTitle || content.trainingCourses.title || 'I Nostri Corsi'}
          </h2>
          {(content.trainingCourses.sectionSubtitle || content.trainingCourses.description) && (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {content.trainingCourses.sectionSubtitle || content.trainingCourses.description}
            </p>
          )}
        </div>
        {content.trainingCourses.items && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {content.trainingCourses.items.map((course: any, index: number) => {
              const IconComponent = iconMap[course.icon] || BookOpen;
              return (
                <div
                  key={index}
                  className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all cursor-pointer"
                  onClick={() => course.href && navigate(course.href)}
                >
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full" />
                    <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <IconComponent className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">{course.name}</h3>
                    {course.code && (
                      <span className="text-xs text-white/70 font-mono">{course.code}</span>
                    )}
                  </div>
                  <div className="p-6">
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{course.description}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {course.duration && (
                        <span className="flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          <Clock className="w-3 h-3 mr-1" />
                          {course.duration}
                        </span>
                      )}
                      {course.mode && (
                        <span className="flex items-center px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                          <Monitor className="w-3 h-3 mr-1" />
                          {course.mode}
                        </span>
                      )}
                      {course.certification && (
                        <span className="flex items-center px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                          <Award className="w-3 h-3 mr-1" />
                          Certificato
                        </span>
                      )}
                    </div>
                    {course.price && (
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-gray-900">{course.price}</span>
                        <ArrowRight className="w-5 h-5 text-emerald-600 group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {content.trainingCourses.cta && (
          <div className="text-center mt-12">
            <PublicButton variant="primary" size="lg" to={content.trainingCourses.cta.href || '/catalogo-corsi'}>
              {content.trainingCourses.cta.text || 'Vedi Tutti i Corsi'}
            </PublicButton>
          </div>
        )}
      </div>
    </section>
  );
};

/**
 * Course Calendar Section (Upcoming sessions)
 */
export const CourseCalendarSection: React.FC<{ content: any }> = ({ content }) => {
  const navigate = useNavigate();

  if (!content.courseCalendar) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/30 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 right-10 w-64 h-64 bg-purple-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-56 h-56 bg-indigo-200/30 rounded-full blur-3xl" />
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold mb-4">
            {content.courseCalendar.badge || 'Calendario Corsi'}
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.courseCalendar.sectionTitle || content.courseCalendar.title || 'Prossime Sessioni'}
          </h2>
          {(content.courseCalendar.sectionSubtitle || content.courseCalendar.description) && (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {content.courseCalendar.sectionSubtitle || content.courseCalendar.description}
            </p>
          )}
        </div>
        {content.courseCalendar.sessions && (
          <div className="max-w-4xl mx-auto space-y-4">
            {content.courseCalendar.sessions.map((session: any, index: number) => (
              <div
                key={index}
                className="group bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all flex flex-col md:flex-row items-start md:items-center gap-6 cursor-pointer"
                onClick={() => session.href && navigate(session.href)}
              >
                <div className="flex-shrink-0 w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg">
                  <span className="text-2xl font-bold">{session.day || new Date(session.date).getDate()}</span>
                  <span className="text-xs uppercase">{session.month || new Date(session.date).toLocaleDateString('it-IT', { month: 'short' })}</span>
                </div>
                <div className="flex-grow">
                  <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-purple-700 transition-colors">{session.title}</h3>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    {session.time && (
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {session.time}
                      </span>
                    )}
                    {session.location && (
                      <span className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {session.location}
                      </span>
                    )}
                    {session.mode && (
                      <span className="flex items-center">
                        <Monitor className="w-4 h-4 mr-1" />
                        {session.mode}
                      </span>
                    )}
                    {session.spotsLeft !== undefined && (
                      <span className={`flex items-center ${session.spotsLeft < 5 ? 'text-red-500' : 'text-green-500'}`}>
                        <Users className="w-4 h-4 mr-1" />
                        {session.spotsLeft} posti rimasti
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {session.price && (
                    <span className="text-lg font-bold text-gray-900">{session.price}</span>
                  )}
                  <button className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-colors flex items-center gap-2">
                    Iscriviti
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {content.courseCalendar.cta && (
          <div className="text-center mt-12">
            <PublicButton variant="outline" size="lg" to={content.courseCalendar.cta.href || '/calendario-corsi'}>
              {content.courseCalendar.cta.text || 'Vedi Calendario Completo'}
            </PublicButton>
          </div>
        )}
      </div>
    </section>
  );
};

/**
 * Course Details Section (Single course page)
 */
export const CourseDetailsSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.courseDetails) return null;

  const course = content.courseDetails;

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Course header */}
          <div className="mb-12">
            {course.category && (
              <span className="inline-block px-3 py-1 bg-amber-100 text-amber-700 text-sm font-semibold rounded-full mb-4">
                {course.category}
              </span>
            )}
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">{course.title}</h1>
            {course.code && (
              <p className="text-sm text-gray-500 font-mono mb-4">Codice: {course.code}</p>
            )}
            <p className="text-xl text-gray-600">{course.description}</p>
          </div>

          {/* Course meta info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12 p-6 bg-gray-50 rounded-2xl">
            {course.duration && (
              <div className="text-center">
                <Clock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <div className="text-sm text-gray-500">Durata</div>
                <div className="font-bold text-gray-900">{course.duration}</div>
              </div>
            )}
            {course.mode && (
              <div className="text-center">
                <Monitor className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <div className="text-sm text-gray-500">Modalità</div>
                <div className="font-bold text-gray-900">{course.mode}</div>
              </div>
            )}
            {course.certification && (
              <div className="text-center">
                <Award className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <div className="text-sm text-gray-500">Certificazione</div>
                <div className="font-bold text-gray-900">{course.certification}</div>
              </div>
            )}
            {course.validity && (
              <div className="text-center">
                <Calendar className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <div className="text-sm text-gray-500">Validità</div>
                <div className="font-bold text-gray-900">{course.validity}</div>
              </div>
            )}
          </div>

          {/* Program */}
          {course.program && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Programma del Corso</h2>
              <div className="space-y-4">
                {course.program.modules?.map((module: any, index: number) => (
                  <div key={index} className="bg-gray-50 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 mb-2">{module.title}</h3>
                        <p className="text-sm text-gray-600 mb-3">{module.description}</p>
                        {module.topics && (
                          <ul className="space-y-1">
                            {module.topics.map((topic: string, i: number) => (
                              <li key={i} className="flex items-start text-sm text-gray-600">
                                <CheckCircle className="w-4 h-4 text-emerald-500 mr-2 mt-0.5 flex-shrink-0" />
                                {topic}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Target audience */}
          {course.targetAudience && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">A Chi è Rivolto</h2>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {course.targetAudience.map((target: string, index: number) => (
                  <li key={index} className="flex items-start bg-blue-50 rounded-xl p-4">
                    <Users className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{target}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Requirements */}
          {course.requirements && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Requisiti</h2>
              <ul className="space-y-3">
                {course.requirements.map((req: string, index: number) => (
                  <li key={index} className="flex items-start">
                    <FileText className="w-5 h-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Pricing and CTA */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-8 text-center">
            {course.price && (
              <div className="mb-6">
                <span className="text-sm text-gray-500">Prezzo</span>
                <div className="text-4xl font-bold text-gray-900">{course.price}</div>
                {course.vatNote && (
                  <span className="text-sm text-gray-500">{course.vatNote}</span>
                )}
              </div>
            )}
            <PublicButton variant="primary" size="lg" to={course.bookingHref || '/prenota-corso'}>
              {course.ctaText || 'Iscriviti al Corso'}
            </PublicButton>
          </div>
        </div>
      </div>
    </section>
  );
};
