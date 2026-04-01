/**
 * CustomContentRenderer Types and Utilities
 * 
 * Shared types and helper functions for CMS content rendering
 * 
 * @module components/cms/renderer/custom-content-renderer
 */

// Color scheme definitions — uses brand semantic tokens (primary/secondary/accent)
// These resolve via CSS variables set by brand-themes.css based on [data-brand]
export const colorMap: Record<string, string> = {
  primary: 'bg-primary-100 text-primary-700',
  secondary: 'bg-secondary-100 text-secondary-700',
  accent: 'bg-accent-100 text-accent-700',
  blue: 'bg-primary-100 text-primary-700',
  green: 'bg-green-100 text-green-700',
  cyan: 'bg-accent-100 text-accent-700',
  teal: 'bg-primary-100 text-primary-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
  red: 'bg-red-100 text-red-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  gray: 'bg-gray-100 text-gray-700'
};

export const bgColorMap: Record<string, string> = {
  primary: 'bg-primary-600',
  secondary: 'bg-primary-600',
  accent: 'bg-accent-600',
  blue: 'bg-primary-600',
  green: 'bg-green-600',
  cyan: 'bg-accent-600',
  teal: 'bg-primary-600',
  purple: 'bg-purple-600',
  orange: 'bg-orange-600',
  red: 'bg-red-600',
  yellow: 'bg-yellow-500',
  gray: 'bg-gray-600'
};

export const serviceColorSchemes: Record<string, { gradient: string; iconBg: string; border: string; badge: string }> = {
  primary: { gradient: 'from-primary-50 to-white', iconBg: 'bg-primary-600', border: 'border-primary-500', badge: 'bg-primary-100 text-primary-700' },
  blue: { gradient: 'from-primary-50 to-white', iconBg: 'bg-primary-600', border: 'border-primary-500', badge: 'bg-primary-100 text-primary-700' },
  purple: { gradient: 'from-purple-50 to-white', iconBg: 'bg-purple-600', border: 'border-purple-500', badge: 'bg-purple-100 text-purple-700' },
  teal: { gradient: 'from-primary-50 to-white', iconBg: 'bg-primary-600', border: 'border-primary-500', badge: 'bg-primary-100 text-primary-700' },
  green: { gradient: 'from-green-50 to-white', iconBg: 'bg-green-600', border: 'border-green-500', badge: 'bg-green-100 text-green-700' },
  orange: { gradient: 'from-orange-50 to-white', iconBg: 'bg-orange-600', border: 'border-orange-500', badge: 'bg-orange-100 text-orange-700' }
};

export const whyChooseUsColors = [
  { bg: 'bg-primary-500', light: 'bg-primary-50', badge: 'bg-primary-100 text-primary-700' },
  { bg: 'bg-secondary-500', light: 'bg-secondary-50', badge: 'bg-secondary-100 text-secondary-700' },
  { bg: 'bg-accent-500', light: 'bg-accent-50', badge: 'bg-accent-100 text-accent-700' },
  { bg: 'bg-green-500', light: 'bg-green-50', badge: 'bg-green-100 text-green-700' },
  { bg: 'bg-purple-500', light: 'bg-purple-50', badge: 'bg-purple-100 text-purple-700' },
  { bg: 'bg-orange-500', light: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700' }
];

export const missionColors = [
  { style: { backgroundImage: 'linear-gradient(to bottom right, var(--color-primary-400), var(--color-primary-500))' }, light: 'bg-primary-50', border: 'border-primary-200' },
  { style: { backgroundImage: 'linear-gradient(to bottom right, var(--color-secondary-400), var(--color-secondary-500))' }, light: 'bg-secondary-50', border: 'border-secondary-200' },
  { style: { backgroundImage: 'linear-gradient(to bottom right, #c084fc, #a855f7)' }, light: 'bg-purple-50', border: 'border-purple-200' },
  { style: { backgroundImage: 'linear-gradient(to bottom right, #fb923c, #f97316)' }, light: 'bg-orange-50', border: 'border-orange-200' }
];

export const storiaColors: Record<string, { backgroundImage: string }> = {
  primary: { backgroundImage: 'linear-gradient(to right, var(--color-primary-500), var(--color-primary-600))' },
  blue: { backgroundImage: 'linear-gradient(to right, var(--color-primary-500), var(--color-primary-600))' },
  green: { backgroundImage: 'linear-gradient(to right, var(--color-secondary-500), var(--color-primary-600))' },
  purple: { backgroundImage: 'linear-gradient(to right, #a855f7, #4f46e5)' },
  orange: { backgroundImage: 'linear-gradient(to right, #f97316, #f59e0b)' },
  teal: { backgroundImage: 'linear-gradient(to right, var(--color-primary-500), var(--color-accent-600))' },
  indigo: { backgroundImage: 'linear-gradient(to right, #6366f1, var(--color-primary-600))' }
};

export const approachColors: Record<string, { bg: string; text: string; style: { backgroundImage: string } }> = {
  primary: { bg: 'bg-primary-500', text: 'text-primary-600', style: { backgroundImage: 'linear-gradient(to bottom right, var(--color-primary-500), var(--color-primary-600))' } },
  blue: { bg: 'bg-primary-500', text: 'text-primary-600', style: { backgroundImage: 'linear-gradient(to bottom right, var(--color-primary-500), var(--color-primary-600))' } },
  green: { bg: 'bg-secondary-500', text: 'text-secondary-600', style: { backgroundImage: 'linear-gradient(to bottom right, var(--color-secondary-500), var(--color-primary-600))' } },
  purple: { bg: 'bg-purple-500', text: 'text-purple-600', style: { backgroundImage: 'linear-gradient(to bottom right, #a855f7, #4f46e5)' } },
  orange: { bg: 'bg-orange-500', text: 'text-orange-600', style: { backgroundImage: 'linear-gradient(to bottom right, #f97316, #f59e0b)' } }
};

export const stepColors = [
  { bg: 'bg-primary-600', light: 'bg-primary-100', text: 'text-primary-600' },
  { bg: 'bg-primary-600', light: 'bg-secondary-100', text: 'text-secondary-600' },
  { bg: 'bg-purple-600', light: 'bg-purple-100', text: 'text-purple-600' },
  { bg: 'bg-green-600', light: 'bg-green-100', text: 'text-green-600' }
];

export const certColors = [
  { bg: 'bg-primary-600', light: 'bg-primary-50', border: 'border-primary-200' },
  { bg: 'bg-green-600', light: 'bg-green-50', border: 'border-green-200' },
  { bg: 'bg-purple-600', light: 'bg-purple-50', border: 'border-purple-200' },
  { bg: 'bg-primary-600', light: 'bg-secondary-50', border: 'border-secondary-200' }
];

// Course category colors - ARRAY for index-based access
export const courseCategoryColors = [
  { bg: 'bg-primary-600', border: 'border-primary-200', iconBg: 'bg-primary-100', light: 'bg-primary-50', text: 'text-primary-700', badgeBg: 'bg-primary-100' },
  { bg: 'bg-primary-600', border: 'border-secondary-200', iconBg: 'bg-secondary-100', light: 'bg-secondary-50', text: 'text-secondary-700', badgeBg: 'bg-secondary-100' },
  { bg: 'bg-purple-600', border: 'border-purple-200', iconBg: 'bg-purple-100', light: 'bg-purple-50', text: 'text-purple-700', badgeBg: 'bg-purple-100' },
  { bg: 'bg-indigo-600', border: 'border-indigo-200', iconBg: 'bg-indigo-100', light: 'bg-indigo-50', text: 'text-indigo-700', badgeBg: 'bg-indigo-100' },
  { bg: 'bg-green-600', border: 'border-green-200', iconBg: 'bg-green-100', light: 'bg-green-50', text: 'text-green-700', badgeBg: 'bg-green-100' },
  { bg: 'bg-red-600', border: 'border-red-200', iconBg: 'bg-red-100', light: 'bg-red-50', text: 'text-red-700', badgeBg: 'bg-red-100' },
  { bg: 'bg-orange-600', border: 'border-orange-200', iconBg: 'bg-orange-100', light: 'bg-orange-50', text: 'text-orange-700', badgeBg: 'bg-orange-100' },
  { bg: 'bg-amber-600', border: 'border-amber-200', iconBg: 'bg-amber-100', light: 'bg-amber-50', text: 'text-amber-700', badgeBg: 'bg-amber-100' }
];

// Delivery mode colors - ARRAY for index-based access
export const deliveryModeColors = [
  { bg: 'bg-primary-600', light: 'bg-primary-50', border: 'border-primary-200', text: 'text-primary-700', badgeBg: 'bg-primary-100' },
  { bg: 'bg-primary-600', light: 'bg-secondary-50', border: 'border-secondary-200', text: 'text-secondary-700', badgeBg: 'bg-secondary-100' },
  { bg: 'bg-indigo-600', light: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', badgeBg: 'bg-indigo-100' },
  { bg: 'bg-purple-600', light: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badgeBg: 'bg-purple-100' }
];

// Judgment colors for medical exam section
export const judgmentBgColors: Record<string, string> = {
  green: 'bg-green-100 border-green-500',
  yellow: 'bg-yellow-100 border-yellow-500',
  orange: 'bg-orange-100 border-orange-500',
  red: 'bg-red-100 border-red-500',
  gray: 'bg-gray-100 border-gray-500'
};

export const judgmentTextColors: Record<string, string> = {
  green: 'text-green-700',
  yellow: 'text-yellow-700',
  orange: 'text-orange-700',
  red: 'text-red-700',
  gray: 'text-gray-700'
};

export const judgmentIconBgColors: Record<string, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  gray: 'bg-gray-500'
};

// Specialty colors - ARRAY for index-based access
export const specialtyColors = [
  { bg: 'bg-gradient-to-br from-primary-500 to-primary-600', iconBg: 'bg-primary-500', text: 'text-primary-700', light: 'bg-primary-50', border: 'border-primary-200' },
  { bg: 'bg-gradient-to-br from-purple-500 to-violet-600', iconBg: 'bg-purple-500', text: 'text-purple-700', light: 'bg-purple-50', border: 'border-purple-200' },
  { bg: 'bg-gradient-to-br from-primary-600 to-primary-700', iconBg: 'bg-primary-600', text: 'text-secondary-700', light: 'bg-secondary-50', border: 'border-secondary-200' },
  { bg: 'bg-gradient-to-br from-green-500 to-emerald-600', iconBg: 'bg-green-500', text: 'text-green-700', light: 'bg-green-50', border: 'border-green-200' },
  { bg: 'bg-gradient-to-br from-amber-500 to-orange-600', iconBg: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-50', border: 'border-amber-200' },
  { bg: 'bg-gradient-to-br from-orange-500 to-amber-600', iconBg: 'bg-orange-500', text: 'text-orange-700', light: 'bg-orange-50', border: 'border-orange-200' },
  { bg: 'bg-gradient-to-br from-cyan-500 to-sky-600', iconBg: 'bg-cyan-500', text: 'text-cyan-700', light: 'bg-cyan-50', border: 'border-cyan-200' },
  { bg: 'bg-gradient-to-br from-indigo-500 to-blue-600', iconBg: 'bg-indigo-500', text: 'text-indigo-700', light: 'bg-indigo-50', border: 'border-indigo-200' }
];

// Category colors - ARRAY for index-based access
export const categoryColors = [
  { bg: 'bg-gradient-to-br from-primary-500 to-primary-600', border: 'border-primary-200', iconBg: 'bg-primary-500', light: 'bg-primary-50', text: 'text-primary-700' },
  { bg: 'bg-gradient-to-br from-primary-600 to-primary-700', border: 'border-secondary-200', iconBg: 'bg-primary-600', light: 'bg-secondary-50', text: 'text-secondary-700' },
  { bg: 'bg-gradient-to-br from-amber-500 to-orange-600', border: 'border-amber-200', iconBg: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-700' },
  { bg: 'bg-gradient-to-br from-sky-500 to-blue-600', border: 'border-sky-200', iconBg: 'bg-sky-500', light: 'bg-sky-50', text: 'text-sky-700' },
  { bg: 'bg-gradient-to-br from-purple-500 to-violet-600', border: 'border-purple-200', iconBg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-700' },
  { bg: 'bg-gradient-to-br from-orange-500 to-amber-600', border: 'border-orange-200', iconBg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-700' },
  { bg: 'bg-gradient-to-br from-cyan-500 to-teal-600', border: 'border-cyan-200', iconBg: 'bg-cyan-500', light: 'bg-cyan-50', text: 'text-cyan-700' },
  { bg: 'bg-gradient-to-br from-green-500 to-emerald-600', border: 'border-green-200', iconBg: 'bg-green-500', light: 'bg-green-50', text: 'text-green-700' }
];

// Checkup package colors - ARRAY for index-based access
export const checkupColors = [
  { bg: 'bg-gradient-to-br from-primary-500 to-primary-600', border: 'border-primary-200', badge: 'bg-primary-500', light: 'bg-primary-50', text: 'text-primary-700' },
  { bg: 'bg-gradient-to-br from-amber-500 to-orange-600', border: 'border-amber-200', badge: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-700' },
  { bg: 'bg-gradient-to-br from-cyan-500 to-sky-600', border: 'border-cyan-200', badge: 'bg-cyan-500', light: 'bg-cyan-50', text: 'text-cyan-700' },
  { bg: 'bg-gradient-to-br from-primary-600 to-primary-700', border: 'border-secondary-200', badge: 'bg-primary-600', light: 'bg-secondary-50', text: 'text-secondary-700' },
  { bg: 'bg-gradient-to-br from-purple-500 to-violet-600', border: 'border-purple-200', badge: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-700' },
  { bg: 'bg-gradient-to-br from-indigo-500 to-blue-600', border: 'border-indigo-200', badge: 'bg-indigo-500', light: 'bg-indigo-50', text: 'text-indigo-700' }
];

// Exam category colors - ARRAY for index-based access
export const examCategoryColors = [
  { bg: 'bg-gradient-to-br from-primary-500 to-primary-600', iconBg: 'bg-primary-500', border: 'border-primary-200', light: 'bg-primary-50', text: 'text-primary-700' },
  { bg: 'bg-gradient-to-br from-amber-500 to-orange-600', iconBg: 'bg-amber-500', border: 'border-amber-200', light: 'bg-amber-50', text: 'text-amber-700' },
  { bg: 'bg-gradient-to-br from-primary-600 to-primary-700', iconBg: 'bg-primary-600', border: 'border-secondary-200', light: 'bg-secondary-50', text: 'text-secondary-700' },
  { bg: 'bg-gradient-to-br from-purple-500 to-violet-600', iconBg: 'bg-purple-500', border: 'border-purple-200', light: 'bg-purple-50', text: 'text-purple-700' },
  { bg: 'bg-gradient-to-br from-green-500 to-emerald-600', iconBg: 'bg-green-500', border: 'border-green-200', light: 'bg-green-50', text: 'text-green-700' },
  { bg: 'bg-gradient-to-br from-indigo-500 to-blue-600', iconBg: 'bg-indigo-500', border: 'border-indigo-200', light: 'bg-indigo-50', text: 'text-indigo-700' }
];

// Booking category colors - ARRAY for index-based access
export const bookingCategoryColors = [
  { bg: 'bg-gradient-to-br from-primary-500 to-primary-600', iconBg: 'bg-primary-500', border: 'border-primary-200', light: 'bg-primary-50', text: 'text-primary-700', badgeBg: 'bg-primary-100' },
  { bg: 'bg-gradient-to-br from-primary-600 to-primary-700', iconBg: 'bg-primary-600', border: 'border-secondary-200', light: 'bg-secondary-50', text: 'text-secondary-700', badgeBg: 'bg-secondary-100' },
  { bg: 'bg-gradient-to-br from-green-500 to-emerald-600', iconBg: 'bg-green-500', border: 'border-green-200', light: 'bg-green-50', text: 'text-green-700', badgeBg: 'bg-green-100' },
  { bg: 'bg-gradient-to-br from-purple-500 to-violet-600', iconBg: 'bg-purple-500', border: 'border-purple-200', light: 'bg-purple-50', text: 'text-purple-700', badgeBg: 'bg-purple-100' },
  { bg: 'bg-gradient-to-br from-amber-500 to-orange-600', iconBg: 'bg-amber-500', border: 'border-amber-200', light: 'bg-amber-50', text: 'text-amber-700', badgeBg: 'bg-amber-100' },
  { bg: 'bg-gradient-to-br from-indigo-500 to-blue-600', iconBg: 'bg-indigo-500', border: 'border-indigo-200', light: 'bg-indigo-50', text: 'text-indigo-700', badgeBg: 'bg-indigo-100' }
];

// Popular booking colors - ARRAY for index-based access
export const popularBookingColors = [
  { iconBg: 'bg-primary-500', badge: 'bg-primary-100 text-primary-700', bg: 'bg-gradient-to-br from-primary-500 to-primary-600', light: 'bg-primary-50', border: 'border-primary-200' },
  { iconBg: 'bg-sky-500', badge: 'bg-sky-100 text-sky-700', bg: 'bg-gradient-to-br from-sky-500 to-blue-600', light: 'bg-sky-50', border: 'border-sky-200' },
  { iconBg: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700', bg: 'bg-gradient-to-br from-amber-500 to-orange-600', light: 'bg-amber-50', border: 'border-amber-200' },
  { iconBg: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700', bg: 'bg-gradient-to-br from-emerald-500 to-green-600', light: 'bg-emerald-50', border: 'border-emerald-200' },
  { iconBg: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700', bg: 'bg-gradient-to-br from-orange-500 to-amber-600', light: 'bg-orange-50', border: 'border-orange-200' },
  { iconBg: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700', bg: 'bg-gradient-to-br from-purple-500 to-violet-600', light: 'bg-purple-50', border: 'border-purple-200' }
];

// Package colors - ARRAY for index-based access
export const packageColors = [
  { bg: 'bg-gradient-to-br from-primary-500 to-primary-600', border: 'border-primary-200', badge: 'bg-primary-500', light: 'bg-primary-50', text: 'text-primary-700' },
  { bg: 'bg-gradient-to-br from-amber-500 to-orange-600', border: 'border-amber-200', badge: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-700' },
  { bg: 'bg-gradient-to-br from-cyan-500 to-sky-600', border: 'border-cyan-200', badge: 'bg-cyan-500', light: 'bg-cyan-50', text: 'text-cyan-700' },
  { bg: 'bg-gradient-to-br from-primary-600 to-primary-700', border: 'border-secondary-200', badge: 'bg-primary-600', light: 'bg-secondary-50', text: 'text-secondary-700' },
  { bg: 'bg-gradient-to-br from-purple-500 to-violet-600', border: 'border-purple-200', badge: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-700' },
  { bg: 'bg-gradient-to-br from-green-500 to-emerald-600', border: 'border-green-200', badge: 'bg-green-500', light: 'bg-green-50', text: 'text-green-700' }
];

// Common TypeScript interfaces for CMS content
export interface CMSContentProps {
  content: any;
  slug?: string;
}

export interface CMSSectionProps {
  content: any;
}
