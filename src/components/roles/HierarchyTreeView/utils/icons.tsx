import React from 'react';
import { Crown, Star, Award, UserCheck, Building, Users } from 'lucide-react';

/**
 * Utility per ottenere l'icona appropriata per un ruolo
 * Basato sul tipo di ruolo e sul livello gerarchico
 */
export const getRoleIcon = (level: number, roleType: string): React.ReactNode => {
  if (roleType.includes('SUPER_ADMIN')) return <Crown className="w-4 h-4 text-purple-600" />;
  if (roleType.includes('ADMIN')) return <Star className="w-4 h-4 text-red-600" />;
  if (roleType.includes('MANAGER')) return <Award className="w-4 h-4 text-orange-600" />;
  if (roleType.includes('TRAINER')) return <UserCheck className="w-4 h-4 text-blue-600" />;
  if (level <= 2) return <Building className="w-4 h-4 text-indigo-600" />;
  return <Users className="w-4 h-4 text-green-600" />;
};
