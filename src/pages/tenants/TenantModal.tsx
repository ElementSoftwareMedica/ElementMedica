import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Stethoscope, GraduationCap, Building2, ChevronRight, ChevronLeft, UserPlus, Trash2, Shield, KeyRound } from 'lucide-react';
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
    settings: {},
    // Company data
    companyData: {
      ragioneSociale: '',
      piva: '',
      codiceFiscale: '',
      formaGiuridica: '',
      sedeLegaleIndirizzo: '',
      sedeLegaleCitta: '',
      sedeLegaleCap: '',
      sedeLegaleProvincia: '',
      sdi: '',
      pecFatturazione: ''
    },
    // Admin data (Step 3)
    adminData: {
      firstName: '',
      lastName: '',
      taxCode: '',
      email: '',
      password: '',
      username: ''
    },
    // Secretary accounts (Step 3)
    secretaryAccounts: [] as Array<{
      firstName: string;
      lastName: string;
      taxCode: string;
      email: string;
      password: string;
      username: string;
    }>
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1); // Step 1: Tenant, Step 2: Company, Step 3: Admin + Segreteria
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
        subscription_plan: tenant.subscriptionPlan || 'FREE',
        is_active: tenant.isActive ?? true, // Handle null/undefined
        enabledBranches: (tenant as any).enabledBranches || ['MEDICA', 'FORMAZIONE'],
        primaryBranch: (tenant as any).primaryBranch || 'MEDICA',
        settings: tenant.settings || {},
        companyData: {
          ragioneSociale: (tenant as any).companyData?.ragioneSociale || tenant.name || '',
          piva: (tenant as any).companyData?.piva || '',
          codiceFiscale: (tenant as any).companyData?.codiceFiscale || '',
          formaGiuridica: (tenant as any).companyData?.formaGiuridica || '',
          sedeLegaleIndirizzo: (tenant as any).companyData?.sedeLegaleIndirizzo || '',
          sedeLegaleCitta: (tenant as any).companyData?.sedeLegaleCitta || '',
          sedeLegaleCap: (tenant as any).companyData?.sedeLegaleCap || '',
          sedeLegaleProvincia: (tenant as any).companyData?.sedeLegaleProvincia || '',
          sdi: (tenant as any).companyData?.sdi || '',
          pecFatturazione: (tenant as any).companyData?.pecFatturazione || ''
        }
      });
      setStep(1);
    } else {
      setFormData({
        name: '',
        slug: '',
        domain: '',
        subscription_plan: 'FREE',
        is_active: true,
        enabledBranches: ['MEDICA', 'FORMAZIONE'],
        primaryBranch: 'MEDICA',
        settings: {},
        companyData: {
          ragioneSociale: '',
          piva: '',
          codiceFiscale: '',
          formaGiuridica: '',
          sedeLegaleIndirizzo: '',
          sedeLegaleCitta: '',
          sedeLegaleCap: '',
          sedeLegaleProvincia: '',
          sdi: '',
          pecFatturazione: ''
        },
        adminData: {
          firstName: '',
          lastName: '',
          taxCode: '',
          email: '',
          password: '',
          username: ''
        },
        secretaryAccounts: []
      });
      setStep(1);
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
      setFormData(prev => ({
        ...prev,
        slug,
        // Also sync to company ragioneSociale if empty
        companyData: {
          ...prev.companyData,
          ragioneSociale: prev.companyData.ragioneSociale || value
        }
      }));
    }
  };

  const handleCompanyInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      companyData: {
        ...prev.companyData,
        [name]: value
      }
    }));

    // Clear error when user starts typing
    if (errors[`company_${name}`]) {
      setErrors(prev => ({ ...prev, [`company_${name}`]: '' }));
    }
  };

  const handleAdminInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      adminData: {
        ...prev.adminData,
        [name]: value
      }
    }));
    if (errors[`admin_${name}`]) {
      setErrors(prev => ({ ...prev, [`admin_${name}`]: '' }));
    }
    // Auto-generate username from email
    if (name === 'email') {
      setFormData(prev => ({
        ...prev,
        adminData: { ...prev.adminData, email: value, username: value }
      }));
    }
  };

  const handleSecretaryInputChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = [...prev.secretaryAccounts];
      updated[index] = { ...updated[index], [name]: value };
      // Auto-generate username from email
      if (name === 'email') {
        updated[index].username = value;
      }
      return { ...prev, secretaryAccounts: updated };
    });
    if (errors[`secretary_${index}_${name}`]) {
      setErrors(prev => ({ ...prev, [`secretary_${index}_${name}`]: '' }));
    }
  };

  const addSecretaryAccount = () => {
    setFormData(prev => ({
      ...prev,
      secretaryAccounts: [
        ...prev.secretaryAccounts,
        { firstName: '', lastName: '', taxCode: '', email: '', password: '', username: '' }
      ]
    }));
  };

  const removeSecretaryAccount = (index: number) => {
    setFormData(prev => ({
      ...prev,
      secretaryAccounts: prev.secretaryAccounts.filter((_, i) => i !== index)
    }));
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

    // Validate company data (step 2)
    if (!formData.companyData.ragioneSociale?.trim()) {
      newErrors.company_ragioneSociale = 'La ragione sociale è obbligatoria';
    }

    // Validate P.IVA format if provided
    if (formData.companyData.piva && !/^[0-9]{11}$/.test(formData.companyData.piva)) {
      newErrors.company_piva = 'La Partita IVA deve essere di 11 cifre';
    }

    // Validate CF format if provided
    if (formData.companyData.codiceFiscale && !/^[A-Z0-9]{11,16}$/.test(formData.companyData.codiceFiscale.toUpperCase())) {
      newErrors.company_codiceFiscale = 'Formato Codice Fiscale non valido';
    }

    // Validate CAP format if provided
    if (formData.companyData.sedeLegaleCap && !/^[0-9]{5}$/.test(formData.companyData.sedeLegaleCap)) {
      newErrors.company_sedeLegaleCap = 'Il CAP deve essere di 5 cifre';
    }

    // Validate SDI format if provided
    if (formData.companyData.sdi && !/^[A-Z0-9]{7}$/.test(formData.companyData.sdi.toUpperCase())) {
      newErrors.company_sdi = 'Il codice SDI deve essere di 7 caratteri';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep1 = () => {
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

    if (formData.enabledBranches.length === 0) {
      newErrors.branches = 'Almeno un branch deve essere abilitato';
    }

    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (step === 1 && validateStep1() && validationStatus.slug !== 'invalid' && validationStatus.domain !== 'invalid') {
      // Sync company name if not set
      if (!formData.companyData.ragioneSociale) {
        setFormData(prev => ({
          ...prev,
          companyData: {
            ...prev.companyData,
            ragioneSociale: prev.name
          }
        }));
      }
      setStep(2);
    } else if (step === 2) {
      // Validate company fields for step 2
      const newErrors: Record<string, string> = {};
      if (!formData.companyData.ragioneSociale?.trim()) {
        newErrors.company_ragioneSociale = 'La ragione sociale è obbligatoria';
      }
      if (formData.companyData.piva && !/^[0-9]{11}$/.test(formData.companyData.piva)) {
        newErrors.company_piva = 'La Partita IVA deve essere di 11 cifre';
      }
      if (formData.companyData.codiceFiscale && !/^[A-Z0-9]{11,16}$/.test(formData.companyData.codiceFiscale.toUpperCase())) {
        newErrors.company_codiceFiscale = 'Formato Codice Fiscale non valido';
      }
      if (formData.companyData.sedeLegaleCap && !/^[0-9]{5}$/.test(formData.companyData.sedeLegaleCap)) {
        newErrors.company_sedeLegaleCap = 'Il CAP deve essere di 5 cifre';
      }
      if (formData.companyData.sdi && !/^[A-Z0-9]{7}$/.test(formData.companyData.sdi.toUpperCase())) {
        newErrors.company_sdi = 'Il codice SDI deve essere di 7 caratteri';
      }
      setErrors(prev => ({ ...prev, ...newErrors }));
      if (Object.keys(newErrors).length === 0) {
        setStep(3);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      // If there are errors in step 1, go back
      const step1Errors = ['name', 'slug', 'domain', 'branches'].some(k => errors[k]);
      if (step1Errors) {
        setStep(1);
      }
      return;
    }

    // Validate admin data (required for creation)
    if (!isEditing) {
      const adminErrors: Record<string, string> = {};
      if (!formData.adminData.firstName?.trim()) {
        adminErrors.admin_firstName = 'Il nome è obbligatorio';
      }
      if (!formData.adminData.lastName?.trim()) {
        adminErrors.admin_lastName = 'Il cognome è obbligatorio';
      }
      if (!formData.adminData.email?.trim()) {
        adminErrors.admin_email = "L'email è obbligatoria";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminData.email)) {
        adminErrors.admin_email = 'Formato email non valido';
      }
      if (!formData.adminData.password) {
        adminErrors.admin_password = 'La password è obbligatoria';
      } else if (formData.adminData.password.length < 8) {
        adminErrors.admin_password = 'La password deve avere almeno 8 caratteri';
      }
      if (formData.adminData.taxCode && !/^[A-Z0-9]{16}$/.test(formData.adminData.taxCode.toUpperCase())) {
        adminErrors.admin_taxCode = 'Formato Codice Fiscale non valido';
      }

      // Validate secretary accounts
      formData.secretaryAccounts.forEach((sec, i) => {
        if (!sec.firstName?.trim()) adminErrors[`secretary_${i}_firstName`] = 'Il nome è obbligatorio';
        if (!sec.lastName?.trim()) adminErrors[`secretary_${i}_lastName`] = 'Il cognome è obbligatorio';
        if (!sec.email?.trim()) {
          adminErrors[`secretary_${i}_email`] = "L'email è obbligatoria";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sec.email)) {
          adminErrors[`secretary_${i}_email`] = 'Formato email non valido';
        }
        if (!sec.password) {
          adminErrors[`secretary_${i}_password`] = 'La password è obbligatoria';
        } else if (sec.password.length < 8) {
          adminErrors[`secretary_${i}_password`] = 'La password deve avere almeno 8 caratteri';
        }
      });

      if (Object.keys(adminErrors).length > 0) {
        setErrors(prev => ({ ...prev, ...adminErrors }));
        setStep(3);
        return;
      }
    }

    // Check validation status
    if (validationStatus.slug === 'invalid' || validationStatus.domain === 'invalid') {
      return;
    }

    setIsLoading(true);

    try {
      const submitData: Record<string, any> = { ...formData };

      // Remove empty domain
      if (!submitData.domain) {
        delete submitData.domain;
      }

      // Include adminData and secretaryAccounts for creation
      if (!isEditing) {
        submitData.adminData = {
          ...formData.adminData,
          username: formData.adminData.username || formData.adminData.email
        };
        if (formData.secretaryAccounts.length > 0) {
          submitData.secretaryAccounts = formData.secretaryAccounts.map(s => ({
            ...s,
            username: s.username || s.email
          }));
        }
      }

      await onSave(submitData);
      onClose();
    } catch (error: unknown) {
      setErrors({ submit: 'Errore nel salvataggio' });
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Modifica Tenant' : 'Nuovo Tenant'}
            </h2>
            {!isEditing && (
              <div className="flex items-center gap-2 mt-2">
                <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${step >= 1 ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                  <span className="w-4 h-4 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px]">1</span>
                  Tenant
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${step >= 2 ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${step >= 2 ? 'bg-violet-600 text-white' : 'bg-gray-300 text-gray-600'
                    }`}>2</span>
                  Azienda
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${step >= 3 ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${step >= 3 ? 'bg-violet-600 text-white' : 'bg-gray-300 text-gray-600'
                    }`}>3</span>
                  Utenti
                </div>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1" noValidate>
          {/* Step 1: Tenant Data */}
          {(step === 1 || isEditing) && (
            <>
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
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 ${errors.name ? 'border-red-500' : 'border-gray-300'
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
                    className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 ${errors.slug ? 'border-red-500' : 'border-gray-300'
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
                        <p className="font-medium text-gray-900">Element Sicurezza</p>
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
                  className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  Tenant attivo
                </label>
              </div>
            </>
          )}

          {/* Step 2: Company Data */}
          {(step === 2 || isEditing) && (
            <>
              <div className="border-t pt-4 mt-2">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-5 h-5 text-violet-600" />
                  <h3 className="font-medium text-gray-900">Dati Azienda</h3>
                </div>

                {/* Ragione Sociale */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ragione Sociale *
                  </label>
                  <input
                    type="text"
                    name="ragioneSociale"
                    value={formData.companyData.ragioneSociale}
                    onChange={handleCompanyInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 ${errors.company_ragioneSociale ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="Ragione sociale dell'azienda"
                  />
                  {errors.company_ragioneSociale && (
                    <p className="text-red-500 text-sm mt-1">{errors.company_ragioneSociale}</p>
                  )}
                </div>

                {/* P.IVA & Codice Fiscale */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Partita IVA
                    </label>
                    <input
                      type="text"
                      name="piva"
                      value={formData.companyData.piva}
                      onChange={handleCompanyInputChange}
                      maxLength={11}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 ${errors.company_piva ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="12345678901"
                    />
                    {errors.company_piva && (
                      <p className="text-red-500 text-sm mt-1">{errors.company_piva}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Codice Fiscale
                    </label>
                    <input
                      type="text"
                      name="codiceFiscale"
                      value={formData.companyData.codiceFiscale}
                      onChange={handleCompanyInputChange}
                      maxLength={16}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 ${errors.company_codiceFiscale ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="Codice fiscale"
                    />
                    {errors.company_codiceFiscale && (
                      <p className="text-red-500 text-sm mt-1">{errors.company_codiceFiscale}</p>
                    )}
                  </div>
                </div>

                {/* Forma Giuridica */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Forma Giuridica
                  </label>
                  <select
                    name="formaGiuridica"
                    value={formData.companyData.formaGiuridica}
                    onChange={handleCompanyInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="">Seleziona...</option>
                    <option value="SRL">SRL - Società a responsabilità limitata</option>
                    <option value="SRLS">SRLS - SRL semplificata</option>
                    <option value="SPA">SPA - Società per azioni</option>
                    <option value="SNC">SNC - Società in nome collettivo</option>
                    <option value="SAS">SAS - Società in accomandita semplice</option>
                    <option value="SS">SS - Società semplice</option>
                    <option value="INDIVIDUALE">Impresa individuale</option>
                    <option value="COOPERATIVA">Cooperativa</option>
                    <option value="ASSOCIAZIONE">Associazione</option>
                    <option value="ALTRO">Altro</option>
                  </select>
                </div>

                {/* Sede Legale */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sede Legale - Indirizzo
                  </label>
                  <input
                    type="text"
                    name="sedeLegaleIndirizzo"
                    value={formData.companyData.sedeLegaleIndirizzo}
                    onChange={handleCompanyInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="Via/Piazza..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CAP
                    </label>
                    <input
                      type="text"
                      name="sedeLegaleCap"
                      value={formData.companyData.sedeLegaleCap}
                      onChange={handleCompanyInputChange}
                      maxLength={5}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 ${errors.company_sedeLegaleCap ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="00000"
                    />
                    {errors.company_sedeLegaleCap && (
                      <p className="text-red-500 text-sm mt-1">{errors.company_sedeLegaleCap}</p>
                    )}
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Città
                    </label>
                    <input
                      type="text"
                      name="sedeLegaleCitta"
                      value={formData.companyData.sedeLegaleCitta}
                      onChange={handleCompanyInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                      placeholder="Città"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prov.
                    </label>
                    <input
                      type="text"
                      name="sedeLegaleProvincia"
                      value={formData.companyData.sedeLegaleProvincia}
                      onChange={handleCompanyInputChange}
                      maxLength={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                      placeholder="XX"
                    />
                  </div>
                </div>

                {/* Fatturazione Elettronica */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Codice SDI
                    </label>
                    <input
                      type="text"
                      name="sdi"
                      value={formData.companyData.sdi}
                      onChange={handleCompanyInputChange}
                      maxLength={7}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 ${errors.company_sdi ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="XXXXXXX"
                    />
                    {errors.company_sdi && (
                      <p className="text-red-500 text-sm mt-1">{errors.company_sdi}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PEC Fatturazione
                    </label>
                    <input
                      type="email"
                      name="pecFatturazione"
                      value={formData.companyData.pecFatturazione}
                      onChange={handleCompanyInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                      placeholder="pec@pec.it"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Step 3: Admin + Secretary Accounts (only during creation) */}
          {step === 3 && !isEditing && (
            <>
              {/* Amministratore Tenant */}
              <div className="border-t pt-4 mt-2">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-violet-600" />
                  <h3 className="font-medium text-gray-900">Amministratore Tenant</h3>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  Questo utente avrà il ruolo TENANT_ADMIN e potrà gestire tutti gli aspetti del tenant.
                  Se la persona esiste già nel sistema (per codice fiscale), verrà collegata al nuovo tenant.
                </p>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.adminData.firstName}
                      onChange={handleAdminInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 ${errors.admin_firstName ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Nome"
                    />
                    {errors.admin_firstName && <p className="text-red-500 text-sm mt-1">{errors.admin_firstName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cognome *</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.adminData.lastName}
                      onChange={handleAdminInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 ${errors.admin_lastName ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Cognome"
                    />
                    {errors.admin_lastName && <p className="text-red-500 text-sm mt-1">{errors.admin_lastName}</p>}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Codice Fiscale</label>
                  <input
                    type="text"
                    name="taxCode"
                    value={formData.adminData.taxCode}
                    onChange={handleAdminInputChange}
                    maxLength={16}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 ${errors.admin_taxCode ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="RSSMRA80A01H501U"
                  />
                  {errors.admin_taxCode && <p className="text-red-500 text-sm mt-1">{errors.admin_taxCode}</p>}
                  <p className="text-gray-500 text-xs mt-1">Se la persona esiste già, verrà collegata automaticamente al tenant</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.adminData.email}
                      onChange={handleAdminInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 ${errors.admin_email ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="admin@azienda.it"
                    />
                    {errors.admin_email && <p className="text-red-500 text-sm mt-1">{errors.admin_email}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                    <div className="relative">
                      <input
                        type="password"
                        name="password"
                        value={formData.adminData.password}
                        onChange={handleAdminInputChange}
                        className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 ${errors.admin_password ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Min. 8 caratteri"
                      />
                      <KeyRound className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                    </div>
                    {errors.admin_password && <p className="text-red-500 text-sm mt-1">{errors.admin_password}</p>}
                  </div>
                </div>
              </div>

              {/* Account Segreteria */}
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-violet-600" />
                    <h3 className="font-medium text-gray-900">Account Segreteria</h3>
                    <span className="text-xs text-gray-500">(opzionale)</span>
                  </div>
                  <button
                    type="button"
                    onClick={addSecretaryAccount}
                    className="px-3 py-1.5 bg-violet-50 text-violet-700 rounded-md hover:bg-violet-100 text-sm font-medium flex items-center gap-1"
                  >
                    <UserPlus className="w-4 h-4" />
                    Aggiungi
                  </button>
                </div>

                {formData.secretaryAccounts.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                    Nessun account segreteria. Puoi aggiungerli ora o in seguito.
                  </p>
                )}

                {formData.secretaryAccounts.map((secretary, index) => (
                  <div key={index} className="border rounded-lg p-4 mb-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">Segreteria #{index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeSecretaryAccount(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <input
                          type="text"
                          name="firstName"
                          value={secretary.firstName}
                          onChange={(e) => handleSecretaryInputChange(index, e)}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm ${errors[`secretary_${index}_firstName`] ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="Nome *"
                        />
                        {errors[`secretary_${index}_firstName`] && <p className="text-red-500 text-xs mt-1">{errors[`secretary_${index}_firstName`]}</p>}
                      </div>
                      <div>
                        <input
                          type="text"
                          name="lastName"
                          value={secretary.lastName}
                          onChange={(e) => handleSecretaryInputChange(index, e)}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm ${errors[`secretary_${index}_lastName`] ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="Cognome *"
                        />
                        {errors[`secretary_${index}_lastName`] && <p className="text-red-500 text-xs mt-1">{errors[`secretary_${index}_lastName`]}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <input
                          type="email"
                          name="email"
                          value={secretary.email}
                          onChange={(e) => handleSecretaryInputChange(index, e)}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm ${errors[`secretary_${index}_email`] ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="Email *"
                        />
                        {errors[`secretary_${index}_email`] && <p className="text-red-500 text-xs mt-1">{errors[`secretary_${index}_email`]}</p>}
                      </div>
                      <div>
                        <input
                          type="password"
                          name="password"
                          value={secretary.password}
                          onChange={(e) => handleSecretaryInputChange(index, e)}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm ${errors[`secretary_${index}_password`] ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="Password *"
                        />
                        {errors[`secretary_${index}_password`] && <p className="text-red-500 text-xs mt-1">{errors[`secretary_${index}_password`]}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {errors.submit}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between gap-3 pt-4 border-t">
            <div>
              {(step === 2 || step === 3) && !isEditing && (
                <button
                  type="button"
                  onClick={() => setStep((step - 1) as 1 | 2)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Indietro
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Annulla
              </button>
              {(step === 1 || step === 2) && !isEditing ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={validationStatus.slug === 'checking' || validationStatus.domain === 'checking'}
                  className="px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Avanti
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading || validationStatus.slug === 'checking' || validationStatus.domain === 'checking'}
                  className="px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Salvataggio...' : (isEditing ? 'Aggiorna' : 'Crea Tenant')}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TenantModal;