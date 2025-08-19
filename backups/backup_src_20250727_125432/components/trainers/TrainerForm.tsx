import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, Mail, Award, Plus, X } from 'lucide-react';
import Select from 'react-select';
import { getCourses } from '../../services/courses';

type Trainer = {
  id?: string;
  firstName: string;
  lastName: string;
  taxCode?: string;
  phone?: string;
  email?: string;
  certifications?: string[];
  vatNumber?: string;
  hourlyRate?: string;
  registerCode?: string;
  iban?: string;
  birthDate?: string | null;
  residenceAddress?: string;
  residenceCity?: string;
  province?: string;
  postalCode?: string;
  notes?: string;
  specialties: string[];
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};
type TrainerInsert = Omit<Trainer, 'id' | 'createdAt' | 'updatedAt'>;
type Certification = { id: string; name: string; description?: string };

interface TrainerFormProps {
  trainer?: Trainer;
  onSubmit: (data: TrainerInsert) => Promise<void>;
  onCancel: () => void;
}

const SPECIALTIES = [
  'First Aid',
  'Safety Training',
  'Health & Wellness',
  'Emergency Response',
  'Fire Safety',
  'Ergonomics',
  'Environmental Safety',
  'Risk Assessment',
  'Leadership',
  'Communication'
];

export default function TrainerForm({ trainer, onSubmit, onCancel }: TrainerFormProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [certOptions, setCertOptions] = useState<{ value: string; label: string }[]>([]);

  const [formData, setFormData] = useState<TrainerInsert>({
    firstName: '',
    lastName: '',
    taxCode: '',
    phone: '',
    email: '',
    certifications: [],
    vatNumber: '',
    hourlyRate: '',
    registerCode: '',
    iban: '',
    birthDate: '',
    residenceAddress: '',
    residenceCity: '',
    province: '',
    postalCode: '',
    notes: '',
    status: 'Active',
    specialties: [],
  });

  useEffect(() => {
    if (trainer) {
      setFormData({
        firstName: trainer.firstName ?? '',
        lastName: trainer.lastName ?? '',
        taxCode: trainer.taxCode ?? '',
        phone: trainer.phone ?? '',
        email: trainer.email ?? '',
        certifications: trainer.certifications ?? [],
        vatNumber: trainer.vatNumber ?? '',
        hourlyRate: trainer.hourlyRate ?? '',
        registerCode: trainer.registerCode ?? '',
        iban: trainer.iban ?? '',
        birthDate: trainer.birthDate ?? '',
        residenceAddress: trainer.residenceAddress ?? '',
        residenceCity: trainer.residenceCity ?? '',
        province: trainer.province ?? '',
        postalCode: trainer.postalCode ?? '',
        notes: trainer.notes ?? '',
        status: trainer.status ?? 'Active',
        specialties: trainer.specialties ?? [],
      });
    }
  }, [trainer]);

  useEffect(() => {
    async function fetchCerts() {
      try {
        const courses = await getCourses();
        const allCerts: string[] = [];
        courses.forEach((c: any) => {
          if (c.certifications) {
            const certs = Array.isArray(c.certifications)
              ? c.certifications
              : c.certifications.split(',').map((s: string) => s.trim());
            allCerts.push(...certs);
          }
        });
        const uniqueCerts = Array.from(new Set(allCerts.filter(Boolean))).sort();
        setCertOptions(uniqueCerts.map(c => ({ value: c, label: c })));
      } catch (e) {
        setCertOptions([]);
      }
    }
    fetchCerts();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: TrainerInsert) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        ...formData,
        birthDate: formData.birthDate ? formData.birthDate : null,
        certifications: formData.certifications || [],
      };
      await onSubmit(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save trainer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
              Nome
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                name="firstName"
                id="firstName"
                required
                value={formData.firstName ?? ''}
                onChange={handleChange}
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                placeholder="Nome"
              />
            </div>
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
              Cognome
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                name="lastName"
                id="lastName"
                required
                value={formData.lastName ?? ''}
                onChange={handleChange}
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                placeholder="Cognome"
              />
            </div>
          </div>

          <div>
            <label htmlFor="taxCode" className="block text-sm font-medium text-gray-700">Codice Fiscale</label>
            <input
              type="text"
              name="taxCode"
              id="taxCode"
              value={formData.taxCode ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Codice Fiscale"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Telefono</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="tel"
                name="phone"
                id="phone"
                value={formData.phone ?? ''}
                onChange={handleChange}
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                placeholder="Telefono"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                name="email"
                id="email"
                value={formData.email ?? ''}
                onChange={handleChange}
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                placeholder="Email"
              />
            </div>
          </div>

          <div>
            <label htmlFor="vatNumber" className="block text-sm font-medium text-gray-700">P.IVA</label>
            <input
              type="text"
              name="vatNumber"
              id="vatNumber"
              value={formData.vatNumber ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="P.IVA"
            />
          </div>

          <div>
            <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700">Tariffa Oraria (€)</label>
            <input
              type="number"
              name="hourlyRate"
              id="hourlyRate"
              value={formData.hourlyRate ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Tariffa Oraria"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label htmlFor="registerCode" className="block text-sm font-medium text-gray-700">Codice Albo</label>
            <input
              type="text"
              name="registerCode"
              id="registerCode"
              value={formData.registerCode ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Codice Albo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Certificazioni</label>
            <Select
              isMulti
              options={certOptions}
              value={certOptions.filter(opt => (formData.certifications || []).includes(opt.value))}
              onChange={opts => setFormData(prev => ({ ...prev, certifications: opts.map(o => o.value) }))}
              placeholder="Seleziona certificazioni..."
              classNamePrefix="react-select"
              menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
              menuPlacement="auto"
              styles={{
                menu: (provided) => ({
                  ...provided,
                  zIndex: 9999,
                  maxWidth: '100%',
                  minWidth: '100%',
                }),
                menuList: (provided) => ({
                  ...provided,
                  maxHeight: 200,
                }),
              }}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="iban" className="block text-sm font-medium text-gray-700">IBAN</label>
            <input
              type="text"
              name="iban"
              id="iban"
              value={formData.iban ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="IBAN"
            />
          </div>

          <div>
            <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">Data di Nascita</label>
            <input
              type="date"
              name="birthDate"
              id="birthDate"
              value={formData.birthDate ? formData.birthDate.split('T')[0] : ''}
              onChange={e => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="residenceAddress" className="block text-sm font-medium text-gray-700">Via di Residenza</label>
            <input
              type="text"
              name="residenceAddress"
              id="residenceAddress"
              value={formData.residenceAddress ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Via di Residenza"
            />
          </div>

          <div>
            <label htmlFor="residenceCity" className="block text-sm font-medium text-gray-700">Comune di Residenza</label>
            <input
              type="text"
              name="residenceCity"
              id="residenceCity"
              value={formData.residenceCity ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Comune di Residenza"
            />
          </div>

          <div>
            <label htmlFor="province" className="block text-sm font-medium text-gray-700">Provincia</label>
            <input
              type="text"
              name="province"
              id="province"
              value={formData.province ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Provincia"
            />
          </div>

          <div>
            <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">CAP</label>
            <input
              type="text"
              name="postalCode"
              id="postalCode"
              value={formData.postalCode ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="CAP"
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">Stato</label>
            <select
              name="status"
              id="status"
              required
              value={formData.status ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="Active">Attivo</option>
              <option value="Inactive">Non Attivo</option>
            </select>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Note</label>
            <textarea
              name="notes"
              id="notes"
              value={formData.notes ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Note"
              rows={2}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : trainer ? 'Update Trainer' : 'Create Trainer'}
        </button>
      </div>
    </form>
  );
}