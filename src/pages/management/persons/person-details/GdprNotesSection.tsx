/**
 * GdprNotesSection - GDPR compliance and notes section
 */

import React from 'react';
import { Lock, UserCheck, FileText } from 'lucide-react';
import type { PersonData } from './types';
import { formatDate, formatDateForInput, formatDateTime } from './utils';
import { DatePickerElegante } from '../../../../components/ui/DatePickerElegante';

interface GdprNotesSectionProps {
    person: PersonData;
    editedPerson: Partial<PersonData>;
    isEditing: boolean;
    onFieldChange: (field: keyof PersonData, value: any) => void;
}

// Common input classes
const inputClasses = "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500";
const labelClasses = "block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1";

// GDPR Section Component
export const GdprSection: React.FC<GdprNotesSectionProps> = ({
    person,
    editedPerson,
    isEditing,
    onFieldChange,
}) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-green-600" />
                Conformità GDPR
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className={labelClasses}>Data Consenso GDPR</label>
                    {isEditing ? (
                        <DatePickerElegante
                            value={formatDateForInput(editedPerson.gdprConsentDate)}
                            onChange={(date) => onFieldChange('gdprConsentDate', date ? date.toISOString().split('T')[0] : '')}
                            theme="blue"
                        />
                    ) : (
                        <p className="text-gray-900 dark:text-white">
                            {person.gdprConsentDate ? (
                                <span className="flex items-center gap-2 text-green-600">
                                    <UserCheck className="w-4 h-4" />
                                    {formatDate(person.gdprConsentDate)}
                                </span>
                            ) : (
                                <span className="text-amber-600">Non fornito</span>
                            )}
                        </p>
                    )}
                </div>
                <div>
                    <label className={labelClasses}>Versione Consenso</label>
                    {isEditing ? (
                        <input
                            type="text"
                            value={editedPerson.gdprConsentVersion || ''}
                            onChange={(e) => onFieldChange('gdprConsentVersion', e.target.value)}
                            className={`${inputClasses} font-mono`}
                        />
                    ) : (
                        <p className="text-gray-900 dark:text-white font-mono">{person.gdprConsentVersion || 'N/A'}</p>
                    )}
                </div>
                <div>
                    <label className={labelClasses}>Conservazione Dati Fino A</label>
                    {isEditing ? (
                        <DatePickerElegante
                            value={formatDateForInput(editedPerson.dataRetentionUntil)}
                            onChange={(date) => onFieldChange('dataRetentionUntil', date ? date.toISOString().split('T')[0] : '')}
                            theme="blue"
                        />
                    ) : (
                        <p className="text-gray-900 dark:text-white">{formatDate(person.dataRetentionUntil)}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

// Notes Section Component
export const NotesSection: React.FC<GdprNotesSectionProps> = ({
    person,
    editedPerson,
    isEditing,
    onFieldChange,
}) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-600" />
                Note
            </h3>
            {isEditing ? (
                <textarea
                    value={editedPerson.notes || ''}
                    onChange={(e) => onFieldChange('notes', e.target.value)}
                    rows={4}
                    className={inputClasses}
                    placeholder="Note aggiuntive sulla persona..."
                />
            ) : (
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {person.notes || 'Nessuna nota'}
                </p>
            )}
        </div>
    );
};

// Timestamps Component
export const Timestamps: React.FC<{ person: PersonData }> = ({ person }) => {
    return (
        <div className="text-sm text-gray-500 dark:text-gray-400 flex flex-wrap gap-4">
            <span>Creato il: {formatDateTime(person.createdAt)}</span>
            <span>Ultimo aggiornamento: {formatDateTime(person.updatedAt)}</span>
        </div>
    );
};

export default {
    GdprSection,
    NotesSection,
    Timestamps,
};
