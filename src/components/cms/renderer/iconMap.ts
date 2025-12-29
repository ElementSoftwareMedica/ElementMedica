/**
 * CMS Icon Mapping
 * 
 * Mappa centralizzata per convertire nomi stringa in componenti icona Lucide.
 * Supporta case-insensitive lookup e alias alternativi.
 */

import {
  Shield, Users, Award, CheckCircle, Star, Search, Calendar, Activity, Lock,
  ChevronDown, ChevronUp, Phone, Mail, MapPin, Clock, Send,
  Stethoscope, ClipboardCheck, UserCheck, Syringe, ShieldCheck, FileText,
  GraduationCap, HardHat, UserCog, FileCheck, FileSignature, RefreshCw,
  Scale, Building2, Zap, Bell, Banknote, HeadphonesIcon, Database,
  Volume2, Monitor, FlaskConical, Dumbbell, Vibrate, Bug, Moon, Car,
  AlertCircle, AlertTriangle, XCircle, ArrowRight, ClipboardList, FileDigit, FileSearch,
  Heart, Sparkles, TrendingUp, Target, Briefcase, BookOpen, Play, BarChart3,
  Lightbulb, Megaphone, PieChart, Globe, Laptop, Settings,
  Brain, Eye, Baby, Microscope, Scan, TestTube2, Wifi, Cpu, Printer,
  CalendarCheck, UserPlus, CreditCard, MessageSquare, Navigation, Bus, ParkingCircle
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Icon mapping esteso per tutti i servizi CMS
 * Include alias per case sensitivity e nomi alternativi
 */
export const iconMap: Record<string, LucideIcon> = {
  // Core icons
  Shield, Users, Award, CheckCircle, Star, Search, Calendar, Activity, Lock,
  Stethoscope, ClipboardCheck, UserCheck, Syringe, ShieldCheck, FileText,
  GraduationCap, HardHat, UserCog, FileCheck, FileSignature, RefreshCw,
  Scale, Building2, Zap, Bell, Banknote, HeadphonesIcon, Database,
  Volume2, Monitor, FlaskConical, Dumbbell, Vibrate, Bug, Moon, Car,
  AlertCircle, AlertTriangle, XCircle, Phone, Mail, MapPin, Clock,
  ArrowRight, ClipboardList, FileDigit, FileSearch,
  Heart, Sparkles, TrendingUp, Target, Briefcase, BookOpen, Play, BarChart3,
  Lightbulb, Megaphone, PieChart, Globe, Laptop, Settings, Send,
  // Element Medica icons
  Brain, Eye, Baby, Microscope, Scan, TestTube2, Wifi, Cpu, Printer,
  CalendarCheck, UserPlus, CreditCard, MessageSquare, Navigation, Bus, ParkingCircle,
  ChevronDown, ChevronUp,
  
  // Case-insensitive aliases (lowercase versions)
  'filetext': FileText, 'Filetext': FileText, 'file-text': FileText,
  'building': Building2, 'building2': Building2, 'Building': Building2,
  'clipboard': ClipboardCheck, 'Clipboard': ClipboardCheck, 'clipboardcheck': ClipboardCheck,
  'clipboardlist': ClipboardList, 'Clipboardlist': ClipboardList, 'clipboard-list': ClipboardList,
  'filedigit': FileDigit, 'Filedigit': FileDigit, 'file-digit': FileDigit,
  'filesearch': FileSearch, 'Filesearch': FileSearch, 'file-search': FileSearch,
  'usercheck': UserCheck, 'Usercheck': UserCheck, 'user-check': UserCheck,
  'shieldcheck': ShieldCheck, 'Shieldcheck': ShieldCheck, 'shield-check': ShieldCheck,
  'checkCircle': CheckCircle, 'checkcircle': CheckCircle, 'check-circle': CheckCircle,
  'graduationcap': GraduationCap, 'Graduationcap': GraduationCap, 'graduation-cap': GraduationCap,
  'hardhat': HardHat, 'Hardhat': HardHat, 'hard-hat': HardHat,
  'usercog': UserCog, 'Usercog': UserCog, 'user-cog': UserCog,
  'filecheck': FileCheck, 'Filecheck': FileCheck, 'file-check': FileCheck,
  'filesignature': FileSignature, 'Filesignature': FileSignature, 'file-signature': FileSignature,
  'refreshcw': RefreshCw, 'Refreshcw': RefreshCw, 'refresh-cw': RefreshCw,
  'arrowright': ArrowRight, 'Arrowright': ArrowRight, 'arrow-right': ArrowRight,
  'stethoscope': Stethoscope, 'medical': Stethoscope,
  'phone': Phone, 'telephone': Phone,
  'mail': Mail, 'email': Mail, 'envelope': Mail,
  'mappin': MapPin, 'Mappin': MapPin, 'map-pin': MapPin, 'location': MapPin,
  'clock': Clock, 'time': Clock,
  'calendar': Calendar, 'date': Calendar,
  'calendarcheck': CalendarCheck, 'Calendarcheck': CalendarCheck, 'calendar-check': CalendarCheck,
  'brain': Brain, 'neurology': Brain,
  'eye': Eye, 'vision': Eye, 'ophthalmology': Eye,
  'heart': Heart, 'cardiology': Heart,
  'baby': Baby, 'pediatrics': Baby, 'child': Baby,
  'microscope': Microscope, 'lab': Microscope, 'laboratory': Microscope,
  'testtube2': TestTube2, 'Testtube2': TestTube2, 'test-tube': TestTube2, 'analysis': TestTube2,
  'scan': Scan, 'radiology': Scan, 'xray': Scan,
  'wifi': Wifi, 'wireless': Wifi,
  'cpu': Cpu, 'processor': Cpu, 'tech': Cpu,
  'printer': Printer, 'print': Printer,
  'userplus': UserPlus, 'Userplus': UserPlus, 'user-plus': UserPlus, 'register': UserPlus,
  'creditcard': CreditCard, 'Creditcard': CreditCard, 'credit-card': CreditCard, 'payment': CreditCard,
  'messagesquare': MessageSquare, 'Messagesquare': MessageSquare, 'message-square': MessageSquare, 'chat': MessageSquare,
  'navigation': Navigation, 'directions': Navigation,
  'bus': Bus, 'transport': Bus,
  'parkingcircle': ParkingCircle, 'Parkingcircle': ParkingCircle, 'parking-circle': ParkingCircle, 'parking': ParkingCircle,
  'barchart3': BarChart3, 'Barchart3': BarChart3, 'bar-chart': BarChart3, 'chart': BarChart3,
  'trendingup': TrendingUp, 'Trendingup': TrendingUp, 'trending-up': TrendingUp, 'growth': TrendingUp,
  'target': Target, 'goal': Target,
  'briefcase': Briefcase, 'work': Briefcase, 'job': Briefcase,
  'bookopen': BookOpen, 'Bookopen': BookOpen, 'book-open': BookOpen, 'education': BookOpen,
  'lightbulb': Lightbulb, 'idea': Lightbulb,
  'piechart': PieChart, 'Piechart': PieChart, 'pie-chart': PieChart,
  'globe': Globe, 'world': Globe, 'international': Globe,
  'laptop': Laptop, 'computer': Laptop,
  'settings': Settings, 'config': Settings, 'gear': Settings,
  'headphones': HeadphonesIcon, 'Headphones': HeadphonesIcon, 'support': HeadphonesIcon,
  'database': Database, 'data': Database,
  'zap': Zap, 'lightning': Zap, 'fast': Zap,
  'bell': Bell, 'notification': Bell, 'alert': Bell,
  'banknote': Banknote, 'money': Banknote,
  'alertcircle': AlertCircle, 'Alertcircle': AlertCircle, 'alert-circle': AlertCircle, 'warning': AlertCircle,
  'alerttriangle': AlertTriangle, 'Alerttriangle': AlertTriangle, 'alert-triangle': AlertTriangle, 'danger': AlertTriangle,
  'xcircle': XCircle, 'Xcircle': XCircle, 'x-circle': XCircle, 'error': XCircle, 'close': XCircle,
  'sparkles': Sparkles,
  'play': Play,
  'send': Send
};

/**
 * Helper function per ottenere un componente icona da stringa
 * @param iconName Nome dell'icona (case-insensitive)
 * @param fallback Icona di fallback (default: CheckCircle)
 */
export const getIconComponent = (
  iconName: string | undefined, 
  fallback: LucideIcon = CheckCircle
): LucideIcon => {
  if (!iconName) return fallback;
  return iconMap[iconName] || iconMap[iconName.toLowerCase()] || fallback;
};

// Re-export commonly used icons for convenience
export {
  Shield, Users, Award, CheckCircle, Star, Search, Calendar, Activity, Lock,
  ChevronDown, ChevronUp, Phone, Mail, MapPin, Clock, Send,
  Stethoscope, ClipboardCheck, UserCheck, Syringe, ShieldCheck, FileText,
  GraduationCap, HardHat, UserCog, FileCheck, FileSignature, RefreshCw,
  Scale, Building2, Zap, Bell, Banknote, HeadphonesIcon, Database,
  Volume2, Monitor, FlaskConical, Dumbbell, Vibrate, Bug, Moon, Car,
  AlertCircle, AlertTriangle, XCircle, ArrowRight, ClipboardList, FileDigit, FileSearch,
  Heart, Sparkles, TrendingUp, Target, Briefcase, BookOpen, Play, BarChart3,
  Lightbulb, Megaphone, PieChart, Globe, Laptop, Settings,
  Brain, Eye, Baby, Microscope, Scan, TestTube2, Wifi, Cpu, Printer,
  CalendarCheck, UserPlus, CreditCard, MessageSquare, Navigation, Bus, ParkingCircle
};

export type { LucideIcon };
