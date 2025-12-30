/**
 * CustomContentRenderer
 * 
 * Main CMS content renderer that orchestrates all section components
 * Handles dynamic rendering of ~50+ different CMS section types
 * 
 * @module components/cms/renderer/custom-content-renderer
 */

import React from 'react';

// Import section components by theme
import {
  IntroductionSection,
  ServicesItemsSection,
  ServicesArraySection,
  ServiceIncludesSection
} from './IntroductionSections';

import {
  WhenRequiredSection,
  MedicalExamSection,
  ProcessStepsSection,
  AdvantagesSection,
  NormativaSection,
  RiskTypesSection,
  ExamsOfferedSection
} from './MedicalSections';

import {
  WhatIsRSPPSection,
  RSPPComparisonSection,
  MissionSection,
  StoriaSection,
  TeamSection,
  ApproachSection,
  NumbersSection
} from './AboutSections';

import {
  ContactInfoSection,
  MapSection,
  ContactFormSection,
  DepartmentsSection,
  OpeningHoursSection,
  LocationSection,
  SocialMediaSection,
  AlternativeBookingSection
} from './ContactSections';

import {
  WhyChooseUsSection,
  TestimonialsSection,
  FAQSection,
  CTASection,
  OurProcessSection,
  CompanyNumbersSection,
  CertificationsSection,
  PricingSection
} from './CommonSections';

import {
  SpecialtiesSection,
  CheckupPackagesSection,
  ExamCategoriesSection,
  TechnologySection,
  DiagnosticsCategoriesSection,
  PackagesSection
} from './SpecialtySections';

import {
  CourseCategoriesSection,
  DeliveryModesSection,
  TrainingCoursesSection,
  CourseCalendarSection,
  CourseDetailsSection
} from './CourseSections';

import {
  BookingCategoriesSection,
  PopularBookingsSection,
  BookingStepsSection,
  GuaranteesSection,
  QualityAssuranceSection,
  ResultDeliverySection,
  ImportantInfoSection,
  EmergencySection
} from './BookingSections';

import {
  WhyWorkWithUsSection,
  OpenPositionsSection,
  ApplicationProcessSection,
  TeamCultureSection
} from './CareersSections';

import {
  CaseStudiesSection,
  WorkflowProcessSection,
  MacrosettoriSection,
  PartnersSection,
  FeaturesGridSection,
  StatisticsSection,
  ResourcesSection
} from './MiscSections';

import { CMSContentProps } from './types';

/**
 * CustomContentRenderer component
 * 
 * Renders CMS content dynamically based on the content structure
 * Each section is conditionally rendered based on content presence
 */
export const CustomContentRenderer: React.FC<CMSContentProps> = ({ content }) => {
  if (!content) return null;

  return (
    <>
      {/* Introduction Sections */}
      <IntroductionSection content={content} />
      <ServicesItemsSection content={content} />
      <ServicesArraySection content={content} />
      <ServiceIncludesSection content={content} />

      {/* Medical/Safety Sections */}
      <WhenRequiredSection content={content} />
      <MedicalExamSection content={content} />
      <ProcessStepsSection content={content} />
      <AdvantagesSection content={content} />
      <NormativaSection content={content} />
      <RiskTypesSection content={content} />
      <ExamsOfferedSection content={content} />

      {/* About/Company Sections */}
      <WhatIsRSPPSection content={content} />
      <RSPPComparisonSection content={content} />
      <MissionSection content={content} />
      <StoriaSection content={content} />
      <TeamSection content={content} />
      <ApproachSection content={content} />
      <NumbersSection content={content} />

      {/* Specialty/Diagnostics Sections */}
      <SpecialtiesSection content={content} />
      <DiagnosticsCategoriesSection content={content} />
      <CheckupPackagesSection content={content} />
      <ExamCategoriesSection content={content} />
      <TechnologySection content={content} />
      <PackagesSection content={content} />

      {/* Course/Training Sections */}
      <CourseCategoriesSection content={content} />
      <DeliveryModesSection content={content} />
      <TrainingCoursesSection content={content} />
      <CourseCalendarSection content={content} />
      <CourseDetailsSection content={content} />

      {/* Booking Sections */}
      <BookingCategoriesSection content={content} />
      <PopularBookingsSection content={content} />
      <BookingStepsSection content={content} />
      <GuaranteesSection content={content} />
      <QualityAssuranceSection content={content} />
      <ResultDeliverySection content={content} />
      <ImportantInfoSection content={content} />
      <EmergencySection content={content} />

      {/* Careers Sections */}
      <WhyWorkWithUsSection content={content} />
      <OpenPositionsSection content={content} />
      <ApplicationProcessSection content={content} />
      <TeamCultureSection content={content} />

      {/* Common Sections */}
      <WhyChooseUsSection content={content} />
      <TestimonialsSection content={content} />
      <OurProcessSection content={content} />
      <CompanyNumbersSection content={content} />
      <CertificationsSection content={content} />
      <PricingSection content={content} />

      {/* Miscellaneous Sections */}
      <CaseStudiesSection content={content} />
      <WorkflowProcessSection content={content} />
      <MacrosettoriSection content={content} />
      <PartnersSection content={content} />
      <FeaturesGridSection content={content} />
      <StatisticsSection content={content} />
      <ResourcesSection content={content} />

      {/* Contact Sections */}
      <ContactInfoSection content={content} />
      <MapSection content={content} />
      <ContactFormSection content={content} />
      <DepartmentsSection content={content} />
      <OpeningHoursSection content={content} />
      <LocationSection content={content} />
      <SocialMediaSection content={content} />
      <AlternativeBookingSection content={content} />

      {/* FAQ and CTA (usually at the end) */}
      <FAQSection content={content} />
      <CTASection content={content} />
    </>
  );
};

export default CustomContentRenderer;
