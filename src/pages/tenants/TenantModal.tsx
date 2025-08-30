import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
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
        name: tenant.name,
        slug: tenant.slug,
        domain: tenant.domain || '',
        subscription_plan: tenant.subscription_plan || 'FREE',
        is_active: tenant.is_active,
        settings: tenant.settings || {}
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        domain: '',
        subscription_plan: 'FREE',
        is_active: true,
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
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
                className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.slug ? 'border-red-500' : 'border-gray-300'
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
                className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.domain ? 'border-red-500' : 'border-gray-300'
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