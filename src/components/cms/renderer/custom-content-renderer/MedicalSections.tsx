/**
 * Medical & Risk Sections
 * 
 * CMS sections for medical exams, risks, and compliance
 * 
 * @module components/cms/renderer/custom-content-renderer/MedicalSections
 */

import React from 'react';
import { iconMap, CheckCircle, AlertCircle, AlertTriangle, Scale, Clock } from '../iconMap';
import {
  judgmentBgColors,
  judgmentTextColors,
  judgmentIconBgColors,
} from './types';

/**
 * When Required Section (Medicina del Lavoro)
 */
export const WhenRequiredSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.whenRequired) return null;

  return (
    <section className="py-20" style={{ backgroundImage: 'linear-gradient(to bottom right, var(--color-accent-50), var(--color-accent-50), var(--color-accent-50))' }}>
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
  );
};

/**
 * Medical Exam Judgments Section
 */
export const MedicalExamSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.medicalExam) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-white via-secondary-50/30 to-primary-50/40">
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
            const bgColor = judgmentBgColors[judgment.color] || 'bg-gray-100 border-gray-500';
            const textColor = judgmentTextColors[judgment.color] || 'text-gray-700';
            const iconBg = judgmentIconBgColors[judgment.color] || 'bg-gray-500';
            return (
              <div key={index} className={`${bgColor} border-2 rounded-xl p-5 text-center`}>
                <div className={`w-12 h-12 ${iconBg} rounded-full flex items-center justify-center mx-auto mb-3`}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
                <h3 className={`font-bold ${textColor} mb-2 text-sm`}>{judgment.type}</h3>
                <p className="text-xs text-gray-600">{judgment.description}</p>
              </div>
            );
          })}
        </div>
        {content.medicalExam.note && (
          <div className="max-w-3xl mx-auto bg-primary-50 border border-primary-200 rounded-xl p-4 text-center">
            <AlertCircle className="w-5 h-5 text-primary-600 mx-auto mb-2" />
            <p className="text-sm text-primary-800">{content.medicalExam.note}</p>
          </div>
        )}
      </div>
    </section>
  );
};

/**
 * Process Steps Section (Medicina del Lavoro)
 */
export const ProcessStepsSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.process?.steps) return null;

  return (
    <section className="py-20" style={{ backgroundImage: 'linear-gradient(to bottom right, var(--color-primary-50), var(--color-primary-50), var(--color-accent-50))' }}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.process.sectionTitle}
          </h2>
        </div>
        <div className="max-w-5xl mx-auto">
          <div className="relative">
            {/* Vertical line connector */}
            <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-0.5 transform -translate-x-1/2" style={{ backgroundImage: 'linear-gradient(to bottom, var(--color-primary-300), var(--color-primary-400), var(--color-secondary-500))' }} />

            {content.process.steps.map((step: any, index: number) => {
              const IconComponent = iconMap[step.icon] || CheckCircle;
              const isLeft = index % 2 === 0;
              return (
                <div key={index} className={`flex items-center gap-8 mb-12 ${isLeft ? 'lg:flex-row' : 'lg:flex-row-reverse'}`}>
                  <div className={`flex-1 ${isLeft ? 'lg:text-right' : 'lg:text-left'}`}>
                    <div className={`bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow ${isLeft ? 'lg:mr-8' : 'lg:ml-8'}`}>
                      <div className="flex items-center gap-4 mb-3">
                        <span className="px-3 py-1 bg-primary-600 text-white font-bold rounded-lg text-sm">{step.number}</span>
                        <h3 className="text-xl font-bold text-gray-900">{step.title}</h3>
                      </div>
                      <p className="text-gray-600 mb-2">{step.description}</p>
                      {step.duration && (
                        <span className="inline-flex items-center text-sm text-primary-600">
                          <Clock className="w-4 h-4 mr-1" />
                          {step.duration}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="hidden lg:flex w-16 h-16 bg-white rounded-full shadow-lg items-center justify-center z-10 border-4 border-primary-200">
                    <IconComponent className="w-8 h-8 text-primary-600" />
                  </div>
                  <div className="flex-1 hidden lg:block" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

/**
 * Advantages Section (Medicina del Lavoro)
 */
export const AdvantagesSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.advantages) return null;

  const colors = ['bg-primary-500', 'bg-primary-500', 'bg-secondary-500', 'bg-orange-500', 'bg-emerald-500', 'bg-secondary-500'];

  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 via-primary-50/30 to-accent-50/40">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.advantages.sectionTitle}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {content.advantages.items?.map((item: any, index: number) => {
            const IconComponent = iconMap[item.icon] || CheckCircle;
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
  );
};

/**
 * Normativa Section (Medicina del Lavoro)
 */
export const NormativaSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.normativa) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {content.normativa.sectionTitle || content.normativa.title || 'Riferimenti Normativi'}
          </h2>
          {content.normativa.description && (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">{content.normativa.description}</p>
          )}
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
              {article.details && (
                <p className="text-xs text-gray-500 border-t pt-3 mt-3">{article.details}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/**
 * Risk Types Section (Medicina del Lavoro - Medica)
 */
export const RiskTypesSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.riskTypes?.items) return null;

  return (
    <section className="py-20" style={{ backgroundImage: 'linear-gradient(to bottom right, color-mix(in srgb, var(--color-accent-50) 50%, transparent), color-mix(in srgb, var(--color-accent-50) 40%, transparent), color-mix(in srgb, var(--color-accent-50) 30%, transparent))' }}>
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
              <div key={index} className="rounded-2xl p-6 border-l-4 border-accent-400 hover:shadow-lg transition-shadow" style={{ backgroundImage: 'linear-gradient(to bottom right, var(--color-accent-50), var(--color-accent-50))' }}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-accent-500 rounded-xl flex items-center justify-center">
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900">{risk.title}</h3>
                </div>
                <p className="text-gray-600 text-sm mb-4">{risk.description}</p>
                {risk.exams && (
                  <div className="flex flex-wrap gap-2">
                    {risk.exams.map((exam: string, examIndex: number) => (
                      <span key={examIndex} className="px-3 py-1 bg-white rounded-full text-xs text-accent-700 font-medium">
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
  );
};

/**
 * Exams Offered Section (Medicina del Lavoro - Medica)
 */
export const ExamsOfferedSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.examsOffered?.categories) return null;

  return (
    <section className="py-20" style={{ backgroundImage: 'linear-gradient(to bottom right, var(--color-secondary-50), var(--color-primary-50), var(--color-accent-50))' }}>
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
            const IconComponent = iconMap[category.icon] || CheckCircle;
            return (
              <div key={index} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 bg-primary-500 rounded-xl flex items-center justify-center mb-4">
                  <IconComponent className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-4">{category.name}</h3>
                <ul className="space-y-2">
                  {category.items?.map((item: string, itemIndex: number) => (
                    <li key={itemIndex} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
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
  );
};
