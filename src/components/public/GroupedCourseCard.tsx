import React, { useState } from 'react';
import { 
  ArrowRight,
  Award,
  ChevronDown,
  ChevronUp,
  Clock,
  Users
} from 'lucide-react';
import { PublicButton } from './PublicButton';
import { PublicBadge } from './PublicBadge';
import { trackCtaEvent } from '../../services/logs';

interface Course {
  id: string;
  title: string;
  shortDescription: string;
  category: string;
  subcategory?: string;
  riskLevel: 'ALTO' | 'MEDIO' | 'BASSO' | 'A' | 'B' | 'C';
  courseType: 'PRIMO_CORSO' | 'AGGIORNAMENTO';
  duration: number;
  maxParticipants: number;
  image1Url?: string;
  slug: string;
}

interface GroupedCourse {
  title: string;
  category: string;
  variants: Course[];
  mainCourse: Course; // Il corso principale da mostrare
}

interface GroupedCourseCardProps {
  groupedCourse: GroupedCourse;
  getRiskLevelLabel: (riskLevel: string) => string;
  getCourseTypeLabel: (courseType: string) => string;
}

/**
 * Card per visualizzare corsi raggruppati per titolo
 * Mostra il corso principale e permette di espandere per vedere le varianti
 */
export const GroupedCourseCard: React.FC<GroupedCourseCardProps> = ({
  groupedCourse,
  getRiskLevelLabel,
  getCourseTypeLabel
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { mainCourse, variants } = groupedCourse;
  // Navigazione gestita tramite PublicButton.to

  const getRiskLevelVariant = (riskLevel: string): 'red' | 'yellow' | 'green' | 'gray' => {
    switch (riskLevel) {
      case 'ALTO':
      case 'A':
        return 'red';
      case 'MEDIO':
      case 'B':
        return 'yellow';
      case 'BASSO':
      case 'C':
        return 'green';
      default:
        return 'gray';
    }
  };

  const getCourseTypeVariant = (courseType: string): 'blue' | 'purple' | 'gray' => {
    switch (courseType) {
      case 'PRIMO_CORSO':
        return 'blue';
      case 'AGGIORNAMENTO':
        return 'purple';
      default:
        return 'gray';
    }
  };

  // Crea un URL unificato per il corso raggruppato
  const unifiedSlug = encodeURIComponent(groupedCourse.title.toLowerCase().replace(/\s+/g, '-'));

  const trackInfoClick = (label: string, href: string, extra?: Record<string, any>) => {
    trackCtaEvent({ resource: 'public', action: 'cta_click', details: { label, href, section: 'GroupedCourseCard', title: groupedCourse.title, ...extra } });
  };

  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden group">
      {/* Image */}
      <div className="relative h-48 bg-gradient-to-br from-primary-500 to-primary-600 overflow-hidden">
        {mainCourse.image1Url ? (
          <img
            src={mainCourse.image1Url}
            alt={mainCourse.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Award className="w-16 h-16 text-white/80" />
          </div>
        )}
        
        {/* Variants Count Badge */}
        {variants.length > 1 && (
          <div className="absolute top-4 right-4">
            <span className="bg-white/90 text-primary-700 px-3 py-1 rounded-full text-xs font-medium">
              {variants.length} varianti
            </span>
          </div>
        )}

        {/* Main Course Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <PublicBadge variant={getRiskLevelVariant(mainCourse.riskLevel)} size="sm">
            {getRiskLevelLabel(mainCourse.riskLevel)}
          </PublicBadge>
          <PublicBadge variant={getCourseTypeVariant(mainCourse.courseType)} size="sm">
            {getCourseTypeLabel(mainCourse.courseType)}
          </PublicBadge>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Category */}
        <div className="text-sm text-primary-700 font-medium mb-2">
          {mainCourse.category}
          {mainCourse.subcategory && (
            <span className="text-gray-600"> • {mainCourse.subcategory}</span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
          {groupedCourse.title}
        </h3>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {mainCourse.shortDescription}
        </p>

        {/* Course Info */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            <span>{mainCourse.duration}h</span>
          </div>
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-1" />
            <span>Max {mainCourse.maxParticipants}</span>
          </div>
        </div>

        {/* Variants Toggle */}
        {variants.length > 1 && (
          <div className="mb-4">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">
                Vedi tutte le varianti ({variants.length})
              </span>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {/* Expanded Variants */}
            {isExpanded && (
              <div className="mt-3 space-y-2">
                {variants.map((variant) => (
                  <div key={variant.id} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <PublicBadge variant={getRiskLevelVariant(variant.riskLevel)} size="sm">
                          {getRiskLevelLabel(variant.riskLevel)}
                        </PublicBadge>
                        <PublicBadge variant={getCourseTypeVariant(variant.courseType)} size="sm">
                          {getCourseTypeLabel(variant.courseType)}
                        </PublicBadge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {variant.duration}h
                        </span>
                        <span className="flex items-center">
                          <Users className="w-3 h-3 mr-1" />
                          Max {variant.maxParticipants}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <PublicButton to={`/corsi/${variant.slug}`} variant="outline" size="sm" className="w-full">
                        Dettagli
                      </PublicButton>
                      <PublicButton
                        variant="ghost"
                        size="sm"
                        to={`/contatti?corso=${variant.slug}`}
                        onClick={() => trackInfoClick('Info variante', '/contatti?corso=' + variant.slug, { course: variant.slug })}
                      >
                        Info
                      </PublicButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Main Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <PublicButton
            to={`/corsi/unified/${encodeURIComponent(groupedCourse.title)}`}
            variant="primary"
            size="sm"
            className="w-full group flex-1"
          >
            Scopri di più
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </PublicButton>
          <PublicButton
            variant="outline"
            size="sm"
            to={`/contatti?corso=${unifiedSlug}`}
            onClick={() => trackInfoClick('Richiedi Info', '/contatti?corso=' + unifiedSlug, { unifiedSlug })}
          >
            Richiedi Info
          </PublicButton>
        </div>
      </div>
    </div>
  );
};

export default GroupedCourseCard;