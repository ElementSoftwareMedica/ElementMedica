/**
 * CustomContentRenderer Types and Utilities
 * 
 * Shared types and helper functions for CMS content rendering
 * 
 * @module components/cms/renderer/custom-content-renderer
 */

// Color scheme definitions
export const colorMap: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  cyan: 'bg-cyan-100 text-cyan-700',
  teal: 'bg-teal-100 text-teal-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
  red: 'bg-red-100 text-red-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  gray: 'bg-gray-100 text-gray-700'
};

export const bgColorMap: Record<string, string> = {
  blue: 'bg-blue-600',
  green: 'bg-green-600',
  cyan: 'bg-cyan-600',
  teal: 'bg-teal-600',
  purple: 'bg-purple-600',
  orange: 'bg-orange-600',
  red: 'bg-red-600',
  yellow: 'bg-yellow-500',
  gray: 'bg-gray-600'
};

export const serviceColorSchemes: Record<string, { gradient: string; iconBg: string; border: string; badge: string }> = {
  blue: { gradient: 'from-blue-50 to-white', iconBg: 'bg-blue-600', border: 'border-blue-500', badge: 'bg-blue-100 text-blue-700' },
  purple: { gradient: 'from-purple-50 to-white', iconBg: 'bg-purple-600', border: 'border-purple-500', badge: 'bg-purple-100 text-purple-700' },
  teal: { gradient: 'from-teal-50 to-white', iconBg: 'bg-teal-600', border: 'border-teal-500', badge: 'bg-teal-100 text-teal-700' },
  green: { gradient: 'from-green-50 to-white', iconBg: 'bg-green-600', border: 'border-green-500', badge: 'bg-green-100 text-green-700' },
  orange: { gradient: 'from-orange-50 to-white', iconBg: 'bg-orange-600', border: 'border-orange-500', badge: 'bg-orange-100 text-orange-700' }
};

export const whyChooseUsColors = [
  { bg: 'bg-blue-500', light: 'bg-blue-50', badge: 'bg-blue-100 text-blue-700' },
  { bg: 'bg-purple-500', light: 'bg-purple-50', badge: 'bg-purple-100 text-purple-700' },
  { bg: 'bg-teal-500', light: 'bg-teal-50', badge: 'bg-teal-100 text-teal-700' },
  { bg: 'bg-green-500', light: 'bg-green-50', badge: 'bg-green-100 text-green-700' },
  { bg: 'bg-orange-500', light: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700' },
  { bg: 'bg-indigo-500', light: 'bg-indigo-50', badge: 'bg-indigo-100 text-indigo-700' }
];

export const missionColors = [
  { bg: 'from-blue-500 to-blue-600', light: 'bg-blue-50', border: 'border-blue-200' },
  { bg: 'from-emerald-500 to-teal-600', light: 'bg-emerald-50', border: 'border-emerald-200' },
  { bg: 'from-purple-500 to-indigo-600', light: 'bg-purple-50', border: 'border-purple-200' },
  { bg: 'from-orange-500 to-amber-600', light: 'bg-orange-50', border: 'border-orange-200' }
];

export const storiaColors: Record<string, string> = {
  blue: 'from-blue-500 to-blue-600',
  green: 'from-emerald-500 to-teal-600',
  purple: 'from-purple-500 to-indigo-600',
  orange: 'from-orange-500 to-amber-600',
  teal: 'from-teal-500 to-cyan-600',
  indigo: 'from-indigo-500 to-blue-600'
};

export const approachColors: Record<string, { bg: string; text: string; icon: string }> = {
  blue: { bg: 'bg-blue-500', text: 'text-blue-600', icon: 'from-blue-500 to-blue-600' },
  green: { bg: 'bg-emerald-500', text: 'text-emerald-600', icon: 'from-emerald-500 to-teal-600' },
  purple: { bg: 'bg-purple-500', text: 'text-purple-600', icon: 'from-purple-500 to-indigo-600' },
  orange: { bg: 'bg-orange-500', text: 'text-orange-600', icon: 'from-orange-500 to-amber-600' }
};

export const stepColors = [
  { bg: 'bg-blue-600', light: 'bg-blue-100', text: 'text-blue-600' },
  { bg: 'bg-purple-600', light: 'bg-purple-100', text: 'text-purple-600' },
  { bg: 'bg-teal-600', light: 'bg-teal-100', text: 'text-teal-600' },
  { bg: 'bg-green-600', light: 'bg-green-100', text: 'text-green-600' }
];

export const certColors = [
  { bg: 'bg-blue-600', light: 'bg-blue-50', border: 'border-blue-200' },
  { bg: 'bg-green-600', light: 'bg-green-50', border: 'border-green-200' },
  { bg: 'bg-purple-600', light: 'bg-purple-50', border: 'border-purple-200' },
  { bg: 'bg-teal-600', light: 'bg-teal-50', border: 'border-teal-200' }
];

// Course category colors - ARRAY for index-based access
export const courseCategoryColors = [
  { bg: 'bg-blue-600', border: 'border-blue-200', iconBg: 'bg-blue-100', light: 'bg-blue-50', text: 'text-blue-700', badgeBg: 'bg-blue-100' },
  { bg: 'bg-purple-600', border: 'border-purple-200', iconBg: 'bg-purple-100', light: 'bg-purple-50', text: 'text-purple-700', badgeBg: 'bg-purple-100' },
  { bg: 'bg-indigo-600', border: 'border-indigo-200', iconBg: 'bg-indigo-100', light: 'bg-indigo-50', text: 'text-indigo-700', badgeBg: 'bg-indigo-100' },
  { bg: 'bg-teal-600', border: 'border-teal-200', iconBg: 'bg-teal-100', light: 'bg-teal-50', text: 'text-teal-700', badgeBg: 'bg-teal-100' },
  { bg: 'bg-green-600', border: 'border-green-200', iconBg: 'bg-green-100', light: 'bg-green-50', text: 'text-green-700', badgeBg: 'bg-green-100' },
  { bg: 'bg-red-600', border: 'border-red-200', iconBg: 'bg-red-100', light: 'bg-red-50', text: 'text-red-700', badgeBg: 'bg-red-100' },
  { bg: 'bg-orange-600', border: 'border-orange-200', iconBg: 'bg-orange-100', light: 'bg-orange-50', text: 'text-orange-700', badgeBg: 'bg-orange-100' },
  { bg: 'bg-amber-600', border: 'border-amber-200', iconBg: 'bg-amber-100', light: 'bg-amber-50', text: 'text-amber-700', badgeBg: 'bg-amber-100' }
];

// Delivery mode colors - ARRAY for index-based access
export const deliveryModeColors = [
  { bg: 'bg-blue-600', light: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badgeBg: 'bg-blue-100' },
  { bg: 'bg-indigo-600', light: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', badgeBg: 'bg-indigo-100' },
  { bg: 'bg-teal-600', light: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', badgeBg: 'bg-teal-100' },
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
  { bg: 'bg-gradient-to-br from-red-500 to-rose-600', iconBg: 'bg-red-500', text: 'text-red-700', light: 'bg-red-50', border: 'border-red-200' },
  { bg: 'bg-gradient-to-br from-purple-500 to-violet-600', iconBg: 'bg-purple-500', text: 'text-purple-700', light: 'bg-purple-50', border: 'border-purple-200' },
  { bg: 'bg-gradient-to-br from-blue-500 to-indigo-600', iconBg: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-50', border: 'border-blue-200' },
  { bg: 'bg-gradient-to-br from-green-500 to-emerald-600', iconBg: 'bg-green-500', text: 'text-green-700', light: 'bg-green-50', border: 'border-green-200' },
  { bg: 'bg-gradient-to-br from-orange-500 to-amber-600', iconBg: 'bg-orange-500', text: 'text-orange-700', light: 'bg-orange-50', border: 'border-orange-200' },
  { bg: 'bg-gradient-to-br from-pink-500 to-rose-600', iconBg: 'bg-pink-500', text: 'text-pink-700', light: 'bg-pink-50', border: 'border-pink-200' },
  { bg: 'bg-gradient-to-br from-teal-500 to-cyan-600', iconBg: 'bg-teal-500', text: 'text-teal-700', light: 'bg-teal-50', border: 'border-teal-200' },
  { bg: 'bg-gradient-to-br from-indigo-500 to-blue-600', iconBg: 'bg-indigo-500', text: 'text-indigo-700', light: 'bg-indigo-50', border: 'border-indigo-200' }
];

// Category colors - ARRAY for index-based access
export const categoryColors = [
  { bg: 'bg-gradient-to-br from-red-500 to-rose-600', border: 'border-red-200', iconBg: 'bg-red-500', light: 'bg-red-50', text: 'text-red-700' },
  { bg: 'bg-gradient-to-br from-rose-500 to-pink-600', border: 'border-rose-200', iconBg: 'bg-rose-500', light: 'bg-rose-50', text: 'text-rose-700' },
  { bg: 'bg-gradient-to-br from-amber-500 to-orange-600', border: 'border-amber-200', iconBg: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-700' },
  { bg: 'bg-gradient-to-br from-orange-500 to-red-600', border: 'border-orange-200', iconBg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-700' },
  { bg: 'bg-gradient-to-br from-blue-500 to-indigo-600', border: 'border-blue-200', iconBg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-700' },
  { bg: 'bg-gradient-to-br from-purple-500 to-violet-600', border: 'border-purple-200', iconBg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-700' },
  { bg: 'bg-gradient-to-br from-teal-500 to-cyan-600', border: 'border-teal-200', iconBg: 'bg-teal-500', light: 'bg-teal-50', text: 'text-teal-700' },
  { bg: 'bg-gradient-to-br from-green-500 to-emerald-600', border: 'border-green-200', iconBg: 'bg-green-500', light: 'bg-green-50', text: 'text-green-700' }
];

// Checkup package colors - ARRAY for index-based access
export const checkupColors = [
  { bg: 'bg-gradient-to-br from-teal-500 to-cyan-600', border: 'border-teal-200', badge: 'bg-teal-500', light: 'bg-teal-50', text: 'text-teal-700' },
  { bg: 'bg-gradient-to-br from-rose-500 to-pink-600', border: 'border-rose-200', badge: 'bg-rose-500', light: 'bg-rose-50', text: 'text-rose-700' },
  { bg: 'bg-gradient-to-br from-pink-500 to-fuchsia-600', border: 'border-pink-200', badge: 'bg-pink-500', light: 'bg-pink-50', text: 'text-pink-700' },
  { bg: 'bg-gradient-to-br from-cyan-500 to-sky-600', border: 'border-cyan-200', badge: 'bg-cyan-500', light: 'bg-cyan-50', text: 'text-cyan-700' },
  { bg: 'bg-gradient-to-br from-blue-500 to-indigo-600', border: 'border-blue-200', badge: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-700' },
  { bg: 'bg-gradient-to-br from-purple-500 to-violet-600', border: 'border-purple-200', badge: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-700' }
];

// Exam category colors - ARRAY for index-based access
export const examCategoryColors = [
  { bg: 'bg-gradient-to-br from-teal-500 to-cyan-600', iconBg: 'bg-teal-500', border: 'border-teal-200', light: 'bg-teal-50', text: 'text-teal-700' },
  { bg: 'bg-gradient-to-br from-rose-500 to-pink-600', iconBg: 'bg-rose-500', border: 'border-rose-200', light: 'bg-rose-50', text: 'text-rose-700' },
  { bg: 'bg-gradient-to-br from-blue-500 to-indigo-600', iconBg: 'bg-blue-500', border: 'border-blue-200', light: 'bg-blue-50', text: 'text-blue-700' },
  { bg: 'bg-gradient-to-br from-cyan-500 to-sky-600', iconBg: 'bg-cyan-500', border: 'border-cyan-200', light: 'bg-cyan-50', text: 'text-cyan-700' },
  { bg: 'bg-gradient-to-br from-emerald-500 to-teal-600', iconBg: 'bg-emerald-500', border: 'border-emerald-200', light: 'bg-emerald-50', text: 'text-emerald-700' },
  { bg: 'bg-gradient-to-br from-purple-500 to-violet-600', iconBg: 'bg-purple-500', border: 'border-purple-200', light: 'bg-purple-50', text: 'text-purple-700' }
];

// Booking category colors - ARRAY for index-based access
export const bookingCategoryColors = [
  { bg: 'bg-gradient-to-br from-teal-500 to-cyan-600', iconBg: 'bg-teal-500', border: 'border-teal-200', light: 'bg-teal-50', text: 'text-teal-700', badgeBg: 'bg-teal-100' },
  { bg: 'bg-gradient-to-br from-cyan-500 to-sky-600', iconBg: 'bg-cyan-500', border: 'border-cyan-200', light: 'bg-cyan-50', text: 'text-cyan-700', badgeBg: 'bg-cyan-100' },
  { bg: 'bg-gradient-to-br from-emerald-500 to-teal-600', iconBg: 'bg-emerald-500', border: 'border-emerald-200', light: 'bg-emerald-50', text: 'text-emerald-700', badgeBg: 'bg-emerald-100' },
  { bg: 'bg-gradient-to-br from-purple-500 to-violet-600', iconBg: 'bg-purple-500', border: 'border-purple-200', light: 'bg-purple-50', text: 'text-purple-700', badgeBg: 'bg-purple-100' },
  { bg: 'bg-gradient-to-br from-rose-500 to-pink-600', iconBg: 'bg-rose-500', border: 'border-rose-200', light: 'bg-rose-50', text: 'text-rose-700', badgeBg: 'bg-rose-100' },
  { bg: 'bg-gradient-to-br from-blue-500 to-indigo-600', iconBg: 'bg-blue-500', border: 'border-blue-200', light: 'bg-blue-50', text: 'text-blue-700', badgeBg: 'bg-blue-100' }
];

// Popular booking colors - ARRAY for index-based access
export const popularBookingColors = [
  { iconBg: 'bg-rose-500', badge: 'bg-rose-100 text-rose-700', bg: 'bg-gradient-to-br from-rose-500 to-pink-600', light: 'bg-rose-50', border: 'border-rose-200' },
  { iconBg: 'bg-teal-500', badge: 'bg-teal-100 text-teal-700', bg: 'bg-gradient-to-br from-teal-500 to-cyan-600', light: 'bg-teal-50', border: 'border-teal-200' },
  { iconBg: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700', bg: 'bg-gradient-to-br from-amber-500 to-orange-600', light: 'bg-amber-50', border: 'border-amber-200' },
  { iconBg: 'bg-red-500', badge: 'bg-red-100 text-red-700', bg: 'bg-gradient-to-br from-red-500 to-rose-600', light: 'bg-red-50', border: 'border-red-200' },
  { iconBg: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700', bg: 'bg-gradient-to-br from-orange-500 to-amber-600', light: 'bg-orange-50', border: 'border-orange-200' },
  { iconBg: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700', bg: 'bg-gradient-to-br from-purple-500 to-violet-600', light: 'bg-purple-50', border: 'border-purple-200' }
];

// Package colors - ARRAY for index-based access
export const packageColors = [
  { bg: 'bg-gradient-to-br from-teal-500 to-cyan-600', border: 'border-teal-200', badge: 'bg-teal-500', light: 'bg-teal-50', text: 'text-teal-700' },
  { bg: 'bg-gradient-to-br from-rose-500 to-pink-600', border: 'border-rose-200', badge: 'bg-rose-500', light: 'bg-rose-50', text: 'text-rose-700' },
  { bg: 'bg-gradient-to-br from-pink-500 to-fuchsia-600', border: 'border-pink-200', badge: 'bg-pink-500', light: 'bg-pink-50', text: 'text-pink-700' },
  { bg: 'bg-gradient-to-br from-blue-500 to-indigo-600', border: 'border-blue-200', badge: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-700' },
  { bg: 'bg-gradient-to-br from-purple-500 to-violet-600', border: 'border-purple-200', badge: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-700' },
  { bg: 'bg-gradient-to-br from-emerald-500 to-teal-600', border: 'border-emerald-200', badge: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-700' }
];

// Common TypeScript interfaces for CMS content
export interface CMSContentProps {
  content: any;
  slug?: string;
}

export interface CMSSectionProps {
  content: any;
}
