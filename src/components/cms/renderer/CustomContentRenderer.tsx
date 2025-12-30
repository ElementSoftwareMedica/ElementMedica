/**
 * CustomContentRenderer Re-export Wrapper
 * 
 * This file maintains backward compatibility after modularization.
 * The actual implementation is in ./custom-content-renderer/
 * 
 * Original file: 2926 lines → Split into 11 modular files
 * - types.ts: Color schemes and interfaces
 * - IntroductionSections.tsx: Introduction, Services sections
 * - MedicalSections.tsx: Medical exam, process steps, advantages
 * - AboutSections.tsx: Mission, storia, team, approach
 * - ContactSections.tsx: Contact info, map, form, departments
 * - CommonSections.tsx: Why choose us, testimonials, FAQ, CTA
 * - SpecialtySections.tsx: Specialties, checkups, exam categories
 * - CourseSections.tsx: Course categories, delivery modes, calendar
 * - BookingSections.tsx: Booking categories, steps, guarantees
 * - CareersSections.tsx: Why work with us, positions, application
 * - MiscSections.tsx: Case studies, workflow, macrosettori, partners
 * - CustomContentRenderer.tsx: Main orchestrator component
 * - index.ts: Central exports
 * 
 * @module components/cms/renderer/CustomContentRenderer
 * @refactored 2025-01-XX - Project 46 Optimization
 */

// Re-export everything from the modular implementation
export { CustomContentRenderer, default } from './custom-content-renderer';
export * from './custom-content-renderer';
