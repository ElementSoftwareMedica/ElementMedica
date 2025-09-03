import React from 'react';
// removed react-router-dom imports; navigation handled via PublicButton.to
import { 
  ArrowRight,
  Award,
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

interface CourseCardProps {
  course: Course;
  getRiskLevelLabel: (riskLevel: string) => string;
  getCourseTypeLabel: (courseType: string) => string;
}

/**
 * Card per visualizzare un corso nella pagina pubblica
 * Design moderno con informazioni essenziali
 */
export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  getRiskLevelLabel,
  getCourseTypeLabel
}) => {
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

  const trackInfoClick = () => {
    const href = '/contatti?corso=' + course.slug;
    trackCtaEvent({ resource: 'public', action: 'cta_click', details: { label: 'Richiedi Info', href, section: 'CourseCard', course: course.slug, title: course.title } });
  };

  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden group">
      {/* Image */}
      <div className="relative h-48 bg-gradient-to-br from-primary-500 to-primary-600 overflow-hidden">
        {course.image1Url ? (
          <img
            src={course.image1Url}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Award className="w-16 h-16 text-white/80" />
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <PublicBadge variant={getRiskLevelVariant(course.riskLevel)} size="sm">
            {getRiskLevelLabel(course.riskLevel)}
          </PublicBadge>
          <PublicBadge variant={getCourseTypeVariant(course.courseType)} size="sm">
            {getCourseTypeLabel(course.courseType)}
          </PublicBadge>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Category */}
        <div className="text-sm text-primary-700 font-medium mb-2">
          {course.category}
          {course.subcategory && (
            <span className="text-gray-600"> • {course.subcategory}</span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
          {course.title}
        </h3>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {course.shortDescription}
        </p>

        {/* Course Info */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-6">
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            <span>{course.duration}h</span>
          </div>
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-1" />
            <span>Max {course.maxParticipants}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <PublicButton
            to={`/corsi/${course.slug}`}
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
            to={`/contatti?corso=${course.slug}`}
            onClick={trackInfoClick}
          >
            Richiedi Info
          </PublicButton>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;