import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Stethoscope, GraduationCap } from 'lucide-react';
import { Company } from '../../types';
import { TenantCreateDTO, TenantUpdateDTO, validateTenantDomain, validateTenantSlug } from '../../services/tenants';

interface TenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TenantCreateDTO | TenantUpdateDTO) => Promise<void>;
  tenant?: Company | null;
  isEditing: boolean;
}

const TenantModal: React.FC<TenantModalProps> = ({
  isOpen,
  onClose,
  onSave,
  tenant,
  isEditing
}) => {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    domain: '',
    subscription_plan: 'FREE',
    is_active: true,
    enabledBranches: ['MEDICA', 'FORMAZIONE'] as string[],
    primaryBranch: 'MEDICA' as string,
    settings: {}
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [validationStatus, setValidationStatus] = useState<{
    slug: 'idle' | 'checking' | 'valid' | 'invalid';
    domain: 'idle' | 'checking' | 'valid' | 'invalid';
  }>({ slug: 'idle', domain: 'idle' });

  useEffect(() => {
    if (isEditing && tenant) {
      setFormData({
        name: tenant.name || '',
        slug: tenant.slug || '',
        domain: tenant.domain || '', // Ensure never null (controlled input)
        subscription_plan: tenant.subscription_plan || 'FREE',
        is_active: tenant.is_active ?? true, // Handle null/undefined
        enabledBranches: (tenant as any).enabledBranches || ['MEDICA', 'FORMAZIONE'],
        primaryBranch: (tenant as any).primaryBranch || 'MEDICA',
        settings: tenant.settings || {}
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        domain: '',
        subscription_plan: 'FREE',
        is_active: true,
        enabledBranches: ['MEDICA', 'FORMAZIONE'],
        primaryBranch: 'MEDICA',
        settings: {}
      });
    }
    setErrors({});
    setValidationStatus({ slug: 'idle', domain: 'idle' });
  }, [isEditing, tenant, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Auto-generate slug from name
    if (name === 'name' && !isEditing) {
      const slug = value.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  const validateSlug = async (slug: string) => {
    if (!slug || isEditing) return;

    setValidationStatus(prev => ({ ...prev, slug: 'checking' }));

    try {
      const result = await validateTenantSlug(slug);
      setValidationStatus(prev => ({
        ...prev,
        slug: result.isValid ? 'valid' : 'invalid'
      }));

      if (!result.isValid) {
        setErrors(prev => ({ ...prev, slug: result.message || 'Slug non disponibile' }));
      }
    } catch (error) {
      setValidationStatus(prev => ({ ...prev, slug: 'invalid' }));
      setErrors(prev => ({ ...prev, slug: 'Errore nella validazione dello slug' }));
    }
  };

  const validateDomain = async (domain: string) => {
    if (!domain) {
      setValidationStatus(prev => ({ ...prev, domain: 'idle' }));
      return;
    }

    setValidationStatus(prev => ({ ...prev, domain: 'checking' }));

    try {
      const result = await validateTenantDomain(domain);
      setValidationStatus(prev => ({
        ...prev,
        domain: result.isValid ? 'valid' : 'invalid'
      }));

      if (!result.isValid) {
        setErrors(prev => ({ ...prev, domain: result.message || 'Dominio non disponibile' }));
      }
    } catch (error) {
      setValidationStatus(prev => ({ ...prev, domain: 'invalid' }));
      setErrors(prev => ({ ...prev, domain: 'Errore nella validazione del dominio' }));
    }
  };

  const handleSlugBlur = () => {
    if (formData.slug) {
      validateSlug(formData.slug);
    }
  };

  const handleDomainBlur = () => {
    if (formData.domain) {
      validateDomain(formData.domain);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Il nome è obbligatorio';
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Lo slug è obbligatorio';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Lo slug può contenere solo lettere minuscole, numeri e trattini';
    }

    if (formData.domain && !/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(formData.domain)) {
      newErrors.domain = 'Formato dominio non valido';
    }

    // Validate branch configuration (Project 45)
    if (formData.enabledBranches.length === 0) {
      newErrors.branches = 'Almeno un branch deve essere abilitato';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Check validation status
    if (validationStatus.slug === 'invalid' || validationStatus.domain === 'invalid') {
      return;
    }

    setIsLoading(true);

    try {
      const submitData = { ...formData };

      // Remove empty domain
      if (!submitData.domain) {
        delete submitData.domain;
      }

      await onSave(submitData);
      onClose();
    } catch (error: any) {
      setErrors({ submit: error.message || 'Errore nel salvataggio' });
    } finally {
      setIsLoading(false);
    }
  };

  const getValidationIcon = (status: 'idle' | 'checking' | 'valid' | 'invalid') => {
    switch (status) {
      case 'checking':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>;
      case 'valid':
        return <div className="h-4 w-4 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>;
      case 'invalid':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Modifica Tenant' : 'Nuovo Tenant'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="Nome del tenant"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug *
            </label>
            <div className="relative">
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleInputChange}
                onBlur={handleSlugBlur}
                disabled={isEditing}
                className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.slug ? 'border-red-500' : 'border-gray-300'
                  } ${isEditing ? 'bg-gray-100' : ''}`}
                placeholder="slug-tenant"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                {getValidationIcon(validationStatus.slug)}
              </div>
            </div>
            {errors.slug && (
              <p className="text-red-500 text-sm mt-1">{errors.slug}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              Utilizzato per l'URL: {formData.slug}.tuodominio.com
            </p>
          </div>

          {/* Domain */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dominio Personalizzato
            </label>
            <div className="relative">
              <input
                type="text"
                name="domain"
                value={formData.domain}
                onChange={handleInputChange}
                onBlur={handleDomainBlur}
                className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.domain ? 'border-red-500' : 'border-gray-300'
                  }`}
                placeholder="esempio.com"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                {getValidationIcon(validationStatus.domain)}
              </div>
            </div>
            {errors.domain && (
              <p className="text-red-500 text-sm mt-1">{errors.domain}</p>
            )}
          </div>

          {/* Subscription Plan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Piano di Sottoscrizione
            </label>
            <select
              name="subscription_plan"
              value={formData.subscription_plan}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="FREE">Free</option>
              <option value="BASIC">Basic</option>
              <option value="PREMIUM">Premium</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
          </div>

          {/* Branch Configuration (Project 45) */}
          <div className="border-t pt-4 mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Branch Abilitati
            </label>
            <div className="space-y-3">
              {/* MEDICA Branch */}
              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                    <Stethoscope className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Element Medica</p>
                    <p className="text-xs text-gray-500">Poliambulatorio, visite, prestazioni</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.enabledBranches.includes('MEDICA')}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFormData(prev => ({
                        ...prev,
                        enabledBranches: checked
                          ? [...prev.enabledBranches, 'MEDICA']
                          : prev.enabledBranches.filter(b => b !== 'MEDICA'),
                        // Se si disabilita il primaryBranch, cambialo
                        primaryBranch: !checked && prev.primaryBranch === 'MEDICA'
                          ? (prev.enabledBranches.includes('FORMAZIONE') ? 'FORMAZIONE' : '')
                          : prev.primaryBranch
                      }));
                    }}
                    className="h-5 w-5 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                  />
                  {formData.enabledBranches.includes('MEDICA') && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, primaryBranch: 'MEDICA' }))}
                      className={`px-2 py-1 text-xs rounded ${formData.primaryBranch === 'MEDICA'
                          ? 'bg-cyan-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      {formData.primaryBranch === 'MEDICA' ? 'Primario' : 'Imposta primario'}
                    </button>
                  )}
                </div>
              </div>

              {/* FORMAZIONE Branch */}
              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Element Formazione</p>
                    <p className="text-xs text-gray-500">Corsi, attestati, formazione</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.enabledBranches.includes('FORMAZIONE')}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFormData(prev => ({
                        ...prev,
                        enabledBranches: checked
                          ? [...prev.enabledBranches, 'FORMAZIONE']
                          : prev.enabledBranches.filter(b => b !== 'FORMAZIONE'),
                        // Se si disabilita il primaryBranch, cambialo
                        primaryBranch: !checked && prev.primaryBranch === 'FORMAZIONE'
                          ? (prev.enabledBranches.includes('MEDICA') ? 'MEDICA' : '')
                          : prev.primaryBranch
                      }));
                    }}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  {formData.enabledBranches.includes('FORMAZIONE') && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, primaryBranch: 'FORMAZIONE' }))}
                      className={`px-2 py-1 text-xs rounded ${formData.primaryBranch === 'FORMAZIONE'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      {formData.primaryBranch === 'FORMAZIONE' ? 'Primario' : 'Imposta primario'}
                    </button>
                  )}
                </div>
              </div>
            </div>
            {formData.enabledBranches.length === 0 && (
              <p className="text-red-500 text-sm mt-2">Almeno un branch deve essere abilitato</p>
            )}
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              Tenant attivo
            </label>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {errors.submit}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isLoading || validationStatus.slug === 'checking' || validationStatus.domain === 'checking'}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Salvataggio...' : (isEditing ? 'Aggiorna' : 'Crea')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TenantModal;