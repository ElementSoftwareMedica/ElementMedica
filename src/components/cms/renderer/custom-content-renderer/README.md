# CustomContentRenderer Module

## Overview

The CustomContentRenderer module handles the rendering of dynamic CMS content sections for the public-facing website. Originally a 2926-line monolithic file, it has been refactored into a modular architecture following the Hooks Composition Pattern.

## Structure

```
custom-content-renderer/
├── types.ts                    # Color schemes and interfaces
├── IntroductionSections.tsx    # Introduction, Services sections
├── MedicalSections.tsx         # Medical exam, process steps, advantages
├── AboutSections.tsx           # Mission, storia, team, approach
├── ContactSections.tsx         # Contact info, map, form, departments
├── CommonSections.tsx          # Why choose us, testimonials, FAQ, CTA
├── SpecialtySections.tsx       # Specialties, checkups, exam categories
├── CourseSections.tsx          # Course categories, delivery modes, calendar
├── BookingSections.tsx         # Booking categories, steps, guarantees
├── CareersSections.tsx         # Why work with us, positions, application
├── MiscSections.tsx            # Case studies, workflow, macrosettori, partners
├── CustomContentRenderer.tsx   # Main orchestrator component
├── index.ts                    # Central exports
└── README.md                   # This file
```

## Sections by File

### IntroductionSections.tsx
- `IntroductionSection` - Main page introduction with title, description, and features
- `ServicesItemsSection` - Services list with icons
- `ServicesArraySection` - Services grid with color schemes
- `ServiceIncludesSection` - What's included in a service

### MedicalSections.tsx
- `WhenRequiredSection` - When medical exams are required
- `MedicalExamSection` - Medical exam details with judgments
- `ProcessStepsSection` - Step-by-step process guide
- `AdvantagesSection` - Advantages/benefits grid
- `NormativaSection` - Legal/regulatory information
- `RiskTypesSection` - Risk classification types
- `ExamsOfferedSection` - List of exams offered

### AboutSections.tsx
- `WhatIsRSPPSection` - RSPP explanation section
- `RSPPComparisonSection` - Internal vs External RSPP comparison
- `MissionSection` - Company mission values
- `StoriaSection` - Company history timeline
- `TeamSection` - Team members grid
- `ApproachSection` - Our approach methodology
- `NumbersSection` - Company statistics

### ContactSections.tsx
- `ContactInfoSection` - Contact information cards
- `MapSection` - Google Maps embed
- `ContactFormSection` - Contact form
- `DepartmentsSection` - Department contacts
- `OpeningHoursSection` - Business hours
- `LocationSection` - Location details
- `SocialMediaSection` - Social media links
- `AlternativeBookingSection` - Alternative booking options

### CommonSections.tsx
- `WhyChooseUsSection` - Why choose us benefits
- `TestimonialsSection` - Customer testimonials
- `FAQSection` - Frequently asked questions
- `CTASection` - Call to action section
- `OurProcessSection` - Our process steps
- `CompanyNumbersSection` - Company statistics
- `CertificationsSection` - Certifications display
- `PricingSection` - Pricing tables

### SpecialtySections.tsx
- `SpecialtiesSection` - Medical specialties grid
- `CheckupPackagesSection` - Checkup packages
- `ExamCategoriesSection` - Exam categories
- `TechnologySection` - Technology equipment
- `DiagnosticsCategoriesSection` - Diagnostics categories
- `PackagesSection` - Service packages

### CourseSections.tsx
- `CourseCategoriesSection` - Training course categories
- `DeliveryModesSection` - Course delivery modes (aula, e-learning, blended)
- `TrainingCoursesSection` - Training courses list
- `CourseCalendarSection` - Course calendar/schedule
- `CourseDetailsSection` - Course details

### BookingSections.tsx
- `BookingCategoriesSection` - Booking categories grid
- `PopularBookingsSection` - Popular bookings carousel
- `BookingStepsSection` - How to book steps
- `GuaranteesSection` - Service guarantees
- `QualityAssuranceSection` - Quality assurance info
- `ResultDeliverySection` - Result delivery options
- `ImportantInfoSection` - Important information
- `EmergencySection` - Emergency contacts

### CareersSections.tsx
- `WhyWorkWithUsSection` - Benefits of working with us
- `OpenPositionsSection` - Job openings
- `ApplicationProcessSection` - How to apply
- `TeamCultureSection` - Company culture

### MiscSections.tsx
- `CaseStudiesSection` - Case studies
- `WorkflowProcessSection` - Workflow process
- `MacrosettoriSection` - ATECO macro sectors
- `PartnersSection` - Partner logos
- `FeaturesGridSection` - Features grid
- `StatisticsSection` - Statistics display
- `ResourcesSection` - Resources/downloads

## Usage

```tsx
import { CustomContentRenderer } from '@/components/cms/renderer/CustomContentRenderer';

// Or import specific sections
import { 
  IntroductionSection, 
  WhyChooseUsSection 
} from '@/components/cms/renderer/custom-content-renderer';

// Main component usage
<CustomContentRenderer content={pageContent} />
```

## Color Schemes

The module uses array-based color schemes for consistent theming:

- `serviceColorSchemes` - Services section colors
- `whyChooseUsColors` - Why choose us section colors
- `missionColors` - Mission section colors
- `storiaColors` - History section colors
- `approachColors` - Approach section colors
- `stepColors` - Process steps colors
- `certColors` - Certifications colors
- `courseCategoryColors` - Course categories colors
- `deliveryModeColors` - Delivery modes colors
- `specialtyColors` - Specialties colors
- `categoryColors` - Generic category colors
- `checkupColors` - Checkup packages colors
- `examCategoryColors` - Exam categories colors
- `bookingCategoryColors` - Booking categories colors
- `popularBookingColors` - Popular bookings colors
- `packageColors` - Package colors

## Dependencies

- React
- React Router DOM
- Lucide React (icons via `../iconMap`)
- PublicButton component
- ContactForm component

## Refactoring Notes

- **Date**: 2025-01-XX
- **Original Size**: 2926 lines
- **New Size**: ~4500 lines total (split across 11 files)
- **Average Module Size**: ~400 lines
- **Backward Compatibility**: Maintained via re-export wrapper
- **Zero Breaking Changes**: All existing imports continue to work

## Quality Metrics

- ✅ TypeScript: 0 errors
- ✅ All sections exported correctly
- ✅ Backward compatibility maintained
- ✅ Consistent code style
- ✅ Documented exports
