import React, { useState, useEffect } from 'react';
import { Phone, Mail, User, FileText, Calendar, MapPin, Briefcase, Building, CreditCard, AlertTriangle } from 'lucide-react';
import Select from 'react-select';
import { getCourses } from '../../services/courses';
import EntityFormLayout from '../shared/form/EntityFormLayout';
import EntityFormField from '../shared/form/EntityFormField';
import EntityFormGrid, { EntityFormSection, EntityFormFullWidthField } from '../shared/form/EntityFormGrid';
import { validateCodiceFiscale } from '../../lib/utils';
import { checkEmailAvailabilityDetails, checkTaxCodeAvailabilityDetails } from '../../services/validation';
import { DatePickerElegante } from '../ui/DatePickerElegante';
import { extractBirthPlaceFromTaxCode, extractGenderFromTaxCode, generateTaxCode } from '../../utils/codiceFiscale';

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
  birthPlace?: string;
  birthProvince?: string;
  gender?: string;
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


interface TrainerFormProps {
  trainer?: Trainer;
  onSubmit: (data: TrainerInsert) => Promise<void>;
  onCancel: () => void;
  // Nuova prop per controllare la visibilità delle sezioni professionali
  roleType?: 'TRAINER' | 'EMPLOYEE' | 'OTHER' | 'ADMIN' | string;
}

export default function TrainerForm({ trainer, onSubmit, onCancel, roleType = 'TRAINER' }: TrainerFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [certOptions, setCertOptions] = useState<{ value: string; label: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // P59: Warning (non bloccante) per email già esistente
  const [emailWarning, setEmailWarning] = useState<string>('');

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
    birthPlace: '',
    birthProvince: '',
    gender: '',
    residenceAddress: '',
    residenceCity: '',
    province: '',
    postalCode: '',
    notes: '',
    status: 'ACTIVE',
    specialties: [],
  });

  // P59: Validazione async email - ora solo per warning, non blocca
  // Non usiamo più useAsyncValidation per email perché vogliamo solo un warning
  useEffect(() => {
    const checkEmail = async () => {
      if (!formData.email || trainer?.id) {
        setEmailWarning('');
        return;
      }

      const result = await checkEmailAvailabilityDetails(formData.email);
      if (!result.available && result.existingPerson) {
        setEmailWarning(`Questa email è già utilizzata da ${result.existingPerson.fullName}`);
      } else {
        setEmailWarning('');
      }
    };

    const timer = setTimeout(checkEmail, 800);
    return () => clearTimeout(timer);
  }, [formData.email, trainer?.id]);

  // P59: Warning e info per CF cross-tenant
  const [taxCodeInfo, setTaxCodeInfo] = useState<{
    warning?: string;
    canImport?: boolean;
    existingPerson?: { firstName: string; lastName: string; birthDate?: string };
  }>({});

  // P59: Validazione CF con supporto cross-tenant import
  useEffect(() => {
    const checkTaxCode = async () => {
      if (!formData.taxCode || trainer?.id || formData.taxCode.length < 16) {
        setTaxCodeInfo({});
        return;
      }

      const result = await checkTaxCodeAvailabilityDetails(formData.taxCode);

      if (result.existsInOtherTenant && result.canImport && result.existingPerson) {
        // CF esiste in altro tenant - mostra info import
        setTaxCodeInfo({
          warning: `Persona esistente in altro tenant: ${result.existingPerson.fullName}. I dati anagrafici verranno importati automaticamente.`,
          canImport: true,
          existingPerson: {
            firstName: result.existingPerson.firstName || '',
            lastName: result.existingPerson.lastName || '',
            birthDate: (result.existingPerson as { birthDate?: string }).birthDate
          }
        });

        // Auto-compila i campi dalla persona esistente se vuoti
        setFormData(prev => ({
          ...prev,
          firstName: prev.firstName || result.existingPerson?.firstName || '',
          lastName: prev.lastName || result.existingPerson?.lastName || ''
        }));
      } else if (!result.available && result.existsInCurrentTenant) {
        // CF esiste nello stesso tenant - errore bloccante
        setTaxCodeInfo({
          warning: `Questo CF è già associato a ${result.existingPerson?.fullName || 'una persona'} nello stesso tenant`
        });
      } else {
        setTaxCodeInfo({});
      }
    };

    const timer = setTimeout(checkTaxCode, 800);
    return () => clearTimeout(timer);
  }, [formData.taxCode, trainer?.id]);

  // Estrai la data di nascita dal codice fiscale (YYYY-MM-DD)
  const extractBirthDateFromCF = (cf: string): string | null => {
    if (!cf || cf.length < 11) return null;
    const months = ['A', 'B', 'C', 'D', 'E', 'H', 'L', 'M', 'P', 'R', 'S', 'T'];
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

  useEffect(() => {
    if (trainer) {
      const taxCodeStr = (trainer.taxCode ?? '') as string;
      const derivedGender =
        (trainer.gender as string) ||
        (taxCodeStr.length === 16 ? (extractGenderFromTaxCode(taxCodeStr) || '') : '');

      setFormData({
        firstName: trainer.firstName ?? '',
        lastName: trainer.lastName ?? '',
        taxCode: taxCodeStr,
        phone: trainer.phone ?? '',
        email: trainer.email ?? '',
        certifications: trainer.certifications ?? [],
        vatNumber: trainer.vatNumber ?? '',
        hourlyRate: trainer.hourlyRate ?? '',
        registerCode: trainer.registerCode ?? '',
        iban: trainer.iban ?? '',
        birthDate: trainer.birthDate ?? '',
        birthPlace: trainer.birthPlace ?? '',
        birthProvince: trainer.birthProvince ?? '',
        gender: derivedGender,
        residenceAddress: trainer.residenceAddress ?? '',
        residenceCity: trainer.residenceCity ?? '',
        province: trainer.province ?? '',
        postalCode: trainer.postalCode ?? '',
        notes: trainer.notes ?? '',
        status: trainer.status ?? 'ACTIVE',
        specialties: trainer.specialties ?? [],
      });
    }
  }, [trainer]);

  useEffect(() => {
    async function fetchCerts() {
      try {
        const courses = (await getCourses()) as Array<{ certifications?: string | string[] }>;
        const allCerts: string[] = [];
        (courses || []).forEach((c: { certifications?: string | string[] }) => {
          if (c && c.certifications) {
            const certs = Array.isArray(c.certifications)
              ? c.certifications
              : (c.certifications as string).split(',').map((s: string) => s.trim());
            allCerts.push(...certs);
          }
        });
        const uniqueCerts = Array.from(new Set(allCerts.filter(Boolean))).sort();
        setCertOptions(uniqueCerts.map(c => ({ value: c, label: c })));
      } catch {
        setCertOptions([]);
      }
    }
    fetchCerts();
  }, []);

  // Auto-compila birthDate quando cambia il codice fiscale valido
  useEffect(() => {
    if (formData.taxCode && formData.taxCode.length >= 11) {
      const extracted = extractBirthDateFromCF(formData.taxCode);
      if (extracted) {
        setFormData(prev => ({ ...prev, birthDate: extracted }));
        if (errors.birthDate) {
          setErrors(prev => {
            const ne = { ...prev };
            delete ne.birthDate;
            return ne;
          });
        }
      }
    }
    // Estrai comune e provincia di nascita se i campi sono vuoti
    if (formData.taxCode && formData.taxCode.length === 16) {
      const birthPlaceInfo = extractBirthPlaceFromTaxCode(formData.taxCode);
      if (birthPlaceInfo) {
        setFormData(prev => ({
          ...prev,
          birthPlace: prev.birthPlace || birthPlaceInfo.comune,
          birthProvince: prev.birthProvince || birthPlaceInfo.provincia
        }));
      }
      // Auto-fill sesso da codice fiscale se campo vuoto
      const gender = extractGenderFromTaxCode(formData.taxCode);
      if (gender) {
        setFormData(prev => ({ ...prev, gender: prev.gender || (gender as string) }));
      }
    }
  }, [formData.taxCode, errors.birthDate]);

  // Auto-genera il codice fiscale quando tutti i dati anagrafici sono presenti e il CF è vuoto
  useEffect(() => {
    if (
      !formData.firstName?.trim() ||
      !formData.lastName?.trim() ||
      !formData.birthDate ||
      !formData.birthPlace?.trim() ||
      !formData.gender ||
      formData.gender === 'OTHER' ||
      formData.taxCode?.trim()
    ) {
      return; // Non generare se mancano dati o CF già inserito
    }

    const generated = generateTaxCode(
      formData.lastName,
      formData.firstName,
      formData.birthDate,
      formData.gender as 'MALE' | 'FEMALE',
      formData.birthPlace
    );
    if (generated) {
      setFormData(prev => ({ ...prev, taxCode: generated }));
    }
  }, [formData.firstName, formData.lastName, formData.birthDate, formData.birthPlace, formData.gender]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: TrainerInsert) => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => {
        const ne = { ...prev };
        delete ne[name];
        return ne;
      });
    }
  };

  const validateForm = (): boolean => {
    const ne: Record<string, string> = {};

    if (!formData.firstName.trim()) ne.firstName = 'Il Nome è obbligatorio';
    if (!formData.lastName.trim()) ne.lastName = 'Il Cognome è obbligatorio';

    // P48 Fix: Usa validateCodiceFiscale per messaggi di errore più specifici
    if (!formData.taxCode || !formData.taxCode.trim()) {
      ne.taxCode = 'Il Codice Fiscale è obbligatorio';
    } else {
      const cfValidation = validateCodiceFiscale(formData.taxCode);
      if (!cfValidation.isValid) {
        ne.taxCode = cfValidation.error || 'Codice Fiscale non valido';
      } else if (taxCodeInfo.warning && !taxCodeInfo.canImport) {
        // P59: Blocca solo se CF esiste nello stesso tenant (non può importare)
        ne.taxCode = taxCodeInfo.warning;
      }
      // NOTA: Se canImport=true, non blocchiamo - è solo un warning per import cross-tenant
    }

    // P59: Email validation - solo formato, non disponibilità (è solo un warning)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      ne.email = 'Formato email non valido';
    }
    // NOTA: Non blocchiamo più su email già usata - è solo un warning

    setErrors(ne);
    return Object.keys(ne).length === 0;
  };

  const handleSubmit = async () => {
    setError('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      const payload = {
        ...formData,
        birthDate: formData.birthDate ? formData.birthDate : null,
        certifications: formData.certifications || [],
      };
      await onSubmit(payload);
    } catch (err) {
      setError('Errore nel salvataggio del formatore');
    } finally {
      setLoading(false);
    }
  };

  return (
    <EntityFormLayout
      title={trainer ? 'Modifica Formatore' : 'Nuovo Formatore'}
      onSubmit={handleSubmit}
      onClose={onCancel}
      isSaving={loading}
      error={error}
      submitLabel={trainer ? 'Aggiorna' : 'Crea'}
      className=""
    >
      <EntityFormSection title="Dati Anagrafici">
        <EntityFormGrid columns={2}>
          <EntityFormField
            name="firstName"
            label="Nome"
            value={formData.firstName}
            onChange={handleChange}
            required
            leftIcon={<User size={18} />}
            variant="pill"
            size="md"
            error={errors.firstName}
          />
          <EntityFormField
            name="lastName"
            label="Cognome"
            value={formData.lastName}
            onChange={handleChange}
            required
            leftIcon={<User size={18} />}
            variant="pill"
            size="md"
            error={errors.lastName}
          />
          <div className="relative">
            <EntityFormField
              name="taxCode"
              label="Codice Fiscale"
              value={formData.taxCode}
              onChange={handleChange}
              leftIcon={<FileText size={18} />}
              variant="pill"
              size="md"
              required
              error={errors.taxCode}
            />
            {/* P59: Mostra warning per CF cross-tenant (import possibile) */}
            {taxCodeInfo.canImport && taxCodeInfo.warning && (
              <div className="mt-1 flex items-center gap-1 text-sm text-amber-600">
                <AlertTriangle size={14} className="flex-shrink-0" />
                <span>{taxCodeInfo.warning}</span>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data di Nascita</label>
            <DatePickerElegante
              value={formData.birthDate || ''}
              onChange={(date) => handleChange({ target: { name: 'birthDate', value: date ? date.toISOString().split('T')[0] : '' } } as any)}
              theme="teal"
            />
            {errors.birthDate && <p className="mt-1 text-xs text-red-500">{errors.birthDate}</p>}
            <p className="mt-1 text-xs text-gray-500">Estratta automaticamente dal codice fiscale</p>
          </div>
          <div>
            <EntityFormField
              name="gender"
              label="Sesso"
              type="select"
              value={formData.gender || ''}
              onChange={handleChange}
              leftIcon={<User size={18} />}
              variant="pill"
              size="md"
              options={[
                { value: '', label: 'Non specificato' },
                { value: 'MALE', label: 'Maschio' },
                { value: 'FEMALE', label: 'Femmina' },
                { value: 'OTHER', label: 'Altro' },
              ]}
            />
          </div>
          <div>
            <EntityFormField
              name="birthPlace"
              label="Comune di Nascita"
              value={formData.birthPlace || ''}
              onChange={handleChange}
              leftIcon={<MapPin size={18} />}
              variant="pill"
              size="md"
              placeholder="Auto-compilato dal C.F."
            />
          </div>
          <div>
            <EntityFormField
              name="birthProvince"
              label="Prov. Nascita"
              value={formData.birthProvince || ''}
              onChange={handleChange}
              leftIcon={<MapPin size={18} />}
              variant="pill"
              size="md"
              placeholder="Es. MI"
            />
          </div>
        </EntityFormGrid>
      </EntityFormSection>

      <EntityFormSection title="Residenza">
        <EntityFormGrid columns={2}>
          <EntityFormField
            name="residenceAddress"
            label="Indirizzo"
            value={formData.residenceAddress}
            onChange={handleChange}
            leftIcon={<MapPin size={18} />}
            variant="pill"
            size="md"
          />
          <EntityFormField
            name="residenceCity"
            label="Città"
            value={formData.residenceCity}
            onChange={handleChange}
            leftIcon={<MapPin size={18} />}
            variant="pill"
            size="md"
          />
          <EntityFormField
            name="province"
            label="Provincia"
            value={formData.province}
            onChange={handleChange}
            leftIcon={<MapPin size={18} />}
            variant="pill"
            size="md"
          />
          <EntityFormField
            name="postalCode"
            label="CAP"
            value={formData.postalCode}
            onChange={handleChange}
            leftIcon={<MapPin size={18} />}
            variant="pill"
            size="md"
          />
        </EntityFormGrid>
      </EntityFormSection>

      <EntityFormSection title="Contatti">
        <EntityFormGrid columns={2}>
          <div className="relative">
            <EntityFormField
              name="email"
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              leftIcon={<Mail size={18} />}
              required
              variant="pill"
              size="md"
              error={errors.email}
            />
            {/* P59: Warning per email già esistente (non bloccante) */}
            {emailWarning && !errors.email && (
              <div className="mt-1 flex items-center gap-1.5 text-amber-600 text-sm">
                <AlertTriangle size={14} className="flex-shrink-0" />
                <span>{emailWarning}</span>
              </div>
            )}
          </div>
          <EntityFormField
            name="phone"
            label="Telefono"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            leftIcon={<Phone size={18} />}
            variant="pill"
            size="md"
          />
        </EntityFormGrid>
      </EntityFormSection>

      {roleType === 'TRAINER' && (
        <>
          <EntityFormSection title="Dati Professionali">
            <EntityFormGrid columns={2}>
              <EntityFormField
                name="vatNumber"
                label="Partita IVA"
                value={formData.vatNumber}
                onChange={handleChange}
                leftIcon={<Building size={18} />}
                variant="pill"
                size="md"
              />
              <EntityFormField
                name="hourlyRate"
                label="Tariffa Oraria"
                value={formData.hourlyRate}
                onChange={handleChange}
                leftIcon={<Briefcase size={18} />}
                variant="pill"
                size="md"
              />
              <EntityFormField
                name="registerCode"
                label="Matricola Albo"
                value={formData.registerCode}
                onChange={handleChange}
                leftIcon={<FileText size={18} />}
                variant="pill"
                size="md"
              />
              <EntityFormField
                name="iban"
                label="IBAN"
                value={formData.iban}
                onChange={handleChange}
                leftIcon={<CreditCard size={18} />}
                variant="pill"
                size="md"
              />
              <EntityFormField
                name="status"
                label="Stato"
                type="select"
                value={formData.status}
                onChange={handleChange}
                options={[
                  { value: 'ACTIVE', label: 'Attivo' },
                  { value: 'INACTIVE', label: 'Inattivo' },
                ]}
                variant="pill"
                size="md"
              />
            </EntityFormGrid>
          </EntityFormSection>

          <EntityFormSection title="Certificazioni">
            <EntityFormGrid columns={1}>
              <EntityFormFullWidthField>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Certificazioni</label>
                  <Select
                    isMulti
                    options={certOptions}
                    value={(formData.certifications || []).map((c: string) => ({ value: c, label: c }))}
                    onChange={(selected) => {
                      const values = (selected || []).map((s: any) => s.value);
                      setFormData(prev => ({ ...prev, certifications: values }));
                    }}
                    classNamePrefix="pill-select"
                    placeholder="Seleziona certificazioni"
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderRadius: 9999,
                        minHeight: 44,
                        paddingLeft: 6,
                        paddingRight: 6,
                      }),
                      valueContainer: (base) => ({ ...base, gap: 6, paddingTop: 4, paddingBottom: 4 }),
                      multiValue: (base) => ({
                        ...base,
                        borderRadius: 9999,
                        backgroundColor: '#EEF2FF',
                        border: '1px solid #C7D2FE',
                      }),
                      multiValueLabel: (base) => ({
                        ...base,
                        color: '#3730A3',
                        fontWeight: 500,
                        paddingLeft: 10,
                        paddingRight: 6,
                      }),
                      multiValueRemove: (base) => ({
                        ...base,
                        borderTopRightRadius: 9999,
                        borderBottomRightRadius: 9999,
                        ':hover': { backgroundColor: '#DBEAFE', color: '#1D4ED8' },
                      }),
                      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                    }}
                    menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                  />
                </div>
              </EntityFormFullWidthField>
            </EntityFormGrid>
          </EntityFormSection>

          <EntityFormSection title="Altre Informazioni">
            <EntityFormGrid columns={2}>
              <EntityFormField
                name="specialties"
                label="Specializzazioni"
                value={(formData.specialties || []).join(', ')}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
                  const values = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                  setFormData(prev => ({ ...prev, specialties: values }));
                }}
                placeholder="Es. Sicurezza, Antincendio, RSPP"
                helpText="Se la persona ricopre il ruolo di RSPP, aggiungi 'RSPP' tra le specializzazioni"
                variant="pill"
                size="md"
              />
              <EntityFormField
                name="notes"
                label="Note"
                type="textarea"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
                variant="pill"
                size="md"
              />
            </EntityFormGrid>
          </EntityFormSection>
        </>
      )}
    </EntityFormLayout>
  );
}