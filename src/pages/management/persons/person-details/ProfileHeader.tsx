/**
 * ProfileHeader - Profile header with avatar and quick info
 */

import React from 'react';
import { Mail, Phone, Building2, Clock } from 'lucide-react';
import type { PersonData } from './types';
import { formatDateTime, getStatusBadge, getRoleBadgeColor, getRoleLabel, getInitials } from './utils';

interface ProfileHeaderProps {
    person: PersonData;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ person }) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-start gap-6">
                {/* Avatar */}
                <div className="flex-shrink-0">
                    {person.profileImage ? (
                        <img
                            src={person.profileImage}
                            alt={`${person.firstName} ${person.lastName}`}
                            className="w-24 h-24 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                            <span className="text-2xl font-bold text-white">
                                {getInitials(person.firstName, person.lastName)}
                            </span>
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {person.firstName} {person.lastName}
                        </h2>
                        {getStatusBadge(person.status)}
                        {person.globalRole && (
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(person.globalRole)}`}>
                                {getRoleLabel(person.globalRole)}
                            </span>
                        )}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-1">{person.title || 'Nessun titolo'}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                        {person.username && <span className="mr-3">@{person.username}</span>}
                        {person.taxCode && <span className="font-mono">{person.taxCode}</span>}
                    </p>

                    {/* Quick info */}
                    <div className="flex flex-wrap gap-4 mt-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Mail className="w-4 h-4" />
                            {person.email || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Phone className="w-4 h-4" />
                            {person.phone || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Building2 className="w-4 h-4" />
                            {person.company?.ragioneSociale || person.company?.name || 'Nessuna azienda'}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Clock className="w-4 h-4" />
                            Ultimo accesso: {formatDateTime(person.lastLogin)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileHeader;
