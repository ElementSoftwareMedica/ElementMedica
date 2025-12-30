/**
 * Info Cards - Information cards for PersonDetails
 * Personal, Contact, Work, Financial, Competencies info
 */

import React from 'react';
import { User, Mail, Briefcase, CreditCard, Award, Star } from 'lucide-react';
import type { PersonData, Company, Site } from './types';
import { STATUS_OPTIONS } from './types';
import { formatDate, formatDateForInput, formatCurrency, getStatusBadge, joinArrayField, parseArrayField } from './utils';

// Common input classes
const inputClasses = "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500";
const labelClasses = "block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1";
const valueClasses = "text-gray-900 dark:text-white";

interface InfoCardProps {
    person: PersonData;
    editedPerson: Partial<PersonData>;
    isEditing: boolean;
    onFieldChange: (field: keyof PersonData, value: any) => void;
    companies?: Company[];
    sites?: Site[];
}

// Personal Information Card
export const PersonalInfoCard: React.FC<InfoCardProps> = ({
    person,
    editedPerson,
    isEditing,
    onFieldChange,
}) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-purple-600" />
                Informazioni Personali
            </h3>
            <div className="space-y-4">
                <div>
                    <label className={labelClasses}>Nome</label>
                    {isEditing ? (
                        <input
                            type="text"
                            value={editedPerson.firstName || ''}
                            onChange={(e) => onFieldChange('firstName', e.target.value)}
                            className={inputClasses}
                        />
                    ) : (
                        <p className={valueClasses}>{person.firstName}</p>
                    )}
                </div>
                <div>
                    <label className={labelClasses}>Cognome</label>
                    {isEditing ? (
                        <input
                            type="text"
                            value={editedPerson.lastName || ''}
                            onChange={(e) => onFieldChange('lastName', e.target.value)}
                            className={inputClasses}
                        />
                    ) : (
                        <p className={valueClasses}>{person.lastName}</p>
                    )}
                </div>
                <div>
                    <label className={labelClasses}>Data di Nascita</label>
                    {isEditing ? (
                        <input
                            type="date"
                            value={formatDateForInput(editedPerson.birthDate)}
                            onChange={(e) => onFieldChange('birthDate', e.target.value)}
                            className={inputClasses}
                        />
                    ) : (
                        <p className={valueClasses}>{formatDate(person.birthDate)}</p>
                    )}
                </div>
                <div>
                    <label className={labelClasses}>Codice Fiscale</label>
                    {isEditing ? (
                        <input
                            type="text"
                            value={editedPerson.taxCode || ''}
                            onChange={(e) => onFieldChange('taxCode', e.target.value.toUpperCase())}
                            maxLength={16}
                            className={`${inputClasses} font-mono`}
                        />
                    ) : (
                        <p className={`${valueClasses} font-mono`}>{person.taxCode || 'N/A'}</p>
                    )}
                </div>
                <div>
                    <label className={labelClasses}>Username</label>
                    {isEditing ? (
                        <input
                            type="text"
                            value={editedPerson.username || ''}
                            onChange={(e) => onFieldChange('username', e.target.value)}
                            className={inputClasses}
                        />
                    ) : (
                        <p className={valueClasses}>{person.username ? `@${person.username}` : 'N/A'}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

// Contact Information Card
export const ContactInfoCard: React.FC<InfoCardProps> = ({
    person,
    editedPerson,
    isEditing,
    onFieldChange,
}) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                Contatti & Residenza
            </h3>
            <div className="space-y-4">
                <div>
                    <label className={labelClasses}>Email</label>
                    {isEditing ? (
                        <input
                            type="email"
                            value={editedPerson.email || ''}
                            onChange={(e) => onFieldChange('email', e.target.value)}
                            className={inputClasses}
                        />
                    ) : (
                        <p className={valueClasses}>{person.email || 'N/A'}</p>
                    )}
                </div>
                <div>
                    <label className={labelClasses}>Telefono</label>
                    {isEditing ? (
                        <input
                            type="tel"
                            value={editedPerson.phone || ''}
                            onChange={(e) => onFieldChange('phone', e.target.value)}
                            className={inputClasses}
                        />
                    ) : (
                        <p className={valueClasses}>{person.phone || 'N/A'}</p>
                    )}
                </div>
                <div>
                    <label className={labelClasses}>Indirizzo</label>
                    {isEditing ? (
                        <input
                            type="text"
                            value={editedPerson.residenceAddress || ''}
                            onChange={(e) => onFieldChange('residenceAddress', e.target.value)}
                            className={inputClasses}
                        />
                    ) : (
                        <p className={valueClasses}>{person.residenceAddress || 'N/A'}</p>
                    )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <div>
                        <label className={labelClasses}>Città</label>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editedPerson.residenceCity || ''}
                                onChange={(e) => onFieldChange('residenceCity', e.target.value)}
                                className={inputClasses}
                            />
                        ) : (
                            <p className={valueClasses}>{person.residenceCity || 'N/A'}</p>
                        )}
                    </div>
                    <div>
                        <label className={labelClasses}>Prov.</label>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editedPerson.province || ''}
                                onChange={(e) => onFieldChange('province', e.target.value.toUpperCase())}
                                maxLength={2}
                                className={inputClasses}
                            />
                        ) : (
                            <p className={valueClasses}>{person.province || 'N/A'}</p>
                        )}
                    </div>
                    <div>
                        <label className={labelClasses}>CAP</label>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editedPerson.postalCode || ''}
                                onChange={(e) => onFieldChange('postalCode', e.target.value)}
                                maxLength={5}
                                className={inputClasses}
                            />
                        ) : (
                            <p className={valueClasses}>{person.postalCode || 'N/A'}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Work Information Card
export const WorkInfoCard: React.FC<InfoCardProps> = ({
    person,
    editedPerson,
    isEditing,
    onFieldChange,
    companies = [],
    sites = [],
}) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-green-600" />
                Informazioni Lavorative
            </h3>
            <div className="space-y-4">
                <div>
                    <label className={labelClasses}>Titolo / Posizione</label>
                    {isEditing ? (
                        <input
                            type="text"
                            value={editedPerson.title || ''}
                            onChange={(e) => onFieldChange('title', e.target.value)}
                            className={inputClasses}
                        />
                    ) : (
                        <p className={valueClasses}>{person.title || 'N/A'}</p>
                    )}
                </div>
                <div>
                    <label className={labelClasses}>Azienda</label>
                    {isEditing ? (
                        <select
                            value={editedPerson.companyId || ''}
                            onChange={(e) => onFieldChange('companyId', e.target.value || null)}
                            className={inputClasses}
                        >
                            <option value="">-- Nessuna azienda --</option>
                            {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.ragioneSociale || c.name}</option>
                            ))}
                        </select>
                    ) : (
                        <p className={valueClasses}>{person.company?.ragioneSociale || person.company?.name || 'N/A'}</p>
                    )}
                </div>
                <div>
                    <label className={labelClasses}>Sede</label>
                    {isEditing ? (
                        <select
                            value={editedPerson.siteId || ''}
                            onChange={(e) => onFieldChange('siteId', e.target.value || null)}
                            className={inputClasses}
                        >
                            <option value="">-- Nessuna sede --</option>
                            {sites.map(s => (
                                <option key={s.id} value={s.id}>{s.siteName} {s.citta && `(${s.citta})`}</option>
                            ))}
                        </select>
                    ) : (
                        <p className={valueClasses}>
                            {person.site?.siteName || 'N/A'}
                            {person.site?.citta && ` (${person.site.citta})`}
                        </p>
                    )}
                </div>
                <div>
                    <label className={labelClasses}>Reparto</label>
                    {isEditing ? (
                        <input
                            type="text"
                            value={editedPerson.reparto || ''}
                            onChange={(e) => onFieldChange('reparto', e.target.value)}
                            className={inputClasses}
                        />
                    ) : (
                        <p className={valueClasses}>{person.reparto || 'N/A'}</p>
                    )}
                </div>
                <div>
                    <label className={labelClasses}>Data Assunzione</label>
                    {isEditing ? (
                        <input
                            type="date"
                            value={formatDateForInput(editedPerson.hiredDate)}
                            onChange={(e) => onFieldChange('hiredDate', e.target.value)}
                            className={inputClasses}
                        />
                    ) : (
                        <p className={valueClasses}>{formatDate(person.hiredDate)}</p>
                    )}
                </div>
                <div>
                    <label className={labelClasses}>Status</label>
                    {isEditing ? (
                        <select
                            value={editedPerson.status || 'ACTIVE'}
                            onChange={(e) => onFieldChange('status', e.target.value)}
                            className={inputClasses}
                        >
                            {STATUS_OPTIONS.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    ) : (
                        getStatusBadge(person.status)
                    )}
                </div>
            </div>
        </div>
    );
};

// Financial Information Card
export const FinancialInfoCard: React.FC<InfoCardProps> = ({
    person,
    editedPerson,
    isEditing,
    onFieldChange,
}) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-yellow-600" />
                Dati Fiscali & Finanziari
            </h3>
            <div className="space-y-4">
                <div>
                    <label className={labelClasses}>Partita IVA</label>
                    {isEditing ? (
                        <input
                            type="text"
                            value={editedPerson.vatNumber || ''}
                            onChange={(e) => onFieldChange('vatNumber', e.target.value)}
                            maxLength={11}
                            className={`${inputClasses} font-mono`}
                        />
                    ) : (
                        <p className={`${valueClasses} font-mono`}>{person.vatNumber || 'N/A'}</p>
                    )}
                </div>
                <div>
                    <label className={labelClasses}>IBAN</label>
                    {isEditing ? (
                        <input
                            type="text"
                            value={editedPerson.iban || ''}
                            onChange={(e) => onFieldChange('iban', e.target.value.toUpperCase())}
                            maxLength={34}
                            className={`${inputClasses} font-mono text-xs`}
                        />
                    ) : (
                        <p className={`${valueClasses} font-mono text-xs`}>{person.iban || 'N/A'}</p>
                    )}
                </div>
                <div>
                    <label className={labelClasses}>Tariffa Oraria (€)</label>
                    {isEditing ? (
                        <input
                            type="number"
                            step="0.01"
                            value={editedPerson.hourlyRate || ''}
                            onChange={(e) => onFieldChange('hourlyRate', parseFloat(e.target.value) || null)}
                            className={inputClasses}
                        />
                    ) : (
                        <p className={valueClasses}>{formatCurrency(person.hourlyRate)}</p>
                    )}
                </div>
                <div>
                    <label className={labelClasses}>Codice Registro</label>
                    {isEditing ? (
                        <input
                            type="text"
                            value={editedPerson.registerCode || ''}
                            onChange={(e) => onFieldChange('registerCode', e.target.value)}
                            className={`${inputClasses} font-mono`}
                        />
                    ) : (
                        <p className={`${valueClasses} font-mono`}>{person.registerCode || 'N/A'}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

// Competencies Card
export const CompetenciesCard: React.FC<InfoCardProps> = ({
    person,
    editedPerson,
    isEditing,
    onFieldChange,
}) => {
    const handleArrayChange = (field: 'certifications' | 'specialties', value: string) => {
        onFieldChange(field, parseArrayField(value));
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-orange-600" />
                Competenze & Certificazioni
            </h3>
            <div className="space-y-4">
                <div>
                    <label className={labelClasses}>
                        Certificazioni (separate da virgola)
                    </label>
                    {isEditing ? (
                        <textarea
                            value={joinArrayField(editedPerson.certifications)}
                            onChange={(e) => handleArrayChange('certifications', e.target.value)}
                            rows={3}
                            className={inputClasses}
                            placeholder="Es: Primo Soccorso, Antincendio, RSPP..."
                        />
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {person.certifications?.length ? (
                                person.certifications.map((cert, idx) => (
                                    <span
                                        key={idx}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-xs"
                                    >
                                        <Award className="w-3 h-3" />
                                        {cert}
                                    </span>
                                ))
                            ) : (
                                <p className="text-gray-500 dark:text-gray-400 text-sm">Nessuna certificazione</p>
                            )}
                        </div>
                    )}
                </div>
                <div>
                    <label className={labelClasses}>
                        Specializzazioni (separate da virgola)
                    </label>
                    {isEditing ? (
                        <textarea
                            value={joinArrayField(editedPerson.specialties)}
                            onChange={(e) => handleArrayChange('specialties', e.target.value)}
                            rows={3}
                            className={inputClasses}
                            placeholder="Es: Formazione Sicurezza, HACCP, Privacy..."
                        />
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {person.specialties?.length ? (
                                person.specialties.map((spec, idx) => (
                                    <span
                                        key={idx}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs"
                                    >
                                        <Star className="w-3 h-3" />
                                        {spec}
                                    </span>
                                ))
                            ) : (
                                <p className="text-gray-500 dark:text-gray-400 text-sm">Nessuna specializzazione</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default {
    PersonalInfoCard,
    ContactInfoCard,
    WorkInfoCard,
    FinancialInfoCard,
    CompetenciesCard,
};
