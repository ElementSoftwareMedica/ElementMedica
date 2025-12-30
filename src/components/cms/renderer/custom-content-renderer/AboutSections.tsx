/**
 * About/Company Sections
 * 
 * CMS sections for company info, mission, team, history
 * 
 * @module components/cms/renderer/custom-content-renderer/AboutSections
 */

import React from 'react';
import { iconMap, CheckCircle, Users, GraduationCap, Star } from '../iconMap';
import { bgColorMap, missionColors, storiaColors, approachColors } from './types';

/**
 * What Is RSPP Section
 */
export const WhatIsRSPPSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.whatIsRSPP) return null;

  return (
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
  );
};

/**
 * RSPP Comparison Section
 */
export const RSPPComparisonSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.rsppComparison) return null;

  return (
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
  );
};

/**
 * Mission Section (Chi Siamo)
 */
export const MissionSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.mission) return null;

  return (
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
              const color = missionColors[index % missionColors.length];
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
};

/**
 * Storia/Timeline Section (Chi Siamo)
 */
export const StoriaSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.storia) return null;

  return (
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
              const gradient = storiaColors[item.color] || storiaColors.blue;
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
  );
};

/**
 * Team Section (Chi Siamo)
 */
export const TeamSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.team) return null;

  return (
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
  );
};

/**
 * Approach/Metodologia Section (Chi Siamo)
 */
export const ApproachSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.approach) return null;

  return (
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
            const color = approachColors[step.color] || approachColors.blue;
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
  );
};

/**
 * Numbers/Stats Section (Chi Siamo) - Elegant Navy
 */
export const NumbersSection: React.FC<{ content: any }> = ({ content }) => {
  if (!content.numbers) return null;

  const colors = ['from-blue-500/20 to-blue-600/20', 'from-teal-500/20 to-teal-600/20', 'from-emerald-500/20 to-emerald-600/20', 'from-cyan-500/20 to-cyan-600/20'];

  return (
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
  );
};
