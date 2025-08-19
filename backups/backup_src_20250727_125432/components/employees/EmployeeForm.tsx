import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { apiGet, apiPost, apiPut, apiUpload } from '../../services/api';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  taxCode: string;
  birthDate?: string;
  residenceAddress?: string;
  residenceCity?: string;
  province?: string;
  postalCode?: string;
  companyId?: string;
  title?: string;
  email?: string;
  phone?: string;
  notes?: string;
  status?: string;
  hiredDate?: string;
  profileImage?: string;
}

interface EmployeeFormProps {
  employee?: Employee;
  companies: any[];
  onSubmit: () => void;
  onCancel: () => void;
}

interface Company {
  id: string;
  ragioneSociale: string;
}

const TAX_CODE_REGEX = /^[a-zA-Z]{6}[0-9]{2}[abcdehlmprstABCDEHLMPRST]{1}[0-9]{2}([a-zA-Z]{1}[0-9]{3})[a-zA-Z]{1}$/;

const extractBirthDateFromCF = (cf: string): string | null => {
  if (!cf || cf.length < 11) return null;
  const months = ['A','B','C','D','E','H','L','M','P','R','S','T'];
  const year = parseInt(cf.substr(6, 2), 10);
  const currentYear = new Date().getFullYear() % 100;
  const fullYear = year > currentYear ? 1900 + year : 2000 + year;
  const monthCode = cf.substr(8, 1).toUpperCase();
  const month = months.indexOf(monthCode) + 1;
  let day = parseInt(cf.substr(9, 2), 10);
  if (day > 40) day -= 40;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export const EmployeeForm: React.FC<EmployeeFormProps> = ({ 
  employee, 
  companies: externalCompanies, 
  onSubmit,
  onCancel 
}) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [formData, setFormData] = useState<Partial<Employee>>({
    firstName: '',
    lastName: '',
    taxCode: '',
    birthDate: '',
    residenceAddress: '',
    residenceCity: '',
    province: '',
    postalCode: '',
    companyId: '',
    title: '',
    email: '',
    phone: '',
    notes: '',
    status: 'Active',
    hiredDate: '',
    profileImage: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (externalCompanies && externalCompanies.length > 0) {
      setCompanies(externalCompanies);
    } else {
      fetchCompanies();
    }
    if (employee) {
      setFormData(employee);
    }
  }, [employee, externalCompanies]);

  useEffect(() => {
    if (formData.taxCode && formData.taxCode.length >= 11) {
      const extracted = extractBirthDateFromCF(formData.taxCode);
      if (extracted) {
        setFormData((prev) => ({ ...prev, birthDate: extracted }));
        setError('');
      } else {
        setError('Codice Fiscale non valido o data di nascita non estraibile');
      }
    }
  }, [formData.taxCode]);

  const fetchCompanies = async () => {
    try {
      const data = await apiGet<Company[]>('/api/companies');
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      setCompanies([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.firstName || !formData.lastName || !formData.taxCode || !formData.companyId) {
      setError('Nome, Cognome, Codice Fiscale e Azienda sono obbligatori');
      return;
    }
    if (!TAX_CODE_REGEX.test(formData.taxCode)) {
      setError('Codice Fiscale non valido');
      return;
    }
    try {
      const body = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        taxCode: formData.taxCode,
        birthDate: formData.birthDate ? new Date(formData.birthDate) : undefined,
        residenceAddress: formData.residenceAddress,
        residenceCity: formData.residenceCity,
        province: formData.province,
        postalCode: formData.postalCode,
        companyId: formData.companyId,
        title: formData.title,
        email: formData.email,
        phone: formData.phone,
        notes: formData.notes,
        status: formData.status,
        hiredDate: formData.hiredDate ? new Date(formData.hiredDate) : undefined,
        profileImage: formData.profileImage || undefined,
      };
      
      // Usa il servizio API centralizzato
      if (employee) {
        await apiPut(`/api/v1/persons/${employee.id}`, body);
      } else {
        await apiPost('/api/v1/persons', body);
      }
      
      onSubmit();
    } catch (error: any) {
      // Gestione specifica per errore 409 (conflitto codice fiscale)
      if (error?.response?.status === 409) {
        setError('Un altro dipendente ha già questo Codice Fiscale.');
        return;
      }
      setError('Errore durante il salvataggio');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('photo', file);
    try {
      const data = await apiUpload<{ url: string }>('/api/upload', form);
      if (data.url) {
        setFormData((prev) => ({ ...prev, profileImage: data.url }));
      }
    } catch (error) {
      console.error('Errore durante l\'upload della foto:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col items-center mb-4">
        {formData.profileImage ? (
          <img src={formData.profileImage} alt="Foto dipendente" className="w-24 h-24 rounded-full object-cover mb-2 border" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mb-2 text-2xl text-gray-400">?
          </div>
        )}
        <label className="block">
          <span className="sr-only">Carica foto</span>
          <input type="file" accept="image/*" onChange={handlePhotoChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
        </label>
        {formData.profileImage && (
          <button type="button" className="text-xs text-red-500 mt-1" onClick={() => setFormData((prev) => ({ ...prev, profileImage: '' }))}>
            Rimuovi foto
          </button>
        )}
      </div>
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">
          {employee ? 'Edit Employee' : 'Add Employee'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
            Nome
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
            Cognome
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>
        <div>
          <label htmlFor="taxCode" className="block text-sm font-medium text-gray-700">
            Codice Fiscale
          </label>
          <input
            type="text"
            id="taxCode"
            name="taxCode"
            value={formData.taxCode || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
            disabled={!!employee}
          />
          {formData.taxCode && (
            <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${
              TAX_CODE_REGEX.test(formData.taxCode) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {TAX_CODE_REGEX.test(formData.taxCode) ? 'Codice Fiscale valido' : 'Codice Fiscale non valido'}
            </span>
          )}
        </div>
        <div>
          <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">
            Data di Nascita
          </label>
          <input
            type="date"
            id="birthDate"
            name="birthDate"
            value={formData.birthDate || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="residenceAddress" className="block text-sm font-medium text-gray-700">
            Via di Residenza
          </label>
          <input
            type="text"
            id="residenceAddress"
            name="residenceAddress"
            value={formData.residenceAddress || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="residenceCity" className="block text-sm font-medium text-gray-700">
            Comune di Residenza
          </label>
          <input
            type="text"
            id="residenceCity"
            name="residenceCity"
            value={formData.residenceCity || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="province" className="block text-sm font-medium text-gray-700">
            Provincia
          </label>
          <input
            type="text"
            id="province"
            name="province"
            value={formData.province || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">
            CAP
          </label>
          <input
            type="text"
            id="postalCode"
            name="postalCode"
            value={formData.postalCode || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="companyId" className="block text-sm font-medium text-gray-700">
            Azienda
          </label>
          <select
            id="companyId"
            name="companyId"
            value={formData.companyId || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">Seleziona azienda</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>{company.ragioneSociale}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Profilo Professionale
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Mail
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Telefono
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Note
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            rows={2}
          />
        </div>
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            Stato
          </label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="Active">Attivo</option>
            <option value="Inactive">Non attivo</option>
          </select>
        </div>
        <div>
          <label htmlFor="hiredDate" className="block text-sm font-medium text-gray-700">
            Data di Assunzione
          </label>
          <input
            type="date"
            id="hiredDate"
            name="hiredDate"
            value={formData.hiredDate || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow"
        >
          {employee ? 'Update' : 'Add'} Employee
        </button>
      </div>
    </form>
  );
};