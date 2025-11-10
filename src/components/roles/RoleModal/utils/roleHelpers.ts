/**
 * Role Helper Utilities
 * 
 * Helper functions for role management and hierarchy calculations.
 */

import { useMemo } from 'react';
import { 
  Users, 
  Building2, 
  BookOpen, 
  Calendar, 
  Shield, 
  TreePine, 
  Database,
  Building,
  Layers,
  FileText,
  MessageSquare,
  Globe
} from 'lucide-react';

/**
 * Entity icon mapping
 */
export const useEntityIcons = () => {
  return useMemo(() => ({
    persons: Users,
    companies: Building2,
    courses: BookOpen,
    trainings: Calendar,
    roles: Shield,
    hierarchy: TreePine,
    documents: Database,
    sites: Building,
    reparti: Layers,
    form_templates: FileText,
    form_submissions: MessageSquare,
    public_cms: Globe,
    templates: FileText
  }), []);
};

/**
 * Get icon component for entity name
 */
export const getEntityIcon = (entityName: string, entityIcons: Record<string, React.ComponentType<any>>) => {
  return entityIcons[entityName] || Database;
};
