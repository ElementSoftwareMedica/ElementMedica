/**
 * Utility: roleHelpers
 * 
 * Visual styling helpers for role hierarchy display.
 * Provides colors, icons, and labels for different hierarchy levels.
 */

import React from 'react';
import { 
  Crown, 
  Star, 
  Award, 
  Building, 
  UserCheck, 
  Users, 
  Shield 
} from 'lucide-react';

/**
 * Gets the Tailwind CSS classes for a given hierarchy level
 */
export const getLevelColor = (level: number): string => {
  const colors = {
    0: 'bg-gradient-to-r from-purple-100 to-purple-200 border-purple-400 text-purple-900',
    1: 'bg-gradient-to-r from-red-100 to-red-200 border-red-400 text-red-900',
    2: 'bg-gradient-to-r from-orange-100 to-orange-200 border-orange-400 text-orange-900',
    3: 'bg-gradient-to-r from-yellow-100 to-yellow-200 border-yellow-400 text-yellow-900',
    4: 'bg-gradient-to-r from-blue-100 to-blue-200 border-blue-400 text-blue-900',
    5: 'bg-gradient-to-r from-green-100 to-green-200 border-green-400 text-green-900'
  };
  return colors[level as keyof typeof colors] || 'bg-gradient-to-r from-gray-100 to-gray-200 border-gray-400 text-gray-900';
};

/**
 * Gets the icon component for a given hierarchy level
 */
export const getLevelIcon = (level: number) => {
  const icons = {
    0: <Crown className="w-5 h-5" />,
    1: <Star className="w-5 h-5" />,
    2: <Award className="w-5 h-5" />,
    3: <Building className="w-5 h-5" />,
    4: <UserCheck className="w-5 h-5" />,
    5: <Users className="w-5 h-5" />
  };
  return icons[level as keyof typeof icons] || <Shield className="w-5 h-5" />;
};

/**
 * Gets the display name for a given hierarchy level
 */
export const getLevelName = (level: number): string => {
  const names = {
    0: 'Super Amministratore',
    1: 'Amministratore',
    2: 'Amministratore Aziendale',
    3: 'Manager',
    4: 'Formatore',
    5: 'Dipendente'
  };
  return names[level as keyof typeof names] || `Livello ${level}`;
};

/**
 * Gets a smaller icon for individual role cards based on role type
 */
export const getRoleIcon = (roleType: string) => {
  if (roleType.includes('SUPER_ADMIN')) return <Crown className="w-4 h-4 text-purple-600" />;
  if (roleType.includes('ADMIN')) return <Star className="w-4 h-4 text-red-600" />;
  if (roleType.includes('MANAGER')) return <Award className="w-4 h-4 text-orange-600" />;
  if (roleType.includes('TRAINER')) return <UserCheck className="w-4 h-4 text-blue-600" />;
  return <Users className="w-4 h-4 text-green-600" />;
};
